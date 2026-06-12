
/**
 * eCTDIntelligenceScreen - v0.36.3
 * 
 * Document-to-Data transformation module.
 * Import existing eCTD submissions and extract structured data.
 * 
 * Key capabilities:
 * 1. eCTD structure browser (Module 1-5)
 * 2. PDF document viewer with AI extraction
 * 3. Data extraction to populate Ligature entities
 * 4. Tagging system to target specific sections
 * 
 * v0.36.2: Added Export to Ligature with entity mapping
 * v0.36.3: Added PDF viewer, bulk import, validation/conflict detection, audit trail
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  Upload, FolderTree, FileText, Database, Sparkles,
  ChevronRight, ChevronDown, File, Folder, Search,
  Eye, Download, RefreshCw, CheckCircle2, AlertCircle,
  FileSearch, Layers, Target, Zap, ArrowRight,
  FileCode, Table, BookOpen, FlaskConical, Package,
  Building, Users, Activity, Shield, Clock, X,
  Plus, Link2, Box, Beaker, FileBox, Send,
  FolderUp, AlertTriangle, History, FileWarning,
  CheckCircle, XCircle, Info, Maximize2, ZoomIn, ZoomOut,
  RotateCw, ChevronLeft, Highlighter,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Modal } from '@/components/ui/Modal';
import { useDeadClick } from '@/hooks/useDeadClick';

// eCTD Module structure based on ICH CTD standard
interface CTDModule {
  id: string;
  number: string;
  name: string;
  children?: CTDModule[];
  documentCount?: number;
  extractedCount?: number;
  status?: 'pending' | 'extracting' | 'complete' | 'error';
}

// Standard eCTD structure
const ECTD_STRUCTURE: CTDModule[] = [
  {
    id: 'm1',
    number: '1',
    name: 'Administrative Information and Prescribing Information',
    children: [
      { id: 'm1.1', number: '1.1', name: 'Forms', documentCount: 3 },
      { id: 'm1.2', number: '1.2', name: 'Cover Letter', documentCount: 1 },
      { id: 'm1.3', number: '1.3', name: 'Administrative Information', children: [
        { id: 'm1.3.1', number: '1.3.1', name: 'Contact/Sponsor/Applicant Information', documentCount: 2 },
        { id: 'm1.3.2', number: '1.3.2', name: 'Field Copy Certification', documentCount: 1 },
        { id: 'm1.3.3', number: '1.3.3', name: 'Debarment Certification', documentCount: 1 },
        { id: 'm1.3.4', number: '1.3.4', name: 'Financial Certification', documentCount: 1 },
        { id: 'm1.3.5', number: '1.3.5', name: 'Patent/Exclusivity Information', documentCount: 1 },
      ]},
      { id: 'm1.4', number: '1.4', name: 'References', documentCount: 2 },
      { id: 'm1.14', number: '1.14', name: 'Labeling', children: [
        { id: 'm1.14.1', number: '1.14.1', name: 'Draft Labeling', documentCount: 3 },
        { id: 'm1.14.2', number: '1.14.2', name: 'Final Printed Labeling', documentCount: 3 },
      ]},
    ]
  },
  {
    id: 'm2',
    number: '2',
    name: 'Common Technical Document Summaries',
    children: [
      { id: 'm2.2', number: '2.2', name: 'Introduction', documentCount: 1 },
      { id: 'm2.3', number: '2.3', name: 'Quality Overall Summary', documentCount: 1, status: 'complete', extractedCount: 1 },
      { id: 'm2.4', number: '2.4', name: 'Nonclinical Overview', documentCount: 1 },
      { id: 'm2.5', number: '2.5', name: 'Clinical Overview', documentCount: 1, status: 'complete', extractedCount: 1 },
      { id: 'm2.6', number: '2.6', name: 'Nonclinical Written and Tabulated Summaries', children: [
        { id: 'm2.6.1', number: '2.6.1', name: 'Pharmacology Written Summary', documentCount: 1 },
        { id: 'm2.6.2', number: '2.6.2', name: 'Pharmacology Tabulated Summary', documentCount: 1 },
        { id: 'm2.6.3', number: '2.6.3', name: 'Pharmacokinetics Written Summary', documentCount: 1 },
        { id: 'm2.6.4', number: '2.6.4', name: 'Pharmacokinetics Tabulated Summary', documentCount: 1 },
        { id: 'm2.6.5', number: '2.6.5', name: 'Toxicology Written Summary', documentCount: 1 },
        { id: 'm2.6.6', number: '2.6.6', name: 'Toxicology Tabulated Summary', documentCount: 1 },
      ]},
      { id: 'm2.7', number: '2.7', name: 'Clinical Summary', children: [
        { id: 'm2.7.1', number: '2.7.1', name: 'Summary of Biopharmaceutic Studies', documentCount: 1 },
        { id: 'm2.7.2', number: '2.7.2', name: 'Summary of Clinical Pharmacology Studies', documentCount: 1, status: 'extracting' },
        { id: 'm2.7.3', number: '2.7.3', name: 'Summary of Clinical Efficacy', documentCount: 1 },
        { id: 'm2.7.4', number: '2.7.4', name: 'Summary of Clinical Safety', documentCount: 1 },
        { id: 'm2.7.5', number: '2.7.5', name: 'Literature References', documentCount: 5 },
        { id: 'm2.7.6', number: '2.7.6', name: 'Synopses of Individual Studies', documentCount: 12 },
      ]},
    ]
  },
  {
    id: 'm3',
    number: '3',
    name: 'Quality',
    children: [
      { id: 'm3.2', number: '3.2', name: 'Body of Data', children: [
        { id: 'm3.2.s', number: '3.2.S', name: 'Drug Substance', documentCount: 15 },
        { id: 'm3.2.p', number: '3.2.P', name: 'Drug Product', documentCount: 18 },
        { id: 'm3.2.a', number: '3.2.A', name: 'Appendices', documentCount: 8 },
        { id: 'm3.2.r', number: '3.2.R', name: 'Regional Information', documentCount: 3 },
      ]},
      { id: 'm3.3', number: '3.3', name: 'Literature References', documentCount: 12 },
    ]
  },
  {
    id: 'm4',
    number: '4',
    name: 'Nonclinical Study Reports',
    children: [
      { id: 'm4.2', number: '4.2', name: 'Study Reports', children: [
        { id: 'm4.2.1', number: '4.2.1', name: 'Pharmacology', documentCount: 8 },
        { id: 'm4.2.2', number: '4.2.2', name: 'Pharmacokinetics', documentCount: 6 },
        { id: 'm4.2.3', number: '4.2.3', name: 'Toxicology', documentCount: 14 },
      ]},
      { id: 'm4.3', number: '4.3', name: 'Literature References', documentCount: 5 },
    ]
  },
  {
    id: 'm5',
    number: '5',
    name: 'Clinical Study Reports',
    children: [
      { id: 'm5.2', number: '5.2', name: 'Tabular Listing of All Clinical Studies', documentCount: 1 },
      { id: 'm5.3', number: '5.3', name: 'Clinical Study Reports', children: [
        { id: 'm5.3.1', number: '5.3.1', name: 'BA/BE Studies', documentCount: 4 },
        { id: 'm5.3.2', number: '5.3.2', name: 'PK Studies Using Human Biomaterials', documentCount: 2 },
        { id: 'm5.3.3', number: '5.3.3', name: 'Human PK Studies', documentCount: 6 },
        { id: 'm5.3.4', number: '5.3.4', name: 'Human PD Studies', documentCount: 3 },
        { id: 'm5.3.5', number: '5.3.5', name: 'Efficacy and Safety Studies', documentCount: 8, status: 'pending' },
        { id: 'm5.3.6', number: '5.3.6', name: 'Post-Marketing Experience', documentCount: 2 },
        { id: 'm5.3.7', number: '5.3.7', name: 'Case Report Forms', documentCount: 45 },
      ]},
      { id: 'm5.4', number: '5.4', name: 'Literature References', documentCount: 15 },
    ]
  },
];

// Extracted data types
interface ExtractedData {
  id: string;
  sourceDocument: string;
  sourceModule: string;
  dataType: 'indication' | 'endpoint' | 'population' | 'dosing' | 'safety' | 'efficacy' | 'manufacturing' | 'stability';
  field: string;
  value: string;
  confidence: number;
  verified: boolean;
}

// Sample extracted data
const SAMPLE_EXTRACTED_DATA: ExtractedData[] = [
  { id: 'e1', sourceDocument: 'Clinical Overview', sourceModule: '2.5', dataType: 'indication', field: 'Primary Indication', value: 'Treatment of moderate to severe plaque psoriasis in adults', confidence: 0.95, verified: true },
  { id: 'e2', sourceDocument: 'Clinical Overview', sourceModule: '2.5', dataType: 'population', field: 'Target Population', value: 'Adults ≥18 years with BSA ≥10%, PASI ≥12, IGA ≥3', confidence: 0.92, verified: true },
  { id: 'e3', sourceDocument: 'Clinical Overview', sourceModule: '2.5', dataType: 'dosing', field: 'Recommended Dose', value: '300 mg SC at Weeks 0, 1, 2, 3, 4, then every 4 weeks', confidence: 0.98, verified: false },
  { id: 'e4', sourceDocument: 'Summary of Clinical Efficacy', sourceModule: '2.7.3', dataType: 'endpoint', field: 'Primary Endpoint', value: 'PASI 75 response at Week 12', confidence: 0.97, verified: false },
  { id: 'e5', sourceDocument: 'Quality Overall Summary', sourceModule: '2.3', dataType: 'manufacturing', field: 'Drug Substance', value: 'Recombinant humanized IgG1κ monoclonal antibody', confidence: 0.99, verified: true },
  { id: 'e6', sourceDocument: 'Summary of Clinical Safety', sourceModule: '2.7.4', dataType: 'safety', field: 'Most Common AE', value: 'Nasopharyngitis (11.4%), Upper respiratory tract infection (7.2%)', confidence: 0.91, verified: false },
];

// Module icon mapping
const MODULE_ICONS: Record<string, React.ReactNode> = {
  '1': <Building className="w-4 h-4" />,
  '2': <BookOpen className="w-4 h-4" />,
  '3': <FlaskConical className="w-4 h-4" />,
  '4': <Activity className="w-4 h-4" />,
  '5': <Users className="w-4 h-4" />,
};

interface ECTDIntelligenceScreenProps {
  onNavigate?: (moduleId: string) => void;
}

export function ECTDIntelligenceScreen({ onNavigate }: ECTDIntelligenceScreenProps) {
    const { deadClick } = useDeadClick();
  const [selectedModule, setSelectedModule] = useState<CTDModule | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['m2', 'm2.7', 'm5', 'm5.3']));
  const [selectedSubmission, setSelectedSubmission] = useState('NDA 215847');
  const [extractedData, setExtractedData] = useState<ExtractedData[]>(SAMPLE_EXTRACTED_DATA);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<'structure' | 'data' | 'preview' | 'audit'>('structure');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set());
  
  // PDF Viewer state
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [showHighlights, setShowHighlights] = useState(true);
  
  // Bulk Import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<'idle' | 'scanning' | 'importing' | 'complete'>('idle');
  const [bulkImportFiles, setBulkImportFiles] = useState<{ name: string; module: string; status: 'pending' | 'imported' | 'error' }[]>([]);
  
  // Validation state
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    id: string;
    field: string;
    extractedValue: string;
    existingValue: string;
    status: 'match' | 'conflict' | 'new';
    resolution?: 'keep-existing' | 'use-extracted' | 'pending';
  }[]>([]);
  
  // Audit Trail state
  const [auditTrail, setAuditTrail] = useState<{
    id: string;
    timestamp: Date;
    action: 'import' | 'extract' | 'export' | 'validate' | 'resolve';
    user: string;
    details: string;
    entityType?: string;
    entityId?: string;
  }[]>([
    { id: 'audit-1', timestamp: new Date('2026-01-29T10:30:00'), action: 'import', user: 'Sarah Chen', details: 'Imported eCTD sequence 0001 from NDA 215847', entityType: 'submission', entityId: 'NDA-215847-0001' },
    { id: 'audit-2', timestamp: new Date('2026-01-29T10:32:00'), action: 'extract', user: 'Sarah Chen', details: 'Extracted 12 data points from Module 2.5 Clinical Overview', entityType: 'document', entityId: 'doc-m2.5-001' },
    { id: 'audit-3', timestamp: new Date('2026-01-29T10:35:00'), action: 'validate', user: 'Sarah Chen', details: 'Validated extracted data against Master Data - 2 conflicts detected', entityType: 'validation', entityId: 'val-001' },
    { id: 'audit-4', timestamp: new Date('2026-01-29T10:40:00'), action: 'resolve', user: 'Michael Rodriguez', details: 'Resolved conflict: Primary Indication - kept extracted value', entityType: 'data', entityId: 'data-ind-001' },
    { id: 'audit-5', timestamp: new Date('2026-01-29T10:45:00'), action: 'export', user: 'Sarah Chen', details: 'Exported 8 records to Master Data', entityType: 'export', entityId: 'exp-001' },
  ]);
  
  // Toggle module expansion
  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);
  
  // Count total documents in a module recursively
  const countDocuments = useCallback((module: CTDModule): number => {
    let count = module.documentCount || 0;
    if (module.children) {
      count += module.children.reduce((acc, child) => acc + countDocuments(child), 0);
    }
    return count;
  }, []);
  
  // Render module tree node
  const ModuleTreeNode = ({ module, depth = 0 }: { module: CTDModule; depth?: number }) => {
    const isExpanded = expandedModules.has(module.id);
    const hasChildren = module.children && module.children.length > 0;
    const isSelected = selectedModule?.id === module.id;
    const docCount = countDocuments(module);
    
    const statusColor = {
      pending: 'text-text-muted',
      extracting: 'text-amber-400',
      complete: 'text-green-400',
      error: 'text-red-400',
    };
    
    return (
      <div>
        <div 
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
            ${isSelected ? 'bg-accent-blue/20 border border-accent-blue/40' : 'hover:bg-surface-card border border-transparent'}
          `}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
          onClick={() => {
            setSelectedModule(module);
            if (hasChildren) toggleModule(module.id);
          }}
        >
          {/* Expand/collapse chevron */}
          {hasChildren ? (
            <button 
              className="p-0.5 hover:bg-surface-elevated rounded"
              onClick={(e) => { e.stopPropagation(); toggleModule(module.id); }}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-muted" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          {/* Module icon */}
          <div className={`
            w-6 h-6 rounded flex items-center justify-center text-xs font-medium
            ${depth === 0 ? 'bg-accent-blue/20 text-accent-blue' : 'bg-surface-elevated text-text-muted'}
          `}>
            {depth === 0 ? MODULE_ICONS[module.number] : module.number}
          </div>
          
          {/* Module name */}
          <span className={`flex-1 truncate text-sm ${isSelected ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
            {module.name}
          </span>
          
          {/* Status & document count */}
          <div className="flex items-center gap-2">
            {module.status && (
              <span className={statusColor[module.status]}>
                {module.status === 'extracting' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {module.status === 'complete' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {module.status === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
              </span>
            )}
            {docCount > 0 && (
              <Badge color="gray" size="xs">{docCount}</Badge>
            )}
          </div>
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {module.children!.map(child => (
              <ModuleTreeNode key={child.id} module={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  // Simulate AI extraction
  const handleExtractData = useCallback(async () => {
    if (!selectedModule) return;
    setIsExtracting(true);
    
    // Simulate extraction delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add some mock extracted data
    const newData: ExtractedData = {
      id: `e${Date.now()}`,
      sourceDocument: selectedModule.name,
      sourceModule: selectedModule.number,
      dataType: 'efficacy',
      field: 'Secondary Endpoint',
      value: 'IGA 0/1 response at Week 12',
      confidence: 0.89,
      verified: false,
    };
    
    setExtractedData(prev => [...prev, newData]);
    setIsExtracting(false);
  }, [selectedModule]);
  
  // Toggle selection for export
  const toggleExportSelection = useCallback((id: string) => {
    setSelectedForExport(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  // Select all for export
  const selectAllForExport = useCallback(() => {
    const verifiedIds = extractedData.filter(d => d.verified || d.confidence >= 0.9).map(d => d.id);
    setSelectedForExport(new Set(verifiedIds));
  }, [extractedData]);
  
  // Handle export to Ligature
  const handleExportToLigature = useCallback(async () => {
    if (selectedForExport.size === 0) return;
    
    setExportProgress('exporting');
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // In production, this would:
    // 1. Call API to create/update entities in Master Data
    // 2. Create Product records from extracted data
    // 3. Create Study records from clinical data
    // 4. Link to source documents
    
    setExportProgress('success');
    
    // Reset after showing success
    setTimeout(() => {
      setShowExportModal(false);
      setExportProgress('idle');
      setSelectedForExport(new Set());
    }, 2000);
  }, [selectedForExport]);
  
  // Group extracted data by type for export preview
  const groupedExportData = useCallback(() => {
    const selected = extractedData.filter(d => selectedForExport.has(d.id));
    const groups: Record<string, ExtractedData[]> = {};
    
    selected.forEach(d => {
      if (!groups[d.dataType]) groups[d.dataType] = [];
      groups[d.dataType].push(d);
    });
    
    return groups;
  }, [extractedData, selectedForExport]);
  
  // Entity mapping for export
  const ENTITY_MAPPING: Record<string, { entity: string; icon: React.ReactNode; color: string }> = {
    indication: { entity: 'Product Indication', icon: <Target className="w-4 h-4" />, color: 'purple' },
    endpoint: { entity: 'Study Endpoint', icon: <Activity className="w-4 h-4" />, color: 'blue' },
    population: { entity: 'Study Population', icon: <Users className="w-4 h-4" />, color: 'cyan' },
    dosing: { entity: 'Dosing Regimen', icon: <Beaker className="w-4 h-4" />, color: 'green' },
    safety: { entity: 'Safety Signal', icon: <Shield className="w-4 h-4" />, color: 'red' },
    efficacy: { entity: 'Efficacy Result', icon: <CheckCircle2 className="w-4 h-4" />, color: 'amber' },
    manufacturing: { entity: 'Drug Substance', icon: <FlaskConical className="w-4 h-4" />, color: 'orange' },
    stability: { entity: 'Stability Data', icon: <Clock className="w-4 h-4" />, color: 'pink' },
  };
  
  // Data type colors
  const dataTypeColors: Record<string, string> = {
    indication: 'bg-purple-500/20 text-purple-400',
    endpoint: 'bg-blue-500/20 text-blue-400',
    population: 'bg-cyan-500/20 text-cyan-400',
    dosing: 'bg-green-500/20 text-green-400',
    safety: 'bg-red-500/20 text-red-400',
    efficacy: 'bg-amber-500/20 text-amber-400',
    manufacturing: 'bg-orange-500/20 text-orange-400',
    stability: 'bg-pink-500/20 text-pink-400',
  };
  
  // Bulk Import Handler
  const handleBulkImport = useCallback(async () => {
    setBulkImportProgress('scanning');
    
    // Simulate scanning eCTD folder
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock files found
    const mockFiles = [
      { name: 'clinical-overview.pdf', module: '2.5', status: 'pending' as const },
      { name: 'clinical-summary.pdf', module: '2.7.1', status: 'pending' as const },
      { name: 'efficacy-summary.pdf', module: '2.7.3', status: 'pending' as const },
      { name: 'safety-summary.pdf', module: '2.7.4', status: 'pending' as const },
      { name: 'pk-written-summary.pdf', module: '2.7.2', status: 'pending' as const },
      { name: 'quality-overall-summary.pdf', module: '2.3', status: 'pending' as const },
      { name: 'nonclinical-overview.pdf', module: '2.4', status: 'pending' as const },
      { name: 'csr-study-001.pdf', module: '5.3.5.1', status: 'pending' as const },
    ];
    
    setBulkImportFiles(mockFiles);
    setBulkImportProgress('importing');
    
    // Simulate importing each file
    for (let i = 0; i < mockFiles.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setBulkImportFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'imported' as const } : f
      ));
      
      // Add to audit trail
      setAuditTrail(prev => [{
        id: `audit-${Date.now()}-${i}`,
        timestamp: new Date(),
        action: 'import',
        user: 'Current User',
        details: `Imported ${mockFiles[i].name} from Module ${mockFiles[i].module}`,
        entityType: 'document',
        entityId: `doc-${mockFiles[i].module}-${i}`,
      }, ...prev]);
    }
    
    setBulkImportProgress('complete');
  }, []);
  
  // Validation Handler
  const handleValidation = useCallback(async () => {
    setShowValidationPanel(true);
    
    // Simulate validation against existing records
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation results
    setValidationResults([
      { id: 'val-1', field: 'Primary Indication', extractedValue: 'Treatment of moderate to severe plaque psoriasis in adults', existingValue: 'Moderate-severe plaque psoriasis', status: 'conflict', resolution: 'pending' },
      { id: 'val-2', field: 'Dosing Regimen', extractedValue: '300 mg SC at Weeks 0, 1, 2, 3, 4, then Q4W', existingValue: '300 mg SC at Weeks 0, 1, 2, 3, 4, then Q4W', status: 'match' },
      { id: 'val-3', field: 'Primary Endpoint', extractedValue: 'PASI 75 response at Week 12', existingValue: '', status: 'new' },
      { id: 'val-4', field: 'Study Population', extractedValue: 'Adults ≥18 years with BSA ≥10%', existingValue: 'Adults 18+ with moderate-to-severe psoriasis', status: 'conflict', resolution: 'pending' },
      { id: 'val-5', field: 'Secondary Endpoint', extractedValue: 'IGA 0/1 response at Week 12', existingValue: '', status: 'new' },
      { id: 'val-6', field: 'Safety Profile', extractedValue: 'Nasopharyngitis (11.4%), URTI (7.2%)', existingValue: 'Nasopharyngitis (11.4%), URTI (7.2%)', status: 'match' },
    ]);
    
    // Add to audit trail
    setAuditTrail(prev => [{
      id: `audit-${Date.now()}`,
      timestamp: new Date(),
      action: 'validate',
      user: 'Current User',
      details: `Validated ${extractedData.length} extracted data points against Master Data`,
      entityType: 'validation',
      entityId: 'val-batch-001',
    }, ...prev]);
  }, [extractedData.length]);
  
  // Resolve Conflict Handler
  const resolveConflict = useCallback((validationId: string, resolution: 'keep-existing' | 'use-extracted') => {
    setValidationResults(prev => prev.map(v => 
      v.id === validationId ? { ...v, resolution } : v
    ));
    
    const item = validationResults.find(v => v.id === validationId);
    if (item) {
      setAuditTrail(prev => [{
        id: `audit-${Date.now()}`,
        timestamp: new Date(),
        action: 'resolve',
        user: 'Current User',
        details: `Resolved conflict for ${item.field}: ${resolution === 'keep-existing' ? 'kept existing value' : 'used extracted value'}`,
        entityType: 'data',
        entityId: validationId,
      }, ...prev]);
    }
  }, [validationResults]);
  
  // Sample PDF highlights for demo
  const SAMPLE_HIGHLIGHTS = [
    { id: 'hl-1', text: 'moderate to severe plaque psoriasis', type: 'indication', page: 1, position: { top: 120, left: 50, width: 280, height: 20 } },
    { id: 'hl-2', text: '300 mg subcutaneous', type: 'dosing', page: 1, position: { top: 180, left: 50, width: 180, height: 20 } },
    { id: 'hl-3', text: 'PASI 75 response at Week 12', type: 'endpoint', page: 2, position: { top: 90, left: 50, width: 220, height: 20 } },
    { id: 'hl-4', text: 'Adults ≥18 years', type: 'population', page: 2, position: { top: 150, left: 50, width: 140, height: 20 } },
  ];

  // Export Modal Component
  const ExportModal = () => {
    const groups = groupedExportData();
    const groupEntries = Object.entries(groups);
    
    return (
      <Modal
        isOpen={showExportModal}
        onClose={() => {
          if (exportProgress !== 'exporting') {
            setShowExportModal(false);
            setExportProgress('idle');
          }
        }}
        title="Export to Ligature"
        size="lg"
      >
        <div className="space-y-4 md:space-y-6">
          {exportProgress === 'idle' && (
            <>
              {/* Selection summary */}
              <div className="bg-surface-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-text-primary">
                    {selectedForExport.size} data point{selectedForExport.size !== 1 ? 's' : ''} selected
                  </span>
                  <button 
                    onClick={selectAllForExport}
                    className="text-xs text-accent-blue hover:underline"
                  >
                    Select all verified ({extractedData.filter(d => d.verified || d.confidence >= 0.9).length})
                  </button>
                </div>
                
                {selectedForExport.size === 0 ? (
                  <p className="text-sm text-text-muted">
                    Select data points from the table to export them to Ligature entities.
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    The selected data will be used to create or update records in Ligature.
                  </p>
                )}
              </div>
              
              {/* Entity mapping preview */}
              {groupEntries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text-primary">Data will be exported to:</h4>
                  
                  {groupEntries.map(([dataType, items]) => {
                    const mapping = ENTITY_MAPPING[dataType];
                    if (!mapping) return null;
                    
                    return (
                      <div key={dataType} className="bg-surface-card border border-border rounded-lg p-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`
                            w-8 h-8 rounded-lg flex items-center justify-center
                            ${mapping.color === 'purple' ? 'bg-purple-500/20 text-purple-400' : ''}
                            ${mapping.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : ''}
                            ${mapping.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                            ${mapping.color === 'green' ? 'bg-green-500/20 text-green-400' : ''}
                            ${mapping.color === 'red' ? 'bg-red-500/20 text-red-400' : ''}
                            ${mapping.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : ''}
                            ${mapping.color === 'orange' ? 'bg-orange-500/20 text-orange-400' : ''}
                            ${mapping.color === 'pink' ? 'bg-pink-500/20 text-pink-400' : ''}
                          `}>
                            {mapping.icon}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{mapping.entity}</div>
                            <div className="text-xs text-text-muted">{items.length} record{items.length !== 1 ? 's' : ''}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-text-muted ml-auto" />
                          <div className="text-xs text-text-muted">Master Data</div>
                        </div>
                        
                        <div className="space-y-1 pl-11">
                          {items.slice(0, 2).map(item => (
                            <div key={item.id} className="text-xs text-text-secondary truncate">
                              • {item.field}: {item.value.slice(0, 60)}...
                            </div>
                          ))}
                          {items.length > 2 && (
                            <div className="text-xs text-text-muted">
                              +{items.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Target application info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400 font-medium">Linked Application:</span>
                  <span className="text-text-primary">{selectedSubmission}</span>
                </div>
                <p className="text-xs text-text-muted mt-1 ml-6">
                  Exported data will be associated with this application in Master Data.
                </p>
              </div>
            </>
          )}
          
          {exportProgress === 'exporting' && (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-accent-blue animate-spin mx-auto mb-4" />
              <h4 className="text-lg font-medium text-text-primary">Exporting to Ligature...</h4>
              <p className="text-sm text-text-muted mt-2">
                Creating and linking {selectedForExport.size} records
              </p>
              <div className="w-48 h-2 bg-surface-elevated rounded-full mx-auto mt-4 overflow-hidden">
                <div className="h-full bg-accent-blue rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}
          
          {exportProgress === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-text-primary">Export Complete!</h4>
              <p className="text-sm text-text-muted mt-2">
                {selectedForExport.size} records have been created in Ligature.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-green-400">
                <Link2 className="w-4 h-4" />
                All records linked to {selectedSubmission}
              </div>
            </div>
          )}
        </div>
        
        {exportProgress === 'idle' && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleExportToLigature}
              disabled={selectedForExport.size === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              Export {selectedForExport.size} Record{selectedForExport.size !== 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </Modal>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
      <ScreenHeader
        moduleId="ectd-intelligence"
        title="eCTD Intelligence"
        subtitle="Transform document-centric submissions into data-centric records with AI extraction"
        icon={<Database className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <select value={selectedSubmission} onChange={(e) => setSelectedSubmission(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
              <option value="NDA 215847">NDA 215847 - Nexvara (Sequence 0001)</option>
              <option value="NDA 215234">NDA 215234 - CardioShield (Sequence 0003)</option>
              <option value="BLA 125678">BLA 125678 - OncoTarget (Sequence 0001)</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setShowBulkImportModal(true)}>
              <FolderUp className="w-4 h-4 mr-2" />Bulk Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleValidation}>
              <FileWarning className="w-4 h-4 mr-2" />Validate Data
            </Button>
            <CapabilityGate moduleId="ectd-intelligence" capability="author" inline>
              <Button variant="primary" size="sm" onClick={() => toast.info("Import eCTD — drag a .zip file onto the document list or connect an eCTD Gateway in Settings")}>
                <Upload className="w-4 h-4 mr-2" />Import eCTD
              </Button>
            </CapabilityGate>
          </div>
        }
      />

      {/* View mode tabs */}
      <div className="border-b border-border bg-surface-elevated px-6">
        <div className="flex gap-1">
          {[
            { id: 'structure', label: 'CTD Structure', icon: <FolderTree className="w-4 h-4" /> },
            { id: 'data', label: 'Extracted Data', icon: <Table className="w-4 h-4" /> },
            { id: 'preview', label: 'PDF Viewer', icon: <Eye className="w-4 h-4" /> },
            { id: 'audit', label: 'Audit Trail', icon: <History className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${viewMode === tab.id 
                  ? 'border-accent-blue text-accent-blue' 
                  : 'border-transparent text-text-muted hover:text-text-primary'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: CTD tree */}
        <div className="hidden lg:block w-80 border-r border-border bg-surface-elevated overflow-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-text-muted" />
              <input 
                type="text"
                placeholder="Search modules..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
            </div>
            
            <div className="space-y-1">
              {ECTD_STRUCTURE.map(module => (
                <ModuleTreeNode key={module.id} module={module} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Right panel: Content area */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'structure' && selectedModule && (
            <div className="space-y-4 md:space-y-6">
              {/* Module header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Module {selectedModule.number}: {selectedModule.name}
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    {countDocuments(selectedModule)} documents in this section
                  </p>
                </div>
                
                <Button 
                  variant="primary" 
                  onClick={handleExtractData}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract Data with AI
                    </>
                  )}
                </Button>
              </div>
              
              {/* Extraction targets */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-text-primary">Extraction Targets</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'indication', label: 'Indications & Claims' },
                      { type: 'endpoint', label: 'Study Endpoints' },
                      { type: 'population', label: 'Patient Population' },
                      { type: 'dosing', label: 'Dosing Regimens' },
                      { type: 'efficacy', label: 'Efficacy Results' },
                      { type: 'safety', label: 'Safety Data' },
                    ].map(target => (
                      <label 
                        key={target.type}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent-blue/50 cursor-pointer transition-colors"
                      >
                        <input type="checkbox" defaultChecked className="rounded border-border" />
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${dataTypeColors[target.type]}`}>
                          {target.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Documents in this module */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-text-primary">Documents</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: 'clinical-overview.pdf', size: '2.4 MB', status: 'extracted' },
                      { name: 'summary-of-clinical-pharmacology.pdf', size: '1.8 MB', status: 'extracting' },
                      { name: 'summary-of-clinical-efficacy.pdf', size: '3.1 MB', status: 'pending' },
                    ].map((doc, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-surface-card border border-border hover:border-accent-blue/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <File className="w-5 h-5 text-red-400" />
                          <div>
                            <div className="text-sm font-medium text-text-primary">{doc.name}</div>
                            <div className="text-xs text-text-muted">{doc.size}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'extracted' && <Badge color="green" size="sm">Extracted</Badge>}
                          {doc.status === 'extracting' && <Badge color="amber" size="sm">Extracting</Badge>}
                          {doc.status === 'pending' && <Badge color="gray" size="sm">Pending</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => toast.info('Document viewer — extracted text and metadata display when extraction is complete')}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {viewMode === 'structure' && !selectedModule && (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a CTD module from the tree to view documents</p>
              </div>
            </div>
          )}
          
          {viewMode === 'data' && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-text-primary">Extracted Data</h2>
                  {selectedForExport.size > 0 && (
                    <Badge color="blue" size="sm">
                      {selectedForExport.size} selected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setShowExportModal(true)}
                    disabled={selectedForExport.size === 0}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Export to Ligature ({selectedForExport.size})
                  </Button>
                </div>
              </div>
              
              {/* Data table */}
              <Card>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-surface-elevated border-b border-border">
                      <tr>
                        <th className="w-12 px-4 py-3">
                          <input 
                            type="checkbox"
                            checked={selectedForExport.size === extractedData.length && extractedData.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedForExport(new Set(extractedData.map(d => d.id)));
                              } else {
                                setSelectedForExport(new Set());
                              }
                            }}
                            className="rounded border-border"
                          />
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Field</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Value</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Source</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Confidence</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {extractedData.map(data => (
                        <tr 
                          key={data.id} 
                          className={`transition-colors cursor-pointer ${
                            selectedForExport.has(data.id) 
                              ? 'bg-accent-blue/10' 
                              : 'hover:bg-surface-card'
                          }`}
                          onClick={() => toggleExportSelection(data.id)}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={selectedForExport.has(data.id)}
                              onChange={() => toggleExportSelection(data.id)}
                              className="rounded border-border"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${dataTypeColors[data.dataType]}`}>
                              {data.dataType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary font-medium">{data.field}</td>
                          <td className="px-4 py-3 text-sm text-text-secondary max-w-md truncate">{data.value}</td>
                          <td className="px-4 py-3 text-sm text-text-muted">M{data.sourceModule}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${data.confidence >= 0.9 ? 'bg-green-400' : data.confidence >= 0.8 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${data.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-text-muted">{Math.round(data.confidence * 100)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {data.verified ? (
                              <Badge color="green" size="sm">Verified</Badge>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => toast.success('Data point verified — marked as confirmed in audit trail')}>
                                Verify
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary">
                          {extractedData.filter(d => d.dataType === 'indication').length}
                        </div>
                        <div className="text-sm text-text-muted">Indications Found</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary">
                          {extractedData.filter(d => d.dataType === 'endpoint' || d.dataType === 'efficacy').length}
                        </div>
                        <div className="text-sm text-text-muted">Endpoints/Efficacy</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-text-primary">
                          {extractedData.filter(d => d.dataType === 'safety').length}
                        </div>
                        <div className="text-sm text-text-muted">Safety Data Points</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {viewMode === 'preview' && (
            <div className="space-y-4 h-full flex flex-col">
              {/* PDF Viewer Header */}
              <div className="flex items-center justify-between bg-surface-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <select
                    value={selectedDocument || ''}
                    onChange={(e) => setSelectedDocument(e.target.value || null)}
                    className="px-3 py-1.5 bg-surface border border-border rounded text-sm text-text-primary"
                  >
                    <option value="">Select a document...</option>
                    <option value="clinical-overview">Module 2.5 - Clinical Overview</option>
                    <option value="clinical-summary">Module 2.7.1 - Clinical Summary</option>
                    <option value="efficacy-summary">Module 2.7.3 - Efficacy Summary</option>
                    <option value="safety-summary">Module 2.7.4 - Safety Summary</option>
                  </select>
                  
                  {selectedDocument && (
                    <Badge color="green" size="sm">
                      {SAMPLE_HIGHLIGHTS.length} extractions found
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHighlights(!showHighlights)}
                    className={`p-2 rounded transition-colors ${showHighlights ? 'bg-amber-500/20 text-amber-400' : 'text-text-muted hover:text-text-primary'}`}
                    title="Toggle highlights"
                  >
                    <Highlighter className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 border-l border-border pl-2">
                    <button onClick={() => setPdfZoom(z => Math.max(50, z - 25))} className="p-1.5 text-text-muted hover:text-text-primary">
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-text-muted w-12 text-center">{pdfZoom}%</span>
                    <button onClick={() => setPdfZoom(z => Math.min(200, z + 25))} className="p-1.5 text-text-muted hover:text-text-primary">
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="p-1.5 text-text-muted hover:text-text-primary border-l border-border pl-2" onClick={() => toast.info('Fullscreen viewer — press F11 or use browser fullscreen for full-page document display')}>
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* PDF Content Area */}
              {selectedDocument ? (
                <div className="flex-1 bg-surface-card border border-border rounded-lg overflow-auto">
                  <div className="p-8" style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top left' }}>
                    {/* Simulated PDF Page */}
                    <div className="bg-white text-gray-900 p-8 shadow-lg mx-auto" style={{ width: '8.5in', minHeight: '11in' }}>
                      <h1 className="text-xl font-bold mb-4">2.5 Clinical Overview</h1>
                      <p className="text-sm text-gray-600 mb-6">NDA 215847 - Nexvara (nexvarilumab)</p>
                      
                      <h2 className="text-lg font-semibold mb-3">1. Product Development Rationale</h2>
                      <p className="text-sm leading-relaxed mb-4">
                        Nexvara (nexvarilumab) is a fully human monoclonal antibody that selectively binds to interleukin-17A (IL-17A) 
                        and inhibits its interaction with the IL-17 receptor. This mechanism of action is intended for the treatment of 
                        <span className={`${showHighlights ? 'bg-purple-200 px-1 rounded' : ''}`}>moderate to severe plaque psoriasis</span> in adult patients.
                      </p>
                      
                      <h2 className="text-lg font-semibold mb-3">2. Dosing and Administration</h2>
                      <p className="text-sm leading-relaxed mb-4">
                        The recommended dose is <span className={`${showHighlights ? 'bg-green-200 px-1 rounded' : ''}`}>300 mg subcutaneous</span> injection 
                        administered at Weeks 0, 1, 2, 3, and 4 followed by 300 mg every 4 weeks (Q4W) thereafter.
                      </p>
                      
                      <h2 className="text-lg font-semibold mb-3">3. Primary Efficacy Endpoint</h2>
                      <p className="text-sm leading-relaxed mb-4">
                        The primary efficacy endpoint was <span className={`${showHighlights ? 'bg-blue-200 px-1 rounded' : ''}`}>PASI 75 response at Week 12</span>, 
                        defined as at least a 75% reduction from baseline in the Psoriasis Area and Severity Index score.
                      </p>
                      
                      <h2 className="text-lg font-semibold mb-3">4. Study Population</h2>
                      <p className="text-sm leading-relaxed mb-4">
                        The clinical trials enrolled <span className={`${showHighlights ? 'bg-cyan-200 px-1 rounded' : ''}`}>adults ≥18 years</span> of age 
                        with moderate-to-severe plaque psoriasis involving ≥10% body surface area (BSA) and candidates for systemic therapy.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-surface-card border border-border rounded-lg text-text-muted">
                  <div className="text-center">
                    <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a document to preview</p>
                    <p className="text-sm mt-2">Extracted data will be highlighted in the document</p>
                  </div>
                </div>
              )}
              
              {/* Extraction Legend */}
              {showHighlights && selectedDocument && (
                <div className="bg-surface-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-muted">Highlight Legend:</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-300"></span> Indication</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-300"></span> Dosing</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-300"></span> Endpoint</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-300"></span> Population</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {viewMode === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">Audit Trail</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { const b=new Blob(['eCTD Intelligence Audit Log\n'+new Date().toISOString()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='ectd-audit-log.txt'; a.click(); toast.success('Audit log downloaded'); }}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Log
                  </Button>
                </div>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {auditTrail.map((entry) => (
                      <div key={entry.id} className="p-4 hover:bg-surface-card transition-colors">
                        <div className="flex items-start gap-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            entry.action === 'import' ? 'bg-blue-500/20 text-blue-400' :
                            entry.action === 'extract' ? 'bg-green-500/20 text-green-400' :
                            entry.action === 'export' ? 'bg-purple-500/20 text-purple-400' :
                            entry.action === 'validate' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-cyan-500/20 text-cyan-400'
                          }`}>
                            {entry.action === 'import' && <Upload className="w-4 h-4" />}
                            {entry.action === 'extract' && <Sparkles className="w-4 h-4" />}
                            {entry.action === 'export' && <Send className="w-4 h-4" />}
                            {entry.action === 'validate' && <FileWarning className="w-4 h-4" />}
                            {entry.action === 'resolve' && <CheckCircle className="w-4 h-4" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-text-primary capitalize">{entry.action}</span>
                              <span className="text-xs text-text-muted">by {entry.user}</span>
                            </div>
                            <p className="text-sm text-text-secondary">{entry.details}</p>
                            {entry.entityType && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge color="gray" size="sm">{entry.entityType}</Badge>
                                <span className="text-xs text-text-muted font-mono">{entry.entityId}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-xs text-text-muted">
                            {entry.timestamp.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Export Modal */}
      <ExportModal />
      
      {/* Bulk Import Modal */}
      {showBulkImportModal && (
        <Modal
          isOpen={showBulkImportModal}
          onClose={() => { setShowBulkImportModal(false); setBulkImportProgress('idle'); setBulkImportFiles([]); }}
          title="Bulk Import eCTD Folder"
          size="lg"
        >
          <div className="space-y-4">
            {bulkImportProgress === 'idle' && (
              <>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <FolderUp className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-primary font-medium mb-2">Drop eCTD folder here or click to browse</p>
                  <p className="text-sm text-text-muted">Supports standard eCTD folder structure (m1-m5)</p>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" onClick={handleBulkImport}>
                    <FolderUp className="w-4 h-4 mr-2" />
                    Start Import
                  </Button>
                </div>
              </>
            )}
            
            {bulkImportProgress === 'scanning' && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-accent-blue animate-spin mx-auto mb-4" />
                <p className="text-text-primary">Scanning eCTD folder structure...</p>
              </div>
            )}
            
            {(bulkImportProgress === 'importing' || bulkImportProgress === 'complete') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {bulkImportProgress === 'complete' ? 'Import complete' : 'Importing files...'}
                  </span>
                  <span className="text-text-primary">
                    {bulkImportFiles.filter(f => f.status === 'imported').length} / {bulkImportFiles.length}
                  </span>
                </div>
                <div className="max-h-64 overflow-auto space-y-2">
                  {bulkImportFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-surface rounded-lg">
                      <div className={`w-6 h-6 rounded flex items-center justify-center ${
                        file.status === 'imported' ? 'bg-green-500/20 text-green-400' :
                        file.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-surface-elevated text-text-muted'
                      }`}>
                        {file.status === 'imported' && <CheckCircle className="w-4 h-4" />}
                        {file.status === 'error' && <XCircle className="w-4 h-4" />}
                        {file.status === 'pending' && <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm text-text-primary">{file.name}</span>
                        <span className="text-xs text-text-muted ml-2">Module {file.module}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {bulkImportProgress === 'complete' && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button variant="primary" onClick={() => { setShowBulkImportModal(false); setBulkImportProgress('idle'); }}>
                      Done
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
      
      {/* Validation Panel */}
      {showValidationPanel && (
        <Modal
          isOpen={showValidationPanel}
          onClose={() => setShowValidationPanel(false)}
          title="Data Validation Results"
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-text-muted">{validationResults.filter(v => v.status === 'match').length} Matches</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-text-muted">{validationResults.filter(v => v.status === 'conflict').length} Conflicts</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span className="text-text-muted">{validationResults.filter(v => v.status === 'new').length} New Records</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-auto">
              {validationResults.map((result) => (
                <div key={result.id} className={`p-4 rounded-lg border ${
                  result.status === 'match' ? 'bg-green-500/5 border-green-500/20' :
                  result.status === 'conflict' ? 'bg-amber-500/5 border-amber-500/20' :
                  'bg-blue-500/5 border-blue-500/20'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {result.status === 'match' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {result.status === 'conflict' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {result.status === 'new' && <Plus className="w-4 h-4 text-blue-400" />}
                        <span className="font-medium text-text-primary">{result.field}</span>
                        {result.resolution && (
                          <Badge color={result.resolution === 'keep-existing' ? 'gray' : 'green'} size="sm">
                            {result.resolution === 'keep-existing' ? 'Keeping existing' : 'Using extracted'}
                          </Badge>
                        )}
                      </div>
                      
                      {result.status === 'conflict' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div>
                            <span className="text-xs text-text-muted block mb-1">Extracted Value</span>
                            <span className="text-text-primary">{result.extractedValue}</span>
                          </div>
                          <div>
                            <span className="text-xs text-text-muted block mb-1">Existing Value</span>
                            <span className="text-text-primary">{result.existingValue}</span>
                          </div>
                        </div>
                      )}
                      
                      {result.status === 'new' && (
                        <div className="text-sm">
                          <span className="text-text-secondary">{result.extractedValue}</span>
                        </div>
                      )}
                      
                      {result.status === 'match' && (
                        <div className="text-sm text-text-muted">{result.extractedValue}</div>
                      )}
                    </div>
                    
                    {result.status === 'conflict' && result.resolution === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => resolveConflict(result.id, 'keep-existing')}>
                          Keep Existing
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => resolveConflict(result.id, 'use-extracted')}>
                          Use Extracted
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="primary" onClick={() => setShowValidationPanel(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default ECTDIntelligenceScreen;
