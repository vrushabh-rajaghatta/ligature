

// ============================================================================
// DocumentLinkActions - v173: Inline Cross-Module Linking Controls
// ============================================================================
// Provides buttons/dropdowns for creating links from any document context.
// Can be embedded in artifact cards, detail panels, or toolbars.
// ============================================================================

import { useState, useCallback } from 'react';
import {
  Link2,
  Plus,
  ChevronDown,
  FolderArchive,
  Send,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  FlaskConical,
  BookOpen,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  useDocumentLinkStore,
  useLinksFromDocument,
  useLinksToDocument,
  type LinkableModule,
} from '@/store/useDocumentLinkStore';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import type { BadgeColor } from '@/components/ui/Badge';
import { CreateLinkModal } from './CreateLinkModal';
import { LinkedDocumentsPanel, LinkedDocumentsBadge } from './LinkedDocumentsPanel';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentLinkActionsProps {
  // Document context
  module: LinkableModule;
  documentId: string;
  documentType: string;
  documentTitle: string;
  documentVersion?: string;
  
  // Display options
  variant?: 'button' | 'icon' | 'dropdown' | 'compact';
  showCount?: boolean;
  showPanel?: boolean;  // Show linked documents panel below
  
  // Callbacks
  onNavigateToDocument?: (module: LinkableModule, documentId: string) => void;
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

// Target modules for quick linking
const QUICK_LINK_TARGETS: Record<LinkableModule, LinkableModule[]> = {
  tmf: ['ectd', 'authoring'],
  ectd: ['tmf', 'haq'],
  safety: ['ctms'],
  haq: ['authoring', 'ectd', 'tmf'],
  qms: ['ctms'],
  ctms: ['safety', 'qms'],
  authoring: ['tmf', 'ectd', 'haq'],
  publishing: ['tmf', 'ectd'],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DocumentLinkActions({
  module,
  documentId,
  documentType,
  documentTitle,
  documentVersion,
  variant = 'button',
  showCount = true,
  showPanel = false,
  onNavigateToDocument,
}: DocumentLinkActionsProps) {
  // Link store
  const getLinksFromSource = useDocumentLinkStore(s => s.getLinksFromSource);
  const getLinksToTarget = useDocumentLinkStore(s => s.getLinksToTarget);
  
  // Get link counts
  const outgoingLinks = getLinksFromSource(module, documentId);
  const incomingLinks = getLinksToTarget(module, documentId);
  const totalLinks = outgoingLinks.length + incomingLinks.length;
  
  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLinksPanel, setShowLinksPanel] = useState(false);
  const [suggestedTarget, setSuggestedTarget] = useState<LinkableModule | undefined>();
  
  // Get quick link targets for this module
  const quickLinkTargets = QUICK_LINK_TARGETS[module] || [];
  
  // Handle quick link to specific module
  const handleQuickLink = useCallback((targetModule: LinkableModule) => {
    setSuggestedTarget(targetModule);
    setShowCreateModal(true);
    setShowDropdown(false);
  }, []);
  
  // Handle generic create link
  const handleCreateLink = useCallback(() => {
    setSuggestedTarget(undefined);
    setShowCreateModal(true);
    setShowDropdown(false);
  }, []);
  
  // Handle toggle links panel
  const handleTogglePanel = useCallback(() => {
    setShowLinksPanel(prev => !prev);
  }, []);
  
  // Render based on variant
  const renderTrigger = () => {
    switch (variant) {
      case 'icon':
        return (
          <IconButton
            icon={<Link2 className="w-4 h-4" />}
            onClick={handleTogglePanel}
            className={totalLinks > 0 ? 'text-blue-600' : 'text-slate-400'}
            label={`${totalLinks} linked documents`}
            title={`${totalLinks} linked documents`}
          />
        );
        
      case 'compact':
        return (
          <button
            onClick={handleTogglePanel}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            {showCount && totalLinks > 0 && <span>{totalLinks}</span>}
          </button>
        );
        
      case 'dropdown':
        return (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <Link2 className="w-4 h-4 mr-1" />
              Link
              {showCount && totalLinks > 0 && (
                <Badge color="blue" size="xs" className="ml-1">{totalLinks}</Badge>
              )}
              <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </Button>
            
            {showDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)} 
                />
                
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20">
                  <div className="p-2">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 py-1">
                      Quick Link To
                    </div>
                    {quickLinkTargets.map(target => (
                      <button
                        key={target}
                        onClick={() => handleQuickLink(target)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        {MODULE_ICONS[target]}
                        {MODULE_LABELS[target]}
                      </button>
                    ))}
                  </div>
                  
                  <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                    <button
                      onClick={handleCreateLink}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Plus className="w-4 h-4" />
                      Create Custom Link...
                    </button>
                  </div>
                  
                  {totalLinks > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-2">
                      <button
                        onClick={handleTogglePanel}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View {totalLinks} Linked Documents
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
        
      case 'button':
      default:
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateLink}
          >
            <Link2 className="w-4 h-4 mr-1" />
            Link Document
            {showCount && totalLinks > 0 && (
              <Badge color="blue" size="xs" className="ml-1">{totalLinks}</Badge>
            )}
          </Button>
        );
    }
  };
  
  return (
    <>
      {/* Trigger */}
      {renderTrigger()}
      
      {/* Linked Documents Panel (inline) */}
      {showPanel && showLinksPanel && (
        <div className="mt-3">
          <LinkedDocumentsPanel
            module={module}
            documentId={documentId}
            mode="inline"
            direction="both"
            showCreateButton
            onNavigateToDocument={onNavigateToDocument}
            onCreateLink={handleCreateLink}
            onClose={() => setShowLinksPanel(false)}
          />
        </div>
      )}
      
      {/* Create Link Modal */}
      <CreateLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        sourceModule={module}
        sourceId={documentId}
        sourceType={documentType}
        sourceTitle={documentTitle}
        sourceVersion={documentVersion}
        suggestedTargetModule={suggestedTarget}
        onLinkCreated={(link) => {
          /* Link created */
        }}
      />
    </>
  );
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Re-export badge for easy import
export { LinkedDocumentsBadge } from './LinkedDocumentsPanel';

export default DocumentLinkActions;
