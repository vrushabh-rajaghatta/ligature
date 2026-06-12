// ============================================================================
// TMF Document Templates - v168: Realistic Document Content for Demo
// ============================================================================

import type { TMFZone } from '@/domains/tmf/contracts';

export interface TMFDocumentTemplate {
  artifactNumber: string;
  name: string;
  zone: TMFZone;
  content: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

// Helper to generate study-specific content
export const generateTMFDocumentContent = (
  artifactNumber: string,
  title: string,
  zone: TMFZone,
  studyTitle: string,
  protocolNumber: string,
  sponsorName: string
): string => {
  const template = TMF_DOCUMENT_TEMPLATES[artifactNumber];
  if (template) {
    return template.content
      .replace(/\{STUDY_TITLE\}/g, studyTitle)
      .replace(/\{PROTOCOL_NUMBER\}/g, protocolNumber)
      .replace(/\{SPONSOR_NAME\}/g, sponsorName)
      .replace(/\{CURRENT_DATE\}/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))
      .replace(/\{VERSION\}/g, '3.0');
  }
  
  // Default template for artifacts without specific content
  return `
    <div class="tmf-document">
      <header class="document-header">
        <h1>${title}</h1>
        <div class="meta-info">
          <div class="meta-row"><span class="label">Protocol:</span> <span class="value">${protocolNumber}</span></div>
          <div class="meta-row"><span class="label">Sponsor:</span> <span class="value">${sponsorName}</span></div>
          <div class="meta-row"><span class="label">Zone:</span> <span class="value">${zone}</span></div>
          <div class="meta-row"><span class="label">Artifact:</span> <span class="value">${artifactNumber}</span></div>
        </div>
      </header>
      <section class="document-body">
        <p>This document is part of the Trial Master File for study ${protocolNumber} (${studyTitle}).</p>
        <p>Document content is maintained according to ICH E6(R2) GCP guidelines and DIA TMF Reference Model v3.2.</p>
      </section>
    </div>
  `;
};

export const TMF_DOCUMENT_TEMPLATES: Record<string, TMFDocumentTemplate> = {
  // Zone 02 - Central Trial Documents
  'art-02.01.01': {
    artifactNumber: 'art-02.01.01',
    name: 'Protocol',
    zone: 'zone-02',
    sections: [
      { title: 'Synopsis', content: 'Protocol Synopsis' },
      { title: 'Background', content: 'Scientific Background and Rationale' },
      { title: 'Objectives', content: 'Study Objectives and Endpoints' },
      { title: 'Study Design', content: 'Study Design and Methodology' },
    ],
    content: `
      <div class="tmf-document protocol">
        <header class="document-header">
          <div class="sponsor-logo">{SPONSOR_NAME}</div>
          <h1>CLINICAL STUDY PROTOCOL</h1>
          <h2>{STUDY_TITLE}</h2>
          <div class="protocol-info">
            <div class="info-row"><span class="label">Protocol Number:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Version:</span> <span class="value">{VERSION}</span></div>
            <div class="info-row"><span class="label">Date:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">IND Number:</span> <span class="value">IND 123456</span></div>
            <div class="info-row"><span class="label">EudraCT:</span> <span class="value">2024-001234-56</span></div>
          </div>
        </header>
        
        <section class="confidentiality-statement">
          <p><strong>CONFIDENTIAL</strong></p>
          <p>This document is confidential and the property of {SPONSOR_NAME}. No part of this document may be reproduced, transmitted, or distributed in any form without the prior written permission of {SPONSOR_NAME}.</p>
        </section>

        <section class="synopsis">
          <h2>1. PROTOCOL SYNOPSIS</h2>
          <table class="synopsis-table">
            <tr><td><strong>Title</strong></td><td>{STUDY_TITLE}</td></tr>
            <tr><td><strong>Phase</strong></td><td>Phase 3</td></tr>
            <tr><td><strong>Study Design</strong></td><td>Randomized, double-blind, placebo-controlled, multicenter</td></tr>
            <tr><td><strong>Primary Objective</strong></td><td>To evaluate the efficacy of LIG-2847 compared to placebo in patients with advanced solid tumors</td></tr>
            <tr><td><strong>Primary Endpoint</strong></td><td>Overall Response Rate (ORR) per RECIST v1.1</td></tr>
            <tr><td><strong>Sample Size</strong></td><td>450 subjects (300 active : 150 placebo)</td></tr>
            <tr><td><strong>Treatment Duration</strong></td><td>Until disease progression or unacceptable toxicity</td></tr>
            <tr><td><strong>Study Duration</strong></td><td>Approximately 36 months</td></tr>
          </table>
        </section>

        <section class="background">
          <h2>2. BACKGROUND AND RATIONALE</h2>
          <h3>2.1 Disease Background</h3>
          <p>Advanced solid tumors represent a significant unmet medical need with limited treatment options for patients who have progressed on standard therapies. Current survival rates remain suboptimal, highlighting the need for novel therapeutic approaches.</p>
          
          <h3>2.2 Investigational Product</h3>
          <p>LIG-2847 (Nexavant) is a novel small molecule inhibitor targeting the XYZ pathway, which has been shown to be upregulated in multiple tumor types. Preclinical studies have demonstrated potent antitumor activity with a favorable safety profile.</p>
          
          <h3>2.3 Nonclinical Data</h3>
          <p>In vitro studies demonstrated IC50 values in the nanomolar range across multiple cancer cell lines. In vivo xenograft models showed tumor growth inhibition of >80% at the proposed clinical dose.</p>
        </section>

        <section class="objectives">
          <h2>3. STUDY OBJECTIVES</h2>
          <h3>3.1 Primary Objective</h3>
          <ul>
            <li>To evaluate the efficacy of LIG-2847 compared to placebo as measured by Overall Response Rate (ORR)</li>
          </ul>
          
          <h3>3.2 Secondary Objectives</h3>
          <ul>
            <li>To assess Progression-Free Survival (PFS)</li>
            <li>To evaluate Overall Survival (OS)</li>
            <li>To characterize the safety and tolerability profile</li>
            <li>To evaluate pharmacokinetic parameters</li>
          </ul>
        </section>

        <section class="study-design">
          <h2>4. STUDY DESIGN</h2>
          <p>This is a Phase 3, randomized, double-blind, placebo-controlled, multicenter study. Approximately 450 subjects will be randomized in a 2:1 ratio to receive either LIG-2847 or placebo.</p>
          
          <h3>4.1 Treatment Arms</h3>
          <ul>
            <li><strong>Arm A:</strong> LIG-2847 200mg BID + Standard of Care</li>
            <li><strong>Arm B:</strong> Placebo BID + Standard of Care</li>
          </ul>
          
          <h3>4.2 Stratification Factors</h3>
          <ul>
            <li>ECOG Performance Status (0 vs 1)</li>
            <li>Prior lines of therapy (1-2 vs ≥3)</li>
            <li>Geographic region (North America vs Europe vs Asia-Pacific)</li>
          </ul>
        </section>

        <section class="signature-page">
          <h2>SIGNATURE PAGE</h2>
          <div class="signature-block">
            <p><strong>Sponsor Representative</strong></p>
            <div class="signature-line"></div>
            <p>Name: Dr. Sarah Chen</p>
            <p>Title: VP Clinical Development</p>
            <p>Date: _______________</p>
          </div>
          <div class="signature-block">
            <p><strong>Medical Monitor</strong></p>
            <div class="signature-line"></div>
            <p>Name: Dr. Michael Rodriguez</p>
            <p>Title: Global Medical Monitor</p>
            <p>Date: _______________</p>
          </div>
        </section>
      </div>
    `,
  },

  'art-02.02.01': {
    artifactNumber: 'art-02.02.01',
    name: 'Investigator Brochure',
    zone: 'zone-02',
    sections: [
      { title: 'Summary', content: 'Executive Summary' },
      { title: 'Physical Properties', content: 'Physical, Chemical, and Pharmaceutical Properties' },
      { title: 'Nonclinical Studies', content: 'Nonclinical Studies Summary' },
      { title: 'Clinical Studies', content: 'Effects in Humans' },
    ],
    content: `
      <div class="tmf-document investigator-brochure">
        <header class="document-header">
          <div class="sponsor-logo">{SPONSOR_NAME}</div>
          <h1>INVESTIGATOR'S BROCHURE</h1>
          <h2>LIG-2847 (Nexavant)</h2>
          <div class="document-info">
            <div class="info-row"><span class="label">Edition Number:</span> <span class="value">5</span></div>
            <div class="info-row"><span class="label">Release Date:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">Supersedes:</span> <span class="value">Edition 4, dated March 2024</span></div>
          </div>
        </header>

        <section class="confidentiality">
          <p class="confidential-notice">CONFIDENTIAL INFORMATION</p>
          <p>The information contained in this document is confidential and is intended for the investigator and the investigator's staff participating in the clinical evaluation of LIG-2847.</p>
        </section>

        <section class="table-of-contents">
          <h2>TABLE OF CONTENTS</h2>
          <ol>
            <li>Summary</li>
            <li>Introduction</li>
            <li>Physical, Chemical, and Pharmaceutical Properties</li>
            <li>Nonclinical Studies</li>
            <li>Effects in Humans</li>
            <li>Summary of Data and Guidance for the Investigator</li>
          </ol>
        </section>

        <section class="summary">
          <h2>1. SUMMARY</h2>
          <p>LIG-2847 (Nexavant) is a novel, orally bioavailable, small molecule inhibitor of the XYZ kinase pathway developed by {SPONSOR_NAME} for the treatment of advanced solid tumors.</p>
          
          <h3>1.1 Key Nonclinical Findings</h3>
          <ul>
            <li>Potent and selective inhibition of target kinases (IC50 = 2.3 nM)</li>
            <li>Demonstrated antitumor activity in multiple xenograft models</li>
            <li>Favorable ADME properties with oral bioavailability >70%</li>
            <li>No genotoxic potential in standard battery of tests</li>
          </ul>

          <h3>1.2 Clinical Experience Summary</h3>
          <p>As of the data cutoff (June 2024), over 800 subjects have been exposed to LIG-2847 in clinical studies:</p>
          <ul>
            <li>Phase 1: 156 subjects (dose escalation and expansion)</li>
            <li>Phase 2: 324 subjects (multiple tumor types)</li>
            <li>Phase 3: 342 subjects (ongoing)</li>
          </ul>
        </section>

        <section class="properties">
          <h2>3. PHYSICAL, CHEMICAL, AND PHARMACEUTICAL PROPERTIES</h2>
          <table class="properties-table">
            <tr><td>Generic Name</td><td>LIG-2847</td></tr>
            <tr><td>Chemical Name</td><td>2-((4-((3-aminopiperidin-1-yl)methyl)phenyl)amino)-4-methyl-6-(1H-pyrazol-1-yl)pyrimidine-5-carboxamide</td></tr>
            <tr><td>Molecular Formula</td><td>C<sub>21</sub>H<sub>26</sub>N<sub>8</sub>O</td></tr>
            <tr><td>Molecular Weight</td><td>406.49 g/mol</td></tr>
            <tr><td>Physical Form</td><td>White to off-white crystalline powder</td></tr>
            <tr><td>Solubility</td><td>Freely soluble in DMSO, sparingly soluble in water</td></tr>
            <tr><td>Formulation</td><td>Film-coated tablets (50mg, 100mg)</td></tr>
          </table>
        </section>

        <section class="safety-guidance">
          <h2>6. SUMMARY OF DATA AND GUIDANCE FOR THE INVESTIGATOR</h2>
          <h3>6.1 Most Common Adverse Events (≥10%)</h3>
          <table class="ae-table">
            <tr><th>Adverse Event</th><th>All Grades (%)</th><th>Grade ≥3 (%)</th></tr>
            <tr><td>Fatigue</td><td>45</td><td>8</td></tr>
            <tr><td>Nausea</td><td>38</td><td>3</td></tr>
            <tr><td>Diarrhea</td><td>32</td><td>5</td></tr>
            <tr><td>Decreased appetite</td><td>28</td><td>2</td></tr>
            <tr><td>Rash</td><td>22</td><td>4</td></tr>
          </table>
          
          <h3>6.2 Monitoring Recommendations</h3>
          <ul>
            <li>Liver function tests every 2 weeks for first 3 months, then monthly</li>
            <li>ECG at baseline and Week 4</li>
            <li>CBC with differential weekly for first month, then every 2 weeks</li>
          </ul>
        </section>
      </div>
    `,
  },

  // Zone 03 - Regulatory
  'art-03.01.01': {
    artifactNumber: 'art-03.01.01',
    name: 'IND/CTA Application',
    zone: 'zone-03',
    sections: [
      { title: 'Cover Letter', content: 'FDA Submission Cover Letter' },
      { title: 'Form FDA 1571', content: 'Investigational New Drug Application' },
      { title: 'Table of Contents', content: 'Submission TOC' },
      { title: 'Introductory Statement', content: 'General Investigational Plan' },
    ],
    content: `
      <div class="tmf-document ind-application">
        <header class="document-header">
          <div class="sponsor-logo">{SPONSOR_NAME}</div>
          <h1>INVESTIGATIONAL NEW DRUG APPLICATION</h1>
          <h2>IND 139875</h2>
          <div class="document-info">
            <div class="info-row"><span class="label">Drug Name:</span> <span class="value">LIG-2847 (Nexavant)</span></div>
            <div class="info-row"><span class="label">Submission Type:</span> <span class="value">Original Application</span></div>
            <div class="info-row"><span class="label">Submission Date:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
          </div>
        </header>

        <section class="cover-letter">
          <h2>COVER LETTER</h2>
          <p>{CURRENT_DATE}</p>
          <p>
            Food and Drug Administration<br/>
            Center for Drug Evaluation and Research<br/>
            Document Control Room<br/>
            5901-B Ammendale Road<br/>
            Beltsville, MD 20705-1266
          </p>
          <p>
            <strong>Re: IND 139875 - Original Application</strong><br/>
            <strong>Drug: LIG-2847 (Nexavant)</strong><br/>
            <strong>Indication: Advanced Solid Tumors</strong>
          </p>
          <p>Dear Sir or Madam:</p>
          <p>{SPONSOR_NAME} hereby submits this Investigational New Drug Application for LIG-2847 (Nexavant) for the treatment of patients with advanced solid tumors who have progressed on prior therapy.</p>
          <p>This submission contains the following components:</p>
          <ul>
            <li>Form FDA 1571 (Investigational New Drug Application)</li>
            <li>Table of Contents</li>
            <li>Introductory Statement and General Investigational Plan</li>
            <li>Investigator's Brochure</li>
            <li>Protocol {PROTOCOL_NUMBER}</li>
            <li>Chemistry, Manufacturing, and Controls Information</li>
            <li>Pharmacology and Toxicology Information</li>
            <li>Previous Human Experience</li>
          </ul>
          <p>Please contact the undersigned with any questions regarding this submission.</p>
          <p>Sincerely,</p>
          <div class="signature-block">
            <p>Dr. Sarah Chen<br/>VP, Regulatory Affairs<br/>{SPONSOR_NAME}</p>
          </div>
        </section>

        <section class="form-1571">
          <h2>FORM FDA 1571 - INVESTIGATIONAL NEW DRUG APPLICATION</h2>
          <table class="form-table">
            <tr><td colspan="2" class="section-header">1. NAME OF SPONSOR</td></tr>
            <tr><td colspan="2">{SPONSOR_NAME}</td></tr>
            
            <tr><td colspan="2" class="section-header">2. DATE OF SUBMISSION</td></tr>
            <tr><td colspan="2">{CURRENT_DATE}</td></tr>
            
            <tr><td colspan="2" class="section-header">3. ADDRESS</td></tr>
            <tr><td colspan="2">100 Pharma Way, Suite 500<br/>Cambridge, MA 02142</td></tr>
            
            <tr><td colspan="2" class="section-header">4. TELEPHONE NUMBER</td></tr>
            <tr><td colspan="2">(617) 555-0100</td></tr>
            
            <tr><td colspan="2" class="section-header">5. NAME(S) OF DRUG</td></tr>
            <tr><td>a. Name(s):</td><td>LIG-2847 (Nexavant)</td></tr>
            <tr><td>b. Code designation:</td><td>LIG-2847</td></tr>
            <tr><td>c. Chemical name:</td><td>2-((4-((3-aminopiperidin-1-yl)methyl)phenyl)amino)-4-methyl-6-(1H-pyrazol-1-yl)pyrimidine-5-carboxamide</td></tr>
            
            <tr><td colspan="2" class="section-header">6. IND NUMBER (if known)</td></tr>
            <tr><td colspan="2">139875</td></tr>
            
            <tr><td colspan="2" class="section-header">7. INDICATION(S)</td></tr>
            <tr><td colspan="2">Advanced solid tumors</td></tr>
            
            <tr><td colspan="2" class="section-header">8. PHASE OF CLINICAL INVESTIGATION</td></tr>
            <tr><td colspan="2">☑ Phase 1 ☑ Phase 2 ☑ Phase 3</td></tr>
          </table>
        </section>

        <section class="general-plan">
          <h2>INTRODUCTORY STATEMENT AND GENERAL INVESTIGATIONAL PLAN</h2>
          
          <h3>1. Introductory Statement</h3>
          <p>LIG-2847 (Nexavant) is a novel, orally bioavailable small molecule inhibitor of the XYZ kinase pathway being developed by {SPONSOR_NAME} for the treatment of advanced solid tumors.</p>
          
          <h3>2. General Investigational Plan</h3>
          <p>The clinical development program for LIG-2847 is designed to:</p>
          <ul>
            <li>Establish the safety and tolerability profile in humans</li>
            <li>Determine the maximum tolerated dose (MTD) and recommended Phase 2 dose (RP2D)</li>
            <li>Evaluate preliminary efficacy across multiple tumor types</li>
            <li>Characterize the pharmacokinetic profile</li>
            <li>Identify predictive biomarkers of response</li>
          </ul>
          
          <h3>3. Planned Studies</h3>
          <table class="studies-table">
            <tr><th>Protocol</th><th>Phase</th><th>Population</th><th>Status</th></tr>
            <tr><td>{PROTOCOL_NUMBER}</td><td>3</td><td>Advanced Solid Tumors</td><td>Planned</td></tr>
          </table>
        </section>

        <section class="certification">
          <h2>SPONSOR CERTIFICATION</h2>
          <p>I agree to not begin clinical investigations until 30 days after FDA's receipt of the IND unless I receive earlier notification from FDA that the studies may begin.</p>
          <p>I agree that an Institutional Review Board (IRB) that complies with 21 CFR Part 56 will be responsible for initial and continuing review and approval of the clinical investigations.</p>
          <div class="signature-block">
            <p>Signature: ____________________</p>
            <p>Name: Dr. Sarah Chen</p>
            <p>Title: VP, Regulatory Affairs</p>
            <p>Date: {CURRENT_DATE}</p>
          </div>
        </section>
      </div>
    `,
  },

  // Zone 04 - IRB/IEC
  'art-04.02.01': {
    artifactNumber: 'art-04.02.01',
    name: 'IRB/IEC Approval',
    zone: 'zone-04',
    sections: [
      { title: 'Approval Letter', content: 'IRB Approval Notification' },
      { title: 'Approved Documents', content: 'List of Approved Documents' },
      { title: 'Conditions', content: 'Approval Conditions' },
    ],
    content: `
      <div class="tmf-document irb-approval">
        <header class="document-header">
          <div class="irb-logo">PARTNERS INSTITUTIONAL REVIEW BOARD</div>
          <h1>IRB APPROVAL NOTIFICATION</h1>
        </header>

        <section class="approval-details">
          <table class="approval-table">
            <tr><td><strong>IRB Protocol #:</strong></td><td>2024-P001234</td></tr>
            <tr><td><strong>Sponsor Protocol #:</strong></td><td>{PROTOCOL_NUMBER}</td></tr>
            <tr><td><strong>Study Title:</strong></td><td>{STUDY_TITLE}</td></tr>
            <tr><td><strong>Principal Investigator:</strong></td><td>Dr. Robert Chen, MD, PhD</td></tr>
            <tr><td><strong>Sponsor:</strong></td><td>{SPONSOR_NAME}</td></tr>
            <tr><td><strong>Review Type:</strong></td><td>Full Board Review</td></tr>
            <tr><td><strong>Approval Date:</strong></td><td>{CURRENT_DATE}</td></tr>
            <tr><td><strong>Expiration Date:</strong></td><td>One year from approval date</td></tr>
          </table>
        </section>

        <section class="approval-notification">
          <h2>APPROVAL NOTIFICATION</h2>
          <p>The Partners Human Research Committee (IRB) has reviewed and approved the above-referenced research protocol.</p>
          
          <h3>Approved Documents:</h3>
          <table class="documents-table">
            <tr><th>Document</th><th>Version</th><th>Date</th></tr>
            <tr><td>Protocol</td><td>3.0</td><td>{CURRENT_DATE}</td></tr>
            <tr><td>Informed Consent Form</td><td>2.0</td><td>{CURRENT_DATE}</td></tr>
            <tr><td>HIPAA Authorization</td><td>1.0</td><td>{CURRENT_DATE}</td></tr>
            <tr><td>Investigator's Brochure</td><td>Edition 5</td><td>{CURRENT_DATE}</td></tr>
            <tr><td>Recruitment Materials</td><td>1.0</td><td>{CURRENT_DATE}</td></tr>
          </table>
        </section>

        <section class="approval-conditions">
          <h2>CONDITIONS OF APPROVAL</h2>
          <ol>
            <li>Any modifications to the approved documents must be submitted for IRB review and approval prior to implementation, except where necessary to eliminate apparent immediate hazards to subjects.</li>
            <li>All adverse events must be reported in accordance with IRB policies.</li>
            <li>Continuing review must be submitted prior to the expiration date.</li>
            <li>Any serious or continuing non-compliance must be reported to the IRB promptly.</li>
            <li>The investigator must notify the IRB of any changes in research activity and of any unanticipated problems involving risks to subjects.</li>
          </ol>
        </section>

        <section class="determination">
          <h2>IRB DETERMINATION</h2>
          <p>This research has been determined to involve:</p>
          <ul>
            <li>☑ Greater than minimal risk to subjects</li>
            <li>☑ A vulnerable population (seriously ill patients)</li>
            <li>☑ Use of investigational drug under IND</li>
            <li>☐ Research involving prisoners</li>
            <li>☐ Research involving children</li>
          </ul>
          
          <h3>Risk/Benefit Determination:</h3>
          <p>The IRB has determined that the risks to subjects are reasonable in relation to the anticipated benefits to subjects and the importance of the knowledge that may reasonably be expected to result from the research.</p>
        </section>

        <section class="contact">
          <h2>CONTACT INFORMATION</h2>
          <p>
            Partners Human Research Committee<br/>
            Mass General Brigham<br/>
            116 Huntington Avenue, Suite 1002<br/>
            Boston, MA 02116<br/>
            Phone: (617) 525-8000<br/>
            Email: irb@partners.org
          </p>
        </section>

        <section class="signature">
          <div class="signature-block">
            <p>Approved by:</p>
            <p>_________________________________</p>
            <p>Margaret Sullivan, MD<br/>Chair, Partners IRB</p>
            <p>Date: {CURRENT_DATE}</p>
          </div>
        </section>
      </div>
    `,
  },

  // Zone 05 - Site Management
  'art-05.03.01': {
    artifactNumber: 'art-05.03.01',
    name: 'Site Initiation Visit Report',
    zone: 'zone-05',
    sections: [
      { title: 'Visit Overview', content: 'Site Initiation Visit Summary' },
      { title: 'Training Documentation', content: 'Training Completed' },
      { title: 'Action Items', content: 'Follow-up Actions' },
    ],
    content: `
      <div class="tmf-document siv-report">
        <header class="document-header">
          <h1>SITE INITIATION VISIT REPORT</h1>
          <div class="report-info">
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Study:</span> <span class="value">{STUDY_TITLE}</span></div>
            <div class="info-row"><span class="label">Site Number:</span> <span class="value">101</span></div>
            <div class="info-row"><span class="label">Visit Date:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">CRA:</span> <span class="value">Jennifer Martinez</span></div>
          </div>
        </header>

        <section class="site-info">
          <h2>SITE INFORMATION</h2>
          <table class="info-table">
            <tr><td>Principal Investigator</td><td>Dr. Robert Chen, MD, PhD</td></tr>
            <tr><td>Institution</td><td>University Medical Center</td></tr>
            <tr><td>Address</td><td>123 Medical Center Drive, Boston, MA 02115</td></tr>
            <tr><td>Site Activation Date</td><td>{CURRENT_DATE}</td></tr>
            <tr><td>Enrollment Target</td><td>25 subjects</td></tr>
          </table>
        </section>

        <section class="attendees">
          <h2>MEETING ATTENDEES</h2>
          <table class="attendees-table">
            <tr><th>Name</th><th>Role</th><th>Present</th></tr>
            <tr><td>Dr. Robert Chen</td><td>Principal Investigator</td><td>✓</td></tr>
            <tr><td>Dr. Lisa Wong</td><td>Sub-Investigator</td><td>✓</td></tr>
            <tr><td>Sarah Johnson, RN</td><td>Study Coordinator</td><td>✓</td></tr>
            <tr><td>Mark Davis</td><td>Pharmacy</td><td>✓</td></tr>
            <tr><td>Jennifer Martinez</td><td>CRA</td><td>✓</td></tr>
          </table>
        </section>

        <section class="training">
          <h2>TRAINING COMPLETED</h2>
          <h3>Protocol Training</h3>
          <ul>
            <li>✓ Protocol overview and study objectives</li>
            <li>✓ Study procedures and visit schedule</li>
            <li>✓ Inclusion/exclusion criteria</li>
            <li>✓ Dosing and administration</li>
            <li>✓ Safety monitoring and AE reporting</li>
          </ul>
          
          <h3>System Training</h3>
          <ul>
            <li>✓ EDC system (Medidata Rave)</li>
            <li>✓ IWRS/RTSM training</li>
            <li>✓ eTMF access and document upload</li>
          </ul>

          <h3>GCP Training</h3>
          <p>All site personnel have completed required GCP training. Certificates verified and copies filed.</p>
        </section>

        <section class="ip-review">
          <h2>INVESTIGATIONAL PRODUCT</h2>
          <table class="ip-table">
            <tr><td>IP Received</td><td>Yes - 50 kits</td></tr>
            <tr><td>Storage Conditions Verified</td><td>2-8°C, temperature monitoring active</td></tr>
            <tr><td>Accountability Log Initiated</td><td>Yes</td></tr>
            <tr><td>Pharmacy SOP Reviewed</td><td>Yes</td></tr>
          </table>
        </section>

        <section class="action-items">
          <h2>ACTION ITEMS</h2>
          <table class="action-table">
            <tr><th>Item</th><th>Responsible</th><th>Due Date</th><th>Status</th></tr>
            <tr><td>Submit updated 1572</td><td>Dr. Chen</td><td>+7 days</td><td>Pending</td></tr>
            <tr><td>Complete EDC UAT</td><td>S. Johnson</td><td>+3 days</td><td>Pending</td></tr>
            <tr><td>Finalize lab kit shipment</td><td>CRA</td><td>+5 days</td><td>In Progress</td></tr>
          </table>
        </section>

        <section class="signatures">
          <h2>SIGNATURES</h2>
          <div class="signature-block">
            <p>CRA: Jennifer Martinez</p>
            <div class="signature-line">Signed electronically</div>
            <p>Date: {CURRENT_DATE}</p>
          </div>
          <div class="signature-block">
            <p>Principal Investigator: Dr. Robert Chen</p>
            <div class="signature-line">Signed electronically</div>
            <p>Date: {CURRENT_DATE}</p>
          </div>
        </section>
      </div>
    `,
  },

  'art-05.05.01': {
    artifactNumber: 'art-05.05.01',
    name: 'Investigator CV',
    zone: 'zone-05',
    sections: [
      { title: 'Personal Information', content: 'Contact Details' },
      { title: 'Education', content: 'Educational Background' },
      { title: 'Experience', content: 'Clinical Trial Experience' },
    ],
    content: `
      <div class="tmf-document cv">
        <header class="cv-header">
          <h1>CURRICULUM VITAE</h1>
        </header>

        <section class="personal-info">
          <h2>PERSONAL INFORMATION</h2>
          <table class="cv-table">
            <tr><td>Name</td><td>Robert K. Chen, MD, PhD</td></tr>
            <tr><td>Title</td><td>Professor of Medicine, Director of Oncology Research</td></tr>
            <tr><td>Institution</td><td>University Medical Center</td></tr>
            <tr><td>Address</td><td>123 Medical Center Drive, Boston, MA 02115</td></tr>
            <tr><td>Phone</td><td>(617) 555-0123</td></tr>
            <tr><td>Email</td><td>rchen@universitymed.edu</td></tr>
            <tr><td>Medical License</td><td>MA #123456 (Valid through 2026)</td></tr>
          </table>
        </section>

        <section class="education">
          <h2>EDUCATION</h2>
          <ul class="education-list">
            <li>
              <strong>MD, Harvard Medical School</strong> - 2005<br/>
              Magna Cum Laude
            </li>
            <li>
              <strong>PhD, Molecular Biology, MIT</strong> - 2003<br/>
              Thesis: "Mechanisms of Kinase Resistance in Solid Tumors"
            </li>
            <li>
              <strong>BS, Biochemistry, Stanford University</strong> - 1997<br/>
              Summa Cum Laude
            </li>
          </ul>
        </section>

        <section class="clinical-experience">
          <h2>CLINICAL TRIAL EXPERIENCE</h2>
          <p>Dr. Chen has served as Principal Investigator or Sub-Investigator on over 75 clinical trials in oncology.</p>
          
          <h3>Selected Recent Studies</h3>
          <ul>
            <li>Phase 3 KEYNOTE-XXX: Anti-PD-1 in NSCLC (PI, 45 subjects)</li>
            <li>Phase 2 BMS-XXX: Novel CTLA-4 in melanoma (PI, 28 subjects)</li>
            <li>Phase 1/2 LILLY-XXX: Targeted therapy in breast cancer (Sub-I, 15 subjects)</li>
          </ul>
        </section>

        <section class="publications">
          <h2>SELECTED PUBLICATIONS</h2>
          <ol class="publications-list">
            <li>Chen RK, et al. "Novel biomarkers in solid tumor immunotherapy." <em>Nature Medicine</em>. 2024;30:234-245.</li>
            <li>Chen RK, et al. "Resistance mechanisms to targeted therapies." <em>Cancer Cell</em>. 2023;44:123-138.</li>
            <li>Chen RK, et al. "Phase 2 results of XYZ inhibitor." <em>J Clin Oncol</em>. 2023;41:1234-1242.</li>
          </ol>
        </section>

        <section class="certification">
          <p><strong>GCP CERTIFICATION:</strong> CITI Training - Completed March 2024</p>
          <p><strong>Date of CV:</strong> {CURRENT_DATE}</p>
          <div class="signature-block">
            <p>Signature: ____________________</p>
          </div>
        </section>
      </div>
    `,
  },

  'art-05.04.01': {
    artifactNumber: 'art-05.04.01',
    name: 'Monitoring Visit Report',
    zone: 'zone-05',
    sections: [
      { title: 'Visit Summary', content: 'Monitoring Visit Overview' },
      { title: 'Subject Review', content: 'Subject Status and Data Review' },
      { title: 'Findings', content: 'Observations and Deviations' },
      { title: 'Action Items', content: 'Follow-up Actions Required' },
    ],
    content: `
      <div class="tmf-document mvr">
        <header class="document-header">
          <h1>MONITORING VISIT REPORT</h1>
          <div class="report-info">
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Study:</span> <span class="value">{STUDY_TITLE}</span></div>
            <div class="info-row"><span class="label">Site Number:</span> <span class="value">101</span></div>
            <div class="info-row"><span class="label">Site Name:</span> <span class="value">University Medical Center</span></div>
            <div class="info-row"><span class="label">Visit Type:</span> <span class="value">Routine Monitoring Visit</span></div>
            <div class="info-row"><span class="label">Visit Dates:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">CRA:</span> <span class="value">Jennifer Martinez</span></div>
          </div>
        </header>

        <section class="visit-summary">
          <h2>VISIT SUMMARY</h2>
          <table class="summary-table">
            <tr><td><strong>Previous Visit Date:</strong></td><td>October 15, 2024</td></tr>
            <tr><td><strong>Visit Duration:</strong></td><td>2 days (8 hours total)</td></tr>
            <tr><td><strong>Subjects Enrolled:</strong></td><td>18</td></tr>
            <tr><td><strong>Subjects Active:</strong></td><td>15</td></tr>
            <tr><td><strong>Subjects Completed:</strong></td><td>2</td></tr>
            <tr><td><strong>Subjects Withdrawn:</strong></td><td>1</td></tr>
          </table>
          
          <h3>Personnel Present</h3>
          <table class="personnel-table">
            <tr><th>Name</th><th>Role</th></tr>
            <tr><td>Dr. Robert Chen</td><td>Principal Investigator</td></tr>
            <tr><td>Sarah Johnson, RN</td><td>Study Coordinator</td></tr>
            <tr><td>Mark Davis, PharmD</td><td>Research Pharmacist</td></tr>
            <tr><td>Jennifer Martinez</td><td>CRA</td></tr>
          </table>
        </section>

        <section class="subject-review">
          <h2>SUBJECT STATUS REVIEW</h2>
          
          <h3>Source Document Verification (SDV)</h3>
          <table class="sdv-table">
            <tr><th>Subject</th><th>Visits Reviewed</th><th>SDV Status</th><th>Queries</th></tr>
            <tr><td>101-001</td><td>V1-V8</td><td>100% Complete</td><td>0 open</td></tr>
            <tr><td>101-002</td><td>V1-V6</td><td>100% Complete</td><td>1 open</td></tr>
            <tr><td>101-003</td><td>V1-V7</td><td>100% Complete</td><td>0 open</td></tr>
            <tr><td>101-004</td><td>V1-V5</td><td>85% Complete</td><td>2 open</td></tr>
            <tr><td>101-005</td><td>V1-V4</td><td>100% Complete</td><td>0 open</td></tr>
          </table>
          
          <h3>Informed Consent Review</h3>
          <p>All 18 enrolled subjects have properly executed informed consent forms. No issues identified.</p>
          
          <h3>Eligibility Review</h3>
          <p>Eligibility criteria verification completed for 3 newly enrolled subjects (101-016, 101-017, 101-018). All subjects met inclusion/exclusion criteria.</p>
        </section>

        <section class="ip-accountability">
          <h2>INVESTIGATIONAL PRODUCT ACCOUNTABILITY</h2>
          <table class="ip-table">
            <tr><td><strong>Opening Balance:</strong></td><td>50 kits</td></tr>
            <tr><td><strong>Dispensed Since Last Visit:</strong></td><td>12 kits</td></tr>
            <tr><td><strong>Returned:</strong></td><td>3 kits</td></tr>
            <tr><td><strong>Current Inventory:</strong></td><td>38 kits</td></tr>
            <tr><td><strong>Expiry Dates Verified:</strong></td><td>Yes - all within date</td></tr>
            <tr><td><strong>Storage Conditions:</strong></td><td>Verified 2-8°C, temp logs reviewed</td></tr>
          </table>
          <p><strong>Discrepancies:</strong> None identified. Accountability log matches physical inventory.</p>
        </section>

        <section class="findings">
          <h2>MONITORING FINDINGS</h2>
          
          <h3>Protocol Deviations</h3>
          <table class="deviation-table">
            <tr><th>Subject</th><th>Category</th><th>Description</th><th>Severity</th></tr>
            <tr><td>101-012</td><td>Visit Window</td><td>V5 performed 3 days outside window</td><td>Minor</td></tr>
            <tr><td>101-015</td><td>Lab Sample</td><td>PK sample missed at V4</td><td>Minor</td></tr>
          </table>
          
          <h3>Regulatory Document Status</h3>
          <ul>
            <li>✓ 1572 - Current and complete</li>
            <li>✓ Financial Disclosure Forms - All current</li>
            <li>✓ CV/Licenses - All current, verified in system</li>
            <li>⚠ GCP Training - 1 sub-investigator due for renewal (Dr. Lisa Wong - due in 30 days)</li>
          </ul>
          
          <h3>Safety Reporting</h3>
          <p>2 SAEs reported since last visit. Both expedited reports submitted within 24 hours. No new safety signals identified.</p>
        </section>

        <section class="action-items">
          <h2>ACTION ITEMS</h2>
          <table class="action-table">
            <tr><th>#</th><th>Action</th><th>Responsible</th><th>Due Date</th><th>Priority</th></tr>
            <tr><td>1</td><td>Complete SDV for Subject 101-004 V5</td><td>CRA</td><td>+7 days</td><td>Medium</td></tr>
            <tr><td>2</td><td>Resolve open queries (3 total)</td><td>Coordinator</td><td>+14 days</td><td>Medium</td></tr>
            <tr><td>3</td><td>Renew GCP training for Dr. Wong</td><td>Dr. Wong</td><td>+30 days</td><td>High</td></tr>
            <tr><td>4</td><td>Submit deviation reports to IRB</td><td>Coordinator</td><td>+7 days</td><td>High</td></tr>
            <tr><td>5</td><td>Restock IP inventory (order placed)</td><td>CRA</td><td>+21 days</td><td>Low</td></tr>
          </table>
        </section>

        <section class="overall-assessment">
          <h2>OVERALL SITE ASSESSMENT</h2>
          <table class="assessment-table">
            <tr><td><strong>Overall Rating:</strong></td><td class="rating-good">SATISFACTORY</td></tr>
            <tr><td><strong>Data Quality:</strong></td><td>Good - minimal queries, timely data entry</td></tr>
            <tr><td><strong>Protocol Compliance:</strong></td><td>Good - minor deviations only</td></tr>
            <tr><td><strong>Regulatory Compliance:</strong></td><td>Good - all documents current</td></tr>
            <tr><td><strong>Safety Reporting:</strong></td><td>Excellent - timely and complete</td></tr>
            <tr><td><strong>IP Management:</strong></td><td>Excellent - accurate accountability</td></tr>
          </table>
          
          <p><strong>CRA Comments:</strong> Site continues to perform well with strong enrollment and data quality. Minor issues identified are being addressed. Recommend continued routine monitoring schedule.</p>
        </section>

        <section class="next-visit">
          <h2>NEXT VISIT</h2>
          <p><strong>Planned Date:</strong> Approximately 6-8 weeks</p>
          <p><strong>Visit Type:</strong> Routine Monitoring Visit</p>
          <p><strong>Focus Areas:</strong> Complete SDV for recently enrolled subjects, close remaining action items</p>
        </section>

        <section class="signatures">
          <h2>SIGNATURES</h2>
          <div class="signature-row">
            <div class="signature-block">
              <p>Clinical Research Associate</p>
              <div class="signature-line">Signed electronically</div>
              <p>Jennifer Martinez</p>
              <p>Date: {CURRENT_DATE}</p>
            </div>
            <div class="signature-block">
              <p>Principal Investigator</p>
              <div class="signature-line">Signed electronically</div>
              <p>Dr. Robert Chen</p>
              <p>Date: {CURRENT_DATE}</p>
            </div>
          </div>
        </section>
      </div>
    `,
  },

  'art-05.05.02': {
    artifactNumber: 'art-05.05.02',
    name: 'Form FDA 1572',
    zone: 'zone-05',
    sections: [
      { title: 'Investigator Information', content: 'Investigator Details' },
      { title: 'Research Facility', content: 'Facility and IRB Information' },
      { title: 'Commitments', content: 'Investigator Commitments' },
    ],
    content: `
      <div class="tmf-document fda-1572">
        <header class="document-header official">
          <div class="form-number">FORM FDA 1572</div>
          <h1>STATEMENT OF INVESTIGATOR</h1>
          <p class="subtitle">(Title 21, Code of Federal Regulations (CFR) Part 312)</p>
          <p class="note">Note: No investigator may participate in an investigation until he/she provides the sponsor with a completed, signed Statement of Investigator, Form FDA 1572.</p>
        </header>

        <section class="section-1">
          <h2>1. NAME AND ADDRESS OF INVESTIGATOR</h2>
          <table class="form-table">
            <tr>
              <td class="label">Name:</td>
              <td>Robert K. Chen, MD, PhD</td>
            </tr>
            <tr>
              <td class="label">Address:</td>
              <td>University Medical Center<br/>Department of Medical Oncology<br/>123 Medical Center Drive<br/>Boston, MA 02115</td>
            </tr>
            <tr>
              <td class="label">Telephone:</td>
              <td>(617) 555-0123</td>
            </tr>
            <tr>
              <td class="label">Fax:</td>
              <td>(617) 555-0124</td>
            </tr>
            <tr>
              <td class="label">Email:</td>
              <td>rchen@universitymed.edu</td>
            </tr>
          </table>
        </section>

        <section class="section-2">
          <h2>2. EDUCATION, TRAINING, AND EXPERIENCE</h2>
          <p>☑ Curriculum vitae attached</p>
          <p>☐ Other statement of qualifications attached</p>
        </section>

        <section class="section-3">
          <h2>3. NAME AND ADDRESS OF RESEARCH FACILITIES</h2>
          <table class="facilities-table">
            <tr>
              <td>
                <strong>Primary Facility:</strong><br/>
                University Medical Center<br/>
                123 Medical Center Drive<br/>
                Boston, MA 02115
              </td>
            </tr>
            <tr>
              <td>
                <strong>Pharmacy:</strong><br/>
                University Medical Center Research Pharmacy<br/>
                123 Medical Center Drive, Room B-102<br/>
                Boston, MA 02115
              </td>
            </tr>
            <tr>
              <td>
                <strong>Laboratory:</strong><br/>
                University Medical Center Clinical Laboratory<br/>
                123 Medical Center Drive, Room A-200<br/>
                Boston, MA 02115
              </td>
            </tr>
          </table>
        </section>

        <section class="section-4">
          <h2>4. NAME AND ADDRESS OF CLINICAL LABORATORY FACILITIES</h2>
          <table class="lab-table">
            <tr>
              <td>
                <strong>Local Laboratory:</strong><br/>
                University Medical Center Clinical Laboratory<br/>
                CAP #: 12345678<br/>
                CLIA #: 22D1234567
              </td>
            </tr>
            <tr>
              <td>
                <strong>Central Laboratory:</strong><br/>
                Covance Central Laboratory Services<br/>
                8211 SciCor Drive<br/>
                Indianapolis, IN 46214<br/>
                CAP #: 98765432<br/>
                CLIA #: 15D9876543
              </td>
            </tr>
          </table>
        </section>

        <section class="section-5">
          <h2>5. NAME AND ADDRESS OF IRB</h2>
          <table class="irb-table">
            <tr>
              <td>
                Partners Human Research Committee<br/>
                Mass General Brigham<br/>
                116 Huntington Avenue, Suite 1002<br/>
                Boston, MA 02116<br/>
                Phone: (617) 525-8000<br/>
                IRB Registration #: IORG0000226<br/>
                FWA #: FWA00003136
              </td>
            </tr>
          </table>
        </section>

        <section class="section-6">
          <h2>6. NAMES OF SUBINVESTIGATORS</h2>
          <table class="subinvestigators-table">
            <tr><th>Name</th><th>Degree</th><th>Role</th></tr>
            <tr><td>Lisa Wong</td><td>MD</td><td>Sub-Investigator</td></tr>
            <tr><td>Michael Park</td><td>MD, PhD</td><td>Sub-Investigator</td></tr>
            <tr><td>Sarah Johnson</td><td>RN, BSN</td><td>Study Coordinator</td></tr>
            <tr><td>Jennifer Kim</td><td>PharmD</td><td>Research Pharmacist</td></tr>
          </table>
        </section>

        <section class="section-7">
          <h2>7. NAME AND CODE NUMBER OF PROTOCOL</h2>
          <table class="protocol-table">
            <tr>
              <td class="label">Protocol Number:</td>
              <td>{PROTOCOL_NUMBER}</td>
            </tr>
            <tr>
              <td class="label">Protocol Title:</td>
              <td>{STUDY_TITLE}</td>
            </tr>
            <tr>
              <td class="label">IND Number:</td>
              <td>139875</td>
            </tr>
            <tr>
              <td class="label">Drug Name:</td>
              <td>LIG-2847 (Nexavant)</td>
            </tr>
            <tr>
              <td class="label">Sponsor:</td>
              <td>{SPONSOR_NAME}</td>
            </tr>
          </table>
        </section>

        <section class="section-8">
          <h2>8. COMMITMENTS</h2>
          <p>I agree to conduct the study in accordance with the relevant, current protocol and will only make changes in a protocol after notifying the sponsor, except when necessary to protect the safety, rights, or welfare of subjects.</p>
          <p>I agree to personally conduct or supervise the investigation.</p>
          <p>I agree to inform any patients, or any persons used as controls, that the drugs are being used for investigational purposes and will ensure that the requirements relating to obtaining informed consent in 21 CFR Part 50 and institutional review board review and approval in 21 CFR Part 56 are met.</p>
          <p>I agree to report to the sponsor adverse experiences that occur in the course of the investigation in accordance with 21 CFR 312.64.</p>
          <p>I have read and understand the information in the investigator's brochure, including the potential risks and side effects of the drug.</p>
          <p>I agree to ensure that all associates, colleagues, and employees assisting in the conduct of the study are informed about their obligations in meeting the above commitments.</p>
          <p>I agree to maintain adequate and accurate records in accordance with 21 CFR 312.62 and to make those records available for inspection in accordance with 21 CFR 312.68.</p>
          <p>I will ensure that an IRB that complies with the requirements of 21 CFR Part 56 will be responsible for the initial and continuing review and approval of the clinical investigation.</p>
          <p>I agree to comply with all other requirements regarding the obligations of clinical investigators and all other pertinent requirements in 21 CFR Part 312.</p>
        </section>

        <section class="signature-section">
          <h2>SIGNATURE OF INVESTIGATOR</h2>
          <div class="signature-box">
            <p><strong>Signature:</strong> ____________________________________</p>
            <p><strong>Date:</strong> {CURRENT_DATE}</p>
          </div>
          <p class="warning"><em>WARNING: A willfully false statement is a criminal offense. U.S.C. Title 18, Sec. 1001.</em></p>
        </section>
      </div>
    `,
  },

  // Zone 07 - Safety Reporting
  'art-07.01.01': {
    artifactNumber: 'art-07.01.01',
    name: 'Safety Management Plan',
    zone: 'zone-07',
    sections: [
      { title: 'Overview', content: 'Safety Management Overview' },
      { title: 'Adverse Events', content: 'AE Definitions and Grading' },
      { title: 'Reporting', content: 'Safety Reporting Procedures' },
      { title: 'Monitoring', content: 'Safety Monitoring Plan' },
    ],
    content: `
      <div class="tmf-document safety-plan">
        <header class="document-header">
          <div class="sponsor-logo">{SPONSOR_NAME}</div>
          <h1>SAFETY MANAGEMENT PLAN</h1>
          <div class="document-info">
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Study:</span> <span class="value">{STUDY_TITLE}</span></div>
            <div class="info-row"><span class="label">Version:</span> <span class="value">2.0</span></div>
            <div class="info-row"><span class="label">Effective Date:</span> <span class="value">{CURRENT_DATE}</span></div>
            <div class="info-row"><span class="label">Drug:</span> <span class="value">LIG-2847 (Nexavant)</span></div>
          </div>
        </header>

        <section class="confidentiality">
          <p class="confidential-notice">CONFIDENTIAL</p>
          <p>This document contains confidential information belonging to {SPONSOR_NAME}. Do not copy or distribute without authorization.</p>
        </section>

        <section class="toc">
          <h2>TABLE OF CONTENTS</h2>
          <ol>
            <li>Introduction and Purpose</li>
            <li>Definitions</li>
            <li>Adverse Event Collection and Reporting</li>
            <li>Serious Adverse Event Reporting</li>
            <li>Safety Monitoring</li>
            <li>Risk Management</li>
            <li>Roles and Responsibilities</li>
            <li>References</li>
          </ol>
        </section>

        <section class="introduction">
          <h2>1. INTRODUCTION AND PURPOSE</h2>
          <p>This Safety Management Plan (SMP) describes the procedures and responsibilities for the collection, evaluation, and reporting of safety information during the conduct of protocol {PROTOCOL_NUMBER} ({STUDY_TITLE}).</p>
          
          <h3>1.1 Objectives</h3>
          <ul>
            <li>Ensure consistent collection and assessment of adverse events</li>
            <li>Define responsibilities for safety monitoring and reporting</li>
            <li>Establish expedited reporting requirements per regulatory guidelines</li>
            <li>Describe the risk management approach for the study</li>
          </ul>
          
          <h3>1.2 Scope</h3>
          <p>This plan applies to all adverse events occurring from the time of informed consent through the end of the safety follow-up period (30 days after last dose of study drug).</p>
        </section>

        <section class="definitions">
          <h2>2. DEFINITIONS</h2>
          
          <h3>2.1 Adverse Event (AE)</h3>
          <p>Any untoward medical occurrence in a subject administered a pharmaceutical product, regardless of causal relationship to the study drug.</p>
          
          <h3>2.2 Serious Adverse Event (SAE)</h3>
          <p>An AE that meets any of the following criteria:</p>
          <ul>
            <li>Results in death</li>
            <li>Is life-threatening</li>
            <li>Requires inpatient hospitalization or prolongation of existing hospitalization</li>
            <li>Results in persistent or significant disability/incapacity</li>
            <li>Is a congenital anomaly/birth defect</li>
            <li>Is a medically important event</li>
          </ul>
          
          <h3>2.3 Adverse Event of Special Interest (AESI)</h3>
          <p>Based on the known safety profile of LIG-2847, the following are designated as AESIs:</p>
          <table class="aesi-table">
            <tr><th>AESI</th><th>Monitoring Required</th></tr>
            <tr><td>Hepatotoxicity (ALT/AST >3x ULN)</td><td>LFTs every 2 weeks x 3 months</td></tr>
            <tr><td>Interstitial Lung Disease</td><td>CT chest if respiratory symptoms</td></tr>
            <tr><td>QT Prolongation (>500ms or >60ms increase)</td><td>ECG at specified timepoints</td></tr>
            <tr><td>Severe Diarrhea (Grade ≥3)</td><td>Stool culture, supportive care</td></tr>
          </table>
        </section>

        <section class="ae-collection">
          <h2>3. ADVERSE EVENT COLLECTION AND REPORTING</h2>
          
          <h3>3.1 Collection Period</h3>
          <p>AEs will be collected from informed consent through 30 days after last dose of study drug.</p>
          
          <h3>3.2 AE Assessment</h3>
          <table class="assessment-table">
            <tr><th>Parameter</th><th>Assessment Criteria</th></tr>
            <tr><td>Severity</td><td>CTCAE v5.0 (Grades 1-5)</td></tr>
            <tr><td>Causality</td><td>Related, Possibly Related, Not Related</td></tr>
            <tr><td>Outcome</td><td>Recovered, Recovering, Not Recovered, Fatal, Unknown</td></tr>
            <tr><td>Action Taken</td><td>None, Dose Modified, Drug Interrupted, Drug Discontinued</td></tr>
          </table>
          
          <h3>3.3 Documentation</h3>
          <p>All AEs must be documented on the Adverse Event eCRF with:</p>
          <ul>
            <li>Verbatim term (to be coded to MedDRA)</li>
            <li>Start and stop dates</li>
            <li>Severity grade</li>
            <li>Relationship to study drug</li>
            <li>Action taken with study drug</li>
            <li>Outcome</li>
            <li>Whether it meets criteria for SAE</li>
          </ul>
        </section>

        <section class="sae-reporting">
          <h2>4. SERIOUS ADVERSE EVENT REPORTING</h2>
          
          <h3>4.1 Investigator Responsibilities</h3>
          <table class="timeline-table">
            <tr><th>Action</th><th>Timeline</th></tr>
            <tr><td>Initial report to Sponsor</td><td>Within 24 hours of awareness</td></tr>
            <tr><td>SAE form completion</td><td>Within 24 hours</td></tr>
            <tr><td>Follow-up information</td><td>Within 24 hours of new information</td></tr>
            <tr><td>IRB notification</td><td>Per local requirements</td></tr>
          </table>
          
          <h3>4.2 Sponsor Responsibilities</h3>
          <table class="timeline-table">
            <tr><th>Report Type</th><th>Timeline</th><th>Recipients</th></tr>
            <tr><td>Fatal/Life-threatening SUSAR</td><td>7 calendar days</td><td>FDA, EMA, all investigators</td></tr>
            <tr><td>Other SUSAR</td><td>15 calendar days</td><td>FDA, EMA, all investigators</td></tr>
            <tr><td>IND Safety Report</td><td>15 calendar days</td><td>FDA</td></tr>
          </table>
          
          <h3>4.3 SAE Reporting Contacts</h3>
          <table class="contact-table">
            <tr><td><strong>24/7 Safety Hotline:</strong></td><td>(800) 555-SAFE</td></tr>
            <tr><td><strong>Email:</strong></td><td>safety@ligaturesponsor.com</td></tr>
            <tr><td><strong>Fax:</strong></td><td>(617) 555-0199</td></tr>
          </table>
        </section>

        <section class="safety-monitoring">
          <h2>5. SAFETY MONITORING</h2>
          
          <h3>5.1 Data Safety Monitoring Board (DSMB)</h3>
          <p>An independent DSMB will review safety data at the following intervals:</p>
          <ul>
            <li>After enrollment of first 50 subjects</li>
            <li>Every 6 months thereafter</li>
            <li>Ad hoc meetings as needed for safety signals</li>
          </ul>
          
          <h3>5.2 Safety Review Team (SRT)</h3>
          <p>Internal safety reviews will be conducted weekly by the sponsor's SRT, consisting of:</p>
          <ul>
            <li>Medical Monitor</li>
            <li>Drug Safety Physician</li>
            <li>Biostatistician</li>
            <li>Clinical Operations Lead</li>
          </ul>
          
          <h3>5.3 Stopping Rules</h3>
          <p>The study may be paused or terminated if:</p>
          <ul>
            <li>Drug-related mortality exceeds 2%</li>
            <li>≥3 cases of same unexpected SAE occur</li>
            <li>DSMB recommends pause/termination</li>
            <li>Regulatory authority requests suspension</li>
          </ul>
        </section>

        <section class="risk-management">
          <h2>6. RISK MANAGEMENT</h2>
          
          <h3>6.1 Known Risks</h3>
          <p>Based on preclinical and clinical data, the following risks have been identified:</p>
          <table class="risk-table">
            <tr><th>Risk</th><th>Frequency</th><th>Mitigation</th></tr>
            <tr><td>Hepatotoxicity</td><td>10-15%</td><td>Regular LFT monitoring, dose modification guidelines</td></tr>
            <tr><td>Fatigue</td><td>40-45%</td><td>Patient education, supportive care</td></tr>
            <tr><td>Nausea/Diarrhea</td><td>30-35%</td><td>Prophylactic antiemetics, dose modification</td></tr>
            <tr><td>Rash</td><td>20-25%</td><td>Topical treatment, dose modification if severe</td></tr>
          </table>
          
          <h3>6.2 Dose Modification Guidelines</h3>
          <p>See Protocol Section 6.5 for detailed dose modification criteria based on toxicity grade.</p>
        </section>

        <section class="roles">
          <h2>7. ROLES AND RESPONSIBILITIES</h2>
          <table class="roles-table">
            <tr><th>Role</th><th>Name</th><th>Responsibilities</th></tr>
            <tr><td>Medical Monitor</td><td>Dr. Michael Rodriguez</td><td>Medical oversight, SAE review, causality assessment</td></tr>
            <tr><td>Drug Safety Physician</td><td>Dr. Emily Park</td><td>SUSAR assessment, regulatory reporting</td></tr>
            <tr><td>Safety Data Manager</td><td>Jennifer Kim</td><td>SAE database management, reconciliation</td></tr>
            <tr><td>Clinical Operations</td><td>David Chen</td><td>Site communication, safety training</td></tr>
          </table>
        </section>

        <section class="approvals">
          <h2>APPROVALS</h2>
          <div class="approval-row">
            <div class="approval-block">
              <p><strong>Medical Monitor:</strong></p>
              <div class="signature-line">Signed electronically</div>
              <p>Dr. Michael Rodriguez</p>
              <p>Date: {CURRENT_DATE}</p>
            </div>
            <div class="approval-block">
              <p><strong>Drug Safety Physician:</strong></p>
              <div class="signature-line">Signed electronically</div>
              <p>Dr. Emily Park</p>
              <p>Date: {CURRENT_DATE}</p>
            </div>
          </div>
        </section>
      </div>
    `,
  },

  'art-07.02.01': {
    artifactNumber: 'art-07.02.01',
    name: 'SAE Report',
    zone: 'zone-07',
    sections: [
      { title: 'Event Summary', content: 'SAE Description' },
      { title: 'Medical History', content: 'Relevant History' },
      { title: 'Assessment', content: 'Causality and Outcome' },
    ],
    content: `
      <div class="tmf-document sae-report">
        <header class="document-header urgent">
          <h1>⚠ SERIOUS ADVERSE EVENT REPORT</h1>
          <div class="report-info">
            <div class="info-row urgent"><span class="label">SAE ID:</span> <span class="value">SAE-2024-0847</span></div>
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Subject ID:</span> <span class="value">101-005</span></div>
            <div class="info-row"><span class="label">Report Type:</span> <span class="value">Initial</span></div>
            <div class="info-row"><span class="label">Report Date:</span> <span class="value">{CURRENT_DATE}</span></div>
          </div>
        </header>

        <section class="event-summary">
          <h2>EVENT SUMMARY</h2>
          <table class="event-table">
            <tr><td>SAE Term</td><td><strong>Grade 3 Hepatotoxicity</strong></td></tr>
            <tr><td>MedDRA PT</td><td>Alanine aminotransferase increased</td></tr>
            <tr><td>MedDRA SOC</td><td>Hepatobiliary disorders</td></tr>
            <tr><td>Onset Date</td><td>December 15, 2024</td></tr>
            <tr><td>Awareness Date</td><td>December 17, 2024</td></tr>
            <tr><td>Seriousness Criteria</td><td>Hospitalization</td></tr>
            <tr><td>Outcome</td><td>Recovering</td></tr>
          </table>
        </section>

        <section class="narrative">
          <h2>NARRATIVE</h2>
          <p>A 58-year-old male subject enrolled in protocol {PROTOCOL_NUMBER} was admitted to the hospital on 15-Dec-2024 with elevated liver enzymes discovered during routine laboratory monitoring.</p>
          
          <p>The subject had been receiving LIG-2847 200mg BID since 01-Nov-2024 (Cycle 2, Day 15 at time of event). Baseline liver function tests were within normal limits.</p>
          
          <p>Laboratory values at time of event:</p>
          <ul>
            <li>ALT: 287 U/L (ULN: 40 U/L) - 7.2x ULN</li>
            <li>AST: 198 U/L (ULN: 37 U/L) - 5.4x ULN</li>
            <li>Total Bilirubin: 1.8 mg/dL (ULN: 1.2 mg/dL) - 1.5x ULN</li>
            <li>ALP: 156 U/L (ULN: 120 U/L) - 1.3x ULN</li>
          </ul>
          
          <p>Study drug was permanently discontinued on 16-Dec-2024. The subject received supportive care including IV fluids and hepatoprotective agents.</p>
        </section>

        <section class="causality">
          <h2>CAUSALITY ASSESSMENT</h2>
          <table class="causality-table">
            <tr><td>Investigator Assessment</td><td><strong>Related</strong></td></tr>
            <tr><td>Sponsor Assessment</td><td>Possibly Related</td></tr>
            <tr><td>Temporal Relationship</td><td>Yes - onset during treatment</td></tr>
            <tr><td>Dechallenge</td><td>Positive - improving after discontinuation</td></tr>
            <tr><td>Alternative Etiology</td><td>None identified</td></tr>
          </table>
        </section>

        <section class="action-taken">
          <h2>ACTION TAKEN</h2>
          <ul>
            <li>Study drug permanently discontinued</li>
            <li>Subject hospitalized for monitoring (4 days)</li>
            <li>Concomitant hepatotoxic medications reviewed - none identified</li>
            <li>Hepatology consultation obtained</li>
            <li>Follow-up labs scheduled weekly until resolution</li>
          </ul>
        </section>

        <section class="reporter">
          <h2>REPORTER INFORMATION</h2>
          <table class="reporter-table">
            <tr><td>Investigator</td><td>Dr. Robert Chen</td></tr>
            <tr><td>Site</td><td>University Medical Center (Site 101)</td></tr>
            <tr><td>Report Date</td><td>{CURRENT_DATE}</td></tr>
          </table>
          <div class="signature-block">
            <p>Investigator Signature: Signed electronically</p>
          </div>
        </section>
      </div>
    `,
  },

  // Zone 10 - Data Management
  'art-10.01.01': {
    artifactNumber: 'art-10.01.01',
    name: 'Data Management Plan',
    zone: 'zone-10',
    sections: [
      { title: 'Overview', content: 'DMP Overview' },
      { title: 'Data Collection', content: 'Data Collection Procedures' },
      { title: 'Quality Control', content: 'Data Quality Procedures' },
    ],
    content: `
      <div class="tmf-document dmp">
        <header class="document-header">
          <h1>DATA MANAGEMENT PLAN</h1>
          <div class="document-info">
            <div class="info-row"><span class="label">Protocol:</span> <span class="value">{PROTOCOL_NUMBER}</span></div>
            <div class="info-row"><span class="label">Study:</span> <span class="value">{STUDY_TITLE}</span></div>
            <div class="info-row"><span class="label">Version:</span> <span class="value">2.0</span></div>
            <div class="info-row"><span class="label">Effective Date:</span> <span class="value">{CURRENT_DATE}</span></div>
          </div>
        </header>

        <section class="overview">
          <h2>1. OVERVIEW</h2>
          <p>This Data Management Plan (DMP) describes the processes and procedures for collecting, processing, validating, and managing clinical trial data for protocol {PROTOCOL_NUMBER}.</p>
          
          <h3>1.1 EDC System</h3>
          <p>Data will be collected using Medidata Rave EDC (version 2024.1.0). All users will receive training and be granted role-appropriate access.</p>
          
          <h3>1.2 Scope</h3>
          <p>This DMP covers all data collected during the study including:</p>
          <ul>
            <li>Electronic Case Report Forms (eCRFs)</li>
            <li>Laboratory data (central and local)</li>
            <li>Imaging data (RECIST assessments)</li>
            <li>Patient-reported outcomes (PRO)</li>
            <li>Safety data including SAEs</li>
          </ul>
        </section>

        <section class="data-collection">
          <h2>2. DATA COLLECTION</h2>
          <h3>2.1 eCRF Design</h3>
          <p>eCRFs have been designed in accordance with CDASH standards where applicable. Key forms include:</p>
          <ul>
            <li>Demographics (DM)</li>
            <li>Medical History (MH)</li>
            <li>Vital Signs (VS)</li>
            <li>Laboratory Results (LB)</li>
            <li>Adverse Events (AE)</li>
            <li>Concomitant Medications (CM)</li>
            <li>Tumor Assessment (RS)</li>
            <li>Exposure (EX)</li>
          </ul>
          
          <h3>2.2 Data Entry Timelines</h3>
          <table class="timeline-table">
            <tr><th>Data Type</th><th>Entry Deadline</th></tr>
            <tr><td>Screening/Baseline</td><td>Within 3 business days</td></tr>
            <tr><td>Treatment visits</td><td>Within 5 business days</td></tr>
            <tr><td>SAEs</td><td>Within 24 hours of awareness</td></tr>
            <tr><td>Laboratory data</td><td>Automatic transfer within 24 hours</td></tr>
          </table>
        </section>

        <section class="quality">
          <h2>3. DATA QUALITY</h2>
          <h3>3.1 Edit Checks</h3>
          <p>Over 450 programmed edit checks have been implemented including:</p>
          <ul>
            <li>Range checks for vital signs and laboratory values</li>
            <li>Consistency checks across related forms</li>
            <li>Date logic validations</li>
            <li>Required field enforcement</li>
          </ul>
          
          <h3>3.2 Query Management</h3>
          <p>Data discrepancies will be managed through the EDC query function. Target query resolution time is ≤14 days. Open queries will be reviewed weekly by the Data Management team.</p>
          
          <h3>3.3 SAE Reconciliation</h3>
          <p>Monthly SAE reconciliation will be performed between the EDC and safety database (Argus) to ensure consistency.</p>
        </section>

        <section class="database-lock">
          <h2>4. DATABASE LOCK</h2>
          <p>Database lock procedures will include:</p>
          <ol>
            <li>100% SDV completion for critical data points</li>
            <li>Resolution of all open queries</li>
            <li>Completion of medical review</li>
            <li>Final SAE reconciliation</li>
            <li>Coding completion and review</li>
            <li>Data Management sign-off</li>
          </ol>
        </section>

        <section class="approval">
          <h2>APPROVALS</h2>
          <div class="approval-block">
            <p>Data Management Lead: James Wilson</p>
            <p>Signature: Signed electronically</p>
            <p>Date: {CURRENT_DATE}</p>
          </div>
          <div class="approval-block">
            <p>Biostatistics Lead: Dr. Emily Park</p>
            <p>Signature: Signed electronically</p>
            <p>Date: {CURRENT_DATE}</p>
          </div>
        </section>
      </div>
    `,
  },
};

// Zone name map for display
export const ZONE_DISPLAY_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central and Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};
