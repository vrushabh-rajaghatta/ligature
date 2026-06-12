/**
 * referenceData.ts — v0.125.30
 *
 * Authoritative reference tables for global regulatory geography.
 * All authorities, regions, and countries that Ligature supports.
 *
 * Rules:
 * - Countries only appear in the ScopeSelector if a corresponding
 *   RegulatoryApplication or MarketAuthorisation record exists.
 * - EU member states appear under EMA applications only.
 * - Flags are Unicode emoji + ISO 3166-1 alpha-2 codes.
 */

// ─── Regulatory Authorities ────────────────────────────────────────────────────

export interface RegulatoryAuthority {
  id: string;
  name: string;
  shortName: string;
  regionId: string;
  countryCode: string;       // ISO 3166-1 alpha-2
  countryName: string;
  flag: string;              // Unicode emoji
  website: string;
  submissionPortal?: string;
  ectdRequired: boolean;
  primaryLanguage: string;
}

export const REGULATORY_AUTHORITIES: RegulatoryAuthority[] = [
  // ── Americas ──────────────────────────────────────────────────────────────
  {
    id: 'fda',
    name: 'Food and Drug Administration',
    shortName: 'FDA',
    regionId: 'us',
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    website: 'https://www.fda.gov',
    submissionPortal: 'https://gateway.fda.gov',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'hc',
    name: 'Health Canada',
    shortName: 'Health Canada',
    regionId: 'ca',
    countryCode: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    website: 'https://www.canada.ca/en/health-canada.html',
    submissionPortal: 'https://hpfb-dgpsa.ca',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'anvisa',
    name: 'Agência Nacional de Vigilância Sanitária',
    shortName: 'ANVISA',
    regionId: 'br',
    countryCode: 'BR',
    countryName: 'Brazil',
    flag: '🇧🇷',
    website: 'https://www.gov.br/anvisa',
    ectdRequired: false,
    primaryLanguage: 'pt',
  },
  {
    id: 'cofepris',
    name: 'Comisión Federal para la Protección contra Riesgos Sanitarios',
    shortName: 'COFEPRIS',
    regionId: 'mx',
    countryCode: 'MX',
    countryName: 'Mexico',
    flag: '🇲🇽',
    website: 'https://www.gob.mx/cofepris',
    ectdRequired: false,
    primaryLanguage: 'es',
  },
  {
    id: 'anmat',
    name: 'Administración Nacional de Medicamentos, Alimentos y Tecnología Médica',
    shortName: 'ANMAT',
    regionId: 'ar',
    countryCode: 'AR',
    countryName: 'Argentina',
    flag: '🇦🇷',
    website: 'https://www.argentina.gob.ar/anmat',
    ectdRequired: false,
    primaryLanguage: 'es',
  },

  // ── Europe ────────────────────────────────────────────────────────────────
  {
    id: 'ema',
    name: 'European Medicines Agency',
    shortName: 'EMA',
    regionId: 'eu',
    countryCode: 'EU',
    countryName: 'European Union',
    flag: '🇪🇺',
    website: 'https://www.ema.europa.eu',
    submissionPortal: 'https://esubmission.ema.europa.eu',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'mhra',
    name: 'Medicines and Healthcare products Regulatory Agency',
    shortName: 'MHRA',
    regionId: 'gb',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    website: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency',
    submissionPortal: 'https://submissions.mhra.gov.uk',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'swissmedic',
    name: 'Swiss Agency of Therapeutic Products',
    shortName: 'Swissmedic',
    regionId: 'ch',
    countryCode: 'CH',
    countryName: 'Switzerland',
    flag: '🇨🇭',
    website: 'https://www.swissmedic.ch',
    ectdRequired: true,
    primaryLanguage: 'de',
  },
  {
    id: 'tga-no',
    name: 'Norwegian Medicines Agency',
    shortName: 'NoMA',
    regionId: 'no',
    countryCode: 'NO',
    countryName: 'Norway',
    flag: '🇳🇴',
    website: 'https://legemiddelverket.no',
    ectdRequired: true,
    primaryLanguage: 'no',
  },

  // ── Asia Pacific ──────────────────────────────────────────────────────────
  {
    id: 'pmda',
    name: 'Pharmaceuticals and Medical Devices Agency',
    shortName: 'PMDA',
    regionId: 'jp',
    countryCode: 'JP',
    countryName: 'Japan',
    flag: '🇯🇵',
    website: 'https://www.pmda.go.jp',
    submissionPortal: 'https://www.pmda.go.jp/english/review-services/submissions/0001.html',
    ectdRequired: true,
    primaryLanguage: 'ja',
  },
  {
    id: 'nmpa',
    name: 'National Medical Products Administration',
    shortName: 'NMPA',
    regionId: 'cn',
    countryCode: 'CN',
    countryName: 'China',
    flag: '🇨🇳',
    website: 'https://english.nmpa.gov.cn',
    ectdRequired: true,
    primaryLanguage: 'zh',
  },
  {
    id: 'mfds',
    name: 'Ministry of Food and Drug Safety',
    shortName: 'MFDS',
    regionId: 'kr',
    countryCode: 'KR',
    countryName: 'South Korea',
    flag: '🇰🇷',
    website: 'https://www.mfds.go.kr',
    ectdRequired: true,
    primaryLanguage: 'ko',
  },
  {
    id: 'tga',
    name: 'Therapeutic Goods Administration',
    shortName: 'TGA',
    regionId: 'au',
    countryCode: 'AU',
    countryName: 'Australia',
    flag: '🇦🇺',
    website: 'https://www.tga.gov.au',
    submissionPortal: 'https://www.tga.gov.au/resources/ert',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'hsa',
    name: 'Health Sciences Authority',
    shortName: 'HSA',
    regionId: 'sg',
    countryCode: 'SG',
    countryName: 'Singapore',
    flag: '🇸🇬',
    website: 'https://www.hsa.gov.sg',
    ectdRequired: true,
    primaryLanguage: 'en',
  },
  {
    id: 'tfda',
    name: 'Taiwan Food and Drug Administration',
    shortName: 'TFDA',
    regionId: 'tw',
    countryCode: 'TW',
    countryName: 'Taiwan',
    flag: '🇹🇼',
    website: 'https://www.fda.gov.tw',
    ectdRequired: false,
    primaryLanguage: 'zh',
  },

  // ── Middle East & Africa ──────────────────────────────────────────────────
  {
    id: 'sfda',
    name: 'Saudi Food and Drug Authority',
    shortName: 'SFDA',
    regionId: 'sa',
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    flag: '🇸🇦',
    website: 'https://www.sfda.gov.sa',
    ectdRequired: true,
    primaryLanguage: 'ar',
  },
  {
    id: 'mohap',
    name: 'Ministry of Health and Prevention',
    shortName: 'MOHAP',
    regionId: 'ae',
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    website: 'https://www.mohap.gov.ae',
    ectdRequired: false,
    primaryLanguage: 'ar',
  },
  {
    id: 'mol-il',
    name: 'Ministry of Health Israel',
    shortName: 'MOH-IL',
    regionId: 'il',
    countryCode: 'IL',
    countryName: 'Israel',
    flag: '🇮🇱',
    website: 'https://www.gov.il/en/departments/ministry_of_health',
    ectdRequired: true,
    primaryLanguage: 'he',
  },
  {
    id: 'sahpra',
    name: 'South African Health Products Regulatory Authority',
    shortName: 'SAHPRA',
    regionId: 'za',
    countryCode: 'ZA',
    countryName: 'South Africa',
    flag: '🇿🇦',
    website: 'https://www.sahpra.org.za',
    ectdRequired: false,
    primaryLanguage: 'en',
  },

  // ── Eurasia ───────────────────────────────────────────────────────────────
  {
    id: 'roszdravnadzor',
    name: 'Federal Service for Surveillance in Healthcare',
    shortName: 'Roszdravnadzor',
    regionId: 'ru',
    countryCode: 'RU',
    countryName: 'Russia',
    flag: '🇷🇺',
    website: 'https://roszdravnadzor.gov.ru',
    ectdRequired: false,
    primaryLanguage: 'ru',
  },

  // ── South Asia ────────────────────────────────────────────────────────────
  {
    id: 'cdsco',
    name: 'Central Drugs Standard Control Organisation',
    shortName: 'CDSCO',
    regionId: 'in',
    countryCode: 'IN',
    countryName: 'India',
    flag: '🇮🇳',
    website: 'https://cdsco.gov.in',
    ectdRequired: false,
    primaryLanguage: 'en',
  },
];

// ─── EU Member States + EEA ────────────────────────────────────────────────────
// Shown under EMA applications as country-level market authorisations

export interface EUMemberState {
  countryCode: string;     // ISO 3166-1 alpha-2
  iso3: string;            // ISO 3166-1 alpha-3
  countryName: string;
  flag: string;
  isEEA: boolean;          // true = EEA but not EU (NO, IS, LI)
  isPostBrexit: boolean;   // GB — handled via MHRA not EMA
  euQPPVRequired: boolean;
  officialLanguages: string[];
}

export const EU_MEMBER_STATES: EUMemberState[] = [
  // ── EU 27 ────────────────────────────────────────────────────────────────
  { countryCode: 'AT', iso3: 'AUT', countryName: 'Austria',        flag: '🇦🇹', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['de'] },
  { countryCode: 'BE', iso3: 'BEL', countryName: 'Belgium',        flag: '🇧🇪', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['nl', 'fr', 'de'] },
  { countryCode: 'BG', iso3: 'BGR', countryName: 'Bulgaria',       flag: '🇧🇬', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['bg'] },
  { countryCode: 'HR', iso3: 'HRV', countryName: 'Croatia',        flag: '🇭🇷', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['hr'] },
  { countryCode: 'CY', iso3: 'CYP', countryName: 'Cyprus',         flag: '🇨🇾', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['el', 'tr'] },
  { countryCode: 'CZ', iso3: 'CZE', countryName: 'Czechia',        flag: '🇨🇿', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['cs'] },
  { countryCode: 'DK', iso3: 'DNK', countryName: 'Denmark',        flag: '🇩🇰', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['da'] },
  { countryCode: 'EE', iso3: 'EST', countryName: 'Estonia',        flag: '🇪🇪', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['et'] },
  { countryCode: 'FI', iso3: 'FIN', countryName: 'Finland',        flag: '🇫🇮', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['fi', 'sv'] },
  { countryCode: 'FR', iso3: 'FRA', countryName: 'France',         flag: '🇫🇷', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['fr'] },
  { countryCode: 'DE', iso3: 'DEU', countryName: 'Germany',        flag: '🇩🇪', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['de'] },
  { countryCode: 'GR', iso3: 'GRC', countryName: 'Greece',         flag: '🇬🇷', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['el'] },
  { countryCode: 'HU', iso3: 'HUN', countryName: 'Hungary',        flag: '🇭🇺', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['hu'] },
  { countryCode: 'IE', iso3: 'IRL', countryName: 'Ireland',        flag: '🇮🇪', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['en', 'ga'] },
  { countryCode: 'IT', iso3: 'ITA', countryName: 'Italy',          flag: '🇮🇹', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['it'] },
  { countryCode: 'LV', iso3: 'LVA', countryName: 'Latvia',         flag: '🇱🇻', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['lv'] },
  { countryCode: 'LT', iso3: 'LTU', countryName: 'Lithuania',      flag: '🇱🇹', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['lt'] },
  { countryCode: 'LU', iso3: 'LUX', countryName: 'Luxembourg',     flag: '🇱🇺', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['fr', 'de', 'lb'] },
  { countryCode: 'MT', iso3: 'MLT', countryName: 'Malta',          flag: '🇲🇹', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['mt', 'en'] },
  { countryCode: 'NL', iso3: 'NLD', countryName: 'Netherlands',    flag: '🇳🇱', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['nl'] },
  { countryCode: 'PL', iso3: 'POL', countryName: 'Poland',         flag: '🇵🇱', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['pl'] },
  { countryCode: 'PT', iso3: 'PRT', countryName: 'Portugal',       flag: '🇵🇹', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['pt'] },
  { countryCode: 'RO', iso3: 'ROU', countryName: 'Romania',        flag: '🇷🇴', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['ro'] },
  { countryCode: 'SK', iso3: 'SVK', countryName: 'Slovakia',       flag: '🇸🇰', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['sk'] },
  { countryCode: 'SI', iso3: 'SVN', countryName: 'Slovenia',       flag: '🇸🇮', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['sl'] },
  { countryCode: 'ES', iso3: 'ESP', countryName: 'Spain',          flag: '🇪🇸', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['es'] },
  { countryCode: 'SE', iso3: 'SWE', countryName: 'Sweden',         flag: '🇸🇪', isEEA: false, isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['sv'] },
  // ── EEA (non-EU) ─────────────────────────────────────────────────────────
  { countryCode: 'NO', iso3: 'NOR', countryName: 'Norway',         flag: '🇳🇴', isEEA: true,  isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['no'] },
  { countryCode: 'IS', iso3: 'ISL', countryName: 'Iceland',        flag: '🇮🇸', isEEA: true,  isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['is'] },
  { countryCode: 'LI', iso3: 'LIE', countryName: 'Liechtenstein',  flag: '🇱🇮', isEEA: true,  isPostBrexit: false, euQPPVRequired: true,  officialLanguages: ['de'] },
];

// ─── Application Types ─────────────────────────────────────────────────────────

export type ApplicationType =
  // Investigational (Development)
  | 'IND'    // Investigational New Drug — FDA
  | 'CTA'    // Clinical Trial Authorisation — EMA / regional
  | 'IMPD'   // Investigational Medicinal Product Dossier — EU CTA component
  // Marketing (Marketed)
  | 'NDA'    // New Drug Application — FDA
  | 'BLA'    // Biologics License Application — FDA
  | 'sNDA'   // supplemental NDA — FDA
  | 'sBLA'   // supplemental BLA — FDA
  | 'MAA'    // Marketing Authorisation Application — EMA
  | 'JNDA'   // Japanese NDA — PMDA
  | 'NDS'    // New Drug Submission — Health Canada
  | 'ANDS'   // Abbreviated NDS — Health Canada
  // Post-approval
  | 'CBE'    // Changes Being Effected — FDA
  | 'PAS'    // Prior Approval Supplement — FDA
  | 'Type-IA'   // Minor variation — EMA
  | 'Type-IB'   // Minor variation — EMA
  | 'Type-II'   // Major variation — EMA
  | 'Art-61-3'; // Labelling/PIL update — EMA

export const APPLICATION_TYPE_LABELS: Record<ApplicationType, string> = {
  'IND':      'Investigational New Drug',
  'CTA':      'Clinical Trial Authorisation',
  'IMPD':     'Investigational Medicinal Product Dossier',
  'NDA':      'New Drug Application',
  'BLA':      'Biologics License Application',
  'sNDA':     'Supplemental NDA',
  'sBLA':     'Supplemental BLA',
  'MAA':      'Marketing Authorisation Application',
  'JNDA':     'Japanese New Drug Application',
  'NDS':      'New Drug Submission',
  'ANDS':     'Abbreviated New Drug Submission',
  'CBE':      'Changes Being Effected',
  'PAS':      'Prior Approval Supplement',
  'Type-IA':  'Type IA Variation',
  'Type-IB':  'Type IB Variation',
  'Type-II':  'Type II Variation',
  'Art-61-3': 'Article 61(3) Notification',
};

export const DEV_APPLICATION_TYPES: ApplicationType[] = ['IND', 'CTA', 'IMPD'];
export const MARKETED_APPLICATION_TYPES: ApplicationType[] = [
  'NDA', 'BLA', 'sNDA', 'sBLA', 'MAA', 'JNDA', 'NDS', 'ANDS',
  'CBE', 'PAS', 'Type-IA', 'Type-IB', 'Type-II', 'Art-61-3',
];

// ─── Therapeutic Areas ─────────────────────────────────────────────────────────

export interface TherapeuticArea {
  id: string;
  name: string;
  color: string;
  icon: string; // emoji
}

export const THERAPEUTIC_AREAS: TherapeuticArea[] = [
  { id: 'oncology',          name: 'Oncology',            color: '#F43F5E', icon: '🎗️' },
  { id: 'immunology',        name: 'Immunology',          color: '#8B5CF6', icon: '🛡️' },
  { id: 'neurology',         name: 'Neurology',           color: '#3B82F6', icon: '🧠' },
  { id: 'cardiology',        name: 'Cardiology',          color: '#EF4444', icon: '❤️' },
  { id: 'rare-disease',      name: 'Rare Disease',        color: '#F97316', icon: '🔬' },
  { id: 'infectious-disease',name: 'Infectious Disease',  color: '#10B981', icon: '🦠' },
  { id: 'respiratory',       name: 'Respiratory',         color: '#06B6D4', icon: '🫁' },
  { id: 'endocrinology',     name: 'Endocrinology',       color: '#F59E0B', icon: '⚗️' },
  { id: 'gastroenterology',  name: 'Gastroenterology',    color: '#84CC16', icon: '🔵' },
  { id: 'dermatology',       name: 'Dermatology',         color: '#EC4899', icon: '🩹' },
  { id: 'ophthalmology',     name: 'Ophthalmology',       color: '#14B8A6', icon: '👁️' },
  { id: 'haematology',       name: 'Haematology',         color: '#DC2626', icon: '🩸' },
];

// ─── Helper functions ──────────────────────────────────────────────────────────

export function getAuthority(id: string): RegulatoryAuthority | undefined {
  return REGULATORY_AUTHORITIES.find(a => a.id === id);
}

export function getAuthorityByCountry(countryCode: string): RegulatoryAuthority | undefined {
  return REGULATORY_AUTHORITIES.find(a => a.countryCode === countryCode);
}

export function getEUMemberState(countryCode: string): EUMemberState | undefined {
  return EU_MEMBER_STATES.find(s => s.countryCode === countryCode);
}

export function getTherapeuticArea(id: string): TherapeuticArea | undefined {
  return THERAPEUTIC_AREAS.find(ta => ta.id === id);
}

export function isDevApplicationType(type: ApplicationType): boolean {
  return DEV_APPLICATION_TYPES.includes(type);
}

export function isMarketedApplicationType(type: ApplicationType): boolean {
  return MARKETED_APPLICATION_TYPES.includes(type);
}
