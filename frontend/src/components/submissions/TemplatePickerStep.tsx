// ============================================================================
// TemplatePickerStep — v0.62.0
// LIG-005 COMPLETE: Template type picker for plan creation wizard
// Shows 8-week / 16-week / 40-market options with task count + timeline preview
// ============================================================================


import React from 'react';
import {
  Zap, FileText, Globe, CheckCircle2, ChevronRight,
  Clock, Layers, BookOpen,
} from 'lucide-react';
import { SUBMISSION_TEMPLATES, SubmissionTemplate, TemplateType } from '@/data/global-submission-plan-data';

const TEMPLATE_ICONS: Record<TemplateType, React.ElementType> = {
  '8-week': Zap,
  '16-week': FileText,
  '40-market': Globe,
};

interface TemplatePickerStepProps {
  selectedTemplateId: TemplateType | null;
  onSelect: (templateId: TemplateType) => void;
}

export function TemplatePickerStep({ selectedTemplateId, onSelect }: TemplatePickerStepProps) {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h3 className="text-base font-semibold text-text-primary">Choose a Template</h3>
        <p className="text-sm text-text-muted mt-0.5">
          The template defines the task set, timeline structure, and number of rows provisioned in your plan.
          You can add or inactivate rows after provisioning.
        </p>
      </div>

      <div className="space-y-3">
        {SUBMISSION_TEMPLATES.map(template => {
          const Icon = TEMPLATE_ICONS[template.id];
          const isSelected = selectedTemplateId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-accent-blue bg-accent-blue/8 shadow-sm'
                  : 'border-border bg-surface-card hover:border-border/60 hover:bg-surface'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2.5 rounded-lg flex-shrink-0 ${template.badge}`}>
                  <Icon className={`w-5 h-5 ${template?.color ?? ''}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text-primary">{template.label}</span>
                    {template.isUQ && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold">UQ</span>
                    )}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-accent-blue ml-auto flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-3">{template.description}</p>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{template.typicalTimeline}</span>
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{template.taskCount} tasks provisioned</span>
                    </div>
                    <div className="flex items-center gap-1 text-text-muted">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{template.modules.join(', ')}</span>
                    </div>
                  </div>

                  {/* Suitable for */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.suitable.map(s => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-surface text-text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {!selectedTemplateId && (
        <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          Select a template to continue
        </p>
      )}
    </div>
  );
}

export default TemplatePickerStep;
