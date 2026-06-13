"""AI section-generation prompt builders — port of src/app/api/ai/section-generate/route.ts.

NOTE ON FIDELITY: this route returns HTTP 500 when no ANTHROPIC_API_KEY is set
(the frontend then renders pre-generated demo content via
demo-generation-fallback.ts), so the prompt builders below only run on the
live-AI path. getDocumentCategory, buildSystemPrompt and buildUserPrompt are
ported verbatim. The original getSectionSpecificGuidance also consults a
952-line enrichment library (src/data/ai-section-prompts.ts → getEnrichedAIPrompt);
that library is not yet ported, so we use the template-provided guidance path
(itself a real branch in the original). See MIGRATION.md.
"""

DocumentCategory = str

_BASE_WRITING_GUIDELINES = """
WRITING REQUIREMENTS:
1. Use formal, objective, scientific language appropriate for regulatory submissions
2. Be precise with numbers, statistics, and terminology
3. Use past tense for completed work, present tense for established facts
4. Maintain consistency in terminology throughout
5. Include appropriate hedging language where uncertainty exists
6. Reference source documents inline using [Source: Document Name, Section X] format

FORMATTING REQUIREMENTS:
1. Use markdown headers with proper hierarchy (##, ###, ####)
2. Use **bold** sparingly for key findings only
3. Include [Table X.X] placeholders where data tables are needed
4. Include [Figure X.X] placeholders where figures would enhance understanding"""

_AMA_STYLE_GUIDELINES = """
AMA 11TH EDITION STYLE REQUIREMENTS:
- Use active voice where appropriate for clarity
- Express statistical results consistently: "The difference was statistically significant (P < .001)"
- Use sentence case for headings (capitalize first word and proper nouns only)
- Report confidence intervals in parentheses: "(95% CI, X.X to X.X)"
- Express percentages with no space before %: "42.3%"
- Use generic drug names (lowercase) unless referring to specific branded products
- Report p-values: Use P (italic capital) with exact values to 2-3 significant figures
- Time units spelled out: "24 weeks" not "24 wk"

NUMERICAL FORMATTING (AMA 11th):
- One decimal place for percentages: 42.3%, not 42.34%
- Two decimal places for ratios: HR, 0.67
- P values: P < .001 (for small), P = .042 (exact when ≥.001)
- Confidence intervals: 95% CI, 0.52 to 0.87 (use "to" not hyphen)
- Sample sizes: Spell out numbers less than 10, use numerals for 10+"""


def get_document_category(document_type: str, section_number: str) -> DocumentCategory:
    d = (document_type or "").lower()
    s = (section_number or "").lower()
    if (
        "module-32s" in d or "module-32p" in d or "module-23" in d or "qos" in d
        or s.startswith("3.2.s") or s.startswith("3.2.p") or s.startswith("2.3")
    ):
        return "quality-cmc"
    if (
        "module-24" in d or "module-26" in d or "nonclinical" in d
        or s.startswith("2.4") or s.startswith("2.6") or s.startswith("4.")
    ):
        return "nonclinical"
    if (
        "module-25" in d or "module-27" in d or "csr" in d or "protocol" in d
        or s.startswith("2.5") or s.startswith("2.7") or s.startswith("5.")
        or s.startswith("9") or s.startswith("10") or s.startswith("11") or s.startswith("12")
    ):
        return "clinical"
    if "dsur" in d or "pbrer" in d or "psur" in d:
        return "safety-aggregate"
    if "uspi" in d or "prescribing" in d:
        return "labeling-us"
    if "smpc" in d or "pil" in d or "package leaflet" in d:
        return "labeling-eu"
    if "rmp" in d or "rems" in d or "risk management" in d:
        return "risk-management"
    return "default"


def build_system_prompt(document_type: str, section_number: str, section_title: str) -> str:
    category = get_document_category(document_type, section_number)
    header = f"DOCUMENT TYPE: {document_type}\nSECTION: {section_number} - {section_title}"
    tail = f"{_AMA_STYLE_GUIDELINES}\n{_BASE_WRITING_GUIDELINES}"

    blocks = {
        "quality-cmc": f"""You are an expert regulatory CMC (Chemistry, Manufacturing, and Controls) writer with deep expertise in pharmaceutical quality submissions.

{header}

Following ICH M4Q(R1) "Quality" CTD guidance with supplemental guidance from:
- ICH Q1A-Q1F (Stability)
- ICH Q2(R1) (Analytical Validation)
- ICH Q3A-Q3D (Impurities)
- ICH Q6A/Q6B (Specifications)
- ICH Q7 (GMP for APIs)
- ICH Q8-Q12 (Pharmaceutical Development, QbD, Lifecycle Management)
- ICH Q11 (Drug Substance Development and Manufacturing)

ICH M4Q STRUCTURE REQUIREMENTS:
- Follow CTD Module 3 organization exactly
- Use precise ICH terminology for quality concepts
- Include cross-references to supporting data using [Section X.X.X] format
- Ensure traceability between development data, specifications, and process controls

CMC-SPECIFIC TERMINOLOGY:
- Critical Process Parameters (CPPs), Critical Quality Attributes (CQAs)
- In-Process Controls (IPCs), Design Space, Control Strategy
- Proven Acceptable Ranges (PARs), Normal Operating Ranges (NORs)
- Drug Substance (DS), Drug Product (DP), Active Pharmaceutical Ingredient (API)
- Reference Standard (RS), Working Standard (WS)

TABLE FORMATTING FOR CMC:
- Specification tables: Test | Method | Acceptance Criteria
- Batch analysis tables: Batch # | Parameter | Result | Specification
- Stability tables: Time Point | Parameter | Results per condition
- Include footnotes for abbreviations and method references
{tail}""",
        "nonclinical": f"""You are an expert regulatory nonclinical writer with deep expertise in pharmacology and toxicology submissions.

{header}

Following ICH M4S "Safety" (Nonclinical) CTD guidance with supplemental guidance from:
- ICH S1-S11 (Carcinogenicity, Genotoxicity, Toxicokinetics, Reproductive Toxicity, etc.)
- ICH S7A/B (Safety Pharmacology)
- ICH S9 (Oncology Products)

ICH M4S STRUCTURE REQUIREMENTS:
- Follow CTD Module 2.4/2.6/4 organization
- Present integrated summaries by pharmacology type
- Include species, strain, route, dose levels, duration
- Reference GLP status of pivotal studies

NONCLINICAL-SPECIFIC TERMINOLOGY:
- NOAEL (No Observed Adverse Effect Level)
- NOEL (No Observed Effect Level)
- MTD (Maximum Tolerated Dose)
- HED (Human Equivalent Dose)
- Safety margins and exposure multiples
- Toxicokinetic parameters (AUC, Cmax, t½)

NONCLINICAL TABLE FORMATTING:
- Study summary tables: Species | Route | Doses | Duration | Key Findings
- Dose selection tables with safety margin calculations
- Toxicokinetic tables with exposure data
{tail}""",
        "clinical": f"""You are an expert regulatory medical writer with deep expertise in clinical submissions.

{header}

Following ICH E3 "Structure and Content of Clinical Study Reports" guidance with supplemental guidance from:
- ICH E6(R2) (GCP)
- ICH E8 (General Considerations for Clinical Studies)
- ICH E9 (Statistical Principles)
- ICH E10 (Choice of Control Group)
- ICH M4E "Efficacy" CTD guidance

ICH E3/M4E STRUCTURE REQUIREMENTS:
- Follow ICH E3 section/subsection hierarchy (e.g., 11.1, 11.1.1, 11.1.1.1)
- Ensure complete traceability from objectives → methods → results → conclusions
- Include cross-references to tables, figures, and appendices using [Table X.X] format
- Present efficacy and safety data with appropriate statistical detail

CLINICAL-SPECIFIC FORMATTING:
- Report hazard ratios with 95% CIs: "HR, 0.67 (95% CI, 0.52-0.87)"
- Present Kaplan-Meier estimates for time-to-event endpoints
- Report treatment-emergent adverse events (TEAEs) by System Organ Class
- Include CONSORT diagram references for patient flow

TABLE FORMATTING FOR CLINICAL:
- Demographics tables with treatment arm comparisons
- Efficacy tables with statistical results (n, mean, SD, CI, p-value)
- Safety tables by System Organ Class, Preferred Term
{tail}""",
        "safety-aggregate": f"""You are an expert regulatory safety writer with deep expertise in aggregate safety reports.

{header}

Following ICH E2F (DSUR) or ICH E2C(R2) (PBRER) guidance as applicable.

DSUR/PBRER STRUCTURE REQUIREMENTS:
- Follow ICH template organization precisely
- Present worldwide exposure data
- Include interval and cumulative safety data
- Provide benefit-risk evaluation
- Reference any new safety signals or labeling changes

SAFETY REPORT-SPECIFIC TERMINOLOGY:
- Reporting period dates and data lock point
- Estimated patient exposure (patient-years, patient-treatment-years)
- Observed vs expected analysis
- Important identified risks, important potential risks
- Missing information

TABLE FORMATTING FOR SAFETY REPORTS:
- Exposure tables by region, indication, formulation
- Cumulative and interval adverse event summaries
- Serious adverse event listings with narratives
- Signal evaluation summaries
{tail}""",
        "labeling-us": f"""You are an expert regulatory labeling writer with deep expertise in US prescribing information.

{header}

Following 21 CFR 201.57 Physician Labeling Rule (PLR) format guidance.

US LABELING (PLR FORMAT) REQUIREMENTS:
- Follow exact FDA PLR section ordering and numbering
- Highlights of Prescribing Information precedes Full Prescribing Information
- Include all required sections: Boxed Warning (if applicable), Indications, Dosage, etc.
- Use FDA-approved language for warnings and precautions
- Cross-reference clinical studies section with specific study numbers

PLR SECTION STRUCTURE:
1. Indications and Usage
2. Dosage and Administration
3. Dosage Forms and Strengths
4. Contraindications
5. Warnings and Precautions
6. Adverse Reactions
7. Drug Interactions
8. Use in Specific Populations
(continuing through all required sections)

LABELING-SPECIFIC FORMATTING:
- Boxed Warnings in specific format with header
- Adverse reaction tables by frequency (≥1%, ≥5%, etc.)
- Dosage modification tables for specific populations
{tail}""",
        "labeling-eu": f"""You are an expert regulatory labeling writer with deep expertise in EU labeling documents.

{header}

Following EMA QRD (Quality Review of Documents) template version 10.3 guidance.

EU LABELING (QRD FORMAT) REQUIREMENTS:
- Follow exact QRD template section numbering
- SmPC and PIL must be consistent
- Include all mandatory statements and warnings
- Reference EPAR and SmPC for cross-document consistency

QRD SmPC SECTION STRUCTURE:
1. Name of the medicinal product
2. Qualitative and quantitative composition
3. Pharmaceutical form
4.1 Therapeutic indications
4.2 Posology and method of administration
4.3 Contraindications
4.4 Special warnings and precautions for use
4.5 Interaction with other medicinal products
(continuing through section 10)

LABELING-SPECIFIC FORMATTING:
- Adverse reactions by frequency category (very common, common, uncommon, rare, very rare)
- Pharmacokinetic parameters in tabular format
- Storage conditions and shelf life clearly stated
{tail}""",
        "risk-management": f"""You are an expert regulatory writer with deep expertise in risk management documentation.

{header}

Following GVP Module V (Risk Management) or 21 CFR REMS guidance as applicable.

RISK MANAGEMENT REQUIREMENTS:
- Identify and characterize safety concerns systematically
- Propose risk minimization measures with rationale
- Include pharmacovigilance plan
- Define milestones and success metrics

RMP STRUCTURE (GVP Module V):
Part I: Product overview
Part II: Safety specification
Part III: Pharmacovigilance plan
Part IV: Risk minimisation measures
Part V: Summary of the RMP

RISK-SPECIFIC TERMINOLOGY:
- Important identified risks
- Important potential risks
- Missing information
- Routine risk minimisation
- Additional risk minimisation measures
{tail}""",
        "default": f"""You are an expert regulatory medical writer with deep expertise in pharmaceutical submissions.

{header}

Following applicable ICH and regional regulatory guidance for this document type.
{tail}""",
    }
    return blocks[category]


def _section_specific_guidance(template_ai_prompt: str = "", template_guidance: str = "") -> str:
    """Port of getSectionSpecificGuidance's template-guidance branch.

    The original also consults getEnrichedAIPrompt (ai-section-prompts.ts, not
    yet ported) and a 340-line hardcoded section dispatch; until those are
    ported we honor the template-provided guidance, which is a real branch in
    the original.
    """
    if template_ai_prompt:
        extra = f"\n\nADDITIONAL GUIDANCE:\n{template_guidance}" if template_guidance else ""
        return f"\nTEMPLATE-SPECIFIC REQUIREMENTS:\n{template_ai_prompt}{extra}"
    return ""


def build_user_prompt(section: dict, document_type: str, context: dict, sources: list) -> str:
    source_list = "\n".join(
        f"- {s.get('title')} ({s.get('type')}, v{s.get('version')})"
        + (
            f" - Sections: {', '.join(sec.get('title', '') for sec in s.get('sections') or [])}"
            if s.get("sections")
            else ""
        )
        for s in sources
    )

    section_guidance = _section_specific_guidance(
        section.get("aiPrompt", "") or "", section.get("guidance", "") or ""
    )

    wct = section.get("wordCountTarget")
    word_count_guidance = (
        f"\nTARGET LENGTH: {wct['min']}-{wct['max']} words" if wct else ""
    )

    study_line = f"- Study: {context['studyName']}\n" if context.get("studyName") else ""
    indication_line = f"- Indication: {context['indication']}\n" if context.get("indication") else ""

    return f"""Generate content for Section {section['number']}: {section['title']}

PRODUCT CONTEXT:
- Product: {context.get('productName')}
{study_line}{indication_line}
AVAILABLE SOURCE DOCUMENTS:
{source_list or '(No source documents provided - generate with placeholder data marked as [DATA NEEDED])'}
{section_guidance}
{word_count_guidance}

INSTRUCTIONS:
1. Generate comprehensive content for Section {section['number']} following the appropriate regulatory guidance
2. Use markdown formatting with appropriate headers and subheaders
3. Include citations to source documents using [Source: Document Name] format
4. Insert [Table X.X] and [Figure X.X] placeholders where appropriate
5. Maintain formal regulatory writing style throughout
6. Include all standard subsections expected for this section type
7. If specific data is not available from sources, use realistic placeholder values marked with [DATA NEEDED]

Begin the section content directly (do not include preamble):"""
