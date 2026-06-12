



import { useState, useMemo } from 'react';
import {
  FileText, ChevronRight, ChevronLeft, Check, Clock, AlertCircle, AlertTriangle,
  Search, Building2, FlaskConical, Users, Calendar, Link2, Sparkles, CheckCircle,
  X, Info, ExternalLink, Layers, Target, BookOpen, LayoutGrid, Filter
} from 'lucide-react';
import { TemplateBrowser } from '@/components/templates/TemplateBrowser';
import { DocumentTemplate as ECTDTemplate } from '@/data/ectd-document-templates';
import { templateUsageTrackingService } from '@/services/template-usage-tracking-service';
import { allDocumentTemplates, authoringDocuments, componentLibrary, countTotalSections } from '@/data/authoring-data';
import { AuthoringDocument, DocumentTemplate, DocumentType, Prerequisite, DocumentSection, TemplateSectionDefinition } from '@/types/authoring';

type WizardStep = 'type' | 'context' | 'prerequisites' | 'sources' | 'options' | 'review';

export type AIAuthoringMode = 'section' | 'reuse' | 'document';

interface NewDocumentWizardProps {
  onCancel: () => void;
  onComplete: (doc: AuthoringDocument, aiMode: AIAuthoringMode) => void;
}

// Convert template sections to document sections recursively
function templateSectionsToDocumentSections(
  templateSections: TemplateSectionDefinition[],
  baseLevel: number = 1
): DocumentSection[] {
  return templateSections.map((tplSec, idx) => {
    const section: DocumentSection = {
      id: `sec-${tplSec.id}-${Date.now()}-${idx}`,
      number: tplSec.number,
      title: tplSec.title,
      level: tplSec.level || baseLevel,
      status: 'not-started',
      progress: 0,
      content: tplSec.defaultContent || '',
      contentBlocks: [],
      wordCount: 0,
      comments: [],
      hasUnresolvedComments: false,
      sourceLinks: [],
      tflLinks: [],
      required: tplSec.required,
      guidance: tplSec.guidance,
      aiPrompt: (tplSec as any).aiPrompt,
      wordCountTarget: (tplSec as any).wordCountTarget,
      templateContent: tplSec.defaultContent,
    };
    
    // Recursively convert subsections
    if (tplSec.subsections && tplSec.subsections.length > 0) {
      section.subsections = templateSectionsToDocumentSections(
        tplSec.subsections,
        baseLevel + 1
      );
    }
    
    return section;
  });
}

// Mock data for context selection
const programs = [
  { id: 'nexagen', name: 'NEXAGEN HCC Program', product: 'NEXAGEN (nexafenib)', ta: 'Oncology' },
  { id: 'prog-2847', name: 'LIG-2847 Oncology Program', product: 'LIG-2847 (ligrastinib)', ta: 'Oncology' },
  { id: 'prog-1182', name: 'LIG-1182 Immunology Program', product: 'LIG-1182 (ligamab)', ta: 'Immunology' },
];

const studies = [
  { id: 'lig-hcc-301', name: 'LIG-HCC-301: Phase 3 HCC', programId: 'nexagen', phase: 'Phase 3', indication: 'Hepatocellular Carcinoma' },
  { id: 'study-301', name: 'LIG-301: Phase 3 NSCLC', programId: 'prog-2847', phase: 'Phase 3', indication: 'Non-Small Cell Lung Cancer' },
  { id: 'study-302', name: 'LIG-302: Phase 2 CRC', programId: 'prog-2847', phase: 'Phase 2', indication: 'Colorectal Cancer' },
  { id: 'study-303', name: 'LIG-303: Phase 2 Combination', programId: 'prog-2847', phase: 'Phase 2', indication: 'NSCLC Combination' },
  { id: 'study-101', name: 'LIG-101: Phase 1 FIH', programId: 'prog-1182', phase: 'Phase 1', indication: 'Rheumatoid Arthritis' },
];

// Source documents organized by category
const sourceDocumentsByCategory = {
  clinical: [
    { id: 'src-protocol-301', title: 'Protocol LIG-301 v3.0', type: 'Protocol', version: '3.0', date: '2024-06-15', status: 'Approved', category: 'clinical' },
    { id: 'src-ib-v4', title: 'IB v4.0 - NEXAGEN', type: 'IB', version: '4.0', date: '2024-08-01', status: 'Approved', category: 'clinical' },
    { id: 'src-sap-301', title: 'SAP LIG-HCC-301 v2.0', type: 'SAP', version: '2.0', date: '2024-11-10', status: 'Approved', category: 'clinical' },
    { id: 'src-csr-201', title: 'CSR LIG-HCC-201 (Phase 2)', type: 'CSR', version: '1.0', date: '2024-03-15', status: 'Final', category: 'clinical' },
    { id: 'src-tpp', title: 'TPP v3.0 - NEXAGEN', type: 'TPP', version: '3.0', date: '2024-03-01', status: 'Approved', category: 'clinical' },
  ],
  quality: [
    { id: 'src-dmf', title: 'Drug Master File - Nexafenib DS', type: 'DMF', version: '2.0', date: '2024-09-01', status: 'Approved', category: 'quality' },
    { id: 'src-spec-ds', title: 'Drug Substance Specification', type: 'Specification', version: '3.1', date: '2024-10-15', status: 'Approved', category: 'quality' },
    { id: 'src-spec-dp', title: 'Drug Product Specification', type: 'Specification', version: '2.2', date: '2024-11-01', status: 'Approved', category: 'quality' },
    { id: 'src-stab-ds', title: 'Stability Report - Drug Substance', type: 'Stability', version: '1.0', date: '2024-08-20', status: 'Final', category: 'quality' },
    { id: 'src-stab-dp', title: 'Stability Report - Drug Product', type: 'Stability', version: '1.0', date: '2024-09-15', status: 'Final', category: 'quality' },
    { id: 'src-val-proc', title: 'Process Validation Report', type: 'Validation', version: '1.0', date: '2024-07-01', status: 'Approved', category: 'quality' },
    { id: 'src-val-method', title: 'Analytical Method Validation', type: 'Validation', version: '2.0', date: '2024-06-15', status: 'Approved', category: 'quality' },
    { id: 'src-batch', title: 'Batch Analysis Report (3 batches)', type: 'Batch Analysis', version: '1.0', date: '2024-10-01', status: 'Final', category: 'quality' },
    { id: 'src-impurity', title: 'Impurity Characterization Report', type: 'Characterization', version: '1.0', date: '2024-05-20', status: 'Final', category: 'quality' },
  ],
  nonclinical: [
    { id: 'src-tox-acute', title: 'Acute Toxicity Study Report', type: 'Toxicology', version: '1.0', date: '2023-06-15', status: 'Final', category: 'nonclinical' },
    { id: 'src-tox-repeat', title: '26-Week Repeat Dose Toxicity (Rat)', type: 'Toxicology', version: '1.0', date: '2024-01-20', status: 'Final', category: 'nonclinical' },
    { id: 'src-tox-repro', title: 'Reproductive Toxicity Package', type: 'Toxicology', version: '1.0', date: '2024-04-15', status: 'Final', category: 'nonclinical' },
    { id: 'src-pk-animal', title: 'Nonclinical PK Summary', type: 'Pharmacokinetics', version: '2.0', date: '2024-02-01', status: 'Final', category: 'nonclinical' },
    { id: 'src-pd-primary', title: 'Primary Pharmacology Report', type: 'Pharmacology', version: '1.0', date: '2023-09-01', status: 'Final', category: 'nonclinical' },
    { id: 'src-safety-pharm', title: 'Safety Pharmacology Package', type: 'Safety Pharmacology', version: '1.0', date: '2023-12-01', status: 'Final', category: 'nonclinical' },
    { id: 'src-geno', title: 'Genotoxicity Battery', type: 'Genotoxicity', version: '1.0', date: '2023-08-15', status: 'Final', category: 'nonclinical' },
  ],
  labeling: [
    { id: 'src-ccds', title: 'CCDS v2.0 - NEXAGEN', type: 'CCDS', version: '2.0', date: '2024-10-01', status: 'Approved', category: 'labeling' },
    { id: 'src-uspi-draft', title: 'USPI Draft v1.0', type: 'USPI', version: '1.0', date: '2024-11-15', status: 'Draft', category: 'labeling' },
    { id: 'src-smpc-draft', title: 'SmPC Draft v1.0', type: 'SmPC', version: '1.0', date: '2024-11-10', status: 'Draft', category: 'labeling' },
  ],
  safety: [
    { id: 'src-dsur-2024', title: 'DSUR 2024 - NEXAGEN', type: 'DSUR', version: '1.0', date: '2024-12-01', status: 'Final', category: 'safety' },
    { id: 'src-signal-det', title: 'Signal Detection Report Q4', type: 'Signal Detection', version: '1.0', date: '2024-12-15', status: 'Final', category: 'safety' },
    { id: 'src-ae-summary', title: 'AE Summary Tabulation', type: 'Safety Summary', version: '1.0', date: '2024-11-01', status: 'Final', category: 'safety' },
  ],
};

// Get relevant sources based on document type
function getSourcesForDocumentType(docType: string): typeof sourceDocumentsByCategory.clinical {
  const qualityTypes = ['module-23', 'module-32s', 'module-32p', 'module-32a', 'module-33'];
  const nonclinicalTypes = ['module-24', 'module-26', 'module-4'];
  const clinicalTypes = ['protocol', 'csr', 'ib', 'sap', 'icf', 'module-25', 'module-27', 'module-5'];
  const labelingTypes = ['uspi', 'ccds', 'smpc', 'pil', 'medguide'];
  const safetyTypes = ['dsur', 'pbrer', 'rmp', 'rems'];
  
  const sources: typeof sourceDocumentsByCategory.clinical = [];
  
  if (qualityTypes.includes(docType)) {
    sources.push(...sourceDocumentsByCategory.quality);
  }
  if (nonclinicalTypes.includes(docType)) {
    sources.push(...sourceDocumentsByCategory.nonclinical);
  }
  if (clinicalTypes.includes(docType)) {
    sources.push(...sourceDocumentsByCategory.clinical);
  }
  if (labelingTypes.includes(docType)) {
    sources.push(...sourceDocumentsByCategory.labeling, ...sourceDocumentsByCategory.clinical);
  }
  if (safetyTypes.includes(docType)) {
    sources.push(...sourceDocumentsByCategory.safety, ...sourceDocumentsByCategory.clinical);
  }
  
  // If no specific match, return all sources
  if (sources.length === 0) {
    return [
      ...sourceDocumentsByCategory.clinical,
      ...sourceDocumentsByCategory.quality,
      ...sourceDocumentsByCategory.nonclinical,
    ];
  }
  
  return sources;
}

export function NewDocumentWizard({ onCancel, onComplete }: NewDocumentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedStudy, setSelectedStudy] = useState<string>('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [autoPopulate, setAutoPopulate] = useState(true);
  const [useAI, setUseAI] = useState(true);
  const [aiAuthoringMode, setAIAuthoringMode] = useState<'section' | 'reuse' | 'document'>('document');
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  const steps: { id: WizardStep; label: string }[] = [
    { id: 'type', label: 'Document Type' },
    { id: 'context', label: 'Program & Study' },
    { id: 'prerequisites', label: 'Prerequisites' },
    { id: 'sources', label: 'Source Documents' },
    { id: 'options', label: 'Options' },
    { id: 'review', label: 'Review & Create' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Filter studies by selected program
  const filteredStudies = useMemo(() => {
    if (!selectedProgram) return [];
    return studies.filter(s => s.programId === selectedProgram);
  }, [selectedProgram]);

  // Get relevant source documents based on selected template type
  const relevantSources = useMemo(() => {
    if (!selectedTemplate) return [];
    return getSourcesForDocumentType(selectedTemplate.documentType);
  }, [selectedTemplate]);

  // Get program and study details
  const program = programs.find(p => p.id === selectedProgram);
  const study = studies.find(s => s.id === selectedStudy);

  // Generate prerequisites based on document type
  const prerequisites: Prerequisite[] = useMemo(() => {
    if (!selectedTemplate) return [];
    
    const basePrereqs: Prerequisite[] = [];
    
    if (selectedTemplate.documentType === 'csr') {
      basePrereqs.push(
        { id: 'prereq-db', name: 'Database Lock', description: 'Clinical database must be locked before CSR drafting', type: 'milestone', status: 'available', availableDate: '2024-11-15', sourceModule: 'Development', dependentSections: ['10', '11', '12'], blocking: true },
        { id: 'prereq-sap', name: 'Statistical Analysis Plan', description: 'Final SAP required for results sections', type: 'document', status: 'available', sourceModule: 'Authoring', sourceDocumentTitle: 'SAP v2.0', dependentSections: ['11', '14'], blocking: true },
        { id: 'prereq-tfl', name: 'TFL Package', description: 'Tables, Figures, Listings from Biostatistics', type: 'data', status: 'pending', eta: '2024-12-20', sourceModule: 'Development', dependentSections: ['11', '12', '14'], blocking: true },
        { id: 'prereq-narr', name: 'Subject Narratives', description: 'All subject narratives for Section 12', type: 'document', status: 'pending', eta: '2024-12-25', sourceModule: 'Safety', dependentSections: ['12'], blocking: false },
      );
    } else if (selectedTemplate.documentType === 'protocol') {
      basePrereqs.push(
        { id: 'prereq-syn', name: 'Study Synopsis', description: 'Approved study synopsis', type: 'document', status: 'available', sourceModule: 'Development', sourceDocumentTitle: 'Study Synopsis', dependentSections: ['2', '6'], blocking: true },
        { id: 'prereq-tpp', name: 'Target Product Profile', description: 'Current TPP for rationale', type: 'document', status: 'available', sourceModule: 'Strategy', sourceDocumentTitle: 'TPP v3.0', dependentSections: ['6', '7'], blocking: true },
        { id: 'prereq-ib', name: 'Current IB', description: 'Latest IB for background section', type: 'document', status: 'available', sourceModule: 'Authoring', sourceDocumentTitle: 'IB v4.0', dependentSections: ['6'], blocking: true },
        { id: 'prereq-sap-draft', name: 'SAP Draft', description: 'Draft SAP for statistics section', type: 'document', status: 'pending', eta: '2025-01-15', sourceModule: 'Biostatistics', dependentSections: ['14'], blocking: false },
      );
    } else if (selectedTemplate.documentType === 'ib') {
      basePrereqs.push(
        { id: 'prereq-cmc', name: 'CMC Data Package', description: 'Drug substance and product information', type: 'data', status: 'available', sourceModule: 'Quality', dependentSections: ['6'], blocking: true },
        { id: 'prereq-nonclin', name: 'Nonclinical Reports', description: 'All completed nonclinical studies', type: 'document', status: 'available', sourceModule: 'Research', dependentSections: ['7'], blocking: true },
        { id: 'prereq-clin', name: 'Clinical Study Reports', description: 'All completed clinical studies', type: 'document', status: 'pending', eta: '2024-12-25', sourceModule: 'Authoring', dependentSections: ['8'], blocking: false },
        { id: 'prereq-safety', name: 'Safety Database', description: 'Current safety database extract', type: 'data', status: 'available', sourceModule: 'Safety', dependentSections: ['8'], blocking: true },
      );
    }
    
    return basePrereqs;
  }, [selectedTemplate]);

  const blockingPrereqsMet = prerequisites.filter(p => p.blocking).every(p => p.status === 'available');

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    // Simulate creation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Convert template sections to document sections
    const documentSections = templateSectionsToDocumentSections(
      selectedTemplate!.sections as TemplateSectionDefinition[]
    );
    const totalSectionCount = countTotalSections(selectedTemplate!.sections as Array<{ subsections?: unknown[] }>);
    
    // Create a new document (mock)
    const newDoc: AuthoringDocument = {
      id: `doc-new-${Date.now()}`,
      documentType: selectedTemplate!.documentType,
      title: documentTitle || `${selectedTemplate!.name} - ${study?.name || program?.product}`,
      shortTitle: documentTitle || selectedTemplate!.name,
      version: '0.1',
      versionDate: new Date().toISOString().split('T')[0],
      programId: selectedProgram,
      programName: program?.name || '',
      productId: program?.id || '',
      productName: program?.product || '',
      studyId: selectedStudy || undefined,
      studyName: study?.name,
      indication: study?.indication,
      templateId: selectedTemplate!.id,
      templateName: selectedTemplate!.name,
      templateVersion: selectedTemplate!.version,
      status: blockingPrereqsMet ? 'ready-to-start' : 'prerequisites-pending',
      workflowId: 'wf-default-4stage',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      authorId: 'u-writer-1',
      authorName: 'Jennifer Park',
      ownerId: 'u-writer-1',
      ownerName: 'Jennifer Park',
      progress: 0,
      sectionsTotal: totalSectionCount,
      sectionsComplete: 0,
      sections: documentSections,
      prerequisites: prerequisites,
      prerequisitesMet: blockingPrereqsMet,
      openComments: 0,
      totalComments: 0,
      history: [{
        id: `hist-${Date.now()}`,
        documentId: `doc-new-${Date.now()}`,
        action: 'created',
        description: 'Document created from template',
        userId: 'u-writer-1',
        userName: 'Jennifer Park',
        timestamp: new Date().toISOString(),
      }],
      sourceDocuments: Array.from(selectedSources).map(srcId => {
        const src = relevantSources.find(s => s.id === srcId);
        return {
          id: srcId,
          documentId: srcId,
          documentTitle: src?.title || '',
          documentType: src?.type || '',
          version: src?.version || '',
          linkType: 'reference' as const,
          sourceStatus: 'current' as const,
          lastChecked: new Date().toISOString().split('T')[0],
        };
      }),
      linkedDocuments: [],
      tags: [],
      priority: 'medium',
      estimatedHours: selectedTemplate!.estimatedHours,
      aiAuthoringMode: aiAuthoringMode, // Store the selected mode on the document
    };
    
    setIsCreating(false);
    onComplete(newDoc, aiAuthoringMode);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type': return selectedTemplate !== null;
      case 'context': return selectedProgram !== '';
      case 'prerequisites': return true; // Can proceed even with pending prereqs
      case 'sources': return true;
      case 'options': return true;
      case 'review': return true;
      default: return false;
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Steps */}
      <div className="hidden lg:block w-64 bg-surface-elevated border-r border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">New Document</h2>
          <button onClick={onCancel} className="p-1 hover:bg-surface-card rounded">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isComplete = index < currentStepIndex;
            const isCurrent = step.id === currentStep;
            
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isCurrent ? 'bg-accent-blue/10' : ''
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  isComplete ? 'bg-accent-green text-white' :
                  isCurrent ? 'bg-accent-blue text-white' :
                  'bg-surface-card text-text-muted'
                }`}>
                  {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-sm ${isCurrent ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Summary */}
        {selectedTemplate && (
          <div className="mt-8 p-3 bg-surface-card rounded-lg">
            <div className="text-xs text-text-muted mb-1">Selected Template</div>
            <div className="text-sm text-text-primary font-medium">{selectedTemplate.name}</div>
            {program && (
              <>
                <div className="text-xs text-text-muted mt-2 mb-1">Program</div>
                <div className="text-sm text-text-primary">{program.name}</div>
              </>
            )}
            {study && (
              <>
                <div className="text-xs text-text-muted mt-2 mb-1">Study</div>
                <div className="text-sm text-text-primary">{study.name}</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-3xl mx-auto">
            {/* Step 1: Document Type */}
            {currentStep === 'type' && (
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">Select Document Type</h1>
                <p className="text-text-muted mb-4">Choose the type of regulatory document you want to create</p>

                {/* Search and Browse Actions */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={templateSearchQuery}
                      onChange={(e) => setTemplateSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <button
                    onClick={() => setShowTemplateBrowser(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue/10 text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/20 transition-colors text-sm font-medium"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Browse All 166+ Templates
                  </button>
                </div>

                {/* Template Categories */}
                {[
                  { category: 'Clinical Documents', types: ['protocol', 'csr', 'ib', 'sap', 'icf'] },
                  { category: 'Module 2 - CTD Summaries', types: ['module-23', 'module-24', 'module-25', 'module-26', 'module-27'] },
                  { category: 'Module 3 - Quality (CMC)', types: ['module-32s', 'module-32p', 'module-32a', 'module-33'] },
                  { category: 'Module 4/5 - Study Reports', types: ['module-4', 'module-5'] },
                  { category: 'Labeling', types: ['uspi', 'ccds', 'smpc', 'pil', 'medguide'] },
                  { category: 'Safety Reports', types: ['dsur', 'pbrer'] },
                  { category: 'Risk Management', types: ['rmp', 'rems'] },
                  { category: 'Other', types: ['ise', 'iss', 'briefing-book'] },
                ].map(group => {
                  let groupTemplates = allDocumentTemplates.filter(t => group.types.includes(t.documentType));
                  
                  // Apply search filter
                  if (templateSearchQuery) {
                    const query = templateSearchQuery.toLowerCase();
                    groupTemplates = groupTemplates.filter(t =>
                      t.name.toLowerCase().includes(query) ||
                      t.description.toLowerCase().includes(query) ||
                      (t as { ichGuideline?: string }).ichGuideline?.toLowerCase().includes(query)
                    );
                  }
                  
                  if (groupTemplates.length === 0) return null;
                  
                  return (
                    <div key={group.category} className="mb-6">
                      <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">{group.category}</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {groupTemplates.map(template => {
                          const totalSections = countTotalSections(template.sections as Array<{ subsections?: unknown[] }>);
                          const ichRef = (template as { ichGuideline?: string }).ichGuideline;
                          
                          return (
                          <div 
                            key={template.id}
                            onClick={() => setSelectedTemplate(template as DocumentTemplate)}
                            className={`bg-surface-elevated border rounded-lg p-4 cursor-pointer transition-all ${
                              selectedTemplate?.id === template.id 
                                ? 'border-accent-blue ring-2 ring-accent-blue/20' 
                                : 'border-border hover:border-accent-blue/50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  selectedTemplate?.id === template.id ? 'bg-accent-blue/20' : 'bg-surface-card'
                                }`}>
                                  <FileText className={`w-5 h-5 ${
                                    selectedTemplate?.id === template.id ? 'text-accent-blue' : 'text-text-muted'
                                  }`} />
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-text-primary">{template.name}</h3>
                                  <p className="text-xs text-text-muted mt-0.5">{template.description}</p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted flex-wrap">
                                    <span className="font-medium text-accent-blue">{totalSections} sections</span>
                                    <span>~{template.estimatedHours}h</span>
                                    {ichRef && (
                                      <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-[10px]">
                                        {ichRef}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {selectedTemplate?.id === template.id && (
                                <CheckCircle className="w-5 h-5 text-accent-blue flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        )})}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 2: Program & Study Context */}
            {currentStep === 'context' && (
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">Select Program & Study</h1>
                <p className="text-text-muted mb-8">Choose the program and study this document is associated with</p>

                <div className="space-y-6">
                  {/* Program Selection */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-3">Program *</label>
                    <div className="grid grid-cols-1 gap-3">
                      {programs.map(prog => (
                        <div
                          key={prog.id}
                          onClick={() => { setSelectedProgram(prog.id); setSelectedStudy(''); }}
                          className={`bg-surface-elevated border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedProgram === prog.id
                              ? 'border-accent-blue ring-2 ring-accent-blue/20'
                              : 'border-border hover:border-accent-blue/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Building2 className="w-5 h-5 text-accent-blue" />
                              <div>
                                <div className="text-sm font-medium text-text-primary">{prog.name}</div>
                                <div className="text-xs text-text-muted">{prog.product} • {prog.ta}</div>
                              </div>
                            </div>
                            {selectedProgram === prog.id && (
                              <CheckCircle className="w-5 h-5 text-accent-blue" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Study Selection (if applicable) */}
                  {selectedProgram && (selectedTemplate?.documentType === 'csr' || selectedTemplate?.documentType === 'protocol') && (
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        Study {selectedTemplate?.documentType === 'csr' ? '*' : '(optional)'}
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        {filteredStudies.map(s => (
                          <div
                            key={s.id}
                            onClick={() => setSelectedStudy(s.id)}
                            className={`bg-surface-elevated border rounded-lg p-4 cursor-pointer transition-all ${
                              selectedStudy === s.id
                                ? 'border-accent-blue ring-2 ring-accent-blue/20'
                                : 'border-border hover:border-accent-blue/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FlaskConical className="w-5 h-5 text-purple-400" />
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{s.name}</div>
                                  <div className="text-xs text-text-muted">{s.phase} • {s.indication}</div>
                                </div>
                              </div>
                              {selectedStudy === s.id && (
                                <CheckCircle className="w-5 h-5 text-accent-blue" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document Title */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Document Title (optional)
                    </label>
                    <input
                      type="text"
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      placeholder={`${selectedTemplate?.name || 'Document'} - ${study?.name || program?.product || 'Product'}`}
                      className="w-full px-4 py-3 bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                    />
                    <p className="text-xs text-text-muted mt-1">Leave blank to auto-generate based on template and study</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Prerequisites Check */}
            {currentStep === 'prerequisites' && (
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">Prerequisites Check</h1>
                <p className="text-text-muted mb-8">Review required items before starting this document</p>

                {/* Summary Banner */}
                <div className={`p-4 rounded-lg mb-6 ${
                  blockingPrereqsMet 
                    ? 'bg-accent-green/10 border border-accent-green/30' 
                    : 'bg-amber-500/10 border border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {blockingPrereqsMet ? (
                      <CheckCircle className="w-5 h-5 text-accent-green" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                    <div>
                      <div className={`text-sm font-medium ${blockingPrereqsMet ? 'text-accent-green' : 'text-amber-400'}`}>
                        {blockingPrereqsMet 
                          ? 'All blocking prerequisites are met' 
                          : 'Some prerequisites are pending'}
                      </div>
                      <div className="text-xs text-text-muted">
                        {blockingPrereqsMet 
                          ? 'You can start drafting immediately' 
                          : 'You can create the document, but some sections may be blocked'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prerequisites List */}
                <div className="space-y-3">
                  {prerequisites.map(prereq => (
                    <div 
                      key={prereq.id}
                      className={`bg-surface-elevated border rounded-lg p-4 ${
                        prereq.status === 'available' ? 'border-border' : 'border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {prereq.status === 'available' ? (
                          <CheckCircle className="w-5 h-5 text-accent-green mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">{prereq.name}</span>
                              {prereq.blocking && (
                                <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>
                              )}
                            </div>
                            {prereq.status === 'available' ? (
                              <span className="text-xs text-accent-green">Available</span>
                            ) : (
                              <span className="text-xs text-amber-400">ETA: {prereq.eta}</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mb-2">{prereq.description}</p>
                          <div className="flex items-center gap-4 text-xs text-text-muted">
                            <span>Source: {prereq.sourceModule}</span>
                            {prereq.sourceDocumentTitle && (
                              <button className="text-accent-blue hover:underline flex items-center gap-1">
                                {prereq.sourceDocumentTitle} <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            <span>Sections: {prereq.dependentSections.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Source Documents */}
            {currentStep === 'sources' && (
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">Link Source Documents</h1>
                <p className="text-text-muted mb-8">Select documents to reference and auto-populate content from</p>

                <div className="space-y-3">
                  {relevantSources.map(src => (
                    <div 
                      key={src.id}
                      onClick={() => {
                        const newSelected = new Set(selectedSources);
                        if (newSelected.has(src.id)) {
                          newSelected.delete(src.id);
                        } else {
                          newSelected.add(src.id);
                        }
                        setSelectedSources(newSelected);
                      }}
                      className={`bg-surface-elevated border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedSources.has(src.id)
                          ? 'border-accent-blue ring-2 ring-accent-blue/20'
                          : 'border-border hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedSources.has(src.id) ? 'bg-accent-blue border-accent-blue' : 'border-border'
                        }`}>
                          {selectedSources.has(src.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{src.title}</div>
                          <div className="text-xs text-text-muted">
                            {src.type} • v{src.version} • {src.date} • {src.status}
                          </div>
                        </div>
                        <button className="text-xs text-accent-blue hover:underline">Preview</button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedSources.size > 0 && (
                  <div className="mt-6 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-accent-blue mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          {selectedSources.size} source document{selectedSources.size > 1 ? 's' : ''} selected
                        </div>
                        <div className="text-xs text-text-muted">
                          These documents will be available in the side panel while drafting, and can be used for auto-population
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: AI Authoring Options */}
            {currentStep === 'options' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-semibold text-text-primary mb-2">AI Authoring Options</h1>
                    <p className="text-text-muted">Choose how you want to author this document</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">Data-Centric Authoring</span>
                  </div>
                </div>

                {/* AI Mode Selection */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* Author Section */}
                  <div 
                    onClick={() => {
                      setAIAuthoringMode('section');
                      setUseAI(true);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      aiAuthoringMode === 'section' 
                        ? 'bg-violet-500/10 border-violet-500 ring-2 ring-violet-500/20'
                        : 'bg-surface-elevated border-border hover:border-violet-500/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      aiAuthoringMode === 'section' ? 'bg-violet-500/20' : 'bg-surface-card'
                    }`}>
                      <FileText className={`w-5 h-5 ${aiAuthoringMode === 'section' ? 'text-violet-400' : 'text-text-muted'}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">Author Section</h3>
                    <p className="text-xs text-text-muted mb-3">
                      AI drafts one section at a time with full control over each
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Real-time preview</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Section-specific sources</span>
                      </div>
                    </div>
                    {aiAuthoringMode === 'section' && (
                      <div className="mt-3 pt-3 border-t border-violet-500/20">
                        <div className="flex items-center gap-1.5 text-xs text-violet-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reuse Content */}
                  <div 
                    onClick={() => {
                      setAIAuthoringMode('reuse');
                      setUseAI(true);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      aiAuthoringMode === 'reuse' 
                        ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-surface-elevated border-border hover:border-emerald-500/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      aiAuthoringMode === 'reuse' ? 'bg-emerald-500/20' : 'bg-surface-card'
                    }`}>
                      <Layers className={`w-5 h-5 ${aiAuthoringMode === 'reuse' ? 'text-emerald-400' : 'text-text-muted'}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">Reuse Content</h3>
                    <p className="text-xs text-text-muted mb-3">
                      Insert pre-approved components from your content library
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Pre-approved content</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Consistent messaging</span>
                      </div>
                    </div>
                    {aiAuthoringMode === 'reuse' && (
                      <div className="mt-3 pt-3 border-t border-emerald-500/20">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Author Document */}
                  <div 
                    onClick={() => {
                      setAIAuthoringMode('document');
                      setUseAI(true);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      aiAuthoringMode === 'document' 
                        ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-surface-elevated border-border hover:border-blue-500/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      aiAuthoringMode === 'document' ? 'bg-blue-500/20' : 'bg-surface-card'
                    }`}>
                      <BookOpen className={`w-5 h-5 ${aiAuthoringMode === 'document' ? 'text-blue-400' : 'text-text-muted'}`} />
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">Author Document</h3>
                    <p className="text-xs text-text-muted mb-3">
                      AI drafts all sections with intelligent dependency handling
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Batch generation</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-muted">
                        <Check className="w-3 h-3 text-accent-green" />
                        <span>Full audit trail</span>
                      </div>
                    </div>
                    {aiAuthoringMode === 'document' && (
                      <div className="mt-3 pt-3 border-t border-blue-500/20">
                        <div className="flex items-center gap-1.5 text-xs text-blue-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data-Centric Callout */}
                <div className="p-4 bg-gradient-to-r from-violet-500/5 via-blue-500/5 to-emerald-500/5 border border-violet-500/20 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Target className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-text-primary mb-1">Data-Centric by Design</h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Every section is <span className="text-violet-400">structured data</span> with full 
                        <span className="text-blue-400"> source lineage</span>. Your content is ready for 
                        <span className="text-emerald-400"> multi-format output</span> (PDF, FHIR, IDMP) 
                        aligned with FDA PQ/CMC and EMA SPOR initiatives.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Auto-populate toggle */}
                <div className="space-y-3">
                  <div 
                    onClick={() => setAutoPopulate(!autoPopulate)}
                    className="flex items-center gap-3 p-3 bg-surface-elevated border border-border rounded-lg cursor-pointer hover:border-accent-blue/50 transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      autoPopulate ? 'bg-accent-blue border-accent-blue' : 'border-border'
                    }`}>
                      {autoPopulate && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-accent-blue" />
                        <span className="text-sm font-medium text-text-primary">Auto-populate from sources</span>
                      </div>
                      <p className="text-xs text-text-muted">
                        Pull content from linked documents where applicable
                      </p>
                    </div>
                  </div>

                  {/* Review workflow info */}
                  <div className="p-3 bg-surface-elevated border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-accent-blue" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary mb-1">Review Workflow</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-surface-card rounded">Peer</span>
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                          <span className="text-xs px-2 py-1 bg-surface-card rounded">CF</span>
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                          <span className="text-xs px-2 py-1 bg-surface-card rounded">QC</span>
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                          <span className="text-xs px-2 py-1 bg-surface-card rounded">Final</span>
                          <button className="text-xs text-accent-blue hover:underline ml-2">
                            Customize →
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review & Create */}
            {currentStep === 'review' && (
              <div>
                <h1 className="text-2xl font-semibold text-text-primary mb-2">Review & Create</h1>
                <p className="text-text-muted mb-8">Review your selections before creating the document</p>

                <div className="bg-surface-elevated border border-border rounded-lg divide-y divide-border">
                  {/* Document Type */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Document Type</div>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-accent-blue" />
                      <div>
                        <div className="text-sm font-medium text-text-primary">{selectedTemplate?.name}</div>
                        <div className="text-xs text-text-muted">{selectedTemplate?.sections.length} sections • ~{selectedTemplate?.estimatedHours}h</div>
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Program & Study</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-4 h-4 text-text-muted" />
                        <span className="text-sm text-text-primary">{program?.name}</span>
                      </div>
                      {study && (
                        <div className="flex items-center gap-3">
                          <FlaskConical className="w-4 h-4 text-text-muted" />
                          <span className="text-sm text-text-primary">{study.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Document Title</div>
                    <div className="text-sm text-text-primary">
                      {documentTitle || `${selectedTemplate?.name} - ${study?.name || program?.product}`}
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Prerequisites</div>
                    <div className="flex items-center gap-2">
                      {blockingPrereqsMet ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-accent-green" />
                          <span className="text-sm text-accent-green">All blocking prerequisites met</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-amber-400">Some prerequisites pending</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Source Documents */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Source Documents</div>
                    <div className="text-sm text-text-primary">
                      {selectedSources.size} document{selectedSources.size !== 1 ? 's' : ''} linked
                    </div>
                  </div>

                  {/* Options */}
                  <div className="p-4">
                    <div className="text-xs text-text-muted uppercase tracking-wider mb-2">AI Authoring</div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className={`w-4 h-4 ${
                        aiAuthoringMode === 'section' ? 'text-violet-400' :
                        aiAuthoringMode === 'reuse' ? 'text-emerald-400' : 'text-blue-400'
                      }`} />
                      <span className="text-sm text-text-primary">
                        {aiAuthoringMode === 'section' ? 'Author Section' :
                         aiAuthoringMode === 'reuse' ? 'Reuse Content' : 'Author Document'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {autoPopulate ? <Check className="w-4 h-4 text-accent-green" /> : <X className="w-4 h-4 text-text-muted" />}
                        <span className="text-sm text-text-muted">Auto-populate</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="border-t border-border bg-surface-elevated px-8 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={currentStepIndex === 0 ? onCancel : handleBack}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {currentStepIndex === 0 ? 'Cancel' : 'Back'}
            </button>

            {currentStep === 'review' ? (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Document
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Template Browser Modal */}
      {showTemplateBrowser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-surface-card rounded-xl border border-border w-full max-w-6xl h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Browse All Templates</h2>
                <p className="text-sm text-text-muted">166+ ICH-compliant eCTD document templates</p>
              </div>
              <button
                onClick={() => setShowTemplateBrowser(false)}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            
            {/* Template Browser */}
            <div className="flex-1 overflow-hidden">
              <TemplateBrowser
                compact
                onSelectTemplate={(ectdTemplate: ECTDTemplate) => {
                  // Track usage
                  templateUsageTrackingService.trackSelected(ectdTemplate);
                  
                  // Convert eCTD template to authoring template format
                  const convertedTemplate: DocumentTemplate = {
                    id: ectdTemplate.id,
                    name: ectdTemplate.name,
                    description: ectdTemplate.description,
                    documentType: ectdTemplate.documentType as DocumentType,
                    version: ectdTemplate.version,
                    sections: (ectdTemplate.sections ?? []).map(s => ({
                      id: s.id,
                      number: s.number,
                      title: s.title,
                      level: s.level,
                      required: s.required,
                      guidance: s.guidance,
                      aiPrompt: s.aiPrompt,
                      defaultContent: '',
                      subsections: s.subsections?.map(sub => ({
                        id: sub.id,
                        number: sub.number,
                        title: sub.title,
                        level: sub.level,
                        required: sub.required,
                        guidance: sub.guidance,
                        aiPrompt: sub.aiPrompt,
                        defaultContent: '',
                      })),
                    })),
                    ichGuideline: ectdTemplate.ichGuideline,
                    estimatedHours: ectdTemplate.estimatedHours,
                    applicableRegions: ectdTemplate.applicableRegions,
                    applicableStudyPhases: ectdTemplate.applicableStudyPhases,
                    styleConfig: ectdTemplate.styleConfig,
                    defaultWorkflowId: ectdTemplate.defaultWorkflowId,
                    createdAt: ectdTemplate.createdAt,
                    updatedAt: ectdTemplate.updatedAt,
                    ctdModule: ectdTemplate.ctdModule,
                  };
                  
                  setSelectedTemplate(convertedTemplate);
                  setShowTemplateBrowser(false);
                }}
                onCreateDocument={(ectdTemplate: ECTDTemplate) => {
                  // Track usage
                  templateUsageTrackingService.trackSelected(ectdTemplate);
                  
                  // Convert and select, then auto-proceed
                  const convertedTemplate: DocumentTemplate = {
                    id: ectdTemplate.id,
                    name: ectdTemplate.name,
                    description: ectdTemplate.description,
                    documentType: ectdTemplate.documentType as DocumentType,
                    version: ectdTemplate.version,
                    sections: (ectdTemplate.sections ?? []).map(s => ({
                      id: s.id,
                      number: s.number,
                      title: s.title,
                      level: s.level,
                      required: s.required,
                      guidance: s.guidance,
                      aiPrompt: s.aiPrompt,
                      defaultContent: '',
                      subsections: s.subsections?.map(sub => ({
                        id: sub.id,
                        number: sub.number,
                        title: sub.title,
                        level: sub.level,
                        required: sub.required,
                        guidance: sub.guidance,
                        aiPrompt: sub.aiPrompt,
                        defaultContent: '',
                      })),
                    })),
                    ichGuideline: ectdTemplate.ichGuideline,
                    estimatedHours: ectdTemplate.estimatedHours,
                    applicableRegions: ectdTemplate.applicableRegions,
                    applicableStudyPhases: ectdTemplate.applicableStudyPhases,
                    styleConfig: ectdTemplate.styleConfig,
                    defaultWorkflowId: ectdTemplate.defaultWorkflowId,
                    createdAt: ectdTemplate.createdAt,
                    updatedAt: ectdTemplate.updatedAt,
                    ctdModule: ectdTemplate.ctdModule,
                  };
                  
                  setSelectedTemplate(convertedTemplate);
                  setShowTemplateBrowser(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
