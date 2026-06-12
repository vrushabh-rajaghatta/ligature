

/**
 * useCrossModuleSearch - v0.27.73
 * 
 * Aggregates searchable data from all Ligature modules into a unified search index.
 * Provides real-time search across documents, HAQs, submissions, safety cases,
 * studies, TMF records, QMS items, and more.
 */

import { useMemo, useCallback } from 'react';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import { useHAQStore } from '@/store/useHAQStoreV2';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useTMFStore } from '@/store/useTMFStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { useDocumentControlStore } from '@/store/useDocumentControlStore';

// ============================================================================
// TYPES
// ============================================================================

export type SearchCategory = 
  | 'documents' 
  | 'authoring'
  | 'submissions' 
  | 'haqs' 
  | 'safety' 
  | 'tmf'
  | 'qms'
  | 'ctms'
  | 'products';

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  statusColor?: string;
  type?: string;
  module: string;
  moduleIcon: string;
  moduleColor: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
  timestamp?: Date;
  path?: string; // Navigation path
}

export interface SearchFilter {
  categories: SearchCategory[];
  statuses: string[];
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

export const CATEGORY_CONFIG: Record<SearchCategory, { 
  label: string; 
  icon: string;
  color: string;
  bgColor: string;
  module: string;
}> = {
  documents: { 
    label: 'Document Control', 
    icon: 'FileText',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    module: 'document-control'
  },
  authoring: { 
    label: 'Authoring', 
    icon: 'Edit3',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    module: 'authoring'
  },
  submissions: { 
    label: 'Submissions', 
    icon: 'Send',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    module: 'submissions-hub'
  },
  haqs: { 
    label: 'HAQs', 
    icon: 'MessageSquare',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    module: 'haq'
  },
  safety: { 
    label: 'Safety', 
    icon: 'AlertTriangle',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    module: 'safety'
  },
  tmf: { 
    label: 'TMF', 
    icon: 'FolderOpen',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    module: 'tmf'
  },
  qms: { 
    label: 'QMS', 
    icon: 'Shield',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    module: 'qms'
  },
  ctms: { 
    label: 'Clinical Trials', 
    icon: 'Microscope',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    module: 'ctms'
  },
  products: { 
    label: 'Products', 
    icon: 'Package',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    module: 'master-data'
  },
};

// ============================================================================
// STATUS COLOR MAPPING
// ============================================================================

function getStatusColor(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('draft')) return 'gray';
  if (normalized.includes('review') || normalized.includes('pending')) return 'amber';
  if (normalized.includes('approved') || normalized.includes('effective') || normalized.includes('complete')) return 'green';
  if (normalized.includes('open') || normalized.includes('in progress') || normalized.includes('active')) return 'blue';
  if (normalized.includes('overdue') || normalized.includes('at risk') || normalized.includes('critical')) return 'red';
  if (normalized.includes('archived') || normalized.includes('closed')) return 'slate';
  return 'gray';
}

// ============================================================================
// SEARCH SCORING
// ============================================================================

function calculateRelevance(
  query: string,
  item: { title: string; subtitle?: string; description?: string; metadata?: Record<string, unknown> }
): number {
  if (!query) return 50;
  
  const q = query.toLowerCase();
  let score = 0;
  
  // Title match (highest weight)
  if (item.title.toLowerCase().includes(q)) {
    score += 50;
    if (item.title.toLowerCase().startsWith(q)) score += 20;
    if (item.title.toLowerCase() === q) score += 30;
  }
  
  // Subtitle match
  if (item.subtitle?.toLowerCase().includes(q)) {
    score += 25;
  }
  
  // Description match
  if (item.description?.toLowerCase().includes(q)) {
    score += 15;
  }
  
  // Metadata match
  if (item.metadata) {
    const metaStr = Object.values(item.metadata).join(' ').toLowerCase();
    if (metaStr.includes(q)) score += 10;
  }
  
  return Math.min(100, score);
}

// ============================================================================
// HOOK
// ============================================================================

export function useCrossModuleSearch() {
  // Get data from all stores
  const { documents: authoringDocs } = useAuthoringStore();
  const { haqs } = useHAQStore();
  const { cases: safetyCasesObj } = usePharmacovigilanceStore();
  const { artifacts: tmfArtifactsObj } = useTMFStore();
  const { controlledDocuments: qmsDocsObj, deviations: deviationsObj, capas: capasObj } = useQMSStore();
  const { studies: studiesObj, sites: sitesObj } = useCTMSStore();
  const { drafts: submissionDrafts } = useSequenceBuilderStore();
  const { documents: controlledDocsObj } = useDocumentControlStore();
  
  // Convert objects to arrays (many stores use Record<string, T> instead of T[])
  const safetyCases = Object.values(safetyCasesObj || {});
  const tmfArtifacts = Object.values(tmfArtifactsObj || {});
  // TMF store doesn't have documents, only artifacts - type for potential future use
  const tmfDocs: Array<{ id: string; title?: string; name?: string; zone?: string; artifact?: string; status?: string; study?: string }> = [];
  const qmsDocs = Object.values(qmsDocsObj || {});
  const deviations = Object.values(deviationsObj || {});
  const capas = Object.values(capasObj || {});
  const studies = Object.values(studiesObj || {});
  const sites = Object.values(sitesObj || {});
  const submissions = submissionDrafts || [];
  const controlledDocs = Object.values(controlledDocsObj || {});

  // Build unified search index
  const searchIndex = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    // Authoring Documents
    if (authoringDocs) {
      authoringDocs.forEach(doc => {
        results.push({
          id: `authoring-${doc.id}`,
          category: 'authoring',
          title: doc.title,
          subtitle: `${doc.id} • v${doc.version}`,
          status: doc.status,
          statusColor: getStatusColor(doc.status),
          type: doc.documentType,
          module: 'Authoring',
          moduleIcon: 'Edit3',
          moduleColor: 'text-amber-400',
          relevanceScore: 80,
          metadata: { 
            version: doc.version, 
            type: doc.documentType,
            author: doc.authorName || doc.authorId 
          },
          path: `/authoring/${doc.id}`,
        });
      });
    }

    // HAQs
    if (haqs) {
      haqs.forEach(haq => {
        results.push({
          id: `haq-${haq.id}`,
          category: 'haqs',
          title: haq.questionText?.substring(0, 80) || `HAQ ${haq.id}`,
          subtitle: `${haq.id} • ${haq.source} • Due: ${haq.dueDate || 'TBD'}`,
          status: haq.status,
          statusColor: getStatusColor(haq.status),
          type: haq.discipline,
          module: 'HAQ',
          moduleIcon: 'MessageSquare',
          moduleColor: 'text-orange-400',
          relevanceScore: 85,
          metadata: { 
            authority: haq.source,
            discipline: haq.discipline,
            priority: haq.priority,
            assignee: haq.assignedToName || haq.assignedTo
          },
          path: `/haq/${haq.id}`,
        });
      });
    }

    // Safety Cases
    if (safetyCases) {
      safetyCases.forEach(safetyCase => {
        // ICSRCase has nested structure - safely extract common search fields
        const caseAny = safetyCase as unknown as Record<string, unknown>;
        const productName = (caseAny.drugs as Array<{drugName?: string}>)?.[0]?.drugName || 'Unknown Product';
        const eventDesc = (caseAny.reactions as Array<{reactionTerm?: string}>)?.[0]?.reactionTerm || '';
        const seriousness = (caseAny.safetyReport as {seriousness?: string})?.seriousness || 'Unclassified';
        const reportType = (caseAny.safetyReport as {reportType?: string})?.reportType || 'ICSR';
        const country = (caseAny.patient as {country?: string})?.country || '';
        
        results.push({
          id: `safety-${safetyCase.id}`,
          category: 'safety',
          title: `${safetyCase.caseNumber || safetyCase.id} - ${eventDesc?.substring(0, 50) || 'Safety Case'}`,
          subtitle: `${productName} • ${seriousness}`,
          status: safetyCase.status,
          statusColor: getStatusColor(safetyCase.status),
          type: reportType,
          module: 'Safety',
          moduleIcon: 'AlertTriangle',
          moduleColor: 'text-red-400',
          relevanceScore: 75,
          metadata: { 
            product: productName,
            seriousness: seriousness,
            country: country
          },
          path: `/safety/${safetyCase.id}`,
        });
      });
    }

    // TMF Documents
    if (tmfDocs) {
      tmfDocs.forEach(doc => {
        results.push({
          id: `tmf-${doc.id}`,
          category: 'tmf',
          title: doc.title || doc.name || `TMF Document ${doc.id}`,
          subtitle: `${doc.zone || 'Zone'} • ${doc.artifact || 'Artifact'}`,
          status: doc.status,
          statusColor: getStatusColor(doc.status || 'draft'),
          type: doc.artifact,
          module: 'TMF',
          moduleIcon: 'FolderOpen',
          moduleColor: 'text-teal-400',
          relevanceScore: 70,
          metadata: { 
            zone: doc.zone,
            study: doc.study 
          },
          path: `/tmf/${doc.id}`,
        });
      });
    }

    // QMS Documents & CAPAs
    if (qmsDocs) {
      qmsDocs.forEach(doc => {
        results.push({
          id: `qms-doc-${doc.id}`,
          category: 'qms',
          title: doc.title || `QMS Document ${doc.id}`,
          subtitle: `${doc.documentNumber || doc.id} • ${doc.documentType || 'Document'}`,
          status: doc.status,
          statusColor: getStatusColor(doc.status || 'draft'),
          type: doc.documentType || 'SOP',
          module: 'QMS',
          moduleIcon: 'Shield',
          moduleColor: 'text-indigo-400',
          relevanceScore: 72,
          metadata: { 
            department: doc.department,
            effectiveDate: doc.effectiveDate 
          },
          path: `/qms/${doc.id}`,
        });
      });
    }

    if (capas) {
      capas.forEach(capa => {
        results.push({
          id: `qms-capa-${capa.id}`,
          category: 'qms',
          title: `CAPA ${capa.capaNumber || capa.id}: ${capa.title || capa.description?.substring(0, 50) || 'CAPA'}`,
          subtitle: `${capa.capaType || 'CAPA'} • Due: ${capa.targetCompletionDate || 'TBD'}`,
          status: capa.status,
          statusColor: getStatusColor(capa.status || 'open'),
          type: 'CAPA',
          module: 'QMS',
          moduleIcon: 'Shield',
          moduleColor: 'text-indigo-400',
          relevanceScore: 78,
          metadata: { 
            type: capa.capaType,
            priority: capa.priority 
          },
          path: `/qms/capas/${capa.id}`,
        });
      });
    }

    // CTMS Studies
    if (studies) {
      studies.forEach(study => {
        results.push({
          id: `ctms-${study.id}`,
          category: 'ctms',
          title: study.title || `Study ${study.protocolNumber || study.id}`,
          subtitle: `${study.protocolNumber || study.id} • ${study.phase || 'Phase'}`,
          status: study.status,
          statusColor: getStatusColor(study.status || 'active'),
          type: study.phase,
          module: 'CTMS',
          moduleIcon: 'Microscope',
          moduleColor: 'text-green-400',
          relevanceScore: 88,
          metadata: { 
            phase: study.phase,
            indication: study.indication,
            enrollment: study.enrolledSubjects 
          },
          path: `/ctms/${study.id}`,
        });
      });
    }

    // Submissions
    if (submissions) {
      submissions.forEach(sub => {
        results.push({
          id: `sub-${sub.id}`,
          category: 'submissions',
          title: sub.description || `${sub.sequenceType || 'Submission'} ${sub.applicationId || sub.id}`,
          subtitle: `${sub.region || 'Region'} • Target: ${sub.targetDate || 'TBD'}`,
          status: sub.status,
          statusColor: getStatusColor(sub.status || 'draft'),
          type: sub.sequenceType,
          module: 'Submissions',
          moduleIcon: 'Send',
          moduleColor: 'text-purple-400',
          relevanceScore: 90,
          metadata: { 
            region: sub.region,
            sequence: sub.sequenceNumber,
            applicationId: sub.applicationId 
          },
          path: `/submissions/${sub.id}`,
        });
      });
    }

    // Document Control
    if (controlledDocs) {
      controlledDocs.forEach(doc => {
        results.push({
          id: `doc-${doc.id}`,
          category: 'documents',
          title: doc.title || `Document ${doc.documentId || doc.id}`,
          subtitle: `${doc.documentId || doc.id} • v${doc.version || '1.0'}`,
          status: doc.status,
          statusColor: getStatusColor(doc.status || 'draft'),
          type: doc.category,
          module: 'Document Control',
          moduleIcon: 'FileText',
          moduleColor: 'text-blue-400',
          relevanceScore: 75,
          metadata: { 
            version: doc.version,
            owner: doc.ownerName || doc.ownerId,
            department: doc.ownerDepartment 
          },
          path: `/document-control/${doc.id}`,
        });
      });
    }

    // If no real data, add demo fallback data for a compelling search experience
    if (results.length === 0) {
      results.push(
        // Authoring documents
        {
          id: 'demo-auth-1',
          category: 'authoring',
          title: 'LIG-2847 Clinical Study Report - Phase 3 Efficacy',
          subtitle: 'DOC-2024-0089 • v2.3',
          status: 'In Review',
          statusColor: 'amber',
          type: 'CSR',
          module: 'Authoring',
          moduleIcon: 'Edit3',
          moduleColor: 'text-amber-400',
          relevanceScore: 92,
          metadata: { version: '2.3', author: 'Dr. Sarah Chen', pages: 245 },
          path: '/authoring/doc-001',
        },
        {
          id: 'demo-auth-2',
          category: 'authoring',
          title: 'Nexovant Protocol Amendment 3',
          subtitle: 'DOC-2024-0156 • v1.0',
          status: 'Draft',
          statusColor: 'gray',
          type: 'Protocol',
          module: 'Authoring',
          moduleIcon: 'Edit3',
          moduleColor: 'text-amber-400',
          relevanceScore: 88,
          metadata: { version: '1.0', author: 'Michael Roberts' },
          path: '/authoring/doc-002',
        },
        {
          id: 'demo-auth-3',
          category: 'authoring',
          title: 'Investigator Brochure - Edition 7',
          subtitle: 'DOC-2024-0203 • v7.0',
          status: 'Approved',
          statusColor: 'green',
          type: 'IB',
          module: 'Authoring',
          moduleIcon: 'Edit3',
          moduleColor: 'text-amber-400',
          relevanceScore: 85,
          metadata: { version: '7.0', effectiveDate: '2024-01-15' },
          path: '/authoring/doc-003',
        },
        // HAQs
        {
          id: 'demo-haq-1',
          category: 'haqs',
          title: 'PMDA Request: Hepatotoxicity Signal Assessment',
          subtitle: 'HAQ-2024-0089 • Due: Feb 15, 2024',
          status: 'Open',
          statusColor: 'amber',
          type: 'Safety',
          module: 'HAQ',
          moduleIcon: 'MessageSquare',
          moduleColor: 'text-orange-400',
          relevanceScore: 95,
          metadata: { authority: 'PMDA', priority: 'High', assignee: 'Dr. Emily Watson' },
          path: '/haq/haq-001',
        },
        {
          id: 'demo-haq-2',
          category: 'haqs',
          title: 'FDA CMC Question - Stability Data Extension',
          subtitle: 'HAQ-2024-0142 • Due: Jan 30, 2024',
          status: 'In Progress',
          statusColor: 'blue',
          type: 'CMC',
          module: 'HAQ',
          moduleIcon: 'MessageSquare',
          moduleColor: 'text-orange-400',
          relevanceScore: 90,
          metadata: { authority: 'FDA', discipline: 'CMC' },
          path: '/haq/haq-002',
        },
        // Safety
        {
          id: 'demo-safety-1',
          category: 'safety',
          title: 'ICSR-2024-00892 - Serious Hepatic Event',
          subtitle: 'E2B Pending • Nexovant • Japan',
          status: 'Pending Review',
          statusColor: 'amber',
          type: 'ICSR',
          module: 'Safety',
          moduleIcon: 'AlertTriangle',
          moduleColor: 'text-red-400',
          relevanceScore: 88,
          metadata: { product: 'Nexovant', seriousness: 'Serious', country: 'Japan' },
          path: '/safety/case-001',
        },
        {
          id: 'demo-safety-2',
          category: 'safety',
          title: 'Signal Detection - Elevated ALT Pattern',
          subtitle: 'Monthly Analysis • 3 cases identified',
          status: 'Under Investigation',
          statusColor: 'red',
          type: 'Signal',
          module: 'Safety',
          moduleIcon: 'AlertTriangle',
          moduleColor: 'text-red-400',
          relevanceScore: 92,
          metadata: { caseCount: 3, product: 'Nexovant' },
          path: '/safety/signal-001',
        },
        // Submissions
        {
          id: 'demo-sub-1',
          category: 'submissions',
          title: 'NDA 215847 - Nexovant Original Submission',
          subtitle: 'FDA • Target: Mar 15, 2024',
          status: 'On Track',
          statusColor: 'green',
          type: 'NDA',
          module: 'Submissions',
          moduleIcon: 'Send',
          moduleColor: 'text-purple-400',
          relevanceScore: 95,
          metadata: { region: 'FDA', sequence: '0000', product: 'Nexovant' },
          path: '/submissions/sub-001',
        },
        {
          id: 'demo-sub-2',
          category: 'submissions',
          title: 'MAA - Cardiozen European Filing',
          subtitle: 'EMA • Target: Apr 30, 2024',
          status: 'At Risk',
          statusColor: 'amber',
          type: 'MAA',
          module: 'Submissions',
          moduleIcon: 'Send',
          moduleColor: 'text-purple-400',
          relevanceScore: 85,
          metadata: { region: 'EMA', product: 'Cardiozen' },
          path: '/submissions/sub-002',
        },
        // CTMS
        {
          id: 'demo-ctms-1',
          category: 'ctms',
          title: 'NEXO-301 - Phase 3 Pivotal Efficacy Trial',
          subtitle: '312/450 enrolled • 32 sites',
          status: 'Enrolling',
          statusColor: 'blue',
          type: 'Phase 3',
          module: 'CTMS',
          moduleIcon: 'Microscope',
          moduleColor: 'text-green-400',
          relevanceScore: 90,
          metadata: { enrollment: 312, target: 450, sites: 32 },
          path: '/ctms/study-001',
        },
        // TMF
        {
          id: 'demo-tmf-1',
          category: 'tmf',
          title: 'Trial Master File - NEXO-301',
          subtitle: 'Zone 8 • Essential Documents',
          status: '94% Complete',
          statusColor: 'green',
          type: 'Essential',
          module: 'TMF',
          moduleIcon: 'FolderOpen',
          moduleColor: 'text-teal-400',
          relevanceScore: 82,
          metadata: { zone: 'Zone 8', completeness: 94 },
          path: '/tmf/tmf-001',
        },
        // QMS
        {
          id: 'demo-qms-1',
          category: 'qms',
          title: 'SOP-QA-001 - Document Control Procedure',
          subtitle: 'DOC-QMS-0001 • v3.0',
          status: 'Effective',
          statusColor: 'green',
          type: 'SOP',
          module: 'QMS',
          moduleIcon: 'Shield',
          moduleColor: 'text-indigo-400',
          relevanceScore: 78,
          metadata: { department: 'Quality Assurance', effectiveDate: '2024-01-01' },
          path: '/qms/sop-001',
        },
        {
          id: 'demo-qms-2',
          category: 'qms',
          title: 'CAPA-2024-0023 - Batch Release Deviation',
          subtitle: 'Manufacturing • Due: Feb 28, 2024',
          status: 'Open',
          statusColor: 'amber',
          type: 'CAPA',
          module: 'QMS',
          moduleIcon: 'Shield',
          moduleColor: 'text-indigo-400',
          relevanceScore: 85,
          metadata: { type: 'Corrective', priority: 'High' },
          path: '/qms/capa-001',
        },
        // Document Control
        {
          id: 'demo-doc-1',
          category: 'documents',
          title: 'US Prescribing Information - Nexovant',
          subtitle: 'DOC-2024-00067 • v1.2',
          status: 'Effective',
          statusColor: 'green',
          type: 'Label',
          module: 'Document Control',
          moduleIcon: 'FileText',
          moduleColor: 'text-blue-400',
          relevanceScore: 88,
          metadata: { version: '1.2', effectiveDate: '2024-01-15' },
          path: '/document-control/doc-001',
        },
      );
    }

    return results;
  }, [authoringDocs, haqs, safetyCases, tmfDocs, qmsDocs, capas, studies, submissions, controlledDocs]);

  // Search function
  const search = useCallback((
    query: string,
    filters?: Partial<SearchFilter>
  ): SearchResult[] => {
    if (!query.trim() && (!filters?.categories?.length)) {
      return [];
    }

    const normalizedQuery = query.toLowerCase().trim();

    return searchIndex
      .filter(item => {
        // Category filter
        if (filters?.categories?.length && !filters.categories.includes(item.category)) {
          return false;
        }

        // Status filter
        if (filters?.statuses?.length) {
          const normalizedStatus = item.status?.toLowerCase().replace(/\s+/g, '-') || '';
          if (!filters.statuses.some(s => normalizedStatus.includes(s.toLowerCase()))) {
            return false;
          }
        }

        // Text search
        if (normalizedQuery) {
          const searchableText = [
            item.title,
            item.subtitle,
            item.description,
            item.type,
            item.module,
            ...Object.values(item.metadata || {}).map(v => String(v)),
          ].filter(Boolean).join(' ').toLowerCase();

          if (!searchableText.includes(normalizedQuery)) {
            return false;
          }
        }

        return true;
      })
      .map(item => ({
        ...item,
        relevanceScore: calculateRelevance(query, item),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 50); // Limit results
  }, [searchIndex]);

  // Get suggestions (top items per category)
  const getSuggestions = useCallback((limit = 3): Record<SearchCategory, SearchResult[]> => {
    const suggestions: Record<SearchCategory, SearchResult[]> = {
      documents: [],
      authoring: [],
      submissions: [],
      haqs: [],
      safety: [],
      tmf: [],
      qms: [],
      ctms: [],
      products: [],
    };

    searchIndex.forEach(item => {
      if (suggestions[item.category].length < limit) {
        suggestions[item.category].push(item);
      }
    });

    return suggestions;
  }, [searchIndex]);

  return {
    search,
    searchIndex,
    getSuggestions,
    totalItems: searchIndex.length,
    categoryConfig: CATEGORY_CONFIG,
  };
}

export default useCrossModuleSearch;
