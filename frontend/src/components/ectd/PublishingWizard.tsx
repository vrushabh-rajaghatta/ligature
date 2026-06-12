

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Send,
  Shield,
  Eye,
  Upload,
  Plus,
  Folder,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  X,
  Search,
  Filter,
  Globe,
  Building2,
  FileCheck,
  Loader2,
  Lock,
  Unlock,
  ArrowRight,
  Link2,
  Database,
  Hash,
  Code,
  Copy,
  Download
} from 'lucide-react';
import { CTD_STRUCTURE, CTDNode, CTD_MODULES } from '@/types/ectd';
import { 
  applicationsApi, 
  Application as DBApplication,
  SequenceInfo as APISequenceInfo,
  ReservedSequence 
} from '@/lib/applications-api';
import { submissionsApi, WizardState, DocumentAssignment as DBDocumentAssignment, ECTDGenerationResponse, ECTDValidationIssue, PDFValidationResponse, PDFDocumentValidationResult } from '@/lib/submissions-api';

type WizardStep = 'application' | 'sequence' | 'documents' | 'validation' | 'review';
type ApplicationType = 'NDA' | 'BLA' | 'ANDA' | 'IND' | 'MAA' | 'CTA';
type SequenceType = 'original' | 'amendment' | 'supplement' | 'ir-response' | 'annual-report';
type Region = 'fda' | 'ema' | 'pmda' | 'nmpa' | 'hc';

interface Application {
  type: ApplicationType;
  number: string;
  region: Region;
  sponsor: string;
  productName: string;
  substanceName: string;
}

interface SequenceInfo {
  type: SequenceType;
  description: string;
  relatedCorrespondence?: string;
  relatedSequence?: string;
}

interface DocumentAssignment {
  sectionId: string;
  sectionName: string;
  sourceDocId?: string;
  sourceDocName?: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  status: 'assigned' | 'pending' | 'validated';
}

interface ValidationResult {
  category: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  location?: string;
}

const regionInfo: Record<Region, { name: string; flag: string; agency: string }> = {
  fda: { name: 'United States', flag: '🇺🇸', agency: 'FDA' },
  ema: { name: 'European Union', flag: '🇪🇺', agency: 'EMA' },
  pmda: { name: 'Japan', flag: '🇯🇵', agency: 'PMDA' },
  nmpa: { name: 'China', flag: '🇨🇳', agency: 'NMPA' },
  hc: { name: 'Canada', flag: '🇨🇦', agency: 'Health Canada' },
};

const applicationTypes: Record<ApplicationType, string> = {
  NDA: 'New Drug Application',
  BLA: 'Biologics License Application',
  ANDA: 'Abbreviated New Drug Application',
  IND: 'Investigational New Drug',
  MAA: 'Marketing Authorization Application',
  CTA: 'Clinical Trial Application',
};

const sequenceTypes: Record<SequenceType, { name: string; description: string }> = {
  original: { name: 'Original Application', description: 'Initial submission of a new application' },
  amendment: { name: 'Amendment', description: 'Changes to a pending application' },
  supplement: { name: 'Supplement', description: 'Post-approval changes (CBE, PAS, etc.)' },
  'ir-response': { name: 'Information Request Response', description: 'Response to agency questions' },
  'annual-report': { name: 'Annual Report', description: 'Yearly safety/manufacturing update' },
};

// Available authored documents (mock - would come from Authoring module)
const availableDocuments = [
  { id: 'doc-1', name: 'Clinical Overview v2.3', section: '2.5', status: 'locked', author: 'Jennifer Walsh' },
  { id: 'doc-2', name: 'Clinical Summary v1.8', section: '2.7', status: 'locked', author: 'Jennifer Walsh' },
  { id: 'doc-3', name: 'Nonclinical Overview v1.5', section: '2.4', status: 'locked', author: 'Lisa Park' },
  { id: 'doc-4', name: 'Quality Overall Summary v2.1', section: '2.3', status: 'locked', author: 'Michael Roberts' },
  { id: 'doc-5', name: 'Drug Substance v3.0', section: '3.2.S', status: 'locked', author: 'Michael Roberts' },
  { id: 'doc-6', name: 'Drug Product v2.8', section: '3.2.P', status: 'locked', author: 'Michael Roberts' },
  { id: 'doc-7', name: 'CSR LIG-301 v1.0', section: '5.3.5.1', status: 'locked', author: 'David Kim' },
  { id: 'doc-8', name: 'Integrated Summary of Safety v1.2', section: '5.3.5.3', status: 'locked', author: 'David Kim' },
  { id: 'doc-9', name: 'Cover Letter', section: '1.2', status: 'draft', author: 'Sarah Chen' },
  { id: 'doc-10', name: "Reviewer's Guide v1.0", section: '1.12', status: 'review', author: 'Sarah Chen' },
];

// Mock validation results
const mockValidationResults: ValidationResult[] = [
  { category: 'error', code: 'E001', message: 'Missing required document: Form FDA 356h', location: 'Module 1.1' },
  { category: 'warning', code: 'W001', message: 'File size exceeds recommended limit (>50MB)', location: 'Module 5/CSR LIG-301' },
  { category: 'warning', code: 'W002', message: 'PDF bookmark structure incomplete', location: 'Module 2.5' },
  { category: 'info', code: 'I001', message: 'Checksum verification passed for all documents' },
  { category: 'info', code: 'I002', message: 'XML backbone structure validated successfully' },
];

interface PublishingWizardProps {
  onClose: () => void;
  onComplete: (data: { application: Application; sequence: SequenceInfo; documents: DocumentAssignment[]; submissionId?: string }) => void;
  preselectedApplicationId?: string;
  resumeSubmissionId?: string;
}

export function PublishingWizard({ onClose, onComplete, preselectedApplicationId, resumeSubmissionId }: PublishingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('application');
  const [isValidating, setIsValidating] = useState(false);
  const [validationComplete, setValidationComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingDocuments, setIsSyncingDocuments] = useState(false);
  const [isLoadingResume, setIsLoadingResume] = useState(!!resumeSubmissionId);

  // Database applications state
  const [existingApplications, setExistingApplications] = useState<DBApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(preselectedApplicationId || null);
  const [appError, setAppError] = useState<string | null>(null);
  
  // Sequence API state
  const [apiSequenceInfo, setApiSequenceInfo] = useState<APISequenceInfo | null>(null);
  const [isLoadingSequence, setIsLoadingSequence] = useState(false);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [reservedSequence, setReservedSequence] = useState<ReservedSequence | null>(null);
  const [isReservingSequence, setIsReservingSequence] = useState(false);

  // Form state
  const [application, setApplication] = useState<Application>({
    type: 'NDA',
    number: '',
    region: 'fda',
    sponsor: 'Ligature Therapeutics',
    productName: '',
    substanceName: '',
  });

  const [sequenceInfo, setSequenceInfo] = useState<SequenceInfo>({
    type: 'original',
    description: '',
  });

  const [documentAssignments, setDocumentAssignments] = useState<DocumentAssignment[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['2', '3', '5']));
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  
  // eCTD XML generation state
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);
  const [regionalXml, setRegionalXml] = useState<string | null>(null);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [ectdMetadata, setEctdMetadata] = useState<{
    ectdVersion: '3.2.2' | '4.0';
    documentCount: number;
    modulesSummary: Record<string, number>;
  } | null>(null);
  
  // PDF validation state
  const [pdfValidationResults, setPdfValidationResults] = useState<PDFDocumentValidationResult[] | null>(null);
  const [pdfValidationSummary, setPdfValidationSummary] = useState<{
    totalDocuments: number;
    passedDocuments: number;
    failedDocuments: number;
    warningDocuments: number;
    totalErrors: number;
    totalWarnings: number;
  } | null>(null);
  const [showPdfDetails, setShowPdfDetails] = useState(false);
  const [expandedPdfDoc, setExpandedPdfDoc] = useState<string | null>(null);

  // Fetch existing applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoadingApps(true);
      setAppError(null);
      try {
        const response = await applicationsApi.list();
        setExistingApplications(response.data);
        
        // If preselected, set it
        if (preselectedApplicationId) {
          const app = response.data.find(a => a.id === preselectedApplicationId);
          if (app) {
            setSelectedAppId(app.id);
            setApplication({
              type: app.type as ApplicationType,
              number: app.applicationNumber,
              region: mapRegionFromAgency(app.agency),
              sponsor: 'Ligature Therapeutics',
              productName: app.productName || '',
              substanceName: '',
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch applications:', err);
        setAppError('Failed to load applications from database');
      } finally {
        setIsLoadingApps(false);
      }
    };
    
    fetchApplications();
  }, [preselectedApplicationId]);

  // Fetch sequence info when application is selected
  useEffect(() => {
    if (!selectedAppId) {
      setApiSequenceInfo(null);
      return;
    }
    
    const fetchSequenceInfo = async () => {
      setIsLoadingSequence(true);
      setSequenceError(null);
      try {
        const response = await applicationsApi.getSequenceInfo(selectedAppId);
        setApiSequenceInfo(response.data);
      } catch (err) {
        console.error('Failed to fetch sequence info:', err);
        setSequenceError('Failed to load sequence information');
      } finally {
        setIsLoadingSequence(false);
      }
    };
    
    fetchSequenceInfo();
  }, [selectedAppId]);

  // Resume from saved wizard state if resumeSubmissionId provided
  useEffect(() => {
    if (!resumeSubmissionId) {
      setIsLoadingResume(false);
      return;
    }
    
    const resumeSession = async () => {
      setIsLoadingResume(true);
      try {
        const response = await submissionsApi.get(resumeSubmissionId);
        const submission = response.data;
        const savedState = submission.wizardState;
        
        if (savedState) {
          // Restore wizard state
          setCurrentStep(savedState.currentStep as WizardStep);
          setApplication({
            type: savedState.application.type as ApplicationType,
            number: savedState.application.number,
            region: savedState.application.region as Region,
            sponsor: savedState.application.sponsor,
            productName: savedState.application.productName,
            substanceName: savedState.application.substanceName,
          });
          setSequenceInfo({
            type: savedState.sequenceInfo.type as SequenceType,
            description: savedState.sequenceInfo.description,
            relatedCorrespondence: savedState.sequenceInfo.relatedCorrespondence,
            relatedSequence: savedState.sequenceInfo.relatedSequence,
          });
          
          // Try to load document assignments from database (source of truth)
          // Fall back to wizardState if DB fails
          try {
            const docResponse = await submissionsApi.getDocumentAssignments(resumeSubmissionId);
            if (docResponse.data.length > 0) {
              setDocumentAssignments(docResponse.data.map(d => ({
                sectionId: d.sectionId,
                sectionName: d.sectionName,
                sourceDocId: d.sourceDocId || undefined,
                sourceDocName: d.sourceDocName || undefined,
                operation: d.operation as 'new' | 'replace' | 'append' | 'delete',
                status: d.status as 'assigned' | 'pending' | 'validated',
              })));
            } else if (savedState.documentAssignments.length > 0) {
              // Fall back to wizardState if no DB assignments
              setDocumentAssignments(savedState.documentAssignments.map(d => ({
                sectionId: d.sectionId,
                sectionName: d.sectionName,
                sourceDocId: d.sourceDocId,
                sourceDocName: d.sourceDocName,
                operation: d.operation as 'new' | 'replace' | 'append' | 'delete',
                status: d.status as 'assigned' | 'pending' | 'validated',
              })));
            }
          } catch {
            // Fall back to wizardState on error
            setDocumentAssignments(savedState.documentAssignments.map(d => ({
              sectionId: d.sectionId,
              sectionName: d.sectionName,
              sourceDocId: d.sourceDocId,
              sourceDocName: d.sourceDocName,
              operation: d.operation as 'new' | 'replace' | 'append' | 'delete',
              status: d.status as 'assigned' | 'pending' | 'validated',
            })));
          }
          
          setExpandedSections(new Set(savedState.expandedSections));
          setValidationComplete(savedState.validationComplete);
          
          // Set the application ID from the submission
          if (submission.applicationId) {
            setSelectedAppId(submission.applicationId);
          }
          
          // Mark sequence as already reserved
          setReservedSequence({
            submissionId: resumeSubmissionId,
            applicationId: submission.applicationId || '',
            sequenceNumber: submission.sequenceNumber,
            sequenceInt: parseInt(submission.sequenceNumber, 10),
            type: savedState.sequenceInfo.type,
            status: 'PLANNING',
          });
        }
      } catch (err) {
        console.error('Failed to resume wizard session:', err);
        // Fall back to fresh wizard
      } finally {
        setIsLoadingResume(false);
      }
    };
    
    resumeSession();
  }, [resumeSubmissionId]);

  // Helper to map agency to region
  const mapRegionFromAgency = (agency: string): Region => {
    const mapping: Record<string, Region> = {
      'FDA': 'fda',
      'EMA': 'ema',
      'PMDA': 'pmda',
      'NMPA': 'nmpa',
      'Health Canada': 'hc',
    };
    return mapping[agency] || 'fda';
  };

  // Handle application selection from dropdown
  const handleSelectApplication = (appId: string) => {
    const app = existingApplications.find(a => a.id === appId);
    if (app) {
      setSelectedAppId(app.id);
      setApplication({
        type: app.type as ApplicationType,
        number: app.applicationNumber,
        region: mapRegionFromAgency(app.agency),
        sponsor: 'Ligature Therapeutics',
        productName: app.productName || '',
        substanceName: '',
      });
      // Clear any reserved sequence from previous selection
      setReservedSequence(null);
    }
  };

  // Reserve sequence when proceeding from sequence step
  const handleReserveSequence = useCallback(async () => {
    if (!selectedAppId || reservedSequence) return true; // Already reserved or no app
    
    setIsReservingSequence(true);
    try {
      const response = await applicationsApi.reserveSequence(selectedAppId, {
        type: sequenceInfo.type,
        description: sequenceInfo.description,
      });
      setReservedSequence(response.data);
      return true;
    } catch (err) {
      console.error('Failed to reserve sequence:', err);
      setSequenceError('Failed to reserve sequence number');
      return false;
    } finally {
      setIsReservingSequence(false);
    }
  }, [selectedAppId, reservedSequence, sequenceInfo.type, sequenceInfo.description]);

  // Save wizard state to submission for resumable sessions
  const saveWizardState = useCallback(async (step: WizardStep) => {
    const submissionId = reservedSequence?.submissionId;
    if (!submissionId) return; // Can't save until sequence is reserved
    
    setIsSaving(true);
    try {
      const wizardState: WizardState = {
        currentStep: step,
        application: {
          type: application.type,
          number: application.number,
          region: application.region,
          sponsor: application.sponsor,
          productName: application.productName,
          substanceName: application.substanceName,
        },
        sequenceInfo: {
          type: sequenceInfo.type,
          description: sequenceInfo.description,
          relatedCorrespondence: sequenceInfo.relatedCorrespondence,
          relatedSequence: sequenceInfo.relatedSequence,
        },
        documentAssignments: documentAssignments.map(d => ({
          sectionId: d.sectionId,
          sectionName: d.sectionName,
          sourceDocId: d.sourceDocId,
          sourceDocName: d.sourceDocName,
          operation: d.operation,
          status: d.status,
        })),
        expandedSections: Array.from(expandedSections),
        validationComplete,
        lastSavedAt: new Date().toISOString(),
      };
      
      await submissionsApi.saveWizardState(submissionId, wizardState);
    } catch (err) {
      console.error('Failed to save wizard state:', err);
      // Non-blocking - don't interrupt user flow
    } finally {
      setIsSaving(false);
    }
  }, [reservedSequence?.submissionId, application, sequenceInfo, documentAssignments, expandedSections, validationComplete]);

  // Save document assignments to database for persistence
  const saveDocumentAssignments = useCallback(async (assignments: DocumentAssignment[]) => {
    const submissionId = reservedSequence?.submissionId;
    if (!submissionId || assignments.length === 0) return;
    
    setIsSyncingDocuments(true);
    try {
      await submissionsApi.saveDocumentAssignments(submissionId, assignments.map(d => ({
        sectionId: d.sectionId,
        sectionName: d.sectionName,
        sourceDocId: d.sourceDocId || null,
        sourceDocName: d.sourceDocName || null,
        operation: d.operation,
        status: d.status,
      })));
    } catch (err) {
      console.error('Failed to save document assignments:', err);
      // Non-blocking - wizardState is still saved as backup
    } finally {
      setIsSyncingDocuments(false);
    }
  }, [reservedSequence?.submissionId]);

  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'application', label: 'Application', icon: <FileText className="w-4 h-4" /> },
    { id: 'sequence', label: 'Sequence', icon: <Hash className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <Folder className="w-4 h-4" /> },
    { id: 'validation', label: 'Validation', icon: <Shield className="w-4 h-4" /> },
    { id: 'review', label: 'Review', icon: <Eye className="w-4 h-4" /> },
  ];

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case 'application':
        return selectedAppId && application.number && application.productName;
      case 'sequence':
        return sequenceInfo.description && apiSequenceInfo && !isReservingSequence;
      case 'documents':
        return documentAssignments.length > 0;
      case 'validation':
        return validationComplete && !validationResults.some(r => r.category === 'error');
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = async () => {
    const idx = stepIndex;
    
    // Special handling: reserve sequence when leaving sequence step
    if (currentStep === 'sequence' && !reservedSequence) {
      const success = await handleReserveSequence();
      if (!success) return; // Don't proceed if reservation failed
    }
    
    if (idx < steps.length - 1) {
      const nextStepId = steps[idx + 1].id;
      setCurrentStep(nextStepId);
      // Auto-save state after step change (non-blocking)
      saveWizardState(nextStepId);
    }
  };

  const prevStep = () => {
    const idx = stepIndex;
    if (idx > 0) {
      const prevStepId = steps[idx - 1].id;
      setCurrentStep(prevStepId);
      // Auto-save state after step change (non-blocking)
      saveWizardState(prevStepId);
    }
  };

  const runValidation = async () => {
    setIsValidating(true);
    setGeneratedXml(null);
    setRegionalXml(null);
    setEctdMetadata(null);
    setPdfValidationResults(null);
    setPdfValidationSummary(null);
    
    try {
      // If we have a submission ID, call the real APIs
      if (reservedSequence?.submissionId) {
        // Run eCTD validation and PDF validation in parallel
        const [ectdResponse, pdfResponse] = await Promise.all([
          submissionsApi.generateECTD(reservedSequence.submissionId, {
            ectdVersion: '3.2.2',
            includeRegional: true,
            validateOnly: false,
          }),
          submissionsApi.validatePDFs(reservedSequence.submissionId, {
            validateAll: true,
            storeResults: true,
          }),
        ]);
        
        // Map eCTD API response to local validation format
        const mappedResults: ValidationResult[] = ectdResponse.validation.issues.map(issue => ({
          category: issue.severity,
          code: issue.code,
          message: issue.message,
          location: issue.sectionNumber || issue.details,
        }));
        
        // Add PDF validation issues to the results list
        pdfResponse.documents.forEach(doc => {
          doc.issues.forEach(issue => {
            mappedResults.push({
              category: issue.severity,
              code: issue.code,
              message: issue.message,
              location: `${doc.sectionId} - ${doc.fileName}`,
            });
          });
        });
        
        setValidationResults(mappedResults);
        setGeneratedXml(ectdResponse.backbone || null);
        setRegionalXml(ectdResponse.regionalXml || null);
        setEctdMetadata(ectdResponse.metadata ? {
          ectdVersion: ectdResponse.metadata.ectdVersion,
          documentCount: ectdResponse.metadata.documentCount,
          modulesSummary: ectdResponse.metadata.modulesSummary,
        } : null);
        
        // Store PDF validation results
        setPdfValidationResults(pdfResponse.documents);
        setPdfValidationSummary({
          totalDocuments: pdfResponse.summary.totalDocuments,
          passedDocuments: pdfResponse.summary.passedDocuments,
          failedDocuments: pdfResponse.summary.failedDocuments,
          warningDocuments: pdfResponse.summary.warningDocuments,
          totalErrors: pdfResponse.summary.totalErrors,
          totalWarnings: pdfResponse.summary.totalWarnings,
        });
        
      } else {
        // Fallback to mock validation if no submission ID
        const mockResults: ValidationResult[] = [
          { category: 'warning', code: 'W001', message: 'No submission ID - using mock validation', location: 'System' },
          { category: 'info', code: 'I001', message: `${documentAssignments.length} documents assigned` },
        ];
        
        if (documentAssignments.length === 0) {
          mockResults.unshift({
            category: 'error',
            code: 'E001',
            message: 'No documents assigned to submission',
            location: 'Documents Step',
          });
        }
        
        setValidationResults(mockResults);
      }
      
      setValidationComplete(true);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResults([{
        category: 'error',
        code: 'E999',
        message: error instanceof Error ? error.message : 'Validation failed',
        location: 'System',
      }]);
      setValidationComplete(true);
    } finally {
      setIsValidating(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const assignDocument = (sectionId: string, sectionName: string, docId: string, docName: string) => {
    setDocumentAssignments(prev => {
      const existing = prev.findIndex(a => a.sectionId === sectionId);
      const newAssignment: DocumentAssignment = {
        sectionId,
        sectionName,
        sourceDocId: docId,
        sourceDocName: docName,
        operation: 'new',
        status: 'assigned',
      };
      let updated: DocumentAssignment[];
      if (existing >= 0) {
        updated = [...prev];
        updated[existing] = newAssignment;
      } else {
        updated = [...prev, newAssignment];
      }
      // Sync to database (non-blocking)
      if (reservedSequence?.submissionId) {
        saveDocumentAssignments(updated);
      }
      return updated;
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'application':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Application Details</h3>
              <p className="text-sm text-text-muted mb-6">
                Select an existing regulatory application or create a new one for this submission.
              </p>
            </div>

            {/* Existing Applications Selector */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                <Database className="w-4 h-4 inline mr-2" />
                Select Application
              </label>
              {isLoadingApps ? (
                <div className="flex items-center gap-2 p-4 bg-surface-card rounded-lg border border-border">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />
                  <span className="text-sm text-text-muted">Loading applications...</span>
                </div>
              ) : appError ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{appError}</p>
                </div>
              ) : existingApplications.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {existingApplications.map(app => (
                    <button
                      key={app.id}
                      onClick={() => handleSelectApplication(app.id)}
                      className={`w-full p-4 rounded-lg border text-left transition-colors ${
                        selectedAppId === app.id
                          ? 'border-accent-blue bg-accent-blue/10'
                          : 'border-border hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">{app.applicationNumber}</span>
                            <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded">{app.type}</span>
                            <span className="text-xs px-2 py-0.5 bg-surface-card text-text-muted rounded">{app.agency}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-1">{app.productName || 'No product assigned'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-text-muted">
                            {app.currentSequence} sequences
                          </div>
                          {selectedAppId === app.id && (
                            <CheckCircle className="w-4 h-4 text-accent-green mt-1 ml-auto" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
                  <p className="text-sm text-text-muted">No applications found in database</p>
                </div>
              )}
            </div>

            {/* Selected Application Details */}
            {selectedAppId && (
              <div className="p-4 bg-surface-elevated rounded-lg border border-accent-blue/30">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-4 h-4 text-accent-green" />
                  <span className="text-sm font-medium text-text-primary">Selected Application</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Application:</span>
                    <span className="ml-2 text-text-primary font-medium">{application.number}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Type:</span>
                    <span className="ml-2 text-text-primary font-medium">{application.type}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Region:</span>
                    <span className="ml-2 text-text-primary font-medium">{regionInfo[application.region]?.agency}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Product:</span>
                    <span className="ml-2 text-text-primary font-medium">{application.productName || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Region Selection - for manual entry */}
            {!selectedAppId && (
              <>
                <div className="flex items-center gap-2 text-text-muted my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs">or create new</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Region / Agency</label>
                  <div className="grid grid-cols-5 gap-3">
                    {(Object.entries(regionInfo) as [Region, typeof regionInfo[Region]][]).map(([key, info]) => (
                      <button
                        key={key}
                        onClick={() => setApplication(prev => ({ ...prev, region: key }))}
                        className={`p-4 rounded-lg border text-center transition-colors ${
                          application.region === key
                            ? 'border-accent-blue bg-accent-blue/10'
                            : 'border-border hover:border-accent-blue/50'
                        }`}
                      >
                        <span className="text-2xl">{info.flag}</span>
                        <div className="text-sm font-medium text-text-primary mt-1">{info.agency}</div>
                        <div className="text-xs text-text-muted">{info.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Application Type */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Application Type</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.entries(applicationTypes) as [ApplicationType, string][]).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => setApplication(prev => ({ ...prev, type }))}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          application.type === type
                            ? 'border-accent-blue bg-accent-blue/10'
                            : 'border-border hover:border-accent-blue/50'
                        }`}
                      >
                        <div className="text-sm font-semibold text-text-primary">{type}</div>
                        <div className="text-xs text-text-muted">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Application Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Application Number</label>
                    <input
                      type="text"
                      value={application.number}
                      onChange={(e) => setApplication(prev => ({ ...prev, number: e.target.value }))}
                      placeholder="e.g., 123456"
                      className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Sponsor</label>
                    <input
                      type="text"
                      value={application.sponsor}
                      onChange={(e) => setApplication(prev => ({ ...prev, sponsor: e.target.value }))}
                      className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Product Name</label>
                    <input
                      type="text"
                      value={application.productName}
                      onChange={(e) => setApplication(prev => ({ ...prev, productName: e.target.value }))}
                      placeholder="e.g., Ligrastinib Tablets"
                      className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Active Substance (INN)</label>
                    <input
                      type="text"
                      value={application.substanceName}
                      onChange={(e) => setApplication(prev => ({ ...prev, substanceName: e.target.value }))}
                      placeholder="e.g., ligrastinib"
                      className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'sequence':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Sequence Information</h3>
              <p className="text-sm text-text-muted mb-6">
                Define the submission sequence type and related information.
              </p>
            </div>

            {/* Sequence Number Display - from API */}
            <div className="p-6 bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 rounded-xl border border-accent-blue/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-text-muted mb-1">Next Sequence Number</div>
                  {isLoadingSequence ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-accent-blue" />
                      <span className="text-text-muted">Loading...</span>
                    </div>
                  ) : sequenceError ? (
                    <div className="text-red-400 text-sm">{sequenceError}</div>
                  ) : apiSequenceInfo ? (
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold text-accent-blue font-mono">
                        {reservedSequence ? reservedSequence.sequenceNumber : apiSequenceInfo.nextSequenceFormatted}
                      </span>
                      {reservedSequence && (
                        <span className="px-2 py-1 bg-accent-green/20 text-accent-green text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Reserved
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-text-muted">Select an application first</span>
                  )}
                </div>
                {apiSequenceInfo && !reservedSequence && (
                  <div className="text-right">
                    <div className="text-xs text-text-muted">Application</div>
                    <div className="text-sm font-medium text-text-primary">{apiSequenceInfo.applicationNumber}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {apiSequenceInfo.totalSequences} existing sequences
                    </div>
                  </div>
                )}
              </div>
              
              {/* Recent Sequences */}
              {apiSequenceInfo && apiSequenceInfo.recentSequences.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="text-xs text-text-muted mb-2">Recent Sequences</div>
                  <div className="flex gap-2">
                    {apiSequenceInfo.recentSequences.slice(0, 3).map((seq, idx) => (
                      <span key={idx} className="px-2 py-1 bg-surface-card rounded text-xs text-text-secondary">
                        {seq.sequenceNumber} • {seq.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sequence Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Sequence Type</label>
              <div className="space-y-2">
                {(Object.entries(sequenceTypes) as [SequenceType, typeof sequenceTypes[SequenceType]][]).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setSequenceInfo(prev => ({ ...prev, type }))}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      sequenceInfo.type === type
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-border hover:border-accent-blue/50'
                    }`}
                  >
                    <div className="text-sm font-semibold text-text-primary">{info.name}</div>
                    <div className="text-xs text-text-muted mt-1">{info.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sequence Description */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
              <textarea
                value={sequenceInfo.description}
                onChange={(e) => setSequenceInfo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this submission..."
                rows={3}
                className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
              />
            </div>

            {/* Related Correspondence (for IR Response) */}
            {sequenceInfo.type === 'ir-response' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Related Correspondence</label>
                <select
                  value={sequenceInfo.relatedCorrespondence || ''}
                  onChange={(e) => setSequenceInfo(prev => ({ ...prev, relatedCorrespondence: e.target.value }))}
                  className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                >
                  <option value="">Select correspondence...</option>
                  <option value="ir-001">IR-2024-001: Dissolution Methodology (Sep 2024)</option>
                  <option value="ir-002">IR-2024-002: I/E Criteria Clarification (Oct 2024)</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Document Assignment</h3>
              <p className="text-sm text-text-muted mb-4">
                Drag authored documents to CTD sections or click to assign.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 h-[500px]">
              {/* Left: Available Documents */}
              <div className="bg-surface-card rounded-lg border border-border overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border bg-surface-elevated">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {availableDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 bg-surface rounded-lg border border-border hover:border-accent-blue/50 cursor-pointer transition-colors"
                      onClick={() => {
                        // Simple click-to-assign: assign to matching section
                        assignDocument(doc.section, doc.name.split(' v')[0], doc.id, doc.name);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-medium text-text-primary">{doc.name}</div>
                          <div className="text-xs text-text-muted mt-0.5">Section {doc.section} • {doc.author}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          doc.status === 'locked' ? 'bg-accent-green/20 text-accent-green' :
                          doc.status === 'draft' ? 'bg-slate-500/20 text-slate-400' :
                          'bg-accent-amber/20 text-accent-amber'
                        }`}>
                          {doc.status === 'locked' ? <Lock className="w-3 h-3 inline mr-1" /> : <Unlock className="w-3 h-3 inline mr-1" />}
                          {doc.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: CTD Structure */}
              <div className="bg-surface-card rounded-lg border border-border overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border bg-surface-elevated">
                  <span className="text-sm font-medium text-text-primary">eCTD Structure</span>
                </div>
                <div className="flex-1 overflow-auto p-3 space-y-1">
                  {Object.entries(CTD_MODULES).map(([moduleNum, moduleInfo]) => {
                    const structure = CTD_STRUCTURE[moduleNum];
                    const isExpanded = expandedSections.has(moduleNum);
                    const moduleAssignments = documentAssignments.filter(a => a.sectionId.startsWith(moduleNum));

                    return (
                      <div key={moduleNum}>
                        <button
                          onClick={() => toggleSection(moduleNum)}
                          className="w-full flex items-center gap-2 p-2 hover:bg-surface-elevated rounded transition-colors"
                        >
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4" style={{ color: moduleInfo.color }} />
                          ) : (
                            <Folder className="w-4 h-4" style={{ color: moduleInfo.color }} />
                          )}
                          <span className="text-sm text-text-primary flex-1 text-left">
                            Module {moduleNum} — {moduleInfo.name}
                          </span>
                          {moduleAssignments.length > 0 && (
                            <span className="text-xs bg-accent-green/20 text-accent-green px-1.5 py-0.5 rounded">
                              {moduleAssignments.length}
                            </span>
                          )}
                        </button>

                        {isExpanded && structure?.children && (
                          <div className="ml-6 space-y-0.5">
                            {structure.children.slice(0, 6).map(section => {
                              const assignment = documentAssignments.find(a => a.sectionId === section.id);
                              return (
                                <div
                                  key={section.id}
                                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                                    assignment ? 'bg-accent-green/10 border border-accent-green/30' : 'hover:bg-surface-elevated'
                                  }`}
                                >
                                  <span className="text-text-muted w-12">{section.id}</span>
                                  <span className="text-text-primary flex-1">{section.name}</span>
                                  {assignment ? (
                                    <div className="flex items-center gap-2">
                                      <Link2 className="w-3 h-3 text-accent-green" />
                                      <span className="text-xs text-accent-green truncate max-w-[120px]">
                                        {assignment.sourceDocName}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-text-muted">Click doc to assign</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Assignment Summary */}
            <div className="bg-surface-elevated rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">{documentAssignments.length} documents assigned</span>
                <span className="text-sm text-text-muted">
                  {documentAssignments.filter(a => a.status === 'assigned').length} ready for validation
                </span>
              </div>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Technical Validation</h3>
              <p className="text-sm text-text-muted mb-6">
                Run eCTD technical validation to check compliance before submission.
              </p>
            </div>

            {!validationComplete ? (
              <div className="text-center py-12">
                {isValidating ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-accent-blue animate-spin mx-auto" />
                    <div className="text-text-primary">Running validation checks...</div>
                    <div className="text-sm text-text-muted">Checking XML structure, checksums, PDF compliance...</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Shield className="w-16 h-16 text-text-muted mx-auto" />
                    <div className="text-text-primary">Ready to validate</div>
                    <p className="text-sm text-text-muted max-w-md mx-auto">
                      Validation will check eCTD structure, file checksums, PDF specifications, and regional requirements.
                    </p>
                    <button
                      onClick={runValidation}
                      className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                    >
                      Run Validation
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-accent-red">
                      {validationResults.filter(r => r.category === 'error').length}
                    </div>
                    <div className="text-sm text-accent-red">Errors</div>
                  </div>
                  <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-accent-amber">
                      {validationResults.filter(r => r.category === 'warning').length}
                    </div>
                    <div className="text-sm text-accent-amber">Warnings</div>
                  </div>
                  <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-accent-blue">
                      {validationResults.filter(r => r.category === 'info').length}
                    </div>
                    <div className="text-sm text-accent-blue">Info</div>
                  </div>
                </div>

                {/* Results List */}
                <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
                  <div className="p-3 border-b border-border bg-surface-elevated">
                    <span className="text-sm font-medium text-text-primary">Validation Results</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {validationResults.map((result, idx) => (
                      <div key={idx} className="p-3 flex items-start gap-3">
                        {result.category === 'error' ? (
                          <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" />
                        ) : result.category === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm text-text-primary">{result.message}</div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {result.code} {result.location && `• ${result.location}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {validationResults.some(r => r.category === 'error') && (
                  <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-accent-red text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Errors must be resolved before submission</span>
                    </div>
                  </div>
                )}
                
                {/* eCTD XML Preview */}
                {generatedXml && (
                  <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
                    <div className="p-3 border-b border-border bg-surface-elevated flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-accent-blue" />
                        <span className="text-sm font-medium text-text-primary">Generated eCTD XML</span>
                        {ectdMetadata && (
                          <span className="text-xs text-text-muted">
                            (v{ectdMetadata.ectdVersion} • {ectdMetadata.documentCount} documents)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedXml);
                          }}
                          className="p-1.5 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary transition-colors"
                          title="Copy XML"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowXmlPreview(!showXmlPreview)}
                          className="px-3 py-1 text-xs bg-accent-blue/10 text-accent-blue rounded hover:bg-accent-blue/20 transition-colors"
                        >
                          {showXmlPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                      </div>
                    </div>
                    
                    {showXmlPreview && (
                      <div className="p-4 max-h-96 overflow-auto">
                        <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap break-all">
                          {generatedXml.slice(0, 5000)}
                          {generatedXml.length > 5000 && (
                            <span className="text-accent-blue">
                              {'\n\n... ({truncated} {generatedXml.length - 5000} more characters)'}
                            </span>
                          )}
                        </pre>
                      </div>
                    )}
                    
                    {!showXmlPreview && (
                      <div className="p-4 text-center text-sm text-text-muted">
                        <div className="flex items-center justify-center gap-4">
                          <div>
                            <div className="text-lg font-semibold text-text-primary">{generatedXml.length.toLocaleString()}</div>
                            <div className="text-xs">characters</div>
                          </div>
                          {ectdMetadata?.modulesSummary && (
                            <div className="flex gap-2">
                              {Object.entries(ectdMetadata.modulesSummary).map(([module, count]) => (
                                <div key={module} className="px-2 py-1 bg-surface-elevated rounded text-xs">
                                  <span className="font-medium">{module}:</span> {count}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Regional XML Preview */}
                {regionalXml && (
                  <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
                    <div className="p-3 border-b border-border bg-surface-elevated flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-accent-teal" />
                        <span className="text-sm font-medium text-text-primary">Regional XML (US)</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(regionalXml);
                        }}
                        className="p-1.5 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary transition-colors"
                        title="Copy Regional XML"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 text-center text-sm text-text-muted">
                      Regional XML generated ({regionalXml.length.toLocaleString()} characters)
                    </div>
                  </div>
                )}
                
                {/* PDF Validation Results */}
                {pdfValidationSummary && (
                  <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
                    <div className="p-3 border-b border-border bg-surface-elevated flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-accent-purple" />
                        <span className="text-sm font-medium text-text-primary">PDF Compliance Validation</span>
                        <span className="text-xs text-text-muted">
                          ({pdfValidationSummary.totalDocuments} documents)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-accent-green" />
                            {pdfValidationSummary.passedDocuments} passed
                          </span>
                          {pdfValidationSummary.warningDocuments > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-accent-amber" />
                              {pdfValidationSummary.warningDocuments} warnings
                            </span>
                          )}
                          {pdfValidationSummary.failedDocuments > 0 && (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-accent-red" />
                              {pdfValidationSummary.failedDocuments} failed
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowPdfDetails(!showPdfDetails)}
                          className="px-3 py-1 text-xs bg-accent-purple/10 text-accent-purple rounded hover:bg-accent-purple/20 transition-colors"
                        >
                          {showPdfDetails ? 'Hide Details' : 'Show Details'}
                        </button>
                      </div>
                    </div>
                    
                    {showPdfDetails && pdfValidationResults && (
                      <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
                        {pdfValidationResults.map((doc) => (
                          <div key={doc.documentId} className="p-3">
                            <div 
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedPdfDoc(expandedPdfDoc === doc.documentId ? null : doc.documentId)}
                            >
                              <div className="flex items-center gap-3">
                                {doc.status === 'valid' ? (
                                  <CheckCircle className="w-4 h-4 text-accent-green" />
                                ) : doc.status === 'warning' ? (
                                  <AlertTriangle className="w-4 h-4 text-accent-amber" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-accent-red" />
                                )}
                                <div>
                                  <div className="text-sm text-text-primary">{doc.sectionName}</div>
                                  <div className="text-xs text-text-muted">{doc.sectionId} • {doc.fileName}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-xs">
                                  {doc.pdfInfo.isPdfA && (
                                    <span className="px-2 py-0.5 bg-accent-green/10 text-accent-green rounded">PDF/A</span>
                                  )}
                                  {doc.pdfInfo.hasBookmarks && (
                                    <span className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded">Bookmarks</span>
                                  )}
                                  {doc.pdfInfo.hasEmbeddedFonts && (
                                    <span className="px-2 py-0.5 bg-surface-elevated text-text-muted rounded">Fonts</span>
                                  )}
                                </div>
                                <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${expandedPdfDoc === doc.documentId ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                            
                            {expandedPdfDoc === doc.documentId && (
                              <div className="mt-3 pl-7 space-y-3">
                                {/* PDF Properties */}
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                  <div className="bg-surface-elevated rounded p-2">
                                    <div className="text-text-muted">Version</div>
                                    <div className="text-text-primary font-medium">PDF {doc.pdfInfo.pdfVersion}</div>
                                  </div>
                                  <div className="bg-surface-elevated rounded p-2">
                                    <div className="text-text-muted">Pages</div>
                                    <div className="text-text-primary font-medium">{doc.pdfInfo.pageCount}</div>
                                  </div>
                                  <div className="bg-surface-elevated rounded p-2">
                                    <div className="text-text-muted">Size</div>
                                    <div className="text-text-primary font-medium">{(doc.fileSize / 1024 / 1024).toFixed(1)} MB</div>
                                  </div>
                                  <div className="bg-surface-elevated rounded p-2">
                                    <div className="text-text-muted">Hyperlinks</div>
                                    <div className="text-text-primary font-medium">{doc.pdfInfo.hyperlinkCount}</div>
                                  </div>
                                </div>
                                
                                {/* Issues */}
                                {doc.issues.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-text-muted font-medium">Issues ({doc.issues.length})</div>
                                    {doc.issues.map((issue, idx) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-surface-elevated rounded">
                                        {issue.severity === 'error' ? (
                                          <AlertCircle className="w-3 h-3 text-accent-red flex-shrink-0 mt-0.5" />
                                        ) : issue.severity === 'warning' ? (
                                          <AlertTriangle className="w-3 h-3 text-accent-amber flex-shrink-0 mt-0.5" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3 text-accent-blue flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                          <span className="text-text-primary">{issue.message}</span>
                                          {issue.autoFixable && (
                                            <span className="ml-2 px-1.5 py-0.5 bg-accent-teal/10 text-accent-teal rounded text-[10px]">
                                              Auto-fixable
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {doc.issues.length === 0 && (
                                  <div className="text-xs text-accent-green flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    All PDF compliance checks passed
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {!showPdfDetails && (
                      <div className="p-4">
                        <div className="grid grid-cols-5 gap-2 text-xs text-center">
                          <div className="p-2 bg-surface-elevated rounded">
                            <div className="font-semibold text-text-primary">{pdfValidationSummary.totalDocuments}</div>
                            <div className="text-text-muted">Total</div>
                          </div>
                          <div className="p-2 bg-accent-green/10 rounded">
                            <div className="font-semibold text-accent-green">{pdfValidationSummary.passedDocuments}</div>
                            <div className="text-accent-green">Passed</div>
                          </div>
                          <div className="p-2 bg-accent-amber/10 rounded">
                            <div className="font-semibold text-accent-amber">{pdfValidationSummary.warningDocuments}</div>
                            <div className="text-accent-amber">Warnings</div>
                          </div>
                          <div className="p-2 bg-accent-red/10 rounded">
                            <div className="font-semibold text-accent-red">{pdfValidationSummary.failedDocuments}</div>
                            <div className="text-accent-red">Failed</div>
                          </div>
                          <div className="p-2 bg-surface-elevated rounded">
                            <div className="font-semibold text-text-primary">{pdfValidationSummary.totalErrors + pdfValidationSummary.totalWarnings}</div>
                            <div className="text-text-muted">Issues</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Review & Submit</h3>
              <p className="text-sm text-text-muted mb-6">
                Review the submission details and authorize for gateway transmission.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-card rounded-lg border border-border p-4">
                <div className="text-sm font-medium text-text-muted mb-3">Application</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Type</span>
                    <span className="text-sm text-text-primary font-medium">{application.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Number</span>
                    <span className="text-sm text-text-primary">{application.number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Region</span>
                    <span className="text-sm text-text-primary">{regionInfo[application.region].flag} {regionInfo[application.region].agency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Product</span>
                    <span className="text-sm text-text-primary">{application.productName}</span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-card rounded-lg border border-border p-4">
                <div className="text-sm font-medium text-text-muted mb-3">Sequence</div>
                <div className="space-y-2">
                  {reservedSequence && (
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-border">
                      <span className="text-sm text-text-muted">Sequence #</span>
                      <span className="text-lg font-bold text-accent-blue font-mono">{reservedSequence.sequenceNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Type</span>
                    <span className="text-sm text-text-primary font-medium">{sequenceTypes[sequenceInfo.type].name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Documents</span>
                    <span className="text-sm text-text-primary">{documentAssignments.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-muted">Validation</span>
                    <span className="text-sm text-accent-green flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Passed
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Authorization */}
            <div className="bg-surface-elevated rounded-lg p-6 border border-border">
              <h4 className="text-base font-semibold text-text-primary mb-4">Submission Authorization</h4>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border" />
                  <span className="text-sm text-text-secondary">
                    I confirm that all documents have been reviewed and approved according to company SOPs.
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border" />
                  <span className="text-sm text-text-secondary">
                    I am authorized to submit this application on behalf of {application.sponsor}.
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border" />
                  <span className="text-sm text-text-secondary">
                    I understand this action will transmit the submission to the {regionInfo[application.region].agency} gateway.
                  </span>
                </label>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-text-primary mb-2">Digital Signature (PIN)</label>
                    <input
                      type="password"
                      placeholder="Enter your authorization PIN"
                      className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div className="pt-6">
                    <button
                      onClick={() => onComplete({ 
                        application, 
                        sequence: sequenceInfo, 
                        documents: documentAssignments,
                        submissionId: reservedSequence?.submissionId,
                      })}
                      className="px-6 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Submit to Gateway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl flex flex-col">
        {/* Loading overlay for resume */}
        {isLoadingResume && (
          <div className="absolute inset-0 bg-surface/90 flex items-center justify-center z-10 rounded-xl">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-accent-blue mx-auto mb-3" />
              <p className="text-text-primary font-medium">Resuming your session...</p>
              <p className="text-sm text-text-muted mt-1">Loading saved progress</p>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary">
              {resumeSubmissionId ? 'Resume Submission' : 'Create New Submission'}
            </h2>
            {(isSaving || isSyncingDocuments) && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isSyncingDocuments ? 'Syncing documents...' : 'Saving...'}
              </span>
            )}
            {reservedSequence && !isSaving && !isSyncingDocuments && (
              <span className="text-xs text-accent-green flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Auto-saved
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${
                  idx < stepIndex ? 'text-accent-green' :
                  idx === stepIndex ? 'text-accent-blue' :
                  'text-text-muted'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    idx < stepIndex ? 'bg-accent-green text-white' :
                    idx === stepIndex ? 'bg-accent-blue text-white' :
                    'bg-surface-card'
                  }`}>
                    {idx < stepIndex ? <Check className="w-4 h-4" /> : step.icon}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    idx < stepIndex ? 'bg-accent-green' : 'bg-surface-card'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            {currentStep !== 'review' && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
