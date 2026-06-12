

/**
 * NonclinicalSummaryGenerator - v0.32.0
 * 
 * AI-powered generation of CTD Module 2.4 (Nonclinical Overview) and
 * Module 2.6 (Nonclinical Written Summaries) documents.
 */

import { useState } from 'react';
import { Sparkles, Beaker, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AIDocumentGeneratorPanel, DocumentGenerationType } from '@/components/ai/AIDocumentGeneratorPanel';

interface StudySummary {
  id: string;
  studyNumber: string;
  title: string;
  species: string;
  duration: string;
  findings: string;
  noael?: string;
  route: string;
}

interface NonclinicalSummaryGeneratorProps {
  productName: string;
  indication: string;
  studies: StudySummary[];
  onDocumentGenerated?: (content: string, documentType: DocumentGenerationType) => void;
}

export function NonclinicalSummaryGenerator({ 
  productName, 
  indication, 
  studies,
  onDocumentGenerated 
}: NonclinicalSummaryGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'tox-summary' | 'nonclinical-overview'>('tox-summary');

  const documentTypes = [
    {
      id: 'tox-summary' as const,
      label: 'Module 2.6 Written Summaries',
      description: 'Pharmacology, PK, and Toxicology written summaries',
      icon: Beaker,
      color: 'green',
    },
    {
      id: 'nonclinical-overview' as const,
      label: 'Module 2.4 Nonclinical Overview',
      description: 'Integrated overview of nonclinical findings',
      icon: FileText,
      color: 'emerald',
    },
  ];

  return (
    <>
      <div className="p-5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-green-500/20">
            <Sparkles className="w-6 h-6 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-1">
              Generate Nonclinical Document
            </h3>
            <p className="text-sm text-text-muted mb-4">
              AI-powered generation of CTD nonclinical summaries based on {studies.length} studies
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {documentTypes.map((docType) => (
                <button
                  key={docType.id}
                  onClick={() => setSelectedDocType(docType.id)}
                  className={`
                    p-3 rounded-lg border text-left transition-all
                    ${selectedDocType === docType.id 
                      ? 'bg-green-500/20 border-green-500/50' 
                      : 'bg-surface border-border hover:border-green-500/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <docType.icon className={`w-4 h-4 ${selectedDocType === docType.id ? 'text-green-400' : 'text-text-muted'}`} />
                    <span className={`text-sm font-medium ${selectedDocType === docType.id ? 'text-green-400' : 'text-text-primary'}`}>
                      {docType.label}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{docType.description}</p>
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={() => setShowGenerator(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate {selectedDocType === 'tox-summary' ? 'Module 2.6' : 'Module 2.4'}
            </Button>
          </div>
        </div>
      </div>

      <AIDocumentGeneratorPanel
        isOpen={showGenerator}
        context={{
          documentType: selectedDocType,
          title: selectedDocType === 'tox-summary' 
            ? `${productName} - Nonclinical Written Summaries (Module 2.6)`
            : `${productName} - Nonclinical Overview (Module 2.4)`,
          productName,
          indication,
          contextData: {
            productName,
            indication,
            studyCount: studies.length,
            studies: studies.map(s => ({
              studyNumber: s.studyNumber,
              title: s.title,
              species: s.species,
              duration: s.duration,
              route: s.route,
              findings: s.findings,
              noael: s.noael,
            })),
            pharmacologyStudies: studies.filter(s => s.title.toLowerCase().includes('pharmacology')),
            toxicologyStudies: studies.filter(s => 
              s.title.toLowerCase().includes('toxicity') || 
              s.title.toLowerCase().includes('toxicology')
            ),
            pkStudies: studies.filter(s => 
              s.title.toLowerCase().includes('pharmacokinetic') || 
              s.title.toLowerCase().includes('adme')
            ),
          },
        }}
        onAccept={(content) => {
          onDocumentGenerated?.(content, selectedDocType);
          setShowGenerator(false);
        }}
        onClose={() => setShowGenerator(false)}
      />
    </>
  );
}

export default NonclinicalSummaryGenerator;
