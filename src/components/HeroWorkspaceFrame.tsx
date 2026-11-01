import React, { useState } from 'react';
import { CAPABILITY_MAP, FitDimensionId } from '../data/iometeCapabilities';
import { BLANK_MD_TEMPLATE, SampleCompanyAnalysis } from '../data/newSampleCompanies';
import {
  DEFAULT_WEIGHTS,
  DimensionWeights,
  FitScoreResult,
  InputQualityCheckResult,
  ValidationCheckResult
} from '../utils/scoringEngine';
import {
  FitScoreArcGauge,
  SevenDimensionRadarChart,
  WorkflowCapabilityFlowGraph
} from './RadarAndGaugeVisuals';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  FileText,
  HelpCircle,
  Layers,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Upload,
  Search,
  Volume2,
  Play,
  Pause,
  Network,
  Database
} from 'lucide-react';
import { TigerGraphDatabaseSection } from './TigerGraphDatabaseSection';

export type WorkspaceTabId =
  | 'overview'
  | 'rubric'
  | 'workflows'
  | 'unknowns'
  | 'objections'
  | 'input'
  | 'database';

interface HeroWorkspaceFrameProps {
  company: SampleCompanyAnalysis;
  scoreResult: FitScoreResult;
  validationResult: ValidationCheckResult;
  inputQuality: InputQualityCheckResult;
  weights: DimensionWeights;
  onUpdateWeight: (dimId: FitDimensionId, value: number) => void;
  onResetWeights: () => void;
  audience: 'rep' | 'buyer';
  onChangeAudience: (aud: 'rep' | 'buyer') => void;
  customMarkdown: string;
  onChangeCustomMarkdown: (md: string) => void;
  onRunCustomAnalysis: (md: string, fileName?: string) => void;
  isAnalyzingCustom: boolean;
  onOpenExportModal: () => void;
  persona: 'iomete_rep' | 'general_user';
  onRestrictedAction: (actionName: string) => void;
}

export const HeroWorkspaceFrame: React.FC<HeroWorkspaceFrameProps> = ({
  company,
  scoreResult,
  validationResult,
  inputQuality,
  weights,
  onUpdateWeight,
  onResetWeights,
  audience,
  onChangeAudience,
  customMarkdown,
  onChangeCustomMarkdown,
  onRunCustomAnalysis,
  isAnalyzingCustom,
  onOpenExportModal,
  persona,
  onRestrictedAction
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTabId>('overview');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(
    company.evidenceItems[0]?.id || ''
  );

  // Live Multi-Model Gemini Research state
  const [researchQuery, setResearchQuery] = useState('');
  const [researchContext, setResearchContext] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [groundedSources, setGroundedSources] = useState<Array<{ title: string; url: string }>>([]);

  // Live gemini-3.8-flash-lite-tts Audio Pitch Briefing state
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Keep selectedEvidenceId synced if company changes
  const effectiveEvidenceId = company.evidenceItems.some((e) => e.id === selectedEvidenceId)
    ? selectedEvidenceId
    : company.evidenceItems[0]?.id || '';

  const executeGeminiResearch = async (query: string, context?: string) => {
    setIsResearching(true);
    try {
      const res = await fetch('/api/gemini/research-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyQuery: query, industryHint: context })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.markdownContent) {
          onChangeCustomMarkdown(data.markdownContent);
          onRunCustomAnalysis(data.markdownContent, query);
          if (Array.isArray(data.groundedSources)) {
            setGroundedSources(data.groundedSources);
          }
          setAudioDataUrl(null);
          setActiveTab('overview');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Gemini research failed. Please verify API key.');
      }
    } catch (err: any) {
      alert(err?.message || 'Network error reaching Gemini research API.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchQuery.trim()) return;
    await executeGeminiResearch(researchQuery.trim(), researchContext.trim() || undefined);
  };

  const handleGenerateOrPlayAudio = async () => {
    if (audioDataUrl) {
      setIsPlayingAudio(true);
      return;
    }
    setIsGeneratingAudio(true);
    try {
      const briefText = `${company.name}. Fit verdict is ${scoreResult.verdictBand}, scored ${scoreResult.overallScore} out of 100 with ${scoreResult.confidenceLevel} confidence. Key reason: ${scoreResult.oneSentenceReason}. Key open question: ${company.unknowns[0]?.discoveryQuestion || 'Clarify Kubernetes readiness and daily ingestion volume.'}`;
      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToSpeak: briefText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioDataUrl) {
          setAudioDataUrl(data.audioDataUrl);
          setIsPlayingAudio(true);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'TTS audio synthesis failed');
      }
    } catch (err: any) {
      alert(err?.message || 'Error generating audio briefing');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      onChangeCustomMarkdown(content);
      onRunCustomAnalysis(content, file.name);
      setActiveTab('overview');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([BLANK_MD_TEMPLATE], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iomete_prospect_profile_template.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const weightsModified = Object.keys(DEFAULT_WEIGHTS).some(
    (k) => weights[k as FitDimensionId] !== DEFAULT_WEIGHTS[k as FitDimensionId]
  );

  return (
    <div
      className="w-full bg-[#FAF9F6] border border-[#E3E3DE] rounded-2xl overflow-hidden"
      data-testid="fitlens-workspace"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        {/* Left Forge-style Workspace Sidebar */}
        <aside className="lg:col-span-3 xl:col-span-2 bg-[#F3F3EE] border-b lg:border-b-0 lg:border-r border-[#E3E3DE] p-4 flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-5">
            {/* Active Account Identity */}
            <div className="pb-3.5 border-b border-[#E3E3DE]">
              <div className="text-sm font-semibold text-[#1A1612] truncate" title={company.name}>
                {company.name}
              </div>
              <div className="font-mono-tabular text-[11px] text-[#6B665F] mt-0.5 truncate">
                {company.deploymentBadge}
              </div>
            </div>

            {/* Workspace Navigation */}
            <nav aria-label="Workspace sections" className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>Overview &amp; Graph</span>
                <span className="font-mono-tabular text-[10px] opacity-80">Live</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rubric')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'rubric'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>What-If Rubric</span>
                <span className="font-mono-tabular text-[11px]">7</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('workflows')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'workflows'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>Workflow Heat Map</span>
                <span className="font-mono-tabular text-[11px]">{company.evidenceItems.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unknowns')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'unknowns'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>Unknowns &amp; Gaps</span>
                <span className="font-mono-tabular text-[11px]">{company.unknowns.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('objections')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'objections'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>Risks &amp; Disqualifiers</span>
                <span className="font-mono-tabular text-[11px]">
                  {company.disqualifiers.length + company.objections.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('input')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'input'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>Input .md &amp; Check</span>
                <span className="font-mono-tabular text-[11px]">{inputQuality.coverageScore}%</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'database'
                    ? 'bg-[#1A1612] text-[#F5F4F0]'
                    : 'text-[#524E48] hover:bg-[#E8E7E0] hover:text-[#1A1612]'
                }`}
              >
                <span>TigerGraph &amp; DB</span>
                <span className="font-mono-tabular text-[10px] text-[#5A9A6B]">Cloud</span>
              </button>
            </nav>

            {/* Input Quality Graphic Meter in Sidebar (PRD 4.2 P0) */}
            <div className="pt-4 border-t border-[#E3E3DE]">
              <div className="flex items-center justify-between text-[11px] text-[#6B665F] mb-1.5">
                <span>Input Quality Check</span>
                <span className="font-mono-tabular font-medium text-[#1A1612]">
                  {inputQuality.coverageScore}%
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 h-2">
                <div
                  title="Workflows detected"
                  className={`rounded-xs ${
                    inputQuality.workflowCount > 0 ? 'bg-[#5A9A6B]' : 'bg-[#D9733A]/40'
                  }`}
                />
                <div
                  title="Data sources detected"
                  className={`rounded-xs ${
                    inputQuality.dataSourceCount > 0 ? 'bg-[#5A9A6B]' : 'bg-[#D9733A]/40'
                  }`}
                />
                <div
                  title="Data volume / scale mentioned"
                  className={`rounded-xs ${
                    inputQuality.hasScaleMention ? 'bg-[#5A9A6B]' : 'bg-[#D9733A]/40'
                  }`}
                />
                <div
                  title="Compliance / sovereignty mentioned"
                  className={`rounded-xs ${
                    inputQuality.hasComplianceMention ? 'bg-[#5A9A6B]' : 'bg-[#D9733A]/40'
                  }`}
                />
                <div
                  title="Team readiness mentioned"
                  className={`rounded-xs ${
                    inputQuality.hasTeamMention ? 'bg-[#5A9A6B]' : 'bg-[#D9733A]/40'
                  }`}
                />
              </div>
              <p className="text-[11px] text-[#6B665F] mt-2 leading-snug">
                {inputQuality.summaryBanner}
              </p>
            </div>
          </div>

          {/* Active Persona Footer */}
          <div className="pt-3 border-t border-[#E3E3DE] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#1A1612] text-[#F5F4F0] font-mono-tabular text-[11px] flex items-center justify-center shrink-0">
              {audience === 'rep' ? 'SR' : 'BM'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#1A1612] truncate">
                {audience === 'rep' ? 'Sales Rep Mode' : 'Buyer Memo Mode'}
              </div>
              <div className="text-[10px] text-[#6B665F] truncate">
                Temp 0.0 · Deterministic
              </div>
            </div>
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <div className="lg:col-span-9 xl:col-span-10 flex flex-col">
          {/* Workspace Header Bar */}
          <div className="px-5 py-3.5 border-b border-[#E3E3DE] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#6B665F]">
              <span>Qualification</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-[#1A1612]">{company.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[11px] text-[#5A9A6B]">
                Validator: {validationResult.citationCoveragePercent}% Sourced
              </span>
            </div>

            {/* Audience Mode Switcher & Export Action */}
            <div className="flex items-center gap-2.5">
              <div
                role="group"
                aria-label="Select report audience"
                className="flex items-center p-0.5 bg-[#EFEFE9] border border-[#E3E3DE] rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => onChangeAudience('rep')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    audience === 'rep'
                      ? 'bg-[#1A1612] text-white'
                      : 'text-[#524E48] hover:text-[#1A1612]'
                  }`}
                >
                  Sales Rep Brief
                </button>
                <button
                  type="button"
                  onClick={() => onChangeAudience('buyer')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    audience === 'buyer'
                      ? 'bg-[#1A1612] text-white'
                      : 'text-[#524E48] hover:text-[#1A1612]'
                  }`}
                >
                  Buyer Internal Memo
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenExportModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-[#1A1612] text-[#F5F4F0] rounded-full hover:bg-[#332E28] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report (.md / PDF)</span>
              </button>
            </div>
          </div>

          {/* Disqualifier Alert Banner (When Negative Control or Disqualifier triggers) */}
          {scoreResult.isCappedByDisqualifier && (
            <div
              role="alert"
              className="mx-5 mt-4 p-3.5 rounded-xl bg-[#D9733A]/12 border border-[#D9733A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#D9733A] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[#1A1612]">
                    Hard Disqualifier Cap Active - Verdict Capped at “{scoreResult.verdictBand}” ({scoreResult.overallScore}/100)
                  </div>
                  <p className="text-xs text-[#524E48] mt-0.5">
                    {scoreResult.activeDisqualifiers.map((d) => d.title).join(' · ')}. FitLens says NO when lakehouse prerequisites are absent.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('objections')}
                className="px-3 py-1.5 text-xs font-medium bg-[#1A1612] text-white rounded-lg whitespace-nowrap shrink-0 self-start sm:self-center"
              >
                Inspect Disqualifiers
              </button>
            </div>
          )}

          {/* 4 Live Graphic KPI Cards (Replicating Forge's 4 live workspace numbers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border-b border-[#E3E3DE]">
            {/* Card 1: Radial Fit Verdict Gauge */}
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-[#E3E3DE]">
              <FitScoreArcGauge
                score={scoreResult.overallScore}
                rawUncappedScore={scoreResult.rawUncappedScore}
                verdictBand={scoreResult.verdictBand}
                confidenceScore={scoreResult.confidenceScore}
                confidenceLevel={scoreResult.confidenceLevel}
                isCapped={scoreResult.isCappedByDisqualifier}
              />
            </div>

            {/* Card 2: Source Citation Coverage */}
            <div className="p-4 border-b xl:border-b-0 xl:border-r border-[#E3E3DE] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B665F]">
                <span>Citation Coverage</span>
                <span className="font-mono-tabular text-[11px] text-[#5A9A6B]">Verified KB</span>
              </div>
              <div className="my-2">
                <div className="font-mono-tabular text-3xl font-semibold text-[#1A1612]">
                  {validationResult.citationCoveragePercent}%
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-2 flex-1 rounded-xs bg-[#5A9A6B]"
                    />
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-[#6B665F]">
                {validationResult.sourcedClaimsWithValidLink}/{validationResult.totalClaimsChecked} claims linked to docs.iomete.com
              </div>
            </div>

            {/* Card 3: 7-Dimension Evidence Coverage Bar Chart */}
            <div className="p-4 border-b sm:border-b-0 sm:border-r border-[#E3E3DE] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B665F]">
                <span>Dimensions Evidenced</span>
                <span className="font-mono-tabular text-[11px]">
                  {scoreResult.unknownDimensionCount} Unknowns
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 my-2">
                <div className="font-mono-tabular text-3xl font-semibold text-[#1A1612]">
                  {scoreResult.knownDimensionCount}
                  <span className="text-lg text-[#8C867E]">/7</span>
                </div>
                {/* Mini 7-dimension bar sparkline */}
                <div className="flex items-end gap-1.5 h-10 pb-0.5">
                  {scoreResult.dimensionScores.map((d) => {
                    const isUnk = d.status === 'unknown';
                    const h = isUnk ? 25 : Math.max(20, d.score ?? 20);
                    const color = isUnk
                      ? 'bg-[#D9733A]/40 border border-dashed border-[#D9733A]'
                      : (d.score ?? 0) >= 75
                      ? 'bg-[#5A9A6B]'
                      : (d.score ?? 0) >= 50
                      ? 'bg-[#5B7C99]'
                      : 'bg-[#D9733A]';
                    return (
                      <div
                        key={d.dimensionId}
                        title={`${d.shortName}: ${isUnk ? 'Unknown (Excluded)' : `${d.score}/100`}`}
                        style={{ height: `${(h / 100) * 38}px` }}
                        className={`w-2.5 rounded-t-xs ${color}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="text-[11px] text-[#6B665F]">
                Unknowns excluded from average (never neutral 50)
              </div>
            </div>

            {/* Card 4: Disqualifiers & Discovery Readiness */}
            <div className="p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#6B665F]">
                <span>Disqualifier &amp; Risk Gate</span>
                <span className="font-mono-tabular text-[11px]">
                  {company.disqualifiers.length === 0 ? 'Pass' : 'Triggered'}
                </span>
              </div>
              <div className="my-2">
                <div
                  className={`font-mono-tabular text-3xl font-semibold ${
                    company.disqualifiers.length > 0 ? 'text-[#D9733A]' : 'text-[#1A1612]'
                  }`}
                >
                  {company.disqualifiers.length === 0
                    ? '0 Flags'
                    : `${company.disqualifiers.length} Caps`}
                </div>
                <div className="text-xs font-medium text-[#1A1612] mt-1 truncate">
                  {company.disqualifiers.length === 0
                    ? `${company.topUseCases.length} ranked use cases ready`
                    : company.disqualifiers[0].title}
                </div>
              </div>
              <div className="text-[11px] text-[#6B665F]">
                {company.unknowns.length} discovery question{company.unknowns.length === 1 ? '' : 's'} queued for call
              </div>
            </div>
          </div>

          {/* Main Interactive Tab Body */}
          <div className="p-5 flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stage 0: Live Multi-Model Gemini Research Command Bar */}
                <div className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2E6B40]" />
                      <span className="text-xs font-semibold text-[#1A1612]">
                        Live Gemini Research (gemini-3.8-flash Search Grounding + gemini-3.1-flash-lite Structurer)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-tabular text-[#6B665F]">
                      Auto-drafts 7-section brief &amp; live evidence
                    </span>
                  </div>

                  <form onSubmit={handleResearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-2">
                    <div className="md:col-span-6 relative">
                      <Search className="w-3.5 h-3.5 text-[#6B665F] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={researchQuery}
                        onChange={(e) => setResearchQuery(e.target.value)}
                        placeholder="Enter any enterprise name or domain (e.g. Deutsche Bank, Zalando, Snowflake, Stripe)..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#E3E3DE] rounded-lg focus:border-[#1A1612] outline-none text-[#1A1612]"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <input
                        type="text"
                        value={researchContext}
                        onChange={(e) => setResearchContext(e.target.value)}
                        placeholder="Context (e.g. Banking, Retail)..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#E3E3DE] rounded-lg focus:border-[#1A1612] outline-none text-[#1A1612]"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        disabled={isResearching || !researchQuery.trim()}
                        className="w-full py-2 px-3 text-xs font-medium bg-[#1A1612] text-[#F5F4F0] rounded-lg hover:bg-[#332E28] transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isResearching ? 'Searching via Gemini...' : 'Research & Qualify'}</span>
                      </button>
                    </div>
                  </form>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-[#6B665F] text-[11px]">Quick Research Presets:</span>
                    {[
                      { name: 'Deutsche Bank', hint: 'European Sovereign Banking' },
                      { name: 'Zalando SE', hint: 'European E-Commerce' },
                      { name: 'Snowflake Enterprise', hint: 'Warehouse Migration' }
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={isResearching}
                        onClick={() => {
                          setResearchQuery(preset.name);
                          setResearchContext(preset.hint);
                          executeGeminiResearch(preset.name, preset.hint);
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[11px] bg-white border border-[#E3E3DE] hover:border-[#1A1612] text-[#1A1612] transition-colors cursor-pointer"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>

                  {groundedSources.length > 0 && (
                    <div className="pt-2 border-t border-[#E3E3DE] flex flex-wrap items-center gap-3 text-[11px] font-mono-tabular">
                      <span className="text-[#2E6B40] font-medium">Search Grounding Sources:</span>
                      {groundedSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#6B665F] hover:text-[#1A1612] hover:underline"
                        >
                          <span>{src.title.slice(0, 32)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {company.evidenceItems.length === 0 ? (
                  /* Onboarding & Quick-Start Hub when no prospect is loaded */
                  <div className="p-8 rounded-2xl bg-white border border-[#E3E3DE] shadow-xs">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#EFEFE9] text-[#6B665F] mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-[#2E6B40]" />
                        <span>Workspace Ready · Live Gemini Engine Active</span>
                      </div>
                      <h3 className="font-serif-display text-2xl sm:text-3xl font-normal text-[#1A1612]">
                        Qualify Any Enterprise Account in Minutes
                      </h3>
                      <p className="text-sm text-[#524E48] mt-2 leading-relaxed">
                        FitLens analyzes prospect architectures against documented IOMETE capabilities, computes verifiable fit scores via a 7-dimension deterministic rubric, and generates sales rep briefs with zero hallucination.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                      <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E3E3DE] flex flex-col justify-between">
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-[#1A1612] text-white flex items-center justify-center mb-3">
                            <Sparkles className="w-4 h-4 text-[#8CE0A1]" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#1A1612]">1. Live Gemini AI</h4>
                          <p className="text-xs text-[#6B665F] mt-1.5 leading-relaxed">
                            Type any enterprise above to trigger real-time Google Search grounding via gemini-3.8-flash and automatic brief structuring.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#E3E3DE] text-[11px] font-mono-tabular text-[#2E6B40]">
                          Active in search bar above &uarr;
                        </div>
                      </div>

                      <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E3E3DE] flex flex-col justify-between">
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-[#1A1612] text-white flex items-center justify-center mb-3">
                            <FileCode2 className="w-4 h-4 text-[#8CE0A1]" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#1A1612]">2. 7-Section Schema</h4>
                          <p className="text-xs text-[#6B665F] mt-1.5 leading-relaxed">
                            Pre-fills the standard 7-section markdown template in the editor for pasting customer notes and architecture details.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onChangeCustomMarkdown(BLANK_MD_TEMPLATE);
                            onRunCustomAnalysis(BLANK_MD_TEMPLATE, 'New Prospect Dossier');
                            setActiveTab('input');
                          }}
                          className="mt-4 w-full py-2 px-3 rounded-lg bg-[#1A1612] text-white text-xs font-medium hover:bg-[#332E28] transition-colors cursor-pointer"
                        >
                          Load Schema &amp; Edit
                        </button>
                      </div>

                      <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E3E3DE] flex flex-col justify-between">
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-[#1A1612] text-white flex items-center justify-center mb-3">
                            <Upload className="w-4 h-4 text-[#8CE0A1]" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#1A1612]">3. Upload Dossier</h4>
                          <p className="text-xs text-[#6B665F] mt-1.5 leading-relaxed">
                            Import an existing .md file or transcript. FitLens automatically extracts workflows, scale, and compliance constraints.
                          </p>
                        </div>
                        <label className="mt-4 w-full py-2 px-3 rounded-lg border border-[#1A1612] text-[#1A1612] text-xs font-medium hover:bg-[#1A1612] hover:text-white transition-colors text-center cursor-pointer">
                          <span>Choose .md File</span>
                          <input
                            type="file"
                            accept=".md,.txt"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const content = ev.target?.result as string;
                                  if (content) {
                                    onChangeCustomMarkdown(content);
                                    onRunCustomAnalysis(content, file.name.replace(/\.[^/.]+$/, ''));
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E3E3DE] flex flex-col justify-between">
                        <div>
                          <div className="w-8 h-8 rounded-lg bg-[#1A1612] text-white flex items-center justify-center mb-3">
                            <Database className="w-4 h-4 text-[#8CE0A1]" />
                          </div>
                          <h4 className="text-sm font-semibold text-[#1A1612]">4. TigerData Cloud DB</h4>
                          <p className="text-xs text-[#6B665F] mt-1.5 leading-relaxed">
                            Access accounts previously saved to the managed Timescale PostgreSQL cloud database.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('database')}
                          className="mt-4 w-full py-2 px-3 rounded-lg border border-[#E3E3DE] bg-white text-[#1A1612] hover:border-[#1A1612] text-xs font-medium transition-colors cursor-pointer"
                        >
                          Open Database Tab
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stage 3: Executive Audio Briefing with gemini-3.8-flash-lite-tts */}
                    <div className="p-4 rounded-xl bg-[#1C1916] text-[#F3F1EC] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Volume2 className="w-5 h-5 text-[#8CE0A1]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-white">
                              60-Second Audio Pitch Briefing
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-tabular bg-[#5A9A6B]/20 text-[#8CE0A1]">
                              gemini-3.8-flash-lite-tts
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A8A49C] mt-0.5">
                            Architectural advisor voice pitch covering {company.name}&apos;s qualification score and key objections.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {audioDataUrl && (
                          <audio controls src={audioDataUrl} className="h-8 max-w-[200px]" autoPlay={isPlayingAudio} />
                        )}
                        <button
                          type="button"
                          onClick={handleGenerateOrPlayAudio}
                          disabled={isGeneratingAudio}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5A9A6B] text-white hover:bg-[#4B855B] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isGeneratingAudio ? 'Synthesizing Audio...' : audioDataUrl ? 'Replay Briefing' : 'Generate &amp; Listen'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                      {/* Left 7 cols: Graphic Workflow-to-Capability Node Flow First + Compact Visual Provenance Strip */}
                      <div className="xl:col-span-7 flex flex-col gap-5">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <h3 className="text-sm font-semibold text-[#1A1612]">
                                Interactive Evidence Trail: Prospect Workflows &rarr; IOMETE Capabilities
                              </h3>
                              <p className="text-xs text-[#6B665F]">
                                {scoreResult.oneSentenceReason}
                              </p>
                            </div>
                            <span className="font-mono-tabular text-[11px] text-[#6B665F]">
                              Click any node to inspect proof
                            </span>
                          </div>
                          <WorkflowCapabilityFlowGraph
                            evidenceItems={company.evidenceItems}
                            selectedEvidenceId={effectiveEvidenceId}
                            onSelectEvidence={setSelectedEvidenceId}
                          />
                        </div>

                        {/* Graphic 3-Pillar Provenance Breakdown (Stated · Sourced · Assumed) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {company.executiveSummaryPlain.slice(0, 3).map((line, idx) => {
                            const cap = line.capabilityId ? CAPABILITY_MAP[line.capabilityId] : undefined;
                            const badgeColor =
                              line.label === 'Sourced'
                                ? 'text-[#2E6B40] bg-[#5A9A6B]/15'
                                : line.label === 'Assumed'
                                ? 'text-[#5B7C99] bg-[#5B7C99]/15'
                                : 'text-[#1A1612] bg-[#E3E3DE]';
                            return (
                              <div
                                key={idx}
                                className="p-3.5 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between gap-2"
                              >
                                <div>
                                  <span
                                    className={`inline-block font-mono-tabular text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}
                                  >
                                    {line.label}
                                  </span>
                                  <p className="text-xs text-[#3D3934] mt-2 leading-relaxed line-clamp-3">
                                    {line.text}
                                  </p>
                                </div>
                                {cap && (
                                  <a
                                    href={cap.docUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-[#2E6B40] hover:underline pt-2 border-t border-[#E3E3DE]"
                                  >
                                    <span>Doc Ref</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right 5 cols: Radar Heptagon + Live What-If Sliders directly below */}
                      <div className="xl:col-span-5 flex flex-col gap-5 bg-[#FAF9F6] border border-[#E3E3DE] rounded-xl p-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#E3E3DE]">
                            <h3 className="text-sm font-semibold text-[#1A1612]">
                              7-Dimension Lakehouse Fit Radar
                            </h3>
                            <span className="font-mono-tabular text-[11px] text-[#5A9A6B]">
                              Live Topology
                            </span>
                          </div>
                          <div className="py-2 flex items-center justify-center">
                            <SevenDimensionRadarChart
                              dimensionScores={scoreResult.dimensionScores}
                            />
                          </div>
                        </div>

                        {/* Compact Live What-If Sliders right below Radar */}
                        <div className="flex flex-col gap-2.5 pt-2 border-t border-[#E3E3DE]">
                          {scoreResult.dimensionScores.map((dim) => {
                            const isUnk = dim.status === 'unknown';
                            return (
                              <div key={dim.dimensionId} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-[#1A1612] flex items-center gap-1.5">
                                    <span>{dim.name}</span>
                                    {isUnk && (
                                      <span className="font-mono-tabular text-[10px] text-[#D9733A]">
                                        [UNKNOWN GAP]
                                      </span>
                                    )}
                                  </span>
                                  <div className="font-mono-tabular text-[11px] text-[#6B665F] flex items-center gap-2">
                                    <span>Weight: {dim.weight}%</span>
                                    <span>·</span>
                                    <strong className={isUnk ? 'text-[#D9733A]' : 'text-[#1A1612]'}>
                                      {isUnk ? 'Excl' : `${dim.score}/100`}
                                    </strong>
                                  </div>
                                </div>
                                <input
                                  type="range"
                                  min={0}
                                  max={50}
                                  step={5}
                                  aria-label={`${dim.name} weight`}
                                  value={dim.weight}
                                  onChange={(e) =>
                                    onUpdateWeight(dim.dimensionId, Number(e.target.value))
                                  }
                                  className="w-full accent-[#1A1612] h-1.5 bg-[#E3E3DE] rounded-lg cursor-pointer"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'rubric' && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E3E3DE]">
                  <div>
                    <h3 className="text-base font-semibold text-[#1A1612]">
                      Transparent Scoring Rubric &amp; What-If Weight Simulator
                    </h3>
                    <p className="text-xs text-[#6B665F]">
                      LLM extracts evidence; pure code computes the score. Adjust weights below to test sensitivity.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onResetWeights}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#EFEFE9] border border-[#E3E3DE] rounded-lg text-[#1A1612] hover:bg-[#E3E3DE]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Default PRD Weights</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E3DE] text-[11px] text-[#6B665F]">
                        <th className="py-2.5 pr-4 font-medium">Dimension</th>
                        <th className="py-2.5 px-4 font-medium">User Weight Slider</th>
                        <th className="py-2.5 px-4 font-medium text-right">Normalized Active</th>
                        <th className="py-2.5 px-4 font-medium text-right">Evidence Signals</th>
                        <th className="py-2.5 pl-4 font-medium text-right">Dimension Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3DE] text-xs">
                      {scoreResult.dimensionScores.map((dim) => {
                        const isUnk = dim.status === 'unknown';
                        return (
                          <tr key={dim.dimensionId} className="hover:bg-[#F3F3EE]/60">
                            <td className="py-3 pr-4 font-medium text-[#1A1612]">{dim.name}</td>
                            <td className="py-3 px-4 w-64">
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min={0}
                                  max={50}
                                  step={5}
                                  aria-label={`Adjust ${dim.name} weight`}
                                  value={dim.weight}
                                  onChange={(e) =>
                                    onUpdateWeight(dim.dimensionId, Number(e.target.value))
                                  }
                                  className="w-full accent-[#1A1612] cursor-pointer"
                                />
                                <span className="font-mono-tabular w-10 text-right">
                                  {dim.weight}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono-tabular text-[#6B665F]">
                              {isUnk ? '0% (Excluded)' : `${dim.normalizedActiveWeight}%`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono-tabular">
                              {isUnk ? (
                                <span className="text-[#D9733A]">0 items (Gap)</span>
                              ) : (
                                <span>
                                  +{dim.supportingCount} / -{dim.hurtingCount}
                                </span>
                              )}
                            </td>
                            <td className="py-3 pl-4 text-right font-mono-tabular font-semibold">
                              {isUnk ? (
                                <span className="text-[#D9733A]">UNKNOWN</span>
                              ) : (
                                <span className="text-[#1A1612]">{dim.score} / 100</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'workflows' && (
              <div className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#E3E3DE]">
                  <h3 className="text-base font-semibold text-[#1A1612]">
                    Workflow-to-Capability Heat Table
                  </h3>
                  <p className="text-xs text-[#6B665F]">
                    Every claim links back to a quoted line in the prospect `.md` (`[Stated]`) and a documented IOMETE capability (`[Sourced]`).
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3E3DE] text-[11px] text-[#6B665F]">
                        <th className="py-2.5 pr-3 font-medium">Workflow / Constraint</th>
                        <th className="py-2.5 px-3 font-medium">Quoted Input (`[Stated]`)</th>
                        <th className="py-2.5 px-3 font-medium">Matched IOMETE Capability (`[Sourced]`)</th>
                        <th className="py-2.5 px-3 font-medium">Fit Impact</th>
                        <th className="py-2.5 pl-3 font-medium text-right">Documentation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3DE] text-xs">
                      {company.evidenceItems.map((ev) => {
                        const cap = CAPABILITY_MAP[ev.capabilityId];
                        return (
                          <tr key={ev.id} className="hover:bg-[#F3F3EE]/60">
                            <td className="py-3 pr-3 font-medium text-[#1A1612]">
                              <div>{ev.workflowName}</div>
                              <div className="font-mono-tabular text-[10px] text-[#6B665F] capitalize">
                                Dim: {ev.dimensionId} · Conf: {ev.confidence}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#524E48] max-w-xs">
                              “{ev.mdQuote}”
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-medium text-[#1A1612]">
                                {cap?.name || ev.capabilityId}
                              </div>
                              <div className="text-[11px] text-[#6B665F]">
                                {ev.explanation}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono-tabular">
                              <span
                                className={
                                  ev.direction === 'supports'
                                    ? 'text-[#2E6B40] font-semibold'
                                    : 'text-[#D9733A] font-semibold'
                                }
                              >
                                {ev.direction === 'supports' ? 'SUPPORTS' : 'HURTS'} ({ev.strength})
                              </span>
                            </td>
                            <td className="py-3 pl-3 text-right">
                              {cap && (
                                <a
                                  href={cap.docUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1612] hover:underline whitespace-nowrap"
                                >
                                  <span>Doc Link</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'unknowns' && (
              <div className="flex flex-col gap-4">
                <div className="pb-2 border-b border-[#E3E3DE]">
                  <h3 className="text-base font-semibold text-[#1A1612]">
                    First-Class Unknowns &amp; Exact Discovery Questions
                  </h3>
                  <p className="text-xs text-[#6B665F]">
                    Missing information is never hidden or padded with a fake neutral score. Each gap lowers confidence and generates a discovery question.
                  </p>
                </div>
                {company.unknowns.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] text-xs text-[#524E48]">
                    All 7 fit dimensions are evidenced in this prospect profile.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.unknowns.map((u) => (
                      <div
                        key={u.id}
                        className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-[#6B665F] pb-2 border-b border-[#E3E3DE]">
                            <span className="font-mono-tabular uppercase font-semibold text-[#D9733A]">
                              GAP · {u.dimensionId}
                            </span>
                            <span>Ask: {u.whoToAsk}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-[#1A1612] mt-2.5">
                            {u.missingTopic}
                          </h4>
                          <p className="text-xs text-[#6B665F] mt-1">
                            {u.impactOnConfidence}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-[#E3E3DE]">
                          <div className="text-[10px] font-mono-tabular uppercase text-[#6B665F] mb-1">
                            Exact Discovery Question to Ask on Call:
                          </div>
                          <div className="text-xs font-medium text-[#1A1612]">
                            “{u.discoveryQuestion}”
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'objections' && (
              <div className="flex flex-col gap-5">
                {company.disqualifiers.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-[#D9733A]">
                      Active Disqualifier Flags (Caps Overall Verdict at “{scoreResult.verdictBand}”)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {company.disqualifiers.map((d) => (
                        <div
                          key={d.id}
                          className="p-4 rounded-xl bg-[#D9733A]/10 border border-[#D9733A] flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="font-mono-tabular text-[10px] uppercase text-[#9C4221] font-semibold">
                              Disqualifier · Max Score Cap {d.maxScoreCap}/100
                            </div>
                            <h4 className="text-sm font-semibold text-[#1A1612] mt-1">
                              {d.title}
                            </h4>
                            <p className="text-xs text-[#524E48] mt-1 leading-relaxed">
                              {d.reason}
                            </p>
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[#6B665F] pt-2 border-t border-[#D9733A]/30">
                            Quote: “{d.mdQuote}”
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-[#1A1612]">
                    Likely Buyer Objections &amp; Safe, Honest Responses
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.objections.map((obj) => {
                      const cap = CAPABILITY_MAP[obj.capabilityId];
                      return (
                        <div
                          key={obj.id}
                          className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between gap-3"
                        >
                          <div>
                            <div className="text-[11px] font-mono-tabular text-[#6B665F]">
                              {obj.sourceNote}
                            </div>
                            <h4 className="text-sm font-semibold text-[#1A1612] mt-1">
                              “{obj.objection}”
                            </h4>
                            <p className="text-xs text-[#3D3934] mt-2 leading-relaxed">
                              <strong className="text-[#1A1612]">Honest Response:</strong>{' '}
                              {obj.honestResponse}
                            </p>
                          </div>
                          <div className="pt-2.5 border-t border-[#E3E3DE] flex items-center justify-between gap-2 text-xs">
                            <span className="text-[#6B665F] truncate">
                              Ask: <em>{obj.verificationQuestion}</em>
                            </span>
                            {cap && (
                              <a
                                href={cap.docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-[#1A1612] hover:underline whitespace-nowrap shrink-0"
                              >
                                <span>Doc</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'input' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="prospect-markdown-editor"
                      className="text-sm font-semibold text-[#1A1612]"
                    >
                      Prospect Profile Markdown (`.md` Upload or Paste)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#EFEFE9] border border-[#E3E3DE] rounded-md text-[#1A1612] hover:bg-[#E3E3DE]"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Download .md Template</span>
                      </button>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#EFEFE9] border border-[#E3E3DE] rounded-md text-[#1A1612] hover:bg-[#E3E3DE] cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload .md File</span>
                        <input
                          type="file"
                          accept=".md,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <textarea
                    id="prospect-markdown-editor"
                    rows={14}
                    value={customMarkdown}
                    onChange={(e) => onChangeCustomMarkdown(e.target.value)}
                    placeholder="Paste a company profile in Markdown or plain text (Workflows, Data sources, Current stack, Team, Constraints, Pain points)..."
                    className="w-full p-3.5 rounded-xl bg-[#1C1916] text-[#F3F1EC] font-mono-tabular text-xs leading-relaxed border border-[#2E2A25] focus:outline-none"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onChangeCustomMarkdown(BLANK_MD_TEMPLATE)}
                      className="text-xs text-[#6B665F] hover:text-[#1A1612] underline"
                    >
                      Load Blank P0 Template into Editor
                    </button>
                    <button
                      type="button"
                      disabled={isAnalyzingCustom || !customMarkdown.trim()}
                      onClick={() => {
                        onRunCustomAnalysis(customMarkdown);
                        setActiveTab('overview');
                      }}
                      className="px-4 py-2 rounded-full bg-[#1A1612] text-white text-xs font-medium hover:bg-[#332E28] disabled:opacity-50 transition-colors"
                    >
                      {isAnalyzingCustom ? 'Parsing & Scoring...' : 'Evaluate Markdown Profile'}
                    </button>
                  </div>
                </div>

                {/* Right 5 cols: Live Input Quality Check Diagnostics */}
                <div className="lg:col-span-5 p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#E3E3DE]">
                      <span className="text-sm font-semibold text-[#1A1612]">
                        Pre-Score Input Quality Check
                      </span>
                      <span className="font-mono-tabular text-xs font-semibold text-[#1A1612]">
                        {inputQuality.coverageScore}/100 Coverage
                      </span>
                    </div>

                    <p className="text-xs text-[#3D3934] mt-3 leading-relaxed font-medium">
                      {inputQuality.summaryBanner}
                    </p>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1.5 border-b border-[#E3E3DE]">
                        <span className="text-[#6B665F]">Detected Workflows</span>
                        <span className="font-mono-tabular font-semibold text-[#1A1612]">
                          {inputQuality.workflowCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-[#E3E3DE]">
                        <span className="text-[#6B665F]">Detected Data Sources</span>
                        <span className="font-mono-tabular font-semibold text-[#1A1612]">
                          {inputQuality.dataSourceCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-[#E3E3DE]">
                        <span className="text-[#6B665F]">Data Volume / Scale Hints</span>
                        <span className="font-mono-tabular font-semibold">
                          {inputQuality.hasScaleMention ? 'Present' : 'Missing (Lowers Conf)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5 border-b border-[#E3E3DE]">
                        <span className="text-[#6B665F]">Sovereignty / Compliance Hints</span>
                        <span className="font-mono-tabular font-semibold">
                          {inputQuality.hasComplianceMention ? 'Present' : 'Missing (Lowers Conf)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-[#6B665F]">Team &amp; K8s Readiness Hints</span>
                        <span className="font-mono-tabular font-semibold">
                          {inputQuality.hasTeamMention ? 'Present' : 'Missing (Lowers Conf)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {inputQuality.suggestedQuestions.length > 0 && (
                    <div className="p-3 rounded-lg bg-white border border-[#E3E3DE]">
                      <div className="text-[11px] font-semibold text-[#D9733A] mb-1">
                        Questions Generated by Missing Input Coverage:
                      </div>
                      <ul className="space-y-1 text-xs text-[#524E48]">
                        {inputQuality.suggestedQuestions.map((q, i) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <TigerGraphDatabaseSection
                company={company}
                scoreResult={scoreResult}
                onLoadCustomMarkdown={onRunCustomAnalysis}
                persona={persona}
                onRestrictedAction={onRestrictedAction}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
