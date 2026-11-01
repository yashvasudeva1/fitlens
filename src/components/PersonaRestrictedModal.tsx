import React from 'react';
import { ShieldAlert, ArrowRight, Lock, CheckCircle2, User, ShieldCheck } from 'lucide-react';

interface PersonaRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToIomete: () => void;
  actionAttempted?: string;
}

export const PersonaRestrictedModal: React.FC<PersonaRestrictedModalProps> = ({
  isOpen,
  onClose,
  onSwitchToIomete,
  actionAttempted = 'Exporting full company dossiers'
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-[#FAF9F6] border border-[#E3E3DE] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#D9733A]/15 border border-[#D9733A]/30 flex items-center justify-center shrink-0">
            <Lock className="w-6 h-6 text-[#D9733A]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-tabular uppercase tracking-wider bg-[#EFEFE9] text-[#6B665F]">
                Role-Based Access
              </span>
              <span className="text-xs text-[#D9733A] font-medium">Internal Feature</span>
            </div>
            <h3 id="persona-modal-title" className="font-serif-display text-xl font-normal text-[#1A1612] mt-1.5">
              {actionAttempted.includes("Export") ? "Export Restricted to Sales Reps" : "Feature Restricted to Sales Reps"}
            </h3>
            <p className="text-xs text-[#524E48] mt-2 leading-relaxed">
              {actionAttempted} and managing CRM database records are restricted to verified <strong>IOMETE Sales Representatives</strong>.
            </p>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] space-y-2.5">
          <div className="text-xs font-semibold text-[#1A1612]">
            For Demo and Evaluation Purposes:
          </div>
          <div className="flex items-start gap-2 text-xs text-[#524E48]">
            <CheckCircle2 className="w-4 h-4 text-[#5A9A6B] shrink-0 mt-0.5" />
            <span>Switch to the <strong>IOMETE Sales Rep Persona</strong> to unlock unredacted Markdown exports, print-ready PDF reports, and the TigerData cloud database.</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#6B665F] hover:text-[#1A1612] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSwitchToIomete();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium bg-[#1A1612] text-[#F5F4F0] rounded-full hover:bg-[#332E28] transition-colors cursor-pointer shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-[#8CE0A1]" />
            <span>Switch to IOMETE Sales Rep Persona</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
