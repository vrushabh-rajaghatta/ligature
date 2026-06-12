

// ============================================================================
// CreateLinkModal - v173: Full Cross-Module Document Linking
// ============================================================================
// Modal for creating document links between modules (TMF ↔ eCTD, Safety ↔ 
// Clinical, HAQ ↔ Source, QMS ↔ Trial). Provides searchable document selection,
// link type inference, and context capture.
// ============================================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X,
  Link2,
  Search,
  FileText,
  FolderArchive,
  Send,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  FlaskConical,
  BookOpen,
  ChevronRight,
  Check,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  useDocumentLinkStore,
  type LinkableModule,
  type LinkType,
  type DocumentLink,
} from '@/store/useDocumentLinkStore';
import { useTMFStore } from '@/store/useTMFStore';
import { useECTDBuildingStore } from '@/store/useECTDBuildingStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useHAQStore } from '@/store/useHAQStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import type { BadgeColor } from '@/components/ui/Badge';

// ============================================================================
// TYPES
// ============================================================================

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceModule: LinkableModule;
  sourceId: string;
  sourceType: string;
  sourceTitle: string;
  sourceVersion?: string;
  // Optional: Pre-select target module
  suggestedTargetModule?: LinkableModule;
  // Callback after link creation
  onLinkCreated?: (link: DocumentLink) => void;
}

interface LinkableDocument {
  id: string;
  module: LinkableModule;
  type: string;
  title: string;
  version?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODULE_ICONS: Record<LinkableModule, React.ReactNode> = {
  tmf: <FolderArchive className="w-4 h-4" />,
  ectd: <Send className="w-4 h-4" />,
  safety: <AlertTriangle className="w-4 h-4" />,
  haq: <HelpCircle className="w-4 h-4" />,
  qms: <ClipboardList className="w-4 h-4" />,
  ctms: <FlaskConical className="w-4 h-4" />,
  authoring: <BookOpen className="w-4 h-4" />,
  publishing: <FileText className="w-4 h-4" />,
};

const MODULE_LABELS: Record<LinkableModule, string> = {
  tmf: 'Trial Master File',
  ectd: 'eCTD Submission',
  safety: 'Safety/PV',
  haq: 'HAQ Response',
  qms: 'Quality Management',
  ctms: 'Clinical Trials',
  authoring: 'Document Authoring',
  publishing: 'Publishing',
};

const MODULE_COLORS: Record<LinkableModule, BadgeColor> = {
  tmf: 'purple',
  ectd: 'blue',
  safety: 'red',
  haq: 'amber',
  qms: 'teal',
  ctms: 'emerald',
  authoring: 'slate',
  publishing: 'orange',
};

// Define which modules can link to which
const LINKABLE_MODULE_PAIRS: Record<LinkableModule, LinkableModule[]> = {
  tmf: ['ectd', 'authoring', 'publishing'],
  ectd: ['tmf', 'haq', 'authoring'],
  safety: ['ctms', 'haq'],
  haq: ['authoring', 'ectd', 'safety', 'ctms', 'tmf'],
  qms: ['ctms', 'tmf'],
  ctms: ['safety', 'qms', 'tmf'],
  authoring: ['tmf', 'ectd', 'haq'],
  publishing: ['tmf', 'ectd'],
};

// Infer link type from module pair
const LINK_TYPE_MAP: Record<string, LinkType> = {
  'tmf:ectd': 'tmf-to-ectd',
  'ectd:tmf': 'ectd-to-tmf',
  'safety:ctms': 'safety-to-clinical',
  'ctms:safety': 'clinical-to-safety',
  'haq:authoring': 'haq-to-source',
  'haq:ectd': 'haq-to-source',
  'haq:tmf': 'haq-to-source',
  'authoring:haq': 'source-to-haq',
  'qms:ctms': 'qms-to-trial',
  'ctms:qms': 'trial-to-qms',
};

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  'tmf-to-ectd': 'Filed to eCTD Submission',
  'ectd-to-tmf': 'Archived to TMF',
  'safety-to-clinical': 'Safety Signal from Trial',
  'clinical-to-safety': 'Clinical Event to Safety',
  'haq-to-source': 'Response References',
  'source-to-haq': 'Cited by HAQ',
  'qms-to-trial': 'QMS Related to Trial',
  'trial-to-qms': 'Trial Triggered QMS',
  'reference': 'General Reference',
  'supersedes': 'Supersedes',
  'derives-from': 'Derived From',
  'supports': 'Supporting Evidence',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function CreateLinkModal({
  isOpen,
  onClose,
  sourceModule,
  sourceId,
  sourceType,
  sourceTitle,
  sourceVersion,
  suggestedTargetModule,
  onLinkCreated,
}: CreateLinkModalProps) {
  // Store access
  const createLink = useDocumentLinkStore(s => s.createLink);
  
  // TMF data
  const tmfArtifacts = useTMFStore(s => s.artifacts);
  
  // eCTD data (via useECTDBuildingStore)
  const ectdBuilds = useECTDBuildingStore(s => s.builds || {});
  // Documents are embedded within builds - empty object for compatibility
  const ectdDocuments: Record<string, any> = {};
  
  // Safety data
  const safetySignals = usePharmacovigilanceStore(s => s.signals || {});
  const safetyCases = usePharmacovigilanceStore(s => s.cases || {});
  
  // HAQ data
  const haqList = useHAQStore(s => s.haqs || []);
  
  // QMS data
  const qmsDeviations = useQMSStore(s => s.deviations);
  const qmsCAPAs = useQMSStore(s => s.capas);
  
  // CTMS data
  const ctmsStudies = useCTMSStore(s => s.studies);
  const ctmsDeviations = useCTMSStore(s => s.protocolDeviations);
  const ctmsSites = useCTMSStore(s => s.sites);
  
  // Local state
  const [selectedModule, setSelectedModule] = useState<LinkableModule | null>(
    suggestedTargetModule || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [linkDescription, setLinkDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Get available target modules
  const availableModules = useMemo(() => {
    return LINKABLE_MODULE_PAIRS[sourceModule] || [];
  }, [sourceModule]);
  
  // Get documents for selected module
  const availableDocuments = useMemo((): LinkableDocument[] => {
    if (!selectedModule) return [];
    
    const docs: LinkableDocument[] = [];
    
    switch (selectedModule) {
      case 'tmf':
        Object.values(tmfArtifacts).forEach(art => {
          if (art.id !== sourceId) {
            docs.push({
              id: art.id,
              module: 'tmf',
              type: 'tmf-artifact',
              title: art.title,
              version: art.version,
              subtitle: `Zone ${art.zoneId} • ${art.fileName}`,
              icon: <FolderArchive className="w-4 h-4" />,
            });
          }
        });
        break;
        
      case 'ectd':
        // Add eCTD sequence builds
        Object.values(ectdBuilds).forEach(build => {
          docs.push({
            id: build.id,
            module: 'ectd',
            type: 'ectd-sequence',
            title: `Sequence ${build.sequenceNumber || build.id}`,
            subtitle: (build as any).sequenceType || build.status,
            icon: <Send className="w-4 h-4" />,
          });
        });
        // Add eCTD documents/leaves
        Object.values(ectdDocuments).forEach(doc => {
          docs.push({
            id: doc.id,
            module: 'ectd',
            type: 'ectd-leaf',
            title: doc.title || doc.fileName,
            subtitle: doc.ctdSection || doc.moduleId,
            icon: <FileText className="w-4 h-4" />,
          });
        });
        break;
        
      case 'safety':
        // Safety signals
        Object.values(safetySignals).forEach(sig => {
          docs.push({
            id: sig.id,
            module: 'safety',
            type: 'safety-signal',
            title: (sig as any).signalName || (sig as any).name || `Signal ${sig.id}`,
            subtitle: `${sig.status} • ${sig.priority} priority`,
            icon: <AlertTriangle className="w-4 h-4" />,
          });
        });
        // ICSR cases
        Object.values(safetyCases).forEach(cas => {
          docs.push({
            id: cas.id,
            module: 'safety',
            type: 'icsr-case',
            title: cas.caseNumber || `Case ${cas.id}`,
            subtitle: (cas as any).event || (cas as any).description || cas.status,
            icon: <AlertTriangle className="w-4 h-4" />,
          });
        });
        break;
        
      case 'haq':
        // HAQ questions
        haqList.forEach(q => {
          docs.push({
            id: q.id,
            module: 'haq',
            type: 'haq-question',
            title: q.questionNumber || `Q${q.id}`,
            subtitle: (q as any).question?.substring(0, 50) || q.discipline,
            icon: <HelpCircle className="w-4 h-4" />,
          });
        });
        break;
        
      case 'qms':
        // Deviations
        Object.values(qmsDeviations).forEach(dev => {
          docs.push({
            id: dev.id,
            module: 'qms',
            type: 'qms-deviation',
            title: (dev as any).number || dev.title || `DEV-${dev.id}`,
            subtitle: dev.description?.substring(0, 50),
            icon: <ClipboardList className="w-4 h-4" />,
          });
        });
        // CAPAs
        Object.values(qmsCAPAs).forEach(capa => {
          docs.push({
            id: capa.id,
            module: 'qms',
            type: 'qms-capa',
            title: (capa as any).number || capa.title || `CAPA-${capa.id}`,
            subtitle: capa.description?.substring(0, 50),
            icon: <ClipboardList className="w-4 h-4" />,
          });
        });
        break;
        
      case 'ctms':
        // Studies
        Object.values(ctmsStudies).forEach(study => {
          docs.push({
            id: study.id,
            module: 'ctms',
            type: 'ctms-study',
            title: study.protocolNumber || study.title,
            subtitle: `${study.phase} • ${study.status}`,
            icon: <FlaskConical className="w-4 h-4" />,
          });
        });
        // Protocol deviations
        Object.values(ctmsDeviations).forEach(dev => {
          docs.push({
            id: dev.id,
            module: 'ctms',
            type: 'protocol-deviation',
            title: (dev as any).deviationNumber || `PD-${dev.id}`,
            subtitle: dev.description?.substring(0, 50),
            icon: <FlaskConical className="w-4 h-4" />,
          });
        });
        // Sites
        Object.values(ctmsSites).forEach(site => {
          docs.push({
            id: site.id,
            module: 'ctms',
            type: 'clinical-site',
            title: (site as any).siteName || site.siteNumber,
            subtitle: (site as any).piName || site.status,
            icon: <FlaskConical className="w-4 h-4" />,
          });
        });
        break;
        
      case 'authoring':
        // Mock authoring documents for demo
        docs.push({
          id: 'doc-protocol-001',
          module: 'authoring',
          type: 'authored-document',
          title: 'Protocol v2.0',
          subtitle: 'Clinical Protocol',
          icon: <BookOpen className="w-4 h-4" />,
        });
        docs.push({
          id: 'doc-ib-001',
          module: 'authoring',
          type: 'authored-document',
          title: 'Investigator Brochure v5.0',
          subtitle: 'IB Document',
          icon: <BookOpen className="w-4 h-4" />,
        });
        docs.push({
          id: 'doc-csr-001',
          module: 'authoring',
          type: 'authored-document',
          title: 'Clinical Study Report',
          subtitle: 'CSR Draft',
          icon: <BookOpen className="w-4 h-4" />,
        });
        break;
        
      case 'publishing':
        // Mock publishing documents
        docs.push({
          id: 'pub-seq-0001',
          module: 'publishing',
          type: 'publishing-package',
          title: 'Sequence 0001 Package',
          subtitle: 'Initial NDA Submission',
          icon: <FileText className="w-4 h-4" />,
        });
        break;
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return docs.filter(d => 
        d.title.toLowerCase().includes(query) ||
        d.subtitle?.toLowerCase().includes(query)
      );
    }
    
    return docs;
  }, [
    selectedModule, 
    searchQuery, 
    sourceId,
    tmfArtifacts,
    ectdBuilds,
    ectdDocuments,
    safetySignals,
    safetyCases,
    haqList,
    qmsDeviations,
    qmsCAPAs,
    ctmsStudies,
    ctmsDeviations,
    ctmsSites,
  ]);
  
  // Selected document
  const selectedDocument = useMemo(() => {
    if (!selectedDocumentId) return null;
    return availableDocuments.find(d => d.id === selectedDocumentId);
  }, [availableDocuments, selectedDocumentId]);
  
  // Infer link type
  const inferredLinkType = useMemo((): LinkType => {
    if (!selectedModule) return 'reference';
    const key = `${sourceModule}:${selectedModule}`;
    return LINK_TYPE_MAP[key] || 'reference';
  }, [sourceModule, selectedModule]);
  
  // Handle create link
  const handleCreateLink = useCallback(async () => {
    if (!selectedDocument || !selectedModule) return;
    
    setIsCreating(true);
    
    try {
      const link = createLink({
        sourceModule,
        sourceId,
        sourceType,
        sourceTitle,
        sourceVersion,
        targetModule: selectedDocument.module,
        targetId: selectedDocument.id,
        targetType: selectedDocument.type,
        targetTitle: selectedDocument.title,
        targetVersion: selectedDocument.version,
        linkType: inferredLinkType,
        direction: 'forward',
        status: 'active',
        strength: 'strong',
        createdBy: 'current-user',
        autoGenerated: false,
        context: linkDescription ? { description: linkDescription } : undefined,
      });
      
      onLinkCreated?.(link);
      onClose();
    } catch (error) {
      console.error('Failed to create link:', error);
    } finally {
      setIsCreating(false);
    }
  }, [
    selectedDocument,
    selectedModule,
    sourceModule,
    sourceId,
    sourceType,
    sourceTitle,
    sourceVersion,
    inferredLinkType,
    linkDescription,
    createLink,
    onLinkCreated,
    onClose,
  ]);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedModule(suggestedTargetModule || null);
      setSearchQuery('');
      setSelectedDocumentId(null);
      setLinkDescription('');
    }
  }, [isOpen, suggestedTargetModule]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                Create Document Link
              </h3>
              <p className="text-sm text-slate-500">
                Link "{sourceTitle}" to another document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Source Document */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Source Document
            </div>
            <div className="flex items-center gap-2">
              {MODULE_ICONS[sourceModule]}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {sourceTitle}
              </span>
              <Badge color={MODULE_COLORS[sourceModule]} size="sm">
                {MODULE_LABELS[sourceModule]}
              </Badge>
              {sourceVersion && (
                <Badge color="slate" size="sm">v{sourceVersion}</Badge>
              )}
            </div>
          </div>
          
          {/* Target Module Selection */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Link to Module
            </div>
            <div className="flex flex-wrap gap-2">
              {availableModules.map(mod => (
                <button
                  key={mod}
                  onClick={() => {
                    setSelectedModule(mod);
                    setSelectedDocumentId(null);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    selectedModule === mod
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {MODULE_ICONS[mod]}
                  {MODULE_LABELS[mod]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Document Selection */}
          {selectedModule && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${MODULE_LABELS[selectedModule]} documents...`}
                />
              </div>
              
              {/* Document List */}
              <div className="flex-1 overflow-y-auto">
                {availableDocuments.length === 0 ? (
                  <div className="p-8 text-center">
                    <EmptyState
                      icon={<FileText className="w-full h-full" />}
                      title="No Documents Found"
                      description={
                        searchQuery
                          ? `No documents matching "${searchQuery}"`
                          : `No ${MODULE_LABELS[selectedModule]} documents available`
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {availableDocuments.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocumentId(doc.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          selectedDocumentId === doc.id
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          selectedDocumentId === doc.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {doc.icon || <FileText className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            {doc.title}
                          </div>
                          {doc.subtitle && (
                            <div className="text-sm text-slate-500 truncate">
                              {doc.subtitle}
                            </div>
                          )}
                        </div>
                        {doc.version && (
                          <Badge color="slate" size="sm">v{doc.version}</Badge>
                        )}
                        {selectedDocumentId === doc.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* No module selected */}
          {!selectedModule && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">
                  Select a target module to see available documents
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Link Details (when document selected) */}
        {selectedDocument && (
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Badge color="blue" size="sm">
                {LINK_TYPE_LABELS[inferredLinkType]}
              </Badge>
            </div>
            <textarea
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="Add a description for this link (optional)"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none"
              rows={2}
            />
          </div>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-500">
            {selectedDocument ? (
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                Ready to link
              </span>
            ) : selectedModule ? (
              `${availableDocuments.length} documents available`
            ) : (
              'Select a target module'
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateLink}
              disabled={!selectedDocument || isCreating}
              icon={<Link2 className="w-4 h-4" />}
            >
              {isCreating ? 'Creating...' : 'Create Link'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateLinkModal;
