import React, { useState, useRef } from 'react';
import { Check, Copy, Volume2, Square } from 'lucide-react';
import { AnalysisResult } from '../types/analyzer';

interface AudienceViewProps {
  audienceMode: 'sales' | 'buyer';
  onToggleAudience: (mode: 'sales' | 'buyer') => void;
  analysis: AnalysisResult;
}

export const AudienceView: React.FC<AudienceViewProps> = ({
  audienceMode,
  onToggleAudience,
  analysis
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleToggleAudioBriefing = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    const scoreText =
      analysis.isInsufficientInfo || analysis.overallScore === null
        ? 'Insufficient information'
        : `${analysis.overallScore} out of 100`;
    const briefingText =
      audienceMode === 'sales'
        ? `Sales Rep Call Prep for ${analysis.companyName}. Verdict: ${analysis.verdictBand}, ${scoreText}. Call Goal: ${analysis.salesRepView.cheatSheet.callGoal}. Opening Pitch: ${analysis.salesRepView.cheatSheet.elevatorPitch}. Critical Landmine to Avoid: ${analysis.salesRepView.cheatSheet.landmineToAvoid}`
        : `Internal Buyer Memo for ${analysis.companyName}. ${analysis.buyerMemoView.executiveSummary} CFO Defense: ${analysis.buyerMemoView.cfoDefensePoint}`;

    setIsGeneratingAudio(true);
    try {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToSpeak: briefingText })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.audioDataUrl) {
          const audio = new Audio(data.audioDataUrl);
          audioRef.current = audio;
          audio.onended = () => setIsPlayingAudio(false);
          audio.onerror = () => setIsPlayingAudio(false);
          setIsPlayingAudio(true);
          await audio.play();
          return;
        }
      }
      // Clean browser speech synthesis fallback if offline
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        setIsPlayingAudio(true);
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(briefingText);
        utterance.onend = () => setIsPlayingAudio(false);
        setIsPlayingAudio(true);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const copyMemoToClipboard = () => {
    const memo = analysis.buyerMemoView;
    const memoText = `MEMORANDUM
TO: ${memo.memoHeader.to}
FROM: ${memo.memoHeader.from}
DATE: ${memo.memoHeader.date}
SUBJECT: ${memo.memoHeader.subject}
CLASSIFICATION: ${memo.memoHeader.classification}

1. EXECUTIVE SUMMARY
${memo.executiveSummary}

2. BUSINESS NEED & FRICTION
${memo.businessNeedAndFriction}

3. ARCHITECTURAL FIT SUMMARY
${memo.architecturalFitSummary}

4. CISO & SECURITY BRIEF
${memo.sovereigntyAndSecurityBrief}
CISO Defense: ${memo.cisoDefensePoint}

5. CFO & COST TRANSPARENCY BRIEF
${memo.tcoCostComparison}
CFO Defense: ${memo.cfoDefensePoint}

6. SUGGESTED PILOT PLAN
${memo.suggestedPoCPlan.map(p => `- ${p.week} (${p.milestone}): ${p.successCriteria}`).join('\n')}
`;
    navigator.clipboard.writeText(memoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="audience-section" className="bg-white border border-[#dcdcd5] p-6 sm:p-8">
      {/* Header with Audience Switcher */}
      <div className="flex flex-wrap items-end justify-between pb-6 border-b border-[#e1e1da] mb-6 gap-4">
        <div>
          <p className="font-mono text-xs text-[#66665f] mb-1.5">
            ( 07 / Two Audiences, One Analysis · gemini-3.8-flash-lite-tts Voice Briefing )
          </p>
          <h3 className="font-display text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#121212]">
            {audienceMode === 'sales'
              ? 'Sales Rep Brief: Call talk track, landmines & 30-minute agenda.'
              : 'Buyer Internal Memo: Defend the evaluation to your CTO, CFO & CISO.'}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleAudioBriefing}
            disabled={isGeneratingAudio}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] hover:bg-[#E8ECE8] transition-colors cursor-pointer disabled:opacity-50"
          >
            {isPlayingAudio ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Briefing</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {isGeneratingAudio ? 'Synthesizing TTS...' : 'Listen (gemini-3.8-flash-lite-tts)'}
                </span>
              </>
            )}
          </button>

          <div role="group" aria-label="Choose report audience" className="flex items-center bg-[#ebebe5] p-1 border border-[#dcdcd5]">
            <button
              type="button"
              onClick={() => onToggleAudience('sales')}
              className={`px-3.5 py-1.5 text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                audienceMode === 'sales'
                  ? 'bg-[#2D382D] text-[#f8f8f5] font-medium'
                  : 'text-[#66665f] hover:text-[#121212]'
              }`}
            >
              Sales Rep Brief
            </button>
            <button
              type="button"
              onClick={() => onToggleAudience('buyer')}
              className={`px-3.5 py-1.5 text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                audienceMode === 'buyer'
                  ? 'bg-[#2D382D] text-[#f8f8f5] font-medium'
                  : 'text-[#66665f] hover:text-[#121212]'
              }`}
            >
              Buyer Justification Memo
            </button>
          </div>

          {audienceMode === 'buyer' && (
            <button
              type="button"
              onClick={copyMemoToClipboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Memo' : 'Copy Buyer Memo'}</span>
            </button>
          )}
        </div>
      </div>

      {audienceMode === 'sales' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 border border-[#e1e1da] bg-[#f8f8f5] space-y-2">
              <p className="font-mono text-xs text-[#66665f]">
                01 / Target Persona & Call Goal
              </p>
              <p className="font-display text-base font-medium text-[#121212]">
                {analysis.salesRepView.targetPersona}
              </p>
              <p className="text-xs text-[#2c2c2a] leading-relaxed">
                {analysis.salesRepView.cheatSheet.callGoal}
              </p>
            </div>

            <div className="p-5 border border-[#e1e1da] bg-[#f8f8f5] space-y-2">
              <p className="font-mono text-xs text-[#66665f]">
                02 / Opening Talk Track
              </p>
              <p className="text-xs text-[#121212] leading-relaxed italic">
                “{analysis.salesRepView.cheatSheet.elevatorPitch}”
              </p>
            </div>

            <div className="p-5 border border-[#ffcaca] bg-[#fef2f2] space-y-2">
              <p className="font-mono text-xs text-[#bf000f] font-medium">
                03 / Landmine to Avoid
              </p>
              <p className="text-xs text-[#121212] leading-relaxed">
                {analysis.salesRepView.cheatSheet.landmineToAvoid}
              </p>
            </div>
          </div>

          {/* 30-Minute Call Agenda */}
          <div className="border border-[#dcdcd5]">
            <div className="px-5 py-3 bg-[#f8f8f5] border-b border-[#dcdcd5] flex items-center justify-between font-mono text-xs text-[#66665f]">
              <span>Structured 30-Minute Qualification Agenda</span>
              <span>Target Outcome: Bounded Technical Pilot</span>
            </div>
            <div className="divide-y divide-[#e1e1da] text-xs">
              {analysis.salesRepView.agenda.map((item, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[#2D382D] tabular-nums w-28 shrink-0">
                      {item.time}
                    </span>
                    <span className="font-display text-base font-medium text-[#121212]">
                      {item.topic}
                    </span>
                  </div>
                  <span className="text-[#66665f] sm:text-right">
                    {item.objective}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-[#E8ECE8] border border-[#2D382D]/30 space-y-1.5">
            <p className="font-mono text-xs text-[#2D382D] font-medium">
              Recommended Closing Ask:
            </p>
            <p className="font-display text-lg text-[#121212]">
              {analysis.salesRepView.cheatSheet.suggestedClose}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 bg-[#f8f8f5] border border-[#dcdcd5] space-y-6">
          {/* Memo Header */}
          <div className="pb-5 border-b border-[#dcdcd5] font-mono text-xs space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-[#66665f]">TO:</span>
              <span className="text-[#121212] font-medium">{analysis.buyerMemoView.memoHeader.to}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-[#66665f]">FROM:</span>
              <span className="text-[#121212] font-medium">{analysis.buyerMemoView.memoHeader.from}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-[#66665f]">DATE:</span>
              <span className="text-[#121212]">{analysis.buyerMemoView.memoHeader.date}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between">
              <span className="text-[#66665f]">SUBJECT:</span>
              <span className="text-[#2D382D] font-semibold">{analysis.buyerMemoView.memoHeader.subject}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <h4 className="font-mono text-xs text-[#2D382D] font-medium">
                01 / Executive Summary
              </h4>
              <p className="text-sm text-[#121212] leading-relaxed">
                {analysis.buyerMemoView.executiveSummary}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-xs text-[#2D382D] font-medium">
                02 / Stated Business Friction & Architecture Fit
              </h4>
              <p className="text-xs text-[#2c2c2a] leading-relaxed">
                {analysis.buyerMemoView.businessNeedAndFriction}
              </p>
              <p className="text-xs text-[#2c2c2a] leading-relaxed">
                {analysis.buyerMemoView.architecturalFitSummary}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs pt-2">
            <div className="p-5 bg-white border border-[#dcdcd5] space-y-2">
              <p className="font-mono text-xs text-[#2D382D] font-medium">
                03 / What the CFO Will Ask (Cost & Licensing)
              </p>
              <p className="text-[#2c2c2a] leading-relaxed">
                {analysis.buyerMemoView.tcoCostComparison}
              </p>
              <p className="pt-2 border-t border-[#e1e1da] text-[#121212] font-medium">
                CFO Answer: {analysis.buyerMemoView.cfoDefensePoint}
              </p>
            </div>

            <div className="p-5 bg-white border border-[#dcdcd5] space-y-2">
              <p className="font-mono text-xs text-[#2D382D] font-medium">
                04 / What the CISO Will Ask (Sovereignty & Governance)
              </p>
              <p className="text-[#2c2c2a] leading-relaxed">
                {analysis.buyerMemoView.sovereigntyAndSecurityBrief}
              </p>
              <p className="pt-2 border-t border-[#e1e1da] text-[#121212] font-medium">
                CISO Answer: {analysis.buyerMemoView.cisoDefensePoint}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="font-mono text-xs text-[#2D382D] font-medium mb-3">
              05 / Proposed 2-Week Technical Validation Plan
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {analysis.buyerMemoView.suggestedPoCPlan.map((poc, idx) => (
                <div key={idx} className="p-4 bg-white border border-[#dcdcd5] space-y-1">
                  <p className="font-mono text-[#2D382D] font-medium">
                    {poc.week} · {poc.milestone}
                  </p>
                  <p className="text-[#2c2c2a] leading-relaxed">
                    {poc.successCriteria}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
