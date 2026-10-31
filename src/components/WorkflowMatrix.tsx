import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { AnalysisResult } from '../types/analyzer';
import { IOMETE_CAPABILITIES } from '../data/capabilities';

interface WorkflowMatrixProps {
  workflowMatches: AnalysisResult['workflowMatches'];
}

export const WorkflowMatrix: React.FC<WorkflowMatrixProps> = ({ workflowMatches }) => {
  const [filterRating, setFilterRating] = useState<string>('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(workflowMatches[0]?.id || null);

  const filteredMatches = workflowMatches.filter((item) => {
    if (filterRating === 'all') return true;
    return item.fitRating.toLowerCase().includes(filterRating);
  });

  const getCapabilityDetails = (capId: string) => {
    return IOMETE_CAPABILITIES.find(c => c.id === capId);
  };

  return (
    <section id="workflows-section" className="bg-white border border-[#dcdcd5] p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between pb-6 border-b border-[#e1e1da] mb-6 gap-4">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-1.5">
            ( 03 / Workflow Evidence Trail )
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#121212]">
            Every prospect workflow mapped to a documented capability.
          </h3>
        </div>

        {/* Interactive Filter Controls */}
        <div role="group" aria-label="Filter workflows by fit rating" className="flex items-center bg-[#ebebe5] p-1 border border-[#dcdcd5]">
          <button
            type="button"
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
              filterRating === 'all' ? 'bg-[#2D382D] text-[#f8f8f5]' : 'text-[#66665f] hover:text-[#121212]'
            }`}
          >
            All ({workflowMatches.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterRating('high')}
            className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
              filterRating === 'high' ? 'bg-[#2D382D] text-[#f8f8f5]' : 'text-[#66665f] hover:text-[#121212]'
            }`}
          >
            High Fit
          </button>
          <button
            type="button"
            onClick={() => setFilterRating('partial')}
            className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
              filterRating === 'partial' ? 'bg-[#2D382D] text-[#f8f8f5]' : 'text-[#66665f] hover:text-[#121212]'
            }`}
          >
            Partial Fit
          </button>
          <button
            type="button"
            onClick={() => setFilterRating('poor')}
            className={`px-3 py-1 text-xs font-mono transition-colors cursor-pointer ${
              filterRating === 'poor' ? 'bg-[#2D382D] text-[#f8f8f5]' : 'text-[#66665f] hover:text-[#121212]'
            }`}
          >
            Poor Fit
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#dcdcd5] text-xs font-mono text-[#66665f]">
              <th className="py-3 px-3 font-normal">No.</th>
              <th className="py-3 px-3 font-normal">Prospect Workflow</th>
              <th className="py-3 px-3 font-normal">Matched IOMETE Capability</th>
              <th className="py-3 px-3 font-normal">Fit & Confidence</th>
              <th className="py-3 px-3 font-normal">Evidence Trail & Label</th>
              <th className="py-3 px-3 font-normal text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1e1da] text-xs">
            {filteredMatches.map((match, idx) => {
              const isExpanded = expandedRowId === match.id;
              const capDetails = getCapabilityDetails(match.matchedCapabilityId);
              return (
                <React.Fragment key={match.id}>
                  <tr className="hover:bg-[#f5f5f1] transition-colors">
                    <td className="py-4 px-3 font-mono text-[#66665f] tabular-nums align-top">
                      0{idx + 1}
                    </td>
                    <td className="py-4 px-3 font-medium text-[#121212] max-w-xs align-top">
                      {match.workflowName}
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-display text-sm font-medium text-[#121212]">
                        {match.matchedCapabilityName}
                      </div>
                      <a
                        href={match.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-[#2D382D] underline underline-offset-2 hover:text-[#121212] mt-1"
                      >
                        <span>{match.docUrl.replace('https://', '')}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-4 px-3 font-mono align-top whitespace-nowrap">
                      <span
                        className={
                          match.fitRating === 'High Fit'
                            ? 'text-[#2D382D] font-semibold'
                            : match.fitRating === 'Partial Fit'
                            ? 'text-[#b45309] font-semibold'
                            : 'text-[#bf000f] font-semibold'
                        }
                      >
                        {match.fitRating}
                      </span>
                      <span className="text-[#66665f]"> · {match.confidence}</span>
                    </td>
                    <td className="py-4 px-3 text-[#2c2c2a] max-w-md align-top leading-relaxed">
                      <span className="font-mono text-[11px] text-[#2D382D] font-medium mr-1.5">
                        [{match.evidenceType}]
                      </span>
                      {match.evidenceText}
                    </td>
                    <td className="py-4 px-3 text-right align-top">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        aria-label={`Inspect capability details for ${match.workflowName}`}
                        onClick={() => setExpandedRowId(isExpanded ? null : match.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 font-mono text-[11px] text-[#2D382D] border border-[#dcdcd5] hover:border-[#2D382D] bg-white cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide' : 'Evidence'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && capDetails && (
                    <tr className="bg-[#f8f8f5]">
                      <td colSpan={6} className="p-5 border-t border-[#e1e1da]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                          <div>
                            <p className="font-mono text-[11px] text-[#66665f] mb-1">
                              Plain-Language Capability Summary
                            </p>
                            <p className="text-[#121212] leading-relaxed">
                              {capDetails.plainDescription}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-[11px] text-[#2D382D] mb-1">
                              Fits When (Verified Conditions)
                            </p>
                            <ul className="space-y-1 text-[#2c2c2a]">
                              {capDetails.fitsWhen.map((f, i) => (
                                <li key={i}>· {f}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="font-mono text-[11px] text-[#bf000f] mb-1">
                              Does Not Fit When & Honest Objection Note
                            </p>
                            <p className="text-[#2c2c2a] mb-2">
                              {capDetails.doesNotFitWhen[0]}
                            </p>
                            <p className="text-[#121212] leading-relaxed">
                              <strong>Safe Response:</strong> {capDetails.safeHonestResponse}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-[#e1e1da] flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#66665f]">
        <span>Click any row’s "Evidence" button to inspect fits_when, does_not_fit_when, and safe objection responses</span>
        <span className="text-[#2D382D]">100% Sourced Capability Mapping</span>
      </div>
    </section>
  );
};
