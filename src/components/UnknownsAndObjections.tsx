import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AnalysisResult } from '../types/analyzer';

interface UnknownsAndObjectionsProps {
  unknownsGaps: AnalysisResult['unknownsGaps'];
  objectionsAndRisks: AnalysisResult['objectionsAndRisks'];
  competitiveContext: AnalysisResult['competitiveContext'];
}

export const UnknownsAndObjections: React.FC<UnknownsAndObjectionsProps> = ({
  unknownsGaps,
  objectionsAndRisks,
  competitiveContext
}) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Honest Unknowns & Discovery Questions (PRD 7.1 #6) */}
      <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#e1e1da] mb-6 font-mono text-xs text-[#66665f]">
            <span>( 05 / Honest Unknowns & Discovery Questions )</span>
            <span className="text-[#2D382D] tabular-nums">{unknownsGaps.length} Open Gaps</span>
          </div>

          <h3 className="font-display text-2xl font-normal tracking-[-0.03em] text-[#121212] mb-2">
            What we could not tell from the input - and the exact question to ask.
          </h3>
          <p className="text-xs text-[#66665f] mb-6">
            Missing information is treated as a first-class output rather than hidden behind a guessed neutral score.
          </p>

          <div className="space-y-4">
            {unknownsGaps.map((gap, idx) => (
              <div
                key={gap.id}
                className="p-5 border border-[#e1e1da] bg-[#f8f8f5] space-y-2.5"
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-[#121212] font-medium">
                    0{idx + 1} / {gap.title}
                  </span>
                  <span className="text-[#b45309]">Priority {gap.priority}</span>
                </div>

                <p className="text-xs text-[#66665f] leading-relaxed">
                  <strong className="text-[#121212]">Missing Signal:</strong> {gap.missingInfo}
                </p>

                <div className="p-3.5 bg-white border border-[#dcdcd5] text-xs">
                  <p className="font-mono text-[10px] text-[#2D382D] mb-1">
                    Discovery Question to Ask on the Call:
                  </p>
                  <p className="font-display text-base text-[#121212] leading-snug">
                    “{gap.discoveryQuestion}”
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#e1e1da] font-mono text-xs text-[#66665f]">
          Resolving P0 unknowns raises overall confidence from {unknownsGaps.length > 2 ? 'Medium/Low' : 'High'} to Verified
        </div>
      </div>

      {/* Right Column: Likely Objections, Risks & Competitive Context (PRD 7.1 #5 & #7) */}
      <div className="bg-white border border-[#dcdcd5] p-6 sm:p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#e1e1da] mb-6 font-mono text-xs text-[#66665f]">
            <span>( 06 / Objections, Risks & Incumbent Context )</span>
            <span className="text-[#2D382D]">No Attack Lines</span>
          </div>

          <h3 className="font-display text-2xl font-normal tracking-[-0.03em] text-[#121212] mb-2">
            Surface likely objections early - with safe, source-grounded answers.
          </h3>
          <p className="text-xs text-[#66665f] mb-6">
            Includes third-party aggregator comparisons (Snowflake, Databricks, Cloudera) framed as constructive discovery questions.
          </p>

          <div className="space-y-4">
            {objectionsAndRisks.map((obj, idx) => (
              <div key={idx} className="p-5 border border-[#e1e1da] bg-[#f8f8f5] space-y-2.5">
                <div className="flex items-center justify-between font-mono text-xs text-[#66665f]">
                  <span className="text-[#bf000f] font-medium">Likely Objection · {obj.likelihood} Likelihood</span>
                  <span>Concern: {obj.prospectConcern}</span>
                </div>

                <p className="font-display text-base font-medium text-[#121212]">
                  “{obj.objection}”
                </p>

                <div className="p-3.5 bg-white border border-[#dcdcd5] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#2D382D]">
                    <span>Safe, Honest Response:</span>
                    {obj.docUrl && (
                      <a
                        href={obj.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline"
                      >
                        <span>Verify in Docs</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-[#2c2c2a] leading-relaxed">{obj.honestResponse}</p>
                </div>
              </div>
            ))}

            {competitiveContext.map((comp, idx) => (
              <div key={idx} className="p-5 border border-[#e1e1da] bg-white space-y-2">
                <div className="flex items-center justify-between font-mono text-xs text-[#66665f]">
                  <span className="text-[#121212] font-medium">Incumbent Context: {comp.competitor}</span>
                  <span className="text-[#2D382D]">Discovery Framing</span>
                </div>
                <p className="text-xs text-[#2c2c2a] leading-relaxed">
                  {comp.framingStrategy}
                </p>
                <div className="pt-2 space-y-1 text-xs text-[#121212]">
                  {comp.discoveryAngles.map((angle, aIdx) => (
                    <p key={aIdx}>
                      <span className="font-mono text-[#2D382D] mr-1.5">Q{aIdx + 1} /</span>
                      {angle}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#e1e1da] font-mono text-xs text-[#66665f]">
          Third-party claims marked unverified where appropriate per PRD Section 3.2
        </div>
      </div>
    </section>
  );
};
