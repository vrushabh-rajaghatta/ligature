

import { useState, useMemo } from 'react';
import {
  Users, UserPlus, Check, X, Clock, AlertCircle, MessageSquare, Send,
  ChevronRight, ChevronDown, Edit3, Eye, EyeOff, CheckCircle, XCircle, Settings,
  Calendar, ArrowRight, MoreVertical, Mail, Plus, Trash2, GripVertical,
  Shield, ExternalLink, Copy, Link2
} from 'lucide-react';
import { 
  AuthoringDocument, ReviewWorkflow, ReviewStageDefinition,
  ReviewerRole
} from '@/types/authoring';
import { reviewWorkflows } from '@/data/authoring-data';
import { 
  useReviewStore, 
  ReviewType, 
  ZonePermission,
  FunctionalArea,
  ExternalAuthMethod
} from '@/store/useReviewStore';

interface EnhancedReviewWorkflowPanelProps {
  document: AuthoringDocument;
  onClose: () => void;
  onSendForReview: (reviewId: string) => void;
}

interface ReviewerAssignment {
  userId: string;
  userName: string;
  email: string;
  role: ReviewerRole;
  functionalArea: FunctionalArea;
  sections: string[];
  isRequired: boolean;
  dueDate: string;
  isExternal: boolean;
  authMethod?: ExternalAuthMethod;
}

const availableUsers = [
  { id: 'u-clin', name: 'Dr. Sarah Chen', email: 'sarah.chen@ligature.com', roles: ['clinical-lead', 'clinical-scientist'], functionalArea: 'clinical' as FunctionalArea },
  { id: 'u-biostat', name: 'Maria Santos', email: 'maria.santos@ligature.com', roles: ['biostatistician'], functionalArea: 'biostatistics' as FunctionalArea },
  { id: 'u-safety', name: 'Dr. Robert Kim', email: 'robert.kim@ligature.com', roles: ['safety-physician'], functionalArea: 'safety' as FunctionalArea },
  { id: 'u-clin-pharm', name: 'Dr. Lisa Wong', email: 'lisa.wong@ligature.com', roles: ['clin-pharm-md'], functionalArea: 'clinical' as FunctionalArea },
  { id: 'u-cmc', name: 'James Miller', email: 'james.miller@ligature.com', roles: ['cmc-lead'], functionalArea: 'cmc' as FunctionalArea },
  { id: 'u-reg', name: 'Amanda Foster', email: 'amanda.foster@ligature.com', roles: ['regulatory-lead'], functionalArea: 'regulatory' as FunctionalArea },
  { id: 'u-qc', name: 'Patricia Lee', email: 'patricia.lee@ligature.com', roles: ['qc-specialist'], functionalArea: 'quality' as FunctionalArea },
];

const roleLabels: Record<ReviewerRole, string> = {
  'medical-writer': 'Medical Writer',
  'clinical-lead': 'Clinical Lead',
  'clinical-scientist': 'Clinical Scientist',
  'biostatistician': 'Biostatistician',
  'safety-physician': 'Safety Physician',
  'clin-pharm-md': 'Clinical Pharmacology MD',
  'cmc-lead': 'CMC Lead',
  'nonclinical-lead': 'Nonclinical Lead',
  'regulatory-lead': 'Regulatory Lead',
  'medical-director': 'Medical Director',
  'qc-specialist': 'QC Specialist',
  'project-manager': 'Project Manager',
};

const functionalAreaLabels: Record<FunctionalArea, string> = {
  'medical-writing': 'Medical Writing',
  'clinical': 'Clinical',
  'biostatistics': 'Biostatistics',
  'safety': 'Safety',
  'regulatory': 'Regulatory',
  'cmc': 'CMC',
  'nonclinical': 'Nonclinical',
  'quality': 'Quality',
  'legal': 'Legal',
  'commercial': 'Commercial',
  'external': 'External',
};

type ViewMode = 'overview' | 'configure' | 'assign' | 'zones' | 'external';

export function EnhancedReviewWorkflowPanel({ document, onClose, onSendForReview }: EnhancedReviewWorkflowPanelProps) {
  const createReview = useReviewStore(s => s.createReview);
  const addZone = useReviewStore(s => s.addZone);
  const addParticipant = useReviewStore(s => s.addParticipant);
  const inviteExternalReviewer = useReviewStore(s => s.inviteExternalReviewer);

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ReviewWorkflow>(
    reviewWorkflows.find(w => w.id === document.workflowId) || reviewWorkflows[0]
  );
  const [selectedStageIndex] = useState(0);
  const [assignedReviewers, setAssignedReviewers] = useState<ReviewerAssignment[]>([]);
  const [showAddReviewer, setShowAddReviewer] = useState(false);
  const [showAddExternal, setShowAddExternal] = useState(false);
  const [reviewDueDate, setReviewDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  const [reviewType, setReviewType] = useState<ReviewType>('standard');
  const [allowSameFunctionalArea, setAllowSameFunctionalArea] = useState(true);
  const [revealOnConsolidation, setRevealOnConsolidation] = useState(true);
  const [zonePermissions, setZonePermissions] = useState<Record<string, Record<string, ZonePermission>>>({});

  const [externalName, setExternalName] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalFunctionalArea, setExternalFunctionalArea] = useState<FunctionalArea>('external');
  const [externalAuthMethod, setExternalAuthMethod] = useState<ExternalAuthMethod>('email');
  const [generatedInvites, setGeneratedInvites] = useState<Array<{ name: string; email: string; url: string }>>([]);

  const currentStage = selectedWorkflow.stages[selectedStageIndex];

  const documentSections = useMemo(() => {
    return (document.sections ?? []).map(section => ({
      id: section.id,
      number: section.number,
      title: section.title,
    }));
  }, [document.sections]);

  const handleAddReviewer = (user: typeof availableUsers[0], role: ReviewerRole) => {
    const newReviewer: ReviewerAssignment = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role,
      functionalArea: user.functionalArea,
      sections: ['all'],
      isRequired: currentStage?.requiredRoles.includes(role) || false,
      dueDate: reviewDueDate,
      isExternal: false,
    };
    setAssignedReviewers([...assignedReviewers, newReviewer]);
    setShowAddReviewer(false);
  };

  const handleAddExternalReviewer = () => {
    if (!externalName.trim() || !externalEmail.trim()) return;
    
    const newReviewer: ReviewerAssignment = {
      userId: `ext-${Date.now()}`,
      userName: externalName.trim(),
      email: externalEmail.trim(),
      role: 'qc-specialist',
      functionalArea: externalFunctionalArea,
      sections: ['all'],
      isRequired: false,
      dueDate: reviewDueDate,
      isExternal: true,
      authMethod: externalAuthMethod,
    };
    
    setAssignedReviewers([...assignedReviewers, newReviewer]);
    setExternalName('');
    setExternalEmail('');
    setShowAddExternal(false);
  };

  const handleRemoveReviewer = (userId: string) => {
    setAssignedReviewers(assignedReviewers.filter(r => r.userId !== userId));
  };

  const handleUpdateZonePermission = (sectionId: string, userId: string, permission: ZonePermission) => {
    setZonePermissions(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), [userId]: permission },
    }));
  };

  const handleSendForReview = () => {
    if (!currentStage || assignedReviewers.length === 0) return;
    
    const reviewId = createReview({
      documentId: document.id,
      documentTitle: document.shortTitle,
      documentVersion: document.version,
      name: `${document.shortTitle} - ${currentStage.name} Review`,
      type: reviewType,
      status: 'pending',
      ownerId: 'current-user',
      ownerName: 'Current User',
      zones: [],
      participants: [],
      blindingConfig: {
        allowSameFunctionalArea,
        allowOwnerOverride: true,
        revealOnConsolidation,
      },
      dueDate: reviewDueDate,
      allowExternalReviewers: assignedReviewers.some(r => r.isExternal),
      externalAuthMethod: 'email',
    });

    documentSections.forEach(section => {
      const permissions: Record<string, ZonePermission> = {};
      assignedReviewers.forEach(reviewer => {
        permissions[reviewer.userId] = zonePermissions[section.id]?.[reviewer.userId] || 'comment';
      });
      addZone(reviewId, {
        sectionId: section.id,
        sectionNumber: section.number,
        sectionTitle: section.title,
        permissions,
      });
    });

    const invites: Array<{ name: string; email: string; url: string }> = [];
    
    assignedReviewers.forEach(reviewer => {
      const participantId = addParticipant(reviewId, {
        name: reviewer.userName,
        email: reviewer.email,
        role: reviewer.role,
        functionalArea: reviewer.functionalArea,
        isExternal: reviewer.isExternal,
        authMethod: reviewer.isExternal ? reviewer.authMethod : undefined,
        assignedZones: documentSections.map(s => s.id),
        dueDate: reviewer.dueDate,
      });
      
      if (reviewer.isExternal) {
        const invite = inviteExternalReviewer(reviewId, {
          reviewId,
          email: reviewer.email,
          name: reviewer.userName,
          role: reviewer.role,
          functionalArea: reviewer.functionalArea,
          assignedZoneIds: documentSections.map(s => s.id),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        invites.push({ name: reviewer.userName, email: reviewer.email, url: invite.accessUrl });
      }
    });

    if (invites.length > 0) {
      setGeneratedInvites(invites);
      setViewMode('external');
    } else {
      onSendForReview(reviewId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[1000px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Review Workflow</h2>
            <p className="text-sm text-text-muted">{document.shortTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'configure', label: 'Workflow' },
            { id: 'assign', label: 'Reviewers' },
            { id: 'zones', label: 'Zone Permissions' },
            ...(generatedInvites.length > 0 ? [{ id: 'external', label: 'External Invites' }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {viewMode === 'overview' && (
            <div className="space-y-6">
              {/* Review Type Selection */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Review Type</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'standard', name: 'Standard', desc: 'All reviewers see all comments', icon: Eye },
                    { id: 'blinded', name: 'Blinded', desc: 'Comments hidden until consolidation', icon: EyeOff },
                    { id: 'partially-blinded', name: 'Partially Blinded', desc: 'See own functional area only', icon: Shield },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setReviewType(type.id as ReviewType)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        reviewType === type.id
                          ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/20'
                          : 'border-border hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <type.icon className={`w-5 h-5 ${reviewType === type.id ? 'text-accent-blue' : 'text-text-muted'}`} />
                        <span className="font-medium text-text-primary">{type.name}</span>
                      </div>
                      <p className="text-xs text-text-muted">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Blinding Options */}
              {reviewType !== 'standard' && (
                <div className="p-4 bg-surface-card rounded-lg border border-border">
                  <h4 className="text-sm font-medium text-text-primary mb-3">Blinding Options</h4>
                  <div className="space-y-3">
                    {reviewType === 'partially-blinded' && (
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowSameFunctionalArea}
                          onChange={(e) => setAllowSameFunctionalArea(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue"
                        />
                        <span className="text-sm text-text-secondary">
                          Allow reviewers to see comments from same functional area
                        </span>
                      </label>
                    )}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={revealOnConsolidation}
                        onChange={(e) => setRevealOnConsolidation(e.target.checked)}
                        className="w-4 h-4 rounded border-border text-accent-blue focus:ring-accent-blue"
                      />
                      <span className="text-sm text-text-secondary">
                        Reveal all comments when consolidation begins
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Review Timeline */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Review Timeline</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-text-muted mb-1">Due Date</label>
                    <input
                      type="date"
                      value={reviewDueDate}
                      onChange={(e) => setReviewDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-text-muted mb-1">Workflow</label>
                    <div className="px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary">
                      {selectedWorkflow.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                <h4 className="text-sm font-medium text-accent-blue mb-2">Review Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Reviewers:</span>
                    <span className="ml-2 font-medium text-text-primary">{assignedReviewers.length}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Sections:</span>
                    <span className="ml-2 font-medium text-text-primary">{documentSections.length}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Type:</span>
                    <span className="ml-2 font-medium text-text-primary capitalize">{reviewType.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Configure Workflow Tab */}
          {viewMode === 'configure' && (
            <div className="space-y-3">
              {reviewWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedWorkflow.id === workflow.id
                      ? 'border-accent-blue ring-2 ring-accent-blue/20 bg-accent-blue/5'
                      : 'border-border hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text-primary">{workflow.name}</span>
                    {selectedWorkflow.id === workflow.id && <CheckCircle className="w-5 h-5 text-accent-blue" />}
                  </div>
                  <p className="text-xs text-text-muted mb-3">{workflow.description}</p>
                  <div className="flex items-center gap-2">
                    {workflow.stages.map((stage, i) => (
                      <div key={stage.id} className="flex items-center">
                        <span className="text-xs px-2 py-1 bg-surface-card rounded">{stage.name}</span>
                        {i < workflow.stages.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted mx-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assign Reviewers Tab */}
          {viewMode === 'assign' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Assigned Reviewers</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowAddExternal(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent-purple hover:bg-accent-purple/10 rounded-lg">
                    <ExternalLink className="w-4 h-4" /> Add External
                  </button>
                  <button onClick={() => setShowAddReviewer(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg">
                    <Plus className="w-4 h-4" /> Add Reviewer
                  </button>
                </div>
              </div>
              
              {assignedReviewers.length === 0 ? (
                <div className="text-center py-8 bg-surface-card rounded-lg border border-border">
                  <Users className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">No reviewers assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedReviewers.map(reviewer => (
                    <div key={reviewer.userId} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{reviewer.userName}</span>
                          {reviewer.isExternal && <span className="text-xs px-1.5 py-0.5 bg-accent-purple/20 text-accent-purple rounded">External</span>}
                        </div>
                        <div className="text-xs text-text-muted mt-1">{reviewer.email} • {functionalAreaLabels[reviewer.functionalArea]}</div>
                      </div>
                      <button onClick={() => handleRemoveReviewer(reviewer.userId)} className="p-1.5 text-text-muted hover:text-accent-red rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Reviewer Modal */}
              {showAddReviewer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface-elevated rounded-xl border border-border w-[500px] max-h-[70vh] flex flex-col">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary">Add Reviewer</h3>
                      <button onClick={() => setShowAddReviewer(false)} className="p-2 hover:bg-surface-card rounded-lg">
                        <X className="w-5 h-5 text-text-muted" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 space-y-2">
                      {availableUsers.filter(u => !assignedReviewers.some(r => r.userId === u.id)).map(user => (
                        <div key={user.id} className="p-3 bg-surface-card rounded-lg border border-border">
                          <div className="font-medium text-text-primary">{user.name}</div>
                          <div className="text-xs text-text-muted mb-2">{user.email}</div>
                          <div className="flex flex-wrap gap-2">
                            {user.roles.map(role => (
                              <button key={role} onClick={() => handleAddReviewer(user, role as ReviewerRole)} className="text-xs px-2 py-1 bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30">
                                {roleLabels[role as ReviewerRole]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Add External Modal */}
              {showAddExternal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-surface-elevated rounded-xl border border-border w-[500px]">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-text-primary">Add External Reviewer</h3>
                      <button onClick={() => setShowAddExternal(false)} className="p-2 hover:bg-surface-card rounded-lg">
                        <X className="w-5 h-5 text-text-muted" />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Name</label>
                        <input type="text" value={externalName} onChange={(e) => setExternalName(e.target.value)} placeholder="Dr. John Smith" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                        <input type="email" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)} placeholder="john.smith@external.com" className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Functional Area</label>
                        <select value={externalFunctionalArea} onChange={(e) => setExternalFunctionalArea(e.target.value as FunctionalArea)} className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue">
                          {Object.entries(functionalAreaLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Authentication</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={externalAuthMethod === 'email'} onChange={() => setExternalAuthMethod('email')} className="w-4 h-4 text-accent-blue" />
                            <span className="text-sm text-text-secondary">Email Link</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" checked={externalAuthMethod === 'sso'} onChange={() => setExternalAuthMethod('sso')} className="w-4 h-4 text-accent-blue" />
                            <span className="text-sm text-text-secondary">SSO</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                      <button onClick={() => setShowAddExternal(false)} className="px-4 py-2 text-sm text-text-secondary">Cancel</button>
                      <button onClick={handleAddExternalReviewer} disabled={!externalName.trim() || !externalEmail.trim()} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm disabled:opacity-50">
                        Add External Reviewer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zone Permissions Tab */}
          {viewMode === 'zones' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Section Permissions</h3>
                  <p className="text-xs text-text-muted mt-1">Set what each reviewer can do in each section</p>
                </div>
              </div>

              {assignedReviewers.length === 0 ? (
                <div className="text-center py-8 bg-surface-card rounded-lg border border-border">
                  <Shield className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">Add reviewers first to configure permissions</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-sm font-medium text-text-primary py-2 px-3">Section</th>
                        {assignedReviewers.map(reviewer => (
                          <th key={reviewer.userId} className="text-center text-sm font-medium text-text-primary py-2 px-3 min-w-[120px]">
                            {reviewer.userName.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {documentSections.map(section => (
                        <tr key={section.id} className="border-b border-border/50">
                          <td className="py-3 px-3">
                            <div className="text-sm text-text-primary">{section.number}</div>
                            <div className="text-xs text-text-muted truncate max-w-[200px]">{section.title}</div>
                          </td>
                          {assignedReviewers.map(reviewer => {
                            const permission = zonePermissions[section.id]?.[reviewer.userId] || 'comment';
                            return (
                              <td key={reviewer.userId} className="py-3 px-3 text-center">
                                <select
                                  value={permission}
                                  onChange={(e) => handleUpdateZonePermission(section.id, reviewer.userId, e.target.value as ZonePermission)}
                                  className={`px-2 py-1 text-xs rounded border-0 ${
                                    permission === 'edit' ? 'bg-accent-green/20 text-accent-green' :
                                    permission === 'comment' ? 'bg-accent-blue/20 text-accent-blue' :
                                    permission === 'view' ? 'bg-slate-500/20 text-slate-400' :
                                    'bg-slate-700/20 text-slate-500'
                                  }`}
                                >
                                  <option value="edit">Edit</option>
                                  <option value="comment">Comment</option>
                                  <option value="view">View</option>
                                  <option value="hidden">Hidden</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* External Invites Tab */}
          {viewMode === 'external' && generatedInvites.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-accent-green" />
                  <div>
                    <h3 className="font-medium text-accent-green">Review Created Successfully</h3>
                    <p className="text-sm text-text-secondary mt-1">Share the invitation links below with external reviewers.</p>
                  </div>
                </div>
              </div>

              {generatedInvites.map((invite, index) => (
                <div key={index} className="p-4 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-text-primary">{invite.name}</span>
                      <span className="text-text-muted ml-2">({invite.email})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigator.clipboard.writeText(invite.url)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-blue hover:bg-accent-blue/10 rounded">
                        <Copy className="w-3 h-3" /> Copy Link
                      </button>
                      <button onClick={() => window.open(`mailto:${invite.email}?subject=Review Invitation&body=Access: ${invite.url}`)} className="flex items-center gap-1 px-2 py-1 text-xs text-accent-purple hover:bg-accent-purple/10 rounded">
                        <Mail className="w-3 h-3" /> Email
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-surface rounded text-xs font-mono text-text-muted break-all">
                    <Link2 className="w-4 h-4 flex-shrink-0" /> {invite.url}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button onClick={() => onSendForReview('')} className="px-4 py-2 bg-accent-blue text-white rounded-lg">Done</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {viewMode !== 'external' && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-text-muted">{assignedReviewers.length} reviewer{assignedReviewers.length !== 1 ? 's' : ''} assigned</div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary">Cancel</button>
              <button onClick={handleSendForReview} disabled={assignedReviewers.length === 0} className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm disabled:opacity-50">
                <Send className="w-4 h-4" /> Send for Review
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
