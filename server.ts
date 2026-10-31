import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type, Modality } from '@google/genai';
import { IOMETE_CAPABILITIES } from './src/data/capabilities';
import {
  runFitAnalysis,
  DEFAULT_DIMENSION_WEIGHTS,
  computeInputHash
} from './src/services/analyzerEngine';
import {
  DimensionId,
  EvalResults,
  GeminiEnrichmentPayload,
  OutreachStatus,
  ProspectRecord
} from './src/types/analyzer';
import {
  initTigerData,
  fetchAllProspects,
  saveOrUpdateProspect,
  patchProspect,
  removeProspect,
  getStorageHealth
} from './src/services/tigerDataStorage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = process.env.APP_ROOT || process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'prospects_db.json');
const CACHE_FILE = path.join(DATA_DIR, 'extraction_cache.json');
const EVAL_FILE = path.join(ROOT_DIR, 'eval', 'eval_results.json');

// In-memory + disk-backed deterministic extraction cache keyed by inputHash
const SERVER_EXTRACTION_CACHE = new Map<string, GeminiEnrichmentPayload>();

function loadExtractionCache(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as Record<
        string,
        GeminiEnrichmentPayload
      >;
      for (const [k, v] of Object.entries(raw)) {
        SERVER_EXTRACTION_CACHE.set(k, v);
      }
    }
  } catch {
    // ignore corrupt cache
  }
}

function saveExtractionCache(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const obj: Record<string, GeminiEnrichmentPayload> = {};
    for (const [k, v] of SERVER_EXTRACTION_CACHE.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

loadExtractionCache();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

/**
 * Helper to wrap raw 24kHz 16-bit mono PCM audio from gemini-3.8-flash-lite-tts into a standard RIFF WAV buffer.
 */
function pcmToWavBuffer(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}



async function startServer() {
  // Initialize TigerData connection if configured in environment
  await initTigerData();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  // ---------------------------------------------------------------------------
  // HEALTH CHECK ENDPOINTS (`/health`, `/api/health`)
  // Essential for Vultr container healthchecks, load balancers, and monitoring
  // ---------------------------------------------------------------------------
  app.get(['/health', '/api/health'], async (_req, res) => {
    const storageHealth = await getStorageHealth();
    res.status(200).json({
      status: 'ok',
      service: 'fitlens',
      database: storageHealth,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // ---------------------------------------------------------------------------
  // 0. EVALUATION METRICS ENDPOINT (`/api/eval-results`) - Bug #7
  // Reads eval/eval_results.json or returns empty object so UI shows "not yet measured"
  // ---------------------------------------------------------------------------
  app.get('/api/eval-results', (_req, res) => {
    try {
      if (fs.existsSync(EVAL_FILE)) {
        const raw = fs.readFileSync(EVAL_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as EvalResults;
        return res.json({ measured: true, results: parsed });
      }
    } catch {
      // fall through
    }
    return res.json({ measured: false, results: null });
  });

  // ---------------------------------------------------------------------------
  // 1. MULTI-MODEL GEMINI ENDPOINT: Research & Auto-Draft Company (.md)
  // Uses `gemini-3.8-flash` (with Google Search Grounding) + `gemini-3.1-flash-lite`
  // Deterministic: temperature = 0
  // ---------------------------------------------------------------------------
  app.post('/api/gemini/research-company', async (req, res) => {
    const { companyQuery, industryHint } = req.body as {
      companyQuery?: string;
      industryHint?: string;
    };

    if (!companyQuery || !companyQuery.trim()) {
      return res
        .status(400)
        .json({ error: 'Please provide a company name, domain, or description.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error:
          'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment to research live companies with Gemini, or enter your specification manually below.'
      });
    }

    try {
      const researchResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Research the company or organization "${companyQuery}" ${
          industryHint ? `(${industryHint})` : ''
        } for an enterprise data lakehouse qualification brief (Apache Spark + Apache Iceberg on Kubernetes).
Identify or reasonably estimate from public engineering blogs, job postings, industry scale, and regulatory footprint:
1. Industry, business model, and approximate operational scale.
2. Likely core data workflows (e.g., batch ETL, real-time Kafka/Kinesis streaming, ML feature pipelines, BI dashboards, regulatory reporting).
3. Estimated data volume (GB, TB, or PB) and formats (Parquet, JSON, CDC, Iceberg).
4. Current or typical technology stack (Snowflake, Databricks, BigQuery, Postgres, Kubernetes/EKS/OpenShift, S3/MinIO, dbt, Airflow, Tableau/Superset).
5. Data engineering team maturity & Kubernetes readiness.
6. Data residency, sovereignty (on-prem, air-gap, VPC BYOC, or SaaS-only), and compliance (GDPR, SOC2, HIPAA, PCI-DSS, BaFin).
7. Likely data platform pain points and annual compute spend pressure.
Do not use any em dashes in your response; use standard hyphens (-).`,
        config: {
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ googleSearch: {} }]
        }
      });

      const groundedSources: Array<{ title: string; url: string }> = [];
      const chunks =
        researchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      for (const chunk of chunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          groundedSources.push({ title: chunk.web.title, url: chunk.web.uri });
        }
      }

      const formattingResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Convert the following company research about "${companyQuery}" into a structured 7-section Markdown specification for the FitLens IOMETE Account Fit Analyzer. Do not use em dashes; use standard hyphens (-).

Research Notes:
${researchResponse.text || ''}

Required Exact Markdown Structure:
# Account Qualification Brief: [Company Name]

## 1. Business Context & Industry
- Company Name: [Company Name]
- Industry: [Industry & Sector]
- Business Model: [Concise description]

## 2. Core Data Workflows
- Workflow 1: [Specific workflow description]
- Workflow 2: [Specific workflow description]
- Workflow 3: [Specific workflow description]
- Workflow 4: [Specific workflow description]

## 3. Data Sources, Scale & Formats
- Current Total Volume: [Explicit volume with unit, e.g., 180 Terabytes (TB) or 2.4 Petabytes (PB) or 15 Gigabytes (GB)]
- Daily Ingestion Rate: [Explicit daily rate]
- Primary Formats: [e.g., Parquet, JSON, Kafka streams, Postgres CDC]

## 4. Current Technology Stack
- Data Warehouse / Lakehouse: [e.g., Snowflake, Databricks, BigQuery, Cloudera, or AWS RDS PostgreSQL]
- Transformation & ETL: [e.g., PySpark, dbt Core, Airflow]
- BI & Visualization: [e.g., Tableau, Superset, PowerBI, Looker, Metabase]
- Infrastructure & Cloud: [e.g., AWS EKS, Red Hat OpenShift, GKE, AKS, S3, MinIO, Ceph, or managed PaaS]

## 5. Team Composition & Technical Readiness
- Data Engineering Team Size: [Explicit count of data engineers and platform/K8s engineers]
- Core Skills: [Explicit skills in Spark, SQL, Kubernetes, etc.]
- Operational Preference: [Whether they want sovereign on-prem/air-gapped K8s, BYOC in their cloud VPC, or strictly managed turnkey SaaS]

## 6. Constraints, Residency & Compliance
- Data Sovereignty Requirement: [Residency, VPC, on-prem, or air-gap rules]
- Cloud & SaaS Policy: [Stance on customer-hosted Kubernetes vs multi-tenant SaaS]
- Governance & Access Control: [RBAC, ABAC, column masking, audit logs, lineage, GDPR/HIPAA/SOC2/PCI/BaFin]

## 7. Pain Points & Buying Triggers
- Annualized Compute Spend: [Explicit annual or monthly dollar figure, e.g. $850K/year or $1.9M/year or $180/month]
- Primary Pain Points: [Compute credit markups, auto-scaling spikes, slow batch SLAs, or none]
- Lock-In Anxiety: [Stance on open Apache Iceberg vs proprietary warehouse formats]

Return ONLY the raw Markdown text without surrounding code fences.`,
        config: {
          temperature: 0,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }
        }
      });

      const cleanMarkdown = (formattingResponse.text || '')
        .replace(/^```(?:markdown|md)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/\u2014/g, '-')
        .trim();

      return res.json({
        markdownContent: cleanMarkdown,
        modelsUsed: [
          'gemini-3.8-flash (Google Search Grounding, temp=0)',
          'gemini-3.1-flash-lite (Fast 7-Section Markdown Structurer, temp=0)'
        ],
        groundedSources: groundedSources.slice(0, 5)
      });
    } catch (err: any) {
      console.error('Gemini research error:', err?.message);
      return res.status(500).json({
        error:
          err?.message ||
          'Gemini research failed. Please verify your Gemini API key and network connectivity, or enter the specification manually.'
      });
    }
  });

  // ---------------------------------------------------------------------------
  // 2. MULTI-MODEL GEMINI ENDPOINT: Full Account Fit Analysis Pipeline
  // Bug #5: temperature = 0, cache extraction by hash of input, compute scores ONLY in code
  // ---------------------------------------------------------------------------
  app.post('/api/gemini/analyze', async (req, res) => {
    const { companyName, markdownText, userWeights, saveToDb } = req.body as {
      companyName?: string;
      markdownText: string;
      userWeights?: Record<DimensionId, number>;
      saveToDb?: boolean;
    };

    if (!markdownText || !markdownText.trim()) {
      return res.status(400).json({ error: 'markdownText is required' });
    }

    const weights = userWeights || DEFAULT_DIMENSION_WEIGHTS;
    const extractedNameMatch = markdownText.match(/Company Name:\s*([^\n\r]+)/i);
    const resolvedName =
      companyName?.trim() ||
      (extractedNameMatch ? extractedNameMatch[1].trim() : 'Analyzed Prospect');

    const inputHash = computeInputHash(markdownText);
    let enrichment: GeminiEnrichmentPayload | undefined =
      SERVER_EXTRACTION_CACHE.get(inputHash);

    const ai = getGeminiClient();

    if (!enrichment && ai) {
      try {
        const capabilitiesSummary = IOMETE_CAPABILITIES.map(
          c =>
            `- ID: "${c.id}" | Name: "${c.name}" | DocURL: "${c.docUrl}" | FitsWhen: ${c.fitsWhen}`
        ).join('\n');

        const [fastSignalRes, deepSynthesisRes] = await Promise.all([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `Extract key account metadata from this prospect markdown brief (do not use em dashes):\n\n${markdownText}`,
            config: {
              temperature: 0,
              thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  companyName: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  dataScale: { type: Type.STRING },
                  currentStack: { type: Type.STRING },
                  compliancePosture: { type: Type.STRING }
                },
                required: [
                  'companyName',
                  'industry',
                  'dataScale',
                  'currentStack',
                  'compliancePosture'
                ]
              }
            }
          }),
          ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: `You are the FitLens IOMETE Account Qualification Architect.
Analyze the following prospect Markdown brief against the official 28 IOMETE Capabilities Knowledge Base.

CRITICAL GROUNDING RULES:
1. Every matchedCapabilityId and docUrl MUST come strictly from the provided IOMETE Capabilities list below. Never invent a capability or URL.
2. Be brutally honest: if the company has tiny data (<50 GB), no data engineers, or refuses to run containers/Kubernetes, mark workflows as "Poor Fit" and explain why remaining on a managed relational database (e.g., PostgreSQL) is the honest recommendation.
3. Extract verbatim quotes from the prospect brief for topUseCases.
4. Provide concrete Flourish Catalysts (why they will flourish with IOMETE) and Failure/Friction Risks (what could block or derail adoption).
5. Replace all em dashes with standard hyphens (-).

OFFICIAL IOMETE CAPABILITIES KNOWLEDGE BASE:
${capabilitiesSummary}

PROSPECT MARKDOWN BRIEF:
${markdownText}`,
            config: {
              temperature: 0,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  oneSentenceReason: { type: Type.STRING },
                  flourishVerdictSummary: { type: Type.STRING },
                  primaryFlourishDrivers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  primaryFailureRisks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  workflowMatches: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        workflowName: { type: Type.STRING },
                        matchedCapabilityId: { type: Type.STRING },
                        matchedCapabilityName: { type: Type.STRING },
                        docUrl: { type: Type.STRING },
                        fitRating: { type: Type.STRING },
                        evidenceText: { type: Type.STRING },
                        confidence: { type: Type.STRING },
                        evidenceType: { type: Type.STRING }
                      },
                      required: [
                        'id',
                        'workflowName',
                        'matchedCapabilityId',
                        'matchedCapabilityName',
                        'docUrl',
                        'fitRating',
                        'evidenceText',
                        'confidence',
                        'evidenceType'
                      ]
                    }
                  },
                  topUseCases: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        rank: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        prospectQuote: { type: Type.STRING },
                        iometeCapability: { type: Type.STRING },
                        docUrl: { type: Type.STRING },
                        rationale: { type: Type.STRING },
                        evidenceType: { type: Type.STRING }
                      },
                      required: [
                        'rank',
                        'title',
                        'prospectQuote',
                        'iometeCapability',
                        'docUrl',
                        'rationale',
                        'evidenceType'
                      ]
                    }
                  },
                  unknownsGaps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        missingInfo: { type: Type.STRING },
                        discoveryQuestion: { type: Type.STRING },
                        priority: { type: Type.STRING }
                      },
                      required: [
                        'id',
                        'title',
                        'missingInfo',
                        'discoveryQuestion',
                        'priority'
                      ]
                    }
                  },
                  objectionsAndRisks: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        objection: { type: Type.STRING },
                        likelihood: { type: Type.STRING },
                        honestResponse: { type: Type.STRING },
                        prospectConcern: { type: Type.STRING },
                        docUrl: { type: Type.STRING }
                      },
                      required: [
                        'objection',
                        'likelihood',
                        'honestResponse',
                        'prospectConcern'
                      ]
                    }
                  }
                },
                required: [
                  'oneSentenceReason',
                  'flourishVerdictSummary',
                  'primaryFlourishDrivers',
                  'primaryFailureRisks',
                  'workflowMatches',
                  'topUseCases',
                  'unknownsGaps',
                  'objectionsAndRisks'
                ]
              }
            }
          })
        ]);

        const stripEmDash = (s?: string) => (s ? s.replace(/\u2014/g, '-') : '');
        const fastMeta = JSON.parse(fastSignalRes.text || '{}');
        const deepData = JSON.parse(deepSynthesisRes.text || '{}');

        const validFitRatings = new Set(['High Fit', 'Partial Fit', 'Poor Fit']);
        const validConf = new Set(['High', 'Medium', 'Low']);
        const validSource = new Set(['Stated', 'Sourced', 'Assumed']);

        const normalizedWorkflows = Array.isArray(deepData.workflowMatches)
          ? deepData.workflowMatches.map((w: any, idx: number) => ({
              id: w.id || `wf_gem_${idx + 1}`,
              workflowName: stripEmDash(w.workflowName) || 'Analytical Workflow',
              matchedCapabilityId: w.matchedCapabilityId || 'cap_apache_spark_k8s',
              matchedCapabilityName:
                stripEmDash(w.matchedCapabilityName) ||
                'Apache Spark on Kubernetes Elastic Compute Engine',
              docUrl: w.docUrl || 'https://iomete.com/product/architecture/compute',
              fitRating: validFitRatings.has(w.fitRating) ? w.fitRating : 'High Fit',
              evidenceText: stripEmDash(w.evidenceText),
              confidence: validConf.has(w.confidence) ? w.confidence : 'High',
              evidenceType: validSource.has(w.evidenceType) ? w.evidenceType : 'Stated'
            }))
          : undefined;

        const normalizedUseCases = Array.isArray(deepData.topUseCases)
          ? deepData.topUseCases.map((u: any, idx: number) => ({
              rank: idx + 1,
              title: stripEmDash(u.title) || 'Sovereign Lakehouse Optimization',
              prospectQuote: stripEmDash(u.prospectQuote) || '"Stated workflow requirement"',
              iometeCapability:
                stripEmDash(u.iometeCapability) ||
                'Sovereign Deployment (On-Prem, VPC, Hybrid)',
              docUrl: u.docUrl || 'https://iomete.com/product/deployment',
              rationale: stripEmDash(u.rationale),
              evidenceType: validSource.has(u.evidenceType) ? u.evidenceType : 'Stated'
            }))
          : undefined;

        enrichment = {
          companyName: stripEmDash(fastMeta.companyName) || resolvedName,
          industry: stripEmDash(fastMeta.industry),
          dataScale: stripEmDash(fastMeta.dataScale),
          currentStack: stripEmDash(fastMeta.currentStack),
          compliancePosture: stripEmDash(fastMeta.compliancePosture),
          oneSentenceReason: stripEmDash(deepData.oneSentenceReason),
          // Note: plainLanguageExplanation ("Why this verdict") is ALWAYS generated & validated strictly from evidence items in analyzerEngine.ts (Bug #1)
          flourishVerdictSummary: stripEmDash(deepData.flourishVerdictSummary),
          primaryFlourishDrivers: Array.isArray(deepData.primaryFlourishDrivers)
            ? deepData.primaryFlourishDrivers.map(stripEmDash)
            : undefined,
          primaryFailureRisks: Array.isArray(deepData.primaryFailureRisks)
            ? deepData.primaryFailureRisks.map(stripEmDash)
            : undefined,
          workflowMatches: normalizedWorkflows,
          topUseCases: normalizedUseCases,
          unknownsGaps: Array.isArray(deepData.unknownsGaps)
            ? deepData.unknownsGaps.map((g: any, idx: number) => ({
                id: g.id || `gap_gem_${idx + 1}`,
                title: stripEmDash(g.title) || 'Discovery Gap',
                missingInfo: stripEmDash(g.missingInfo),
                discoveryQuestion: stripEmDash(g.discoveryQuestion),
                priority:
                  g.priority === 'P0' || g.priority === 'P1' || g.priority === 'P2'
                    ? g.priority
                    : 'P1'
              }))
            : undefined,
          objectionsAndRisks: Array.isArray(deepData.objectionsAndRisks)
            ? deepData.objectionsAndRisks.map((o: any) => ({
                objection: stripEmDash(o.objection),
                likelihood:
                  o.likelihood === 'High' ||
                  o.likelihood === 'Medium' ||
                  o.likelihood === 'Low'
                    ? o.likelihood
                    : 'Medium',
                honestResponse: stripEmDash(o.honestResponse),
                prospectConcern: stripEmDash(o.prospectConcern),
                docUrl: o.docUrl || 'https://iomete.com/product/deployment'
              }))
            : undefined,
          geminiModelsUsed: [
            'gemini-3.1-flash-lite (Stage 1: Signal Parser, temp=0, hash-cached)',
            'gemini-3.8-flash (Stage 2: 28-Capability Matcher, temp=0, hash-cached)',
            'Pure-Code Rubric v2.1 (Stage 3: Deterministic Math & Evidence Validator)'
          ]
        };

        SERVER_EXTRACTION_CACHE.set(inputHash, enrichment);
        saveExtractionCache();
      } catch (err: any) {
        console.error(
          'Gemini multi-model analysis error, falling back to deterministic engine:',
          err?.message
        );
      }
    }

    // Scores and "Why this verdict" bullets are ALWAYS computed in pure deterministic code
    const finalAnalysis = runFitAnalysis(resolvedName, markdownText, weights, enrichment);

    let savedProspect: ProspectRecord | undefined;
    if (saveToDb !== false) {
      const records = await fetchAllProspects();
      const slug = finalAnalysis.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const prospectId = `prospect_${slug || 'account'}`;
      const existingIdx = records.findIndex(
        r =>
          r.id === prospectId ||
          r.companyName.toLowerCase() === finalAnalysis.companyName.toLowerCase()
      );

      const industryMatch = markdownText.match(/Industry:\s*([^\n\r]+)/i);
      const stackMatch = markdownText.match(/Data Warehouse \/ Lakehouse:\s*([^\n\r]+)/i);

      const defaultStatus: OutreachStatus =
        finalAnalysis.verdictBand === 'Strong fit'
          ? 'Qualified - Approach Now'
          : finalAnalysis.verdictBand === 'Possible fit' ||
            finalAnalysis.verdictBand === 'Insufficient information'
          ? 'Discovery Scheduled'
          : finalAnalysis.verdictBand === 'Weak fit'
          ? 'Nurture / Revisit Later'
          : 'Disqualified - Do Not Pitch';

      const defaultPriority: ProspectRecord['priorityTier'] =
        finalAnalysis.verdictBand === 'Strong fit'
          ? 'Tier 1 - Immediate'
          : finalAnalysis.verdictBand === 'Possible fit' ||
            finalAnalysis.verdictBand === 'Insufficient information'
          ? 'Tier 2 - Strategic'
          : 'Tier 3 - Hold';

      const existing = existingIdx >= 0 ? records[existingIdx] : undefined;

      savedProspect = {
        id: existing?.id || prospectId,
        companyName: finalAnalysis.companyName,
        industry:
          enrichment?.industry ||
          (industryMatch
            ? industryMatch[1].trim()
            : existing?.industry || 'Enterprise Data & Analytics'),
        websiteOrDomain:
          existing?.websiteOrDomain ||
          `${finalAnalysis.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        dataScale: enrichment?.dataScale || finalAnalysis.inputQuality.scaleDetected,
        currentStack:
          enrichment?.currentStack ||
          (stackMatch
            ? stackMatch[1].trim()
            : existing?.currentStack || 'Cloud Warehouse / Kubernetes'),
        compliancePosture:
          enrichment?.compliancePosture || finalAnalysis.inputQuality.complianceDetected,
        overallScore: finalAnalysis.overallScore,
        verdictBand: finalAnalysis.verdictBand,
        confidenceLevel: finalAnalysis.confidenceLevel,
        flourishSummary: finalAnalysis.flourishBreakdown.flourishVerdictSummary,
        primaryFriction:
          finalAnalysis.flourishBreakdown.primaryFailureRisks[0] ||
          'Validate Kubernetes operational ownership.',
        targetPersona: finalAnalysis.salesRepView.targetPersona,
        contactName: existing?.contactName || 'Pending Discovery',
        contactRole: existing?.contactRole || finalAnalysis.salesRepView.targetPersona,
        contactEmail: existing?.contactEmail || '',
        outreachStatus: existing?.outreachStatus || defaultStatus,
        priorityTier: existing?.priorityTier || defaultPriority,
        repNotes:
          existing?.repNotes ||
          `${finalAnalysis.oneSentenceReason} Next: ${
            finalAnalysis.nextSteps[0]?.action || 'Discovery'
          }`,
        nextAction: finalAnalysis.nextSteps[0]?.action || 'Schedule discovery call',
        followUpDate:
          existing?.followUpDate ||
          new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
        analyzedByModels: finalAnalysis.meta.geminiModelsUsed || [
          'Deterministic Rubric v2.1'
        ],
        updatedAt: new Date().toISOString(),
        markdownContent: markdownText
      };

      await saveOrUpdateProspect(savedProspect);
    }

    return res.json({
      analysis: finalAnalysis,
      savedProspect
    });
  });

  // ---------------------------------------------------------------------------
  // 3. MULTI-MODEL GEMINI ENDPOINT: Executive Audio Pitch Briefing (`gemini-3.8-flash-lite-tts`)
  // ---------------------------------------------------------------------------
  app.post('/api/gemini/tts', async (req, res) => {
    const { textToSpeak } = req.body as { textToSpeak?: string };
    if (!textToSpeak || !textToSpeak.trim()) {
      return res.status(400).json({ error: 'textToSpeak is required' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini TTS requires a configured GEMINI_API_KEY in the environment.'
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            parts: [
              {
                text: `Deliver this executive account qualification briefing in a clear, composed architectural advisor tone: ${textToSpeak.slice(
                  0,
                  900
                )}`
              }
            ]
          }
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }
            }
          }
        }
      });

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (!inlineData?.data) {
        return res
          .status(500)
          .json({ error: 'No audio data returned by gemini-3.8-flash-lite-tts' });
      }

      const rawBuffer = Buffer.from(inlineData.data, 'base64');
      const isRiff = rawBuffer.slice(0, 4).toString('ascii') === 'RIFF';
      const wavBuffer = isRiff ? rawBuffer : pcmToWavBuffer(rawBuffer, 24000, 1, 16);

      return res.json({
        audioDataUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}`,
        modelUsed: 'gemini-3.8-flash-lite-tts (Voice: Kore)'
      });
    } catch (err: any) {
      console.error('Gemini TTS error:', err?.message);
      return res.status(500).json({ error: err?.message || 'TTS generation failed' });
    }
  });

  // ---------------------------------------------------------------------------
  // 4. PERSISTENT PROSPECT CRM DATABASE ENDPOINTS (`/api/prospects`)
  // Backed by TigerData (Tiger Cloud PostgreSQL) with seamless local file fallback
  // ---------------------------------------------------------------------------
  app.get('/api/prospects', async (_req, res) => {
    const records = await fetchAllProspects();
    res.json({ prospects: records });
  });

  app.post('/api/prospects', async (req, res) => {
    const payload = req.body as Partial<ProspectRecord>;
    if (!payload.companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }
    const id =
      payload.id ||
      `prospect_${payload.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-4)}`;

    const record: ProspectRecord = {
      id,
      companyName: payload.companyName,
      industry: payload.industry || 'Enterprise Data & Analytics',
      websiteOrDomain: payload.websiteOrDomain || '',
      dataScale: payload.dataScale || 'Unknown Scale',
      currentStack: payload.currentStack || 'Unspecified Stack',
      compliancePosture: payload.compliancePosture || 'Standard Governance',
      overallScore: payload.overallScore ?? null,
      verdictBand: payload.verdictBand || 'Possible fit',
      confidenceLevel: payload.confidenceLevel || 'Medium',
      flourishSummary: payload.flourishSummary || '',
      primaryFriction: payload.primaryFriction || '',
      targetPersona: payload.targetPersona || 'VP of Data Engineering',
      contactName: payload.contactName || 'Pending Contact',
      contactRole: payload.contactRole || 'Data Platform Lead',
      contactEmail: payload.contactEmail || '',
      outreachStatus: payload.outreachStatus || 'Discovery Scheduled',
      priorityTier: payload.priorityTier || 'Tier 2 - Strategic',
      repNotes: payload.repNotes || '',
      nextAction: payload.nextAction || 'Schedule discovery call',
      followUpDate: payload.followUpDate || new Date().toISOString().slice(0, 10),
      analyzedByModels: payload.analyzedByModels || ['Deterministic Rubric v2.1'],
      updatedAt: new Date().toISOString(),
      markdownContent: payload.markdownContent || ''
    };

    const updatedRecords = await saveOrUpdateProspect(record);
    return res.json({ prospect: record, prospects: updatedRecords });
  });

  app.patch('/api/prospects/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body as Partial<ProspectRecord>;
    const { updated, prospects } = await patchProspect(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Prospect not found' });
    }
    return res.json({ prospect: updated, prospects });
  });

  app.delete('/api/prospects/:id', async (req, res) => {
    const { id } = req.params;
    const prospects = await removeProspect(id);
    return res.json({ prospects });
  });

  // ---------------------------------------------------------------------------
  // 5. VITE MIDDLEWARE OR PRODUCTION STATIC ASSETS
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    console.log(`FitLens full-stack server running on http://${HOST}:${PORT}`);
  });

  const gracefulShutdown = (signal: string) => {
    console.log(`Received ${signal}. Gracefully shutting down FitLens server...`);
    server.close(() => {
      console.log('FitLens HTTP server closed successfully.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Graceful shutdown timed out after 10s. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
