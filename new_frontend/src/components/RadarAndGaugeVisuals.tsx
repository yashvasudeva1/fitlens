import React from 'react';
import { CAPABILITY_MAP } from '../data/iometeCapabilities';
import { EvidenceItem, VerdictBand } from '../data/sampleCompanies';
import { DimensionScoreDetail } from '../utils/scoringEngine';
import { ExternalLink, ShieldAlert, CheckCircle2, HelpCircle, ArrowRight } from 'lucide-react';

interface FitScoreArcGaugeProps {
  score: number;
  rawUncappedScore: number;
  verdictBand: VerdictBand;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  isCapped: boolean;
}

export const FitScoreArcGauge: React.FC<FitScoreArcGaugeProps> = ({
  score,
  rawUncappedScore,
  verdictBand,
  confidenceScore,
  confidenceLevel,
  isCapped
}) => {
  const radius = 58;
  const circumference = Math.PI * radius; // Semi-circle arc length
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const bandColor =
    verdictBand === 'Strong fit'
      ? '#5A9A6B'
      : verdictBand === 'Possible fit (needs discovery)'
      ? '#5B7C99'
      : '#D9733A';

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#6B665F]">Overall Fit Verdict</span>
        <span className="font-mono-tabular text-[11px] text-[#6B665F]">
          Conf: {confidenceLevel} ({confidenceScore}%)
        </span>
      </div>

      <div className="relative flex items-center gap-4 my-2">
        <svg width="136" height="80" viewBox="0 0 140 82" className="shrink-0 overflow-visible">
          {/* Background track */}
          <path
            d="M 12 72 A 58 58 0 0 1 128 72"
            fill="none"
            stroke="#E3E3DE"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Tick marks at 30, 50, 75 thresholds */}
          <circle cx="28" cy="31" r="2" fill="#8C867E" />
          <circle cx="70" cy="14" r="2" fill="#8C867E" />
          <circle cx="112" cy="31" r="2" fill="#8C867E" />
          {/* Active value arc */}
          <path
            d="M 12 72 A 58 58 0 0 1 128 72"
            fill="none"
            stroke={bandColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
          <text
            x="70"
            y="62"
            textAnchor="middle"
            className="font-mono-tabular text-[28px] font-semibold fill-[#1A1612]"
          >
            {score}
          </text>
          <text
            x="70"
            y="77"
            textAnchor="middle"
            className="font-mono-tabular text-[10px] fill-[#6B665F]"
          >
            / 100 RUBRIC
          </text>
        </svg>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            {verdictBand === 'Strong fit' && <CheckCircle2 className="w-4 h-4 text-[#5A9A6B] shrink-0" />}
            {verdictBand === 'Possible fit (needs discovery)' && (
              <HelpCircle className="w-4 h-4 text-[#5B7C99] shrink-0" />
            )}
            {(verdictBand === 'Weak fit' || verdictBand === 'Not a fit') && (
              <ShieldAlert className="w-4 h-4 text-[#D9733A] shrink-0" />
            )}
            <span
              className="text-sm font-semibold tracking-tight leading-snug"
              style={{ color: bandColor }}
            >
              {verdictBand}
            </span>
          </div>
          {isCapped ? (
            <span className="mt-1 text-[11px] leading-tight text-[#D9733A] font-medium">
              Disqualifier cap active (raw: {rawUncappedScore}/100)
            </span>
          ) : (
            <span className="mt-1 text-[11px] leading-tight text-[#6B665F]">
              Code-computed · 0.0 run variance
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface SevenDimensionRadarChartProps {
  dimensionScores: DimensionScoreDetail[];
  selectedDimensionId?: string;
  onSelectDimension?: (dimensionId: DimensionScoreDetail['dimensionId']) => void;
}

export const SevenDimensionRadarChart: React.FC<SevenDimensionRadarChartProps> = ({
  dimensionScores,
  selectedDimensionId,
  onSelectDimension
}) => {
  const size = 290;
  const center = size / 2;
  const maxRadius = 92;
  const count = dimensionScores.length;

  const getPoint = (index: number, valuePercent: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (valuePercent / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      angle
    };
  };

  // Build polygon points; for unknown dimensions, plot at inner 18% dashed ring so the gap is visually obvious
  const polygonPoints = dimensionScores
    .map((d, i) => {
      const val = d.status === 'scored' && d.score !== null ? d.score : 15;
      const pt = getPoint(i, val);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const rings = [25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Seven dimension lakehouse fit radar chart"
        className="overflow-visible select-none"
      >
        {/* Concentric heptagon grid rings */}
        {rings.map((ring) => {
          const pts = dimensionScores
            .map((_, i) => {
              const p = getPoint(i, ring);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(' ');
          return (
            <polygon
              key={ring}
              points={pts}
              fill="none"
              stroke={ring === 50 ? '#C8C5BC' : '#E3E3DE'}
              strokeWidth={ring === 50 ? '1.2' : '1'}
              strokeDasharray={ring === 50 ? '3 3' : undefined}
            />
          );
        })}

        {/* Axis spokes */}
        {dimensionScores.map((d, i) => {
          const outer = getPoint(i, 100);
          const isUnknown = d.status === 'unknown';
          return (
            <line
              key={d.dimensionId}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke={isUnknown ? '#D9733A' : '#DCDAD3'}
              strokeWidth={isUnknown ? '1.5' : '1'}
              strokeDasharray={isUnknown ? '4 3' : undefined}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="rgba(90, 154, 107, 0.18)"
          stroke="#1A1612"
          strokeWidth="2"
          className="transition-all duration-300"
        />

        {/* Vertex dots and outer interactive labels */}
        {dimensionScores.map((d, i) => {
          const isUnknown = d.status === 'unknown';
          const val = !isUnknown && d.score !== null ? d.score : 15;
          const pt = getPoint(i, val);
          const labelPt = getPoint(i, 127);
          const isSelected = selectedDimensionId === d.dimensionId;

          const dotColor = isUnknown
            ? '#D9733A'
            : (d.score ?? 0) >= 75
            ? '#5A9A6B'
            : (d.score ?? 0) >= 50
            ? '#5B7C99'
            : '#D9733A';

          return (
            <g
              key={d.dimensionId}
              onClick={() => onSelectDimension?.(d.dimensionId)}
              className="cursor-pointer group"
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : 4.5}
                fill={isUnknown ? '#FAF9F6' : dotColor}
                stroke={dotColor}
                strokeWidth="2"
              />
              <text
                x={labelPt.x}
                y={labelPt.y - 5}
                textAnchor="middle"
                className={`text-[10.5px] font-medium transition-colors ${
                  isSelected ? 'fill-[#1A1612] font-semibold' : 'fill-[#524E48] group-hover:fill-[#1A1612]'
                }`}
              >
                {d.shortName}
              </text>
              <text
                x={labelPt.x}
                y={labelPt.y + 8}
                textAnchor="middle"
                className="font-mono-tabular text-[10px]"
                fill={isUnknown ? '#D9733A' : '#1A1612'}
              >
                {isUnknown ? 'GAP (EXCL)' : `${d.score}/100 · ${d.weight}%`}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 text-[11px] text-[#6B665F] mt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block bg-[#5A9A6B]" /> Strong (&ge;75)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block bg-[#5B7C99]" /> Possible (50–74)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block border border-[#D9733A] bg-[#FAF9F6]" /> Unknown / Gap
        </span>
      </div>
    </div>
  );
};

interface WorkflowCapabilityFlowGraphProps {
  evidenceItems: EvidenceItem[];
  selectedEvidenceId: string;
  onSelectEvidence: (id: string) => void;
}

export const WorkflowCapabilityFlowGraph: React.FC<WorkflowCapabilityFlowGraphProps> = ({
  evidenceItems,
  selectedEvidenceId,
  onSelectEvidence
}) => {
  const activeEv = evidenceItems.find((e) => e.id === selectedEvidenceId) || evidenceItems[0];
  const matchedCap = activeEv ? CAPABILITY_MAP[activeEv.capabilityId] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {/* Graphic Node-to-Capability Flow Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left column: Prospect Workflows extracted from .md */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-[#6B665F] pb-1 border-b border-[#E3E3DE]">
            <span>Prospect Input Workflows (Stated)</span>
            <span className="font-mono-tabular">{evidenceItems.length} signals</span>
          </div>
          {evidenceItems.map((ev, index) => {
            const isSelected = ev.id === (activeEv?.id ?? '');
            const isPositive = ev.direction === 'supports';
            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onSelectEvidence(ev.id)}
                className={`text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#1A1612] text-[#F5F4F0] border-[#1A1612]'
                    : 'bg-[#FAF9F6] text-[#1A1612] border-[#E3E3DE] hover:border-[#8C867E]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`font-mono-tabular ${
                        isSelected ? 'text-[#A8A49C]' : 'text-[#8C867E]'
                      }`}
                    >
                      0{index + 1}
                    </span>
                    <span className="font-medium truncate">{ev.workflowName}</span>
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 ${
                      isSelected ? 'text-[#D6D3CD]' : 'text-[#6B665F]'
                    }`}
                  >
                    “{ev.mdQuote}”
                  </div>
                </div>
                <span
                  className={`font-mono-tabular text-[10px] shrink-0 px-1.5 py-0.5 rounded ${
                    isPositive
                      ? isSelected
                        ? 'bg-[#5A9A6B]/30 text-[#9AE6B4]'
                        : 'bg-[#5A9A6B]/15 text-[#2E6B40]'
                      : isSelected
                      ? 'bg-[#D9733A]/30 text-[#FBD38D]'
                      : 'bg-[#D9733A]/15 text-[#9C4221]'
                  }`}
                >
                  {isPositive ? `+${ev.strength.toUpperCase()}` : `-${ev.strength.toUpperCase()}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Center SVG visual connector column */}
        <div className="hidden lg:flex lg:col-span-2 flex-col items-center justify-center relative py-6">
          <svg className="w-full h-full min-h-[240px]" viewBox="0 0 100 260" preserveAspectRatio="none">
            {evidenceItems.map((ev, idx) => {
              const total = Math.max(1, evidenceItems.length - 1);
              const yStart = 20 + (idx / total) * 220;
              const yEnd = 130;
              const isSelected = ev.id === (activeEv?.id ?? '');
              const strokeColor =
                ev.direction === 'supports'
                  ? isSelected
                    ? '#5A9A6B'
                    : '#C5D9CB'
                  : isSelected
                  ? '#D9733A'
                  : '#E6C5B2';
              return (
                <path
                  key={ev.id}
                  d={`M 0 ${yStart} C 45 ${yStart}, 55 ${yEnd}, 100 ${yEnd}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? '2.8' : '1.4'}
                  strokeDasharray={ev.direction === 'hurts' ? '4 3' : undefined}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 rounded-full bg-[#1A1612] text-[#F5F4F0] border-2 border-[#E3E3DE] flex items-center justify-center font-mono-tabular text-[10px] font-semibold shadow-xs">
              KB
            </div>
          </div>
        </div>

        {/* Right column: Sourced IOMETE Capability Card + Forge-style Evidence Diff */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-[#FAF9F6] border border-[#E3E3DE] rounded-xl p-4">
          {activeEv && matchedCap ? (
            <div className="flex flex-col h-full justify-between gap-3">
              <div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#6B665F] pb-2 border-b border-[#E3E3DE]">
                  <span className="font-mono-tabular text-[#1A1612] font-medium truncate">
                    [{activeEv.label.toUpperCase()}] · {matchedCap.id}
                  </span>
                  <span className="shrink-0">{matchedCap.category.split('&')[0].trim()}</span>
                </div>

                <h4 className="text-base font-semibold text-[#1A1612] mt-2.5 leading-snug">
                  {matchedCap.name}
                </h4>
                <p className="text-xs text-[#524E48] mt-1.5 leading-relaxed">
                  {matchedCap.plainDescription}
                </p>

                {/* Forge-style Code / Evidence Diff Box */}
                <div className="mt-3 rounded-lg bg-[#1C1916] text-[#F3F1EC] p-3 font-mono-tabular text-[11px] leading-relaxed border border-[#2E2A25]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#A8A49C] pb-1.5 mb-1.5 border-b border-white/10">
                    <span>prospect.md ({activeEv.mdSection})</span>
                    <span className="text-[#8CE0A1]">
                      CONF: {activeEv.confidence.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[#E2DFD7] flex items-start gap-2">
                    <span className="text-[#A8A49C] select-none">&gt;</span>
                    <span>“{activeEv.mdQuote}”</span>
                  </div>
                  <div
                    className={`mt-2 pt-2 border-t border-white/10 flex items-start gap-2 ${
                      activeEv.direction === 'supports' ? 'text-[#8CE0A1]' : 'text-[#F6AD85]'
                    }`}
                  >
                    <span className="select-none">
                      {activeEv.direction === 'supports' ? '+' : '-'}
                    </span>
                    <span>
                      {activeEv.direction === 'supports' ? 'MATCHES KB:' : 'MISMATCH / HURTS FIT:'}{' '}
                      {activeEv.explanation}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E3E3DE] flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#6B665F]">
                  Dimension: <strong className="text-[#1A1612] capitalize">{activeEv.dimensionId}</strong>
                </span>
                <a
                  href={matchedCap.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1A1612] hover:underline whitespace-nowrap shrink-0"
                >
                  <span>Verify in docs.iomete.com</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#6B665F] p-4">Select a workflow node to inspect its source evidence.</div>
          )}
        </div>
      </div>
    </div>
  );
};
