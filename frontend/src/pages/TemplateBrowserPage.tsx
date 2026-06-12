// =============================================================================
// TEMPLATE BROWSER DEMO PAGE - v0.42.13
// Comprehensive showcase of TemplateBrowser with all features
// 🎯 200 TEMPLATE MILESTONE
// =============================================================================


import React, { useState } from 'react';
import { TemplateBrowser } from '@/components/templates/TemplateBrowser';
import { useTemplateUsageTracking } from '@/hooks/useTemplateUsageTracking';
import type { DocumentTemplate } from '@/data/ectd-document-templates';
import {
  ArrowLeft,
  FileText,
  BarChart3,
  Clock,
  TrendingUp,
  Users,
  Eye,
  Download,
  Copy,
  Sparkles,
  ChevronRight,
  CheckCircle,
  X,
  ExternalLink,
  Play,
  Zap,
  Target,
  Award,
} from 'lucide-react';

type DemoMode = 'full' | 'compact' | 'analytics';

export default function TemplateBrowserDemo() {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [demoMode, setDemoMode] = useState<DemoMode>('full');
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  
  const {
    summary,
    trackViewed,
    trackPreviewed,
    trackSelected,
    trackCreated,
    recentEvents,
  } = useTemplateUsageTracking();

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
    trackViewed(template);
    trackPreviewed(template);
  };

  const handleCreateDocument = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setShowCreateConfirm(true);
    trackSelected(template);
  };

  const confirmCreate = () => {
    if (selectedTemplate) {
      trackCreated(selectedTemplate, {
        sourceModule: 'demo',
        programId: 'demo-program',
      });
      setShowCreateConfirm(false);
      alert(`✅ Document created from template:\n\n${selectedTemplate.name}\n\nIn a real implementation, this would navigate to the Authoring module.`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
            <a href="/" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-200">Demo</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Template Browser</span>
          </div>
          
          {/* Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-400" />
                Template Browser
              </h1>
              <p className="text-slate-400 mt-1">
                v0.42.13 - Browse 200 eCTD document templates with category filtering, guidance search, and analytics
              </p>
            </div>
            
            {/* Demo Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              {[
                { id: 'full', label: 'Full View', icon: FileText },
                { id: 'compact', label: 'Compact', icon: Target },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setDemoMode(id as DemoMode)}
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    demoMode === id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="bg-slate-900/50 border-b border-slate-700/50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span>200 Templates</span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Authoring</span>
          </div>
          <div className="flex items-center gap-2 text-purple-400">
            <Target className="w-4 h-4" />
            <span>ICH/FDA/EMA Guidance</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <TrendingUp className="w-4 h-4" />
            <span>+33% vs Certara</span>
          </div>
          <div className="flex items-center gap-2 text-cyan-400">
            <Clock className="w-4 h-4" />
            <span>Hours Estimates</span>
          </div>
          <div className="flex-1" />
          {summary && (
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {summary.totalEvents} interactions
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {summary.totalDocumentsCreated} created
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {demoMode === 'compact' ? (
          /* Compact Mode Demo */
          <div className="grid grid-cols-3 gap-6">
            {/* Compact Browser */}
            <div className="col-span-2 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
              <div className="h-[600px]">
                <TemplateBrowser
                  compact
                  onSelectTemplate={handleSelectTemplate}
                  onCreateDocument={handleCreateDocument}
                />
              </div>
            </div>
            
            {/* Usage Panel */}
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Compact Mode
                </h3>
                <p className="text-slate-400 text-sm">
                  Ideal for modal dialogs or side panels where space is limited.
                </p>
                <div className="mt-4 text-xs font-mono bg-slate-800 rounded p-3 text-slate-300">
                  {`<TemplateBrowser compact />`}
                </div>
              </div>
              
              {selectedTemplate && (
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                  <h3 className="text-white font-semibold mb-3">Selected</h3>
                  <div className="text-sm text-slate-300">{selectedTemplate.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{selectedTemplate.ctdModule}</div>
                </div>
              )}
              
              {/* Recent Activity */}
              <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Recent Activity
                </h3>
                <div className="space-y-2 max-h-[200px] overflow-auto">
                  {recentEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="text-xs text-slate-400 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        event.eventType === 'created' ? 'bg-emerald-500' :
                        event.eventType === 'selected' ? 'bg-blue-500' :
                        'bg-slate-600'
                      }`} />
                      <span className="truncate">{event.templateName}</span>
                    </div>
                  ))}
                  {recentEvents.length === 0 && (
                    <div className="text-xs text-slate-500">No activity yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : demoMode === 'analytics' ? (
          /* Analytics Mode Demo */
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">Analytics Dashboard Preview</h2>
              <p className="text-slate-400 text-sm mt-1">
                Click &quot;Analytics&quot; view mode in the browser below to see the full dashboard
              </p>
            </div>
            <div className="h-[calc(100vh-300px)]">
              <TemplateBrowser
                onSelectTemplate={handleSelectTemplate}
                onCreateDocument={handleCreateDocument}
              />
            </div>
          </div>
        ) : (
          /* Full View Mode */
          <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
            <div className="h-[calc(100vh-280px)]">
              <TemplateBrowser
                onSelectTemplate={handleSelectTemplate}
                onCreateDocument={handleCreateDocument}
              />
            </div>
          </div>
        )}

        {/* Integration Example */}
        <div className="mt-8 bg-slate-900 rounded-lg border border-slate-700 p-6">
          <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-400" />
            Integration Guide
          </h2>
          
          <div className="grid grid-cols-3 gap-6">
            {/* Basic Usage */}
            <div>
              <h3 className="text-slate-300 font-medium mb-2">Basic Usage</h3>
              <pre className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto">
{`import { TemplateBrowser } 
  from '@/components/templates/TemplateBrowser';

// Basic usage
<TemplateBrowser />

// With handlers
<TemplateBrowser
  onSelectTemplate={(t) => preview(t)}
  onCreateDocument={(t) => create(t)}
/>`}
              </pre>
            </div>

            {/* With Tracking */}
            <div>
              <h3 className="text-slate-300 font-medium mb-2">With Usage Tracking</h3>
              <pre className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto">
{`import { useTemplateUsageTracking }
  from '@/hooks/useTemplateUsageTracking';

const { 
  trackViewed, 
  trackCreated,
  summary 
} = useTemplateUsageTracking();

// Track events
trackViewed(template);
trackCreated(template, { 
  programId: 'NEXAGEN' 
});`}
              </pre>
            </div>

            {/* Modal Integration */}
            <div>
              <h3 className="text-slate-300 font-medium mb-2">Modal Integration</h3>
              <pre className="bg-slate-800 rounded-lg p-4 text-sm text-slate-300 font-mono overflow-x-auto">
{`// In a dialog/modal
<Dialog open={open}>
  <DialogContent>
    <TemplateBrowser 
      compact
      onSelectTemplate={(t) => {
        setSelectedTemplate(t);
        closeModal();
      }}
    />
  </DialogContent>
</Dialog>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Competitive Position */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { vendor: 'Ligature', count: 200, badge: 'Leader', color: 'emerald' },
            { vendor: 'Certara CoAuthor', count: 150, badge: '+33%', color: 'blue' },
            { vendor: 'Celegence Dosscriber', count: 100, badge: '+100%', color: 'blue' },
            { vendor: 'Accenture StartingPoint', count: 650, badge: 'Phase 3 Target', color: 'amber' },
          ].map(({ vendor, count, badge, color }) => (
            <div key={vendor} className="bg-slate-900 rounded-lg border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{vendor}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' :
                  color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {badge}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-slate-500">templates</div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedTemplate.name}</h2>
                <div className="flex items-center gap-3 mt-2">
                  {selectedTemplate.ctdModule && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      {selectedTemplate.ctdModule}
                    </span>
                  )}
                  {selectedTemplate.ichGuideline && (
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                      {selectedTemplate.ichGuideline}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[50vh]">
              <p className="text-slate-300 mb-4">{selectedTemplate.description}</p>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedTemplate.sections.length}</div>
                  <div className="text-xs text-slate-400">Sections</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedTemplate.estimatedHours}h</div>
                  <div className="text-xs text-slate-400">Est. Hours</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{selectedTemplate.applicableRegions.length}</div>
                  <div className="text-xs text-slate-400">Regions</div>
                </div>
              </div>
              
              <h3 className="text-white font-semibold mb-3">Sections</h3>
              <div className="space-y-2 max-h-[200px] overflow-auto">
                {selectedTemplate.sections.map((section, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 font-mono text-xs">{section.number}</span>
                    <span className="text-slate-300">{section.title}</span>
                    {section.aiPrompt && (
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    )}
                    {section.required && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">REQ</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  handleCreateDocument(selectedTemplate);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Create Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Confirmation Modal */}
      {showCreateConfirm && selectedTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Create Document</h2>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 mb-4">
                Create a new document using this template?
              </p>
              
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="font-semibold text-white">{selectedTemplate.name}</div>
                <div className="text-sm text-slate-400 mt-1">{selectedTemplate.description}</div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateConfirm(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreate}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Create Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
