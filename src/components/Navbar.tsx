import React from 'react';
import { Menu, X } from 'lucide-react';
import { EvalResults } from '../types/analyzer';

export type WorkspaceTab = 'qualification' | 'charts' | 'dossier' | 'database';

interface NavbarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenPrintModal: () => void;
  onOpenCapabilitiesModal: () => void;
  evalResults: EvalResults | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenPrintModal,
  onOpenCapabilitiesModal,
  evalResults
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'qualification', label: '01 / Qualification & Verdict' },
    { id: 'charts', label: '02 / Flourish Charts' },
    { id: 'dossier', label: '03 / Evidence & Briefs' },
    { id: 'database', label: '04 / Prospect DB' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#f5f5f1]/95 backdrop-blur-md border-b border-[#dcdcd5]">
      {/* Top Evaluation Stats Strip (Bug #7: comes from eval/eval_results.json or shows "not yet measured") */}
      <div
        data-testid="header-eval-stats"
        className="bg-[#ebebe5] border-b border-[#dcdcd5] px-4 sm:px-6 lg:px-8 py-1.5 font-mono text-[11px] text-[#66665f]"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          <span>
            Eval Suite ({evalResults?.rubricVersion || 'not yet measured'}):
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 tabular-nums">
            <span>
              Verdict Agreement:{' '}
              <strong className="text-[#121212]">
                {evalResults?.verdictAgreement || 'not yet measured'}
              </strong>
            </span>
            <span>
              Citation Coverage:{' '}
              <strong className="text-[#2D382D]">
                {evalResults?.citationCoveragePercent || 'not yet measured'}
              </strong>
            </span>
            <span>
              Repeatability Variance:{' '}
              <strong className="text-[#121212]">
                {evalResults?.repeatabilityVariance || 'not yet measured'}
              </strong>
            </span>
            <span className="hidden lg:inline">
              Unknown Handling:{' '}
              <strong className="text-[#2D382D]">
                {evalResults?.unknownHandlingStatus || 'not yet measured'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={() => onSelectTab('qualification')}
          className="font-display text-xl font-medium tracking-[-0.03em] text-[#121212] whitespace-nowrap shrink-0"
        >
          FitLens
        </a>

        {/* Zone 2: Separated Report Views + Knowledge Base */}
        <nav
          aria-label="Main"
          className="hidden md:flex items-center gap-6 text-xs font-mono text-[#66665f]"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === item.id
                  ? 'text-[#2D382D] font-semibold underline underline-offset-8'
                  : 'hover:text-[#121212]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenCapabilitiesModal}
            className="hover:text-[#121212] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Knowledge Base
          </button>
        </nav>

        {/* Zone 3: Primary Export Report Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenPrintModal}
            className="px-4 py-2 text-xs font-medium text-[#f8f8f5] bg-[#2D382D] hover:bg-[#1f271f] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export Report & Charts
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#121212] hover:bg-[#ebebe5] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile"
          className="md:hidden px-4 py-4 border-t border-[#dcdcd5] bg-[#f5f5f1] flex flex-col gap-3 text-xs font-mono text-[#2c2c2a]"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`py-1.5 text-left ${
                activeTab === item.id ? 'text-[#2D382D] font-semibold' : 'hover:text-[#121212]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onOpenCapabilitiesModal();
              setMobileMenuOpen(false);
            }}
            className="py-1.5 text-left text-[#2D382D] font-medium"
          >
            05 / Browse Capability Knowledge Base (28)
          </button>
        </nav>
      )}
    </header>
  );
};
