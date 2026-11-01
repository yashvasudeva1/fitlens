import React, { useState } from 'react';
import { CAPABILITY_MAP, FitDimensionId } from '../data/iometeCapabilities';
import { SampleCompanyAnalysis } from '../data/sampleCompanies';
import { DEFAULT_DIMENSIONS, FitScoreResult } from '../utils/scoringEngine';
import { ExternalLink, HelpCircle, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface StandingWatchDimensionsSectionProps {
  company: SampleCompanyAnalysis;
  scoreResult: FitScoreResult;
  weights: Record<FitDimensionId, number>;
  onUpdateWeight: (dimId: FitDimensionId, value: number) => void;
}

export const StandingWatchDimensionsSection: React.FC<StandingWatchDimensionsSectionProps> = ({
  company,
  scoreResult,
  weights,
  onUpdateWeight
}) => {
  const [selectedDimId, setSelectedDimId] = useState<FitDimensionId>('sovereignty');

  const activeDimSpec =
    DEFAULT_DIMENSIONS.find((d) => d.id === selectedDimId) || DEFAULT_DIMENSIONS[0];
  const activeDimScore =
    scoreResult.dimensionScores.find((d) => d.dimensionId === selectedDimId) ||
    scoreResult.dimensionScores[0];
  const dimUnknowns = company.unknowns.filter((u) => u.dimensionId === selectedDimId);

  return (
    <section
      id="rubric"
      aria-labelledby="standing-watch-rubric-heading"
      className="py-20 lg:py-28 bg-[#F5F4F0] border-b border-[#E3E3DE]"
    >
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Top Split Heading (Replicating Forge's "Standing watch, around the clock" layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-12 border-b border-[#E3E3DE]">
          <div className="lg:col-span-7">
            <div className="text-xs font-mono-tabular text-[#6B665F] mb-3">
              02. Seven-Dimension Rubric &amp; Evidence Inspector
            </div>
            <h2
              id="standing-watch-rubric-heading"
              className="font-serif-display text-3xl sm:text-5xl font-normal tracking-tight text-[#1A1612] leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Transparent math across seven lakehouse dimensions.
            </h2>
          </div>
          <div className="lg:col-span-5 flex flex-col items-start gap-3">
            <p className="text-sm text-[#524E48] leading-relaxed">
              Every dimension inspects tagged evidence from <strong className="text-[#1A1612]">{company.name}</strong>. Select any dimension tab below to inspect its exact `.md` quotes, IOMETE doc links, weight slider, or missing discovery questions.
            </p>
          </div>
        </div>

        {/* Forge-Style Interactive Vertical Tablist + Graphic Tabpanel */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Cols: 7 Dimension Tabs */}
          <div
            role="tablist"
            aria-label="Seven Lakehouse Fit Dimensions"
            className="lg:col-span-5 flex flex-col divide-y divide-[#E3E3DE] border border-[#E3E3DE] rounded-2xl bg-[#FAF9F6] overflow-hidden"
          >
            {scoreResult.dimensionScores.map((dim) => {
              const isSelected = dim.dimensionId === selectedDimId;
              const isUnknown = dim.status === 'unknown';
              const spec = DEFAULT_DIMENSIONS.find((s) => s.id === dim.dimensionId)!;

              return (
                <button
                  key={dim.dimensionId}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => setSelectedDimId(dim.dimensionId)}
                  className={`w-full text-left p-4 transition-colors flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#1A1612] text-[#F5F4F0]'
                      : 'hover:bg-[#F3F3EE] text-[#1A1612]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{dim.name}</div>
                    <div
                      className={`text-xs truncate mt-0.5 ${
                        isSelected ? 'text-[#A8A49C]' : 'text-[#6B665F]'
                      }`}
                    >
                      {spec.whatItAsks}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono-tabular">
                    <div
                      className={`text-sm font-semibold ${
                        isUnknown
                          ? 'text-[#D9733A]'
                          : isSelected
                          ? 'text-[#8CE0A1]'
                          : 'text-[#1A1612]'
                      }`}
                    >
                      {isUnknown ? 'UNKNOWN' : `${dim.score}/100`}
                    </div>
                    <div
                      className={`text-[11px] ${
                        isSelected ? 'text-[#A8A49C]' : 'text-[#6B665F]'
                      }`}
                    >
                      Weight {dim.weight}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right 7 Cols: Graphic Tabpanel Inspector */}
          <div
            role="tabpanel"
            className="lg:col-span-7 rounded-2xl bg-[#FAF9F6] border border-[#E3E3DE] p-6 lg:p-8 flex flex-col justify-between gap-6"
          >
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E3E3DE]">
                <div>
                  <span className="font-mono-tabular text-xs text-[#6B665F] uppercase">
                    Dimension Inspector · Default Weight {activeDimSpec.defaultWeight}%
                  </span>
                  <h3 className="text-xl font-semibold text-[#1A1612] mt-0.5">
                    {activeDimSpec.name}
                  </h3>
                </div>
                <div className="font-mono-tabular text-right">
                  <div className="text-2xl font-semibold text-[#1A1612]">
                    {activeDimScore.status === 'unknown'
                      ? 'GAP (Excluded)'
                      : `${activeDimScore.score} / 100`}
                  </div>
                  <div className="text-[11px] text-[#6B665F]">
                    Active share: {activeDimScore.normalizedActiveWeight}% of total score
                  </div>
                </div>
              </div>

              {/* Why it matters & Interactive Slider */}
              <div className="mt-4 p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#3D3934]">
                  <strong className="text-[#1A1612]">Why it matters for IOMETE:</strong>{' '}
                  {activeDimSpec.whyItMatters}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label
                    htmlFor="section-dim-slider"
                    className="font-mono-tabular text-xs text-[#1A1612]"
                  >
                    Weight: {weights[selectedDimId]}%
                  </label>
                  <input
                    id="section-dim-slider"
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={weights[selectedDimId]}
                    onChange={(e) => onUpdateWeight(selectedDimId, Number(e.target.value))}
                    className="w-28 accent-[#1A1612] cursor-pointer"
                  />
                </div>
              </div>

              {/* Evidence List or Unknown Discovery Card */}
              <div className="mt-6 space-y-3">
                <div className="text-xs font-semibold text-[#1A1612]">
                  Tagged Evidence Items from {company.name} ({activeDimScore.evidenceItems.length})
                </div>

                {activeDimScore.evidenceItems.length === 0 ? (
                  <div className="p-5 rounded-xl bg-[#D9733A]/10 border border-dashed border-[#D9733A]">
                    <div className="font-mono-tabular text-xs font-semibold text-[#9C4221]">
                      NO EVIDENCE IN INPUT &rarr; MARKED UNKNOWN &amp; EXCLUDED FROM AVERAGE
                    </div>
                    <p className="text-xs text-[#3D3934] mt-1.5 leading-relaxed">
                      FitLens never substitutes a fake neutral 50 when information is missing. Instead, this dimension is excluded from the score denominator and lowers overall confidence.
                    </p>
                    {dimUnknowns.map((u) => (
                      <div
                        key={u.id}
                        className="mt-3 p-3 rounded-lg bg-white border border-[#E3E3DE] text-xs"
                      >
                        <div className="font-mono-tabular text-[10px] text-[#6B665F]">
                          Ask {u.whoToAsk}:
                        </div>
                        <div className="font-semibold text-[#1A1612] mt-0.5">
                          “{u.discoveryQuestion}”
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  activeDimScore.evidenceItems.map((ev) => {
                    const cap = CAPABILITY_MAP[ev.capabilityId];
                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-xl bg-white border border-[#E3E3DE] flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[#1A1612]">
                            {ev.workflowName}
                          </span>
                          <span
                            className={`font-mono-tabular text-[11px] font-semibold ${
                              ev.direction === 'supports' ? 'text-[#2E6B40]' : 'text-[#D9733A]'
                            }`}
                          >
                            [{ev.label}] · {ev.direction.toUpperCase()} ({ev.strength})
                          </span>
                        </div>
                        <div className="text-xs text-[#524E48] italic">
                          “{ev.mdQuote}”
                        </div>
                        <div className="text-xs text-[#1A1612] pt-2 border-t border-[#E3E3DE] flex items-center justify-between gap-2">
                          <span>{ev.explanation}</span>
                          {cap && (
                            <a
                              href={cap.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono-tabular text-[11px] font-medium text-[#1A1612] hover:underline whitespace-nowrap shrink-0"
                            >
                              <span>{cap.id}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Summary metadata */}
            <div className="pt-4 border-t border-[#E3E3DE] grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-[#6B665F]">Evidence Direction</div>
                <div className="font-mono-tabular font-semibold text-[#1A1612] mt-0.5">
                  +{activeDimScore.supportingCount} supports / -{activeDimScore.hurtingCount} hurts
                </div>
              </div>
              <div>
                <div className="text-[#6B665F]">Unknown Gaps in Dim</div>
                <div className="font-mono-tabular font-semibold text-[#1A1612] mt-0.5">
                  {dimUnknowns.length} gap{dimUnknowns.length === 1 ? '' : 's'}
                </div>
              </div>
              <div>
                <div className="text-[#6B665F]">Rubric Treatment</div>
                <div className="font-mono-tabular font-semibold text-[#1A1612] mt-0.5">
                  {activeDimScore.status === 'unknown' ? 'Excluded from Mean' : 'Weighted in Mean'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
