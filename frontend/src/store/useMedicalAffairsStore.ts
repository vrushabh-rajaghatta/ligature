


import { create } from 'zustand';
import { useMemo } from 'react';
import {
  MedicalInquiry,
  StandardResponse,
  SignalImpact,
  InquiryStatus,
  InquiryType,
  InquiryPriority,
  ResponseStatus,
  medicalInquiries,
  standardResponses,
  signalImpacts,
  getInquiryStatistics,
  getResponseLibraryStatistics,
  getSignalAlertStatistics,
} from '@/data/medical-affairs-data';

// ============================================================================
// MEDICAL AFFAIRS STORE - v0.5.0
// Manages Medical Information Center: Inquiries, Response Library, Signal Integration
// ============================================================================

export type MedicalAffairsView = 
  | 'dashboard'
  | 'kol-management'
  | 'msl-activities'
  | 'publications'
  | 'advisory-boards'
  | 'congresses'
  | 'medical-info'
  | 'grants-iir';

export type MedicalInfoTab = 'inquiries' | 'responses' | 'signals' | 'analytics';

interface MedicalAffairsState {
  // View state
  activeView: MedicalAffairsView;
  activeMedInfoTab: MedicalInfoTab;
  selectedInquiryId: string | null;
  selectedResponseId: string | null;
  
  // Filter state
  inquiryStatusFilter: InquiryStatus | 'all';
  inquiryTypeFilter: InquiryType | 'all';
  inquiryPriorityFilter: InquiryPriority | 'all';
  responseStatusFilter: ResponseStatus | 'all';
  productFilter: string | 'all';
  searchQuery: string;
  
  // Data
  inquiries: MedicalInquiry[];
  responses: StandardResponse[];
  signalImpacts: SignalImpact[];
  
  // Actions - View
  setActiveView: (view: MedicalAffairsView) => void;
  setActiveMedInfoTab: (tab: MedicalInfoTab) => void;
  setSelectedInquiryId: (id: string | null) => void;
  setSelectedResponseId: (id: string | null) => void;
  
  // Actions - Filters
  setInquiryStatusFilter: (status: InquiryStatus | 'all') => void;
  setInquiryTypeFilter: (type: InquiryType | 'all') => void;
  setInquiryPriorityFilter: (priority: InquiryPriority | 'all') => void;
  setResponseStatusFilter: (status: ResponseStatus | 'all') => void;
  setProductFilter: (productId: string | 'all') => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // Actions - Inquiries
  updateInquiryStatus: (inquiryId: string, status: InquiryStatus) => void;
  assignInquiry: (inquiryId: string, assignee: string) => void;
  
  // Actions - Responses
  updateResponseStatus: (responseId: string, status: ResponseStatus) => void;
  markResponseReviewed: (responseId: string, reviewedBy: string) => void;
  
  // Computed getters
  getFilteredInquiries: () => MedicalInquiry[];
  getFilteredResponses: () => StandardResponse[];
  getInquiryById: (id: string) => MedicalInquiry | undefined;
  getResponseById: (id: string) => StandardResponse | undefined;
  getResponsesForSignal: (signalId: string) => StandardResponse[];
  getInquiriesAffectedBySignal: (signalId: string) => MedicalInquiry[];
}

export const useMedicalAffairsStore = create<MedicalAffairsState>((set, get) => ({
  // Initial view state
  activeView: 'medical-info',
  activeMedInfoTab: 'inquiries',
  selectedInquiryId: null,
  selectedResponseId: null,
  
  // Initial filter state
  inquiryStatusFilter: 'all',
  inquiryTypeFilter: 'all',
  inquiryPriorityFilter: 'all',
  responseStatusFilter: 'all',
  productFilter: 'all',
  searchQuery: '',
  
  // Initial data - pre-loaded with demo data
  inquiries: medicalInquiries,
  responses: standardResponses,
  signalImpacts: signalImpacts,
  
  // View actions
  setActiveView: (view) => set({ activeView: view }),
  setActiveMedInfoTab: (tab) => set({ activeMedInfoTab: tab }),
  setSelectedInquiryId: (id) => set({ selectedInquiryId: id }),
  setSelectedResponseId: (id) => set({ selectedResponseId: id }),
  
  // Filter actions
  setInquiryStatusFilter: (status) => set({ inquiryStatusFilter: status }),
  setInquiryTypeFilter: (type) => set({ inquiryTypeFilter: type }),
  setInquiryPriorityFilter: (priority) => set({ inquiryPriorityFilter: priority }),
  setResponseStatusFilter: (status) => set({ responseStatusFilter: status }),
  setProductFilter: (productId) => set({ productFilter: productId }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearFilters: () => set({
    inquiryStatusFilter: 'all',
    inquiryTypeFilter: 'all',
    inquiryPriorityFilter: 'all',
    responseStatusFilter: 'all',
    productFilter: 'all',
    searchQuery: '',
  }),
  
  // Inquiry actions
  updateInquiryStatus: (inquiryId, status) => {
    set((state) => ({
      inquiries: state.inquiries.map((i) =>
        i.id === inquiryId
          ? {
              ...i,
              status,
              respondedDate: status === 'responded' ? new Date().toISOString() : i.respondedDate,
            }
          : i
      ),
    }));
  },
  
  assignInquiry: (inquiryId, assignee) => {
    set((state) => ({
      inquiries: state.inquiries.map((i) =>
        i.id === inquiryId
          ? { ...i, assignedTo: assignee, status: i.status === 'open' ? 'in-progress' : i.status }
          : i
      ),
    }));
  },
  
  // Response actions
  updateResponseStatus: (responseId, status) => {
    set((state) => ({
      responses: state.responses.map((r) =>
        r.id === responseId ? { ...r, status } : r
      ),
    }));
  },
  
  markResponseReviewed: (responseId, reviewedBy) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      responses: state.responses.map((r) =>
        r.id === responseId
          ? {
              ...r,
              lastReviewedDate: timestamp,
              lastReviewedBy: reviewedBy,
              requiresReview: false,
              reviewReason: undefined,
            }
          : r
      ),
    }));
  },
  
  // Computed getters
  getFilteredInquiries: () => {
    const state = get();
    let filtered = state.inquiries;
    
    if (state.inquiryStatusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === state.inquiryStatusFilter);
    }
    if (state.inquiryTypeFilter !== 'all') {
      filtered = filtered.filter((i) => i.type === state.inquiryTypeFilter);
    }
    if (state.inquiryPriorityFilter !== 'all') {
      filtered = filtered.filter((i) => i.priority === state.inquiryPriorityFilter);
    }
    if (state.productFilter !== 'all') {
      filtered = filtered.filter((i) => i.productId === state.productFilter);
    }
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.inquiryNumber.toLowerCase().includes(query) ||
          i.topic.toLowerCase().includes(query) ||
          i.summary.toLowerCase().includes(query) ||
          i.inquirerName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  },
  
  getFilteredResponses: () => {
    const state = get();
    let filtered = state.responses;
    
    if (state.responseStatusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === state.responseStatusFilter);
    }
    if (state.productFilter !== 'all') {
      filtered = filtered.filter((r) => r.productId === state.productFilter);
    }
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.responseCode.toLowerCase().includes(query) ||
          r.title.toLowerCase().includes(query) ||
          r.topic.toLowerCase().includes(query) ||
          r.summary.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  },
  
  getInquiryById: (id) => {
    return get().inquiries.find((i) => i.id === id);
  },
  
  getResponseById: (id) => {
    return get().responses.find((r) => r.id === id);
  },
  
  getResponsesForSignal: (signalId) => {
    return get().responses.filter((r) => r.linkedSignalIds.includes(signalId));
  },
  
  getInquiriesAffectedBySignal: (signalId) => {
    const state = get();
    const impact = state.signalImpacts.find((s) => s.signalId === signalId);
    if (!impact) return [];
    return state.inquiries.filter((i) => impact.affectedInquiries.includes(i.id));
  },
}));

// ============================================================================
// SELECTOR HOOKS (stable references to prevent re-renders)
// ============================================================================

export const useFilteredInquiries = () => {
  const inquiries = useMedicalAffairsStore((state) => state.inquiries);
  const statusFilter = useMedicalAffairsStore((state) => state.inquiryStatusFilter);
  const typeFilter = useMedicalAffairsStore((state) => state.inquiryTypeFilter);
  const priorityFilter = useMedicalAffairsStore((state) => state.inquiryPriorityFilter);
  const productFilter = useMedicalAffairsStore((state) => state.productFilter);
  const searchQuery = useMedicalAffairsStore((state) => state.searchQuery);
  
  return useMemo(() => {
    let filtered = inquiries;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((i) => i.status === statusFilter);
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter((i) => i.type === typeFilter);
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((i) => i.priority === priorityFilter);
    }
    if (productFilter !== 'all') {
      filtered = filtered.filter((i) => i.productId === productFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.inquiryNumber.toLowerCase().includes(query) ||
          i.topic.toLowerCase().includes(query) ||
          i.summary.toLowerCase().includes(query) ||
          i.inquirerName?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [inquiries, statusFilter, typeFilter, priorityFilter, productFilter, searchQuery]);
};

export const useFilteredResponses = () => {
  const responses = useMedicalAffairsStore((state) => state.responses);
  const statusFilter = useMedicalAffairsStore((state) => state.responseStatusFilter);
  const productFilter = useMedicalAffairsStore((state) => state.productFilter);
  const searchQuery = useMedicalAffairsStore((state) => state.searchQuery);
  
  return useMemo(() => {
    let filtered = responses;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (productFilter !== 'all') {
      filtered = filtered.filter((r) => r.productId === productFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.responseCode.toLowerCase().includes(query) ||
          r.title.toLowerCase().includes(query) ||
          r.topic.toLowerCase().includes(query) ||
          r.summary.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [responses, statusFilter, productFilter, searchQuery]);
};

export const useActiveSignalImpacts = () => {
  const signalImpacts = useMedicalAffairsStore((state) => state.signalImpacts);
  return useMemo(
    () => signalImpacts.filter((s) => s.status === 'under-review' || s.status === 'confirmed'),
    [signalImpacts]
  );
};

export const useResponsesRequiringReview = () => {
  const responses = useMedicalAffairsStore((state) => state.responses);
  return useMemo(() => responses.filter((r) => r.requiresReview), [responses]);
};

export const useInquiryStatistics = () => {
  const inquiries = useMedicalAffairsStore((state) => state.inquiries);
  return useMemo(() => {
    const total = inquiries.length;
    const open = inquiries.filter((i) => i.status === 'open').length;
    const inProgress = inquiries.filter((i) => i.status === 'in-progress').length;
    const pendingReview = inquiries.filter((i) => i.status === 'pending-review').length;
    const responded = inquiries.filter((i) => i.status === 'responded').length;
    const overdue = inquiries.filter((i) => i.isOverdue).length;
    const urgent = inquiries.filter((i) => i.priority === 'urgent').length;
    
    return {
      total,
      open,
      inProgress,
      pendingReview,
      responded,
      overdue,
      urgent,
      avgResponseTimeHours: 18.4, // Mock
      slaCompliance: 96.2,
    };
  }, [inquiries]);
};

export const useResponseLibraryStatistics = () => {
  const responses = useMedicalAffairsStore((state) => state.responses);
  const signalImpacts = useMedicalAffairsStore((state) => state.signalImpacts);
  
  return useMemo(() => {
    const total = responses.length;
    const current = responses.filter((r) => r.status === 'current').length;
    const underReview = responses.filter((r) => r.status === 'under-review').length;
    const requiresReview = responses.filter((r) => r.requiresReview).length;
    const totalUsage = responses.reduce((sum, r) => sum + r.usageCount, 0);
    
    return {
      total,
      current,
      underReview,
      requiresReview,
      totalUsage,
      signalAffected: signalImpacts.reduce((sum, s) => sum + s.affectedResponseCount, 0),
    };
  }, [responses, signalImpacts]);
};
