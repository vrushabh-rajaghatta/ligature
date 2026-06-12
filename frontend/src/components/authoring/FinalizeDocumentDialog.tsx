

import { useState, useMemo } from 'react';
import { 
  X, CheckCircle, AlertTriangle, FileText, FolderOpen, 
  ChevronDown, ArrowRight, Package, Building2 
} from 'lucide-react';
import { AuthoringDocument, CTDSection, CTD_SECTION_INFO, DOCUMENT_TYPE_TO_CTD } from '@/types/authoring';
import { useDocumentBridge } from '@/store/useDocumentBridge';
import { Application } from '@/stores/portfolio-store';

interface FinalizeDocumentDialogProps {
  document: AuthoringDocument;
  onClose: () => void;
  onFinalized: (documentStoreId: string) => void;
}

export function FinalizeDocumentDialog({ 
  document, 
  onClose, 
  onFinalized 
}: FinalizeDocumentDialogProps) {
  const { 
    finalizeDocument, 
    getApplicationsForProgram, 
    getSuggestedCTDSection,
    getCTDSectionInfo,
  } = useDocumentBridge();

  // Get available applications for the document's program
  const applications = useMemo(() => {
    return getApplicationsForProgram(document.programId);
  }, [document.programId, getApplicationsForProgram]);

  // Get suggested CTD section based on document type
  const suggestedSection = useMemo(() => {
    return getSuggestedCTDSection(document.documentType);
  }, [document.documentType, getSuggestedCTDSection]);

  // State
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(
    document.applicationId || applications[0]?.id || ''
  );
  const [selectedSection, setSelectedSection] = useState<CTDSection>(
    document.ctdSection || suggestedSection || '5.3.5'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  // Get the selected application details
  const selectedApplication = applications.find(a => a.id === selectedApplicationId);

  // Available CTD sections for dropdown
  const ctdSections = Object.entries(CTD_SECTION_INFO).map(([key, info]) => ({
    value: key as CTDSection,
    ...info,
  }));

  const handleFinalize = async () => {
    if (!selectedApplicationId) {
      setError('Please select an application');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = finalizeDocument(document, {
        applicationId: selectedApplicationId,
        ctdSection: selectedSection,
      });

      if (result.success && result.documentStoreId) {
        onFinalized(result.documentStoreId);
      } else {
        setError(result.error || 'Failed to finalize document');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-card rounded-xl shadow-xl max-w-lg w-full mx-4 border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-green/20 rounded-lg">
              <Package className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Finalize Document</h2>
              <p className="text-sm text-text-muted">Add to Document Store for submission</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Document Info */}
          <div className="bg-surface-elevated rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-accent-blue mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-text-primary">{document.shortTitle}</p>
                <p className="text-sm text-text-muted">{document.title}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span>Version {document.version}</span>
                  <span>•</span>
                  <span>{document.productName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Application Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Target Application
            </label>
            {applications.length > 0 ? (
              <select
                value={selectedApplicationId}
                onChange={(e) => setSelectedApplicationId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              >
                {applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.applicationNumber} ({app.type}) - {app.region}/{app.agency}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">No applications found for this program</span>
                </div>
              </div>
            )}
          </div>

          {/* CTD Section Selection */}
          <div className="relative">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              CTD Section
            </label>
            <button
              onClick={() => setShowSectionDropdown(!showSectionDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary hover:bg-surface-card transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-text-muted" />
                <span>{selectedSection} - {CTD_SECTION_INFO[selectedSection]?.title}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showSectionDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSectionDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-surface-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto">
                {ctdSections.map((section) => (
                  <button
                    key={section.value}
                    onClick={() => {
                      setSelectedSection(section.value);
                      setShowSectionDropdown(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-elevated transition-colors ${
                      selectedSection === section.value ? 'bg-accent-blue/10' : ''
                    }`}
                  >
                    <span className="text-xs font-mono text-text-muted w-12">{section.module}</span>
                    <span className="text-sm text-text-primary">{section.section}</span>
                    <span className="text-sm text-text-secondary flex-1">{section.title}</span>
                    {selectedSection === section.value && (
                      <CheckCircle className="w-4 h-4 text-accent-blue" />
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {suggestedSection && suggestedSection !== selectedSection && (
              <p className="mt-1 text-xs text-text-muted">
                Suggested: {suggestedSection} - {CTD_SECTION_INFO[suggestedSection]?.title}
              </p>
            )}
          </div>

          {/* Summary */}
          {selectedApplication && (
            <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-accent-blue text-sm mb-2">
                <Building2 className="w-4 h-4" />
                <span className="font-medium">Finalization Summary</span>
              </div>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Document will be added to <span className="text-text-primary">{selectedApplication.applicationNumber}</span></li>
                <li>• Placed in CTD Module {CTD_SECTION_INFO[selectedSection]?.module.toUpperCase()} Section {selectedSection}</li>
                <li>• Status will be set to <span className="text-accent-green">Approved</span></li>
                <li>• Available for sequence assembly in Submissions</li>
              </ul>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:bg-surface-elevated rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleFinalize}
            disabled={isSubmitting || !selectedApplicationId}
            className="flex items-center gap-2 px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finalizing...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Finalize to Document Store
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
