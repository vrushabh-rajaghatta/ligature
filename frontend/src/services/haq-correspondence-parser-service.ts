
// HAQ Correspondence Parser Service - v0.25.9
// Intelligently parses HAQ correspondence (IR, CRL, RTQ, D80, D120)
// Extracts questions, categorizes by discipline, and suggests priority

import type { HAQDiscipline, HAQPriority, HAQStatus } from '@/types/haq';

// =============================================================================
// TYPES
// =============================================================================

export interface ParsedQuestion {
  id: string;
  questionNumber: string;
  text: string;
  discipline: HAQDiscipline;
  priority: HAQPriority;
  ctdSection?: string;
  suggestedDueDate?: string;
  keywords: string[];
  confidence: number;
  relatedQuestions?: string[];
}

export interface ParsedCorrespondence {
  // Identification
  correspondenceType: CorrespondenceType;
  referenceNumber?: string;
  applicationNumber?: string;
  
  // Source
  healthAuthority: string;
  receivedDate: string;
  dueDate?: string;
  
  // Product context
  productName?: string;
  indication?: string;
  
  // Parsed content
  questions: ParsedQuestion[];
  summary?: string;
  
  // Metadata
  totalQuestions: number;
  questionsByDiscipline: Record<HAQDiscipline, number>;
  questionsByPriority: Record<HAQPriority, number>;
  
  // AI confidence
  overallConfidence: number;
  parsingNotes: string[];
}

export type CorrespondenceType = 
  | 'IR'      // Information Request
  | 'CRL'     // Complete Response Letter
  | 'RTQ'     // Request to Question
  | 'AI'      // Additional Information
  | 'D80'     // Day 80 Questions (EMA)
  | 'D120'    // Day 120 Questions (EMA)
  | 'LOQ'     // List of Questions
  | 'RSI'     // Request for Supplemental Information
  | 'unknown';

export interface CorrespondenceParserConfig {
  defaultHealthAuthority?: string;
  defaultDaysUntilDue?: number;
  autoAssignPriority?: boolean;
  detectRelatedQuestions?: boolean;
}

// =============================================================================
// DISCIPLINE DETECTION PATTERNS
// =============================================================================

interface DisciplinePattern {
  discipline: HAQDiscipline;
  patterns: RegExp[];
  ctdSections: string[];
  weight: number;
}

const DISCIPLINE_PATTERNS: DisciplinePattern[] = [
  {
    discipline: 'CMC',
    patterns: [
      /\b(manufacturing|formulation|stability|batch|drug\s*substance|drug\s*product)\b/i,
      /\b(excipient|impurit|specification|analytical|method\s*validation)\b/i,
      /\b(container\s*closure|shelf\s*life|storage\s*condition)\b/i,
      /\b(cGMP|GMP|process\s*validation|cleaning\s*validation)\b/i,
      /\b(API|active\s*pharmaceutical\s*ingredient|synthesis)\b/i,
      /\b(polymorphism|particle\s*size|dissolution)\b/i,
      /\bmodule\s*3\b/i,
      /\bCMC\b/,
    ],
    ctdSections: ['3.2.S', '3.2.P', '3.2.A', '3.2.R'],
    weight: 1.0,
  },
  {
    discipline: 'Clinical',
    patterns: [
      /\b(clinical\s*trial|clinical\s*study|efficacy|phase\s*[123])\b/i,
      /\b(patient|subject|participant|enrollment|randomiz)\b/i,
      /\b(primary\s*endpoint|secondary\s*endpoint|outcome|response\s*rate)\b/i,
      /\b(protocol|informed\s*consent|inclusion|exclusion)\b/i,
      /\b(dose|dosing|regimen|administration)\b/i,
      /\b(PK|pharmacokinetic|bioavailability|bioequivalence)\b/i,
      /\b(ITT|PP|LOCF|MMRM|ANCOVA)\b/,
      /\bmodule\s*5\b/i,
    ],
    ctdSections: ['5.1', '5.2', '5.3', '5.4'],
    weight: 1.0,
  },
  {
    discipline: 'Nonclinical',
    patterns: [
      /\b(nonclinical|non-clinical|preclinical|pre-clinical)\b/i,
      /\b(toxicology|toxicity|carcinogenicity|genotoxicity|mutagenicity)\b/i,
      /\b(NOAEL|NOEL|MTD|LD50|ADME)\b/,
      /\b(animal\s*study|rat|mouse|dog|monkey|rabbit)\b/i,
      /\b(reproductive\s*toxicity|developmental\s*toxicity|teratogenicity)\b/i,
      /\b(safety\s*pharmacology|CNS|cardiovascular|respiratory)\b/i,
      /\bmodule\s*(2\.4|2\.6|4)\b/i,
    ],
    ctdSections: ['2.4', '2.6', '4.1', '4.2', '4.3'],
    weight: 1.0,
  },
  {
    discipline: 'Biometrics',
    patterns: [
      /\b(statistical|statistic|biostatistic|biometric)\b/i,
      /\b(analysis\s*plan|SAP|randomization|stratification)\b/i,
      /\b(sample\s*size|power\s*calculation|interim\s*analysis)\b/i,
      /\b(confidence\s*interval|p-value|hazard\s*ratio|odds\s*ratio)\b/i,
      /\b(sensitivity\s*analysis|subgroup|multiplicity)\b/i,
      /\b(missing\s*data|imputation|censoring)\b/i,
    ],
    ctdSections: ['5.2', '5.3'],
    weight: 0.9,
  },
  {
    discipline: 'Safety',
    patterns: [
      /\b(safety|adverse\s*event|AE|SAE|SUSAR|CIOMS)\b/i,
      /\b(pharmacovigilance|signal|risk|benefit-risk)\b/i,
      /\b(DSUR|PSUR|PBRER|RMP|REMS)\b/,
      /\b(label|warning|precaution|contraindication)\b/i,
      /\b(post-market|post-authorization|periodic\s*report)\b/i,
      /\b(MedDRA|SMQ|PT|HLT|SOC)\b/,
    ],
    ctdSections: ['2.5', '2.7', '5.3.6'],
    weight: 1.0,
  },
  {
    discipline: 'Pharmacology',
    patterns: [
      /\b(pharmacolog|mechanism\s*of\s*action|MOA|receptor)\b/i,
      /\b(pharmacodynamic|PD|drug-drug\s*interaction|DDI)\b/i,
      /\b(QT|QTc|hERG|cardiac|torsade)\b/i,
      /\b(CYP|P450|metabolis|transporter|P-gp)\b/i,
      /\b(in\s*vitro|in\s*vivo|IC50|EC50|Ki)\b/i,
    ],
    ctdSections: ['2.4', '2.6', '4.2'],
    weight: 0.9,
  },
  {
    discipline: 'Labeling',
    patterns: [
      /\b(label|package\s*insert|PI|prescribing\s*information)\b/i,
      /\b(SmPC|summary\s*of\s*product|PIL|patient\s*information)\b/i,
      /\b(indication|dosage\s*and\s*administration|warning)\b/i,
      /\b(black\s*box|boxed\s*warning|contraindication)\b/i,
      /\b(USPI|EU\s*label|carton|container\s*label)\b/i,
    ],
    ctdSections: ['1.3', '1.14'],
    weight: 0.9,
  },
  {
    discipline: 'Administrative',
    patterns: [
      /\b(administrative|form|application|submission)\b/i,
      /\b(1571|1572|3674|cover\s*letter|amendment)\b/i,
      /\b(fee|waiver|exclusivity|orphan|pediatric)\b/i,
      /\b(patent|trademark|proprietary|trade\s*name)\b/i,
      /\b(correspondence|meeting|pre-.*meeting)\b/i,
    ],
    ctdSections: ['1.1', '1.2'],
    weight: 0.8,
  },
];

// =============================================================================
// PRIORITY DETECTION PATTERNS
// =============================================================================

interface PriorityIndicator {
  priority: HAQPriority;
  patterns: RegExp[];
  keywords: string[];
}

const PRIORITY_INDICATORS: PriorityIndicator[] = [
  {
    priority: 'critical',
    patterns: [
      /\b(must|shall|required|mandatory|essential)\b/i,
      /\b(clinical\s*hold|refusal|complete\s*response)\b/i,
      /\b(safety\s*concern|serious|life-threatening)\b/i,
      /\b(deficient|deficiency|major\s*objection)\b/i,
      /\b(unacceptable|insufficient|inadequate)\b/i,
    ],
    keywords: ['critical', 'urgent', 'immediate', 'blocking', 'major'],
  },
  {
    priority: 'major',
    patterns: [
      /\b(should|recommend|expected|important)\b/i,
      /\b(clarify|explain|justify|provide\s*rationale)\b/i,
      /\b(additional\s*data|further\s*analysis|supplemental)\b/i,
      /\b(concern|issue|question|discrepancy)\b/i,
    ],
    keywords: ['major', 'significant', 'important', 'key'],
  },
  {
    priority: 'minor',
    patterns: [
      /\b(may|could|consider|suggest)\b/i,
      /\b(editorial|typographical|formatting|minor)\b/i,
      /\b(optional|advisory|informational)\b/i,
    ],
    keywords: ['minor', 'editorial', 'administrative', 'clarification'],
  },
];

// =============================================================================
// CORRESPONDENCE TYPE DETECTION
// =============================================================================

interface CorrespondenceTypePattern {
  type: CorrespondenceType;
  patterns: RegExp[];
  healthAuthority?: string;
  defaultDaysUntilDue?: number;
}

const CORRESPONDENCE_TYPE_PATTERNS: CorrespondenceTypePattern[] = [
  {
    type: 'IR',
    patterns: [
      /information\s*request/i,
      /\bIR\b.*(?:FDA|EMA|PMDA)/i,
      /(?:FDA|EMA|PMDA).*\bIR\b/i,
      /request\s*for\s*information/i,
    ],
    defaultDaysUntilDue: 30,
  },
  {
    type: 'CRL',
    patterns: [
      /complete\s*response\s*letter/i,
      /\bCRL\b/,
      /action\s*date/i,
    ],
    healthAuthority: 'FDA',
    defaultDaysUntilDue: 0, // CRL requires resubmission, no simple due date
  },
  {
    type: 'RTQ',
    patterns: [
      /request.*question/i,
      /\bRTQ\b/,
      /list\s*of\s*question/i,
    ],
    defaultDaysUntilDue: 30,
  },
  {
    type: 'AI',
    patterns: [
      /additional\s*information/i,
      /\bAI\b.*request/i,
      /supplemental\s*information/i,
    ],
    defaultDaysUntilDue: 30,
  },
  {
    type: 'D80',
    patterns: [
      /day\s*80/i,
      /\bD80\b/,
      /80.*day/i,
    ],
    healthAuthority: 'EMA',
    defaultDaysUntilDue: 180, // Clock stop typically
  },
  {
    type: 'D120',
    patterns: [
      /day\s*120/i,
      /\bD120\b/,
      /120.*day/i,
    ],
    healthAuthority: 'EMA',
    defaultDaysUntilDue: 90,
  },
  {
    type: 'LOQ',
    patterns: [
      /list\s*of\s*questions/i,
      /\bLOQ\b/,
      /questions\s*list/i,
    ],
    defaultDaysUntilDue: 30,
  },
  {
    type: 'RSI',
    patterns: [
      /request.*supplemental\s*information/i,
      /\bRSI\b/,
      /supplemental.*request/i,
    ],
    healthAuthority: 'Health Canada',
    defaultDaysUntilDue: 45,
  },
];

// =============================================================================
// QUESTION PARSING PATTERNS
// =============================================================================

// Common patterns for extracting individual questions
const QUESTION_PATTERNS = [
  // Numbered questions: "1.", "Q1:", "Question 1:", etc.
  /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[.:)]\s*([\s\S]+?)(?=\n\s*(?:Q(?:uestion)?\.?\s*)?\d+[.:)]|\n\s*$|$)/gi,
  
  // Bulleted questions
  /(?:^|\n)\s*[•●○◦‣⁃-]\s*(.+?)(?=\n\s*[•●○◦‣⁃-]|\n\s*$|$)/gi,
  
  // Questions starting with "Please provide...", "Clarify...", etc.
  /(?:^|\n)\s*((?:Please\s+)?(?:provide|clarify|explain|justify|discuss|describe|submit|include)\s+.+?)(?=\n\s*(?:Please\s+)?(?:provide|clarify|explain|justify|discuss|describe|submit|include)|\n\s*$|$)/gi,
];

// CTD section patterns
const CTD_SECTION_PATTERNS = [
  /\b(?:module\s*)?([1-5](?:\.[1-9](?:\.[1-9](?:\.[1-9])?)?)?)\b/gi,
  /\bCTD\s*section\s*([1-5](?:\.[1-9](?:\.[1-9])?)?)\b/gi,
  /\b([1-5](?:\.[1-9](?:\.[1-9])?)?)\s*(?:module|section)\b/gi,
];

// =============================================================================
// HAQ CORRESPONDENCE PARSER SERVICE
// =============================================================================

class HAQCorrespondenceParserService {
  private config: CorrespondenceParserConfig;
  
  constructor(config: CorrespondenceParserConfig = {}) {
    this.config = {
      defaultHealthAuthority: config.defaultHealthAuthority || 'FDA',
      defaultDaysUntilDue: config.defaultDaysUntilDue || 30,
      autoAssignPriority: config.autoAssignPriority !== false,
      detectRelatedQuestions: config.detectRelatedQuestions !== false,
    };
  }
  
  /**
   * Parse HAQ correspondence and extract questions
   */
  async parseCorrespondence(
    content: string,
    metadata?: {
      filename?: string;
      receivedDate?: string;
      healthAuthority?: string;
      productName?: string;
    }
  ): Promise<ParsedCorrespondence> {
    const parsingNotes: string[] = [];
    
    // Detect correspondence type
    const correspondenceType = this.detectCorrespondenceType(content, metadata?.filename);
    parsingNotes.push(`Detected correspondence type: ${correspondenceType}`);
    
    // Detect health authority
    const healthAuthority = metadata?.healthAuthority || 
      this.detectHealthAuthority(content) || 
      this.config.defaultHealthAuthority!;
    parsingNotes.push(`Health authority: ${healthAuthority}`);
    
    // Extract reference numbers
    const referenceNumber = this.extractReferenceNumber(content);
    const applicationNumber = this.extractApplicationNumber(content);
    
    // Parse individual questions
    const questions = this.parseQuestions(content, parsingNotes);
    parsingNotes.push(`Extracted ${questions.length} questions`);
    
    // Detect related questions if enabled
    if (this.config.detectRelatedQuestions && questions.length > 1) {
      this.detectRelatedQuestions(questions);
    }
    
    // Calculate stats
    const questionsByDiscipline = this.countByDiscipline(questions);
    const questionsByPriority = this.countByPriority(questions);
    
    // Calculate due date
    const typePattern = CORRESPONDENCE_TYPE_PATTERNS.find(p => p.type === correspondenceType);
    const daysUntilDue = typePattern?.defaultDaysUntilDue || this.config.defaultDaysUntilDue!;
    const receivedDate = metadata?.receivedDate || new Date().toISOString().split('T')[0];
    const dueDate = this.calculateDueDate(receivedDate, daysUntilDue);
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(questions, correspondenceType);
    
    // Generate summary
    const summary = this.generateSummary(questions, correspondenceType, healthAuthority);
    
    return {
      correspondenceType,
      referenceNumber,
      applicationNumber,
      healthAuthority,
      receivedDate,
      dueDate,
      productName: metadata?.productName || this.extractProductName(content),
      indication: this.extractIndication(content),
      questions,
      summary,
      totalQuestions: questions.length,
      questionsByDiscipline,
      questionsByPriority,
      overallConfidence,
      parsingNotes,
    };
  }
  
  /**
   * Parse file and extract content based on file type
   * For demo purposes, this handles text content. In production,
   * this would integrate with PDF/DOCX parsing libraries.
   */
  async parseFile(file: File): Promise<ParsedCorrespondence> {
    // For now, we'll simulate content extraction
    // In production, integrate with pdf-parse, mammoth, etc.
    const filename = file.name;
    const receivedDate = new Date().toISOString().split('T')[0];
    
    // Try to read text content if it's a text file
    let content = '';
    if (file.type === 'text/plain' || file.type === 'text/csv') {
      content = await file.text();
    } else {
      // Simulate content for demo - in production, use proper parsing
      content = this.generateSimulatedContent(filename);
    }
    
    return this.parseCorrespondence(content, {
      filename,
      receivedDate,
    });
  }
  
  /**
   * Detect correspondence type from content and filename
   */
  private detectCorrespondenceType(content: string, filename?: string): CorrespondenceType {
    const textToCheck = `${content} ${filename || ''}`;
    
    for (const typePattern of Array.from(CORRESPONDENCE_TYPE_PATTERNS)) {
      for (const pattern of Array.from(typePattern.patterns)) {
        if (pattern.test(textToCheck)) {
          return typePattern.type;
        }
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Detect health authority from content
   */
  private detectHealthAuthority(content: string): string | undefined {
    const haPatterns: { pattern: RegExp; authority: string }[] = [
      { pattern: /\bFDA\b|Food\s*and\s*Drug\s*Administration/i, authority: 'FDA' },
      { pattern: /\bEMA\b|European\s*Medicines\s*Agency/i, authority: 'EMA' },
      { pattern: /\bPMDA\b|Pharmaceuticals.*Medical.*Devices.*Agency/i, authority: 'PMDA' },
      { pattern: /\bHealth\s*Canada\b|Santé\s*Canada/i, authority: 'Health Canada' },
      { pattern: /\bTGA\b|Therapeutic\s*Goods\s*Administration/i, authority: 'TGA' },
      { pattern: /\bMHRA\b|Medicines.*Healthcare.*Regulatory/i, authority: 'MHRA' },
      { pattern: /\bNMPA\b|National\s*Medical\s*Products\s*Administration/i, authority: 'NMPA' },
      { pattern: /\bSwissmedic\b/i, authority: 'Swissmedic' },
    ];
    
    for (const { pattern, authority } of Array.from(haPatterns)) {
      if (pattern.test(content)) {
        return authority;
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract reference number from content
   */
  private extractReferenceNumber(content: string): string | undefined {
    const patterns = [
      /reference\s*(?:number|no\.?|#)?[:.]?\s*([A-Z0-9-]+)/i,
      /our\s*ref(?:erence)?[:.]?\s*([A-Z0-9-]+)/i,
      /tracking\s*(?:number|no\.?|#)?[:.]?\s*([A-Z0-9-]+)/i,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = content.match(pattern);
      if (match?.[1]) return match[1];
    }
    
    return undefined;
  }
  
  /**
   * Extract application number from content
   */
  private extractApplicationNumber(content: string): string | undefined {
    const patterns = [
      /(?:NDA|BLA|ANDA|IND)\s*[-#]?\s*(\d{6})/i,
      /application\s*(?:number|no\.?|#)?[:.]?\s*([A-Z]{2,4}[-/]?\d{4,8})/i,
      /submission\s*(?:number|no\.?|#)?[:.]?\s*([A-Z0-9-/]+)/i,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = content.match(pattern);
      if (match?.[1]) return match[1];
    }
    
    return undefined;
  }
  
  /**
   * Extract product name from content
   */
  private extractProductName(content: string): string | undefined {
    const patterns = [
      /(?:product|drug|compound)[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      /\b([A-Z]{3,4}[-_]?\d{3,5})\b/,
      /regarding[:.]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\(|tablet|capsule)/i,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = content.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    
    return undefined;
  }
  
  /**
   * Extract indication from content
   */
  private extractIndication(content: string): string | undefined {
    const patterns = [
      /indication[:.]?\s*([A-Za-z\s-]+?)(?:\.|,|;|\n)/i,
      /treatment\s*of\s+([A-Za-z\s-]+?)(?:\.|,|;|\n)/i,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = content.match(pattern);
      if (match?.[1]) {
        const indication = match[1].trim();
        if (indication.length > 3) return indication;
      }
    }
    
    return undefined;
  }
  
  /**
   * Parse individual questions from content
   */
  private parseQuestions(content: string, parsingNotes: string[]): ParsedQuestion[] {
    const questions: ParsedQuestion[] = [];
    let questionId = 0;
    
    // Try numbered question pattern first
    const numberedPattern = /(?:^|\n)\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[.:)]\s*([\s\S]+?)(?=\n\s*(?:Q(?:uestion)?\.?\s*)?\d+[.:)]|$)/gi;
    let match;
    
    while ((match = numberedPattern.exec(content)) !== null) {
      const questionNumber = match[1];
      const questionText = match[2].trim();
      
      if (questionText.length > 10) { // Filter out very short matches
        questionId++;
        questions.push(this.analyzeQuestion(
          `q-${questionId}`,
          questionNumber,
          questionText
        ));
      }
    }
    
    // If no numbered questions found, try bullet pattern
    if (questions.length === 0) {
      const bulletPattern = /(?:^|\n)\s*[•●○◦‣⁃-]\s*(.+?)(?=\n\s*[•●○◦‣⁃-]|$)/gi;
      
      while ((match = bulletPattern.exec(content)) !== null) {
        const questionText = match[1].trim();
        
        if (questionText.length > 10) {
          questionId++;
          questions.push(this.analyzeQuestion(
            `q-${questionId}`,
            questionId.toString(),
            questionText
          ));
        }
      }
    }
    
    // If still no questions, try command pattern (Please provide, Clarify, etc.)
    if (questions.length === 0) {
      const commandPattern = /(?:^|\n)\s*((?:Please\s+)?(?:provide|clarify|explain|justify|discuss|describe|submit|include)\s+.+?)(?=\n\s*(?:Please\s+)?(?:provide|clarify|explain|justify)|$)/gi;
      
      while ((match = commandPattern.exec(content)) !== null) {
        const questionText = match[1].trim();
        
        if (questionText.length > 10) {
          questionId++;
          questions.push(this.analyzeQuestion(
            `q-${questionId}`,
            questionId.toString(),
            questionText
          ));
        }
      }
    }
    
    parsingNotes.push(`Parsing method: ${questions.length > 0 ? 'pattern-based' : 'fallback'}`);
    
    // If still no questions, create a single question from the content
    if (questions.length === 0 && content.length > 50) {
      questions.push(this.analyzeQuestion(
        'q-1',
        '1',
        content.substring(0, 500) + (content.length > 500 ? '...' : '')
      ));
      parsingNotes.push('Warning: Could not parse individual questions, treating content as single question');
    }
    
    return questions;
  }
  
  /**
   * Analyze a question and determine discipline, priority, etc.
   */
  private analyzeQuestion(id: string, number: string, text: string): ParsedQuestion {
    // Detect discipline
    const discipline = this.detectDiscipline(text);
    
    // Detect priority
    const priority = this.config.autoAssignPriority 
      ? this.detectPriority(text) 
      : 'major';
    
    // Extract CTD section if mentioned
    const ctdSection = this.extractCTDSection(text);
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Calculate confidence
    const confidence = this.calculateQuestionConfidence(text, discipline, priority);
    
    return {
      id,
      questionNumber: number,
      text,
      discipline,
      priority,
      ctdSection,
      keywords,
      confidence,
    };
  }
  
  /**
   * Detect discipline from question text
   */
  private detectDiscipline(text: string): HAQDiscipline {
    let bestMatch: { discipline: HAQDiscipline; score: number } = {
      discipline: 'Clinical', // Default
      score: 0,
    };
    
    for (const disciplinePattern of Array.from(DISCIPLINE_PATTERNS)) {
      let score = 0;
      
      for (const pattern of Array.from(disciplinePattern.patterns)) {
        const matches = text.match(pattern);
        if (matches) {
          score += disciplinePattern.weight;
        }
      }
      
      // Check for CTD section mentions
      for (const section of Array.from(disciplinePattern.ctdSections)) {
        if (text.includes(section)) {
          score += 0.5;
        }
      }
      
      if (score > bestMatch.score) {
        bestMatch = { discipline: disciplinePattern.discipline, score };
      }
    }
    
    return bestMatch.discipline;
  }
  
  /**
   * Detect priority from question text
   */
  private detectPriority(text: string): HAQPriority {
    for (const indicator of Array.from(PRIORITY_INDICATORS)) {
      for (const pattern of Array.from(indicator.patterns)) {
        if (pattern.test(text)) {
          return indicator.priority;
        }
      }
      
      for (const keyword of Array.from(indicator.keywords)) {
        if (text.toLowerCase().includes(keyword)) {
          return indicator.priority;
        }
      }
    }
    
    // Default to major
    return 'major';
  }
  
  /**
   * Extract CTD section from question text
   */
  private extractCTDSection(text: string): string | undefined {
    for (const pattern of Array.from(CTD_SECTION_PATTERNS)) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }
    return undefined;
  }
  
  /**
   * Extract keywords from question text
   */
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const keywordPatterns = [
      /\b(efficacy|safety|stability|manufacturing|clinical|nonclinical)\b/gi,
      /\b(protocol|study|trial|analysis|data|report)\b/gi,
      /\b(batch|specification|validation|deviation|CAPA)\b/gi,
      /\b(patient|subject|dose|dosing|endpoint)\b/gi,
    ];
    
    for (const pattern of Array.from(keywordPatterns)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const keyword = match[1].toLowerCase();
        if (!keywords.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }
    
    return keywords.slice(0, 10); // Limit to 10 keywords
  }
  
  /**
   * Detect related questions based on content similarity
   */
  private detectRelatedQuestions(questions: ParsedQuestion[]): void {
    for (let i = 0; i < questions.length; i++) {
      const related: string[] = [];
      
      for (let j = 0; j < questions.length; j++) {
        if (i !== j) {
          // Check if questions share keywords or discipline
          const sharedKeywords = questions[i].keywords.filter(
            k => questions[j].keywords.includes(k)
          );
          
          if (sharedKeywords.length >= 2 || questions[i].discipline === questions[j].discipline) {
            related.push(questions[j].id);
          }
        }
      }
      
      if (related.length > 0) {
        questions[i].relatedQuestions = related;
      }
    }
  }
  
  /**
   * Calculate confidence for a single question
   */
  private calculateQuestionConfidence(
    text: string, 
    discipline: HAQDiscipline, 
    priority: HAQPriority
  ): number {
    let confidence = 50; // Base confidence
    
    // Longer questions with more detail = higher confidence
    if (text.length > 200) confidence += 10;
    if (text.length > 500) confidence += 10;
    
    // Questions with CTD section references = higher confidence
    if (this.extractCTDSection(text)) confidence += 15;
    
    // Questions with specific keywords = higher confidence
    const keywords = this.extractKeywords(text);
    confidence += Math.min(keywords.length * 2, 15);
    
    // Cap at 95
    return Math.min(confidence, 95);
  }
  
  /**
   * Calculate overall parsing confidence
   */
  private calculateOverallConfidence(
    questions: ParsedQuestion[], 
    correspondenceType: CorrespondenceType
  ): number {
    if (questions.length === 0) return 20;
    
    // Average of question confidences
    const avgQuestionConfidence = questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length;
    
    // Bonus for known correspondence type
    const typeBonus = correspondenceType !== 'unknown' ? 10 : 0;
    
    return Math.min(Math.round(avgQuestionConfidence + typeBonus), 95);
  }
  
  /**
   * Count questions by discipline
   */
  private countByDiscipline(questions: ParsedQuestion[]): Record<HAQDiscipline, number> {
    const counts: Record<HAQDiscipline, number> = {
      'CMC': 0,
      'Clinical': 0,
      'Nonclinical': 0,
      'Biometrics': 0,
      'Pharmacology': 0,
      'Labeling': 0,
      'Administrative': 0,
      'Safety': 0,
    };
    
    for (const question of Array.from(questions)) {
      counts[question.discipline]++;
    }
    
    return counts;
  }
  
  /**
   * Count questions by priority
   */
  private countByPriority(questions: ParsedQuestion[]): Record<HAQPriority, number> {
    const counts: Record<HAQPriority, number> = {
      'critical': 0,
      'major': 0,
      'minor': 0,
    };
    
    for (const question of Array.from(questions)) {
      counts[question.priority]++;
    }
    
    return counts;
  }
  
  /**
   * Calculate due date from received date and days
   */
  private calculateDueDate(receivedDate: string, daysUntilDue: number): string {
    if (daysUntilDue === 0) return receivedDate; // CRL or similar
    
    const date = new Date(receivedDate);
    date.setDate(date.getDate() + daysUntilDue);
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Generate summary of parsed correspondence
   */
  private generateSummary(
    questions: ParsedQuestion[],
    correspondenceType: CorrespondenceType,
    healthAuthority: string
  ): string {
    const totalQuestions = questions.length;
    const criticalCount = questions.filter(q => q.priority === 'critical').length;
    const disciplines = Array.from(new Set(questions.map(q => q.discipline)));
    
    let summary = `${healthAuthority} ${correspondenceType} containing ${totalQuestions} question${totalQuestions !== 1 ? 's' : ''}`;
    
    if (criticalCount > 0) {
      summary += ` (${criticalCount} critical)`;
    }
    
    if (disciplines.length > 0) {
      summary += ` spanning ${disciplines.join(', ')}`;
    }
    
    return summary;
  }
  
  /**
   * Generate simulated content for demo purposes
   * In production, this would be replaced with actual file parsing
   */
  private generateSimulatedContent(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('ir') || lowerFilename.includes('information request')) {
      return `
FDA Information Request
Application: NDA 123456
Product: LIG-2847 (Nexavant)

1. Please provide updated stability data for the 100mg tablet formulation including accelerated and long-term conditions through 24 months.

2. Clarify the statistical analysis methodology used for the primary endpoint in Study LIG-RA-301, specifically regarding the handling of missing data.

3. The clinical overview (Module 2.5) should be revised to include a more comprehensive discussion of the benefit-risk assessment.

4. Provide justification for the proposed shelf-life of 36 months given the available stability data only supports 24 months.

5. Submit additional safety data regarding cardiovascular events observed in the clinical program, including adjudicated events and time-to-event analyses.
      `.trim();
    }
    
    if (lowerFilename.includes('crl') || lowerFilename.includes('complete response')) {
      return `
Complete Response Letter
Application: NDA 123456

The FDA has completed its review and has determined that additional information is required before approval.

1. Critical deficiency: Manufacturing process validation is incomplete. Must provide additional process validation data for commercial scale batches.

2. Clinical efficacy concerns: The primary endpoint analysis should be re-conducted using the pre-specified ITT population.

3. Safety labeling: The proposed label does not adequately reflect the observed cardiovascular signal.
      `.trim();
    }
    
    // Default
    return `
Health Authority Questions
Reference: HAQ-2024-001

1. Please clarify the analytical method validation for the drug substance specification tests.

2. Provide additional data supporting the proposed dissolution specification limits.

3. The nonclinical pharmacology section requires additional discussion of off-target effects.
    `.trim();
  }
  
  /**
   * Get correspondence type label
   */
  getCorrespondenceTypeLabel(type: CorrespondenceType): string {
    const labels: Record<CorrespondenceType, string> = {
      'IR': 'Information Request',
      'CRL': 'Complete Response Letter',
      'RTQ': 'Request to Question',
      'AI': 'Additional Information',
      'D80': 'Day 80 Questions',
      'D120': 'Day 120 Questions',
      'LOQ': 'List of Questions',
      'RSI': 'Request for Supplemental Information',
      'unknown': 'Unknown',
    };
    return labels[type] || type;
  }
  
  /**
   * Get discipline label
   */
  getDisciplineLabel(discipline: HAQDiscipline): string {
    return discipline;
  }
  
  /**
   * Get priority label
   */
  getPriorityLabel(priority: HAQPriority): string {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
}

// Export singleton instance
export const haqCorrespondenceParserService = new HAQCorrespondenceParserService();

// Export helper functions
export async function parseHAQCorrespondence(
  content: string,
  metadata?: {
    filename?: string;
    receivedDate?: string;
    healthAuthority?: string;
    productName?: string;
  }
): Promise<ParsedCorrespondence> {
  return haqCorrespondenceParserService.parseCorrespondence(content, metadata);
}

export async function parseHAQFile(file: File): Promise<ParsedCorrespondence> {
  return haqCorrespondenceParserService.parseFile(file);
}
