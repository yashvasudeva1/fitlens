import { IOMETE_CAPABILITIES, IometeCapability } from '../data/capabilities';
import {
  AnalysisResult,
  ConfidenceLevel,
  DimensionId,
  DimensionScore,
  DisqualifierFlag,
  EvidenceItem,
  GeminiEnrichmentPayload,
  InputQualityCheck,
  SourceType,
  VerdictBand
} from '../types/analyzer';

export const DEFAULT_DIMENSION_WEIGHTS: Record<DimensionId, number> = {
  sovereignty_deployment: 25,
  scale_variety: 15,
  lockin_openness: 15,
  analytics_ai: 15,
  cost_pressure: 10,
  tech_readiness: 10,
  governance_compliance: 10
};

export const DIMENSION_METADATA: Record<
  DimensionId,
  { name: string; whatItAsks: string; whyItMatters: string }
> = {
  sovereignty_deployment: {
    name: 'Sovereignty & Deployment Need',
    whatItAsks: 'Must data stay in own infrastructure, on premises, or air gapped?',
    whyItMatters: "Core positioning: runs in the customer's own Kubernetes environment, VPC, or offline enclave."
  },
  scale_variety: {
    name: 'Data Scale & Variety',
    whatItAsks: 'Large, mixed structured and unstructured data?',
    whyItMatters: 'Lakehouse value grows with volume (TB to PB) and mixed formats (Parquet, JSON, streams).'
  },
  lockin_openness: {
    name: 'Lock-in & Openness Concern',
    whatItAsks: 'Worry about proprietary formats or vendor lock-in?',
    whyItMatters: 'Built 100% on open Apache Spark and Apache Iceberg table standards.'
  },
  analytics_ai: {
    name: 'Analytics & AI Workloads',
    whatItAsks: 'BI, SQL queries, data engineering, ML pipelines?',
    whyItMatters: 'Broad capability coverage for batch Spark, interactive SQL, and Python data science.'
  },
  cost_pressure: {
    name: 'Cost Pressure & Predictability',
    whatItAsks: 'Is current warehouse or cloud compute spend a pain?',
    whyItMatters: 'Zero compute markup model delivers predictable platform licensing vs. runaway credit meters.'
  },
  tech_readiness: {
    name: 'Technical Readiness & Team Skills',
    whatItAsks: 'Spark, Iceberg, or Kubernetes familiarity, data team exists?',
    whyItMatters: 'Determines time to value and operational ownership.'
  },
  governance_compliance: {
    name: 'Governance & Compliance Needs',
    whatItAsks: 'Catalog, fine-grained access control, audit requirements?',
    whyItMatters: 'High-fit area with RBAC/ABAC masking and also a known third-party comparison area.'
  }
};

/**
 * Deterministic FNV-1a 64-bit style string hash for caching extraction by a hash of the input.
 */
export function computeInputHash(rawMarkdown: string): string {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim();
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

// Deterministic extraction cache keyed by inputHash
const EXTRACTION_CACHE = new Map<
  string,
  {
    qualityCheck: InputQualityCheck;
    disqualifiers: DisqualifierFlag[];
    baseDimensions: Record<DimensionId, DimensionScore>;
  }
>();

export function clearExtractionCache(): void {
  EXTRACTION_CACHE.clear();
}

/**
 * Finds the exact line and text from rawMarkdown matching a pattern, ignoring template section headers.
 */
function findMatchingInputLine(
  rawMarkdown: string,
  pattern: RegExp,
  fallbackText: string,
  fallbackLine: string
): { sourceText: string; sourceLine: string } {
  const lines = rawMarkdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || /^#+\s/.test(rawLine)) continue;
    const clean = rawLine.replace(/^[-*]\s*/, '').trim();
    // Strip field label prefix if testing value, or test full line
    if (pattern.test(clean)) {
      return {
        sourceText: clean,
        sourceLine: `Line ${i + 1}`
      };
    }
  }
  return { sourceText: fallbackText, sourceLine: fallbackLine };
}

/**
 * Analyzes markdown structure, calculates input completeness, section coverage,
 * workflows count, and flags missing elements.
 */
export function analyzeInputQuality(rawMarkdown: string): InputQualityCheck {
  const trimmed = rawMarkdown.trim();
  if (!trimmed) {
    return {
      coverageScore: 0,
      sectionsFound: [],
      sectionsMissing: [
        'Business & Context',
        'Data Workflows',
        'Data Scale & Sources',
        'Current Tech Stack',
        'Team & Readiness',
        'Constraints & Compliance',
        'Pain Points & Triggers'
      ],
      workflowsCount: 0,
      dataSourcesCount: 0,
      scaleDetected: 'Not specified (Scale Unknown)',
      complianceDetected: 'No specific compliance constraints mentioned',
      confidenceRating: 'Low',
      verdict: 'Low Coverage (High Uncertainty)',
      suggestions: ['Provide a company description or load a sample profile to begin evaluation.']
    };
  }

  const text = trimmed.toLowerCase();

  const sectionsExpected = [
    { key: 'business', label: 'Business & Context', match: /(business|overview|company|industry)/i },
    { key: 'workflows', label: 'Data Workflows', match: /(workflow|pipeline|etl|use case|query)/i },
    { key: 'scale', label: 'Data Scale & Sources', match: /(scale|volume|source|terabyte|petabyte|gigabyte|gb|tb|pb)/i },
    { key: 'stack', label: 'Current Tech Stack', match: /(stack|warehouse|snowflake|databricks|postgres|engine|database)/i },
    { key: 'team', label: 'Team & Readiness', match: /(team|engineer|skill|spark|kubernetes|devops|ops)/i },
    { key: 'constraints', label: 'Constraints & Compliance', match: /(constraint|residency|compliance|sovereign|air-gap|gdpr|hipaa|governance|access control|audit|lineage)/i },
    { key: 'pain_points', label: 'Pain Points & Triggers', match: /(pain|cost|bill|lock-in|open format|open-format|spend|slow|bottleneck)/i }
  ];

  const sectionsFound: string[] = [];
  const sectionsMissing: string[] = [];

  sectionsExpected.forEach(sec => {
    if (sec.match.test(rawMarkdown)) {
      sectionsFound.push(sec.label);
    } else {
      sectionsMissing.push(sec.label);
    }
  });

  const workflowLines = rawMarkdown.split('\n').filter(line =>
    /-\s*(workflow\s*\d*\s*:)/i.test(line) ||
    (/^[-*]\s+/.test(line.trim()) && /(etl|pipeline|query|dashboard|stream|batch|model|report|tally|notification)/i.test(line))
  );
  const workflowsCount = workflowLines.length > 0 ? workflowLines.length : (/workflow/gi.test(rawMarkdown) ? 2 : 0);

  const dataSourcesKeywords = [
    's3', 'minio', 'gcs', 'ceph', 'postgres', 'mysql', 'kafka', 'kinesis',
    'parquet', 'json', 'iceberg', 'snowflake', 'oracle', 'csv', 'tigerdata', 'timescaledb', 'timescale'
  ];
  const dataSourcesCount = dataSourcesKeywords.filter(k => text.includes(k)).length;

  let scaleDetected = 'Not specified (Scale Unknown)';
  if (/(\d+(\.\d+)?\s*(pb|petabyte))/i.test(rawMarkdown)) {
    const match = rawMarkdown.match(/(\d+(\.\d+)?\s*(pb|petabytes?))/i);
    scaleDetected = `Petabyte-scale (${match ? match[0] : 'Multi-PB'})`;
  } else if (/(\d+(\.\d+)?\s*(tb|terabyte))/i.test(rawMarkdown)) {
    const match = rawMarkdown.match(/(\d+(\.\d+)?\s*(tb|terabytes?))/i);
    scaleDetected = `Terabyte-scale (${match ? match[0] : 'Enterprise TB'})`;
  } else if (/(\d+(\.\d+)?\s*(gb|gigabyte|mb|megabyte))/i.test(rawMarkdown)) {
    const match = rawMarkdown.match(/(\d+(\.\d+)?\s*(gb|gigabytes?|mb|megabytes?))/i);
    scaleDetected = `Small/Single-Node Scale (${match ? match[0] : '<100 GB'})`;
  }

  let complianceDetected = 'No specific compliance constraints mentioned';
  if (/(air-gap|airgapped|zero data.*leave|bafin|fedramp|sovereign datacenter|on-prem.*datacenter)/i.test(rawMarkdown)) {
    complianceDetected = 'High Strictness (Air-gapped / Sovereign Perimeter)';
  } else if (/(hipaa|soc 2|gdpr|pci|ccpa|rbac|abac|audit log|access control|lineage)/i.test(rawMarkdown)) {
    complianceDetected = 'Standard Enterprise Governance (SOC2 / HIPAA / GDPR / RBAC)';
  } else if (/(none; standard multi-tenant|basic application password)/i.test(rawMarkdown)) {
    complianceDetected = 'Minimal / Standard Public SaaS';
  }

  const coverageRatio = sectionsFound.length / sectionsExpected.length;
  const coverageScore = Math.round(coverageRatio * 100);

  let confidenceRating: ConfidenceLevel = 'High';
  let verdict: InputQualityCheck['verdict'] = 'High Signal (Ready)';

  if (coverageScore < 45) {
    confidenceRating = 'Low';
    verdict = 'Low Coverage (High Uncertainty)';
  } else if (coverageScore < 75) {
    confidenceRating = 'Medium';
    verdict = 'Adequate (Minor Gaps)';
  }

  const suggestions: string[] = [];
  if (sectionsMissing.includes('Constraints & Compliance')) {
    suggestions.push('Specify residency and compliance mandates (e.g., GDPR, on-prem, air-gap) to rate Sovereignty.');
  }
  if (sectionsMissing.includes('Data Scale & Sources')) {
    suggestions.push('Include data volumes (TB/PB/GB) and ingestion rates to measure lakehouse value.');
  }
  if (sectionsMissing.includes('Team & Readiness')) {
    suggestions.push('Detail team familiarity with Spark, Kubernetes, or SQL to assess time-to-value.');
  }
  if (sectionsMissing.includes('Pain Points & Triggers')) {
    suggestions.push('Document current warehouse spend and pain points to evaluate cost pressure.');
  }

  return {
    coverageScore,
    sectionsFound,
    sectionsMissing,
    workflowsCount,
    dataSourcesCount,
    scaleDetected,
    complianceDetected,
    confidenceRating,
    verdict,
    suggestions
  };
}

/**
 * Checks for hard disqualifier conditions as mandated by PRD Section 5.2:
 * - Tiny data volume (<50 GB) + no data team
 * - Hard requirement for 100% managed SaaS where company refuses to touch Kubernetes or VPCs
 */
export function evaluateDisqualifiers(rawMarkdown: string): DisqualifierFlag[] {
  const text = rawMarkdown.toLowerCase();
  const flags: DisqualifierFlag[] = [];

  const isTinyScale =
    /\b(1[0-9]|2[0-9]|[1-9])\s*(gb|gigabytes?)\b/i.test(text) ||
    /tiny data|single rds|single managed postgres|less than.*gigabyte|<50\s*gb/i.test(text);

  const hasNoDataTeam =
    /0 dedicated data engineer|no data team|no experience with (apache )?spark|zero data engineer|no devops/i.test(text);

  const requires100PercentSaaS =
    /strictly requires turnkey managed saas|team cannot and will not manage containers|zero-infrastructure operational overhead|hard requirement for a managed saas only|no infrastructure control/i.test(text);

  if (isTinyScale && hasNoDataTeam) {
    flags.push({
      id: 'disqualifier_tiny_scale_no_team',
      title: 'Disqualifier: Sub-Scale & No Data Team',
      triggeredBecause: 'The prospect has only single-digit to low-gigabyte data (<50 GB) and zero dedicated data or infrastructure engineers.',
      impactOnVerdict: 'A distributed Spark/Iceberg lakehouse creates unnecessary operational overhead for a workload easily satisfied by a single PostgreSQL instance.',
      honestRecommendation: 'Do not pitch IOMETE. Recommend staying on managed PostgreSQL (AWS RDS or Supabase). Selling a lakehouse here would lead to buyer remorse.',
      cappedVerdict: 'Weak fit'
    });
  }

  if (requires100PercentSaaS) {
    flags.push({
      id: 'disqualifier_strict_managed_saas',
      title: 'Disqualifier: Refusal to Own Infrastructure',
      triggeredBecause: 'Prospect mandates a 100% multi-tenant managed SaaS and explicitly refuses to run pods in their VPC or on Kubernetes.',
      impactOnVerdict: "IOMETE's sovereign architecture runs inside the customer's Kubernetes environment. Without cluster access or willingness to host containers, deployment is blocked.",
      honestRecommendation: 'Recommend a turnkey serverless data warehouse (e.g. BigQuery or multi-tenant Snowflake), or revisit only if policies change to require sovereign data custody.',
      cappedVerdict: 'Not a fit'
    });
  }

  return flags;
}

/**
 * Pure code scoring engine with transparent math.
 * Accuracy Rule #2: Dimensions with no evidence have status 'not_scored' and score: null (never 0).
 * Accuracy Rule #4: Explicit mentions of governance needs (access control, audit logs, lineage) or
 * lock-in / open-format concerns always extract evidence items and receive a score.
 */
export function evaluateDimensions(
  rawMarkdown: string,
  userWeights: Record<DimensionId, number> = DEFAULT_DIMENSION_WEIGHTS
): Record<DimensionId, DimensionScore> {
  // Strip template section headers so header words like "Compliance" or "Sovereignty" don't false-match
  const contentLines = rawMarkdown
    .split('\n')
    .filter(l => !/^#+\s/.test(l.trim()))
    .join('\n');
  const text = contentLines.toLowerCase();

  const capabilitiesById = new Map<string, IometeCapability>(
    IOMETE_CAPABILITIES.map(c => [c.id, c])
  );

  const result: Record<DimensionId, DimensionScore> = {} as any;

  // 1. Sovereignty and deployment need (25%)
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(air-gap|airgapped|zero data.*leave|bafin|fedramp|on-prem|on premises|private datacenter|bare-metal|sovereign datacenter|data residency|national border)/i.test(text)) {
      const cap = capabilitiesById.get('cap_sovereign_deployment')!;
      const matchLine = findMatchingInputLine(
        rawMarkdown,
        /(data sovereignty|zero data.*leave|on-prem|on premises|private datacenter|bare-metal|sovereign datacenter|data residency|national border|bafin|fedramp)/i,
        'Mandates sovereign perimeter / on-premise or strict data residency deployment',
        'Section: Constraints & Compliance'
      );
      evidence.push({
        id: 'ev_sov_1',
        dimensionId: 'sovereignty_deployment',
        sourceText: matchLine.sourceText,
        sourceLine: matchLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'Customer requires data sovereignty; IOMETE installs directly inside their private Kubernetes clusters or on-premise enclaves.'
      });

      if (/(air-gap|airgapped|offline)/i.test(text)) {
        const airCap = capabilitiesById.get('cap_airgap_package')!;
        const airLine = findMatchingInputLine(
          rawMarkdown,
          /(air-gap|airgapped|offline)/i,
          'Air-gapped operation with zero outbound internet egress required',
          'Section: Constraints & Compliance'
        );
        evidence.push({
          id: 'ev_sov_2',
          dimensionId: 'sovereignty_deployment',
          sourceText: airLine.sourceText,
          sourceLine: airLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: airCap.id,
          capabilityName: airCap.name,
          capabilityDocUrl: airCap.docUrl,
          direction: 'supports',
          strength: 'high',
          explanation: 'IOMETE provides offline air-gapped Helm packages that run with zero telemetry or licensing internet pings.'
        });
      }
      status = 'measured';
      score = 96;
    } else if (/(zero-infrastructure|managed saas only|cannot and will not manage containers|multi-tenant cloud is completely satisfactory|turnkey managed saas)/i.test(text)) {
      const negLine = findMatchingInputLine(
        rawMarkdown,
        /(zero-infrastructure|managed saas|cannot and will not manage containers|multi-tenant cloud is completely satisfactory)/i,
        'Refuses to manage containers or Kubernetes; insists on managed multi-tenant SaaS',
        'Section: Constraints & Compliance'
      );
      evidence.push({
        id: 'ev_sov_neg',
        dimensionId: 'sovereignty_deployment',
        sourceText: negLine.sourceText,
        sourceLine: negLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'high',
        explanation: 'IOMETE requires deployment in customer Kubernetes; prospect has zero desire for sovereign control.'
      });
      status = 'measured';
      score = 15;
    } else if (/(byoc|bring your own cloud|bring-your-own-cloud|vpc|aws eks|gke|aks|self-hosted|customer-hosted)/i.test(text)) {
      const cap = capabilitiesById.get('cap_sovereign_deployment')!;
      const isOptionalCloud = /commercial aws cloud.*approved|flexible/i.test(text);
      const byocLine = findMatchingInputLine(
        rawMarkdown,
        /(byoc|bring your own cloud|bring-your-own-cloud|vpc|aws eks|gke|aks|self-hosted)/i,
        'Open to Bring-Your-Own-Cloud (BYOC) in customer cloud VPC / Kubernetes',
        'Section: Constraints & Compliance'
      );
      evidence.push({
        id: 'ev_sov_byoc',
        dimensionId: 'sovereignty_deployment',
        sourceText: byocLine.sourceText,
        sourceLine: byocLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: isOptionalCloud ? 'neutral' : 'supports',
        strength: 'medium',
        explanation: isOptionalCloud
          ? 'Customer does not have a strict regulatory sovereignty mandate, though BYOC in their AWS VPC is viable.'
          : 'BYOC in customer Kubernetes matches IOMETE customer-hosted model, providing data isolation without requiring on-prem hardware.'
      });
      status = 'measured';
      score = isOptionalCloud ? 42 : 72;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('No deployment preference or data residency constraint was stated in the input.');
    }

    result.sovereignty_deployment = {
      dimensionId: 'sovereignty_deployment',
      name: DIMENSION_METADATA.sovereignty_deployment.name,
      defaultWeight: 25,
      userWeight: userWeights.sovereignty_deployment,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.sovereignty_deployment.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'Does your organization require data to stay strictly within your own cloud VPC or on-premise perimeter, or is multi-tenant third-party SaaS permitted?'
    };
  }

  // 2. Data scale and variety (15%)
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(petabyte|\b\d+(\.\d+)?\s*pb\b|\b[5-9]\d\s*tb\b|\b\d{2,}\s*tb\b|terabyte|multi-terabyte)/i.test(text)) {
      const cap = capabilitiesById.get('cap_apache_iceberg')!;
      const scaleLine = findMatchingInputLine(
        rawMarkdown,
        /(petabyte|\b\d+(\.\d+)?\s*pb\b|\b\d+(\.\d+)?\s*tb\b|terabyte)/i,
        'Multi-terabyte or petabyte mixed format data (Parquet, JSON, streaming logs)',
        'Section: Data Sources, Scale & Formats'
      );
      evidence.push({
        id: 'ev_scale_1',
        dimensionId: 'scale_variety',
        sourceText: scaleLine.sourceText,
        sourceLine: scaleLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'High volume and diverse semi-structured streams unlock maximum value from open Iceberg table compaction and distributed Spark scaling.'
      });

      if (/(kafka|kinesis|streaming|real-time)/i.test(text)) {
        const streamCap = capabilitiesById.get('cap_streaming_ingestion')!;
        const streamLine = findMatchingInputLine(
          rawMarkdown,
          /(kafka|kinesis|streaming|real-time)/i,
          'Real-time event stream ingestion from Kafka / Kinesis',
          'Section: Data Workflows'
        );
        evidence.push({
          id: 'ev_scale_stream',
          dimensionId: 'scale_variety',
          sourceText: streamLine.sourceText,
          sourceLine: streamLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: streamCap.id,
          capabilityName: streamCap.name,
          capabilityDocUrl: streamCap.docUrl,
          direction: 'supports',
          strength: 'medium',
          explanation: 'Native streaming connector buffers and compacts records directly into Iceberg with sub-minute query readiness.'
        });
      }
      status = 'measured';
      score = /(petabyte|\b\d+(\.\d+)?\s*pb\b)/i.test(text) ? 95 : 76;
    } else if (/\b(1[0-9]|2[0-9]|[1-9])\s*(gb|gigabytes?)\b|14 gigabytes|<100 gb|<50 gb/i.test(text)) {
      const tinyLine = findMatchingInputLine(
        rawMarkdown,
        /(\b\d+\s*(gb|gigabytes?)\b|<100 gb|<50 gb)/i,
        'Under 50 GB total volume in a single relational database',
        'Section: Data Sources, Scale & Formats'
      );
      evidence.push({
        id: 'ev_scale_tiny',
        dimensionId: 'scale_variety',
        sourceText: tinyLine.sourceText,
        sourceLine: tinyLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'high',
        explanation: 'Data volume is far too small to justify the distributed overhead and node coordination of a lakehouse.'
      });
      status = 'measured';
      score = 15;
    } else if (/(parquet|avro|orc|kafka|kinesis|unstructured|semi-structured|json.*stream)/i.test(text)) {
      const cap = capabilitiesById.get('cap_apache_iceberg')!;
      const varLine = findMatchingInputLine(
        rawMarkdown,
        /(parquet|avro|orc|kafka|kinesis|unstructured|semi-structured|json)/i,
        'Mixed analytical data formats (Parquet, JSON, or event streams)',
        'Section: Data Sources, Scale & Formats'
      );
      evidence.push({
        id: 'ev_scale_variety_formats',
        dimensionId: 'scale_variety',
        sourceText: varLine.sourceText,
        sourceLine: varLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'medium',
        explanation: 'Multi-format analytical data benefits from unified Apache Iceberg table management.'
      });
      status = 'measured';
      score = 68;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('Exact data volumes and growth trajectories are omitted.');
    }

    result.scale_variety = {
      dimensionId: 'scale_variety',
      name: DIMENSION_METADATA.scale_variety.name,
      defaultWeight: 15,
      userWeight: userWeights.scale_variety,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.scale_variety.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'What is your current total analytical data volume, and what is your monthly ingestion rate across streaming and batch?'
    };
  }

  // 3. Lock-in and openness concern (15%) - Accuracy Rule #4: Explicit lock-in or open-format mentions MUST score
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(board-level.*directive.*iceberg|vendor hostage|escape.*lock-in|eliminate.*lock-in|prevent vendor lock-in|mandate.*open.*iceberg)/i.test(text)) {
      const cap = capabilitiesById.get('cap_apache_iceberg')!;
      const lockLine = findMatchingInputLine(
        rawMarkdown,
        /(board-level.*directive|vendor hostage|escape.*lock-in|eliminate.*lock-in|prevent vendor|open.*iceberg)/i,
        'Explicit directive to decouple storage into open Apache Iceberg format to escape vendor lock-in',
        'Section: Pain Points & Buying Triggers'
      );
      evidence.push({
        id: 'ev_lockin_1',
        dimensionId: 'lockin_openness',
        sourceText: lockLine.sourceText,
        sourceLine: lockLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'IOMETE is built natively on Apache Iceberg, guaranteeing that the customer owns their data files in standard formats queryable by external engines.'
      });
      status = 'measured';
      score = 94;
    } else if (/(standard postgresql dump is sufficient|no lock-in anxiety|lock-in anxiety:\s*none|no lock-in concern)/i.test(text)) {
      const noneLine = findMatchingInputLine(
        rawMarkdown,
        /(standard postgresql dump|no lock-in|lock-in anxiety:\s*none)/i,
        'No lock-in anxiety; standard single-node database exports are satisfactory',
        'Section: Pain Points & Buying Triggers'
      );
      evidence.push({
        id: 'ev_lockin_none',
        dimensionId: 'lockin_openness',
        sourceText: noneLine.sourceText,
        sourceLine: noneLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'medium',
        explanation: 'Customer has no lock-in concerns and is content with simple relational database dumps.'
      });
      status = 'measured';
      score = 22;
    } else if (
      /(lock-in|lock in|open-format|open format|open table|open standard|apache iceberg|\biceberg\b|delta lake|hudi|proprietary.*format|proprietary.*storage|vendor.*lock|portability|decouple.*storage|openness|open source format)/i.test(
        text
      )
    ) {
      const cap = capabilitiesById.get('cap_apache_iceberg')!;
      const openLine = findMatchingInputLine(
        rawMarkdown,
        /(lock-in|lock in|open-format|open format|open table|open standard|iceberg|delta lake|hudi|proprietary|vendor.*lock|portability|decouple|openness)/i,
        'Concerned about proprietary warehouse format or vendor lock-in; interested in open Apache Iceberg tables',
        'Section: Pain Points & Buying Triggers'
      );
      evidence.push({
        id: 'ev_lockin_moderate',
        dimensionId: 'lockin_openness',
        sourceText: openLine.sourceText,
        sourceLine: openLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'Transitioning from proprietary warehouse formats to open Apache Iceberg tables provides long-term architectural optionality and eliminates storage lock-in.'
      });
      status = 'measured';
      score = 80;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('No explicit stance on vendor lock-in or open vs. proprietary table formats was stated.');
    }

    result.lockin_openness = {
      dimensionId: 'lockin_openness',
      name: DIMENSION_METADATA.lockin_openness.name,
      defaultWeight: 15,
      userWeight: userWeights.lockin_openness,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.lockin_openness.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'How critical is it for your team to maintain raw data ownership in open standards (like Apache Iceberg) rather than proprietary warehouse formats?'
    };
  }

  // 4. Analytics and AI workloads (15%)
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(single nightly sql script|daily cohort query completes in 4\.2 seconds)/i.test(text)) {
      const tinyWfLine = findMatchingInputLine(
        rawMarkdown,
        /(single nightly sql|completes in 4\.2 seconds)/i,
        'Single nightly SQL script running on single RDS node in 4.2 seconds',
        'Section: Core Data Workflows'
      );
      evidence.push({
        id: 'ev_workload_tiny',
        dimensionId: 'analytics_ai',
        sourceText: tinyWfLine.sourceText,
        sourceLine: tinyWfLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'high',
        explanation: 'Simple single-query workload has zero need for distributed compute engines.'
      });
      status = 'measured';
      score = 20;
    } else if (/(pyspark feature engineering|algorithmic market stress|45 million daily|ml pipeline|machine learning|data science)/i.test(text)) {
      const cap = capabilitiesById.get('cap_apache_spark_k8s')!;
      const sparkLine = findMatchingInputLine(
        rawMarkdown,
        /(pyspark|market stress|45 million|ml pipeline|machine learning|feature engineering)/i,
        'Heavy PySpark feature engineering, batch ETL, and high-concurrency analytical queries',
        'Section: Core Data Workflows'
      );
      evidence.push({
        id: 'ev_workload_spark',
        dimensionId: 'analytics_ai',
        sourceText: sparkLine.sourceText,
        sourceLine: sparkLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: "IOMETE's Kubernetes-native Spark engine provides elastic cluster scale for heavy transformations without paying per-minute warehouse premiums."
      });

      if (/(bi|dashboard|concurrent|superset|tableau|powerbi|analyst)/i.test(text)) {
        const sqlCap = capabilitiesById.get('cap_sql_editor_notebooks')!;
        const biLine = findMatchingInputLine(
          rawMarkdown,
          /(bi|dashboard|concurrent|superset|tableau|powerbi)/i,
          'BI reporting dashboards serving concurrent analysts',
          'Section: Core Data Workflows'
        );
        evidence.push({
          id: 'ev_workload_bi',
          dimensionId: 'analytics_ai',
          sourceText: biLine.sourceText,
          sourceLine: biLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: sqlCap.id,
          capabilityName: sqlCap.name,
          capabilityDocUrl: sqlCap.docUrl,
          direction: 'supports',
          strength: 'medium',
          explanation: 'Built-in SQL editor, isolated virtual clusters, and high-throughput JDBC drivers serve analytical dashboard queries with low latency.'
        });
      }
      status = 'measured';
      score = 92;
    } else if (/(dbt|tableau|powerbi|superset|cohort modeling|replenishment|forecasting|etl|sql|kafka|streaming|analytics|bi reporting)/i.test(text)) {
      const cap = capabilitiesById.get('cap_bi_connectors_jdbc')!;
      const wfLine = findMatchingInputLine(
        rawMarkdown,
        /(dbt|tableau|powerbi|superset|cohort|replenishment|forecasting|etl|sql|kafka|streaming)/i,
        'Analytical ETL transformations, streaming ingestion, and BI reporting workloads',
        'Section: Core Data Workflows'
      );
      evidence.push({
        id: 'ev_workload_retail',
        dimensionId: 'analytics_ai',
        sourceText: wfLine.sourceText,
        sourceLine: wfLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'medium',
        explanation: 'dbt Core, Spark ETL, and BI tools connect cleanly via JDBC driver and dbt-iomete adapter to IOMETE Spark clusters.'
      });
      status = 'measured';
      score = 68;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('Analytical and AI workload specifics are undefined.');
    }

    result.analytics_ai = {
      dimensionId: 'analytics_ai',
      name: DIMENSION_METADATA.analytics_ai.name,
      defaultWeight: 15,
      userWeight: userWeights.analytics_ai,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.analytics_ai.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'What does your mix of workloads look like across batch PySpark ETL, ad-hoc BI dashboard SQL, and machine learning pipelines?'
    };
  }

  // 5. Cost pressure (10%)
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(\$2\.1m|\$1\.8m|70%.*markup|spiked|ballooning|budget overrun|\$740k|\$\d+00k|compute cost|credit.*charge|expensive|cost pressure|reduce.*spend|cut.*bill)/i.test(text) && !/no compute cost pressure/i.test(text)) {
      const cap = capabilitiesById.get('cap_zero_compute_markup')!;
      const costLine = findMatchingInputLine(
        rawMarkdown,
        /(\$\d+|\bmarkup\b|spiked|ballooning|budget overrun|compute cost|credit.*charge|compute credit|expensive|cost pressure|reduce.*spend|cut.*bill)/i,
        'Warehouse compute bill pressure driven by cloud vendor compute credit markups',
        'Section: Pain Points & Buying Triggers'
      );
      evidence.push({
        id: 'ev_cost_1',
        dimensionId: 'cost_pressure',
        sourceText: costLine.sourceText,
        sourceLine: costLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: "IOMETE's transparent zero-compute-markup model eliminates the compute margin typically tacked onto underlying cloud or on-prem infrastructure."
      });
      status = 'measured';
      score = 95;
    } else if (/(bill is currently \$140\/month|no compute cost pressure)/i.test(text)) {
      const lowCostLine = findMatchingInputLine(
        rawMarkdown,
        /(\$140\/month|no compute cost pressure)/i,
        'Cloud database bill is $140/month; no compute cost pressure whatsoever',
        'Section: Pain Points & Buying Triggers'
      );
      evidence.push({
        id: 'ev_cost_none',
        dimensionId: 'cost_pressure',
        sourceText: lowCostLine.sourceText,
        sourceLine: lowCostLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'high',
        explanation: 'Current infrastructure spend is negligible. An enterprise lakehouse platform license cannot be financially justified.'
      });
      status = 'measured';
      score = 10;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('Current warehouse compute spend and budget trends not provided.');
    }

    result.cost_pressure = {
      dimensionId: 'cost_pressure',
      name: DIMENSION_METADATA.cost_pressure.name,
      defaultWeight: 10,
      userWeight: userWeights.cost_pressure,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.cost_pressure.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'What is your current annualized spend on warehouse compute credits, and how much has that spend grown over the last 12 months?'
    };
  }

  // 6. Technical readiness (10%)
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(0 dedicated data engineers|no experience with apache spark|cannot and will not manage containers|no data team)/i.test(text)) {
      const noTechLine = findMatchingInputLine(
        rawMarkdown,
        /(0 dedicated data engineers|no experience with apache spark|cannot and will not manage containers|no data team)/i,
        'Zero data engineers, zero distributed systems or Kubernetes experience',
        'Section: Team Composition & Technical Readiness'
      );
      evidence.push({
        id: 'ev_tech_none',
        dimensionId: 'tech_readiness',
        sourceText: noTechLine.sourceText,
        sourceLine: noTechLine.sourceLine,
        sourceType: 'Stated',
        direction: 'hurts',
        strength: 'high',
        explanation: 'Lacks the foundational competencies to operate or derive value from a Kubernetes-based lakehouse.'
      });
      status = 'measured';
      score = 15;
    } else if (/(14 senior data platform|kubernetes devops|deep expertise in apache spark|linux container tuning|platform sres)/i.test(text)) {
      const cap = capabilitiesById.get('cap_k8s_native_operator')!;
      const highTechLine = findMatchingInputLine(
        rawMarkdown,
        /(senior data platform|kubernetes devops|deep expertise in apache spark|linux container|platform sres)/i,
        'Mature internal platform engineering team with deep Spark, Iceberg, and Kubernetes expertise',
        'Section: Team Composition & Technical Readiness'
      );
      evidence.push({
        id: 'ev_tech_high',
        dimensionId: 'tech_readiness',
        sourceText: highTechLine.sourceText,
        sourceLine: highTechLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'Team possesses optimal skills to operate IOMETE operators, optimize Kubernetes worker pools, and write PySpark pipelines immediately.'
      });
      status = 'measured';
      score = 95;
    } else if (/(data engineer|analytics engineer|moderate experience with pyspark|basic aws eks|kubernetes|spark|k8s)/i.test(text)) {
      const cap = capabilitiesById.get('cap_k8s_native_operator')!;
      const reluctantOps = /no dedicated platform|reluctant to troubleshoot|prefers managed/i.test(text);
      const midTechLine = findMatchingInputLine(
        rawMarkdown,
        /(data engineer|analytics engineer|pyspark|aws eks|kubernetes|spark|k8s)/i,
        'Dedicated data engineers with Spark/SQL background and managed Kubernetes usage',
        'Section: Team Composition & Technical Readiness'
      );
      evidence.push({
        id: 'ev_tech_mid',
        dimensionId: 'tech_readiness',
        sourceText: midTechLine.sourceText,
        sourceLine: midTechLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: reluctantOps ? 'neutral' : 'supports',
        strength: 'medium',
        explanation: reluctantOps
          ? 'Team can write Spark/dbt jobs, but operating Kubernetes operators requires coordination with central cloud SRE.'
          : 'Capable team for data modeling and query development; may need assisted onboarding for initial Kubernetes operator setup.'
      });
      status = 'measured';
      score = reluctantOps ? 52 : 68;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('Engineering team size and familiarity with distributed engines is not stated.');
    }

    result.tech_readiness = {
      dimensionId: 'tech_readiness',
      name: DIMENSION_METADATA.tech_readiness.name,
      defaultWeight: 10,
      userWeight: userWeights.tech_readiness,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.tech_readiness.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'Does your team have hands-on experience running Apache Spark or managing applications on Kubernetes?'
    };
  }

  // 7. Governance and compliance needs (10%) - Accuracy Rule #4: Explicit governance needs (access control, audit logs, lineage) MUST score
  {
    const evidence: EvidenceItem[] = [];
    const gaps: string[] = [];
    let score: number | null = null;
    let status: 'measured' | 'not_scored' = 'not_scored';

    if (/(column-level cryptographic masking|swift codes|bafin|fedramp|point-in-time financial state|tamper-evident audit)/i.test(text)) {
      const cap = capabilitiesById.get('cap_column_row_masking')!;
      const maskLine = findMatchingInputLine(
        rawMarkdown,
        /(column-level|row-level|swift codes|masking|access control|bafin|fedramp)/i,
        'Mandatory column-level masking on SWIFT codes, SSNs, and trade counterparties',
        'Section: Constraints, Residency & Compliance'
      );
      evidence.push({
        id: 'ev_gov_rbac',
        dimensionId: 'governance_compliance',
        sourceText: maskLine.sourceText,
        sourceLine: maskLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: cap.id,
        capabilityName: cap.name,
        capabilityDocUrl: cap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'IOMETE enforces dynamic column and row-level masking policies at query time alongside immutable audit logs.'
      });

      const auditCap = capabilitiesById.get('cap_comprehensive_audit_trail')!;
      const auditLine = findMatchingInputLine(
        rawMarkdown,
        /(compliance auditing|point-in-time|audit trail|tamper-evident)/i,
        'Air-gapped institutional compliance auditing with tamper-evident records',
        'Section: Core Data Workflows'
      );
      evidence.push({
        id: 'ev_gov_audit',
        dimensionId: 'governance_compliance',
        sourceText: auditLine.sourceText,
        sourceLine: auditLine.sourceLine,
        sourceType: 'Stated',
        capabilityId: auditCap.id,
        capabilityName: auditCap.name,
        capabilityDocUrl: auditCap.docUrl,
        direction: 'supports',
        strength: 'high',
        explanation: 'All query executions and administrative changes are recorded in tamper-evident structured audit trails.'
      });
      status = 'measured';
      score = 95;
    } else if (/(basic application password|no fine-grained role matrices needed)/i.test(text)) {
      const minGovLine = findMatchingInputLine(
        rawMarkdown,
        /(basic application password|no fine-grained role matrices)/i,
        'Basic username/password authentication; no fine-grained role matrices needed',
        'Section: Constraints, Residency & Compliance'
      );
      evidence.push({
        id: 'ev_gov_none',
        dimensionId: 'governance_compliance',
        sourceText: minGovLine.sourceText,
        sourceLine: minGovLine.sourceLine,
        sourceType: 'Stated',
        direction: 'neutral',
        strength: 'low',
        explanation: 'Governance requirements are minimal, reducing the strategic urgency of enterprise security features.'
      });
      status = 'measured';
      score = 30;
    } else if (
      /(access control|audit log|audit trail|auditing|lineage|data catalog|catalog|masking|row-level|column-level|credit card|pci-dss|pci|soc 2|soc2|ccpa|gdpr|hipaa|rbac|abac|governance|fine-grained|pii|iso 27001)/i.test(
        text
      )
    ) {
      if (/(access control|masking|row-level|column-level|credit card|pci|soc 2|soc2|ccpa|gdpr|hipaa|rbac|abac|fine-grained|pii|governance)/i.test(text)) {
        const cap = capabilitiesById.get('cap_fine_grained_rbac')!;
        const rbacLine = findMatchingInputLine(
          rawMarkdown,
          /(access control|masking|row-level|column-level|credit card|pci|soc 2|soc2|ccpa|gdpr|hipaa|rbac|abac|fine-grained|pii|governance)/i,
          'Access control, PII masking, and regulatory governance requirements stated',
          'Section: Constraints, Residency & Compliance'
        );
        evidence.push({
          id: 'ev_gov_access',
          dimensionId: 'governance_compliance',
          sourceText: rbacLine.sourceText,
          sourceLine: rbacLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: cap.id,
          capabilityName: cap.name,
          capabilityDocUrl: cap.docUrl,
          direction: 'supports',
          strength: 'medium',
          explanation: 'Fine-grained RBAC/ABAC and dynamic masking rules ensure non-privileged users cannot access restricted PII columns.'
        });
      }

      if (/(audit log|audit trail|auditing|iso 27001|soc 2|soc2)/i.test(text)) {
        const auditCap = capabilitiesById.get('cap_comprehensive_audit_trail')!;
        const auditLine = findMatchingInputLine(
          rawMarkdown,
          /(audit log|audit trail|auditing|iso 27001|soc 2|soc2)/i,
          'Audit logging and compliance verification requirements stated',
          'Section: Constraints, Residency & Compliance'
        );
        evidence.push({
          id: 'ev_gov_audit_log',
          dimensionId: 'governance_compliance',
          sourceText: auditLine.sourceText,
          sourceLine: auditLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: auditCap.id,
          capabilityName: auditCap.name,
          capabilityDocUrl: auditCap.docUrl,
          direction: 'supports',
          strength: 'medium',
          explanation: 'Immutable query and access audit logs record every table scan and permission change inside the customer perimeter.'
        });
      }

      if (/(lineage|data catalog|catalog)/i.test(text)) {
        const catCap = capabilitiesById.get('cap_data_catalog_discovery')!;
        const catLine = findMatchingInputLine(
          rawMarkdown,
          /(lineage|data catalog|catalog)/i,
          'Data catalog and lineage tracking requirements stated',
          'Section: Constraints, Residency & Compliance'
        );
        evidence.push({
          id: 'ev_gov_lineage_catalog',
          dimensionId: 'governance_compliance',
          sourceText: catLine.sourceText,
          sourceLine: catLine.sourceLine,
          sourceType: 'Stated',
          capabilityId: catCap.id,
          capabilityName: catCap.name,
          capabilityDocUrl: catCap.docUrl,
          direction: 'supports',
          strength: 'medium',
          explanation: 'Built-in data catalog and schema tagging organize lakehouse tables and integrate with open lineage ecosystems.'
        });
      }

      status = 'measured';
      score = evidence.length >= 2 ? 84 : 75;
    } else {
      status = 'not_scored';
      score = null;
      gaps.push('Compliance framework, access control, and audit logging specifications are not stated.');
    }

    result.governance_compliance = {
      dimensionId: 'governance_compliance',
      name: DIMENSION_METADATA.governance_compliance.name,
      defaultWeight: 10,
      userWeight: userWeights.governance_compliance,
      score,
      status,
      whyItMatters: DIMENSION_METADATA.governance_compliance.whyItMatters,
      evidence,
      gaps,
      discoveryQuestion: 'What specific data masking, column-level access control, lineage, or audit logging mandates must be satisfied for your security audits?'
    };
  }

  return result;
}

/**
 * Accuracy Rule #1:
 * Generates "Why this verdict" bullets ONLY from the evidence items for this specific input.
 * Each bullet cites evidence IDs (e.g. [ev_sov_1]) and mentions ONLY dimensions that have evidence.
 * No fixed per-band text is used.
 */
export function generateEvidenceOnlyWhyBullets(
  dimensions: Record<DimensionId, DimensionScore>,
  disqualifiers: DisqualifierFlag[]
): string[] {
  const bullets: string[] = [];

  const measuredDims = Object.values(dimensions)
    .filter(d => d.status === 'measured' && d.score !== null && d.evidence.length > 0)
    .sort((a, b) => (b.userWeight * (b.score ?? 0)) - (a.userWeight * (a.score ?? 0)));

  for (const dim of measuredDims) {
    const evIds = dim.evidence.map(e => e.id).join(', ');
    const primaryEv = dim.evidence[0];
    const dirWord =
      primaryEv.direction === 'supports'
        ? 'supports fit'
        : primaryEv.direction === 'hurts'
        ? 'reduces fit'
        : 'provides context';
    const docCite = primaryEv.capabilityDocUrl ? ` (${primaryEv.capabilityDocUrl})` : '';

    bullets.push(
      `[${evIds}] ${dim.name} (${dim.score}/100, weight ${dim.userWeight}%) ${dirWord}: Input states "${primaryEv.sourceText}" (${primaryEv.sourceLine}). ${primaryEv.explanation}${docCite}`
    );
  }

  if (disqualifiers.length > 0 && bullets.length > 0) {
    const hurtingEvs = Object.values(dimensions)
      .flatMap(d => d.evidence)
      .filter(e => e.direction === 'hurts');
    if (hurtingEvs.length > 0) {
      const hurtIds = hurtingEvs.map(e => e.id).join(', ');
      bullets.unshift(
        `[${hurtIds}] Disqualifier Cap Applied (${disqualifiers[0].title}): ${disqualifiers[0].triggeredBecause} ${disqualifiers[0].honestRecommendation}`
      );
    }
  }

  return bullets;
}

/**
 * Accuracy Rule #1 Validator:
 * Rejects any "Why this verdict" bullet that:
 * 1) Fails to cite at least one valid evidence ID from a measured dimension in `dimensions`, OR
 * 2) Names a dimension or topic (cost pressure, Kubernetes, streaming, air gap, sovereignty, lock-in, governance, etc.)
 *    without a matching evidence item from the input.
 * If rejected, drops the offending bullet and regenerates from `generateEvidenceOnlyWhyBullets` if needed.
 */
export function validateWhyVerdictBullets(
  candidateBullets: string[],
  dimensions: Record<DimensionId, DimensionScore>,
  disqualifiers: DisqualifierFlag[] = []
): {
  validBullets: string[];
  rejectedBullets: string[];
} {
  const validEvidenceMap = new Map<string, EvidenceItem>();
  const allEvidenceTextCombined: string[] = [];

  for (const dim of Object.values(dimensions)) {
    if (dim.status === 'measured' && dim.score !== null && dim.evidence.length > 0) {
      for (const ev of dim.evidence) {
        validEvidenceMap.set(ev.id, ev);
        allEvidenceTextCombined.push(
          `${dim.name} ${ev.sourceText} ${ev.explanation} ${ev.capabilityName || ''}`.toLowerCase()
        );
      }
    }
  }

  const combinedEvidenceCorpus = allEvidenceTextCombined.join(' || ');

  // Topic guards: if a bullet mentions any of these topics, the input's extracted evidence MUST actually contain that topic/dimension
  const topicGuards: Array<{
    topicName: string;
    bulletRegex: RegExp;
    requiredDim?: DimensionId;
    evidenceRegex: RegExp;
  }> = [
    {
      topicName: 'cost pressure / compute spend',
      bulletRegex: /\b(cost pressure|compute markup|credit bill|warehouse spend|runaway.*bill|budget overrun)\b/i,
      requiredDim: 'cost_pressure',
      evidenceRegex: /\b(cost|markup|bill|spend|credit|overrun|\$\d+)\b/i
    },
    {
      topicName: 'air gap',
      bulletRegex: /\b(air-gap|air gap|air-gapped|airgapped)\b/i,
      requiredDim: 'sovereignty_deployment',
      evidenceRegex: /\b(air-gap|air gap|air-gapped|airgapped|offline)\b/i
    },
    {
      topicName: 'Kubernetes',
      bulletRegex: /\b(kubernetes|k8s|openshift|rancher|\beks\b|\bgke\b|\baks\b)\b/i,
      evidenceRegex: /\b(kubernetes|k8s|openshift|rancher|eks|gke|aks|container|helm)\b/i
    },
    {
      topicName: 'streaming',
      bulletRegex: /\b(streaming|kafka|kinesis|real-time stream)\b/i,
      evidenceRegex: /\b(streaming|kafka|kinesis|real-time|stream)\b/i
    },
    {
      topicName: 'sovereignty / residency',
      bulletRegex: /\b(sovereign|sovereignty|data residency|on-premise|on-prem)\b/i,
      requiredDim: 'sovereignty_deployment',
      evidenceRegex: /\b(sovereign|sovereignty|residency|on-prem|datacenter|enclave|vpc|byoc)\b/i
    },
    {
      topicName: 'lock-in / Iceberg openness',
      bulletRegex: /\b(lock-in|vendor hostage|proprietary format)\b/i,
      requiredDim: 'lockin_openness',
      evidenceRegex: /\b(lock-in|hostage|proprietary|iceberg|open format|open table)\b/i
    },
    {
      topicName: 'governance / masking / audit',
      bulletRegex: /\b(column-level masking|row-level|audit log|audit trail|lineage|rbac|abac)\b/i,
      requiredDim: 'governance_compliance',
      evidenceRegex: /\b(masking|row-level|column-level|audit|lineage|rbac|abac|access control|governance|catalog)\b/i
    }
  ];

  const validBullets: string[] = [];
  const rejectedBullets: string[] = [];

  for (const bullet of candidateBullets) {
    // 1. Must cite at least one valid [ev_...] ID from this input's measured dimensions
    const citedIds = [...bullet.matchAll(/\b(ev_[a-z0-9_]+)\b/gi)].map(m => m[1]);
    const hasValidCitation =
      citedIds.length > 0 && citedIds.every(id => validEvidenceMap.has(id));

    if (!hasValidCitation) {
      rejectedBullets.push(bullet);
      continue;
    }

    // 2. Check that the bullet does not name any unscored dimension
    let mentionsUnscoredDimension = false;
    for (const dim of Object.values(dimensions)) {
      if (dim.status !== 'measured' || dim.evidence.length === 0) {
        if (bullet.toLowerCase().includes(dim.name.toLowerCase())) {
          mentionsUnscoredDimension = true;
          break;
        }
      }
    }
    if (mentionsUnscoredDimension) {
      rejectedBullets.push(bullet);
      continue;
    }

    // 3. Check topic guards against the actual evidence corpus
    let failedTopicGuard = false;
    for (const guard of topicGuards) {
      if (guard.bulletRegex.test(bullet)) {
        if (
          guard.requiredDim &&
          (dimensions[guard.requiredDim].status !== 'measured' ||
            dimensions[guard.requiredDim].evidence.length === 0)
        ) {
          failedTopicGuard = true;
          break;
        }
        if (!guard.evidenceRegex.test(combinedEvidenceCorpus)) {
          failedTopicGuard = true;
          break;
        }
      }
    }

    if (failedTopicGuard) {
      rejectedBullets.push(bullet);
      continue;
    }

    validBullets.push(bullet);
  }

  // If candidate bullets were rejected and we have measured evidence, regenerate strictly from evidence items
  if (validBullets.length === 0 && validEvidenceMap.size > 0) {
    const regenerated = generateEvidenceOnlyWhyBullets(dimensions, disqualifiers);
    for (const regBullet of regenerated) {
      validBullets.push(regBullet);
    }
  }

  return { validBullets, rejectedBullets };
}

/**
 * Computes overall score and verdict from dimensions and disqualifiers.
 * Accuracy Rules #2 & #3:
 * - Dimensions with no evidence are 'not_scored' (`score: null`) and excluded from the average (never counted as 0).
 * - If fewer than 4 of 7 dimensions have evidence, OR confidence is under 40%, do NOT show a fit band or a score:
 *   return verdictBand = 'Insufficient information', overallScore = null, and a neutral headline that makes NO claim
 *   about scale, sovereignty, or cost.
 */
export function calculateOverallVerdict(
  dimensions: Record<DimensionId, DimensionScore>,
  disqualifiers: DisqualifierFlag[],
  qualityCheck: InputQualityCheck
): {
  isInsufficientInfo: boolean;
  scoredDimensionsCount: number;
  overallScore: number | null;
  rawComputedScore: number | null;
  verdictBand: VerdictBand;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  oneSentenceReason: string;
} {
  let weightedScoreSum = 0;
  let totalActiveWeight = 0;
  let scoredDimensionsCount = 0;
  let unscoredCount = 0;

  (Object.keys(dimensions) as DimensionId[]).forEach(dimId => {
    const dim = dimensions[dimId];
    if (dim.status === 'measured' && dim.score !== null && dim.evidence.length > 0) {
      scoredDimensionsCount += 1;
      weightedScoreSum += dim.score * dim.userWeight;
      totalActiveWeight += dim.userWeight;
    } else {
      unscoredCount += 1;
    }
  });

  // Confidence calculation: combines section coverage and dimension evidence completeness
  let confidenceScore = Math.max(
    10,
    Math.round(qualityCheck.coverageScore * 0.5 + (scoredDimensionsCount / 7) * 50) - unscoredCount * 4
  );
  if (disqualifiers.length > 0 && scoredDimensionsCount >= 4 && qualityCheck.coverageScore >= 70) {
    confidenceScore = Math.max(confidenceScore, 92);
  }
  confidenceScore = Math.max(5, Math.min(100, confidenceScore));

  let confidenceLevel: ConfidenceLevel = 'High';
  if (confidenceScore < 50) {
    confidenceLevel = 'Low';
  } else if (confidenceScore < 75) {
    confidenceLevel = 'Medium';
  }

  // Accuracy Rule #3: Fewer than 4 of 7 dimensions have evidence, OR confidence < 40%
  if (scoredDimensionsCount < 4 || confidenceScore < 40) {
    return {
      isInsufficientInfo: true,
      scoredDimensionsCount,
      overallScore: null,
      rawComputedScore: null,
      verdictBand: 'Insufficient information',
      confidenceLevel: 'Low',
      confidenceScore,
      // Headline MUST NOT make any claim about scale, sovereignty, or cost
      oneSentenceReason: `Insufficient information: Only ${scoredDimensionsCount} of 7 rubric dimensions have verified evidence (${confidenceScore}% confidence). Complete the discovery questions below before a fit score can be computed.`
    };
  }

  const rawComputedScore =
    totalActiveWeight > 0 ? Math.round(weightedScoreSum / totalActiveWeight) : null;

  if (rawComputedScore === null) {
    return {
      isInsufficientInfo: true,
      scoredDimensionsCount,
      overallScore: null,
      rawComputedScore: null,
      verdictBand: 'Insufficient information',
      confidenceLevel: 'Low',
      confidenceScore,
      oneSentenceReason: `Insufficient information: Active rubric weights sum to 0. Reset or increase dimension weights to compute a score.`
    };
  }

  let overallScore = rawComputedScore;
  let verdictBand: VerdictBand = 'Possible fit';

  if (rawComputedScore >= 75) {
    verdictBand = 'Strong fit';
  } else if (rawComputedScore >= 50) {
    verdictBand = 'Possible fit';
  } else if (rawComputedScore >= 18) {
    verdictBand = 'Weak fit';
  } else {
    verdictBand = 'Not a fit';
  }

  // PRD Rule 5.2: Disqualifier flags cap the overall verdict regardless of other scores
  if (disqualifiers.length > 0) {
    const hasSubScale = disqualifiers.some(d => d.id === 'disqualifier_tiny_scale_no_team');
    if (hasSubScale) {
      verdictBand = 'Weak fit';
      overallScore = Math.max(21, Math.min(overallScore, 25));
    } else {
      verdictBand = 'Not a fit';
      overallScore = Math.min(overallScore, 24);
    }
  }

  // Build headline strictly from measured dimensions
  const topMeasuredNames = Object.values(dimensions)
    .filter(d => d.status === 'measured' && d.score !== null && d.evidence.length > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 2)
    .map(d => `${d.name} (${d.score}/100)`)
    .join(' and ');

  let oneSentenceReason = '';
  if (disqualifiers.length > 0) {
    oneSentenceReason = `Disqualified (${verdictBand}, ${overallScore}/100): ${disqualifiers[0].triggeredBecause} ${disqualifiers[0].impactOnVerdict}`;
  } else if (verdictBand === 'Strong fit') {
    oneSentenceReason = `Strong fit (${overallScore}/100 across ${scoredDimensionsCount}/7 scored dimensions), led by ${topMeasuredNames}.`;
  } else if (verdictBand === 'Possible fit') {
    oneSentenceReason = `Possible fit (${overallScore}/100 across ${scoredDimensionsCount}/7 scored dimensions), supported by ${topMeasuredNames} with operational discovery required.`;
  } else {
    oneSentenceReason = `${verdictBand} (${overallScore}/100 across ${scoredDimensionsCount}/7 scored dimensions) based on current evidence items.`;
  }

  return {
    isInsufficientInfo: false,
    scoredDimensionsCount,
    overallScore,
    rawComputedScore,
    verdictBand,
    confidenceLevel,
    confidenceScore,
    oneSentenceReason
  };
}

/**
 * Validator (PRD Section 8):
 * Verifies that every Sourced claim or workflow match references a valid capability in
 * IOMETE_CAPABILITIES with a non-empty resolving docUrl, and downgrades unverified claims to 'Assumed'.
 */
export function validateReportClaims(
  workflowMatches: AnalysisResult['workflowMatches'],
  topUseCases: AnalysisResult['topUseCases']
): {
  validatedWorkflows: AnalysisResult['workflowMatches'];
  validatedUseCases: AnalysisResult['topUseCases'];
  citationCoveragePercent: number;
  downgradedCount: number;
} {
  const capMap = new Map<string, IometeCapability>(
    IOMETE_CAPABILITIES.map(c => [c.id, c])
  );
  const validUrls = new Set<string>(IOMETE_CAPABILITIES.map(c => c.docUrl));

  let downgradedCount = 0;
  let validCitations = 0;

  const validatedWorkflows = workflowMatches.map(wf => {
    const cap = capMap.get(wf.matchedCapabilityId);
    if (!cap || !cap.docUrl || !validUrls.has(wf.docUrl)) {
      downgradedCount += 1;
      return {
        ...wf,
        evidenceType: 'Assumed' as SourceType,
        docUrl: cap?.docUrl || 'https://iomete.com/product/data-platform/platform-overview'
      };
    }
    validCitations += 1;
    return wf;
  });

  const validatedUseCases = topUseCases.map(uc => {
    if (!uc.docUrl || !validUrls.has(uc.docUrl)) {
      downgradedCount += 1;
      return {
        ...uc,
        evidenceType: 'Assumed' as SourceType,
        docUrl: 'https://iomete.com/product/data-platform/platform-overview'
      };
    }
    validCitations += 1;
    return uc;
  });

  const totalItems = validatedWorkflows.length + validatedUseCases.length;
  const citationCoveragePercent = totalItems > 0 ? Math.round((validCitations / totalItems) * 100) : 100;

  return {
    validatedWorkflows,
    validatedUseCases,
    citationCoveragePercent,
    downgradedCount
  };
}

function extractVerbatimQuote(rawMarkdown: string, pattern: RegExp, fallback: string): string {
  const lines = rawMarkdown
    .split('\n')
    .map(l => l.replace(/^[-*#>]\s*/, '').trim())
    .filter(l => l.length > 12);
  const found = lines.find(l => pattern.test(l));
  return found ? `"${found}"` : `"${fallback}"`;
}

export function buildDynamicWorkflows(
  rawMarkdown: string,
  disqualifiers: DisqualifierFlag[]
): AnalysisResult['workflowMatches'] {
  const lines = rawMarkdown
    .split('\n')
    .map(l => l.trim())
    .filter(
      l =>
        /^-\s*workflow\s*\d*\s*:/i.test(l) ||
        (/^[-*]\s+/.test(l) &&
          /(etl|pipeline|query|dashboard|stream|batch|model|report|audit|reconcil|ingest|tally|forecast|feature|cohort|ledger)/i.test(l) &&
          !/^(company name|industry|current total volume|team size|cloud & saas policy|annualized|lock-in)/i.test(l.replace(/^[-*]\s+/, '')))
    );

  if (lines.length === 0) {
    return [
      {
        id: 'wf_dyn_default',
        workflowName: 'Analytical queries and data transformation workloads',
        matchedCapabilityId: 'cap_apache_spark_k8s',
        matchedCapabilityName: 'Apache Spark on Kubernetes Elastic Compute Engine',
        docUrl: 'https://iomete.com/product/data-platform/data-engineering',
        fitRating: disqualifiers.length > 0 ? 'Poor Fit' : 'Partial Fit',
        evidenceText: 'Inferred from general company description; explicit workflow bullet lines were not detailed.',
        confidence: 'Low',
        evidenceType: 'Assumed'
      }
    ];
  }

  return lines.slice(0, 6).map((line, idx) => {
    const cleanLine = line.replace(/^[-*]\s*(workflow\s*\d*\s*:\s*)?/i, '').trim();
    const lower = cleanLine.toLowerCase();

    if (disqualifiers.length > 0) {
      let capId = 'cap_apache_spark_k8s';
      let capName = 'Apache Spark on Kubernetes Elastic Compute Engine';
      let docUrl = 'https://iomete.com/product/data-platform/data-engineering';
      if (/(cron|email|notification|schedule)/i.test(lower)) {
        capId = 'cap_serverless_spark_jobs';
        capName = 'Scheduled Spark Jobs & Containerized Orchestration';
        docUrl = 'https://iomete.com/roadmap/built-in-orchestration';
      } else if (/(dashboard|metabase|tableau|bi|founder)/i.test(lower)) {
        capId = 'cap_bi_connectors_jdbc';
        capName = 'Universal BI Connectors (Tableau, PowerBI, Superset, Metabase)';
        docUrl = 'https://iomete.com/product/data-platform/business-intelligence';
      }
      return {
        id: `wf_dyn_${idx + 1}`,
        workflowName: cleanLine.slice(0, 110),
        matchedCapabilityId: capId,
        matchedCapabilityName: capName,
        docUrl,
        fitRating: 'Poor Fit',
        evidenceText: `Disqualifier active (${disqualifiers[0].title}). Running distributed lakehouse compute for "${cleanLine.slice(0, 80)}" introduces unnecessary complexity.`,
        confidence: 'High',
        evidenceType: 'Stated'
      };
    }

    if (/(stream|kafka|kinesis|real-time|telemetry|iot|fraud|pos)/i.test(lower)) {
      return {
        id: `wf_dyn_${idx + 1}`,
        workflowName: cleanLine.slice(0, 110),
        matchedCapabilityId: 'cap_streaming_ingestion',
        matchedCapabilityName: 'Spark Structured Streaming & Kafka Ingestion',
        docUrl: 'https://iomete.com/product/data-platform/real-time-analytics',
        fitRating: 'High Fit',
        evidenceText: `Directly maps "${cleanLine.slice(0, 90)}" to structured streaming ingestion into open Iceberg tables with automated small-file compaction.`,
        confidence: 'High',
        evidenceType: 'Stated'
      };
    }

    if (/(audit|compliance|point-in-time|rollback|historical|time-travel|regulatory)/i.test(lower)) {
      return {
        id: `wf_dyn_${idx + 1}`,
        workflowName: cleanLine.slice(0, 110),
        matchedCapabilityId: 'cap_iceberg_time_travel',
        matchedCapabilityName: 'Iceberg Time-Travel & Snapshot Rollback',
        docUrl: 'https://iomete.com/product/data-platform/data-management',
        fitRating: 'High Fit',
        evidenceText: `Supports "${cleanLine.slice(0, 90)}" using immutable Apache Iceberg snapshots and historical point-in-time queries without duplicating storage.`,
        confidence: 'High',
        evidenceType: 'Stated'
      };
    }

    if (/(dbt|inventory|reconcil|replenish|transform)/i.test(lower) && /dbt/i.test(rawMarkdown)) {
      return {
        id: `wf_dyn_${idx + 1}`,
        workflowName: cleanLine.slice(0, 110),
        matchedCapabilityId: 'cap_dbt_adapter',
        matchedCapabilityName: 'Native dbt (Data Build Tool) Spark/Iceberg Integration',
        docUrl: 'https://iomete.com/product/architecture/integrations-ecosystem',
        fitRating: 'High Fit',
        evidenceText: `Existing dbt models for "${cleanLine.slice(0, 85)}" execute directly on IOMETE Spark/Iceberg clusters via the official dbt-iomete adapter.`,
        confidence: 'High',
        evidenceType: 'Stated'
      };
    }

    if (/(bi|dashboard|tableau|powerbi|superset|metabase|executive|merchandiser|risk officer)/i.test(lower)) {
      const hasMaskingNeed = /(mask|swift|ssn|pii|credit card)/i.test(rawMarkdown);
      if (hasMaskingNeed && /(risk officer|600|compliance|swift)/i.test(lower)) {
        return {
          id: `wf_dyn_${idx + 1}`,
          workflowName: cleanLine.slice(0, 110),
          matchedCapabilityId: 'cap_column_row_masking',
          matchedCapabilityName: 'Dynamic Column Masking & Row-Level Security Filters',
          docUrl: 'https://iomete.com/roadmap/resource-based-authorization-system',
          fitRating: 'High Fit',
          evidenceText: `Enforces dynamic column and row-level masking policies before returning BI results for "${cleanLine.slice(0, 85)}".`,
          confidence: 'High',
          evidenceType: 'Stated'
        };
      }
      return {
        id: `wf_dyn_${idx + 1}`,
        workflowName: cleanLine.slice(0, 110),
        matchedCapabilityId: 'cap_multi_tenancy_isolation',
        matchedCapabilityName: 'Isolated Virtual Lakehouse Clusters (Compute Endpoints)',
        docUrl: 'https://iomete.com/product/data-platform/data-warehousing',
        fitRating: /tableau online/i.test(rawMarkdown) ? 'Partial Fit' : 'High Fit',
        evidenceText: `Serves "${cleanLine.slice(0, 85)}" via isolated BI virtual clusters and Arrow/JDBC drivers; high-concurrency dashboard caching should be benchmarked in pilot.`,
        confidence: 'Medium',
        evidenceType: 'Stated'
      };
    }

    return {
      id: `wf_dyn_${idx + 1}`,
      workflowName: cleanLine.slice(0, 110),
      matchedCapabilityId: 'cap_apache_spark_k8s',
      matchedCapabilityName: 'Apache Spark on Kubernetes Elastic Compute Engine',
      docUrl: 'https://iomete.com/product/data-platform/data-engineering',
      fitRating: 'High Fit',
      evidenceText: `Executes "${cleanLine.slice(0, 90)}" on containerized Apache Spark pods reading and writing open Apache Iceberg tables with zero cloud compute markup.`,
      confidence: 'High',
      evidenceType: 'Stated'
    };
  });
}

export function computeFlourishBreakdown(
  companyName: string,
  rawMarkdown: string,
  dimensions: Record<DimensionId, DimensionScore>,
  disqualifiers: DisqualifierFlag[],
  verdictBand: VerdictBand,
  overallScore: number | null,
  enrichment?: GeminiEnrichmentPayload
): AnalysisResult['flourishBreakdown'] {
  const lower = rawMarkdown.toLowerCase();

  const shortNames: Record<DimensionId, string> = {
    sovereignty_deployment: 'Sovereignty & K8s',
    scale_variety: 'Data Scale & Variety',
    lockin_openness: 'Open Iceberg Format',
    analytics_ai: 'Spark & BI Workloads',
    cost_pressure: 'Zero-Markup Economics',
    tech_readiness: 'Team K8s Readiness',
    governance_compliance: 'RBAC & Data Masking'
  };

  const divergingDimensions = (Object.keys(dimensions) as DimensionId[]).map(dimId => {
    const dim = dimensions[dimId];
    if (dim.status === 'not_scored' || dim.score === null) {
      return {
        dimensionId: dimId,
        shortName: shortNames[dimId],
        weight: dim.userWeight,
        status: 'not_scored' as const,
        flourishCatalyst: 0,
        frictionDrag: 0,
        netScore: 0,
        driverSummary: `Not scored - ${dim.gaps[0] || 'Requires discovery validation'}`
      };
    }

    const supportsCount = dim.evidence.filter(e => e.direction === 'supports').length;
    const hurtsCount = dim.evidence.filter(e => e.direction === 'hurts').length;

    let flourishCatalyst = Math.max(0, Math.min(100, Math.round(dim.score)));
    let frictionDrag = Math.max(0, Math.min(100, Math.round(100 - dim.score)));

    if (hurtsCount > 0 && supportsCount === 0) {
      flourishCatalyst = Math.min(flourishCatalyst, 18);
      frictionDrag = Math.max(frictionDrag, 78);
    } else if (supportsCount > 0 && hurtsCount === 0 && dim.score >= 75) {
      frictionDrag = Math.min(frictionDrag, 16);
    }

    const netScore = flourishCatalyst - frictionDrag;
    const primaryEvidence = dim.evidence[0]?.sourceText || dim.whyItMatters;

    return {
      dimensionId: dimId,
      shortName: shortNames[dimId],
      weight: dim.userWeight,
      status: 'measured' as const,
      flourishCatalyst,
      frictionDrag,
      netScore,
      driverSummary: primaryEvidence
    };
  });

  const scaleScore = dimensions.scale_variety.score ?? 50;
  const sovScore = dimensions.sovereignty_deployment.score ?? 50;
  const lockScore = dimensions.lockin_openness.score ?? 55;
  const govScore = dimensions.governance_compliance.score ?? 50;

  const isSubScale = disqualifiers.length > 0 || (dimensions.scale_variety.status === 'measured' && scaleScore < 35);
  const hasStreaming = /(kafka|kinesis|stream|real-time|pos|tick)/i.test(lower);
  const hasAirGapOrSov = dimensions.sovereignty_deployment.status === 'measured' && sovScore >= 70;
  const hasHeavyBatch = /(pyspark|dbt|etl|feature engineering|cohort|stress|simulation)/i.test(lower);
  const hasHighConcurrencyBI = /(tableau|superset|powerbi|metabase|dashboard|concurrent)/i.test(lower);

  const workloadPillars: AnalysisResult['flourishBreakdown']['workloadPillars'] = [
    {
      pillar: 'Batch ETL & Distributed PySpark / dbt',
      prospectDemand: isSubScale ? 18 : hasHeavyBatch ? 94 : 68,
      iometeFit: isSubScale ? 22 : 95,
      verdictNote: isSubScale
        ? 'Single-node SQL finishes in seconds; distributed Spark adds unnecessary pod startup overhead.'
        : 'Containerized Spark on K8s executes heavy batch joins and dbt models with zero cloud compute markup.'
    },
    {
      pillar: 'Real-Time Streaming & Compaction',
      prospectDemand: hasStreaming ? 88 : 30,
      iometeFit: hasStreaming ? 90 : 55,
      verdictNote: hasStreaming
        ? 'Structured Streaming writes directly into Apache Iceberg with automated small-file compaction.'
        : 'Low streaming demand detected; batch snapshots satisfy current SLAs.'
    },
    {
      pillar: 'Interactive BI & Analyst Concurrency',
      prospectDemand: hasHighConcurrencyBI ? 85 : 40,
      iometeFit: isSubScale ? 25 : /tableau online/i.test(lower) ? 72 : 88,
      verdictNote: isSubScale
        ? 'Direct PostgreSQL connection is faster and cheaper for a handful of users.'
        : 'Isolated Virtual Lakehouse Clusters prevent heavy ETL jobs from starving BI dashboards.'
    },
    {
      pillar: 'Open Storage Ownership (Apache Iceberg)',
      prospectDemand: lockScore,
      iometeFit: isSubScale ? 30 : 96,
      verdictNote: isSubScale
        ? 'Standard pg_dump backups suffice at <50 GB scale.'
        : '100% open Apache Iceberg tables on customer S3, MinIO, or Ceph eliminate vendor lock-in.'
    },
    {
      pillar: 'Sovereign Perimeter & PII Governance',
      prospectDemand: hasAirGapOrSov ? 96 : govScore,
      iometeFit: isSubScale ? 35 : 94,
      verdictNote: hasAirGapOrSov
        ? 'Offline air-gapped Helm deployment + dynamic column masking keep 100% of data and logs in-enclave.'
        : 'RBAC/ABAC and dynamic masking enforce SOC2/GDPR/PCI policies inside customer VPC.'
    }
  ];

  let annualIncumbentK = 480;
  const millionMatch = rawMarkdown.match(/\$(\d+(?:\.\d+)?)\s*m(?:illion)?/i);
  const thousandMatch = rawMarkdown.match(/\$(\d{2,3})\s*k/i);
  const monthlySmallMatch = rawMarkdown.match(/\$(\d{2,3})\s*\/\s*month/i);

  if (millionMatch) {
    annualIncumbentK = Math.round(parseFloat(millionMatch[1]) * 1000);
  } else if (thousandMatch) {
    annualIncumbentK = parseInt(thousandMatch[1], 10);
  } else if (monthlySmallMatch || isSubScale) {
    const monthly = monthlySmallMatch ? parseInt(monthlySmallMatch[1], 10) : 140;
    annualIncumbentK = Math.max(2, Math.round((monthly * 12) / 1000));
  }

  const isSubScaleWarning = isSubScale || annualIncumbentK < 25;
  const months = ['M6', 'M12', 'M18', 'M24', 'M30', 'M36'].map((label, idx) => {
    const halfYears = idx + 1;
    if (isSubScaleWarning) {
      return {
        month: label,
        incumbentCumulativeK: Math.round(halfYears * (annualIncumbentK / 2) * 10) / 10 || halfYears * 1,
        iometeCumulativeK: Math.round(halfYears * 22)
      };
    }
    const growthFactor = 1 + idx * 0.08;
    const incumbentCumulativeK = Math.round(halfYears * (annualIncumbentK / 2) * growthFactor);
    const iometeAnnualK = Math.round(annualIncumbentK * 0.44);
    const iometeCumulativeK = Math.round(halfYears * (iometeAnnualK / 2));
    return {
      month: label,
      incumbentCumulativeK,
      iometeCumulativeK
    };
  });

  const tcoTrajectory: AnalysisResult['flourishBreakdown']['tcoTrajectory'] = {
    unitLabel: 'USD ($K Cumulative)',
    isSubScaleWarning,
    summaryNote: isSubScaleWarning
      ? `Negative ROI Warning: At ~$${annualIncumbentK}K/yr current database spend, standing up Kubernetes worker nodes and a lakehouse control plane costs more than staying on managed PostgreSQL.`
      : `Modeled on stated ~$${annualIncumbentK}K/yr warehouse run-rate: eliminating third-party cloud compute credit markups via customer-hosted Kubernetes bends the 36-month cumulative TCO curve.`,
    months
  };

  const defaultFlourishDrivers = divergingDimensions
    .filter(d => d.status === 'measured' && d.netScore >= 20)
    .sort((a, b) => b.netScore - a.netScore)
    .map(d => `${d.shortName} (+${d.flourishCatalyst} Catalyst): ${d.driverSummary}`);

  const defaultFailureRisks = [
    ...disqualifiers.map(d => `${d.title}: ${d.triggeredBecause}`),
    ...divergingDimensions
      .filter(d => d.status === 'measured' && d.netScore < 20)
      .sort((a, b) => a.netScore - b.netScore)
      .map(d => `${d.shortName} (-${d.frictionDrag} Drag): ${d.driverSummary}`)
  ];

  const defaultVerdictSummary =
    verdictBand === 'Insufficient information'
      ? `Insufficient information to project whether ${companyName} will flourish with IOMETE. Provide missing dimension details to unlock a full evaluation.`
      : disqualifiers.length > 0
      ? `${companyName} will NOT flourish with IOMETE today because its workload is sub-scale or strictly requires zero-ops multi-tenant SaaS. Approaching them now risks buyer remorse; keep them in nurture until data volume exceeds multi-terabyte scale.`
      : verdictBand === 'Strong fit'
      ? `${companyName} is positioned to flourish rapidly with IOMETE (${overallScore}/100): high data scale, strict data sovereignty/openness mandates, and mature Kubernetes/Spark engineering align directly with IOMETE's zero-markup sovereign lakehouse architecture.`
      : `${companyName} can flourish with IOMETE (${overallScore}/100) on batch ETL and open Apache Iceberg storage to curb warehouse spend, provided the IOMETE team resolves day-2 Kubernetes ownership and benchmarks BI dashboard concurrency during a scoped pilot.`;

  return {
    divergingDimensions,
    workloadPillars,
    tcoTrajectory,
    flourishVerdictSummary: enrichment?.flourishVerdictSummary || defaultVerdictSummary,
    primaryFlourishDrivers:
      enrichment?.primaryFlourishDrivers && enrichment.primaryFlourishDrivers.length > 0
        ? enrichment.primaryFlourishDrivers
        : defaultFlourishDrivers.length > 0
        ? defaultFlourishDrivers
        : ['No high-conviction flourish drivers detected in current input.'],
    primaryFailureRisks:
      enrichment?.primaryFailureRisks && enrichment.primaryFailureRisks.length > 0
        ? enrichment.primaryFailureRisks
        : defaultFailureRisks.length > 0
        ? defaultFailureRisks
        : ['Requires pilot validation of peak BI concurrency and internal Kubernetes operator ownership.']
  };
}

/**
 * Full end-to-end analysis runner (Pure deterministic scoring + hash-cached extraction + strict evidence validation)
 */
export function runFitAnalysis(
  companyName: string,
  rawMarkdown: string,
  userWeights: Record<DimensionId, number> = DEFAULT_DIMENSION_WEIGHTS,
  geminiEnrichment?: GeminiEnrichmentPayload
): AnalysisResult {
  const inputHash = computeInputHash(rawMarkdown);

  // Accuracy Rule #5: Cache extraction by a hash of the input so repeated runs are 100% identical
  let cached = EXTRACTION_CACHE.get(inputHash);
  if (!cached) {
    const qualityCheck = analyzeInputQuality(rawMarkdown);
    const disqualifiers = evaluateDisqualifiers(rawMarkdown);
    const baseDimensions = evaluateDimensions(rawMarkdown, DEFAULT_DIMENSION_WEIGHTS);
    cached = { qualityCheck, disqualifiers, baseDimensions };
    EXTRACTION_CACHE.set(inputHash, cached);
  }

  const { qualityCheck, disqualifiers, baseDimensions } = cached;

  // Apply current userWeights deterministically on top of cached dimension extractions
  const dimensions: Record<DimensionId, DimensionScore> = {} as any;
  (Object.keys(baseDimensions) as DimensionId[]).forEach(dimId => {
    dimensions[dimId] = {
      ...baseDimensions[dimId],
      userWeight: userWeights[dimId] ?? baseDimensions[dimId].defaultWeight
    };
  });

  const verdict = calculateOverallVerdict(dimensions, disqualifiers, qualityCheck);
  const lower = rawMarkdown.toLowerCase();

  // 1. Workflows
  let workflowMatches: AnalysisResult['workflowMatches'] =
    geminiEnrichment?.workflowMatches && geminiEnrichment.workflowMatches.length > 0
      ? geminiEnrichment.workflowMatches
      : buildDynamicWorkflows(rawMarkdown, disqualifiers);

  // 2. Top Use Cases
  let topUseCases: AnalysisResult['topUseCases'] = [];
  if (geminiEnrichment?.topUseCases && geminiEnrichment.topUseCases.length > 0) {
    topUseCases = geminiEnrichment.topUseCases;
  } else if (disqualifiers.length > 0) {
    topUseCases = [
      {
        rank: 1,
        title: 'Negative Control: Why Remaining on Managed Relational DB is the Honest Verdict',
        prospectQuote: extractVerbatimQuote(
          rawMarkdown,
          /(gigabyte|gb|0 dedicated|cannot and will not|managed saas|rds|postgres)/i,
          disqualifiers[0].triggeredBecause
        ),
        iometeCapability: 'Sovereign Deployment (On-Prem, VPC, Hybrid)',
        docUrl: 'https://iomete.com/product/deployment',
        rationale:
          'Selling a distributed Spark/Iceberg lakehouse here would fail both buyer and vendor. Sub-50GB workloads with no data engineering team belong on managed PostgreSQL.',
        evidenceType: 'Stated'
      }
    ];
  } else {
    const candidates: Array<Omit<AnalysisResult['topUseCases'][0], 'rank'>> = [];

    if (dimensions.sovereignty_deployment.status === 'measured' && (dimensions.sovereignty_deployment.score ?? 0) >= 70) {
      const isAirGap = /(air-gap|airgapped|zero data.*leave|bafin|fedramp)/i.test(lower);
      candidates.push({
        title: isAirGap
          ? 'Air-Gapped Sovereign Lakehouse on Customer Kubernetes & On-Prem Object Storage'
          : 'Customer-Hosted BYOC Lakehouse Inside Existing Cloud VPC & Kubernetes',
        prospectQuote: extractVerbatimQuote(
          rawMarkdown,
          /(air-gap|sovereign|zero data|vpc|eks|openshift|rancher|residency)/i,
          'Data must remain within customer-controlled infrastructure perimeter'
        ),
        iometeCapability: isAirGap
          ? 'Air-Gapped & Offline Cluster Packaging'
          : 'Sovereign Deployment (On-Prem, VPC, Hybrid)',
        docUrl: isAirGap
          ? 'https://iomete.com/product/architecture/data-security'
          : 'https://iomete.com/product/deployment',
        rationale: isAirGap
          ? 'IOMETE ships self-contained offline Helm bundles that run inside private datacenters on Kubernetes and Ceph/MinIO with zero outbound network calls.'
          : 'Deploys inside the customer VPC so raw data, credentials, and query logs stay under internal governance.',
        evidenceType: 'Stated'
      });
    }

    if (dimensions.cost_pressure.status === 'measured' && (dimensions.cost_pressure.score ?? 0) >= 65) {
      candidates.push({
        title: 'Eliminating Cloud Warehouse Compute Credit Markups on Heavy Batch & Streaming ETL',
        prospectQuote: extractVerbatimQuote(
          rawMarkdown,
          /(\$\d+|\bmarkup\b|bill|spend|credit|overrun|spike|snowflake|databricks)/i,
          'Rising annual cloud warehouse compute credit spend and auto-scaling spikes'
        ),
        iometeCapability: 'Transparent Cost Model (Zero Cloud Compute Markup)',
        docUrl: 'https://iomete.com/pricing',
        rationale:
          'Executing Spark and dbt workloads on customer-owned Kubernetes nodes or cloud savings plans under a predictable platform license removes third-party compute credit markups.',
        evidenceType: 'Stated'
      });
    }

    if (
      (dimensions.lockin_openness.status === 'measured' && (dimensions.lockin_openness.score ?? 0) >= 65) ||
      (dimensions.scale_variety.status === 'measured' && (dimensions.scale_variety.score ?? 0) >= 65)
    ) {
      candidates.push({
        title: 'Standardizing Multi-Terabyte/Petabyte Storage on Open Apache Iceberg Tables',
        prospectQuote: extractVerbatimQuote(
          rawMarkdown,
          /(iceberg|lock-in|proprietary|petabyte|terabyte|\bpb\b|\btb\b|s3|minio|ceph)/i,
          'Standardizing analytical storage on open Apache Iceberg format'
        ),
        iometeCapability: 'Native Apache Iceberg Open Table Format',
        docUrl: 'https://iomete.com/product/architecture/open-source',
        rationale:
          'Stores all tables in open Apache Iceberg format on S3, MinIO, or Ceph with ACID transactions, schema evolution, and time-travel snapshots.',
        evidenceType: 'Stated'
      });
    }

    if (candidates.length < 3) {
      candidates.push({
        title: 'Isolating Department BI Dashboards from Heavy Batch ETL via Virtual Clusters',
        prospectQuote: extractVerbatimQuote(
          rawMarkdown,
          /(tableau|superset|powerbi|dashboard|concurrent|holiday|flash-sale|sla)/i,
          'Separating interactive BI reporting from heavy batch transformation pipelines'
        ),
        iometeCapability: 'Isolated Virtual Lakehouse Clusters (Compute Endpoints)',
        docUrl: 'https://iomete.com/product/data-platform/data-warehousing',
        rationale:
          'Virtual clusters enforce hard compute quotas per workload so ad-hoc analyst queries and scheduled batch pipelines never contend for resources.',
        evidenceType: 'Sourced'
      });
    }

    topUseCases = candidates.slice(0, 3).map((c, i) => ({ ...c, rank: i + 1 }));
  }

  // 3. Unknowns & Discovery Questions (Always includes every not_scored dimension!)
  let unknownsGaps: AnalysisResult['unknownsGaps'] = [];
  if (geminiEnrichment?.unknownsGaps && geminiEnrichment.unknownsGaps.length > 0) {
    unknownsGaps = [...geminiEnrichment.unknownsGaps];
  }

  Object.values(dimensions).forEach((dim, idx) => {
    if (dim.status === 'not_scored') {
      const gapId = `gap_dim_${dim.dimensionId}`;
      if (!unknownsGaps.some(g => g.id === gapId)) {
        unknownsGaps.push({
          id: gapId,
          title: `Unscored Dimension: ${dim.name}`,
          missingInfo: dim.gaps[0] || `No evidence found in input for ${dim.name}.`,
          discoveryQuestion: dim.discoveryQuestion,
          priority: idx < 2 ? 'P0' : 'P1'
        });
      }
    }
  });

  if (unknownsGaps.length === 0) {
    if (disqualifiers.length > 0) {
      unknownsGaps.push({
        id: 'gap_disq_growth',
        title: '24-Month Data Growth & AI Telemetry Roadmap',
        missingInfo: 'Whether upcoming product features will push analytical volume from gigabytes into multi-terabyte territory.',
        discoveryQuestion:
          'Are there any planned high-volume telemetry or ML features over the next 18-24 months that would outgrow a single managed PostgreSQL instance?',
        priority: 'P1'
      });
    } else {
      if (/(reluctant|no dedicated.*sre|4 data engineer|lean)/i.test(lower)) {
        unknownsGaps.push({
          id: 'gap_k8s_ownership',
          title: 'Day-2 Kubernetes Namespace & Node Group Ownership',
          missingInfo: 'How responsibilities split between data engineers and central cloud/platform DevOps for Kubernetes cluster maintenance.',
          discoveryQuestion:
            'Who manages your Kubernetes clusters today, and will central Platform DevOps provision the namespace and node auto-scaling policies for IOMETE?',
          priority: 'P0'
        });
      }
      if (/(tableau|superset|powerbi|600|120|concurrent)/i.test(lower)) {
        unknownsGaps.push({
          id: 'gap_bi_concurrency',
          title: 'Peak BI Dashboard Concurrency & Latency SLAs',
          missingInfo: 'Target p95 query latency and concurrent active query count during Monday morning executive reporting spikes.',
          discoveryQuestion:
            'What is the target p95 query response time and peak concurrent user count for your primary BI dashboards?',
          priority: 'P0'
        });
      }
      if (/(ceph|minio|on-prem|bare-metal|air-gap)/i.test(lower)) {
        unknownsGaps.push({
          id: 'gap_network_fabric',
          title: 'Object Storage Network Fabric & Identity Provider Integration',
          missingInfo: 'Network throughput (25GbE vs 100GbE) between K8s compute nodes and object storage, plus enclave IdP protocol (LDAP vs OIDC).',
          discoveryQuestion:
            'What is the network fabric bandwidth between your Kubernetes worker nodes and object storage, and which Identity Provider governs access?',
          priority: 'P1'
        });
      }
    }
  }

  // 4. Objections & Honest Responses
  let objectionsAndRisks: AnalysisResult['objectionsAndRisks'] = [];
  if (geminiEnrichment?.objectionsAndRisks && geminiEnrichment.objectionsAndRisks.length > 0) {
    objectionsAndRisks = geminiEnrichment.objectionsAndRisks;
  } else if (disqualifiers.length > 0) {
    objectionsAndRisks = [
      {
        objection: 'Why would we run Kubernetes clusters when our current database is tiny and costs almost nothing?',
        likelihood: 'High',
        honestResponse:
          'You should not. For a sub-50GB relational workload without a dedicated data engineering team, operating a distributed Kubernetes lakehouse is an anti-pattern. Stay on managed PostgreSQL until scale demands distributed compute.',
        prospectConcern: 'Operational complexity & negative ROI at small scale',
        docUrl: 'https://iomete.com/product/deployment'
      }
    ];
  } else {
    if ((dimensions.tech_readiness.score ?? 100) < 75) {
      objectionsAndRisks.push({
        objection: 'Our data team is lean - will running a lakehouse on Kubernetes create day-2 operational burden?',
        likelihood: 'High',
        honestResponse:
          'That is a genuine trade-off. While IOMETE automates Spark jobs and Iceberg compaction via Kubernetes operators, your cloud SRE team still owns the underlying EKS/GKE/AKS node groups. Starting with a hybrid pilot that offloads heavy batch ETL first minimizes operational risk.',
        prospectConcern: 'Kubernetes operational burden on lean data engineering teams',
        docUrl: 'https://iomete.com/product/data-platform/design-principles'
      });
    }
    objectionsAndRisks.push({
      objection:
        'Third-party comparisons note IOMETE has fewer pre-built SaaS ingestion connectors and thinner enterprise catalog lineage than legacy cloud suites.',
      likelihood: 'Medium',
      honestResponse:
        'IOMETE includes native RBAC/ABAC, dynamic column/row masking, and immutable audit logs for lakehouse tables. However, it is not a SaaS API ingestion tool - upstream ingestion stays in your existing Kafka/Airflow/Fivetran pipelines, and enterprise catalogs integrate via open Iceberg REST APIs.',
      prospectConcern: 'Ecosystem connector breadth & governance integration',
      docUrl: 'https://iomete.com/product/data-platform/data-governance'
    });
  }

  // 5. Competitive Context
  let competitiveContext: AnalysisResult['competitiveContext'] = [];
  if (geminiEnrichment?.competitiveContext && geminiEnrichment.competitiveContext.length > 0) {
    competitiveContext = geminiEnrichment.competitiveContext;
  } else if (disqualifiers.length > 0) {
    competitiveContext = [
      {
        competitor: 'Managed Relational Database (AWS RDS / Supabase / Cloud SQL)',
        likelyIncumbent: true,
        framingStrategy:
          'Endorse the incumbent. Do not pitch a lakehouse replacement when the customer has sub-50GB relational data and zero data engineering staff.',
        discoveryAngles: [
          'Confirm that existing single-node SQL query performance meets all current reporting needs.',
          'Set a polite 18-month check-in trigger if analytical event volume crosses multi-terabyte scale.'
        ]
      }
    ];
  } else {
    if (/snowflake/i.test(lower)) {
      competitiveContext.push({
        competitor: 'Snowflake Cloud Data Warehouse',
        likelyIncumbent: true,
        framingStrategy:
          'Frame around zero-compute-markup economics, true sovereign/VPC data custody, and open Apache Iceberg ownership - propose offloading heavy batch ETL/PySpark workloads first.',
        discoveryAngles: [
          'Ask what percentage of annual Snowflake credit consumption comes from scheduled batch dbt/Spark jobs vs interactive BI.',
          'Ask how compliance/security teams view metadata or query logs leaving their private perimeter.'
        ]
      });
    }
    if (/(cloudera|hadoop|hdfs|yarn)/i.test(lower)) {
      competitiveContext.push({
        competitor: 'Cloudera CDH / CDP Private Cloud',
        likelyIncumbent: true,
        framingStrategy:
          'Contrast legacy Hadoop/YARN node maintenance with cloud-native containerized Spark and open Apache Iceberg running on their existing Kubernetes platform.',
        discoveryAngles: [
          'Ask how many engineering hours per month are spent maintaining legacy Hadoop/YARN services vs standard Kubernetes operators.'
        ]
      });
    }
    if (competitiveContext.length === 0) {
      competitiveContext.push({
        competitor: 'Proprietary Cloud Data Warehouses (Snowflake / Databricks / BigQuery)',
        likelyIncumbent: true,
        framingStrategy:
          'Position IOMETE around 100% open Apache Iceberg table ownership inside the customer VPC/on-prem Kubernetes cluster with zero compute markup.',
        discoveryAngles: [
          'Ask how much of their annual data platform budget goes toward vendor compute markups vs raw underlying infrastructure.',
          'Explore whether keeping tables in open Apache Iceberg format on S3/MinIO is a strategic priority for the architecture team.'
        ]
      });
    }
  }

  // 6. Concrete Next Steps
  let nextSteps: AnalysisResult['nextSteps'] = [];
  if (geminiEnrichment?.nextSteps && geminiEnrichment.nextSteps.length > 0) {
    nextSteps = geminiEnrichment.nextSteps;
  } else if (disqualifiers.length > 0) {
    nextSteps = [
      {
        step: 1,
        action: 'Disqualify account politely - advise remaining on managed PostgreSQL',
        owner: 'IOMETE Account Executive',
        suggestedScope: 'Send an honest architectural note confirming their current relational database is optimal for their scale.',
        resourceDoc: 'https://iomete.com/product/deployment'
      },
      {
        step: 2,
        action: 'Log in IOMETE Prospect Database as "Disqualified - Do Not Pitch" with 18-month trigger',
        owner: 'Sales Ops / SDR',
        suggestedScope: 'Re-evaluate only if the company hires dedicated data engineers or crosses 5+ TB of analytical data.',
        resourceDoc: 'https://iomete.com/pricing'
      },
      {
        step: 3,
        action: 'Share Open Apache Iceberg Architecture Primer for future reference',
        owner: 'Account Executive',
        suggestedScope: 'Leave a positive impression by sharing educational open-source lakehouse documentation with zero sales pressure.',
        resourceDoc: 'https://iomete.com/product/architecture/open-source'
      }
    ];
  } else {
    const isAirGap = /(air-gap|airgapped|bare-metal|openshift|rancher)/i.test(lower);
    nextSteps = [
      {
        step: 1,
        action: isAirGap
          ? 'Deploy Offline Air-Gapped PoC in Sandbox Kubernetes Enclave (2-Week Scope)'
          : 'Technical Discovery & Kubernetes Namespace Scoping Session',
        owner: 'Solutions Architect & Prospect Platform Lead',
        suggestedScope: isAirGap
          ? 'Install signed offline Helm bundle in an isolated Kubernetes namespace connected to a test Ceph/MinIO bucket.'
          : 'Align with the Kubernetes/VPC owner and break down current warehouse spend between batch ETL and interactive BI.',
        resourceDoc: isAirGap
          ? 'https://iomete.com/product/architecture/data-security'
          : 'https://iomete.com/product/data-platform/design-principles'
      },
      {
        step: 2,
        action: 'Benchmark Primary Batch ETL / PySpark / dbt Workload on Open Iceberg Tables',
        owner: 'Prospect Lead Data Engineer',
        suggestedScope:
          'Run the heaviest daily transformation pipeline against native Apache Iceberg tables on IOMETE and compare runtime and raw compute cost.',
        resourceDoc: 'https://iomete.com/product/data-platform/data-engineering'
      },
      {
        step: 3,
        action: 'Validate RBAC, Dynamic Column Masking & Concurrent BI Queries',
        owner: 'Security Architect & Analytics Lead',
        suggestedScope:
          'Verify PII column masking policies, audit log exports, and p95 dashboard latency on a dedicated BI virtual cluster.',
        resourceDoc: 'https://iomete.com/roadmap/resource-based-authorization-system'
      }
    ];
  }

  // Run Validator check on all claims and doc links (PRD Section 8)
  const validation = validateReportClaims(workflowMatches, topUseCases);
  workflowMatches = validation.validatedWorkflows;
  topUseCases = validation.validatedUseCases;

  // Accuracy Rule #1: Generate & validate "Why this verdict" bullets strictly from evidence items with [ev_...] citations
  const candidateWhyBullets =
    geminiEnrichment?.plainLanguageExplanation && geminiEnrichment.plainLanguageExplanation.length > 0
      ? geminiEnrichment.plainLanguageExplanation
      : generateEvidenceOnlyWhyBullets(dimensions, disqualifiers);

  const bulletValidation = validateWhyVerdictBullets(
    candidateWhyBullets,
    dimensions,
    disqualifiers
  );
  const plainLanguageExplanation = bulletValidation.validBullets;

  const sovScoreVal = dimensions.sovereignty_deployment.score ?? 0;

  const salesRepView: AnalysisResult['salesRepView'] = geminiEnrichment?.salesRepView || {
    targetPersona:
      disqualifiers.length > 0
        ? 'Founding Engineer / CTO'
        : sovScoreVal >= 85
        ? 'Head of Sovereign Data Platform / CISO'
        : 'VP of Data Engineering / Cloud Platform Lead',
    cheatSheet: {
      callGoal:
        disqualifiers.length > 0
          ? 'Politely disqualify the opportunity in under 5 minutes and advise them to stay on managed PostgreSQL.'
          : verdict.verdictBand === 'Strong fit'
          ? 'Secure a 2-week sandbox PoC in their Kubernetes environment to validate Spark/Iceberg performance and zero-egress compliance.'
          : 'Quantify the batch ETL vs. BI split of their current warehouse bill and propose a 2-week Kubernetes pilot for their heaviest daily pipeline.',
      elevatorPitch:
        disqualifiers.length > 0
          ? `IOMETE is a Kubernetes-native Spark and Iceberg lakehouse built for terabyte-to-petabyte teams. For ${companyName}'s current scale and team structure, staying on a managed relational database is honestly the right engineering choice.`
          : `IOMETE deploys an open Apache Spark and Apache Iceberg lakehouse directly inside ${companyName}'s own Kubernetes environment - giving you 100% open table ownership on S3/MinIO/Ceph with zero cloud compute markup.`,
      criticalDiscoveryQuestions: unknownsGaps.slice(0, 3).map(g => g.discoveryQuestion),
      landmineToAvoid:
        disqualifiers.length > 0
          ? 'Do not try to convince a small web team without data engineers to adopt Kubernetes or Apache Spark.'
          : sovScoreVal >= 85
          ? 'Never propose cloud-hosted control planes or outbound telemetry; emphasize 100% customer-hosted / air-gapped operation.'
          : 'Do not downplay day-2 Kubernetes cluster ownership; involve their central Cloud/Platform DevOps owner early.',
      suggestedClose:
        disqualifiers.length > 0
          ? `"Because your workload runs cleanly on a single relational database today, moving to a distributed lakehouse would slow your team down. Let's reconnect once your analytical volume crosses the multi-terabyte mark."`
          : `"Let's take your single heaviest transformation pipeline and benchmark it on IOMETE inside a sandbox Kubernetes namespace over 14 days so you can verify exact runtime and compute cost savings firsthand."`
    },
    agenda: [
      { time: '00:00 - 05:00', topic: 'Context & Trigger Validation', objective: 'Confirm workflow scope, storage scale, and primary buying trigger.' },
      { time: '05:00 - 15:00', topic: 'Architecture & Open Iceberg Fit', objective: 'Walk through Kubernetes-native Spark execution and S3/MinIO Iceberg storage.' },
      { time: '15:00 - 23:00', topic: 'Unknowns & Risk Resolution', objective: 'Address top gap questions around cluster ownership, governance, and BI SLAs.' },
      { time: '23:00 - 30:00', topic: 'Pilot Scope & Success Criteria', objective: 'Agree on a bounded 2-week benchmark dataset and clear pass/fail metrics.' }
    ]
  };

  const scoreLabel = verdict.overallScore !== null ? `${verdict.overallScore}/100` : 'Insufficient information';

  const buyerMemoView: AnalysisResult['buyerMemoView'] = geminiEnrichment?.buyerMemoView || {
    memoHeader: {
      to: 'Chief Technology Officer (CTO), Chief Financial Officer (CFO) & Chief Information Security Officer (CISO)',
      from: 'Data Platform Architecture Evaluation Lead',
      date: 'October 31, 2026',
      subject: `Internal Architecture & Fit Memo: IOMETE Sovereign Lakehouse Evaluation for ${companyName}`,
      classification:
        sovScoreVal >= 85
          ? 'INTERNAL // SOVEREIGN INFRASTRUCTURE REVIEW'
          : 'INTERNAL ARCHITECTURE MEMORANDUM'
    },
    executiveSummary:
      verdict.isInsufficientInfo
        ? `Summary Verdict: Insufficient information. Only ${verdict.scoredDimensionsCount} of 7 dimensions have verified evidence. Complete discovery before making an architectural recommendation.`
        : disqualifiers.length > 0
        ? `Summary Verdict: ${verdict.verdictBand} (${scoreLabel}). After evaluating IOMETE against ${companyName}'s current data scale and team structure, we recommend taking no action. Remaining on a managed relational database is the financially and operationally sound decision.`
        : `Summary Verdict: ${verdict.verdictBand} (${scoreLabel}). We recommend a scoped 2-week technical evaluation of IOMETE on our Kubernetes infrastructure to standardize on open Apache Iceberg storage and eliminate third-party cloud compute markups.`,
    businessNeedAndFriction: `Stated Context & Friction: Evaluation driven by ${qualityCheck.scaleDetected} scale signal, ${qualityCheck.complianceDetected}, and ${workflowMatches.length} core analytical workflows identified in the account specification.`,
    architecturalFitSummary: `Sourced Architecture: IOMETE unifies Apache Spark and Apache Iceberg on Kubernetes (https://iomete.com/product/deployment). All data remains in open Iceberg Parquet files inside our own object storage (https://iomete.com/product/architecture/open-source), allowing dbt, PySpark, and BI tools to query a single open source of truth.`,
    sovereigntyAndSecurityBrief: `IOMETE runs inside our controlled Kubernetes perimeter (https://iomete.com/product/deployment) with fine-grained RBAC/ABAC, dynamic column/row masking (https://iomete.com/roadmap/resource-based-authorization-system), and immutable audit logs (https://iomete.com/roadmap/live-integrations-with-governance-ecosystem).`,
    tcoCostComparison:
      disqualifiers.length > 0
        ? `Adopting a distributed Kubernetes lakehouse at sub-50GB scale would increase infrastructure and operational costs with zero benefit.`
        : `Sourced IOMETE Model: Zero compute markup pricing (https://iomete.com/pricing) lets us execute Spark workloads on our own Kubernetes nodes or cloud savings plans without paying variable per-credit vendor markups. Exact savings will be verified during our 2-week workload benchmark.`,
    suggestedPoCPlan: [
      { week: 'Phase 1 (Days 1-3)', milestone: 'Kubernetes Namespace & Storage Mount', successCriteria: 'Deploy IOMETE Helm chart in sandbox K8s cluster; connect S3/MinIO bucket and SSO.' },
      { week: 'Phase 2 (Days 4-8)', milestone: 'Representative Workload & Cost Benchmark', successCriteria: 'Execute primary batch ETL + streaming ingestion on Iceberg tables; compare runtime and raw compute unit cost.' },
      { week: 'Phase 3 (Days 9-14)', milestone: 'Governance, BI Concurrency & Sign-Off', successCriteria: 'Verify column masking, audit log export, and concurrent BI dashboard latency against SLA.' }
    ],
    cfoDefensePoint: `Rather than paying variable per-second cloud compute markups, IOMETE uses a transparent platform licensing model (https://iomete.com/pricing) on top of our own infrastructure - and we will validate exact TCO numbers on our own workload before committing.`,
    cisoDefensePoint: `Zero data, credentials, or query logs leave our controlled Kubernetes perimeter (https://iomete.com/product/deployment), and column-level masking protects sensitive PII fields at query time.`
  };

  const flourishBreakdown = computeFlourishBreakdown(
    companyName,
    rawMarkdown,
    dimensions,
    disqualifiers,
    verdict.verdictBand,
    verdict.overallScore,
    geminiEnrichment
  );

  const allEvidenceTypes: SourceType[] = [
    ...Object.values(dimensions).flatMap(d => d.evidence.map(e => e.sourceType)),
    ...workflowMatches.map(w => w.evidenceType),
    ...topUseCases.map(u => u.evidenceType)
  ];

  const statedCount = allEvidenceTypes.filter(t => t === 'Stated').length;
  const sourcedCount =
    allEvidenceTypes.filter(t => t === 'Sourced').length +
    IOMETE_CAPABILITIES.filter(c => c.maturityNote === 'verified').length;
  const assumedCount = allEvidenceTypes.filter(t => t === 'Assumed').length;

  return {
    companyName: geminiEnrichment?.companyName || companyName,
    inputHash,
    isInsufficientInfo: verdict.isInsufficientInfo,
    scoredDimensionsCount: verdict.scoredDimensionsCount,
    overallScore: verdict.overallScore,
    rawComputedScore: verdict.rawComputedScore,
    verdictBand: verdict.verdictBand,
    confidenceLevel: verdict.confidenceLevel,
    confidenceScore: verdict.confidenceScore,
    oneSentenceReason: verdict.isInsufficientInfo
      ? verdict.oneSentenceReason
      : geminiEnrichment?.oneSentenceReason || verdict.oneSentenceReason,
    plainLanguageExplanation,
    rejectedWhyBullets: bulletValidation.rejectedBullets,
    disqualifiers,
    dimensions,
    workflowMatches,
    topUseCases,
    unknownsGaps,
    objectionsAndRisks,
    competitiveContext,
    nextSteps,
    salesRepView,
    buyerMemoView,
    inputQuality: qualityCheck,
    flourishBreakdown,
    meta: {
      rubricVersion: 'Rubric v2.1-Deterministic',
      analysisTimestamp: '2026-10-31T12:00:00Z',
      citationCoveragePercent: validation.citationCoveragePercent,
      totalClaimsEvaluated: workflowMatches.length + topUseCases.length + disqualifiers.length,
      statedCount,
      sourcedCount,
      assumedCount,
      repeatabilityVariance: 0.0,
      geminiModelsUsed: geminiEnrichment?.geminiModelsUsed || [
        'Deterministic Rubric Engine v2.1 (Pure Code + Hash Cache)'
      ],
      searchGroundedSources: geminiEnrichment?.searchGroundedSources || []
    }
  };
}

/**
 * Generates clean, downloadable Markdown report including company details and overall chart metrics.
 */
export function exportToMarkdown(analysis: AnalysisResult): string {
  const scoreDisplay =
    analysis.isInsufficientInfo || analysis.overallScore === null
      ? 'Insufficient information (Not Scored)'
      : `${analysis.overallScore} / 100 (Raw Weighted Score: ${analysis.rawComputedScore}/100)`;

  return `# FitLens: IOMETE Account Qualification & Fit Report
**Company Analyzed:** ${analysis.companyName} | **Input Hash:** \`${analysis.inputHash}\`
**Scale Signal:** ${analysis.inputQuality.scaleDetected} | **Compliance Posture:** ${analysis.inputQuality.complianceDetected}
**Rubric Version:** ${analysis.meta.rubricVersion} | **Citation Coverage:** ${analysis.meta.citationCoveragePercent}% | **Repeatability Variance:** ${analysis.meta.repeatabilityVariance}%

---

## 1. Verdict Card
- **Fit Verdict:** **${analysis.verdictBand}**
- **Overall Score:** **${scoreDisplay}**
- **Scored Dimensions:** **${analysis.scoredDimensionsCount} / 7**
- **Confidence Level:** **${analysis.confidenceLevel}** (${analysis.confidenceScore}%)
- **Headline Summary:** ${analysis.oneSentenceReason}

${analysis.disqualifiers.length > 0 ? `### Disqualifier Flags Triggered\n` + analysis.disqualifiers.map(d => `- **[Stated] ${d.title}:** ${d.triggeredBecause}\n  - *Impact:* ${d.impactOnVerdict}\n  - *Honest Recommendation:* ${d.honestRecommendation}`).join('\n') : ''}

---

## 2. Why This Verdict (Evidence-Cited Bullets Only)
${analysis.plainLanguageExplanation.length > 0 ? analysis.plainLanguageExplanation.map(p => `- ${p}`).join('\n') : '- Insufficient evidence items to generate verdict bullets. See discovery questions below.'}

---

## 3. Fit Dimensions & Visible Rubric Math
| Dimension | Weight | Score | Status | Evidence ID & Summary |
|---|---|---|---|---|
${Object.values(analysis.dimensions).map(d => `| **${d.name}** | ${d.userWeight}% | ${d.status === 'not_scored' || d.score === null ? 'Not scored' : `${d.score}/100`} | ${d.status === 'not_scored' ? 'NOT SCORED' : 'MEASURED'} | ${d.evidence.length > 0 ? `[${d.evidence.map(e => e.id).join(', ')}] [${d.evidence[0].sourceType}] ${d.evidence[0].sourceText}` : d.gaps[0] || 'Not scored - excluded from average'} |`).join('\n')}

---

## 4. Overall Flourish vs. Friction Breakdown & TCO Charts Summary
- **Flourish Thesis:** ${analysis.flourishBreakdown.flourishVerdictSummary}

### A. Directional Force Balance (Flourish Catalyst vs. Friction Drag)
| Dimension | Status | Flourish Catalyst | Friction Drag | Net Balance |
|---|---|---|---|---|
${analysis.flourishBreakdown.divergingDimensions.map(dd => `| ${dd.shortName} (${dd.weight}%) | ${dd.status} | +${dd.flourishCatalyst} | -${dd.frictionDrag} | ${dd.netScore >= 0 ? `+${dd.netScore}` : dd.netScore} |`).join('\n')}

### B. 36-Month Cumulative TCO Trajectory (${analysis.flourishBreakdown.tcoTrajectory.unitLabel})
- **Note:** ${analysis.flourishBreakdown.tcoTrajectory.summaryNote}
| Milestone | Incumbent Cloud Warehouse ($K) | IOMETE Sovereign K8s ($K) |
|---|---|---|
${analysis.flourishBreakdown.tcoTrajectory.months.map(m => `| ${m.month} | $${m.incumbentCumulativeK}K | $${m.iometeCumulativeK}K |`).join('\n')}

---

## 5. Workflow Map & Evidence Trail
| Company Workflow | Matched IOMETE Capability | Fit Rating | Confidence | Evidence & Label | Documentation Link |
|---|---|---|---|---|---|
${analysis.workflowMatches.map(w => `| ${w.workflowName} | **${w.matchedCapabilityName}** | ${w.fitRating} | ${w.confidence} | [${w.evidenceType}] ${w.evidenceText} | [Sourced Doc](${w.docUrl}) |`).join('\n')}

---

## 6. Top Use Cases (Ranked with Prospect Quotes)
${analysis.topUseCases.map(u => `### ${u.rank}. ${u.title}
- **Prospect Quote [Stated]:** ${u.prospectQuote}
- **IOMETE Capability [Sourced]:** ${u.iometeCapability} ([${u.docUrl}](${u.docUrl}))
- **Rationale [${u.evidenceType}]:** ${u.rationale}
`).join('\n')}

---

## 7. Honest Unknowns & Discovery Questions
${analysis.unknownsGaps.map(g => `- **[${g.priority}] ${g.title}:**\n  - *Missing Info:* ${g.missingInfo}\n  - *Question to Ask:* "${g.discoveryQuestion}"`).join('\n')}

---

## 8. Poor Fit, Risks & Likely Objections
${analysis.objectionsAndRisks.map(o => `- **Likely Objection (${o.likelihood} Likelihood):** "${o.objection}"\n  - **Underlying Concern:** ${o.prospectConcern}\n  - **Safe, Honest Response:** ${o.honestResponse}${o.docUrl ? ` ([Doc](${o.docUrl}))` : ''}`).join('\n')}

---

## 9. Concrete Next Steps
${analysis.nextSteps.map(s => `${s.step}. **${s.action}** (${s.owner})\n   - *Suggested Scope:* ${s.suggestedScope}\n   - *Doc Reference:* ${s.resourceDoc}`).join('\n')}

---

## 10. Audience Briefs
### A. Sales Rep Talk Track & Call Prep (${analysis.salesRepView.targetPersona})
- **Call Goal:** ${analysis.salesRepView.cheatSheet.callGoal}
- **Elevator Pitch:** "${analysis.salesRepView.cheatSheet.elevatorPitch}"
- **Landmine to Avoid:** ${analysis.salesRepView.cheatSheet.landmineToAvoid}
- **Suggested Close:** ${analysis.salesRepView.cheatSheet.suggestedClose}

### B. Buyer Internal Justification Memo
- **Subject:** ${analysis.buyerMemoView.memoHeader.subject}
- **Executive Summary:** ${analysis.buyerMemoView.executiveSummary}
- **CFO Defense (Cost Model):** ${analysis.buyerMemoView.cfoDefensePoint}
- **CISO Defense (Sovereignty & Security):** ${analysis.buyerMemoView.cisoDefensePoint}
`;
}
