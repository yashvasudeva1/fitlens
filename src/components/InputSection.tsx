import React, { useRef, useState } from 'react';
import { Upload, Download, Sparkles, Search, Cpu, ExternalLink } from 'lucide-react';
import { MD_TEMPLATE } from '../data/sampleCompanies';
import { InputQualityCheck } from '../types/analyzer';

interface InputSectionProps {
  markdownText: string;
  onMarkdownChange: (text: string) => void;
  qualityCheck: InputQualityCheck;
  onDownloadTemplate: () => void;
  onRunGeminiResearch: (companyQuery: string, industryHint?: string) => Promise<void>;
  onRunGeminiDeepAnalysis: () => Promise<void>;
  isResearching: boolean;
  isAnalyzingWithGemini: boolean;
  activeModelsUsed: string[];
  groundedSources: Array<{ title: string; url: string }>;
}

export const InputSection: React.FC<InputSectionProps> = ({
  markdownText,
  onMarkdownChange,
  qualityCheck,
  onDownloadTemplate,
  onRunGeminiResearch,
  onRunGeminiDeepAnalysis,
  isResearching,
  isAnalyzingWithGemini,
  activeModelsUsed,
  groundedSources
}) => {
  const [companySearchInput, setCompanySearchInput] = useState('');
  const [industryInput, setIndustryInput] = useState('');
  const [viewMode, setViewMode] = useState<'editor' | 'template'>('editor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          onMarkdownChange(content);
          setViewMode('editor');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companySearchInput.trim()) return;
    await onRunGeminiResearch(companySearchInput.trim(), industryInput.trim() || undefined);
  };

  return (
    <section id="input-section" className="py-10 border-t border-[#dcdcd5] space-y-6">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-2">
            ( 01 / Multi-Model Gemini Account Research & Specification )
          </p>
          <h2 className="font-display text-[clamp(1.85rem,3.4vw,2.75rem)] font-normal leading-[1.04] tracking-[-0.03em] text-[#121212] max-w-[28ch]">
            Research any live company with Gemini or inspect a workflow specification.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Specification view mode"
            className="flex items-center bg-[#ebebe5] p-1 border border-[#dcdcd5]"
          >
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3.5 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'editor'
                  ? 'bg-[#2D382D] text-[#f8f8f5] font-medium'
                  : 'text-[#66665f] hover:text-[#121212]'
              }`}
            >
              Live Specification (.md)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('template')}
              className={`px-3.5 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'template'
                  ? 'bg-[#2D382D] text-[#f8f8f5] font-medium'
                  : 'text-[#66665f] hover:text-[#121212]'
              }`}
            >
              7-Section Schema
            </button>
          </div>

          <button
            type="button"
            onClick={onDownloadTemplate}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] hover:bg-[#E8ECE8] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md Template</span>
          </button>
        </div>
      </div>

      {/* Multi-Model Gemini Live Company Researcher & Auto-Drafter */}
      <div className="bg-white border border-[#dcdcd5] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e1e1da]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2D382D]" />
            <span className="font-mono text-xs text-[#2D382D] font-medium">
              Stage 0 · Live Web-Grounded Company Researcher (gemini-3.8-flash Search Grounding → gemini-3.1-flash-lite Structurer)
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#66665f]">
            Auto-drafts a 7-section .md specification & saves to the IOMETE Prospect DB
          </span>
        </div>

        <form onSubmit={handleResearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-[#66665f] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={companySearchInput}
              onChange={(e) => setCompanySearchInput(e.target.value)}
              placeholder="Enter any company name or domain (e.g., Deutsche Bank, Stripe, Zalando)..."
              aria-label="Company name or domain to research with Gemini"
              className="w-full pl-9 pr-3 py-2.5 text-xs font-mono bg-[#f5f5f1] border border-[#dcdcd5] focus:border-[#2D382D] outline-none text-[#121212]"
            />
          </div>

          <div className="md:col-span-4">
            <input
              type="text"
              value={industryInput}
              onChange={(e) => setIndustryInput(e.target.value)}
              placeholder="Optional context (e.g., EU Banking, Retail, or 15GB Startup)..."
              aria-label="Optional industry or scale context"
              className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#f5f5f1] border border-[#dcdcd5] focus:border-[#2D382D] outline-none text-[#121212]"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isResearching || !companySearchInput.trim()}
              className="w-full h-full px-4 py-2.5 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isResearching ? 'Researching via Gemini...' : 'Research & Auto-Draft'}</span>
            </button>
          </div>
        </form>

        {/* Template Actions & Live Research Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onMarkdownChange(MD_TEMPLATE)}
              className="px-2.5 py-1 text-[11px] bg-[#f5f5f1] border border-[#dcdcd5] hover:border-[#2D382D] text-[#121212] transition-colors cursor-pointer"
            >
              Load 7-Section Skeleton Template
            </button>
            {markdownText && (
              <button
                type="button"
                onClick={() => onMarkdownChange('')}
                className="px-2.5 py-1 text-[11px] bg-[#f5f5f1] border border-[#dcdcd5] hover:border-[#bf000f] text-[#66665f] hover:text-[#bf000f] transition-colors cursor-pointer"
              >
                Clear Editor
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#66665f] text-[11px]">Or live Gemini research:</span>
            {[
              { name: 'Deutsche Bank', hint: 'European Sovereign Banking & Risk' },
              { name: 'Zalando SE', hint: 'European E-Commerce & Logistics' },
              { name: 'TinySeed CRM', hint: 'Early-stage 12GB SaaS startup' }
            ].map((item) => (
              <button
                key={item.name}
                type="button"
                disabled={isResearching}
                onClick={() => {
                  setCompanySearchInput(item.name);
                  setIndustryInput(item.hint);
                  onRunGeminiResearch(item.name, item.hint);
                }}
                className="px-2.5 py-1 text-[11px] bg-[#E8ECE8] border border-[#2D382D]/30 hover:border-[#2D382D] text-[#2D382D] transition-colors cursor-pointer disabled:opacity-50"
              >
                + Research {item.name}
              </button>
            ))}
          </div>
        </div>

        {groundedSources.length > 0 && (
          <div className="pt-3 border-t border-[#e1e1da] flex flex-wrap items-center gap-3 text-[11px] font-mono">
            <span className="text-[#2D382D] font-medium">Search Grounding Sources:</span>
            {groundedSources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#66665f] hover:text-[#121212] underline underline-offset-2"
              >
                <span>{src.title.slice(0, 36)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Specification Editor or Template View */}
      {viewMode === 'editor' ? (
        <div className="bg-white border border-[#dcdcd5] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#e1e1da]">
            <div>
              <p className="font-mono text-xs text-[#2D382D] font-medium">
                Account Workflow & Constraint Specification (.md)
              </p>
              <p className="text-xs text-[#66665f]">
                Edit any line below or click "Run Multi-Model Gemini Analysis" to execute Stage 1 (gemini-3.1-flash-lite) + Stage 2 (gemini-3.8-flash) + Stage 3 (Rubric Validator).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".md,.txt,.markdown"
                className="hidden"
                aria-label="Upload company markdown file"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-[#121212] border border-[#dcdcd5] hover:border-[#2D382D] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#2D382D]" />
                <span>Upload .md File</span>
              </button>

              <button
                type="button"
                onClick={onRunGeminiDeepAnalysis}
                disabled={isAnalyzingWithGemini}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>
                  {isAnalyzingWithGemini
                    ? 'Running Multi-Model Pipeline...'
                    : 'Run Multi-Model Gemini Analysis & Save to DB'}
                </span>
              </button>
            </div>
          </div>

          <label htmlFor="company-md-editor" className="sr-only">
            Company workflows and constraints markdown
          </label>
          <textarea
            id="company-md-editor"
            value={markdownText}
            onChange={(e) => onMarkdownChange(e.target.value)}
            rows={11}
            className="w-full p-4 font-mono text-xs bg-[#f5f5f1] border border-[#dcdcd5] focus:border-[#2D382D] outline-none text-[#121212] leading-relaxed resize-y"
            placeholder="Paste company markdown or plain text description here..."
          />
        </div>
      ) : (
        <div className="bg-white border border-[#dcdcd5] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#e1e1da]">
            <div>
              <p className="font-mono text-xs text-[#2D382D] font-medium">
                Standard 7-Section Account Discovery Schema
              </p>
              <p className="text-xs text-[#66665f]">
                Structured headings designed so sales reps capture scale, sovereignty, and stack signals before a call.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onMarkdownChange(MD_TEMPLATE);
                setViewMode('editor');
              }}
              className="px-4 py-1.5 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors cursor-pointer"
            >
              Load Blank Schema in Editor
            </button>
          </div>
          <pre className="p-4 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs text-[#2c2c2a] overflow-x-auto max-h-72 leading-relaxed">
            {MD_TEMPLATE}
          </pre>
        </div>
      )}

      {/* Input Signal Audit & Multi-Model Pipeline Telemetry */}
      <div className="bg-white border border-[#dcdcd5] p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 pb-4 border-b border-[#e1e1da]">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-mono text-xs text-[#2D382D] font-medium">
              Input Signal Audit
            </span>
            <span className="text-[#66665f]" aria-hidden="true">·</span>
            <span className="font-display text-lg font-medium text-[#121212]">
              {qualityCheck.verdict}
            </span>
            <span className="text-[#66665f]" aria-hidden="true">·</span>
            <span className="font-mono text-xs tabular-nums text-[#2D382D]">
              {qualityCheck.coverageScore}% Section Coverage ({qualityCheck.sectionsFound.length}/7 sections)
            </span>
          </div>

          <div className="font-mono text-xs text-[#66665f] tabular-nums">
            Detected <strong className="text-[#121212]">{qualityCheck.workflowsCount} workflows</strong>
            {' · '}
            <strong className="text-[#121212]">{qualityCheck.dataSourcesCount} data sources</strong>
            {' · '}
            Confidence: <strong className="text-[#2D382D]">{qualityCheck.confidenceRating}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 text-xs">
          <div>
            <p className="font-mono text-[11px] text-[#66665f] mb-1">
              Scale Signal
            </p>
            <p className="text-[#121212] font-medium">
              {qualityCheck.scaleDetected}
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] text-[#66665f] mb-1">
              Sovereignty & Compliance Signal
            </p>
            <p className="text-[#121212] font-medium">
              {qualityCheck.complianceDetected}
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] text-[#66665f] mb-1">
              Missing Sections / Gaps
            </p>
            {qualityCheck.sectionsMissing.length === 0 ? (
              <p className="text-[#2D382D] font-medium">
                All 7 template sections detected
              </p>
            ) : (
              <p className="text-[#bf000f]">
                Missing: {qualityCheck.sectionsMissing.join(' · ')}
              </p>
            )}
          </div>

          <div>
            <p className="font-mono text-[11px] text-[#66665f] mb-1">
              Gemini Model Orchestration
            </p>
            <p className="font-mono text-[11px] text-[#2D382D] font-medium">
              {activeModelsUsed.length > 0
                ? activeModelsUsed.join(' → ')
                : 'gemini-3.1-flash-lite + gemini-3.8-flash + gemini-3.8-flash-lite-tts'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
