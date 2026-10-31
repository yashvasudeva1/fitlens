import React, { useState } from 'react';
import {
  AnalysisResult,
  OutreachStatus,
  ProspectRecord
} from '../types/analyzer';
import {
  Database,
  Download,
  Plus,
  Search,
  Trash2,
  ArrowUpRight,
  Check,
  Edit3
} from 'lucide-react';

interface ProspectDatabaseProps {
  prospects: ProspectRecord[];
  activeCompanyName: string;
  currentAnalysis: AnalysisResult;
  currentMarkdown: string;
  onLoadProspect: (prospect: ProspectRecord) => void;
  onSaveCurrentToDb: () => Promise<void>;
  onUpdateProspect: (id: string, updates: Partial<ProspectRecord>) => Promise<void>;
  onDeleteProspect: (id: string) => Promise<void>;
  onCreateManualProspect: (newRecord: Partial<ProspectRecord>) => Promise<void>;
}

const OUTREACH_STATUSES: OutreachStatus[] = [
  'Qualified - Approach Now',
  'Discovery Scheduled',
  'PoC / Pilot Active',
  'Nurture / Revisit Later',
  'Disqualified - Do Not Pitch'
];

export const ProspectDatabase: React.FC<ProspectDatabaseProps> = ({
  prospects,
  activeCompanyName,
  onLoadProspect,
  onSaveCurrentToDb,
  onUpdateProspect,
  onDeleteProspect,
  onCreateManualProspect
}) => {
  const [dbStatus, setDbStatus] = useState<{ backend: string; connected: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<ProspectRecord>>({});
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProspectForm, setNewProspectForm] = useState({
    companyName: '',
    industry: '',
    websiteOrDomain: '',
    dataScale: '',
    currentStack: '',
    contactName: '',
    contactRole: 'VP of Data Engineering',
    contactEmail: '',
    outreachStatus: 'Qualified - Approach Now' as OutreachStatus,
    repNotes: ''
  });

  React.useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then((data) => {
        if (data?.database) {
          setDbStatus(data.database);
        }
      })
      .catch(() => {});
  }, []);

  const filteredProspects = prospects.filter((p) => {
    const matchesStatus = statusFilter === 'ALL' || p.outreachStatus === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.companyName.toLowerCase().includes(q) ||
      p.industry.toLowerCase().includes(q) ||
      p.currentStack.toLowerCase().includes(q) ||
      p.contactName.toLowerCase().includes(q) ||
      p.verdictBand.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const handleStartEdit = (record: ProspectRecord) => {
    setEditingId(record.id);
    setEditDraft({
      contactName: record.contactName,
      contactRole: record.contactRole,
      contactEmail: record.contactEmail,
      outreachStatus: record.outreachStatus,
      priorityTier: record.priorityTier,
      followUpDate: record.followUpDate,
      repNotes: record.repNotes
    });
  };

  const handleSaveEdit = async (id: string) => {
    await onUpdateProspect(id, editDraft);
    setEditingId(null);
  };

  const handleSaveActive = async () => {
    setIsSavingCurrent(true);
    try {
      await onSaveCurrentToDb();
    } finally {
      setIsSavingCurrent(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProspectForm.companyName.trim()) return;
    await onCreateManualProspect({
      ...newProspectForm,
      overallScore: 70,
      verdictBand: 'Possible fit',
      confidenceLevel: 'Medium',
      priorityTier: 'Tier 2 - Strategic',
      flourishSummary: `Added manually by IOMETE sales team for outreach qualification.`,
      primaryFriction: 'Pending full .md workflow technical discovery.',
      targetPersona: newProspectForm.contactRole || 'VP of Data Engineering',
      nextAction: 'Run FitLens Gemini Research & Qualification',
      followUpDate: new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10)
    });
    setNewProspectForm({
      companyName: '',
      industry: '',
      websiteOrDomain: '',
      dataScale: '',
      currentStack: '',
      contactName: '',
      contactRole: 'VP of Data Engineering',
      contactEmail: '',
      outreachStatus: 'Qualified - Approach Now',
      repNotes: ''
    });
    setShowAddForm(false);
  };

  const handleExportCsv = () => {
    const headers = [
      'Company Name',
      'Industry',
      'Website',
      'Fit Verdict',
      'Fit Score',
      'Data Scale',
      'Current Tech Stack',
      'Compliance Posture',
      'Outreach Status',
      'Priority Tier',
      'Target Persona',
      'Contact Name',
      'Contact Email',
      'Follow-Up Date',
      'Flourish Summary',
      'Primary Friction',
      'Rep Notes'
    ];
    const escapeCsv = (val: string | number | null) =>
      `"${String(val ?? 'Not scored').replace(/"/g, '""')}"`;

    const rows = prospects.map((p) =>
      [
        p.companyName,
        p.industry,
        p.websiteOrDomain,
        p.verdictBand,
        p.overallScore ?? 'Insufficient information',
        p.dataScale,
        p.currentStack,
        p.compliancePosture,
        p.outreachStatus,
        p.priorityTier,
        p.targetPersona,
        p.contactName,
        p.contactEmail,
        p.followUpDate,
        p.flourishSummary,
        p.primaryFriction,
        p.repNotes
      ]
        .map(escapeCsv)
        .join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'iomete-prospect-outreach-database.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const qualifiedCount = prospects.filter(
    (p) =>
      p.outreachStatus === 'Qualified - Approach Now' ||
      p.outreachStatus === 'Discovery Scheduled' ||
      p.outreachStatus === 'PoC / Pilot Active'
  ).length;

  return (
    <section id="prospect-db-section" className="py-6 space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <p className="font-mono text-xs text-[#66665f]">
              ( 04 / IOMETE Team Prospect & Outreach Database )
            </p>
            {dbStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono tracking-wider border ${
                  dbStatus.backend === 'tigerdata' && dbStatus.connected
                    ? 'bg-[#E8ECE8] text-[#2D382D] border-[#2D382D]/40 font-medium'
                    : 'bg-[#f5f5f1] text-[#66665f] border-[#dcdcd5]'
                }`}
                title={
                  dbStatus.backend === 'tigerdata'
                    ? 'Connected to TigerData (Tiger Cloud PostgreSQL)'
                    : 'Using local disk database (data/prospects_db.json)'
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    dbStatus.connected ? 'bg-[#2D382D]' : 'bg-[#bf000f]'
                  }`}
                />
                <span>
                  Storage: {dbStatus.backend === 'tigerdata' ? 'TigerData Cloud' : 'Local Disk'}
                </span>
              </span>
            )}
          </div>
          <h2 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-normal leading-[1.06] tracking-[-0.03em] text-[#121212]">
            Persistent account directory for sales & engineering outreach.
          </h2>
          <p className="text-xs text-[#66665f] mt-1.5 max-w-2xl">
            Every analyzed company is stored with its fit score, stack, scale, flourish catalysts, and contact status so the IOMETE team can prioritize outreach and reload any account brief.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSaveActive}
            disabled={isSavingCurrent}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {isSavingCurrent
                ? 'Syncing...'
                : `Save / Update "${activeCompanyName.slice(0, 22)}" in DB`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-mono text-[#121212] bg-white border border-[#dcdcd5] hover:border-[#2D382D] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#2D382D]" />
            <span>Add Prospect Record</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-mono text-[#2D382D] border border-[#2D382D]/40 hover:border-[#2D382D] hover:bg-[#E8ECE8] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CRM CSV ({prospects.length})</span>
          </button>
        </div>
      </div>

      {/* Optional Add Manual Prospect Drawer */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-white border border-[#2D382D] p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#e1e1da] pb-3">
            <p className="font-mono text-xs text-[#2D382D] font-medium">
              New Target Account Record for IOMETE Outreach
            </p>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="font-mono text-xs text-[#66665f] hover:text-[#121212] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={newProspectForm.companyName}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, companyName: e.target.value })
                }
                placeholder="e.g. Nordische Clearing Bank"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Industry & Vertical
              </label>
              <input
                type="text"
                value={newProspectForm.industry}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, industry: e.target.value })
                }
                placeholder="e.g. FinTech / Sovereign Banking"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Data Scale & Volume
              </label>
              <input
                type="text"
                value={newProspectForm.dataScale}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, dataScale: e.target.value })
                }
                placeholder="e.g. 450 TB on S3 / MinIO"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Current Stack
              </label>
              <input
                type="text"
                value={newProspectForm.currentStack}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, currentStack: e.target.value })
                }
                placeholder="e.g. Snowflake + dbt + AWS EKS"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                value={newProspectForm.contactName}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, contactName: e.target.value })
                }
                placeholder="e.g. Elena Rostova"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={newProspectForm.contactEmail}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, contactEmail: e.target.value })
                }
                placeholder="elena@company.com"
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Outreach Stage
              </label>
              <select
                value={newProspectForm.outreachStatus}
                onChange={(e) =>
                  setNewProspectForm({
                    ...newProspectForm,
                    outreachStatus: e.target.value as OutreachStatus
                  })
                }
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              >
                {OUTREACH_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[11px] text-[#66665f] mb-1">
                Initial Approach Notes
              </label>
              <input
                type="text"
                value={newProspectForm.repNotes}
                onChange={(e) =>
                  setNewProspectForm({ ...newProspectForm, repNotes: e.target.value })
                }
                placeholder="Key trigger or intro angle..."
                className="w-full px-3 py-2 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-xs focus:border-[#2D382D] outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono bg-[#2D382D] text-[#f8f8f5] hover:bg-[#1f271f] cursor-pointer"
            >
              Save Prospect to Database
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#dcdcd5] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-[#2D382D] text-[#f8f8f5]'
                : 'bg-[#f5f5f1] text-[#66665f] hover:text-[#121212]'
            }`}
          >
            All Saved ({prospects.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Qualified - Approach Now')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
              statusFilter === 'Qualified - Approach Now'
                ? 'bg-[#2D382D] text-[#f8f8f5]'
                : 'bg-[#f5f5f1] text-[#66665f] hover:text-[#121212]'
            }`}
          >
            Approach Now
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Discovery Scheduled')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
              statusFilter === 'Discovery Scheduled'
                ? 'bg-[#2D382D] text-[#f8f8f5]'
                : 'bg-[#f5f5f1] text-[#66665f] hover:text-[#121212]'
            }`}
          >
            Discovery Scheduled
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Disqualified - Do Not Pitch')}
            className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
              statusFilter === 'Disqualified - Do Not Pitch'
                ? 'bg-[#2D382D] text-[#f8f8f5]'
                : 'bg-[#f5f5f1] text-[#66665f] hover:text-[#121212]'
            }`}
          >
            Disqualified / Hold
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#66665f] hidden sm:inline tabular-nums">
            Active Pipeline: <strong className="text-[#2D382D]">{qualifiedCount} Qualified</strong>
          </span>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-[#66665f] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, stack, contact..."
              aria-label="Search saved prospects"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#f5f5f1] border border-[#dcdcd5] focus:border-[#2D382D] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Structured Prospect Database Table */}
      <div className="bg-white border border-[#dcdcd5] overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[980px]">
          <thead>
            <tr className="border-b border-[#dcdcd5] bg-[#f8f8f5] font-mono text-[11px] text-[#66665f]">
              <th className="py-3.5 px-4 font-medium">Company & Stack</th>
              <th className="py-3.5 px-4 font-medium">Scale & Residency</th>
              <th className="py-3.5 px-4 font-medium">Fit Score & Verdict</th>
              <th className="py-3.5 px-4 font-medium">Target Contact & Role</th>
              <th className="py-3.5 px-4 font-medium">Outreach Status & Follow-Up</th>
              <th className="py-3.5 px-4 font-medium">Approach Strategy & Rep Notes</th>
              <th className="py-3.5 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1e1da] text-xs">
            {filteredProspects.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 px-4 text-center font-mono text-xs text-[#66665f]"
                >
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No prospect records match your filter criteria.'
                    : 'No saved prospect records in database. Research an account or run an analysis to save accounts to your pipeline.'}
                </td>
              </tr>
            )}
            {filteredProspects.map((prospect) => {
              const isEditing = editingId === prospect.id;
              const isCurrent =
                prospect.companyName.toLowerCase() === activeCompanyName.toLowerCase();

              return (
                <tr
                  key={prospect.id}
                  className={`transition-colors ${
                    isCurrent ? 'bg-[#E8ECE8]/45' : 'hover:bg-[#f8f8f5]'
                  }`}
                >
                  {/* Col 1: Company & Stack */}
                  <td className="py-4 px-4 align-top max-w-[220px]">
                    <div className="font-display text-base font-medium text-[#121212] flex items-center gap-2">
                      <span>{prospect.companyName}</span>
                      {isCurrent && (
                        <span className="font-mono text-[10px] text-[#2D382D] underline">
                          [Active]
                        </span>
                      )}
                    </div>
                    <p className="text-[#66665f] mt-0.5">{prospect.industry}</p>
                    <p className="font-mono text-[11px] text-[#2c2c2a] mt-1.5">
                      Stack: {prospect.currentStack}
                    </p>
                  </td>

                  {/* Col 2: Scale & Compliance */}
                  <td className="py-4 px-4 align-top max-w-[180px]">
                    <p className="font-mono text-[#121212] font-medium">
                      {prospect.dataScale}
                    </p>
                    <p className="text-[11px] text-[#66665f] mt-1">
                      {prospect.compliancePosture}
                    </p>
                  </td>

                  {/* Col 3: Fit Score & Verdict */}
                  <td className="py-4 px-4 align-top whitespace-nowrap">
                    {prospect.overallScore !== null &&
                    prospect.verdictBand !== 'Insufficient information' ? (
                      <div className="font-display text-lg font-medium tabular-nums text-[#121212]">
                        {prospect.overallScore}
                        <span className="text-xs font-mono text-[#66665f]">/100</span>
                      </div>
                    ) : (
                      <div className="font-mono text-xs font-medium text-[#b45309]">
                        Not scored
                      </div>
                    )}
                    <p
                      className={`font-mono text-[11px] font-medium ${
                        prospect.verdictBand === 'Strong fit'
                          ? 'text-[#2D382D]'
                          : prospect.verdictBand === 'Possible fit'
                          ? 'text-[#121212]'
                          : prospect.verdictBand === 'Insufficient information'
                          ? 'text-[#b45309]'
                          : 'text-[#bf000f]'
                      }`}
                    >
                      {prospect.verdictBand}
                    </p>
                    <p className="font-mono text-[10px] text-[#66665f] mt-0.5">
                      {prospect.priorityTier}
                    </p>
                  </td>

                  {/* Col 4: Contact & Persona */}
                  <td className="py-4 px-4 align-top max-w-[190px]">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editDraft.contactName || ''}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, contactName: e.target.value })
                          }
                          placeholder="Contact Name"
                          className="w-full px-2 py-1 bg-[#f5f5f1] border border-[#2D382D] font-mono text-[11px]"
                        />
                        <input
                          type="text"
                          value={editDraft.contactEmail || ''}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, contactEmail: e.target.value })
                          }
                          placeholder="Contact Email"
                          className="w-full px-2 py-1 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-[11px]"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-[#121212]">{prospect.contactName}</p>
                        <p className="text-[11px] text-[#66665f]">{prospect.contactRole}</p>
                        {prospect.contactEmail && (
                          <p className="font-mono text-[11px] text-[#2D382D] mt-1 truncate">
                            {prospect.contactEmail}
                          </p>
                        )}
                      </>
                    )}
                  </td>

                  {/* Col 5: Outreach Status & Follow-Up */}
                  <td className="py-4 px-4 align-top max-w-[190px]">
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <select
                          value={editDraft.outreachStatus || prospect.outreachStatus}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              outreachStatus: e.target.value as OutreachStatus
                            })
                          }
                          className="w-full px-2 py-1 bg-[#f5f5f1] border border-[#2D382D] font-mono text-[11px]"
                        >
                          {OUTREACH_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editDraft.followUpDate || prospect.followUpDate}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, followUpDate: e.target.value })
                          }
                          className="w-full px-2 py-1 bg-[#f5f5f1] border border-[#dcdcd5] font-mono text-[11px]"
                        />
                      </div>
                    ) : (
                      <>
                        <p
                          className={`font-mono text-[11px] font-medium ${
                            prospect.outreachStatus === 'Disqualified - Do Not Pitch'
                              ? 'text-[#bf000f]'
                              : 'text-[#2D382D]'
                          }`}
                        >
                          {prospect.outreachStatus}
                        </p>
                        <p className="font-mono text-[11px] text-[#66665f] mt-1 tabular-nums">
                          Follow-up: {prospect.followUpDate}
                        </p>
                      </>
                    )}
                  </td>

                  {/* Col 6: Rep Notes & Flourish Context */}
                  <td className="py-4 px-4 align-top max-w-[260px]">
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={editDraft.repNotes || ''}
                        onChange={(e) =>
                          setEditDraft({ ...editDraft, repNotes: e.target.value })
                        }
                        className="w-full p-2 bg-[#f5f5f1] border border-[#2D382D] font-mono text-[11px]"
                      />
                    ) : (
                      <p className="text-[#2c2c2a] leading-relaxed line-clamp-3">
                        {prospect.repNotes}
                      </p>
                    )}
                  </td>

                  {/* Col 7: Actions */}
                  <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(prospect.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#2D382D] text-[#f8f8f5] font-mono text-[11px] cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(prospect)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#dcdcd5] hover:border-[#2D382D] font-mono text-[11px] text-[#121212] cursor-pointer"
                          title="Edit contact & outreach status"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}

                      {prospect.markdownContent && (
                        <button
                          type="button"
                          onClick={() => onLoadProspect(prospect)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#ebebe5] hover:bg-[#2D382D] hover:text-[#f8f8f5] font-mono text-[11px] text-[#121212] transition-colors cursor-pointer"
                          title="Load this company into the analyzer"
                        >
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteProspect(prospect.id)}
                        className="p-1.5 text-[#66665f] hover:text-[#bf000f] transition-colors cursor-pointer"
                        title="Remove from database"
                        aria-label={`Remove ${prospect.companyName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
