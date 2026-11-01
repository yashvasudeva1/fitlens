import React, { useState, useEffect, useCallback } from 'react';
import { Database, Network, ShieldCheck, Download, Trash2, ArrowUpRight, Plus, RefreshCw, CheckCircle2, Clock } from 'lucide-react';
import { SampleCompanyAnalysis } from '../data/newSampleCompanies';
import { FitScoreResult } from '../utils/scoringEngine';
import { CAPABILITY_MAP } from '../data/iometeCapabilities';

export interface SavedProspect {
  id: string;
  companyName: string;
  overallScore: number | null;
  verdictBand: string;
  markdownContent?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TigerGraphDatabaseSectionProps {
  company: SampleCompanyAnalysis;
  scoreResult: FitScoreResult;
  onLoadCustomMarkdown: (md: string, companyName?: string) => void;
  persona: 'iomete_rep' | 'general_user';
  onRestrictedAction: (actionName: string) => void;
}

export const TigerGraphDatabaseSection: React.FC<TigerGraphDatabaseSectionProps> = ({
  company,
  scoreResult,
  onLoadCustomMarkdown,
  persona,
  onRestrictedAction
}) => {
  const [prospects, setProspects] = useState<SavedProspect[]>([]);
  const [dbHealth, setDbHealth] = useState<{ backend: string; connected: boolean; version?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchDatabaseState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, prospectsRes] = await Promise.all([
        fetch('/health').catch(() => null),
        fetch('/api/prospects').catch(() => null)
      ]);

      if (healthRes && healthRes.ok) {
        const hData = await healthRes.json();
        setDbHealth(hData.database || null);
      }

      if (prospectsRes && prospectsRes.ok) {
        const pData = await prospectsRes.json();
        if (Array.isArray(pData.prospects)) {
          setProspects(pData.prospects);
        }
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabaseState();
  }, [fetchDatabaseState]);

  const handleSaveCurrentToTigerData = async () => {
    if (persona === 'general_user') {
      onRestrictedAction('Saving accounts to TigerData Cloud database');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.name,
          overallScore: scoreResult.overallScore,
          verdictBand: scoreResult.verdictBand,
          markdownContent: company.rawMarkdown,
          outreachStatus: 'Identified'
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        await fetchDatabaseState();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProspect = async (id: string) => {
    if (persona === 'general_user') {
      onRestrictedAction('Deleting database records');
      return;
    }

    const res = await fetch(`/api/prospects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchDatabaseState();
    }
  };

  const handleExportCsv = () => {
    if (persona === 'general_user') {
      onRestrictedAction('Exporting CRM prospect records to CSV');
      return;
    }

    if (prospects.length === 0) {
      alert('No prospects in database to export.');
      return;
    }

    const headers = ['ID', 'Company Name', 'Fit Score', 'Verdict Band', 'Created At'];
    const rows = prospects.map((p) => [
      `"${p.id}"`,
      `"${p.companyName}"`,
      p.overallScore ?? 'N/A',
      `"${p.verdictBand}"`,
      `"${p.createdAt || new Date().toISOString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fitlens_prospects_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-8">
      {/* Top Banner: Storage Health & Graph Node Status */}
      <div className="p-5 rounded-2xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1C1916] text-[#8CE0A1] flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[#1A1612]">
                TigerData TimescaleDB &amp; Relationship Graph
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-tabular bg-[#5A9A6B]/15 text-[#2E6B40] font-medium">
                {dbHealth?.connected ? 'Online (PostgreSQL 18.6)' : 'Active Cloud Storage'}
              </span>
            </div>
            <p className="text-xs text-[#524E48] mt-0.5">
              Persistent cloud storage for qualified accounts, graph topology, and multi-dimensional rubric tracking.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDatabaseState}
            disabled={isLoading}
            className="p-2 rounded-lg border border-[#E3E3DE] bg-[#FAF9F6] hover:bg-[#E8E7E0] text-[#1A1612] text-xs transition-colors cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#FAF9F6] border border-[#E3E3DE] hover:border-[#8C867E] text-xs font-medium text-[#1A1612] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentToTigerData}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1A1612] text-[#F5F4F0] hover:bg-[#332E28] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#8CE0A1]" />
                <span>Saved to TigerData!</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : `Save ${company.name.split(' ')[0]} to DB`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Graph Visualizer: Company -> Workloads -> Capabilities -> Verdict */}
      <div className="bg-[#FAF9F6] border border-[#E3E3DE] rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-[#E3E3DE]">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-[#5A9A6B]" />
            <h4 className="text-xs font-mono-tabular uppercase tracking-wider text-[#6B665F]">
              TigerGraph Topology: Account &rarr; Workloads &rarr; IOMETE Capabilities &rarr; Verdict
            </h4>
          </div>
          <span className="text-[11px] font-mono-tabular text-[#6B665F]">
            {company.evidenceItems.length} Workload Edges Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Node 1: Account Entity */}
          <div className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase text-[#6B665F]">Root Node</span>
              <h5 className="text-sm font-semibold text-[#1A1612] mt-1">{company.name}</h5>
              <p className="text-xs text-[#524E48] mt-1">{company.deploymentBadge}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E3E3DE] text-[11px] font-mono-tabular text-[#2E6B40]">
              Status: Evaluated
            </div>
          </div>

          {/* Node 2: Core Workloads */}
          <div className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase text-[#6B665F]">Workload Nodes</span>
              <div className="space-y-1.5 mt-2">
                {company.evidenceItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="text-xs font-medium text-[#1A1612] truncate" title={item.workflowName}>
                    - {item.workflowName}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E3E3DE] text-[11px] font-mono-tabular text-[#6B665F]">
              {company.evidenceItems.length} active edges
            </div>
          </div>

          {/* Node 3: Matched IOMETE Capabilities */}
          <div className="p-4 rounded-xl bg-[#F3F3EE] border border-[#E3E3DE] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase text-[#6B665F]">Capability Nodes</span>
              <div className="space-y-1.5 mt-2">
                {company.evidenceItems.slice(0, 3).map((item) => {
                  const cap = CAPABILITY_MAP[item.capabilityId];
                  return (
                    <a
                      key={item.id}
                      href={cap?.docUrl || 'https://docs.iomete.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#2E6B40] hover:underline truncate max-w-full"
                    >
                      <span className="truncate">{cap?.name || item.capabilityId}</span>
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#E3E3DE] text-[11px] font-mono-tabular text-[#2E6B40]">
              28 Sourced KB Docs
            </div>
          </div>

          {/* Node 4: Verdict Sink */}
          <div className="p-4 rounded-xl bg-[#1C1916] text-[#F3F1EC] flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono-tabular uppercase text-[#A8A49C]">Verdict Node</span>
              <div className="font-mono-tabular text-2xl font-bold mt-1 text-[#8CE0A1]">
                {scoreResult.overallScore}/100
              </div>
              <p className="text-xs text-[#D6D3CD] mt-1 font-medium">{scoreResult.verdictBand}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 text-[11px] font-mono-tabular text-[#A8A49C]">
              Confidence: {scoreResult.confidenceLevel} ({scoreResult.confidenceScore}%)
            </div>
          </div>
        </div>
      </div>

      {/* Saved Database Records in TigerData */}
      <div className="bg-[#FAF9F6] border border-[#E3E3DE] rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E3E3DE]">
          <div>
            <h4 className="text-sm font-semibold text-[#1A1612]">
              TigerData Cloud Account Records ({prospects.length})
            </h4>
            <p className="text-xs text-[#6B665F] mt-0.5">
              Prospect accounts persisted in Timescale Cloud PostgreSQL.
            </p>
          </div>
          <div className="text-xs font-mono-tabular text-[#6B665F]">
            Role: <strong>{persona === 'iomete_rep' ? 'IOMETE Team (Read/Write)' : 'General User (Read-Only)'}</strong>
          </div>
        </div>

        {prospects.length === 0 ? (
          <div className="text-center py-10 bg-[#F3F3EE] rounded-xl border border-dashed border-[#E3E3DE] text-xs text-[#6B665F]">
            <p>No saved prospect records found in TigerData.</p>
            <p className="mt-1">
              Click &quot;Save {company.name.split(' ')[0]} to DB&quot; above to store this account in Timescale Cloud.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E3E3DE] text-[#6B665F] font-mono-tabular">
                  <th className="py-2.5 px-3">Company Name</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Verdict</th>
                  <th className="py-2.5 px-3">Saved At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E3DE]">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F3F3EE]/60 transition-colors">
                    <td className="py-3 px-3 font-medium text-[#1A1612]">
                      {p.companyName}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular font-semibold">
                      {p.overallScore !== null ? `${p.overallScore}/100` : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#EFEFE9] text-[#1A1612]">
                        {p.verdictBand}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#6B665F] font-mono-tabular">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {p.markdownContent && (
                          <button
                            type="button"
                            onClick={() => onLoadCustomMarkdown(p.markdownContent!, p.companyName)}
                            className="px-2.5 py-1 rounded bg-[#1A1612] text-white text-[11px] font-medium hover:bg-[#332E28] transition-colors cursor-pointer"
                          >
                            Load
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteProspect(p.id)}
                          className="p-1 rounded text-[#8C867E] hover:text-[#D9733A] transition-colors cursor-pointer"
                          title="Delete prospect"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
