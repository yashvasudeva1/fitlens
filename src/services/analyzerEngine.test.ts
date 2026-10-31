import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  runFitAnalysis,
  analyzeInputQuality,
  validateReportClaims,
  validateWhyVerdictBullets,
  clearExtractionCache,
  computeInputHash,
  DEFAULT_DIMENSION_WEIGHTS
} from './analyzerEngine';
import { SAMPLE_COMPANIES } from '../data/sampleCompanies';
import { IOMETE_CAPABILITIES } from '../data/capabilities';
import { DimensionId } from '../types/analyzer';

test('Bug #6: Knowledge base has 25-40 curated entries with live full https://iomete.com doc URLs and zero em dashes', () => {
  assert.ok(
    IOMETE_CAPABILITIES.length >= 25 && IOMETE_CAPABILITIES.length <= 40,
    `Expected 25-40 capabilities, got ${IOMETE_CAPABILITIES.length}`
  );
  for (const cap of IOMETE_CAPABILITIES) {
    assert.ok(cap.id.startsWith('cap_'));
    assert.ok(
      cap.docUrl.startsWith('https://iomete.com'),
      `Expected full https://iomete.com URL, got ${cap.docUrl}`
    );
    assert.ok(!cap.plainDescription.includes('\u2014'), `Em dash found in ${cap.id}`);
    assert.ok(cap.fitsWhen.length > 0);
    assert.ok(cap.doesNotFitWhen.length > 0);
    assert.ok(cap.maturityNote === 'verified' || cap.maturityNote === 'unverified');
  }
});

test('Bug #1: "Why this verdict" bullets cite [ev_...] IDs from input evidence, mention only scored dimensions, and validator rejects unbacked topic claims', () => {
  const partialInput = `## 1. Business Context
- Company Name: SovereignVault Corp
- Data Sovereignty Requirement: Strict on-premise datacenter residency required
- Current Total Volume: 250 Terabytes (TB) of Parquet files
- Lock-In Anxiety: Must use open Apache Iceberg format to avoid vendor lock-in
- Governance: Mandatory column-level access control and audit logs`;

  const res = runFitAnalysis('SovereignVault Corp', partialInput);
  assert.equal(res.isInsufficientInfo, false);
  assert.ok(res.plainLanguageExplanation.length >= 4);

  // Every bullet must cite an [ev_...] ID and never mention unscored dimensions (e.g. Cost Pressure & Predictability)
  for (const bullet of res.plainLanguageExplanation) {
    assert.match(bullet, /\[ev_[a-z0-9_,\s]+\]/i, `Bullet missing evidence ID citation: ${bullet}`);
    assert.ok(
      !bullet.toLowerCase().includes('cost pressure & predictability'),
      `Bullet mentioned unscored dimension: ${bullet}`
    );
  }

  // Validator must reject bullets that name topics (cost pressure, Kubernetes, streaming, air gap) not in the input evidence
  const bogusBullets = [
    '[ev_sov_1] Severe cost pressure and runaway warehouse credit bill makes zero markup ideal.',
    '[ev_sov_1] Real-time Kafka streaming ingestion is required for sub-second events.',
    '[ev_sov_1] Air-gapped network deployment is required.',
    'Bullet without any evidence ID citation at all.'
  ];
  const check = validateWhyVerdictBullets(bogusBullets, res.dimensions, res.disqualifiers);
  assert.equal(
    check.rejectedBullets.length,
    4,
    `Expected all 4 unbacked topic bullets to be rejected, got ${check.rejectedBullets.length}`
  );
  // And because all candidate bullets were rejected, it regenerates clean bullets from actual evidence
  assert.ok(check.validBullets.length >= 4);
});

test('Bug #2: Dimensions with no evidence are "not_scored" (score: null) and excluded from the average, never counted as 0', () => {
  const fourDimsHighInput = `## 1. Business Context
- Company Name: HighFour Corp
- Data Sovereignty Requirement: On-premise private datacenter required; zero data leaves perimeter
- Current Total Volume: 2.5 Petabytes (PB) of Parquet files
- Lock-in: Board-level directive for open Apache Iceberg format to prevent vendor lock-in
- Governance: Mandatory column-level access control and tamper-evident audit logs`;

  const res = runFitAnalysis('HighFour Corp', fourDimsHighInput);
  // 4 dimensions measured (sovereignty, scale, lockin, governance), 3 dimensions have no evidence (analytics_ai, cost_pressure, tech_readiness)
  assert.equal(res.dimensions.cost_pressure.status, 'not_scored');
  assert.equal(res.dimensions.cost_pressure.score, null);
  assert.equal(res.dimensions.tech_readiness.status, 'not_scored');
  assert.equal(res.dimensions.tech_readiness.score, null);

  // Because unscored dimensions are excluded from the denominator (never counted as 0), overallScore must remain > 80
  assert.ok(
    res.overallScore !== null && res.overallScore >= 85,
    `Expected overallScore >= 85 when 4 scored dimensions are high and 3 unscored are excluded, got ${res.overallScore}`
  );
});

test('Bug #3: Fewer than 4 of 7 dimensions with evidence (or confidence < 40%) returns "Insufficient information", hides score (null), shows discovery questions, and headline makes no claim about scale, sovereignty, or cost', () => {
  const twoDimsInput = `## 1. Business Context
- Company Name: SparseSignal Inc
- Current Total Volume: 400 Terabytes (TB) of Parquet logs
- Pain Point: Compute cost jumped to $900K/year`;

  const res = runFitAnalysis('SparseSignal Inc', twoDimsInput);
  assert.equal(res.isInsufficientInfo, true);
  assert.ok(res.scoredDimensionsCount < 4, `Expected < 4 scored dimensions, got ${res.scoredDimensionsCount}`);
  assert.equal(res.verdictBand, 'Insufficient information');
  assert.equal(res.overallScore, null);
  assert.equal(res.rawComputedScore, null);
  assert.ok(res.unknownsGaps.length >= 5, 'Expected discovery questions for each missing dimension');

  // Headline must not make any claim about scale, sovereignty, or cost
  const headlineLower = res.oneSentenceReason.toLowerCase();
  assert.ok(!headlineLower.includes('scale'), `Headline must not claim scale: ${res.oneSentenceReason}`);
  assert.ok(!headlineLower.includes('sovereign'), `Headline must not claim sovereignty: ${res.oneSentenceReason}`);
  assert.ok(!headlineLower.includes('cost'), `Headline must not claim cost: ${res.oneSentenceReason}`);
});

test('Bug #4: Explicit mentions of governance needs (access control, audit logs, lineage) or lock-in / open-format concerns always produce evidence items and a score', () => {
  const govAndLockinInput = `## 1. Business Context
- Company Name: GovOpen Test Co
- Sovereignty: Runs on AWS EKS in customer VPC
- Scale: 90 Terabytes (TB) of Parquet data
- Governance: Requires strict access control, immutable audit logs, and data lineage tracking
- Architecture: Worried about vendor lock-in and proprietary storage; needs open-format tables`;

  const res = runFitAnalysis('GovOpen Test Co', govAndLockinInput);

  assert.equal(res.dimensions.governance_compliance.status, 'measured');
  assert.ok(
    res.dimensions.governance_compliance.score !== null &&
      res.dimensions.governance_compliance.score >= 70,
    `Expected governance_compliance score >= 70, got ${res.dimensions.governance_compliance.score}`
  );
  assert.ok(
    res.dimensions.governance_compliance.evidence.length >= 2,
    'Expected evidence items for access control, audit logs, and lineage'
  );

  assert.equal(res.dimensions.lockin_openness.status, 'measured');
  assert.ok(
    res.dimensions.lockin_openness.score !== null && res.dimensions.lockin_openness.score >= 75,
    `Expected lockin_openness score >= 75, got ${res.dimensions.lockin_openness.score}`
  );
  assert.ok(
    res.dimensions.lockin_openness.evidence.length >= 1,
    'Expected evidence item for lock-in / open-format concern'
  );
});

test('Bug #5: Determinism - running each sample 3 times produces identical overallScore and identical scores for every single dimension', () => {
  const dimIds: DimensionId[] = [
    'sovereignty_deployment',
    'scale_variety',
    'lockin_openness',
    'analytics_ai',
    'cost_pressure',
    'tech_readiness',
    'governance_compliance'
  ];

  for (const sample of SAMPLE_COMPANIES) {
    const hash1 = computeInputHash(sample.markdownContent);
    const hash2 = computeInputHash(sample.markdownContent);
    assert.equal(hash1, hash2, 'Input hash must be deterministic');

    // Run 3 times (clearing cache on run 2 to test both cached and uncached determinism)
    const run1 = runFitAnalysis(sample.name, sample.markdownContent, DEFAULT_DIMENSION_WEIGHTS);
    clearExtractionCache();
    const run2 = runFitAnalysis(sample.name, sample.markdownContent, DEFAULT_DIMENSION_WEIGHTS);
    const run3 = runFitAnalysis(sample.name, sample.markdownContent, DEFAULT_DIMENSION_WEIGHTS);

    assert.equal(run1.overallScore, run2.overallScore, `${sample.name} overallScore differed between run 1 and 2`);
    assert.equal(run2.overallScore, run3.overallScore, `${sample.name} overallScore differed between run 2 and 3`);
    assert.equal(run1.verdictBand, sample.expectedVerdict, `${sample.name} verdictBand mismatch`);

    for (const dimId of dimIds) {
      assert.equal(
        run1.dimensions[dimId].score,
        run2.dimensions[dimId].score,
        `${sample.name} dimension ${dimId} score differed between run 1 and 2`
      );
      assert.equal(
        run2.dimensions[dimId].score,
        run3.dimensions[dimId].score,
        `${sample.name} dimension ${dimId} score differed between run 2 and 3`
      );
    }
  }
});

test('What-if weight sliders dynamically recompute overall score and exclude not_scored dimensions', () => {
  const cloudmart = SAMPLE_COMPANIES[2];
  const baseRes = runFitAnalysis(cloudmart.name, cloudmart.markdownContent, DEFAULT_DIMENSION_WEIGHTS);

  const highCostWeights = {
    ...DEFAULT_DIMENSION_WEIGHTS,
    cost_pressure: 50,
    tech_readiness: 0
  };
  const shiftedRes = runFitAnalysis(cloudmart.name, cloudmart.markdownContent, highCostWeights);
  assert.ok(
    (shiftedRes.overallScore ?? 0) > (baseRes.overallScore ?? 0),
    `Expected score to increase when weighting Cost Pressure higher (${baseRes.overallScore} -> ${shiftedRes.overallScore})`
  );
});

test('Validator downgrades claims with missing or unverified doc URLs to Assumed', () => {
  const badWorkflows = [
    {
      id: 'wf_bad',
      workflowName: 'Test workflow',
      matchedCapabilityId: 'non_existent_cap',
      matchedCapabilityName: 'Invented Feature',
      docUrl: 'https://fake.url/invented',
      fitRating: 'High Fit' as const,
      evidenceText: 'Claim without valid capability',
      confidence: 'High' as const,
      evidenceType: 'Sourced' as const
    }
  ];
  const check = validateReportClaims(badWorkflows, []);
  assert.equal(check.downgradedCount, 1);
  assert.equal(check.validatedWorkflows[0].evidenceType, 'Assumed');
});

test('Bug #7: eval/eval_results.json exists and contains measured evaluation metrics', () => {
  const evalFile = path.resolve(process.cwd(), 'eval', 'eval_results.json');
  assert.ok(fs.existsSync(evalFile), 'eval/eval_results.json must exist');
  const parsed = JSON.parse(fs.readFileSync(evalFile, 'utf-8'));
  assert.ok(parsed.verdictAgreement, 'verdictAgreement must be present');
  assert.ok(parsed.citationCoveragePercent, 'citationCoveragePercent must be present');
  assert.equal(parsed.repeatabilityVariance, '0.0%');
});
