

/**
 * AIDocumentGeneratorPanel - v0.32.0
 * 
 * Reusable AI document generation panel with streaming output.
 * Used across multiple modules:
 * - Protocol Builder (ICH E6/E8 protocol documents)
 * - QMS (CAPA investigation reports, deviation narratives)
 * - TMF (TMF index documents)
 * - Nonclinical (Toxicology summaries)
 * - CMC (Manufacturing narratives)
 * - Labeling (PI/SmPC generation)
 * 
 * Features:
 * - Streaming text generation with AMA formatting
 * - Context-aware prompts based on document type
 * - Copy, accept, regenerate actions
 * - Real-time metrics (words, tokens, time)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, X, Copy, Check, StopCircle, Play,
  Clock, Zap, FileText, AlertCircle, 
  CheckCircle2, Loader2, RefreshCw, Download,
  Shield, FileCheck, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatAsAMAContent, AMA_CONTENT_STYLES, StreamingCursor } from '@/utils/ama-formatter';

// =============================================================================
// TYPES
// =============================================================================

export type DocumentGenerationType = 
  | 'protocol'           // ICH E6/E8 Clinical Protocol
  | 'capa-investigation' // CAPA Investigation Report
  | 'deviation-report'   // Deviation Investigation Report
  | 'tmf-index'          // TMF Reference Model Index
  | 'tox-summary'        // Nonclinical Toxicology Summary (2.4/2.6)
  | 'cmc-narrative'      // CMC Manufacturing Narrative (2.3/3.2.S/3.2.P)
  | 'labeling-pi'        // Prescribing Information / SmPC
  | 'clinical-overview'  // Clinical Overview (2.5)
  | 'nonclinical-overview' // Nonclinical Overview (2.4)
  | 'quality-overall'    // Quality Overall Summary (2.3)
  | 'custom';

export interface DocumentGenerationContext {
  /** Type of document to generate */
  documentType: DocumentGenerationType;
  /** Title for the document */
  title: string;
  /** Structured data to use as context */
  contextData: Record<string, any>;
  /** Product/study name */
  productName?: string;
  /** Indication */
  indication?: string;
  /** Additional instructions */
  customInstructions?: string;
}

export interface AIDocumentGeneratorPanelProps {
  /** Generation context */
  context: DocumentGenerationContext;
  /** Callback when document is accepted */
  onAccept?: (content: string) => void;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether panel is open */
  isOpen: boolean;
}

interface GenerationState {
  status: 'idle' | 'generating' | 'complete' | 'error' | 'cancelled';
  content: string;
  error?: string;
}

interface GenerationMetrics {
  wordCount: number;
  tokenCount: number;
  elapsedMs: number;
  tokensPerSecond: number;
}

// =============================================================================
// DOCUMENT TYPE CONFIGURATIONS
// =============================================================================

const DOCUMENT_TYPE_CONFIG: Record<DocumentGenerationType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  sections: string[];
}> = {
  'protocol': {
    label: 'Clinical Protocol',
    icon: FileText,
    color: 'blue',
    description: 'ICH E6/E8 compliant clinical trial protocol',
    sections: ['Synopsis', 'Objectives', 'Study Design', 'Eligibility', 'Treatment', 'Assessments', 'Statistics', 'Safety'],
  },
  'capa-investigation': {
    label: 'CAPA Investigation',
    icon: Shield,
    color: 'amber',
    description: 'Root cause analysis and corrective action report',
    sections: ['Executive Summary', 'Event Description', 'Investigation Findings', 'Root Cause Analysis', 'Corrective Actions', 'Preventive Actions', 'Effectiveness Criteria'],
  },
  'deviation-report': {
    label: 'Deviation Report',
    icon: AlertCircle,
    color: 'red',
    description: 'Manufacturing or process deviation investigation',
    sections: ['Deviation Summary', 'Impact Assessment', 'Investigation', 'Root Cause', 'CAPA Required', 'Product Disposition'],
  },
  'tmf-index': {
    label: 'TMF Index',
    icon: Layers,
    color: 'purple',
    description: 'Trial Master File reference document index',
    sections: ['Zone 1 - Trial Management', 'Zone 2 - Central', 'Zone 3 - Regulatory', 'Zone 4 - IRB/IEC', 'Zone 5 - Site', 'Zone 6 - IP', 'Zone 7 - Safety', 'Zone 8 - Statistics'],
  },
  'tox-summary': {
    label: 'Toxicology Summary',
    icon: FileCheck,
    color: 'green',
    description: 'Nonclinical toxicology summary for Module 2.4/2.6',
    sections: ['Introduction', 'Pharmacology', 'Pharmacokinetics', 'Toxicology', 'Carcinogenicity', 'Reproductive Toxicity', 'Local Tolerance', 'Integrated Summary'],
  },
  'cmc-narrative': {
    label: 'CMC Narrative',
    icon: FileText,
    color: 'cyan',
    description: 'Chemistry, Manufacturing, and Controls narrative',
    sections: ['Drug Substance', 'Drug Product', 'Manufacturing Process', 'Control of Materials', 'Specifications', 'Stability'],
  },
  'labeling-pi': {
    label: 'Prescribing Information',
    icon: FileText,
    color: 'indigo',
    description: 'Product labeling and prescribing information',
    sections: ['Highlights', 'Indications', 'Dosage', 'Warnings', 'Adverse Reactions', 'Drug Interactions', 'Clinical Studies'],
  },
  'clinical-overview': {
    label: 'Clinical Overview',
    icon: FileText,
    color: 'blue',
    description: 'CTD Module 2.5 Clinical Overview',
    sections: ['Product Development Rationale', 'Overview of Biopharmaceutics', 'Overview of Clinical Pharmacology', 'Overview of Efficacy', 'Overview of Safety', 'Benefits and Risks', 'Conclusions'],
  },
  'nonclinical-overview': {
    label: 'Nonclinical Overview',
    icon: FileText,
    color: 'green',
    description: 'CTD Module 2.4 Nonclinical Overview',
    sections: ['Overview of Nonclinical Testing', 'Pharmacology', 'Pharmacokinetics', 'Toxicology', 'Integrated Summary and Conclusions'],
  },
  'quality-overall': {
    label: 'Quality Overall Summary',
    icon: FileText,
    color: 'cyan',
    description: 'CTD Module 2.3 Quality Overall Summary',
    sections: ['Drug Substance', 'Drug Product', 'Appendices', 'Regional Information'],
  },
  'custom': {
    label: 'Custom Document',
    icon: FileText,
    color: 'gray',
    description: 'Custom document generation',
    sections: [],
  },
};

// =============================================================================
// DEMO MODE HELPERS
// =============================================================================

const DEMO_CONTENT: Record<DocumentGenerationType, string> = {
  'protocol': `# Clinical Trial Protocol

## 1. PROTOCOL SYNOPSIS

**Protocol Title:** A Phase 3, Randomized, Double-Blind, Placebo-Controlled Study to Evaluate the Efficacy and Safety of LIG-001 in Patients with Type 2 Diabetes Mellitus

**Protocol Number:** LIG-001-301
**IND Number:** 123456
**EudraCT Number:** 2026-000001-01

### Study Objectives

**Primary Objective:**
To evaluate the efficacy of LIG-001 compared to placebo in reducing HbA1c levels from baseline to Week 24 in patients with inadequately controlled Type 2 Diabetes Mellitus.

**Secondary Objectives:**
- To assess the effect of LIG-001 on fasting plasma glucose (FPG)
- To evaluate the proportion of patients achieving HbA1c <7.0%
- To characterize the safety and tolerability profile of LIG-001

## 2. STUDY DESIGN

This is a Phase 3, randomized, double-blind, placebo-controlled, parallel-group study. Approximately 450 patients will be randomized 1:1:1 to receive LIG-001 50mg, LIG-001 100mg, or placebo once daily for 24 weeks.

### Treatment Arms

| Arm | Treatment | N |
|-----|-----------|---|
| A | LIG-001 50mg QD | 150 |
| B | LIG-001 100mg QD | 150 |
| C | Placebo QD | 150 |

## 3. ELIGIBILITY CRITERIA

### Inclusion Criteria
1. Adults aged 18-75 years with Type 2 Diabetes Mellitus
2. HbA1c ≥7.5% and ≤10.5% at screening
3. Body mass index (BMI) 25-45 kg/m²
4. Stable metformin therapy (≥1500 mg/day) for ≥8 weeks

### Exclusion Criteria
1. Type 1 diabetes mellitus
2. History of diabetic ketoacidosis
3. eGFR <45 mL/min/1.73m²
4. Active liver disease or ALT/AST >3x ULN

## 4. SAFETY MONITORING

An independent Data Safety Monitoring Board (DSMB) will review safety data at scheduled intervals. Stopping rules are defined for serious adverse events.`,

  'capa-investigation': `# CAPA INVESTIGATION REPORT

## CAPA Number: CAPA-2026-0042
## Investigation Date: January 2026

### 1. EXECUTIVE SUMMARY

This Corrective and Preventive Action (CAPA) was initiated following the identification of a systematic deviation pattern in the tablet coating process for Product XYZ. The investigation utilized the 5 Whys methodology and Ishikawa (Fishbone) analysis to determine root causes. Corrective actions have been implemented and preventive measures established to prevent recurrence.

### 2. EVENT DESCRIPTION

**Deviation Reference:** DEV-2026-0089
**Event Date:** January 15, 2026
**Discovery Date:** January 16, 2026

During routine quality review, out-of-specification (OOS) results were identified for coating thickness in 3 consecutive batches of Product XYZ (Batches: XYZ-2601, XYZ-2602, XYZ-2603).

### 3. ROOT CAUSE ANALYSIS

**Methodology:** 5 Whys Analysis

1. Why were coating thickness results OOS? → Spray rate was inconsistent
2. Why was spray rate inconsistent? → Pump calibration was out of tolerance
3. Why was pump out of tolerance? → Calibration frequency was insufficient
4. Why was calibration frequency insufficient? → Risk assessment did not account for equipment aging
5. Why did risk assessment miss this? → Historical maintenance data not incorporated

**Root Cause:** Inadequate equipment maintenance risk assessment that did not incorporate historical performance degradation data.

### 4. CORRECTIVE ACTIONS

| Action | Responsible | Due Date | Status |
|--------|-------------|----------|--------|
| Recalibrate all coating pumps | Engineering | Jan 25, 2026 | Complete |
| Reprocess affected batches | Manufacturing | Jan 30, 2026 | In Progress |
| Update calibration procedure | QA | Feb 5, 2026 | Planned |

### 5. PREVENTIVE ACTIONS

1. Implement predictive maintenance program using equipment performance trending
2. Revise equipment qualification protocol to include aging factor assessments
3. Enhance operator training on early detection of equipment drift

### 6. EFFECTIVENESS CRITERIA

Effectiveness will be confirmed when:
- Zero OOS coating thickness results observed for 10 consecutive batches
- Equipment calibration compliance maintained at >98% for 6 months`,

  'deviation-report': `# DEVIATION INVESTIGATION REPORT

## Deviation Number: DEV-2026-0089
## Severity: Major

### 1. DEVIATION SUMMARY

**Product:** Product XYZ Tablets 50mg
**Affected Batches:** XYZ-2601, XYZ-2602, XYZ-2603
**GMP Section:** 21 CFR 211.113 - Equipment Cleaning and Maintenance

### 2. IMPACT ASSESSMENT

**Product Quality Impact:** Moderate
- Coating thickness variation may affect dissolution profile
- No impact on drug substance content or impurity levels

**Regulatory Impact:** Yes
- Deviation requires documentation in Annual Product Review
- May require notification in next NDA Annual Report

### 3. INVESTIGATION FINDINGS

The coating pump was found to be 12% out of calibration tolerance during routine verification. Historical review revealed gradual drift beginning approximately 45 days prior to detection.

### 4. PRODUCT DISPOSITION

**Decision:** Release with Deviation Documentation

**Rationale:** Extended dissolution testing confirmed all batches meet release specifications. Stability samples have been placed on accelerated study.`,

  'tox-summary': `# NONCLINICAL SUMMARY - MODULE 2.6

## 2.6.1 Introduction

This document provides integrated summaries of the pharmacology, pharmacokinetics, and toxicology studies conducted with LIG-001 in support of the clinical development program.

## 2.6.2 Pharmacology Written Summary

### 2.6.2.1 Primary Pharmacodynamics

LIG-001 is a selective GLP-1 receptor agonist with demonstrated glucose-dependent insulin secretion in preclinical models. In vitro studies using HEK293 cells expressing human GLP-1R demonstrated EC50 of 0.8 nM.

### 2.6.2.2 Secondary Pharmacodynamics

No significant off-target activity was observed in a panel of 87 receptors, ion channels, and enzymes at concentrations up to 10 μM.

## 2.6.6 Toxicology Written Summary

### General Toxicology Studies

| Study | Species | Duration | NOAEL | Key Findings |
|-------|---------|----------|-------|--------------|
| GLP-TOX-001 | Rat | 28 days | 30 mg/kg | Pancreatic acinar hypertrophy |
| GLP-TOX-002 | Dog | 28 days | 10 mg/kg | Minimal GI effects |
| GLP-TOX-003 | Rat | 26 weeks | 20 mg/kg | Thyroid C-cell hyperplasia |
| GLP-TOX-004 | Dog | 39 weeks | 5 mg/kg | No adverse findings |

### Carcinogenicity

A 2-year carcinogenicity study in rats revealed thyroid C-cell tumors at doses ≥10 mg/kg/day, consistent with the GLP-1 receptor agonist class effect.`,

  'cmc-narrative': `# QUALITY OVERALL SUMMARY - MODULE 2.3

## 2.3.S DRUG SUBSTANCE

### 2.3.S.1 General Information

**Nomenclature:**
- INN: Ligacetam
- Chemical Name: (2S)-2-[(4-chlorophenyl)methylamino]-3-methylbutanoic acid
- CAS Number: 123456-78-9
- Molecular Formula: C₁₂H₁₆ClNO₂
- Molecular Weight: 241.72 g/mol

### 2.3.S.2 Manufacture

The drug substance is manufactured by a convergent synthesis consisting of 5 chemical steps. The manufacturing process has been validated at commercial scale with demonstrated control of critical process parameters and critical quality attributes.

### 2.3.S.4 Control of Drug Substance

The specification includes tests for appearance, identification, assay, impurities, residual solvents, water content, and microbial limits. All batches manufactured to date meet specifications.

## 2.3.P DRUG PRODUCT

### 2.3.P.1 Description and Composition

LIG-001 tablets are immediate-release film-coated tablets containing 50 mg or 100 mg of ligacetam. Excipients include microcrystalline cellulose, lactose monohydrate, croscarmellose sodium, magnesium stearate, and Opadry II coating system.

### 2.3.P.8 Stability

The proposed shelf life is 36 months when stored at 25°C/60% RH in HDPE bottles with child-resistant closure, supported by 24 months of long-term stability data and 6 months of accelerated stability data.`,

  'labeling-pi': `# PRESCRIBING INFORMATION

## HIGHLIGHTS OF PRESCRIBING INFORMATION

**LIG-001® (ligacetam) tablets, for oral use**

WARNING: RISK OF THYROID C-CELL TUMORS
See full prescribing information for complete boxed warning.
• In rodents, GLP-1 receptor agonists cause thyroid C-cell tumors.
• LIG-001 is contraindicated in patients with personal/family history of MTC or MEN 2.

### INDICATIONS AND USAGE
LIG-001 is a GLP-1 receptor agonist indicated as an adjunct to diet and exercise to improve glycemic control in adults with type 2 diabetes mellitus.

### DOSAGE AND ADMINISTRATION
- Starting dose: 50 mg orally once daily
- May increase to 100 mg once daily after 4 weeks if additional glycemic control needed
- Take with or without food

### CONTRAINDICATIONS
- Personal or family history of medullary thyroid carcinoma (MTC)
- Multiple Endocrine Neoplasia syndrome type 2 (MEN 2)
- Known hypersensitivity to ligacetam or any excipients`,

  'clinical-overview': `# CLINICAL OVERVIEW - MODULE 2.5

## 2.5.1 Product Development Rationale

LIG-001 was developed to address the unmet medical need for effective, well-tolerated oral GLP-1 receptor agonist therapy for type 2 diabetes mellitus.

## 2.5.2 Overview of Biopharmaceutics

The immediate-release tablet formulation provides rapid absorption with Tmax of approximately 1.5 hours. Bioavailability is approximately 65% with no clinically meaningful food effect.

## 2.5.3 Overview of Clinical Pharmacology

LIG-001 demonstrates dose-proportional pharmacokinetics across the therapeutic dose range. The terminal half-life of approximately 12 hours supports once-daily dosing.

## 2.5.4 Overview of Efficacy

The Phase 3 clinical program demonstrated consistent, clinically meaningful reductions in HbA1c across patient populations, with approximately 70% of patients achieving HbA1c <7.0% at 24 weeks.

## 2.5.5 Overview of Safety

LIG-001 was well-tolerated with a safety profile consistent with the GLP-1 receptor agonist class. The most common adverse events were gastrointestinal in nature (nausea, vomiting, diarrhea), generally mild to moderate in severity, and typically resolved with continued treatment.`,

  'nonclinical-overview': `# NONCLINICAL OVERVIEW - MODULE 2.4

## 2.4.1 Overview of Nonclinical Testing Strategy

The nonclinical development program for LIG-001 was designed in accordance with ICH M3(R2) guidelines and included pharmacology, pharmacokinetics, and toxicology studies to support clinical development through marketing authorization.

## 2.4.2 Pharmacology

LIG-001 is a potent and selective GLP-1 receptor agonist with EC50 of 0.8 nM in human GLP-1R-expressing cells. In diabetic animal models, LIG-001 demonstrated dose-dependent improvements in glucose homeostasis.

## 2.4.3 Pharmacokinetics

LIG-001 exhibits favorable pharmacokinetic properties across species with good oral bioavailability (45-68%). The compound is primarily metabolized via CYP3A4 with renal excretion of metabolites.

## 2.4.4 Toxicology

General toxicology studies in rats and dogs established NOAEL values of 20 mg/kg and 5 mg/kg, respectively, providing adequate safety margins for clinical use.`,

  'quality-overall': `# QUALITY OVERALL SUMMARY - MODULE 2.3

## Introduction

This Quality Overall Summary provides an overview of the Chemistry, Manufacturing, and Controls (CMC) information for LIG-001 tablets submitted in support of this marketing application.

## Drug Substance

LIG-001 drug substance (ligacetam) is manufactured by a well-controlled synthetic process with established critical process parameters and proven acceptable ranges.

## Drug Product

LIG-001 tablets are immediate-release film-coated tablets manufactured using conventional pharmaceutical processing equipment and validated manufacturing processes.

## Regional Information

This dossier is prepared in accordance with ICH CTD format with regional requirements addressed in Module 1.`,

  'tmf-index': `# TRIAL MASTER FILE INDEX

## Study: LIG-001-301

### TMF Reference Model 3.0 Zones

#### Zone 1 - Trial Management
- 01.01 Trial Management Plan
- 01.02 Quality Management Plan
- 01.03 Site Selection Documentation

#### Zone 4 - IRB/IEC and Other Approvals
- 04.01 IRB/IEC Composition
- 04.02 IRB/IEC Initial Approval
- 04.03 IRB/IEC Amendments

#### Zone 5 - Regulatory
- 05.01 Clinical Trial Application
- 05.02 Regulatory Authority Approval
- 05.03 Annual Safety Reports`,

  'custom': `[Custom document content will be generated based on your specific requirements and context data.]`,
};

async function streamDemoContent(
  content: string,
  setState: React.Dispatch<React.SetStateAction<GenerationState>>,
  setMetrics: React.Dispatch<React.SetStateAction<GenerationMetrics>>,
  startTimeRef: React.MutableRefObject<number>
): Promise<void> {
  const words = content.split('');
  let accumulated = '';
  
  for (let i = 0; i < words.length; i++) {
    accumulated += words[i];
    
    // Update every few characters to simulate streaming
    if (i % 3 === 0 || i === words.length - 1) {
      setState(prev => ({ ...prev, content: accumulated }));
      setMetrics(prev => ({
        ...prev,
        wordCount: accumulated.split(/\s+/).filter(Boolean).length,
        tokenCount: Math.floor(accumulated.length / 4),
        elapsedMs: Date.now() - startTimeRef.current,
      }));
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 2));
    }
  }
  
  const finalElapsed = Date.now() - startTimeRef.current;
  const tokenCount = Math.floor(content.length / 4);
  setMetrics(prev => ({
    ...prev,
    elapsedMs: finalElapsed,
    tokensPerSecond: tokenCount / (finalElapsed / 1000),
  }));
  setState(prev => ({ ...prev, status: 'complete' }));
}

function generateDemoContent(documentType: DocumentGenerationType): string {
  return DEMO_CONTENT[documentType] || DEMO_CONTENT['custom'];
}

// =============================================================================
// PROMPT BUILDERS
// =============================================================================

function buildPromptForDocumentType(context: DocumentGenerationContext): string {
  const config = DOCUMENT_TYPE_CONFIG[context.documentType];
  
  const baseInstructions = `You are an expert regulatory affairs writer creating professional pharmaceutical documentation.
Write in AMA (American Medical Association) style with:
- Professional, precise language
- Justified paragraphs
- Proper section headings
- No excessive bullet points (use prose)
- Reference to specific data provided

Document Type: ${config?.label ?? ''}
Title: ${context.title}
${context.productName ? `Product: ${context.productName}` : ''}
${context.indication ? `Indication: ${context.indication}` : ''}

Generate a comprehensive ${config?.label ?? ''} document.`;

  // Add document-type specific instructions
  switch (context.documentType) {
    case 'protocol':
      return `${baseInstructions}

Follow ICH E6(R2) Good Clinical Practice and ICH E8 General Considerations for Clinical Studies guidelines.
Structure the protocol with these sections: ${config.sections.join(', ')}.

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a professional clinical trial protocol document. Include appropriate regulatory language, clear objectives, detailed methodology, and comprehensive safety monitoring plans.`;

    case 'capa-investigation':
      return `${baseInstructions}

Follow 21 CFR Part 211 and ICH Q10 pharmaceutical quality system guidelines for CAPA documentation.
Structure the report with: ${config.sections.join(', ')}.

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a thorough CAPA investigation report with detailed root cause analysis using appropriate methodologies (5 Whys, Fishbone, etc.), specific corrective actions with owners and timelines, and measurable effectiveness criteria.`;

    case 'deviation-report':
      return `${baseInstructions}

Follow 21 CFR Part 211.192 and EU GMP Annex 15 for deviation investigation documentation.
Structure the report with: ${config.sections.join(', ')}.

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a comprehensive deviation investigation report with clear impact assessment, thorough investigation findings, and appropriate product disposition recommendations.`;

    case 'tox-summary':
      return `${baseInstructions}

Follow ICH M4S and ICH S guidelines for nonclinical documentation.
Structure per CTD Module 2.4 (Nonclinical Overview) and Module 2.6 (Nonclinical Written Summaries).

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a comprehensive nonclinical/toxicology summary with integrated findings across all studies, appropriate safety margins, and relevance to clinical use.`;

    case 'cmc-narrative':
      return `${baseInstructions}

Follow ICH Q8-Q12 guidelines and CTD Module 3 structure for CMC documentation.

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a comprehensive CMC narrative covering drug substance characterization, manufacturing process description, control strategy, and stability data summary.`;

    case 'labeling-pi':
      return `${baseInstructions}

Follow FDA Physician Labeling Rule (PLR) format and 21 CFR 201.57 requirements.
Include standard sections: ${config.sections.join(', ')}.

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate professional prescribing information with appropriate safety language, clinical pharmacology data, and indication-specific dosing information.`;

    default:
      return `${baseInstructions}

${context.customInstructions || ''}

Context data:
${JSON.stringify(context.contextData, null, 2)}

Generate a professional regulatory document based on the provided context.`;
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AIDocumentGeneratorPanel({
  context,
  onAccept,
  onClose,
  isOpen,
}: AIDocumentGeneratorPanelProps) {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    content: '',
  });
  const [metrics, setMetrics] = useState<GenerationMetrics>({
    wordCount: 0,
    tokenCount: 0,
    elapsedMs: 0,
    tokensPerSecond: 0,
  });
  const [copied, setCopied] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = DOCUMENT_TYPE_CONFIG[context.documentType];
  const isGenerating = state.status === 'generating';
  const isComplete = state.status === 'complete';
  const isError = state.status === 'error';

  // Cursor blink effect
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => setShowCursor(prev => !prev), 530);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  // Auto-scroll during generation
  useEffect(() => {
    if (contentRef.current && isGenerating) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [state.content, isGenerating]);

  // Update elapsed time during generation
  useEffect(() => {
    if (isGenerating) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setMetrics(prev => ({
          ...prev,
          elapsedMs: elapsed,
          tokensPerSecond: prev.tokenCount > 0 ? (prev.tokenCount / (elapsed / 1000)) : 0,
        }));
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isGenerating]);

  const startGeneration = useCallback(async () => {
    setState({ status: 'generating', content: '' });
    setMetrics({ wordCount: 0, tokenCount: 0, elapsedMs: 0, tokensPerSecond: 0 });
    setIsDemoMode(false);
    startTimeRef.current = Date.now();

    abortControllerRef.current = new AbortController();
    const prompt = buildPromptForDocumentType(context);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          maxTokens: 4000,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Check if we got a JSON error response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          if (errorData.demo) {
            // API key not configured - use demo content
            setIsDemoMode(true);
            const demoContent = generateDemoContent(context.documentType);
            await streamDemoContent(demoContent, setState, setMetrics, startTimeRef);
            return;
          }
          throw new Error(errorData.message || errorData.error || `API error: ${response.status}`);
        }
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to demo mode if no response body
        setIsDemoMode(true);
        const demoContent = generateDemoContent(context.documentType);
        await streamDemoContent(demoContent, setState, setMetrics, startTimeRef);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = '';
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              // Handle Anthropic's streaming format
              // content_block_delta events have: { type: "content_block_delta", delta: { type: "text_delta", text: "..." } }
              let textContent = '';
              
              if (parsed.delta?.text) {
                // Anthropic streaming format
                textContent = parsed.delta.text;
              } else if (parsed.content) {
                // Fallback for simple format
                textContent = parsed.content;
              } else if (parsed.type === 'content_block_start' && parsed.content_block?.text) {
                textContent = parsed.content_block.text;
              }
              
              if (textContent) {
                fullContent += textContent;
                tokenCount += 1;

                setState(prev => ({ ...prev, content: fullContent }));
                setMetrics(prev => ({
                  ...prev,
                  wordCount: fullContent.split(/\s+/).filter(Boolean).length,
                  tokenCount,
                }));
              }
            } catch {
              // Non-JSON line, skip
            }
          }
        }
      }

      const finalElapsed = Date.now() - startTimeRef.current;
      setMetrics(prev => ({
        ...prev,
        elapsedMs: finalElapsed,
        tokensPerSecond: tokenCount / (finalElapsed / 1000),
      }));
      setState(prev => ({ ...prev, status: 'complete' }));

    } catch (error: unknown) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, status: 'cancelled' }));
      } else {
        setState({
          status: 'error',
          content: state.content,
          error: (error as Error).message || 'Generation failed',
        });
      }
    }
  }, [context]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(state.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.content]);

  const handleAccept = useCallback(() => {
    onAccept?.(state.content);
    onClose?.();
  }, [state.content, onAccept, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-accent-${config?.color ?? ''}/20`}>
              <Sparkles className={`w-5 h-5 text-accent-${config?.color ?? ''}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Generate {config.label}
              </h2>
              <p className="text-sm text-text-muted">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Context Summary */}
        <div className="px-6 py-3 border-b border-border bg-surface/50">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-text-muted">Document:</span>
            <span className="text-text-primary font-medium">{context.title}</span>
            {context.productName && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">Product:</span>
                <span className="text-text-primary">{context.productName}</span>
              </>
            )}
          </div>
        </div>

        {/* Metrics Bar */}
        {(isGenerating || isComplete) && (
          <div className="px-6 py-2 border-b border-border bg-surface-card/50 flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <FileText className="w-3.5 h-3.5" />
              <span>{metrics.wordCount.toLocaleString()} words</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Clock className="w-3.5 h-3.5" />
              <span>{(metrics.elapsedMs / 1000).toFixed(1)}s</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-accent-blue">
                <Zap className="w-3.5 h-3.5" />
                <span>{metrics.tokensPerSecond.toFixed(0)} tok/s</span>
              </div>
            )}
            {isComplete && (
              <Badge color="emerald" size="xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>
        )}

        {/* Content Area */}
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto p-6 bg-white min-h-[400px]"
          style={AMA_CONTENT_STYLES}
        >
          {state.status === 'idle' && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-accent-purple/10 mb-4">
                <Sparkles className="w-8 h-8 text-accent-purple" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Ready to Generate
              </h3>
              <p className="text-sm text-text-muted max-w-md mb-6">
                Click "Start Generation" to create a professional {config.label} document
                based on your provided data.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {config.sections.slice(0, 6).map((section) => (
                  <Badge key={section} color="gray" size="xs">{section}</Badge>
                ))}
                {config.sections.length > 6 && (
                  <Badge color="gray" size="xs">+{config.sections.length - 6} more</Badge>
                )}
              </div>
            </div>
          )}

          {(isGenerating || isComplete) && state.content && (
            <>
              <div 
                className="regulatory-content"
                style={{ textAlign: 'justify' }}
                dangerouslySetInnerHTML={{ __html: formatAsAMAContent(state.content) }}
              />
              {isGenerating && showCursor && <StreamingCursor />}
            </>
          )}

          {isGenerating && !state.content && (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-3 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin text-accent-purple" />
                <span>Generating {config.label}...</span>
              </div>
            </div>
          )}

          {isError && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-accent-red mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Generation Failed</h3>
              <p className="text-sm text-text-muted mb-4">{state.error}</p>
              <Button variant="secondary" onClick={startGeneration}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-surface-elevated flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startGeneration}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            {state.status === 'idle' && (
              <Button variant="primary" onClick={startGeneration}>
                <Sparkles className="w-4 h-4 mr-2" />
                Start Generation
              </Button>
            )}
            
            {isGenerating && (
              <Button variant="danger" onClick={stopGeneration}>
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
            
            {isComplete && (
              <Button variant="primary" onClick={handleAccept}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Accept & Use
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIDocumentGeneratorPanel;
