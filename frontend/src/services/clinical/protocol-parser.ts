
/**
 * Protocol Parser Service
 * Parse protocol text to extract study structure, visits, endpoints, and eligibility
 * Also includes USDM (Unified Study Definitions Model) types and export/import
 * @version 0.20.1.2
 */

import type {
  ClinicalStudy,
  StudyPhase,
  StudyArm,
  StudyEndpoint,
  TreatmentType,
  EndpointType,
  CreateStudyConfig,
} from '@/types/clinical-trial';
import type { ProtocolVisit, VisitType } from '@/types/clinical-visit';

// ============================================================================
// Protocol Structure Types
// ============================================================================

export interface ProtocolStructure {
  protocolNumber: string;
  protocolTitle: string;
  version: string;
  phase: StudyPhase;
  sponsor: string;
  therapeuticArea: string;
  indication: string;
  objectives: StudyObjective[];
  arms: ExtractedArm[];
  visits: ExtractedVisit[];
  endpoints: ExtractedEndpoint[];
  eligibility: EligibilityCriteria;
  plannedEnrollment: number;
  studyDuration: StudyDuration;
  extractionConfidence: number; // 0-1 score
  extractionWarnings: string[];
}

export interface StudyObjective {
  type: 'PRIMARY' | 'SECONDARY' | 'EXPLORATORY';
  description: string;
}

export interface ExtractedArm {
  name: string;
  description: string;
  treatmentType: TreatmentType;
  plannedSubjects: number;
  dosing?: string;
}

export interface ExtractedVisit {
  visitNumber: number;
  visitName: string;
  visitType: VisitType;
  scheduledDay: number;
  windowBefore: number;
  windowAfter: number;
  procedures: string[];
  isCritical: boolean;
}

export interface ExtractedEndpoint {
  name: string;
  type: EndpointType;
  description: string;
  assessmentTimepoints: string[];
  statisticalMethod?: string;
}

export interface EligibilityCriteria {
  inclusionCriteria: EligibilityCriterion[];
  exclusionCriteria: EligibilityCriterion[];
  ageRange?: { min: number; max: number };
  sex?: 'MALE' | 'FEMALE' | 'BOTH';
}

export interface EligibilityCriterion {
  id: string;
  number: number;
  text: string;
  category?: string;
  isCritical: boolean;
}

export interface StudyDuration {
  screeningDays: number;
  treatmentWeeks: number;
  followUpWeeks: number;
  totalWeeks: number;
}

// ============================================================================
// USDM Types (Unified Study Definitions Model - CDISC)
// ============================================================================

export interface USDMStudyDesign {
  id: string;
  name: string;
  label: string;
  description: string;
  
  // Study identification
  studyIdentifiers: USDMStudyIdentifier[];
  studyVersion: string;
  studyType: USDMStudyType;
  studyPhase: USDMStudyPhase;
  
  // Design
  studyDesigns: USDMDesign[];
  
  // Population
  studyPopulations: USDMPopulation[];
  
  // Objectives and endpoints
  objectives: USDMObjective[];
  
  // Schedule
  scheduleTimelines: USDMScheduleTimeline[];
  
  // Eligibility
  studyEligibilityCriteria: USDMEligibilityCriterion[];
  
  // Metadata
  documentVersionId?: string;
  exportTimestamp: string;
  usdmVersion: string;
}

export interface USDMStudyIdentifier {
  id: string;
  studyIdentifier: string;
  studyIdentifierScope: USDMOrganization;
}

export interface USDMOrganization {
  id: string;
  name: string;
  organizationType: 'SPONSOR' | 'REGULATORY_AUTHORITY' | 'CRO' | 'OTHER';
  identifier?: string;
}

export interface USDMStudyType {
  code: string;
  decode: string;
}

export interface USDMStudyPhase {
  standardCode: string;
  standardCodeAliases?: string[];
}

export interface USDMDesign {
  id: string;
  name: string;
  description?: string;
  interventionModel: string;
  
  // Arms
  studyArms: USDMArm[];
  
  // Epochs
  studyEpochs: USDMEpoch[];
  
  // Elements
  studyElements: USDMElement[];
  
  // Cells (arm x epoch matrix)
  studyCells: USDMCell[];
}

export interface USDMArm {
  id: string;
  name: string;
  description?: string;
  armType: string;
  armOrigin?: string;
}

export interface USDMEpoch {
  id: string;
  name: string;
  epochType: string;
  sequenceNumber: number;
}

export interface USDMElement {
  id: string;
  name: string;
  description?: string;
  transitionStartRule?: string;
  transitionEndRule?: string;
}

export interface USDMCell {
  id: string;
  armId: string;
  epochId: string;
  elementIds: string[];
}

export interface USDMPopulation {
  id: string;
  name: string;
  description?: string;
  plannedNumberOfSubjects: number;
  plannedMinimumAgeOfSubjects?: string;
  plannedMaximumAgeOfSubjects?: string;
  plannedSexOfSubjects?: string;
}

export interface USDMObjective {
  id: string;
  name: string;
  description: string;
  level: 'PRIMARY' | 'SECONDARY' | 'EXPLORATORY';
  endpoints: USDMEndpoint[];
}

export interface USDMEndpoint {
  id: string;
  name: string;
  description: string;
  purpose: string;
  outcomeLevel?: string;
}

export interface USDMScheduleTimeline {
  id: string;
  name: string;
  description?: string;
  entryCondition?: string;
  mainTimeline: boolean;
  
  // Timing
  timelineEntries: USDMTimelineEntry[];
  instances: USDMScheduledInstance[];
}

export interface USDMTimelineEntry {
  id: string;
  scheduledInstanceId: string;
  timing: USDMTiming;
}

export interface USDMScheduledInstance {
  id: string;
  name: string;
  description?: string;
  instanceType: 'VISIT' | 'ACTIVITY' | 'DECISION';
  scheduleTimelineExitId?: string;
}

export interface USDMTiming {
  type: 'FIXED' | 'AFTER' | 'BEFORE';
  value?: number;
  valueUnit?: string;
  windowLower?: number;
  windowUpper?: number;
  windowUnit?: string;
  relativeFromScheduledInstanceId?: string;
  relativeToScheduledInstanceId?: string;
}

export interface USDMEligibilityCriterion {
  id: string;
  name: string;
  description: string;
  category: 'INCLUSION' | 'EXCLUSION';
  identifier?: string;
}

// ============================================================================
// Parser Configuration
// ============================================================================

export interface ProtocolParserConfig {
  enableAIExtraction?: boolean;
  confidenceThreshold?: number;
  defaultPhase?: StudyPhase;
  defaultTherapeuticArea?: string;
}

// ============================================================================
// Protocol Parser Service Interface
// ============================================================================

export interface IProtocolParser {
  parseProtocol(protocolText: string): Promise<ProtocolStructure>;
  extractVisitSchedule(protocolText: string): Promise<ExtractedVisit[]>;
  extractEndpoints(protocolText: string): Promise<ExtractedEndpoint[]>;
  extractEligibilityCriteria(protocolText: string): Promise<EligibilityCriteria>;
  extractArms(protocolText: string): Promise<ExtractedArm[]>;
}

// ============================================================================
// Protocol Parser Implementation
// ============================================================================

export class ProtocolParserService implements IProtocolParser {
  private config: Required<ProtocolParserConfig>;
  
  constructor(config: ProtocolParserConfig = {}) {
    this.config = {
      enableAIExtraction: config.enableAIExtraction ?? false,
      confidenceThreshold: config.confidenceThreshold ?? 0.7,
      defaultPhase: config.defaultPhase ?? 'PHASE_3',
      defaultTherapeuticArea: config.defaultTherapeuticArea ?? 'General',
    };
  }
  
  // ===========================================================================
  // Main Parsing Methods
  // ===========================================================================
  
  async parseProtocol(protocolText: string): Promise<ProtocolStructure> {
    const warnings: string[] = [];
    
    // Extract basic information
    const protocolNumber = this.extractProtocolNumber(protocolText);
    const protocolTitle = this.extractProtocolTitle(protocolText);
    const version = this.extractVersion(protocolText);
    const phase = this.extractPhase(protocolText);
    const sponsor = this.extractSponsor(protocolText);
    const therapeuticArea = this.extractTherapeuticArea(protocolText);
    const indication = this.extractIndication(protocolText);
    
    // Extract complex structures
    const objectives = this.extractObjectives(protocolText);
    const arms = await this.extractArms(protocolText);
    const visits = await this.extractVisitSchedule(protocolText);
    const endpoints = await this.extractEndpoints(protocolText);
    const eligibility = await this.extractEligibilityCriteria(protocolText);
    
    // Extract enrollment and duration
    const plannedEnrollment = this.extractPlannedEnrollment(protocolText);
    const studyDuration = this.extractStudyDuration(protocolText, visits);
    
    // Calculate confidence based on what was extracted
    let confidence = 0;
    if (protocolNumber) confidence += 0.15;
    if (protocolTitle) confidence += 0.15;
    if (phase !== this.config.defaultPhase) confidence += 0.1;
    if (arms.length > 0) confidence += 0.2;
    if (visits.length > 0) confidence += 0.2;
    if (endpoints.length > 0) confidence += 0.1;
    if (eligibility.inclusionCriteria.length > 0 || eligibility.exclusionCriteria.length > 0) confidence += 0.1;
    
    // Add warnings for missing critical elements
    if (!protocolNumber) warnings.push('Protocol number not found');
    if (!protocolTitle) warnings.push('Protocol title not found');
    if (arms.length === 0) warnings.push('No treatment arms extracted');
    if (visits.length === 0) warnings.push('No visits extracted from schedule');
    if (endpoints.length === 0) warnings.push('No endpoints extracted');
    
    return {
      protocolNumber: protocolNumber || 'UNKNOWN',
      protocolTitle: protocolTitle || 'Untitled Protocol',
      version: version || '1.0',
      phase,
      sponsor: sponsor || 'Unknown Sponsor',
      therapeuticArea: therapeuticArea || this.config.defaultTherapeuticArea,
      indication: indication || 'Not specified',
      objectives,
      arms,
      visits,
      endpoints,
      eligibility,
      plannedEnrollment,
      studyDuration,
      extractionConfidence: Math.min(1, confidence),
      extractionWarnings: warnings,
    };
  }
  
  async extractVisitSchedule(protocolText: string): Promise<ExtractedVisit[]> {
    const visits: ExtractedVisit[] = [];
    const text = protocolText.toLowerCase();
    
    // Common visit patterns
    const visitPatterns = [
      // "Visit 1 (Day 1)" or "Visit 1 / Day 1"
      /visit\s*(\d+)\s*[(/]\s*(?:day|week)\s*([-]?\d+)/gi,
      // "Screening Visit (Day -14 to Day -1)"
      /screening\s*(?:visit)?\s*\(?(?:day\s*)?([-]?\d+)/gi,
      // "Baseline (Day 1)"
      /baseline\s*\(?(?:day\s*)?([-]?\d+)/gi,
      // "Week 4 Visit"
      /week\s*(\d+)\s*visit/gi,
      // "End of Treatment Visit"
      /end\s*of\s*treatment\s*(?:visit)?\s*\(?(?:day\s*)?([-]?\d+)?/gi,
      // "Follow-up Visit (Week 12)"
      /follow[- ]?up\s*(?:visit)?\s*\(?(?:week\s*)?([-]?\d+)?/gi,
    ];
    
    // Extract screening visit
    // Match "Screening Visit (Day -14 to Day -1)" or similar patterns
    // Need to handle negative days with parentheses
    const screeningPatterns = [
      /screening\s*visit\s*\(\s*day\s*([-]?\d+)/i,  // "Screening Visit (Day -14"
      /screening\s*\(\s*day\s*([-]?\d+)/i,          // "Screening (Day -14"
      /screening[^.]*?day\s*([-]?\d+)/i,            // Any screening...day pattern
    ];
    
    let screeningDay = -14; // Default
    for (const pattern of Array.from(screeningPatterns)) {
      const match = text.match(pattern);
      if (match && match[1]) {
        screeningDay = parseInt(match[1]);
        break;
      }
    }
    
    // Only add screening if mentioned in text
    if (text.includes('screening')) {
      visits.push({
        visitNumber: 0,
        visitName: 'Screening',
        visitType: 'SCREENING',
        scheduledDay: screeningDay,
        windowBefore: 7,
        windowAfter: 0,
        procedures: this.extractProceduresForVisit(protocolText, 'screening'),
        isCritical: true,
      });
    }
    
    // Extract baseline visit
    const baselineMatch = text.match(/baseline\s*(?:visit)?[^.]*(?:day\s*)?([-]?\d+)?/i);
    if (baselineMatch || text.includes('day 1') || text.includes('day one')) {
      visits.push({
        visitNumber: 1,
        visitName: 'Baseline',
        visitType: 'BASELINE',
        scheduledDay: 1,
        windowBefore: 0,
        windowAfter: 0,
        procedures: this.extractProceduresForVisit(protocolText, 'baseline'),
        isCritical: true,
      });
    }
    
    // Extract treatment visits from week references
    const weekMatches = text.matchAll(/week\s*(\d+)(?:\s*(?:[(/]|visit))/gi);
    for (const match of Array.from(weekMatches)) {
      const week = parseInt(match[1]);
      if (week > 0 && !visits.some(v => v.scheduledDay === week * 7 + 1)) {
        visits.push({
          visitNumber: visits.length + 1,
          visitName: `Week ${week}`,
          visitType: 'TREATMENT',
          scheduledDay: week * 7 + 1,
          windowBefore: 3,
          windowAfter: 3,
          procedures: [],
          isCritical: false,
        });
      }
    }
    
    // Extract end of treatment
    if (text.includes('end of treatment') || text.includes('eot')) {
      const eotMatch = text.match(/end\s*of\s*treatment[^.]*(?:week|day)\s*([-]?\d+)/i);
      const day = eotMatch ? parseInt(eotMatch[1]) * (text.includes('week') ? 7 : 1) : 85;
      visits.push({
        visitNumber: visits.length + 1,
        visitName: 'End of Treatment',
        visitType: 'TREATMENT',
        scheduledDay: day,
        windowBefore: 3,
        windowAfter: 3,
        procedures: this.extractProceduresForVisit(protocolText, 'end of treatment'),
        isCritical: true,
      });
    }
    
    // Extract follow-up visits
    const followUpMatches = text.matchAll(/follow[- ]?up\s*(?:visit)?\s*(?:\d+)?\s*\(?(?:week\s*)?(\d+)/gi);
    for (const match of Array.from(followUpMatches)) {
      const week = parseInt(match[1]);
      if (week > 0) {
        visits.push({
          visitNumber: visits.length + 1,
          visitName: `Follow-up Week ${week}`,
          visitType: 'FOLLOWUP',
          scheduledDay: week * 7 + 1,
          windowBefore: 7,
          windowAfter: 7,
          procedures: [],
          isCritical: false,
        });
      }
    }
    
    // Sort by scheduled day and renumber
    visits.sort((a, b) => a.scheduledDay - b.scheduledDay);
    visits.forEach((v, i) => { v.visitNumber = i; });
    
    return visits;
  }
  
  async extractEndpoints(protocolText: string): Promise<ExtractedEndpoint[]> {
    const endpoints: ExtractedEndpoint[] = [];
    const text = protocolText.toLowerCase();
    
    // Primary endpoint patterns
    const primaryPatterns = [
      /primary\s*(?:end\s*point|outcome|objective)[:\s]*([^.]+)/gi,
      /the\s+primary\s+(?:end\s*point|outcome)\s+(?:is|will be)[:\s]*([^.]+)/gi,
    ];
    
    for (const pattern of Array.from(primaryPatterns)) {
      const matches = protocolText.matchAll(pattern);
      for (const match of Array.from(matches)) {
        const description = match[1].trim();
        if (description.length > 10 && !endpoints.some(e => e.description.toLowerCase() === description.toLowerCase())) {
          endpoints.push({
            name: this.generateEndpointName(description),
            type: 'PRIMARY',
            description,
            assessmentTimepoints: this.extractAssessmentTimepoints(protocolText, description),
          });
        }
      }
    }
    
    // Secondary endpoint patterns
    const secondaryPatterns = [
      /secondary\s*(?:end\s*point|outcome|objective)s?[:\s]*([^.]+)/gi,
      /key\s+secondary\s+(?:end\s*point|outcome)[:\s]*([^.]+)/gi,
    ];
    
    for (const pattern of Array.from(secondaryPatterns)) {
      const matches = protocolText.matchAll(pattern);
      for (const match of Array.from(matches)) {
        const description = match[1].trim();
        if (description.length > 10 && !endpoints.some(e => e.description.toLowerCase() === description.toLowerCase())) {
          endpoints.push({
            name: this.generateEndpointName(description),
            type: 'SECONDARY',
            description,
            assessmentTimepoints: this.extractAssessmentTimepoints(protocolText, description),
          });
        }
      }
    }
    
    // Safety endpoint (usually present)
    if (text.includes('adverse event') || text.includes('safety')) {
      endpoints.push({
        name: 'Safety Profile',
        type: 'SAFETY',
        description: 'Incidence and severity of adverse events',
        assessmentTimepoints: ['All visits'],
      });
    }
    
    return endpoints;
  }
  
  async extractEligibilityCriteria(protocolText: string): Promise<EligibilityCriteria> {
    const inclusion: EligibilityCriterion[] = [];
    const exclusion: EligibilityCriterion[] = [];
    
    // Find inclusion criteria section
    const inclusionMatch = protocolText.match(
      /inclusion\s*criteria[:\s]*([\s\S]*?)(?=exclusion\s*criteria|$)/i
    );
    
    if (inclusionMatch) {
      const criteriaText = inclusionMatch[1];
      const criteriaItems = this.parseCriteriaList(criteriaText);
      criteriaItems.forEach((text, index) => {
        inclusion.push({
          id: `INC-${index + 1}`,
          number: index + 1,
          text,
          category: this.categorizeCriterion(text),
          isCritical: this.isCriticalCriterion(text),
        });
      });
    }
    
    // Find exclusion criteria section
    const exclusionMatch = protocolText.match(
      /exclusion\s*criteria[:\s]*([\s\S]*?)(?=\n\s*\n[A-Z]|\n\s*\d+\.\s*[A-Z]|$)/i
    );
    
    if (exclusionMatch) {
      const criteriaText = exclusionMatch[1];
      const criteriaItems = this.parseCriteriaList(criteriaText);
      criteriaItems.forEach((text, index) => {
        exclusion.push({
          id: `EXC-${index + 1}`,
          number: index + 1,
          text,
          category: this.categorizeCriterion(text),
          isCritical: this.isCriticalCriterion(text),
        });
      });
    }
    
    // Extract age range
    const ageRange = this.extractAgeRange(protocolText);
    
    // Extract sex requirement
    const sex = this.extractSexRequirement(protocolText);
    
    return {
      inclusionCriteria: inclusion,
      exclusionCriteria: exclusion,
      ageRange,
      sex,
    };
  }
  
  async extractArms(protocolText: string): Promise<ExtractedArm[]> {
    const arms: ExtractedArm[] = [];
    const text = protocolText.toLowerCase();
    
    // Look for arm definitions
    const armPatterns = [
      // "Arm A: Drug X 100mg"
      /arm\s*([A-Z]|\d+)[:\s]+([^.]+)/gi,
      // "Treatment arm: Drug X"
      /(treatment|experimental|active)\s*(?:arm|group)[:\s]+([^.]+)/gi,
      // "Placebo arm"
      /(placebo|control)\s*(?:arm|group)/gi,
      // "Randomized 1:1 to Drug X or placebo"
      /randomized?\s*(?:\d+:\d+)?\s*to\s+([^.]+)/gi,
    ];
    
    // Extract experimental arm
    const experimentalMatch = protocolText.match(
      /(?:treatment|experimental|active)\s*(?:arm|group)[:\s]*([^.]+)/i
    );
    if (experimentalMatch) {
      arms.push({
        name: 'Treatment Arm',
        description: experimentalMatch[1].trim(),
        treatmentType: 'EXPERIMENTAL',
        plannedSubjects: 0,
        dosing: this.extractDosing(experimentalMatch[1]),
      });
    }
    
    // Extract placebo/control arm
    if (text.includes('placebo')) {
      arms.push({
        name: 'Placebo Arm',
        description: 'Matching placebo',
        treatmentType: 'PLACEBO',
        plannedSubjects: 0,
      });
    } else if (text.includes('active comparator') || text.includes('standard of care')) {
      const comparatorMatch = protocolText.match(
        /(?:active\s*comparator|standard\s*of\s*care)[:\s]*([^.]+)/i
      );
      arms.push({
        name: 'Active Comparator',
        description: comparatorMatch?.[1]?.trim() || 'Standard of care',
        treatmentType: 'ACTIVE_COMPARATOR',
        plannedSubjects: 0,
      });
    }
    
    // Extract randomization ratio for subject allocation
    const ratioMatch = text.match(/randomized?\s*(\d+):(\d+)/);
    if (ratioMatch && arms.length >= 2) {
      const ratio1 = parseInt(ratioMatch[1]);
      const ratio2 = parseInt(ratioMatch[2]);
      const total = ratio1 + ratio2;
      const enrollmentMatch = text.match(/(\d+)\s*(?:subjects?|patients?|participants?)/);
      const totalEnrollment = enrollmentMatch ? parseInt(enrollmentMatch[1]) : 100;
      
      arms[0].plannedSubjects = Math.round(totalEnrollment * ratio1 / total);
      if (arms[1]) {
        arms[1].plannedSubjects = Math.round(totalEnrollment * ratio2 / total);
      }
    }
    
    return arms;
  }
  
  // ===========================================================================
  // Helper Extraction Methods
  // ===========================================================================
  
  private extractProtocolNumber(text: string): string | null {
    const patterns = [
      /protocol\s*(?:number|no\.?|#)[:\s]*([A-Z0-9][-A-Z0-9]+)/i,
      /study\s*(?:number|no\.?|#)[:\s]*([A-Z0-9][-A-Z0-9]+)/i,
      /(?:^|\n)\s*([A-Z]{2,4}[-_]\d{4}[-_]\d{3,4})/m,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }
  
  private extractProtocolTitle(text: string): string | null {
    const patterns = [
      /protocol\s*title[:\s]*([^\n]+)/i,
      /study\s*title[:\s]*([^\n]+)/i,
      /^(?:a\s+)?(?:phase\s+[IViv1-4]+[^.]*?)\s+study\s+[^\n]+/im,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = text.match(pattern);
      if (match) return match[1]?.trim() || match[0].trim();
    }
    return null;
  }
  
  private extractVersion(text: string): string | null {
    const match = text.match(/(?:protocol\s*)?version[:\s]*(\d+\.?\d*)/i);
    return match ? match[1] : null;
  }
  
  private extractPhase(text: string): StudyPhase {
    const phaseMap: Record<string, StudyPhase> = {
      '1': 'PHASE_1',
      'i': 'PHASE_1',
      '1/2': 'PHASE_1_2',
      'i/ii': 'PHASE_1_2',
      '2': 'PHASE_2',
      'ii': 'PHASE_2',
      '2/3': 'PHASE_2_3',
      'ii/iii': 'PHASE_2_3',
      '3': 'PHASE_3',
      'iii': 'PHASE_3',
      '4': 'PHASE_4',
      'iv': 'PHASE_4',
    };
    
    const match = text.match(/phase\s*([IViv1-4]+(?:\/[IViv1-4]+)?)/i);
    if (match) {
      const phase = match[1].toLowerCase();
      return phaseMap[phase] || this.config.defaultPhase;
    }
    return this.config.defaultPhase;
  }
  
  private extractSponsor(text: string): string | null {
    const match = text.match(/sponsor[:\s]*([A-Z][A-Za-z\s&,]+?)(?:\n|Inc\.|LLC|Ltd\.)/i);
    return match ? match[1].trim() : null;
  }
  
  private extractTherapeuticArea(text: string): string | null {
    const areas = [
      'Oncology', 'Cardiology', 'Neurology', 'Immunology', 'Infectious Disease',
      'Respiratory', 'Gastroenterology', 'Endocrinology', 'Rheumatology',
      'Dermatology', 'Ophthalmology', 'Hematology', 'Nephrology', 'Psychiatry',
    ];
    
    const lowerText = text.toLowerCase();
    for (const area of Array.from(areas)) {
      if (lowerText.includes(area.toLowerCase())) {
        return area;
      }
    }
    return null;
  }
  
  private extractIndication(text: string): string | null {
    const match = text.match(/(?:indication|disease|condition)[:\s]*([^.]+)/i);
    return match ? match[1].trim() : null;
  }
  
  private extractObjectives(text: string): StudyObjective[] {
    const objectives: StudyObjective[] = [];
    
    const primaryMatch = text.match(/primary\s*objective[:\s]*([^.]+)/i);
    if (primaryMatch) {
      objectives.push({ type: 'PRIMARY', description: primaryMatch[1].trim() });
    }
    
    const secondaryMatches = text.matchAll(/secondary\s*objective[s]?[:\s]*([^.]+)/gi);
    for (const match of Array.from(secondaryMatches)) {
      objectives.push({ type: 'SECONDARY', description: match[1].trim() });
    }
    
    return objectives;
  }
  
  private extractPlannedEnrollment(text: string): number {
    const patterns = [
      /(?:approximately|about|up to)?\s*(\d+)\s*(?:subjects?|patients?|participants?)/i,
      /enroll(?:ment)?[:\s]*(\d+)/i,
      /sample\s*size[:\s]*(\d+)/i,
      /n\s*=\s*(\d+)/i,
    ];
    
    for (const pattern of Array.from(patterns)) {
      const match = text.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num > 0 && num < 100000) return num;
      }
    }
    return 100; // Default
  }
  
  private extractStudyDuration(text: string, visits: ExtractedVisit[]): StudyDuration {
    let screeningDays = 14;
    let treatmentWeeks = 12;
    let followUpWeeks = 4;
    
    // Try to extract from text
    const screeningMatch = text.match(/screening\s*(?:period)?[:\s]*(?:up to\s*)?(\d+)\s*(?:days?|weeks?)/i);
    if (screeningMatch) {
      screeningDays = parseInt(screeningMatch[1]) * (text.includes('week') ? 7 : 1);
    }
    
    const treatmentMatch = text.match(/treatment\s*(?:period|duration)?[:\s]*(\d+)\s*weeks?/i);
    if (treatmentMatch) {
      treatmentWeeks = parseInt(treatmentMatch[1]);
    }
    
    const followUpMatch = text.match(/follow[- ]?up\s*(?:period)?[:\s]*(\d+)\s*weeks?/i);
    if (followUpMatch) {
      followUpWeeks = parseInt(followUpMatch[1]);
    }
    
    // Or calculate from visits
    if (visits.length > 0) {
      const lastVisit = visits[visits.length - 1];
      const totalDays = lastVisit.scheduledDay + (visits[0]?.scheduledDay < 0 ? Math.abs(visits[0].scheduledDay) : 0);
      const totalWeeksFromVisits = Math.ceil(totalDays / 7);
      if (totalWeeksFromVisits > treatmentWeeks + followUpWeeks) {
        treatmentWeeks = totalWeeksFromVisits - followUpWeeks;
      }
    }
    
    return {
      screeningDays,
      treatmentWeeks,
      followUpWeeks,
      totalWeeks: Math.ceil(screeningDays / 7) + treatmentWeeks + followUpWeeks,
    };
  }
  
  private extractProceduresForVisit(text: string, visitName: string): string[] {
    const procedures: string[] = [];
    const commonProcedures = [
      'vital signs', 'physical examination', 'ecg', 'laboratory tests',
      'informed consent', 'medical history', 'eligibility assessment',
      'randomization', 'study drug administration', 'adverse event assessment',
    ];
    
    const visitSection = text.toLowerCase().split(visitName.toLowerCase())[1]?.slice(0, 500) || '';
    
    for (const proc of Array.from(commonProcedures)) {
      if (visitSection.includes(proc)) {
        procedures.push(proc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
      }
    }
    
    return procedures;
  }
  
  private generateEndpointName(description: string): string {
    // Generate a short name from the description
    const words = description.split(/\s+/).slice(0, 5);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  
  private extractAssessmentTimepoints(text: string, endpointDesc: string): string[] {
    const timepoints: string[] = [];
    const lowerDesc = endpointDesc.toLowerCase();
    
    if (lowerDesc.includes('baseline')) timepoints.push('Baseline');
    if (lowerDesc.includes('week')) {
      const weekMatch = endpointDesc.match(/week\s*(\d+)/i);
      if (weekMatch) timepoints.push(`Week ${weekMatch[1]}`);
    }
    if (lowerDesc.includes('end of treatment')) timepoints.push('End of Treatment');
    if (lowerDesc.includes('overall') || lowerDesc.includes('survival')) {
      timepoints.push('Throughout study');
    }
    
    return timepoints.length > 0 ? timepoints : ['All visits'];
  }
  
  private parseCriteriaList(text: string): string[] {
    const criteria: string[] = [];
    
    // Split by numbered items or bullet points
    const items = text.split(/(?:\n|^)\s*(?:\d+[.)]|\•|\-)\s*/);
    
    for (const item of Array.from(items)) {
      const trimmed = item.trim();
      if (trimmed.length > 10 && trimmed.length < 500) {
        criteria.push(trimmed);
      }
    }
    
    return criteria;
  }
  
  private categorizeCriterion(text: string): string {
    const categories: Record<string, string[]> = {
      'Demographics': ['age', 'sex', 'gender', 'weight', 'bmi'],
      'Disease': ['diagnosis', 'disease', 'tumor', 'cancer', 'stage'],
      'Treatment History': ['prior', 'previous', 'treatment', 'therapy'],
      'Laboratory': ['laboratory', 'lab', 'hemoglobin', 'creatinine', 'liver'],
      'Reproductive': ['pregnant', 'contraception', 'childbearing'],
      'Consent': ['consent', 'willing', 'able to'],
      'General Health': ['ecog', 'performance', 'life expectancy'],
    };
    
    const lowerText = text.toLowerCase();
    for (const [category, keywords] of Array.from(Object.entries(categories))) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        return category;
      }
    }
    return 'General';
  }
  
  private isCriticalCriterion(text: string): boolean {
    const criticalKeywords = [
      'must', 'required', 'mandatory', 'confirmed', 'documented',
      'histologically', 'pathologically', 'measurable disease',
    ];
    const lowerText = text.toLowerCase();
    return criticalKeywords.some(kw => lowerText.includes(kw));
  }
  
  private extractAgeRange(text: string): { min: number; max: number } | undefined {
    const ageMatch = text.match(/(?:age|aged?)\s*(?:≥|>=|at least)?\s*(\d+)\s*(?:to|and|-)?\s*(?:≤|<=)?\s*(\d+)?/i);
    if (ageMatch) {
      const min = parseInt(ageMatch[1]);
      const max = ageMatch[2] ? parseInt(ageMatch[2]) : 99;
      return { min, max };
    }
    
    // Look for "18 years or older"
    const olderMatch = text.match(/(\d+)\s*years?\s*(?:or|and)?\s*older/i);
    if (olderMatch) {
      return { min: parseInt(olderMatch[1]), max: 99 };
    }
    
    return undefined;
  }
  
  private extractSexRequirement(text: string): 'MALE' | 'FEMALE' | 'BOTH' | undefined {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('male and female') || lowerText.includes('both sexes')) {
      return 'BOTH';
    }
    if (lowerText.includes('female only') || lowerText.includes('women only')) {
      return 'FEMALE';
    }
    if (lowerText.includes('male only') || lowerText.includes('men only')) {
      return 'MALE';
    }
    return 'BOTH'; // Default assumption
  }
  
  private extractDosing(text: string): string | undefined {
    const dosingMatch = text.match(/(\d+\s*(?:mg|g|ml|mcg|iu)(?:\s*\/\s*(?:day|week|dose))?)/i);
    return dosingMatch ? dosingMatch[1] : undefined;
  }
}

// ============================================================================
// USDM Converter
// ============================================================================

export class USDMConverter {
  /**
   * Convert a ClinicalStudy to USDM format
   */
  static toUSDM(
    study: ClinicalStudy,
    visits: ProtocolVisit[],
    tenantOrg: string = 'Sponsor Organization'
  ): USDMStudyDesign {
    const studyId = `USDM-${study.id}`;
    
    // Create study identifiers
    const studyIdentifiers: USDMStudyIdentifier[] = [
      {
        id: `SI-${study.id}`,
        studyIdentifier: study.protocolNumber,
        studyIdentifierScope: {
          id: `ORG-sponsor`,
          name: study.sponsor,
          organizationType: 'SPONSOR',
        },
      },
    ];
    
    // Map phase
    const studyPhase = this.mapPhaseToUSDM(study.phase);
    
    // Create arms
    const studyArms: USDMArm[] = study.arms.map((arm, index) => ({
      id: `ARM-${arm.id}`,
      name: arm.name,
      description: arm.description,
      armType: this.mapArmTypeToUSDM(arm.treatmentType),
    }));
    
    // Create epochs based on visit types
    const studyEpochs: USDMEpoch[] = this.createEpochs(visits);
    
    // Create elements (simplified)
    const studyElements: USDMElement[] = studyEpochs.map(epoch => ({
      id: `EL-${epoch.id}`,
      name: `${epoch.name} Element`,
      description: `Element for ${epoch.name} epoch`,
    }));
    
    // Create cells (arm x epoch)
    const studyCells: USDMCell[] = [];
    for (const arm of Array.from(studyArms)) {
      for (const epoch of Array.from(studyEpochs)) {
        studyCells.push({
          id: `CELL-${arm.id}-${epoch.id}`,
          armId: arm.id,
          epochId: epoch.id,
          elementIds: [studyElements.find(e => e.name.includes(epoch.name))?.id || ''],
        });
      }
    }
    
    // Create design
    const studyDesigns: USDMDesign[] = [{
      id: `DESIGN-${study.id}`,
      name: 'Main Study Design',
      description: study.protocolTitle,
      interventionModel: this.determineInterventionModel(study.arms),
      studyArms,
      studyEpochs,
      studyElements,
      studyCells,
    }];
    
    // Create population
    const studyPopulations: USDMPopulation[] = [{
      id: `POP-${study.id}`,
      name: 'Study Population',
      description: `${study.indication} patients`,
      plannedNumberOfSubjects: study.plannedEnrollment,
      plannedSexOfSubjects: 'Both',
    }];
    
    // Create objectives and endpoints
    const objectives: USDMObjective[] = study.endpoints.map(ep => ({
      id: `OBJ-${ep.id}`,
      name: ep.name,
      description: ep.description,
      level: ep.type === 'SAFETY' ? 'SECONDARY' : ep.type,
      endpoints: [{
        id: `EP-${ep.id}`,
        name: ep.name,
        description: ep.description,
        purpose: ep.type,
      }],
    }));
    
    // Create schedule timeline
    const scheduleTimelines = this.createScheduleTimelines(study.id, visits);
    
    // Create eligibility criteria
    const studyEligibilityCriteria: USDMEligibilityCriterion[] = [];
    
    return {
      id: studyId,
      name: study.protocolNumber,
      label: study.protocolTitle,
      description: `${study.phase} study of ${study.indication}`,
      studyIdentifiers,
      studyVersion: study.protocolVersion,
      studyType: { code: 'INTERVENTIONAL', decode: 'Interventional Study' },
      studyPhase,
      studyDesigns,
      studyPopulations,
      objectives,
      scheduleTimelines,
      studyEligibilityCriteria,
      exportTimestamp: new Date().toISOString(),
      usdmVersion: '3.0',
    };
  }
  
  /**
   * Import a study from USDM format
   */
  static fromUSDM(usdm: USDMStudyDesign, tenantId: string, createdBy: string): {
    studyConfig: CreateStudyConfig;
    arms: Omit<StudyArm, 'id'>[];
    visits: Omit<ProtocolVisit, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>[];
    endpoints: StudyEndpoint[];
  } {
    // Extract basic info
    const sponsorIdentifier = usdm.studyIdentifiers.find(
      si => si.studyIdentifierScope.organizationType === 'SPONSOR'
    );
    
    const studyConfig: CreateStudyConfig = {
      tenantId,
      protocolNumber: usdm.name,
      protocolTitle: usdm.label,
      protocolVersion: usdm.studyVersion,
      phase: this.mapUSDMPhaseToInternal(usdm.studyPhase),
      therapeuticArea: 'General', // Not in USDM
      indication: usdm.description || 'Not specified',
      sponsor: sponsorIdentifier?.studyIdentifierScope.name || 'Unknown',
      plannedEnrollment: usdm.studyPopulations[0]?.plannedNumberOfSubjects || 100,
      startDate: new Date(),
      createdBy,
    };
    
    // Extract arms
    const design = usdm.studyDesigns[0];
    const arms = design?.studyArms.map((arm, index) => ({
      name: arm.name,
      description: arm.description || '',
      treatmentType: this.mapUSDMArmTypeToInternal(arm.armType),
      plannedSubjects: Math.floor((usdm.studyPopulations[0]?.plannedNumberOfSubjects || 100) / (design?.studyArms.length || 1)),
      order: index,
    })) || [];
    
    // Extract visits from schedule timeline
    const visits = this.extractVisitsFromTimeline(usdm.scheduleTimelines);
    
    // Extract endpoints
    const endpoints = usdm.objectives.flatMap(obj => 
      obj.endpoints.map(ep => ({
        id: ep.id,
        name: ep.name,
        type: this.mapUSDMEndpointTypeToInternal(obj.level),
        description: ep.description,
        assessmentSchedule: [],
      }))
    );
    
    return { studyConfig, arms, visits, endpoints };
  }
  
  // Helper methods
  private static mapPhaseToUSDM(phase: StudyPhase): USDMStudyPhase {
    const mapping: Record<StudyPhase, string> = {
      'PHASE_1': 'C49686',
      'PHASE_1_2': 'C49687',
      'PHASE_2': 'C49688',
      'PHASE_2_3': 'C49689',
      'PHASE_3': 'C49690',
      'PHASE_4': 'C49691',
    };
    return { standardCode: mapping[phase] || 'C49690' };
  }
  
  private static mapUSDMPhaseToInternal(phase: USDMStudyPhase): StudyPhase {
    const mapping: Record<string, StudyPhase> = {
      'C49686': 'PHASE_1',
      'C49687': 'PHASE_1_2',
      'C49688': 'PHASE_2',
      'C49689': 'PHASE_2_3',
      'C49690': 'PHASE_3',
      'C49691': 'PHASE_4',
    };
    return mapping[phase.standardCode] || 'PHASE_3';
  }
  
  private static mapArmTypeToUSDM(type: TreatmentType): string {
    const mapping: Record<TreatmentType, string> = {
      'EXPERIMENTAL': 'Experimental',
      'ACTIVE_COMPARATOR': 'Active Comparator',
      'PLACEBO': 'Placebo Comparator',
      'NO_INTERVENTION': 'No Intervention',
    };
    return mapping[type];
  }
  
  private static mapUSDMArmTypeToInternal(type: string): TreatmentType {
    const mapping: Record<string, TreatmentType> = {
      'Experimental': 'EXPERIMENTAL',
      'Active Comparator': 'ACTIVE_COMPARATOR',
      'Placebo Comparator': 'PLACEBO',
      'No Intervention': 'NO_INTERVENTION',
    };
    return mapping[type] || 'EXPERIMENTAL';
  }
  
  private static mapUSDMEndpointTypeToInternal(level: string): EndpointType {
    const mapping: Record<string, EndpointType> = {
      'PRIMARY': 'PRIMARY',
      'SECONDARY': 'SECONDARY',
      'EXPLORATORY': 'EXPLORATORY',
    };
    return mapping[level] || 'SECONDARY';
  }
  
  private static createEpochs(visits: ProtocolVisit[]): USDMEpoch[] {
    const epochs: USDMEpoch[] = [];
    let sequence = 1;
    
    const visitTypes = new Set(visits.map(v => v.visitType));
    
    if (visitTypes.has('SCREENING')) {
      epochs.push({ id: 'EPOCH-SCR', name: 'Screening', epochType: 'Screening', sequenceNumber: sequence++ });
    }
    if (visitTypes.has('BASELINE') || visitTypes.has('TREATMENT')) {
      epochs.push({ id: 'EPOCH-TRT', name: 'Treatment', epochType: 'Treatment', sequenceNumber: sequence++ });
    }
    if (visitTypes.has('FOLLOWUP')) {
      epochs.push({ id: 'EPOCH-FU', name: 'Follow-up', epochType: 'Follow-up', sequenceNumber: sequence++ });
    }
    
    return epochs;
  }
  
  private static determineInterventionModel(arms: StudyArm[]): string {
    if (arms.length === 1) return 'Single Group Assignment';
    if (arms.length === 2) return 'Parallel Assignment';
    return 'Factorial Assignment';
  }
  
  private static createScheduleTimelines(studyId: string, visits: ProtocolVisit[]): USDMScheduleTimeline[] {
    const instances: USDMScheduledInstance[] = visits.map(v => ({
      id: `INST-${v.id}`,
      name: v.visitName,
      description: `${v.visitType} visit`,
      instanceType: 'VISIT',
    }));
    
    const entries: USDMTimelineEntry[] = visits.map((v, index) => ({
      id: `ENTRY-${v.id}`,
      scheduledInstanceId: `INST-${v.id}`,
      timing: {
        type: index === 0 ? 'FIXED' : 'AFTER',
        value: v.scheduledDay,
        valueUnit: 'Day',
        windowLower: v.windowBefore,
        windowUpper: v.windowAfter,
        windowUnit: 'Day',
        relativeFromScheduledInstanceId: index > 0 ? `INST-${visits[0].id}` : undefined,
      },
    }));
    
    return [{
      id: `TIMELINE-${studyId}`,
      name: 'Main Timeline',
      description: 'Primary study schedule',
      mainTimeline: true,
      timelineEntries: entries,
      instances,
    }];
  }
  
  private static extractVisitsFromTimeline(
    timelines: USDMScheduleTimeline[]
  ): Omit<ProtocolVisit, 'id' | 'studyId' | 'createdAt' | 'updatedAt'>[] {
    const mainTimeline = timelines.find(t => t.mainTimeline) || timelines[0];
    if (!mainTimeline) return [];
    
    return mainTimeline.instances.map((inst, index) => {
      const entry = mainTimeline.timelineEntries.find(e => e.scheduledInstanceId === inst.id);
      const timing = entry?.timing;
      
      let visitType: VisitType = 'TREATMENT';
      if (inst.name.toLowerCase().includes('screen')) visitType = 'SCREENING';
      else if (inst.name.toLowerCase().includes('baseline')) visitType = 'BASELINE';
      else if (inst.name.toLowerCase().includes('follow')) visitType = 'FOLLOWUP';
      
      return {
        visitNumber: index,
        visitName: inst.name,
        visitType,
        scheduledDay: timing?.value || index * 7 + 1,
        windowBefore: timing?.windowLower || 0,
        windowAfter: timing?.windowUpper || 0,
        requiredForms: [],
        optionalForms: [],
        requiredProcedures: [],
        optionalProcedures: [],
        isUnscheduled: false,
        isRepeatable: false,
        isCritical: visitType === 'BASELINE',
        estimatedDuration: 60,
      };
    });
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createProtocolParser(config?: ProtocolParserConfig): ProtocolParserService {
  return new ProtocolParserService(config);
}
