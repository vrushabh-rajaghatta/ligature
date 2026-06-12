

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Save,
  Download,
  Upload,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Star,
  StarOff,
  Clock,
  Users,
  Tag,
  Settings,
  Check,
  X,
  Filter,
} from 'lucide-react';
import {
  workflowTemplateService,
  WorkflowTemplate,
  TemplateCategory,
  WorkflowTemplateConfig,
} from '@/services/workflow-template-service';
import { WorkflowStepId } from '@/services/publishing-orchestrator';

// ============================================================================
// TYPES
// ============================================================================

interface WorkflowTemplateSelectorProps {
  onSelect: (templateId: string) => void;
  onClose?: () => void;
  currentConfig?: Partial<WorkflowTemplateConfig>;
  selectedTemplateId?: string;
}

interface SaveTemplateDialogProps {
  config: Partial<WorkflowTemplateConfig>;
  enabledSteps: WorkflowStepId[];
  onSave: (template: WorkflowTemplate) => void;
  onClose: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  ind: 'IND',
  nda: 'NDA/MAA',
  bla: 'BLA',
  anda: 'ANDA',
  amendment: 'Amendment',
  supplement: 'Supplement',
  'annual-report': 'Annual Report',
  response: 'HA Response',
  custom: 'Custom',
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  ind: 'bg-blue-100 text-blue-800',
  nda: 'bg-purple-100 text-purple-800',
  bla: 'bg-green-100 text-green-800',
  anda: 'bg-cyan-100 text-cyan-800',
  amendment: 'bg-amber-100 text-amber-800',
  supplement: 'bg-orange-100 text-orange-800',
  'annual-report': 'bg-slate-100 text-slate-800',
  response: 'bg-pink-100 text-pink-800',
  custom: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// SAVE TEMPLATE DIALOG
// ============================================================================

function SaveTemplateDialog({ config, enabledSteps, onSave, onClose }: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isShared, setIsShared] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const template = workflowTemplateService.create({
      name: name.trim(),
      description: description.trim(),
      category,
      tags,
      config: {
        regions: config.regions || ['FDA'],
        strictValidation: true,
        allowWarnings: false,
        autoLinkMinConfidence: config.autoLinkMinConfidence || 70,
        autoLinkTypes: config.autoLinkTypes || ['section', 'reference'],
        preserveExistingLinks: true,
        ectdVersion: '4.0',
        includeRegionalModule: true,
        submitToGateway: config.submitToGateway || false,
        defaultGateway: config.defaultGateway,
        requireAcknowledgment: true,
        stopOnError: config.stopOnError ?? true,
        skipOptionalOnWarning: config.skipOptionalOnWarning ?? false,
        parallelValidation: config.parallelValidation ?? true,
        autoRetryCount: 2,
        notifyOnComplete: true,
        notifyOnError: true,
      },
      enabledSteps,
      isShared,
    });

    onSave(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Save as Template</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Template Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard IND Submission"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tags</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Add
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-700">Share with team</span>
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkflowTemplateSelector({
  onSelect,
  onClose,
  currentConfig,
  selectedTemplateId,
}: WorkflowTemplateSelectorProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load templates
  useEffect(() => {
    setTemplates(workflowTemplateService.getAll());
    const unsubscribe = workflowTemplateService.subscribe(setTemplates);
    return unsubscribe;
  }, []);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (selectedCategory !== 'all') {
      result = result.filter(t => t.category === selectedCategory);
    }

    if (showSharedOnly) {
      result = result.filter(t => t.isShared);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.includes(search))
      );
    }

    return result.sort((a, b) => b.usageCount - a.usageCount);
  }, [templates, selectedCategory, showSharedOnly, searchText]);

  // Stats
  const stats = useMemo(() => workflowTemplateService.getStatistics(), [templates]);

  const handleDuplicate = (id: string) => {
    workflowTemplateService.duplicate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this template? This cannot be undone.')) {
      workflowTemplateService.delete(id);
    }
  };

  const handleExport = (id: string) => {
    const json = workflowTemplateService.exportTemplate(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-template-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-900">Workflow Templates</h2>
          <span className="text-xs text-slate-500">({templates.length})</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-3 border-b border-slate-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'all')}
            className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showSharedOnly}
              onChange={(e) => setShowSharedOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            Shared only
          </label>
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-auto">
        {filteredTemplates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No templates found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className={`${selectedTemplateId === template.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <button
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  className="w-full px-4 py-3 flex items-start gap-3 text-left"
                >
                  {expandedId === template.id ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900">{template.name}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${CATEGORY_COLORS[template.category]}`}>
                        {CATEGORY_LABELS[template.category]}
                      </span>
                      {template.isShared && (
                        <span title="Shared"><Users className="w-3 h-3 text-slate-400" /></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{template.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Used {template.usageCount}x
                      </span>
                      {template.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {template.tags.slice(0, 2).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedId === template.id && (
                  <div className="px-4 pb-4 ml-7">
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500">Regions:</span>
                          <span className="ml-1 text-slate-700">{template.config.regions.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">eCTD Version:</span>
                          <span className="ml-1 text-slate-700">{template.config.ectdVersion}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Gateway:</span>
                          <span className="ml-1 text-slate-700">
                            {template.config.submitToGateway ? template.config.defaultGateway : 'None'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Steps:</span>
                          <span className="ml-1 text-slate-700">{template.enabledSteps.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelect(template.id)}
                        className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Use Template
                      </button>
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="p-1.5 rounded hover:bg-slate-200"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleExport(template.id)}
                        className="p-1.5 rounded hover:bg-slate-200"
                        title="Export"
                      >
                        <Download className="w-4 h-4 text-slate-500" />
                      </button>
                      {template.createdBy.userId !== 'system' && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-1.5 rounded hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {stats.totalTemplates} templates • {stats.mostUsed[0]?.name || 'None'} most used
          </span>
        </div>
      </div>
    </div>
  );
}

// Export the save dialog separately for use in PublishingWorkflowPanel
export { SaveTemplateDialog };
