

/**
 * Document Tree Store
 * 
 * Provides hierarchical navigation of documents across products, submissions,
 * and eCTD modules. Supports infinite products/studies/submissions through
 * lazy loading and virtualization-ready data structures.
 */

import { create } from 'zustand';
import { DocumentTreeNode } from '@/types/core';

// ============================================================================
// TYPES
// ============================================================================

export interface TreeExpansionState {
  [nodeId: string]: boolean;
}

export interface TreeSelectionState {
  selectedId: string | null;
  selectedPath: string[];
}

export interface DocumentTreeFilters {
  search: string;
  fileTypes: string[];
  statuses: string[];
  modules: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// STORE INTERFACE
// ============================================================================

interface DocumentTreeState {
  // Tree data
  rootNodes: DocumentTreeNode[];
  nodeMap: Record<string, DocumentTreeNode>;
  
  // State
  expansionState: TreeExpansionState;
  selection: TreeSelectionState;
  filters: DocumentTreeFilters;
  isLoading: boolean;
  loadingNodeId: string | null;
  
  // Pagination for large lists
  pagination: {
    pageSize: number;
    loadedPages: Record<string, number>; // nodeId -> pages loaded
  };
  
  // Actions
  initializeTree: (nodes: DocumentTreeNode[]) => void;
  loadChildren: (nodeId: string) => Promise<void>;
  toggleNode: (nodeId: string) => void;
  expandPath: (path: string[]) => void;
  collapseAll: () => void;
  expandAll: (maxDepth?: number) => void;
  selectNode: (nodeId: string | null) => void;
  setFilters: (filters: Partial<DocumentTreeFilters>) => void;
  clearFilters: () => void;
  
  // Computed
  getNode: (nodeId: string) => DocumentTreeNode | undefined;
  getChildren: (nodeId: string) => DocumentTreeNode[];
  getAncestors: (nodeId: string) => DocumentTreeNode[];
  getFilteredNodes: () => DocumentTreeNode[];
  getBreadcrumb: (nodeId: string) => { id: string; name: string }[];
  searchNodes: (query: string) => DocumentTreeNode[];
}

// ============================================================================
// DEMO DATA GENERATOR
// ============================================================================

function generateDemoTreeData(): DocumentTreeNode[] {
  const products: DocumentTreeNode[] = [
    {
      id: 'prod-nexavir',
      name: 'Nexavir (ABC-123)',
      type: 'folder',
      parentId: null,
      path: 'nexavir',
      metadata: { productId: 'nexavir' },
      children: []
    },
    {
      id: 'prod-cardiozen',
      name: 'CardioZen (XYZ-456)',
      type: 'folder',
      parentId: null,
      path: 'cardiozen',
      metadata: { productId: 'cardiozen' },
      children: []
    },
    {
      id: 'prod-neuromax',
      name: 'NeuroMax (NMX-789)',
      type: 'folder',
      parentId: null,
      path: 'neuromax',
      metadata: { productId: 'neuromax' },
      children: []
    }
  ];

  // Add submissions for Nexavir
  const nexavirSubmissions: DocumentTreeNode[] = [
    {
      id: 'sub-nexavir-ind',
      name: 'IND 123456',
      type: 'folder',
      parentId: 'prod-nexavir',
      path: 'nexavir/ind-123456',
      metadata: { productId: 'nexavir', submissionId: 'ind-123456' },
      children: []
    },
    {
      id: 'sub-nexavir-nda',
      name: 'NDA 214567 (Original)',
      type: 'folder',
      parentId: 'prod-nexavir',
      path: 'nexavir/nda-214567',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567' },
      children: []
    },
    {
      id: 'sub-nexavir-snda',
      name: 'sNDA 214567-S001',
      type: 'folder',
      parentId: 'prod-nexavir',
      path: 'nexavir/snda-214567-s001',
      metadata: { productId: 'nexavir', submissionId: 'snda-214567-s001' },
      children: []
    }
  ];
  products[0].children = nexavirSubmissions;

  // Add eCTD modules for NDA
  const ndaModules: DocumentTreeNode[] = [
    {
      id: 'mod-nda-m1',
      name: 'Module 1 - Administrative',
      type: 'folder',
      parentId: 'sub-nexavir-nda',
      path: 'nexavir/nda-214567/m1',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm1' },
      children: []
    },
    {
      id: 'mod-nda-m2',
      name: 'Module 2 - CTD Summaries',
      type: 'folder',
      parentId: 'sub-nexavir-nda',
      path: 'nexavir/nda-214567/m2',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2' },
      children: []
    },
    {
      id: 'mod-nda-m3',
      name: 'Module 3 - Quality',
      type: 'folder',
      parentId: 'sub-nexavir-nda',
      path: 'nexavir/nda-214567/m3',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm3' },
      children: []
    },
    {
      id: 'mod-nda-m4',
      name: 'Module 4 - Nonclinical',
      type: 'folder',
      parentId: 'sub-nexavir-nda',
      path: 'nexavir/nda-214567/m4',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm4' },
      children: []
    },
    {
      id: 'mod-nda-m5',
      name: 'Module 5 - Clinical',
      type: 'folder',
      parentId: 'sub-nexavir-nda',
      path: 'nexavir/nda-214567/m5',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm5' },
      children: []
    }
  ];
  nexavirSubmissions[1].children = ndaModules;

  // Add Module 2 sections
  const m2Sections: DocumentTreeNode[] = [
    {
      id: 'sec-m2-toc',
      name: '2.1 CTD Table of Contents',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.1',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.1' },
      children: []
    },
    {
      id: 'sec-m2-intro',
      name: '2.2 CTD Introduction',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.2',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.2' },
      children: []
    },
    {
      id: 'sec-m2-quality',
      name: '2.3 Quality Overall Summary',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.3',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.3' },
      children: []
    },
    {
      id: 'sec-m2-nonclin',
      name: '2.4 Nonclinical Overview',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.4',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.4' },
      children: []
    },
    {
      id: 'sec-m2-clin-overview',
      name: '2.5 Clinical Overview',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.5',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.5' },
      children: []
    },
    {
      id: 'sec-m2-nonclin-sum',
      name: '2.6 Nonclinical Written & Tabulated Summaries',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.6',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.6' },
      children: []
    },
    {
      id: 'sec-m2-clin-sum',
      name: '2.7 Clinical Summary',
      type: 'folder',
      parentId: 'mod-nda-m2',
      path: 'nexavir/nda-214567/m2/2.7',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7' },
      children: []
    }
  ];
  ndaModules[1].children = m2Sections;

  // Add documents to Clinical Overview (2.5)
  const clinOverviewDocs: DocumentTreeNode[] = [
    {
      id: 'doc-clin-overview-v3',
      name: 'clinical-overview-v3.pdf',
      type: 'document',
      parentId: 'sec-m2-clin-overview',
      path: 'nexavir/nda-214567/m2/2.5/clinical-overview-v3.pdf',
      metadata: {
        productId: 'nexavir',
        submissionId: 'nda-214567',
        module: 'm2',
        section: '2.5',
        documentId: 'doc-clin-overview',
        version: '3.0',
        status: 'Approved',
        fileType: 'pdf',
        fileSize: 2450000,
        lastModified: '2024-11-15T14:30:00Z'
      }
    },
    {
      id: 'doc-clin-overview-v2',
      name: 'clinical-overview-v2.pdf (superseded)',
      type: 'version',
      parentId: 'sec-m2-clin-overview',
      path: 'nexavir/nda-214567/m2/2.5/clinical-overview-v2.pdf',
      metadata: {
        productId: 'nexavir',
        submissionId: 'nda-214567',
        module: 'm2',
        section: '2.5',
        documentId: 'doc-clin-overview',
        version: '2.0',
        status: 'Superseded',
        fileType: 'pdf',
        fileSize: 2380000,
        lastModified: '2024-10-20T09:15:00Z'
      }
    },
    {
      id: 'doc-clin-overview-v1',
      name: 'clinical-overview-v1.pdf (superseded)',
      type: 'version',
      parentId: 'sec-m2-clin-overview',
      path: 'nexavir/nda-214567/m2/2.5/clinical-overview-v1.pdf',
      metadata: {
        productId: 'nexavir',
        submissionId: 'nda-214567',
        module: 'm2',
        section: '2.5',
        documentId: 'doc-clin-overview',
        version: '1.0',
        status: 'Superseded',
        fileType: 'pdf',
        fileSize: 2100000,
        lastModified: '2024-08-05T11:00:00Z'
      }
    }
  ];
  m2Sections[4].children = clinOverviewDocs;

  // Add Clinical Summary subsections (2.7)
  const clinSumSections: DocumentTreeNode[] = [
    {
      id: 'sec-m2-7-1',
      name: '2.7.1 Summary of Biopharmaceutic Studies',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.1',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.1' },
      children: [
        {
          id: 'doc-biopharm-sum',
          name: 'biopharmaceutic-summary.pdf',
          type: 'document',
          parentId: 'sec-m2-7-1',
          path: 'nexavir/nda-214567/m2/2.7/2.7.1/biopharmaceutic-summary.pdf',
          metadata: {
            productId: 'nexavir',
            submissionId: 'nda-214567',
            module: 'm2',
            section: '2.7.1',
            documentId: 'doc-biopharm-sum',
            version: '1.0',
            status: 'Approved',
            fileType: 'pdf',
            fileSize: 890000,
            lastModified: '2024-11-10T10:00:00Z'
          }
        }
      ]
    },
    {
      id: 'sec-m2-7-2',
      name: '2.7.2 Summary of Clinical Pharmacology Studies',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.2',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.2' },
      children: []
    },
    {
      id: 'sec-m2-7-3',
      name: '2.7.3 Summary of Clinical Efficacy',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.3',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.3' },
      children: []
    },
    {
      id: 'sec-m2-7-4',
      name: '2.7.4 Summary of Clinical Safety',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.4',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.4' },
      children: []
    },
    {
      id: 'sec-m2-7-5',
      name: '2.7.5 References',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.5',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.5' },
      children: []
    },
    {
      id: 'sec-m2-7-6',
      name: '2.7.6 Synopses of Individual Studies',
      type: 'folder',
      parentId: 'sec-m2-clin-sum',
      path: 'nexavir/nda-214567/m2/2.7/2.7.6',
      metadata: { productId: 'nexavir', submissionId: 'nda-214567', module: 'm2', section: '2.7.6' },
      children: []
    }
  ];
  m2Sections[6].children = clinSumSections;

  // Add submissions for CardioZen
  const cardiozenSubmissions: DocumentTreeNode[] = [
    {
      id: 'sub-cardiozen-ind',
      name: 'IND 789012',
      type: 'folder',
      parentId: 'prod-cardiozen',
      path: 'cardiozen/ind-789012',
      metadata: { productId: 'cardiozen', submissionId: 'ind-789012' },
      children: []
    },
    {
      id: 'sub-cardiozen-maa',
      name: 'MAA EMEA/H/C/005678',
      type: 'folder',
      parentId: 'prod-cardiozen',
      path: 'cardiozen/maa-005678',
      metadata: { productId: 'cardiozen', submissionId: 'maa-005678' },
      children: []
    }
  ];
  products[1].children = cardiozenSubmissions;

  // Add submissions for NeuroMax
  const neuromaxSubmissions: DocumentTreeNode[] = [
    {
      id: 'sub-neuromax-ind',
      name: 'IND 345678',
      type: 'folder',
      parentId: 'prod-neuromax',
      path: 'neuromax/ind-345678',
      metadata: { productId: 'neuromax', submissionId: 'ind-345678' },
      children: []
    }
  ];
  products[2].children = neuromaxSubmissions;

  return products;
}

// ============================================================================
// BUILD NODE MAP
// ============================================================================

function buildNodeMap(nodes: DocumentTreeNode[]): Record<string, DocumentTreeNode> {
  const map: Record<string, DocumentTreeNode> = {};
  
  function traverse(node: DocumentTreeNode) {
    map[node.id] = node;
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  nodes.forEach(traverse);
  return map;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDocumentTreeStore = create<DocumentTreeState>((set, get) => ({
  rootNodes: [],
  nodeMap: {},
  expansionState: {},
  selection: {
    selectedId: null,
    selectedPath: []
  },
  filters: {
    search: '',
    fileTypes: [],
    statuses: [],
    modules: []
  },
  isLoading: false,
  loadingNodeId: null,
  pagination: {
    pageSize: 50,
    loadedPages: {}
  },

  initializeTree: (nodes) => {
    const nodeMap = buildNodeMap(nodes);
    set({ rootNodes: nodes, nodeMap });
  },

  loadChildren: async (nodeId) => {
    set({ loadingNodeId: nodeId });
    
    // Simulate async load (in real impl, would fetch from API)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // For demo, children are already populated
    set({ loadingNodeId: null });
  },

  toggleNode: (nodeId) => {
    set(state => ({
      expansionState: {
        ...state.expansionState,
        [nodeId]: !state.expansionState[nodeId]
      }
    }));
  },

  expandPath: (path) => {
    const newExpansion: TreeExpansionState = {};
    path.forEach(nodeId => {
      newExpansion[nodeId] = true;
    });
    set(state => ({
      expansionState: {
        ...state.expansionState,
        ...newExpansion
      }
    }));
  },

  collapseAll: () => {
    set({ expansionState: {} });
  },

  expandAll: (maxDepth = 3) => {
    const { nodeMap } = get();
    const newExpansion: TreeExpansionState = {};
    
    function expandNode(nodeId: string, depth: number) {
      if (depth >= maxDepth) return;
      
      const node = nodeMap[nodeId];
      if (node && node.type === 'folder') {
        newExpansion[nodeId] = true;
        if (node.children) {
          node.children.forEach(child => expandNode(child.id, depth + 1));
        }
      }
    }
    
    Object.keys(nodeMap).forEach(id => {
      const node = nodeMap[id];
      if (node.parentId === null) {
        expandNode(id, 0);
      }
    });
    
    set({ expansionState: newExpansion });
  },

  selectNode: (nodeId) => {
    const { nodeMap } = get();
    
    if (!nodeId) {
      set({ selection: { selectedId: null, selectedPath: [] } });
      return;
    }
    
    // Build path to selected node
    const path: string[] = [];
    let current: DocumentTreeNode | undefined = nodeMap[nodeId];
    
    while (current) {
      path.unshift(current.id);
      current = current.parentId ? nodeMap[current.parentId] : undefined;
    }
    
    set({ selection: { selectedId: nodeId, selectedPath: path } });
  },

  setFilters: (filters) => {
    set(state => ({
      filters: { ...state.filters, ...filters }
    }));
  },

  clearFilters: () => {
    set({
      filters: {
        search: '',
        fileTypes: [],
        statuses: [],
        modules: []
      }
    });
  },

  getNode: (nodeId) => {
    return get().nodeMap[nodeId];
  },

  getChildren: (nodeId) => {
    const node = get().nodeMap[nodeId];
    return node?.children || [];
  },

  getAncestors: (nodeId) => {
    const { nodeMap } = get();
    const ancestors: DocumentTreeNode[] = [];
    let current = nodeMap[nodeId];
    
    while (current?.parentId) {
      current = nodeMap[current.parentId];
      if (current) {
        ancestors.unshift(current);
      }
    }
    
    return ancestors;
  },

  getFilteredNodes: () => {
    const { rootNodes, filters } = get();
    
    if (!filters.search && filters.fileTypes.length === 0 && 
        filters.statuses.length === 0 && filters.modules.length === 0) {
      return rootNodes;
    }
    
    // Implement filtering logic
    function filterNode(node: DocumentTreeNode): DocumentTreeNode | null {
      const matchesSearch = !filters.search || 
        node.name.toLowerCase().includes(filters.search.toLowerCase());
      
      const matchesFileType = filters.fileTypes.length === 0 ||
        (node.metadata?.fileType && filters.fileTypes.includes(node.metadata.fileType));
      
      const matchesStatus = filters.statuses.length === 0 ||
        (node.metadata?.status && filters.statuses.includes(node.metadata.status));
      
      const matchesModule = filters.modules.length === 0 ||
        (node.metadata?.module && filters.modules.includes(node.metadata.module));
      
      if (node.type === 'folder') {
        const filteredChildren = node.children
          ?.map(filterNode)
          .filter((n): n is DocumentTreeNode => n !== null);
        
        if (filteredChildren && filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        
        if (matchesSearch) {
          return { ...node, children: [] };
        }
        
        return null;
      }
      
      if (matchesSearch && matchesFileType && matchesStatus && matchesModule) {
        return node;
      }
      
      return null;
    }
    
    return rootNodes
      .map(filterNode)
      .filter((n): n is DocumentTreeNode => n !== null);
  },

  getBreadcrumb: (nodeId) => {
    const { nodeMap } = get();
    const breadcrumb: { id: string; name: string }[] = [];
    let current: DocumentTreeNode | undefined = nodeMap[nodeId];
    
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      current = current.parentId ? nodeMap[current.parentId] : undefined;
    }
    
    return breadcrumb;
  },

  searchNodes: (query) => {
    const { nodeMap } = get();
    const lowerQuery = query.toLowerCase();
    
    return Object.values(nodeMap).filter(node =>
      node.name.toLowerCase().includes(lowerQuery) ||
      node.path.toLowerCase().includes(lowerQuery)
    );
  }
}));

// Initialize with demo data
export function initializeDemoDocumentTree() {
  const store = useDocumentTreeStore.getState();
  const demoData = generateDemoTreeData();
  store.initializeTree(demoData);
}

// Export types
export type { DocumentTreeState };
