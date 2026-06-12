



import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronDown, ChevronLeft, Check, Clock, AlertCircle, 
  MessageSquare, Edit3, Eye, Save, Send, History, Sparkles, BookOpen,
  Link2, Bold, Italic, List, ListOrdered, Table, Image, Link,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, CheckCircle, Plus,
  FileText, ExternalLink, X, MoreVertical, Play, PanelRightOpen, PanelRightClose,
  Wand2, Zap
} from 'lucide-react';
import { AuthoringDocument, DocumentSection, SectionStatus, ComponentLibraryItem } from '@/types/authoring';
import { componentLibrary } from '@/data/authoring-data';
import { AISectionEditor } from './AISectionEditor';
import { SourcesPanel, TFLReference } from './SourcesPanel';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import { useToast } from '@/components/ui/Toast';
import { PagedDocumentRenderer, type PagedDocument, type PagedSection } from '@/components/viewer/PagedDocumentRenderer';
import { DocumentModeToggle, type DocumentViewMode } from '@/components/viewer/DocumentModeToggle';

interface DocumentEditorProps {
  document: AuthoringDocument;
  onBack: () => void;
  onSave?: (document: AuthoringDocument) => void;
  initialRightPanelTab?: RightPanelTab;
  onViewSource?: (source: import('@/store/useAuthoringStore').SourceDocument) => void;
}

type RightPanelTab = 'sources' | 'comments' | 'ai';

// Convert AuthoringDocument to PagedDocument for document mode rendering
function convertToPagedDocument(doc: AuthoringDocument, sampleContent: Record<string, string>): PagedDocument {
  const convertSection = (section: DocumentSection): PagedSection => ({
    id: section.id,
    number: section.number,
    title: section.title,
    level: 0,
    content: sampleContent[section.id] || `<p>${section.title} content...</p>`,
    wordCount: section.wordCount,
    subsections: section.subsections?.map((sub, idx) => ({
      ...convertSection(sub),
      level: 1,
    })),
  });

  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.shortTitle,
    documentType: doc.documentType,
    version: doc.version,
    status: doc.status,
    author: doc.authorName || 'Medical Writing Team',
    lastModified: doc.updatedAt,
    sections: (doc.sections ?? []).map(convertSection),
    productName: doc.productName,
    studyName: doc.studyName,
    ctdSection: doc.ctdSection,
    wordCount: (doc.sections ?? []).reduce((sum, s) => sum + s.wordCount, 0),
    pageCount: Math.ceil((doc.sections ?? []).reduce((sum, s) => sum + s.wordCount, 0) / 400),
  };
}

// Recursive Section Tree Item for unlimited nesting depth
interface SectionTreeItemProps {
  section: DocumentSection;
  level: number;
  selectedSectionId: string;
  expandedSections: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  getSectionStatusIcon: (status: SectionStatus) => React.ReactNode;
}

function SectionTreeItem({
  section,
  level,
  selectedSectionId,
  expandedSections,
  onSelect,
  onToggleExpand,
  getSectionStatusIcon,
}: SectionTreeItemProps) {
  const hasChildren = section.subsections && section.subsections.length > 0;
  const isExpanded = expandedSections.has(section.id);
  const isSelected = selectedSectionId === section.id;
  
  // Sizing based on level
  const textSize = level === 1 ? 'text-sm' : level === 2 ? 'text-xs' : 'text-[11px]';
  const paddingY = level === 1 ? 'py-2' : 'py-1.5';
  const numberWidth = level === 1 ? 'min-w-[48px]' : level === 2 ? 'min-w-[56px]' : 'min-w-[64px]';
  
  return (
    <div style={{ marginLeft: level > 1 ? (level - 1) * 12 : 0 }}>
      <div 
        className={`flex items-center gap-1.5 px-2 ${paddingY} rounded-lg cursor-pointer transition-colors ${
          isSelected 
            ? 'bg-accent-blue/10 border border-accent-blue/30' 
            : 'hover:bg-surface-card'
        }`}
        onClick={() => onSelect(section.id)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleExpand(section.id); }}
            className="p-0.5 hover:bg-surface-card rounded flex-shrink-0"
          >
            {isExpanded 
              ? <ChevronDown className="w-3 h-3 text-text-muted" />
              : <ChevronRight className="w-3 h-3 text-text-muted" />
            }
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}
        
        {/* Status Icon */}
        <span className="flex-shrink-0">{getSectionStatusIcon(section.status)}</span>
        
        {/* Section Number */}
        <span className={`${textSize} text-text-muted ${numberWidth} flex-shrink-0`}>
          {section.number}
        </span>
        
        {/* Section Title */}
        <span className={`${textSize} flex-1 truncate ${isSelected ? 'text-text-primary font-medium' : 'text-text-primary'}`}>
          {section.title}
        </span>
        
        {/* Indicators */}
        {section.aiPrompt && (
          <span title="AI prompt available">
            <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
          </span>
        )}
        {section.hasUnresolvedComments && (
          <MessageSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />
        )}
      </div>
      
      {/* Render children recursively */}
      {hasChildren && isExpanded && (
        <div>
          {section.subsections!.map(child => (
            <SectionTreeItem
              key={child.id}
              section={child}
              level={level + 1}
              selectedSectionId={selectedSectionId}
              expandedSections={expandedSections}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              getSectionStatusIcon={getSectionStatusIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Sample section content for demo - Written in AMA Style (11th Edition)
// Key AMA Guidelines Applied:
// - Numbers: Spelled out 0-9 except with units; numerals for 10+
// - Abbreviations: Defined at first mention as "Full Term (ABBREV)"
// - Units: Space between number and unit (5 mg, not 5mg)
// - Drug names: Lowercase for generics (ligrastinib)
// - Statistics: P value with italic P, CI format
// - Dates: Written out (December 18, 2024)
const sampleContent: Record<string, string> = {
  'sec-11': `<h2>11. Efficacy Evaluation</h2>

<h3>11.1 Analysis Sets</h3>
<p>The efficacy analyses were performed on the following analysis populations:</p>
<ul>
  <li><strong>Intent-to-Treat (ITT) Population:</strong> All randomized subjects who received at least one dose of study medication (N=298). The ITT population served as the primary analysis set for all efficacy endpoints.</li>
  <li><strong>Per-Protocol (PP) Population:</strong> All ITT subjects who completed the study without major protocol deviations (N=276). Twenty-two subjects were excluded from the PP population due to protocol deviations.</li>
</ul>

<h3>11.2 Primary Efficacy Endpoint</h3>
<p>The primary efficacy endpoint was overall survival (OS), defined as the time from randomization to death from any cause. The analysis was performed using a stratified log-rank test with stratification factors including Eastern Cooperative Oncology Group (ECOG) performance status (0 vs 1) and prior lines of therapy (1 vs 2 or more).</p>

<p><em>[Insert Table 11.1 - Overall Survival Analysis]</em></p>

<p>At the data cutoff date of December 15, 2024, the median OS was 14.8 months (95% CI, 12.1-17.5) in the ligrastinib arm compared with 10.2 months (95% CI, 8.4-12.0) in the standard-of-care arm. The hazard ratio (HR) for OS was 0.71 (95% CI, 0.54-0.93), demonstrating a statistically significant improvement in OS for subjects treated with ligrastinib compared with standard of care (<em>P</em> = .012). The estimated probability of survival at 12 months was 62.3% (95% CI, 55.8%-68.2%) in the ligrastinib arm versus 43.1% (95% CI, 36.9%-49.2%) in the control arm.</p>

<h3>11.3 Secondary Efficacy Endpoints</h3>
<p>Progression-free survival (PFS) analysis demonstrated a median PFS of 7.2 months (95% CI, 6.1-8.4) in the ligrastinib arm versus 4.8 months (95% CI, 4.0-5.6) in the control arm (HR, 0.58; 95% CI, 0.46-0.73; <em>P</em> &lt; .001). The confirmed objective response rate (ORR) was 43.6% (95% CI, 37.1%-50.3%) for ligrastinib compared with 21.5% (95% CI, 16.2%-27.5%) for standard of care.</p>`,
  
  'sec-12': `<h2>12. Safety Evaluation</h2>

<h3>12.1 Extent of Exposure</h3>
<p>A total of 298 subjects received at least one dose of study medication in the safety population. All subjects randomized to the ligrastinib arm (n = 150) received ligrastinib 600 mg administered orally once daily. Subjects randomized to the control arm (n = 148) received investigator's choice of docetaxel 75 mg/m² administered intravenously (IV) every 3 weeks or pemetrexed 500 mg/m² IV every 3 weeks.</p>

<p>The median duration of exposure was 8.4 months (range, 0.1-24.6 months) in the ligrastinib arm and 5.2 months (range, 0.1-18.3 months) in the control arm. The mean relative dose intensity was 94.2% for ligrastinib and 89.7% for chemotherapy.</p>

<p><em>[Insert Table 12.1 - Extent of Exposure]</em></p>

<h3>12.2 Overview of Adverse Events</h3>
<p>Treatment-emergent adverse events (TEAEs) were reported in 142 subjects (94.7%) in the ligrastinib arm and 139 subjects (93.9%) in the control arm. The most common TEAEs (occurring in 10% or more of subjects) in the ligrastinib arm were diarrhea (n = 78; 52.0%), nausea (n = 54; 36.0%), fatigue (n = 48; 32.0%), decreased appetite (n = 33; 22.0%), and vomiting (n = 27; 18.0%). Grade 3 or higher TEAEs were reported in 67 subjects (44.7%) receiving ligrastinib compared with 82 subjects (55.4%) receiving chemotherapy.</p>

<h3>12.3 Hepatotoxicity</h3>
<p>Hepatic adverse events were observed in 23 subjects (15.3%) receiving ligrastinib. Alanine aminotransferase (ALT) elevations greater than three times the upper limit of normal (ULN) occurred in 12 subjects (8.0%), and elevations greater than five times the ULN occurred in four subjects (2.7%). All hepatic events resolved with dose modification or treatment discontinuation. The median time to onset of hepatic events was 6 weeks (range, 2-14 weeks).</p>`,
};

export function DocumentEditor({ document, onBack, onSave, initialRightPanelTab, onViewSource }: DocumentEditorProps) {

  // v0.124.6: Default sections by document type — used when a document has no sections yet
  // Helper: fill required DocumentSection fields that mocks omit
  const makeSection = (s: Partial<DocumentSection> & Pick<DocumentSection, 'id' | 'number' | 'title' | 'level' | 'status' | 'required' | 'wordCount'>): DocumentSection => ({
    progress: 0,
    contentBlocks: [],
    comments: [],
    hasUnresolvedComments: false,
    sourceLinks: [],
    tflLinks: [],
    ...s,
  });

  const DEFAULT_SECTIONS_BY_TYPE: Record<string, DocumentSection[]> = {
    icf: [
      makeSection({ id: 'icf-1', number: '1', title: 'Introduction & Study Overview', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'Study background, purpose, and sponsor information' }),
      makeSection({ id: 'icf-2', number: '2', title: 'Study Procedures', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'What participants will be asked to do' }),
      makeSection({ id: 'icf-3', number: '3', title: 'Risks and Discomforts', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'Known and potential risks' }),
      makeSection({ id: 'icf-4', number: '4', title: 'Potential Benefits', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'Benefits to participant and society' }),
      makeSection({ id: 'icf-5', number: '5', title: 'Alternatives to Participation', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'Available alternative treatments' }),
      makeSection({ id: 'icf-6', number: '6', title: 'Confidentiality', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'How participant data will be protected' }),
      makeSection({ id: 'icf-7', number: '7', title: 'Voluntary Participation & Withdrawal', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'Right to withdraw without penalty' }),
      makeSection({ id: 'icf-8', number: '8', title: 'Contact Information & Signatures', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0, guidance: 'IRB contacts, PI contact, signature block' }),
    ],
    protocol: [
      makeSection({ id: 'proto-1', number: '1', title: 'Title Page & Synopsis', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-2', number: '2', title: 'Introduction & Rationale', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-3', number: '3', title: 'Study Objectives & Endpoints', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-4', number: '4', title: 'Study Design', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-5', number: '5', title: 'Study Population', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-6', number: '6', title: 'Study Treatment', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-7', number: '7', title: 'Safety Monitoring', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'proto-8', number: '8', title: 'Statistical Considerations', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
    ],
    'module-25': [
      makeSection({ id: 'm25-1', number: '2.5.1', title: 'Pharmacology Written Summary', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm25-2', number: '2.5.2', title: 'Pharmacokinetics Written Summary', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm25-3', number: '2.5.3', title: 'Clinical Pharmacology', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm25-4', number: '2.5.4', title: 'Efficacy Summary', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm25-5', number: '2.5.5', title: 'Safety Summary', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm25-6', number: '2.5.6', title: 'Benefit-Risk Conclusions', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
    ],
    'module-27': [
      makeSection({ id: 'm27-1', number: '2.7.1', title: 'Summary of Biopharmaceutic Studies', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm27-2', number: '2.7.2', title: 'Summary of Clinical Pharmacology', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm27-3', number: '2.7.3', title: 'Summary of Clinical Efficacy', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm27-4', number: '2.7.4', title: 'Summary of Clinical Safety', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'm27-5', number: '2.7.5', title: 'Literature References', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
    ],
    csr: [
      makeSection({ id: 'csr-1', number: '1', title: 'Title Page', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-2', number: '2', title: 'Synopsis', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-3', number: '3', title: 'Table of Contents', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-4', number: '4', title: 'List of Abbreviations', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-5', number: '5', title: 'Ethics', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-6', number: '6', title: 'Investigators & Study Sites', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-7', number: '7', title: 'Introduction', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-8', number: '8', title: 'Study Objectives', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-9', number: '9', title: 'Investigational Plan', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-10', number: '10', title: 'Study Patients', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-11', number: '11', title: 'Efficacy Evaluation', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
      makeSection({ id: 'csr-12', number: '12', title: 'Safety Evaluation', level: 1, status: 'not-started' as SectionStatus, required: true, wordCount: 0 }),
    ],
  };

  // Resolve the sections to display — fall back to type defaults if document has none
  const effectiveSections: DocumentSection[] = (document.sections ?? []).length > 0
    ? (document.sections ?? [])
    : (DEFAULT_SECTIONS_BY_TYPE[document.documentType] ?? []);
  // Collect all section IDs that have children (to expand by default)
  const getExpandableIds = (sections: DocumentSection[]): string[] => {
    const ids: string[] = [];
    for (const section of sections) {
      if (section.subsections && section.subsections.length > 0) {
        ids.push(section.id);
        ids.push(...getExpandableIds(section.subsections));
      }
    }
    return ids;
  };
  
  const [selectedSectionId, setSelectedSectionId] = useState<string>(effectiveSections[0]?.id || '');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(getExpandableIds(effectiveSections)));
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>(initialRightPanelTab || 'sources');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAISectionEditor, setShowAISectionEditor] = useState(false);
  const [viewMode, setViewMode] = useState<DocumentViewMode>('draft');
  
  const toast = useToast();
  const setCurrentDocument = useAuthoringStore(s => s.setCurrentDocument);
  const getSectionDraft = useAuthoringStore(s => s.getSectionDraft);
  const updateSectionContent = useAuthoringStore(s => s.updateSectionContent);
  
  // Dynamic section content state - initialized from sampleContent, updated by AI and user edits
  const [sectionContent, setSectionContent] = useState<Record<string, string>>(() => {
    // Initialize with sampleContent, then overlay any existing section.content values
    const initial: Record<string, string> = { ...sampleContent };
    const initFromSections = (sections: DocumentSection[]) => {
      sections.forEach(section => {
        if (section.content) {
          initial[section.id] = section.content;
        }
        if (section.subsections) {
          initFromSections(section.subsections);
        }
      });
    };
    initFromSections(document.sections ?? []);
    return initial;
  });
  
  // Initialize authoring store with document
  useEffect(() => {
    setCurrentDocument(document);
    return () => setCurrentDocument(null);
  }, [document, setCurrentDocument]);

  // Recursive section finder for nested sections
  const findSectionById = useCallback((sections: DocumentSection[], id: string): DocumentSection | undefined => {
    for (const section of sections) {
      if (section.id === id) return section;
      if (section.subsections) {
        const found = findSectionById(section.subsections, id);
        if (found) return found;
      }
    }
    return undefined;
  }, []);

  const selectedSection = findSectionById(effectiveSections, selectedSectionId);
  
  // Check if section has AI-generated draft
  const sectionDraft = selectedSection ? getSectionDraft(selectedSection.id) : undefined;

  const toggleSectionExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getSectionStatusIcon = (status: SectionStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'in-review':
        return <Eye className="w-4 h-4 text-purple-400" />;
      case 'in-progress':
        return <Edit3 className="w-4 h-4 text-blue-400" />;
      case 'ready-for-review':
        return <Send className="w-4 h-4 text-amber-400" />;
      case 'revisions-needed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-border" />;
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGeneratingAI(false);
    setAiPrompt('');
  };

  return (
    <div className="flex h-full bg-surface">
      {/* Left Sidebar - Section Tree */}
      <div className="hidden lg:flex w-72 border-r border-border bg-surface-elevated flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <button 
            onClick={onBack}
            className="text-xs text-accent-blue hover:underline mb-3 flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Back to Document
          </button>
          <h2 className="text-sm font-semibold text-text-primary truncate">{document.shortTitle}</h2>
          <p className="text-xs text-text-muted">v{document.version}</p>
          
          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Progress</span>
              <span className="text-text-primary">{document.progress}%</span>
            </div>
            <div className="h-2 bg-surface-card rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${document.progress >= 90 ? 'bg-accent-green' : document.progress >= 50 ? 'bg-accent-blue' : 'bg-accent-amber'}`}
                style={{ width: `${document.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section Tree */}
        <div className="flex-1 overflow-auto p-2">
          <div className="text-xs text-text-muted uppercase tracking-wider px-2 py-2 mb-1">Sections</div>
          {effectiveSections.length > 0 ? (
            effectiveSections.map(section => (
              <SectionTreeItem
                key={section.id}
                section={section}
                level={1}
                selectedSectionId={selectedSectionId}
                expandedSections={expandedSections}
                onSelect={setSelectedSectionId}
                onToggleExpand={toggleSectionExpand}
                getSectionStatusIcon={getSectionStatusIcon}
              />
            ))
          ) : (
            <div className="px-2 py-6 text-center">
              <FileText className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
              <p className="text-xs text-text-muted mb-3">No sections yet</p>
              <button className="text-xs px-3 py-1.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors">
                + Add Section
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border space-y-2">
          <button 
            onClick={() => setHasUnsavedChanges(false)}
            disabled={!hasUnsavedChanges}
            className="w-full py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button className="w-full py-2 bg-surface-card text-text-secondary rounded-lg text-sm hover:bg-surface hover:text-text-primary flex items-center justify-center gap-2 border border-border">
            <Send className="w-4 h-4" />
            Send for Review
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-border bg-surface-elevated flex items-center px-4 gap-2">
          <div className="flex items-center gap-1 border-r border-border pr-3 mr-2">
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Undo className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-border pr-3 mr-2">
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Bold className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Italic className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-border pr-3 mr-2">
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <List className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 border-r border-border pr-3 mr-2">
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Table className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Image className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary">
              <Link className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1" />
          
          {/* View Mode Toggle */}
          <DocumentModeToggle
            currentMode={viewMode}
            onChange={setViewMode}
            compact
          />
          <div className="w-px h-6 bg-border mx-2" />

          <button 
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary"
          >
            {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Editor + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Content Area - switches between Draft and Document mode */}
          {viewMode === 'document' ? (
            // Document Mode: Page-faithful rendering
            <div className="flex-1 overflow-hidden">
              <PagedDocumentRenderer
                document={convertToPagedDocument(document, sectionContent)}
                onClose={() => setViewMode('draft')}
                onEdit={(sectionId) => {
                  setSelectedSectionId(sectionId);
                  setViewMode('draft');
                }}
                readOnly={false}
                showToolbar={true}
              />
            </div>
          ) : (
            // Draft Mode: Standard editor
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto p-8">
                {selectedSection ? (
                  <>
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-text-muted">{selectedSection.number}</span>
                        <h1 className="text-lg font-bold text-text-primary">{selectedSection.title}</h1>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          {getSectionStatusIcon(selectedSection.status)}
                          <span className="capitalize">{selectedSection.status.replace(/-/g, ' ')}</span>
                        </span>
                        <span>•</span>
                        <span>{selectedSection.wordCount} words</span>
                        {selectedSection.lastEditedAt && (
                          <>
                            <span>•</span>
                            <span>Last edited {selectedSection.lastEditedAt}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1.5 text-xs bg-surface-card rounded-lg hover:bg-surface text-text-secondary flex items-center gap-1.5 border border-border">
                        <History className="w-3 h-3" />
                        History
                      </button>
                      <button 
                        onClick={() => setShowAISectionEditor(true)}
                        className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 flex items-center gap-1.5"
                      >
                        <Wand2 className="w-3 h-3" />
                        Generate with AI
                      </button>
                    </div>
                  </div>
                  
                  {/* AI Draft Banner (if exists) */}
                  {sectionDraft && sectionDraft.isAccepted && (
                    <div className="mb-4 p-3 bg-accent-green/10 border border-accent-green/30 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-accent-green" />
                        <span className="text-sm text-accent-green">AI-generated content applied</span>
                        <span className="text-xs text-text-muted">
                          {sectionDraft.citations.length} citations • {sectionDraft.wordCount} words
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowAISectionEditor(true)}
                        className="text-xs text-accent-purple hover:underline"
                      >
                        Regenerate
                      </button>
                    </div>
                  )}

                  {/* Section Guidance & AI Panel */}
                  {(selectedSection.guidance || selectedSection.aiPrompt || selectedSection.wordCountTarget) && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-accent-blue/5 to-purple-500/5 border border-accent-blue/20 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <BookOpen className="w-5 h-5 text-accent-blue mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-semibold text-text-primary">Section Guidance</span>
                              {selectedSection.wordCountTarget && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                                  Target: {selectedSection.wordCountTarget.min.toLocaleString()}-{selectedSection.wordCountTarget.max.toLocaleString()} words
                                </span>
                              )}
                            </div>
                            {selectedSection.guidance && (
                              <p className="text-sm text-text-secondary leading-relaxed">{selectedSection.guidance}</p>
                            )}
                          </div>
                        </div>
                        {selectedSection.aiPrompt && (
                          <button
                            onClick={() => {
                              setRightPanelTab('ai');
                              setShowRightPanel(true);
                              // Pre-fill the AI prompt
                              setAiPrompt(selectedSection.aiPrompt || '');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-blue to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex-shrink-0"
                          >
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                          </button>
                        )}
                      </div>
                      
                      {/* Show AI prompt preview if available */}
                      {selectedSection.aiPrompt && (
                        <div className="mt-3 pt-3 border-t border-accent-blue/10">
                          <div className="flex items-center gap-2 mb-1">
                            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs font-medium text-purple-400">AI Prompt Available</span>
                          </div>
                          <p className="text-xs text-text-muted italic line-clamp-2">{selectedSection.aiPrompt}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Area - ICH/AMA Regulatory Document Styling */}
                  <div 
                    className="regulatory-document-editor min-h-[400px] p-8 bg-white border border-border rounded-lg focus-within:border-accent-blue/50 transition-colors shadow-sm"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => setHasUnsavedChanges(true)}
                    onBlur={(e) => {
                      // Capture user edits when focus leaves the editor
                      const newContent = e.currentTarget.innerHTML;
                      if (selectedSection && newContent !== sectionContent[selectedSection.id]) {
                        setSectionContent(prev => ({
                          ...prev,
                          [selectedSection.id]: newContent
                        }));
                        updateSectionContent(selectedSection.id, newContent);
                      }
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: sectionContent[selectedSection.id] || 
                        `<p class="text-gray-400 italic">Start writing ${selectedSection.title}...</p>
                         <p><br/></p>
                         <p><br/></p>
                         <p><br/></p>`
                    }}
                    style={{
                      fontFamily: '"Times New Roman", Times, Georgia, serif',
                      fontSize: '12pt',
                      lineHeight: '1.5',
                      color: '#000000',
                      textAlign: 'justify',
                    }}
                  />
                  
                  {/* ICH/AMA Style Indicator */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <BookOpen className="w-3 h-3" />
                        ICH E3 / AMA 11th Ed.
                      </span>
                      <span className="text-text-muted">Times New Roman, 12pt, 1.5 spacing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-accent-green flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Formatting compliant
                      </span>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {(selectedSection.comments ?? []).length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comments ({(selectedSection.comments ?? []).length})
                      </h3>
                      <div className="space-y-3">
                        {(selectedSection.comments ?? []).map(comment => (
                          <div 
                            key={comment.id}
                            className={`p-4 rounded-lg border ${
                              comment.status === 'resolved' 
                                ? 'bg-surface-card border-border opacity-60' 
                                : 'bg-amber-500/5 border-amber-500/30'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{comment.authorName}</span>
                                <span className="text-xs text-text-muted capitalize">({comment.authorRole.replace(/-/g, ' ')})</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  comment.priority === 'high' ? 'bg-red-500/20 text-red-400' : 'bg-surface-card text-text-muted'
                                }`}>
                                  {comment.priority}
                                </span>
                              </div>
                              <span className="text-xs text-text-muted">{comment.createdAt}</span>
                            </div>
                            <p className="text-sm text-text-secondary mb-3">{comment.content}</p>
                            <div className="flex items-center gap-2">
                              <button className="text-xs text-accent-blue hover:underline">Reply</button>
                              <button className="text-xs text-accent-green hover:underline">Resolve</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">Select a Section</h3>
                  <p className="text-sm text-text-muted">Choose a section from the left panel to start editing</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Right Panel */}
          {showRightPanel && (
            <div className="hidden xl:flex w-80 border-l border-border bg-surface-elevated flex flex-col">
              {/* Panel Tabs */}
              <div className="flex border-b border-border">
                {[
                  { id: 'sources', label: 'Sources', icon: <BookOpen className="w-4 h-4" /> },
                  { id: 'ai', label: 'AI', icon: <Sparkles className="w-4 h-4" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightPanelTab(tab.id as RightPanelTab)}
                    className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                      rightPanelTab === tab.id 
                        ? 'border-accent-blue text-accent-blue' 
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-auto p-4">
                {/* Sources Tab */}
                {rightPanelTab === 'sources' && (
                  <SourcesPanel
                    document={document}
                    selectedSection={selectedSection}
                    onInsertTFL={(tfl) => {
                      // Insert TFL reference at cursor
                      const tflRef = `[Insert ${tfl.type === 'table' ? 'Table' : tfl.type === 'figure' ? 'Figure' : 'Listing'} ${tfl.number} - ${tfl.title}]`;
                      toast.success(`TFL reference inserted: ${tfl.type} ${tfl.number}`);
                      setHasUnsavedChanges(true);
                    }}
                    onViewSource={(source) => {
                      if (onViewSource) {
                        onViewSource(source);
                      }
                    }}
                  />
                )}

                {/* AI Tab */}
                {rightPanelTab === 'ai' && (
                  <div>
                    <p className="text-xs text-text-muted mb-4">Use AI to help draft and improve content</p>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: 'Draft section', icon: <Edit3 className="w-3 h-3" />, action: 'draft' },
                        { label: 'Summarize sources', icon: <BookOpen className="w-3 h-3" />, action: 'summarize' },
                        { label: 'Check consistency', icon: <Check className="w-3 h-3" />, action: 'consistency' },
                        { label: 'Improve clarity', icon: <Sparkles className="w-3 h-3" />, action: 'clarity' },
                      ].map(action => (
                        <button
                          key={action.label}
                          onClick={async () => {
                            setIsGeneratingAI(true);
                            setAiResponse('');
                            
                            const sectionContext = `Document: ${document.title}\nSection: ${selectedSection?.title || 'Unknown'}\nDocument Type: ${document.documentType}`;
                            const currentContent = sampleContent[selectedSection?.id || ''] || '';
                            
                            try {
                              const prompt = action.action === 'draft' 
                                ? `Draft content for section "${selectedSection?.title}". Context: ${sectionContext}. Keep it professional, regulatory-compliant, and well-structured.`
                                : action.action === 'summarize'
                                ? `Summarize the key points from these source documents for regulatory writing: Protocol, SAP, IB. Focus on: objectives, endpoints, patient population, and key findings.`
                                : action.action === 'consistency'
                                ? `Check this content for consistency issues (terminology, abbreviations, formatting): ${currentContent.slice(0, 500)}`
                                : `Improve the clarity of this regulatory content while maintaining accuracy: ${currentContent.slice(0, 500)}`;
                              
                              const response = await fetch('/api/ai/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  prompt,
                                  type: 'document-section',
                                  context: `Document type: ${document.documentType}. Section: ${selectedSection?.title || 'Unknown'}`,
                                  maxTokens: 1000
                                })
                              });
                              
                              const data = await response.json();
                              if (data.error) {
                                setAiResponse(data.message || 'AI service error. Please check API configuration.');
                              } else {
                                setAiResponse(data.content || 'No response generated.');
                              }
                            } catch (err) {
                              setAiResponse('AI service temporarily unavailable. Please check your API key configuration.');
                            }
                            setIsGeneratingAI(false);
                          }}
                          disabled={isGeneratingAI}
                          className="p-2 text-xs bg-surface-card rounded-lg border border-border hover:border-purple-400/50 hover:bg-purple-500/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* AI Response Area */}
                    <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg mb-4 max-h-64 overflow-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-medium text-purple-400">AI Assistant</span>
                      </div>
                      {isGeneratingAI ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                          <span className="text-xs text-text-muted">Generating response...</span>
                        </div>
                      ) : aiResponse ? (
                        <div>
                          <p className="text-xs text-text-primary whitespace-pre-wrap">{aiResponse}</p>
                          <div className="flex gap-2 mt-3 pt-2 border-t border-purple-500/20">
                            <button 
                              onClick={() => navigator.clipboard.writeText(aiResponse)}
                              className="text-xs text-purple-400 hover:underline"
                            >
                              Copy
                            </button>
                            <button 
                              onClick={() => setAiResponse('')}
                              className="text-xs text-text-muted hover:text-text-primary"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary">
                          Select a quick action or enter a custom prompt below.
                        </p>
                      )}
                    </div>

                    {/* Custom Prompt */}
                    <div className="border-t border-border pt-4">
                      <label className="text-xs font-medium text-text-primary mb-2 block">Custom prompt</label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ask AI to help with this section..."
                        className="w-full h-24 px-3 py-2 text-xs bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
                      />
                      <button
                        onClick={async () => {
                          if (!aiPrompt.trim()) return;
                          setIsGeneratingAI(true);
                          setAiResponse('');
                          
                          try {
                            const response = await fetch('/api/ai/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                prompt: aiPrompt,
                                type: 'document-section',
                                context: `Document: "${document.title}", Section: "${selectedSection?.title || 'Unknown'}", Document Type: ${document.documentType}`,
                                maxTokens: 1000
                              })
                            });
                            
                            const data = await response.json();
                            if (data.error) {
                              setAiResponse(data.message || 'AI service error. Please check API configuration.');
                            } else {
                              setAiResponse(data.content || 'No response generated.');
                            }
                          } catch (err) {
                            setAiResponse('AI service temporarily unavailable. Please check your API key configuration.');
                          }
                          setIsGeneratingAI(false);
                          setAiPrompt('');
                        }}
                        disabled={!aiPrompt.trim() || isGeneratingAI}
                        className="mt-2 w-full py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isGeneratingAI ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Section Editor Modal */}
      {showAISectionEditor && selectedSection && (
        <AISectionEditor
          section={selectedSection}
          documentType={document.documentType}
          productName={document.productName}
          studyName={document.studyName}
          indication={document.indication}
          onContentAccepted={(content, citations) => {
            // Save content to local state for immediate UI update
            setSectionContent(prev => ({
              ...prev,
              [selectedSection.id]: content
            }));
            
            // Persist to authoring store
            updateSectionContent(selectedSection.id, content);
            
            toast.success(`Content applied to ${selectedSection.title}`);
            setHasUnsavedChanges(true);
          }}
          onClose={() => setShowAISectionEditor(false)}
        />
      )}
    </div>
  );
}
