
// =============================================================================
// Demo Generation Fallback — v0.42.48
// Pre-generated regulatory content that simulates Claude streaming when API
// is unavailable. Ensures investor demos never fail due to API issues.
//
// Architecture:
//   1. Content library keyed by document category + section pattern
//   2. simulateStreaming() delivers content token-by-token with realistic timing
//   3. useSectionGeneration hook calls this when real API returns error
//
// Content is real regulatory prose following ICH/AMA style — not placeholder.
// =============================================================================

import type { DocumentType } from '@/types/authoring';

// =============================================================================
// TYPES
// =============================================================================

export interface FallbackContentEntry {
  /** Document category for matching */
  category: string;
  /** Section number pattern (regex-ready) */
  sectionPattern: string;
  /** Pre-generated regulatory content */
  content: string;
  /** Approximate word count */
  wordCount: number;
}

export interface StreamSimulationCallbacks {
  onToken: (token: string) => void;
  onComplete: (content: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamSimulationOptions {
  /** Base delay between tokens in ms (default: 15) */
  tokenDelayMs?: number;
  /** Random jitter range in ms (default: 10) */
  jitterMs?: number;
  /** Initial "connecting" delay in ms (default: 800) */
  connectDelayMs?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

// =============================================================================
// CONTENT LIBRARY
// =============================================================================

const FALLBACK_CONTENT: FallbackContentEntry[] = [
  // ---- Clinical: Efficacy Results (CSR Section 11) ----
  {
    category: 'clinical',
    sectionPattern: '^11|efficacy',
    wordCount: 520,
    content: `## Efficacy Results

### Primary Endpoint Analysis

The primary efficacy endpoint of overall survival (OS) was met in the intent-to-treat (ITT) population. Median OS was 18.7 months (95% CI, 16.2 to 21.4) in the treatment arm compared with 12.3 months (95% CI, 10.1 to 14.8) in the control arm, representing a statistically significant improvement (HR, 0.67; 95% CI, 0.52 to 0.87; P = .003) [Source: Clinical Study Report, Section 11.1].

[Table 11.1: Overall Survival Analysis — ITT Population]

The Kaplan-Meier survival curves separated early, with divergence becoming apparent at approximately 8 weeks and maintained throughout the observation period. The 12-month OS rate was 72.4% in the treatment arm versus 53.1% in the control arm [Source: Statistical Analysis Plan, Section 5.1].

### Key Secondary Endpoints

Progression-free survival (PFS) per blinded independent central review (BICR) demonstrated a statistically significant improvement in the treatment arm. Median PFS was 9.4 months (95% CI, 7.8 to 11.2) compared with 5.1 months (95% CI, 4.2 to 6.3) in the control arm (HR, 0.54; 95% CI, 0.43 to 0.68; P < .001).

The confirmed objective response rate (ORR) was 48.3% (95% CI, 42.1% to 54.6%) in the treatment arm versus 21.7% (95% CI, 16.8% to 27.2%) in the control arm (P < .001). Complete responses were observed in 8.2% of treatment arm patients compared with 2.1% in the control arm.

Median duration of response (DoR) was 11.8 months (95% CI, 9.4 to 14.6) in the treatment arm, with 42.3% of responders maintaining response at 12 months.

### Subgroup Analyses

Pre-specified subgroup analyses demonstrated consistent treatment benefit across demographic and disease characteristic subgroups, including age (< 65 vs ≥ 65 years), sex, ECOG performance status (0 vs 1), and PD-L1 expression level (< 1% vs ≥ 1%).

[Figure 11.2: Forest Plot of Overall Survival by Pre-Specified Subgroups]

Patients with high PD-L1 expression (tumor proportion score ≥ 50%) showed a numerically greater benefit (HR, 0.48; 95% CI, 0.32 to 0.72) compared with PD-L1-low patients (HR, 0.79; 95% CI, 0.58 to 1.08), though the interaction test was not statistically significant (P = .12 for interaction).`,
  },

  // ---- Clinical: Safety Results (CSR Section 12) ----
  {
    category: 'clinical',
    sectionPattern: '^12|safety',
    wordCount: 480,
    content: `## Safety Results

### Extent of Exposure

A total of 412 patients received at least one dose of study treatment (208 in the treatment arm, 204 in the control arm). Median duration of treatment was 8.4 months (range, 0.5 to 24.1) in the treatment arm and 4.7 months (range, 0.5 to 18.6) in the control arm. The safety population was representative of the ITT population with no clinically meaningful imbalances in baseline characteristics.

### Overview of Adverse Events

Treatment-emergent adverse events (TEAEs) were reported in 94.2% of patients in the treatment arm and 87.3% in the control arm. Grade ≥ 3 TEAEs occurred in 48.1% and 32.8% of patients, respectively. Serious adverse events (SAEs) were reported in 31.7% of treatment arm patients compared with 22.5% in the control arm.

[Table 12.1: Overview of Treatment-Emergent Adverse Events — Safety Population]

TEAEs leading to treatment discontinuation occurred in 12.5% of treatment arm patients versus 8.3% in the control arm. The most common TEAEs leading to discontinuation in the treatment arm were pneumonitis (2.4%), hepatitis (1.9%), and colitis (1.4%).

### Most Common Adverse Events

The most frequently reported TEAEs (≥ 15% in either arm) in the treatment arm were fatigue (42.3%), nausea (28.8%), decreased appetite (24.5%), diarrhea (22.1%), rash (19.7%), and pruritus (15.9%). Immune-mediated adverse events of special interest were reported in 28.4% of treatment arm patients [Source: Clinical Study Report, Section 12.1].

### Deaths

Treatment-emergent deaths occurred in 18 patients (8.7%) in the treatment arm and 22 patients (10.8%) in the control arm. Disease progression was the most common cause of death in both arms. Two deaths in the treatment arm were considered related to study treatment (pneumonitis, n = 1; myocarditis, n = 1).

### Laboratory Abnormalities

Grade 3-4 laboratory abnormalities occurring in ≥ 5% of patients in the treatment arm included lymphocyte count decreased (14.4%), ALT increased (7.2%), and AST increased (6.3%).`,
  },

  // ---- Quality/CMC: Drug Substance Manufacturing (3.2.S.2) ----
  {
    category: 'quality-cmc',
    sectionPattern: '3\\.2\\.s\\.2|manufactur',
    wordCount: 400,
    content: `## Manufacturing Process Description

### Process Overview

The drug substance is manufactured by a convergent synthetic process consisting of five chemical steps from commercially available starting materials. The process has been developed using Quality by Design (QbD) principles in accordance with ICH Q8(R2) and ICH Q11 guidelines.

[Figure 3.2.S.2.2-1: Manufacturing Process Flow Diagram]

### Starting Materials

Two starting materials are used in the synthesis. Starting material 1 (SM-1) is a commercially available substituted pyrimidine, sourced from qualified suppliers with appropriate specifications. Starting material 2 (SM-2) is a functionalized piperazine derivative. The justification for starting material selection follows ICH Q11 principles, with the starting materials positioned sufficiently upstream to ensure adequate control of impurities.

### Process Description

**Step 1 — Amide Coupling:** SM-1 is reacted with SM-2 in the presence of HATU coupling reagent and DIPEA base in DMF solvent at 20-25°C for 4-6 hours. The intermediate is isolated by aqueous workup and crystallization from ethanol/water.

**Step 2 — Cyclization:** The Step 1 intermediate undergoes intramolecular cyclization in acetic acid at 80-85°C for 8-12 hours to form the core bicyclic ring system. The reaction is monitored by HPLC (IPC-1: ≥ 98.0% conversion).

**Step 3 — Deprotection:** Removal of the Boc protecting group is achieved with HCl in dioxane at ambient temperature (CPP: temperature 20-25°C; reaction time 2-4 hours).

**Step 4 — Salt Formation:** The free base from Step 3 is converted to the mesylate salt by treatment with methanesulfonic acid in isopropanol. The critical quality attributes of the salt form (polymorphic form, particle size) are controlled at this step.

**Step 5 — Final Purification:** Recrystallization from ethanol/MTBE affords the drug substance meeting all release specifications. The isolated yield for the overall process is 42-48%.

### Critical Process Parameters

[Table 3.2.S.2.2-1: Critical Process Parameters and Proven Acceptable Ranges]`,
  },

  // ---- Safety Aggregate: DSUR Signal Evaluation ----
  {
    category: 'safety-aggregate',
    sectionPattern: 'signal|safety.*summary',
    wordCount: 350,
    content: `## Signal Evaluation

### Newly Identified Safety Signals

During the reporting period, one new potential safety signal was identified through routine pharmacovigilance activities.

**Hepatotoxicity (Drug-Induced Liver Injury)**

A disproportionality analysis of post-marketing spontaneous reports identified a signal for drug-induced liver injury (DILI). The proportional reporting ratio (PRR) was 2.84 (95% CI, 1.92 to 4.21) based on 47 reports of hepatocellular injury received during the reporting period. The Empirical Bayesian Geometric Mean (EBGM) was 2.31, exceeding the threshold of 2.0 for signal detection.

Case characteristics: median patient age 58 years (range, 34 to 76); 62% female; median time to onset 6.2 weeks (range, 2 to 18 weeks). Hy's Law cases (ALT > 3× ULN with total bilirubin > 2× ULN) were identified in 4 cases (8.5%). All cases resolved upon discontinuation; no cases of acute liver failure were reported.

**Assessment and Actions Taken:**

The signal was assessed as validated based on the strength of disproportionality, biological plausibility (CYP3A4-mediated metabolism with reactive metabolite formation), and consistency with nonclinical findings (hepatocellular hypertrophy in 26-week rat toxicity study at exposures ≥ 3× clinical AUC). The following risk minimization measures have been implemented:

1. Updated SmPC Section 4.4 with hepatotoxicity warning and monitoring recommendations
2. Updated USPI Warnings and Precautions with hepatic monitoring guidance
3. Direct Healthcare Professional Communication (DHPC) distributed in EU markets
4. Risk Management Plan amended to include hepatotoxicity as an important identified risk

### Previously Identified Signals

All previously identified signals (pneumonitis, immune-mediated colitis) remain under ongoing monitoring with no change in characterization during this reporting period.`,
  },

  // ---- US Labeling: Warnings and Precautions ----
  {
    category: 'labeling-us',
    sectionPattern: 'warning|precaution',
    wordCount: 380,
    content: `## 5 WARNINGS AND PRECAUTIONS

### 5.1 Immune-Mediated Pneumonitis

Immune-mediated pneumonitis, including fatal cases, occurred in patients treated with LIG-2847. Pneumonitis occurred in 4.2% (18/428) of patients receiving LIG-2847, including Grade 3-4 in 1.2% and fatal in 0.2%. Median time to onset was 2.3 months (range: 0.5 to 12.1 months).

Monitor patients for signs and symptoms of pneumonitis. Evaluate patients with suspected pneumonitis with radiographic imaging. Administer corticosteroids for Grade 2 or greater pneumonitis. Withhold LIG-2847 for Grade 2 and permanently discontinue for Grade 3 or 4 pneumonitis [see Dosage and Administration (2.3)].

### 5.2 Immune-Mediated Hepatitis

LIG-2847 can cause immune-mediated hepatitis. Hepatitis occurred in 3.1% (13/428) of patients receiving LIG-2847, including Grade 3-4 in 1.6%. Monitor patients for changes in liver function at baseline and periodically during treatment. Administer corticosteroids for Grade 2 or greater hepatitis.

For patients with Grade 2 hepatitis (AST or ALT > 3 and up to 5× ULN or total bilirubin > 1.5 and up to 3× ULN), withhold LIG-2847 until recovery to Grade 0-1. For Grade 3 or 4 hepatitis (AST or ALT > 5× ULN or total bilirubin > 3× ULN), permanently discontinue LIG-2847 [see Dosage and Administration (2.3)].

### 5.3 Immune-Mediated Colitis

Immune-mediated colitis occurred in 2.8% (12/428) of patients receiving LIG-2847, including Grade 3 in 0.9%. Monitor patients for signs and symptoms of colitis. Administer corticosteroids for Grade 2 or greater colitis. Withhold LIG-2847 for Grade 2 or 3, and permanently discontinue for Grade 4 colitis.

### 5.4 Hepatotoxicity

Severe hepatotoxicity, including cases meeting criteria for drug-induced liver injury, has been reported. Monitor hepatic function prior to initiation, periodically during treatment, and as clinically indicated. Consider more frequent monitoring in patients with hepatic metastases or elevated baseline transaminases.`,
  },

  // ---- Nonclinical: Pharmacology Summary (2.4/2.6) ----
  {
    category: 'nonclinical',
    sectionPattern: '2\\.4|2\\.6|pharmacolog|nonclinical.*overview',
    wordCount: 400,
    content: `## Summary of Primary Pharmacodynamic Studies

### Mechanism of Action

LIG-2847 is a humanized monoclonal antibody that binds to programmed death-ligand 1 (PD-L1) with high affinity (KD = 0.42 nM by surface plasmon resonance). Binding of LIG-2847 to PD-L1 blocks the interaction with both PD-1 and B7.1 receptors, thereby releasing PD-L1/PD-1-mediated inhibition of immune responses, including anti-tumor immune responses [Source: Nonclinical Study Reports, Section 2.6.2].

### In Vitro Pharmacology

In a mixed lymphocyte reaction (MLR) assay, LIG-2847 enhanced T-cell proliferation and IFN-γ production in a dose-dependent manner (EC50 = 0.18 nM). In tumor cell co-culture assays using PD-L1-expressing human tumor cell lines (A549, MDA-MB-231), LIG-2847 restored T-cell-mediated cytotoxicity with EC50 values ranging from 0.12 to 0.34 nM.

Cross-reactivity studies confirmed binding to cynomolgus monkey PD-L1 (KD = 0.51 nM) but not to mouse or rat PD-L1, establishing the cynomolgus monkey as the relevant nonclinical species for toxicology evaluation.

### In Vivo Pharmacology

In a PD-L1-humanized syngeneic mouse model (MC38-hPD-L1), LIG-2847 demonstrated dose-dependent anti-tumor activity. At doses ≥ 5 mg/kg administered twice weekly, tumor growth inhibition (TGI) exceeded 70% compared with isotype control (P < .001) [Source: Nonclinical Study Reports, Section 4.2.1.1].

Complete tumor regression was observed in 30% of animals at the 10 mg/kg dose level, with evidence of immunological memory upon tumor rechallenge. The anti-tumor activity of LIG-2847 was associated with increased CD8+ T-cell infiltration and decreased regulatory T-cell frequency within the tumor microenvironment.

### Secondary Pharmacodynamics

No off-target binding was detected in a panel of 68 human receptors, ion channels, and enzymes at concentrations up to 10 μM, indicating a high degree of target selectivity.

[Table 2.6.2-1: Summary of Primary Pharmacodynamic Studies]`,
  },

  // ---- HAQ/IR response fallback (v0.42.51) ----
  {
    category: 'haq-response',
    sectionPattern: 'hepato|haq|ir.*question|day.*74',
    wordCount: 420,
    content: `## Response to IR Question 3: Hepatotoxicity Characterization

### Summary of Hepatotoxicity Data

The Sponsor has conducted a comprehensive analysis of hepatotoxicity signals across the LIG-2847 development program in response to the Agency's Day 74 Information Request. The analysis encompasses all clinical studies with safety data (Studies LIG-2847-101 through LIG-2847-303, N = 2,847 exposed subjects).

### Incidence and Characterization

Hepatic adverse events were reported in 127/2,847 subjects (4.5%) in the LIG-2847 arms versus 41/1,423 subjects (2.9%) in control arms. The majority were Grade 1-2 transaminase elevations (ALT and/or AST). Events meeting Hy's Law criteria (ALT >3× ULN with concurrent total bilirubin >2× ULN) occurred in 3 subjects (0.1%), all resolving upon treatment discontinuation [Source: Integrated Safety Database, Table 14.3.1-7].

### Time Course and Reversibility

Median time to onset of hepatic events was 8.2 weeks (range: 2-24 weeks). Among subjects with Grade ≥2 events who continued treatment with enhanced monitoring, 78% (64/82) showed normalization within 4 weeks. No cases of hepatic failure, liver transplantation, or hepatic death were observed [Source: Study LIG-2847-301, Section 12.3.4].

### Risk Factors

Multivariate logistic regression identified the following independent risk factors: baseline ALT >ULN (OR 2.4, 95% CI 1.6-3.5), concurrent statin use (OR 1.8, 95% CI 1.2-2.7), and body weight >100 kg (OR 1.5, 95% CI 1.0-2.2). Age, sex, and hepatitis B/C status were not significantly associated with hepatotoxicity risk [Source: Integrated Analysis, Appendix 16.1.9.4].

### Risk Mitigation Strategy

The Sponsor proposes: (1) hepatic function monitoring at baseline, monthly for 3 months, then quarterly; (2) dose modification algorithm for Grade ≥2 transaminase elevations; (3) contraindication in patients with baseline ALT/AST >5× ULN. These measures are reflected in the proposed Warnings and Precautions (Section 5.1) and Dosage and Administration (Section 2.3) of the draft USPI.

### Conclusion

The hepatotoxicity profile of LIG-2847 is manageable with appropriate monitoring and dose modification. The benefit-risk assessment remains favorable given the significant efficacy demonstrated in the target population with limited treatment options.`,
  },

  // ---- Labeling warning language fallback (v0.42.51) ----
  {
    category: 'labeling-warning',
    sectionPattern: '5\\.1|warning|precaution|hepato.*warning',
    wordCount: 350,
    content: `## 5.1 Hepatotoxicity

### Warning Language

Hepatotoxicity, including clinically significant transaminase elevations, has been observed in patients treated with LIG-2847. In the pooled safety database (N = 2,847), hepatic adverse events occurred in 4.5% of patients receiving LIG-2847 compared to 2.9% receiving control.

**Serious Hepatotoxicity:** Three patients (0.1%) met Hy's Law criteria (ALT >3× ULN with concurrent bilirubin >2× ULN without initial findings of cholestasis). All cases resolved upon treatment discontinuation. No cases of acute liver failure, liver transplantation, or hepatic death were reported.

**Grade 3-4 Transaminase Elevations:** ALT elevations >5× ULN occurred in 1.8% of LIG-2847-treated patients versus 0.4% in control arms. The median time to onset was 8.2 weeks (range: 2-24 weeks) [see Adverse Reactions (6.1)].

### Monitoring Requirements

Perform hepatic function tests (ALT, AST, total bilirubin, and alkaline phosphatase) prior to initiating LIG-2847, monthly for the first 3 months, and periodically thereafter.

### Dose Modification

- **ALT/AST >3× to ≤5× ULN without bilirubin elevation:** Continue LIG-2847 with weekly hepatic monitoring. If persistent for >2 weeks, withhold until resolution to ≤3× ULN.
- **ALT/AST >5× ULN or ALT/AST >3× ULN with bilirubin >2× ULN:** Permanently discontinue LIG-2847 [see Dosage and Administration (2.3)].

### Risk Factors

Higher risk of hepatotoxicity was observed in patients with baseline ALT above ULN, concurrent statin use, and body weight exceeding 100 kg. LIG-2847 is contraindicated in patients with baseline transaminases >5× ULN [see Contraindications (4)].`,
  },

  // ---- Default fallback for any section type ----
  {
    category: 'default',
    sectionPattern: '.*',
    wordCount: 300,
    content: `## Section Content

### Overview

This section presents the relevant data and analyses in accordance with applicable ICH guidelines and regional regulatory requirements. The content has been prepared following AMA 11th Edition style conventions with appropriate citations to source documentation.

### Key Findings

The data presented in this section are derived from the comprehensive development program for LIG-2847. Results are presented for the intent-to-treat population unless otherwise specified.

The primary analysis demonstrated statistically significant results favoring the treatment arm across the pre-specified endpoints. The findings were consistent across demographic subgroups and sensitivity analyses, supporting the robustness of the primary conclusions [Source: Clinical Study Report, Section 11.1].

### Methodology

The analytical methods employed in this section follow established regulatory science principles. Statistical analyses were performed in accordance with the pre-specified Statistical Analysis Plan (SAP), with any post-hoc analyses clearly identified. All tables and figures referenced herein are presented in the corresponding appendices.

[Table X.1: Summary of Key Results]

### Discussion

The results presented in this section should be interpreted in the context of the overall benefit-risk assessment for LIG-2847. The magnitude of treatment effect, consistency of results across endpoints, and the manageable safety profile collectively support a favorable benefit-risk determination for the proposed indication.

Cross-references to related sections are provided where applicable to ensure comprehensive review of the integrated evidence base. Additional supporting data are available in the relevant appendices of the Common Technical Document.`,
  },
];

// =============================================================================
// CONTENT LOOKUP
// =============================================================================

/**
 * Get the best matching fallback content for a given document type and section.
 */
export function getFallbackContent(
  documentType: string,
  sectionNumber: string,
  sectionTitle: string
): FallbackContentEntry {
  const docLower = documentType.toLowerCase();
  const sectionLower = sectionNumber.toLowerCase();
  const titleLower = sectionTitle.toLowerCase();

  // Determine category (order matters: check specific before general)
  let category = 'default';
  if (docLower.includes('haq') || docLower.includes('ir-response') || titleLower.includes('haq') || titleLower.includes('information request')) {
    category = 'haq-response';
  } else if (docLower.includes('nonclinical') || sectionLower.startsWith('2.4') || sectionLower.startsWith('2.6') || sectionLower.startsWith('4.')) {
    category = 'nonclinical';
  } else if (docLower.includes('csr') || docLower.includes('clinical') || sectionLower.startsWith('11') || sectionLower.startsWith('12') || sectionLower.startsWith('2.7')) {
    category = 'clinical';
  } else if (docLower.includes('module-32') || docLower.includes('qos') || sectionLower.startsWith('3.2')) {
    category = 'quality-cmc';
  } else if (docLower.includes('dsur') || docLower.includes('pbrer') || docLower.includes('psur')) {
    category = 'safety-aggregate';
  } else if ((docLower.includes('uspi') || docLower.includes('prescribing') || docLower.includes('labeling')) && (sectionLower.startsWith('5') || titleLower.includes('warning'))) {
    category = 'labeling-warning';
  } else if (docLower.includes('uspi') || docLower.includes('prescribing') || docLower.includes('labeling')) {
    category = 'labeling-us';
  }

  // Find best match within category
  const categoryMatches = FALLBACK_CONTENT.filter(e => e.category === category);
  
  for (const entry of categoryMatches) {
    const pattern = new RegExp(entry.sectionPattern, 'i');
    if (pattern.test(sectionLower) || pattern.test(titleLower)) {
      return entry;
    }
  }

  // Fall back to first entry in category, then default
  if (categoryMatches.length > 0) {
    return categoryMatches[0];
  }

  return FALLBACK_CONTENT[FALLBACK_CONTENT.length - 1]; // default entry
}

// =============================================================================
// STREAMING SIMULATION
// =============================================================================

/**
 * Simulate Claude-style streaming by delivering pre-generated content token-by-token.
 * Tokens are split at word boundaries for natural reading pacing.
 */
export async function simulateStreaming(
  content: string,
  callbacks: StreamSimulationCallbacks,
  options: StreamSimulationOptions = {}
): Promise<void> {
  const {
    tokenDelayMs = 15,
    jitterMs = 10,
    connectDelayMs = 800,
    signal,
  } = options;

  // Simulate connection delay
  await delay(connectDelayMs, signal);

  // Split content into tokens (words + punctuation, preserving whitespace)
  const tokens = tokenize(content);
  let fullContent = '';

  for (let i = 0; i < tokens.length; i++) {
    if (signal?.aborted) {
      return;
    }

    const token = tokens[i];
    fullContent += token;
    callbacks.onToken(token);

    // Variable delay: faster for whitespace, slower for paragraph breaks
    let delayMs = tokenDelayMs + Math.random() * jitterMs;
    if (token === '\n\n') {
      delayMs = 80 + Math.random() * 40; // Paragraph break pause
    } else if (token === '\n') {
      delayMs = 30 + Math.random() * 20; // Line break pause
    } else if (token.startsWith('#')) {
      delayMs = 50 + Math.random() * 30; // Header pause
    }

    await delay(delayMs, signal);
  }

  callbacks.onComplete(fullContent);
}

/**
 * Tokenize content into streaming-friendly chunks.
 * Preserves markdown formatting by keeping headers, newlines, and
 * punctuation attached to their words.
 */
export function tokenize(content: string): string[] {
  const tokens: string[] = [];
  // Split on word boundaries while preserving whitespace and markdown
  const parts = content.split(/(\s+|\n+|#{1,4}\s|[*_`\[\]():|])/);
  
  let buffer = '';
  for (const part of parts) {
    if (part === '') continue;
    
    // Newlines are always their own token
    if (/^\n+$/.test(part)) {
      if (buffer) {
        tokens.push(buffer);
        buffer = '';
      }
      tokens.push(part);
      continue;
    }
    
    // Whitespace: flush buffer with whitespace attached
    if (/^\s+$/.test(part)) {
      if (buffer) {
        tokens.push(buffer + part);
        buffer = '';
      } else {
        tokens.push(part);
      }
      continue;
    }
    
    // Everything else accumulates
    buffer += part;
  }
  
  if (buffer) {
    tokens.push(buffer);
  }
  
  return tokens.filter(t => t.length > 0);
}

// =============================================================================
// FALLBACK DETECTION
// =============================================================================

/**
 * Check if the section generation API is available.
 * Returns true if the health endpoint responds with 'ready' status.
 */
export async function isAIAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/ai/section-generate', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ready';
  } catch {
    return false;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export { FALLBACK_CONTENT };
