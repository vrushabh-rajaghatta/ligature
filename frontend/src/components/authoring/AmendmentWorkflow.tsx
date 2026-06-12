

import { useState } from 'react';
import {
  FileText, GitBranch, Plus, Check, X, Clock, AlertTriangle, ChevronRight,
  History, Edit3, Eye, ArrowRight, Calendar, User, Tag, CheckCircle
} from 'lucide-react';
import { AuthoringDocument } from '@/types/authoring';

interface AmendmentWorkflowProps {
  document: AuthoringDocument;
  onClose: () => void;
  onCreateAmendment: (amendmentData: AmendmentData) => void;
}

interface AmendmentData {
  reason: string;
  category: AmendmentCategory;
  description: string;
  affectedSections: string[];
  substantialChange: boolean;
  targetDate: string;
}

type AmendmentCategory = 'safety' | 'efficacy' | 'administrative' | 'regulatory' | 'operational';

const categoryConfig: Record<AmendmentCategory, { label: string; color: string; bgColor: string }> = {
  safety: { label: 'Safety', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  efficacy: { label: 'Efficacy', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  administrative: { label: 'Administrative', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  regulatory: { label: 'Regulatory Request', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  operational: { label: 'Operational', color: 'text-green-400', bgColor: 'bg-green-500/20' },
};

// Mock amendment history
const amendmentHistory = [
  {
    id: 'amend-2',
    version: '2.0',
    date: '2024-08-15',
    category: 'safety' as AmendmentCategory,
    reason: 'Updated safety monitoring based on DSMB recommendation',
    sections: ['8.3', '8.4', '10.2'],
    status: 'approved',
  },
  {
    id: 'amend-1',
    version: '1.0',
    date: '2024-03-01',
    category: 'administrative' as AmendmentCategory,
    reason: 'Initial approved version',
    sections: ['All'],
    status: 'approved',
  },
];

export function AmendmentWorkflow({ document, onClose, onCreateAmendment }: AmendmentWorkflowProps) {
  const [step, setStep] = useState<'history' | 'create'>('history');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<AmendmentCategory>('administrative');
  const [description, setDescription] = useState('');
  const [affectedSections, setAffectedSections] = useState<Set<string>>(new Set());
  const [substantialChange, setSubstantialChange] = useState(false);
  const [targetDate, setTargetDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });

  const handleCreateAmendment = () => {
    onCreateAmendment({
      reason,
      category,
      description,
      affectedSections: Array.from(affectedSections),
      substantialChange,
      targetDate,
    });
  };

  const toggleSection = (sectionId: string) => {
    const newSections = new Set(affectedSections);
    if (newSections.has(sectionId)) {
      newSections.delete(sectionId);
    } else {
      newSections.add(sectionId);
    }
    setAffectedSections(newSections);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[800px] max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <GitBranch className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Amendment Workflow</h2>
              <p className="text-sm text-text-muted">{document.shortTitle} • Current: v{document.version}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4">
          <button
            onClick={() => setStep('history')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              step === 'history'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Amendment History
          </button>
          <button
            onClick={() => setStep('create')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              step === 'create'
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            Create Amendment
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'history' && (
            <div>
              {/* Current Version Banner */}
              <div className="p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-green" />
                  <div>
                    <div className="text-sm font-medium text-accent-green">
                      Current Approved Version: {document.version}
                    </div>
                    <div className="text-xs text-text-muted">
                      Approved on {document.updatedAt} • Any changes require a formal amendment
                    </div>
                  </div>
                </div>
              </div>

              {/* Amendment Timeline */}
              <h3 className="text-sm font-semibold text-text-primary mb-4">Version History</h3>
              <div className="space-y-4">
                {amendmentHistory.map((amendment, index) => (
                  <div key={amendment.id} className="flex gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-accent-green' : 'bg-surface-card border-2 border-border'
                      }`}>
                        {index === 0 ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-xs text-text-muted">{amendment.version}</span>
                        )}
                      </div>
                      {index < amendmentHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-border mt-2" />
                      )}
                    </div>

                    {/* Amendment Details */}
                    <div className="flex-1 pb-6">
                      <div className="p-4 bg-surface-card rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text-primary">
                              Version {amendment.version}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${categoryConfig[amendment.category]?.bgColor} ${categoryConfig[amendment.category]?.color}`}>
                              {categoryConfig[amendment.category]?.label}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted">{amendment.date}</span>
                        </div>
                        <p className="text-sm text-text-secondary mb-3">{amendment.reason}</p>
                        <div className="flex items-center gap-4 text-xs text-text-muted">
                          <span>Sections: {amendment.sections.join(', ')}</span>
                          <button className="text-accent-blue hover:underline flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            View Changes
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'create' && (
            <div className="space-y-6">
              {/* Warning */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-amber-400">Amendment Requirements</div>
                    <p className="text-xs text-text-muted mt-1">
                      Creating an amendment will generate a new version of this document. 
                      Substantial amendments may require IRB/EC notification and regulatory submission.
                    </p>
                  </div>
                </div>
              </div>

              {/* Amendment Category */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-3 block">Amendment Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setCategory(key as AmendmentCategory)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        category === key
                          ? `border-amber-400/50 ${config.bgColor}`
                          : 'border-border hover:border-accent-blue/50'
                      }`}
                    >
                      <span className={`text-sm font-medium ${category === key ? config.color : 'text-text-primary'}`}>
                        {config.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Amendment Reason *</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for amendment (e.g., 'DSMB safety recommendation')"
                  className="w-full px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Detailed Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the changes being made and rationale..."
                  className="w-full h-24 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>

              {/* Affected Sections */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-3 block">Affected Sections *</label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-auto p-2 bg-surface-card rounded-lg border border-border">
                  {(document.sections ?? []).map(section => (
                    <button
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`px-3 py-2 rounded text-xs text-left transition-all ${
                        affectedSections.has(section.id)
                          ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/50'
                          : 'bg-surface hover:bg-surface-elevated text-text-secondary border border-transparent'
                      }`}
                    >
                      {section.number} {section.title}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-1">{affectedSections.size} section(s) selected</p>
              </div>

              {/* Substantial Change */}
              <div className="flex items-start gap-3 p-4 bg-surface-card rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="substantial"
                  checked={substantialChange}
                  onChange={(e) => setSubstantialChange(e.target.checked)}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor="substantial" className="text-sm font-medium text-text-primary cursor-pointer">
                    Substantial Amendment
                  </label>
                  <p className="text-xs text-text-muted mt-0.5">
                    Check if this amendment significantly affects subject safety, study conduct, or scientific integrity.
                    Substantial amendments require IRB/EC approval before implementation.
                  </p>
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">Target Completion Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          {step === 'create' && (
            <button
              onClick={handleCreateAmendment}
              disabled={!reason || !description || affectedSections.size === 0}
              className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitBranch className="w-4 h-4" />
              Create Amendment v{(parseFloat(document.version) + 1).toFixed(1)}
            </button>
          )}
          {step === 'history' && (
            <button
              onClick={() => setStep('create')}
              className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Amendment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
