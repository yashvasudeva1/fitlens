import React from 'react';
import { ExternalLink } from 'lucide-react';
import { AnalysisResult } from '../types/analyzer';

interface TopUseCasesProps {
  topUseCases: AnalysisResult['topUseCases'];
}

export const TopUseCases: React.FC<TopUseCasesProps> = ({ topUseCases }) => {
  return (
    <section className="bg-white border border-[#dcdcd5] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between pb-6 border-b border-[#e1e1da] mb-6 gap-4">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-1.5">
            ( 04 / Ranked Use Cases & Prospect Quotes )
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#121212]">
            Top use cases grounded in the company’s own words.
          </h3>
        </div>
        <span className="font-mono text-xs text-[#2D382D]">
          Every claim paired with verbatim input quote + doc link
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topUseCases.map((useCase) => (
          <article
            key={useCase.rank}
            className="p-6 border border-[#e1e1da] bg-[#f8f8f5] flex flex-col justify-between gap-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs text-[#66665f]">
                <span>0{useCase.rank} / Priority Use Case</span>
                <span className="text-[#2D382D]">[{useCase.evidenceType}]</span>
              </div>

              <h4 className="font-display text-xl font-normal tracking-[-0.02em] text-[#121212] leading-snug">
                {useCase.title}
              </h4>

              <div className="p-3.5 bg-white border border-[#dcdcd5] text-xs text-[#2c2c2a] space-y-1">
                <p className="font-mono text-[10px] text-[#66665f]">
                  [Stated] Quoted from Prospect Input:
                </p>
                <p className="italic text-[#121212] leading-relaxed">
                  {useCase.prospectQuote}
                </p>
              </div>

              <p className="text-xs text-[#2c2c2a] leading-relaxed">
                <strong className="text-[#121212]">Why it maps: </strong>
                {useCase.rationale}
              </p>
            </div>

            <div className="pt-3 border-t border-[#e1e1da]">
              <p className="font-mono text-[10px] text-[#66665f] mb-1">
                Matched Capability [Sourced]:
              </p>
              <a
                href={useCase.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between w-full font-mono text-xs text-[#2D382D] hover:text-[#121212] underline underline-offset-4"
              >
                <span className="truncate">{useCase.iometeCapability}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
