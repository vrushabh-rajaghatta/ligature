

/**
 * CMCNarrativeGenerator - v0.32.0
 * 
 * AI-powered generation of CTD Module 2.3 (Quality Overall Summary) and
 * Module 3 (Quality) section narratives.
 */

import { useState } from 'react';
import { Sparkles, FlaskConical, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AIDocumentGeneratorPanel, DocumentGenerationType } from '@/components/ai/AIDocumentGeneratorPanel';

interface DrugSubstanceData {
  name: string;
  inn?: string;
  casNumber?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  manufacturer?: string;
  route?: string;
}

interface DrugProductData {
  dosageForm: string;
  strength: string;
  routeOfAdministration: string;
  container?: string;
  shelfLife?: string;
}

interface CMCNarrativeGeneratorProps {
  productName: string;
  drugSubstance: DrugSubstanceData;
  drugProduct: DrugProductData;
  onDocumentGenerated?: (content: string, documentType: DocumentGenerationType) => void;
}

export function CMCNarrativeGenerator({ 
  productName, 
  drugSubstance,
  drugProduct,
  onDocumentGenerated 
}: CMCNarrativeGeneratorProps) {
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<'quality-overall' | 'cmc-narrative'>('quality-overall');

  const documentTypes = [
    {
      id: 'quality-overall' as const,
      label: 'Module 2.3 Quality Overall Summary',
      description: 'Integrated QOS with drug substance and product summaries',
      icon: FileText,
      color: 'cyan',
    },
    {
      id: 'cmc-narrative' as const,
      label: 'Module 3 CMC Narrative',
      description: 'Detailed CMC section narrative for drug substance/product',
      icon: FlaskConical,
      color: 'blue',
    },
  ];

  return (
    <>
      <div className="p-5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-cyan-500/20">
            <Sparkles className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-1">
              Generate CMC Document
            </h3>
            <p className="text-sm text-text-muted mb-4">
              AI-powered generation of quality and CMC documentation for {productName}
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {documentTypes.map((docType) => (
                <button
                  key={docType.id}
                  onClick={() => setSelectedDocType(docType.id)}
                  className={`
                    p-3 rounded-lg border text-left transition-all
                    ${selectedDocType === docType.id 
                      ? 'bg-cyan-500/20 border-cyan-500/50' 
                      : 'bg-surface border-border hover:border-cyan-500/30'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <docType.icon className={`w-4 h-4 ${selectedDocType === docType.id ? 'text-cyan-400' : 'text-text-muted'}`} />
                    <span className={`text-sm font-medium ${selectedDocType === docType.id ? 'text-cyan-400' : 'text-text-primary'}`}>
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
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate {selectedDocType === 'quality-overall' ? 'Module 2.3' : 'Module 3 Narrative'}
            </Button>
          </div>
        </div>
      </div>

      <AIDocumentGeneratorPanel
        isOpen={showGenerator}
        context={{
          documentType: selectedDocType,
          title: selectedDocType === 'quality-overall' 
            ? `${productName} - Quality Overall Summary (Module 2.3)`
            : `${productName} - CMC Narrative (Module 3)`,
          productName,
          contextData: {
            productName,
            drugSubstance: {
              name: drugSubstance.name,
              inn: drugSubstance.inn,
              casNumber: drugSubstance.casNumber,
              molecularFormula: drugSubstance.molecularFormula,
              molecularWeight: drugSubstance.molecularWeight,
              manufacturer: drugSubstance.manufacturer,
              route: drugSubstance.route,
            },
            drugProduct: {
              dosageForm: drugProduct.dosageForm,
              strength: drugProduct.strength,
              routeOfAdministration: drugProduct.routeOfAdministration,
              container: drugProduct.container,
              shelfLife: drugProduct.shelfLife,
            },
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

export default CMCNarrativeGenerator;
