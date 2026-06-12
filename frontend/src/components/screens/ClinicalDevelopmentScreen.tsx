
// ============================================================================
// Clinical Development Screen — v0.125.55
// Blinding workflows, TLF Shell Tracker, dead-count stat card fixes
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import {
  Beaker, Activity, Target, Calendar, Users, FileText,
  Globe, AlertTriangle, CheckCircle, Clock, TrendingUp,
  RefreshCw, Shield, BarChart3, Layers,
  Zap, GitBranch, MapPin, Stethoscope, Lock, FileOutput,
  Building2, UserCheck, AlertCircle,
  Plus, X, ChevronRight, ChevronDown, ArrowLeft, Sparkles, ExternalLink,
  Eye, ClipboardList, Syringe, Database, KeyRound,
  LayoutGrid, List, GanttChart, ArrowUpDown, Download, Filter as FilterIcon,
  Maximize2, Info, FlaskConical, Package, PieChart,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { PDFDocumentPreview } from '@/components/documents/PDFDocumentPreview';
import { useActiveScopeStore } from '@/store/useActiveScopeStore';
import { useUSDMStore } from '@/store/useUSDMStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import { useAppStore } from '@/store/useAppStore';
import { DualRepDocumentBlock } from '@/components/documents/DualRepDocumentBlock'; // v0.125.75
import {
  CLINICAL_STUDIES, PROGRAMS,
  getStudiesForProgram, getStudyById,
  type ClinicalStudy, type TLFShellItem,
  type RAGStatus, type SiteActivationStage, type BlindingStatus,
} from '@/data/scopeData';

// ============================================================================
// TYPES
// ============================================================================

type PortfolioTab = 'portfolio' | 'intelligence';
type StudyTab = 'overview' | 'protocol' | 'operations' | 'startup' | 'monitoring' | 'handoff';

interface EmergencyUnblindRecord {
  subjectId: string;
  treatmentArm: string;
  justification: string;
  signatory: string;
  timestamp: string;
  hash: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getRisk(s: ClinicalStudy): 'Low'|'Medium'|'High'|'None' {
  if (s.status === 'Completed') return 'None';
  const pct = s.enrolledSubjects / s.targetEnrollment;
  const mo = Math.max(1, (new Date(s.estimatedCompletion).getTime() - Date.now()) / 2628e6);
  if (pct < 0.3 && mo < 18) return 'High';
  if (pct < 0.6 || mo < 12) return 'Medium';
  return 'Low';
}
function getRate(s: ClinicalStudy) {
  const wk = Math.max(1, (Date.now() - new Date(s.startDate).getTime()) / 6048e5);
  return Math.round((s.enrolledSubjects / wk) * 10) / 10;
}
function getDaysToCompletion(s: ClinicalStudy) {
  return Math.max(0, Math.round((new Date(s.primaryCompletionDate ?? s.estimatedCompletion).getTime() - Date.now()) / 86400000));
}
function phaseColor(p: string) {
  if (p.includes('1')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (p.includes('2')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (p.includes('3')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
}
function riskColor(r: string) {
  if (r === 'High')   return 'text-red-400 bg-red-500/15';
  if (r === 'Medium') return 'text-amber-400 bg-amber-500/15';
  if (r === 'Low')    return 'text-emerald-400 bg-emerald-500/15';
  return 'text-slate-500 bg-slate-500/10';
}
function statusColor(s: string) {
  if (s === 'Enrolling' || s === 'Active') return 'text-emerald-400';
  if (s === 'Completed') return 'text-blue-400';
  return 'text-slate-400';
}
function ragDot(r: RAGStatus) {
  if (r === 'Green') return 'bg-emerald-500';
  if (r === 'Amber') return 'bg-amber-500';
  return 'bg-red-500';
}
function ragBadge(r: RAGStatus) {
  if (r === 'Green') return 'text-emerald-400 bg-emerald-500/15';
  if (r === 'Amber') return 'text-amber-400 bg-amber-500/15';
  return 'text-red-400 bg-red-500/15';
}
const STAGE_ORDER: SiteActivationStage[] = [
  'Feasibility','Site Selection','Contracting',
  'IRB/IEC Submission','IRB/IEC Approval','SIV','Activated','Closed',
];
function stageIndex(stage: SiteActivationStage) { return STAGE_ORDER.indexOf(stage); }
function siteMock(s: ClinicalStudy) {
  return s.activeRegions.map((r, i) => ({
    region: r,
    sites: Math.max(1, Math.round((s.activeSites||1)*[.35,.28,.18,.10,.06,.03][i%6])),
    enrolled: Math.round(s.enrolledSubjects*[.40,.30,.15,.08,.05,.02][i%6]),
    risk: ['Low','Low','Medium','Medium','High','Low'][((s.enrolledSubjects+i)%6)] as 'Low'|'Medium'|'High',
  }));
}
function sha256Mock(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0').repeat(8);
}
function blindingBg(status: BlindingStatus) {
  if (status === 'Blinded')   return 'bg-violet-500/5 border-violet-500/20';
  if (status === 'Unblinded') return 'bg-emerald-500/5 border-emerald-500/20';
  return 'bg-blue-500/5 border-blue-500/20';
}
function blindingIconColor(status: BlindingStatus) {
  if (status === 'Blinded')   return 'text-violet-400';
  if (status === 'Unblinded') return 'text-emerald-400';
  return 'text-blue-400';
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function StatCard({ label, value, sub, icon, color, onClick, badge }: {
  label: string; value: string|number; sub?: string;
  icon: React.ReactNode; color: string;
  onClick?: () => void; badge?: number;
}) {
  return (
    <Card onClick={onClick} className={onClick ? 'cursor-pointer hover:border-accent-blue/40 transition-colors' : ''}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
          <div className="flex items-center gap-1.5">
            {badge !== undefined && badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>}
            <div className={`p-1.5 rounded-md ${color}`}>{icon}</div>
          </div>
        </div>
        <div className="text-2xl font-semibold text-text-primary">{value}</div>
        {sub && <div className={`text-xs mt-0.5 ${onClick ? 'text-accent-blue/70' : 'text-text-muted'}`}>{sub}</div>}
      </CardContent>
    </Card>
  );
}

function BlindingBadge({ status }: { status: BlindingStatus }) {
  const colors = { Blinded: 'bg-violet-500/15 text-violet-400 border-violet-500/30', 'Open-Label': 'bg-blue-500/15 text-blue-400 border-blue-500/30', Unblinded: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  return <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${colors[status]}`}><KeyRound className="w-2.5 h-2.5"/>{status}</span>;
}

// ============================================================================
// EMERGENCY UNBLIND MODAL
// ============================================================================

function EmergencyUnblindModal({ study, onClose, onComplete }: {
  study: ClinicalStudy;
  onClose: () => void;
  onComplete: (record: EmergencyUnblindRecord) => void;
}) {
  const [step, setStep] = useState<1|2|3>(1);
  const [subjectId, setSubjectId] = useState('');
  const [justification, setJustification] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [record, setRecord] = useState<EmergencyUnblindRecord|null>(null);

  const DEMO_PIN = '1234';
  const DEMO_ARMS = ['Ligrastinib 240mg QD', 'Docetaxel 75mg/m²'];

  const handleConfirm = () => {
    if (pin !== DEMO_PIN) { setPinError('Invalid PIN. Demo PIN: 1234'); return; }
    const arm = DEMO_ARMS[Math.floor(Math.random() * DEMO_ARMS.length)];
    const ts = new Date().toISOString();
    const r: EmergencyUnblindRecord = {
      subjectId, treatmentArm: arm, justification,
      signatory: 'Dr. Medical Monitor (Demo)',
      timestamp: ts,
      hash: sha256Mock(`${subjectId}|${arm}|${ts}|${DEMO_PIN}`),
    };
    setRecord(r);
    onComplete(r);
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step < 3 ? onClose : undefined} />
      <div className="relative bg-surface-elevated border border-red-500/30 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg"><KeyRound className="w-4 h-4 text-red-400"/></div>
            <div><h2 className="font-semibold text-text-primary">Emergency Unblinding</h2><p className="text-xs text-text-muted">21 CFR Part 11 — Audit logged</p></div>
          </div>
          {step < 3 && <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted"><X className="w-4 h-4"/></button>}
        </div>

        {step === 1 && (
          <div className="px-6 py-5 space-y-4">
            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-xs text-red-400">⚠ Emergency unblinding is an irreversible action. All access is audited per ICH E6(R3) §6.15.</div>
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Subject ID *</label>
              <input value={subjectId} onChange={e=>setSubjectId(e.target.value)} placeholder="e.g. LIG-302-US-001-0001" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-400"/></div>
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Clinical Justification * (min 20 chars)</label>
              <textarea value={justification} onChange={e=>setJustification(e.target.value)} rows={3} placeholder="Describe the medical emergency requiring immediate unblinding…" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-red-400 resize-none"/></div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={() => setStep(2)} disabled={!subjectId.trim() || justification.trim().length < 20} className="bg-red-500 hover:bg-red-600">Continue →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-5 space-y-4">
            <div className="p-3 bg-surface-elevated rounded-lg text-xs space-y-1">
              <div><span className="text-text-muted">Subject:</span> <span className="font-mono text-text-primary">{subjectId}</span></div>
              <div><span className="text-text-muted">Study:</span> <span className="text-text-primary">{study.protocolNumber}</span></div>
            </div>
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Medical Monitor PIN *</label>
              <input type="password" value={pin} onChange={e=>{ setPin(e.target.value); setPinError(''); }} placeholder="Enter PIN (demo: 1234)" className={`w-full px-3 py-2 text-sm bg-surface-card border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none ${pinError ? 'border-red-500' : 'border-border focus:border-red-400'}`}/>
              {pinError && <p className="text-xs text-red-400 mt-1">{pinError}</p>}</div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
              <Button variant="primary" size="sm" onClick={handleConfirm} disabled={!pin} className="bg-red-500 hover:bg-red-600">Reveal Treatment Arm</Button>
            </div>
          </div>
        )}

        {step === 3 && record && (
          <div className="px-6 py-5 space-y-4">
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-center">
              <div className="text-sm font-semibold text-text-muted mb-1">Treatment Assignment</div>
              <div className="text-xl font-bold text-text-primary">{record.treatmentArm}</div>
              <div className="text-xs text-text-muted mt-1">{record.subjectId}</div>
            </div>
            <div className="p-3 bg-surface-elevated rounded-lg text-xs space-y-1.5">
              <div className="text-text-muted font-semibold uppercase tracking-wide text-[10px] mb-2">Audit Record — Part 11 Compliant</div>
              <div className="flex justify-between"><span className="text-text-muted">Timestamp:</span><span className="font-mono text-text-primary">{new Date(record.timestamp).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Signatory:</span><span className="text-text-primary">{record.signatory}</span></div>
              <div><span className="text-text-muted">SHA-256:</span><span className="font-mono text-[10px] text-text-muted ml-2 break-all">{record.hash}</span></div>
            </div>
            <Button variant="primary" size="sm" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// FORMAL UNBLIND MODAL
// ============================================================================

function FormalUnblindModal({ study, onClose, onComplete }: {
  study: ClinicalStudy; onClose: () => void; onComplete: () => void;
}) {
  const [step, setStep] = useState<1|2|3>(1);
  const [bioPin, setBioPin] = useState('');
  const [cmoPin, setCmoPin] = useState('');
  const [bioError, setBioError] = useState('');
  const [cmoError, setCmoError] = useState('');
  const BIO_PIN = '1234'; const CMO_PIN = '5678';

  const handleBioSig = () => {
    if (bioPin !== BIO_PIN) { setBioError('Invalid PIN. Demo: 1234'); return; }
    setBioError(''); setStep(2);
  };
  const handleCmoSig = () => {
    if (cmoPin !== CMO_PIN) { setCmoError('Invalid PIN. Demo: 5678'); return; }
    setCmoError(''); onComplete(); setStep(3);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step < 3 ? onClose : undefined}/>
      <div className="relative bg-surface-elevated border border-violet-500/30 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg"><KeyRound className="w-4 h-4 text-violet-400"/></div>
            <div><h2 className="font-semibold text-text-primary">Formal Unblinding</h2><p className="text-xs text-text-muted">Dual e-signature — 21 CFR Part 11</p></div>
          </div>
          {step < 3 && <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted"><X className="w-4 h-4"/></button>}
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {[1,2,3].map(s => <div key={s} className={`flex-1 h-1.5 rounded-full ${step>=s?'bg-violet-500':'bg-surface-elevated'}`}/>)}
          </div>
          {step === 1 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold text-text-primary">Step 1: Biostatistician E-Signature</div>
              <p className="text-xs text-text-muted">The biostatistician confirms all analyses are complete and datasets are locked prior to unblinding.</p>
              <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Biostatistician PIN * (demo: 1234)</label>
                <input type="password" value={bioPin} onChange={e=>{setBioPin(e.target.value);setBioError('');}} placeholder="Enter PIN" className={`w-full px-3 py-2 text-sm bg-surface-card border rounded-lg text-text-primary focus:outline-none ${bioError?'border-red-500':'border-border focus:border-violet-400'}`}/>
                {bioError&&<p className="text-xs text-red-400 mt-1">{bioError}</p>}</div>
              <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button variant="primary" size="sm" onClick={handleBioSig} disabled={!bioPin}>Sign & Continue →</Button></div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold"><CheckCircle className="w-4 h-4"/>Biostatistician signed</div>
              <div className="text-sm font-semibold text-text-primary">Step 2: CMO E-Signature</div>
              <p className="text-xs text-text-muted">The Chief Medical Officer confirms authorisation for formal unblinding of {study.protocolNumber}.</p>
              <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">CMO PIN * (demo: 5678)</label>
                <input type="password" value={cmoPin} onChange={e=>{setCmoPin(e.target.value);setCmoError('');}} placeholder="Enter PIN" className={`w-full px-3 py-2 text-sm bg-surface-card border rounded-lg text-text-primary focus:outline-none ${cmoError?'border-red-500':'border-border focus:border-violet-400'}`}/>
                {cmoError&&<p className="text-xs text-red-400 mt-1">{cmoError}</p>}</div>
              <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button variant="primary" size="sm" onClick={handleCmoSig} disabled={!cmoPin}>Authorise Unblinding</Button></div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto"/>
              <div><div className="font-semibold text-text-primary text-lg">Study Unblinded</div><p className="text-sm text-text-muted mt-1">{study.protocolNumber} — Randomisation code list now accessible</p></div>
              <div className="p-3 bg-surface-elevated rounded-lg text-xs text-left"><div className="text-text-muted font-semibold text-[10px] uppercase tracking-wide mb-1.5">Audit Trail</div><div>Biostatistician + CMO dual e-sig recorded · {new Date().toLocaleString()} · SHA-256: {sha256Mock('formal-unblind-'+Date.now()).slice(0,32)}…</div></div>
              <Button variant="primary" size="sm" className="w-full" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TLF SHELL TRACKER
// ============================================================================

function TLFShellTracker({ study }: { study: ClinicalStudy }) {
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const toast = useToast();
  const [tlfs, setTlfs] = useState<TLFShellItem[]>(study.tlfOutputs ?? []);
  const [showApprovePin, setShowApprovePin] = useState<string|null>(null);
  const [approvePin, setApprovePinVal] = useState('');
  const [approvePinError, setApprovePinError] = useState('');
  const [assigningId, setAssigningId] = useState<string|null>(null);
  const [assignerName, setAssignerName] = useState('');

  const STATUS_FLOW: TLFShellItem['status'][] = ['Shell','Programming','QC','Statistician Review','Approved','Locked'];
  const statusColor = (s: TLFShellItem['status']) => {
    const m: Record<string, string> = { Shell:'bg-slate-500/15 text-slate-400', Programming:'bg-blue-500/15 text-blue-400', QC:'bg-amber-500/15 text-amber-400', 'Statistician Review':'bg-purple-500/15 text-purple-400', Approved:'bg-teal-500/15 text-teal-400', Locked:'bg-emerald-500/15 text-emerald-400' };
    return m[s] ?? 'bg-slate-500/15 text-slate-400';
  };
  const advance = (id: string) => setTlfs(prev => prev.map(t => t.id === id ? { ...t, status: STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(t.status)+1, STATUS_FLOW.length-1)] } : t));
  const handleApprove = (id: string) => {
    if (approvePin !== '1234') { setApprovePinError('Demo PIN: 1234'); return; }
    setTlfs(prev => prev.map(t => t.id === id ? { ...t, status: 'Approved' } : t));
    setShowApprovePin(null); setApprovePinVal(''); setApprovePinError('');
    toast.success('TLF approved — e-signature recorded');
  };
  const handleAssign = (id: string) => {
    if (!assignerName.trim()) return;
    advance(id); setAssigningId(null); setAssignerName('');
    toast.success(`Programmer assigned — status → Programming`);
  };

  const locked = tlfs.filter(t => t.status === 'Locked').length;
  const approved = tlfs.filter(t => t.status === 'Approved').length;
  const inProg = tlfs.filter(t => !['Locked','Approved'].includes(t.status)).length;
  const overdue = tlfs.filter(t => t.isOverdue).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/15 rounded-lg"><BarChart3 className="w-4 h-4 text-teal-400"/></div>
          <div>
            <div className="text-sm font-semibold text-text-primary">TLF Shell Tracker</div>
            <div className="text-xs text-text-muted">ICH E3 CSR outputs · {tlfs.length} planned</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {overdue > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-semibold">{overdue} overdue</span>}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">{locked} locked</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-semibold">{approved} approved</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">{inProg} in progress</span>
        </div>
      </div>
      <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden mb-4">
        <div className="h-full bg-emerald-500 rounded-full" style={{width:`${Math.round(((locked+approved)/Math.max(1,tlfs.length))*100)}%`}}/>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead><tr className="border-b border-border">{['Output','Title','CSR Section','Type','Status','Action'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i<5?'text-left':'text-right'}`}>{h}</th>)}</tr></thead>
          <tbody>
            {tlfs.map(tlf => (
              <tr key={tlf.id} className={`border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors ${tlf.isOverdue?'bg-red-500/3':''}`}>
                <td className="py-2.5 font-mono text-accent-blue">{tlf.number}</td>
                <td className="py-2.5 text-text-primary max-w-[180px] truncate">{tlf.title}{tlf.isOverdue&&<span className="ml-1 text-red-400">⚠</span>}</td>
                <td className="py-2.5 text-text-muted">{tlf.csrSection}</td>
                <td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${tlf.outputType==='Table'?'bg-blue-500/15 text-blue-400':tlf.outputType==='Figure'?'bg-purple-500/15 text-purple-400':'bg-slate-500/15 text-slate-400'}`}>{tlf.outputType}</span></td>
                <td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${statusColor(tlf.status)}`}>{tlf.status}</span></td>
                <td className="py-2.5 text-right">
                  {tlf.status === 'Shell' && (
                    assigningId === tlf.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input value={assignerName} onChange={e=>setAssignerName(e.target.value)} placeholder="Programmer name" className="px-2 py-1 text-[10px] bg-surface-card border border-border rounded text-text-primary focus:outline-none focus:border-accent-blue w-28"/>
                        <button onClick={()=>handleAssign(tlf.id)} className="px-2 py-1 text-[10px] bg-accent-blue text-white rounded">Assign</button>
                        <button onClick={()=>setAssigningId(null)} className="text-text-muted px-1"><X className="w-3 h-3"/></button>
                      </div>
                    ) : <button onClick={()=>setAssigningId(tlf.id)} className="text-[10px] text-accent-blue hover:underline">Assign Programmer</button>
                  )}
                  {tlf.status === 'Programming' && <button onClick={()=>advance(tlf.id)} className="text-[10px] text-amber-400 hover:underline">Submit to QC</button>}
                  {tlf.status === 'QC' && <button onClick={()=>advance(tlf.id)} className="text-[10px] text-purple-400 hover:underline">QC Pass → Review</button>}
                  {tlf.status === 'Statistician Review' && (
                    showApprovePin === tlf.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input type="password" value={approvePin} onChange={e=>{setApprovePinVal(e.target.value);setApprovePinError('');}} placeholder="PIN (1234)" className={`px-2 py-1 text-[10px] bg-surface-card border rounded text-text-primary focus:outline-none w-20 ${approvePinError?'border-red-500':'border-border'}`}/>
                        <button onClick={()=>handleApprove(tlf.id)} className="px-2 py-1 text-[10px] bg-teal-500 text-white rounded">Approve</button>
                        <button onClick={()=>setShowApprovePin(null)} className="text-text-muted px-1"><X className="w-3 h-3"/></button>
                      </div>
                    ) : <button onClick={()=>setShowApprovePin(tlf.id)} className="text-[10px] text-teal-400 hover:underline">Approve (e-sig)</button>
                  )}
                  {tlf.status === 'Approved' && <button onClick={()=>advance(tlf.id)} className="text-[10px] text-emerald-400 hover:underline">Lock</button>}
                  {tlf.status === 'Locked' && <button onClick={()=>{setActiveModule('biostats');toast.success('Opening Biostatistics — TLF tab');}} className="text-[10px] text-accent-blue hover:underline">View in Biostatistics</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// NEW STUDY MODAL
// ============================================================================

function NewStudyModal({ onClose }: { onClose: () => void }) {
  const createStudy = useCTMSStore(s => s.createStudy);
  const usdmCreate = useUSDMStore(s => s.createStudy);
  const usdmDesign = useUSDMStore(s => s.createStudyDesign);
  const toast = useToast();
  const [form, setForm] = useState({ protocolNumber:'', shortTitle:'', indication:'', phase:'Phase 1', targetEnrollment:'', sponsor:'Ligature Therapeutics', plannedStartDate:new Date().toISOString().split('T')[0] });
  const phases = ['Phase 1','Phase 1/2','Phase 2','Phase 2b','Phase 3','Phase 4','PASS'];
  const handleCreate = () => {
    if (!form.protocolNumber || !form.shortTitle) { toast.error('Protocol number and title required'); return; }
    createStudy({ protocolNumber:form.protocolNumber, title:form.shortTitle, shortTitle:form.shortTitle, indication:form.indication, phase:form.phase as any, targetEnrollment:parseInt(form.targetEnrollment)||0, sponsor:form.sponsor, plannedStartDate:form.plannedStartDate, status:'planning', productName:form.protocolNumber.split('-').slice(0,2).join('-') });
    const uStudy = usdmCreate({ studyTitle:form.shortTitle, studyShortTitle:form.shortTitle, studyRationale:'', studyPhase:{code:'',codeSystem:'C66737',decode:form.phase}, businessTherapeuticAreas:[], studyIdentifiers:[{id:`ident-${Date.now()}`,instanceType:'StudyIdentifier',studyIdentifier:form.protocolNumber,studyIdentifierScope:{id:`org-${Date.now()}`,instanceType:'Organization',organizationName:form.sponsor,organizationType:{code:'C70793',codeSystem:'C66733',decode:'Sponsor'}}}], studyProtocolVersions:[{id:`pv-${Date.now()}`,instanceType:'StudyProtocolVersion',briefTitle:form.shortTitle,officialTitle:form.shortTitle,protocolVersion:'0.1',protocolEffectiveDate:form.plannedStartDate,protocolStatus:{code:'C48660',codeSystem:'C66789',decode:'Draft'}}], createdBy:'current-user' });
    usdmDesign(uStudy.id,{studyDesignName:`${form.shortTitle} Design v0.1`,studyDesignDescription:'Add objectives and endpoints.'});
    toast.success(`Study ${form.protocolNumber} created — USDM scaffold initialised`); onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3"><div className="p-2 bg-emerald-500/20 rounded-lg"><Beaker className="w-4 h-4 text-emerald-400"/></div><h2 className="font-semibold text-text-primary">New Clinical Study</h2></div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Protocol Number *</label><input value={form.protocolNumber} onChange={e=>setForm(f=>({...f,protocolNumber:e.target.value}))} placeholder="e.g. LIG-2847-303" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"/></div>
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Phase *</label><select value={form.phase} onChange={e=>setForm(f=>({...f,phase:e.target.value}))} className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue">{phases.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
          </div>
          <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Short Title *</label><input value={form.shortTitle} onChange={e=>setForm(f=>({...f,shortTitle:e.target.value}))} placeholder="e.g. LIG-2847-303 Phase 3 (combo NSCLC)" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"/></div>
          <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Indication</label><input value={form.indication} onChange={e=>setForm(f=>({...f,indication:e.target.value}))} placeholder="e.g. KRAS G12C+ NSCLC combination therapy" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Target Enrollment</label><input type="number" value={form.targetEnrollment} onChange={e=>setForm(f=>({...f,targetEnrollment:e.target.value}))} placeholder="e.g. 450" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"/></div>
            <div><label className="text-xs text-text-muted uppercase tracking-wide mb-1 block">Planned Start</label><input type="date" value={form.plannedStartDate} onChange={e=>setForm(f=>({...f,plannedStartDate:e.target.value}))} className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"/></div>
          </div>
          <div className="flex items-center justify-between text-xs text-text-muted bg-surface-card rounded-lg px-3 py-2.5"><span>Creates CTMS record + USDM protocol scaffold</span><span className="text-violet-400">v0.1 Draft</span></div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button variant="primary" size="sm" onClick={handleCreate}><Plus className="w-4 h-4"/> Create Study</Button></div>
      </div>
    </div>
  );
}

// ============================================================================
// STUDY CARD
// ============================================================================

function StudyCard({ study, onSelect }: { study: ClinicalStudy; onSelect: () => void }) {
  const risk = getRisk(study);
  const pct = Math.round((study.enrolledSubjects / study.targetEnrollment) * 100);
  const rate = getRate(study);
  const isActive = study.status === 'Enrolling' || study.status === 'Active';
  const openDevs = (study.deviations ?? []).filter(d => d.status !== 'Resolved').length;
  return (
    <div onClick={onSelect} className={`group bg-surface-card border rounded-xl p-4 hover:border-accent-blue/50 hover:bg-surface-elevated transition-all cursor-pointer ${openDevs > 0 ? 'border-orange-500/20' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-text-muted">{study.protocolNumber}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${phaseColor(study.phase)}`}>{study.phase}</span>
            {risk !== 'None' && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskColor(risk)}`}>{risk} Risk</span>}
            {study.blindingStatus && <BlindingBadge status={study.blindingStatus}/>}
            {openDevs > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-500/15 text-orange-400">{openDevs} open dev</span>}
          </div>
          <div className="text-sm font-semibold text-text-primary leading-tight">{study.shortTitle}</div>
          <div className="text-xs text-text-muted mt-0.5">{study.indication}</div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1.5 mt-0.5">
          <span className={`text-xs font-medium ${statusColor(study.status)}`}>{study.status}</span>
          <ChevronRight className="w-4 h-4 text-accent-blue"/>
        </div>
      </div>
      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1"><span className="text-text-muted">Enrolled</span><span className="text-text-primary font-medium">{study.enrolledSubjects.toLocaleString()} / {study.targetEnrollment.toLocaleString()}</span></div>
        <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden"><div className={`h-full rounded-full ${pct>=100?'bg-blue-500':pct>=70?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-red-500'}`} style={{width:`${Math.min(100,pct)}%`}}/></div>
      </div>
      <div className="flex items-center gap-4 text-xs text-text-muted">
        {isActive && study.activeSites>0 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{study.activeSites} sites</span>}
        {isActive && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400"/>{rate}/wk</span>}
        {study.activeRegions.length>0 && <span className="flex items-center gap-1"><Globe className="w-3 h-3"/>{study.activeRegions.length} regions</span>}
        {study.status==='Completed' && <span className="flex items-center gap-1 text-blue-400"><CheckCircle className="w-3 h-3"/>Complete</span>}
      </div>
    </div>
  );
}

// ============================================================================
// PROGRAMME TIMELINE
// ============================================================================

function ProgrammeTimeline() {
  const SY=2020,EY=2031,TOTAL_MO=(EY-SY)*12;
  const now=new Date(),nowMo=(now.getFullYear()-SY)*12+now.getMonth(),nowPct=(nowMo/TOTAL_MO)*100;
  const toPct=(ds:string)=>{const d=new Date(ds);const mo=(d.getFullYear()-SY)*12+d.getMonth();return Math.max(0,Math.min(100,(mo/TOTAL_MO)*100));};
  const pc:Record<string,string>={'Phase 1':'bg-blue-500','Phase 1/2':'bg-blue-400','Phase 2':'bg-purple-500','Phase 2b':'bg-purple-400','Phase 3':'bg-emerald-500','Phase 4':'bg-teal-500','PASS':'bg-amber-500'};
  return (
    <div className="overflow-x-auto"><div className="min-w-[700px]">
      <div className="flex text-[10px] text-text-muted mb-2 pl-32">{Array.from({length:EY-SY+1},(_,i)=><div key={i} className="flex-1 text-center">{SY+i}</div>)}</div>
      <div className="space-y-1.5">{CLINICAL_STUDIES.map(s=>{const l=toPct(s.startDate),r=toPct(s.estimatedCompletion),w=r-l;return(<div key={s.id} className="flex items-center gap-2"><div className="w-28 flex-shrink-0 text-[10px] font-mono text-text-muted truncate text-right">{s.protocolNumber}</div><div className="flex-1 relative h-5"><div className="absolute inset-y-0" style={{left:`${l}%`,width:`${Math.max(0.5,w)}%`}}><div className={`h-full rounded ${pc[s.phase]??'bg-slate-500'} ${s.status==='Completed'?'opacity-60':''} flex items-center px-1.5 overflow-hidden`}><span className="text-[9px] text-white font-medium truncate">{s.phase}</span></div></div><div className="absolute inset-y-0 w-px bg-red-500/70" style={{left:`${nowPct}%`}}/></div></div>);})}</div>
      <div className="mt-2 pl-32 relative h-4"><div className="absolute top-0 h-full w-px bg-red-500/70" style={{left:`${nowPct}%`}}><span className="text-[9px] text-red-400 whitespace-nowrap ml-0.5">Today</span></div></div>
    </div></div>
  );
}

// ============================================================================
// INTELLIGENCE VIEW
// ============================================================================

// v0.125.75: IntelligenceView filter types
interface IntelFilters {
  program: string;         // programId | ''
  therapeuticArea: string; // 'oncology' | 'immunology' | '' etc.
  phase: string;           // StudyPhase | ''
  status: string;          // StudyStatus | ''
  study: string;           // study.id | ''
}
const EMPTY_INTEL_FILTERS: IntelFilters = { program:'', therapeuticArea:'', phase:'', status:'', study:'' };

function IntelligenceView({ onSelectStudy }: { onSelectStudy: (id: string) => void }) {
  // v0.125.75: Combo filter state
  const [intelFilters, setIntelFilters] = useState<IntelFilters>(EMPTY_INTEL_FILTERS);
  const setIF = (key: keyof IntelFilters, val: string) =>
    setIntelFilters(prev => ({ ...prev, [key]: val, ...(key !== 'study' ? {} : {}) }));
  const clearIF = () => setIntelFilters(EMPTY_INTEL_FILTERS);
  const activeIFCount = Object.values(intelFilters).filter(Boolean).length;

  // Derive option lists
  const intelOptions = useMemo(() => {
    const programs = Array.from(new Set(CLINICAL_STUDIES.map(s => s.programId)));
    const taMap: Record<string,string> = {};
    PROGRAMS.forEach(p => { taMap[p.id] = p.therapeuticAreaId; });
    const tas = Array.from(new Set(CLINICAL_STUDIES.map(s => taMap[s.programId]).filter(Boolean))).sort();
    const phases = Array.from(new Set(CLINICAL_STUDIES.map(s => s.phase))).sort();
    const statuses = Array.from(new Set(CLINICAL_STUDIES.map(s => s.status))).sort();
    return { programs, tas, phases, statuses };
  }, []);

  // Apply filters
  const filteredStudies = useMemo(() => {
    const taMap: Record<string,string> = {};
    PROGRAMS.forEach(p => { taMap[p.id] = p.therapeuticAreaId; });
    return CLINICAL_STUDIES.filter(s => {
      if (intelFilters.program && s.programId !== intelFilters.program) return false;
      if (intelFilters.therapeuticArea && taMap[s.programId] !== intelFilters.therapeuticArea) return false;
      if (intelFilters.phase && s.phase !== intelFilters.phase) return false;
      if (intelFilters.status && s.status !== intelFilters.status) return false;
      if (intelFilters.study && s.id !== intelFilters.study) return false;
      return true;
    });
  }, [intelFilters]);

  const active = filteredStudies.filter(s=>s.status==='Enrolling'||s.status==='Active');
  const riskDist = useMemo(()=>{const d={High:0,Medium:0,Low:0,None:0};filteredStudies.forEach(s=>{d[getRisk(s)]++;});return d;},[filteredStudies]);
  const velocity = useMemo(()=>active.map(s=>({study:s,rate:getRate(s),pct:Math.round((s.enrolledSubjects/s.targetEnrollment)*100),risk:getRisk(s)})).sort((a,b)=>b.rate-a.rate),[active]);
  const maxRate=Math.max(...velocity.map(v=>v.rate),1);
  const totalEnrolled=filteredStudies.reduce((a,s)=>a+s.enrolledSubjects,0);
  const totalTarget=filteredStudies.reduce((a,s)=>a+s.targetEnrollment,0);
  const overallPct=totalTarget>0?Math.round((totalEnrolled/totalTarget)*100):0;
  const totalOpenDevs=filteredStudies.reduce((a,s)=>a+(s.deviations??[]).filter(d=>d.status!=='Resolved').length,0);
  const totalOpenQs=filteredStudies.reduce((a,s)=>{if(!s.queryByDomain)return a;return a+Object.values(s.queryByDomain).reduce((x,v)=>x+v,0);},0);
  const alerts=useMemo(()=>{
    const out:{type:'critical'|'warning';msg:string;study:ClinicalStudy}[]=[];
    active.forEach(s=>{
      if(getRisk(s)==='High') out.push({type:'critical',msg:`Enrollment pace critical — ${Math.round((s.enrolledSubjects/s.targetEnrollment)*100)}% with limited time remaining`,study:s});
      const openMajor=(s.deviations??[]).filter(d=>d.severity==='Major'&&d.status!=='Resolved');
      if(openMajor.length) out.push({type:'warning',msg:`${openMajor.length} unresolved major protocol deviation(s)`,study:s});
      const overdueSites=(s.sites??[]).filter(si=>si.lastMonitoringVisit&&si.activationStage==='Activated'&&(Date.now()-new Date(si.lastMonitoringVisit).getTime())/86400000>90);
      if(overdueSites.length) out.push({type:'warning',msg:`${overdueSites.length} site(s) overdue for monitoring visit (>90 days, ICH E6(R3))`,study:s});
    });
    return out;
  },[active]);
  const regionData=[{flag:'🇺🇸',code:'US'},{flag:'🇪🇺',code:'EU'},{flag:'🇯🇵',code:'JP'},{flag:'🇨🇦',code:'CA'},{flag:'🇦🇺',code:'AU'},{flag:'🇰🇷',code:'KR'},{flag:'🇬🇧',code:'GB'},{flag:'🇳🇴',code:'NO'}].map(r=>{
    const studies=filteredStudies.filter(s=>s.activeRegions.includes(r.code));
    const sitesHere=filteredStudies.flatMap(s=>(s.sites??[]).filter(si=>si.countryCode===r.code));
    return{...r,studyCount:studies.length,siteCount:sitesHere.length,enrolled:sitesHere.reduce((a,si)=>a+si.enrolled,0)};
  }).filter(r=>r.studyCount>0);

  // v0.125.75: Program name lookup for chips
  const programName = (id: string) => PROGRAMS.find(p => p.id === id)?.name ?? id;
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

      {/* v0.125.75: Intelligence filter bar */}
      <div className="bg-surface-elevated border border-border rounded-xl px-4 py-3 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0" />

          {/* Program */}
          <select value={intelFilters.program} onChange={e=>setIF('program',e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer">
            <option value="">All Programs</option>
            {intelOptions.programs.map(id=><option key={id} value={id}>{programName(id)}</option>)}
          </select>

          {/* Therapeutic Area */}
          <select value={intelFilters.therapeuticArea} onChange={e=>setIF('therapeuticArea',e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer capitalize">
            <option value="">All Therapeutic Areas</option>
            {intelOptions.tas.map(ta=><option key={ta} value={ta} className="capitalize">{ta.charAt(0).toUpperCase()+ta.slice(1)}</option>)}
          </select>

          {/* Phase */}
          <select value={intelFilters.phase} onChange={e=>setIF('phase',e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer">
            <option value="">All Phases</option>
            {intelOptions.phases.map(p=><option key={p} value={p}>{p}</option>)}
          </select>

          {/* Status */}
          <select value={intelFilters.status} onChange={e=>setIF('status',e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer">
            <option value="">All Statuses</option>
            {intelOptions.statuses.map(s=><option key={s} value={s}>{s}</option>)}
          </select>

          {/* Study deep-dive */}
          <select value={intelFilters.study} onChange={e=>setIF('study',e.target.value)}
            className="text-xs bg-surface border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer">
            <option value="">All Studies</option>
            {CLINICAL_STUDIES.map(s=><option key={s.id} value={s.id}>{s.protocolNumber}</option>)}
          </select>

          <div className="flex-1"/>
          <span className="text-[11px] text-text-muted">{filteredStudies.length} of {CLINICAL_STUDIES.length} stud{filteredStudies.length!==1?'ies':'y'}</span>
          {activeIFCount>0&&<button onClick={clearIF} className="text-[11px] text-text-muted hover:text-text-primary transition-colors">Clear all</button>}
        </div>

        {/* Active filter chips */}
        {activeIFCount>0&&(
          <div className="flex items-center gap-1.5 flex-wrap">
            {intelFilters.program&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-accent-blue/10 text-accent-blue border border-accent-blue/20">{programName(intelFilters.program)}<button onClick={()=>setIF('program','')} className="hover:opacity-60"><X className="w-3 h-3"/></button></span>}
            {intelFilters.therapeuticArea&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{intelFilters.therapeuticArea}<button onClick={()=>setIF('therapeuticArea','')} className="hover:opacity-60"><X className="w-3 h-3"/></button></span>}
            {intelFilters.phase&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{intelFilters.phase}<button onClick={()=>setIF('phase','')} className="hover:opacity-60"><X className="w-3 h-3"/></button></span>}
            {intelFilters.status&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">{intelFilters.status}<button onClick={()=>setIF('status','')} className="hover:opacity-60"><X className="w-3 h-3"/></button></span>}
            {intelFilters.study&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/20">{CLINICAL_STUDIES.find(s=>s.id===intelFilters.study)?.protocolNumber??intelFilters.study}<button onClick={()=>setIF('study','')} className="hover:opacity-60"><X className="w-3 h-3"/></button></span>}
          </div>
        )}
      </div>

      {filteredStudies.length===0&&(
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Filter className="w-8 h-8 text-text-muted/30"/>
          <p className="text-sm text-text-muted">No studies match the selected filters</p>
          <button onClick={clearIF} className="text-xs text-accent-blue hover:underline">Clear filters</button>
        </div>
      )}

      {filteredStudies.length>0&&<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall Enrollment" value={`${overallPct}%`} sub={`${totalEnrolled.toLocaleString()} / ${totalTarget.toLocaleString()}`} icon={<Users className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400"/>
        <StatCard label="Active Studies" value={active.length} sub={`of ${filteredStudies.length} in scope`} icon={<Activity className="w-4 h-4"/>} color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard label="Open Deviations" value={totalOpenDevs} sub={totalOpenDevs>0?"click a study to review":'none open'} icon={<AlertTriangle className="w-4 h-4"/>} color={totalOpenDevs>0?'bg-orange-500/20 text-orange-400':'bg-slate-500/20 text-slate-400'} badge={totalOpenDevs>0?totalOpenDevs:undefined}/>
        <StatCard label="Open Queries" value={totalOpenQs.toLocaleString()} sub="across all domains" icon={<AlertCircle className="w-4 h-4"/>} color="bg-amber-500/20 text-amber-400"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><h3 className="font-semibold text-text-primary">Portfolio Risk Distribution</h3></CardHeader><CardContent>
          <div className="space-y-3">{(['High','Medium','Low','None'] as const).map(r=>{const count=riskDist[r];const max=Math.max(...Object.values(riskDist),1);return(<div key={r} className="flex items-center gap-3"><div className="w-16 text-xs font-medium text-text-muted">{r==='None'?'Complete':r}</div><div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden"><div className={`h-full rounded-full ${r==='High'?'bg-red-500':r==='Medium'?'bg-amber-500':r==='Low'?'bg-emerald-500':'bg-slate-500'}`} style={{width:`${(count/max)*100}%`}}/></div><div className="w-6 text-xs text-right text-text-primary font-semibold">{count}</div></div>);})}</div>
        </CardContent></Card>
        <Card><CardHeader><h3 className="font-semibold text-text-primary">Enrollment Velocity</h3></CardHeader><CardContent>
          <div className="space-y-3">{velocity.map(({study:s,rate,pct:p,risk})=>(<div key={s.id} className="flex items-center gap-3 cursor-pointer group" onClick={()=>onSelectStudy(s.id)}><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-mono text-text-muted truncate">{s.protocolNumber}</span><span className={`text-[10px] px-1 rounded font-medium flex-shrink-0 ${riskColor(risk)}`}>{risk}</span></div><div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${(rate/maxRate)*100}%`}}/></div></div><div className="text-xs text-right flex-shrink-0"><div className="font-medium text-text-primary">{rate}/wk</div><div className="text-text-muted">{p}%</div></div><ChevronRight className="w-3 h-3 text-text-muted group-hover:text-accent-blue flex-shrink-0"/></div>))}</div>
        </CardContent></Card>
      </div>
      {alerts.length>0&&<Card className="border-amber-500/30 bg-amber-500/5"><CardHeader><h3 className="font-semibold text-text-primary flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400"/> Portfolio Alerts</h3></CardHeader><CardContent>
        <div className="space-y-2">{alerts.map((a,i)=>(<div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-elevated cursor-pointer hover:bg-surface-card" onClick={()=>onSelectStudy(a.study.id)}><div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.type==='critical'?'bg-red-500':'bg-amber-500'}`}/><div className="flex-1 min-w-0"><span className="text-xs font-mono text-text-muted">{a.study.protocolNumber}</span><p className="text-xs text-text-primary mt-0.5">{a.msg}</p></div><ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5"/></div>))}</div>
      </CardContent></Card>}
      <Card><CardHeader><h3 className="font-semibold text-text-primary flex items-center gap-2"><Globe className="w-4 h-4 text-accent-blue"/> Global Site Distribution</h3></CardHeader><CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{regionData.map(r=><div key={r.code} className="p-3 bg-surface-elevated rounded-xl text-center"><div className="text-2xl mb-1">{r.flag}</div><div className="text-[10px] font-bold text-text-muted uppercase tracking-wide">{r.code}</div><div className="text-sm font-bold text-text-primary mt-0.5">{r.siteCount||r.studyCount}</div><div className="text-[10px] text-text-muted">{r.siteCount>0?`${r.enrolled} enrolled`:`${r.studyCount} stud.`}</div></div>)}</div>
      </CardContent></Card>
      <Card><CardHeader><h3 className="font-semibold text-text-primary flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400"/> Programme Timeline</h3></CardHeader><CardContent><ProgrammeTimeline/></CardContent></Card>
      </>}
    </div>
  );
}

// ============================================================================
// PORTFOLIO MODE
// ============================================================================

// ── Portfolio view type ───────────────────────────────────────────────────────
type PortfolioViewMode = 'card' | 'table' | 'gantt';

interface PortfolioFilters {
  phase: string;
  program: string;
  status: string;
  risk: string;
}
const EMPTY_PF: PortfolioFilters = { phase: '', program: '', status: '', risk: '' };

// ── Table row ─────────────────────────────────────────────────────────────────
function StudyTableRow({ study, onSelect }: { study: ClinicalStudy; onSelect: () => void }) {
  const risk = getRisk(study);
  const pct = Math.round((study.enrolledSubjects / study.targetEnrollment) * 100);
  return (
    <tr onClick={onSelect} className="border-b border-border/50 hover:bg-surface-elevated transition-colors cursor-pointer group">
      <td className="py-3 px-4">
        <div className="font-mono text-xs text-text-muted">{study.protocolNumber}</div>
        <div className="text-sm font-medium text-text-primary mt-0.5 truncate max-w-[220px]">{study.shortTitle}</div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${phaseColor(study.phase)}`}>{study.phase}</span>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs font-medium ${statusColor(study.status)}`}>{study.status}</span>
      </td>
      <td className="py-3 px-4">
        {risk !== 'None' ? (
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskColor(risk)}`}>{risk}</span>
        ) : <span className="text-xs text-text-muted/50">—</span>}
      </td>
      <td className="py-3 px-4 min-w-[120px]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct>=100?'bg-blue-500':pct>=70?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-red-500'}`} style={{width:`${Math.min(100,pct)}%`}}/>
          </div>
          <span className="text-xs text-text-primary font-medium w-8 text-right">{pct}%</span>
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">{study.enrolledSubjects.toLocaleString()} / {study.targetEnrollment.toLocaleString()}</div>
      </td>
      <td className="py-3 px-4 text-xs text-text-secondary">{study.activeSites > 0 ? study.activeSites : '—'}</td>
      <td className="py-3 px-4">
        <div className="flex gap-1 flex-wrap">{study.activeRegions.slice(0,4).map(r=><span key={r} className="text-[10px] px-1 bg-surface-card rounded text-text-muted">{r}</span>)}{study.activeRegions.length>4&&<span className="text-[10px] text-text-muted">+{study.activeRegions.length-4}</span>}</div>
      </td>
      <td className="py-3 px-4 text-xs text-text-muted">{study.estimatedCompletion ? new Date(study.estimatedCompletion).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—'}</td>
      <td className="py-3 px-4"><ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-blue transition-colors"/></td>
    </tr>
  );
}

// ── Gantt view ────────────────────────────────────────────────────────────────
function PortfolioGantt({ studies, onSelect }: { studies: ClinicalStudy[]; onSelect: (id: string) => void }) {
  const SY=2020, EY=2031, TOTAL_MO=(EY-SY)*12;
  const now=new Date(), nowMo=(now.getFullYear()-SY)*12+now.getMonth(), nowPct=(nowMo/TOTAL_MO)*100;
  const toPct=(ds:string)=>{const d=new Date(ds);const mo=(d.getFullYear()-SY)*12+d.getMonth();return Math.max(0,Math.min(100,(mo/TOTAL_MO)*100));};
  const pc:Record<string,string>={'Phase 1':'bg-blue-500','Phase 1/2':'bg-blue-400','Phase 2':'bg-purple-500','Phase 2b':'bg-purple-400','Phase 3':'bg-emerald-500','Phase 3b':'bg-emerald-400','Phase 4':'bg-teal-500','PASS':'bg-amber-500','PAES':'bg-amber-400','RWE':'bg-slate-400'};
  const years = Array.from({length:EY-SY+1},(_,i)=>SY+i);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px] px-4 py-4">
        {/* Year header */}
        <div className="flex mb-3 pl-40">
          {years.map(y=>(
            <div key={y} className="flex-1 text-center text-[10px] font-medium text-text-muted border-l border-border/30 first:border-l-0 pb-1">{y}</div>
          ))}
        </div>
        {/* Rows */}
        <div className="space-y-1.5">
          {studies.map(s=>{
            const l=toPct(s.startDate), r=toPct(s.estimatedCompletion), w=Math.max(0.5,r-l);
            const risk=getRisk(s);
            return (
              <div key={s.id} className="flex items-center gap-2 group cursor-pointer" onClick={()=>onSelect(s.id)}>
                <div className="w-36 flex-shrink-0 text-right">
                  <div className="text-[10px] font-mono text-text-muted truncate">{s.protocolNumber}</div>
                  <div className="text-[10px] text-text-muted/60">{s.phase}</div>
                </div>
                <div className="flex-1 relative h-6">
                  {/* Year grid lines */}
                  {years.map((_,i)=>(
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-border/20" style={{left:`${(i/years.length)*100}%`}}/>
                  ))}
                  {/* Today line */}
                  <div className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10" style={{left:`${nowPct}%`}}/>
                  {/* Bar */}
                  <div
                    className={`absolute inset-y-0.5 rounded ${pc[s.phase]??'bg-slate-500'} ${s.status==='Completed'?'opacity-50':''} flex items-center px-1.5 overflow-hidden group-hover:opacity-90 transition-opacity`}
                    style={{left:`${l}%`, width:`${w}%`}}
                  >
                    <span className="text-[9px] text-white font-semibold truncate">{s.shortTitle}</span>
                  </div>
                  {/* Risk pip */}
                  {risk==='High'&&<div className="absolute right-1 top-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-surface z-20" style={{left:`${r-1}%`}}/>}
                </div>
                <div className={`w-14 text-right text-[10px] font-medium flex-shrink-0 ${statusColor(s.status)}`}>{s.status}</div>
              </div>
            );
          })}
        </div>
        {/* Today label */}
        <div className="mt-1 pl-40 relative h-4">
          <div className="absolute top-0 h-full w-px bg-red-500/60" style={{left:`${nowPct}%`}}>
            <span className="text-[9px] text-red-400 whitespace-nowrap ml-1">Today</span>
          </div>
        </div>
        {/* Phase legend */}
        <div className="mt-4 pl-40 flex flex-wrap gap-2">
          {Object.entries(pc).slice(0,6).map(([phase,cls])=>(
            <div key={phase} className="flex items-center gap-1.5">
              <div className={`w-3 h-2 rounded-sm ${cls} opacity-80`}/>
              <span className="text-[10px] text-text-muted">{phase}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLINICAL STUDY QUICK-VIEW PANEL
// ============================================================================
// Tox-style slide-over: fires on row/card click; "Open full workspace" navigates.

type QuickViewTab = 'overview' | 'deviations' | 'tlf';

function ClinicalStudyQuickView({
  study,
  onClose,
  onOpenWorkspace,
}: {
  study: ClinicalStudy;
  onClose: () => void;
  onOpenWorkspace: () => void;
}) {
  const [tab, setTab] = useState<QuickViewTab>('overview');

  const pct = Math.round((study.enrolledSubjects / study.targetEnrollment) * 100);
  const risk = getRisk(study);
  const openDevs = (study.deviations ?? []).filter(d => d.status !== 'Resolved');
  const tlfItems = study.tlfOutputs ?? [];
  const tlfDone = tlfItems.filter(t => t.status === 'final' || t.status === 'approved').length;
  const tlfPct = tlfItems.length > 0 ? Math.round((tlfDone / tlfItems.length) * 100) : 0;

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

  const TABS: { id: QuickViewTab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'deviations', label: 'Deviations', badge: openDevs.length || undefined },
    { id: 'tlf', label: 'TLF Status', badge: tlfItems.length || undefined },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface-elevated border-l border-border z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-mono text-accent-blue">{study.protocolNumber}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${phaseColor(study.phase)}`}>{study.phase}</span>
              <span className={`text-xs font-medium ${statusColor(study.status)}`}>{study.status}</span>
              {risk !== 'None' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${riskColor(risk)}`}>{risk} Risk</span>
              )}
              {study.blindingStatus && <BlindingBadge status={study.blindingStatus} />}
            </div>
            <h2 className="text-base font-semibold text-text-primary leading-snug">{study.shortTitle}</h2>
            <p className="text-xs text-text-muted mt-0.5">{study.indication}</p>
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <button
              onClick={onOpenWorkspace}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Open workspace
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0.5 px-6 py-2 border-b border-border bg-surface-card flex-shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${tab === t.id ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-secondary'}`}
            >
              {t.label}
              {t.badge ? (
                <span className={`text-[10px] px-1 py-0.5 rounded-full font-semibold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-surface-elevated text-text-muted'}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {tab === 'overview' && (
            <>
              {/* Enrollment */}
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Enrollment</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-text-primary">{study.enrolledSubjects.toLocaleString()}</span>
                  <span className="text-sm text-text-muted">/ {study.targetEnrollment.toLocaleString()} target</span>
                </div>
                <div className="h-2 bg-surface-elevated rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-blue-500' : pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{pct}% enrolled</span>
                  {study.screenFailRate != null && (
                    <span>Screen fail rate: {study.screenFailRate}%</span>
                  )}
                </div>
                {study.randomisationRatio && (
                  <div className="mt-2 text-xs text-text-muted">Randomisation: <span className="text-text-secondary font-medium">{study.randomisationRatio}</span></div>
                )}
              </div>

              {/* Sites & Regions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Sites</span>
                  </div>
                  <div className="text-2xl font-bold text-text-primary">{study.activeSites > 0 ? study.activeSites : '—'}</div>
                  <div className="text-xs text-text-muted mt-1">active sites</div>
                </div>
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Regions</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {study.activeRegions.length > 0
                      ? study.activeRegions.map(r => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 bg-surface-elevated rounded text-text-secondary font-mono">{r}</span>
                        ))
                      : <span className="text-xs text-text-muted">—</span>
                    }
                  </div>
                </div>
              </div>

              {/* Primary Endpoint */}
              {study.primaryEndpoint && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Primary Endpoint</span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{study.primaryEndpoint}</p>
                </div>
              )}

              {/* Key Dates */}
              <div className="bg-surface-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Key Dates</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Study Start', value: fmtDate(study.startDate) },
                    { label: 'Primary Completion', value: fmtDate(study.primaryCompletionDate) },
                    { label: 'Est. Completion', value: fmtDate(study.estimatedCompletion) },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">{item.label}</div>
                      <div className="text-sm font-medium text-text-primary">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* IMP Supply */}
              {(study.impBatchesReleased != null || study.impBatchesAvailable != null) && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">IMP Supply</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Batches Released</div>
                      <div className="text-xl font-bold text-text-primary">{study.impBatchesReleased ?? '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-0.5">Batches Available</div>
                      <div className="text-xl font-bold text-text-primary">{study.impBatchesAvailable ?? '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Query Domains */}
              {study.queryByDomain && Object.keys(study.queryByDomain).length > 0 && (
                <div className="bg-surface-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">Open Queries by Domain</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(study.queryByDomain).map(([domain, count]) => (
                      <div key={domain} className="flex items-center justify-between bg-surface-elevated rounded-lg px-3 py-2">
                        <span className="text-[10px] font-mono text-text-muted uppercase">{domain}</span>
                        <span className={`text-sm font-bold ${Number(count) > 0 ? 'text-orange-400' : 'text-text-muted'}`}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'deviations' && (
            <>
              {openDevs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle className="w-10 h-10 text-emerald-400 opacity-60" />
                  <p className="text-sm text-text-muted">No open deviations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openDevs.map((dev, i) => (
                    <div key={dev.id ?? i} className="bg-surface-card border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${dev.severity === 'Major' || dev.severity === 'Critical' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              {dev.severity}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono">{dev.deviationNumber ?? `DEV-${i + 1}`}</span>
                          </div>
                          <p className="text-sm text-text-primary leading-snug">{dev.description}</p>
                          {dev.siteId && <p className="text-xs text-text-muted mt-1">Site: {dev.siteId}</p>}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted flex-shrink-0">{dev.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'tlf' && (
            <>
              {tlfItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <FileOutput className="w-10 h-10 text-text-muted opacity-40" />
                  <p className="text-sm text-text-muted">No TLF shells registered</p>
                  <p className="text-xs text-text-muted/60">TLF shells appear once the SAP is finalised</p>
                </div>
              ) : (
                <>
                  {/* Summary ring */}
                  <div className="bg-surface-card border border-border rounded-xl p-4 flex items-center gap-6">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-elevated" />
                        <circle
                          cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="4"
                          strokeDasharray={`${tlfPct * 0.879} 100`}
                          strokeLinecap="round"
                          className="text-emerald-400"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-text-primary">{tlfPct}%</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{tlfDone} / {tlfItems.length} finalised</div>
                      <div className="text-xs text-text-muted mt-0.5">TLF shells complete</div>
                    </div>
                  </div>

                  {/* TLF list */}
                  <div className="space-y-2">
                    {tlfItems.map((tlf, i) => {
                      const isDone = tlf.status === 'final' || tlf.status === 'approved';
                      const isPending = tlf.status === 'placeholder' || tlf.status === 'draft';
                      return (
                        <div key={tlf.id ?? i} className="flex items-center gap-3 bg-surface-card border border-border rounded-lg px-4 py-2.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDone ? 'bg-emerald-400' : isPending ? 'bg-amber-400' : 'bg-surface-elevated'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-text-muted">{tlf.id}</span>
                              <span className={`text-[10px] px-1 py-0.5 rounded ${isDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-elevated text-text-muted'}`}>{tlf.status}</span>
                            </div>
                            <div className="text-xs text-text-secondary truncate mt-0.5">{tlf.title}</div>
                          </div>
                          {tlf.assignedTo && (
                            <span className="text-[10px] text-text-muted flex-shrink-0">{tlf.assignedTo}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main PortfolioMode ────────────────────────────────────────────────────────
function PortfolioMode({ onSelectStudy }: { onSelectStudy: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState<PortfolioTab>('portfolio');
  const [viewMode, setViewMode] = useState<PortfolioViewMode>('card');
  const [pf, setPF] = useState<PortfolioFilters>(EMPTY_PF);
  const setF = (k: keyof PortfolioFilters, v: string) => setPF(prev => ({...prev,[k]:v}));
  const [sortCol, setSortCol] = useState<string>('phase');
  const [sortDesc, setSortDesc] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [quickView, setQuickView] = useState<ClinicalStudy | null>(null);

  const pfActiveCount = Object.values(pf).filter(Boolean).length;

  // Derived: flat filtered+sorted study list for table/gantt
  const allStudies = useMemo(() => CLINICAL_STUDIES, []);
  const taMap = useMemo(()=>{ const m:Record<string,string>={};PROGRAMS.forEach(p=>{m[p.id]=p.therapeuticAreaId;});return m;},[]);
  const filteredStudies = useMemo(()=>{
    let r = allStudies.filter(s=>{
      if (pf.phase && s.phase !== pf.phase) return false;
      if (pf.program && s.programId !== pf.program) return false;
      if (pf.status && s.status !== pf.status) return false;
      if (pf.risk && getRisk(s) !== pf.risk) return false;
      return true;
    });
    if (sortCol) {
      r = [...r].sort((a,b)=>{
        let cmp = 0;
        if (sortCol==='protocol') cmp=a.protocolNumber.localeCompare(b.protocolNumber);
        else if (sortCol==='phase') cmp=a.phase.localeCompare(b.phase);
        else if (sortCol==='status') cmp=a.status.localeCompare(b.status);
        else if (sortCol==='enrollment') cmp=(a.enrolledSubjects/a.targetEnrollment)-(b.enrolledSubjects/b.targetEnrollment);
        else if (sortCol==='completion') cmp=a.estimatedCompletion.localeCompare(b.estimatedCompletion);
        return sortDesc ? -cmp : cmp;
      });
    }
    return r;
  }, [allStudies, pf, sortCol, sortDesc]);

  const tabs=[{id:'portfolio' as PortfolioTab,label:'Portfolio',icon:<Layers className="w-3.5 h-3.5"/>},{id:'intelligence' as PortfolioTab,label:'Intelligence',icon:<Zap className="w-3.5 h-3.5"/>}];

  const handleSort = (col: string) => {
    if (sortCol===col) setSortDesc(d=>!d);
    else { setSortCol(col); setSortDesc(false); }
  };
  const SortIcon = ({col}: {col:string}) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-0.5 ${sortCol===col?'text-accent-blue':'text-text-muted/40'}`}/>
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Tab bar + view switcher */}
      <div className="border-b border-border bg-surface-elevated flex items-center px-4 gap-1">
        {tabs.map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab===tab.id?'border-accent-blue text-accent-blue':'border-transparent text-text-muted hover:text-text-primary'}`}>{tab.icon}{tab.label}</button>)}
        {activeTab==='portfolio' && (
          <div className="ml-4 flex items-center gap-1 border border-border rounded-lg overflow-hidden">
            <button onClick={()=>setViewMode('card')} title="Card view" className={`p-1.5 transition-colors ${viewMode==='card'?'bg-accent-blue/10 text-accent-blue':'text-text-muted hover:bg-surface-card'}`}><LayoutGrid className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setViewMode('table')} title="Table view" className={`p-1.5 transition-colors ${viewMode==='table'?'bg-accent-blue/10 text-accent-blue':'text-text-muted hover:bg-surface-card'}`}><List className="w-3.5 h-3.5"/></button>
            <button onClick={()=>setViewMode('gantt')} title="Gantt view" className={`p-1.5 transition-colors ${viewMode==='gantt'?'bg-accent-blue/10 text-accent-blue':'text-text-muted hover:bg-surface-card'}`}><GanttChart className="w-3.5 h-3.5"/></button>
          </div>
        )}
        <div className="ml-auto pr-2 py-2 flex items-center gap-2">
          {activeTab==='portfolio' && <span className="text-[11px] text-text-muted">{filteredStudies.length} of {allStudies.length}</span>}
          <Button variant="primary" size="sm" onClick={()=>setShowNew(true)}><Plus className="w-3.5 h-3.5"/> New Study</Button>
        </div>
      </div>

      {activeTab==='intelligence' ? <IntelligenceView onSelectStudy={(id) => {
        const s = CLINICAL_STUDIES.find(st => st.id === id);
        if (s) setQuickView(s);
      }}/> : (
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Filter bar */}
          <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-2 flex-wrap">
            <FilterIcon className="w-3.5 h-3.5 text-text-muted/60 flex-shrink-0"/>
            {/* Phase */}
            <select value={pf.phase} onChange={e=>setF('phase',e.target.value)} className="text-xs bg-surface-elevated border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none cursor-pointer">
              <option value="">All Phases</option>
              {(['Phase 1','Phase 1/2','Phase 2','Phase 2b','Phase 3','Phase 4','PASS'] as const).map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            {/* Program */}
            <select value={pf.program} onChange={e=>setF('program',e.target.value)} className="text-xs bg-surface-elevated border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none cursor-pointer">
              <option value="">All Programs</option>
              {PROGRAMS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {/* Status */}
            <select value={pf.status} onChange={e=>setF('status',e.target.value)} className="text-xs bg-surface-elevated border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none cursor-pointer">
              <option value="">All Statuses</option>
              {(['Planning','Enrolling','Active','Completed','On Hold','Terminated'] as const).map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            {/* Risk */}
            <select value={pf.risk} onChange={e=>setF('risk',e.target.value)} className="text-xs bg-surface-elevated border border-border rounded-md px-2 py-1.5 text-text-secondary focus:outline-none cursor-pointer">
              <option value="">All Risk</option>
              {(['High','Medium','Low'] as const).map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            {pfActiveCount>0 && <button onClick={()=>setPF(EMPTY_PF)} className="text-[11px] text-text-muted hover:text-text-primary ml-1">Clear</button>}
          </div>

          {/* Views */}
          <div className="flex-1 overflow-y-auto">
            {filteredStudies.length===0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <LayoutGrid className="w-8 h-8 text-text-muted/30"/>
                <p className="text-sm text-text-muted">No studies match the selected filters</p>
                <button onClick={()=>setPF(EMPTY_PF)} className="text-xs text-accent-blue hover:underline">Clear filters</button>
              </div>
            )}

            {/* ── CARD VIEW ── */}
            {viewMode==='card' && filteredStudies.length>0 && (
              <div className="px-6 py-6 space-y-8">
                {PROGRAMS.map(p=>{
                  const studies = filteredStudies.filter(s=>s.programId===p.id);
                  if (!studies.length) return null;
                  const activeCount=studies.filter(s=>s.status==='Enrolling'||s.status==='Active').length;
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-purple-500/15 rounded-lg"><Beaker className="w-4 h-4 text-purple-400"/></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2"><span className="font-semibold text-text-primary">{p.name}</span>{p.brandName&&<span className="text-sm text-text-muted">({p.brandName} · {p.genericName})</span>}</div>
                          <div className="text-xs text-text-muted">{p.indication} · {p.modality} · {activeCount} active</div>
                        </div>
                        {p.hasMarketedStatus&&<span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">Approved</span>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {studies.map(s=><StudyCard key={s.id} study={s} onSelect={()=>setQuickView(s)}/>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode==='table' && filteredStudies.length>0 && (
              <table className="w-full">
                <thead className="bg-surface-elevated sticky top-0 z-10">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary" onClick={()=>handleSort('protocol')}>Protocol <SortIcon col="protocol"/></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary w-24" onClick={()=>handleSort('phase')}>Phase <SortIcon col="phase"/></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary w-28" onClick={()=>handleSort('status')}>Status <SortIcon col="status"/></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-20">Risk</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary w-36" onClick={()=>handleSort('enrollment')}>Enrollment <SortIcon col="enrollment"/></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-16">Sites</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider w-32">Regions</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-primary w-28" onClick={()=>handleSort('completion')}>Completion <SortIcon col="completion"/></th>
                    <th className="w-8"/>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudies.map(s=><StudyTableRow key={s.id} study={s} onSelect={()=>setQuickView(s)}/>)}
                </tbody>
              </table>
            )}

            {/* ── GANTT VIEW ── */}
            {viewMode==='gantt' && filteredStudies.length>0 && (
              <PortfolioGantt studies={filteredStudies} onSelect={(id) => {
                const s = filteredStudies.find(st => st.id === id);
                if (s) setQuickView(s);
              }}/>
            )}
          </div>
        </div>
      )}
      {showNew&&<NewStudyModal onClose={()=>setShowNew(false)}/>}
      {quickView && (
        <ClinicalStudyQuickView
          study={quickView}
          onClose={() => setQuickView(null)}
          onOpenWorkspace={() => { setQuickView(null); onSelectStudy(quickView.id); }}
        />
      )}
    </div>
  );
}

// ============================================================================
// PROTOCOL TAB
// ============================================================================

function ProtocolTab({ study }: { study: ClinicalStudy }) {
  const studiesRecord=useUSDMStore(s=>s.studies);const studyDesigns=useUSDMStore(s=>s.studyDesigns);const objectivesRecord=useUSDMStore(s=>s.objectives);const endpointsRecord=useUSDMStore(s=>s.endpoints);const objectivesBySDId=useUSDMStore(s=>s.objectivesByStudyDesignId);const endpointsByObjId=useUSDMStore(s=>s.endpointsByObjectiveId);const studyArms=useUSDMStore(s=>s.studyArms);const studyEpochs=useUSDMStore(s=>s.studyEpochs);const loadMockData=useUSDMStore(s=>s.loadMockData);const addObjective=useUSDMStore(s=>s.addObjective);const addEndpoint=useUSDMStore(s=>s.addEndpoint);const addAuthoringDoc=useAuthoringStore(s=>s.addDocument);const setActiveModule=useAppStore(s=>s.setActiveModule);const toast=useToast();
  const [addingObj,setAddingObj]=useState(false);const [newObjText,setNewObjText]=useState('');const [syncing,setSyncing]=useState(false);const [createdDocTitle,setCreatedDocTitle]=useState<string|null>(null);
  const usdmStudy=useMemo(()=>Object.values(studiesRecord).find(s=>s.studyIdentifiers?.some((i:any)=>i.studyIdentifier===study.protocolNumber)||s.studyShortTitle===study.shortTitle)??Object.values(studiesRecord)[0],[studiesRecord,study]);
  const design=useMemo(()=>{if(!usdmStudy)return null;const d=Object.values(studyDesigns);return d.find(dd=>usdmStudy.studyDesigns?.some((sd:any)=>sd.id===dd.id))??d[0]??null;},[usdmStudy,studyDesigns]);
  const objectives=useMemo(()=>design?(objectivesBySDId[design.id]||[]).map(id=>objectivesRecord[id]).filter(Boolean):[],[design,objectivesBySDId,objectivesRecord]);
  const endpointsByObj=useMemo(()=>objectives.reduce((acc,obj)=>{acc[obj.id]=(endpointsByObjId[obj.id]||[]).map(id=>endpointsRecord[id]).filter(Boolean);return acc;},{}as Record<string,any[]>),[objectives,endpointsByObjId,endpointsRecord]);
  const arms=useMemo(()=>Object.values(studyArms),[studyArms]);const epochs=useMemo(()=>Object.values(studyEpochs),[studyEpochs]);
  const handleGenerateDoc=useCallback(async()=>{setSyncing(true);await new Promise(r=>setTimeout(r,800));const now=new Date().toISOString();const docId=`protocol-${study.protocolNumber}-${Date.now()}`;addAuthoringDoc({id:docId,documentType:'protocol',title:`Clinical Protocol — ${study.shortTitle}`,shortTitle:`${study.protocolNumber} Protocol`,version:'0.1',versionDate:now,programId:'program-001',programName:study.shortTitle,productId:'product-001',productName:study.shortTitle,studyId:study.id,studyName:study.shortTitle,templateId:'template-protocol',templateName:'Clinical Protocol Template',templateVersion:'1.0',status:'drafting',workflowId:`wf-${docId}`,createdAt:now,updatedAt:now,authorId:'current-user',authorName:'Current User',ownerId:'current-user',ownerName:'Current User',progress:30,sectionsTotal:14,sectionsComplete:4,sections:[],prerequisites:[],prerequisitesMet:true,openComments:0,totalComments:0,history:[],sourceDocuments:[],linkedDocuments:[],tags:['protocol',study.protocolNumber],priority:'high',aiAuthoringMode:'document'});setSyncing(false);const title=`Clinical Protocol — ${study.shortTitle}`;setCreatedDocTitle(title);toast.success(`Protocol document created`,{action:{label:'Open in Authoring →',onClick:()=>setActiveModule('authoring')}});},[study,addAuthoringDoc,setActiveModule,toast]);
  const amendments=[
    { version:'v1.0', date:study.startDate, description:'Protocol finalised', author:'Medical Writing',
      docId:`${study.protocolNumber}-PROTOCOL-v1.0`, docTitle:`${study.protocolNumber} Protocol v1.0`,
      docType:'protocol' as const },
    { version:'v1.1', date:'2024-04-15', description:'Amendment 1 — added exploratory PK cohort', author:'Clinical Science',
      docId:`${study.protocolNumber}-PROTOCOL-v1.1`, docTitle:`${study.protocolNumber} Protocol v1.1 (Amendment 1)`,
      docType:'protocol' as const },
    { version:'v1.2', date:'2024-09-01', description:'Amendment 2 — ICF update for optional biopsy', author:'Medical Writing',
      docId:`${study.protocolNumber}-PROTOCOL-v1.2`, docTitle:`${study.protocolNumber} Protocol v1.2 (Amendment 2)`,
      docType:'protocol' as const },
  ];
  const icfVersions=[
    { version:'v1.0', date:study.startDate, status:'Superseded', countries:['US','AU'],
      docId:`${study.protocolNumber}-ICF-v1.0`, docTitle:`${study.protocolNumber} ICF v1.0` },
    { version:'v1.1', date:'2024-04-20', status:'Superseded', countries:['US','EU','JP','CA','AU'],
      docId:`${study.protocolNumber}-ICF-v1.1`, docTitle:`${study.protocolNumber} ICF v1.1` },
    { version:'v2.0', date:'2024-09-10', status:'Current', countries:['US','EU','JP','CA','AU','KR'],
      docId:`${study.protocolNumber}-ICF-v2.0`, docTitle:`${study.protocolNumber} ICF v2.0 (Current)` },
  ];
  const [viewingDoc, setViewingDoc] = useState<{ id: string; title: string; version: string; type: string; pdfUrl: string } | null>(null);
  if(objectives.length===0)return(<Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="py-8 text-center"><GitBranch className="w-8 h-8 text-amber-400 mx-auto mb-2"/><p className="text-sm text-text-muted mb-3">No USDM protocol data loaded for this study.</p><Button variant="primary" size="sm" onClick={()=>{loadMockData();toast.success('Protocol data loaded');}}><RefreshCw className="w-4 h-4"/> Load Protocol Data</Button></CardContent></Card>);
  const levelColors={PRIMARY:'bg-blue-500/15 text-blue-400',SECONDARY:'bg-purple-500/15 text-purple-400',EXPLORATORY:'bg-slate-500/15 text-slate-400'} as const;
  const grouped={PRIMARY:objectives.filter(o=>o.objectiveLevel?.decode==='PRIMARY'),SECONDARY:objectives.filter(o=>o.objectiveLevel?.decode==='SECONDARY'),EXPLORATORY:objectives.filter(o=>o.objectiveLevel?.decode==='EXPLORATORY')};
  return (
    <div className="space-y-6">
      <Card className="border-violet-500/20 bg-violet-500/5"><CardContent className="py-3"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="p-2 bg-violet-500/20 rounded-lg"><GitBranch className="w-4 h-4 text-violet-400"/></div><div><div className="text-sm font-semibold text-text-primary">USDM ↔ Protocol Document</div><div className="text-xs text-text-muted">{objectives.length} objectives · {Object.values(endpointsByObj).flat().length} endpoints · {arms.length} arms</div></div></div><div className="flex items-center gap-2">{createdDocTitle?(<><div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5"/><span className="hidden sm:inline truncate max-w-[140px]">{createdDocTitle}</span></div><Button variant="outline" size="sm" onClick={()=>setActiveModule('authoring')}><ExternalLink className="w-4 h-4"/> Open</Button><Button variant="ghost" size="sm" onClick={handleGenerateDoc} disabled={syncing}><RefreshCw className="w-3.5 h-3.5"/></Button></>):(<><Button variant="outline" size="sm" onClick={()=>setActiveModule('authoring')}><FileText className="w-4 h-4"/> Open in Authoring</Button><Button variant="primary" size="sm" onClick={handleGenerateDoc} disabled={syncing}>{syncing?<RefreshCw className="w-4 h-4 animate-spin"/>:<Sparkles className="w-4 h-4"/>}{syncing?'Generating…':'USDM → Protocol Doc'}</Button></>)}</div></div></CardContent></Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><StatCard label="Objectives" value={objectives.length} icon={<Target className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400"/><StatCard label="Endpoints" value={Object.values(endpointsByObj).flat().length} icon={<Activity className="w-4 h-4"/>} color="bg-purple-500/20 text-purple-400"/><StatCard label="Study Arms" value={arms.length} icon={<GitBranch className="w-4 h-4"/>} color="bg-emerald-500/20 text-emerald-400"/><StatCard label="Epochs" value={epochs.length} icon={<Calendar className="w-4 h-4"/>} color="bg-amber-500/20 text-amber-400"/></div>
      <Card><CardHeader><h3 className="font-semibold text-text-primary">Protocol Amendment History</h3></CardHeader><CardContent><table className="w-full text-xs"><thead><tr className="border-b border-border">{['Version','Date','Description','Author'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i<3?'text-left':'text-right'}`}>{h}</th>)}</tr></thead><tbody>{amendments.map((a,i)=><tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"><td className="py-2"><button onClick={()=>setViewingDoc({id:a.docId,title:a.docTitle,version:a.version,type:a.docType,pdfUrl:a.pdfUrl})} className="flex items-center gap-1.5 font-mono font-semibold text-accent-blue hover:underline group"><FileText className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity"/>{a.version}</button></td><td className="py-2 text-text-muted">{new Date(a.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td className="py-2 text-text-primary">{a.description}</td><td className="py-2 text-right text-text-muted">{a.author}</td></tr>)}</tbody></table></CardContent></Card>
      <Card><CardHeader><h3 className="font-semibold text-text-primary">ICF Version Tracker</h3></CardHeader><CardContent><div className="space-y-2">{icfVersions.map((v,i)=><div key={i} className="flex items-center gap-3 p-2.5 bg-surface-elevated rounded-lg hover:bg-surface-card transition-colors"><div className={`w-2 h-2 rounded-full flex-shrink-0 ${v.status==='Current'?'bg-emerald-500':'bg-slate-500'}`}/><button onClick={()=>setViewingDoc({id:v.docId,title:v.docTitle,version:v.version,type:'icf',pdfUrl:v.pdfUrl})} className="font-mono text-xs font-semibold text-accent-blue hover:underline flex items-center gap-1 group w-10"><FileText className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"/>{v.version}</button><span className="text-xs text-text-muted w-24">{new Date(v.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${v.status==='Current'?'bg-emerald-500/15 text-emerald-400':'bg-slate-500/15 text-slate-400'}`}>{v.status}</span><div className="flex-1 flex flex-wrap gap-1">{v.countries.map(c=><span key={c} className="text-[10px] px-1 bg-surface-card rounded text-text-muted">{c}</span>)}</div></div>)}</div></CardContent></Card>
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <div>
                <div className="flex items-center gap-2"><span className="text-xs font-mono text-accent-blue">{viewingDoc.id}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-card text-text-muted uppercase">{viewingDoc.type}</span></div>
                <h3 className="text-sm font-semibold text-text-primary mt-0.5">{viewingDoc.title}</h3>
              </div>
              <button onClick={()=>setViewingDoc(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PDFDocumentPreview
                documentId={viewingDoc.id}
                documentTitle={viewingDoc.title}
                documentVersion={viewingDoc.version}
                documentType={viewingDoc.type as any}
                pdfUrl={viewingDoc.pdfUrl}
                defaultViewMode={viewingDoc.pdfUrl ? 'pdf' : 'rendered'}
                allowViewModeSwitch
                showToolbar
              />
            </div>
          </div>
        </div>
      )}
      {(['PRIMARY','SECONDARY','EXPLORATORY'] as const).map(level=>{const objs=grouped[level];if(!objs.length&&level!=='PRIMARY')return null;return(<div key={level}><div className="flex items-center gap-2 mb-3"><span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wide ${levelColors[level]}`}>{level}</span><span className="text-xs text-text-muted">{objs.length} objective{objs.length!==1?'s':''}</span>{level==='PRIMARY'&&design&&<button onClick={()=>setAddingObj(true)} className="ml-auto flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"><Plus className="w-3.5 h-3.5"/> Add Objective</button>}</div><div className="space-y-2">{objs.map(obj=>{const eps=endpointsByObj[obj.id]||[];return(<Card key={obj.id}><CardContent className="py-3"><div className="flex items-start gap-3"><div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${levelColors[level]}`}><Target className="w-3.5 h-3.5"/></div><div className="flex-1"><p className="text-sm text-text-primary leading-relaxed">{obj.objectiveDescription}</p>{eps.length>0&&<div className="mt-2 space-y-1">{eps.map((ep:any)=><div key={ep.id} className="pl-2 border-l-2 border-border"><p className="text-xs text-text-muted leading-relaxed">{ep.endpointDescription}</p></div>)}</div>}{design&&<button onClick={()=>{const t=prompt('Endpoint description:');if(t?.trim()){addEndpoint(obj.id,{endpointDescription:t.trim()});toast.success('Endpoint added');}}} className="mt-2 text-[10px] text-accent-blue hover:underline">+ Add endpoint</button>}</div><span className="text-xs text-text-muted flex-shrink-0">{eps.length} ep{eps.length!==1?'s':''}</span></div></CardContent></Card>);})}</div></div>);})}
      {addingObj&&design&&<div className="p-4 bg-surface-card border border-accent-blue/40 rounded-lg space-y-3"><p className="text-xs font-medium text-text-muted uppercase tracking-wide">New Primary Objective</p><textarea autoFocus value={newObjText} onChange={e=>setNewObjText(e.target.value)} rows={3} placeholder="Describe the objective…" className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary focus:outline-none focus:border-accent-blue resize-none"/><div className="flex justify-end gap-2"><button onClick={()=>{setAddingObj(false);setNewObjText('');}} className="text-xs text-text-muted hover:text-text-primary px-2 py-1">Cancel</button><button disabled={!newObjText.trim()} onClick={()=>{if(newObjText.trim()){addObjective(design!.id,{objectiveDescription:newObjText.trim()});setNewObjText('');setAddingObj(false);toast.success('Objective added to USDM');}}} className="px-3 py-1 text-xs bg-accent-blue text-white rounded hover:bg-accent-blue/80 disabled:opacity-40">Add to USDM</button></div></div>}

      {/* v0.125.75: eCTD Dual-Rep — Protocol + ICF */}
      <Card><CardHeader><h3 className="font-semibold text-text-primary">Protocol & ICF Document Package</h3></CardHeader><CardContent>
        <DualRepDocumentBlock
          packageTitle="Protocol & Consent Document Package"
          docs={[
            { label: 'Protocol (current version)', ectdPath: `m5/53-clin-stud-rep/535-rep-effi-safe-stud/5351-stud-rep/${study.protocolNumber}-PROTOCOL.pdf`, type: 'protocol' },
            { label: 'Protocol Amendments', ectdPath: `m5/53-clin-stud-rep/535-rep-effi-safe-stud/5351-stud-rep/${study.protocolNumber}-AMENDMENTS.pdf`, type: 'protocol' },
            { label: 'Informed Consent Form (current)', ectdPath: `m5/53-clin-stud-rep/535-rep-effi-safe-stud/5351-stud-rep/${study.protocolNumber}-ICF-CURRENT.pdf`, type: 'icf' },
          ]}
          ectdMeta={{ module: 'Module 5.3', section: '5.3.1.2 — Protocol and Protocol Amendments', ichReference: 'ICH E6(R3) §6' }}
          structuredDataNote="USDM-structured objectives, endpoints, arms, and epochs are stored as linked records in Ligature — not locked inside a PDF. ICF version history and country-level consent status are tracked separately. The protocol document is the regulatory master; structured USDM data powers the intelligence and authoring layers."
        />
      </CardContent></Card>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ study, onTabSwitch }: { study: ClinicalStudy; onTabSwitch: (t: StudyTab) => void }) {
  const pct=Math.round((study.enrolledSubjects/study.targetEnrollment)*100);
  const rate=getRate(study);const days=getDaysToCompletion(study);
  const openQueries=study.queryByDomain?Object.values(study.queryByDomain).reduce((a,v)=>a+v,0):Math.round(study.enrolledSubjects*0.015);
  const openDevs=(study.deviations??[]).filter(d=>d.status!=='Resolved').length;
  const topSites=useMemo(()=>[...(study.sites??[])].filter(s=>s.activationStage==='Activated').sort((a,b)=>b.enrolled-a.enrolled).slice(0,3),[study.sites]);
  const weeklyData=useMemo(()=>Array.from({length:12},(_,i)=>({week:`W${i+1}`,enrolled:Math.max(0,Math.round(rate*(0.65+Math.sin(i*0.9)*0.25+(i*0.03))))})),[rate]);
  const milestones=[{label:'Protocol Final',done:true},{label:'First Site Initiated',done:study.enrolledSubjects>0},{label:'First Subject Enrolled',done:study.enrolledSubjects>0},{label:'50% Enrollment',done:pct>=50},{label:'Last Patient In',done:study.status==='Completed'},{label:'Database Lock',done:study.status==='Completed'}];
  return (
    <div className="space-y-6">
      {study.blindingStatus&&<div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${blindingBg(study.blindingStatus)}`}><KeyRound className={`w-4 h-4 flex-shrink-0 ${blindingIconColor(study.blindingStatus)}`}/><div className="flex-1 min-w-0"><span className="text-sm font-semibold text-text-primary">{study.blindingStatus}</span>{study.randomisationCodeHolder&&<span className="text-xs text-text-muted ml-2">· Code holder: {study.randomisationCodeHolder}</span>}</div><BlindingBadge status={study.blindingStatus}/></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrolled" value={study.enrolledSubjects.toLocaleString()} sub={`of ${study.targetEnrollment.toLocaleString()} (${pct}%)`} icon={<Users className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400" onClick={()=>onTabSwitch('operations')}/>
        <StatCard label="Active Sites" value={study.activeSites} sub={`${study.activeRegions.length} regions`} icon={<MapPin className="w-4 h-4"/>} color="bg-purple-500/20 text-purple-400" onClick={()=>onTabSwitch('operations')}/>
        <StatCard label="Open Queries" value={openQueries} sub={openQueries>0?`tap to see by domain`:'none open'} icon={<AlertCircle className="w-4 h-4"/>} color="bg-amber-500/20 text-amber-400" onClick={openQueries>0?()=>onTabSwitch('handoff'):undefined} badge={openQueries>0?openQueries:undefined}/>
        <StatCard label={study.status==='Completed'?'Completed':'Days to LPI'} value={study.status==='Completed'?'✓':`${days}d`} sub={study.primaryCompletionDate??study.estimatedCompletion} icon={<Clock className="w-4 h-4"/>} color={days<180?'bg-amber-500/20 text-amber-400':'bg-teal-500/20 text-teal-400'}/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enroll Rate" value={`${rate}/wk`} icon={<TrendingUp className="w-4 h-4"/>} color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard label="Open Deviations" value={openDevs} sub={openDevs>0?`tap to review ${openDevs} item${openDevs>1?'s':''}`:'none open'} icon={<AlertTriangle className="w-4 h-4"/>} color={openDevs>0?'bg-orange-500/20 text-orange-400':'bg-slate-500/20 text-slate-400'} onClick={openDevs>0?()=>onTabSwitch('monitoring'):undefined} badge={openDevs>0?openDevs:undefined}/>
        {study.screenFailRate&&<StatCard label="Screen Fail" value={`${study.screenFailRate}%`} icon={<Eye className="w-4 h-4"/>} color="bg-rose-500/20 text-rose-400"/>}
        {study.randomisationRatio&&<StatCard label="Rand. Ratio" value={study.randomisationRatio} sub="Active : Control" icon={<GitBranch className="w-4 h-4"/>} color="bg-violet-500/20 text-violet-400"/>}
      </div>
      <Card><CardHeader><h3 className="font-semibold text-text-primary">Enrollment Progress</h3></CardHeader><CardContent>
        <div className="flex items-center justify-between text-sm mb-2"><span className="text-text-muted">FSI: {study.startDate}</span><span className="text-text-muted">LPI: {study.primaryCompletionDate??study.estimatedCompletion}</span></div>
        <div className="h-3 bg-surface-elevated rounded-full overflow-hidden mb-3"><div className={`h-full rounded-full ${pct>=100?'bg-blue-500':pct>=70?'bg-emerald-500':pct>=40?'bg-amber-500':'bg-red-500'}`} style={{width:`${Math.min(100,pct)}%`}}/></div>
        <div className="flex items-center gap-4 flex-wrap">{milestones.map((m,i)=><div key={i} className="flex items-center gap-1.5"><div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${m.done?'bg-emerald-500/20 border border-emerald-500/30':'bg-surface-elevated border border-border'}`}>{m.done&&<CheckCircle className="w-2.5 h-2.5 text-emerald-400"/>}</div><span className={`text-[10px] ${m.done?'text-text-muted line-through':'text-text-primary'}`}>{m.label}</span></div>)}</div>
      </CardContent></Card>
      {study.status!=='Completed'&&<Card><CardHeader><h3 className="font-semibold text-text-primary">Weekly Enrollment Trend</h3></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={100}><BarChart data={weeklyData} margin={{top:4,right:0,bottom:0,left:-30}}><CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="week" tick={{fontSize:9,fill:'#6b7280'}} tickLine={false} axisLine={false} interval={2}/><YAxis tick={{fontSize:9,fill:'#6b7280'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:'#1e2433',border:'1px solid #374151',borderRadius:'8px',fontSize:'11px'}} itemStyle={{color:'#9ca3af'}}/><Bar dataKey="enrolled" fill="#3b82f6" radius={[2,2,0,0]} name="Enrolled/wk"/></BarChart></ResponsiveContainer>
      </CardContent></Card>}
      {topSites.length>0&&<Card><CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Top Performing Sites</h3><button onClick={()=>onTabSwitch('operations')} className="text-xs text-accent-blue hover:underline flex items-center gap-1">All sites <ChevronRight className="w-3 h-3"/></button></div></CardHeader><CardContent>
        <div className="space-y-3">{topSites.map((site,i)=><div key={site.id} className="flex items-center gap-3"><div className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-[10px] font-bold text-text-muted flex-shrink-0">{i+1}</div><div className="text-lg flex-shrink-0">{site.countryFlag}</div><div className="flex-1 min-w-0"><div className="text-xs font-medium text-text-primary truncate">{site.name}</div><div className="text-[10px] text-text-muted">{site.principalInvestigator}</div></div><div className="text-right flex-shrink-0"><div className="text-sm font-bold text-text-primary">{site.enrolled}</div><div className="text-[10px] text-text-muted">of {site.target}</div></div><div className={`w-2 h-2 rounded-full flex-shrink-0 ${ragDot(site.ragStatus)}`}/></div>)}</div>
      </CardContent></Card>}
      {study.primaryEndpoint&&<Card><CardHeader><h3 className="font-semibold text-text-primary">Primary Endpoint</h3></CardHeader><CardContent><div className="flex items-start gap-3"><div className="p-2 bg-blue-500/15 rounded-lg mt-0.5"><Target className="w-4 h-4 text-blue-400"/></div><p className="text-sm text-text-secondary leading-relaxed">{study.primaryEndpoint}</p></div></CardContent></Card>}
    </div>
  );
}

// ============================================================================
// OPERATIONS TAB
// ============================================================================

function OperationsTab({ study, onTabSwitch }: { study: ClinicalStudy; onTabSwitch: (t: StudyTab) => void }) {
  const pct=Math.round((study.enrolledSubjects/study.targetEnrollment)*100);const rate=getRate(study);
  const allSites=study.sites??[];const activeSites=allSites.filter(s=>s.activationStage==='Activated');const regionRows=siteMock(study);
  const weeklyData=useMemo(()=>Array.from({length:12},(_,i)=>({week:`W${i+1}`,enrolled:Math.max(0,Math.round(rate*(0.55+Math.sin(i*0.7)*0.3+(i*0.04))))})),[rate]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Enrolled" value={study.enrolledSubjects.toLocaleString()} sub={`${pct}%`} icon={<Users className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400"/>
        <StatCard label="Active Sites" value={activeSites.length||study.activeSites} sub={allSites.length>0?`${allSites.length} total`:`${study.activeRegions.length} regions`} icon={<MapPin className="w-4 h-4"/>} color="bg-purple-500/20 text-purple-400" onClick={()=>onTabSwitch('startup')}/>
        {study.screenFailRate&&<StatCard label="Screen Fail Rate" value={`${study.screenFailRate}%`} icon={<Eye className="w-4 h-4"/>} color="bg-rose-500/20 text-rose-400"/>}
        {study.randomisationRatio&&<StatCard label="Rand. Ratio" value={study.randomisationRatio} sub="Active : Control" icon={<GitBranch className="w-4 h-4"/>} color="bg-violet-500/20 text-violet-400"/>}
      </div>
      {(study.impBatchesReleased??0)>0&&<div className="flex items-center gap-4 px-4 py-3 bg-surface-elevated rounded-xl border border-border"><div className="p-2 bg-teal-500/15 rounded-lg flex-shrink-0"><Syringe className="w-4 h-4 text-teal-400"/></div><div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text-primary">IMP Accountability</div><div className="text-xs text-text-muted">{study.impBatchesReleased} batches released · {study.impBatchesAvailable} available at sites</div></div><div className="flex items-center gap-3 flex-shrink-0"><div className="h-2 w-28 bg-surface-card rounded-full overflow-hidden"><div className="h-full bg-teal-500 rounded-full" style={{width:`${((study.impBatchesAvailable??0)/(study.impBatchesReleased??1))*100}%`}}/></div><span className="text-xs text-text-muted font-mono">{study.impBatchesAvailable}/{study.impBatchesReleased}</span></div></div>}
      <Card><CardHeader><h3 className="font-semibold text-text-primary">Enrollment Rate — Last 12 Weeks</h3></CardHeader><CardContent>
        <ResponsiveContainer width="100%" height={160}><LineChart data={weeklyData} margin={{top:4,right:8,bottom:0,left:-30}}><CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false}/><XAxis dataKey="week" tick={{fontSize:9,fill:'#6b7280'}} tickLine={false} axisLine={false}/><YAxis tick={{fontSize:9,fill:'#6b7280'}} tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:'#1e2433',border:'1px solid #374151',borderRadius:'8px',fontSize:'11px'}} itemStyle={{color:'#9ca3af'}}/><Line type="monotone" dataKey="enrolled" stroke="#3b82f6" strokeWidth={2} dot={false} name="Enrolled/wk"/></LineChart></ResponsiveContainer>
      </CardContent></Card>
      {allSites.length>0?(
        <Card><CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary">Site Activation Status</h3><span className="text-xs text-text-muted">{activeSites.length} activated / {allSites.length} total</span></div></CardHeader><CardContent>
          <div className="overflow-x-auto"><table className="w-full text-xs min-w-[700px]"><thead><tr className="border-b border-border">{['Site','Country','IRB','Stage','Enrolled / Target','SDV %','Last Visit','RAG'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i<4?'text-left':'text-right'}`}>{h}</th>)}</tr></thead>
          <tbody>{allSites.map(site=>{const overdue=site.lastMonitoringVisit&&(Date.now()-new Date(site.lastMonitoringVisit).getTime())/86400000>90;return(<tr key={site.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"><td className="py-2.5"><div className="font-medium text-text-primary truncate max-w-[180px]">{site.name}</div><div className="text-text-muted text-[10px] truncate">{site.principalInvestigator}</div></td><td className="py-2.5"><span className="flex items-center gap-1">{site.countryFlag} <span className="text-text-muted">{site.countryCode}</span></span></td><td className="py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${site.irbStatus==='Approved'?'bg-emerald-500/15 text-emerald-400':site.irbStatus==='Submitted'?'bg-blue-500/15 text-blue-400':'bg-amber-500/15 text-amber-400'}`}>{site.irbStatus}</span></td><td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${site.activationStage==='Activated'?'bg-emerald-500/15 text-emerald-400':site.activationStage==='Closed'?'bg-slate-500/15 text-slate-400':'bg-amber-500/15 text-amber-400'}`}>{site.activationStage}</span></td><td className="py-2.5 text-right"><span className="font-medium text-text-primary">{site.enrolled}</span><span className="text-text-muted"> / {site.target}</span></td><td className="py-2.5 text-right"><span className={site.sdvRate>=85?'text-emerald-400 font-bold':site.sdvRate>=70?'text-amber-400 font-bold':'text-red-400 font-bold'}>{site.sdvRate>0?`${site.sdvRate}%`:'—'}</span></td><td className="py-2.5 text-right">{site.lastMonitoringVisit?<span className={overdue?'text-red-400 font-bold':'text-text-muted'}>{new Date(site.lastMonitoringVisit).toLocaleDateString('en-US',{month:'short',day:'numeric'})}{overdue&&' ⚠'}</span>:<span className="text-text-muted">—</span>}</td><td className="py-2.5 text-right"><span className={`inline-block w-2.5 h-2.5 rounded-full ${ragDot(site.ragStatus)}`}/></td></tr>);})}</tbody></table></div>
        </CardContent></Card>
      ):(
        <Card><CardHeader><h3 className="font-semibold text-text-primary">Site Performance by Region</h3></CardHeader><CardContent>
          <table className="w-full text-xs"><thead><tr className="border-b border-border">{['Region','Sites','Enrolled','Rate/site','Risk'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i===0?'text-left':'text-right'}`}>{h}</th>)}</tr></thead><tbody>{regionRows.map(s=><tr key={s.region} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"><td className="py-2 font-mono text-text-primary">{s.region}</td><td className="py-2 text-right text-text-secondary">{s.sites}</td><td className="py-2 text-right text-text-secondary">{s.enrolled}</td><td className="py-2 text-right text-text-secondary">{s.sites>0?(s.enrolled/s.sites).toFixed(1):'—'}</td><td className="py-2 text-right"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${riskColor(s.risk)}`}>{s.risk}</span></td></tr>)}</tbody></table>
        </CardContent></Card>
      )}
    </div>
  );
}

// ============================================================================
// START-UP TAB
// ============================================================================

function StartUpTab({ study }: { study: ClinicalStudy }) {
  const done25=(study.enrolledSubjects/study.targetEnrollment)>=0.25;const done50=(study.enrolledSubjects/study.targetEnrollment)>=0.50;
  const allSites=study.sites??[];const cvComplete=allSites.filter(s=>s.cvStatus==='Complete').length;const fdComplete=allSites.filter(s=>s.financialDisclosure==='Complete').length;const cvPending=allSites.length-cvComplete;const fdPending=allSites.length-fdComplete;
  const milestones=[{label:'Protocol Final',done:true,date:study.startDate},{label:'IRB/IEC Approval',done:true,date:study.startDate},{label:'Site Contracts Executed',done:true,date:study.startDate},{label:'First Site Initiated (FSI)',done:true,date:study.startDate},{label:'First Subject Enrolled (FSE)',done:study.enrolledSubjects>0,date:study.startDate},{label:'25% Enrollment',done:done25,date:'—'},{label:'50% Enrollment',done:done50,date:'—'},{label:'Last Patient In (LPI)',done:study.status==='Completed',date:study.primaryCompletionDate??study.estimatedCompletion},{label:'Database Lock',done:study.status==='Completed',date:'—'},{label:'Primary CSR',done:false,date:'—'}];
  const ctaByRegion=study.activeRegions.map((region,i)=>({region,flag:['🇺🇸','🇪🇺','🇯🇵','🇨🇦','🇦🇺','🇰🇷','🇬🇧','🇳🇴'][i%8],status:(i<4?'Approved':i<6?'Submitted':'Pending') as 'Approved'|'Submitted'|'Pending',approvedDate:i<4?study.startDate:'—'}));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Sites Initiated" value={allSites.filter(s=>s.activationStage==='Activated').length||study.activeSites} sub={allSites.length>0?`of ${allSites.length} total`:undefined} icon={<Building2 className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400"/>
        <StatCard label="Regions Active" value={study.activeRegions.length} sub={study.activeRegions.join(' · ')} icon={<Globe className="w-4 h-4"/>} color="bg-purple-500/20 text-purple-400"/>
        {allSites.length>0&&<StatCard label="CV Packages" value={`${cvComplete}/${allSites.length}`} sub={cvPending>0?`${cvPending} pending`:'all complete'} icon={<UserCheck className="w-4 h-4"/>} color={cvComplete===allSites.length?'bg-emerald-500/20 text-emerald-400':'bg-amber-500/20 text-amber-400'} badge={cvPending>0?cvPending:undefined}/>}
        {allSites.length>0&&<StatCard label="Financial Disclosures" value={`${fdComplete}/${allSites.length}`} sub={fdPending>0?`${fdPending} pending`:'all complete'} icon={<ClipboardList className="w-4 h-4"/>} color={fdComplete===allSites.length?'bg-emerald-500/20 text-emerald-400':'bg-amber-500/20 text-amber-400'} badge={fdPending>0?fdPending:undefined}/>}
      </div>
      {allSites.length>0&&<Card><CardHeader><h3 className="font-semibold text-text-primary">Site Start-Up Tracker</h3></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-xs min-w-[600px]"><thead><tr className="border-b border-border">{['Site','Country','Start-Up Stage','CV','FD','Activated','RAG'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i>=5?'text-right':'text-left'}`}>{h}</th>)}</tr></thead>
        <tbody>{allSites.map(site=><tr key={site.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"><td className="py-2.5"><div className="font-medium text-text-primary truncate max-w-[160px]">{site.name}</div><div className="text-text-muted text-[10px]">{site.principalInvestigator}</div></td><td className="py-2.5">{site.countryFlag} {site.countryCode}</td><td className="py-2.5 min-w-[140px]"><div className="flex items-center gap-0.5 mb-0.5">{STAGE_ORDER.slice(0,7).map((stage,i)=><div key={stage} className={`h-1.5 rounded flex-1 ${stageIndex(site.activationStage)>=i?'bg-emerald-500':'bg-surface-elevated'}`} title={stage}/>)}</div><div className="text-[10px] text-text-muted">{site.activationStage}</div></td><td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${site.cvStatus==='Complete'?'bg-emerald-500/15 text-emerald-400':site.cvStatus==='Pending'?'bg-amber-500/15 text-amber-400':'bg-red-500/15 text-red-400'}`}>{site.cvStatus}</span></td><td className="py-2.5"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${site.financialDisclosure==='Complete'?'bg-emerald-500/15 text-emerald-400':site.financialDisclosure==='Pending'?'bg-amber-500/15 text-amber-400':'bg-red-500/15 text-red-400'}`}>{site.financialDisclosure}</span></td><td className="py-2.5 text-right text-text-muted text-[10px]">{site.activatedDate?new Date(site.activatedDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'}):'—'}</td><td className="py-2.5 text-right"><span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${ragBadge(site.ragStatus)}`}><span className={`w-1.5 h-1.5 rounded-full ${ragDot(site.ragStatus)}`}/>{site.ragStatus}</span></td></tr>)}</tbody></table></div>
      </CardContent></Card>}
      <Card><CardHeader><h3 className="font-semibold text-text-primary">CTA / Regulatory Submission Status</h3></CardHeader><CardContent>
        <div className="space-y-2">{ctaByRegion.map((cta,i)=><div key={i} className="flex items-center gap-3 p-2.5 bg-surface-elevated rounded-lg hover:bg-surface-card transition-colors"><span className="text-xl flex-shrink-0">{cta.flag}</span><div className="flex-1 min-w-0"><div className="text-xs font-medium text-text-primary">{cta.region}</div><div className="text-[10px] text-text-muted font-mono">CTA-{cta.region}-{study.protocolNumber}</div></div><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${cta.status==='Approved'?'bg-emerald-500/15 text-emerald-400':cta.status==='Submitted'?'bg-blue-500/15 text-blue-400':'bg-amber-500/15 text-amber-400'}`}>{cta.status}</span>{cta.approvedDate!=='—'&&<span className="text-[10px] text-text-muted flex-shrink-0">Approved {new Date(cta.approvedDate).toLocaleDateString('en-US',{month:'short',year:'numeric'})}</span>}</div>)}</div>
      </CardContent></Card>
      <Card><CardHeader><h3 className="font-semibold text-text-primary">Study Milestones</h3></CardHeader><CardContent>
        <div className="space-y-3">{milestones.map((m,i)=><div key={i} className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.done?'bg-emerald-500/20':'bg-surface-elevated'}`}>{m.done?<CheckCircle className="w-4 h-4 text-emerald-400"/>:<div className="w-2 h-2 rounded-full bg-border"/>}</div><div className="flex-1 text-sm text-text-primary">{m.label}</div><div className="text-xs text-text-muted">{m.date!=='—'?new Date(m.date).toLocaleDateString('en-US',{month:'short',year:'numeric'}):'—'}</div></div>)}</div>
      </CardContent></Card>
    </div>
  );
}

// ============================================================================
// MONITORING TAB
// ============================================================================

function MonitoringTab({ study }: { study: ClinicalStudy }) {
  const n=study.enrolledSubjects;
  const deviations=study.deviations??[];const visits=study.monitoringVisits??[];const sites=study.sites??[];
  const [showEmergencyUnblind,setShowEmergencyUnblind]=useState(false);
  const [unblindLog,setUnblindLog]=useState<EmergencyUnblindRecord[]>([]);
  const openDevs=deviations.filter(d=>d.status!=='Resolved');
  const openQueries=study.queryByDomain?Object.values(study.queryByDomain).reduce((a,v)=>a+v,0):Math.round(n*0.015);
  const sdvAvg=sites.filter(s=>s.sdvRate>0).reduce((a,s)=>a+s.sdvRate,0)/Math.max(1,sites.filter(s=>s.sdvRate>0).length);
  const overdueSites=sites.filter(s=>s.lastMonitoringVisit&&s.activationStage==='Activated'&&(Date.now()-new Date(s.lastMonitoringVisit).getTime())/86400000>90);
  const totalCritical=visits.reduce((a,v)=>a+v.criticalFindings,0);
  const totalMajor=visits.reduce((a,v)=>a+v.majorFindings,0);
  const totalMinor=visits.reduce((a,v)=>a+v.minorFindings,0);
  const fallbackRows=[{label:'Eligibility criteria',count:Math.round(n*0.009),sev:'Major'},{label:'Dosing / administration',count:Math.round(n*0.007),sev:'Major'},{label:'Assessment timing',count:Math.round(n*0.011),sev:'Minor'},{label:'Informed consent',count:Math.round(n*0.003),sev:'Major'},{label:'Other',count:Math.round(n*0.004),sev:'Minor'}];
  return (
    <div className="space-y-6">
      {study.blindingStatus==='Blinded'&&<div className="flex items-center gap-3 px-4 py-3 bg-violet-500/5 border border-violet-500/20 rounded-xl"><KeyRound className="w-4 h-4 text-violet-400 flex-shrink-0"/><div className="flex-1 min-w-0"><div className="text-sm font-semibold text-text-primary">Study Blinded · {study.randomisationCodeHolder}</div><div className="text-xs text-text-muted">Treatment arms masked · ICH E6(R3) §5.15</div></div><Button variant="outline" size="sm" onClick={()=>setShowEmergencyUnblind(true)} className="border-red-500/40 text-red-400 hover:bg-red-500/10 flex-shrink-0"><KeyRound className="w-3.5 h-3.5"/> Emergency Unblind</Button></div>}
      {unblindLog.length>0&&<Card className="border-red-500/20 bg-red-500/5"><CardHeader><h3 className="font-semibold text-text-primary flex items-center gap-2"><KeyRound className="w-4 h-4 text-red-400"/> Emergency Unblinding Log</h3></CardHeader><CardContent>
        <div className="space-y-2">{unblindLog.map((r,i)=><div key={i} className="p-3 bg-surface-elevated rounded-lg text-xs"><div className="flex items-center justify-between mb-1"><span className="font-mono font-semibold text-text-primary">{r.subjectId}</span><span className="text-emerald-400 font-semibold">{r.treatmentArm}</span></div><div className="flex items-center gap-3 text-text-muted flex-wrap"><span>{r.signatory}</span><span>·</span><span>{new Date(r.timestamp).toLocaleString()}</span><span>·</span><span className="font-mono text-[10px]">{r.hash.slice(0,20)}…</span></div></div>)}</div>
      </CardContent></Card>}
      {overdueSites.length>0&&<div className="flex items-start gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl"><AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/><div><div className="text-sm font-semibold text-red-400">Overdue Monitoring Visits</div><p className="text-xs text-text-muted mt-0.5">{overdueSites.map(s=>s.name).join(', ')} — last visit &gt;90 days ago · ICH E6(R3) risk-based monitoring threshold</p></div></div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="SDV Coverage" value={`${Math.round(sdvAvg||(72+(n%20)))}%`} sub="avg across active sites" icon={<UserCheck className="w-4 h-4"/>} color="bg-emerald-500/20 text-emerald-400"/>
        <StatCard label="Open Deviations" value={openDevs.length||Math.round(n*0.04)} sub={`${deviations.filter(d=>d.severity==='Major'&&d.status!=='Resolved').length||Math.round(n*0.003)} major`} icon={<AlertTriangle className="w-4 h-4"/>} color={openDevs.some(d=>d.severity==='Major')?'bg-red-500/20 text-red-400':'bg-amber-500/20 text-amber-400'}/>
        <StatCard label="Open Queries" value={openQueries} sub="all CDASH domains" icon={<AlertCircle className="w-4 h-4"/>} color="bg-amber-500/20 text-amber-400"/>
        <StatCard label="Monitoring Visits" value={visits.length||Math.round(n/30)} sub={`${totalCritical} critical findings`} icon={<Shield className="w-4 h-4"/>} color="bg-blue-500/20 text-blue-400"/>
      </div>
      <Card><CardHeader><h3 className="font-semibold text-text-primary flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent-blue"/> Risk-Based Monitoring Indicators (ICH E6(R3))</h3></CardHeader><CardContent>
        <div className="grid grid-cols-3 gap-4">{[{label:'Critical Findings',value:totalCritical,color:'text-red-400 bg-red-500/10 border border-red-500/20',thresh:'Target: 0'},{label:'Major Findings',value:totalMajor,color:'text-amber-400 bg-amber-500/10 border border-amber-500/20',thresh:'Target: <5'},{label:'Minor Findings',value:totalMinor,color:'text-blue-400 bg-blue-500/10 border border-blue-500/20',thresh:'Review if >10'}].map(m=><div key={m.label} className={`p-4 rounded-xl ${m.color}`}><div className="text-3xl font-bold mb-1">{m.value}</div><div className="text-xs font-semibold">{m.label}</div><div className="text-[10px] opacity-60 mt-0.5">{m.thresh}</div></div>)}</div>
      </CardContent></Card>
      {sites.filter(s=>s.sdvRate>0).length>0&&<Card><CardHeader><h3 className="font-semibold text-text-primary">SDV Coverage by Site</h3></CardHeader><CardContent>
        <div className="space-y-2.5">{sites.filter(s=>s.activationStage==='Activated').map(site=><div key={site.id} className="flex items-center gap-3"><div className="text-lg flex-shrink-0">{site.countryFlag}</div><div className="flex-1 min-w-0"><div className="text-xs text-text-primary truncate mb-1">{site.name}</div><div className="h-2 bg-surface-elevated rounded-full overflow-hidden"><div className={`h-full rounded-full ${site.sdvRate>=85?'bg-emerald-500':site.sdvRate>=70?'bg-amber-500':'bg-red-500'}`} style={{width:`${site.sdvRate}%`}}/></div></div><span className={`text-xs font-bold flex-shrink-0 w-10 text-right ${site.sdvRate>=85?'text-emerald-400':site.sdvRate>=70?'text-amber-400':'text-red-400'}`}>{site.sdvRate}%</span></div>)}</div>
      </CardContent></Card>}
      {visits.length>0&&<Card><CardHeader><h3 className="font-semibold text-text-primary">Monitoring Visit Log</h3></CardHeader><CardContent>
        <div className="overflow-x-auto"><table className="w-full text-xs min-w-[600px]"><thead><tr className="border-b border-border">{['Date','Site','Monitor','Type','Crit','Major','Minor','CAPA'].map((h,i)=><th key={h} className={`py-2 text-text-muted font-medium ${i<4?'text-left':'text-right'}`}>{h}</th>)}</tr></thead>
        <tbody>{[...visits].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(v=><tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors"><td className="py-2 text-text-muted">{new Date(v.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</td><td className="py-2 text-text-primary max-w-[140px] truncate">{v.siteName}</td><td className="py-2 text-text-muted">{v.monitor}</td><td className="py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${v.visitType==='SIV'?'bg-blue-500/15 text-blue-400':v.visitType==='COV'?'bg-slate-500/15 text-slate-400':v.visitType==='For-Cause'?'bg-red-500/15 text-red-400':'bg-purple-500/15 text-purple-400'}`}>{v.visitType}</span></td><td className="py-2 text-right"><span className={v.criticalFindings>0?'text-red-400 font-bold':'text-text-muted'}>{v.criticalFindings}</span></td><td className="py-2 text-right"><span className={v.majorFindings>0?'text-amber-400 font-bold':'text-text-muted'}>{v.majorFindings}</span></td><td className="py-2 text-right"><span className={v.minorFindings>0?'text-text-primary font-semibold':'text-text-muted'}>{v.minorFindings}</span></td><td className="py-2 text-right"><span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${v.capaStatus==='Closed'?'bg-emerald-500/15 text-emerald-400':v.capaStatus==='Open'?'bg-red-500/15 text-red-400':'bg-amber-500/15 text-amber-400'}`}>{v.capaStatus}</span></td></tr>)}</tbody></table></div>
      </CardContent></Card>}
      <Card><CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Protocol Deviations</h3>
          {deviations.length>0&&<div className="flex gap-2 text-[10px]">{['Open','CAPA Pending','Resolved'].map(s=>{const c=deviations.filter(d=>d.status===s).length;return c>0?<span key={s} className={`px-1.5 py-0.5 rounded font-semibold ${s==='Resolved'?'bg-emerald-500/15 text-emerald-400':s==='Open'?'bg-red-500/15 text-red-400':'bg-amber-500/15 text-amber-400'}`}>{c} {s}</span>:null;})}</div>}
        </div>
      </CardHeader><CardContent>
        {deviations.length>0?(
          <div className="space-y-2">{deviations.map(d=><div key={d.id} className={`p-3 rounded-lg border ${d.severity==='Major'&&d.status!=='Resolved'?'bg-red-500/5 border-red-500/20':'bg-surface-elevated border-border/50'}`}><div className="flex items-start justify-between gap-2 mb-1"><div className="flex items-center gap-2 flex-wrap"><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${d.severity==='Major'?'bg-red-500/15 text-red-400':'bg-slate-500/15 text-slate-400'}`}>{d.severity}</span><span className="text-[10px] text-text-muted">{d.category}</span><span className="text-[10px] text-text-muted">· {d.siteName}</span></div><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${d.status==='Resolved'?'bg-emerald-500/15 text-emerald-400':d.status==='Open'?'bg-red-500/15 text-red-400':'bg-amber-500/15 text-amber-400'}`}>{d.status}</span></div><p className="text-xs text-text-primary">{d.description}</p><div className="text-[10px] text-text-muted mt-1">{new Date(d.date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div></div>)}</div>
        ):(
          <div>{fallbackRows.map(d=><div key={d.label} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0 hover:bg-surface-elevated transition-colors px-1 rounded"><div className="flex-1 text-sm text-text-primary">{d.label}</div><span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${d.sev==='Major'?'bg-amber-500/15 text-amber-400':'bg-slate-500/15 text-slate-400'}`}>{d.sev}</span><div className="w-8 text-xs text-right font-bold text-text-primary">{d.count}</div></div>)}</div>
        )}
      </CardContent></Card>
      {showEmergencyUnblind&&<EmergencyUnblindModal study={study} onClose={()=>setShowEmergencyUnblind(false)} onComplete={rec=>setUnblindLog(prev=>[...prev,rec])}/>}
    </div>
  );
}

// ============================================================================
// HANDOFF TAB
// ============================================================================

function HandoffTab({ study }: { study: ClinicalStudy }) {
  const setActiveModule=useAppStore(s=>s.setActiveModule);const toast=useToast();
  const done=study.status==='Completed';
  const [showFormalUnblind,setShowFormalUnblind]=useState(false);
  const [studyUnblinded,setStudyUnblinded]=useState(study.blindingStatus==='Unblinded');

  const steps: {label:string;done:boolean;owner:string;action?:React.ReactNode}[]=[
    {label:'Last Patient Out (LPO)',done,owner:'Clinical Operations'},
    {label:'Final Data Entry & Cleaning',done,owner:'Data Management'},
    {label:'Database Reconciliation',done,owner:'Data Management'},
    {label:'Medical Coding Completed',done,owner:'Medical Affairs'},
    {label:'Statistical Analysis Plan Approved',done,owner:'Biostatistics'},
    {label:'Database Lock',done,owner:'Data Management / CRO'},
    {label:'Unblinding',done:done||studyUnblinded,owner:'Biostatistics + CMO',action:study.blindingStatus==='Blinded'&&!studyUnblinded&&done?(<button onClick={()=>setShowFormalUnblind(true)} className="px-2 py-1 text-[10px] rounded bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/20 font-semibold transition-colors">Initiate Formal Unblind</button>):null},
    {label:'CSR Initiated',done:false,owner:'Medical Writing'},
    {label:'CSR Final',done:false,owner:'Medical Writing'},
    {label:'Module 5 Submission Package',done:false,owner:'Regulatory Affairs'},
  ];
  const completedSteps=steps.filter(s=>s.done).length;const lockReadiness=Math.round((completedSteps/steps.length)*100);
  const queryDomains=study.queryByDomain??{AE:Math.round(study.enrolledSubjects*0.035),LB:Math.round(study.enrolledSubjects*0.045),VS:Math.round(study.enrolledSubjects*0.027),EX:Math.round(study.enrolledSubjects*0.019),DS:Math.round(study.enrolledSubjects*0.008),CM:0,DM:0,MH:0,PE:0};
  const domainLabels:Record<string,string>={AE:'Adverse Events',CM:'Concomitant Meds',DM:'Demographics',DS:'Disposition',EX:'Exposure',LB:'Laboratory',MH:'Medical History',PE:'Physical Exam',VS:'Vital Signs'};
  const sortedDomains=Object.entries(queryDomains).sort((a,b)=>b[1]-a[1]);const totalQueries=Object.values(queryDomains).reduce((a,v)=>a+v,0);
  return (
    <div className="space-y-6">
      <Card className={done?'border-emerald-500/30 bg-emerald-500/5':'border-amber-500/30 bg-amber-500/5'}><CardContent className="py-4">
        <div className="flex items-center gap-4"><div className={`p-2.5 rounded-xl ${done?'bg-emerald-500/20':'bg-amber-500/20'}`}><Lock className={`w-5 h-5 ${done?'text-emerald-400':'text-amber-400'}`}/></div><div className="flex-1"><div className="font-semibold text-text-primary">Database Lock Status</div><div className={`text-sm ${done?'text-emerald-400':'text-amber-400'}`}>{done?'Locked — ready for CSR authoring':'Not yet locked — study still active'}</div></div><div className="text-right flex-shrink-0"><div className="text-3xl font-bold text-text-primary">{lockReadiness}%</div><div className="text-xs text-text-muted">Lock Readiness</div></div></div>
        <div className="mt-3 h-2 bg-surface-elevated rounded-full overflow-hidden"><div className={`h-full rounded-full ${lockReadiness>=80?'bg-emerald-500':lockReadiness>=50?'bg-amber-500':'bg-red-500'}`} style={{width:`${lockReadiness}%`}}/></div>
      </CardContent></Card>

      {(study.tlfOutputs??[]).length>0&&<Card><CardContent className="py-5"><TLFShellTracker study={study}/></CardContent></Card>}

      <Card><CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary flex items-center gap-2"><Database className="w-4 h-4 text-accent-blue"/> Open Queries by CDASH Domain</h3><span className="text-xs text-text-muted">{totalQueries} total open</span></div></CardHeader><CardContent>
        {totalQueries===0?<div className="flex items-center gap-2 text-sm text-emerald-400 py-2"><CheckCircle className="w-4 h-4"/>All domains clean — zero open queries</div>:(
          <div className="space-y-2.5">{sortedDomains.filter(([,v])=>v>0).map(([domain,count])=><div key={domain} className="flex items-center gap-3"><div className="w-8 text-[10px] font-mono font-bold text-accent-blue">{domain}</div><div className="text-xs text-text-muted w-28 truncate">{domainLabels[domain]??domain}</div><div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{width:`${(count/Math.max(1,sortedDomains[0][1]))*100}%`}}/></div><div className="w-8 text-xs text-right font-bold text-text-primary">{count}</div></div>)}</div>
        )}
      </CardContent></Card>

      <Card><CardHeader><h3 className="font-semibold text-text-primary">Database Lock Checklist</h3></CardHeader><CardContent>
        <div className="space-y-2">{steps.map((s,i)=><div key={i} className="flex items-center gap-3 p-2.5 bg-surface-elevated rounded-lg hover:bg-surface-card transition-colors"><div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done?'bg-emerald-500/20':'bg-surface-card'}`}>{s.done?<CheckCircle className="w-3.5 h-3.5 text-emerald-400"/>:<div className="w-1.5 h-1.5 rounded-full bg-border"/>}</div><span className={`text-sm flex-1 ${s.done?'text-text-muted line-through':'text-text-primary'}`}>{s.label}</span><span className="text-[10px] text-text-muted flex-shrink-0">{s.owner}</span>{s.action&&<div className="flex-shrink-0">{s.action}</div>}</div>)}</div>
      </CardContent></Card>

      {done&&<>
        <Card className={studyUnblinded?'border-emerald-500/20':'border-violet-500/20'}><CardHeader><div className="flex items-center justify-between"><h3 className="font-semibold text-text-primary flex items-center gap-2"><KeyRound className="w-4 h-4"/> Randomisation Code List</h3><BlindingBadge status={studyUnblinded?'Unblinded':study.blindingStatus??'Blinded'}/></div></CardHeader><CardContent>
          {studyUnblinded?(
            <div className="space-y-2">
              {[{subject:'LIG-302-US-001-0001',arm:'Ligrastinib 240mg QD',rand:'A'},{subject:'LIG-302-US-001-0002',arm:'Docetaxel 75mg/m²',rand:'B'},{subject:'LIG-302-EU-002-0001',arm:'Ligrastinib 240mg QD',rand:'A'},{subject:'LIG-302-JP-003-0001',arm:'Docetaxel 75mg/m²',rand:'B'}].map((r,i)=><div key={i} className="flex items-center gap-3 p-2 bg-surface-elevated rounded text-xs"><span className="font-mono text-text-muted">{r.subject}</span><span className="flex-1 text-text-primary">{r.arm}</span><span className="font-bold text-accent-blue">{r.rand}</span></div>)}
              <p className="text-[10px] text-text-muted mt-2">Full randomisation list · {study.enrolledSubjects} subjects · Unblinded {new Date().toLocaleDateString()}</p>
            </div>
          ):(
            <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/20 rounded-lg"><Lock className="w-5 h-5 text-violet-400 flex-shrink-0"/><div><div className="text-sm font-semibold text-text-primary">Randomisation Codes Redacted</div><div className="text-xs text-text-muted mt-0.5">Formal unblinding authorisation required (Step 7) · Dual e-sig: Biostatistician + CMO</div></div></div>
          )}
        </CardContent></Card>
        <Card><CardHeader><h3 className="font-semibold text-text-primary">Final Analysis Dataset Freeze</h3></CardHeader><CardContent>
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0"/><div className="flex-1"><div className="text-sm font-semibold text-text-primary">Analysis Datasets Frozen</div><div className="text-xs text-text-muted">SDTM + ADaM locked · SHA-256 manifest verified</div></div><Button variant="outline" size="sm" onClick={()=>{toast.success('Opening Authoring — CSR workspace');setActiveModule('authoring');}}><FileOutput className="w-4 h-4"/> Open CSR</Button></div>
        </CardContent></Card>
        <Card><CardHeader><h3 className="font-semibold text-text-primary">Biostats Handoff Package</h3></CardHeader><CardContent>
          <div className="space-y-2">{[{label:'SDTM Datasets (all domains)',status:'Transferred'},{label:'ADaM Datasets (ADSL, ADAE, ADTTE, ADRS)',status:'Transferred'},{label:'Statistical Analysis Plan v3.0',status:'Transferred'},{label:'Randomisation Code List',status:studyUnblinded?'Transferred':'Pending Unblinding'},{label:'Database Lock Certificate',status:'Pending'}].map((item,i)=><div key={i} className="flex items-center gap-3 p-2.5 bg-surface-elevated rounded-lg hover:bg-surface-card transition-colors"><div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status==='Transferred'?'bg-emerald-500':'bg-amber-500'}`}/><span className="text-xs text-text-primary flex-1">{item.label}</span><span className={`text-[10px] font-semibold ${item.status==='Transferred'?'text-emerald-400':'text-amber-400'}`}>{item.status}</span></div>)}</div>
          <div className="mt-4"><Button variant="outline" size="sm" onClick={()=>setActiveModule('submission-command')}><Layers className="w-4 h-4"/> View Submission Package</Button></div>
        </CardContent></Card>

        {/* v0.125.75: eCTD Dual-Rep block — CSR */}
        <Card><CardHeader><h3 className="font-semibold text-text-primary">CSR Regulatory Document Package</h3></CardHeader><CardContent>
          <DualRepDocumentBlock
            packageTitle="Clinical Study Report Package"
            docs={[
              { label: 'Clinical Study Report (CSR)', ectdPath: `m5/53-clin-stud-rep/535-rep-effi-safe-stud/5351-stud-rep/${study.protocolNumber}-CSR-FINAL.pdf`, type: 'report' },
              { label: 'CSR Synopsis', ectdPath: `m2/27-clin-sum/275-ref-list/${study.protocolNumber}-SYNOPSIS.pdf`, type: 'summary' },
              { label: 'Statistical Analysis Plan', ectdPath: `m5/53-clin-stud-rep/535-rep-effi-safe-stud/5351-stud-rep/${study.protocolNumber}-SAP.pdf`, type: 'protocol' },
            ]}
            ectdMeta={{ module: 'Module 5.3', section: '5.3.5.1 — Reports of Controlled Clinical Studies', ichReference: 'ICH E3 §11–14' }}
            structuredDataNote="Primary and secondary endpoint results, subject disposition, safety summary, and TLF outputs are stored as structured records in Ligature. This enables cross-study meta-analysis, submission authoring pre-population, and direct feeding into Module 2 clinical summaries. The CSR document remains the regulatory master; structured data enables the intelligence layer."
          />
        </CardContent></Card>
      </>}
      {showFormalUnblind&&<FormalUnblindModal study={study} onClose={()=>setShowFormalUnblind(false)} onComplete={()=>setStudyUnblinded(true)}/>}
    </div>
  );
}

// ============================================================================
// STUDY WORKSPACE
// ============================================================================

function StudyWorkspace({ study, onBack, onSwitch }: { study: ClinicalStudy; onBack: () => void; onSwitch: (id: string) => void }) {
  const [activeTab,setActiveTab]=useState<StudyTab>('overview');
  const [showPicker,setShowPicker]=useState(false);
  const risk=getRisk(study);const pct=Math.round((study.enrolledSubjects/study.targetEnrollment)*100);
  const openDevs=(study.deviations??[]).filter(d=>d.status!=='Resolved').length;
  const overdueSites=(study.sites??[]).filter(s=>s.lastMonitoringVisit&&s.activationStage==='Activated'&&(Date.now()-new Date(s.lastMonitoringVisit).getTime())/86400000>90).length;
  const tabs:{id:StudyTab;label:string;icon:React.ReactNode;badge?:number}[]=[
    {id:'overview',label:'Overview',icon:<BarChart3 className="w-3.5 h-3.5"/>},
    {id:'protocol',label:'Protocol',icon:<GitBranch className="w-3.5 h-3.5"/>},
    {id:'operations',label:'Operations',icon:<TrendingUp className="w-3.5 h-3.5"/>},
    {id:'startup',label:'Start-Up',icon:<Zap className="w-3.5 h-3.5"/>},
    {id:'monitoring',label:'Monitoring',icon:<Shield className="w-3.5 h-3.5"/>,badge:openDevs+overdueSites},
    {id:'handoff',label:'DB Lock / Handoff',icon:<Lock className="w-3.5 h-3.5"/>},
  ];
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-2 px-4 pt-2 pb-0 min-h-[2.25rem]">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue transition-colors flex-shrink-0"><ArrowLeft className="w-3 h-3"/> Portfolio</button>
          <span className="text-border text-xs select-none">/</span>
          <div className="relative flex-shrink-0">
            <button onClick={()=>setShowPicker(v=>!v)} className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-surface-card border border-transparent hover:border-border transition-all group">
              <span className="font-mono text-xs font-semibold text-text-primary">{study.protocolNumber}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${phaseColor(study.phase)}`}>{study.phase}</span>
              <span className={`text-[10px] font-medium ${statusColor(study.status)}`}>{study.status}</span>
              {study.blindingStatus&&<BlindingBadge status={study.blindingStatus}/>}
              <ChevronDown className="w-3 h-3 text-text-muted group-hover:text-accent-blue transition-colors"/>
            </button>
            {showPicker&&<div className="absolute top-full left-0 mt-1 w-80 bg-surface-elevated border border-border rounded-xl shadow-2xl z-50 overflow-hidden"><div className="px-3 py-2 border-b border-border text-xs text-text-muted font-medium">Switch Study</div><div className="max-h-64 overflow-y-auto p-1">{CLINICAL_STUDIES.map(s=><button key={s.id} onClick={()=>{onSwitch(s.id);setShowPicker(false);}} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${s.id===study.id?'bg-accent-blue/10 text-accent-blue':'hover:bg-surface-card text-text-secondary'}`}><div><div className="font-mono text-xs font-semibold">{s.protocolNumber}</div><div className="text-xs text-text-muted truncate max-w-[200px]">{s.shortTitle}</div></div><span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${phaseColor(s.phase)}`}>{s.phase}</span></button>)}</div></div>}
          </div>
          {risk!=='None'&&<span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${riskColor(risk)}`}>{risk}</span>}
          <div className="ml-auto flex items-center gap-2 flex-shrink-0"><span className="text-sm font-bold text-text-primary">{pct}%</span><span className="text-xs text-text-muted hidden sm:inline">{study.enrolledSubjects.toLocaleString()} / {study.targetEnrollment.toLocaleString()}</span></div>
        </div>
        <div className="flex items-center px-4 gap-1 overflow-x-auto">
          {tabs.map(tab=><button key={tab.id} onClick={()=>setActiveTab(tab.id)} className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab===tab.id?'border-accent-blue text-accent-blue':'border-transparent text-text-muted hover:text-text-primary'}`}>{tab.icon}{tab.label}{tab.badge!==undefined&&tab.badge>0&&<span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{tab.badge>9?'9+':tab.badge}</span>}</button>)}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab==='overview'&&<OverviewTab study={study} onTabSwitch={setActiveTab}/>}
        {activeTab==='protocol'&&<ProtocolTab study={study}/>}
        {activeTab==='operations'&&<OperationsTab study={study} onTabSwitch={setActiveTab}/>}
        {activeTab==='startup'&&<StartUpTab study={study}/>}
        {activeTab==='monitoring'&&<MonitoringTab study={study}/>}
        {activeTab==='handoff'&&<HandoffTab study={study}/>}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export function ClinicalDevelopmentScreen() {
  const scopeLevel=useActiveScopeStore(s=>s.scopeLevel);
  const scopeStudyId=useActiveScopeStore(s=>s.studyId);
  const setStudy=useActiveScopeStore(s=>s.setStudy);
  const atStudy=scopeLevel==='study';
  const scopeStudy=atStudy&&scopeStudyId?getStudyById(scopeStudyId):undefined;
  const handleSelect=useCallback((id:string)=>{setStudy(id);},[setStudy]);
  const handleBack=useCallback(()=>{setStudy(null);},[setStudy]);
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader moduleId="ctms" title="Clinical Development" subtitle={atStudy?undefined:'Portfolio & Intelligence'} icon={<Stethoscope className="w-5 h-5"/>}/>
      {atStudy&&scopeStudy?<StudyWorkspace study={scopeStudy} onBack={handleBack} onSwitch={handleSelect}/>:<PortfolioMode onSelectStudy={handleSelect}/>}
    </div>
  );
}

export default ClinicalDevelopmentScreen;
