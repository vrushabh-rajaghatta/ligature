// =============================================================================
// AI SECTION PROMPT ENRICHMENT — v0.42.49
// =============================================================================
// Comprehensive mapping of CTD section patterns → rich AI generation prompts.
// This layer enriches ALL templates at generation time, regardless of whether
// the template has an explicit aiPrompt field. The section-generate API route
// checks this mapping first, then falls back to the template's own aiPrompt,
// then to the built-in category-level guidance.
//
// Coverage: Module 1 (regional), Module 2 (summaries), Module 3 (quality),
// Module 4 (nonclinical), Module 5 (clinical), safety reports, labeling
//
// Priority: WRITE RICH, SPECIFIC PROMPTS that produce investor-ready output.
// Each prompt includes: structure requirements, key data elements, formatting,
// ICH guideline references, and quality indicators.
// =============================================================================

export interface AISectionPrompt {
  /** Regex pattern to match section number (case-insensitive) */
  pattern: string;
  /** Optional title keywords for disambiguation */
  titleKeywords?: string[];
  /** Document category restriction (if any) */
  category?: string;
  /** The AI prompt — detailed generation instructions */
  prompt: string;
  /** Suggested word count range */
  wordCount?: { min: number; max: number };
  /** ICH/regulatory guideline references */
  guidelines?: string[];
}

// =============================================================================
// MODULE 2 — CTD SUMMARIES
// =============================================================================

const MODULE_2_PROMPTS: AISectionPrompt[] = [
  // ---- 2.2 Introduction ----
  {
    pattern: '^2\\.2$',
    prompt: `Write the CTD Introduction per ICH M4. Include:
1. Drug substance: INN, pharmacological class, mechanism of action
2. Drug product: dosage form(s), strength(s), route of administration
3. Proposed indication(s) and target population
4. Brief development program overview (number of studies, phases)
5. Application type (NDA/BLA/MAA) and any special designations (breakthrough, orphan, accelerated)
Keep concise — this is a 1-page executive overview of the entire dossier.`,
    wordCount: { min: 300, max: 600 },
    guidelines: ['ICH M4'],
  },

  // ---- 2.3 Quality Overall Summary ----
  {
    pattern: '^2\\.3',
    titleKeywords: ['introduction', 'overview'],
    category: 'quality-cmc',
    prompt: `Write the Quality Overall Summary (QOS) introduction per ICH M4Q(R1). Include:
1. Drug substance description (name, class, structure summary)
2. Drug product description (form, strength, packaging)
3. Brief overview of quality development strategy
4. Cross-references to Module 3 sections for detailed data
Use formal scientific language appropriate for regulatory review.`,
    wordCount: { min: 200, max: 500 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^2\\.3\\.S',
    prompt: `Write the QOS Drug Substance section per ICH M4Q(R1). Summarize:
1. General information (nomenclature, structure, properties)
2. Manufacturing process overview with starting materials
3. Characterization highlights (structure confirmation, impurity profile)
4. Control strategy (specifications, analytical methods, batch data)
5. Reference standards and container closure
6. Stability summary and proposed retest period
Cross-reference each Module 3.2.S subsection with [Section 3.2.S.x.x] format.`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q6A', 'ICH Q3A'],
  },
  {
    pattern: '^2\\.3\\.P',
    prompt: `Write the QOS Drug Product section per ICH M4Q(R1). Summarize:
1. Description and composition (quantitative formula per unit dose)
2. Pharmaceutical development rationale (formulation, process, CCS)
3. Manufacturing process overview with CPPs and IPCs
4. Control of excipients
5. Specifications and analytical methods
6. Batch data summary
7. Stability and proposed shelf life
Cross-reference Module 3.2.P subsections throughout.`,
    wordCount: { min: 2000, max: 5000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q8(R2)', 'ICH Q6A'],
  },

  // ---- 2.4 Nonclinical Overview ----
  {
    pattern: '^2\\.4',
    prompt: `Write the Nonclinical Overview per ICH M4S. This is an integrated expert assessment, NOT a summary of individual studies. Include:
1. Nonclinical testing strategy and species selection justification
2. Pharmacology: mechanism, primary/secondary pharmacodynamics, safety pharmacology
3. Pharmacokinetics: ADME, species comparison to human, exposure coverage
4. Toxicology: key findings across studies, target organs, reversibility
5. Integrated assessment of nonclinical findings and clinical relevance
6. Risk assessment: safety margins, dose-limiting toxicities, monitoring implications
Write as a scientific narrative that tells the nonclinical development story.`,
    wordCount: { min: 3000, max: 8000 },
    guidelines: ['ICH M4S', 'ICH S7A', 'ICH S9'],
  },

  // ---- 2.5 Clinical Overview ----
  {
    pattern: '^2\\.5',
    prompt: `Write the Clinical Overview per ICH M4E and ICH E1. This is the integrated benefit-risk assessment. Include:
1. Product development rationale and scientific context
2. Overview of biopharmaceutics and clinical pharmacology
3. Efficacy summary: endpoints, populations, key results across studies
4. Safety summary: overall profile, dose-response, special populations
5. Benefit-risk conclusions with quantitative framework
6. Proposed dosing, indication, and target population justification
This is the single most important clinical document — write with authority.`,
    wordCount: { min: 4000, max: 10000 },
    guidelines: ['ICH M4E', 'ICH E1'],
  },

  // ---- 2.7 Clinical Summary ----
  {
    pattern: '^2\\.7\\.1',
    prompt: `Write the Summary of Biopharmaceutic Studies per ICH M4E. Include:
1. Bioavailability studies: absolute and relative BA, formulation comparisons
2. Bioequivalence studies: pivotal BE data if applicable
3. In vitro dissolution: method development, profiles across media
4. Food effect studies: fed vs. fasted PK parameters
5. Bioanalytical methods: validation summary, sensitivity, selectivity
Present PK parameters in tabular format (AUC, Cmax, Tmax, t½).`,
    wordCount: { min: 2000, max: 6000 },
    guidelines: ['ICH M4E', 'ICH M10'],
  },
  {
    pattern: '^2\\.7\\.2',
    prompt: `Write the Summary of Clinical Pharmacology Studies per ICH M4E. Include:
1. PK characterization: single/multiple dose, dose proportionality, accumulation
2. Absorption, distribution, metabolism, excretion (ADME)
3. Intrinsic factors: hepatic/renal impairment, age, sex, race, body weight
4. Extrinsic factors: drug-drug interactions (CYP, transporter), food
5. Pharmacokinetic/pharmacodynamic relationships (exposure-response)
6. Population PK model summary if available
7. Dosing recommendations derived from PK data
Present data with AMA statistical formatting throughout.`,
    wordCount: { min: 3000, max: 8000 },
    guidelines: ['ICH M4E', 'ICH E4', 'ICH E7'],
  },
  {
    pattern: '^2\\.7\\.3',
    prompt: `Write the Summary of Clinical Efficacy per ICH M4E. This integrates efficacy across ALL studies. Include:
1. Study design overview table (all efficacy studies)
2. Patient populations: demographics, disease characteristics, disposition
3. Primary endpoint results across studies with statistical detail
4. Key secondary endpoints with multiplicity-adjusted results
5. Subgroup analyses: consistency of treatment effect
6. Dose-response relationship for efficacy
7. Clinical relevance of efficacy results
8. Persistence of efficacy (durability, time-to-event analyses)
Use forest plots reference [Figure X] for subgroup analyses. Present all HRs with 95% CIs.`,
    wordCount: { min: 5000, max: 12000 },
    guidelines: ['ICH M4E', 'ICH E9', 'ICH E10'],
  },
  {
    pattern: '^2\\.7\\.4',
    prompt: `Write the Summary of Clinical Safety per ICH M4E. This integrates safety across ALL studies and is critical for labeling. Include:
1. Overall safety database: exposure (patient-years) by study, dose, duration
2. Common adverse events: incidence tables by SOC and PT, severity, dose-relationship
3. Serious adverse events: tabulation, narratives summary, causality assessment
4. Deaths: listing, analysis of causes, treatment-relatedness
5. Discontinuations due to adverse events
6. Laboratory abnormalities: clinically significant shifts, hepatotoxicity screening
7. Vital signs and ECG findings
8. Safety in special populations (elderly, renal/hepatic impairment, pediatric)
9. Overdose, drug abuse potential, withdrawal/rebound
10. Post-marketing experience if applicable
All TEAEs by SOC with ≥1% incidence in any group. Hy's Law assessment.`,
    wordCount: { min: 6000, max: 15000 },
    guidelines: ['ICH M4E', 'ICH E1', 'ICH E2D'],
  },
  {
    pattern: '^2\\.7\\.5',
    prompt: `Write the Literature References per ICH M4E. Compile a complete bibliography of:
1. All clinical studies referenced in the Clinical Summary
2. Published literature supporting the clinical development program
3. Relevant guidelines and regulatory guidance documents
4. Pharmacoepidemiologic references if applicable
Format per AMA 11th Edition citation style. Number sequentially as referenced in text.`,
    wordCount: { min: 500, max: 2000 },
    guidelines: ['ICH M4E'],
  },
  {
    pattern: '^2\\.7\\.6',
    prompt: `Write the Synopses of Individual Studies per ICH M4E and E3. For each study, provide:
1. Study number, title, and phase
2. Study design (parallel, crossover, open-label, double-blind)
3. Key inclusion/exclusion criteria
4. Treatment arms, dosing, and duration
5. Primary and key secondary endpoints
6. Statistical methods summary
7. Key efficacy and safety results
8. Conclusions
Format as structured synopses with consistent subheadings across all studies.`,
    wordCount: { min: 3000, max: 10000 },
    guidelines: ['ICH M4E', 'ICH E3'],
  },
];

// =============================================================================
// MODULE 3 — QUALITY (DRUG SUBSTANCE)
// =============================================================================

const MODULE_3S_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^3\\.2\\.S\\.1\\.1',
    prompt: `Write the Nomenclature section. Include in tabular format:
- International Nonproprietary Name (INN): proposed or recommended
- United States Adopted Name (USAN)
- British Approved Name (BAN) and Japanese Accepted Name (JAN) if applicable
- Chemical name(s) per IUPAC nomenclature
- Company/laboratory code(s)
- CAS Registry Number
- Other designations or synonyms`,
    wordCount: { min: 100, max: 300 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.1\\.2',
    prompt: `Write the Structure section. Include:
1. Structural formula diagram reference [Figure 3.2.S.1.2-1]
2. Molecular formula
3. Relative molecular mass (molecular weight)
4. Stereochemistry: number of chiral centers, absolute configuration, enantiomeric purity
5. Polymorphic forms identified (reference Section 3.2.S.3 for detailed characterization)
For biologics: amino acid sequence, disulfide bonds, glycosylation pattern.`,
    wordCount: { min: 200, max: 500 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.1\\.3',
    prompt: `Write the General Properties section. Present in tabular format:
1. Physical description (appearance, crystalline form, color)
2. Solubility profile: aqueous solubility across pH 1-9, organic solvents
3. Partition coefficient (log P / log D at physiological pH)
4. Dissociation constant(s) (pKa)
5. Hygroscopicity (DVS data summary)
6. Melting point / decomposition temperature
7. Optical rotation [α]D if chiral
8. BCS classification (high/low solubility, high/low permeability)`,
    wordCount: { min: 200, max: 500 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q6A'],
  },
  {
    pattern: '^3\\.2\\.S\\.2\\.1',
    prompt: `Write the Manufacturer(s) section. For each manufacturing site:
1. Full name, address, and GMP certificate reference
2. Role in manufacturing (synthesis, purification, final isolation, testing)
3. FEI number (for FDA) and EU establishment number (for EMA)
4. Site master file reference if applicable
Include contract manufacturers and testing laboratories.`,
    wordCount: { min: 200, max: 500 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.2\\.2',
    prompt: `Write the Manufacturing Process Description. This is a high-detail section. Include:
1. Process flow diagram [Figure 3.2.S.2.2-1] showing all unit operations
2. Starting material(s) with ICH Q11 justification for selection point
3. Detailed narrative for each synthetic step:
   - Reagents, solvents, catalysts with quantities/ratios
   - Reaction conditions (temperature, pressure, time, atmosphere)
   - In-process controls (IPC) with acceptance criteria
   - Isolation/purification method for intermediates
4. Critical process parameters (CPPs) with proven acceptable ranges [Table 3.2.S.2.2-1]
5. Process controls: in-process testing, hold times, equipment cleaning
6. Reprocessing criteria and procedures if applicable
7. Alternative processes if applicable`,
    wordCount: { min: 2000, max: 5000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q11', 'ICH Q7'],
  },
  {
    pattern: '^3\\.2\\.S\\.2\\.3',
    prompt: `Write the Control of Materials section. Include:
1. Starting materials: specifications table (tests, methods, acceptance criteria)
2. Reagents: grade, source, specifications for critical reagents
3. Solvents: class per ICH Q3C, specifications, recycling procedures
4. Catalysts: specifications, control of catalyst residues
5. Supplier qualification approach
For biological starting materials: source, adventitious agent testing, viral safety.`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q3C', 'ICH Q11'],
  },
  {
    pattern: '^3\\.2\\.S\\.2\\.4',
    prompt: `Write the Critical Steps and Intermediates section. Include:
1. Identification of critical steps with scientific justification
2. For each isolated intermediate:
   - Specifications table (identity, purity, impurity limits)
   - Hold time and storage conditions
   - Analytical methods used for release
3. Design space description if applicable (ICH Q8)
4. Impurity fate and purge analysis across process steps`,
    wordCount: { min: 500, max: 2000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q11'],
  },
  {
    pattern: '^3\\.2\\.S\\.2\\.5',
    prompt: `Write the Process Validation section. Include:
1. Validation approach: traditional, continuous, or hybrid (ICH Q7/Q11)
2. Validation protocol reference and summary
3. Batch data summary [Table 3.2.S.2.5-1]: batch numbers, scale, dates, results
4. CPP verification against proven acceptable ranges
5. Process capability analysis for critical quality attributes
6. Ongoing process verification strategy
7. Conclusions on process robustness and state of control`,
    wordCount: { min: 800, max: 2000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q7', 'FDA Process Validation Guidance'],
  },
  {
    pattern: '^3\\.2\\.S\\.3\\.1',
    prompt: `Write the Structure Elucidation section. Include:
1. Spectroscopic confirmation: UV, IR, NMR (1H, 13C, 2D), MS (high-resolution)
2. Elemental analysis results
3. X-ray powder diffraction (XRPD) for crystalline form confirmation
4. Absolute stereochemistry confirmation (chiral HPLC, optical rotation, X-ray crystal structure)
5. For each technique: method, key data, interpretation
Reference spectral data in appendices: [Appendix 3.2.S.3.1]
For biologics: primary, secondary, tertiary, quaternary structure; PTMs; biological activity.`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.3\\.2',
    prompt: `Write the Impurities section. Include:
1. Process-related impurities table: structure, origin, control point, limits
2. Drug-related impurities (degradation products): pathways, conditions, structures
3. Residual solvents per ICH Q3C: class, PDE, limit, method
4. Elemental impurities per ICH Q3D: risk assessment, PDE, limits
5. Genotoxic impurities per ICH M7: risk assessment, TTC-based limits
6. Impurity fate and purge: process understanding data
7. Identification thresholds per ICH Q3A(R2)
8. Qualification status of specified impurities
[Table 3.2.S.3.2-1: Summary of Impurities]`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH Q3A(R2)', 'ICH Q3C(R8)', 'ICH Q3D(R2)', 'ICH M7(R2)'],
  },
  {
    pattern: '^3\\.2\\.S\\.4\\.1',
    prompt: `Write the Specification section. Present as:
1. Specification table [Table 3.2.S.4.1-1]:
   Test | Method | Acceptance Criteria
   - Description/Appearance
   - Identification (IR, HPLC retention time, etc.)
   - Assay (% w/w)
   - Impurities: each specified, unspecified, total
   - Residual solvents
   - Water content
   - Particle size (if applicable)
   - Microbial limits (if applicable)
2. Justification for each specification limit
3. Comparison with compendial monograph if available`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH Q6A', 'ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.4\\.2',
    prompt: `Write the Analytical Procedures section. For each method:
1. Method type (compendial reference or in-house)
2. Principle (e.g., reversed-phase HPLC with UV detection)
3. Key parameters: column, mobile phase, flow rate, detection wavelength
4. System suitability criteria
For compendial methods: USP/EP/JP monograph reference.
For non-compendial methods: brief description, reference to validation in S.4.3.`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q2(R2)'],
  },
  {
    pattern: '^3\\.2\\.S\\.4\\.3',
    prompt: `Write the Analytical Validation section per ICH Q2(R2). For each non-compendial method:
1. Validation parameters table:
   - Specificity/Selectivity: forced degradation, placebo interference
   - Linearity: range, correlation coefficient (r² ≥ 0.999)
   - Accuracy: recovery at 3 levels (80%, 100%, 120%)
   - Precision: repeatability (RSD), intermediate precision
   - Range: validated concentration range
   - Quantitation limit (LOQ) and detection limit (LOD) for impurity methods
   - Robustness: deliberate parameter variations
2. Summary conclusions for each method
[Table 3.2.S.4.3-1: Analytical Validation Summary]`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH Q2(R2)'],
  },
  {
    pattern: '^3\\.2\\.S\\.4\\.4',
    prompt: `Write the Batch Analyses section. Present:
1. Batch analysis summary table [Table 3.2.S.4.4-1]:
   Batch # | Scale | Mfg Site | Mfg Date | Use | Results vs. Specifications
2. Include all clinical, stability, and process validation batches
3. Highlight any individual out-of-specification results and disposition
4. Trend analysis for key quality attributes across batches
5. Comparison of results across manufacturing scales`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.S\\.7',
    prompt: `Write the Stability section per ICH Q1A(R2). Include:
1. Stability protocol: conditions, time points, packaging
2. Results summary tables by condition:
   [Table 3.2.S.7-1: Long-term stability (25°C/60% RH)]
   [Table 3.2.S.7-2: Accelerated stability (40°C/75% RH)]
3. Stress/forced degradation: conditions tested, degradation observed
4. Photostability per ICH Q1B
5. Statistical analysis of stability data (regression, extrapolation)
6. Post-approval stability commitment
7. Proposed retest period with justification
Include stability-indicating method verification.`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH Q1A(R2)', 'ICH Q1B', 'ICH Q1E'],
  },
];

// =============================================================================
// MODULE 3 — QUALITY (DRUG PRODUCT)
// =============================================================================

const MODULE_3P_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^3\\.2\\.P\\.1',
    prompt: `Write the Description and Composition section. Include:
1. Dosage form description (tablet, capsule, injection, etc.)
2. Quantitative composition table per unit dose [Table 3.2.P.1-1]:
   Component | Function | Quality Standard | Amount per Unit | % w/w
3. Include active ingredient, excipients, and any overages with justification
4. Container closure system description
5. For parentigen products: reconstitution instructions`,
    wordCount: { min: 300, max: 800 },
    guidelines: ['ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.P\\.2',
    prompt: `Write the Pharmaceutical Development section per ICH Q8(R2). Include:
1. Components of the drug product:
   - Drug substance compatibility (excipient compatibility studies)
   - Excipient selection rationale (function, grade, source)
2. Drug product formulation development:
   - Prototype formulations and evolution
   - Design of experiments (DoE) results
   - Critical quality attributes (CQAs) identification
3. Manufacturing process development:
   - Unit operations selection and optimization
   - Scale-up considerations
4. Container closure system:
   - Selection rationale, extractables/leachables assessment
5. Microbiological attributes if applicable
6. Dissolution method development
This is a QbD-narrative — show the scientific rationale for every decision.`,
    wordCount: { min: 2000, max: 6000 },
    guidelines: ['ICH Q8(R2)', 'ICH Q9', 'ICH Q10'],
  },
  {
    pattern: '^3\\.2\\.P\\.3',
    prompt: `Write the Manufacture section. Include:
1. Manufacturer(s) details and roles
2. Batch formula [Table 3.2.P.3-1]: commercial and clinical scales
3. Manufacturing process description:
   - Flow diagram [Figure 3.2.P.3-1]
   - Narrative for each unit operation
   - CPPs with proven acceptable ranges
   - IPCs with acceptance criteria
4. Process controls table [Table 3.2.P.3-2]
5. Process validation summary
6. Packaging process description`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q8(R2)'],
  },
  {
    pattern: '^3\\.2\\.P\\.4',
    prompt: `Write the Control of Excipients section. For each excipient:
1. Specifications: compendial (USP/NF, EP, JP) or in-house
2. Source and grade
3. For novel excipients: complete characterization and safety data
4. For excipients of biological origin: TSE/BSE risk assessment
5. For excipients with functional requirements: critical attributes
Present as [Table 3.2.P.4-1: Excipient Specifications Summary].`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH M4Q(R1)', 'ICH Q6A'],
  },
  {
    pattern: '^3\\.2\\.P\\.5',
    prompt: `Write the Drug Product Specifications section. Include:
1. Specification table [Table 3.2.P.5-1]:
   Test | Method | Acceptance Criteria
   - Description, Identification, Assay
   - Degradation products (individual, total)
   - Dissolution/Disintegration
   - Uniformity (content uniformity or weight variation)
   - Water content, microbial limits
   - Product-specific tests (e.g., hardness, friability for tablets)
2. Justification for each specification limit
3. Comparison with compendial requirements`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH Q6A', 'ICH M4Q(R1)'],
  },
  {
    pattern: '^3\\.2\\.P\\.8',
    prompt: `Write the Drug Product Stability section per ICH Q1A(R2). Include:
1. Stability protocol: conditions, orientations, packaging configurations
2. Results by condition:
   [Table 3.2.P.8-1: Long-term stability data]
   [Table 3.2.P.8-2: Accelerated stability data]
   [Table 3.2.P.8-3: Intermediate stability data (if applicable)]
3. Photostability per ICH Q1B
4. In-use stability (if applicable)
5. Statistical analysis and shelf life estimation per ICH Q1E
6. Proposed shelf life, storage conditions, and labeling statements
7. Post-approval stability protocol and commitment`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH Q1A(R2)', 'ICH Q1B', 'ICH Q1E', 'ICH Q5C'],
  },
];

// =============================================================================
// MODULE 4 — NONCLINICAL
// =============================================================================

const MODULE_4_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^4\\.2\\.1',
    titleKeywords: ['pharmacology', 'primary'],
    prompt: `Write the Primary Pharmacodynamics section. For each study:
1. Study identification: number, GLP status, species/strain
2. In vitro studies: assay type, EC50/IC50, selectivity panel
3. In vivo efficacy models: species, dose levels, endpoints, results
4. Mechanism of action characterization
5. Receptor binding and functional assays
Present dose-response data with statistical analysis. Include [Table 4.2.1-1: Primary PD Study Summary].`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH M4S', 'ICH S7A'],
  },
  {
    pattern: '^4\\.2\\.2',
    titleKeywords: ['safety.*pharmacology'],
    prompt: `Write the Safety Pharmacology section per ICH S7A/S7B. Include:
1. Core battery studies:
   - Cardiovascular: hERG, in vivo telemetry (dog/monkey), QTc assessment
   - CNS: modified Irwin, FOB
   - Respiratory: plethysmography
2. Supplemental studies (if warranted by findings)
3. For each study: GLP status, species, dose levels, NOAEL, key findings
4. Integrated cardiovascular risk assessment
[Table 4.2.2-1: Safety Pharmacology Study Summary]`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH S7A', 'ICH S7B', 'ICH E14/S7B Q&A'],
  },
  {
    pattern: '^4\\.2\\.3',
    titleKeywords: ['toxicolog', 'repeat.*dose', 'general'],
    prompt: `Write the Repeat-Dose Toxicity section. For each study:
1. Study design: GLP status, species/strain, N/sex/group, dose levels, duration, route
2. Key findings by dose level: clinical signs, body weight, food consumption
3. Clinical pathology: hematology, clinical chemistry, urinalysis
4. Target organ identification with dose-response
5. NOAEL determination with justification
6. Reversibility assessment (recovery groups)
7. Toxicokinetic data: exposure (AUC, Cmax) at each dose, sex differences
8. Safety margins: comparison to clinical exposure
[Table 4.2.3-1: Repeat-Dose Toxicity Study Summary]
[Table 4.2.3-2: Toxicokinetic Exposure and Safety Margins]`,
    wordCount: { min: 2000, max: 5000 },
    guidelines: ['ICH M3(R2)', 'ICH S4'],
  },
];

// =============================================================================
// MODULE 5 — CLINICAL (CSR SECTIONS)
// =============================================================================

const MODULE_5_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^(9|5\\.3)',
    titleKeywords: ['method', 'study.*design', 'investigational.*plan'],
    prompt: `Write the Study Methods/Design section per ICH E3. Include:
1. Overall study design: phase, randomization, blinding, control type
2. Study schema diagram reference [Figure 9-1]
3. Primary and secondary objectives
4. Primary and key secondary endpoints with definitions
5. Inclusion/exclusion criteria (summarized)
6. Treatment arms: drug, dose, route, schedule, duration
7. Statistical methods: sample size, hypothesis, analysis sets (ITT, PP, safety)
8. Randomization and blinding procedures
9. Interim analyses and data monitoring committee`,
    wordCount: { min: 2000, max: 5000 },
    guidelines: ['ICH E3', 'ICH E6(R2)', 'ICH E9(R1)'],
  },
  {
    pattern: '^10',
    titleKeywords: ['disposition', 'population', 'demographic', 'patient'],
    prompt: `Write the Study Population section per ICH E3. Include:
1. Subject disposition: screening, randomization, treatment, completion, withdrawal
2. CONSORT flow diagram reference [Figure 10-1]
3. Demographics table [Table 10-1]: age, sex, race, ethnicity, weight, BMI
4. Baseline disease characteristics [Table 10-2]
5. Protocol deviations: categories, frequency, impact assessment
6. Analysis populations: ITT, mITT, per-protocol, safety — definitions and N
7. Treatment compliance/exposure summary`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH E3', 'CONSORT 2010'],
  },
  {
    pattern: '^11(\\.1)?$',
    titleKeywords: ['efficacy', 'primary'],
    prompt: `Write the Efficacy Results section per ICH E3. Include:
1. Primary endpoint analysis:
   - Pre-specified analysis per SAP
   - Point estimate with 95% CI
   - P-value with method (log-rank, ANCOVA, CMH, etc.)
   - Kaplan-Meier curves reference [Figure 11.1-1] for time-to-event
2. Key secondary endpoints (hierarchical testing order)
3. Sensitivity analyses confirming primary result robustness
4. Subgroup analyses with forest plot [Figure 11.1-2]:
   - Age, sex, region, baseline disease characteristics
   - Biomarker subgroups (PD-L1, molecular markers)
5. Responder analyses: ORR, DOR, DCR with 95% CIs
Format all statistics per AMA 11th: HR, 0.XX (95% CI, X.XX to X.XX); P = .XXX`,
    wordCount: { min: 3000, max: 8000 },
    guidelines: ['ICH E3', 'ICH E9(R1)'],
  },
  {
    pattern: '^12(\\.1)?$',
    titleKeywords: ['safety', 'adverse'],
    prompt: `Write the Safety Results section per ICH E3. Include:
1. Extent of exposure [Table 12-1]: median duration, dose intensity
2. Adverse events overview [Table 12-2]: any AE, Grade ≥3, SAE, fatal, d/c
3. Common TEAEs (≥5% any arm) by SOC and PT [Table 12-3]
4. TEAEs by worst grade [Table 12-4]
5. Drug-related TEAEs [Table 12-5]
6. Serious adverse events: listing with brief narratives
7. Deaths: complete listing, causality analysis
8. TEAEs leading to discontinuation, dose modification, dose interruption
9. Adverse events of special interest (if applicable)
10. Laboratory abnormalities: Grade 3-4 shifts [Table 12-6]
11. Vital signs and ECG findings
Use MedDRA coding (SOC → PT). All percentages to one decimal place.`,
    wordCount: { min: 3000, max: 8000 },
    guidelines: ['ICH E3', 'ICH E2A', 'MedDRA'],
  },
  {
    pattern: '^(13|14)',
    titleKeywords: ['discussion', 'conclusion', 'overall'],
    prompt: `Write the Discussion and Overall Conclusions per ICH E3. Include:
1. Efficacy discussion:
   - Results in context of disease area and existing treatments
   - Clinical meaningfulness of primary endpoint result
   - Consistency across endpoints and subgroups
2. Safety discussion:
   - Overall safety profile characterization
   - Key safety findings and clinical management
   - Comparison to known class effects
3. Benefit-risk assessment:
   - Favorable benefit in context of safety profile
   - Unmet medical need addressed
4. Conclusions:
   - Primary objective met/not met
   - Proposed dose, indication, and population
   - Recommendations for further study`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH E3'],
  },
];

// =============================================================================
// SAFETY REPORTS (DSUR/PBRER)
// =============================================================================

const SAFETY_REPORT_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^(dsur|pbrer)',
    titleKeywords: ['executive.*summary', 'introduction'],
    prompt: `Write the Executive Summary per ICH E2F (DSUR) or E2C(R2) (PBRER). Include:
1. Product and indication overview
2. Reporting period dates and data lock point
3. Worldwide marketing authorization status
4. Key safety findings during reporting period
5. Changes to reference safety information
6. Overall benefit-risk assessment conclusion
Keep to 1-2 pages maximum.`,
    wordCount: { min: 400, max: 800 },
    guidelines: ['ICH E2F', 'ICH E2C(R2)'],
  },
  {
    pattern: '^(dsur|pbrer)',
    titleKeywords: ['exposure', 'worldwide'],
    prompt: `Write the Worldwide Exposure section. Include:
1. Clinical trial exposure:
   [Table X: Cumulative Clinical Trial Exposure by Study]
   - Patient-years by study, dose, indication
2. Post-marketing exposure (if applicable):
   - Estimated by sales data / prescription data
   - By region, formulation, indication
3. Interval vs. cumulative exposure comparison`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['ICH E2F', 'ICH E2C(R2)'],
  },
  {
    pattern: '^(dsur|pbrer)',
    titleKeywords: ['signal', 'new.*safety'],
    prompt: `Write the Signal Evaluation section. Include:
1. Methods for signal detection (MedWatch, FAERS, EudraVigilance, literature)
2. For each new signal:
   - Description and detection method
   - Disproportionality statistics (PRR, ROR, EBGM with CIs)
   - Case characterization: N, demographics, time to onset, outcome
   - Biological plausibility assessment
   - Nonclinical correlates
   - Signal status: validated / refuted / under evaluation
   - Actions taken or proposed
3. Status update on previously identified signals
4. Literature findings relevant to safety profile`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['ICH E2F', 'ICH E2C(R2)', 'GVP Module IX'],
  },
  {
    pattern: '^(dsur|pbrer)',
    titleKeywords: ['benefit.*risk', 'overall.*assessment'],
    prompt: `Write the Benefit-Risk Assessment. Include:
1. Benefit assessment:
   - Efficacy evidence (clinical trial results)
   - Effectiveness data (post-marketing if available)
   - Unmet medical need context
2. Risk assessment:
   - Important identified risks with characterization
   - Important potential risks
   - Missing information
3. Benefit-risk evaluation:
   - Qualitative or semi-quantitative framework
   - Comparison to alternatives
4. Conclusions on overall B/R balance
5. Actions to optimize B/R: labeling changes, risk minimization, studies`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['ICH E2F', 'ICH E2C(R2)'],
  },
];

// =============================================================================
// US LABELING (PLR FORMAT)
// =============================================================================

const LABELING_US_PROMPTS: AISectionPrompt[] = [
  {
    pattern: '^1$',
    titleKeywords: ['indication'],
    category: 'labeling-us',
    prompt: `Write Indications and Usage per 21 CFR 201.57(c)(2). Include:
1. Each indication stated precisely with population qualifier
2. Limitations of use (if applicable)
3. Cross-reference to Clinical Studies section for supporting data
Use exact regulatory language: "[Drug name] is indicated for..."`,
    wordCount: { min: 100, max: 400 },
    guidelines: ['21 CFR 201.57(c)(2)'],
  },
  {
    pattern: '^2$',
    titleKeywords: ['dosage.*admin'],
    category: 'labeling-us',
    prompt: `Write Dosage and Administration per 21 CFR 201.57(c)(3). Include:
1. Recommended dose for each indication
2. Administration instructions (route, rate, preparation)
3. Dose modifications for toxicity [Table 2-1]
4. Dose adjustments for special populations (renal, hepatic)
5. Premedication requirements (if applicable)
6. Reconstitution/dilution instructions for injectables
7. Monitoring recommendations before and during treatment`,
    wordCount: { min: 500, max: 1500 },
    guidelines: ['21 CFR 201.57(c)(3)'],
  },
  {
    pattern: '^5',
    titleKeywords: ['warning', 'precaution'],
    category: 'labeling-us',
    prompt: `Write Warnings and Precautions per 21 CFR 201.57(c)(6). For each:
1. Subsection header (5.1, 5.2, etc.) with clear risk description
2. Incidence from clinical trials (% in treatment vs. control)
3. Severity distribution (Grade breakdown)
4. Time to onset and resolution
5. Risk factors and patients at higher risk
6. Monitoring recommendations
7. Management: dose modification, supportive care, corticosteroids
8. Cross-reference to Dosage and Administration (2.3) for dose modifications
Order by clinical significance. Most serious risks first.`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['21 CFR 201.57(c)(6)'],
  },
  {
    pattern: '^6',
    titleKeywords: ['adverse.*reaction'],
    category: 'labeling-us',
    prompt: `Write Adverse Reactions per 21 CFR 201.57(c)(7). Include:
1. Opening statement: "The following clinically significant adverse reactions are described elsewhere in the labeling:" with cross-references to W&P
2. Clinical Trials Experience subsection (6.1):
   - Safety database description (N, studies)
   - Most common adverse reactions (≥20%) listed
   - Adverse reactions table [Table 6-1]: Drug vs. Control, all grades and Grade 3-4
   - Clinically relevant adverse reactions (≥1% and >control)
3. Laboratory Abnormalities subsection if applicable
4. Immunogenicity subsection for biologics
5. Postmarketing Experience subsection (6.2) if applicable
All percentages from controlled trials. MedDRA preferred terms.`,
    wordCount: { min: 1500, max: 4000 },
    guidelines: ['21 CFR 201.57(c)(7)'],
  },
  {
    pattern: '^(8|12|14)',
    titleKeywords: ['specific.*population', 'pharmacolog', 'clinical.*stud'],
    category: 'labeling-us',
    prompt: `Write this Prescribing Information section per 21 CFR 201.57. Follow the exact PLR format:
- Section 8 (Use in Specific Populations): pregnancy, lactation, pediatric, geriatric, renal, hepatic
- Section 12 (Clinical Pharmacology): MOA, PD, PK with subsections 12.1-12.3
- Section 14 (Clinical Studies): study descriptions with key efficacy results
Include specific data from clinical program. Reference tables and figures.`,
    wordCount: { min: 1000, max: 3000 },
    guidelines: ['21 CFR 201.57'],
  },
];

// =============================================================================
// COMBINED PROMPT LIBRARY
// =============================================================================

const ALL_PROMPTS: AISectionPrompt[] = [
  ...MODULE_2_PROMPTS,
  ...MODULE_3S_PROMPTS,
  ...MODULE_3P_PROMPTS,
  ...MODULE_4_PROMPTS,
  ...MODULE_5_PROMPTS,
  ...SAFETY_REPORT_PROMPTS,
  ...LABELING_US_PROMPTS,
];

// =============================================================================
// LOOKUP FUNCTION
// =============================================================================

/**
 * Find the best matching AI prompt for a given section.
 * Returns undefined if no specific prompt exists (falls back to template or API built-in).
 */
export function getEnrichedAIPrompt(
  sectionNumber: string,
  sectionTitle: string,
  documentType?: string,
  category?: string,
): string | undefined {
  const sectionLower = sectionNumber.toLowerCase().trim();
  const titleLower = sectionTitle.toLowerCase().trim();

  for (const prompt of ALL_PROMPTS) {
    // Check category restriction
    if (prompt.category && category && prompt.category !== category) {
      continue;
    }

    // Check section number pattern
    const pattern = new RegExp(prompt.pattern, 'i');
    if (!pattern.test(sectionLower)) {
      continue;
    }

    // Check title keywords if specified (ANY must match — used for disambiguation)
    if (prompt.titleKeywords && prompt.titleKeywords.length > 0) {
      const anyMatch = prompt.titleKeywords.some(kw => 
        new RegExp(kw, 'i').test(titleLower)
      );
      if (!anyMatch) continue;
    }

    return prompt.prompt;
  }

  return undefined;
}

/**
 * Get the enriched prompt with word count target.
 */
export function getEnrichedPromptWithMeta(
  sectionNumber: string,
  sectionTitle: string,
  documentType?: string,
  category?: string,
): { prompt?: string; wordCount?: { min: number; max: number }; guidelines?: string[] } | undefined {
  const sectionLower = sectionNumber.toLowerCase().trim();
  const titleLower = sectionTitle.toLowerCase().trim();

  for (const entry of ALL_PROMPTS) {
    if (entry.category && category && entry.category !== category) continue;
    
    const pattern = new RegExp(entry.pattern, 'i');
    if (!pattern.test(sectionLower)) continue;

    if (entry.titleKeywords && entry.titleKeywords.length > 0) {
      const anyMatch = entry.titleKeywords.some(kw => 
        new RegExp(kw, 'i').test(titleLower)
      );
      if (!anyMatch) continue;
    }

    return {
      prompt: entry.prompt,
      wordCount: entry.wordCount,
      guidelines: entry.guidelines,
    };
  }

  return undefined;
}

// =============================================================================
// STATS
// =============================================================================

export function getPromptLibraryStats(): {
  totalPrompts: number;
  byCategory: Record<string, number>;
  coveredModules: string[];
} {
  const byCategory: Record<string, number> = {};
  const modules = new Set<string>();

  for (const prompt of ALL_PROMPTS) {
    const cat = prompt.category || 'general';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    // Extract module from pattern
    const match = prompt.pattern.match(/\d+/);
    if (match) modules.add(`Module ${match[0]}`);
  }

  return {
    totalPrompts: ALL_PROMPTS.length,
    byCategory,
    coveredModules: Array.from(modules).sort(),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { ALL_PROMPTS, MODULE_2_PROMPTS, MODULE_3S_PROMPTS, MODULE_3P_PROMPTS, MODULE_4_PROMPTS, MODULE_5_PROMPTS, SAFETY_REPORT_PROMPTS, LABELING_US_PROMPTS };
