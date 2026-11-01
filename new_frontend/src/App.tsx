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
} from './data/sampleCompanies';
import {
  DEFAULT_WEIGHTS,
  DimensionWeights,
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
import { ArrowUpRight, CheckCircle2, Download, FileText, Play } from 'lucide-react';

export default function App() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('aegis-bank');
  const [customCompany, setCustomCompany] = useState<SampleCompanyAnalysis | null>(null);
  const [customMarkdown, setCustomMarkdown] = useState<string>(SAMPLE_COMPANIES[0].rawMarkdown);
  const [isAnalyzingCustom, setIsAnalyzingCustom] = useState<boolean>(false);

  const [weights, setWeights] = useState<DimensionWeights>({ ...DEFAULT_WEIGHTS });
  const [audience, setAudience] = useState<'rep' | 'buyer'>('rep');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const activeCompany: SampleCompanyAnalysis = useMemo(() => {
    if (selectedSampleId === 'custom-account' && customCompany) {
      return customCompany;
    }
    return SAMPLE_COMPANIES.find((c) => c.id === selectedSampleId) || SAMPLE_COMPANIES[0];
  }, [selectedSampleId, customCompany]);

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

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F4F0] text-[#1A1612]">
      {/* Top Bar (Strict 3-Zone Contract matching Forge template) */}
      <header className="sticky top-0 z-40 bg-[#F5F4F0]/90 backdrop-blur-md border-b border-[#E3E3DE] no-print">
        <div className="max-w-[1320px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark (Single text element) */}
          <a
            href="#main"
            className="text-lg font-semibold tracking-tight text-[#1A1612] whitespace-nowrap shrink-0"
          >
            FitLens
          </a>

          {/* Zone 2: 4 Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#6B665F]"
          >
            <a
              href="#workspace"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Workspace
            </a>
            <a
              href="#architecture"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#rubric"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Rubric
            </a>
            <a
              href="#benchmarks"
              className="hover:text-[#1A1612] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Benchmarks
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="px-5 py-2 text-xs font-medium bg-[#1A1612] text-[#F5F4F0] rounded-full hover:bg-[#332E28] transition-colors whitespace-nowrap shrink-0"
            >
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Hero Section (Replicating Forge's Light Stone Hero + Giant Interactive Workspace) */}
        <section
          id="workspace"
          aria-labelledby="hero-heading"
          className="pt-12 pb-16 lg:pt-16 lg:pb-24 bg-[#F3F3EE] border-b border-[#E3E3DE]"
        >
          <div className="max-w-[1320px] mx-auto px-6">
            {/* Editorial Headline & Value Prop */}
            <div className="max-w-3xl">
              <div className="text-xs font-mono-tabular text-[#6B665F] mb-3">
                IOMETE Fit Analyzer · hackCBS Track (“Make Complex Tech Easy to Buy”)
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

            {/* Interactive Benchmark Account Switcher Bar */}
            <div className="mt-8 mb-5 flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Select prospect account profile"
                className="flex flex-wrap items-center gap-2"
              >
                {SAMPLE_COMPANIES.map((sample, idx) => {
                  const isSelected = selectedSampleId === sample.id;
                  const sScore = computeFitScore(
                    sample.evidenceItems,
                    weights,
                    sample.disqualifiers,
                    sample.unknowns
                  );
                  return (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(sample.id)}
                      className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap shrink-0 border ${
                        isSelected
                          ? 'bg-[#1A1612] text-[#F5F4F0] border-[#1A1612]'
                          : 'bg-[#FAF9F6] text-[#1A1612] border-[#E3E3DE] hover:border-[#8C867E]'
                      }`}
                    >
                      <span className="font-mono-tabular opacity-70">0{idx + 1}</span>
                      <span>{sample.name.split('&')[0].trim()}</span>
                      <span
                        className={`font-mono-tabular text-[11px] ${
                          isSelected
                            ? 'text-[#8CE0A1]'
                            : sScore.verdictBand === 'Strong fit'
                            ? 'text-[#2E6B40]'
                            : sScore.verdictBand === 'Possible fit (needs discovery)'
                            ? 'text-[#5B7C99]'
                            : 'text-[#D9733A]'
                        }`}
                      >
                        {sScore.overallScore}/100 · {sScore.verdictBand.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    if (!customCompany) {
                      handleRunCustomAnalysis(BLANK_MD_TEMPLATE, 'Custom Prospect Account');
                    } else {
                      setSelectedSampleId('custom-account');
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 border ${
                    selectedSampleId === 'custom-account'
                      ? 'bg-[#1A1612] text-[#F5F4F0] border-[#1A1612]'
                      : 'bg-[#FAF9F6] text-[#524E48] border-dashed border-[#8C867E] hover:text-[#1A1612]'
                  }`}
                >
                  <span>+ Custom .md Profile</span>
                </button>
              </div>

              <div className="text-xs font-mono-tabular text-[#6B665F]">
                Expected: <strong className="text-[#1A1612]">{activeCompany.expectedVerdict}</strong> · Actual: <strong className="text-[#1A1612]">{scoreResult.verdictBand}</strong>
              </div>
            </div>

            {/* Full-Width Interactive Workspace Frame (Forge Centerpiece) */}
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
              onOpenExportModal={() => setIsExportModalOpen(true)}
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
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onCopyText={handleCopyText}
          copiedLabel={copiedLabel}
        />

        {/* Closing Dark Obsidian Section: 2-Minute Judge Demo Script & PRD Reference (Forge "From the field notes" style) */}
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
                  Click any step in the 2-minute demo script on the right to jump the live workspace directly to that state-or open the printable single-column report.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-[#F3F1EC] text-[#1C1916] text-xs font-semibold hover:bg-white transition-colors"
                  >
                    Open Printable Report (.md / PDF)
                  </button>
                  <a
                    href="/assets/aistudio/IOMETE_Fit_Analyzer_PRD_for_the_hackCBS_IOMETE_track_66fb1e24.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-full border border-white/20 text-xs font-medium text-[#F3F1EC] hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Original PRD PDF</span>
                  </a>
                </div>
              </div>

              {/* 7 Interactive Demo Script Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSample('aegis-bank');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="font-mono-tabular text-[11px] text-[#8CE0A1]">
                    Step 01 &amp; 02 · Positive Benchmark
                  </div>
                  <div className="text-sm font-medium text-[#F3F1EC] mt-1">
                    Load Aegis Sovereign Bank (91/100)
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1">
                    Show Strong Fit verdict, workflow flow map, and click any claim to `docs.iomete.com`.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectSample('verve-retail');
                    handleUpdateWeight('cost', 45);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="font-mono-tabular text-[11px] text-[#90CDF4]">
                    Step 03 · Visible Math
                  </div>
                  <div className="text-sm font-medium text-[#F3F1EC] mt-1">
                    Trigger Live Weight Slider Shift
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1">
                    Boost Cost Pressure weight to 45% on Verve Retail and watch the rubric recompute live.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectSample('pulsenote-startup');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="font-mono-tabular text-[11px] text-[#F6AD85]">
                    Step 04 · Tool Can Say No
                  </div>
                  <div className="text-sm font-medium text-[#F3F1EC] mt-1">
                    Load PulseNote SaaS (16/100 Capped)
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1">
                    Show Negative Control: 42 GB Postgres + 0 data team triggers 3 hard disqualifier caps.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSelectSample('verve-retail');
                    setIsExportModalOpen(true);
                  }}
                  className="text-left p-4 rounded-xl bg-[#24201C] border border-white/10 hover:border-white/30 transition-colors"
                >
                  <div className="font-mono-tabular text-[11px] text-[#8CE0A1]">
                    Step 05, 06 &amp; 07 · Unknowns &amp; Export
                  </div>
                  <div className="text-sm font-medium text-[#F3F1EC] mt-1">
                    Inspect Unknowns &amp; Printable Report
                  </div>
                  <p className="text-xs text-[#A8A49C] mt-1">
                    Open the single-column report with Assumptions, Method, and 100% Citation Stamp.
                  </p>
                </button>
              </div>
            </div>

            {/* Quiet Footer */}
            <footer className="pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-[#A8A49C]">
              <div>
                FitLens - Source-Grounded IOMETE Fit Analyzer · Built for hackCBS IOMETE Track
              </div>
              <div className="flex items-center gap-6">
                <a href="#workspace" className="hover:text-[#F3F1EC]">
                  Workspace
                </a>
                <a href="#architecture" className="hover:text-[#F3F1EC]">
                  Knowledge Base (26)
                </a>
                <a href="#rubric" className="hover:text-[#F3F1EC]">
                  7-Dimension Rubric
                </a>
                <a href="#benchmarks" className="hover:text-[#F3F1EC]">
                  Benchmarks
                </a>
              </div>
            </footer>
          </div>
        </section>
      </main>

      {/* Printable Report & Markdown Export Modal */}
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
      />
    </div>
  );
}
