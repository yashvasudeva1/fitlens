import React from 'react';
import { AnalysisResult } from '../types/analyzer';

interface FlourishBreakdownChartsProps {
  analysis: AnalysisResult;
}

export const FlourishBreakdownCharts: React.FC<FlourishBreakdownChartsProps> = ({ analysis }) => {
  const { flourishBreakdown, meta, dimensions } = analysis;
  const { divergingDimensions, workloadPillars, tcoTrajectory } = flourishBreakdown;

  // Compute SVG coordinates for the 36-Month TCO Trajectory Chart
  const maxTcoVal = Math.max(
    10,
    ...tcoTrajectory.months.map(m => Math.max(m.incumbentCumulativeK, m.iometeCumulativeK))
  );

  const svgWidth = 540;
  const svgHeight = 230;
  const padLeft = 54;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 36;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (idx: number) =>
    padLeft + (idx / Math.max(1, tcoTrajectory.months.length - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - (Math.min(val, maxTcoVal) / maxTcoVal) * plotH;

  const incumbentPoints = tcoTrajectory.months
    .map((m, i) => `${getX(i).toFixed(1)},${getY(m.incumbentCumulativeK).toFixed(1)}`)
    .join(' ');

  const iometePoints = tcoTrajectory.months
    .map((m, i) => `${getX(i).toFixed(1)},${getY(m.iometeCumulativeK).toFixed(1)}`)
    .join(' ');

  const areaPolygonPoints = [
    ...tcoTrajectory.months.map((m, i) => `${getX(i).toFixed(1)},${getY(m.incumbentCumulativeK).toFixed(1)}`),
    ...[...tcoTrajectory.months]
      .reverse()
      .map((m, revIdx) => {
        const i = tcoTrajectory.months.length - 1 - revIdx;
        return `${getX(i).toFixed(1)},${getY(m.iometeCumulativeK).toFixed(1)}`;
      })
  ].join(' ');

  // Provenance stacked bar calculations
  const totalEvidenceCount = Math.max(1, meta.statedCount + meta.sourcedCount + meta.assumedCount);
  const statedPct = Math.round((meta.statedCount / totalEvidenceCount) * 100);
  const sourcedPct = Math.round((meta.sourcedCount / totalEvidenceCount) * 100);
  const assumedPct = Math.max(0, 100 - statedPct - sourcedPct);

  const measuredDimsCount = Object.values(dimensions).filter(
    d => d.status === 'measured' && d.score !== null
  ).length;
  const notScoredDimsCount = 7 - measuredDimsCount;

  return (
    <section id="flourish-charts-section" className="py-6 space-y-8">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-2">
            ( 02 / Flourish vs. Friction Multi-Chart Diagnostic )
          </p>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-normal leading-[1.06] tracking-[-0.03em] text-[#121212]">
            Why {analysis.companyName} will flourish - or struggle - with IOMETE.
          </h2>
        </div>
        <p className="font-mono text-xs text-[#66665f] max-w-md">
          Four structural views isolating growth catalysts, operational drag, 36-month compute economics, and workload readiness.
        </p>
      </div>

      {/* Executive Flourish Summary & Catalyst / Risk Columns */}
      <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8 space-y-6">
        <div className="pb-5 border-b border-[#e1e1da]">
          <p className="font-mono text-xs text-[#2D382D] mb-2">
            Architectural Flourish Thesis
          </p>
          <p className="font-display text-lg sm:text-xl text-[#121212] leading-snug">
            {flourishBreakdown.flourishVerdictSummary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-[#f8f8f5] border border-[#e1e1da]">
            <p className="font-mono text-xs text-[#2D382D] font-medium mb-3">
              Primary Flourish Catalysts (Why They Succeed)
            </p>
            <ul className="space-y-2.5 text-xs text-[#2c2c2a] leading-relaxed">
              {flourishBreakdown.primaryFlourishDrivers.slice(0, 4).map((driver, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="font-mono text-[#2D382D] font-medium shrink-0">0{i + 1}.</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 bg-[#f8f8f5] border border-[#e1e1da]">
            <p className="font-mono text-xs text-[#bf000f] font-medium mb-3">
              Primary Friction & Adoption Risks (What Could Derail)
            </p>
            <ul className="space-y-2.5 text-xs text-[#2c2c2a] leading-relaxed">
              {flourishBreakdown.primaryFailureRisks.slice(0, 4).map((risk, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="font-mono text-[#bf000f] font-medium shrink-0">0{i + 1}.</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Row 1 of Charts: Chart A (Diverging Flourish vs Friction) & Chart B (36-Month TCO Curve) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CHART A: Diverging Horizontal Bar Chart */}
        <div className="lg:col-span-6 bg-white border border-[#dcdcd5] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-4 mb-5 border-b border-[#e1e1da]">
              <div>
                <p className="font-mono text-xs text-[#66665f]">Chart A · Directional Force Balance</p>
                <h3 className="font-display text-lg font-medium text-[#121212]">
                  Flourish Catalysts vs. Friction Drag by Dimension
                </h3>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-[#bf000f]">← Friction</span>
                <span className="text-[#2D382D]">Flourish →</span>
              </div>
            </div>

            <div className="space-y-4">
              {divergingDimensions.map((item) => {
                const isNotScored = item.status === 'not_scored';
                const netLabel = isNotScored
                  ? 'Not scored'
                  : item.netScore >= 0
                  ? `+${item.netScore}`
                  : `${item.netScore}`;
                return (
                  <div key={item.dimensionId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#121212] font-medium">
                        {item.shortName}{' '}
                        <span className="text-[#66665f] font-normal">({item.weight}%)</span>
                      </span>
                      <span
                        className={`tabular-nums font-medium ${
                          isNotScored
                            ? 'text-[#b45309]'
                            : item.netScore >= 20
                            ? 'text-[#2D382D]'
                            : item.netScore < 0
                            ? 'text-[#bf000f]'
                            : 'text-[#66665f]'
                        }`}
                      >
                        {isNotScored ? 'Not scored' : `Net ${netLabel}`}
                      </span>
                    </div>

                    {/* Diverging Bar Track */}
                    <div className="grid grid-cols-2 items-center h-4 bg-[#f5f5f1] border border-[#e1e1da] relative">
                      {/* Left Half: Friction Drag extending left from center line */}
                      <div className="h-full flex justify-end items-center pr-0.5 border-r border-[#121212]/40">
                        <div
                          style={{ width: `${Math.min(100, item.frictionDrag)}%` }}
                          className="h-2.5 bg-[#bf000f]/75 transition-all duration-300"
                          title={`Friction Drag: -${item.frictionDrag}`}
                        />
                      </div>

                      {/* Right Half: Flourish Catalyst extending right from center line */}
                      <div className="h-full flex justify-start items-center pl-0.5">
                        <div
                          style={{ width: `${Math.min(100, item.flourishCatalyst)}%` }}
                          className="h-2.5 bg-[#2D382D] transition-all duration-300"
                          title={`Flourish Catalyst: +${item.flourishCatalyst}`}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#66665f] truncate" title={item.driverSummary}>
                      {item.driverSummary}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-5 border-t border-[#e1e1da] flex items-center justify-between font-mono text-[11px] text-[#66665f]">
            <span>Center axis = Neutral (0)</span>
            <span>Right (#2D382D) = Lakehouse Value · Left = Fit Drag</span>
          </div>
        </div>

        {/* CHART B: 36-Month Cumulative Compute & Platform TCO Trajectory */}
        <div className="lg:col-span-6 bg-white border border-[#dcdcd5] p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-[#e1e1da]">
              <div>
                <p className="font-mono text-xs text-[#66665f]">Chart B · 36-Month Infrastructure Economics</p>
                <h3 className="font-display text-lg font-medium text-[#121212]">
                  Cumulative Spend: Cloud Credit Markup vs. IOMETE Zero-Markup
                </h3>
              </div>
              <span className="font-mono text-[11px] text-[#2D382D]">
                {tcoTrajectory.unitLabel}
              </span>
            </div>

            <div className="my-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="36-Month Cumulative TCO Comparison Line Chart"
              >
                {/* Horizontal Reference Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = padTop + plotH - ratio * plotH;
                  const val = Math.round(ratio * maxTcoVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke="#e1e1da"
                        strokeDasharray={idx === 0 ? undefined : '3,3'}
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 3}
                        textAnchor="end"
                        className="font-mono text-[10px]"
                        fill="#66665f"
                      >
                        ${val}K
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Delta Area between Incumbent and IOMETE */}
                <polygon
                  points={areaPolygonPoints}
                  fill={
                    tcoTrajectory.isSubScaleWarning
                      ? 'rgba(191, 0, 15, 0.08)'
                      : 'rgba(45, 56, 45, 0.12)'
                  }
                />

                {/* Incumbent Line (Dashed Graphite) */}
                <polyline
                  fill="none"
                  stroke="#66665f"
                  strokeWidth="2"
                  strokeDasharray="5,4"
                  points={incumbentPoints}
                />

                {/* IOMETE Line (Solid #2D382D or Red if Sub-Scale Warning) */}
                <polyline
                  fill="none"
                  stroke={tcoTrajectory.isSubScaleWarning ? '#bf000f' : '#2D382D'}
                  strokeWidth="2.5"
                  points={iometePoints}
                />

                {/* Data Points & X-Axis Labels */}
                {tcoTrajectory.months.map((m, i) => {
                  const x = getX(i);
                  const yInc = getY(m.incumbentCumulativeK);
                  const yIom = getY(m.iometeCumulativeK);
                  return (
                    <g key={m.month}>
                      <circle cx={x} cy={yInc} r="3.2" fill="#66665f" />
                      <circle
                        cx={x}
                        cy={yIom}
                        r="3.8"
                        fill={tcoTrajectory.isSubScaleWarning ? '#bf000f' : '#2D382D'}
                      />
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className="font-mono text-[10px]"
                        fill="#121212"
                      >
                        {m.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legend & M36 Comparison Readout */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-[#f8f8f5] border border-[#e1e1da] text-xs font-mono mt-3">
              <div>
                <span className="text-[#66665f] block text-[11px]">
                  Incumbent 36-Mo Cumulative
                </span>
                <strong className="text-sm text-[#121212] tabular-nums">
                  ${tcoTrajectory.months[tcoTrajectory.months.length - 1]?.incumbentCumulativeK}K
                </strong>
              </div>
              <div>
                <span className="text-[#66665f] block text-[11px]">
                  IOMETE K8s 36-Mo Cumulative
                </span>
                <strong
                  className={`text-sm tabular-nums ${
                    tcoTrajectory.isSubScaleWarning ? 'text-[#bf000f]' : 'text-[#2D382D]'
                  }`}
                >
                  ${tcoTrajectory.months[tcoTrajectory.months.length - 1]?.iometeCumulativeK}K
                </strong>
              </div>
            </div>
          </div>

          <p className="pt-4 mt-4 border-t border-[#e1e1da] text-xs text-[#2c2c2a] leading-relaxed">
            {tcoTrajectory.summaryNote}
          </p>
        </div>
      </div>

      {/* Row 2 of Charts: Chart C (Workload Pillar Fit Matrix) & Chart D (Evidence Provenance & Readiness) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* CHART C: Workload Demand vs. IOMETE Architectural Fit */}
        <div className="lg:col-span-7 bg-white border border-[#dcdcd5] p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-[#e1e1da]">
              <div>
                <p className="font-mono text-xs text-[#66665f]">Chart C · Technical Architecture Alignment</p>
                <h3 className="font-display text-lg font-medium text-[#121212]">
                  Prospect Workload Demand vs. IOMETE Platform Fit
                </h3>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-[#66665f]">
                  <span className="w-2.5 h-2.5 bg-[#9e9e95] inline-block" /> Demand
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#2D382D]">
                  <span className="w-2.5 h-2.5 bg-[#2D382D] inline-block" /> IOMETE Fit
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {workloadPillars.map((pillar) => (
                <div key={pillar.pillar} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#121212] font-medium">{pillar.pillar}</span>
                    <span className="tabular-nums text-[#66665f]">
                      Demand: <strong className="text-[#121212]">{pillar.prospectDemand}%</strong> · Fit:{' '}
                      <strong className="text-[#2D382D]">{pillar.iometeFit}%</strong>
                    </span>
                  </div>

                  {/* Dual comparative horizontal bars */}
                  <div className="space-y-1">
                    <div className="w-full h-2 bg-[#f5f5f1] border border-[#e1e1da]">
                      <div
                        style={{ width: `${pillar.prospectDemand}%` }}
                        className="h-full bg-[#9e9e95] transition-all duration-300"
                      />
                    </div>
                    <div className="w-full h-2.5 bg-[#f5f5f1] border border-[#e1e1da]">
                      <div
                        style={{ width: `${pillar.iometeFit}%` }}
                        className="h-full bg-[#2D382D] transition-all duration-300"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-[#66665f]">{pillar.verdictNote}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CHART D: Evidence Provenance & Qualification Signal Completeness */}
        <div className="lg:col-span-5 bg-white border border-[#dcdcd5] p-6 flex flex-col justify-between space-y-6">
          <div>
            <div className="pb-4 mb-5 border-b border-[#e1e1da]">
              <p className="font-mono text-xs text-[#66665f]">Chart D · Grounding & Epistemic Hygiene</p>
              <h3 className="font-display text-lg font-medium text-[#121212]">
                Claim Provenance & Rubric Coverage Breakdown
              </h3>
            </div>

            {/* Stacked Horizontal Composition Bar for [Stated] / [Sourced] / [Assumed] */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#121212] font-medium">Statement Label Distribution</span>
                <span className="text-[#2D382D] tabular-nums">{meta.citationCoveragePercent}% Sourced Coverage</span>
              </div>

              <div className="w-full h-6 bg-[#f5f5f1] border border-[#dcdcd5] flex overflow-hidden">
                <div
                  style={{ width: `${statedPct}%` }}
                  className="h-full bg-[#121212] transition-all duration-300"
                  title={`[Stated]: ${meta.statedCount} (${statedPct}%)`}
                />
                <div
                  style={{ width: `${sourcedPct}%` }}
                  className="h-full bg-[#2D382D] transition-all duration-300"
                  title={`[Sourced]: ${meta.sourcedCount} (${sourcedPct}%)`}
                />
                <div
                  style={{ width: `${assumedPct}%` }}
                  className="h-full bg-[#c8c8bf] transition-all duration-300"
                  title={`[Assumed]: ${meta.assumedCount} (${assumedPct}%)`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-[11px]">
                <div className="p-2.5 bg-[#f8f8f5] border border-[#e1e1da]">
                  <span className="inline-block w-2 h-2 bg-[#121212] mr-1.5" />
                  <span className="text-[#66665f]">[Stated]</span>
                  <p className="text-sm font-medium text-[#121212] mt-0.5 tabular-nums">
                    {meta.statedCount} ({statedPct}%)
                  </p>
                </div>
                <div className="p-2.5 bg-[#f8f8f5] border border-[#e1e1da]">
                  <span className="inline-block w-2 h-2 bg-[#2D382D] mr-1.5" />
                  <span className="text-[#66665f]">[Sourced]</span>
                  <p className="text-sm font-medium text-[#2D382D] mt-0.5 tabular-nums">
                    {meta.sourcedCount} ({sourcedPct}%)
                  </p>
                </div>
                <div className="p-2.5 bg-[#f8f8f5] border border-[#e1e1da]">
                  <span className="inline-block w-2 h-2 bg-[#c8c8bf] mr-1.5" />
                  <span className="text-[#66665f]">[Assumed]</span>
                  <p className="text-sm font-medium text-[#121212] mt-0.5 tabular-nums">
                    {meta.assumedCount} ({assumedPct}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Rubric Dimension Signal Completeness Meter */}
            <div className="space-y-2 pt-4 border-t border-[#e1e1da]">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#121212] font-medium">Scored vs. Not Scored Dimensions</span>
                <span className="tabular-nums text-[#2D382D]">{measuredDimsCount} / 7 Scored</span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {Object.values(dimensions).map((dim) => (
                  <div
                    key={dim.dimensionId}
                    className={`h-8 border flex flex-col items-center justify-center font-mono text-[10px] tabular-nums ${
                      dim.status === 'measured' && dim.score !== null
                        ? 'bg-[#E8ECE8] border-[#2D382D] text-[#2D382D] font-medium'
                        : 'bg-[#f5f5f1] border-[#dcdcd5] text-[#66665f]'
                    }`}
                    title={`${dim.name}: ${
                      dim.status === 'measured' && dim.score !== null ? `${dim.score}/100` : 'Not scored'
                    }`}
                  >
                    <span>
                      {dim.status === 'measured' && dim.score !== null ? dim.score : 'N/S'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#66665f] pt-1">
                {notScoredDimsCount === 0
                  ? 'All 7 structural dimensions contain explicit evidence; 0 dimensions excluded from average.'
                  : `${notScoredDimsCount} dimension(s) had no evidence, are marked "not scored", and are excluded from the average.`}
              </p>
            </div>
          </div>

          {/* Multi-Model Pipeline Execution Badge */}
          <div className="p-3.5 bg-[#ebebe5] border border-[#dcdcd5] font-mono text-[11px] text-[#2c2c2a] space-y-1">
            <p className="text-[#2D382D] font-medium">Active Gemini & Scoring Pipeline:</p>
            {(meta.geminiModelsUsed || ['Deterministic Rubric Engine v2.1']).map((m, idx) => (
              <p key={idx} className="truncate">
                · {m}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
