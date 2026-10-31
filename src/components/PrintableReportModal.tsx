import React, { useRef } from 'react';
import { X, Printer, Download, FileCode } from 'lucide-react';
import { AnalysisResult, DimensionId, ProspectRecord } from '../types/analyzer';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult;
  prospectRecord?: ProspectRecord;
  onDownloadMarkdown: () => void;
}

export const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  analysis,
  prospectRecord,
  onDownloadMarkdown
}) => {
  const reportContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Export a complete standalone HTML report containing Company Details, Overall Charts (SVGs & Bars), and Evidence Tables
  const handleDownloadFullHtmlReport = () => {
    if (!reportContainerRef.current) return;
    const innerHtml = reportContainerRef.current.innerHTML;
    const slug = analysis.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FitLens Report - ${analysis.companyName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f1; color: #121212; padding: 32px; }
    .report-shell { max-width: 960px; margin: 0 auto; background: #ffffff; border: 1px solid #dcdcd5; padding: 48px; }
  </style>
</head>
<body>
  <div class="report-shell space-y-8">
    ${innerHtml}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitlens-full-report-with-charts-${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute Radar SVG coordinates for the embedded printable chart
  const dimKeys = Object.keys(analysis.dimensions) as DimensionId[];
  const radarSize = 240;
  const radarCenter = radarSize / 2;
  const radarRadius = 78;
  const getRadarCoord = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / dimKeys.length - Math.PI / 2;
    const r = radarRadius * ratio;
    return {
      x: radarCenter + r * Math.cos(angle),
      y: radarCenter + r * Math.sin(angle)
    };
  };
  const radarPolygonPoints = dimKeys
    .map((k, idx) => {
      const d = analysis.dimensions[k];
      const ratio = d.status === 'not_scored' || d.score === null ? 0.08 : Math.max(0.1, d.score / 100);
      const c = getRadarCoord(idx, ratio);
      return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    })
    .join(' ');

  // Compute 36-Month TCO SVG coordinates for the embedded printable chart
  const { tcoTrajectory, divergingDimensions, workloadPillars } = analysis.flourishBreakdown;
  const maxTcoVal = Math.max(
    10,
    ...tcoTrajectory.months.map(m => Math.max(m.incumbentCumulativeK, m.iometeCumulativeK))
  );
  const tcoW = 420;
  const tcoH = 180;
  const padL = 44;
  const padR = 18;
  const padT = 18;
  const padB = 28;
  const plotW = tcoW - padL - padR;
  const plotH = tcoH - padT - padB;
  const getTcoX = (i: number) => padL + (i / Math.max(1, tcoTrajectory.months.length - 1)) * plotW;
  const getTcoY = (val: number) => padT + plotH - (Math.min(val, maxTcoVal) / maxTcoVal) * plotH;
  const incumbentLine = tcoTrajectory.months
    .map((m, i) => `${getTcoX(i).toFixed(1)},${getTcoY(m.incumbentCumulativeK).toFixed(1)}`)
    .join(' ');
  const iometeLine = tcoTrajectory.months
    .map((m, i) => `${getTcoX(i).toFixed(1)},${getTcoY(m.iometeCumulativeK).toFixed(1)}`)
    .join(' ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/50 backdrop-blur-xs"
    >
      <div className="bg-white border border-[#dcdcd5] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="no-print px-6 py-4 border-b border-[#dcdcd5] bg-[#f5f5f1] flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-[#66665f]">
              ( Export Report · Includes Company Details, Overall Charts, Rubric & Evidence )
            </p>
            <h2 id="print-modal-title" className="font-display text-lg font-medium text-[#121212]">
              Complete Exportable Account Dossier & Visual Charts
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadFullHtmlReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#121212] border border-[#dcdcd5] hover:border-[#2D382D] bg-white cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-[#2D382D]" />
              <span>Export HTML + Charts</span>
            </button>
            <button
              type="button"
              onClick={onDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] bg-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              aria-label="Close export preview"
              onClick={onClose}
              className="p-1.5 text-[#66665f] hover:text-[#121212] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body with Company Details + Visual Charts + Evidence */}
        <div
          ref={reportContainerRef}
          className="p-8 sm:p-12 overflow-y-auto flex-1 text-[#121212] bg-white space-y-8 max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="border-b border-[#121212] pb-6 space-y-2">
            <div className="flex items-center justify-between font-mono text-xs text-[#66665f]">
              <span>FitLens - IOMETE Account Qualification Dossier</span>
              <span>{analysis.meta.rubricVersion} · Hash: {analysis.inputHash}</span>
            </div>
            <h1 className="font-display text-3xl font-normal tracking-[-0.03em] text-[#121212]">
              {analysis.companyName}
            </h1>
            <p className="font-mono text-xs text-[#2D382D]">
              Verdict: {analysis.verdictBand}{' '}
              {analysis.isInsufficientInfo || analysis.overallScore === null
                ? '(Score Hidden - Insufficient Information)'
                : `(${analysis.overallScore}/100)`}{' '}
              · Scored Dimensions: {analysis.scoredDimensionsCount}/7 · Confidence:{' '}
              {analysis.confidenceLevel} ({analysis.confidenceScore}%) · Citation Coverage:{' '}
              {analysis.meta.citationCoveragePercent}%
            </p>
          </div>

          {/* Section 01: Company Profile & CRM Details */}
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              01 / Company Profile & Qualification Metadata
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-[#f8f8f5] border border-[#dcdcd5] text-xs">
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Company Name</span>
                <strong className="text-[#121212]">{analysis.companyName}</strong>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Industry / Sector</span>
                <strong className="text-[#121212]">
                  {prospectRecord?.industry || 'Enterprise Data & Analytics'}
                </strong>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Data Scale Signal</span>
                <strong className="text-[#121212] font-mono">
                  {prospectRecord?.dataScale || analysis.inputQuality.scaleDetected}
                </strong>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Current Tech Stack</span>
                <strong className="text-[#121212]">
                  {prospectRecord?.currentStack || 'Evaluated from Input Spec'}
                </strong>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Compliance & Residency</span>
                <strong className="text-[#121212]">
                  {prospectRecord?.compliancePosture || analysis.inputQuality.complianceDetected}
                </strong>
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#66665f] block">Target Buyer & Stage</span>
                <strong className="text-[#2D382D]">
                  {prospectRecord?.outreachStatus || analysis.salesRepView.targetPersona}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 02: Verdict & Evidence-Cited Bullets */}
          <div className="space-y-2">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              02 / Executive Verdict & Sourced Evidence Bullets
            </h2>
            <p className="text-sm font-medium text-[#121212]">{analysis.oneSentenceReason}</p>
            {!analysis.isInsufficientInfo && (
              <div className="space-y-2 text-xs text-[#2c2c2a] leading-relaxed pt-1">
                {analysis.plainLanguageExplanation.map((p, idx) => (
                  <p key={idx}>· {p}</p>
                ))}
              </div>
            )}
          </div>

          {/* Section 03: Overall Visual Charts (Radar + TCO Trajectory + Flourish vs Friction + Workload Fit) */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              03 / Visual Architecture & Flourish Charts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Embedded SVG Chart 1: 7-Dimension Radar */}
              <div className="p-4 border border-[#dcdcd5] bg-[#f8f8f5] flex flex-col items-center">
                <p className="font-mono text-[11px] text-[#66665f] self-start mb-2">
                  Chart 1 · 7-Dimension Fit Radar ({analysis.scoredDimensionsCount}/7 Scored)
                </p>
                <svg width={radarSize} height={radarSize} className="overflow-visible">
                  {[0.25, 0.5, 0.75, 1.0].map((lvl, idx) => (
                    <polygon
                      key={idx}
                      points={dimKeys
                        .map((_, i) => {
                          const c = getRadarCoord(i, lvl);
                          return `${c.x.toFixed(1)},${c.y.toFixed(1)}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#dcdcd5"
                      strokeWidth="1"
                    />
                  ))}
                  <polygon
                    points={radarPolygonPoints}
                    fill="rgba(45, 56, 45, 0.2)"
                    stroke="#2D382D"
                    strokeWidth="2"
                  />
                  {dimKeys.map((k, i) => {
                    const d = analysis.dimensions[k];
                    const lbl = getRadarCoord(i, 1.22);
                    return (
                      <text
                        key={k}
                        x={lbl.x}
                        y={lbl.y}
                        textAnchor="middle"
                        className="font-mono text-[9px]"
                        fill="#121212"
                      >
                        {d.status === 'not_scored' || d.score === null ? 'N/S' : `${d.score}`}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* Embedded SVG Chart 2: 36-Month Cumulative TCO Trajectory */}
              <div className="p-4 border border-[#dcdcd5] bg-[#f8f8f5] flex flex-col justify-between">
                <p className="font-mono text-[11px] text-[#66665f] mb-2">
                  Chart 2 · 36-Month Cumulative TCO Trajectory ({tcoTrajectory.unitLabel})
                </p>
                <svg viewBox={`0 0 ${tcoW} ${tcoH}`} className="w-full h-auto overflow-visible">
                  {[0, 0.5, 1].map((r, idx) => {
                    const y = padT + plotH - r * plotH;
                    return (
                      <g key={idx}>
                        <line x1={padL} y1={y} x2={tcoW - padR} y2={y} stroke="#dcdcd5" strokeWidth="1" />
                        <text x={padL - 6} y={y + 3} textAnchor="end" className="font-mono text-[9px]" fill="#66665f">
                          ${Math.round(r * maxTcoVal)}K
                        </text>
                      </g>
                    );
                  })}
                  <polyline fill="none" stroke="#66665f" strokeWidth="2" strokeDasharray="4,3" points={incumbentLine} />
                  <polyline
                    fill="none"
                    stroke={tcoTrajectory.isSubScaleWarning ? '#bf000f' : '#2D382D'}
                    strokeWidth="2.5"
                    points={iometeLine}
                  />
                  {tcoTrajectory.months.map((m, i) => (
                    <text
                      key={m.month}
                      x={getTcoX(i)}
                      y={tcoH - 6}
                      textAnchor="middle"
                      className="font-mono text-[9px]"
                      fill="#121212"
                    >
                      {m.month}
                    </text>
                  ))}
                </svg>
                <p className="font-mono text-[10px] text-[#2c2c2a] mt-2">
                  M36 Incumbent: ${tcoTrajectory.months[tcoTrajectory.months.length - 1]?.incumbentCumulativeK}K vs. IOMETE: ${tcoTrajectory.months[tcoTrajectory.months.length - 1]?.iometeCumulativeK}K
                </p>
              </div>
            </div>

            {/* Embedded Chart 3 & 4: Diverging Flourish vs Friction & Workload Fit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#dcdcd5] space-y-2">
                <p className="font-mono text-[11px] text-[#66665f]">
                  Chart 3 · Flourish Catalyst vs. Friction Drag
                </p>
                {divergingDimensions.map((dd) => (
                  <div key={dd.dimensionId} className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span>{dd.shortName} ({dd.weight}%)</span>
                      <span className="text-[#2D382D]">
                        {dd.status === 'not_scored'
                          ? 'Not scored'
                          : `Catalyst +${dd.flourishCatalyst} / Drag -${dd.frictionDrag}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 h-2.5 bg-[#f5f5f1] border border-[#dcdcd5]">
                      <div className="flex justify-end pr-0.5 border-r border-[#121212]/40">
                        <div style={{ width: `${dd.frictionDrag}%` }} className="h-full bg-[#bf000f]/75" />
                      </div>
                      <div className="flex justify-start pl-0.5">
                        <div style={{ width: `${dd.flourishCatalyst}%` }} className="h-full bg-[#2D382D]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border border-[#dcdcd5] space-y-2">
                <p className="font-mono text-[11px] text-[#66665f]">
                  Chart 4 · Workload Demand vs. IOMETE Platform Fit
                </p>
                {workloadPillars.map((wp) => (
                  <div key={wp.pillar} className="space-y-1 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="truncate pr-2">{wp.pillar}</span>
                      <span className="text-[#2D382D] shrink-0">
                        Demand {wp.prospectDemand}% · Fit {wp.iometeFit}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#f5f5f1] border border-[#dcdcd5]">
                      <div style={{ width: `${wp.iometeFit}%` }} className="h-full bg-[#2D382D]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 04: Fit Dimensions & Visible Rubric Table */}
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              04 / Fit Dimensions & Visible Rubric Weights
            </h2>
            <table className="w-full text-left text-xs border border-[#dcdcd5]">
              <thead className="bg-[#f5f5f1] border-b border-[#dcdcd5] font-mono text-[#66665f]">
                <tr>
                  <th className="p-2.5 font-normal">Dimension</th>
                  <th className="p-2.5 font-normal">Weight</th>
                  <th className="p-2.5 font-normal">Score</th>
                  <th className="p-2.5 font-normal">Status</th>
                  <th className="p-2.5 font-normal">Evidence ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e1da]">
                {Object.values(analysis.dimensions).map((dim) => (
                  <tr key={dim.dimensionId}>
                    <td className="p-2.5 font-medium">{dim.name}</td>
                    <td className="p-2.5 font-mono tabular-nums">{dim.userWeight}%</td>
                    <td className="p-2.5 font-mono tabular-nums text-[#2D382D]">
                      {dim.status === 'not_scored' || dim.score === null
                        ? 'Not scored'
                        : `${dim.score}/100`}
                    </td>
                    <td className="p-2.5 font-mono uppercase">{dim.status}</td>
                    <td className="p-2.5 font-mono text-[11px] text-[#66665f]">
                      {dim.evidence.length > 0
                        ? dim.evidence.map(e => e.id).join(', ')
                        : 'Excluded from mean'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 05: Top Use Cases */}
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              05 / Top Ranked Use Cases & Sourced Citations
            </h2>
            {analysis.topUseCases.map((u) => (
              <div key={u.rank} className="p-4 border border-[#dcdcd5] space-y-1.5 text-xs">
                <div className="flex justify-between font-medium text-[#121212]">
                  <span>0{u.rank} / {u.title}</span>
                  <span className="font-mono text-[#2D382D]">{u.iometeCapability}</span>
                </div>
                <p className="italic text-[#2c2c2a]">Quote [Stated]: {u.prospectQuote}</p>
                <p className="text-[#121212]">{u.rationale}</p>
                <p className="font-mono text-[11px] text-[#66665f]">Source: {u.docUrl}</p>
              </div>
            ))}
          </div>

          {/* Section 06: Unknowns & Discovery Questions */}
          <div className="space-y-3">
            <h2 className="font-mono text-xs text-[#2D382D] font-medium">
              06 / Honest Unknowns & Discovery Questions
            </h2>
            <div className="space-y-2 text-xs">
              {analysis.unknownsGaps.map((gap) => (
                <div key={gap.id} className="p-3 bg-[#f5f5f1] border border-[#dcdcd5]">
                  <p className="font-medium text-[#121212]">[{gap.priority}] {gap.title}</p>
                  <p className="text-[#66665f]">Missing: {gap.missingInfo}</p>
                  <p className="text-[#2D382D] font-medium mt-1">Ask: "{gap.discoveryQuestion}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-[#dcdcd5] font-mono text-xs text-[#66665f] space-y-1">
            <p className="text-[#121212] font-medium">
              Assumptions & Method (For Finance & Security Reviewers)
            </p>
            <p>
              Labels: [Stated] from prospect input ({analysis.meta.statedCount}), [Sourced] from IOMETE documentation ({analysis.meta.sourcedCount}), [Assumed] analytical inference ({analysis.meta.assumedCount}).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
