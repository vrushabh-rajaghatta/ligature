// =============================================================================
// DEMO STREAMING OVERLAY — v0.42.51
// =============================================================================
// Standalone component that listens for 'demo-ai-generate-section' events from
// the guided scenario system and renders the AuthoringStreamingPanel as a
// full-screen modal. Works from any screen (HAQ, Labeling, Authoring, etc.)
// since it listens at the event store level, not per-screen.
// =============================================================================


import { useState, useEffect } from 'react';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { AuthoringStreamingPanel } from '@/components/authoring/AuthoringStreamingPanel';
import type { DocumentSection, DocumentType } from '@/types/authoring';
import type { SourceDocument } from '@/store/useAuthoringStore';

// =============================================================================
// TYPES
// =============================================================================

interface DemoStreamingConfig {
  documentType: string;
  sectionNumber: string;
  sectionTitle: string;
  productName: string;
  studyName?: string;
  indication?: string;
}

// =============================================================================
// SOURCE DOCUMENT HELPERS
// =============================================================================

function getSourceDocsForType(config: DemoStreamingConfig): SourceDocument[] {
  const baseName = config.studyName || config.productName;

  if (config.documentType === 'haq-response' || config.documentType === 'haq') {
    return [
      {
        id: 'src-demo-safety-db',
        title: `${config.productName} — Integrated Safety Database`,
        type: 'safety-database',
        version: '3.0',
        status: 'linked',
        sections: [
          { id: 'hep-1', number: '14.3.1', title: 'Hepatic Adverse Events' },
          { id: 'lab-1', number: '14.3.2', title: 'Laboratory Abnormalities' },
        ],
      },
      {
        id: 'src-demo-csr',
        title: `${baseName} — Clinical Study Report`,
        type: 'clinical-study-report',
        version: '1.0',
        status: 'linked',
        sections: [
          { id: 'saf-1', number: '12.3', title: 'Hepatotoxicity Analysis' },
          { id: 'pk-1', number: '11.4', title: 'Subgroup Analyses' },
        ],
      },
      {
        id: 'src-demo-ib',
        title: `${config.productName} — Investigator's Brochure`,
        type: 'investigator-brochure',
        version: '8.0',
        status: 'linked',
        sections: [
          { id: 'nc-1', number: '5.3', title: 'Repeat-Dose Toxicology' },
        ],
      },
    ];
  }

  if (config.documentType === 'labeling' || config.sectionNumber.startsWith('5')) {
    return [
      {
        id: 'src-demo-safety-pooled',
        title: `${config.productName} — Pooled Safety Analysis`,
        type: 'safety-database',
        version: '2.0',
        status: 'linked',
        sections: [
          { id: 'pool-1', number: '3.1', title: 'Hepatic Events by SOC/PT' },
          { id: 'pool-2', number: '3.2', title: 'Grade 3-4 Laboratory Abnormalities' },
        ],
      },
      {
        id: 'src-demo-signal',
        title: `${config.productName} — Signal Evaluation Report`,
        type: 'safety-report' as any,
        version: '1.0',
        status: 'linked',
        sections: [
          { id: 'sig-1', number: '4.1', title: 'Hepatotoxicity Signal Summary' },
          { id: 'sig-2', number: '4.2', title: 'Disproportionality Analysis' },
        ],
      },
    ];
  }

  // Default: CSR-style sources
  return [
    {
      id: 'src-demo-csr',
      title: `${baseName} — Clinical Study Report`,
      type: 'clinical-study-report',
      version: '1.0',
      status: 'linked',
      sections: [
        { id: 'eff-1', number: '11.1', title: 'Efficacy Results' },
        { id: 'saf-1', number: '12.1', title: 'Safety Results' },
      ],
    },
  ];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DemoStreamingOverlay() {
  const [config, setConfig] = useState<DemoStreamingConfig | null>(null);
  const [lastProcessedEventId, setLastProcessedEventId] = useState<string | null>(null);
  const events = useCrossModuleEventStore(s => s.events);
  const getEventsByType = useCrossModuleEventStore(s => s.getEventsByType);

  // Listen for demo-ai-generate-section events
  useEffect(() => {
    const demoEvents = getEventsByType('demo-ai-generate-section');
    if (demoEvents.length === 0) return;

    // Get most recent event (stored newest-first)
    const latest = demoEvents[0];

    // Skip if already processed or too old
    if (latest.id === lastProcessedEventId) return;
    const age = Date.now() - new Date(latest.timestamp).getTime();
    if (age > 3000) return;

    // Don't re-trigger if panel is already showing
    if (config) return;

    const payload = latest.payload;
    setConfig({
      documentType: payload.documentType || 'csr',
      sectionNumber: payload.sectionNumber || '11',
      sectionTitle: payload.sectionTitle || 'Efficacy Results',
      productName: payload.productName || 'LIG-2847',
      studyName: payload.studyName,
      indication: payload.indication,
    });
    setLastProcessedEventId(latest.id);
  }, [events, getEventsByType, config, lastProcessedEventId]);

  if (!config) return null;

  const section: DocumentSection = {
    id: `demo-${config.sectionNumber}`,
    number: config.sectionNumber,
    title: config.sectionTitle,
    level: 1,
    status: 'not-started',
    progress: 0,
    contentBlocks: [],
    wordCount: 0,
    comments: [],
    hasUnresolvedComments: false,
    sourceLinks: [],
    tflLinks: [],
    required: true,
  };

  const context = {
    productName: config.productName,
    studyName: config.studyName,
    indication: config.indication,
  };

  const sources = getSourceDocsForType(config);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setConfig(null);
        }
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh]">
        <AuthoringStreamingPanel
          section={section}
          documentType={config.documentType as DocumentType}
          context={context}
          sources={sources}
          onComplete={() => {
            // Keep panel open for viewing until user closes
          }}
          onClose={() => {
            setConfig(null);
          }}
          expanded={true}
        />
      </div>
    </div>
  );
}

export default DemoStreamingOverlay;
