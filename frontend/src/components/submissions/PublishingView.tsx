



import { useState, useMemo } from 'react';
import {
  Package, FileText, CheckCircle, Clock, AlertCircle, AlertTriangle, Upload, Download, Send,
  Eye, Play, RefreshCw, ChevronRight, ChevronDown, Plus, Search, Code, FolderTree,
  FileCheck, Zap, ExternalLink, Check, Globe, History,
  File, Folder, XCircle, Sparkles, ListOrdered
} from 'lucide-react';
import {
  publishingProjects, calculateProjectProgress,
} from '@/data/publishing-data';
import { FilterState } from '@/components/layout/FilterBar';
import { SubmissionsFilterBar, EMPTY_SUBMISSIONS_FILTER } from '@/components/submissions/SubmissionsFilterBar'; // v0.125.77
import type { SubmissionsFilter } from '@/components/submissions/SubmissionsFilterBar';
import { PublishingProject, SubmissionStatus, ValidationSeverity } from '@/types/publishing';
import { useProducts } from '@/stores/products-store';
import { PDFValidationPanel } from './PDFValidationPanel';
import { GatewayStatusPanel } from './GatewayStatusPanel';
import { GatewaySubmissionPanel } from '@/components/safety/GatewaySubmissionPanel';
import { PublishingQueue } from './PublishingQueue';
import { SubmissionHistoryDashboard } from './SubmissionHistoryDashboard';
import { ECTDValidationWorkflow } from '@/components/publishing/ECTDValidationWorkflow';

interface PublishingViewProps {
  filters?: FilterState;
}

const statusConfig: Record<SubmissionStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <Clock className="w-3 h-3" /> },
  'assembling': { label: 'Assembling', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <Package className="w-3 h-3" /> },
  'validating': { label: 'Validating', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  'validated': { label: 'Validated', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <CheckCircle className="w-3 h-3" /> },
  'ready': { label: 'Ready', color: 'text-accent-teal', bgColor: 'bg-accent-teal/20', icon: <FileCheck className="w-3 h-3" /> },
  'submitted': { label: 'Submitted', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20', icon: <Send className="w-3 h-3" /> },
  'acknowledged': { label: 'Acknowledged', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <Check className="w-3 h-3" /> },
  'accepted': { label: 'Accepted', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <CheckCircle className="w-3 h-3" /> },
  'rejected': { label: 'Rejected', color: 'text-accent-red', bgColor: 'bg-accent-red/20', icon: <XCircle className="w-3 h-3" /> },
};

export function PublishingView({ filters }: PublishingViewProps) {
  const products = useProducts();
  const [activeTab, setActiveTab] = useState<'projects' | 'queue' | 'validation' | 'backbone' | 'submit' | 'history'>('projects');
  const [subFilter, setSubFilter] = useState<SubmissionsFilter>(EMPTY_SUBMISSIONS_FILTER); // v0.125.77
  const [selectedProject, setSelectedProject] = useState<PublishingProject | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Apply global filters
  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    
    const hasActiveFilter = filters.product !== 'all' || 
                           filters.therapeuticArea !== 'all' || 
                           filters.modality !== 'all' || 
                           filters.stage !== 'all';
    
    if (!hasActiveFilter) return null;
    
    let filtered = [...products];
    
    if (filters.product !== 'all') {
      filtered = filtered.filter(p => p.id === filters.product);
    }
    
    return new Set(filtered.map(p => p.id));
  }, [filters]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return publishingProjects.filter(project => {
      if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(project.productId)) {
        return false;
      }
      if (filterStatus !== 'all' && project.status !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [matchingProductIds, filterStatus]);

  const handleValidate = async (project: PublishingProject) => {
    setIsValidating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsValidating(false);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Sub-tabs */}
      <div className="px-6 py-3 border-b border-border bg-surface-elevated flex items-center gap-4">
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'projects' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Package className="w-4 h-4" />
          Publishing Projects
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'queue' ? 'bg-accent-teal/10 text-accent-teal' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Queue
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'validation' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Validation
        </button>
        <button
          onClick={() => setActiveTab('backbone')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'backbone' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Code className="w-4 h-4" />
          Backbone Generator
        </button>

        <button
          onClick={() => setActiveTab('submit')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'submit' ? 'bg-accent-purple/10 text-accent-purple' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Globe className="w-4 h-4" />
          Gateway
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'history' ? 'bg-accent-amber/10 text-accent-amber' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <History className="w-4 h-4" />
          History
        </button>

        <div className="ml-auto flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="assembling">Assembling</option>
            <option value="validating">Validating</option>
            <option value="validated">Validated</option>
            <option value="ready">Ready</option>
            <option value="submitted">Submitted</option>
          </select>
        </div>
      </div>

      {/* Content */}
            {/* v0.125.77: Filter bar — parity with Submissions Hub */}
      <SubmissionsFilterBar value={subFilter} onChange={setSubFilter} />

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'projects' && (
          <div className="grid grid-cols-2 gap-6">
            {filteredProjects.map(project => {
              const status = statusConfig[project.status];
              const progress = calculateProjectProgress(project);
              
              return (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`bg-surface-elevated rounded-xl p-5 border cursor-pointer transition-colors ${
                    selectedProject?.id === project.id 
                      ? 'border-accent-blue' 
                      : 'border-border hover:border-accent-blue/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary">{project.description}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${status.bgColor} ${status?.color ?? ''}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">{project.submissionType} • {project.region}</p>
                    </div>
                    <Globe className="w-5 h-5 text-text-muted" />
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-text-primary font-medium">{progress}%</span>
                    </div>
                    <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          progress >= 100 ? 'bg-accent-green' :
                          progress >= 50 ? 'bg-accent-blue' :
                          'bg-accent-amber'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Document count */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <FileText className="w-4 h-4" />
                      <span>{project.documents.length} documents</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <Clock className="w-4 h-4" />
                      <span>Target: {project.targetDate}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleValidate(project); }}
                      className="px-3 py-1.5 text-xs bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 flex items-center gap-1.5"
                    >
                      <Play className="w-3 h-3" />
                      Validate
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded-lg hover:text-text-primary flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded-lg hover:text-text-primary flex items-center gap-1.5">
                      <Download className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'queue' && (
          <PublishingQueue />
        )}

        {activeTab === 'validation' && (
          <ECTDValidationWorkflow />
        )}

        {activeTab === 'backbone' && (
          <div className="space-y-6">
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <h3 className="font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-accent-purple" />
                eCTD Backbone Generator
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button className="p-4 bg-surface-card rounded-lg border border-border hover:border-accent-blue transition-colors text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                      <FolderTree className="w-5 h-5 text-accent-blue" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">eCTD 3.2.2</div>
                      <div className="text-xs text-text-muted">FDA, EMA, Health Canada</div>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">Generate standard eCTD 3.2.2 backbone with regional extensions</p>
                </button>

                <button className="p-4 bg-surface-card rounded-lg border border-border hover:border-accent-purple transition-colors text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-accent-purple" />
                    </div>
                    <div>
                      <div className="font-medium text-text-primary">eCTD 4.0</div>
                      <div className="text-xs text-text-muted">Next generation format</div>
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary">Generate eCTD 4.0 backbone with RPS message structure</p>
                </button>
              </div>

              <div className="bg-surface-card rounded-lg p-4">
                <div className="text-xs text-text-muted mb-2">Sample backbone structure:</div>
                <pre className="text-xs text-accent-blue font-mono overflow-x-auto">
{`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ectd:ectd SYSTEM "ich-ectd-3-2.dtd">
<ectd:ectd xmlns:ectd="http://www.ich.org/ectd">
  <m1-administrative>
    <m1-1-forms />
    <m1-2-cover-letter />
  </m1-administrative>
  <m2-summaries>
    <m2-2-introduction />
    <m2-5-clinical-overview />
  </m2-summaries>
  ...
</ectd:ectd>`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submit' && (
          <div className="space-y-6">
            {selectedProject ? (
              <GatewaySubmissionPanel
                projectId={selectedProject.id}
                applicationNumber={selectedProject.applicationNumber}
                sequenceNumber={selectedProject.sequenceNumber}
                submissionType={selectedProject.submissionType}
                productName={selectedProject.description}
                region={selectedProject.region}
                onStatusChange={(status) => {
                  /* Status changed */
                }}
                onGatewaySelect={(gateway) => {
                  /* Gateway selected */
                }}
              />
            ) : (
              <div className="bg-surface-elevated rounded-xl border border-border p-8 text-center">
                <Globe className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">Select a Project</h3>
                <p className="text-sm text-text-muted mb-4">
                  Select a publishing project from the Projects tab to submit to a regulatory gateway.
                </p>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="px-4 py-2 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/90"
                >
                  Go to Projects
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <SubmissionHistoryDashboard
            projectId={selectedProject?.id}
            onSelectSubmission={(submission) => {
              /* Submission selected */
            }}
          />
        )}
      </div>
    </div>
  );
}
