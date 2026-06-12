// Sample ViewerDocument data for demo purposes
import { ViewerDocument, ViewerSection } from '@/store/useDocumentViewerStore';

// Helper to create section content
const createSection = (
  id: string,
  number: string,
  title: string,
  level: number,
  content: string,
  subsections?: ViewerSection[]
): ViewerSection => ({
  id,
  number,
  title,
  level,
  content,
  wordCount: content.split(/\s+/).length,
  subsections,
});

// Clinical Study Report for LIG-2847 (Nexavant)
export const sampleCSRDocument: ViewerDocument = {
  id: 'doc-csr-lig2847',
  title: 'Clinical Study Report: LIG-301 - Phase 3 Study of Nexavant in Advanced NSCLC',
  shortTitle: 'CSR LIG-301',
  documentType: 'Clinical Study Report',
  version: '2.0',
  status: 'Final',
  author: 'Dr. Sarah Chen',
  lastModified: '2024-12-15T10:30:00Z',
  productName: 'Nexavant (LIG-2847)',
  studyName: 'LIG-301',
  ctdSection: '5.3.5',
  wordCount: 45230,
  pageCount: 156,
  sections: [
    createSection('sec-1', '1', 'Synopsis', 1, `
      <p><strong>Study Title:</strong> A Randomized, Open-Label, Phase 3 Study Evaluating the Efficacy and Safety of Nexavant (LIG-2847) Compared with Standard of Care Chemotherapy in Patients with Locally Advanced or Metastatic Non-Small Cell Lung Cancer (NSCLC) with EGFR Exon 20 Insertion Mutations</p>
      <p><strong>Protocol Number:</strong> LIG-301-001</p>
      <p><strong>Study Phase:</strong> Phase 3</p>
      <p><strong>Indication:</strong> Non-Small Cell Lung Cancer (NSCLC) with EGFR Exon 20 Insertion Mutations</p>
      <h3>Objectives</h3>
      <p>The primary objective was to evaluate the efficacy of Nexavant compared with standard of care chemotherapy as measured by overall survival (OS). Secondary objectives included progression-free survival (PFS), objective response rate (ORR), duration of response (DOR), and safety.</p>
      <h3>Key Results</h3>
      <p>The study met its primary endpoint with statistically significant improvement in overall survival (HR 0.71; 95% CI: 0.54-0.93; P = 0.012). Median OS was 14.8 months (Nexavant) vs 10.2 months (chemotherapy).</p>
    `),
    createSection('sec-2', '2', 'Introduction', 1, `
      <p>Non-small cell lung cancer (NSCLC) represents approximately 85% of all lung cancer cases. Among patients with NSCLC, approximately 2-3% harbor EGFR exon 20 insertion mutations, associated with poor prognosis and limited response to available EGFR tyrosine kinase inhibitors.</p>
      <p>Nexavant (LIG-2847) is a novel, selective EGFR inhibitor specifically designed to target exon 20 insertion mutations while minimizing activity against wild-type EGFR, thereby reducing off-target toxicities commonly seen with other EGFR inhibitors.</p>
    `, [
      createSection('sec-2-1', '2.1', 'Study Rationale', 2, `
        <p>Current treatment options for patients with EGFR exon 20 insertion mutations are limited. First- and second-generation EGFR TKIs (erlotinib, gefitinib, afatinib) show minimal activity against these mutations. Osimertinib demonstrated modest activity but is not specifically designed for exon 20 insertions.</p>
        <p>Preclinical studies demonstrated that Nexavant potently inhibits EGFR exon 20 insertion variants with IC50 values ranging from 1.2 to 8.5 nM while showing 50-fold selectivity over wild-type EGFR.</p>
      `),
      createSection('sec-2-2', '2.2', 'Background', 2, `
        <p>Nexavant was developed using structure-based drug design to optimally position within the altered binding pocket created by exon 20 insertions. Phase 1/2 studies demonstrated promising efficacy with an ORR of 48% and median PFS of 8.3 months, supporting advancement to Phase 3 evaluation.</p>
      `),
    ]),
    createSection('sec-11', '11', 'Efficacy Evaluation', 1, `
      <h3>11.1 Analysis Sets</h3>
      <p>Efficacy analyses were performed on the following populations:</p>
      <ul>
        <li><strong>Intent-to-Treat (ITT) Population:</strong> All randomized subjects receiving at least one dose (N=298).</li>
        <li><strong>Per-Protocol (PP) Population:</strong> ITT subjects completing without major protocol deviations (N=276).</li>
      </ul>
      <h3>11.2 Primary Efficacy Endpoint</h3>
      <p>The primary endpoint was overall survival (OS), analyzed using stratified log-rank test with stratification by ECOG status and prior therapy lines.</p>
      <p>At data cutoff (December 15, 2024), median OS was 14.8 months (95% CI: 12.1-17.5) for Nexavant vs 10.2 months (95% CI: 8.4-12.0) for standard care. HR for OS was 0.71 (95% CI: 0.54-0.93; P = 0.012).</p>
      <p>12-month survival probability: 62.3% (Nexavant) vs 43.1% (control).</p>
      <h3>11.3 Secondary Efficacy Endpoints</h3>
      <p>Progression-free survival: 7.2 months (Nexavant) vs 4.8 months (control); HR 0.58 (P < 0.001).</p>
      <p>Objective response rate: 43.6% (Nexavant) vs 21.5% (control).</p>
    `),
    createSection('sec-12', '12', 'Safety Evaluation', 1, `
      <h3>12.1 Extent of Exposure</h3>
      <p>All 298 randomized subjects received study medication. Nexavant arm (n=150) received 600 mg orally once daily. Control arm (n=148) received investigator's choice docetaxel 75 mg/m² or pemetrexed 500 mg/m² IV every 3 weeks.</p>
      <p>Median exposure: 8.4 months (Nexavant) vs 5.2 months (control). Mean relative dose intensity: 94.2% (Nexavant), 89.7% (chemotherapy).</p>
      <h3>12.2 Overview of Adverse Events</h3>
      <p>Treatment-emergent adverse events (TEAEs) occurred in 94.7% (Nexavant) and 93.9% (control). Most common TEAEs with Nexavant: diarrhea (52.0%), nausea (36.0%), fatigue (32.0%), decreased appetite (22.0%), vomiting (18.0%).</p>
      <p>Grade ≥3 TEAEs: 44.7% (Nexavant) vs 55.4% (chemotherapy).</p>
      <h3>12.3 Hepatotoxicity</h3>
      <p>Hepatic AEs in 15.3% of Nexavant patients. ALT >3× ULN in 8.0%; >5× ULN in 2.7%. All events resolved with dose modification or discontinuation. Median onset: 6 weeks (range 2-14).</p>
    `, [
      createSection('sec-12-4', '12.4', 'Deaths', 2, `
        <p>During the study, 89 deaths occurred in the Nexavant arm and 102 in the control arm. Disease progression was the primary cause in both groups (75 and 88 deaths, respectively). Treatment-related deaths: 2 (Nexavant) and 5 (control).</p>
      `),
      createSection('sec-12-5', '12.5', 'Clinical Laboratory Evaluations', 2, `
        <p>Laboratory abnormalities of clinical significance were monitored throughout. Grade 3/4 neutropenia: 8.0% (Nexavant) vs 32.4% (chemotherapy). Grade 3/4 anemia: 4.0% vs 18.9%. Hepatic transaminase elevations detailed in Section 12.3.</p>
      `),
    ]),
    createSection('sec-13', '13', 'Discussion and Overall Conclusions', 1, `
      <p>This Phase 3 study demonstrated that Nexavant provides statistically significant and clinically meaningful improvement in overall survival compared with standard chemotherapy in patients with advanced NSCLC harboring EGFR exon 20 insertion mutations.</p>
      <p>The 4.6-month improvement in median OS (HR 0.71) represents a substantial advance for this difficult-to-treat population. Secondary endpoints consistently favored Nexavant, with improvements in PFS, ORR, and quality of life measures.</p>
      <p>The safety profile was manageable and consistent with Phase 1/2 findings. Diarrhea was the most common AE but was generally mild-to-moderate and manageable. Importantly, severe hematologic toxicities were substantially lower with Nexavant than with chemotherapy.</p>
      <p>These results support the benefit-risk profile of Nexavant for patients with EGFR exon 20 insertion-positive NSCLC who have limited therapeutic options.</p>
    `),
  ],
};

// Module 2.7 Clinical Summary
export const sampleModule27Document: ViewerDocument = {
  id: 'doc-m27-lig2847',
  title: 'Module 2.7 Clinical Summary - Nexavant (LIG-2847)',
  shortTitle: 'M2.7 Clinical Summary',
  documentType: 'Module 2.7',
  version: '1.0',
  status: 'Draft',
  author: 'Jennifer Park',
  lastModified: '2024-12-18T14:22:00Z',
  productName: 'Nexavant (LIG-2847)',
  ctdSection: '2.7',
  wordCount: 28450,
  pageCount: 98,
  sections: [
    createSection('m27-1', '2.7.1', 'Summary of Biopharmaceutic Studies', 1, `
      <p>Nexavant (LIG-2847) is administered as an oral tablet formulation. Biopharmaceutic studies characterized the absorption, bioavailability, and food effect for the proposed commercial formulation.</p>
      <h3>Absolute Bioavailability</h3>
      <p>Absolute bioavailability was determined in a crossover study (LIG-101) comparing oral tablet to IV administration. Mean absolute bioavailability was 68% (90% CI: 62-75%).</p>
      <h3>Food Effect</h3>
      <p>Study LIG-102 evaluated food effect under fasted and fed conditions. High-fat meal increased AUC by 22% and Cmax by 18%. These changes were not considered clinically meaningful; Nexavant may be administered without regard to food.</p>
    `),
    createSection('m27-2', '2.7.2', 'Summary of Clinical Pharmacology Studies', 1, `
      <p>Clinical pharmacology studies characterized the pharmacokinetics, pharmacodynamics, and exposure-response relationships of Nexavant.</p>
      <h3>Pharmacokinetics</h3>
      <p>Nexavant exhibits dose-proportional PK over the range of 200-800 mg. Following single 600 mg dose: Tmax 2-4 hours, terminal half-life 18-22 hours supporting once-daily dosing. Steady state achieved within 7 days.</p>
      <h3>Drug-Drug Interactions</h3>
      <p>Nexavant is primarily metabolized by CYP3A4. Strong CYP3A4 inhibitors increase Nexavant exposure by 2.1-fold; dose reduction recommended. Strong inducers decrease exposure by 65%; concurrent use not recommended.</p>
    `),
    createSection('m27-3', '2.7.3', 'Summary of Clinical Efficacy', 1, `
      <p>Clinical efficacy was evaluated in the pivotal Phase 3 study LIG-301 and supportive Phase 1/2 studies.</p>
      <h3>Pivotal Study LIG-301</h3>
      <p>Randomized, open-label study of 298 patients with EGFR exon 20 insertion-positive advanced NSCLC. Primary endpoint: overall survival. Results: median OS 14.8 months (Nexavant) vs 10.2 months (control); HR 0.71, P=0.012.</p>
      <h3>Supportive Efficacy Data</h3>
      <p>Phase 1/2 dose-escalation/expansion study (LIG-201) in 127 patients demonstrated ORR 48% and median PFS 8.3 months, supporting the Phase 3 dose selection of 600 mg once daily.</p>
    `),
    createSection('m27-4', '2.7.4', 'Summary of Clinical Safety', 1, `
      <p>Safety was evaluated in 425 patients across clinical studies receiving Nexavant at doses from 200-800 mg.</p>
      <h3>Common Adverse Events</h3>
      <p>Most frequent TEAEs (≥20%): diarrhea (52%), nausea (36%), fatigue (32%), decreased appetite (22%). Majority were Grade 1-2 and manageable with supportive care or dose modification.</p>
      <h3>Adverse Events of Special Interest</h3>
      <p>Hepatotoxicity: ALT elevations >3× ULN in 8%; reversible with dose modification. QTc prolongation: No clinically significant effects observed at therapeutic doses.</p>
    `),
    createSection('m27-5', '2.7.5', 'Literature References', 1, `
      <ol>
        <li>Robichaux JP, et al. Mechanisms and clinical activity of an EGFR and HER2 exon 20 selective kinase inhibitor. Nature Medicine. 2018;24:638-646.</li>
        <li>Vyse S, Huang PH. Targeting EGFR exon 20 insertion mutations in non-small cell lung cancer. Signal Transduct Target Ther. 2019;4:5.</li>
        <li>Riely GJ, et al. Activity and safety of mobocertinib in patients with EGFR exon 20 insertion mutations. N Engl J Med. 2021;384:2101-2112.</li>
      </ol>
    `),
    createSection('m27-6', '2.7.6', 'Synopses of Individual Studies', 1, `
      <p>Individual study synopses are provided for each clinical study contributing to the efficacy and safety database.</p>
      <h3>Study LIG-301 (Pivotal Phase 3)</h3>
      <p>Primary objective: Compare OS of Nexavant vs standard chemotherapy. Design: Randomized 1:1, open-label, multicenter. N=298. Key results: Median OS 14.8 vs 10.2 months (HR 0.71, P=0.012).</p>
      <h3>Study LIG-201 (Phase 1/2)</h3>
      <p>Objectives: Establish RP2D; evaluate preliminary efficacy. Design: 3+3 dose escalation followed by expansion. N=127. Key results: RP2D 600 mg QD; ORR 48%; median PFS 8.3 months.</p>
    `),
  ],
};

// Protocol document
export const sampleProtocolDocument: ViewerDocument = {
  id: 'doc-protocol-lig301',
  title: 'Protocol LIG-301-001 v3.0 - Phase 3 Study of Nexavant in NSCLC',
  shortTitle: 'Protocol LIG-301 v3.0',
  documentType: 'Protocol',
  version: '3.0',
  status: 'Approved',
  author: 'Dr. Michael Torres',
  lastModified: '2024-11-01T09:15:00Z',
  productName: 'Nexavant (LIG-2847)',
  studyName: 'LIG-301',
  wordCount: 32150,
  pageCount: 112,
  sections: [
    createSection('proto-1', '1', 'Title Page', 1, `
      <p><strong>Protocol Number:</strong> LIG-301-001</p>
      <p><strong>Version:</strong> 3.0 (Amendment 2)</p>
      <p><strong>Date:</strong> November 1, 2024</p>
      <p><strong>IND Number:</strong> 123456</p>
      <p><strong>EudraCT Number:</strong> 2023-001234-56</p>
    `),
    createSection('proto-6', '6', 'Study Design', 1, `
      <h3>6.1 Overall Design</h3>
      <p>This is a randomized, open-label, multicenter, Phase 3 study comparing Nexavant to investigator's choice chemotherapy in patients with advanced NSCLC harboring EGFR exon 20 insertion mutations.</p>
      <h3>6.2 Randomization</h3>
      <p>Patients will be randomized 1:1 to Nexavant or chemotherapy, stratified by ECOG PS (0 vs 1) and prior lines of therapy (1 vs ≥2).</p>
      <h3>6.3 Treatment Arms</h3>
      <p><strong>Arm A:</strong> Nexavant 600 mg orally once daily until progression, unacceptable toxicity, or withdrawal.</p>
      <p><strong>Arm B:</strong> Investigator's choice of docetaxel 75 mg/m² or pemetrexed 500 mg/m² IV every 3 weeks.</p>
    `),
    createSection('proto-8', '8', 'Safety Assessments', 1, `
      <h3>8.1 Adverse Event Monitoring</h3>
      <p>Subjects will be monitored for adverse events throughout study participation and for 30 days after last dose.</p>
      <h3>8.2 Laboratory Assessments</h3>
      <p>Complete blood count and comprehensive metabolic panel at baseline, Day 15, then every 3 weeks. LFTs monitored weekly during first 8 weeks.</p>
      <h3>8.3 Cardiac Monitoring</h3>
      <p>ECG at screening, Week 4, Week 8, and Week 12, then every 12 weeks. ECHO/MUGA at baseline if clinically indicated.</p>
    `, [
      createSection('proto-8-4', '8.4', 'Dose Modifications', 2, `
        <p>Dose reductions for Grade 3+ toxicity: First reduction to 450 mg; second reduction to 300 mg. Permanent discontinuation if toxicity recurs at 300 mg.</p>
        <p>For Grade 3+ hepatotoxicity: Hold until resolution to ≤Grade 1, then resume at reduced dose.</p>
      `),
    ]),
  ],
};

// Get all sample documents
export function getSampleViewerDocuments(): ViewerDocument[] {
  return [sampleCSRDocument, sampleModule27Document, sampleProtocolDocument];
}

// Get document by ID
export function getSampleDocumentById(id: string): ViewerDocument | undefined {
  return getSampleViewerDocuments().find(d => d.id === id);
}
