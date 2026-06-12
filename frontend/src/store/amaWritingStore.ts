

// AMA Manual of Style Writing Standards Store
// Comprehensive guidance and compliance checking for regulatory medical documents

import { create } from 'zustand';

// ============================================================================
// AMA WRITING STANDARDS REFERENCE
// ============================================================================

/**
 * Key AMA Manual of Style Guidelines (11th Edition) for Regulatory Writing:
 * 
 * 1. ABBREVIATIONS
 *    - Define at first mention: expanded term (abbreviation)
 *    - Do not use periods between letters (FDA not F.D.A.)
 *    - Spell out state names in text, use 2-letter in references
 *    - Common medical abbreviations need not be defined (eg, DNA, RNA)
 *    - Define in each table/figure independently
 * 
 * 2. NUMBERS
 *    - Spell out numbers 0-9 in text (except units of measure)
 *    - Use numerals for 10 and above
 *    - Always use numerals with units of measure (5 mg, 2 hours)
 *    - Spell out numbers at sentence beginning (or rewrite)
 *    - Use numerals for percentages (5%)
 * 
 * 3. DRUG NAMES
 *    - Use lowercase for generic/nonproprietary names (ligrastinib)
 *    - Capitalize brand/trade names (Nexavar)
 *    - On first mention, provide both: generic name (Brand Name)
 * 
 * 4. UNITS OF MEASURE
 *    - Use SI units (Le Système International d'Unités)
 *    - Space between number and unit (100 mg, not 100mg)
 *    - No period after unit abbreviations unless at sentence end
 *    - No commas in numbers with units (1600 km, not 1,600 km)
 * 
 * 5. DATES AND TIMES
 *    - Write out month, use numerals for day and year: December 18, 2024
 *    - Use AM/PM in small caps for time
 *    - 24-hour time acceptable for dosing schedules
 * 
 * 6. CAPITALIZATION
 *    - Sentence case for article titles (only first word capitalized)
 *    - Title case for journal names
 *    - Do not capitalize words forming acronyms (except proper nouns)
 * 
 * 7. STATISTICAL REPORTING
 *    - Report P values to 2 or 3 decimal places (P = .03)
 *    - Use < or > for extreme values (P < .001)
 *    - Include 95% CI in parentheses
 *    - Hazard ratio (HR), odds ratio (OR), relative risk (RR)
 * 
 * 8. REFERENCES
 *    - Superscript Arabic numerals in text
 *    - Numbered consecutively in order of appearance
 *    - Journal abbreviations per NLM Catalog
 *    - More than 6 authors: list first 3 + et al
 */

// ============================================================================
// TYPES
// ============================================================================

export type AMAViolationType = 
  | 'abbreviation-not-defined'
  | 'abbreviation-redefined'
  | 'number-should-be-spelled'
  | 'number-at-sentence-start'
  | 'drug-name-capitalization'
  | 'unit-spacing'
  | 'date-format'
  | 'time-format'
  | 'statistical-format'
  | 'reference-format'
  | 'passive-voice-excessive'
  | 'sentence-too-long'
  | 'jargon-unclear';

export type AMASeverity = 'error' | 'warning' | 'suggestion';

export interface AMAViolation {
  id: string;
  type: AMAViolationType;
  severity: AMASeverity;
  message: string;
  suggestion: string;
  location: {
    line?: number;
    column?: number;
    text: string;
  };
  rule: string;
}

export interface AMAComplianceResult {
  score: number;
  errors: number;
  warnings: number;
  suggestions: number;
  violations: AMAViolation[];
  abbreviationsDefined: string[];
  abbreviationsUndefined: string[];
}

export interface AMAStyleRule {
  id: string;
  category: string;
  title: string;
  description: string;
  examples: {
    incorrect: string;
    correct: string;
  }[];
  reference: string;
}

// ============================================================================
// AMA STYLE RULES REFERENCE
// ============================================================================

export const AMA_STYLE_RULES: AMAStyleRule[] = [
  // ABBREVIATIONS
  {
    id: 'abbrev-define',
    category: 'Abbreviations',
    title: 'Define abbreviations at first mention',
    description: 'Provide the expanded term followed by the abbreviation in parentheses on first use.',
    examples: [
      { incorrect: 'The FDA approved the NDA.', correct: 'The Food and Drug Administration (FDA) approved the new drug application (NDA).' },
      { incorrect: 'Patients received IV administration.', correct: 'Patients received intravenous (IV) administration.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §13.1'
  },
  {
    id: 'abbrev-no-periods',
    category: 'Abbreviations',
    title: 'No periods between letters',
    description: 'Do not place periods between letters of an abbreviation, acronym, or initialism.',
    examples: [
      { incorrect: 'F.D.A., U.S., M.D.', correct: 'FDA, US, MD' },
      { incorrect: 'The I.N.D. was submitted.', correct: 'The IND was submitted.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §10.6'
  },
  // NUMBERS
  {
    id: 'number-spell-under-ten',
    category: 'Numbers',
    title: 'Spell out numbers zero through nine',
    description: 'Use words for numbers 0-9 in running text, except when used with units of measure.',
    examples: [
      { incorrect: 'There were 3 patients in the study.', correct: 'There were three patients in the study.' },
      { incorrect: '5 adverse events were reported.', correct: 'Five adverse events were reported.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §18.2'
  },
  {
    id: 'number-with-units',
    category: 'Numbers',
    title: 'Use numerals with units of measure',
    description: 'Always use Arabic numerals when a number is accompanied by a unit of measure.',
    examples: [
      { incorrect: 'Patients received five mg of drug.', correct: 'Patients received 5 mg of drug.' },
      { incorrect: 'The study lasted three months.', correct: 'The study lasted 3 months.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §18.2.1'
  },
  {
    id: 'number-sentence-start',
    category: 'Numbers',
    title: 'Spell out numbers at sentence start',
    description: 'Numbers that begin a sentence should be spelled out or the sentence rewritten.',
    examples: [
      { incorrect: '15 patients completed the study.', correct: 'Fifteen patients completed the study.' },
      { incorrect: '298 subjects were randomized.', correct: 'A total of 298 subjects were randomized.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §18.2.5'
  },
  // DRUG NAMES
  {
    id: 'drug-generic-lowercase',
    category: 'Drug Names',
    title: 'Lowercase generic drug names',
    description: 'Generic (nonproprietary) drug names should be lowercase. Brand names are capitalized.',
    examples: [
      { incorrect: 'Patients received Aspirin 81 mg.', correct: 'Patients received aspirin 81 mg.' },
      { incorrect: 'The study evaluated Ligrastinib.', correct: 'The study evaluated ligrastinib.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §15.4.1'
  },
  {
    id: 'drug-first-mention',
    category: 'Drug Names',
    title: 'Include brand name on first mention',
    description: 'On first mention, provide both the generic name and brand name: generic (Brand).',
    examples: [
      { incorrect: 'Patients received the study drug.', correct: 'Patients received ligrastinib (LIG-2847).' },
      { incorrect: 'Treatment with the TKI began.', correct: 'Treatment with imatinib (Gleevec) began.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §15.4.1'
  },
  // UNITS
  {
    id: 'unit-spacing',
    category: 'Units of Measure',
    title: 'Space between number and unit',
    description: 'Insert a space between the number and the unit of measure. Exception: % has no space.',
    examples: [
      { incorrect: 'The dose was 100mg/day.', correct: 'The dose was 100 mg/day.' },
      { incorrect: '50mL was administered.', correct: '50 mL was administered.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §17.1'
  },
  {
    id: 'unit-no-period',
    category: 'Units of Measure',
    title: 'No period after unit abbreviations',
    description: 'Do not use a period after unit abbreviations unless at the end of a sentence.',
    examples: [
      { incorrect: 'The sample was 5 mL. in volume.', correct: 'The sample was 5 mL in volume.' },
      { incorrect: 'Dosing was 10 mg. twice daily.', correct: 'Dosing was 10 mg twice daily.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §17.1.1'
  },
  // DATES
  {
    id: 'date-format',
    category: 'Dates and Time',
    title: 'Write out month in dates',
    description: 'In text, write out the month and use numerals for day and year: Month DD, YYYY.',
    examples: [
      { incorrect: 'The study began on 12/18/2024.', correct: 'The study began on December 18, 2024.' },
      { incorrect: 'Enrollment started 1-15-2024.', correct: 'Enrollment started January 15, 2024.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §18.1.1'
  },
  // STATISTICS
  {
    id: 'stat-p-value',
    category: 'Statistics',
    title: 'P value formatting',
    description: 'Express P values to 2-3 decimal places. Use italicized P with no hyphen. Use < for very small values.',
    examples: [
      { incorrect: 'The p-value was 0.04523.', correct: 'The P value was .045.' },
      { incorrect: 'P was <0.0001.', correct: 'P < .001' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §20.9'
  },
  {
    id: 'stat-ci',
    category: 'Statistics',
    title: 'Confidence interval format',
    description: 'Report 95% CI with values in parentheses, separated by hyphen or "to".',
    examples: [
      { incorrect: 'HR=0.71 (CI 0.54-0.93)', correct: 'HR, 0.71 (95% CI, 0.54-0.93)' },
      { incorrect: 'OR was 2.3, CI 1.2-4.5', correct: 'OR, 2.3 (95% CI, 1.2-4.5)' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §20.3'
  },
  // STYLE
  {
    id: 'style-active-voice',
    category: 'Writing Style',
    title: 'Prefer active voice',
    description: 'Use active voice for clarity and directness. Passive voice is acceptable for emphasis on action.',
    examples: [
      { incorrect: 'The drug was administered by the nurse.', correct: 'The nurse administered the drug.' },
      { incorrect: 'Data were collected by investigators.', correct: 'Investigators collected data.' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §11.1'
  },
  {
    id: 'style-concise',
    category: 'Writing Style',
    title: 'Be concise',
    description: 'Avoid redundant words and phrases. Use the fewest words to convey meaning.',
    examples: [
      { incorrect: 'In order to evaluate', correct: 'To evaluate' },
      { incorrect: 'A total of 50 patients', correct: 'Fifty patients' },
      { incorrect: 'Due to the fact that', correct: 'Because' },
    ],
    reference: 'AMA Manual of Style, 11th ed., §11.1'
  },
];

// ============================================================================
// COMMON MEDICAL ABBREVIATIONS (No definition needed)
// ============================================================================

export const STANDARD_ABBREVIATIONS = new Set([
  // Common clinical
  'DNA', 'RNA', 'HIV', 'AIDS', 'CT', 'MRI', 'ECG', 'EKG', 'CPR', 'IV', 'IM', 'SC', 'PO',
  // Statistical
  'SD', 'SE', 'CI', 'HR', 'OR', 'RR', 'IQR',
  // Units
  'mg', 'mL', 'kg', 'cm', 'mm', 'L', 'dL', 'g', 'ng', 'mcg', 'µg',
  // Time
  'h', 'min', 's', 'wk', 'mo', 'y',
  // Regulatory (well-known)
  'FDA', 'EMA', 'PMDA', 'ICH', 'GCP', 'GLP', 'GMP',
]);

// ============================================================================
// COMPLIANCE CHECKING FUNCTIONS
// ============================================================================

/**
 * Check for undefined abbreviations in text
 */
function checkAbbreviations(text: string): { violations: AMAViolation[]; defined: string[]; undefined: string[] } {
  const violations: AMAViolation[] = [];
  const defined: string[] = [];
  const undefined_abbrevs: string[] = [];
  
  // Pattern to find abbreviations (2+ uppercase letters)
  const abbrevPattern = /\b([A-Z]{2,})\b/g;
  // Pattern to find definitions: "Full Name (ABBREV)" 
  const definitionPattern = /([A-Za-z\s]+)\s*\(([A-Z]{2,})\)/g;
  
  // Find all defined abbreviations
  let match;
  while ((match = definitionPattern.exec(text)) !== null) {
    defined.push(match[2]);
  }
  
  // Check for undefined abbreviations
  const allAbbrevs = text.match(abbrevPattern) || [];
  const seenAbbrevs = new Set<string>();
  
  for (const abbrev of allAbbrevs) {
    if (seenAbbrevs.has(abbrev)) continue;
    seenAbbrevs.add(abbrev);
    
    if (!STANDARD_ABBREVIATIONS.has(abbrev) && !defined.includes(abbrev)) {
      undefined_abbrevs.push(abbrev);
      violations.push({
        id: `abbrev-${abbrev}-${Date.now()}`,
        type: 'abbreviation-not-defined',
        severity: 'warning',
        message: `Abbreviation "${abbrev}" is not defined at first use`,
        suggestion: `Define as "Full Term (${abbrev})" on first use`,
        location: { text: abbrev },
        rule: 'AMA §13.1',
      });
    }
  }
  
  return { violations, defined, undefined: undefined_abbrevs };
}

/**
 * Check number formatting compliance
 */
function checkNumbers(text: string): AMAViolation[] {
  const violations: AMAViolation[] = [];
  
  // Check for numbers 1-9 not with units that should be spelled out
  const smallNumberPattern = /(?<![0-9])\b([1-9])\b(?!\s*(mg|mL|kg|cm|mm|g|ng|mcg|µg|L|dL|%|h|min|mo|wk|y|days?|weeks?|months?|years?))/g;
  let match;
  
  while ((match = smallNumberPattern.exec(text)) !== null) {
    // Skip if part of a larger context like "Module 2.5" or "Phase 3"
    const context = text.substring(Math.max(0, match.index - 20), match.index + 20);
    if (/Module\s*\d|Phase\s*\d|Section\s*\d|Table\s*\d|Figure\s*\d|Study\s*\d/i.test(context)) {
      continue;
    }
    
    violations.push({
      id: `number-${match[1]}-${match.index}`,
      type: 'number-should-be-spelled',
      severity: 'suggestion',
      message: `Number "${match[1]}" should be spelled out unless with a unit of measure`,
      suggestion: `Consider spelling out as "${numberToWords(parseInt(match[1]))}"`,
      location: { text: match[0] },
      rule: 'AMA §18.2',
    });
  }
  
  // Check for numbers at sentence start
  const sentenceStartPattern = /(?:^|[.!?]\s+)(\d+)/g;
  while ((match = sentenceStartPattern.exec(text)) !== null) {
    violations.push({
      id: `number-start-${match.index}`,
      type: 'number-at-sentence-start',
      severity: 'warning',
      message: `Number "${match[1]}" at sentence start should be spelled out or sentence rewritten`,
      suggestion: `Spell out the number or begin with "A total of ${match[1]}..."`,
      location: { text: match[0] },
      rule: 'AMA §18.2.5',
    });
  }
  
  return violations;
}

/**
 * Check unit spacing
 */
function checkUnits(text: string): AMAViolation[] {
  const violations: AMAViolation[] = [];
  
  // Check for missing space between number and unit
  const noSpacePattern = /(\d)(mg|mL|kg|cm|mm|ng|mcg|µg|dL)(?!\w)/g;
  let match;
  
  while ((match = noSpacePattern.exec(text)) !== null) {
    violations.push({
      id: `unit-space-${match.index}`,
      type: 'unit-spacing',
      severity: 'error',
      message: `Missing space between number and unit: "${match[0]}"`,
      suggestion: `Add space: "${match[1]} ${match[2]}"`,
      location: { text: match[0] },
      rule: 'AMA §17.1',
    });
  }
  
  return violations;
}

/**
 * Check date formatting
 */
function checkDates(text: string): AMAViolation[] {
  const violations: AMAViolation[] = [];
  
  // Check for numeric date formats (MM/DD/YYYY or MM-DD-YYYY)
  const numericDatePattern = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g;
  let match;
  
  while ((match = numericDatePattern.exec(text)) !== null) {
    violations.push({
      id: `date-${match.index}`,
      type: 'date-format',
      severity: 'warning',
      message: `Numeric date format "${match[0]}" should be written out`,
      suggestion: `Use format: Month DD, YYYY (eg, December 18, 2024)`,
      location: { text: match[0] },
      rule: 'AMA §18.1.1',
    });
  }
  
  return violations;
}

/**
 * Check statistical formatting
 */
function checkStatistics(text: string): AMAViolation[] {
  const violations: AMAViolation[] = [];
  
  // Check for lowercase 'p' in p-value
  const pValuePattern = /\bp[\s-]?value/gi;
  let match;
  
  while ((match = pValuePattern.exec(text)) !== null) {
    if (match[0][0] === 'p') {
      violations.push({
        id: `stat-p-${match.index}`,
        type: 'statistical-format',
        severity: 'suggestion',
        message: `Use italicized uppercase "P" in P value`,
        suggestion: `Change to "P value" (with italic P)`,
        location: { text: match[0] },
        rule: 'AMA §20.9',
      });
    }
  }
  
  return violations;
}

/**
 * Helper: Number to words
 */
function numberToWords(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  return words[n] || n.toString();
}

/**
 * Main compliance checker
 */
export function checkAMACompliance(text: string): AMAComplianceResult {
  const allViolations: AMAViolation[] = [];
  
  const abbrevResult = checkAbbreviations(text);
  allViolations.push(...abbrevResult.violations);
  allViolations.push(...checkNumbers(text));
  allViolations.push(...checkUnits(text));
  allViolations.push(...checkDates(text));
  allViolations.push(...checkStatistics(text));
  
  const errors = allViolations.filter(v => v.severity === 'error').length;
  const warnings = allViolations.filter(v => v.severity === 'warning').length;
  const suggestions = allViolations.filter(v => v.severity === 'suggestion').length;
  
  // Calculate score (100 - penalty for violations)
  const penalty = (errors * 10) + (warnings * 3) + (suggestions * 1);
  const score = Math.max(0, 100 - penalty);
  
  return {
    score,
    errors,
    warnings,
    suggestions,
    violations: allViolations,
    abbreviationsDefined: abbrevResult.defined,
    abbreviationsUndefined: abbrevResult.undefined,
  };
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

interface AMAWritingState {
  // Style rules reference
  styleRules: AMAStyleRule[];
  
  // Current document compliance
  currentCompliance: AMAComplianceResult | null;
  
  // User preferences
  autoCheckEnabled: boolean;
  showSuggestions: boolean;
  
  // Actions
  checkDocument: (text: string) => AMAComplianceResult;
  setAutoCheck: (enabled: boolean) => void;
  setShowSuggestions: (show: boolean) => void;
  getRuleById: (id: string) => AMAStyleRule | undefined;
  getRulesByCategory: (category: string) => AMAStyleRule[];
  clearCompliance: () => void;
}

export const useAMAWritingStore = create<AMAWritingState>((set, get) => ({
  styleRules: AMA_STYLE_RULES,
  currentCompliance: null,
  autoCheckEnabled: true,
  showSuggestions: true,
  
  checkDocument: (text: string) => {
    const result = checkAMACompliance(text);
    set({ currentCompliance: result });
    return result;
  },
  
  setAutoCheck: (enabled: boolean) => {
    set({ autoCheckEnabled: enabled });
  },
  
  setShowSuggestions: (show: boolean) => {
    set({ showSuggestions: show });
  },
  
  getRuleById: (id: string) => {
    return get().styleRules.find(r => r.id === id);
  },
  
  getRulesByCategory: (category: string) => {
    return get().styleRules.filter(r => r.category === category);
  },
  
  clearCompliance: () => {
    set({ currentCompliance: null });
  },
}));

// ============================================================================
// EXPORT STYLE CATEGORIES
// ============================================================================

export const AMA_CATEGORIES = [
  'Abbreviations',
  'Numbers',
  'Drug Names',
  'Units of Measure',
  'Dates and Time',
  'Statistics',
  'Writing Style',
];
