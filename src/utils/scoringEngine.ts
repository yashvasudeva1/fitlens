import {
  CAPABILITY_MAP,
  FitDimensionId,
  IOMETE_CAPABILITIES,
  KB_VERSION
} from '../data/iometeCapabilities';
import {
  DisqualifierFlag,
  EvidenceItem,
  SampleCompanyAnalysis,
  UnknownGap,
  VerdictBand
} from '../data/newSampleCompanies';

export interface FitDimensionSpec {
  id: FitDimensionId;
  name: string;
  shortName: string;
  whatItAsks: string;
  whyItMatters: string;
  defaultWeight: number;
}

export const RUBRIC_VERSION = 'FitLens Deterministic Rubric v1.4 (Temp 0.0)';

export const DEFAULT_DIMENSIONS: FitDimensionSpec[] = [
  {
    id: 'sovereignty',
    name: 'Sovereignty & Deployment Need',
    shortName: 'Sovereignty',
    whatItAsks: 'Must data stay in own infrastructure, on premises, or air gapped?',
    whyItMatters: 'Core positioning: runs in the customer’s own environment',
    defaultWeight: 25
  },
  {
    id: 'scale',
    name: 'Data Scale & Variety',
    shortName: 'Data Scale',
    whatItAsks: 'Large, mixed structured and unstructured data?',
    whyItMatters: 'Lakehouse value grows with volume and variety',
    defaultWeight: 15
  },
  {
    id: 'openness',
    name: 'Lock-in & Openness Concern',
    shortName: 'Open Formats',
    whatItAsks: 'Worry about proprietary formats or vendor lock-in?',
    whyItMatters: 'Built on open Apache Spark and Apache Iceberg',
    defaultWeight: 15
  },
  {
    id: 'workloads',
    name: 'Analytics & AI Workloads',
    shortName: 'Workloads',
    whatItAsks: 'BI, SQL, data engineering, ML pipelines?',
    whyItMatters: 'Capability coverage across batch, streaming, SQL & ML',
    defaultWeight: 15
  },
  {
    id: 'cost',
    name: 'Cost Pressure',
    shortName: 'Cost Pressure',
    whatItAsks: 'Is current warehouse or cloud spend a pain?',
    whyItMatters: 'Common buying trigger (verify against docs & pricing before claiming savings)',
    defaultWeight: 10
  },
  {
    id: 'readiness',
    name: 'Technical Readiness',
    shortName: 'Tech Readiness',
    whatItAsks: 'Spark, Iceberg or Kubernetes familiarity, data team exists?',
    whyItMatters: 'Determines time to value and onboarding friction',
    defaultWeight: 10
  },
  {
    id: 'governance',
    name: 'Governance & Compliance Needs',
    shortName: 'Governance',
    whatItAsks: 'Catalog, access control, audit requirements?',
    whyItMatters: 'Fit driver and also a known enterprise objection area',
    defaultWeight: 10
  }
];

export type DimensionWeights = Record<FitDimensionId, number>;

export const DEFAULT_WEIGHTS: DimensionWeights = {
  sovereignty: 25,
  scale: 15,
  openness: 15,
  workloads: 15,
  cost: 10,
  readiness: 10,
  governance: 10
};

export interface DimensionScoreDetail {
  dimensionId: FitDimensionId;
  name: string;
  shortName: string;
  weight: number;
  normalizedActiveWeight: number;
  status: 'scored' | 'unknown';
  score: number | null;
  evidenceCount: number;
  supportingCount: number;
  hurtingCount: number;
  evidenceItems: EvidenceItem[];
}

export interface FitScoreResult {
  overallScore: number;
  rawUncappedScore: number;
  verdictBand: VerdictBand;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  isCappedByDisqualifier: boolean;
  activeDisqualifiers: DisqualifierFlag[];
  dimensionScores: DimensionScoreDetail[];
  knownDimensionCount: number;
  unknownDimensionCount: number;
  oneSentenceReason: string;
  rubricVersion: string;
}

export interface InputQualityCheckResult {
  coverageScore: number;
  confidenceMultiplier: number;
  workflowCount: number;
  dataSourceCount: number;
  hasScaleMention: boolean;
  hasComplianceMention: boolean;
  hasTeamMention: boolean;
  hasStackMention: boolean;
  summaryBanner: string;
  missingSignals: string[];
  suggestedQuestions: string[];
}

export interface ValidationCheckResult {
  passed: boolean;
  totalClaimsChecked: number;
  sourcedClaimsWithValidLink: number;
  citationCoveragePercent: number;
  scoreRecomputedMatch: boolean;
  downgradedItems: string[];
}

const STRENGTH_POINTS: Record<'high' | 'medium' | 'low', number> = {
  high: 42,
  medium: 26,
  low: 14
};

/**
 * Pure deterministic scoring function (PRD Section 5.1 & 5.2).
 * - Computes each dimension score (0..100) from tagged evidence items.
 * - No evidence means "unknown", NOT a neutral 50. Unknown dimensions are excluded
 *   from the weighted average, shown as gaps, and lower overall confidence.
 * - Disqualifier flags cap the overall score and verdict regardless of other scores.
 */
export function computeFitScore(
  evidenceItems: EvidenceItem[],
  weights: DimensionWeights = DEFAULT_WEIGHTS,
  disqualifiers: DisqualifierFlag[] = [],
  explicitUnknowns: UnknownGap[] = []
): FitScoreResult {
  const dimensionScores: DimensionScoreDetail[] = [];

  let activeWeightSum = 0;
  for (const dim of DEFAULT_DIMENSIONS) {
    const dimEvidence = evidenceItems.filter((e) => e.dimensionId === dim.id);
    const w = Math.max(0, weights[dim.id] ?? dim.defaultWeight);
    if (dimEvidence.length > 0) {
      activeWeightSum += w;
    }
  }

  let weightedScoreAccumulator = 0;
  let knownDimensionCount = 0;
  let unknownDimensionCount = 0;

  for (const dim of DEFAULT_DIMENSIONS) {
    const dimEvidence = evidenceItems.filter((e) => e.dimensionId === dim.id);
    const w = Math.max(0, weights[dim.id] ?? dim.defaultWeight);

    if (dimEvidence.length === 0) {
      unknownDimensionCount++;
      dimensionScores.push({
        dimensionId: dim.id,
        name: dim.name,
        shortName: dim.shortName,
        weight: w,
        normalizedActiveWeight: 0,
        status: 'unknown',
        score: null,
        evidenceCount: 0,
        supportingCount: 0,
        hurtingCount: 0,
        evidenceItems: []
      });
      continue;
    }

    knownDimensionCount++;
    // Baseline for an evidenced dimension is 50; supporting evidence pushes toward 96, hurting pushes toward 8.
    let dimRaw = 50;
    let supportingCount = 0;
    let hurtingCount = 0;

    for (const item of dimEvidence) {
      const delta = STRENGTH_POINTS[item.strength] ?? 20;
      const confFactor = item.confidence === 'high' ? 1.0 : item.confidence === 'medium' ? 0.85 : 0.65;
      if (item.direction === 'supports') {
        supportingCount++;
        dimRaw += delta * confFactor;
      } else {
        hurtingCount++;
        dimRaw -= delta * confFactor;
      }
    }

    const clampedDimScore = Math.round(Math.max(6, Math.min(96, dimRaw)));
    const normalizedActiveWeight = activeWeightSum > 0 ? (w / activeWeightSum) * 100 : 0;
    weightedScoreAccumulator += clampedDimScore * (normalizedActiveWeight / 100);

    dimensionScores.push({
      dimensionId: dim.id,
      name: dim.name,
      shortName: dim.shortName,
      weight: w,
      normalizedActiveWeight: Math.round(normalizedActiveWeight * 10) / 10,
      status: 'scored',
      score: clampedDimScore,
      evidenceCount: dimEvidence.length,
      supportingCount,
      hurtingCount,
      evidenceItems: dimEvidence
    });
  }

  const rawUncappedScore = activeWeightSum > 0 ? Math.round(weightedScoreAccumulator) : 0;

  // Apply Disqualifier Caps (PRD Section 5.2 rule 3)
  let finalScore = rawUncappedScore;
  let isCappedByDisqualifier = false;
  if (disqualifiers.length > 0) {
    const lowestCap = Math.min(...disqualifiers.map((d) => d.maxScoreCap));
    if (finalScore > lowestCap) {
      finalScore = lowestCap;
    }
    isCappedByDisqualifier = true;
  }

  // Compute confidence rating from coverage of the 7 dimensions + evidence count + explicit unknowns
  const dimensionCoverageRatio = knownDimensionCount / DEFAULT_DIMENSIONS.length;
  const evidenceDensityBonus = Math.min(12, evidenceItems.length * 1.5);
  const unknownPenalty = unknownDimensionCount * 11 + Math.max(0, explicitUnknowns.length - unknownDimensionCount) * 4;
  const confidenceScore = Math.round(
    Math.max(25, Math.min(98, dimensionCoverageRatio * 88 + evidenceDensityBonus - unknownPenalty))
  );

  const confidenceLevel: 'High' | 'Medium' | 'Low' =
    confidenceScore >= 80 ? 'High' : confidenceScore >= 58 ? 'Medium' : 'Low';

  // Determine Verdict Band
  let verdictBand: VerdictBand;
  if (disqualifiers.some((d) => d.maxAllowedBand === 'Not a fit') || finalScore < 30) {
    verdictBand = 'Not a fit';
  } else if (disqualifiers.some((d) => d.maxAllowedBand === 'Weak fit') || finalScore < 50) {
    verdictBand = 'Weak fit';
  } else if (finalScore < 75 || unknownDimensionCount >= 2) {
    verdictBand = 'Possible fit (needs discovery)';
  } else {
    verdictBand = 'Strong fit';
  }

  // Generate clear one-sentence reason
  let oneSentenceReason = '';
  if (isCappedByDisqualifier) {
    oneSentenceReason = `Capped at ${finalScore}/100 (${verdictBand}) due to ${disqualifiers.length} hard disqualifier${disqualifiers.length > 1 ? 's' : ''}: ${disqualifiers[0].title}.`;
  } else if (verdictBand === 'Strong fit') {
    const topDims = dimensionScores
      .filter((d) => d.status === 'scored' && (d.score ?? 0) >= 80)
      .slice(0, 2)
      .map((d) => d.shortName)
      .join(' & ');
    oneSentenceReason = `Scores ${finalScore}/100 with ${confidenceLevel.toLowerCase()} confidence driven by strong evidence in ${topDims || 'core lakehouse dimensions'} and zero disqualifiers.`;
  } else if (verdictBand === 'Possible fit (needs discovery)') {
    oneSentenceReason = `Scores ${finalScore}/100 across ${knownDimensionCount}/7 evidenced dimensions, with ${unknownDimensionCount} unknown gap${unknownDimensionCount === 1 ? '' : 's'} requiring discovery before sizing a pilot.`;
  } else {
    oneSentenceReason = `Scores ${finalScore}/100 (${verdictBand}) because current scale, infrastructure readiness, or workload requirements do not justify a Kubernetes lakehouse.`;
  }

  return {
    overallScore: finalScore,
    rawUncappedScore,
    verdictBand,
    confidenceScore,
    confidenceLevel,
    isCappedByDisqualifier,
    activeDisqualifiers: disqualifiers,
    dimensionScores,
    knownDimensionCount,
    unknownDimensionCount,
    oneSentenceReason,
    rubricVersion: RUBRIC_VERSION
  };
}

/**
 * Input Quality Check (PRD Section 4.2 P0):
 * Before scoring, shows how many workflows & data sources were found and flags missing dimensions.
 */
export function checkInputQuality(markdown: string): InputQualityCheckResult {
  const clean = markdown.trim();
  if (!clean) {
    return {
      coverageScore: 0,
      confidenceMultiplier: 0.3,
      workflowCount: 0,
      dataSourceCount: 0,
      hasScaleMention: false,
      hasComplianceMention: false,
      hasTeamMention: false,
      hasStackMention: false,
      summaryBanner: 'No input provided yet. Upload a .md file, choose a benchmark company, or paste a description.',
      missingSignals: ['Workflows', 'Data sources', 'Data volume / scale', 'Compliance / sovereignty', 'Team readiness'],
      suggestedQuestions: [
        'What are the top 3 data workflows or pipelines this company runs today?',
        'How much data do they store (GB, TB, or PB) and where does it live?'
      ]
    };
  }

  // Extract workflows section or numbered/bullet items
  const workflowSectionMatch = clean.match(/##\s*Workflows([\s\S]*?)(?=##|$)/i);
  const workflowLines = workflowSectionMatch
    ? workflowSectionMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^(\d+\.|[-*•])\s+\S+/.test(l))
    : clean
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^(\d+\.)\s+\S+/.test(l));

  const dataSourcesSectionMatch = clean.match(/##\s*Data\s*sources([\s\S]*?)(?=##|$)/i);
  const dataSourceLines = dataSourcesSectionMatch
    ? dataSourcesSectionMatch[1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => /^([-*•]|\d+\.)\s+\S+/.test(l))
    : [];

  const workflowCount = Math.max(
    workflowLines.length,
    (clean.match(/\b(pipeline|etl|elt|dashboard|reporting|streaming|ingestion|ml|analytics|query)\b/gi) || []).length > 2
      ? Math.min(6, Math.ceil((clean.match(/\b(pipeline|etl|elt|dashboard|reporting|streaming)\b/gi) || []).length / 2))
      : 0
  );

  const dataSourceCount = Math.max(
    dataSourceLines.length,
    (clean.match(/\b(postgres|oracle|kafka|s3|minio|snowflake|mysql|mongodb|salesforce|sap|parquet|json)\b/gi) || [])
      .length > 0
      ? new Set(
          (
            clean.match(
              /\b(postgres|oracle|kafka|s3|minio|snowflake|mysql|mongodb|salesforce|sap|parquet|json|bigquery|redshift)\b/gi
            ) || []
          ).map((s) => s.toLowerCase())
        ).size
      : 0
  );

  const hasScaleMention = /\b(\d+\s*(gb|tb|pb|terabyte|petabyte|gigabyte|million|billion))\b/i.test(clean);
  const hasComplianceMention =
    /\b(sovereign|on-prem|on premises|air-gap|air gapped|gdpr|hipaa|dora|bafin|pci|soc2|residency|vpc|public cloud)\b/i.test(
      clean
    );
  const hasTeamMention = /\b(engineer|analyst|team|devops|kubernetes|k8s|openshift|eks|data scientist)\b/i.test(clean);
  const hasStackMention =
    /\b(snowflake|databricks|cloudera|hadoop|hive|spark|iceberg|postgres|rds|dbt|airflow|tableau|powerbi|metabase)\b/i.test(
      clean
    );

  const missingSignals: string[] = [];
  const suggestedQuestions: string[] = [];

  if (workflowCount === 0) {
    missingSignals.push('concrete analytical workflows');
    suggestedQuestions.push('Which specific batch ETL, BI reporting, or ML pipelines are struggling today?');
  }
  if (dataSourceCount === 0) {
    missingSignals.push('upstream data sources');
    suggestedQuestions.push('Which databases, event streams, or object stores feed analytics?');
  }
  if (!hasScaleMention) {
    missingSignals.push('data volume (GB/TB/PB)');
    suggestedQuestions.push('What is the total analytical data volume and monthly growth rate?');
  }
  if (!hasComplianceMention) {
    missingSignals.push('compliance or deployment residency');
    suggestedQuestions.push('Must data remain on-premises / in a customer VPC, or is multi-tenant SaaS allowed?');
  }
  if (!hasTeamMention) {
    missingSignals.push('data & Kubernetes team size');
    suggestedQuestions.push('Does the customer have data engineers or a Kubernetes platform team?');
  }

  let coverageScore = 20;
  if (workflowCount >= 3) coverageScore += 25;
  else if (workflowCount >= 1) coverageScore += 12;

  if (dataSourceCount >= 2) coverageScore += 15;
  else if (dataSourceCount === 1) coverageScore += 8;

  if (hasScaleMention) coverageScore += 15;
  if (hasComplianceMention) coverageScore += 15;
  if (hasTeamMention) coverageScore += 10;

  coverageScore = Math.min(100, coverageScore);

  const missingText =
    missingSignals.length === 0
      ? 'full coverage across scale, residency, stack, and team'
      : `no clear mention of ${missingSignals.join(' or ')}`;

  const summaryBanner = `We found ${workflowCount} workflow${workflowCount === 1 ? '' : 's'}, ${dataSourceCount} data source${dataSourceCount === 1 ? '' : 's'}, and ${missingText}.`;

  return {
    coverageScore,
    confidenceMultiplier: coverageScore / 100,
    workflowCount,
    dataSourceCount,
    hasScaleMention,
    hasComplianceMention,
    hasTeamMention,
    hasStackMention,
    summaryBanner,
    missingSignals,
    suggestedQuestions
  };
}

/**
 * Code Validator (PRD Section 8):
 * Fails or downgrades any Sourced claim that lacks a valid capabilityId or docUrl in iomete_capabilities.json,
 * and verifies that the displayed score can be deterministically recomputed from the evidence items.
 */
export function validateReportClaims(
  analysis: SampleCompanyAnalysis,
  displayedScore: number,
  weights: DimensionWeights = DEFAULT_WEIGHTS
): ValidationCheckResult {
  const downgradedItems: string[] = [];
  let sourcedClaimsWithValidLink = 0;
  const totalClaimsChecked = analysis.evidenceItems.length + analysis.topUseCases.length;

  for (const ev of analysis.evidenceItems) {
    const cap = CAPABILITY_MAP[ev.capabilityId];
    if (cap && cap.docUrl && cap.docUrl.startsWith('https://docs.iomete.com/')) {
      sourcedClaimsWithValidLink++;
    } else {
      downgradedItems.push(`Evidence ${ev.id} (${ev.workflowName}) missing verified KB doc link -> downgraded to Assumed`);
    }
  }

  for (const uc of analysis.topUseCases) {
    const cap = CAPABILITY_MAP[uc.capabilityId];
    if (cap && cap.docUrl && cap.docUrl.startsWith('https://docs.iomete.com/')) {
      sourcedClaimsWithValidLink++;
    } else {
      downgradedItems.push(`Use Case #${uc.rank} (${uc.title}) missing verified KB doc link -> downgraded to Assumed`);
    }
  }

  const recomputed = computeFitScore(
    analysis.evidenceItems,
    weights,
    analysis.disqualifiers,
    analysis.unknowns
  );
  const scoreRecomputedMatch = Math.abs(recomputed.overallScore - displayedScore) <= 1;

  const citationCoveragePercent =
    totalClaimsChecked > 0 ? Math.round((sourcedClaimsWithValidLink / totalClaimsChecked) * 100) : 100;

  return {
    passed: downgradedItems.length === 0 && scoreRecomputedMatch,
    totalClaimsChecked,
    sourcedClaimsWithValidLink,
    citationCoveragePercent,
    scoreRecomputedMatch,
    downgradedItems
  };
}

/**
 * Deterministic custom Markdown / text parser so any uploaded or pasted .md file
 * immediately produces a structured, source-grounded SampleCompanyAnalysis.
 */
export function parseCustomMarkdownToAnalysis(markdown: string, fileName?: string): SampleCompanyAnalysis {
  const titleMatch = markdown.match(/^#\s+(?:Company Profile:\s*)?(.+)$/m);
  const companyName = titleMatch ? titleMatch[1].trim() : fileName ? fileName.replace(/\.md$/i, '') : 'Custom Prospect Account';

  const lower = markdown.toLowerCase();
  const evidenceItems: EvidenceItem[] = [];
  const disqualifiers: DisqualifierFlag[] = [];
  const unknowns: UnknownGap[] = [];

  // 1. Sovereignty & Deployment
  if (/air-gap|air gapped|on-prem|on premises|sovereign|bafin|dora|defense|private cloud|minio|openshift/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-sov-1',
      dimensionId: 'sovereignty',
      workflowName: 'Sovereign / On-Premises or Private VPC Mandate',
      mdQuote: extractMatchingLine(markdown, /air-gap|on-prem|sovereign|residency|private|minio|openshift/i),
      mdSection: 'Constraints / Environment',
      capabilityId: /air-gap|on-prem/.test(lower) ? 'cap-airgapped-onprem' : 'cap-sovereign-byoc',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'Prospect requires strict infrastructure sovereignty or on-premises control matching IOMETE deployment.'
    });
  } else if (/public cloud saas is completely acceptable|no on-prem|vendor-hosted.*only|managed saas only/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-sov-neg',
      dimensionId: 'sovereignty',
      workflowName: 'Public SaaS Only Posture',
      mdQuote: extractMatchingLine(markdown, /saas|public cloud|no on-prem/i),
      mdSection: 'Constraints',
      capabilityId: 'cap-sovereign-byoc',
      direction: 'hurts',
      strength: 'high',
      confidence: 'high',
      label: 'Stated',
      explanation: 'No need for sovereign or customer-hosted data plane.'
    });
  } else {
    unknowns.push({
      id: 'unk-cust-sov',
      dimensionId: 'sovereignty',
      missingTopic: 'Data Residency & Deployment Model (On-Prem / BYOC vs Public SaaS)',
      impactOnConfidence: 'Dimension excluded from average (-11% confidence)',
      discoveryQuestion: 'Must analytical data stay inside your own cloud VPC or on-premises network, or can tables reside in a vendor-hosted multi-tenant SaaS?',
      whoToAsk: 'CISO / VP of Infrastructure'
    });
  }

  // 2. Data Scale & Variety
  const tinyScale = /\b([1-9]\d?\s*gb)\b/i.test(lower) && !/\b(tb|pb|terabyte|petabyte)\b/i.test(lower);
  const largeScale = /\b(\d+\s*(tb|pb|terabyte|petabyte)|billion|kafka|clickstream|parquet)\b/i.test(lower);

  if (largeScale) {
    evidenceItems.push({
      id: 'ev-cust-scale-1',
      dimensionId: 'scale',
      workflowName: 'Multi-Terabyte / Petabyte Analytical & Semi-Structured Data',
      mdQuote: extractMatchingLine(markdown, /tb|pb|terabyte|petabyte|billion|kafka|clickstream/i),
      mdSection: 'Data sources / Workflows',
      capabilityId: 'cap-petabyte-scale',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'High-volume structured and semi-structured data benefits directly from decoupled object storage + Iceberg.'
    });
  } else if (tinyScale) {
    evidenceItems.push({
      id: 'ev-cust-scale-neg',
      dimensionId: 'scale',
      workflowName: 'Sub-100 GB Small Relational Dataset',
      mdQuote: extractMatchingLine(markdown, /gb|postgres|rds/i),
      mdSection: 'Data sources',
      capabilityId: 'cap-petabyte-scale',
      direction: 'hurts',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'Dataset is small enough to run inside a single relational database without distributed Spark.'
    });
  } else {
    unknowns.push({
      id: 'unk-cust-scale',
      dimensionId: 'scale',
      missingTopic: 'Total Analytical Data Volume (TB/PB) & Growth Rate',
      impactOnConfidence: 'Dimension excluded from average (-11% confidence)',
      discoveryQuestion: 'What is the total size of structured + semi-structured data today (in TB or PB), and how fast is it growing annually?',
      whoToAsk: 'Head of Data Engineering'
    });
  }

  // 3. Openness & Lock-in
  if (/iceberg|open format|lock-in|parquet|portable/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-open-1',
      dimensionId: 'openness',
      workflowName: 'Open Table Format & Zero Lock-In Requirement',
      mdQuote: extractMatchingLine(markdown, /iceberg|open format|lock-in|parquet/i),
      mdSection: 'Constraints',
      capabilityId: 'cap-apache-iceberg',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'Matches native Apache Iceberg open table format on customer object storage.'
    });
  } else {
    unknowns.push({
      id: 'unk-cust-open',
      dimensionId: 'openness',
      missingTopic: 'Open Table Format (Apache Iceberg) Strategy',
      impactOnConfidence: 'Dimension excluded from average (-11% confidence)',
      discoveryQuestion: 'Is avoiding proprietary warehouse storage lock-in via open Apache Iceberg a priority for your architecture team?',
      whoToAsk: 'Chief Architect / VP Engineering'
    });
  }

  // 4. Workloads
  if (/spark|pyspark|dbt|etl|bi|tableau|powerbi|superset|ml|jupyter|sql/.test(lower)) {
    const isOnlyCrud = /oltp|crud|sub-15ms|prisma/.test(lower) && !/spark|dbt|etl|parquet|tb|pb/.test(lower);
    evidenceItems.push({
      id: 'ev-cust-work-1',
      dimensionId: 'workloads',
      workflowName: isOnlyCrud ? 'Transactional CRUD & Lightweight Reporting' : 'SQL BI, Batch ETL, and Spark/ML Pipelines',
      mdQuote: extractMatchingLine(markdown, /spark|dbt|etl|tableau|powerbi|metabase|crud|sql/i),
      mdSection: 'Workflows',
      capabilityId: isOnlyCrud ? 'cap-apache-iceberg' : 'cap-managed-spark',
      direction: isOnlyCrud ? 'hurts' : 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: isOnlyCrud
        ? 'Transactional CRUD workloads belong in an OLTP database, not an analytical lakehouse.'
        : 'Matches IOMETE auto-scaling Spark jobs, dbt adapter, and JDBC BI endpoints.'
    });
  }

  // 5. Cost Pressure
  if (/cost|expensive|price hike|credit|renewal|spend|\$\d+k/i.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-cost-1',
      dimensionId: 'cost',
      workflowName: 'Warehouse Credit or Legacy License Cost Pressure',
      mdQuote: extractMatchingLine(markdown, /cost|expensive|hike|credit|renewal|spend|\$/i),
      mdSection: 'Pain points',
      capabilityId: 'cap-cost-no-markup',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'IOMETE eliminates per-query cloud credit markup by running on customer infrastructure.'
    });
  }

  // 6. Technical Readiness
  if (/0 data engineer|no data team|refuses to run kubernetes|0 platform/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-ready-neg',
      dimensionId: 'readiness',
      workflowName: 'Zero Data Engineering or Kubernetes Operations Capacity',
      mdQuote: extractMatchingLine(markdown, /0 data engineer|no data team|refuses to run kubernetes/i),
      mdSection: 'Team / Constraints',
      capabilityId: 'cap-k8s-native',
      direction: 'hurts',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'No internal team to own Kubernetes or data engineering workflows.'
    });
    disqualifiers.push({
      id: 'disq-cust-1',
      title: 'Zero Data Team / Refuses Kubernetes Infrastructure',
      reason: 'Input states zero data/platform engineers or a hard refusal to run Kubernetes.',
      mdQuote: extractMatchingLine(markdown, /0 data engineer|no data team|refuses to run kubernetes/i),
      maxAllowedBand: 'Not a fit',
      maxScoreCap: 22
    });
  } else if (/kubernetes|k8s|openshift|eks|gke|aks|data engineer|spark/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-ready-pos',
      dimensionId: 'readiness',
      workflowName: 'Existing Kubernetes & Data Engineering Team',
      mdQuote: extractMatchingLine(markdown, /kubernetes|k8s|openshift|eks|data engineer|spark/i),
      mdSection: 'Team / Current stack',
      capabilityId: 'cap-k8s-native',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'Team already operates Kubernetes and SQL/Spark pipelines.'
    });
  } else {
    unknowns.push({
      id: 'unk-cust-ready',
      dimensionId: 'readiness',
      missingTopic: 'Kubernetes & Data Engineering Team Readiness',
      impactOnConfidence: 'Dimension excluded from average (-11% confidence)',
      discoveryQuestion: 'How many data engineers are on the team, and do you have a DevOps/Platform group managing Kubernetes (EKS, GKE, AKS, OpenShift)?',
      whoToAsk: 'VP of Engineering'
    });
  }

  // 7. Governance
  if (/rbac|masking|gdpr|pii|audit|sso|ldap|keycloak|dora|hipaa/.test(lower)) {
    evidenceItems.push({
      id: 'ev-cust-gov-1',
      dimensionId: 'governance',
      workflowName: 'Fine-Grained RBAC, PII Masking & Regulatory Audit Trail',
      mdQuote: extractMatchingLine(markdown, /rbac|masking|gdpr|pii|audit|sso|ldap|dora|hipaa/i),
      mdSection: 'Constraints / Workflows',
      capabilityId: 'cap-rbac-abac',
      direction: 'supports',
      strength: 'high',
      confidence: 'high',
      label: 'Sourced',
      explanation: 'Matches IOMETE RBAC/ABAC, dynamic column masking, and immutable audit logs.'
    });
  } else {
    unknowns.push({
      id: 'unk-cust-gov',
      dimensionId: 'governance',
      missingTopic: 'Access Control (RBAC), PII Masking & Audit Requirements',
      impactOnConfidence: 'Dimension excluded from average (-10% confidence)',
      discoveryQuestion: 'What row/column masking, SSO identity provider, or regulatory audit log rules apply to these datasets?',
      whoToAsk: 'Security & Governance Lead'
    });
  }

  if (tinyScale && /postgres|rds/.test(lower)) {
    disqualifiers.push({
      id: 'disq-cust-scale',
      title: 'Tiny Dataset (<100 GB) Already Served by Single Postgres Node',
      reason: 'Dataset under 100 GB does not benefit from distributed Spark + Iceberg.',
      mdQuote: extractMatchingLine(markdown, /gb|postgres|rds/i),
      maxAllowedBand: 'Not a fit',
      maxScoreCap: 20
    });
  }

  const prelimScore = computeFitScore(evidenceItems, DEFAULT_WEIGHTS, disqualifiers, unknowns);

  return {
    id: 'custom-account',
    name: companyName,
    shortTag: 'Custom .md Analysis · Live Parsed',
    deploymentBadge: `custom input · ${evidenceItems.length} evidence items`,
    industry: 'Custom Prospect Evaluation',
    headcount: 'Extracted from .md profile',
    dataVolume: largeScale ? 'Multi-TB / PB Scale Detected' : tinyScale ? '<100 GB Small Scale' : 'Volume Unspecified (Unknown)',
    incumbentStack: 'Parsed from .md input',
    expectedVerdict: prelimScore.verdictBand,
    samplePurpose: 'Custom account evaluation parsed against the 26-capability IOMETE Knowledge Base.',
    rawMarkdown: markdown,
    executiveSummaryPlain: [
      {
        text: `${companyName} evaluates as ${prelimScore.verdictBand} (${prelimScore.overallScore}/100, ${prelimScore.confidenceLevel} Confidence ${prelimScore.confidenceScore}%). ${prelimScore.oneSentenceReason}`,
        label: 'Stated'
      },
      {
        text: `We matched ${evidenceItems.length} workflow & constraint signals directly to documented entries in iomete_capabilities.json and identified ${unknowns.length} unknown gap${unknowns.length === 1 ? '' : 's'} to verify on the discovery call.`,
        label: 'Sourced',
        capabilityId: evidenceItems[0]?.capabilityId || 'cap-sovereign-byoc'
      }
    ],
    evidenceItems,
    disqualifiers,
    unknowns,
    topUseCases: evidenceItems
      .filter((e) => e.direction === 'supports')
      .slice(0, 3)
      .map((e, idx) => ({
        rank: idx + 1,
        title: e.workflowName,
        workflowQuote: e.mdQuote,
        capabilityId: e.capabilityId,
        businessOutcome: e.explanation,
        label: 'Sourced'
      })),
    objections: [
      {
        id: 'obj-cust-1',
        objection: 'How much Kubernetes and platform engineering effort is required to run IOMETE in our environment?',
        sourceNote: 'Standard operating burden check',
        honestResponse: 'IOMETE installs via standard Helm/Terraform on existing EKS, GKE, AKS, or OpenShift clusters; analysts use the web SQL IDE while platform ops manages cluster nodes.',
        capabilityId: 'cap-k8s-native',
        verificationQuestion: 'Does your platform team already run Kubernetes in production?'
      }
    ],
    competitiveContext: [
      {
        incumbent: 'Current Data Stack Incumbent',
        footprint: 'Extracted from prospect profile.',
        discoveryQuestions: [
          'Which single workflow is driving the highest compute cost or compliance headache in your current stack?',
          'What is the contract renewal date or migration deadline for your existing warehouse/lakehouse?'
        ],
        honestPositioning: 'Anchor on open Apache Iceberg storage ownership and sovereign customer-hosted execution.'
      }
    ],
    nextSteps: [
      {
        stepNumber: 1,
        category: 'Discovery Question',
        title: unknowns[0] ? `Resolve Unknown: ${unknowns[0].missingTopic}` : 'Confirm Peak Concurrency & Renewal Timeline',
        detail: unknowns[0] ? unknowns[0].discoveryQuestion : 'Validate timeline and pilot success criteria with the technical champion.'
      },
      {
        stepNumber: 2,
        category: 'Docs to Read',
        title: 'Share IOMETE Sovereign Lakehouse Architecture Overview',
        detail: 'Send the deployment and Apache Iceberg storage architecture documentation.',
        docUrl: 'https://docs.iomete.com/deployment/cloud-deployment'
      },
      {
        stepNumber: 3,
        category: 'Suggested Pilot Scope',
        title: disqualifiers.length > 0 ? 'Disqualify Politely - Do Not Pilot Yet' : '2-Week Scoped Proof of Concept on 1 Core Workflow',
        detail:
          disqualifiers.length > 0
            ? 'Wait until data volume and infrastructure readiness match lakehouse scale.'
            : 'Benchmark 1 high-priority ETL + SQL workflow on open Iceberg tables.'
      }
    ],
    repTalkTrack: {
      openingHook: `“Based on your stack profile for ${companyName}, we mapped where IOMETE’s Spark + Iceberg lakehouse directly fits-and flagged ${unknowns.length} open questions we should clarify first.”`,
      callAgenda: [
        '00–05m: Confirm current stack pain points and deployment constraints.',
        '05–15m: Review matched workflows against documented IOMETE capabilities.',
        '15–25m: Walk through open discovery questions for missing dimensions.',
        '25–30m: Decide on a scoped 2-week pilot (or honest no-go).'
      ],
      killerQuestions: unknowns.map((u) => u.discoveryQuestion).slice(0, 3),
      landminesToAvoid: [
        'Never invent unverified capabilities or claim ROI percentages without customer workload numbers.'
      ]
    },
    buyerMemo: {
      subject: `Internal Evaluation Memo: IOMETE Fit Analysis for ${companyName}`,
      toLine: 'Engineering, Data & Finance Leadership',
      tlDr: `Initial source-grounded fit verdict is ${prelimScore.verdictBand} (${prelimScore.overallScore}/100). ${prelimScore.oneSentenceReason}`,
      whyEvaluateNow: 'Evaluate whether open Apache Iceberg and sovereign Kubernetes compute address our current data platform constraints.',
      cfoCostSection: 'IOMETE decouples object storage from auto-scaling Spark compute inside our own infrastructure without per-query credit markups.',
      cisoSecuritySection: 'Deploys inside our own cloud VPC or on-premises Kubernetes cluster with RBAC, column masking, and SIEM audit logging.',
      recommendedPilot: disqualifiers.length > 0 ? 'No pilot recommended at current scale.' : 'Run a focused 14-day pilot on one core dataset.'
    }
  };
}

function extractMatchingLine(markdown: string, regex: RegExp): string {
  const lines = markdown
    .split('\n')
    .map((l) => l.replace(/^[-*•\d.]+\s*/, '').trim())
    .filter((l) => l.length > 10 && !l.startsWith('#'));
  const found = lines.find((l) => regex.test(l));
  return found || lines[0] || 'Extracted from prospect markdown description.';
}

/**
 * Generates the verifiable Markdown Report (PRD Section 7.1 & 7.3)
 */
export function generateMarkdownExport(
  analysis: SampleCompanyAnalysis,
  scoreResult: FitScoreResult,
  weights: DimensionWeights,
  audience: 'rep' | 'buyer'
): string {
  const validation = validateReportClaims(analysis, scoreResult.overallScore, weights);
  const lines: string[] = [];

  lines.push(`# FitLens - IOMETE Fit Analysis Report: ${analysis.name}`);
  lines.push(
    `> **Audience Mode:** ${audience === 'rep' ? 'Sales Rep Qualification & Call Prep Brief' : 'Buyer Internal Justification Memo'} | **Verdict:** ${scoreResult.verdictBand} (${scoreResult.overallScore}/100) | **Confidence:** ${scoreResult.confidenceLevel} (${scoreResult.confidenceScore}%)`
  );
  lines.push(`> **Rubric:** ${scoreResult.rubricVersion} | **Knowledge Base:** ${KB_VERSION} | **Citation Coverage:** ${validation.citationCoveragePercent}%`);
  lines.push('');

  lines.push('## 1. Verdict Card');
  lines.push(`- **Fit Band:** ${scoreResult.verdictBand}`);
  lines.push(`- **Overall Score:** ${scoreResult.overallScore} / 100 ${scoreResult.isCappedByDisqualifier ? `(Capped from ${scoreResult.rawUncappedScore}/100 by Hard Disqualifier)` : ''}`);
  lines.push(`- **Confidence:** ${scoreResult.confidenceLevel} (${scoreResult.confidenceScore}% - ${scoreResult.knownDimensionCount}/7 dimensions evidenced)`);
  lines.push(`- **One-Sentence Reason:** ${scoreResult.oneSentenceReason}`);
  lines.push('');

  lines.push('## 2. Why This Verdict (Plain Language with Source Labels)');
  for (const item of analysis.executiveSummaryPlain) {
    const cap = item.capabilityId ? CAPABILITY_MAP[item.capabilityId] : undefined;
    const linkSuffix = cap ? ` ([${cap.name}](${cap.docUrl}))` : '';
    lines.push(`- **[${item.label}]** ${item.text}${linkSuffix}`);
  }
  lines.push('');

  if (scoreResult.activeDisqualifiers.length > 0) {
    lines.push('## 2b. Active Disqualifier Flags (Tool Can Say No)');
    for (const d of scoreResult.activeDisqualifiers) {
      lines.push(`- **[DISQUALIFIER - Caps Verdict at ${d.maxAllowedBand}] ${d.title}:** ${d.reason}`);
      lines.push(`  - *Quoted Input [Stated]:* "${d.mdQuote}"`);
    }
    lines.push('');
  }

  lines.push('## 3. Workflow-to-Capability Evidence Map');
  lines.push('| Prospect Workflow | Quoted Input (`[Stated]`) | Matched IOMETE Capability (`[Sourced]`) | Direction & Strength | Confidence | Doc Link |');
  lines.push('| :--- | :--- | :--- | :--- | :--- | :--- |');
  for (const ev of analysis.evidenceItems) {
    const cap = CAPABILITY_MAP[ev.capabilityId];
    lines.push(
      `| **${ev.workflowName}** | "${ev.mdQuote}" | ${cap ? cap.name : ev.capabilityId} | ${ev.direction.toUpperCase()} (${ev.strength}) | ${ev.confidence} | ${cap ? `[docs.iomete.com](${cap.docUrl})` : 'Unverified'} |`
    );
  }
  lines.push('');

  lines.push('## 4. Top Ranked Use Cases');
  for (const uc of analysis.topUseCases) {
    const cap = CAPABILITY_MAP[uc.capabilityId];
    lines.push(`### #${uc.rank}. ${uc.title} \`[${uc.label}]\``);
    lines.push(`- **Prospect Quote \`[Stated]\`:** "${uc.workflowQuote}"`);
    lines.push(`- **IOMETE Capability \`[Sourced]\`:** ${cap ? `[${cap.name}](${cap.docUrl}) - ${cap.plainDescription}` : uc.capabilityId}`);
    lines.push(`- **Outcome:** ${uc.businessOutcome}`);
    lines.push('');
  }

  lines.push('## 5. Poor Fit Areas, Likely Objections & Honest Responses');
  for (const obj of analysis.objections) {
    const cap = CAPABILITY_MAP[obj.capabilityId];
    lines.push(`- **Likely Objection:** "${obj.objection}" *(${obj.sourceNote})*`);
    lines.push(`  - **Safe, Honest Response \`[Sourced]\`:** ${obj.honestResponse} ${cap ? `([Doc Reference](${cap.docUrl}))` : ''}`);
    lines.push(`  - **Verification Question:** *${obj.verificationQuestion}*`);
  }
  lines.push('');

  lines.push('## 6. Unknowns & Discovery Questions (Excluded from Score Average)');
  if (analysis.unknowns.length === 0) {
    lines.push('- All 7 dimensions have explicit evidence in the input.');
  } else {
    for (const u of analysis.unknowns) {
      lines.push(`- **Gap (${u.dimensionId.toUpperCase()}): ${u.missingTopic}**`);
      lines.push(`  - *Confidence Impact:* ${u.impactOnConfidence}`);
      lines.push(`  - *Exact Question to Ask (${u.whoToAsk}):* **"${u.discoveryQuestion}"**`);
    }
  }
  lines.push('');

  lines.push('## 7. Competitive Context & Incumbent Framing');
  for (const comp of analysis.competitiveContext) {
    lines.push(`### Incumbent: ${comp.incumbent}`);
    lines.push(`- **Footprint:** ${comp.footprint}`);
    lines.push(`- **Honest Positioning:** ${comp.honestPositioning}`);
    for (const q of comp.discoveryQuestions) {
      lines.push(`  - *Question to Ask:* "${q}"`);
    }
  }
  lines.push('');

  lines.push('## 8. Concrete Next Steps');
  for (const ns of analysis.nextSteps) {
    lines.push(`${ns.stepNumber}. **[${ns.category}] ${ns.title}:** ${ns.detail}${ns.docUrl ? ` (${ns.docUrl})` : ''}`);
  }
  lines.push('');

  if (audience === 'rep') {
    lines.push('## 9. Sales Rep Talk Track & Call Agenda');
    lines.push(`**Opening Hook:** ${analysis.repTalkTrack.openingHook}`);
    lines.push('');
    lines.push('**30-Minute Call Agenda:**');
    for (const item of analysis.repTalkTrack.callAgenda) {
      lines.push(`- ${item}`);
    }
    lines.push('');
    lines.push('**High-Signal Discovery Questions:**');
    for (const q of analysis.repTalkTrack.killerQuestions) {
      lines.push(`- "${q}"`);
    }
  } else {
    lines.push('## 9. Buyer Internal Justification Memo (Copy/Paste for CFO & Security)');
    lines.push(`**Subject:** ${analysis.buyerMemo.subject}`);
    lines.push(`**To:** ${analysis.buyerMemo.toLine}`);
    lines.push('');
    lines.push(`**Executive Summary (TL;DR):** ${analysis.buyerMemo.tlDr}`);
    lines.push('');
    lines.push(`**Why Evaluate Now:** ${analysis.buyerMemo.whyEvaluateNow}`);
    lines.push('');
    lines.push(`**CFO / Cost & Infrastructure Architecture:** ${analysis.buyerMemo.cfoCostSection}`);
    lines.push('');
    lines.push(`**CISO / Data Sovereignty & Governance Posture:** ${analysis.buyerMemo.cisoSecuritySection}`);
    lines.push('');
    lines.push(`**Proposed Low-Risk Pilot:** ${analysis.buyerMemo.recommendedPilot}`);
  }
  lines.push('');

  lines.push('## 10. Assumptions, Rubric Math & Verification Stamp');
  lines.push('| Dimension | User Weight | Active Normalized Weight | Score (0–100) | Status |');
  lines.push('| :--- | :--- | :--- | :--- | :--- |');
  for (const d of scoreResult.dimensionScores) {
    lines.push(
      `| ${d.name} | ${d.weight}% | ${d.status === 'unknown' ? 'Excluded (0%)' : `${d.normalizedActiveWeight}%`} | ${d.score !== null ? `${d.score}/100` : 'UNKNOWN'} | ${d.status.toUpperCase()} |`
    );
  }
  lines.push('');
  lines.push(`- **Validator Status:** ${validation.passed ? 'PASSED (100% claims verified against iomete_capabilities.json)' : 'WARNINGS PRESENT'}`);
  lines.push(`- **Curated Knowledge Base Entries:** ${IOMETE_CAPABILITIES.length} capabilities`);

  return lines.join('\n');
}
