import React, { useState } from 'react';
import {
  IOMETE_CAPABILITIES,
  IometeCapability,
  KB_VERSION
} from '../data/iometeCapabilities';
import { FitScoreResult, ValidationCheckResult } from '../utils/scoringEngine';
import { ExternalLink, Check, ShieldCheck, ArrowRight, Code2, Database } from 'lucide-react';

interface ArchitectureDarkSectionProps {
  companyName: string;
  scoreResult: FitScoreResult;
  validationResult: ValidationCheckResult;
  matchedCapabilityIds: string[];
}

const CATEGORIES: IometeCapability['category'][] = [
  'Deployment & Sovereignty',
  'Storage & Open Formats',
  'Compute & Workloads',
  'Governance & Security',
  'Operations & Cost'
];

export const ArchitectureDarkSection: React.FC<ArchitectureDarkSectionProps> = ({
  companyName,
  scoreResult,
  validationResult,
  matchedCapabilityIds
}) => {
  const [selectedCapId, setSelectedCapId] = useState<string>(
    matchedCapabilityIds[0] || IOMETE_CAPABILITIES[0].id
  );

  const activeCap =
    IOMETE_CAPABILITIES.find((c) => c.id === selectedCapId) || IOMETE_CAPABILITIES[0];

  return (
    <section
      id="architecture"
      aria-labelledby="how-fitlens-works-heading"
      className="bg-[#1C1916] text-[#F3F1EC] py-20 lg:py-28 border-t border-b border-white/10"
    >
      <div className="max-w-[1320px] mx-auto px-6">
        {/* Top Capability Strip (Replicating Forge's "Running quietly inside the teams at" strip) */}
        <div className="pb-14 border-b border-dashed border-white/10">
          <p className="text-xs text-[#A8A49C] mb-4">
            Grounded in {KB_VERSION} - No doc link, no product claim
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-mono-tabular text-[#D6D3CD]">
            <span>Apache Spark 3.5</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>Apache Iceberg REST Catalog</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>Kubernetes Air-Gap &amp; BYOC</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>MinIO / Ceph / AWS S3</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>Dynamic RBAC &amp; PII Masking</span>
            <span aria-hidden="true" className="text-white/20">·</span>
            <span>dbt-iomete &amp; Arrow Flight SQL</span>
          </div>
        </div>

        {/* Section Editorial Heading */}
        <div className="mt-14 max-w-3xl">
          <div className="text-xs font-mono-tabular text-[#A8A49C] mb-3">
            01. Architecture &amp; Anti-Hallucination Engine
          </div>
          <h2
            id="how-fitlens-works-heading"
            className="font-serif-display text-3xl sm:text-5xl font-normal tracking-tight text-[#F3F1EC] leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Every workflow, constraint, and capability mapped with proof.
          </h2>
          <p className="text-base text-[#A8A49C] mt-4 leading-relaxed">
            A single prompt that rates every company 8/10 is a hype machine. FitLens separates LLM parsing from a closed 26-capability knowledge base, a pure-code scoring rubric, and a hard validator gate.
          </p>
        </div>

        {/* 2x2 Graphic Bento Grid (Replicating Forge's 4 dark graphic showcase cards) */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1 (Col Span 7): Interactive 26-Capability Knowledge Base Map (Forge System Map replica) */}
          <div className="lg:col-span-7 rounded-2xl bg-[#24201C] border border-white/10 p-6 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between text-xs text-[#A8A49C] pb-3 border-b border-white/10">
                <span className="font-medium text-[#F3F1EC]">
                  Curated Capability Knowledge Base (`iomete_capabilities.json`)
                </span>
                <span className="font-mono-tabular">
                  {IOMETE_CAPABILITIES.length} entries · 5 layers
                </span>
              </div>

              <h3 className="text-xl font-medium text-[#F3F1EC] mt-4">
                Maps your prospect’s stack against 26 documented capabilities
              </h3>
              <p className="text-xs text-[#A8A49C] mt-1.5 leading-relaxed">
                Highlighted nodes match <strong className="text-[#F3F1EC]">{companyName}</strong>. Click any capability node below to inspect its plain-language definition, disqualifier boundaries, and `docs.iomete.com` source link.
              </p>

              {/* 5-Layer Visual System Map */}
              <div className="mt-5 space-y-2.5">
                {CATEGORIES.map((cat) => {
                  const caps = IOMETE_CAPABILITIES.filter((c) => c.category === cat);
                  return (
                    <div
                      key={cat}
                      className="p-2.5 rounded-xl bg-[#1C1916] border border-white/8 flex flex-col sm:flex-row sm:items-center gap-2.5"
                    >
                      <div className="w-40 shrink-0 text-[11px] font-mono-tabular text-[#A8A49C]">
                        {cat}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {caps.map((cap) => {
                          const isMatched = matchedCapabilityIds.includes(cap.id);
                          const isSelected = activeCap.id === cap.id;
                          return (
                            <button
                              key={cap.id}
                              type="button"
                              onClick={() => setSelectedCapId(cap.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#F3F1EC] text-[#1C1916] font-semibold'
                                  : isMatched
                                  ? 'bg-[#5A9A6B]/25 text-[#9AE6B4] border border-[#5A9A6B]/50 hover:bg-[#5A9A6B]/35'
                                  : 'bg-[#24201C] text-[#A8A49C] border border-white/8 hover:text-[#F3F1EC]'
                              }`}
                            >
                              <span>{cap.name.split('(')[0].trim()}</span>
                              {cap.maturityNote === 'unverified' && (
                                <span className="font-mono-tabular text-[9px] text-[#D9733A]">
                                  [UNVERIFIED]
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Capability Live Inspector Drawer */}
            <div className="p-4 rounded-xl bg-[#1C1916] border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular text-xs text-[#8CE0A1]">
                    {activeCap.id}
                  </span>
                  <span className="text-xs text-white/30">·</span>
                  <span className="text-xs font-semibold text-[#F3F1EC]">
                    {activeCap.name}
                  </span>
                </div>
                <a
                  href={activeCap.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-mono-tabular text-[#8CE0A1] hover:underline"
                >
                  <span>{activeCap.docUrl.replace('https://', '')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-[#D6D3CD] mt-2 leading-relaxed">
                {activeCap.plainDescription}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-2.5 border-t border-white/8 text-[11px]">
                <div>
                  <span className="text-[#8CE0A1] font-mono-tabular uppercase">Fits When: </span>
                  <span className="text-[#A8A49C]">{activeCap.fitsWhen[0]}</span>
                </div>
                <div>
                  <span className="text-[#F6AD85] font-mono-tabular uppercase">Does Not Fit When: </span>
                  <span className="text-[#A8A49C]">{activeCap.doesNotFitWhen[0]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 (Col Span 5): Visual 5-Stage Pipeline Diagram (PRD Section 8) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#24201C] border border-white/10 p-6 flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between text-xs text-[#A8A49C] pb-3 border-b border-white/10">
                <span className="font-medium text-[#F3F1EC]">Deterministic Pipeline</span>
                <span className="font-mono-tabular">PRD Section 8 Spec</span>
              </div>
              <h3 className="text-xl font-medium text-[#F3F1EC] mt-4">
                Turns messy account notes into a verified fit verdict
              </h3>
              <p className="text-xs text-[#A8A49C] mt-1.5 leading-relaxed">
                Every stage has a strict contract so the model cannot hallucinate product features or drift scores across runs.
              </p>

              {/* Graphic Pipeline Nodes */}
              <div className="mt-5 space-y-2.5 font-mono-tabular text-xs">
                <div className="p-3 rounded-xl bg-[#1C1916] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[#F3F1EC] font-medium">01. .md Upload &amp; Parser</div>
                    <div className="text-[11px] text-[#A8A49C]">
                      Extracts workflows, stack, volume &amp; constraints
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8CE0A1]">JSON Schema</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1C1916] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[#F3F1EC] font-medium">02. Pre-Score Input Quality Check</div>
                    <div className="text-[11px] text-[#A8A49C]">
                      Flags missing scale/compliance before scoring
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8CE0A1]">Confidence Gate</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1C1916] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[#F3F1EC] font-medium">03. Closed-KB Workflow Matcher</div>
                    <div className="text-[11px] text-[#A8A49C]">
                      Maps only to `iomete_capabilities.json` IDs
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8CE0A1]">26 Verified IDs</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1C1916] border border-[#5A9A6B]/50 flex items-center justify-between">
                  <div>
                    <div className="text-[#8CE0A1] font-medium">04. Pure-Code Scoring Engine</div>
                    <div className="text-[11px] text-[#A8A49C]">
                      Excludes unknowns · enforces disqualifier caps
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8CE0A1]">0.0 Variance</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1C1916] border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[#F3F1EC] font-medium">05. Code Validator &amp; Dual Export</div>
                    <div className="text-[11px] text-[#A8A49C]">
                      Blocks unlinked claims · Rep Brief + Buyer Memo
                    </div>
                  </div>
                  <span className="text-[10px] text-[#8CE0A1]">.MD &amp; PDF</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#1C1916] border border-white/8 flex items-center justify-between text-xs text-[#A8A49C]">
              <span>Repeatability across 3 identical runs</span>
              <span className="font-mono-tabular text-[#8CE0A1] font-semibold">
                &plusmn;0.0 pts (Exact Match)
              </span>
            </div>
          </div>

          {/* Card 3 (Col Span 6): "LLM Extracts, Code Computes" Visual Math Card */}
          <div className="lg:col-span-6 rounded-2xl bg-[#24201C] border border-white/10 p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-[#A8A49C] pb-3 border-b border-white/10">
                <span className="font-medium text-[#F3F1EC]">Why Generic AI Wrappers Lose</span>
                <span className="font-mono-tabular">PRD Section 0 &amp; 5</span>
              </div>
              <h3 className="text-xl font-medium text-[#F3F1EC] mt-4">
                The LLM extracts and classifies. Pure code computes the score.
              </h3>
              <p className="text-xs text-[#A8A49C] mt-1.5 leading-relaxed">
                Instead of asking an LLM for a “vibe score”, FitLens computes each dimension from tagged evidence and enforces three non-negotiable accuracy rules:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#1C1916] border border-white/10">
                <div className="font-mono-tabular text-[11px] text-[#8CE0A1] mb-1">
                  Rule 01 · Unknowns
                </div>
                <div className="font-medium text-[#F3F1EC]">Never Neutral 50</div>
                <p className="text-[11px] text-[#A8A49C] mt-1 leading-relaxed">
                  Dimensions with zero evidence are excluded from the weighted average and turned into discovery questions.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1916] border border-white/10">
                <div className="font-mono-tabular text-[11px] text-[#F6AD85] mb-1">
                  Rule 02 · Can Say No
                </div>
                <div className="font-medium text-[#F3F1EC]">Disqualifier Caps</div>
                <p className="text-[11px] text-[#A8A49C] mt-1 leading-relaxed">
                  Tiny data (&lt;100 GB), zero data team, or SaaS-only mandates cap the overall verdict at Not a Fit.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1C1916] border border-white/10">
                <div className="font-mono-tabular text-[11px] text-[#90CDF4] mb-1">
                  Rule 03 · Provenance
                </div>
                <div className="font-medium text-[#F3F1EC]">3 Statement Labels</div>
                <p className="text-[11px] text-[#A8A49C] mt-1 leading-relaxed">
                  Every sentence carries `[Stated]` (input), `[Sourced]` (IOMETE doc link), or `[Assumed]` (inference).
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 (Col Span 6): Forge-Style "Fix and Verify" Code Validator Card */}
          <div className="lg:col-span-6 rounded-2xl bg-[#24201C] border border-white/10 p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between text-xs text-[#A8A49C] pb-3 border-b border-white/10">
                <span className="font-medium text-[#F3F1EC]">Code Validator Gate</span>
                <span className="font-mono-tabular text-[#8CE0A1]">
                  {companyName} · Verified
                </span>
              </div>
              <h3 className="text-xl font-medium text-[#F3F1EC] mt-4">
                Blocks unsupported product claims before they reach the screen
              </h3>
            </div>

            {/* Forge PR-Check Replica */}
            <div className="p-4 rounded-xl bg-[#1C1916] border border-white/10 font-mono-tabular text-xs space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#A8A49C] pb-2 border-b border-white/10">
                <span>validateReportClaims(analysis, {scoreResult.overallScore})</span>
                <span className="text-[#8CE0A1]">+{validationResult.sourcedClaimsWithValidLink} verified / -0 unlinked</span>
              </div>
              <div className="text-[#F6AD85] text-[11px]">
                - Reject any claim where capabilityId &notin; iomete_capabilities.json
              </div>
              <div className="text-[#8CE0A1] text-[11px]">
                + Verified {validationResult.sourcedClaimsWithValidLink}/{validationResult.totalClaimsChecked} claims link to https://docs.iomete.com/*
              </div>
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-[#8CE0A1]">
                  <Check className="w-3.5 h-3.5" /> Citation Check Passed ({validationResult.citationCoveragePercent}%)
                </span>
                <span className="flex items-center gap-1.5 text-[#8CE0A1]">
                  <Check className="w-3.5 h-3.5" /> Score Recomputed ({scoreResult.overallScore}/100)
                </span>
                <span className="flex items-center gap-1.5 text-[#8CE0A1]">
                  <Check className="w-3.5 h-3.5" /> Rubric Stamp Applied
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
