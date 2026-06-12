

import { useState, useCallback, useMemo } from 'react';
import {
  Globe, FileText, Users, GitBranch, Clock,
  ChevronRight, ChevronDown, Plus, Check, X, AlertTriangle,
  Download, Eye, Edit, Trash2, Star, UserPlus, Send,
  History, Calendar, TrendingUp, AlertCircle, Zap,
  Building2, Copy, Share2, MessageSquare, CheckCircle
} from 'lucide-react';
import {
  useCampaignEnhancements,
  useCampaignTemplates,
  useCampaignCollaborators,
  useQuestionAssignments,
  usePendingReviews,
  useResponseVersions,
  useSchedulePrediction,
  useCollaborationActivity,
  type RegulatoryAgency,
  type CampaignTemplate,
  type CampaignCollaborator,
  type QuestionAssignment,
  type ReviewRequest,
  type ResponseVersion,
  type SchedulePrediction,
  type CollaborationActivity
} from '@/store/useCampaignEnhancements';
import { useResponseCampaign } from '@/store/useResponseCampaign';
import { useHAQStore } from '@/store/useHAQStore';

// ============================================================================
// TYPES
// ============================================================================

type EnhancedTab = 'agency-format' | 'templates' | 'collaboration' | 'versioning' | 'scheduling';

interface EnhancedCampaignDashboardProps {
  campaignId: string;
  onSelectQuestion?: (questionId: string) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function AgencyBadge({ agency }: { agency: RegulatoryAgency }) {
  const colors: Record<RegulatoryAgency, string> = {
    FDA: 'bg-blue-500/20 text-blue-400',
    EMA: 'bg-green-500/20 text-green-400',
    PMDA: 'bg-red-500/20 text-red-400',
    HC: 'bg-purple-500/20 text-purple-400',
    TGA: 'bg-amber-500/20 text-amber-400',
    MHRA: 'bg-cyan-500/20 text-cyan-400',
    ANVISA: 'bg-emerald-500/20 text-emerald-400',
    NMPA: 'bg-rose-500/20 text-rose-400'
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[agency]}`}>{agency}</span>;
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'bg-accent-green' : pct >= 60 ? 'bg-accent-amber' : 'bg-accent-red';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium">{pct}%</span>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    owner: { bg: 'bg-accent-purple/20', text: 'text-accent-purple' },
    lead: { bg: 'bg-accent-blue/20', text: 'text-accent-blue' },
    reviewer: { bg: 'bg-accent-amber/20', text: 'text-accent-amber' },
    author: { bg: 'bg-accent-green/20', text: 'text-accent-green' },
    viewer: { bg: 'bg-surface-elevated', text: 'text-text-secondary' }
  };
  const { bg, text } = config[role] || config.viewer;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{role}</span>;
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'approved' || status === 'completed' ? 'bg-accent-green' :
                status === 'pending' || status === 'in-progress' ? 'bg-accent-amber' :
                status === 'failed' || status === 'rejected' ? 'bg-accent-red' : 'bg-text-secondary';
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}

// ============================================================================
// TAB: Agency-Specific Formatting
// ============================================================================

function AgencyFormatTab({ campaignId }: { campaignId: string }) {
  const { getAgencyProfile, formatPackageForAgency, exportAgencyPackage, formattedPackages, isProcessing } = useCampaignEnhancements();
  const [selectedAgency, setSelectedAgency] = useState<RegulatoryAgency>('FDA');
  const [formatting, setFormatting] = useState(false);
  
  const agencies: RegulatoryAgency[] = ['FDA', 'EMA', 'PMDA', 'HC', 'TGA', 'MHRA', 'ANVISA', 'NMPA'];
  const profile = getAgencyProfile(selectedAgency);
  const existingPackage = Object.values(formattedPackages).find(p => p.campaignId === campaignId && p.agency === selectedAgency);
  
  const handleFormat = useCallback(async () => {
    setFormatting(true);
    try {
      await formatPackageForAgency(campaignId, selectedAgency);
    } finally {
      setFormatting(false);
    }
  }, [campaignId, selectedAgency, formatPackageForAgency]);
  
  const handleExport = useCallback(async (format: 'word' | 'pdf' | 'both') => {
    if (existingPackage) {
      await exportAgencyPackage(existingPackage.id, format);
    }
  }, [existingPackage, exportAgencyPackage]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Agency-Specific Formatting</h3>
          <p className="text-sm text-text-secondary">Format your response package for different regulatory agencies</p>
        </div>
      </div>
      
      {/* Agency Selector */}
      <div className="flex flex-wrap gap-2">
        {agencies.map(agency => (
          <button
            key={agency}
            onClick={() => setSelectedAgency(agency)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedAgency === agency
                ? 'bg-accent-blue text-white'
                : 'bg-surface-elevated border border-border hover:bg-surface-hover'
            }`}
          >
            {agency}
          </button>
        ))}
      </div>
      
      {/* Agency Profile */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-text-secondary" />
            <h4 className="font-medium">{profile.name}</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Region</span>
              <span>{profile.region}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Language</span>
              <span>{profile.language}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Date Format</span>
              <span className="font-mono text-xs">{profile.dateFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Matrix Format</span>
              <span className="capitalize">{profile.responseMatrixFormat.replace(/-/g, ' ')}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Required Sections</h4>
          <div className="space-y-1">
            {profile.requiredSections.map(section => (
              <div key={section} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-accent-green" />
                <span className="capitalize">{section.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
          {profile.optionalSections.length > 0 && (
            <>
              <h4 className="font-medium mt-4 mb-2 text-text-secondary">Optional</h4>
              {profile.optionalSections.map(section => (
                <div key={section} className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="w-4 h-4" />
                  <span className="capitalize">{section.replace(/-/g, ' ')}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
      
      {/* Formatting Rules */}
      {profile.formattingRules.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Formatting Rules</h4>
          <div className="space-y-2">
            {profile.formattingRules.map(rule => (
              <div key={rule.id} className="flex items-start gap-2 text-sm">
                {rule.required ? (
                  <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
                ) : (
                  <span className="w-4" />
                )}
                <div>
                  <span className="font-medium capitalize">{rule.element}:</span>{' '}
                  <span className="text-text-secondary">{rule.rule}</span>
                  {rule.example && (
                    <div className="mt-1 text-xs text-text-tertiary font-mono bg-surface-base p-2 rounded">{rule.example}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Existing Package or Format Button */}
      {existingPackage ? (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-accent-green" />
              <div>
                <h4 className="font-medium">Package Ready</h4>
                <p className="text-xs text-text-secondary">Created {new Date(existingPackage.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <AgencyBadge agency={existingPackage.agency} />
          </div>
          
          {existingPackage.validationResults.length > 0 && (
            <div className="mb-4 space-y-1">
              {existingPackage.validationResults.map((result, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-sm ${result.passed ? 'text-accent-green' : result.severity === 'error' ? 'text-accent-red' : 'text-accent-amber'}`}>
                  {result.passed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span>{result.message}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <button onClick={() => handleExport('word')} className="flex items-center gap-2 px-3 py-1.5 bg-surface-base border border-border rounded-lg text-sm hover:bg-surface-hover">
              <Download className="w-4 h-4" /> Word
            </button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-1.5 bg-surface-base border border-border rounded-lg text-sm hover:bg-surface-hover">
              <Download className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => handleExport('both')} className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90">
              <Download className="w-4 h-4" /> Both
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleFormat}
          disabled={formatting || isProcessing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50"
        >
          <Globe className="w-5 h-5" />
          {formatting ? 'Formatting...' : `Format for ${selectedAgency}`}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Campaign Templates
// ============================================================================

function TemplatesTab({ campaignId }: { campaignId: string }) {
  const templates = useCampaignTemplates();
  const { createTemplate, instantiateTemplate, rateTemplate, deleteTemplate } = useCampaignEnhancements();
  const { createCampaign } = useResponseCampaign();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = ['ir-response', 'crl-response', 'annual-report', 'safety-update', 'amendment', 'pre-submission', 'custom'];
  const filteredTemplates = selectedCategory ? templates.filter(t => t.category === selectedCategory) : templates;
  
  const handleUseTemplate = useCallback((template: CampaignTemplate) => {
    const config = instantiateTemplate(template.id);
    /* Template instantiated */
  }, [instantiateTemplate]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Campaign Templates</h3>
          <p className="text-sm text-text-secondary">Save and reuse campaign configurations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-lg text-sm ${!selectedCategory ? 'bg-accent-blue text-white' : 'bg-surface-elevated border border-border hover:bg-surface-hover'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${selectedCategory === cat ? 'bg-accent-blue text-white' : 'bg-surface-elevated border border-border hover:bg-surface-hover'}`}
          >
            {cat.replace(/-/g, ' ')}
          </button>
        ))}
      </div>
      
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map(template => (
          <div key={template.id} className="p-4 bg-surface-elevated rounded-lg border border-border">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <span className="text-xs text-text-secondary capitalize">{template.category.replace(/-/g, ' ')}</span>
              </div>
              {template.isGlobal && (
                <span className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded-full">Global</span>
              )}
            </div>
            
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">{template.description}</p>
            
            <div className="flex items-center gap-4 mb-3 text-xs text-text-secondary">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-accent-amber" />
                <span>{template.rating}</span>
              </div>
              <div>Used {template.usageCount}x</div>
              <div>v{template.version}</div>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-3">
              {template.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-surface-base text-xs rounded">{tag}</span>
              ))}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleUseTemplate(template)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
              >
                <Copy className="w-3 h-3" /> Use
              </button>
              <button className="p-1.5 border border-border rounded-lg hover:bg-surface-hover">
                <Eye className="w-4 h-4" />
              </button>
              {!template.isGlobal && (
                <button
                  onClick={() => deleteTemplate(template.id)}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface-hover text-accent-red"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TAB: Collaborative Review
// ============================================================================

function CollaborationTab({ campaignId }: { campaignId: string }) {
  const collaborators = useCampaignCollaborators(campaignId);
  const assignments = useQuestionAssignments(campaignId);
  const activity = useCollaborationActivity(campaignId, 20);
  const { addCollaborator, assignQuestion, requestReview } = useCampaignEnhancements();
  const haqs = useHAQStore(s => s.haqs);
  const campaign = useResponseCampaign(state => state.campaigns[campaignId]);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  
  const campaignQuestions = useMemo(() => {
    return campaign?.config.questionIds.map(qId => haqs.find(q => q.id === qId)).filter(Boolean) || [];
  }, [campaign, haqs]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Team Collaboration</h3>
          <p className="text-sm text-text-secondary">Manage team members and question assignments</p>
        </div>
        <button
          onClick={() => setShowAddCollaborator(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90"
        >
          <UserPlus className="w-4 h-4" /> Add Member
        </button>
      </div>
      
      {/* Team Members */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <h4 className="font-medium mb-3">Team Members ({collaborators.length})</h4>
        <div className="space-y-2">
          {collaborators.length === 0 ? (
            <p className="text-sm text-text-secondary">No team members yet. Add collaborators to start.</p>
          ) : (
            collaborators.map(collab => (
              <div key={collab.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-medium">
                    {collab.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{collab.userName}</div>
                    <div className="text-xs text-text-secondary">{collab.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={collab.role} />
                  <span className="text-xs text-text-tertiary">
                    {assignments.filter(a => a.assignedTo === collab.userId).length} assigned
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Question Assignments */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <h4 className="font-medium mb-3">Question Assignments</h4>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {campaignQuestions.map(question => {
            const assignment = assignments.find(a => a.questionId === question?.id);
            const assignee = collaborators.find(c => c.userId === assignment?.assignedTo);
            
            return (
              <div key={question?.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover">
                <div className="flex items-center gap-2">
                  <StatusDot status={assignment?.status || 'pending'} />
                  <span className="text-sm font-medium">{question?.questionNumber}</span>
                  <span className="text-xs text-text-secondary line-clamp-1 max-w-[200px]">{question?.questionText}</span>
                </div>
                <div className="flex items-center gap-2">
                  {assignee ? (
                    <span className="text-sm">{assignee.userName}</span>
                  ) : (
                    <span className="text-sm text-text-tertiary">Unassigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <h4 className="font-medium mb-3">Recent Activity</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-sm text-text-secondary">No activity yet</p>
          ) : (
            activity.map(act => (
              <div key={act.id} className="flex items-start gap-2 text-sm">
                <span className="text-text-tertiary text-xs whitespace-nowrap">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-text-secondary">
                  <span className="font-medium text-text-primary">{act.userName}</span>{' '}
                  {act.type === 'joined' && 'joined the campaign'}
                  {act.type === 'assigned' && 'was assigned a question'}
                  {act.type === 'completed-review' && 'completed a review'}
                  {act.type === 'approved' && 'approved a response'}
                  {act.type === 'commented' && 'added a comment'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAB: Response Versioning
// ============================================================================

function VersioningTab({ campaignId }: { campaignId: string }) {
  const { createVersion, compareVersions, getResponseEvolution, responseVersions } = useCampaignEnhancements();
  const campaign = useResponseCampaign(state => state.campaigns[campaignId]);
  const haqs = useHAQStore(s => s.haqs);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  
  const campaignQuestions = useMemo(() => {
    return campaign?.config.questionIds.map(qId => haqs.find(q => q.id === qId)).filter(Boolean) || [];
  }, [campaign, haqs]);
  
  const selectedVersions = selectedQuestionId ? (responseVersions[selectedQuestionId] || []) : [];
  const evolution = selectedQuestionId ? getResponseEvolution(selectedQuestionId) : null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Response Versioning</h3>
          <p className="text-sm text-text-secondary">Track response evolution across IR cycles</p>
        </div>
      </div>
      
      {/* Question Selector */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <h4 className="font-medium mb-3">Select Question</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {campaignQuestions.map(question => {
            const versions = responseVersions[question?.id || ''] || [];
            return (
              <button
                key={question?.id}
                onClick={() => setSelectedQuestionId(question?.id || null)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left ${
                  selectedQuestionId === question?.id ? 'bg-accent-blue/10 border border-accent-blue' : 'hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm font-medium">{question?.questionNumber}</span>
                </div>
                <span className="text-xs text-text-secondary">{versions.length} version(s)</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Version History */}
      {selectedQuestionId && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Version History</h4>
            <button
              onClick={() => {
                const draft = campaign?.activeDraftIds[selectedQuestionId];
                if (draft) {
                  createVersion(selectedQuestionId, campaignId, draft, `Version ${selectedVersions.length + 1}`);
                }
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent-blue text-white rounded hover:bg-accent-blue/90"
            >
              <Plus className="w-3 h-3" /> Create Version
            </button>
          </div>
          
          {selectedVersions.length === 0 ? (
            <p className="text-sm text-text-secondary">No versions created yet. Create a version to track changes.</p>
          ) : (
            <div className="space-y-3">
              {selectedVersions.map((version, idx) => (
                <div key={version.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface-base">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-sm font-bold">
                      {version.versionNumber}
                    </div>
                    {idx < selectedVersions.length - 1 && (
                      <div className="w-px h-8 bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{version.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        version.status === 'approved' ? 'bg-accent-green/20 text-accent-green' :
                        version.status === 'submitted' ? 'bg-accent-blue/20 text-accent-blue' :
                        'bg-surface-elevated text-text-secondary'
                      }`}>
                        {version.status}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {new Date(version.createdAt).toLocaleString()} • Score: {version.qualityScore}
                    </div>
                    {version.changesSummary && (
                      <div className="text-xs text-text-tertiary mt-1">
                        +{version.changesSummary.additions} / -{version.changesSummary.deletions} changes
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Evolution Metrics */}
      {evolution && evolution.versions.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Evolution Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-blue">{evolution.evolutionMetrics.totalVersions}</div>
              <div className="text-xs text-text-secondary">Total Versions</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                evolution.evolutionMetrics.qualityTrend === 'improving' ? 'text-accent-green' :
                evolution.evolutionMetrics.qualityTrend === 'declining' ? 'text-accent-red' : 'text-text-primary'
              }`}>
                {evolution.evolutionMetrics.qualityTrend === 'improving' ? '↑' : evolution.evolutionMetrics.qualityTrend === 'declining' ? '↓' : '→'}
              </div>
              <div className="text-xs text-text-secondary">Quality Trend</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{evolution.evolutionMetrics.contentGrowth > 0 ? '+' : ''}{evolution.evolutionMetrics.contentGrowth}</div>
              <div className="text-xs text-text-secondary">Content Growth</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TAB: Predictive Scheduling
// ============================================================================

function SchedulingTab({ campaignId }: { campaignId: string }) {
  const prediction = useSchedulePrediction(campaignId);
  const { generatePrediction, getWorkloadDistribution, getOptimizations } = useCampaignEnhancements();
  const collaborators = useCampaignCollaborators(campaignId);
  const [generating, setGenerating] = useState(false);
  
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      generatePrediction(campaignId);
    } finally {
      setGenerating(false);
    }
  }, [campaignId, generatePrediction]);
  
  const workload = useMemo(() => getWorkloadDistribution(campaignId), [campaignId, getWorkloadDistribution]);
  const optimizations = useMemo(() => getOptimizations(campaignId), [campaignId, getOptimizations]);
  
  if (!prediction) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto text-text-secondary mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Schedule Prediction</h3>
        <p className="text-sm text-text-secondary mb-6">Generate a prediction to see estimated completion times</p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate Prediction'}
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Predictive Scheduling</h3>
          <p className="text-sm text-text-secondary">AI-estimated completion times and workload analysis</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-surface-hover disabled:opacity-50"
        >
          <TrendingUp className="w-4 h-4" /> Refresh
        </button>
      </div>
      
      {/* Campaign Completion */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Estimated Completion</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Confidence:</span>
            <ConfidenceMeter confidence={prediction.overallConfidence} />
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-surface-base rounded-lg">
            <div className="text-xs text-text-secondary mb-1">Optimistic</div>
            <div className="text-sm font-medium text-accent-green">
              {new Date(prediction.campaignCompletion.confidenceRange.optimistic).toLocaleDateString()}
            </div>
          </div>
          <div className="p-3 bg-accent-blue/10 rounded-lg border border-accent-blue/30">
            <div className="text-xs text-accent-blue mb-1">Most Likely</div>
            <div className="text-lg font-bold text-accent-blue">
              {new Date(prediction.campaignCompletion.confidenceRange.mostLikely).toLocaleDateString()}
            </div>
          </div>
          <div className="p-3 bg-surface-base rounded-lg">
            <div className="text-xs text-text-secondary mb-1">Pessimistic</div>
            <div className="text-sm font-medium text-accent-red">
              {new Date(prediction.campaignCompletion.confidenceRange.pessimistic).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Risks */}
      {prediction.risks.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Schedule Risks</h4>
          <div className="space-y-2">
            {prediction.risks.map(risk => (
              <div key={risk.id} className={`p-3 rounded-lg ${
                risk.severity === 'high' ? 'bg-accent-red/10 border border-accent-red/30' :
                risk.severity === 'medium' ? 'bg-accent-amber/10 border border-accent-amber/30' :
                'bg-surface-base'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${
                    risk.severity === 'high' ? 'text-accent-red' :
                    risk.severity === 'medium' ? 'text-accent-amber' : 'text-text-secondary'
                  }`} />
                  <span className="font-medium text-sm capitalize">{risk.type} Risk</span>
                  <span className="text-xs text-text-secondary">({Math.round(risk.probability * 100)}% likely)</span>
                </div>
                <p className="text-sm text-text-secondary">{risk.impact}</p>
                {risk.mitigation && (
                  <p className="text-xs text-accent-blue mt-1">Mitigation: {risk.mitigation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Workload Distribution */}
      {workload.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Workload Distribution</h4>
          <div className="space-y-3">
            {workload.map(w => (
              <div key={w.collaboratorId} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{w.collaboratorName}</span>
                  <span className={`text-xs ${w.overloaded ? 'text-accent-red' : 'text-text-secondary'}`}>
                    {w.assignedQuestions} questions • {Math.round(w.estimatedWorkload / 60)}h est.
                  </span>
                </div>
                <div className="h-2 bg-surface-base rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      w.currentCapacity > 100 ? 'bg-accent-red' :
                      w.currentCapacity > 80 ? 'bg-accent-amber' : 'bg-accent-green'
                    }`}
                    style={{ width: `${Math.min(100, w.currentCapacity)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Optimizations */}
      {optimizations.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg border border-border">
          <h4 className="font-medium mb-3">Optimization Suggestions</h4>
          <div className="space-y-2">
            {optimizations.map(opt => (
              <div key={opt.id} className="p-3 bg-surface-base rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm capitalize">{opt.type.replace(/-/g, ' ')}</span>
                  <span className="text-xs text-accent-green">Save ~{Math.round(opt.estimatedSavings / 60)}h</span>
                </div>
                <p className="text-sm text-text-secondary">{opt.description}</p>
                {opt.tradeoffs.length > 0 && (
                  <p className="text-xs text-accent-amber mt-1">Tradeoff: {opt.tradeoffs[0]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EnhancedCampaignDashboard({ campaignId, onSelectQuestion }: EnhancedCampaignDashboardProps) {
  const campaign = useResponseCampaign(state => state.campaigns[campaignId]);
  const [activeTab, setActiveTab] = useState<EnhancedTab>('agency-format');
  
  if (!campaign) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-text-secondary mb-4" />
        <h3 className="text-lg font-semibold mb-2">Campaign Not Found</h3>
        <p className="text-sm text-text-secondary">The requested campaign could not be loaded</p>
      </div>
    );
  }
  
  const tabs: { id: EnhancedTab; label: string; icon: typeof Globe }[] = [
    { id: 'agency-format', label: 'Agency Format', icon: Globe },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'collaboration', label: 'Collaboration', icon: Users },
    { id: 'versioning', label: 'Versioning', icon: GitBranch },
    { id: 'scheduling', label: 'Scheduling', icon: Clock }
  ];
  
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="font-semibold">Campaign Enhancements</h2>
          <p className="text-sm text-text-secondary">{campaign.config.name}</p>
        </div>
      </div>
      
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'agency-format' && <AgencyFormatTab campaignId={campaignId} />}
        {activeTab === 'templates' && <TemplatesTab campaignId={campaignId} />}
        {activeTab === 'collaboration' && <CollaborationTab campaignId={campaignId} />}
        {activeTab === 'versioning' && <VersioningTab campaignId={campaignId} />}
        {activeTab === 'scheduling' && <SchedulingTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

export default EnhancedCampaignDashboard;
