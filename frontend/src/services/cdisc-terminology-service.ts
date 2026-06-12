
/**
 * CDISC Terminology Service
 * 
 * Integration layer for NCI EVS (Enterprise Vocabulary Services) providing:
 * - Controlled terminology code list retrieval (quarterly updates)
 * - Variable value validation against CDISC CT
 * - Code list search and lookup
 * - Offline cache with version tracking
 * 
 * NCI EVS API: https://api-evsrest.nci.nih.gov/api/v1
 * CDISC CT OID: 2.16.840.1.113883.3.26.1.1
 * 
 * @module services/cdisc-terminology-service
 * @version 0.42.36
 */

import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

/** A CDISC controlled terminology code list */
export interface CDISCCodeList {
  /** NCI code list code (e.g., "C66767") */
  nciCode: string;
  /** Code list name (e.g., "Action Taken with Study Treatment") */
  name: string;
  /** CDISC submission value identifier (e.g., "ACN") */
  submissionValue: string;
  /** Which standard this code list belongs to */
  standard: 'SDTM' | 'ADaM' | 'SEND' | 'CDASH';
  /** Extensible (sponsors can add values) or non-extensible */
  extensible: boolean;
  /** Code list items */
  items: CDISCTerminologyItem[];
  /** CT version date (e.g., "2024-06-28") */
  version: string;
  /** Last retrieved from NCI EVS */
  lastFetched: string;
}

/** A single coded term within a code list */
export interface CDISCTerminologyItem {
  /** NCI concept code (e.g., "C49503") */
  conceptCode: string;
  /** CDISC submission value (e.g., "DRUG WITHDRAWN") */
  submissionValue: string;
  /** Human-readable synonym / preferred name */
  preferredTerm: string;
  /** Definition */
  definition?: string;
  /** NCI preferred name */
  nciPreferredName?: string;
  /** Whether this is a sponsor-defined extension value */
  isExtension: boolean;
}

/** Validation result for a coded value */
export interface TerminologyValidationResult {
  /** The value that was validated */
  value: string;
  /** Code list it was validated against */
  codeListName: string;
  /** Whether the value is valid */
  isValid: boolean;
  /** If valid, the matching concept code */
  matchedConceptCode?: string;
  /** If valid, the matched preferred term */
  matchedPreferredTerm?: string;
  /** Suggestions for similar values if invalid */
  suggestions?: string[];
  /** Whether the code list is extensible */
  isExtensible: boolean;
  /** Warning message */
  message?: string;
}

/** Service configuration */
export interface CDISCTerminologyConfig {
  /** NCI EVS API base URL */
  apiBaseUrl: string;
  /** Request timeout (ms) */
  timeout: number;
  /** Enable offline cache */
  enableCache: boolean;
  /** Maximum cache age before refresh (hours) */
  maxCacheAgeHours: number;
  /** Default CT version to use */
  defaultVersion?: string;
}

/** Cache entry for a code list */
interface CacheEntry {
  codeList: CDISCCodeList;
  cachedAt: string;
  expiresAt: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: CDISCTerminologyConfig = {
  apiBaseUrl: 'https://api-evsrest.nci.nih.gov/api/v1',
  timeout: 15000,
  enableCache: true,
  maxCacheAgeHours: 168, // 1 week
  defaultVersion: '2024-06-28',
};

/** Well-known CDISC CT code list OIDs for common SDTM code lists */
const WELL_KNOWN_CODE_LISTS: Record<string, { nciCode: string; name: string; extensible: boolean }> = {
  SEX: { nciCode: 'C66731', name: 'Sex', extensible: false },
  RACE: { nciCode: 'C74457', name: 'Race', extensible: true },
  ETHNIC: { nciCode: 'C66790', name: 'Ethnicity', extensible: false },
  COUNTRY: { nciCode: 'C66729', name: 'Country', extensible: false },
  AESEV: { nciCode: 'C66769', name: 'Severity/Intensity Scale for Adverse Events', extensible: false },
  AEACN: { nciCode: 'C66767', name: 'Action Taken with Study Treatment', extensible: true },
  AEREL: { nciCode: 'C66768', name: 'Causality', extensible: true },
  AEOUT: { nciCode: 'C66768', name: 'Outcome of Event', extensible: false },
  AESCAN: { nciCode: 'C66742', name: 'Seriousness Criteria', extensible: false },
  ACN: { nciCode: 'C66767', name: 'Action Taken with Study Treatment', extensible: true },
  OUT: { nciCode: 'C66768', name: 'Outcome of Adverse Event', extensible: false },
  AGEU: { nciCode: 'C66781', name: 'Age Unit', extensible: false },
  VSTESTCD: { nciCode: 'C66741', name: 'Vital Signs Test Code', extensible: true },
  LBTESTCD: { nciCode: 'C65047', name: 'Lab Test Code', extensible: true },
  EGTEST: { nciCode: 'C71153', name: 'ECG Test Name', extensible: true },
  POSITION: { nciCode: 'C71148', name: 'Position of Subject', extensible: false },
  UNIT: { nciCode: 'C71620', name: 'Unit', extensible: true },
  TSPARMCD: { nciCode: 'C66738', name: 'Trial Summary Parameter Code', extensible: true },
  SUPPDM: { nciCode: 'C67152', name: 'Supplemental Qualifiers for DM', extensible: true },
  NY: { nciCode: 'C66742', name: 'No Yes Response', extensible: false },
  EPOCH: { nciCode: 'C99079', name: 'Epoch', extensible: true },
};

// =============================================================================
// BUILT-IN TERMINOLOGY DATA (OFFLINE FALLBACK)
// =============================================================================

/**
 * Built-in CDISC CT data for offline operation.
 * This covers the most commonly used code lists from CDISC CT 2024-06-28.
 * Full terminology should be loaded from NCI EVS for production use.
 */
const BUILT_IN_TERMINOLOGY: Record<string, CDISCCodeList> = {
  SEX: {
    nciCode: 'C66731', name: 'Sex', submissionValue: 'SEX', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C20197', submissionValue: 'M', preferredTerm: 'Male', definition: 'A person who belongs to the sex that normally produces sperm.', isExtension: false },
      { conceptCode: 'C16576', submissionValue: 'F', preferredTerm: 'Female', definition: 'A person who belongs to the sex that normally produces ova.', isExtension: false },
      { conceptCode: 'C17998', submissionValue: 'U', preferredTerm: 'Unknown', definition: 'Not known, not observed, not recorded, or refused.', isExtension: false },
      { conceptCode: 'C38046', submissionValue: 'UNDIFFERENTIATED', preferredTerm: 'Undifferentiated', definition: 'Not specified as either male or female.', isExtension: false },
    ],
  },
  RACE: {
    nciCode: 'C74457', name: 'Race', submissionValue: 'RACE', standard: 'SDTM',
    extensible: true, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C41260', submissionValue: 'ASIAN', preferredTerm: 'Asian', isExtension: false },
      { conceptCode: 'C16352', submissionValue: 'BLACK OR AFRICAN AMERICAN', preferredTerm: 'Black or African American', isExtension: false },
      { conceptCode: 'C41261', submissionValue: 'WHITE', preferredTerm: 'White', isExtension: false },
      { conceptCode: 'C41259', submissionValue: 'AMERICAN INDIAN OR ALASKA NATIVE', preferredTerm: 'American Indian or Alaska Native', isExtension: false },
      { conceptCode: 'C41219', submissionValue: 'NATIVE HAWAIIAN OR OTHER PACIFIC ISLANDER', preferredTerm: 'Native Hawaiian or Other Pacific Islander', isExtension: false },
      { conceptCode: 'C67109', submissionValue: 'MULTIPLE', preferredTerm: 'Multiple', isExtension: false },
      { conceptCode: 'C17998', submissionValue: 'UNKNOWN', preferredTerm: 'Unknown', isExtension: false },
      { conceptCode: 'C43234', submissionValue: 'NOT REPORTED', preferredTerm: 'Not Reported', isExtension: false },
      { conceptCode: 'C17649', submissionValue: 'OTHER', preferredTerm: 'Other', isExtension: false },
    ],
  },
  ETHNIC: {
    nciCode: 'C66790', name: 'Ethnicity', submissionValue: 'ETHNIC', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C17459', submissionValue: 'HISPANIC OR LATINO', preferredTerm: 'Hispanic or Latino', isExtension: false },
      { conceptCode: 'C41222', submissionValue: 'NOT HISPANIC OR LATINO', preferredTerm: 'Not Hispanic or Latino', isExtension: false },
      { conceptCode: 'C43234', submissionValue: 'NOT REPORTED', preferredTerm: 'Not Reported', isExtension: false },
      { conceptCode: 'C17998', submissionValue: 'UNKNOWN', preferredTerm: 'Unknown', isExtension: false },
    ],
  },
  AESEV: {
    nciCode: 'C66769', name: 'Severity/Intensity Scale for Adverse Events', submissionValue: 'AESEV', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C41338', submissionValue: 'MILD', preferredTerm: 'Mild', definition: 'An experience that is easily tolerated by the patient.', isExtension: false },
      { conceptCode: 'C41339', submissionValue: 'MODERATE', preferredTerm: 'Moderate', definition: 'An experience that is sufficiently discomforting to interfere with normal daily activities.', isExtension: false },
      { conceptCode: 'C41340', submissionValue: 'SEVERE', preferredTerm: 'Severe', definition: 'An experience that is incapacitating and prevents normal daily activities.', isExtension: false },
    ],
  },
  NY: {
    nciCode: 'C66742', name: 'No Yes Response', submissionValue: 'NY', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C49488', submissionValue: 'N', preferredTerm: 'No', isExtension: false },
      { conceptCode: 'C49487', submissionValue: 'Y', preferredTerm: 'Yes', isExtension: false },
    ],
  },
  AGEU: {
    nciCode: 'C66781', name: 'Age Unit', submissionValue: 'AGEU', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C29848', submissionValue: 'YEARS', preferredTerm: 'Years', isExtension: false },
      { conceptCode: 'C29846', submissionValue: 'MONTHS', preferredTerm: 'Months', isExtension: false },
      { conceptCode: 'C29844', submissionValue: 'WEEKS', preferredTerm: 'Weeks', isExtension: false },
      { conceptCode: 'C29840', submissionValue: 'DAYS', preferredTerm: 'Days', isExtension: false },
      { conceptCode: 'C29842', submissionValue: 'HOURS', preferredTerm: 'Hours', isExtension: false },
    ],
  },
  EPOCH: {
    nciCode: 'C99079', name: 'Epoch', submissionValue: 'EPOCH', standard: 'SDTM',
    extensible: true, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C98774', submissionValue: 'SCREENING', preferredTerm: 'Screening', isExtension: false },
      { conceptCode: 'C98779', submissionValue: 'RUN-IN', preferredTerm: 'Run-In', isExtension: false },
      { conceptCode: 'C101526', submissionValue: 'TREATMENT', preferredTerm: 'Treatment', isExtension: false },
      { conceptCode: 'C99158', submissionValue: 'FOLLOW-UP', preferredTerm: 'Follow-up', isExtension: false },
    ],
  },
  OUT: {
    nciCode: 'C66768', name: 'Outcome of Adverse Event', submissionValue: 'OUT', standard: 'SDTM',
    extensible: false, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C49494', submissionValue: 'RECOVERED/RESOLVED', preferredTerm: 'Recovered/Resolved', isExtension: false },
      { conceptCode: 'C49495', submissionValue: 'RECOVERED/RESOLVED WITH SEQUELAE', preferredTerm: 'Recovered/Resolved with Sequelae', isExtension: false },
      { conceptCode: 'C49496', submissionValue: 'RECOVERING/RESOLVING', preferredTerm: 'Recovering/Resolving', isExtension: false },
      { conceptCode: 'C49493', submissionValue: 'NOT RECOVERED/NOT RESOLVED', preferredTerm: 'Not Recovered/Not Resolved', isExtension: false },
      { conceptCode: 'C48275', submissionValue: 'FATAL', preferredTerm: 'Fatal', isExtension: false },
      { conceptCode: 'C17998', submissionValue: 'UNKNOWN', preferredTerm: 'Unknown', isExtension: false },
    ],
  },
  ACN: {
    nciCode: 'C66767', name: 'Action Taken with Study Treatment', submissionValue: 'ACN', standard: 'SDTM',
    extensible: true, version: '2024-06-28', lastFetched: '2024-06-28',
    items: [
      { conceptCode: 'C49503', submissionValue: 'DRUG WITHDRAWN', preferredTerm: 'Drug Withdrawn', isExtension: false },
      { conceptCode: 'C49500', submissionValue: 'DOSE REDUCED', preferredTerm: 'Dose Reduced', isExtension: false },
      { conceptCode: 'C49502', submissionValue: 'DRUG INTERRUPTED', preferredTerm: 'Drug Interrupted', isExtension: false },
      { conceptCode: 'C49504', submissionValue: 'DOSE NOT CHANGED', preferredTerm: 'Dose Not Changed', isExtension: false },
      { conceptCode: 'C49501', submissionValue: 'DOSE INCREASED', preferredTerm: 'Dose Increased', isExtension: false },
      { conceptCode: 'C17998', submissionValue: 'UNKNOWN', preferredTerm: 'Unknown', isExtension: false },
      { conceptCode: 'C48660', submissionValue: 'NOT APPLICABLE', preferredTerm: 'Not Applicable', isExtension: false },
    ],
  },
};

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class CDISCTerminologyService {
  private config: CDISCTerminologyConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private initialized = false;

  constructor(config: Partial<CDISCTerminologyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the service, loading built-in terminology into cache
   */
  initialize(): void {
    if (this.initialized) return;

    // Load built-in terminology into cache
    for (const [key, codeList] of Object.entries(BUILT_IN_TERMINOLOGY)) {
      const now = new Date();
      const expires = new Date(now.getTime() + this.config.maxCacheAgeHours * 60 * 60 * 1000);
      this.cache.set(key, {
        codeList,
        cachedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });
    }

    this.initialized = true;
    logger.info('[CDISCTerminology]', 'Initialized with built-in terminology', {
      codeListCount: Object.keys(BUILT_IN_TERMINOLOGY).length,
    });
  }

  /**
   * Get a code list by its submission value (e.g., "SEX", "RACE", "AESEV")
   */
  getCodeList(submissionValue: string): CDISCCodeList | null {
    this.ensureInitialized();
    const key = submissionValue.toUpperCase();

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached.codeList;
    }

    return null;
  }

  /**
   * Get all available code lists
   */
  getAllCodeLists(): CDISCCodeList[] {
    this.ensureInitialized();
    return Array.from(this.cache.values()).map(entry => entry.codeList);
  }

  /**
   * Get code lists for a specific standard
   */
  getCodeListsByStandard(standard: 'SDTM' | 'ADaM' | 'SEND' | 'CDASH'): CDISCCodeList[] {
    return this.getAllCodeLists().filter(cl => cl.standard === standard);
  }

  /**
   * Validate a value against a code list
   */
  validateValue(
    value: string,
    codeListSubmissionValue: string
  ): TerminologyValidationResult {
    this.ensureInitialized();

    const codeList = this.getCodeList(codeListSubmissionValue);

    if (!codeList) {
      return {
        value,
        codeListName: codeListSubmissionValue,
        isValid: false,
        isExtensible: false,
        message: `Code list "${codeListSubmissionValue}" not found in terminology service`,
      };
    }

    // Exact match (case-insensitive for submission values)
    const normalizedValue = value.toUpperCase().trim();
    const match = codeList.items.find(
      item => item.submissionValue.toUpperCase() === normalizedValue
    );

    if (match) {
      return {
        value,
        codeListName: codeList.name,
        isValid: true,
        matchedConceptCode: match.conceptCode,
        matchedPreferredTerm: match.preferredTerm,
        isExtensible: codeList.extensible,
      };
    }

    // No match - provide suggestions
    const suggestions = this.findSimilarValues(normalizedValue, codeList.items);

    return {
      value,
      codeListName: codeList.name,
      isValid: false,
      isExtensible: codeList.extensible,
      suggestions: suggestions.length ? suggestions : undefined,
      message: codeList.extensible
        ? `Value "${value}" not in standard terminology for ${codeList.name}. This code list is extensible, so sponsor-defined values are permitted with documentation.`
        : `Value "${value}" is not a valid term in ${codeList.name}. This code list is non-extensible.`,
    };
  }

  /**
   * Validate multiple values against their respective code lists
   * (batch validation for dataset QC)
   */
  validateBatch(
    validations: Array<{ value: string; codeList: string; variableName?: string; rowIndex?: number }>
  ): Array<TerminologyValidationResult & { variableName?: string; rowIndex?: number }> {
    return validations.map(v => ({
      ...this.validateValue(v.value, v.codeList),
      variableName: v.variableName,
      rowIndex: v.rowIndex,
    }));
  }

  /**
   * Lookup a concept code to get its details
   */
  lookupConceptCode(conceptCode: string): CDISCTerminologyItem | null {
    this.ensureInitialized();

    for (const entry of Array.from(Array.from(Array.from(Array.from(this.cache.values()))))) {
      const item = entry.codeList.items.find(i => i.conceptCode === conceptCode);
      if (item) return item;
    }

    return null;
  }

  /**
   * Search across all code lists for terms matching a query
   */
  searchTerms(
    query: string,
    options: { standard?: string; limit?: number } = {}
  ): Array<CDISCTerminologyItem & { codeListName: string; codeListSubmissionValue: string }> {
    this.ensureInitialized();
    const { limit = 20 } = options;
    const results: Array<CDISCTerminologyItem & { codeListName: string; codeListSubmissionValue: string }> = [];
    const normalizedQuery = query.toUpperCase();

    for (const entry of Array.from(Array.from(Array.from(Array.from(this.cache.values()))))) {
      if (options.standard && entry.codeList.standard !== options.standard) continue;

      for (const item of entry.codeList.items) {
        if (
          item.submissionValue.toUpperCase().includes(normalizedQuery) ||
          item.preferredTerm.toUpperCase().includes(normalizedQuery) ||
          item.conceptCode.includes(normalizedQuery)
        ) {
          results.push({
            ...item,
            codeListName: entry.codeList.name,
            codeListSubmissionValue: entry.codeList.submissionValue,
          });
          if (results.length >= limit) return results;
        }
      }
    }

    return results;
  }

  /**
   * Fetch code list from NCI EVS API (for live updates)
   * Falls back to built-in data if API is unavailable.
   */
  async fetchCodeListFromEVS(nciCode: string): Promise<CDISCCodeList | null> {
    try {
      const url = `${this.config.apiBaseUrl}/concept/ncit/${nciCode}?include=children,summary`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        logger.warn('[CDISCTerminology]', `EVS API returned ${response.status} for ${nciCode}`);
        return null;
      }

      const data = await response.json();

      // Transform NCI EVS response to our format
      const codeList: CDISCCodeList = {
        nciCode: data.code || nciCode,
        name: data.name || '',
        submissionValue: data.name?.replace(/\s+/g, '') || nciCode,
        standard: 'SDTM',
        extensible: false, // Would need additional metadata to determine
        version: new Date().toISOString().split('T')[0],
        lastFetched: new Date().toISOString(),
        items: (data.children || []).map((child: Record<string, unknown>) => ({
          conceptCode: child.code as string || '',
          submissionValue: child.name as string || '',
          preferredTerm: child.name as string || '',
          definition: child.definition as string || undefined,
          isExtension: false,
        })),
      };

      // Cache it
      const now = new Date();
      const expires = new Date(now.getTime() + this.config.maxCacheAgeHours * 60 * 60 * 1000);
      this.cache.set(codeList.submissionValue, {
        codeList,
        cachedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });

      logger.info('[CDISCTerminology]', `Fetched code list ${nciCode} from EVS`, {
        itemCount: codeList.items.length,
      });

      return codeList;

    } catch (error) {
      logger.warn('[CDISCTerminology]', `Failed to fetch from EVS: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Refresh all cached code lists from NCI EVS
   */
  async refreshFromEVS(): Promise<{
    updated: number;
    failed: number;
    errors: string[];
  }> {
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const [key, info] of Object.entries(WELL_KNOWN_CODE_LISTS)) {
      try {
        const result = await this.fetchCodeListFromEVS(info.nciCode);
        if (result) {
          result.submissionValue = key;
          result.name = info.name;
          result.extensible = info.extensible;
          updated++;
        } else {
          failed++;
          errors.push(`Failed to fetch ${key} (${info.nciCode})`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error fetching ${key}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Rate limiting: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('[CDISCTerminology]', 'EVS refresh complete', { updated, failed });
    return { updated, failed, errors };
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    cachedCodeLists: number;
    totalTerms: number;
    cacheVersion: string;
    standards: string[];
  } {
    let totalTerms = 0;
    const standards = new Set<string>();

    for (const entry of Array.from(Array.from(Array.from(Array.from(this.cache.values()))))) {
      totalTerms += entry.codeList.items.length;
      standards.add(entry.codeList.standard);
    }

    return {
      initialized: this.initialized,
      cachedCodeLists: this.cache.size,
      totalTerms,
      cacheVersion: this.config.defaultVersion || 'unknown',
      standards: Array.from(standards),
    };
  }

  /**
   * Export all cached terminology as JSON (for offline distribution)
   */
  exportAsJSON(): string {
    const exportData: Record<string, CDISCCodeList> = {};
    for (const [key, entry] of Array.from(Array.from(Array.from(Array.from(this.cache.entries()))))) {
      exportData[key] = entry.codeList;
    }
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import terminology from JSON export
   */
  importFromJSON(json: string): { imported: number; errors: string[] } {
    const errors: string[] = [];
    let imported = 0;

    try {
      const data = JSON.parse(json) as Record<string, CDISCCodeList>;
      const now = new Date();
      const expires = new Date(now.getTime() + this.config.maxCacheAgeHours * 60 * 60 * 1000);

      for (const [key, codeList] of Object.entries(data)) {
        if (!codeList.nciCode || !codeList.items) {
          errors.push(`Invalid code list entry: ${key}`);
          continue;
        }
        this.cache.set(key, {
          codeList,
          cachedAt: now.toISOString(),
          expiresAt: expires.toISOString(),
        });
        imported++;
      }
    } catch (error) {
      errors.push(`JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return { imported, errors };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Find similar submission values using Levenshtein-like matching
   */
  private findSimilarValues(target: string, items: CDISCTerminologyItem[], maxSuggestions = 3): string[] {
    const scored = items.map(item => ({
      value: item.submissionValue,
      score: this.similarity(target, item.submissionValue.toUpperCase()),
    }));

    return scored
      .filter(s => s.score > 0.3) // At least 30% similar
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map(s => s.value);
  }

  /**
   * Simple string similarity (Sørensen–Dice coefficient on bigrams)
   */
  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigramsA = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) {
      bigramsA.add(a.substring(i, i + 2));
    }

    let matches = 0;
    for (let i = 0; i < b.length - 1; i++) {
      if (bigramsA.has(b.substring(i, i + 2))) matches++;
    }

    return (2 * matches) / (a.length - 1 + b.length - 1);
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let serviceInstance: CDISCTerminologyService | null = null;

/**
 * Get the shared CDISC Terminology Service instance
 */
export function getCDISCTerminologyService(
  config?: Partial<CDISCTerminologyConfig>
): CDISCTerminologyService {
  if (!serviceInstance) {
    serviceInstance = new CDISCTerminologyService(config);
    serviceInstance.initialize();
  }
  return serviceInstance;
}

/**
 * Reset the service instance (for testing)
 */
export function resetCDISCTerminologyService(): void {
  serviceInstance = null;
}
