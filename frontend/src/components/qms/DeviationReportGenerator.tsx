

/**
 * DeviationReportGenerator - v0.32.0
 * 
 * Adds AI-powered deviation investigation report generation.
 * Generates impact assessment, root cause, and product disposition recommendations.
 */

import { useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AIDocumentGeneratorPanel } from '@/components/ai/AIDocumentGeneratorPanel';
import type { Deviation } from '@/store/qmsTypes';

interface DeviationReportGeneratorProps {
  deviation: Deviation;
  onDocumentGenerated?: (content: string) => void;
}

export function DeviationReportGenerator({ deviation, onDocumentGenerated }: DeviationReportGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);

  return (
    <>
      <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/20">
            <Sparkles className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-text-primary">Generate Deviation Report</h4>
            <p className="text-xs text-text-muted mt-0.5">
              AI-powered impact assessment and investigation narrative
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
          documentType: 'deviation-report',
          title: `${deviation.deviationNumber}: ${deviation.title}`,
          contextData: {
            deviationNumber: deviation.deviationNumber,
            title: deviation.title,
            description: deviation.description,
            category: deviation.category,
            severity: deviation.severity,
            status: deviation.status,
            department: deviation.department,
            investigator: deviation.ownerName,
            reportedBy: deviation.reportedBy,
            discoveredDate: deviation.discoveryDate,
            reportedDate: deviation.reportedDate,
            rootCause: deviation.investigation?.rootCauseDescription ?? 'Under investigation',
            capaRequired: deviation.investigation?.capaRequired ?? deviation.linkedCAPAs.length > 0,
            productImpact: deviation.productImpact,
            batchNumbers: deviation.affectedBatches,
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

export default DeviationReportGenerator;
