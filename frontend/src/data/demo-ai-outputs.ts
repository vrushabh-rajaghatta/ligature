// ============================================================================
// Demo AI Outputs - v76: Pre-generated Golden Responses for Nexavant
// High-quality AI outputs that showcase platform capabilities without API calls
// ============================================================================

import { GOLDEN_PATH_PRODUCT, GOLDEN_PATH_TEAM, GOLDEN_PATH_TIMELINE } from './golden-path-data'

// ============================================================================
// HAQ RESPONSE DEMOS
// ============================================================================

export interface DemoHAQResponse {
  id: string
  questionNumber: string
  questionText: string
  discipline: string
  agency: string
  generatedResponse: string
  qualityScore: number
  citations: { source: string; section: string }[]
  wordCount: number
  generationTimeMs: number
}

export const DEMO_HAQ_RESPONSES: DemoHAQResponse[] = [
  {
    id: 'demo-haq-cmc-001',
    questionNumber: 'CMC-001',
    questionText: 'Please provide a comprehensive description of the control strategy for the drug substance, including critical quality attributes, in-process controls, and release specifications.',
    discipline: 'CMC',
    agency: 'FDA',
    generatedResponse: `The control strategy for ligrastinib drug substance is designed as a comprehensive, risk-based approach that integrates critical quality attribute (CQA) control across the manufacturing process, ensuring consistent product quality and patient safety.

**Critical Quality Attributes**

The CQAs for ligrastinib drug substance were identified through a systematic risk assessment process incorporating prior knowledge, development studies, and process characterization data:

• Assay (98.0-102.0% w/w): Ensures therapeutic efficacy and batch-to-batch consistency
• Organic impurities: Individual ≤0.15%, Total ≤0.5%: Controls process-related and degradation impurities
• Residual solvents: Class 2 solvents within ICH Q3C limits: Ensures patient safety
• Particle size distribution (D90 ≤50 μm): Critical for dissolution and bioavailability
• Polymorphic form (Form I): Ensures consistent physicochemical properties
• Water content (≤0.5% w/w): Maintains chemical stability

**In-Process Controls**

The manufacturing process incorporates in-process controls at critical steps:

Step 2 (Coupling Reaction): Temperature maintained at 65±5°C; reaction completion monitored by HPLC (≥98.5% conversion)
Step 4 (Crystallization): Controlled cooling rate of 0.5°C/min; seed crystal addition at 45°C
Step 5 (Filtration/Washing): Wash volume standardized at 3× cake volume; residual solvent monitoring
Step 6 (Drying): LOD endpoint ≤0.5%; polymorphic form confirmed by XRPD

**Release Specifications**

The release specifications reflect the CQA acceptance criteria and are derived from process capability and clinical experience:

| Test | Method | Acceptance Criteria |
|------|--------|---------------------|
| Appearance | Visual | White to off-white crystalline powder |
| Identity | IR, HPLC | Conforms to reference |
| Assay | HPLC | 98.0-102.0% |
| Organic Impurities | HPLC | Individual ≤0.15%, Total ≤0.5% |
| Residual Solvents | GC | Per ICH Q3C |
| Water Content | KF | ≤0.5% |
| Particle Size | Laser Diffraction | D90 ≤50 μm |
| Polymorphic Form | XRPD | Form I |

**Lifecycle Management**

The control strategy incorporates continuous process verification through annual product reviews and ongoing stability monitoring, enabling proactive identification of any trends that may impact product quality.`,
    qualityScore: 94,
    citations: [
      { source: 'Module 3.2.S.2.4', section: 'Controls of Critical Steps and Intermediates' },
      { source: 'ICH Q8(R2)', section: 'Pharmaceutical Development' },
      { source: 'ICH Q10', section: 'Pharmaceutical Quality System' },
      { source: 'Module 3.2.S.4.1', section: 'Specification' },
    ],
    wordCount: 412,
    generationTimeMs: 3247,
  },
  {
    id: 'demo-haq-clinical-001',
    questionNumber: 'CLIN-003',
    questionText: 'The analysis of the primary endpoint in Study LIG-301 used a stratified log-rank test. Please clarify the stratification factors used and provide the rationale for their selection.',
    discipline: 'Clinical',
    agency: 'FDA',
    generatedResponse: `The primary efficacy analysis in Study LIG-301 (STELLAR) employed a stratified log-rank test for the comparison of progression-free survival (PFS) between ligrastinib and docetaxel. The stratification factors were pre-specified in the statistical analysis plan and aligned with the randomization stratification.

**Stratification Factors**

Three stratification factors were used in the primary analysis:

1. **ECOG Performance Status (0 vs. 1)**
   Rationale: ECOG PS is a well-established prognostic factor in advanced NSCLC. Patients with ECOG PS 0 consistently demonstrate better outcomes across treatment modalities. The STELLAR trial enrolled patients with ECOG 0-1, and this factor was included to ensure balance in baseline performance status between treatment arms.

2. **Prior Lines of Therapy (1 vs. 2)**
   Rationale: The number of prior systemic therapies is prognostic for outcomes in second-line and beyond NSCLC. Patients with only one prior line of therapy typically have better prognosis than those with two prior lines. This stratification ensured balanced representation of treatment history.

3. **Geographic Region (North America/Europe vs. Asia-Pacific vs. Rest of World)**
   Rationale: Regional differences in NSCLC biology, particularly the higher prevalence of EGFR mutations in Asian populations, may influence treatment response. Additionally, regional differences in standard of care and supportive care practices warranted this stratification.

**Implementation**

Randomization was performed using an interactive web response system (IWRS) with a 1:1 allocation ratio and permuted blocks within each stratum. The same stratification factors were applied in the primary analysis to maintain consistency with the randomization procedure and maximize statistical efficiency.

**Sensitivity Analyses**

To assess the robustness of the primary analysis, unstratified analyses and analyses using alternative stratification schemes were conducted as sensitivity analyses. Results were consistent across all approaches, supporting the validity of the primary efficacy conclusions.

The stratification approach follows FDA guidance on statistical principles for clinical trials and is consistent with the methodologies employed in other registrational trials in advanced NSCLC.`,
    qualityScore: 96,
    citations: [
      { source: 'Study LIG-301 Protocol', section: 'Section 9.4 Statistical Methods' },
      { source: 'Statistical Analysis Plan v2.0', section: 'Section 5.1 Primary Analysis' },
      { source: 'FDA Guidance', section: 'E9 Statistical Principles for Clinical Trials' },
      { source: 'Module 5.3.5.1', section: 'Study Report Section 11.1' },
    ],
    wordCount: 324,
    generationTimeMs: 2891,
  },
  {
    id: 'demo-haq-safety-001',
    questionNumber: 'SAFE-007',
    questionText: 'Please provide additional characterization of the hepatotoxicity signal observed in the clinical program, including time to onset, reversibility, and any identified risk factors.',
    discipline: 'Safety',
    agency: 'FDA',
    generatedResponse: `A comprehensive characterization of hepatotoxicity events across the ligrastinib clinical development program has been conducted. The following summarizes the key findings regarding time to onset, reversibility, and identified risk factors.

**Time to Onset**

Analysis of 47 hepatotoxicity events (ALT >3× ULN) across the clinical program revealed the following onset distribution:

• Median time to onset: 42 days (range: 14-127 days)
• First quartile (Q1): 28 days
• Third quartile (Q3): 63 days
• 85% of events occurred within the first 12 weeks of treatment

This pattern suggests that hepatotoxicity is predominantly an early-onset adverse reaction, supporting the recommendation for more frequent liver function monitoring during the initial treatment period.

**Reversibility**

Of the 47 hepatotoxicity events:

• 42 patients (89%) achieved resolution to ≤Grade 1 or baseline
• Median time to resolution: 21 days (range: 7-56 days)
• 38 patients (81%) resolved with dose interruption alone
• 4 patients (9%) required dose reduction
• 5 patients (11%) discontinued due to hepatotoxicity; all resolved following discontinuation

No cases of acute liver failure, Hy's Law cases, or hepatic-related deaths were observed in the clinical program.

**Risk Factors**

Multivariate logistic regression analysis identified the following potential risk factors:

| Risk Factor | Odds Ratio | 95% CI | p-value |
|-------------|------------|--------|---------|
| Baseline ALT >ULN | 2.8 | 1.4-5.6 | 0.004 |
| Age ≥65 years | 1.9 | 1.1-3.4 | 0.028 |
| Concomitant CYP3A4 inhibitors | 2.1 | 1.0-4.3 | 0.047 |
| Hepatic metastases | 1.6 | 0.9-2.9 | 0.112 |

**Risk Mitigation**

Based on these findings, the proposed labeling includes:
• Liver function test monitoring at baseline, every 2 weeks for the first 3 months, then monthly
• Dose modification guidance for ALT/AST elevations
• Contraindication in patients with baseline ALT/AST >3× ULN
• Warning regarding concomitant use of strong CYP3A4 inhibitors

These risk mitigation measures are reflected in the proposed Risk Evaluation and Mitigation Strategy (REMS) materials.`,
    qualityScore: 95,
    citations: [
      { source: 'Integrated Summary of Safety', section: 'Section 7.3.2 Hepatotoxicity' },
      { source: 'Module 2.7.4', section: 'Summary of Clinical Safety' },
      { source: 'Proposed USPI', section: 'Warnings and Precautions 5.2' },
      { source: 'REMS Materials', section: 'Healthcare Provider Letter' },
    ],
    wordCount: 378,
    generationTimeMs: 3102,
  },
  // v77: Additional golden outputs for expanded demo coverage
  {
    id: 'demo-haq-nonclin-001',
    questionNumber: 'NONCLIN-002',
    questionText: 'Please provide the results of the in vitro BCRP and P-gp transporter studies and discuss the clinical relevance of any inhibition observed.',
    discipline: 'Nonclinical',
    agency: 'FDA',
    generatedResponse: `Comprehensive in vitro transporter studies were conducted to evaluate the interaction potential of ligrastinib with breast cancer resistance protein (BCRP/ABCG2) and P-glycoprotein (P-gp/ABCB1).

**BCRP Inhibition Studies**

Using BCRP-overexpressing MDCKII cells with mitoxantrone as the probe substrate:

| Concentration | % Inhibition | IC50 |
|---------------|--------------|------|
| 0.1 μM | 12% | - |
| 1 μM | 34% | - |
| 10 μM | 67% | 4.2 μM |
| 100 μM | 89% | - |

At clinically relevant concentrations (Cmax,u = 0.15 μM), BCRP inhibition was minimal (<15%).

**P-gp Inhibition Studies**

Using P-gp-overexpressing LLC-PK1 cells with digoxin as the probe substrate:

| Concentration | % Inhibition | IC50 |
|---------------|--------------|------|
| 0.1 μM | 8% | - |
| 1 μM | 22% | - |
| 10 μM | 51% | 8.7 μM |
| 100 μM | 78% | - |

**Clinical Relevance Assessment**

Using FDA guidance criteria ([I]/IC50 > 0.1), ligrastinib is unlikely to cause clinically relevant inhibition of either transporter:

• BCRP: Cmax,u/IC50 = 0.15/4.2 = 0.036 (threshold: 0.1)
• P-gp: Cmax,u/IC50 = 0.15/8.7 = 0.017 (threshold: 0.1)

**Recommendation**

Based on these findings, no clinical drug-drug interaction studies are warranted for BCRP or P-gp inhibition by ligrastinib. Labeling will not include transporter inhibition warnings.`,
    qualityScore: 93,
    citations: [
      { source: 'Module 2.6.4', section: 'Pharmacokinetics Written Summary' },
      { source: 'Study Report DS-TRANS-001', section: 'In Vitro Transporter Studies' },
      { source: 'FDA Guidance', section: 'Clinical Drug Interaction Studies' },
    ],
    wordCount: 285,
    generationTimeMs: 2934,
  },
  {
    id: 'demo-haq-labeling-001',
    questionNumber: 'LABEL-004',
    questionText: 'The proposed indication statement includes "locally advanced or metastatic" NSCLC. Please provide data supporting the inclusion of "locally advanced" given that the pivotal trial enrolled only metastatic patients.',
    discipline: 'Labeling',
    agency: 'FDA',
    generatedResponse: `We appreciate the opportunity to address the inclusion of "locally advanced" disease in the proposed indication statement for Nexavant (ligrastinib).

**Clinical Rationale for Inclusion**

While Study LIG-301 (STELLAR) enrolled patients with metastatic disease, clinical and biological rationale supports extrapolation to locally advanced KRAS G12C-positive NSCLC:

1. **Disease Biology**: KRAS G12C mutation status is independent of disease stage. The driver mutation confers sensitivity to targeted inhibition regardless of whether metastatic spread has occurred.

2. **Mechanism of Action**: Ligrastinib's covalent inhibition of KRAS G12C is a systemic, molecular-targeted approach expected to be efficacious in both locally advanced and metastatic settings.

3. **Approved Precedent**: Both sotorasib and adagrasib received indications including "locally advanced" NSCLC based on metastatic-only pivotal trials, establishing regulatory precedent for this approach in the KRAS G12C inhibitor class.

**Supporting Data**

Phase 1/2 Study LIG-101 included 12 patients with locally advanced (Stage IIIB-C) disease not amenable to curative intent treatment:
• ORR: 41.7% (5/12 patients)
• Disease control rate: 83.3% (10/12)
• Median PFS: 7.2 months (95% CI: 4.1-NR)

These results are consistent with outcomes observed in the metastatic population (ORR 43.2% in LIG-301), supporting efficacy extrapolation.

**Proposed Resolution**

We respectfully request retention of "locally advanced or metastatic" in the indication, consistent with the established regulatory approach for this drug class and supported by Phase 1/2 data in locally advanced patients.`,
    qualityScore: 97,
    citations: [
      { source: 'Study LIG-101 CSR', section: 'Section 11.2 Secondary Efficacy Analyses' },
      { source: 'FDA Label Review', section: 'Sotorasib (Lumakras) USPI' },
      { source: 'FDA Label Review', section: 'Adagrasib (Krazati) USPI' },
      { source: 'Module 2.5.4', section: 'Overview of Efficacy' },
    ],
    wordCount: 298,
    generationTimeMs: 2788,
  },
  {
    id: 'demo-haq-ema-001',
    questionNumber: 'EMA-QOS-001',
    questionText: 'Please clarify the proposed shelf life for the drug product and provide supporting stability data, including stress testing results.',
    discipline: 'CMC',
    agency: 'EMA',
    generatedResponse: `The proposed shelf life for Nexavant (ligrastinib) 25 mg and 100 mg film-coated tablets is 36 months when stored below 25°C in the original packaging.

**Long-Term Stability Data**

Primary stability studies were conducted under ICH conditions (25°C/60% RH) with three production-scale batches:

| Time Point | Assay (%) | Total Impurities (%) | Dissolution (%) |
|------------|-----------|---------------------|-----------------|
| Initial | 100.2 | 0.18 | 98 |
| 6 months | 99.8 | 0.22 | 97 |
| 12 months | 99.5 | 0.28 | 96 |
| 24 months | 99.1 | 0.35 | 95 |
| 36 months | 98.6 | 0.42 | 93 |

All parameters remained within specification throughout the 36-month study period. Statistical analysis projects that specifications will be met for at least 48 months.

**Accelerated Stability (40°C/75% RH)**

| Time Point | Assay (%) | Total Impurities (%) |
|------------|-----------|---------------------|
| Initial | 100.2 | 0.18 |
| 3 months | 98.9 | 0.38 |
| 6 months | 98.1 | 0.51 |

Results comply with ICH Q1E criteria, supporting extrapolation beyond available long-term data.

**Stress Testing Results**

| Condition | Duration | Assay Change | Primary Degradant |
|-----------|----------|--------------|-------------------|
| Heat (60°C) | 7 days | -2.3% | Oxidative impurity A |
| Humidity (75% RH) | 7 days | -0.8% | None significant |
| Light (ICH) | 1.2M lux-hr | -1.1% | Photolytic impurity B |
| Acid (0.1N HCl) | 24 hr | -4.2% | Hydrolytic impurity C |
| Base (0.1N NaOH) | 24 hr | -5.8% | Hydrolytic impurity C |
| Oxidation (3% H2O2) | 24 hr | -8.1% | Oxidative impurity A |

The drug product demonstrates acceptable stability under all ICH-mandated conditions.`,
    qualityScore: 94,
    citations: [
      { source: 'Module 3.2.P.8.1', section: 'Stability Summary' },
      { source: 'Module 3.2.P.8.3', section: 'Stability Data' },
      { source: 'ICH Q1A(R2)', section: 'Stability Testing Guidelines' },
    ],
    wordCount: 324,
    generationTimeMs: 3156,
  },
]

// ============================================================================
// SAFETY NARRATIVE DEMOS
// ============================================================================

export interface DemoSafetyNarrative {
  id: string
  caseNumber: string
  event: string
  narrative: string
  format: 'E2B' | 'CIOMS' | 'MedWatch'
  flags: string[]
  wordCount: number
  generationTimeMs: number
}

export const DEMO_SAFETY_NARRATIVES: DemoSafetyNarrative[] = [
  {
    id: 'demo-narrative-001',
    caseNumber: 'US-LIG-2024-00847',
    event: 'Hepatotoxicity',
    narrative: `This spontaneous case was reported by a healthcare professional and concerns a 67-year-old male patient who experienced hepatotoxicity while receiving Nexavant (ligrastinib) for KRAS G12C-positive non-small cell lung cancer.

CASE NARRATIVE:

The patient initiated treatment with Nexavant 100 mg once daily on 15-SEP-2024 for second-line treatment of metastatic NSCLC following progression on pembrolizumab plus carboplatin/pemetrexed. Relevant medical history included type 2 diabetes mellitus, hypertension, and hepatic steatosis (diagnosed 2019). Concomitant medications included metformin, lisinopril, and atorvastatin.

On 28-OCT-2024 (Day 43 of treatment), routine laboratory monitoring revealed elevated liver enzymes: ALT 287 U/L (5.7× ULN), AST 198 U/L (4.0× ULN), total bilirubin 1.1 mg/dL (within normal limits), and ALP 142 U/L (1.2× ULN). The patient was asymptomatic without jaundice, abdominal pain, or other clinical manifestations of hepatic dysfunction.

Nexavant was interrupted on 29-OCT-2024. Follow-up laboratory tests on 05-NOV-2024 showed improvement: ALT 156 U/L (3.1× ULN), AST 98 U/L (2.0× ULN). The patient remained asymptomatic throughout.

On 12-NOV-2024, laboratory values had normalized: ALT 42 U/L, AST 38 U/L. Nexavant was restarted at a reduced dose of 80 mg once daily on 14-NOV-2024. As of the most recent follow-up (05-DEC-2024), liver function tests remained within normal limits and the patient continues on reduced-dose therapy without recurrence.

CAUSALITY ASSESSMENT:

The reporting healthcare professional assessed the hepatotoxicity as probably related to Nexavant based on:
• Temporal relationship (onset during treatment)
• Positive dechallenge (resolution upon discontinuation)
• Known hepatotoxicity risk with Nexavant
• Absence of alternative explanations

COMPANY ASSESSMENT:

Based on available information, the company considers the event probably related to Nexavant. The case is being expedited as it represents an unlabeled serious adverse event.`,
    format: 'E2B',
    flags: ['Expedited reporting required', 'Unlabeled event', 'Positive dechallenge'],
    wordCount: 312,
    generationTimeMs: 2456,
  },
  {
    id: 'demo-narrative-002',
    caseNumber: 'US-LIG-2024-00923',
    event: 'Interstitial Lung Disease',
    narrative: `This serious case was reported by an investigator in Study LIG-301 (STELLAR) and concerns a 58-year-old female patient who developed interstitial lung disease (ILD) while participating in the randomized Phase 3 trial.

CASE NARRATIVE:

The patient was randomized to receive Nexavant (ligrastinib) 100 mg once daily on 02-AUG-2024 for second-line treatment of KRAS G12C-positive metastatic NSCLC. Baseline chest CT showed stable lung metastases with no evidence of pre-existing interstitial changes. Medical history was significant for former smoking (20 pack-years, quit 2018) and prior radiation therapy to the right lower lobe (2023).

On 18-OCT-2024 (Day 77), the patient presented with progressive dyspnea on exertion and non-productive cough over the preceding 2 weeks. Physical examination revealed bilateral fine inspiratory crackles. Oxygen saturation was 92% on room air.

High-resolution CT performed on 19-OCT-2024 demonstrated new bilateral ground-glass opacities with a peripheral and basilar predominant pattern, consistent with drug-induced ILD. Pulmonary function tests showed reduced DLCO (58% predicted).

Nexavant was permanently discontinued on 19-OCT-2024. The patient was initiated on prednisone 1 mg/kg daily. Bronchoscopy with bronchoalveolar lavage was performed on 22-OCT-2024; cytology showed lymphocytic predominance without evidence of infection or malignant cells. Infectious workup was negative.

The patient showed gradual improvement with corticosteroid therapy. Follow-up CT on 15-NOV-2024 demonstrated significant resolution of ground-glass opacities. Prednisone is being tapered. As of the most recent assessment (10-DEC-2024), the patient's dyspnea has improved and oxygen saturation is 96% on room air.

CAUSALITY ASSESSMENT:

The investigator assessed the ILD as related to study drug based on the typical radiographic pattern, temporal relationship, negative infectious workup, and response to corticosteroids.

REGULATORY REPORTING:

This case meets criteria for expedited reporting as a serious, unexpected adverse drug reaction.`,
    format: 'E2B',
    flags: ['Expedited reporting required', 'SAE from clinical trial', 'Study unblinded'],
    wordCount: 298,
    generationTimeMs: 2234,
  },
]

// ============================================================================
// DOCUMENT SECTION DEMOS
// ============================================================================

export interface DemoDocumentSection {
  id: string
  documentType: string
  sectionNumber: string
  sectionTitle: string
  content: string
  placeholders: { id: string; description: string }[]
  citations: { source: string; section: string }[]
  wordCount: number
  generationTimeMs: number
}

export const DEMO_DOCUMENT_SECTIONS: DemoDocumentSection[] = [
  {
    id: 'demo-section-efficacy',
    documentType: 'CSR',
    sectionNumber: '11.1',
    sectionTitle: 'Primary Efficacy Endpoint',
    content: `## 11.1 Primary Efficacy Endpoint

### 11.1.1 Analysis of Progression-Free Survival

The primary efficacy endpoint was progression-free survival (PFS), defined as the time from randomization to the first documented disease progression per RECIST v1.1 as assessed by blinded independent central review (BICR), or death from any cause, whichever occurred first.

**Primary Analysis Results**

The primary analysis was conducted after 287 PFS events had occurred (data cutoff: 20-JAN-2025). The study met its primary endpoint, demonstrating a statistically significant improvement in PFS for patients treated with ligrastinib compared to docetaxel.

[TABLE: Primary PFS Analysis - Intent-to-Treat Population]

| Parameter | Ligrastinib (N=285) | Docetaxel (N=284) |
|-----------|---------------------|-------------------|
| Number of events, n (%) | 142 (49.8) | 178 (62.7) |
| Median PFS, months (95% CI) | 7.4 (6.2, 8.8) | 4.1 (3.5, 4.8) |
| Hazard ratio (95% CI) | 0.52 (0.42, 0.65) | — |
| p-value (stratified log-rank) | <0.0001 | — |

The hazard ratio of 0.52 represents a 48% reduction in the risk of disease progression or death for patients receiving ligrastinib compared to docetaxel. The Kaplan-Meier curves demonstrated early and sustained separation between treatment arms [Figure 11.1.1].

[FIGURE PLACEHOLDER: Figure 11.1.1 - Kaplan-Meier Plot of Progression-Free Survival (ITT Population)]

**Consistency of Treatment Effect**

Pre-specified subgroup analyses demonstrated consistent PFS benefit across all evaluated subgroups, including:

• ECOG performance status (0 vs. 1)
• Number of prior therapies (1 vs. 2)
• Geographic region
• Age (<65 vs. ≥65 years)
• Sex
• CNS metastases at baseline (yes vs. no)

Forest plot analysis [Figure 11.1.2] showed hazard ratios favoring ligrastinib across all subgroups, with no significant treatment-by-subgroup interactions (all p-values >0.10).

[FIGURE PLACEHOLDER: Figure 11.1.2 - Forest Plot of PFS by Subgroup (ITT Population)]

### 11.1.2 Sensitivity Analyses

Multiple sensitivity analyses supported the robustness of the primary PFS result:

**Investigator-Assessed PFS:** Median 7.1 months vs. 3.9 months; HR 0.54 (95% CI: 0.43, 0.67)

**Unstratified Analysis:** HR 0.53 (95% CI: 0.43, 0.66); p<0.0001

**Per-Protocol Population:** HR 0.50 (95% CI: 0.40, 0.63); p<0.0001

All sensitivity analyses were consistent with the primary analysis, confirming the significant PFS benefit of ligrastinib over docetaxel.`,
    placeholders: [
      { id: 'fig-11-1-1', description: 'Kaplan-Meier Plot of Progression-Free Survival' },
      { id: 'fig-11-1-2', description: 'Forest Plot of PFS by Subgroup' },
    ],
    citations: [
      { source: 'Study LIG-301 Database', section: 'Efficacy Analysis Dataset' },
      { source: 'Statistical Analysis Plan v2.0', section: 'Section 5' },
      { source: 'BICR Charter', section: 'RECIST v1.1 Assessment' },
    ],
    wordCount: 425,
    generationTimeMs: 4156,
  },
  {
    id: 'demo-section-clinical-overview',
    documentType: 'Module 2.5',
    sectionNumber: '2.5.4',
    sectionTitle: 'Overview of Efficacy',
    content: `## 2.5.4 Overview of Efficacy

### Clinical Efficacy Summary

The efficacy of ligrastinib in patients with KRAS G12C-positive non-small cell lung cancer (NSCLC) who have received prior systemic therapy has been established based on data from one pivotal Phase 3 randomized controlled trial (Study LIG-301, STELLAR) and supportive data from the Phase 1/2 dose-escalation and expansion study (Study LIG-101).

### Pivotal Study LIG-301 (STELLAR)

Study LIG-301 was a multinational, randomized, open-label Phase 3 study comparing ligrastinib to docetaxel in patients with locally advanced or metastatic KRAS G12C-positive NSCLC who had progressed following prior platinum-based chemotherapy and anti-PD-(L)1 therapy.

**Primary Endpoint:** The study achieved its primary endpoint, demonstrating statistically significant and clinically meaningful improvement in progression-free survival (PFS). Ligrastinib reduced the risk of disease progression or death by 48% compared to docetaxel (HR 0.52; 95% CI: 0.42, 0.65; p<0.0001). Median PFS was 7.4 months for ligrastinib versus 4.1 months for docetaxel.

**Key Secondary Endpoints:**

*Overall Survival:* At the pre-specified interim analysis (60% information fraction), overall survival showed a favorable trend for ligrastinib (HR 0.71; 95% CI: 0.54, 0.93), though the pre-specified boundary for statistical significance was not crossed. The study continues for final OS analysis.

*Objective Response Rate:* ORR was significantly higher with ligrastinib (43.2%) compared to docetaxel (14.1%), with an odds ratio of 4.6 (95% CI: 3.0, 7.0; p<0.0001).

*Duration of Response:* Median DOR was 8.9 months for ligrastinib versus 4.2 months for docetaxel, indicating durable responses with targeted therapy.

*Patient-Reported Outcomes:* Quality of life assessments (EORTC QLQ-C30, QLQ-LC13) demonstrated maintained or improved symptom control with ligrastinib compared to deterioration with docetaxel.

### Supportive Study LIG-101

The Phase 1/2 study provided confirmatory evidence of ligrastinib activity in the target population. In the expansion cohort of 89 patients with KRAS G12C-positive NSCLC, ORR was 41.6% (95% CI: 31.2, 52.5) with median DOR of 10.2 months.

### Benefit-Risk Conclusion

The totality of efficacy evidence supports a favorable benefit-risk profile for ligrastinib in the proposed indication. The magnitude of PFS improvement (HR 0.52), response rate advantage, durable responses, and maintained quality of life collectively establish ligrastinib as a meaningful therapeutic advance for patients with KRAS G12C-positive NSCLC.`,
    placeholders: [],
    citations: [
      { source: 'Study LIG-301 CSR', section: 'Section 11 Efficacy Evaluation' },
      { source: 'Study LIG-101 CSR', section: 'Section 11 Efficacy Evaluation' },
      { source: 'Integrated Summary of Efficacy', section: 'Executive Summary' },
    ],
    wordCount: 398,
    generationTimeMs: 3892,
  },
]

// ============================================================================
// SIGNAL SUMMARY DEMOS
// ============================================================================

export interface DemoSignalSummary {
  id: string
  signalId: string
  signalName: string
  summary: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low'
  recommendedActions: string[]
  wordCount: number
  generationTimeMs: number
}

export const DEMO_SIGNAL_SUMMARIES: DemoSignalSummary[] = [
  {
    id: 'demo-signal-001',
    signalId: 'SIG-2024-001',
    signalName: 'Hepatotoxicity Signal',
    summary: `**Signal Evaluation Summary: Hepatotoxicity**

**Signal Overview**

A potential signal for hepatotoxicity with Nexavant (ligrastinib) was identified through routine pharmacovigilance activities. The signal was detected via disproportionality analysis of spontaneous reports in the global safety database, with a Proportional Reporting Ratio (PRR) of 3.2 (95% CI: 2.1-4.8) for the MedDRA Preferred Term "Hepatotoxicity."

**Case Series Analysis**

As of the data lock point (01-DEC-2024), 47 cases of hepatotoxicity have been identified:
• Clinical trial cases: 32 (68%)
• Post-marketing cases: 15 (32%)
• Serious cases: 28 (60%)
• Median time to onset: 42 days (range: 14-127 days)
• Resolution rate: 89% (with dose interruption or discontinuation)

No fatal outcomes or cases meeting Hy's Law criteria have been observed.

**Mechanism Assessment**

The hepatotoxicity signal is biologically plausible given:
1. KRAS signaling involvement in hepatocyte proliferation and stress response
2. Hepatic metabolism via CYP3A4 with potential for reactive metabolite formation
3. Class effect observed with other covalent KRAS G12C inhibitors

**Comparative Context**

The hepatotoxicity signal with ligrastinib appears comparable to or lower than that observed with approved KRAS G12C inhibitors sotorasib and adagrasib:
• Ligrastinib: Grade ≥3 ALT elevation 8.4%
• Sotorasib (USPI): Grade ≥3 ALT elevation 11%
• Adagrasib (USPI): Grade ≥3 ALT elevation 9.7%

**Conclusions**

The hepatotoxicity signal is confirmed and adequately characterized. The risk is manageable with appropriate monitoring and dose modification guidance. Current labeling proposals appropriately reflect this identified risk.`,
    riskLevel: 'medium',
    recommendedActions: [
      'Maintain current hepatic monitoring recommendations in labeling',
      'Include hepatotoxicity in Warnings and Precautions',
      'Continue enhanced monitoring in post-marketing safety surveillance',
      'Include in PSUR/PBRER signal section as closed signal',
    ],
    wordCount: 287,
    generationTimeMs: 2678,
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getDemoHAQResponse(id: string): DemoHAQResponse | undefined {
  return DEMO_HAQ_RESPONSES.find(r => r.id === id)
}

export function getDemoHAQResponseByQuestion(questionNumber: string): DemoHAQResponse | undefined {
  return DEMO_HAQ_RESPONSES.find(r => r.questionNumber === questionNumber)
}

export function getDemoSafetyNarrative(caseNumber: string): DemoSafetyNarrative | undefined {
  return DEMO_SAFETY_NARRATIVES.find(n => n.caseNumber === caseNumber)
}

export function getDemoDocumentSection(documentType: string, sectionNumber: string): DemoDocumentSection | undefined {
  return DEMO_DOCUMENT_SECTIONS.find(
    s => s.documentType === documentType && s.sectionNumber === sectionNumber
  )
}

export function getDemoSignalSummary(signalId: string): DemoSignalSummary | undefined {
  return DEMO_SIGNAL_SUMMARIES.find(s => s.signalId === signalId)
}

// ============================================================================
// STREAMING SIMULATION
// ============================================================================

export interface StreamingConfig {
  wordsPerSecond: number
  variability: number // 0-1, adds randomness to timing
}

const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  wordsPerSecond: 25,
  variability: 0.3,
}

export function simulateStreaming(
  content: string,
  onToken: (token: string, position: number) => void,
  onComplete: () => void,
  config: StreamingConfig = DEFAULT_STREAMING_CONFIG
): () => void {
  const words = content.split(/(\s+)/)
  let position = 0
  let wordIndex = 0
  let cancelled = false
  
  const baseDelay = 1000 / config.wordsPerSecond
  
  function emitNextWord() {
    if (cancelled || wordIndex >= words.length) {
      if (!cancelled) onComplete()
      return
    }
    
    const word = words[wordIndex]
    position += word.length
    onToken(word, position)
    wordIndex++
    
    // Add variability to timing
    const variance = baseDelay * config.variability * (Math.random() - 0.5) * 2
    const delay = Math.max(10, baseDelay + variance)
    
    setTimeout(emitNextWord, delay)
  }
  
  // Start streaming
  setTimeout(emitNextWord, 100)
  
  // Return cancel function
  return () => {
    cancelled = true
  }
}
