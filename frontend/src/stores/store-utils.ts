
// Store utility functions - extracted from stores/index.ts barrel
import { usePortfolioStore } from './portfolio-store';
import { useDocumentStore } from './document-store';
import { useSafetyStore } from './safety-store';
import { useUIStore } from './ui-store';
import { useAuthStore } from './auth-store';

export const resetAllStores = () => {
  usePortfolioStore.getState().resetToDefaults();
  useDocumentStore.getState().clearAll();
  useSafetyStore.getState().clearAll();
  useUIStore.getState().resetPreferences();
  useAuthStore.getState().logout();
};

export const clearAllData = () => {
  usePortfolioStore.getState().clearAll();
  useDocumentStore.getState().clearAll();
  useSafetyStore.getState().clearAll();
  useUIStore.getState().clearRecentItems();
  useUIStore.getState().clearNotifications();
};

export interface LigatureDataExport {
  version: string;
  exportedAt: string;
  portfolio: { programs: unknown[]; applications: unknown[]; sequences: unknown[]; milestones: unknown[] };
  documents: unknown[];
  safety: { cases: unknown[]; signals: unknown[]; reports: unknown[] };
}

export const exportAllData = (): LigatureDataExport => {
  const portfolioState = usePortfolioStore.getState();
  const documentState = useDocumentStore.getState();
  const safetyState = useSafetyStore.getState();
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    portfolio: { programs: portfolioState.programs, applications: portfolioState.applications, sequences: portfolioState.sequences, milestones: portfolioState.milestones },
    documents: documentState.documents,
    safety: { cases: safetyState.cases, signals: safetyState.signals, reports: safetyState.reports },
  };
};

export const validateDataIntegrity = () => {
  const { programs, applications, sequences } = usePortfolioStore.getState();
  const { documents } = useDocumentStore.getState();
  const { cases, signals } = useSafetyStore.getState();
  const issues: string[] = [];
  applications.forEach((app) => { if (!programs.find((p) => p.id === app.programId)) issues.push(`Application ${app.applicationNumber} references non-existent program ${app.programId}`); });
  sequences.forEach((seq) => { if (!applications.find((a) => a.id === seq.applicationId)) issues.push(`Sequence ${seq.sequenceNumber} references non-existent application ${seq.applicationId}`); });
  documents.forEach((doc) => { if (!applications.find((a) => a.id === doc.applicationId)) issues.push(`Document ${doc.title} references non-existent application ${doc.applicationId}`); });
  cases.forEach((c) => { if (!programs.find((p) => p.id === c.programId)) issues.push(`Case ${c.caseNumber} references non-existent program ${c.programId}`); });
  signals.forEach((s) => { if (!programs.find((p) => p.id === s.programId)) issues.push(`Signal ${s.signalName} references non-existent program ${s.programId}`); });
  return { valid: issues.length === 0, issues };
};
