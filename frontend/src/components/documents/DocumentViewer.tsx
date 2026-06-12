
// Document Viewer Component - v0.25.8 (PDF Default View)
// Full document viewing with version comparison, content preview, approval requests, comments, signatures, and approval status
// v0.25.8: Document viewing panes now default to PDF view


import { useState, useMemo, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { 
  X, ChevronDown, ChevronRight, FileText, Download, Share2, Edit, History, 
  Clock, CheckCircle, AlertCircle, Lock, Eye, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCcw, Printer, BookOpen, Layers, Link2, 
  MessageSquare, GitBranch, ArrowLeftRight, ChevronLeft, SendHorizontal, PenTool,
  Shield // v0.13.52: Approval tab icon
} from 'lucide-react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { EnterpriseDocument, DocumentVersionRef } from '@/domains/document-control/contracts';
import { getDocumentStatusBadge, getClassificationBadge, getSecurityBadge } from '@/components/documents/document-badges';
import { VersionDiffViewer } from './VersionDiffViewer';
import { ApprovalRequestPanel, ApprovalRequestData } from './ApprovalRequestPanel';
import { CommentsPanel } from './CommentsPanel';
import { SignatureCapture } from './SignatureCapture';
import { ApprovalStatusDashboard } from './ApprovalStatusDashboard'; // v0.13.52
import { ApprovalStatusIndicator } from './ApprovalStatusIndicator'; // v0.13.52
import { PDFDocumentPreview, DEFAULT_DOCUMENT_VIEW_MODE } from './PDFDocumentPreview'; // v0.25.8
import { documentTemplateStyleService, type DocumentType } from '@/services/document-template-style-service'; // v0.25.8
import { mockApprovalComments } from '@/data/mockApprovalComments';
import { getMockApprovalRequest } from '@/lib/mock-approval-data'; // v0.13.52
import type { ElectronicSignature } from '@/types/signature';

interface DocumentViewerProps {
  document: EnterpriseDocument;
  onClose: () => void;
  onVersionSelect?: (versionId: string) => void;
  onCreateVersion?: () => void;
  onCompareVersions?: (fromVersionId: string, toVersionId: string) => void;
  onRequestApproval?: (request: ApprovalRequestData) => void;
  onSign?: (signature: ElectronicSignature) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  /** v0.125.97: When true, renders side-by-side review layout with approval panel */
  reviewMode?: boolean;
  /** The approval request ID driving this review session */
  approvalRequestId?: string;
  /** Callback when reviewer submits approve/reject/revise verdict */
  onReviewVerdict?: (verdict: 'approved' | 'rejected' | 'revision-requested', comment: string, signature: ElectronicSignature | null) => void;
}

// v0.13.44: State for version comparison
interface VersionCompareState {
  fromVersionId: string;
  toVersionId: string;
}

// v0.25.8: Added 'pdf' tab as default view mode per requirement
type ViewerTab = 'pdf' | 'content' | 'versions' | 'metadata' | 'links' | 'approval';

// Simulated document content sections for demo
const getDocumentContent = (doc: EnterpriseDocument): DocumentSection[] => {
  const title = doc.title.toLowerCase();
  
  if (title.includes('investigator') && title.includes('brochure')) {
    return [
      { id: 'sec-1', number: '1', title: 'Summary', level: 1, content: 'This Investigator\'s Brochure (IB) provides comprehensive information about LIG-2847 (Nexavant), a selective JAK1 inhibitor being developed for the treatment of moderate-to-severe rheumatoid arthritis.' },
      { id: 'sec-2', number: '2', title: 'Introduction', level: 1, content: 'LIG-2847 is an orally administered, selective Janus kinase 1 (JAK1) inhibitor with demonstrated efficacy in preclinical models of inflammatory arthritis.' },
      { id: 'sec-3', number: '3', title: 'Physical, Chemical, and Pharmaceutical Properties', level: 1, children: [
        { id: 'sec-3-1', number: '3.1', title: 'Drug Substance', level: 2, content: 'LIG-2847 is a white to off-white crystalline powder with molecular formula C₂₄H₂₈N₆O₂ and molecular weight of 432.52 g/mol.' },
        { id: 'sec-3-2', number: '3.2', title: 'Drug Product', level: 2, content: 'LIG-2847 is formulated as immediate-release tablets containing 50 mg or 100 mg of active ingredient.' },
      ]},
      { id: 'sec-4', number: '4', title: 'Nonclinical Studies', level: 1, children: [
        { id: 'sec-4-1', number: '4.1', title: 'Pharmacology', level: 2, content: 'LIG-2847 demonstrated selective inhibition of JAK1 with IC50 of 2.3 nM, showing >50-fold selectivity over JAK2, JAK3, and TYK2.' },
        { id: 'sec-4-2', number: '4.2', title: 'Pharmacokinetics', level: 2, content: 'Oral bioavailability of 68% in rats and 72% in dogs. Half-life approximately 8-12 hours across species.' },
        { id: 'sec-4-3', number: '4.3', title: 'Toxicology', level: 2, content: 'No treatment-related mortality in 13-week repeat-dose studies in rats (up to 300 mg/kg/day) or dogs (up to 100 mg/kg/day).' },
      ]},
      { id: 'sec-5', number: '5', title: 'Clinical Studies', level: 1, children: [
        { id: 'sec-5-1', number: '5.1', title: 'Human Pharmacokinetics', level: 2, content: 'Dose-proportional PK from 25 mg to 200 mg. Mean half-life 10.2 hours. Cmax achieved in 1-2 hours.' },
        { id: 'sec-5-2', number: '5.2', title: 'Efficacy', level: 2, content: 'Phase 2b study (n=420) demonstrated ACR20 response rates of 62% (50mg BID) and 71% (100mg BID) vs 28% placebo at Week 12.' },
        { id: 'sec-5-3', number: '5.3', title: 'Safety', level: 2, content: 'Most common AEs: upper respiratory tract infection (12%), nasopharyngitis (8%), headache (7%). No serious infections or MACE reported.' },
      ]},
      { id: 'sec-6', number: '6', title: 'Summary of Data and Guidance for Investigators', level: 1, content: 'LIG-2847 has demonstrated favorable safety and efficacy profiles supporting advancement to Phase 3. Starting dose recommendation: 100 mg BID.' },
    ];
  }
  
  if (title.includes('clinical study report') || title.includes('csr')) {
    return [
      { id: 'sec-1', number: '1', title: 'Synopsis', level: 1, content: 'A Phase 3, randomized, double-blind, placebo-controlled study evaluating the efficacy and safety of LIG-2847 in patients with moderate-to-severe rheumatoid arthritis.' },
      { id: 'sec-2', number: '2', title: 'Introduction', level: 1, content: 'Rheumatoid arthritis (RA) is a chronic inflammatory disease affecting approximately 1% of the global population. JAK inhibitors represent a novel therapeutic approach.' },
      { id: 'sec-3', number: '3', title: 'Study Objectives', level: 1, children: [
        { id: 'sec-3-1', number: '3.1', title: 'Primary Objective', level: 2, content: 'To evaluate the efficacy of LIG-2847 compared to placebo in achieving ACR20 response at Week 12.' },
        { id: 'sec-3-2', number: '3.2', title: 'Secondary Objectives', level: 2, content: 'To assess ACR50/70 response, DAS28-CRP change, HAQ-DI improvement, and radiographic progression.' },
      ]},
      { id: 'sec-4', number: '4', title: 'Methods', level: 1, children: [
        { id: 'sec-4-1', number: '4.1', title: 'Study Design', level: 2, content: '52-week study with 24-week double-blind period followed by 28-week open-label extension.' },
        { id: 'sec-4-2', number: '4.2', title: 'Study Population', level: 2, content: 'Adults 18-75 years with moderate-to-severe RA (DAS28-CRP ≥3.2) inadequately responding to MTX.' },
        { id: 'sec-4-3', number: '4.3', title: 'Statistical Methods', level: 2, content: 'Primary analysis using NRI. Sample size of 600 patients provides 90% power at α=0.05.' },
      ]},
      { id: 'sec-5', number: '5', title: 'Results', level: 1, children: [
        { id: 'sec-5-1', number: '5.1', title: 'Disposition', level: 2, content: '612 patients randomized (204 per arm). Completion rate 89% in treatment arms vs 76% placebo.' },
        { id: 'sec-5-2', number: '5.2', title: 'Efficacy Results', level: 2, content: 'ACR20 at Week 12: 67.2% (100mg BID) vs 25.5% placebo (p<0.0001). All secondary endpoints met.' },
        { id: 'sec-5-3', number: '5.3', title: 'Safety Results', level: 2, content: 'TEAEs: 58% treatment vs 42% placebo. SAEs: 4.2% vs 3.8%. No deaths during study.' },
      ]},
      { id: 'sec-6', number: '6', title: 'Discussion', level: 1, content: 'LIG-2847 demonstrated robust efficacy across all endpoints with a favorable safety profile consistent with the JAK inhibitor class.' },
      { id: 'sec-7', number: '7', title: 'Conclusions', level: 1, content: 'LIG-2847 100mg BID is effective and well-tolerated for the treatment of moderate-to-severe RA, supporting regulatory submission.' },
    ];
  }
  
  if (title.includes('dsur')) {
    return [
      { id: 'sec-1', number: '1', title: 'Executive Summary', level: 1, content: 'This Development Safety Update Report covers the period December 20, 2023 to December 19, 2024 for LIG-2847 (Nexavant).' },
      { id: 'sec-2', number: '2', title: 'Introduction', level: 1, content: 'LIG-2847 is currently in Phase 3 development for rheumatoid arthritis. This is the fourth annual DSUR since the first patient enrolled.' },
      { id: 'sec-3', number: '3', title: 'Worldwide Marketing Approvals', level: 1, content: 'LIG-2847 has not yet received marketing approval in any region.' },
      { id: 'sec-4', number: '4', title: 'Update to Reference Safety Information', level: 1, content: 'The Investigator\'s Brochure v3.1 (dated September 2024) serves as the reference safety information.' },
      { id: 'sec-5', number: '5', title: 'Estimated Patient Exposure', level: 1, content: 'Cumulative exposure: 2,847 subjects in clinical trials (1,892 patient-years). Reporting period: 1,124 subjects newly exposed.' },
      { id: 'sec-6', number: '6', title: 'Summary of Safety Concerns', level: 1, children: [
        { id: 'sec-6-1', number: '6.1', title: 'Important Identified Risks', level: 2, content: 'Serious infections, herpes zoster reactivation, lymphopenia.' },
        { id: 'sec-6-2', number: '6.2', title: 'Important Potential Risks', level: 2, content: 'Malignancy, major adverse cardiovascular events, venous thromboembolism.' },
        { id: 'sec-6-3', number: '6.3', title: 'Missing Information', level: 2, content: 'Long-term safety beyond 52 weeks, use in pregnancy, pediatric population.' },
      ]},
      { id: 'sec-7', number: '7', title: 'Signal Evaluation', level: 1, content: 'No new safety signals identified during the reporting period. Ongoing monitoring of hepatotoxicity signal from previous period.' },
      { id: 'sec-8', number: '8', title: 'Overall Safety Assessment', level: 1, content: 'The benefit-risk profile of LIG-2847 remains favorable. No changes to ongoing clinical trials are recommended.' },
    ];
  }
  
  if (title.includes('module 2.5') || title.includes('clinical overview')) {
    return [
      { id: 'sec-1', number: '1', title: 'Product Development Rationale', level: 1, content: 'LIG-2847 was developed to address the need for oral, targeted therapies in RA with improved selectivity over first-generation JAK inhibitors.' },
      { id: 'sec-2', number: '2', title: 'Overview of Biopharmaceutics', level: 1, content: 'LIG-2847 demonstrates favorable oral bioavailability (72%), rapid absorption (Tmax 1-2h), and dose-proportional pharmacokinetics.' },
      { id: 'sec-3', number: '3', title: 'Overview of Clinical Pharmacology', level: 1, children: [
        { id: 'sec-3-1', number: '3.1', title: 'Pharmacokinetics', level: 2, content: 'Once-daily and twice-daily dosing regimens evaluated. BID dosing selected for Phase 3 based on exposure-response modeling.' },
        { id: 'sec-3-2', number: '3.2', title: 'Pharmacodynamics', level: 2, content: 'Dose-dependent suppression of phospho-STAT observed, correlating with clinical efficacy.' },
      ]},
      { id: 'sec-4', number: '4', title: 'Overview of Efficacy', level: 1, content: 'Two pivotal Phase 3 trials demonstrated superiority over placebo (NEXUS-1) and non-inferiority to adalimumab (NEXUS-2).' },
      { id: 'sec-5', number: '5', title: 'Overview of Safety', level: 1, content: 'Safety profile consistent with JAK inhibitor class. Key risks include serious infections and herpes zoster. Risk mitigation through patient selection and monitoring.' },
      { id: 'sec-6', number: '6', title: 'Benefit-Risk Conclusions', level: 1, content: 'LIG-2847 offers a positive benefit-risk balance for patients with moderate-to-severe RA who have inadequately responded to conventional DMARDs.' },
    ];
  }
  
  if (title.includes('risk management') || title.includes('rmp')) {
    return [
      { id: 'sec-1', number: '1', title: 'Product Overview', level: 1, content: 'Risk Management Plan for LIG-2847 (Nexavant) for the treatment of moderate-to-severe rheumatoid arthritis.' },
      { id: 'sec-2', number: '2', title: 'Safety Specification', level: 1, children: [
        { id: 'sec-2-1', number: '2.1', title: 'Important Identified Risks', level: 2, content: 'Serious infections, herpes zoster, lymphopenia, hepatotoxicity, hyperlipidemia.' },
        { id: 'sec-2-2', number: '2.2', title: 'Important Potential Risks', level: 2, content: 'Malignancy, MACE, VTE, GI perforation.' },
        { id: 'sec-2-3', number: '2.3', title: 'Missing Information', level: 2, content: 'Use in pregnancy/lactation, pediatric use, long-term safety.' },
      ]},
      { id: 'sec-3', number: '3', title: 'Pharmacovigilance Plan', level: 1, content: 'Routine pharmacovigilance activities plus additional monitoring for malignancy and cardiovascular events.' },
      { id: 'sec-4', number: '4', title: 'Risk Minimization Measures', level: 1, children: [
        { id: 'sec-4-1', number: '4.1', title: 'Routine Measures', level: 2, content: 'SmPC sections 4.2, 4.3, 4.4, 4.8. Patient Information Leaflet.' },
        { id: 'sec-4-2', number: '4.2', title: 'Additional Measures', level: 2, content: 'Healthcare Professional Educational Materials, Patient Alert Card.' },
      ]},
      { id: 'sec-5', number: '5', title: 'Summary of Activities', level: 1, content: 'Implementation timeline for risk minimization activities and milestones for plan updates.' },
    ];
  }
  
  if (title.includes('uspi') || title.includes('prescribing information')) {
    return [
      { id: 'sec-hl', number: '', title: 'HIGHLIGHTS OF PRESCRIBING INFORMATION', level: 1, content: 'NEXAVANT (LIG-2847) tablets, for oral use. Initial U.S. Approval: 2024' },
      { id: 'sec-bb', number: '', title: 'BOXED WARNING', level: 1, content: 'SERIOUS INFECTIONS, MALIGNANCIES, MAJOR ADVERSE CARDIOVASCULAR EVENTS, AND THROMBOSIS' },
      { id: 'sec-1', number: '1', title: 'INDICATIONS AND USAGE', level: 1, content: 'NEXAVANT is indicated for the treatment of adults with moderately to severely active rheumatoid arthritis who have had an inadequate response to one or more DMARDs.' },
      { id: 'sec-2', number: '2', title: 'DOSAGE AND ADMINISTRATION', level: 1, children: [
        { id: 'sec-2-1', number: '2.1', title: 'Recommended Dosage', level: 2, content: 'The recommended dose is 100 mg administered orally twice daily with or without food.' },
        { id: 'sec-2-2', number: '2.2', title: 'Dose Modifications', level: 2, content: 'Reduce to 50 mg twice daily for moderate hepatic impairment or strong CYP3A4 inhibitor use.' },
      ]},
      { id: 'sec-3', number: '3', title: 'DOSAGE FORMS AND STRENGTHS', level: 1, content: 'Tablets: 50 mg and 100 mg' },
      { id: 'sec-4', number: '4', title: 'CONTRAINDICATIONS', level: 1, content: 'Hypersensitivity to LIG-2847 or any excipient.' },
      { id: 'sec-5', number: '5', title: 'WARNINGS AND PRECAUTIONS', level: 1, children: [
        { id: 'sec-5-1', number: '5.1', title: 'Serious Infections', level: 2, content: 'Serious and sometimes fatal infections have been reported. Do not initiate during active infection.' },
        { id: 'sec-5-2', number: '5.2', title: 'Malignancy and Lymphoproliferative Disorders', level: 2, content: 'Malignancies were observed in clinical trials. Consider risks and benefits.' },
      ]},
    ];
  }
  
  // Default generic structure
  return [
    { id: 'sec-1', number: '1', title: 'Overview', level: 1, content: `${doc.description || 'Document overview and purpose.'}` },
    { id: 'sec-2', number: '2', title: 'Background', level: 1, content: 'Background information and context for this document.' },
    { id: 'sec-3', number: '3', title: 'Main Content', level: 1, content: 'Primary content and findings of this document.' },
    { id: 'sec-4', number: '4', title: 'Conclusions', level: 1, content: 'Summary and conclusions drawn from the content.' },
    { id: 'sec-5', number: '5', title: 'References', level: 1, content: 'Referenced materials and sources.' },
  ];
};

interface DocumentSection {
  id: string;
  number: string;
  title: string;
  level: number;
  content?: string;
  children?: DocumentSection[];
}

export function DocumentViewer({ 
  document, 
  onClose, 
  onVersionSelect,
  onCreateVersion,
  onCompareVersions,
  onRequestApproval,
  onSign,
  isFullscreen = false,
  onToggleFullscreen,
  reviewMode = false,
  approvalRequestId,
  onReviewVerdict,
}: DocumentViewerProps) {
  const toast = useToast();
  // v0.25.8: Changed default to 'pdf'
  const [activeTab, setActiveTab] = useState<ViewerTab>('pdf');
  // v0.125.97: Review mode state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewVerdict, setReviewVerdict] = useState<'approved' | 'rejected' | 'revision-requested' | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showReviewSignature, setShowReviewSignature] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [showToc, setShowToc] = useState(true);
  
  // v0.13.44: Version comparison state
  const [versionCompare, setVersionCompare] = useState<VersionCompareState | null>(null);
  
  // v0.13.45: Approval request state
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  
  // v0.13.48: Comments panel state
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  
  // v0.13.49: Signature modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  const documentContent = useMemo(() => getDocumentContent(document), [document]);
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(sectionId) ? next.delete(sectionId) : next.add(sectionId);
      return next;
    });
  };
  
  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (sections: DocumentSection[]) => {
      sections.forEach(s => {
        if (s.children) {
          allIds.add(s.id);
          collectIds(s.children);
        }
      });
    };
    collectIds(documentContent);
    setExpandedSections(allIds);
  };
  
  const collapseAll = () => setExpandedSections(new Set());
  
  const handleVersionClick = (version: DocumentVersionRef) => {
    setSelectedVersion(version.versionId);
    if (onVersionSelect) onVersionSelect(version.versionId);
  };
  
  // v0.13.44: Handler to open version comparison
  const handleCompareVersion = useCallback((fromVersionId: string) => {
    setVersionCompare({
      fromVersionId,
      toVersionId: 'current', // Compare to current version by default
    });
    if (onCompareVersions) {
      onCompareVersions(fromVersionId, 'current');
    }
  }, [onCompareVersions]);
  
  // v0.13.44: Handler to swap versions in comparison
  const handleSwapVersions = useCallback(() => {
    if (versionCompare) {
      setVersionCompare({
        fromVersionId: versionCompare.toVersionId,
        toVersionId: versionCompare.fromVersionId,
      });
    }
  }, [versionCompare]);
  
  // v0.13.44: Close version comparison
  const handleCloseDiff = useCallback(() => {
    setVersionCompare(null);
  }, []);
  
  // v0.13.45: Handle approval request submission
  const handleApprovalSubmit = useCallback((request: ApprovalRequestData) => {
    if (onRequestApproval) {
      onRequestApproval(request);
    }
    setShowApprovalPanel(false);
  }, [onRequestApproval]);
  
  // v0.13.48: Comment handlers
  const handleAddComment = useCallback((content: string, _parentId?: string, _commentType?: string) => {
    if (content?.trim()) {
      toast.success('Comment added');
    }
  }, [toast]);

  const handleResolveComment = useCallback((_commentId: string) => {
    toast.success('Comment resolved');
  }, [toast]);

  const handleAddressComment = useCallback((_commentId: string, _response: string) => {
    toast.success('Comment addressed');
  }, [toast]);

  const handleCloseComment = useCallback((_commentId: string) => {
    toast.info('Comment closed');
  }, [toast]);
  
  // v0.13.49: Signature handler
  const handleSign = useCallback((signature: ElectronicSignature) => {
    setShowSignatureModal(false);
    toast.success('Document signed successfully');
    if (onSign) {
      onSign(signature);
    }
  }, [onSign, toast]);
  
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  // ── v0.125.97: REVIEW MODE — side-by-side layout ──────────────────────────
  if (reviewMode) {
    const approvalRequest = getMockApprovalRequest('in-progress');
    const verdictConfig = {
      'approved':           { label: 'Approve',         color: 'bg-emerald-500 hover:bg-emerald-600 text-white', icon: '✓' },
      'rejected':           { label: 'Reject',          color: 'bg-red-500 hover:bg-red-600 text-white',         icon: '✗' },
      'revision-requested': { label: 'Request Revision', color: 'bg-amber-500 hover:bg-amber-600 text-white',     icon: '↺' },
    } as const;

    const handleSubmitVerdict = (sig: ElectronicSignature | null) => {
      if (!reviewVerdict) return;
      setReviewSubmitted(true);
      setShowReviewSignature(false);
      if (onReviewVerdict) onReviewVerdict(reviewVerdict, reviewComment, sig);
    };

    return (
      <div className={`flex flex-col bg-surface-elevated ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
        {/* Review header bar */}
        <div className="flex-none border-b border-border bg-surface px-4 py-2.5 flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="p-1.5 bg-amber-500/20 rounded-lg">
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Review Mode</span>
              <span className="text-text-muted">·</span>
              <span className="text-sm font-medium text-text-primary truncate">{document.title}</span>
              <span className="text-text-muted">·</span>
              <span className="text-xs text-text-muted">v{document.version}</span>
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {approvalRequest?.requesterName} requested your approval
              {approvalRequest?.dueDate && ` · Due ${formatDate(approvalRequest.dueDate)}`}
            </div>
          </div>
          {getDocumentStatusBadge(document.status)}
          {getClassificationBadge(document.classification)}
          {onToggleFullscreen && (
            <button onClick={onToggleFullscreen} className="p-1.5 rounded text-text-muted hover:text-text-primary">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Side-by-side body */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* LEFT — Document */}
          <div className="flex-1 min-w-0 overflow-hidden border-r border-border">
            <PDFDocumentPreview
              documentId={document.documentId}
              documentTitle={document.title}
              documentVersion={document.version}
              documentType={documentTemplateStyleService.detectDocumentType(undefined, document.category, document.customMetadata?.ctdSection as string | undefined)}
              documentStatus={document.status}
              sections={documentContent.map(s => ({
                id: s.id, number: s.number, title: s.title, level: s.level, content: s.content,
                children: s.children?.map(c => ({ id: c.id, number: c.number, title: c.title, level: c.level, content: c.content })),
              }))}
              authorName={document.authorName}
              authorDepartment={document.ownerDepartment}
              effectiveDate={document.effectiveDate}
              securityClassification={document.securityClassification}
              productName={document.customMetadata?.productName as string | undefined}
              defaultViewMode="pdf"
              allowViewModeSwitch={true}
              showToolbar={true}
              showPageInfo={true}
              onClose={onClose}
              onDownload={() => {}}
              onPrint={() => window.print()}
            />
          </div>

          {/* RIGHT — Review panel */}
          <div className="w-[380px] flex-shrink-0 flex flex-col overflow-hidden bg-surface">

            {/* Approval chain */}
            <div className="flex-none border-b border-border p-4">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Approval Chain</div>
              <div className="space-y-2">
                {(approvalRequest?.approvalSteps || []).map((step, i) => {
                  const done = step.status === 'approved' || step.status === 'completed';
                  const active = step.status === 'in-progress' || step.status === 'pending';
                  return (
                    <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${done ? 'bg-emerald-500/8 border border-emerald-500/20' : active ? 'bg-accent-blue/8 border border-accent-blue/30' : 'bg-surface-card border border-border'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${done ? 'bg-emerald-500 text-white' : active ? 'bg-accent-blue text-white' : 'bg-surface-elevated text-text-muted border border-border'}`}>
                        {done ? '✓' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${done ? 'text-emerald-400' : active ? 'text-text-primary' : 'text-text-muted'}`}>
                          {step.assignedUserName || step.assignedGroupName || (step.assignedRole as string) || step.name}
                        </div>
                        <div className="text-text-muted capitalize">{step.assignmentType} · {step.status}</div>
                      </div>
                      {step.completedAt && (
                        <div className="text-text-muted flex-shrink-0">{formatDate(step.completedAt)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Comments</div>
              {mockApprovalComments.slice(0, 4).map((c: any) => (
                <div key={c.id} className="p-3 rounded-lg bg-surface-card border border-border">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px] font-bold text-accent-blue flex-shrink-0">
                      {(c.authorName || 'U')[0]}
                    </div>
                    <span className="text-xs font-medium text-text-primary">{c.authorName}</span>
                    <span className="text-[10px] text-text-muted ml-auto">{formatDate(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{c.content}</p>
                </div>
              ))}

              {/* Add comment */}
              <div className="pt-2">
                <textarea
                  placeholder="Add a review comment…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>
            </div>

            {/* Verdict controls */}
            {!reviewSubmitted ? (
              <div className="flex-none border-t border-border p-4 space-y-3">
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Your Verdict</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['approved', 'rejected', 'revision-requested'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setReviewVerdict(reviewVerdict === v ? null : v)}
                      className={`px-2 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        reviewVerdict === v
                          ? verdictConfig[v].color + ' border-transparent'
                          : 'bg-surface-card border-border text-text-secondary hover:border-border-hover'
                      }`}
                    >
                      <div className="text-lg leading-none mb-0.5">{verdictConfig[v].icon}</div>
                      {verdictConfig[v].label}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!reviewVerdict}
                  onClick={() => setShowReviewSignature(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <PenTool className="w-4 h-4" />
                  Sign &amp; Submit
                </button>
                <p className="text-[10px] text-text-muted text-center">
                  21 CFR Part 11.50 — e-signature required. SHA-256 bound to document v{document.version}.
                </p>
              </div>
            ) : (
              <div className="flex-none border-t border-border p-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  reviewVerdict === 'approved' ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : reviewVerdict === 'rejected' ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-amber-500/10 border border-amber-500/30'
                }`}>
                  <CheckCircle className={`w-5 h-5 flex-shrink-0 ${
                    reviewVerdict === 'approved' ? 'text-emerald-400'
                    : reviewVerdict === 'rejected' ? 'text-red-400'
                    : 'text-amber-400'
                  }`} />
                  <div>
                    <div className={`text-sm font-semibold ${
                      reviewVerdict === 'approved' ? 'text-emerald-400'
                      : reviewVerdict === 'rejected' ? 'text-red-400'
                      : 'text-amber-400'
                    }`}>
                      {reviewVerdict === 'approved' ? 'Approved' : reviewVerdict === 'rejected' ? 'Rejected' : 'Revision Requested'}
                    </div>
                    <div className="text-xs text-text-muted">Signed &amp; submitted · {new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature modal for review verdict */}
        <SignatureCapture
          documentId={document.id}
          documentVersionId={document.versionHistory[0]?.versionId || document.id}
          documentTitle={document.title}
          documentVersion={document.version}
          signerId="user-sarah-chen"
          signerName="Dr. Sarah Chen"
          signerEmail="sarah.chen@ligature.bio"
          signerTitle="VP Regulatory Affairs"
          signerDepartment="Regulatory"
          allowedMeanings={reviewVerdict === 'approved' ? ['approval'] : reviewVerdict === 'rejected' ? ['rejection'] : ['revision-request']}
          requireAuthentication={true}
          authenticationMethods={['password', 'two-factor']}
          isOpen={showReviewSignature}
          onSign={handleSubmitVerdict}
          onCancel={() => setShowReviewSignature(false)}
        />
      </div>
    );
  }
  // ── end review mode ───────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col bg-surface-elevated ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Header */}
      <div className="flex-none border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-accent-blue/20 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 text-accent-blue" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-text-primary truncate">{document.title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted">{document.documentId}</span>
                <span className="text-text-muted">•</span>
                <span className="text-xs text-text-muted">v{document.version}</span>
              </div>
            </div>
          </div>
          {/* Utility icons only */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
            {getDocumentStatusBadge(document.status)}
            {getClassificationBadge(document.classification)}
            <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} />
            <Button variant="ghost" size="sm" icon={<Share2 className="w-4 h-4" />} />
            <Button variant="ghost" size="sm" icon={<Edit className="w-4 h-4" />} />
            {onToggleFullscreen && (
              <Button 
                variant="ghost" 
                size="sm" 
                icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                onClick={onToggleFullscreen}
              />
            )}
            <Button variant="ghost" size="sm" icon={<X className="w-4 h-4" />} onClick={onClose} />
          </div>
        </div>
        
        {/* Action buttons bar */}
        <div className="px-4 py-2 flex items-center gap-2 border-t border-border/50 bg-surface-card/30">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowApprovalPanel(true)}
          >
            <SendHorizontal className="w-4 h-4 mr-1.5" />
            Request Approval
          </Button>
          <Button 
            variant={showCommentsPanel ? 'primary' : 'outline'}
            size="sm" 
            onClick={() => setShowCommentsPanel(true)}
          >
            <MessageSquare className="w-4 h-4 mr-1.5" />
            Comments
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">10</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSignatureModal(true)}
          >
            <PenTool className="w-4 h-4 mr-1.5" />
            Sign
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="px-4 flex items-center gap-1 border-t border-border bg-surface">
          {/* v0.25.8: PDF tab added as first option and default */}
          {(['pdf', 'content', 'versions', 'metadata', 'links', 'approval'] as ViewerTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-accent-blue text-accent-blue' 
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab === 'pdf' && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  PDF View
                </span>
              )}
              {tab === 'content' && 'Content'}
              {tab === 'versions' && `Versions (${document.versionHistory.length + 1})`}
              {tab === 'metadata' && 'Metadata'}
              {tab === 'links' && `Links (${document.linkedModules.length})`}
              {tab === 'approval' && (
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Approval
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* v0.25.8: PDF View Tab - Default view for document viewers */}
        {activeTab === 'pdf' && (
          <div className="flex-1 overflow-hidden">
            <PDFDocumentPreview
              documentId={document.documentId}
              documentTitle={document.title}
              documentVersion={document.version}
              documentType={documentTemplateStyleService.detectDocumentType(
                undefined, 
                document.category, 
                document.customMetadata?.ctdSection as string | undefined
              )}
              documentStatus={document.status}
              sections={documentContent.map(section => ({
                id: section.id,
                number: section.number,
                title: section.title,
                level: section.level,
                content: section.content,
                children: section.children?.map(child => ({
                  id: child.id,
                  number: child.number,
                  title: child.title,
                  level: child.level,
                  content: child.content,
                })),
              }))}
              authorName={document.authorName}
              authorDepartment={document.ownerDepartment}
              effectiveDate={document.effectiveDate}
              securityClassification={document.securityClassification}
              productName={document.customMetadata?.productName as string | undefined}
              defaultViewMode="pdf"
              allowViewModeSwitch={true}
              showToolbar={true}
              showPageInfo={true}
              onClose={onClose}
              onDownload={() => { /* Download */ }}
              onPrint={() => window.print()}
            />
          </div>
        )}

        {activeTab === 'content' && (
          <>
            {/* Table of Contents */}
            {showToc && (
              <div className="hidden lg:flex w-64 border-r border-border bg-surface overflow-y-auto flex-none">
                <div className="p-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Contents</span>
                  <div className="flex items-center gap-1">
                    <button onClick={expandAll} className="p-1 text-text-muted hover:text-text-primary" title="Expand all">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={collapseAll} className="p-1 text-text-muted hover:text-text-primary" title="Collapse all">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <nav className="p-2">
                  <TocItem sections={documentContent} expandedSections={expandedSections} toggleSection={toggleSection} />
                </nav>
              </div>
            )}
            
            {/* Document Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Toolbar */}
              <div className="sticky top-0 bg-surface-elevated border-b border-border px-4 py-2 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="xs" 
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                    onClick={() => setShowToc(!showToc)}
                  >
                    {showToc ? 'Hide TOC' : 'Show TOC'}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="xs" icon={<ZoomOut className="w-3.5 h-3.5" />} onClick={() => setZoom(Math.max(50, zoom - 10))} />
                  <span className="text-xs text-text-muted w-12 text-center">{zoom}%</span>
                  <Button variant="ghost" size="xs" icon={<ZoomIn className="w-3.5 h-3.5" />} onClick={() => setZoom(Math.min(200, zoom + 10))} />
                  <Button variant="ghost" size="xs" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setZoom(100)} />
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button variant="ghost" size="xs" icon={<Printer className="w-3.5 h-3.5" />} />
                </div>
              </div>
              
              {/* Document Body */}
              <div className="p-8 max-w-4xl mx-auto" style={{ fontSize: `${zoom}%` }}>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 min-h-[800px]">
                  {/* Document Title Page */}
                  <div className="text-center mb-12 pb-8 border-b border-slate-200">
                    <div className="text-sm text-slate-500 mb-2">{document.documentId}</div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-4">{document.title}</h1>
                    <div className="text-sm text-slate-600">
                      <p>Version {document.version}</p>
                      <p className="mt-1">Effective: {document.effectiveDate ? formatDate(document.effectiveDate) : 'Pending'}</p>
                      <p className="mt-1">Owner: {document.ownerName} | {document.ownerDepartment}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {document.securityClassification !== 'public' && (
                        <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded">
                          {document.securityClassification.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Document Sections */}
                  <div className="space-y-8">
                    {documentContent.map(section => (
                      <SectionContent key={section.id} section={section} depth={0} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'versions' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* v0.13.43: Create Version Button */}
              {onCreateVersion && (
                <Button
                  variant="secondary"
                  icon={<GitBranch className="w-4 h-4" />}
                  onClick={onCreateVersion}
                  className="w-full"
                >
                  Create New Version
                </Button>
              )}
              
              {/* Current Version */}
              <div className="p-4 rounded-lg border-2 border-accent-blue bg-accent-blue/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-text-primary">v{document.version}</span>
                    <Badge color="blue" size="sm">Current</Badge>
                    {getDocumentStatusBadge(document.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />}>View</Button>
                    <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} />
                  </div>
                </div>
                <p className="text-sm text-text-secondary">Current effective version</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                  <span>{document.authorName}</span>
                  <span>•</span>
                  <span>{formatDate(document.updatedAt)}</span>
                </div>
              </div>
              
              {/* Version History */}
              {document.versionHistory.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Version History</h3>
                  {[...document.versionHistory].reverse().map((version, idx) => (
                    <div 
                      key={version.versionId}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedVersion === version.versionId 
                          ? 'border-accent-blue bg-accent-blue/5' 
                          : 'border-border bg-surface-card hover:border-border-hover'
                      }`}
                      onClick={() => handleVersionClick(version)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">v{version.version}</span>
                          {getDocumentStatusBadge(version.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="xs" icon={<Eye className="w-3.5 h-3.5" />}>View</Button>
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompareVersion(version.versionId);
                            }}
                          >
                            Compare
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary">{version.changeDescription}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span>{version.createdBy}</span>
                        <span>•</span>
                        <span>{formatDate(version.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'metadata' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <MetadataSection title="Document Information">
                <MetadataRow label="Document ID" value={document.documentId} />
                <MetadataRow label="Title" value={document.title} />
                <MetadataRow label="Category" value={document.category} />
                <MetadataRow label="Classification" value={document.classification} />
                <MetadataRow label="Format" value={document.fileFormat.toUpperCase()} />
                <MetadataRow label="Language" value={document.language} />
              </MetadataSection>
              
              <MetadataSection title="Version & Status">
                <MetadataRow label="Version" value={document.version} />
                <MetadataRow label="Status" value={document.status} />
                {document.effectiveDate && <MetadataRow label="Effective Date" value={formatDate(document.effectiveDate)} />}
              </MetadataSection>
              
              <MetadataSection title="Ownership">
                <MetadataRow label="Owner" value={document.ownerName} />
                <MetadataRow label="Department" value={document.ownerDepartment} />
                <MetadataRow label="Author" value={document.authorName} />
              </MetadataSection>
              
              <MetadataSection title="Security & Retention">
                <MetadataRow label="Security Classification" value={document.securityClassification} />
                <MetadataRow label="Archive Status" value={document.archiveStatus} />
                <MetadataRow label="Retention Period" value={`${document.retentionPeriodYears} years`} />
              </MetadataSection>
              
              {document.tags.length > 0 && (
                <MetadataSection title="Tags">
                  <div className="flex flex-wrap gap-1.5">
                    {document.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-surface rounded text-xs text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </MetadataSection>
              )}
              
              <MetadataSection title="Audit Trail">
                <MetadataRow label="Created" value={`${formatDate(document.createdAt)} by ${document.createdBy}`} />
                <MetadataRow label="Last Modified" value={`${formatDate(document.updatedAt)} by ${document.lastModifiedBy}`} />
              </MetadataSection>
            </div>
          </div>
        )}
        
        {activeTab === 'links' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {document.linkedModules.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Linked Modules</h3>
                  {document.linkedModules.map(link => (
                    <div key={link.id} className="p-4 rounded-lg border border-border bg-surface-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-accent-blue/10 rounded">
                            <Link2 className="w-4 h-4 text-accent-blue" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{link.moduleEntityName}</p>
                            <p className="text-xs text-text-muted">{link.moduleType} • {link.linkType}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Navigate</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted">
                  <Link2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No linked modules</p>
                  <p className="text-sm mt-1">This document is not linked to any other modules</p>
                </div>
              )}
              
              {document.relatedDocumentIds.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Related Documents</h3>
                  <p className="text-sm text-text-secondary">{document.relatedDocumentIds.length} related document(s)</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* v0.13.52: Approval Status Tab */}
        {activeTab === 'approval' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <ApprovalStatusDashboard
                request={getMockApprovalRequest('in-progress')}
                showTimeline={true}
                showComments={true}
                onViewDocument={() => setActiveTab('pdf')}
                onAddComment={() => setShowCommentsPanel(true)}
                onViewFullAudit={() => { /* View audit */ }}
                onEscalate={() => { /* Escalate */ }}
                onCancel={() => { /* Cancel */ }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* v0.13.44: Version Diff Viewer Overlay */}
      {versionCompare && (
        <div className="absolute inset-0 bg-surface-elevated z-20">
          <VersionDiffViewer
            document={document}
            fromVersionId={versionCompare.fromVersionId}
            toVersionId={versionCompare.toVersionId}
            onClose={handleCloseDiff}
            onSwapVersions={handleSwapVersions}
            onExportDiff={() => { /* Export diff */ }}
          />
        </div>
      )}
      
      {/* v0.13.45: Approval Request Panel Overlay */}
      {showApprovalPanel && (
        <div className="absolute inset-0 bg-surface-elevated z-20">
          <ApprovalRequestPanel
            document={document}
            onClose={() => setShowApprovalPanel(false)}
            onSubmit={handleApprovalSubmit}
          />
        </div>
      )}
      
      {/* v0.13.48: Comments Panel Slide-out */}
      <CommentsPanel
        approvalRequestId="apr-001"
        currentUserId="user-sarah-chen"
        documentTitle={document.title}
        isOpen={showCommentsPanel}
        onClose={() => setShowCommentsPanel(false)}
        onAddComment={handleAddComment}
        onResolveComment={handleResolveComment}
        onAddressComment={handleAddressComment}
        onCloseComment={handleCloseComment}
        comments={mockApprovalComments}
        position="right"
        size="md"
      />
      
      {/* v0.13.49: Signature Capture Modal */}
      <SignatureCapture
        documentId={document.id}
        documentVersionId={document.versionHistory[0]?.versionId || document.id}
        documentTitle={document.title}
        documentVersion={document.version}
        signerId="user-sarah-chen"
        signerName="Dr. Sarah Chen"
        signerEmail="sarah.chen@ligature.bio"
        signerTitle="Medical Director"
        signerDepartment="Clinical Development"
        allowedMeanings={['approval', 'review', 'verification', 'rejection', 'revision-request']}
        requireAuthentication={true}
        authenticationMethods={['password', 'two-factor']}
        isOpen={showSignatureModal}
        onSign={handleSign}
        onCancel={() => setShowSignatureModal(false)}
      />
    </div>
  );
}

// Helper Components

function TocItem({ 
  sections, 
  expandedSections, 
  toggleSection,
  depth = 0 
}: { 
  sections: DocumentSection[]; 
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className={`space-y-0.5 ${depth > 0 ? 'ml-3 mt-1' : ''}`}>
      {sections.map(section => (
        <li key={section.id}>
          <button
            onClick={() => section.children && toggleSection(section.id)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-card rounded transition-colors text-left"
          >
            {section.children ? (
              expandedSections.has(section.id) ? (
                <ChevronDown className="w-3 h-3 text-text-muted flex-none" />
              ) : (
                <ChevronRight className="w-3 h-3 text-text-muted flex-none" />
              )
            ) : (
              <span className="w-3" />
            )}
            <span className="text-text-muted text-xs w-6 flex-none">{section.number}</span>
            <span className="truncate">{section.title}</span>
          </button>
          {section.children && expandedSections.has(section.id) && (
            <TocItem 
              sections={section.children} 
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function SectionContent({ section, depth }: { section: DocumentSection; depth: number }) {
  const HeadingTag = depth === 0 ? 'h2' : depth === 1 ? 'h3' : 'h4';
  const headingClass = depth === 0 
    ? 'text-xl font-bold text-slate-900' 
    : depth === 1 
      ? 'text-lg font-semibold text-slate-800'
      : 'text-base font-medium text-slate-700';
  
  return (
    <div className={depth > 0 ? 'mt-4' : ''}>
      <HeadingTag className={`${headingClass} mb-3`}>
        {section.number && <span className="text-slate-400 mr-2">{section.number}</span>}
        {section.title}
      </HeadingTag>
      {section.content && (
        <p className="text-slate-600 leading-relaxed">{section.content}</p>
      )}
      {section.children && (
        <div className="mt-4 space-y-4">
          {section.children.map(child => (
            <SectionContent key={child.id} section={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetadataSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm text-text-primary capitalize">{value}</span>
    </div>
  );
}
