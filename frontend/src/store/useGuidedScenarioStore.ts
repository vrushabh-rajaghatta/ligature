


import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import { ModuleId, CrossModuleEventType } from './useCrossModuleEventStore';

// ============================================================================
// GUIDED SCENARIOS STORE - v0.15.33
// Pre-built demo paths showcasing cross-module data flow for investor demos
// v166: Added persistence and resume functionality
// v0.15.33: Fixed HAQ workflow to navigate to dedicated HAQ screen
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type ScenarioId =
  | 'preclinical-to-safety'
  | 'safety-to-label'
  | 'authoring-to-submission'
  | 'full-regulatory-cascade'
  | 'haq-response-workflow'
  | 'submission-readiness';

export interface ScenarioStep {
  id: string;
  order: number;
  title: string;
  description: string;
  module: ModuleId | 'portfolio';
  action: 'navigate' | 'highlight' | 'trigger-event' | 'wait' | 'narrate';
  duration: number; // seconds
  
  // For trigger-event action
  eventType?: CrossModuleEventType;
  eventPayload?: Record<string, any>;
  
  // For highlight action
  highlightSelector?: string;
  highlightText?: string;
  
  // For narrate action
  narration?: string;
  narratorVoice?: 'presenter' | 'system';
  
  // Visual indicators
  spotlightElement?: string;
  tooltipContent?: string;
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export interface GuidedScenario {
  id: ScenarioId;
  name: string;
  description: string;
  duration: number; // total seconds
  targetAudience: 'investor' | 'customer' | 'internal';
  steps: ScenarioStep[];
  tags: string[];
  valueProposition: string;
}

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

export const GUIDED_SCENARIOS: Record<ScenarioId, GuidedScenario> = {
  'preclinical-to-safety': {
    id: 'preclinical-to-safety',
    name: 'Preclinical → Safety Cascade',
    description: 'Watch a completed GLP tox study automatically create a safety surveillance case and update IND readiness',
    duration: 180,
    targetAudience: 'investor',
    tags: ['cross-module', 'automation', 'safety', 'preclinical'],
    valueProposition: 'Eliminate manual handoffs between research and safety teams',
    steps: [
      {
        id: 'ps-1',
        order: 1,
        title: 'Research Dashboard',
        description: 'Start in the Research module with preclinical studies',
        module: 'research',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'ps-2',
        order: 2,
        title: 'GLP Study Status',
        description: 'Review ongoing GLP toxicology study for LIG-2847',
        module: 'research',
        action: 'highlight',
        highlightSelector: '[data-study="TOX-2847-003"]',
        highlightText: '26-Week Chronic Toxicity Study',
        duration: 10,
        tooltipContent: 'This GLP study is nearing completion with hepatocellular findings',
        tooltipPosition: 'right',
      },
      {
        id: 'ps-3',
        order: 3,
        title: 'The Data Flow Problem',
        description: 'Traditional systems require manual re-entry of findings',
        module: 'research',
        action: 'narrate',
        narration: 'In traditional systems, completing this study would trigger a manual cascade: emails to safety, re-entry into pharmacovigilance systems, and separate updates to regulatory affairs. Ligature changes this.',
        narratorVoice: 'presenter',
        duration: 15,
      },
      {
        id: 'ps-4',
        order: 4,
        title: 'Complete Study',
        description: 'Mark the study as final with key findings',
        module: 'research',
        action: 'trigger-event',
        eventType: 'preclinical-study-completed',
        eventPayload: {
          studyNumber: 'TOX-2847-003',
          studyType: '26-Week Chronic Toxicity',
          product: 'LIG-2847',
          productId: 'lig-2847',
          findings: 'Hepatocellular hypertrophy at high dose (reversible)',
          glpCompliant: true,
          species: 'Rat (Sprague-Dawley)',
        },
        duration: 5,
        tooltipContent: 'Completing this study triggers an automated cascade',
      },
      {
        id: 'ps-5',
        order: 5,
        title: 'Cross-Module Notification',
        description: 'Watch the platform notify Safety and Regulatory modules',
        module: 'research',
        action: 'highlight',
        highlightSelector: '[data-cascade-indicator]',
        highlightText: 'Cross-module event fired',
        duration: 10,
        spotlightElement: '.cross-module-notification',
      },
      {
        id: 'ps-6',
        order: 6,
        title: 'Navigate to Safety',
        description: 'Follow the data flow to Safety module',
        module: 'safety',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'ps-7',
        order: 7,
        title: 'Safety Case Created',
        description: 'A safety surveillance shell was automatically created',
        module: 'safety',
        action: 'highlight',
        highlightSelector: '[data-auto-created]',
        highlightText: 'Auto-created from preclinical finding',
        duration: 15,
        tooltipContent: 'This case was created automatically with all preclinical context pre-populated',
        tooltipPosition: 'bottom',
      },
      {
        id: 'ps-8',
        order: 8,
        title: 'Pre-populated Context',
        description: 'Study details, findings, and product info are already linked',
        module: 'safety',
        action: 'narrate',
        narration: 'Notice how the safety case already contains the study number, species, findings, and regulatory context. No manual data entry required.',
        narratorVoice: 'presenter',
        duration: 10,
      },
      {
        id: 'ps-9',
        order: 9,
        title: 'Navigate to Regulatory',
        description: 'Check the IND readiness update',
        module: 'regulatory',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'ps-10',
        order: 10,
        title: 'IND Readiness Updated',
        description: 'The Nonclinical section progress automatically increased',
        module: 'regulatory',
        action: 'highlight',
        highlightSelector: '[data-section="4.2.3"]',
        highlightText: 'Toxicology Studies: Updated',
        duration: 15,
        tooltipContent: 'Section 4.2.3 (Toxicology Studies) now shows 90% complete',
      },
      {
        id: 'ps-11',
        order: 11,
        title: 'Value Summary',
        description: 'Quantify the time and error reduction',
        module: 'regulatory',
        action: 'narrate',
        narration: 'This cascade that traditionally takes 2-3 days and involves 4 different teams happened in seconds with zero data re-entry. This is the IDOP advantage.',
        narratorVoice: 'presenter',
        duration: 15,
      },
    ],
  },
  
  'safety-to-label': {
    id: 'safety-to-label',
    name: 'Safety Signal → Label Update',
    description: 'See how a confirmed safety signal triggers labeling review and submission planning',
    duration: 150,
    targetAudience: 'investor',
    tags: ['cross-module', 'safety', 'labeling', 'regulatory'],
    valueProposition: 'Accelerate safety-to-label update cycle from weeks to days',
    steps: [
      {
        id: 'sl-1',
        order: 1,
        title: 'Safety Dashboard',
        description: 'Start in Safety with active signal monitoring',
        module: 'safety',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sl-2',
        order: 2,
        title: 'Hepatotoxicity Signal',
        description: 'Review the confirmed hepatotoxicity signal for LIG-2847',
        module: 'safety',
        action: 'highlight',
        highlightSelector: '[data-signal="hepatotoxicity"]',
        highlightText: 'PRR: 3.19, ROR: 3.82 - Confirmed Signal',
        duration: 10,
        tooltipContent: 'Disproportionality analysis confirms this signal requires action',
      },
      {
        id: 'sl-3',
        order: 3,
        title: 'Confirm Signal Action',
        description: 'Safety physician confirms signal and recommends label update',
        module: 'safety',
        action: 'trigger-event',
        eventType: 'label-change-recommended',
        eventPayload: {
          signalId: 'sig-hepatotoxicity-001',
          signalName: 'Hepatotoxicity',
          product: 'LIG-2847',
          productId: 'lig-2847',
          recommendation: 'Add hepatotoxicity warning to Warnings and Precautions',
          severity: 'major',
          sections: ['5.1', '6.1'],
        },
        duration: 8,
      },
      {
        id: 'sl-4',
        order: 4,
        title: 'Navigate to Labeling',
        description: 'Watch the cascade reach Labeling module',
        module: 'labeling',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sl-5',
        order: 5,
        title: 'Label Revision Initiated',
        description: 'A new label revision was automatically created',
        module: 'labeling',
        action: 'highlight',
        highlightSelector: '[data-revision="auto-created"]',
        highlightText: 'Safety-initiated label revision',
        duration: 12,
        tooltipContent: 'The revision already contains the recommended changes to Sections 5.1 and 6.1',
      },
      {
        id: 'sl-6',
        order: 6,
        title: 'AI Drafts Warning Language',
        description: 'Watch Claude draft the hepatotoxicity warning for Section 5.1',
        module: 'labeling',
        action: 'trigger-event',
        eventType: 'demo-ai-generate-section',
        eventPayload: {
          documentType: 'labeling',
          sectionNumber: '5.1',
          sectionTitle: 'Hepatotoxicity Warning',
          productName: 'LIG-2847',
          indication: 'NSCLC',
        },
        duration: 25,
        tooltipContent: 'AI drafts warning language based on signal data and similar class labels',
      },
      {
        id: 'sl-6b',
        order: 6.5,
        title: 'The AI Advantage',
        description: 'Draft warning language in seconds, not days',
        module: 'labeling',
        action: 'narrate',
        narration: 'That draft warning language was generated from the signal data, incidence rates, and dose modification algorithms. Medical writing refines rather than starts from scratch — saving days of work.',
        narratorVoice: 'presenter',
        duration: 10,
      },
      {
        id: 'sl-7',
        order: 7,
        title: 'Navigate to Submissions',
        description: 'Check submission planning',
        module: 'submissions',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sl-8',
        order: 8,
        title: 'Supplement Queued',
        description: 'A CBE-30 supplement has been added to the planning queue',
        module: 'submissions',
        action: 'highlight',
        highlightSelector: '[data-supplement-queue]',
        highlightText: 'CBE-30: Safety Label Update',
        duration: 12,
        tooltipContent: 'The supplement is linked to the signal, label revision, and recommended filing date',
      },
      {
        id: 'sl-9',
        order: 9,
        title: 'Value Summary',
        description: 'The end-to-end flow that traditionally takes weeks',
        module: 'submissions',
        action: 'narrate',
        narration: 'From signal confirmation to submission planning in one connected flow. Traditional processes involve multiple systems, email chains, and manual coordination. Ligature makes it seamless.',
        narratorVoice: 'presenter',
        duration: 15,
      },
    ],
  },
  
  'authoring-to-submission': {
    id: 'authoring-to-submission',
    name: 'Document → eCTD Ready',
    description: 'Watch a finalized CSR flow directly into the eCTD workspace',
    duration: 120,
    targetAudience: 'investor',
    tags: ['cross-module', 'authoring', 'submissions', 'ectd'],
    valueProposition: 'Document finalization to submission-ready in real-time',
    steps: [
      {
        id: 'as-1',
        order: 1,
        title: 'Document Authoring',
        description: 'Start in Authoring with the APEX-LUNG CSR',
        module: 'authoring',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'as-2',
        order: 2,
        title: 'CSR Final Review',
        description: 'The Clinical Study Report is ready for finalization',
        module: 'authoring',
        action: 'highlight',
        highlightSelector: '[data-document="csr-apex-lung"]',
        highlightText: 'CSR LIG-2847-301 (APEX-LUNG)',
        duration: 10,
        tooltipContent: 'All sections approved, QC complete, ready for finalization',
      },
      {
        id: 'as-2a',
        order: 2.5,
        title: 'AI Section Generation',
        description: 'Watch Claude draft a CSR section in real-time',
        module: 'authoring',
        action: 'narrate',
        narration: 'Let me show you how the AI works. Watch Claude generate a clinical efficacy section in real-time — following ICH E3 structure, AMA style, with source citations.',
        narratorVoice: 'presenter',
        duration: 8,
      },
      {
        id: 'as-2b',
        order: 2.6,
        title: 'Watch Claude Write',
        description: 'AI generates Section 11 Efficacy Results with streaming display',
        module: 'authoring',
        action: 'trigger-event',
        eventType: 'demo-ai-generate-section',
        eventPayload: {
          documentType: 'csr',
          sectionNumber: '11',
          sectionTitle: 'Efficacy Results',
          productName: 'LIG-2847',
          studyName: 'LIG-2847-301 (APEX-LUNG)',
          indication: 'NSCLC',
        },
        duration: 25,
        tooltipContent: 'Real Claude API streaming — or demo fallback if API unavailable',
      },
      {
        id: 'as-2c',
        order: 2.7,
        title: 'The AI Difference',
        description: 'Quantify the authoring acceleration',
        module: 'authoring',
        action: 'narrate',
        narration: 'That section would take a medical writer 4-6 hours to draft manually. Claude did it in 30 seconds with proper ICH structure, AMA formatting, and source citations. Now multiply that across 50+ sections in a CSR.',
        narratorVoice: 'presenter',
        duration: 12,
      },
      {
        id: 'as-3',
        order: 3,
        title: 'Finalize Document',
        description: 'Mark the CSR as finalized',
        module: 'authoring',
        action: 'trigger-event',
        eventType: 'csr-completed',
        eventPayload: {
          documentId: 'doc-csr-apex-lung',
          documentType: 'csr',
          title: 'Clinical Study Report: LIG-2847-301 (APEX-LUNG)',
          product: 'LIG-2847',
          productId: 'lig-2847',
          ctdSection: '5.3.5.1',
          version: '1.0',
          effectiveDate: new Date().toISOString(),
        },
        duration: 5,
      },
      {
        id: 'as-4',
        order: 4,
        title: 'Navigate to eCTD Workspace',
        description: 'Follow the document to Submissions',
        module: 'submissions',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'as-5',
        order: 5,
        title: 'Document Auto-Linked',
        description: 'The CSR appears in Module 5 ready for assignment',
        module: 'submissions',
        action: 'highlight',
        highlightSelector: '[data-section="5.3.5.1"]',
        highlightText: 'Module 5.3.5.1: Reports of Controlled Clinical Studies',
        duration: 12,
        tooltipContent: 'The finalized CSR is now available for eCTD build assignment',
      },
      {
        id: 'as-6',
        order: 6,
        title: 'Submission Readiness Updated',
        description: 'Readiness tracker reflects the completed document',
        module: 'submissions',
        action: 'highlight',
        highlightSelector: '[data-readiness-indicator]',
        highlightText: 'Module 5 readiness: 98%',
        duration: 10,
      },
      {
        id: 'as-7',
        order: 7,
        title: 'Value Summary',
        description: 'Zero manual file transfer or re-entry',
        module: 'submissions',
        action: 'narrate',
        narration: 'The document flows from authoring to submission workspace with full traceability, version control, and CTD mapping. No SharePoint shuffling, no manual uploads.',
        narratorVoice: 'presenter',
        duration: 12,
      },
    ],
  },
  
  'full-regulatory-cascade': {
    id: 'full-regulatory-cascade',
    name: 'Full Regulatory Cascade',
    description: 'End-to-end: A single GLP finding cascades through 7 modules in seconds — what used to take 6 weeks, fully automated',
    duration: 300,
    targetAudience: 'investor',
    tags: ['cross-module', 'comprehensive', 'flagship'],
    valueProposition: 'See the complete IDOP vision: one event, seven modules, zero manual handoffs',
    steps: [
      // ── ACT 1: The Setup ───────────────────────────────────────────────────
      {
        id: 'frc-1',
        order: 1,
        title: 'Portfolio Command Center',
        description: 'Start with a bird\'s-eye view of the Ligature platform',
        module: 'portfolio',
        action: 'navigate',
        narration: "This is the Portfolio Command Center — your single source of truth across the entire R&D lifecycle. Every module is connected. Right now, LIG-2847 is in Phase 2. Let me show you what connected R&D actually looks like.",
        narratorVoice: 'presenter',
        duration: 12,
        tooltipContent: 'All 17+ modules connected — research through commercial launch',
      },
      {
        id: 'frc-2',
        order: 2,
        title: 'The Problem We Solve',
        description: 'Traditional pharma: 6 modules, 6 separate systems, 6 weeks of handoffs',
        module: 'portfolio',
        action: 'narrate',
        narration: "In traditional pharma, a single GLP toxicology finding creates a cascade of manual work: a safety officer re-keys data into the safety database, a medical writer picks up the phone to update the clinical team, a regulatory affairs specialist manually updates the IND — each handoff taking days. We're about to eliminate all of that.",
        narratorVoice: 'presenter',
        duration: 15,
      },
      // ── ACT 2: The Trigger ─────────────────────────────────────────────────
      {
        id: 'frc-3',
        order: 3,
        title: 'Nonclinical Studies',
        description: 'Navigate to the GLP toxicology study in progress',
        module: 'nonclinical',
        action: 'navigate',
        narration: "We're in Nonclinical. LIG-2847's 13-week rat tox study just completed. The pathologist has finalized their read. In any other system, someone would now spend the next hour extracting findings and sending emails.",
        narratorVoice: 'presenter',
        duration: 10,
        tooltipContent: 'GLP 13-week study: LIG-2847 (Ligrastinib) | Pathology finalized',
      },
      {
        id: 'frc-4',
        order: 4,
        title: 'Study Finalization Event',
        description: 'Finalize the GLP study — this is the trigger event',
        module: 'nonclinical',
        action: 'trigger-event',
        eventType: 'demo-glp-cascade',
        eventPayload: {
          studyId: 'GLP-2847-13WK',
          studyName: '13-Week Rat Toxicology Study',
          compound: 'LIG-2847 (Ligrastinib)',
          keyFindings: ['Hepatotoxicity signal: Grade 2, reversible', 'NOAEL: 50 mg/kg/day', 'MTD: 200 mg/kg/day'],
          severity: 'moderate',
        },
        narration: "Watch what happens when I finalize this study. This is the moment everything changes.",
        narratorVoice: 'presenter',
        duration: 8,
        highlightText: 'Finalizing GLP Study — cascade initiating...',
      },
      // ── ACT 3: The Cascade ─────────────────────────────────────────────────
      {
        id: 'frc-5',
        order: 5,
        title: 'Cross-Module Cascade',
        description: 'Watch 6 automated actions fire across 6 modules simultaneously',
        module: 'portfolio',
        action: 'narrate',
        narration: "In the time it takes me to say this sentence, Ligature has: created a safety surveillance case in Pharmacovigilance, flagged the IND in Regulatory Affairs, queued a protocol amendment in CTMS, updated the CMC risk register, and opened a document authoring task for the CSR. Six actions. Zero emails. Zero re-keying.",
        narratorVoice: 'presenter',
        duration: 18,
        tooltipContent: '6 automated actions across 6 modules — triggered in < 2 seconds',
      },
      // ── ACT 4: Safety ─────────────────────────────────────────────────────
      {
        id: 'frc-6',
        order: 6,
        title: 'Safety & Pharmacovigilance',
        description: 'The hepatotoxicity signal is already in Safety — pre-populated',
        module: 'safety',
        action: 'navigate',
        narration: "We're in the Safety module now. The hepatotoxicity signal was auto-created with the study findings pre-populated. The safety physician doesn't start from a blank form — they start from a complete signal report with source data linked.",
        narratorVoice: 'presenter',
        duration: 12,
        tooltipContent: 'Signal auto-created: GLP hepatotoxicity → PV surveillance case SC-2847-001',
        highlightSelector: '[data-signal="hepato-2847"]',
        highlightText: 'New signal: Hepatotoxicity — GLP source data linked',
      },
      {
        id: 'frc-7',
        order: 7,
        title: 'AI Drafts Safety Narrative',
        description: 'Claude synthesizes the GLP findings into a complete clinical narrative',
        module: 'safety',
        action: 'trigger-event',
        eventType: 'demo-ai-generate-section',
        eventPayload: {
          documentType: 'safety-narrative',
          section: 'hepatotoxicity-characterization',
          compound: 'LIG-2847',
        },
        narration: "Now watch this. I'm going to ask Ligature to draft the safety narrative section. It pulls GLP findings, prior human tox data, and the proposed monitoring plan — and generates a complete ICH E2F-compliant narrative in real time.",
        narratorVoice: 'presenter',
        duration: 15,
        tooltipContent: 'AI drafting safety narrative from GLP data + prior art',
      },
      // ── ACT 5: Regulatory ──────────────────────────────────────────────────
      {
        id: 'frc-8',
        order: 8,
        title: 'Regulatory Affairs — IND Update',
        description: 'The IND readiness tracker has already flagged the safety update needed',
        module: 'regulatory',
        action: 'navigate',
        narration: "Regulatory Affairs. The IND readiness dashboard has already surfaced this as a required update. The regulatory specialist sees a pre-drafted IND amendment request, linked to the exact GLP study sections that need to be referenced. Their job is review, not re-creation.",
        narratorVoice: 'presenter',
        duration: 12,
        tooltipContent: 'IND nonclinical section flagged for update — amendment request pre-drafted',
      },
      // ── ACT 6: Authoring ──────────────────────────────────────────────────
      {
        id: 'frc-9',
        order: 9,
        title: 'Document Authoring',
        description: 'CSR Section 12.2 nonclinical summary — AI drafts from structured data',
        module: 'authoring',
        action: 'navigate',
        narration: "Document Authoring. Section 12.2 of the Clinical Study Report — the Nonclinical Summary — has been queued for AI generation. The writer doesn't start from scratch. They start from a structured draft that pulled directly from the GLP study database.",
        narratorVoice: 'presenter',
        duration: 12,
        tooltipContent: 'CSR Section 12.2 queued — AI draft ready for review',
        highlightText: 'CSR 12.2: Nonclinical Summary — AI draft available',
      },
      // ── ACT 7: HAQ ────────────────────────────────────────────────────────
      {
        id: 'frc-10',
        order: 10,
        title: 'HAQ Intelligence',
        description: 'Proactive: predict the FDA question this finding will generate',
        module: 'haq',
        action: 'navigate',
        narration: "Here's something no other platform does. HAQ Intelligence has analyzed this hepatotoxicity finding against 847 prior FDA interactions and is predicting the question FDA will ask — before we've even submitted. It's already drafted a response. That's not reactive, that's proactive regulatory strategy.",
        narratorVoice: 'presenter',
        duration: 15,
        tooltipContent: 'Predicted FDA question: hepatotoxicity monitoring commitment — response pre-drafted',
        highlightText: 'Predicted HAQ: Hepatotoxicity monitoring — 94% confidence',
      },
      // ── ACT 8: CTMS ───────────────────────────────────────────────────────
      {
        id: 'frc-11',
        order: 11,
        title: 'CTMS — Protocol Amendment',
        description: 'Phase 2 protocol amendment flagged for hepatic monitoring enhancement',
        module: 'ctms',
        action: 'navigate',
        narration: "Back in CTMS — the clinical team has a protocol amendment flagged. The monitoring frequency for hepatic enzymes needs to increase based on the GLP signal. The amendment shell is pre-populated with the rationale pulled directly from the tox study. What used to be a 3-week back-and-forth between medical writing and clinical operations is now a 30-minute review task.",
        narratorVoice: 'presenter',
        duration: 14,
        tooltipContent: 'Protocol amendment: Enhanced hepatic monitoring — LIG2847-P2-AMD-003',
      },
      // ── ACT 9: The Punchline ───────────────────────────────────────────────
      {
        id: 'frc-12',
        order: 12,
        title: 'R&D Connected — The Cascade View',
        description: 'Return to portfolio — see the complete cascade chain in real time',
        module: 'portfolio',
        action: 'navigate',
        narration: "Back to the portfolio view. Look at this cascade chain. One GLP study finalization triggered six coordinated actions across safety, regulatory, authoring, HAQ, and clinical operations. In traditional pharma, this takes 4 to 6 weeks of emails, meetings, and manual re-entry. We just watched it happen in under 3 minutes of demo time.",
        narratorVoice: 'presenter',
        duration: 18,
        tooltipContent: '6 completed cascade steps — from GLP finalization to protocol amendment',
      },
      {
        id: 'frc-13',
        order: 13,
        title: 'Traceability — The Audit Thread',
        description: 'Every document, every change — traceable to the source event',
        module: 'archives',
        action: 'narrate',
        narration: "And here's what makes this defensible to the FDA. Every action in that cascade is traceable. The safety narrative cites the GLP study. The IND amendment cites the safety narrative. The protocol amendment cites the IND. An inspector can trace any document back to the source data in one click. That's 21 CFR Part 11 compliance built into the architecture.",
        narratorVoice: 'presenter',
        duration: 15,
        tooltipContent: 'Full audit trail: GLP study → Safety signal → IND amendment → Protocol amendment',
      },
      {
        id: 'frc-14',
        order: 14,
        title: 'The IDOP Thesis',
        description: 'This is the operating system for life sciences R&D',
        module: 'portfolio',
        action: 'narrate',
        narration: "This is Ligature. Not a document management system. Not a regulatory affairs point solution. An Intelligent Development & Operations Platform — the operating system for life sciences R&D. One platform. Every module. Real-time intelligence. And we're replacing six separate vendor contracts in the process.",
        narratorVoice: 'presenter',
        duration: 20,
      },
    ],
  },
  
  'haq-response-workflow': {
    id: 'haq-response-workflow',
    name: 'HAQ Response Intelligence',
    description: 'AI-assisted response to FDA Day 74 questions with automatic submission linking',
    duration: 150,
    targetAudience: 'investor',
    tags: ['cross-module', 'ai', 'haq', 'submissions'],
    valueProposition: 'Reduce HAQ response time from weeks to days',
    steps: [
      {
        id: 'haq-1',
        order: 1,
        title: 'HAQ Dashboard',
        description: 'View pending FDA Day 74 questions',
        module: 'haq',  // v0.15.33: Changed from 'regulatory' to 'haq' for dedicated HAQ screen
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'haq-2',
        order: 2,
        title: 'Hepatotoxicity Question',
        description: 'FDA requests additional hepatotoxicity data and analysis',
        module: 'haq',  // v0.15.33: Changed from 'regulatory'
        action: 'highlight',
        highlightSelector: '[data-haq="day74-hepato"]',
        highlightText: 'IR Question 3: Hepatotoxicity Characterization',
        duration: 10,
        tooltipContent: 'FDA requests detailed hepatotoxicity analysis with updated safety data',
      },
      {
        id: 'haq-3',
        order: 3,
        title: 'AI Analyzes the Question',
        description: 'Claude pulls data from across the platform to draft a response',
        module: 'haq',
        action: 'narrate',
        narration: 'Watch Ligature pull hepatotoxicity data from safety surveillance, clinical studies, and preclinical reports — then draft a complete IR response with citations.',
        narratorVoice: 'presenter',
        duration: 8,
      },
      {
        id: 'haq-3b',
        order: 3.5,
        title: 'Watch Claude Draft the Response',
        description: 'AI generates the IR response with streaming display',
        module: 'haq',
        action: 'trigger-event',
        eventType: 'demo-ai-generate-section',
        eventPayload: {
          documentType: 'haq-response',
          sectionNumber: '3',
          sectionTitle: 'Response to IR Question 3: Hepatotoxicity Characterization',
          productName: 'LIG-2847',
          studyName: 'LIG-2847-301 (APEX-LUNG)',
          indication: 'NSCLC',
        },
        duration: 25,
        tooltipContent: 'Real Claude API streaming — or demo fallback if API unavailable',
      },
      {
        id: 'haq-4',
        order: 4,
        title: 'Cross-Referenced Data',
        description: 'The response cites data from across the platform',
        module: 'haq',  // v0.15.33: Changed from 'regulatory'
        action: 'highlight',
        highlightSelector: '[data-citations]',
        highlightText: '12 cross-references from 4 modules',
        duration: 12,
      },
      {
        id: 'haq-5',
        order: 5,
        title: 'Finalize Response',
        description: 'Medical team approves the response',
        module: 'haq',  // v0.15.33: Changed from 'regulatory'
        action: 'trigger-event',
        eventType: 'document-finalized',
        eventPayload: {
          documentId: 'haq-response-day74-hepato',
          documentType: 'haq-response',
          title: 'Response to IR Question 3: Hepatotoxicity',
          product: 'LIG-2847',
          ctdSection: '1.12.1',
        },
        duration: 5,
      },
      {
        id: 'haq-6',
        order: 6,
        title: 'Navigate to Submissions',
        description: 'Check eCTD sequence build',
        module: 'submissions',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'haq-7',
        order: 7,
        title: 'Response Linked to Sequence',
        description: 'The response is ready for the IR response sequence',
        module: 'submissions',
        action: 'highlight',
        highlightSelector: '[data-sequence="0001"]',
        highlightText: 'Sequence 0001: IR Response',
        duration: 12,
        tooltipContent: 'The HAQ response is linked to Module 1.12.1 in the IR response sequence',
      },
      {
        id: 'haq-8',
        order: 8,
        title: 'Value Summary',
        description: 'From question to submission-ready in one platform',
        module: 'submissions',
        action: 'narrate',
        narration: 'Traditional HAQ responses require gathering data from multiple systems, manual document creation, and separate submission building. Ligature connects it all.',
        narratorVoice: 'presenter',
        duration: 15,
      },
    ],
  },

  // ============================================================================
  // SUBMISSION READINESS — v0.43.3
  // The "why Ligature replaces Veeva" scenario: data-centric R&D Connected
  // ============================================================================
  'submission-readiness': {
    id: 'submission-readiness',
    name: 'Data-Centric Submission Readiness',
    description: 'See how stability, biostatistics, and labeling data flows continuously into eCTD modules — zero manual handoffs, zero document re-work',
    duration: 200,
    targetAudience: 'investor',
    tags: ['cross-module', 'submissions', 'data-centric', 'bridges', 'ectd'],
    valueProposition: 'Replace 6-week document assembly with continuous data-driven submission readiness',
    steps: [
      {
        id: 'sr-1',
        order: 1,
        title: 'Portfolio Command Center',
        description: 'Start at the executive view — LIG-2847 is approaching NDA submission',
        module: 'portfolio',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-2',
        order: 2,
        title: 'NDA Timeline Pressure',
        description: 'LIG-2847 NSCLC program — NDA target is 14 weeks out',
        module: 'portfolio',
        action: 'highlight',
        highlightSelector: '[data-product="lig-2847"]',
        highlightText: 'LIG-2847 (APEX-LUNG) — NDA Submission',
        duration: 10,
        tooltipContent: 'Phase III complete, pivotal data in hand. The question: is the submission package ready?',
        tooltipPosition: 'right',
      },
      {
        id: 'sr-3',
        order: 3,
        title: 'The Document Assembly Problem',
        description: 'Why traditional submission readiness takes 6+ weeks',
        module: 'portfolio',
        action: 'narrate',
        narration: 'In a traditional pharma company, assembling an NDA submission package means manually collecting stability reports, statistical outputs, labeling drafts, and CMC data from 4-5 different systems — then reformatting everything for eCTD. That process takes 6-8 weeks and is the #1 cause of submission delays. Ligature eliminates it entirely.',
        narratorVoice: 'presenter',
        duration: 18,
      },
      {
        id: 'sr-4',
        order: 4,
        title: 'Stability Studies → Module 3.2.P.8',
        description: 'ICH Q1 stability data auto-maps to eCTD Quality sections',
        module: 'stability',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-5',
        order: 5,
        title: 'Live Stability Data',
        description: 'Real-time ICH Q1A/Q1B study tracking with eCTD mapping',
        module: 'stability',
        action: 'highlight',
        highlightSelector: '[data-bridge="stability"]',
        highlightText: '8 stability study types → Module 3.2.P.8.x',
        duration: 12,
        tooltipContent: 'Long-term, accelerated, stress, and photostability studies each map to specific eCTD subsections. Required vs. supporting priority is set automatically per ICH Q1A(R2).',
        tooltipPosition: 'bottom',
      },
      {
        id: 'sr-6',
        order: 6,
        title: 'First Bridge: Stability',
        description: 'Data flows from study completion directly into the submission package',
        module: 'stability',
        action: 'narrate',
        narration: 'Each stability study knows exactly where it belongs in Module 3.2.P.8. When a study passes QC, its data is submission-ready — no reformatting, no manual document assembly. Out-of-spec results automatically gate the submission until resolved.',
        narratorVoice: 'presenter',
        duration: 12,
      },
      {
        id: 'sr-7',
        order: 7,
        title: 'Biostatistics → Module 5',
        description: 'TLFs route directly to Clinical Study Reports',
        module: 'biostats',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-8',
        order: 8,
        title: 'TLF-to-eCTD Mapping',
        description: '18 TLF types mapped to Module 5.3.x subsections',
        module: 'biostats',
        action: 'highlight',
        highlightSelector: '[data-bridge="biostats"]',
        highlightText: 'Tables, Figures, Listings → Module 5.3.x Clinical Study Reports',
        duration: 12,
        tooltipContent: 'Efficacy tables go to 5.3.5.1, safety tables to 5.3.5.3, PK analyses to 5.3.3. Each output is prioritized as critical, supporting, or appendix per ICH E3.',
        tooltipPosition: 'bottom',
      },
      {
        id: 'sr-9',
        order: 9,
        title: 'Second Bridge: Biostatistics',
        description: 'Statistical outputs flow to CSRs with correct prioritization',
        module: 'biostats',
        action: 'narrate',
        narration: 'Once a biostatistician QC-passes a table or figure, it is instantly available for the clinical study report — with the correct eCTD module assignment already in place. ITT, Safety, PK, and PD populations each route to their appropriate sections. No manual copy-paste between SAS outputs and Word documents.',
        narratorVoice: 'presenter',
        duration: 14,
      },
      {
        id: 'sr-10',
        order: 10,
        title: 'Labeling ↔ SPL (Bidirectional)',
        description: 'USPI sections sync with FDA SPL codes in both directions',
        module: 'labeling',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-11',
        order: 11,
        title: 'SPL Synchronization',
        description: '15 USPI section pairs mapped bidirectionally to SPL codes',
        module: 'labeling',
        action: 'highlight',
        highlightSelector: '[data-bridge="spl"]',
        highlightText: 'USPI §1-17 ↔ SPL Codes — Bidirectional Sync',
        duration: 12,
        tooltipContent: 'When a labeling update changes Section 5.1 Warnings, the corresponding SPL XML updates automatically — and vice versa. FDA PLR format compliance is built in.',
        tooltipPosition: 'bottom',
      },
      {
        id: 'sr-12',
        order: 12,
        title: 'Third Bridge: Labeling',
        description: 'Label changes and SPL submissions stay perfectly synchronized',
        module: 'labeling',
        action: 'narrate',
        narration: 'In traditional systems, labeling and SPL are maintained in separate tools by separate teams. Changes in one require manual updates to the other — a process that takes days and is a frequent source of FDA deficiency letters. Ligature keeps them in permanent sync.',
        narratorVoice: 'presenter',
        duration: 12,
      },
      {
        id: 'sr-13',
        order: 13,
        title: 'Submission Readiness Dashboard',
        description: 'All three data bridges converge in the readiness view',
        module: 'ctms',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-14',
        order: 14,
        title: 'Cross-Module Bridge Visualization',
        description: 'Three active bridges, 40+ mappings, zero manual handoffs',
        module: 'ctms',
        action: 'highlight',
        highlightSelector: '[data-bridge-visualization]',
        highlightText: '3 Active Bridges · 40+ Mappings · 3+ ICH/FDA Guidelines · Live',
        duration: 15,
        tooltipContent: 'This is the real-time state of submission readiness. Every data point flows continuously from its source module to its eCTD target — no batch exports, no document assembly sprints.',
        tooltipPosition: 'top',
      },
      {
        id: 'sr-15',
        order: 15,
        title: 'The IDOP Advantage',
        description: 'Why this changes the economics of pharmaceutical development',
        module: 'ctms',
        action: 'narrate',
        narration: 'What you are looking at is continuous submission readiness. Every stability study, every statistical output, every labeling change flows into the correct eCTD module in real time. There is no 6-week document assembly sprint before an NDA filing. There is no data re-entry between systems. The submission package is always current, always validated, always ready. This is what replaces Veeva Vault — not another document repository, but a live data graph that makes the concept of "submission readiness" a continuous state rather than a project.',
        narratorVoice: 'presenter',
        duration: 25,
      },
      {
        id: 'sr-16',
        order: 16,
        title: 'Navigate to eCTD Builder',
        description: 'One click from readiness to submission',
        module: 'submissions',
        action: 'navigate',
        duration: 5,
      },
      {
        id: 'sr-17',
        order: 17,
        title: 'Submission Package',
        description: 'The eCTD sequence is pre-populated from bridge data',
        module: 'submissions',
        action: 'highlight',
        highlightSelector: '[data-ectd-sequence]',
        highlightText: 'eCTD Sequence — Pre-populated from Live Data Bridges',
        duration: 12,
        tooltipContent: 'Module 3 quality sections populated from stability bridges. Module 5 clinical sections populated from biostatistics bridges. Labeling documents synced from SPL bridges.',
        tooltipPosition: 'bottom',
      },
      {
        id: 'sr-18',
        order: 18,
        title: 'Value Summary',
        description: 'Quantify the transformation',
        module: 'submissions',
        action: 'narrate',
        narration: 'Traditional NDA assembly: 6-8 weeks, 15+ FTEs, 4-5 disconnected systems, and a prayer that nothing changed since the last data cut. Ligature: continuous readiness, single platform, real-time validation. This is the Intelligent Development & Operations Platform — the operating system for life sciences R&D.',
        narratorVoice: 'presenter',
        duration: 20,
      },
    ],
  },
};

// ============================================================================
// STORE STATE
// ============================================================================

// v166: Persisted scenario session for resume functionality
interface PersistedScenarioSession {
  scenarioId: ScenarioId;
  stepIndex: number;
  completedSteps: string[];
  pausedAt: number;
  totalElapsedMs: number;
}

// v166: Scenario completion record for analytics
interface ScenarioCompletionRecord {
  scenarioId: ScenarioId;
  completedAt: number;
  durationMs: number;
  stepsCompleted: number;
  totalSteps: number;
}

interface GuidedScenarioState {
  // Active scenario
  activeScenario: ScenarioId | null;
  currentStepIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  
  // Timing
  startedAt: number | null;
  pausedAt: number | null;
  stepStartedAt: number | null;
  
  // Step completion tracking
  completedSteps: string[];
  
  // v166: Persistence
  savedSession: PersistedScenarioSession | null;
  completionHistory: ScenarioCompletionRecord[];
  
  // Actions
  startScenario: (scenarioId: ScenarioId) => void;
  stopScenario: () => void;
  pauseScenario: () => void;
  resumeScenario: () => void;
  advanceStep: () => void;
  goToStep: (stepIndex: number) => void;
  previousStep: () => void;
  completeStep: (stepId: string) => void;
  
  // v166: Persistence actions
  saveSession: () => void;
  resumeSavedSession: () => void;
  clearSavedSession: () => void;
  hasSavedSession: () => boolean;
  getSavedSessionInfo: () => { scenario: GuidedScenario; stepIndex: number; stepTitle: string } | null;
  
  // Getters
  getCurrentStep: () => ScenarioStep | null;
  getScenarioProgress: () => { current: number; total: number; percentage: number };
  getRemainingTime: () => number;
  getCompletionStats: () => { totalCompleted: number; scenarioBreakdown: Record<ScenarioId, number> };
}

export const useGuidedScenarioStore = create<GuidedScenarioState>()(
  persist(
    (set, get) => ({
      activeScenario: null,
      currentStepIndex: 0,
      isPlaying: false,
      isPaused: false,
      startedAt: null,
      pausedAt: null,
      stepStartedAt: null,
      completedSteps: [],
      
      // v166: Persistence state
      savedSession: null,
      completionHistory: [],
      
      startScenario: (scenarioId) => {
        // v166: Clear any saved session when starting fresh
        set({
          activeScenario: scenarioId,
          currentStepIndex: 0,
          isPlaying: true,
          isPaused: false,
          startedAt: Date.now(),
          pausedAt: null,
          stepStartedAt: Date.now(),
          completedSteps: [],
          savedSession: null,
        });
      },
      
      stopScenario: () => {
        const { activeScenario, currentStepIndex, startedAt, completedSteps } = get();
        
        // v166: Record completion if scenario was running
        if (activeScenario && startedAt) {
          const scenario = GUIDED_SCENARIOS[activeScenario];
          const isComplete = currentStepIndex >= scenario.steps.length - 1;
          
          if (isComplete) {
            set(state => ({
              completionHistory: [
                ...state.completionHistory,
                {
                  scenarioId: activeScenario,
                  completedAt: Date.now(),
                  durationMs: Date.now() - startedAt,
                  stepsCompleted: completedSteps.length,
                  totalSteps: scenario.steps.length,
                },
              ].slice(-50), // Keep last 50 completions
            }));
          }
        }
        
        set({
          activeScenario: null,
          currentStepIndex: 0,
          isPlaying: false,
          isPaused: false,
          startedAt: null,
          pausedAt: null,
          stepStartedAt: null,
          completedSteps: [],
        });
      },
      
      pauseScenario: () => {
        set({
          isPaused: true,
          pausedAt: Date.now(),
        });
      },
      
      resumeScenario: () => {
        set({
          isPaused: false,
          pausedAt: null,
        });
      },
      
      advanceStep: () => {
        const { activeScenario, currentStepIndex } = get();
        if (!activeScenario) return;
        
        const scenario = GUIDED_SCENARIOS[activeScenario];
        const currentStep = scenario.steps[currentStepIndex];
        
        // Mark current step as completed
        if (currentStep) {
          set(state => ({
            completedSteps: [...state.completedSteps, currentStep.id],
          }));
        }
        
        // Advance to next step
        if (currentStepIndex < scenario.steps.length - 1) {
          set({
            currentStepIndex: currentStepIndex + 1,
            stepStartedAt: Date.now(),
          });
        } else {
          // Scenario complete
          get().stopScenario();
        }
      },
      
      goToStep: (stepIndex) => {
        const { activeScenario } = get();
        if (!activeScenario) return;
        
        const scenario = GUIDED_SCENARIOS[activeScenario];
        if (stepIndex >= 0 && stepIndex < scenario.steps.length) {
          set({
            currentStepIndex: stepIndex,
            stepStartedAt: Date.now(),
          });
        }
      },
      
      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({
            currentStepIndex: currentStepIndex - 1,
            stepStartedAt: Date.now(),
          });
        }
      },
      
      completeStep: (stepId) => {
        set(state => ({
          completedSteps: state.completedSteps.includes(stepId)
            ? state.completedSteps
            : [...state.completedSteps, stepId],
        }));
      },
      
      // v166: Persistence actions
      saveSession: () => {
        const { activeScenario, currentStepIndex, completedSteps, startedAt } = get();
        
        if (!activeScenario || !startedAt) return;
        
        const elapsed = Date.now() - startedAt;
        
        set({
          savedSession: {
            scenarioId: activeScenario,
            stepIndex: currentStepIndex,
            completedSteps: [...completedSteps],
            pausedAt: Date.now(),
            totalElapsedMs: elapsed,
          },
          // Stop the active scenario
          activeScenario: null,
          currentStepIndex: 0,
          isPlaying: false,
          isPaused: false,
          startedAt: null,
          pausedAt: null,
          stepStartedAt: null,
          completedSteps: [],
        });
      },
      
      resumeSavedSession: () => {
        const { savedSession } = get();
        
        if (!savedSession) return;
        
        set({
          activeScenario: savedSession.scenarioId,
          currentStepIndex: savedSession.stepIndex,
          completedSteps: [...savedSession.completedSteps],
          isPlaying: true,
          isPaused: false,
          startedAt: Date.now() - savedSession.totalElapsedMs,
          pausedAt: null,
          stepStartedAt: Date.now(),
          savedSession: null,
        });
      },
      
      clearSavedSession: () => {
        set({ savedSession: null });
      },
      
      hasSavedSession: () => {
        return get().savedSession !== null;
      },
      
      getSavedSessionInfo: () => {
        const { savedSession } = get();
        if (!savedSession) return null;
        
        const scenario = GUIDED_SCENARIOS[savedSession.scenarioId];
        const step = scenario.steps[savedSession.stepIndex];
        
        return {
          scenario,
          stepIndex: savedSession.stepIndex,
          stepTitle: step?.title || 'Unknown step',
        };
      },
      
      getCurrentStep: () => {
        const { activeScenario, currentStepIndex } = get();
        if (!activeScenario) return null;
        return GUIDED_SCENARIOS[activeScenario].steps[currentStepIndex];
      },
      
      getScenarioProgress: () => {
        const { activeScenario, currentStepIndex } = get();
        if (!activeScenario) return { current: 0, total: 0, percentage: 0 };
        
        const scenario = GUIDED_SCENARIOS[activeScenario];
        return {
          current: currentStepIndex + 1,
          total: scenario.steps.length,
          percentage: Math.round(((currentStepIndex + 1) / scenario.steps.length) * 100),
        };
      },
      
      getRemainingTime: () => {
        const { activeScenario, currentStepIndex } = get();
        if (!activeScenario) return 0;
        
        const scenario = GUIDED_SCENARIOS[activeScenario];
        const remainingSteps = scenario.steps.slice(currentStepIndex);
        return remainingSteps.reduce((acc, step) => acc + step.duration, 0);
      },
      
      // v166: Analytics getter
      getCompletionStats: () => {
        const { completionHistory } = get();
        
        const breakdown: Record<ScenarioId, number> = {
          'preclinical-to-safety': 0,
          'safety-to-label': 0,
          'authoring-to-submission': 0,
          'full-regulatory-cascade': 0,
          'haq-response-workflow': 0,
          'submission-readiness': 0,
        };
        
        completionHistory.forEach(record => {
          breakdown[record.scenarioId]++;
        });
        
        return {
          totalCompleted: completionHistory.length,
          scenarioBreakdown: breakdown,
        };
      },
    }),
    {
      name: 'ligature-guided-scenarios',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        savedSession: state.savedSession,
        completionHistory: state.completionHistory,
      }),
    }
  )
);

// ============================================================================
// SELECTOR HOOKS
// v165 fix: Don't call methods inside selectors - extract primitive state
// and compute derived values outside the selector to prevent infinite loops
// v166: Added persistence hooks
// ============================================================================

export const useActiveScenario = () => {
  const activeScenario = useGuidedScenarioStore(s => s.activeScenario);
  return activeScenario ? GUIDED_SCENARIOS[activeScenario] : null;
};

// v165 fix: Extract primitive state and compute step outside selector
export const useCurrentScenarioStep = () => {
  const activeScenario = useGuidedScenarioStore(s => s.activeScenario);
  const currentStepIndex = useGuidedScenarioStore(s => s.currentStepIndex);
  
  if (!activeScenario) return null;
  return GUIDED_SCENARIOS[activeScenario].steps[currentStepIndex] || null;
};

// v165 fix: Compute progress from primitive state outside the selector
// v204d-b4 fix: Use useMemo to prevent new object reference on every render
export const useScenarioProgress = () => {
  const activeScenario = useGuidedScenarioStore(s => s.activeScenario);
  const currentStepIndex = useGuidedScenarioStore(s => s.currentStepIndex);
  
  return useMemo(() => {
    if (!activeScenario) return { current: 0, total: 0, percentage: 0 };
    
    const scenario = GUIDED_SCENARIOS[activeScenario];
    return {
      current: currentStepIndex + 1,
      total: scenario.steps.length,
      percentage: Math.round(((currentStepIndex + 1) / scenario.steps.length) * 100),
    };
  }, [activeScenario, currentStepIndex]);
};

export const useIsScenarioActive = () =>
  useGuidedScenarioStore(s => s.activeScenario !== null && s.isPlaying);

// v166: Persistence hooks
// v204d-b4 fix: Use useMemo to prevent new object reference on every render
export const useSavedSession = () => {
  const savedSession = useGuidedScenarioStore(s => s.savedSession);
  
  return useMemo(() => {
    if (!savedSession) return null;
    
    const scenario = GUIDED_SCENARIOS[savedSession.scenarioId];
    const step = scenario.steps[savedSession.stepIndex];
    
    return {
      scenario,
      stepIndex: savedSession.stepIndex,
      stepTitle: step?.title || 'Unknown step',
      pausedAt: savedSession.pausedAt,
      completedStepsCount: savedSession.completedSteps.length,
      totalSteps: scenario.steps.length,
      progressPercentage: Math.round(((savedSession.stepIndex + 1) / scenario.steps.length) * 100),
    };
  }, [savedSession]);
};

export const useHasSavedSession = () =>
  useGuidedScenarioStore(s => s.savedSession !== null);

export const useCompletionHistory = () =>
  useGuidedScenarioStore(s => s.completionHistory);

// v204d-b4 fix: Use useMemo to prevent new object reference on every render
export const useCompletionStats = () => {
  const completionHistory = useGuidedScenarioStore(s => s.completionHistory);
  
  return useMemo(() => {
    const breakdown: Record<ScenarioId, number> = {
      'preclinical-to-safety': 0,
      'safety-to-label': 0,
      'authoring-to-submission': 0,
      'full-regulatory-cascade': 0,
      'haq-response-workflow': 0,
      'submission-readiness': 0,
    };
    
    completionHistory.forEach(record => {
      breakdown[record.scenarioId]++;
    });
    
    return {
      totalCompleted: completionHistory.length,
      scenarioBreakdown: breakdown,
    };
  }, [completionHistory]);
};
