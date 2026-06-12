

/**
 * CAPAInvestigationGenerator - v0.32.0
 * 
 * Adds AI-powered investigation report generation to CAPA detail views.
 * Generates root cause analysis, corrective actions, and preventive measures.
 */

import { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AIDocumentGeneratorPanel } from '@/components/ai/AIDocumentGeneratorPanel';
import type { CAPA } from '@/store/qmsTypes';

interface CAPAInvestigationGeneratorProps {
  capa: CAPA;
  onDocumentGenerated?: (content: string) => void;
}

export function CAPAInvestigationGenerator({ capa, onDocumentGenerated }: CAPAInvestigationGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      <div className="p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-text-primary">Generate Investigation Report</h4>
            <p className="text-xs text-text-muted mt-0.5">
              AI-powered root cause analysis and corrective action recommendations
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGenerator(true)}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Generate
          </Button>
        </div>
      </div>

      <AIDocumentGeneratorPanel
        isOpen={showGenerator}
        context={{
          documentType: 'capa-investigation',
          title: `${capa.capaNumber}: ${capa.title}`,
          contextData: {
            capaNumber: capa.capaNumber,
            capaType: capa.capaType,
            title: capa.title,
            description: capa.description,
            source: capa.source,
            severity: capa.severity,
            priority: capa.priority,
            department: capa.department,
            owner: capa.ownerName,
            assignee: capa.assigneeName,
            createdDate: capa.createdAt,
            targetDate: capa.targetCompletionDate,
            regulatoryImpact: capa.regulatoryImpact,
            actionPlan: capa.actionPlan,
          },
        }}
        onAccept={(content) => {
          onDocumentGenerated?.(content);
          setShowGenerator(false);
        }}
        onClose={() => setShowGenerator(false)}
      />
    </>
  );
}

export default CAPAInvestigationGenerator;
