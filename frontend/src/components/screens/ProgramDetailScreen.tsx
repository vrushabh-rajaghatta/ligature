

import { useState, useMemo, useEffect } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowLeft, Building2, Calendar, ChevronRight, Clock, Edit3, ExternalLink,
  FileText, Folder, Globe, MoreVertical, Pill, Plus, Send, Target, TrendingUp,
  Users, CheckCircle, AlertTriangle, AlertCircle, Layers, Package, Activity,
  Play, Eye, History, Flag, Shield, BarChart3
} from 'lucide-react';
import {
  usePortfolioStore, usePrograms, useApplications, useSequences, useMilestones,
  Program, Application, Sequence, Milestone,
  ApplicationType, ApplicationStatus, SequenceType, SequenceStatus, Region
} from '@/stores/portfolio-store';
import { useDocumentStore, useDocumentStats, type CTDDocument } from '@/stores/document-store';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
// v126: Card and Skeleton components
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { StatCardGridSkeleton, CardSkeleton, TableSkeleton, DetailPanelSkeleton } from '@/components/ui/Skeleton';
import { useDeadClick } from '@/hooks/useDeadClick';

interface ProgramDetailScreenProps {
  programId: string;
  onBack: () => void;
  onNavigateToSubmissions?: (applicationId: string) => void;
  onNavigateToAuthoring?: (applicationId: string) => void;
}

const applicationTypeConfig: Record<ApplicationType, { label: string; color: string }> = {
  IND: { label: 'IND', color: 'bg-violet-500/20 text-violet-400' },
  NDA: { label: 'NDA', color: 'bg-blue-500/20 text-blue-400' },
  BLA: { label: 'BLA', color: 'bg-teal-500/20 text-teal-400' },
  sNDA: { label: 'sNDA', color: 'bg-indigo-500/20 text-indigo-400' },
  sBLA: { label: 'sBLA', color: 'bg-cyan-500/20 text-cyan-400' },
  ANDA: { label: 'ANDA', color: 'bg-slate-500/20 text-slate-400' },
  MAA: { label: 'MAA', color: 'bg-emerald-500/20 text-emerald-400' },
  CTA: { label: 'CTA', color: 'bg-green-500/20 text-green-400' },
  JNDA: { label: 'JNDA', color: 'bg-rose-500/20 text-rose-400' },
  NDS: { label: 'NDS', color: 'bg-orange-500/20 text-orange-400' },
  IMPD: { label: 'IMPD', color: 'bg-amber-500/20 text-amber-400' },
};

const applicationStatusConfig: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  Planning: { label: 'Planning', color: 'text-slate-400', icon: <Clock className="w-4 h-4" /> },
  Active: { label: 'Active', color: 'text-blue-400', icon: <Activity className="w-4 h-4" /> },
  Submitted: { label: 'Submitted', color: 'text-violet-400', icon: <Send className="w-4 h-4" /> },
  'Under Review': { label: 'Under Review', color: 'text-amber-400', icon: <Eye className="w-4 h-4" /> },
  Approved: { label: 'Approved', color: 'text-green-400', icon: <CheckCircle className="w-4 h-4" /> },
  CRL: { label: 'CRL', color: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
  Withdrawn: { label: 'Withdrawn', color: 'text-slate-500', icon: <AlertCircle className="w-4 h-4" /> },
  'Refused to File': { label: 'RTF', color: 'text-red-500', icon: <AlertCircle className="w-4 h-4" /> },
};

const sequenceStatusConfig: Record<SequenceStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-slate-500/20 text-slate-400' },
  'in-qc': { label: 'In QC', color: 'bg-amber-500/20 text-amber-400' },
  'qc-complete': { label: 'QC Complete', color: 'bg-blue-500/20 text-blue-400' },
  submitted: { label: 'Submitted', color: 'bg-violet-500/20 text-violet-400' },
  acknowledged: { label: 'Acknowledged', color: 'bg-teal-500/20 text-teal-400' },
  'under-review': { label: 'Under Review', color: 'bg-amber-500/20 text-amber-400' },
  approved: { label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400' },
};

const sequenceTypeLabels: Record<SequenceType, string> = {
  original: 'Original Application',
  amendment: 'Amendment',
  supplement: 'Supplement',
  'ir-response': 'IR Response',
  'safety-report': 'Safety Report',
  'annual-report': 'Annual Report',
  psur: 'PSUR',
  dsur: 'DSUR',
  rmp: 'Risk Management Plan',
  labeling: 'Labeling',
  cbe: 'CBE',
  'prior-approval': 'Prior Approval Supplement',
};

const regionFlags: Record<Region, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  Japan: '🇯🇵',
  China: '🇨🇳',
  Canada: '🇨🇦',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  Brazil: '🇧🇷',
  'South Korea': '🇰🇷',
  Switzerland: '🇨🇭',
};

export function ProgramDetailScreen({ programId, onBack, onNavigateToSubmissions, onNavigateToAuthoring }: ProgramDetailScreenProps) {
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // v130: Loading state
    const { deadClick } = useDeadClick();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  // Store access
  const programs = usePrograms();
  const applications = useApplications();
  const sequences = useSequences();
  const milestones = useMilestones();
  
  const addApplication = usePortfolioStore(s => s.addApplication);
  const addSequence = usePortfolioStore(s => s.addSequence);
  const updateProgram = usePortfolioStore(s => s.updateProgram);
  const getApplicationsForProgram = usePortfolioStore(s => s.getApplicationsForProgram);
  const getSequencesForApplication = usePortfolioStore(s => s.getSequencesForApplication);
  const getNextSequenceNumber = usePortfolioStore(s => s.getNextSequenceNumber);
  const selectApplication = usePortfolioStore(s => s.selectApplication);
  
  // Get the program
  const program = useMemo(() => programs.find(p => p.id === programId), [programs, programId]);
  
  // Get applications for this program
  const programApplications = useMemo(() => 
    applications.filter(a => a.programId === programId),
    [applications, programId]
  );
  
  // Get milestones for this program
  const programMilestones = useMemo(() =>
    milestones.filter(m => m.programId === programId).sort((a, b) => a.targetDate.localeCompare(b.targetDate)),
    [milestones, programId]
  );
  
  // State
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    programApplications[0]?.id || null
  );
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false);
  const [showNewSequenceForm, setShowNewSequenceForm] = useState(false);
  
  // New application form state
  const [newAppNumber, setNewAppNumber] = useState('');
  const [newAppType, setNewAppType] = useState<ApplicationType>('IND');
  const [newAppRegion, setNewAppRegion] = useState<Region>('US');
  
  // New sequence form state
  const [newSeqType, setNewSeqType] = useState<SequenceType>('amendment');
  const [newSeqDescription, setNewSeqDescription] = useState('');
  
  // Get sequences for selected application
  const selectedApplication = useMemo(() =>
    applications.find(a => a.id === selectedApplicationId),
    [applications, selectedApplicationId]
  );
  
  const applicationSequences = useMemo(() =>
    selectedApplicationId 
      ? sequences.filter(s => s.applicationId === selectedApplicationId).sort((a, b) => a.sequenceNumber.localeCompare(b.sequenceNumber))
      : [],
    [sequences, selectedApplicationId]
  );
  
  // Document stats for selected application
  const docStats = useDocumentStats(selectedApplicationId || '');
  
  // v130: Loading state render
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-text-muted">Loading program details...</span></div>
      </div>
    );
  }
  
  if (!program) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">Program not found</p>
          <button onClick={onBack} className="mt-4 text-accent-blue hover:underline">
            Return to Portfolio
          </button>
        </div>
      </div>
    );
  }
  
  const handleAddApplication = () => {
    if (!newAppNumber.trim()) {
      toast.error('Application number is required');
      return;
    }
    
    const agency = newAppRegion === 'US' ? 'FDA' : 
                   newAppRegion === 'EU' ? 'EMA' :
                   newAppRegion === 'Japan' ? 'PMDA' :
                   newAppRegion === 'China' ? 'NMPA' :
                   newAppRegion === 'Canada' ? 'Health Canada' :
                   newAppRegion === 'UK' ? 'MHRA' : 'Regulatory Authority';
    
    const appId = addApplication({
      programId: program.id,
      applicationNumber: newAppNumber,
      type: newAppType,
      region: newAppRegion,
      agency,
      status: 'Planning',
    });
    
    toast.success(`Application ${newAppNumber} created`);
    setSelectedApplicationId(appId);
    setShowNewApplicationForm(false);
    setNewAppNumber('');
  };
  
  const handleAddSequence = () => {
    if (!selectedApplicationId || !newSeqDescription.trim()) {
      toast.error('Description is required');
      return;
    }
    
    const nextSeqNum = getNextSequenceNumber(selectedApplicationId);
    
    addSequence({
      applicationId: selectedApplicationId,
      sequenceNumber: nextSeqNum,
      type: newSeqType,
      description: newSeqDescription,
      status: 'draft',
    });
    
    toast.success(`Sequence ${nextSeqNum} created`);
    setShowNewSequenceForm(false);
    setNewSeqDescription('');
  };
  
  const handleNavigateToSubmissions = (appId: string) => {
    selectApplication(appId);
    if (onNavigateToSubmissions) {
      onNavigateToSubmissions(appId);
    } else {
      setActiveModule('submissions');
    }
  };
  
  const handleNavigateToAuthoring = (appId: string) => {
    selectApplication(appId);
    if (onNavigateToAuthoring) {
      onNavigateToAuthoring(appId);
    } else {
      setActiveModule('authoring');
    }
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
      {/* v0.51.0: ScreenHeader adoption — standardized header */}
      <div className="bg-surface-elevated border-b border-border">
        <ScreenHeader
          title={program.code}
          subtitle={`${program.name}${program.genericName ? ` · ${program.genericName}` : ''}`}
          icon={
            <button
              onClick={onBack}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors -ml-2"
            >
              <ArrowLeft className="w-5 h-5 text-text-muted" />
            </button>
          }
          badge={{
            label: program.status.charAt(0).toUpperCase() + program.status.slice(1).replace('-', ' '),
            color: program.status === 'on-track' ? 'green' :
                   program.status === 'at-risk' ? 'amber' :
                   program.status === 'delayed' ? 'red' :
                   program.status === 'ahead' ? 'blue' : 'slate'
          }}
          actions={
            <button className="px-4 py-2 text-sm bg-surface-card text-text-secondary rounded-lg hover:text-text-primary transition-colors flex items-center gap-2" onClick={deadClick}>
              <Edit3 className="w-4 h-4" />
              Edit Program
            </button>
          }
        >
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <Pill className="w-4 h-4" />
              {program.therapeuticArea}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {program.modality}
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              {program.indication}
            </span>
          </div>
        </ScreenHeader>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Applications Panel - Left */}
          <div className="col-span-1 lg:col-span-4">
            <div className="bg-surface-elevated rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent-blue" />
                  Regulatory Applications
                </h2>
                <button
                  onClick={() => setShowNewApplicationForm(true)}
                  className="p-1.5 hover:bg-surface-card rounded-lg transition-colors text-accent-blue"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              
              {/* New Application Form */}
              {showNewApplicationForm && (
                <div className="p-4 border-b border-border bg-surface-card/50">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Application Number</label>
                      <input
                        type="text"
                        value={newAppNumber}
                        onChange={(e) => setNewAppNumber(e.target.value)}
                        placeholder="e.g., IND 123456"
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-muted block mb-1">Type</label>
                        <select
                          value={newAppType}
                          onChange={(e) => setNewAppType(e.target.value as ApplicationType)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        >
                          {Object.keys(applicationTypeConfig).map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-text-muted block mb-1">Region</label>
                        <select
                          value={newAppRegion}
                          onChange={(e) => setNewAppRegion(e.target.value as Region)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                        >
                          {Object.entries(regionFlags).map(([region, flag]) => (
                            <option key={region} value={region}>{flag} {region}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddApplication}
                        className="flex-1 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 transition-colors"
                      >
                        Create Application
                      </button>
                      <button
                        onClick={() => setShowNewApplicationForm(false)}
                        className="px-3 py-2 bg-surface text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Applications List */}
              <div className="max-h-[400px] overflow-y-auto">
                {programApplications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Folder className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-text-muted text-sm">No applications yet</p>
                    <button
                      onClick={() => setShowNewApplicationForm(true)}
                      className="mt-3 text-sm text-accent-blue hover:underline"
                    >
                      Create first application
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {programApplications.map(app => {
                      const typeConfig = applicationTypeConfig[app.type];
                      const statusConfig = applicationStatusConfig[app.status];
                      const isSelected = app.id === selectedApplicationId;
                      
                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApplicationId(app.id)}
                          className={`p-4 cursor-pointer transition-colors ${
                            isSelected ? 'bg-accent-blue/10 border-l-2 border-l-accent-blue' : 'hover:bg-surface-card'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{regionFlags[app.region]}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig?.color ?? ''}`}>
                                  {typeConfig.label}
                                </span>
                              </div>
                              <div className="mt-1 font-medium text-text-primary truncate">
                                {app.applicationNumber}
                              </div>
                              <div className="mt-1 text-xs text-text-muted flex items-center gap-1">
                                {statusConfig.icon}
                                <span className={statusConfig.color}>{statusConfig.label}</span>
                                <span className="mx-1">•</span>
                                <span>{app.agency}</span>
                              </div>
                              {app.pdfuaDate && (
                                <div className="mt-1 text-xs text-text-muted flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  PDUFA: {app.pdfuaDate}
                                </div>
                              )}
                            </div>
                            <ChevronRight className={`w-5 h-5 text-text-muted transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Milestones Panel */}
            <div className="bg-surface-elevated rounded-xl mt-6">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <Flag className="w-5 h-5 text-accent-amber" />
                  Key Milestones
                </h2>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                {programMilestones.slice(0, 5).map(ms => (
                  <div key={ms.id} className="p-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      ms.status === 'completed' ? 'bg-green-500' :
                      ms.status === 'in-progress' ? 'bg-amber-500' :
                      ms.status === 'delayed' ? 'bg-red-500' : 'bg-slate-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary truncate">{ms.name}</div>
                      <div className="text-xs text-text-muted">{ms.targetDate}</div>
                    </div>
                  </div>
                ))}
                {programMilestones.length === 0 && (
                  <div className="p-4 text-center text-text-muted text-sm">No milestones defined</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Application Details - Right */}
          <div className="col-span-1 lg:col-span-8">
            {selectedApplication ? (
              <div className="space-y-4 md:space-y-6">
                {/* Application Header */}
                <div className="bg-surface-elevated rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{regionFlags[selectedApplication.region]}</span>
                        <h2 className="text-xl font-semibold text-text-primary">
                          {selectedApplication.applicationNumber}
                        </h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${applicationTypeConfig[selectedApplication.type]?.color}`}>
                          {selectedApplication.type}
                        </span>
                      </div>
                      <p className="text-text-muted mt-1">
                        {selectedApplication.agency} • {selectedApplication.region}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleNavigateToAuthoring(selectedApplication.id)}
                        className="px-4 py-2 bg-surface-card text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Author Documents
                      </button>
                      <button
                        onClick={() => handleNavigateToSubmissions(selectedApplication.id)}
                        className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 transition-colors flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        Open in Submissions
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <div className="bg-surface-card rounded-lg p-3">
                      <div className="text-2xl font-bold text-text-primary">{applicationSequences.length}</div>
                      <div className="text-xs text-text-muted">Sequences</div>
                    </div>
                    <div className="bg-surface-card rounded-lg p-3">
                      <div className="text-2xl font-bold text-text-primary">{docStats.total}</div>
                      <div className="text-xs text-text-muted">Documents</div>
                    </div>
                    <div className="bg-surface-card rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-400">{docStats.final}</div>
                      <div className="text-xs text-text-muted">Finalized</div>
                    </div>
                    <div className="bg-surface-card rounded-lg p-3">
                      <div className="text-2xl font-bold text-amber-400">{docStats.draft + docStats.inReview}</div>
                      <div className="text-xs text-text-muted">In Progress</div>
                    </div>
                  </div>
                </div>
                
                {/* Sequences Panel */}
                <div className="bg-surface-elevated rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Layers className="w-5 h-5 text-accent-teal" />
                      Submission Sequences
                    </h3>
                    <button
                      onClick={() => setShowNewSequenceForm(true)}
                      className="px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/30 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      New Sequence
                    </button>
                  </div>
                  
                  {/* New Sequence Form */}
                  {showNewSequenceForm && (
                    <div className="p-4 border-b border-border bg-surface-card/50">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-text-muted block mb-1">Sequence Type</label>
                            <select
                              value={newSeqType}
                              onChange={(e) => setNewSeqType(e.target.value as SequenceType)}
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                            >
                              {Object.entries(sequenceTypeLabels).map(([type, label]) => (
                                <option key={type} value={type}>{label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-text-muted block mb-1">Next Sequence #</label>
                            <input
                              type="text"
                              value={getNextSequenceNumber(selectedApplicationId!)}
                              disabled
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-muted"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-text-muted block mb-1">Description</label>
                          <input
                            type="text"
                            value={newSeqDescription}
                            onChange={(e) => setNewSeqDescription(e.target.value)}
                            placeholder="e.g., Safety Amendment - Updated IB"
                            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddSequence}
                            className="flex-1 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 transition-colors"
                          >
                            Create Sequence
                          </button>
                          <button
                            onClick={() => setShowNewSequenceForm(false)}
                            className="px-3 py-2 bg-surface text-text-secondary rounded-lg text-sm hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Sequences Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-surface-card/50">
                        <tr className="text-xs text-text-muted uppercase tracking-wider">
                          <th className="px-5 py-3 text-left">Sequence</th>
                          <th className="px-5 py-3 text-left">Type</th>
                          <th className="px-5 py-3 text-left">Description</th>
                          <th className="px-5 py-3 text-left">Status</th>
                          <th className="px-5 py-3 text-left">Submitted</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {applicationSequences.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-8 text-center">
                              <Package className="w-10 h-10 text-text-muted/30 mx-auto mb-2" />
                              <p className="text-text-muted text-sm">No sequences yet</p>
                              <button
                                onClick={() => setShowNewSequenceForm(true)}
                                className="mt-2 text-sm text-accent-blue hover:underline"
                              >
                                Create first sequence
                              </button>
                            </td>
                          </tr>
                        ) : (
                          applicationSequences.map(seq => {
                            const statusConfig = sequenceStatusConfig[seq.status];
                            return (
                              <tr key={seq.id} className="hover:bg-surface-card/30 transition-colors">
                                <td className="px-5 py-4">
                                  <span className="font-mono font-medium text-text-primary">{seq.sequenceNumber}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="text-sm text-text-secondary">{sequenceTypeLabels[seq.type]}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="text-sm text-text-primary">{seq.description}</span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig?.color ?? ''}`}>
                                    {statusConfig.label}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-sm text-text-muted">
                                  {seq.submissionDate || '—'}
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary transition-colors" onClick={deadClick}>
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-text-primary transition-colors" onClick={deadClick}>
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 hover:bg-surface-card rounded text-text-muted hover:text-accent-blue transition-colors" onClick={deadClick}>
                                      <Send className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <button
                    onClick={() => handleNavigateToSubmissions(selectedApplication.id)}
                    className="bg-surface-elevated rounded-xl p-5 hover:bg-surface-card transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center mb-3 group-hover:bg-accent-blue/30 transition-colors">
                      <Package className="w-5 h-5 text-accent-blue" />
                    </div>
                    <h4 className="font-medium text-text-primary">Build eCTD</h4>
                    <p className="text-sm text-text-muted mt-1">Assemble and validate submission package</p>
                  </button>
                  
                  <button
                    onClick={() => handleNavigateToAuthoring(selectedApplication.id)}
                    className="bg-surface-elevated rounded-xl p-5 hover:bg-surface-card transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center mb-3 group-hover:bg-accent-purple/30 transition-colors">
                      <FileText className="w-5 h-5 text-accent-purple" />
                    </div>
                    <h4 className="font-medium text-text-primary">Author Documents</h4>
                    <p className="text-sm text-text-muted mt-1">Create and review CTD documents</p>
                  </button>
                  
                  <button className="bg-surface-elevated rounded-xl p-5 hover:bg-surface-card transition-colors text-left group" onClick={deadClick}>
                    <div className="w-10 h-10 rounded-lg bg-accent-teal/20 flex items-center justify-center mb-3 group-hover:bg-accent-teal/30 transition-colors">
                      <BarChart3 className="w-5 h-5 text-accent-teal" />
                    </div>
                    <h4 className="font-medium text-text-primary">View Analytics</h4>
                    <p className="text-sm text-text-muted mt-1">Submission metrics and timelines</p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface-elevated rounded-xl p-8 text-center">
                <Folder className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">Select an Application</h3>
                <p className="text-text-muted">Choose an application from the left panel to view details and manage sequences</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
