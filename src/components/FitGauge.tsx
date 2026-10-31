import React from 'react';
import {
  ConfidenceLevel,
  DisqualifierFlag,
  UnknownGap,
  VerdictBand
} from '../types/analyzer';

interface FitGaugeProps {
  isInsufficientInfo: boolean;
  scoredDimensionsCount: number;
  score: number | null;
  rawComputedScore: number | null;
  verdictBand: VerdictBand;
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;
  oneSentenceReason: string;
  plainLanguageExplanation: string[];
  disqualifiers: DisqualifierFlag[];
  unknownsGaps: UnknownGap[];
}

export const FitGauge: React.FC<FitGaugeProps> = ({
  isInsufficientInfo,
  scoredDimensionsCount,
  score,
  rawComputedScore,
  verdictBand,
  confidenceLevel,
  confidenceScore,
  oneSentenceReason,
  plainLanguageExplanation,
  disqualifiers,
  unknownsGaps
}) => {
  const radius = 66;
  const circumference = 2 * Math.PI * radius;
  const numericScore = !isInsufficientInfo && score !== null ? score : 0;
  const strokeDashoffset =
    !isInsufficientInfo && score !== null
      ? circumference - (numericScore / 100) * circumference
      : circumference;

  const getGaugeStrokeColor = () => {
    if (isInsufficientInfo || score === null) return '#a3a39c';
    switch (verdictBand) {
      case 'Strong fit':
        return '#2D382D';
      case 'Possible fit':
        return '#b45309';
      case 'Weak fit':
      case 'Not a fit':
        return '#bf000f';
      default:
        return '#a3a39c';
    }
  };

  // Helper to turn inline (https://iomete.com/...) URLs into clickable sourced links and highlight [ev_...] citations
  const renderTextWithDocLinks = (sentence: string) => {
    const parts = sentence.split(/(\(https:\/\/[^\s)]+\)|\[ev_[a-z0-9_,\s]+\])/gi);
    return parts.map((part, i) => {
      if (/^\(https:\/\//i.test(part)) {
        const url = part.slice(1, -1);
        const pathSlug = url.replace(/^https:\/\/(www\.)?iomete\.com\//i, 'iomete.com/');
        return (
          <React.Fragment key={i}>
            {' ('}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-[#2D382D] underline underline-offset-2 hover:text-[#121212]"
            >
              {pathSlug}
            </a>
            {')'}
          </React.Fragment>
        );
      }
      if (/^\[ev_/i.test(part)) {
        return (
          <span
            key={i}
            className="font-mono text-xs text-[#2D382D] bg-[#E8ECE8] px-1.5 py-0.5 mr-1.5 border border-[#2D382D]/20"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8 flex flex-col justify-between h-full">
      <div>
        {/* Architectural Kicker & Metadata Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#e1e1da] mb-6 font-mono text-xs text-[#66665f]">
          <span>( Verdict Card · Section 01 )</span>
          <span className="tabular-nums">
            Scored Dimensions: <strong className="text-[#121212]">{scoredDimensionsCount}/7</strong>
            {' · '}
            Confidence: <strong className="text-[#121212]">{confidenceLevel} ({confidenceScore}%)</strong>
            {!isInsufficientInfo && rawComputedScore !== null && (
              <>
                {' · '}
                Raw Math: <strong className="text-[#2D382D]">{rawComputedScore}/100</strong>
              </>
            )}
          </span>
        </div>

        {/* Main Gauge + Verdict Split */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 pb-6 border-b border-[#e1e1da]">
          {/* Circular Architectural Gauge - hides gauge number when Insufficient information */}
          <div className="relative flex flex-col items-center justify-center shrink-0">
            <svg
              className="w-40 h-40 transform -rotate-90"
              aria-label={
                isInsufficientInfo || score === null
                  ? 'Insufficient information - score hidden'
                  : `Overall fit score ${score} out of 100`
              }
            >
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#ebebe5"
                strokeWidth="8"
                fill="transparent"
              />
              {!isInsufficientInfo && score !== null && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={getGaugeStrokeColor()}
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="butt"
                  fill="transparent"
                  className="transition-all duration-500 ease-out"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
              {isInsufficientInfo || score === null ? (
                <>
                  <span
                    data-testid="gauge-insufficient-label"
                    className="font-mono text-xs uppercase tracking-wider text-[#b45309] font-medium"
                  >
                    Insufficient
                  </span>
                  <span className="font-mono text-[10px] text-[#66665f] mt-1">
                    Information
                  </span>
                </>
              ) : (
                <>
                  <span
                    data-testid="gauge-score-value"
                    className="font-display text-5xl font-normal tracking-[-0.04em] text-[#121212] tabular-nums"
                  >
                    {score}
                  </span>
                  <span className="font-mono text-[10px] text-[#66665f] mt-0.5">
                    FIT / 100
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Verdict Text - No fixed per-band text; uses dynamic evidence-driven headline */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="font-mono text-xs text-[#2D382D] font-medium">
              {isInsufficientInfo ? (
                <span className="text-[#b45309]">
                  Status: Insufficient information ({scoredDimensionsCount}/7 dimensions have evidence · {confidenceScore}% confidence)
                </span>
              ) : (
                <span>
                  Verdict Band: {verdictBand} · Confidence: {confidenceLevel} ({confidenceScore}%)
                </span>
              )}
            </div>

            <h3
              data-testid="verdict-headline"
              className="font-display text-xl sm:text-2xl font-normal tracking-[-0.02em] text-[#121212] leading-[1.2]"
            >
              {oneSentenceReason}
            </h3>
          </div>
        </div>

        {/* If Insufficient Information (<4 of 7 dimensions or <40% confidence), show Discovery Questions needed to fill each gap */}
        {isInsufficientInfo ? (
          <div className="pt-6 space-y-3" data-testid="insufficient-info-discovery-box">
            <p className="font-mono text-xs text-[#b45309] font-medium">
              Discovery questions required to unlock a fit score (at least 4 of 7 dimensions & 40%+ confidence required):
            </p>
            <div className="space-y-2.5 text-sm text-[#121212] leading-relaxed">
              {unknownsGaps.map((gap, idx) => (
                <div
                  key={gap.id}
                  className="p-3 bg-[#fdfaf3] border border-[#e6d5b8] text-xs space-y-1"
                >
                  <div className="font-mono text-[11px] text-[#b45309] font-medium">
                    0{idx + 1} / [{gap.priority}] {gap.title}
                  </div>
                  <p className="text-[#2c2c2a]">{gap.missingInfo}</p>
                  <p className="font-medium text-[#121212]">
                    Ask: "{gap.discoveryQuestion}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Evidence-Only Why This Verdict Bullets (Bug #1: every bullet cites evidence IDs and only measured dimensions) */
          <div className="pt-6 space-y-3">
            <p className="font-mono text-xs text-[#66665f]">
              Why this verdict (generated strictly from input evidence items with [ev_id] & doc citations):
            </p>
            <div className="space-y-2.5 text-sm text-[#121212] leading-relaxed" data-testid="why-verdict-bullets">
              {plainLanguageExplanation.map((sentence, idx) => (
                <p key={idx}>
                  <span className="font-mono text-xs text-[#66665f] mr-2">0{idx + 1} /</span>
                  {renderTextWithDocLinks(sentence)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disqualifier Box (PRD Section 5.2) */}
      {!isInsufficientInfo && disqualifiers.length > 0 && (
        <div className="mt-6 p-5 bg-[#fef2f2] border border-[#ffcaca] space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs text-[#bf000f] font-medium">
            <span>Disqualifier Cap Active (PRD Rule 5.2)</span>
            <span>Verdict Capped at: {verdictBand}</span>
          </div>
          {disqualifiers.map((disq) => (
            <div key={disq.id} className="text-xs text-[#121212] space-y-1">
              <p className="font-medium text-[#bf000f]">
                {disq.title} - {disq.triggeredBecause}
              </p>
              <p className="text-[#2c2c2a] leading-relaxed">
                {disq.impactOnVerdict}
              </p>
              <p className="font-mono text-[11px] text-[#121212] pt-1">
                Honest Recommendation: {disq.honestRecommendation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
