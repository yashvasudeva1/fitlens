import React from 'react';
import { CAPABILITY_MAP, KB_VERSION } from '../data/iometeCapabilities';
import { BLANK_MD_TEMPLATE, SampleCompanyAnalysis } from '../data/sampleCompanies';
import {
  DimensionWeights,
  FitScoreResult,
  ValidationCheckResult,
  generateMarkdownExport
} from '../utils/scoringEngine';
import { Check, Copy, Download, ExternalLink, Printer, X } from 'lucide-react';

interface ExportAndReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: SampleCompanyAnalysis;
  scoreResult: FitScoreResult;
  validationResult: ValidationCheckResult;
  weights: DimensionWeights;
  audience: 'rep' | 'buyer';
  onChangeAudience: (aud: 'rep' | 'buyer') => void;
  onCopyText: (text: string, label: string) => void;
  copiedLabel: string | null;
}

export const ExportAndReportModal: React.FC<ExportAndReportModalProps> = ({
  isOpen,
  onClose,
  company,
  scoreResult,
  validationResult,
  weights,
  audience,
  onChangeAudience,
  onCopyText,
  copiedLabel
}) => {
  if (!isOpen) return null;

  const markdownReport = generateMarkdownExport(company, scoreResult, weights, audience);

  const handleDownloadMarkdown = () => {
    const blob = new Blob([markdownReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${company.id}_iomete_fit_report_${audience}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-report-modal-title"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#FAF9F6] border border-[#E3E3DE] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-[#1C1916] text-[#F3F1EC] flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <h2 id="export-report-modal-title" className="text-base font-semibold">
              Export Verifiable Report (Markdown &amp; Printable Single-Column PDF)
            </h2>
            <p className="text-xs text-[#A8A49C]">
              Includes `[Stated]`, `[Sourced]`, and `[Assumed]` labels, rubric weights, and `docs.iomete.com` links for Finance &amp; Security review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCopyText(markdownReport, 'modal-md')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#24201C] border border-white/15 text-xs font-medium text-[#F3F1EC] hover:bg-white/10"
            >
              {copiedLabel === 'modal-md' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#8CE0A1]" />
                  <span>Copied .md</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5A9A6B] text-xs font-medium text-white hover:bg-[#4B855B]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F1EC] text-[#1C1916] text-xs font-semibold hover:bg-white"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              aria-label="Close export modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A8A49C] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Audience Toggle Sub-bar */}
        <div className="px-6 py-3 bg-[#F3F3EE] border-b border-[#E3E3DE] flex items-center justify-between text-xs no-print">
          <div className="flex items-center gap-2">
            <span className="text-[#6B665F]">Report Variant:</span>
            <button
              type="button"
              onClick={() => onChangeAudience('rep')}
              className={`px-2.5 py-1 rounded font-medium ${
                audience === 'rep' ? 'bg-[#1A1612] text-white' : 'text-[#524E48]'
              }`}
            >
              Sales Rep Call Brief
            </button>
            <button
              type="button"
              onClick={() => onChangeAudience('buyer')}
              className={`px-2.5 py-1 rounded font-medium ${
                audience === 'buyer' ? 'bg-[#1A1612] text-white' : 'text-[#524E48]'
              }`}
            >
              Buyer Internal Justification Memo
            </button>
          </div>
          <span className="font-mono-tabular text-[11px] text-[#6B665F]">
            {scoreResult.rubricVersion}
          </span>
        </div>

        {/* Single-Column Printable Report Preview (PRD Section 7.3: "a single-column report beats a pretty broken one") */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white text-[#1A1612] text-xs leading-relaxed">
          {/* Header Stamp */}
          <div className="pb-4 border-b border-[#E3E3DE] flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono-tabular text-[11px] text-[#6B665F]">
                FITLENS SOURCE-GROUNDED IOMETE QUALIFICATION REPORT
              </div>
              <h1 className="font-serif-display text-2xl font-normal text-[#1A1612] mt-1">
                {company.name}
              </h1>
              <div className="text-xs text-[#6B665F] mt-0.5">
                {company.industry} · {company.dataVolume}
              </div>
            </div>
            <div className="text-right font-mono-tabular">
              <div className="text-xl font-bold text-[#1A1612]">
                {scoreResult.overallScore} / 100 · {scoreResult.verdictBand}
              </div>
              <div className="text-[11px] text-[#6B665F]">
                Confidence: {scoreResult.confidenceLevel} ({scoreResult.confidenceScore}%) · Citations: {validationResult.citationCoveragePercent}%
              </div>
            </div>
          </div>

          {/* 1. Executive Verdict */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1612] mb-2">
              1. Verdict &amp; Plain-Language Explanation
            </h3>
            <p className="font-medium text-[#1A1612] mb-2">{scoreResult.oneSentenceReason}</p>
            <ul className="space-y-1.5">
              {company.executiveSummaryPlain.map((item, i) => {
                const cap = item.capabilityId ? CAPABILITY_MAP[item.capabilityId] : undefined;
                return (
                  <li key={i}>
                    <strong className="font-mono-tabular">[{item.label}]</strong> {item.text}{' '}
                    {cap && (
                      <span className="font-mono-tabular text-[#524E48]">
                        ({cap.docUrl})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 2. Audience Specific Section */}
          <div className="p-4 rounded-xl bg-[#F5F4F0] border border-[#E3E3DE]">
            {audience === 'rep' ? (
              <div>
                <h3 className="text-sm font-semibold text-[#1A1612] mb-2">
                  2. Sales Rep Call Agenda &amp; Talk Track
                </h3>
                <p className="mb-2">
                  <strong>Opening Hook:</strong> {company.repTalkTrack.openingHook}
                </p>
                <div className="font-semibold mb-1">Call Agenda:</div>
                <ul className="list-disc pl-5 space-y-1">
                  {company.repTalkTrack.callAgenda.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-[#1A1612] mb-2">
                  2. Buyer Internal Memo (For CFO &amp; CISO Review)
                </h3>
                <p className="mb-1">
                  <strong>Subject:</strong> {company.buyerMemo.subject}
                </p>
                <p className="mb-2">
                  <strong>TL;DR:</strong> {company.buyerMemo.tlDr}
                </p>
                <p className="mb-2">
                  <strong>CFO / Cost Architecture:</strong> {company.buyerMemo.cfoCostSection}
                </p>
                <p>
                  <strong>CISO / Security &amp; Sovereignty:</strong> {company.buyerMemo.cisoSecuritySection}
                </p>
              </div>
            )}
          </div>

          {/* 3. Workflow Map */}
          <div>
            <h3 className="text-sm font-semibold text-[#1A1612] mb-2">
              3. Workflow-to-Capability Evidence Trail
            </h3>
            <table className="w-full text-left border-collapse border border-[#E3E3DE] text-[11px]">
              <thead>
                <tr className="bg-[#F5F4F0] border-b border-[#E3E3DE]">
                  <th className="p-2">Workflow</th>
                  <th className="p-2">Input Quote (`[Stated]`)</th>
                  <th className="p-2">IOMETE Capability (`[Sourced]`)</th>
                  <th className="p-2">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3DE]">
                {company.evidenceItems.map((ev) => {
                  const cap = CAPABILITY_MAP[ev.capabilityId];
                  return (
                    <tr key={ev.id}>
                      <td className="p-2 font-medium">{ev.workflowName}</td>
                      <td className="p-2">“{ev.mdQuote}”</td>
                      <td className="p-2">
                        {cap?.name} ({cap?.docUrl})
                      </td>
                      <td className="p-2 font-mono-tabular uppercase">
                        {ev.direction} ({ev.strength})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. Unknowns & Method Stamp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E3E3DE]">
            <div>
              <h4 className="font-semibold text-[#1A1612] mb-1">
                4. Unknowns &amp; Discovery Questions
              </h4>
              {company.unknowns.map((u) => (
                <div key={u.id} className="mb-2">
                  <div className="font-mono-tabular text-[11px] text-[#D9733A]">
                    Gap ({u.dimensionId}): {u.missingTopic}
                  </div>
                  <div>Ask: “{u.discoveryQuestion}”</div>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-semibold text-[#1A1612] mb-1">
                5. Assumptions, Rubric &amp; Verification Stamp
              </h4>
              <div className="font-mono-tabular text-[11px] space-y-1 text-[#524E48]">
                <div>Rubric: {scoreResult.rubricVersion}</div>
                <div>Knowledge Base: {KB_VERSION}</div>
                <div>
                  Active Dimensions Scored: {scoreResult.knownDimensionCount}/7 ({scoreResult.unknownDimensionCount} excluded as unknown)
                </div>
                <div>
                  Validator Check: {validationResult.passed ? 'PASSED (100% doc links verified)' : 'Review Needed'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
