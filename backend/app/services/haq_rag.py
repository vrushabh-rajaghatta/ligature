"""HAQ-RAG retrieval + synthesis — port of src/app/api/ai/haq-rag/route.ts.

Keyword similarity search over a historical HAQ-response corpus, an Anthropic
synthesis prompt builder, and a mock-response generator used when no API key
is configured (parity with the original demo behavior).
"""
import math
import re

from app.core.mockdata import load_mock

HISTORICAL_RESPONSES: list[dict] = load_mock("haq_rag_corpus")["HISTORICAL_RESPONSES"]

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
    "shall", "can", "need", "please", "provide", "additional", "information", "regarding",
    "specifically", "clarify", "explain", "describe", "discuss", "justify", "based",
    "this", "that", "these", "those", "which", "what", "how", "why", "when", "where",
}

TERM_WEIGHTS = {
    "crystallization": 2.0, "dissolution": 2.0, "stability": 2.0, "specification": 1.8,
    "cpp": 2.5, "cqa": 2.5, "impurity": 2.0, "hcp": 2.5, "process": 1.5, "validation": 1.8,
    "comparability": 2.0, "efficacy": 2.0, "dose": 1.8, "modification": 1.5, "missing": 1.8,
    "imputation": 2.5, "subgroup": 1.8, "primary": 1.5, "endpoint": 2.0,
    "hepatotoxicity": 2.5, "carcinogenicity": 2.5, "qt": 2.5, "prolongation": 2.0,
    "adenoma": 2.0, "toxicology": 2.0, "dili": 2.5, "signal": 2.0, "pharmacovigilance": 2.0,
    "expedited": 2.0, "pmda": 2.5, "japan": 1.8, "cluster": 2.0, "disproportionality": 2.5,
    "prr": 2.5, "ror": 2.5, "drug-interaction": 2.0, "ich": 2.0, "fda": 1.5, "ema": 1.5,
    "labeling": 2.0, "pediatric": 2.0,
}


def extract_keywords(text: str) -> list[str]:
    cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
    return [w for w in cleaned.split() if len(w) > 2 and w not in STOPWORDS]


def calculate_similarity(query_keywords, doc_keywords, discipline=None, doc_discipline=None):
    query_set = set(query_keywords)
    doc_set = set(doc_keywords)
    matched_terms = []
    weighted_matches = 0.0
    for term in query_set:
        if term in doc_set:
            matched_terms.append(term)
            weighted_matches += TERM_WEIGHTS.get(term, 1.0)
    union_size = len(set(list(query_keywords) + list(doc_keywords)))
    score = (weighted_matches / math.sqrt(union_size)) * 100 if union_size > 0 else 0
    if discipline and doc_discipline and discipline == doc_discipline:
        score *= 1.3
    return {"score": min(score, 100), "matchedTerms": matched_terms}


def find_similar_responses(request: dict, top_k: int = 5) -> list[dict]:
    query_keywords = extract_keywords(request.get("questionText", ""))
    if request.get("ctdSection"):
        query_keywords += extract_keywords(request["ctdSection"])

    results = []
    for response in HISTORICAL_RESPONSES:
        doc_keywords = (
            extract_keywords(response.get("questionText", ""))
            + extract_keywords(response.get("responseText", "")[:500])
            + [t.lower() for t in (response.get("tags") or [])]
        )
        sim = calculate_similarity(
            query_keywords, doc_keywords, request.get("discipline"), response.get("discipline")
        )
        if sim["score"] > 15:
            results.append({"response": response, "score": sim["score"], "matchedTerms": sim["matchedTerms"]})

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:top_k]


def build_synthesis_prompt(question: dict, similar: list[dict]) -> tuple[str, str]:
    system = """You are an expert regulatory affairs writer specializing in Health Authority Question (HAQ) responses for pharmaceutical submissions.

Your task is to synthesize a draft response to a new HAQ by learning from similar historical responses that were successfully accepted by health authorities.

RESPONSE REQUIREMENTS:
1. Address the question directly and completely
2. Use formal regulatory language appropriate for FDA/EMA correspondence
3. Structure the response with clear sections when multiple points are addressed
4. Include specific data placeholders [DATA NEEDED] where concrete numbers/results should be inserted
5. Reference relevant ICH guidelines where applicable
6. Be comprehensive but concise - avoid unnecessary verbosity
7. Use tables for comparative data where appropriate (markdown format)

LEARNING FROM HISTORICAL RESPONSES:
- Note the structure and tone of accepted responses
- Observe how technical details are presented
- Identify common regulatory citations and frameworks
- Adapt successful patterns to the new question context

Do NOT simply copy historical responses. Synthesize a new response that applies the successful patterns to address the specific question asked."""

    historical_context = "\n".join(
        f"\n### Historical Response {i + 1} ({r['response']['discipline']}, "
        f"{r['response']['source']}, {r['response']['outcome']})\n"
        f"{r['response']['responseText']}\n---"
        for i, r in enumerate(similar)
    )

    lines = [
        "Generate a draft response to the following Health Authority Question:",
        "",
        question.get("questionText", ""),
        "",
    ]
    if question.get("discipline"):
        lines.append(f"**DISCIPLINE:** {question['discipline']}")
    if question.get("ctdSection"):
        lines.append(f"**CTD SECTION:** {question['ctdSection']}")
    if question.get("source"):
        lines.append(f"**HEALTH AUTHORITY:** {question['source']}")
    if question.get("productName"):
        lines.append(f"**PRODUCT:** {question['productName']}")
    lines += [
        "",
        "---",
        "",
        historical_context or "No similar historical responses found.",
        "",
        "---",
        "",
        "Now generate a comprehensive draft response that:",
        "1. Directly addresses the question asked",
        "2. Applies successful patterns from the historical responses",
        "3. Uses appropriate regulatory language and structure",
        "4. Includes [DATA NEEDED] placeholders for specific values that need to be filled in",
        "5. Is ready for SME review and refinement",
        "",
        "Begin the response directly without preamble.",
    ]
    return system, "\n".join(lines)


def _discipline_response(discipline: str, product: str, section: str) -> str:
    cmc = f"""## Response to Health Authority Question — {section}

The Sponsor appreciates the Agency's inquiry and provides the following response with supporting data.

{product} is manufactured using a well-characterized process with defined critical quality attributes (CQAs) and critical process parameters (CPPs) established through a systematic Quality by Design (QbD) approach consistent with ICH Q8(R2), Q9, and Q10 principles.


The requested characterization data are summarized below:

1. **Analytical Methods**: Multiple orthogonal methods were employed, including LC-MS/MS, HPLC-SEC, CE-SDS, and ELISA-based assays, validated per ICH Q2(R2).

2. **Results**:
   - All tested parameters met predetermined acceptance criteria
   - Batch-to-batch consistency demonstrated across [DATA NEEDED: N] commercial-scale batches
   - Process capability indices (Cpk) for key attributes: >1.33

3. **Process Controls**:
   - In-process controls (IPCs) are established at critical manufacturing steps
   - Control strategy ensures consistent quality within the defined design space
   - Environmental monitoring data support the validated manufacturing conditions

4. **Trending Analysis**:
   - Statistical process control (SPC) charts demonstrate process stability
   - No adverse trends identified in annual product quality reviews

Long-term stability studies (25°C/60% RH) and accelerated studies (40°C/75% RH) per ICH Q1A(R2) confirm that the characterized attributes remain within specifications through the proposed shelf life.

The comprehensive analytical data, process controls, and stability studies demonstrate that {product} consistently meets all quality specifications. The manufacturing process is well-controlled and produces drug substance/product of consistent quality.

Additional supporting data are available in the referenced CTD sections and appendices. The Sponsor remains available to provide further information as requested."""

    clinical = f"""## Response to Health Authority Question — {section}

The Sponsor appreciates the opportunity to address the Agency's question and provides the following response.

The clinical data from the {product} development program support the following conclusions:

1. **Study Design & Conduct**: The pivotal study was designed in accordance with ICH E6(R2) GCP guidelines and conducted across [DATA NEEDED: N] sites in [DATA NEEDED: N] countries.

2. **Efficacy Results**:
   - Primary endpoint: [DATA NEEDED: specific endpoint and result]
   - Key secondary endpoints demonstrated consistent treatment benefit
   - Subgroup analyses showed no clinically meaningful heterogeneity

3. **Safety Profile**:
   - The overall safety profile is consistent with the known pharmacological mechanism
   - Most common adverse events: [DATA NEEDED]
   - Serious adverse events were balanced between treatment groups
   - No new safety signals identified in the integrated safety analysis

4. **Dose-Response Relationship**:
   - Exposure-response analyses support the proposed dosing regimen
   - The therapeutic index provides adequate safety margin

The totality of clinical evidence supports the benefit-risk profile of {product} in the proposed indication. The Sponsor is available to discuss any aspects of this response."""

    safety = f"""## Response to Health Authority Question — {section}

The Sponsor provides the following response regarding the safety assessment for {product}.

The integrated safety database includes [DATA NEEDED: N] subjects exposed to {product} across the clinical development program.

1. **Adverse Event Profile**:
   - Treatment-emergent adverse events (TEAEs) were systematically coded using MedDRA v[DATA NEEDED]
   - The most frequently reported TEAEs by SOC are tabulated in the submission

2. **Serious Adverse Events (SAEs)**:
   - SAEs occurred in [DATA NEEDED]% of subjects
   - Individual case review does not suggest a causal relationship pattern beyond the known safety profile

3. **Laboratory Parameters**:
   - Shift analyses and time-course assessments performed per ICH E3 guidelines
   - No clinically meaningful trends identified in hematology, chemistry, or urinalysis parameters

4. **Risk Management**:
   - The pharmacovigilance plan addresses identified and potential risks
   - Risk minimization measures are proposed as appropriate
   - Periodic safety assessments will continue per the RMP/REMS framework

The safety data demonstrate an acceptable risk-benefit profile. Enhanced pharmacovigilance activities are in place to monitor for potential safety signals in the post-marketing setting."""

    return {"CMC": cmc, "Clinical": clinical, "Safety": safety}.get(discipline, cmc)


def generate_mock_response(request: dict, similar: list[dict]) -> str:
    if similar:
        best = similar[0]["response"]
        response = best["responseText"]
        discipline = request.get("discipline") or best["discipline"]
        section = request.get("ctdSection") or best.get("ctdSection") or ""
        product = request.get("productName") or best["productName"]
        section_phrase = f"CTD Section {section}" if section else discipline
        product_phrase = f"For {request['productName']}, " if request.get("productName") else ""
        return f"""The following response addresses the Health Authority question regarding {section_phrase} for {product or 'the investigational product'}.

{response}

The data presented above demonstrate compliance with current regulatory expectations and applicable ICH guidelines. {product_phrase}the analytical characterization, process controls, and validation studies collectively support the specifications and manufacturing processes described in the relevant sections of the submission.

Should the Agency require additional data or clarification on any aspect of this response, the Sponsor is prepared to provide supplementary information in a timely manner."""

    discipline = request.get("discipline") or "CMC"
    product = request.get("productName") or "[Product Name]"
    section = request.get("ctdSection") or "[Section]"
    return _discipline_response(discipline, product, section)
