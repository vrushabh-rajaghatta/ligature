/**
 * useDataPackageStore — v0.126.9
 * Cross-module data package manifest + Prior Dossier / Delta engine
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface DataPackageDataset {
  domain: string; label: string; records: number; score: number;
  status: 'PASS' | 'WARNING' | 'FAIL'; errorCount: number; warningCount: number;
  ectdModule: string; ectdSection: string; ectdPath: string;
  defineXmlItemCount: number; validatedAt: string; class: string;
}
export interface DataPackageManifest {
  id: string; studyId: string; studyTitle: string;
  cdiscVersion: string; defineXmlVersion: string;
  datasets: DataPackageDataset[]; overallScore: number;
  totalRecords: number; totalErrors: number;
  packageStatus: 'READY' | 'PARTIAL' | 'BLOCKED';
  createdAt: string; createdBy: string;
  importedToSubmission: boolean; importedAt?: string; submissionSequence?: string;
}
export interface PriorDossierDataset {
  domain: string; label: string; records: number; score: number;
  status: 'PASS' | 'WARNING' | 'FAIL'; ectdPath: string;
  validatedAt: string; defineXmlVersion: string; variableCount: number;
}
export interface PriorDossier {
  id: string; sequenceNumber: string; submissionType: string;
  submissionDate: string; applicationNumber: string; studyId: string;
  cdiscVersion: string; datasets: PriorDossierDataset[]; importedAt: string;
}
export type DeltaAction = 'carry-forward' | 're-validate' | 'new' | 'removed';
export interface DatasetDelta {
  domain: string; label: string; action: DeltaAction; reason: string;
  prior?: PriorDossierDataset; current?: DataPackageDataset;
  recordsDiff?: number; scoreDiff?: number; variableDiff?: number;
}
export interface DeltaManifest {
  id: string; studyId: string; priorDossierId: string;
  priorSequence: string; newSequence: string;
  deltas: DatasetDelta[]; carriedForward: number;
  requiresRevalidation: number; newDomains: number; removedDomains: number;
  estimatedTimeSaved: string; createdAt: string;
}

export const DEMO_PRIOR_DOSSIERS: PriorDossier[] = [
  {
    id: 'PRIOR-IND-0003', sequenceNumber: '0003',
    submissionType: 'IND Safety Amendment', submissionDate: '2025-11-14',
    applicationNumber: 'IND 138754', studyId: 'LIG-2847-302',
    cdiscVersion: '3.4', importedAt: new Date().toISOString(),
    datasets: [
      { domain:'DM', label:'Demographics',           records:248,  score:98,  status:'PASS',    ectdPath:'m5/datasets/dm.xpt',  validatedAt:'2025-11-10T09:00:00Z', defineXmlVersion:'2.1', variableCount:26 },
      { domain:'AE', label:'Adverse Events',          records:743,  score:82,  status:'WARNING', ectdPath:'m5/datasets/ae.xpt',  validatedAt:'2025-11-10T09:15:00Z', defineXmlVersion:'2.1', variableCount:22 },
      { domain:'LB', label:'Laboratory Test Results', records:3840, score:95,  status:'PASS',    ectdPath:'m5/datasets/lb.xpt',  validatedAt:'2025-11-10T09:30:00Z', defineXmlVersion:'2.1', variableCount:24 },
      { domain:'VS', label:'Vital Signs',             records:2640, score:100, status:'PASS',    ectdPath:'m5/datasets/vs.xpt',  validatedAt:'2025-11-10T09:45:00Z', defineXmlVersion:'2.1', variableCount:18 },
      { domain:'EX', label:'Exposure',                records:1488, score:100, status:'PASS',    ectdPath:'m5/datasets/ex.xpt',  validatedAt:'2025-11-10T10:00:00Z', defineXmlVersion:'2.1', variableCount:16 },
      { domain:'CM', label:'Concomitant Medications', records:1204, score:97,  status:'PASS',    ectdPath:'m5/datasets/cm.xpt',  validatedAt:'2025-11-10T10:15:00Z', defineXmlVersion:'2.1', variableCount:14 },
      { domain:'MH', label:'Medical History',         records:463,  score:100, status:'PASS',    ectdPath:'m5/datasets/mh.xpt',  validatedAt:'2025-11-10T10:30:00Z', defineXmlVersion:'2.1', variableCount:12 },
      { domain:'DS', label:'Disposition',             records:248,  score:100, status:'PASS',    ectdPath:'m5/datasets/ds.xpt',  validatedAt:'2025-11-10T10:45:00Z', defineXmlVersion:'2.1', variableCount:10 },
    ],
  },
  {
    id: 'PRIOR-NDA-0001', sequenceNumber: '0001',
    submissionType: 'NDA Original Submission', submissionDate: '2025-06-01',
    applicationNumber: 'NDA 215847', studyId: 'LIG-2847-302',
    cdiscVersion: '3.4', importedAt: new Date().toISOString(),
    datasets: [
      { domain:'DM', label:'Demographics',           records:248,  score:100, status:'PASS', ectdPath:'m5/datasets/dm.xpt',  validatedAt:'2025-05-28T09:00:00Z', defineXmlVersion:'2.1', variableCount:26 },
      { domain:'AE', label:'Adverse Events',          records:891,  score:100, status:'PASS', ectdPath:'m5/datasets/ae.xpt',  validatedAt:'2025-05-28T09:15:00Z', defineXmlVersion:'2.1', variableCount:24 },
      { domain:'LB', label:'Laboratory Test Results', records:4320, score:98,  status:'PASS', ectdPath:'m5/datasets/lb.xpt',  validatedAt:'2025-05-28T09:30:00Z', defineXmlVersion:'2.1', variableCount:24 },
      { domain:'VS', label:'Vital Signs',             records:2976, score:100, status:'PASS', ectdPath:'m5/datasets/vs.xpt',  validatedAt:'2025-05-28T09:45:00Z', defineXmlVersion:'2.1', variableCount:18 },
      { domain:'EX', label:'Exposure',                records:1488, score:100, status:'PASS', ectdPath:'m5/datasets/ex.xpt',  validatedAt:'2025-05-28T10:00:00Z', defineXmlVersion:'2.1', variableCount:16 },
      { domain:'CM', label:'Concomitant Medications', records:1204, score:100, status:'PASS', ectdPath:'m5/datasets/cm.xpt',  validatedAt:'2025-05-28T10:15:00Z', defineXmlVersion:'2.1', variableCount:14 },
      { domain:'MH', label:'Medical History',         records:463,  score:100, status:'PASS', ectdPath:'m5/datasets/mh.xpt',  validatedAt:'2025-05-28T10:30:00Z', defineXmlVersion:'2.1', variableCount:12 },
      { domain:'DS', label:'Disposition',             records:248,  score:100, status:'PASS', ectdPath:'m5/datasets/ds.xpt',  validatedAt:'2025-05-28T10:45:00Z', defineXmlVersion:'2.1', variableCount:10 },
      { domain:'QS', label:'Questionnaires',          records:1984, score:100, status:'PASS', ectdPath:'m5/datasets/qs.xpt',  validatedAt:'2025-05-28T11:00:00Z', defineXmlVersion:'2.1', variableCount:10 },
    ],
  },
];

function computeDeltas(prior: PriorDossier, current: DataPackageManifest | null): DatasetDelta[] {
  const deltas: DatasetDelta[] = [];
  const currentMap = new Map((current?.datasets ?? []).map(d => [d.domain, d]));
  const priorMap   = new Map(prior.datasets.map(d => [d.domain, d]));
  for (const [domain, curr] of currentMap) {
    const prev = priorMap.get(domain);
    if (!prev) { deltas.push({ domain, label: curr.label, action: 'new', reason: `Not in prior sequence ${prior.sequenceNumber}`, current: curr }); continue; }
    const recordsDiff  = curr.records - prev.records;
    const variableDiff = curr.defineXmlItemCount - prev.variableCount;
    const scoreDiff    = curr.score - prev.score;
    const noChange = Math.abs(recordsDiff) / Math.max(prev.records, 1) < 0.02 && variableDiff === 0 && prev.status === 'PASS' && curr.status !== 'FAIL';
    if (noChange) {
      deltas.push({ domain, label: curr.label, action: 'carry-forward', reason: `No structural changes — records within 2%, variables identical, prior PASS`, prior: prev, current: curr, recordsDiff, scoreDiff, variableDiff });
    } else {
      const reasons: string[] = [];
      if (Math.abs(recordsDiff) > 0) reasons.push(`records ${recordsDiff > 0 ? '+' : ''}${recordsDiff.toLocaleString()}`);
      if (variableDiff !== 0) reasons.push(`${Math.abs(variableDiff)} variable${Math.abs(variableDiff) !== 1 ? 's' : ''} ${variableDiff > 0 ? 'added' : 'removed'}`);
      if (prev.status !== 'PASS') reasons.push(`prior was ${prev.status}`);
      deltas.push({ domain, label: curr.label, action: 're-validate', reason: reasons.join('; ') || 'Changes detected', prior: prev, current: curr, recordsDiff, scoreDiff, variableDiff });
    }
  }
  for (const [domain, prev] of priorMap) {
    if (!currentMap.has(domain)) deltas.push({ domain, label: prev.label, action: 'removed', reason: `Present in prior ${prior.sequenceNumber}, absent from current package`, prior: prev });
  }
  const order: DeltaAction[] = ['re-validate', 'new', 'carry-forward', 'removed'];
  return deltas.sort((a, b) => order.indexOf(a.action) - order.indexOf(b.action));
}

interface DataPackageState {
  manifest: DataPackageManifest | null;
  priorDossier: PriorDossier | null;
  deltaManifest: DeltaManifest | null;
  importLog: { timestamp: string; action: string; user: string }[];
  createManifest: (datasets: DataPackageDataset[], studyId: string, studyTitle: string) => DataPackageManifest;
  markImported: (sequenceNumber: string) => void;
  clearManifest: () => void;
  importPriorDossier: (dossier: PriorDossier) => void;
  clearPriorDossier: () => void;
  generateDeltaManifest: (newSequence: string) => DeltaManifest | null;
  addImportLogEntry: (action: string, user: string) => void;
}

export const useDataPackageStore = create<DataPackageState>()(
  immer((set, get) => ({
    manifest: null, priorDossier: null, deltaManifest: null, importLog: [],

    createManifest: (datasets, studyId, studyTitle) => {
      const overallScore = datasets.length > 0 ? Math.round(datasets.reduce((s, d) => s + d.score, 0) / datasets.length) : 0;
      const manifest: DataPackageManifest = {
        id: `PKG-${Date.now()}`, studyId, studyTitle, cdiscVersion: '3.4', defineXmlVersion: '2.1', datasets,
        overallScore, totalRecords: datasets.reduce((s, d) => s + d.records, 0), totalErrors: datasets.reduce((s, d) => s + d.errorCount, 0),
        packageStatus: datasets.some(d => d.status === 'FAIL') ? 'BLOCKED' : datasets.some(d => d.status === 'WARNING') ? 'PARTIAL' : 'READY',
        createdAt: new Date().toISOString(), createdBy: 'Biostats Lead', importedToSubmission: false,
      };
      set(state => { state.manifest = manifest; state.importLog.unshift({ timestamp: new Date().toISOString(), action: `Package created — ${datasets.length} datasets, score ${overallScore}%`, user: 'Biostats Lead' }); });
      return manifest;
    },

    markImported: (sequenceNumber) => set(state => {
      if (state.manifest) { state.manifest.importedToSubmission = true; state.manifest.importedAt = new Date().toISOString(); state.manifest.submissionSequence = sequenceNumber; state.importLog.unshift({ timestamp: new Date().toISOString(), action: `Imported to eCTD sequence ${sequenceNumber}`, user: 'Regulatory Affairs' }); }
    }),

    clearManifest: () => set(state => { state.manifest = null; state.deltaManifest = null; }),

    importPriorDossier: (dossier) => set(state => {
      state.priorDossier = { ...dossier, importedAt: new Date().toISOString() };
      state.deltaManifest = null;
      state.importLog.unshift({ timestamp: new Date().toISOString(), action: `Prior dossier imported — ${dossier.submissionType} seq ${dossier.sequenceNumber}`, user: 'Regulatory Affairs' });
    }),

    clearPriorDossier: () => set(state => { state.priorDossier = null; state.deltaManifest = null; }),

    generateDeltaManifest: (newSequence) => {
      const { priorDossier, manifest } = get();
      if (!priorDossier) return null;
      const deltas = computeDeltas(priorDossier, manifest);
      const carried = deltas.filter(d => d.action === 'carry-forward').length;
      const revalidate = deltas.filter(d => d.action === 're-validate').length;
      const minutes = carried * 45;
      const timeSaved = minutes >= 60 ? `${(minutes / 60).toFixed(1)} hours` : `${minutes} minutes`;
      const delta: DeltaManifest = {
        id: `DELTA-${Date.now()}`, studyId: priorDossier.studyId,
        priorDossierId: priorDossier.id, priorSequence: priorDossier.sequenceNumber, newSequence,
        deltas, carriedForward: carried, requiresRevalidation: revalidate,
        newDomains: deltas.filter(d => d.action === 'new').length,
        removedDomains: deltas.filter(d => d.action === 'removed').length,
        estimatedTimeSaved: timeSaved, createdAt: new Date().toISOString(),
      };
      set(state => { state.deltaManifest = delta; state.importLog.unshift({ timestamp: new Date().toISOString(), action: `Delta manifest — ${carried} carry-forward, ${revalidate} re-validate, ~${timeSaved} saved`, user: 'Biostats Lead' }); });
      return delta;
    },

    addImportLogEntry: (action, user) => set(state => { state.importLog.unshift({ timestamp: new Date().toISOString(), action, user }); }),
  }))
);
