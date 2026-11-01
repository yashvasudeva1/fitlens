/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { FitDimensionId } from './data/iometeCapabilities';
import {
  BLANK_MD_TEMPLATE,
  SAMPLE_COMPANIES,
  SampleCompanyAnalysis
} from './data/newSampleCompanies';
import {
  DEFAULT_WEIGHTS,
  DimensionWeights,
  EMPTY_COMPANY_ANALYSIS,
  checkInputQuality,
  computeFitScore,
  parseCustomMarkdownToAnalysis,
  validateReportClaims
} from './utils/scoringEngine';
import { HeroWorkspaceFrame } from './components/HeroWorkspaceFrame';
import { ArchitectureDarkSection } from './components/ArchitectureDarkSection';
import { StandingWatchDimensionsSection } from './components/StandingWatchDimensionsSection';
import { AudienceAndBenchmarksSection } from './components/AudienceAndBenchmarksSection';
import { ExportAndReportModal } from './components/ExportAndReportModal';
import { PersonaRestrictedModal } from './components/PersonaRestrictedModal';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  Play,
  ShieldCheck,
  User,
  Sparkles,
  Plus,
  RotateCcw,
  Upload
} from 'lucide-react';

export type UserPersona = 'iomete_rep' | 'general_user';

export default function App() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [customCompany, setCustomCompany] = useState<SampleCompanyAnalysis | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState<string>('');
  const [isAnalyzingCustom, setIsAnalyzingCustom] = useState<boolean>(false);

  // Two Personas: IOMETE Rep vs General User
  const [persona, setPersona] = useState<UserPersona>('iomete_rep');
  const [isRestrictedModalOpen, setIsRestrictedModalOpen] = useState(false);
  const [restrictedActionName, setRestrictedActionName] = useState('Exporting company dossiers');

  const [weights, setWeights] = useState<DimensionWeights>({ ...DEFAULT_WEIGHTS });
  const [audience, setAudience] = useState<'rep' | 'buyer'>('rep');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const activeCompany: SampleCompanyAnalysis = useMemo(() => {
    if (selectedSampleId === 'custom-account' && customCompany) {
      return customCompany;
    }
    if (selectedSampleId) {
      const found = SAMPLE_COMPANIES.find((c) => c.id === selectedSampleId);
      if (found) return found;
    }
    return customCompany || EMPTY_COMPANY_ANALYSIS;
  }, [selectedSampleId, customCompany]);

  const handleClearWorkspace = () => {
    setSelectedSampleId('');
    setCustomCompany(null);
    setCustomMarkdown('');
  };

  const scoreResult = useMemo(
    () =>
      computeFitScore(
        activeCompany.evidenceItems,
        weights,
        activeCompany.disqualifiers,
        activeCompany.unknowns
      ),
    [activeCompany, weights]
  );

  const validationResult = useMemo(
    () => validateReportClaims(activeCompany, scoreResult.overallScore, weights),
    [activeCompany, scoreResult.overallScore, weights]
  );

  const inputQuality = useMemo(
    () => checkInputQuality(activeCompany.rawMarkdown),
    [activeCompany.rawMarkdown]
  );

  const matchedCapabilityIds = useMemo(
    () => Array.from(new Set(activeCompany.evidenceItems.map((e) => e.capabilityId))),
    [activeCompany]
  );

  const handleSelectSample = (id: string) => {
    setSelectedSampleId(id);
    const found = SAMPLE_COMPANIES.find((c) => c.id === id);
    if (found) {
      setCustomMarkdown(found.rawMarkdown);
    }
  };

  const handleUpdateWeight = (dimId: FitDimensionId, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [dimId]: value
    }));
  };

  const handleResetWeights = () => {
    setWeights({ ...DEFAULT_WEIGHTS });
  };

  const handleRunCustomAnalysis = (md: string, fileName?: string) => {
    setIsAnalyzingCustom(true);
    const parsed = parseCustomMarkdownToAnalysis(md, fileName);
    setCustomCompany(parsed);
    setSelectedSampleId('custom-account');
    setIsAnalyzingCustom(false);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleRestrictedAction = (actionName: string) => {
    setRestrictedActionName(actionName);
    setIsRestrictedModalOpen(true);
  };

  const handleExportButtonClick = () => {
    if (persona === 'general_user') {
      handleRestrictedAction('Exporting full unredacted company dossiers');
      return;
    }
    setIsExportModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0] text-[#1A1612]">
      {/* Top Bar with Brand Wordmark, Nav, Persona Switcher & Export */}
      <header className="sticky top-0 z-40 bg-[#F5F4F0]/90 backdrop-blur-md border-b border-[#E3E3DE] no-print">
        <div className="max-w-[1320px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3">
            <a
              href="#main"
              className="text-lg font-semibold tracking-tight text-[#1A1612] whitespace-nowrap shrink-0"
            >
              FitLens
            </a>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono-tabular bg-[#EFEFE9] text-[#6B665F]">
              IOMETE Lakehouse
            </span>
          </div>

          {/* Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#6B665F]"
          >
            <a
              href="#workspace"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Workspace
            </a>
            <a
              href="#architecture"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Architecture
            </a>
            <a
              href="#rubric"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Rubric
            </a>
            <a
              href="#benchmarks"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap"
            >
              Benchmarks
            </a>
          </nav>

          {/* Zone 3: Persona Switcher & Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Interactive Persona Switcher */}
            <div
              role="group"
              aria-label="Demo Persona Switcher"
              className="flex items-center bg-[#FAF9F6] border border-[#E3E3DE] rounded-full p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => setPersona('iomete_rep')}
                className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  persona === 'iomete_rep'
                    ? 'bg-[#1A1612] text-[#F5F4F0] shadow-xs'
                    : 'text-[#6B665F] hover:text-[#1A1612]'
                }`}
                title="IOMETE Solutions Architect / Sales Rep: Full Unredacted Export Rights"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#8CE0A1]" />
                <span className="hidden sm:inline">IOMETE Rep</span>
                <span className="sm:hidden">Rep</span>
              </button>
              <button
                type="button"
                onClick={() => setPersona('general_user')}
                className={`px-3 py-1 rounded-full font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  persona === 'general_user'
                    ? 'bg-[#1A1612] text-[#F5F4F0] shadow-xs'
                    : 'text-[#6B665F] hover:text-[#1A1612]'
                }`}
                title="General User / Demo Guest: View Only / Restricted Export"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">General User</span>
                <span className="sm:hidden">Guest</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportButtonClick}
              className="px-5 py-2 text-xs font-medium bg-[#1A1612] text-[#F5F4F0] rounded-full hover:bg-[#332E28] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero Section */}
        <section
          id="workspace"
          aria-labelledby="hero-heading"
          className="pt-12 pb-16 lg:pt-16 lg:pb-24 bg-[#F3F3EE] border-b border-[#E3E3DE]"
        >
          <div className="max-w-[1320px] mx-auto px-6">
            {/* Editorial Headline & Value Prop */}
            <div className="max-w-3xl">
              <div className="text-xs font-mono-tabular text-[#6B665F] mb-3">
                IOMETE Fit Analyzer - Multi-Model Gemini Engine &amp; Sovereign Lakehouse Rubric
              </div>
              <h1
                id="hero-heading"
                className="font-serif-display text-4xl sm:text-6xl lg:text-[72px] font-normal tracking-tight text-[#262624] leading-[1.04]"
                style={{ textWrap: 'balance' }}
              >
                Complex tech, mapped to real accounts.
              </h1>
              <p className="text-base sm:text-lg text-[#524E48] mt-5 max-w-2xl leading-relaxed">
                FitLens removes the friction between what a prospect does and where the IOMETE sovereign data lakehouse fits. Every claim links to documented capabilities on docs.iomete.com, pure code computes the score, and hard disqualifiers know when to say no.
              </p>
            </div>

            {/* Dynamic Prospect Workspace Status and Action Bar */}
            <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {activeCompany.id === 'empty-account' ? (
                  <>
                    <div className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#EFEFE9] text-[#6B665F] border border-[#E3E3DE] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8C867E]" />
                      <span>Workspace Empty · Ready for Prospect Data</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleRunCustomAnalysis(BLANK_MD_TEMPLATE, 'New Prospect Dossier');
                        setCustomMarkdown(BLANK_MD_TEMPLATE);
                      }}
                      className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1A1612] text-[#F5F4F0] hover:bg-[#332E28] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Load 7-Section Blank Schema</span>
                    </button>

                    <label className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#524E48] border border-[#E3E3DE] hover:border-[#8C867E] hover:text-[#1A1612] transition-all flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload .md File</span>
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
                                setCustomMarkdown(content);
                                handleRunCustomAnalysis(content, file.name.replace(/\.[^/.]+$/, ''));
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>

                    <div className="relative inline-block">
                      <select
                        value={selectedSampleId}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectSample(e.target.value);
                          }
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#6B665F] border border-[#E3E3DE] hover:border-[#8C867E] transition-all cursor-pointer outline-none"
                        aria-label="Load benchmark evaluation profile"
                      >
                        <option value="">Load Benchmark Test Case...</option>
                        {SAMPLE_COMPANIES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.expectedVerdict})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#1A1612] text-[#F5F4F0] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8CE0A1]" />
                      <span className="font-semibold">{activeCompany.name}</span>
                      <span className="opacity-70">({activeCompany.deploymentBadge})</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearWorkspace}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#D9733A] border border-[#E3E3DE] hover:border-[#D9733A] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear Workspace</span>
                    </button>

                    <div className="relative inline-block">
                      <select
                        value={selectedSampleId}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectSample(e.target.value);
                          } else {
                            handleClearWorkspace();
                          }
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FAF9F6] text-[#6B665F] border border-[#E3E3DE] hover:border-[#8C867E] transition-all cursor-pointer outline-none"
                        aria-label="Switch account profile"
                      >
                        <option value="custom-account">Active Custom Prospect</option>
                        {SAMPLE_COMPANIES.map((s) => (
                          <option key={s.id} value={s.id}>
                            Benchmark: {s.name} ({s.expectedVerdict})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="text-xs font-mono-tabular text-[#6B665F]">
                {activeCompany.id === 'empty-account' ? (
                  <span>Status: <strong className="text-[#1A1612]">Awaiting Prospect Input</strong></span>
                ) : (
                  <span>
                    Verdict: <strong className="text-[#1A1612]">{scoreResult.verdictBand}</strong> ({scoreResult.overallScore}/100) · Confidence: <strong className="text-[#1A1612]">{scoreResult.confidenceLevel}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Full-Width Interactive Workspace Frame */}
            <HeroWorkspaceFrame
              company={activeCompany}
              scoreResult={scoreResult}
              validationResult={validationResult}
              inputQuality={inputQuality}
              weights={weights}
              onUpdateWeight={handleUpdateWeight}
              onResetWeights={handleResetWeights}
              audience={audience}
              onChangeAudience={setAudience}
              customMarkdown={customMarkdown}
              onChangeCustomMarkdown={setCustomMarkdown}
              onRunCustomAnalysis={handleRunCustomAnalysis}
              isAnalyzingCustom={isAnalyzingCustom}
              onOpenExportModal={handleExportButtonClick}
              persona={persona}
              onRestrictedAction={handleRestrictedAction}
            />
          </div>
        </section>

        {/* Section 01: Dark Obsidian Architecture & 26-Capability Knowledge Base */}
        <ArchitectureDarkSection
          companyName={activeCompany.name}
          scoreResult={scoreResult}
          validationResult={validationResult}
          matchedCapabilityIds={matchedCapabilityIds}
        />

        {/* Section 02: Standing Watch - 7-Dimension Vertical Tab Inspector */}
        <StandingWatchDimensionsSection
          company={activeCompany}
          scoreResult={scoreResult}
          weights={weights}
          onUpdateWeight={handleUpdateWeight}
        />

        {/* Section 03 & 04: Two Audiences Studio + 3 Judge Benchmarks & Competitive Matrix */}
        <AudienceAndBenchmarksSection
          company={activeCompany}
          scoreResult={scoreResult}
          audience={audience}
          onChangeAudience={setAudience}
          onSelectBenchmarkCompany={handleSelectSample}
          onOpenExportModal={handleExportButtonClick}
          onCopyText={handleCopyText}
          copiedLabel={copiedLabel}
        />

        {/* Closing Dark Obsidian Section: 2-Minute Judge Demo Script & PRD Reference */}
        <section
          aria-labelledby="demo-script-heading"
          className="bg-[#1C1916] text-[#F3F1EC] py-20 lg:py-24 border-t border-dashed border-white/10"
        >
          <div className="max-w-[1320px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pb-16 border-b border-white/10">
              <div className="lg:col-span-5">
                <div className="text-xs font-mono-tabular text-[#A8A49C] mb-3">
                  PRD Section 13 · Two-Minute Judge Walkthrough
                </div>
                <h2
                  id="demo-script-heading"
                  className="font-serif-display text-3xl sm:text-5xl font-normal tracking-tight text-[#F3F1EC] leading-[1.08]"
                  style={{ textWrap: 'balance' }}
                >
                  Give account qualification a steady hand.
                </h2>
                <p className="text-sm text-[#A8A49C] mt-4 leading-relaxed">
                  Click any step in the 2-minute demo script on the right to jump the live workspace directly to that state or open the printable single-column report.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportButtonClick}
                    className="px-5 py-2.5 rounded-full bg-[#F3F1EC] text-[#1C1916] text-xs font-semibold hover:bg-white transition-colors cursor-pointer"
                  >
                    Open Printable Report (.md / PDF)
                  </button>
                  <a
                    href="https://docs.iomete.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full border border-white/20 text-xs font-medium text-[#F3F1EC] hover:bg-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View IOMETE Documentation</span>
                  </a>
                </div>
              </div>

              {/* 6 Interactive Platform Capability Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#8CE0A1]">
                    <span>Real-time</span>
                    <span>AI Discovery</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    1. Live Gemini AI Research
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Grounds tech stacks and data volumes directly via real-time Google Search.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('rubric')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#5B7C99]">
                    <span>Temp 0.0</span>
                    <span>Pure Code</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    2. Deterministic 7-Dimension Rubric
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Auditable weights across Sovereignty, Scale, Open Formats, and Governance.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#8CE0A1]">
                    <span>28 Verified Docs</span>
                    <span>Knowledge Base</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    3. Evidence-to-Capability Graph
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Every prospect claim links to verified documentation on docs.iomete.com.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    document.getElementById('rubric')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#D6D3CD]">
                    <span>Interactive</span>
                    <span>Transparent Math</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    4. What-If Rubric Sliders
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Pure code computes scores live with dynamic weighting adjustments.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAudience(audience === 'rep' ? 'buyer' : 'rep');
                    document.getElementById('audience-studio')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#D6D3CD]">
                    <span>Dual Lens</span>
                    <span>Persona Studio</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    5. Rep Call &amp; Buyer Memo
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Translates technical fit into 15-min call track and CFO justification memo.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleExportButtonClick}
                  className="p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/25 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between font-mono-tabular text-xs text-[#8CE0A1]">
                    <span>Audit Ready</span>
                    <span>PDF &amp; Markdown</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-2">
                    6. Export Report (.md / PDF)
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1 leading-snug">
                    Printable single-column brief with verified citation trails.
                  </p>
                </button>
              </div>
            </div>

            {/* Bottom Footer Credits */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono-tabular text-[#8C867E]">
              <div>
                FitLens - IOMETE Account Fit Analyzer. Multi-Model Gemini Engine &amp; TigerData Cloud Storage.
              </div>
              <div className="flex items-center gap-4">
                <span>Deployed on Vultr Cloud Compute</span>
                <span>·</span>
                <a
                  href="https://github.com/yashvasudeva1/fitlens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white underline underline-offset-4"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Export Report Modal */}
      <ExportAndReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        company={activeCompany}
        scoreResult={scoreResult}
        validationResult={validationResult}
        weights={weights}
        audience={audience}
        onChangeAudience={setAudience}
        onCopyText={handleCopyText}
        copiedLabel={copiedLabel}
        persona={persona}
        onSwitchToIomete={() => setPersona('iomete_rep')}
      />

      {/* Persona Restricted Action Modal */}
      <PersonaRestrictedModal
        isOpen={isRestrictedModalOpen}
        onClose={() => setIsRestrictedModalOpen(false)}
        onSwitchToIomete={() => setPersona('iomete_rep')}
        actionAttempted={restrictedActionName}
      />
    </div>
  );
}
