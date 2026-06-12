/**
 * Demo Scenario Data - v0.27.76
 * 
 * Compelling demo scenarios for investor presentations.
 * Built around LIG-2847 (Nexavant/ligrastinib) - a KRAS G12C inhibitor for NSCLC.
 * 
 * Key narrative: "Watch a safety signal cascade through the platform in seconds,
 * triggering 47 downstream actions that would take weeks in legacy systems."
 * 
 * DEMO FLOW (January 2026):
 * 1. Start at Portfolio → See Nexavant NDA status
 * 2. Safety alert: Japan hepatotoxicity cluster (emerging, last 72 hours)
 * 3. Click "Initiate Cascade Analysis" → Watch 47 actions fire
 * 4. HAQ Intelligence: See 3 pre-drafted FDA questions
 * 5. Authoring: AI-generated safety narrative section
 * 6. Close: "5 minutes vs 6 weeks in legacy systems"
 */

// =============================================================================
// PRIMARY DEMO SCENARIO: Safety Signal Cascade
// =============================================================================

export const PRIMARY_DEMO_SCENARIO = {
  id: 'nexavant-hepatotox-cascade',
  name: 'Nexavant Safety Signal Cascade',
  tagline: 'From signal detection to submission-ready in 47 automated actions',
  
  // Product context
  product: {
    id: 'lig-2847',
    name: 'LIG-2847',
    brandName: 'Nexavant',
    genericName: 'ligrastinib',
    indication: 'KRAS G12C-mutant Non-Small Cell Lung Cancer (NSCLC)',
    stage: 'NDA Filed',
    therapeuticArea: 'Oncology',
    pdfuaDate: '2026-02-15', // Critical demo date
    // Why this matters
    patientImpact: 'KRAS G12C mutations occur in ~13% of NSCLC patients. Currently, only 2 approved therapies exist, both with significant hepatotoxicity concerns. Nexavant offers improved safety profile with once-daily dosing.',
  },
  
  // The EMERGING signal that triggers the cascade (demo highlight)
  emergingSignal: {
    id: 'sig-japan-cluster',
    name: '🚨 Japan Hepatotoxicity Cluster',
    code: 'SIG-2847-JP-001',
    severity: 'critical' as const,
    detectedDate: '2026-01-15T08:47:00Z', // 2 days ago
    
    // Clinical context - dramatic numbers
    caseCount: 4,
    totalExposure: 156, // Japan-specific exposure
    incidenceRate: '2.6%',
    timeWindow: '72 hours',
    
    // The AI insight that makes this compelling
    aiInsight: {
      discovery: 'Potential drug-drug interaction with ursodeoxycholic acid',
      mechanism: 'CYP3A4 inhibition leading to 3x ligrastinib plasma levels',
      uniqueToJapan: 'UDCA prescribed to 28% of Japanese patients vs 3% globally',
      actionRequired: 'Urgent: Update concomitant medication guidance',
    },
    
    // Statistical measures
    prrValue: 4.7,
    rorValue: 5.2,
    ic025: 1.9,
    
    // Key demo stat
    legacyDetectionTime: '4-6 weeks (next PSUR cycle)',
    ligatureDetectionTime: '< 24 hours (real-time AI)',
    timeSaved: '5+ weeks critical response time',
  },
  
  // The existing confirmed signal (background context)
  confirmedSignal: {
    id: 'sig-hepatox-2847',
    name: 'Grade 3+ Hepatotoxicity (ALT/AST >5x ULN)',
    code: 'SIG-2847-001',
    severity: 'critical' as const,
    detectedDate: '2025-11-15T14:32:00Z',
    
    // Clinical context
    caseCount: 23,
    totalExposure: 847,
    incidenceRate: '2.7%',
    medianTimeToOnset: '6 weeks',
    medianTimeToResolution: '4 weeks',
    recoveryRate: '100%',
    
    // Statistical measures
    prrValue: 3.2,
    rorValue: 3.8,
    ic025: 1.4,
    
    // AI analysis summary
    aiAnalysis: {
      pattern: 'Idiosyncratic drug-induced liver injury with dose-independent pattern',
      riskFactors: ['Prior hepatic impairment', 'Concurrent CYP3A4 inhibitors', 'Age >65'],
      mechanismHypothesis: 'Likely mitochondrial toxicity based on metabolite profile',
      classContext: 'Consistent with class effect observed in sotorasib (Lumakras) and adagrasib (Krazati)',
    },
  },
  
  // Cascade actions for the demo - 47 total
  cascadeHighlights: {
    totalActions: 47,
    automatedActions: 42,
    manualReviewActions: 5,
    modulesImpacted: 14,
    documentsUpdated: 23,
    
    // Timeline comparison - the money shot
    legacyCompletionTime: '4-6 weeks of emails, meetings, and spreadsheets',
    ligatureCompletionTime: '< 24 hours with AI-assisted review',
    
    // Breakdown by category
    actionBreakdown: {
      safetyDatabase: 8,   // Case processing, coding, aggregate analysis
      regulatory: 12,      // PSMF, IB, RMP, expedited reports
      labeling: 6,         // CCDS, USPI, SmPC updates
      clinical: 7,         // DSMB, protocol updates, site notifications
      quality: 5,          // Deviations, CAPAs, change controls
      submissions: 9,      // eCTD sequences, HAQ responses, timeline updates
    },
    
    // Key actions to highlight in demo (shown in toasts)
    spotlightActions: [
      {
        sequence: 1,
        module: 'Safety',
        action: 'Signal validated and classified as critical',
        automated: true,
        duration: '0.3s',
        toastMessage: 'Signal validated and classified',
      },
      {
        sequence: 2,
        module: 'Labeling',
        action: 'CCDS flagged for hepatotoxicity warning update',
        automated: true,
        duration: '0.5s',
        toastMessage: 'CCDS flagged for hepatotoxicity warning',
      },
      {
        sequence: 3,
        module: 'HAQ Intelligence',
        action: '3 anticipated FDA questions pre-drafted with AI responses',
        automated: true,
        duration: '1.2s',
        toastMessage: '3 anticipated HAQs pre-drafted',
      },
      {
        sequence: 4,
        module: 'Authoring',
        action: 'Module 2.7.4 safety narrative queued for AI-assisted drafting',
        automated: true,
        duration: '0.8s',
        toastMessage: 'Module 2.7.4 queued for AI drafting',
      },
      {
        sequence: 5,
        module: 'TMF',
        action: '7 documents auto-filed with audit trail',
        automated: true,
        duration: '0.4s',
        toastMessage: '7 documents auto-filed to TMF',
      },
      {
        sequence: 6,
        module: 'Submissions Hub',
        action: 'NDA amendment timeline recalculated, PDUFA impact assessed',
        automated: true,
        duration: '0.6s',
        toastMessage: 'Submission timeline recalculated',
      },
      {
        sequence: 7,
        module: 'Safety',
        action: 'PSMF risk section updated with new signal',
        automated: true,
        duration: '0.5s',
        toastMessage: 'PSMF risk section updated',
      },
      {
        sequence: 8,
        module: 'Safety',
        action: 'E2B(R3) expedited reports generated for PMDA',
        automated: true,
        duration: '0.7s',
        toastMessage: 'E2B reports generated for PMDA',
      },
      {
        sequence: 9,
        module: 'CTMS',
        action: 'DSMB notification prepared for urgent review',
        automated: true,
        duration: '0.4s',
        toastMessage: 'DSMB notification prepared',
      },
      {
        sequence: 10,
        module: 'Authoring',
        action: 'IB addendum (Section 5.3.5) queued for review',
        automated: true,
        duration: '0.5s',
        toastMessage: 'IB addendum queued for review',
      },
    ],
  },
  
  // Competitor context (for investor framing)
  competitorContext: {
    sotorasib: {
      name: 'Sotorasib (Lumakras)',
      company: 'Amgen',
      approval: 'May 2021',
      hepatotoxWarning: 'Label updated May 2021, strengthened Jan 2023',
      incidence: '9% Grade 3+ ALT elevation',
      detectionTimeline: 'Signal detected post-marketing, 8 months after launch',
    },
    adagrasib: {
      name: 'Adagrasib (Krazati)',
      company: 'Mirati (now BMS)',
      approval: 'December 2022',
      hepatotoxWarning: 'Boxed warning added at approval',
      incidence: '7% Grade 3+ ALT elevation',
      detectionTimeline: 'Signal known from Phase 1, proactive labeling',
    },
    nexavant: {
      name: 'Nexavant (ligrastinib)',
      company: 'Demo Corp',
      approval: 'Pending (PDUFA Feb 15, 2026)',
      hepatotoxWarning: 'Proactive monitoring program with real-time detection',
      incidence: '2.7% Grade 3+ (60% lower than competitors)',
      differentiator: 'AI-powered signal detection catches patterns 5-7 weeks earlier',
    },
  },
};

// =============================================================================
// DEMO STEP NARRATION ENHANCEMENTS - v0.27.76
// =============================================================================

export const ENHANCED_STEP_NARRATION = {
  // Portfolio Command Center opening
  portfolioOpening: {
    script: `This is Nexavant—ligrastinib—a KRAS G12C inhibitor for non-small cell lung cancer. 
We're four weeks from PDUFA. KRAS G12C is one of the most important targets in oncology—about 
13% of NSCLC patients have this mutation, and right now only two drugs target it. Both have 
significant hepatotoxicity. Nexavant has a 60% better safety profile. But here's the thing—
we just detected something that could change our submission strategy.`,
    duration: 45,
    keyMetric: 'NDA Filed • PDUFA Feb 15',
    investorNote: 'Sets stakes: major market opportunity, competitive differentiation, time pressure',
  },
  
  // Safety signal detection - THE DEMO MOMENT
  safetySignalDetection: {
    script: `Look at this alert. 72 hours ago, our AI flagged something: four new hepatotoxicity 
cases in Japan. Not unusual by itself—we have 23 confirmed cases globally. But the AI found a 
pattern human reviewers would miss for weeks: all four patients were on ursodeoxycholic acid, 
a common medication in Japan that's rarely prescribed elsewhere. The system hypothesized a 
drug-drug interaction and ran the analysis. It's right—we're seeing 3x higher plasma levels. 
In a legacy system, this sits in an inbox until the next PSUR cycle. Here, we know in real-time.`,
    duration: 55,
    keyMetric: '72 hours vs 4-6 weeks detection',
    investorNote: 'Demonstrates AI moat: pattern recognition humans cannot replicate at scale',
  },
  
  // Cascade trigger - THE MONEY SHOT
  cascadeTrigger: {
    script: `Now watch this. When I click "Initiate Cascade Analysis"—look at the notification 
area. See those toasts firing? That's 47 downstream actions triggering automatically. CCDS 
flagged for label update. Three FDA questions pre-drafted—the system knows what they'll ask 
about hepatotoxicity monitoring because it's seen similar questions 847 times. Safety narrative 
queued for AI drafting. TMF documents auto-filed. Expedited report to PMDA generated. 
Submission timeline recalculated. In legacy pharma, this is 4-6 weeks of meetings and emails. 
Here, it's happening in seconds. Watch the counter—47 actions, all coordinated.`,
    duration: 65,
    keyMetric: '47 actions in seconds',
    investorNote: 'The demo moment. Cascade counter creates visual drama. Shows operational leverage.',
  },
  
  // HAQ Intelligence
  haqIntelligence: {
    script: `The system already knows what FDA will ask. Based on 847 historical HAQs and this 
signal's characteristics, we've pre-drafted three anticipated questions with AI-generated 
responses. This one—about hepatotoxicity monitoring protocol—has a complete draft using our 
actual case data, regulatory precedent from sotorasib and adagrasib, and the proposed REMS. 
Your regulatory team reviews and refines. They don't start from a blank page.`,
    duration: 45,
    keyMetric: '3 questions pre-drafted',
    investorNote: 'Shows knowledge moat: "We\'ve seen this question 847 times across 12 programs"',
  },
  
  // Document authoring
  documentAuthoring: {
    script: `Here's the Module 2.7.4 safety summary. I'll click "Generate Section" and Claude 
drafts the hepatotoxicity analysis using our clinical data, the statistical analysis, and 
regulatory language from approved labels. It's not cut-and-paste—it's synthesizing 23 case 
narratives, 3 risk factors, the Japan cluster insight, and competitive context. Your medical 
writer refines the draft. They don't originate it.`,
    duration: 50,
    keyMetric: 'AI-drafted in 3 seconds',
    investorNote: 'Live AI demo. Medical writer productivity multiplier.',
  },
  
  // TMF auto-filing
  tmfAutoFiling: {
    script: `Seven documents just auto-filed to the Trial Master File—signal assessment report, 
DSMB notification, IB addendum, expedited safety reports. Each one tagged with metadata, 
version-controlled, audit trail complete. Your TMF manager didn't touch a file. And because 
it's all connected, the inspectors can trace any document back to the source data.`,
    duration: 35,
    keyMetric: '7 docs auto-filed, audit-ready',
    investorNote: 'Addresses inspection readiness concern. 21 CFR Part 11 compliance.',
  },
  
  // Submissions Hub
  submissionsHub: {
    script: `Here's where it all comes together. The Submissions Hub shows the NDA amendment 
tracker—see how the timeline automatically recalculated? The hepatotoxicity update is flagged, 
response documents queued, and we can see exactly what needs human review before the February 
PDUFA date. This is what connected R&D looks like. Every module talks to every other module.`,
    duration: 45,
    keyMetric: 'Submission-ready, timeline intact',
    investorNote: 'Closes the loop. Shows end-to-end value proposition.',
  },
  
  // Closing
  closing: {
    script: `In the time I walked you through this—about five minutes—we demonstrated what 
takes 4-6 weeks in legacy systems. A safety signal detected 5 weeks earlier. A drug-drug 
interaction the competition won't catch until post-marketing. 47 downstream actions triggered 
automatically. Documents drafted, filed, tracked. Zero spreadsheets. Zero coordination meetings. 
And we're still submission-ready for February. This is the operating system for life sciences R&D.`,
    duration: 35,
    keyMetric: '5 min vs. 6 weeks',
    investorNote: 'Memorable close. "Operating system for life sciences" positioning.',
  },
};

// =============================================================================
// DEMO HAQ QUESTIONS (Anticipated FDA Questions) - Updated Jan 2026
// =============================================================================

export const DEMO_HAQ_QUESTIONS = [
  {
    id: 'haq-hepatox-1',
    questionNumber: 'CLIN-47',
    section: '2.7.4 Summary of Clinical Safety',
    questionText: `The safety database includes 23 cases of Grade 3+ hepatotoxicity (ALT/AST >5x ULN), 
with 4 additional cases recently reported from Japan. Please provide: (a) detailed narratives 
for all Grade 3+ hepatotoxicity cases including the new Japanese cases, (b) analysis of the 
potential drug-drug interaction with ursodeoxycholic acid, (c) updated time to onset and 
resolution data, and (d) revised risk management strategy including monitoring recommendations 
and concomitant medication guidance.`,
    aiPredictedSimilarity: 96,
    historicalPrecedents: [
      { drug: 'sotorasib', questionDate: '2021-03-15', resolution: 'Accepted with enhanced monitoring protocol' },
      { drug: 'adagrasib', questionDate: '2022-09-20', resolution: 'Boxed warning required, label updated' },
      { drug: 'tucatinib', questionDate: '2020-01-10', resolution: 'DDI section added to prescribing info' },
    ],
    draftResponseAvailable: true,
    estimatedResponseTime: '3-5 days with AI assist',
    legacyResponseTime: '2-3 weeks',
  },
  {
    id: 'haq-hepatox-2',
    questionNumber: 'CLIN-48',
    section: '2.7.4 Summary of Clinical Safety',
    questionText: `Provide a comparative analysis of hepatotoxicity rates in the ligrastinib 
development program versus approved KRAS G12C inhibitors (sotorasib, adagrasib), including 
discussion of potential mechanisms contributing to the observed 60% lower incidence rate.`,
    aiPredictedSimilarity: 89,
    draftResponseAvailable: true,
    estimatedResponseTime: '2-3 days with AI assist',
  },
  {
    id: 'haq-hepatox-3',
    questionNumber: 'CLIN-49',
    section: '5.3.5.3 Reports of Controlled Clinical Studies',
    questionText: `Please provide updated Kaplan-Meier analyses for time to hepatotoxicity 
onset stratified by: (a) dose level, (b) concomitant CYP3A4 inhibitor use, and (c) baseline 
hepatic function, with hazard ratios and 95% confidence intervals.`,
    aiPredictedSimilarity: 84,
    draftResponseAvailable: true,
    estimatedResponseTime: '4-5 days with AI assist',
  },
  {
    id: 'haq-japan-ddi',
    questionNumber: 'CLIN-50',
    section: '2.7.2 Summary of Clinical Pharmacology Studies',
    questionText: `Based on the recently identified hepatotoxicity cluster in Japan potentially 
associated with ursodeoxycholic acid co-administration, please provide: (a) mechanistic 
analysis of the proposed CYP3A4 interaction, (b) PK modeling of the interaction effect, and 
(c) proposed label language for concomitant medication guidance.`,
    aiPredictedSimilarity: 78, // Novel question, fewer precedents
    draftResponseAvailable: true,
    estimatedResponseTime: '5-7 days with AI assist',
    investorNote: 'Shows AI handling novel questions, not just pattern matching',
  },
];

// =============================================================================
// DEMO AI GENERATION CONTENT - v0.27.76
// =============================================================================

export const DEMO_AI_GENERATION = {
  safetyNarrativeSection: {
    prompt: 'Generate Module 2.7.4 hepatotoxicity analysis section',
    generatedContent: `**Hepatotoxicity**

Hepatotoxicity, characterized by Grade 3 or greater elevations in alanine aminotransferase 
(ALT) and/or aspartate aminotransferase (AST) exceeding 5 times the upper limit of normal 
(ULN), was observed in 27 of 1,003 patients (2.7%) treated with ligrastinib across the 
integrated safety database, including 4 cases from the recent Japan cohort.

The median time to onset was 6 weeks (range: 2-14 weeks), with all events resolving upon 
treatment discontinuation (median time to resolution: 4 weeks). No cases of acute liver 
failure, liver transplantation, or hepatic death were observed.

Notably, the incidence of Grade 3+ hepatotoxicity with ligrastinib (2.7%) is substantially 
lower than that reported for other approved KRAS G12C inhibitors, including sotorasib (9%) 
and adagrasib (7%). This difference may be attributable to ligrastinib's distinct metabolic 
profile, which demonstrates reduced formation of reactive acyl glucuronide metabolites 
implicated in idiosyncratic hepatotoxicity.

**Drug-Drug Interaction with Ursodeoxycholic Acid**

Post-hoc analysis of cases from Japan identified a potential interaction between ligrastinib 
and ursodeoxycholic acid (UDCA). Four of 4 cases (100%) from Japan were on concomitant UDCA, 
compared to 3% of the global population. Population PK modeling suggests UDCA-mediated 
CYP3A4 inhibition may increase ligrastinib AUC by approximately 3-fold. Label language 
recommending caution with strong CYP3A4 inhibitors will be updated to include UDCA.

**Risk Factor Analysis**

Multivariate logistic regression identified three potential predisposing factors:
• Baseline hepatic impairment (OR 2.4, 95% CI 1.2-4.8)
• Concurrent use of strong CYP3A4 inhibitors including UDCA (OR 2.1, 95% CI 1.3-3.4)
• Age ≥65 years (OR 1.7, 95% CI 0.9-3.1)

**Risk Management**

The proposed Risk Evaluation and Mitigation Strategy (REMS) includes mandatory hepatic 
function testing at baseline, every 2 weeks for the first 3 months, and monthly thereafter, 
with specified dose modification guidance for Grade 2+ elevations.`,
    wordCount: 312,
    generationTime: 4.2,
    qualityScore: 96,
    complianceChecks: [
      { check: 'ICH E3 format', passed: true },
      { check: 'Statistical rigor', passed: true },
      { check: 'Regulatory precedent cited', passed: true },
      { check: 'Risk mitigation proposed', passed: true },
      { check: 'Japan cluster addressed', passed: true },
      { check: 'DDI analysis included', passed: true },
    ],
  },
  
  haqResponseDraft: {
    prompt: 'Draft response to CLIN-47 hepatotoxicity question',
    generatedContent: `**Response to CLIN-47:**

**(a) Detailed Case Narratives**

Detailed case narratives for all 27 Grade 3+ hepatotoxicity cases, including the 4 cases 
from the Japan cohort, are provided in Appendix 7.3.2. Each narrative includes patient 
demographics, baseline hepatic function, concomitant medications (with specific attention 
to CYP3A4 inhibitors and ursodeoxycholic acid), time course of laboratory abnormalities, 
clinical symptoms (if any), management approach, and outcome.

Key findings:
• 26 of 27 cases (96%) were asymptomatic, detected on routine monitoring
• 1 case (Japan cohort) presented with fatigue and mild jaundice, resolved within 6 weeks
• No cases of acute liver failure, transplantation, or death
• All 27 cases (100%) resolved with treatment discontinuation

**(b) Ursodeoxycholic Acid Interaction Analysis**

The 4 cases from Japan share a common characteristic: all patients were receiving 
concomitant ursodeoxycholic acid (UDCA), prescribed for pre-existing hepatobiliary 
conditions. UDCA is prescribed to approximately 28% of patients in Japan versus 3% 
globally. Population pharmacokinetic analysis indicates...

[See Appendix 7.3.4 for complete PK modeling]

**(c) Updated Time to Onset and Resolution Data**

[See Table 7.3.2-1]
• Median time to onset: 6 weeks (IQR: 4-9 weeks)
• Median time to resolution: 4 weeks (IQR: 3-6 weeks)  
• 100% recovery rate with treatment discontinuation
• No dose-dependency observed (Grade 3+ incidence similar across 100mg, 200mg, 400mg cohorts)

**(d) Revised Risk Management Strategy**

The Applicant proposes the following revisions to the hepatic monitoring protocol:

1. **Enhanced Baseline Assessment**: LFTs plus assessment of CYP3A4 inhibitor medications
2. **Monitoring Frequency**: Every 2 weeks × 3 months, then monthly
3. **Concomitant Medication Guidance**: Caution with UDCA and strong CYP3A4 inhibitors
4. **Dose Modification**: Hold for Grade 2, discontinue for Grade 3+

[See Appendix 7.3.5 for complete REMS proposal]`,
    wordCount: 342,
    estimatedCompletionPercent: 90,
    aiConfidenceScore: 94,
  },
  
  japanClusterAnalysis: {
    prompt: 'Generate urgent safety assessment for Japan hepatotoxicity cluster',
    generatedContent: `**Urgent Safety Assessment: Japan Hepatotoxicity Cluster**

**Executive Summary**
Four cases of severe hepatotoxicity (ALT/AST >5x ULN) were reported from Japan within a 
72-hour window (January 13-15, 2026). AI pattern analysis identified a potential drug-drug 
interaction with ursodeoxycholic acid (UDCA) as a contributing factor.

**Signal Characteristics**
• Cases: 4 of 156 Japanese patients (2.6%)
• Time clustering: All within 72 hours
• Common factor: 100% on concomitant UDCA
• Outcome: All cases improving with drug hold

**AI-Generated Hypothesis**
UDCA inhibits CYP3A4-mediated metabolism of ligrastinib, resulting in approximately 3-fold 
increase in plasma exposure. This hypothesis is supported by:
1. Japanese prescribing patterns (28% UDCA use vs 3% global)
2. In vitro CYP3A4 inhibition data for UDCA
3. Ligrastinib PK profile showing CYP3A4 as primary clearance pathway

**Recommended Actions**
1. IMMEDIATE: Update investigator communications re: UDCA co-administration
2. 24 HOURS: Prepare expedited safety report for PMDA
3. 72 HOURS: Complete PK interaction modeling
4. 1 WEEK: Update CCDS and regional labels with concomitant medication guidance

**Regulatory Impact Assessment**
This finding does not materially affect the benefit-risk profile for the NDA. The interaction 
is manageable with label guidance and does not require a boxed warning based on severity 
and reversibility of events.`,
    wordCount: 247,
    generationTime: 2.8,
    urgencyScore: 'critical',
  },
};

// =============================================================================
// DEMO TIMING RECOMMENDATIONS - v0.27.76
// =============================================================================

export const DEMO_TIMING = {
  fullDemo: {
    targetDuration: 900, // 15 minutes
    sections: {
      introduction: 60,
      portfolioOverview: 90,
      safetySignalDetection: 120,  // Key moment - Japan cluster
      cascadeTrigger: 90,          // Money shot - 47 actions
      haqIntelligence: 90,
      documentAuthoring: 120,
      tmfAndSubmissions: 90,
      closingAndQA: 300,
    },
    investorTips: [
      'Start with "PDUFA in 4 weeks" to establish time pressure',
      'Build tension with Japan cluster discovery',
      'Let cascade counter speak for itself - silence during the count',
      'End with "5 min vs 6 weeks" for memorability',
    ],
  },
  
  compressedDemo: {
    targetDuration: 480, // 8 minutes
    skipSections: ['documentAuthoring', 'tmfAndSubmissions'],
    focusOn: ['safetySignalDetection', 'cascadeTrigger', 'haqIntelligence'],
    investorTips: [
      'Japan cluster + cascade counter is the whole story',
      'HAQ pre-drafting shows knowledge moat',
    ],
  },
  
  lightningDemo: {
    targetDuration: 180, // 3 minutes
    focusOnly: ['cascadeTrigger'],
    keyMessage: 'One signal, 47 automated actions, seconds not weeks',
    investorTips: [
      'Skip context, go straight to cascade',
      'Let the counter do the talking',
      'Close with competitive positioning',
    ],
  },
  
  // NEW: Specific demo timings for cascade effect
  cascadeTimings: {
    toastInterval: 400,      // ms between toast notifications
    cascadeCounterDelay: 5,  // Show counter after 5 actions
    celebrationDelay: 2000,  // ms after cascade completes
    totalDuration: 6000,     // ms for full cascade demo
  },
};

// =============================================================================
// INVESTOR TALKING POINTS - v0.27.76
// =============================================================================

export const INVESTOR_TALKING_POINTS = {
  opening: [
    '$5M seed for first commercial-ready regulatory AI platform',
    'Target: replace Veeva Vault across R&D lifecycle',
    'Team: 25+ years regulatory experience, built systems for top 10 pharma',
  ],
  
  marketSize: [
    'Pharma R&D spend: $250B annually',
    'Regulatory operations: $8-12B addressable',
    'Document management alone: $2.5B (Veeva dominates)',
  ],
  
  differentiation: [
    'AI-native vs AI-bolted-on (Veeva, Medidata)',
    'Cross-module data flow (no more silos)',
    'Real-time signal detection vs periodic reporting',
    'HAQ knowledge moat: 847 questions, 12 programs',
  ],
  
  traction: [
    'Design partner pipeline: 3 mid-size pharma in discussion',
    'Technical validation: complete platform demo',
    'AI integration: Claude API production-ready',
  ],
  
  askAndUse: [
    '$5M seed, 18-month runway',
    '60% engineering (AI, platform)',
    '20% customer success (design partners)',
    '20% regulatory (compliance, validation)',
  ],
};

// =============================================================================
// EXPORT HELPER
// =============================================================================

export function getDemoScenario() {
  return {
    scenario: PRIMARY_DEMO_SCENARIO,
    narration: ENHANCED_STEP_NARRATION,
    haqs: DEMO_HAQ_QUESTIONS,
    aiContent: DEMO_AI_GENERATION,
    timing: DEMO_TIMING,
    talkingPoints: INVESTOR_TALKING_POINTS,
  };
}
