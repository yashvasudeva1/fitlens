import React from 'react';
import { RotateCcw, ExternalLink } from 'lucide-react';
import { DimensionId, DimensionScore } from '../types/analyzer';

interface WhatIfSlidersProps {
  dimensions: Record<DimensionId, DimensionScore>;
  onWeightChange: (dimId: DimensionId, newWeight: number) => void;
  onResetWeights: () => void;
}

export const WhatIfSliders: React.FC<WhatIfSlidersProps> = ({
  dimensions,
  onWeightChange,
  onResetWeights
}) => {
  const dimKeys = Object.keys(dimensions) as DimensionId[];
  const totalWeight = dimKeys.reduce((acc, k) => acc + dimensions[k].userWeight, 0);
  const measuredWeight = dimKeys.reduce(
    (acc, k) =>
      dimensions[k].status === 'measured' && dimensions[k].score !== null
        ? acc + dimensions[k].userWeight
        : acc,
    0
  );

  return (
    <div id="rubric-section" className="bg-white border border-[#dcdcd5] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between pb-6 border-b border-[#e1e1da] mb-6 gap-4">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-1.5">
            ( 02 / Visible Scoring Rubric & What-If Weights )
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#121212]">
            Transparent math: change any weight and watch the score move.
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[#66665f] tabular-nums">
            Configured Weight: <strong className="text-[#121212]">{totalWeight}%</strong>
            {' · '}
            Scored Denominator: <strong className="text-[#2D382D]">{measuredWeight}%</strong>
          </span>
          <button
            type="button"
            onClick={onResetWeights}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] hover:bg-[#E8ECE8] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Weights</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dimKeys.map((dimId, idx) => {
          const dim = dimensions[dimId];
          const isNotScored = dim.status === 'not_scored' || dim.score === null;

          return (
            <div
              key={dimId}
              className="p-5 border border-[#e1e1da] bg-[#f8f8f5] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <label
                    htmlFor={`slider-${dimId}`}
                    className="font-display text-lg font-medium text-[#121212]"
                  >
                    <span className="font-mono text-xs text-[#66665f] mr-1.5">0{idx + 1} /</span>
                    {dim.name}
                  </label>
                  <div className="font-mono text-xs tabular-nums text-[#66665f]">
                    {isNotScored ? (
                      <span
                        data-testid={`dim-status-${dimId}`}
                        className="text-[#b45309] font-medium"
                      >
                        Not scored (Excluded)
                      </span>
                    ) : (
                      <span data-testid={`dim-status-${dimId}`}>
                        Score: <strong className="text-[#121212]">{dim.score}/100</strong>
                      </span>
                    )}
                    {' · '}
                    Weight: <strong className="text-[#2D382D]">{dim.userWeight}%</strong>
                  </div>
                </div>

                <p className="text-xs text-[#66665f] mb-3">
                  {dim.whyItMatters}
                </p>

                <div className="flex items-center gap-3 mb-3">
                  <input
                    id={`slider-${dimId}`}
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    aria-label={`${dim.name} weight percentage`}
                    value={dim.userWeight}
                    onChange={(e) => onWeightChange(dimId, parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[#dcdcd5] appearance-none cursor-pointer accent-[#2D382D]"
                  />
                  <span className="w-10 text-right font-mono text-xs text-[#2D382D] font-medium tabular-nums shrink-0">
                    {dim.userWeight}%
                  </span>
                </div>
              </div>

              {/* Evidence or Gap summary */}
              <div className="pt-3 border-t border-[#e1e1da] text-xs">
                {dim.evidence.length > 0 ? (
                  <div className="space-y-1">
                    <div className="font-mono text-[11px] text-[#66665f] flex flex-wrap items-center gap-1.5">
                      <span className="text-[#2D382D] font-medium">
                        [{dim.evidence.map(e => e.id).join(', ')}]
                      </span>
                      <span className="text-[#121212] font-medium">[{dim.evidence[0].sourceType}]</span>
                      <span>·</span>
                      <span>Strength: {dim.evidence[0].strength}</span>
                      {dim.evidence[0].capabilityDocUrl && (
                        <>
                          <span>·</span>
                          <a
                            href={dim.evidence[0].capabilityDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[#2D382D] underline underline-offset-2"
                          >
                            <span>{dim.evidence[0].capabilityName}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                    <p className="text-[#2c2c2a] leading-relaxed">
                      <span className="font-mono text-[11px] text-[#66665f]">
                        "{dim.evidence[0].sourceText}" ({dim.evidence[0].sourceLine}) -{' '}
                      </span>
                      {dim.evidence[0].explanation}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#b45309]">
                    <strong>Not scored (no evidence in input):</strong> {dim.gaps[0]} Ask: <em>"{dim.discoveryQuestion}"</em>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-[#e1e1da] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#66665f]">
        <span>Formula: Weighted Average = Σ(Score × Weight) / Σ(Scored Weights)</span>
        <span className="text-[#2D382D]">No evidence = Not scored (excluded from average, never counted as 0)</span>
      </div>
    </div>
  );
};
