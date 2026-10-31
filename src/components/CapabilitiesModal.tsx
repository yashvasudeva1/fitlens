import React, { useState } from 'react';
import { X, ExternalLink, Search, Download } from 'lucide-react';
import { IOMETE_CAPABILITIES } from '../data/capabilities';

interface CapabilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CapabilitiesModal: React.FC<CapabilitiesModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    'All',
    'Deployment & Sovereignty',
    'Lakehouse & Formats',
    'Compute & Engine',
    'Security & Governance',
    'Developer & Workflows',
    'Cost & Operations'
  ];

  const filteredCapabilities = IOMETE_CAPABILITIES.filter((cap) => {
    const matchesCategory = selectedCategory === 'All' || cap.category === selectedCategory;
    const matchesSearch =
      cap.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cap.plainDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cap.fitsWhen.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs"
    >
      <div className="bg-[#f5f5f1] border border-[#dcdcd5] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dcdcd5] bg-white flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[#66665f] mb-1">
              ( Curated Knowledge Base · iomete_capabilities.json · {IOMETE_CAPABILITIES.length} Entries )
            </p>
            <h2 id="kb-modal-title" className="font-display text-2xl font-normal tracking-[-0.03em] text-[#121212]">
              Sourced IOMETE Capability Index
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/iomete_capabilities.json"
              download="iomete_capabilities.json"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] bg-[#f5f5f1]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>iomete_capabilities.json</span>
            </a>
            <button
              type="button"
              aria-label="Close knowledge base modal"
              onClick={onClose}
              className="p-2 text-[#66665f] hover:text-[#121212] hover:bg-[#ebebe5] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#dcdcd5] bg-[#ebebe5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#2D382D] text-[#f8f8f5]'
                    : 'bg-white border border-[#dcdcd5] text-[#66665f] hover:text-[#121212]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <label htmlFor="kb-search" className="sr-only">Search capabilities</label>
            <input
              id="kb-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search capabilities..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-white border border-[#dcdcd5] focus:border-[#2D382D] outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#66665f] absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Capabilities List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {filteredCapabilities.map((cap, idx) => (
            <article
              key={cap.id}
              className="p-5 border border-[#dcdcd5] bg-white space-y-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2 border-b border-[#e1e1da]">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="font-mono text-xs text-[#66665f] tabular-nums">
                    {String(idx + 1).padStart(2, '0')} /
                  </span>
                  <h3 className="font-display text-lg font-medium text-[#121212]">
                    {cap.name}
                  </h3>
                  <span className="font-mono text-xs text-[#66665f]">
                    · {cap.category} · Maturity: {' '}
                    <strong className={cap.maturityNote === 'verified' ? 'text-[#2D382D]' : 'text-[#b45309]'}>
                      {cap.maturityNote}
                    </strong>
                  </span>
                </div>

                <a
                  href={cap.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-[#2D382D] underline underline-offset-2"
                >
                  <span>{cap.docUrl.replace('https://', '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <p className="text-xs text-[#121212] leading-relaxed">
                <strong>Plain-Language Description:</strong> {cap.plainDescription}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-3 bg-[#f8f8f5] border border-[#e1e1da] space-y-1">
                  <p className="font-mono text-[10px] text-[#2D382D] font-medium">
                    fits_when:
                  </p>
                  <ul className="space-y-1 text-[#2c2c2a]">
                    {cap.fitsWhen.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-[#f8f8f5] border border-[#e1e1da] space-y-1">
                  <p className="font-mono text-[10px] text-[#bf000f] font-medium">
                    does_not_fit_when:
                  </p>
                  <ul className="space-y-1 text-[#2c2c2a]">
                    {cap.doesNotFitWhen.map((d, i) => (
                      <li key={i}>· {d}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 text-xs text-[#2c2c2a]">
                <p className="font-mono text-[11px] text-[#66665f]">
                  Common Objection: “{cap.commonObjections}”
                </p>
                <p className="mt-1 text-[#121212]">
                  <strong>Safe, Honest Response:</strong> {cap.safeHonestResponse}
                </p>
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#dcdcd5] bg-white flex items-center justify-between font-mono text-xs text-[#66665f]">
          <span>Showing {filteredCapabilities.length} of {IOMETE_CAPABILITIES.length} entries</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
