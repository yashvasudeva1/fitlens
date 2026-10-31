import React from 'react';
import { DimensionId, DimensionScore } from '../types/analyzer';

interface RadarChartProps {
  dimensions: Record<DimensionId, DimensionScore>;
}

export const RadarChart: React.FC<RadarChartProps> = ({ dimensions }) => {
  const dimKeys = Object.keys(dimensions) as DimensionId[];
  const totalAxes = dimKeys.length;

  const size = 320;
  const center = size / 2;
  const maxRadius = 104;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (Math.PI * 2 * index) / totalAxes - Math.PI / 2;
    const r = maxRadius * valueRatio;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const dataPoints = dimKeys.map((dimId, idx) => {
    const dim = dimensions[dimId];
    const isNotScored = dim.status === 'not_scored' || dim.score === null;
    const valueRatio = isNotScored ? 0.08 : Math.max(0.1, (dim.score ?? 0) / 100);
    return getCoordinates(idx, valueRatio);
  });

  const polygonPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const shortLabels: Record<DimensionId, string> = {
    sovereignty_deployment: 'Sovereignty',
    scale_variety: 'Scale & Variety',
    lockin_openness: 'Openness',
    analytics_ai: 'Analytics & AI',
    cost_pressure: 'Cost Pressure',
    tech_readiness: 'Tech Readiness',
    governance_compliance: 'Governance'
  };

  const scoredCount = dimKeys.filter(
    k => dimensions[k].status === 'measured' && dimensions[k].score !== null
  ).length;

  return (
    <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-4 border-b border-[#e1e1da] font-mono text-xs text-[#66665f]">
        <span>( 7-Dimension Radar · Scale 1:100 )</span>
        <span className="text-[#2D382D]">{scoredCount}/7 Scored</span>
      </div>

      <div className="flex items-center justify-center py-4">
        <svg
          width={size}
          height={size}
          className="overflow-visible"
          role="img"
          aria-label="Seven dimension architectural fit radar chart"
        >
          {levels.map((level, lIdx) => {
            const points = dimKeys
              .map((_, idx) => {
                const c = getCoordinates(idx, level);
                return `${c.x},${c.y}`;
              })
              .join(' ');
            return (
              <polygon
                key={lIdx}
                points={points}
                fill="none"
                stroke="#dcdcd5"
                strokeWidth="1"
                strokeDasharray={lIdx === levels.length - 1 ? 'none' : '2,2'}
              />
            );
          })}

          {dimKeys.map((_, idx) => {
            const end = getCoordinates(idx, 1.0);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke="#dcdcd5"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygonPath}
            fill="rgba(45, 56, 45, 0.18)"
            stroke="#2D382D"
            strokeWidth="2"
            className="transition-all duration-500 ease-out"
          />

          {dataPoints.map((pt, idx) => {
            const dim = dimensions[dimKeys[idx]];
            const isNotScored = dim.status === 'not_scored' || dim.score === null;
            return (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill={isNotScored ? '#b45309' : '#2D382D'}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

          {dimKeys.map((dimId, idx) => {
            const dim = dimensions[dimId];
            const isNotScored = dim.status === 'not_scored' || dim.score === null;
            const coord = getCoordinates(idx, 1.27);
            return (
              <g key={idx}>
                <text
                  x={coord.x}
                  y={coord.y - 5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-mono fill-[#121212] font-medium"
                >
                  {shortLabels[dimId]}
                </text>
                <text
                  x={coord.x}
                  y={coord.y + 8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[10px] font-mono fill-[#2D382D] tabular-nums"
                >
                  {isNotScored ? 'Not scored' : `${dim.score}/100`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="pt-4 border-t border-[#e1e1da] flex items-center justify-between font-mono text-xs text-[#66665f]">
        <span>7 Structural Axes</span>
        <span className="tabular-nums text-[#2D382D]">Unscored Excluded from Mean</span>
      </div>
    </div>
  );
};
