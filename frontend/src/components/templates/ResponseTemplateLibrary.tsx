

import React, { useState } from 'react'
import {
  useResponseTemplates,
  useTemplates,
  useComponents,
  useSelectedTemplate,
  useSelectedComponent,
  useTemplateFilters,
  useLibraryStats,
  type ResponseTemplate,
  type TemplateComponent,
  type TemplateCategory,
  type TemplateSection,
  type TemplateVariable,
  type TemplateSuggestion,
} from '@/store/useResponseTemplates'
import type { HAQDiscipline } from '@/types/haq'

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'library' | 'components' | 'suggestions' | 'instances' | 'analytics'

interface TabConfig {
  id: TabId
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'library', label: 'Template Library', icon: '📚' },
  { id: 'components', label: 'Components', icon: '🧩' },
  { id: 'suggestions', label: 'Suggestions', icon: '💡' },
  { id: 'instances', label: 'My Instances', icon: '📝' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
]

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'data-presentation', label: 'Data Presentation' },
  { value: 'scientific-justification', label: 'Scientific Justification' },
  { value: 'regulatory-reference', label: 'Regulatory Reference' },
  { value: 'risk-assessment', label: 'Risk Assessment' },
  { value: 'process-description', label: 'Process Description' },
  { value: 'statistical-analysis', label: 'Statistical Analysis' },
  { value: 'clinical-rationale', label: 'Clinical Rationale' },
  { value: 'comparability', label: 'Comparability' },
  { value: 'general', label: 'General' },
]

const DISCIPLINES: { value: HAQDiscipline | 'all'; label: string }[] = [
  { value: 'all', label: 'All Disciplines' },
  { value: 'CMC', label: 'CMC' },
  { value: 'Clinical', label: 'Clinical' },
  { value: 'Nonclinical', label: 'Nonclinical' },
  { value: 'Biometrics', label: 'Biometrics' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Pharmacology', label: 'Pharmacology' },
  { value: 'Labeling', label: 'Labeling' },
  { value: 'Administrative', label: 'Administrative' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResponseTemplateLibrary() {
  const [activeTab, setActiveTab] = useState<TabId>('library')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const stats = useLibraryStats()

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Response Template Library
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Reusable response components based on successful patterns
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Templates:</span>
                <span className="font-semibold text-slate-900">{stats.totalTemplates}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Components:</span>
                <span className="font-semibold text-slate-900">{stats.totalComponents}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Success Rate:</span>
                <span className="font-semibold text-emerald-600">{stats.averageSuccessRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'library' && <TemplateLibraryTab />}
        {activeTab === 'components' && <ComponentsTab />}
        {activeTab === 'suggestions' && (
          <SuggestionsTab 
            questionId={selectedQuestionId} 
            onSelectQuestion={setSelectedQuestionId}
          />
        )}
        {activeTab === 'instances' && <InstancesTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  )
}

// ============================================================================
// TEMPLATE LIBRARY TAB
// ============================================================================

function TemplateLibraryTab() {
  const {
    getFilteredTemplates,
    setSearchQuery,
    setFilterCategory,
    setFilterDiscipline,
    selectTemplate,
  } = useResponseTemplates()
  
  const filters = useTemplateFilters()
  const filteredTemplates = getFilteredTemplates()
  const selectedTemplate = useSelectedTemplate()
  
  return (
    <div className="flex gap-6 h-full">
      {/* Left Panel: List */}
      <div className="w-1/2 flex flex-col">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={filters.filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TemplateCategory | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            <select
              value={filters.filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value as HAQDiscipline | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DISCIPLINES.map(disc => (
                <option key={disc.value} value={disc.value}>{disc.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Template List */}
        <div className="flex-1 bg-white rounded-lg border border-slate-200 overflow-auto">
          <div className="divide-y divide-slate-100">
            {filteredTemplates.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No templates match your filters
              </div>
            ) : (
              filteredTemplates.map(template => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplate?.id === template.id}
                  onSelect={() => selectTemplate(template.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Detail */}
      <div className="w-1/2">
        {selectedTemplate ? (
          <TemplateDetailPanel template={selectedTemplate} />
        ) : (
          <EmptyState 
            icon="📚" 
            message="Select a template to view details" 
          />
        )}
      </div>
    </div>
  )
}

function TemplateListItem({ 
  template, 
  isSelected, 
  onSelect 
}: { 
  template: ResponseTemplate
  isSelected: boolean
  onSelect: () => void 
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 cursor-pointer transition-colors ${
        isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-900">{template.name}</h3>
            <StatusBadge status={template.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {template.category.replace('-', ' ')}
            </span>
            {template.disciplines.slice(0, 2).map(d => (
              <span key={d} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                {d}
              </span>
            ))}
            {template.disciplines.length > 2 && (
              <span className="text-xs text-slate-400">
                +{template.disciplines.length - 2} more
              </span>
            )}
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="text-sm font-medium">{template.avgRating.toFixed(1)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {template.successRate}% success
          </div>
          <div className="text-xs text-slate-400">
            {template.usageCount} uses
          </div>
        </div>
      </div>
    </div>
  )
}

function TemplateDetailPanel({ template }: { template: ResponseTemplate }) {
  const [activeSection, setActiveSection] = useState<string | null>(
    template.sections[0]?.id || null
  )
  const { duplicateTemplate } = useResponseTemplates()
  const components = useComponents()
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{template.name}</h2>
            <p className="text-sm text-slate-500 mt-1">{template.description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => duplicateTemplate(template.id)}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Duplicate
            </button>
            <button
              className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Use Template
            </button>
          </div>
        </div>
        
        {/* Meta info */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Est. Time:</span>
            <span className="font-medium">{template.estimatedTimeMinutes} min</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Length:</span>
            <span className="font-medium capitalize">{template.estimatedLength}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Version:</span>
            <span className="font-medium">{template.version}</span>
          </div>
        </div>
        
        {/* Keywords */}
        <div className="flex flex-wrap gap-1 mt-3">
          {template.keywords.slice(0, 8).map(kw => (
            <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {kw}
            </span>
          ))}
        </div>
      </div>
      
      {/* Sections */}
      <div className="flex-1 flex overflow-hidden">
        {/* Section nav */}
        <div className="w-48 bg-slate-50 border-r border-slate-200 p-2 overflow-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
            Sections
          </div>
          {template.sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === section.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {section.required && <span className="text-red-500">*</span>}
                {section.name}
              </div>
            </button>
          ))}
        </div>
        
        {/* Section content */}
        <div className="flex-1 p-4 overflow-auto">
          {template.sections.map(section => (
            activeSection === section.id && (
              <SectionPreview 
                key={section.id} 
                section={section} 
                components={components}
              />
            )
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Created by {template.createdByName} · Updated {new Date(template.updatedAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-emerald-500">✓</span>
              {template.successCount}/{template.usageCount} successful
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionPreview({ 
  section, 
  components 
}: { 
  section: TemplateSection
  components: TemplateComponent[]
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">{section.name}</h3>
        {section.required && (
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
            Required
          </span>
        )}
      </div>
      
      {section.guidanceNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500">💡</span>
            <p className="text-sm text-amber-700">{section.guidanceNotes}</p>
          </div>
        </div>
      )}
      
      {/* Content preview */}
      <div className="bg-slate-50 rounded-lg p-4 mb-4">
        <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
          {section.content || '[Component content will be inserted here]'}
        </pre>
      </div>
      
      {/* Variables */}
      {section.variables.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Variables</h4>
          <div className="space-y-2">
            {section.variables.map(variable => (
              <VariablePreview key={variable.id} variable={variable} />
            ))}
          </div>
        </div>
      )}
      
      {/* Linked components */}
      {section.componentIds.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2">Available Components</h4>
          <div className="space-y-2">
            {section.componentIds.map(compId => {
              const comp = components.find(c => c.id === compId)
              if (!comp) return null
              return (
                <div 
                  key={compId}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
                >
                  <span className="text-lg">🧩</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">{comp.name}</div>
                    <div className="text-xs text-slate-500">{comp.description}</div>
                  </div>
                  <span className="text-xs text-emerald-600">{comp.successRate}% success</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function VariablePreview({ variable }: { variable: TemplateVariable }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-medium">
        {variable.type === 'text' ? 'T' :
         variable.type === 'number' ? '#' :
         variable.type === 'selection' ? '▼' :
         variable.type === 'date' ? '📅' :
         variable.type === 'table-reference' ? '📊' :
         variable.type === 'figure-reference' ? '📈' : '?'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-900">{variable.displayName}</span>
          {variable.required && <span className="text-red-500 text-xs">*</span>}
          <span className="text-xs text-slate-400">{`{{${variable.name}}}`}</span>
        </div>
        {variable.description && (
          <p className="text-xs text-slate-500 mt-1">{variable.description}</p>
        )}
        {variable.options && (
          <div className="flex flex-wrap gap-1 mt-2">
            {variable.options.slice(0, 4).map(opt => (
              <span key={opt} className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                {opt}
              </span>
            ))}
            {variable.options.length > 4 && (
              <span className="text-xs text-slate-400">+{variable.options.length - 4} more</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTS TAB
// ============================================================================

function ComponentsTab() {
  const { getFilteredComponents, setSearchQuery, setFilterCategory, selectComponent } = useResponseTemplates()
  const filters = useTemplateFilters()
  const filteredComponents = getFilteredComponents()
  const selectedComponent = useSelectedComponent()

  return (
    <div className="flex gap-6 h-full">
      {/* Left: Component List */}
      <div className="w-1/2 flex flex-col">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search components..."
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={filters.filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TemplateCategory | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Component Grid */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-3">
            {filteredComponents.map(component => (
              <ComponentCard
                key={component.id}
                component={component}
                isSelected={selectedComponent?.id === component.id}
                onSelect={() => selectComponent(component.id)}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Right: Detail */}
      <div className="w-1/2">
        {selectedComponent ? (
          <ComponentDetailPanel component={selectedComponent} />
        ) : (
          <EmptyState icon="🧩" message="Select a component to view details" />
        )}
      </div>
    </div>
  )
}

function ComponentCard({ 
  component, 
  isSelected, 
  onSelect 
}: { 
  component: TemplateComponent
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-200' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg">
            🧩
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{component.name}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{component.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-emerald-600">{component.successRate}%</div>
          <div className="text-xs text-slate-400">{component.usageCount} uses</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
          {component.category.replace('-', ' ')}
        </span>
        {component.disciplines.slice(0, 2).map(d => (
          <span key={d} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
            {d}
          </span>
        ))}
      </div>
    </div>
  )
}

function ComponentDetailPanel({ component }: { component: TemplateComponent }) {
  const { renderComponent } = useResponseTemplates()
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  
  const preview = renderComponent(component.id, variableValues)
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{component.name}</h2>
        <p className="text-sm text-slate-500 mt-1">{component.description}</p>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {component.tags.map(tag => (
            <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Variables */}
        <div className="w-1/2 border-r border-slate-200 p-4 overflow-auto">
          <h3 className="font-medium text-slate-900 mb-3">Variables</h3>
          <div className="space-y-4">
            {component.variables.map(variable => (
              <div key={variable.id}>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {variable.displayName}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {variable.type === 'selection' ? (
                  <select
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    {variable.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : variable.type === 'number' ? (
                  <input
                    type="number"
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={variable.description}
                  />
                ) : (
                  <input
                    type="text"
                    value={variableValues[variable.name] || ''}
                    onChange={(e) => setVariableValues(prev => ({ ...prev, [variable.name]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={variable.description}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Preview */}
        <div className="w-1/2 p-4 overflow-auto bg-slate-50">
          <h3 className="font-medium text-slate-900 mb-3">Preview</h3>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{preview}</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Copy to Clipboard
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// SUGGESTIONS TAB
// ============================================================================

function SuggestionsTab({ 
  questionId, 
  onSelectQuestion 
}: { 
  questionId: string | null
  onSelectQuestion: (id: string | null) => void
}) {
  const { getSuggestionsForQuestion } = useResponseTemplates()
  const templates = useTemplates()
  const suggestions = questionId ? getSuggestionsForQuestion(questionId) : []
  
  // Mock question IDs for demo
  const mockQuestionIds = ['haq-001', 'haq-002', 'haq-003', 'haq-004', 'haq-005']
  
  return (
    <div className="space-y-6">
      {/* Question selector */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Select a HAQ to get template suggestions
        </label>
        <select
          value={questionId || ''}
          onChange={(e) => onSelectQuestion(e.target.value || null)}
          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select a question...</option>
          {mockQuestionIds.map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>
      
      {/* Suggestions */}
      {questionId && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {suggestions.length} template{suggestions.length !== 1 ? 's' : ''} suggested
          </h3>
          
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-slate-500">No matching templates found for this question</p>
              <p className="text-sm text-slate-400 mt-2">
                Consider creating a new template based on similar successful responses
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map(suggestion => {
                const template = templates.find(t => t.id === suggestion.templateId)
                if (!template) return null
                
                return (
                  <SuggestionCard 
                    key={suggestion.templateId} 
                    suggestion={suggestion} 
                    template={template}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {!questionId && (
        <EmptyState 
          icon="💡" 
          message="Select a question to see template suggestions" 
        />
      )}
    </div>
  )
}

function SuggestionCard({ 
  suggestion, 
  template 
}: { 
  suggestion: TemplateSuggestion
  template: ResponseTemplate
}) {
  const scoreColor = suggestion.matchScore >= 80 ? 'emerald' : suggestion.matchScore >= 60 ? 'amber' : 'slate'
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-semibold text-slate-900">{template.name}</h4>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${scoreColor}-100 text-${scoreColor}-700`}>
              {suggestion.matchScore}% match
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{template.description}</p>
          
          {/* Match reasons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {suggestion.matchReasons.map((reason, i) => (
              <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                <span className="text-emerald-500">✓</span>
                {reason}
              </span>
            ))}
          </div>
          
          {/* Relevant sections */}
          <div className="mt-3">
            <span className="text-xs text-slate-500">Relevant sections: </span>
            <span className="text-xs text-slate-700">
              {suggestion.relevantSections.join(', ')}
            </span>
          </div>
        </div>
        
        <div className="text-right ml-4">
          <div className="text-sm font-medium text-slate-900">
            ~{suggestion.estimatedCompleteness}% coverage
          </div>
          <button className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            Use Template
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// INSTANCES TAB
// ============================================================================

function InstancesTab() {
  const { instances, deleteInstance, applyInstanceToQuestion } = useResponseTemplates()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">My Template Instances</h3>
      </div>
      
      {instances.length === 0 ? (
        <EmptyState 
          icon="📝" 
          message="No template instances yet. Use a template from the library to create one." 
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Template</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Question</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {instances.map(instance => (
                <tr key={instance.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-900">{instance.templateName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{instance.questionId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      instance.status === 'applied' ? 'bg-emerald-100 text-emerald-700' :
                      instance.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {instance.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {new Date(instance.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {instance.status === 'draft' && (
                        <button
                          onClick={() => applyInstanceToQuestion(instance.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Apply
                        </button>
                      )}
                      <button
                        onClick={() => deleteInstance(instance.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ANALYTICS TAB
// ============================================================================

function AnalyticsTab() {
  const stats = useLibraryStats()
  const templates = useTemplates()
  
  return (
    <div className="space-y-6">
      {/* Overview metrics */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Templates"
          value={stats.totalTemplates}
          icon="📚"
        />
        <MetricCard
          label="Active Templates"
          value={stats.activeTemplates}
          icon="✅"
          highlight="success"
        />
        <MetricCard
          label="Total Usage"
          value={stats.totalUsage}
          icon="📊"
        />
        <MetricCard
          label="Avg Success Rate"
          value={`${stats.averageSuccessRate}%`}
          icon="🎯"
          highlight={stats.averageSuccessRate >= 85 ? 'success' : stats.averageSuccessRate >= 70 ? 'warning' : 'danger'}
        />
      </div>
      
      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Templates by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.byCategory)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-slate-600 truncate">
                    {category.replace('-', ' ')}
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(count / stats.totalTemplates) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-sm text-slate-700 text-right">{count}</div>
                </div>
              ))}
          </div>
        </div>
        
        {/* By Discipline */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Templates by Discipline</h3>
          <div className="space-y-3">
            {Object.entries(stats.byDiscipline)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([discipline, count]) => (
                <div key={discipline} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-slate-600">{discipline}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(count / stats.totalTemplates) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-sm text-slate-700 text-right">{count}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
      
      {/* Performance tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">🏆 Top Performing Templates</h3>
          {stats.topPerformers.length === 0 ? (
            <p className="text-sm text-slate-500">Not enough data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topPerformers.map(({ templateId, successRate }) => {
                const template = templates.find(t => t.id === templateId)
                return template ? (
                  <div key={templateId} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-medium text-slate-900">{template.name}</span>
                    <span className="text-sm font-semibold text-emerald-600">{successRate}%</span>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
        
        {/* Needs Improvement */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-4">⚠️ Needs Improvement</h3>
          {stats.underperforming.length === 0 ? (
            <p className="text-sm text-slate-500">All templates performing well!</p>
          ) : (
            <div className="space-y-2">
              {stats.underperforming.map(({ templateId, successRate, usageCount }) => {
                const template = templates.find(t => t.id === templateId)
                return template ? (
                  <div key={templateId} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{template.name}</span>
                      <span className="text-xs text-slate-500 ml-2">({usageCount} uses)</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-600">{successRate}%</span>
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-slate-100 text-slate-700',
    archived: 'bg-gray-100 text-gray-500',
    deprecated: 'bg-red-100 text-red-700',
  }
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  )
}

interface MetricCardProps {
  label: string
  value: string | number
  icon: string
  highlight?: 'success' | 'warning' | 'danger'
}

function MetricCard({ label, value, icon, highlight }: MetricCardProps) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${
      highlight === 'success' ? 'border-emerald-200' :
      highlight === 'warning' ? 'border-amber-200' :
      highlight === 'danger' ? 'border-red-200' : 'border-slate-200'
    }`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-2xl font-bold ${
        highlight === 'success' ? 'text-emerald-600' :
        highlight === 'warning' ? 'text-amber-600' :
        highlight === 'danger' ? 'text-red-600' : 'text-slate-900'
      }`}>
        {value}
      </div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  )
}

function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-slate-200">
      <div className="text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <p className="text-slate-500">{message}</p>
      </div>
    </div>
  )
}
