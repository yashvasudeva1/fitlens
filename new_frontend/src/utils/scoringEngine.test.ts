import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_COMPANIES } from '../data/sampleCompanies';
import { IOMETE_CAPABILITIES } from '../data/iometeCapabilities';
import {
  DEFAULT_WEIGHTS,
  checkInputQuality,
  computeFitScore,
  generateMarkdownExport,
  parseCustomMarkdownToAnalysis,
  validateReportClaims
} from './scoringEngine';

test('Knowledge Base contains 25+ curated entries with valid docs.iomete.com URLs', () => {
  assert.ok(IOMETE_CAPABILITIES.length >= 25, `Expected >= 25 capabilities, got ${IOMETE_CAPABILITIES.length}`);
  for (const cap of IOMETE_CAPABILITIES) {
    assert.ok(cap.id.startsWith('cap-'), `Invalid id ${cap.id}`);
    assert.ok(cap.docUrl.startsWith('https://docs.iomete.com/'), `Invalid docUrl ${cap.docUrl}`);
    assert.ok(cap.plainDescription.length > 20);
    assert.ok(cap.fitsWhen.length >= 1);
    assert.ok(cap.doesNotFitWhen.length >= 1);
  }
});

test('Sample 1 (Aegis Sovereign Bank) scores Strong fit with 100% verdict agreement', () => {
  const aegis = SAMPLE_COMPANIES.find((c) => c.id === 'aegis-bank')!;
  const result = computeFitScore(aegis.evidenceItems, DEFAULT_WEIGHTS, aegis.disqualifiers, aegis.unknowns);

  assert.equal(result.verdictBand, 'Strong fit');
  assert.equal(result.verdictBand, aegis.expectedVerdict);
  assert.ok(result.overallScore >= 85, `Expected high score >= 85, got ${result.overallScore}`);
  assert.equal(result.isCappedByDisqualifier, false);
  assert.equal(result.knownDimensionCount, 7);
});

test('Sample 2 (PulseNote SaaS Negative Control) says NO and is capped by disqualifiers', () => {
  const pulse = SAMPLE_COMPANIES.find((c) => c.id === 'pulsenote-startup')!;
  const result = computeFitScore(pulse.evidenceItems, DEFAULT_WEIGHTS, pulse.disqualifiers, pulse.unknowns);

  assert.equal(result.verdictBand, 'Not a fit');
  assert.equal(result.verdictBand, pulse.expectedVerdict);
  assert.equal(result.isCappedByDisqualifier, true);
  assert.ok(result.overallScore <= 20, `Expected score <= 20, got ${result.overallScore}`);
  // Governance has no evidence in PulseNote -> must be marked unknown and excluded from average
  const govDim = result.dimensionScores.find((d) => d.dimensionId === 'governance')!;
  assert.equal(govDim.status, 'unknown');
  assert.equal(govDim.score, null);
  assert.equal(govDim.normalizedActiveWeight, 0);
});

test('Sample 3 (Verve Omnichannel Retail) lands in Possible fit (needs discovery) with excluded unknowns', () => {
  const verve = SAMPLE_COMPANIES.find((c) => c.id === 'verve-retail')!;
  const result = computeFitScore(verve.evidenceItems, DEFAULT_WEIGHTS, verve.disqualifiers, verve.unknowns);

  assert.equal(result.verdictBand, 'Possible fit (needs discovery)');
  assert.equal(result.verdictBand, verve.expectedVerdict);
  assert.ok(result.overallScore >= 55 && result.overallScore <= 74, `Expected middle score, got ${result.overallScore}`);
  assert.ok(result.unknownDimensionCount >= 2, 'Expected sovereignty and governance to be unknown');
});

test('What-if weight sliders dynamically change the computed score', () => {
  const verve = SAMPLE_COMPANIES.find((c) => c.id === 'verve-retail')!;
  const highCostWeights = {
    ...DEFAULT_WEIGHTS,
    cost: 80,
    readiness: 5
  };
  const lowCostHighReadinessWeights = {
    ...DEFAULT_WEIGHTS,
    cost: 0,
    scale: 5,
    openness: 5,
    workloads: 5,
    readiness: 85
  };

  const scoreHighCost = computeFitScore(verve.evidenceItems, highCostWeights, verve.disqualifiers, verve.unknowns);
  const scoreHighReadiness = computeFitScore(
    verve.evidenceItems,
    lowCostHighReadinessWeights,
    verve.disqualifiers,
    verve.unknowns
  );

  assert.ok(
    scoreHighCost.overallScore > scoreHighReadiness.overallScore,
    `Expected high-cost weight (${scoreHighCost.overallScore}) > high-readiness weight (${scoreHighReadiness.overallScore})`
  );
});

test('Repeatability: running the same input 3 times produces 0.0 score variance', () => {
  const aegis = SAMPLE_COMPANIES[0];
  const r1 = computeFitScore(aegis.evidenceItems, DEFAULT_WEIGHTS, aegis.disqualifiers, aegis.unknowns).overallScore;
  const r2 = computeFitScore(aegis.evidenceItems, DEFAULT_WEIGHTS, aegis.disqualifiers, aegis.unknowns).overallScore;
  const r3 = computeFitScore(aegis.evidenceItems, DEFAULT_WEIGHTS, aegis.disqualifiers, aegis.unknowns).overallScore;
  assert.equal(r1, r2);
  assert.equal(r2, r3);
});

test('Validator verifies 100% citation coverage across all 3 sample companies', () => {
  for (const company of SAMPLE_COMPANIES) {
    const score = computeFitScore(company.evidenceItems, DEFAULT_WEIGHTS, company.disqualifiers, company.unknowns);
    const validation = validateReportClaims(company, score.overallScore, DEFAULT_WEIGHTS);
    assert.equal(validation.passed, true, `Validation failed for ${company.name}: ${validation.downgradedItems.join(', ')}`);
    assert.equal(validation.citationCoveragePercent, 100);
  }
});

test('Input quality check detects workflows, data sources, and missing compliance/scale mentions', () => {
  const fullCheck = checkInputQuality(SAMPLE_COMPANIES[0].rawMarkdown);
  assert.ok(fullCheck.workflowCount >= 5);
  assert.ok(fullCheck.dataSourceCount >= 3);
  assert.equal(fullCheck.hasScaleMention, true);
  assert.equal(fullCheck.hasComplianceMention, true);

  const sparseCheck = checkInputQuality('# Thin Corp\n## Workflows\n1. Weekly sales dashboard\n');
  assert.equal(sparseCheck.hasScaleMention, false);
  assert.equal(sparseCheck.hasComplianceMention, false);
  assert.ok(sparseCheck.missingSignals.length >= 2);
});

test('Custom markdown parser and Markdown exporter work end to end', () => {
  const parsed = parseCustomMarkdownToAnalysis(
    '# EuroDefense Aero\n## Workflows\n1. Air-gapped telemetry Spark ETL on 800 TB MinIO S3.\n## Team\n- 10 Kubernetes and PySpark engineers\n## Constraints\n- Strict air-gapped on-premises Apache Iceberg mandate and RBAC audit logs.\n## Pain points\n- Legacy Cloudera license cost hike.'
  );
  const score = computeFitScore(parsed.evidenceItems, DEFAULT_WEIGHTS, parsed.disqualifiers, parsed.unknowns);
  assert.equal(score.verdictBand, 'Strong fit');

  const mdRep = generateMarkdownExport(parsed, score, DEFAULT_WEIGHTS, 'rep');
  const mdBuyer = generateMarkdownExport(parsed, score, DEFAULT_WEIGHTS, 'buyer');
  assert.ok(mdRep.includes('Sales Rep Talk Track'));
  assert.ok(mdBuyer.includes('Buyer Internal Justification Memo'));
});
