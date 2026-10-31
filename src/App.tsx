import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { MD_TEMPLATE } from './data/sampleCompanies';
import {
  runFitAnalysis,
  DEFAULT_DIMENSION_WEIGHTS,
  exportToMarkdown
} from './services/analyzerEngine';
import {
  DimensionId,
  EvalResults,
  GeminiEnrichmentPayload,
  ProspectRecord
} from './types/analyzer';
import { Navbar, WorkspaceTab } from './components/Navbar';
import { HexagonHeroCanvas } from './components/HexagonHeroCanvas';
import { InputSection } from './components/InputSection';
import { FitGauge } from './components/FitGauge';
import { RadarChart } from './components/RadarChart';
import { FlourishBreakdownCharts } from './components/FlourishBreakdownCharts';
import { WhatIfSliders } from './components/WhatIfSliders';
import { WorkflowMatrix } from './components/WorkflowMatrix';
import { TopUseCases } from './components/TopUseCases';
import { UnknownsAndObjections } from './components/UnknownsAndObjections';
import { AudienceView } from './components/AudienceView';
import { ProspectDatabase } from './components/ProspectDatabase';
import { CapabilitiesModal } from './components/CapabilitiesModal';
import { PrintableReportModal } from './components/PrintableReportModal';
import { ArrowUpRight, FileText, Database, BarChart3, ShieldCheck, Layers } from 'lucide-react';

export function App() {
  const [markdownText, setMarkdownText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('qualification');
  const [audienceMode, setAudienceMode] = useState<'sales' | 'buyer'>('sales');
  const [userWeights, setUserWeights] = useState<Record<DimensionId, number>>(DEFAULT_DIMENSION_WEIGHTS);

  // Header evaluation telemetry loaded strictly from eval/eval_results.json (Bug #7)
  const [evalResults, setEvalResults] = useState<EvalResults | null>(null);

  // Multi-Model Gemini API state
  const [geminiEnrichment, setGeminiEnrichment] = useState<GeminiEnrichmentPayload | undefined>(undefined);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [isAnalyzingWithGemini, setIsAnalyzingWithGemini] = useState<boolean>(false);
  const [activeModelsUsed, setActiveModelsUsed] = useState<string[]>([
    'gemini-3.1-flash-lite (Signal Parser, temp=0)',
    'gemini-3.8-flash (28-Capability Matcher, temp=0)',
    'gemini-3.8-flash-lite-tts (Audio Briefing)'
  ]);
  const [groundedSources, setGroundedSources] = useState<Array<{ title: string; url: string }>>([]);

  // Persistent IOMETE Prospect Database state
  const [prospects, setProspects] = useState<ProspectRecord[]>([]);

  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const companyName = useMemo(() => {
    if (!markdownText.trim()) return 'No Account Loaded';
    const match = markdownText.match(/Company Name:\s*([^\n\r]+)/i);
    if (match && match[1].trim()) return match[1].trim();
    const headingMatch = markdownText.match(/^#\s+Account Qualification Brief:\s*([^\n\r]+)/im);
    return headingMatch ? headingMatch[1].trim() : 'Analyzed Prospect';
  }, [markdownText]);

  const analysis = useMemo(() => {
    return runFitAnalysis(companyName, markdownText, userWeights, geminiEnrichment);
  }, [companyName, markdownText, userWeights, geminiEnrichment]);

  const activeProspectRecord = useMemo(() => {
    return prospects.find(
      p => p.companyName.toLowerCase() === analysis.companyName.toLowerCase()
    );
  }, [prospects, analysis.companyName]);

  // Fetch eval/eval_results.json for header telemetry (Bug #7)
  useEffect(() => {
    let mounted = true;
    async function loadEvalStats() {
      try {
        const apiRes = await fetch('/api/eval-results');
        if (apiRes.ok) {
          const data = await apiRes.json();
          if (mounted && data.measured && data.results) {
            setEvalResults(data.results);
            return;
          }
        }
        const staticRes = await fetch('/eval/eval_results.json');
        if (staticRes.ok) {
          const staticData = await staticRes.json();
          if (mounted && staticData) {
            setEvalResults(staticData);
          }
        }
      } catch {
        // Leave evalResults null so header displays "not yet measured"
      }
    }
    loadEvalStats();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch initial saved prospects from the persistent database
  const fetchProspects = useCallback(async () => {
    try {
      const res = await fetch('/api/prospects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.prospects)) {
          setProspects(data.prospects);
        }
      }
    } catch {
      // Ignore network error if offline
    }
  }, []);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const handleMarkdownChange = (newText: string) => {
    setMarkdownText(newText);
    setGeminiEnrichment(undefined);
  };

  // Stage 0: Research any live company using gemini-3.8-flash (Search Grounding) + gemini-3.1-flash-lite
  const handleRunGeminiResearch = async (companyQuery: string, industryHint?: string) => {
    setIsResearching(true);
    try {
      const res = await fetch('/api/gemini/research-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyQuery, industryHint })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.markdownContent) {
          setMarkdownText(data.markdownContent);
          setGeminiEnrichment(undefined);
          if (Array.isArray(data.modelsUsed)) {
            setActiveModelsUsed(data.modelsUsed);
          }
          if (Array.isArray(data.groundedSources)) {
            setGroundedSources(data.groundedSources);
          }
          await runGeminiAnalyzePipeline(data.markdownContent, companyQuery);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to research company. Please verify GEMINI_API_KEY is configured on the server.');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error while attempting to reach Gemini research API.');
    } finally {
      setIsResearching(false);
    }
  };

  // Stage 1 + Stage 2 + Stage 3: Run Multi-Model Gemini Fit Analysis & Save to Prospect DB
  const runGeminiAnalyzePipeline = async (mdToAnalyze: string, nameOverride?: string) => {
    setIsAnalyzingWithGemini(true);
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: nameOverride || companyName,
          markdownText: mdToAnalyze,
          userWeights,
          saveToDb: true
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) {
          setGeminiEnrichment({
            companyName: data.analysis.companyName,
            oneSentenceReason: data.analysis.oneSentenceReason,
            workflowMatches: data.analysis.workflowMatches,
            topUseCases: data.analysis.topUseCases,
            unknownsGaps: data.analysis.unknownsGaps,
            objectionsAndRisks: data.analysis.objectionsAndRisks,
            flourishVerdictSummary: data.analysis.flourishBreakdown?.flourishVerdictSummary,
            primaryFlourishDrivers: data.analysis.flourishBreakdown?.primaryFlourishDrivers,
            primaryFailureRisks: data.analysis.flourishBreakdown?.primaryFailureRisks,
            geminiModelsUsed: data.analysis.meta?.geminiModelsUsed
          });
          if (Array.isArray(data.analysis.meta?.geminiModelsUsed)) {
            setActiveModelsUsed(data.analysis.meta.geminiModelsUsed);
          }
        }
        await fetchProspects();
      }
    } finally {
      setIsAnalyzingWithGemini(false);
    }
  };

  const handleRunGeminiDeepAnalysis = async () => {
    await runGeminiAnalyzePipeline(markdownText, companyName);
  };

  // Prospect Database CRUD handlers
  const handleLoadProspect = (prospect: ProspectRecord) => {
    if (prospect.markdownContent) {
      setMarkdownText(prospect.markdownContent);
      setGeminiEnrichment(undefined);
      setActiveTab('qualification');
      const verdictEl = document.getElementById('workspace-tabs');
      if (verdictEl) {
        verdictEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSaveCurrentToDb = async () => {
    await runGeminiAnalyzePipeline(markdownText, companyName);
  };

  const handleUpdateProspect = async (id: string, updates: Partial<ProspectRecord>) => {
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.prospects)) {
        setProspects(data.prospects);
      }
    }
  };

  const handleDeleteProspect = async (id: string) => {
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.prospects)) {
        setProspects(data.prospects);
      }
    }
  };

  const handleCreateManualProspect = async (newRecord: Partial<ProspectRecord>) => {
    const res = await fetch('/api/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.prospects)) {
        setProspects(data.prospects);
      }
    }
  };

  const handleWeightChange = (dimId: DimensionId, newWeight: number) => {
    setUserWeights((prev) => ({
      ...prev,
      [dimId]: newWeight
    }));
  };

  const handleResetWeights = () => {
    setUserWeights(DEFAULT_DIMENSION_WEIGHTS);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([MD_TEMPLATE], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'iomete-account-qualification-template.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMarkdown = () => {
    const mdContent = exportToMarkdown(analysis);
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFilename = `${companyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-iomete-fit-report.md`;
    link.href = url;
    link.setAttribute('download', safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const scoreSummaryText =
    !markdownText.trim()
      ? 'Awaiting account specification'
      : analysis.isInsufficientInfo || analysis.overallScore === null
      ? 'Insufficient information'
      : `${analysis.verdictBand} (${analysis.overallScore}/100)`;

  return (
    <div id="top" className="min-h-screen bg-[#f5f5f1] text-[#121212] flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenCapabilitiesModal={() => setIsCapabilitiesOpen(true)}
        evalResults={evalResults}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section: Editorial Left Column + Animated Hexagon Pattern Right Column (#2D382D) */}
        <section className="py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Left Column: Editorial Headline & Primary Actions */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="font-mono text-xs text-[#66665f]">
                ( Sovereign Lakehouse Qualification · Multi-Model Gemini Engine )
              </p>

              <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.85rem)] font-normal leading-[1.03] tracking-[-0.035em] text-[#121212] text-balance">
                Placing complex architecture against a real business, line by line.
              </h1>

              <p className="text-sm sm:text-base text-[#2c2c2a] leading-relaxed max-w-[54ch]">
                IOMETE brings Apache Spark and Apache Iceberg to Kubernetes - on premises, in your cloud, hybrid, or air-gapped. FitLens pairs <strong className="font-medium text-[#121212]">gemini-3.8-flash</strong>, <strong className="font-medium text-[#121212]">gemini-3.1-flash-lite</strong>, and <strong className="font-medium text-[#121212]">gemini-3.8-flash-lite-tts</strong> with a deterministic 7-dimension rubric to produce audit-ready qualification reports and a persistent prospect outreach database.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('qualification');
                    document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-3 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Qualify Account & Verdict
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('charts');
                    document.getElementById('workspace-tabs')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-3 text-xs font-mono text-[#121212] bg-white border border-[#dcdcd5] hover:border-[#2D382D] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#2D382D]" />
                  <span>Flourish Charts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 text-xs font-mono text-[#121212] bg-white border border-[#dcdcd5] hover:border-[#2D382D] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#2D382D]" />
                  <span>Export Report + Charts</span>
                </button>
              </div>

              <p className="font-mono text-xs text-[#66665f]">
                ( Active Account: <strong className="text-[#121212]">{analysis.companyName}</strong> · Verdict: <strong className="text-[#2D382D]">{scoreSummaryText}</strong> · Scored: <strong className="text-[#121212]">{analysis.scoredDimensionsCount}/7</strong> )
              </p>
            </div>
          </div>

          {/* Right Column: Moving Geometric Hexagon Pattern (#2D382D) */}
          <HexagonHeroCanvas />
        </section>

        {/* Professional Separated Report Workspace Switcher */}
        <div
          id="workspace-tabs"
          className="border-t border-b border-[#dcdcd5] bg-white p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 my-4"
        >
          <div
            role="tablist"
            aria-label="Separated qualification report views"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'qualification'}
              onClick={() => setActiveTab('qualification')}
              className={`p-3 text-left border transition-colors cursor-pointer ${
                activeTab === 'qualification'
                  ? 'bg-[#2D382D] text-[#f8f8f5] border-[#2D382D]'
                  : 'bg-[#f8f8f5] text-[#121212] border-[#dcdcd5] hover:border-[#2D382D]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] opacity-80">
                <span>Report 01</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <p className="font-display text-sm font-medium mt-1">
                Qualification & Verdict
              </p>
              <p className="font-mono text-[10px] opacity-75 mt-0.5">
                Input .md · Gauge · 7-Axis Rubric
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'charts'}
              onClick={() => setActiveTab('charts')}
              className={`p-3 text-left border transition-colors cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-[#2D382D] text-[#f8f8f5] border-[#2D382D]'
                  : 'bg-[#f8f8f5] text-[#121212] border-[#dcdcd5] hover:border-[#2D382D]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] opacity-80">
                <span>Report 02</span>
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <p className="font-display text-sm font-medium mt-1">
                Flourish & TCO Charts
              </p>
              <p className="font-mono text-[10px] opacity-75 mt-0.5">
                Catalysts vs Drag · 36-Mo TCO · Workloads
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dossier'}
              onClick={() => setActiveTab('dossier')}
              className={`p-3 text-left border transition-colors cursor-pointer ${
                activeTab === 'dossier'
                  ? 'bg-[#2D382D] text-[#f8f8f5] border-[#2D382D]'
                  : 'bg-[#f8f8f5] text-[#121212] border-[#dcdcd5] hover:border-[#2D382D]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] opacity-80">
                <span>Report 03</span>
                <Layers className="w-3.5 h-3.5" />
              </div>
              <p className="font-display text-sm font-medium mt-1">
                Dossier & Audience Briefs
              </p>
              <p className="font-mono text-[10px] opacity-75 mt-0.5">
                Workflows · Quotes · Sales & Buyer Memo
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'database'}
              onClick={() => setActiveTab('database')}
              className={`p-3 text-left border transition-colors cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-[#2D382D] text-[#f8f8f5] border-[#2D382D]'
                  : 'bg-[#f8f8f5] text-[#121212] border-[#dcdcd5] hover:border-[#2D382D]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px] opacity-80">
                <span>Report 04</span>
                <Database className="w-3.5 h-3.5" />
              </div>
              <p className="font-display text-sm font-medium mt-1">
                Prospect Outreach DB ({prospects.length})
              </p>
              <p className="font-mono text-[10px] opacity-75 mt-0.5">
                Saved Accounts · Contacts · CSV Export
              </p>
            </button>
          </div>
        </div>

        {/* TAB 01: Qualification Input, Executive Verdict & 7-Dimension Rubric */}
        {activeTab === 'qualification' && (
          <div className="space-y-8 pb-8">
            <InputSection
              markdownText={markdownText}
              onMarkdownChange={handleMarkdownChange}
              qualityCheck={analysis.inputQuality}
              onDownloadTemplate={handleDownloadTemplate}
              onRunGeminiResearch={handleRunGeminiResearch}
              onRunGeminiDeepAnalysis={handleRunGeminiDeepAnalysis}
              isResearching={isResearching}
              isAnalyzingWithGemini={isAnalyzingWithGemini}
              activeModelsUsed={activeModelsUsed}
              groundedSources={groundedSources}
            />

            <section id="verdict-section" className="pt-6 border-t border-[#dcdcd5] space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-[#66665f] mb-2">
                    ( 01B / Executive Verdict & 7-Dimension Structural Radar )
                  </p>
                  <h2 className="font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-normal leading-[1.04] tracking-[-0.03em] text-[#121212]">
                    {analysis.companyName}
                  </h2>
                </div>

                <div className="font-mono text-xs text-[#66665f] tabular-nums">
                  Stated Claims: <strong className="text-[#121212]">{analysis.meta.statedCount}</strong>
                  {' · '}
                  Sourced Docs: <strong className="text-[#2D382D]">{analysis.meta.sourcedCount}</strong>
                  {' · '}
                  Assumed: <strong className="text-[#121212]">{analysis.meta.assumedCount}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7">
                  <FitGauge
                    isInsufficientInfo={analysis.isInsufficientInfo}
                    scoredDimensionsCount={analysis.scoredDimensionsCount}
                    score={analysis.overallScore}
                    rawComputedScore={analysis.rawComputedScore}
                    verdictBand={analysis.verdictBand}
                    confidenceLevel={analysis.confidenceLevel}
                    confidenceScore={analysis.confidenceScore}
                    oneSentenceReason={analysis.oneSentenceReason}
                    plainLanguageExplanation={analysis.plainLanguageExplanation}
                    disqualifiers={analysis.disqualifiers}
                    unknownsGaps={analysis.unknownsGaps}
                  />
                </div>

                <div className="lg:col-span-5">
                  <RadarChart dimensions={analysis.dimensions} />
                </div>
              </div>

              <WhatIfSliders
                dimensions={analysis.dimensions}
                onWeightChange={handleWeightChange}
                onResetWeights={handleResetWeights}
              />
            </section>
          </div>
        )}

        {/* TAB 02: Flourish vs. Friction Multi-Chart Breakdown */}
        {activeTab === 'charts' && (
          <div className="pb-8">
            <FlourishBreakdownCharts analysis={analysis} />
          </div>
        )}

        {/* TAB 03: Evidence Dossier, Use Cases, Unknowns/Objections, Audience Briefs & Next Steps */}
        {activeTab === 'dossier' && (
          <div className="py-6 space-y-8">
            <WorkflowMatrix workflowMatches={analysis.workflowMatches} />
            <TopUseCases topUseCases={analysis.topUseCases} />
            <UnknownsAndObjections
              unknownsGaps={analysis.unknownsGaps}
              objectionsAndRisks={analysis.objectionsAndRisks}
              competitiveContext={analysis.competitiveContext}
            />
            <AudienceView
              audienceMode={audienceMode}
              onToggleAudience={setAudienceMode}
              analysis={analysis}
            />

            {/* Concrete Next Steps & Pilot Scope */}
            <section className="pt-4 space-y-6">
              <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between pb-6 border-b border-[#e1e1da] mb-6 gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#66665f] mb-1.5">
                      ( 08 / Concrete Next Steps & Pilot Scope )
                    </p>
                    <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#121212]">
                      Three concrete actions to move from brief to decision.
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(true)}
                    className="px-4 py-2 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors cursor-pointer"
                  >
                    Open Exportable Report + Charts
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {analysis.nextSteps.map((step) => (
                    <div
                      key={step.step}
                      className="p-5 border border-[#e1e1da] bg-[#f8f8f5] flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between font-mono text-xs text-[#66665f]">
                          <span>Step 0{step.step} / 03</span>
                          <span className="text-[#2D382D]">{step.owner}</span>
                        </div>
                        <h4 className="font-display text-lg font-medium text-[#121212]">
                          {step.action}
                        </h4>
                        <p className="text-xs text-[#2c2c2a] leading-relaxed">
                          {step.suggestedScope}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#e1e1da]">
                        <a
                          href={step.resourceDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-[#2D382D] underline underline-offset-4 hover:text-[#121212]"
                        >
                          <span>Read Documentation</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 04: Persistent IOMETE Prospect & Outreach Database */}
        {activeTab === 'database' && (
          <div className="pb-8">
            <ProspectDatabase
              prospects={prospects}
              activeCompanyName={analysis.companyName}
              currentAnalysis={analysis}
              currentMarkdown={markdownText}
              onLoadProspect={handleLoadProspect}
              onSaveCurrentToDb={handleSaveCurrentToDb}
              onUpdateProspect={handleUpdateProspect}
              onDeleteProspect={handleDeleteProspect}
              onCreateManualProspect={handleCreateManualProspect}
            />
          </div>
        )}
      </main>

      {/* Architectural Footer */}
      <footer className="mt-8 border-t border-[#dcdcd5] bg-[#f5f5f1] py-10 text-xs font-mono text-[#66665f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 FitLens - IOMETE Account Fit Analyzer. Multi-Model Gemini Architecture & Sovereign Lakehouse Rubric.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setIsCapabilitiesOpen(true)}
              className="hover:text-[#121212] underline underline-offset-4 cursor-pointer"
            >
              Capability KB (28)
            </button>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="hover:text-[#121212] underline underline-offset-4 cursor-pointer"
            >
              Download .md Template
            </button>
            <a href="#top" className="hover:text-[#121212] underline underline-offset-4">
              Back to top
            </a>
          </div>
        </div>
      </footer>

      <CapabilitiesModal
        isOpen={isCapabilitiesOpen}
        onClose={() => setIsCapabilitiesOpen(false)}
      />

      <PrintableReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        analysis={analysis}
        prospectRecord={activeProspectRecord}
        onDownloadMarkdown={handleExportMarkdown}
      />
    </div>
  );
}

export default App;
