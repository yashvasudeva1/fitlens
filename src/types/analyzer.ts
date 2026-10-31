export type DimensionId =
  | 'sovereignty_deployment'
  | 'scale_variety'
  | 'lockin_openness'
  | 'analytics_ai'
  | 'cost_pressure'
  | 'tech_readiness'
  | 'governance_compliance';

export type SourceType = 'Stated' | 'Sourced' | 'Assumed';

export type FitDirection = 'supports' | 'hurts' | 'neutral';

export type Strength = 'high' | 'medium' | 'low';

export type VerdictBand =
  | 'Strong fit'
  | 'Possible fit'
  | 'Weak fit'
  | 'Not a fit'
  | 'Insufficient information';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface EvidenceItem {
  id: string;
  dimensionId: DimensionId;
  sourceText: string;
  sourceLine: string;
  sourceType: SourceType;
  capabilityId?: string;
  capabilityName?: string;
  capabilityDocUrl?: string;
  direction: FitDirection;
  strength: Strength;
  explanation: string;
}

export interface DimensionScore {
  dimensionId: DimensionId;
  name: string;
  defaultWeight: number;
  userWeight: number;
  score: number | null; // 0 to 100 when measured; null when not_scored (never counted as 0)
  status: 'measured' | 'not_scored';
  whyItMatters: string;
  evidence: EvidenceItem[];
  gaps: string[];
  discoveryQuestion: string;
}

export interface DisqualifierFlag {
  id: string;
  title: string;
  triggeredBecause: string;
  impactOnVerdict: string;
  honestRecommendation: string;
  cappedVerdict: VerdictBand;
}

export interface InputQualityCheck {
  coverageScore: number; // 0 to 100
  sectionsFound: string[];
  sectionsMissing: string[];
  workflowsCount: number;
  dataSourcesCount: number;
  scaleDetected: string;
  complianceDetected: string;
  confidenceRating: ConfidenceLevel;
  verdict: 'High Signal (Ready)' | 'Adequate (Minor Gaps)' | 'Low Coverage (High Uncertainty)';
  suggestions: string[];
}

export interface UnknownGap {
  id: string;
  title: string;
  missingInfo: string;
  discoveryQuestion: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface EvalResults {
  measuredAt?: string;
  rubricVersion?: string;
  verdictAgreement?: string;
  citationCoveragePercent?: string;
  repeatabilityVariance?: string;
  unknownHandlingStatus?: string;
  kbUrlsTotal?: number;
  kbUrlsBroken?: number;
  samplesEvaluated?: number;
}

export interface AnalysisResult {
  companyName: string;
  inputHash: string;
  isInsufficientInfo: boolean;
  scoredDimensionsCount: number;
  overallScore: number | null;
  rawComputedScore: number | null;
  verdictBand: VerdictBand;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  oneSentenceReason: string;
  plainLanguageExplanation: string[];
  rejectedWhyBullets: string[];
  disqualifiers: DisqualifierFlag[];
  dimensions: Record<DimensionId, DimensionScore>;
  workflowMatches: Array<{
    id: string;
    workflowName: string;
    matchedCapabilityId: string;
    matchedCapabilityName: string;
    docUrl: string;
    fitRating: 'High Fit' | 'Partial Fit' | 'Poor Fit';
    evidenceText: string;
    confidence: ConfidenceLevel;
    evidenceType: SourceType;
  }>;
  topUseCases: Array<{
    rank: number;
    title: string;
    prospectQuote: string;
    iometeCapability: string;
    docUrl: string;
    rationale: string;
    evidenceType: SourceType;
  }>;
  unknownsGaps: Array<{
    id: string;
    title: string;
    missingInfo: string;
    discoveryQuestion: string;
    priority: 'P0' | 'P1' | 'P2';
  }>;
  objectionsAndRisks: Array<{
    objection: string;
    likelihood: 'High' | 'Medium' | 'Low';
    honestResponse: string;
    prospectConcern: string;
    docUrl?: string;
  }>;
  competitiveContext: Array<{
    competitor: string;
    likelyIncumbent: boolean;
    framingStrategy: string;
    discoveryAngles: string[];
  }>;
  nextSteps: Array<{
    step: number;
    action: string;
    owner: string;
    suggestedScope: string;
    resourceDoc: string;
  }>;
  salesRepView: {
    targetPersona: string;
    cheatSheet: {
      callGoal: string;
      elevatorPitch: string;
      criticalDiscoveryQuestions: string[];
      landmineToAvoid: string;
      suggestedClose: string;
    };
    agenda: Array<{ time: string; topic: string; objective: string }>;
  };
  buyerMemoView: {
    memoHeader: {
      to: string;
      from: string;
      date: string;
      subject: string;
      classification: string;
    };
    executiveSummary: string;
    businessNeedAndFriction: string;
    architecturalFitSummary: string;
    sovereigntyAndSecurityBrief: string;
    tcoCostComparison: string;
    suggestedPoCPlan: Array<{ week: string; milestone: string; successCriteria: string }>;
    cfoDefensePoint: string;
    cisoDefensePoint: string;
  };
  inputQuality: InputQualityCheck;
  meta: {
    rubricVersion: string;
    analysisTimestamp: string;
    citationCoveragePercent: number;
    totalClaimsEvaluated: number;
    statedCount: number;
    sourcedCount: number;
    assumedCount: number;
    repeatabilityVariance: number;
    geminiModelsUsed?: string[];
    searchGroundedSources?: Array<{ title: string; url: string }>;
  };
  flourishBreakdown: {
    divergingDimensions: Array<{
      dimensionId: DimensionId;
      shortName: string;
      weight: number;
      status: 'measured' | 'not_scored';
      flourishCatalyst: number;
      frictionDrag: number;
      netScore: number;
      driverSummary: string;
    }>;
    workloadPillars: Array<{
      pillar: string;
      prospectDemand: number;
      iometeFit: number;
      verdictNote: string;
    }>;
    tcoTrajectory: {
      unitLabel: string;
      isSubScaleWarning: boolean;
      summaryNote: string;
      months: Array<{
        month: string;
        incumbentCumulativeK: number;
        iometeCumulativeK: number;
      }>;
    };
    flourishVerdictSummary: string;
    primaryFlourishDrivers: string[];
    primaryFailureRisks: string[];
  };
}

export type OutreachStatus =
  | 'Qualified - Approach Now'
  | 'Discovery Scheduled'
  | 'PoC / Pilot Active'
  | 'Nurture / Revisit Later'
  | 'Disqualified - Do Not Pitch';

export interface ProspectRecord {
  id: string;
  companyName: string;
  industry: string;
  websiteOrDomain: string;
  dataScale: string;
  currentStack: string;
  compliancePosture: string;
  overallScore: number | null;
  verdictBand: VerdictBand;
  confidenceLevel: ConfidenceLevel;
  flourishSummary: string;
  primaryFriction: string;
  targetPersona: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  outreachStatus: OutreachStatus;
  priorityTier: 'Tier 1 - Immediate' | 'Tier 2 - Strategic' | 'Tier 3 - Hold';
  repNotes: string;
  nextAction: string;
  followUpDate: string;
  analyzedByModels: string[];
  updatedAt: string;
  markdownContent: string;
}

export interface GeminiEnrichmentPayload {
  companyName?: string;
  industry?: string;
  dataScale?: string;
  currentStack?: string;
  compliancePosture?: string;
  oneSentenceReason?: string;
  plainLanguageExplanation?: string[];
  workflowMatches?: AnalysisResult['workflowMatches'];
  topUseCases?: AnalysisResult['topUseCases'];
  unknownsGaps?: AnalysisResult['unknownsGaps'];
  objectionsAndRisks?: AnalysisResult['objectionsAndRisks'];
  competitiveContext?: AnalysisResult['competitiveContext'];
  nextSteps?: AnalysisResult['nextSteps'];
  salesRepView?: AnalysisResult['salesRepView'];
  buyerMemoView?: AnalysisResult['buyerMemoView'];
  flourishVerdictSummary?: string;
  primaryFlourishDrivers?: string[];
  primaryFailureRisks?: string[];
  geminiModelsUsed?: string[];
  searchGroundedSources?: Array<{ title: string; url: string }>;
}
