
/**
 * E2B(R3) XML Generator
 * Generates ICH-compliant E2B(R3) ICSR XML from form data
 * 
 * Follows ICH M2 Electronic Transmission of Individual Case Safety Reports
 * Message Specification (E2B(R3)) version 3.0.1
 * 
 * @version 0.13.29
 */

import type { E2BFormState } from './safety-api';

// =============================================================================
// TYPES
// =============================================================================

export interface E2BXMLOptions {
  /** Include XML declaration and namespace */
  includeHeader?: boolean;
  /** Pretty print with indentation */
  prettyPrint?: boolean;
  /** Indent string for pretty printing */
  indent?: string;
  /** Message identifier (UUID) */
  messageId?: string;
  /** Sender identifier */
  senderId?: string;
  /** Receiver identifier */
  receiverId?: string;
}

export interface E2BXMLResult {
  xml: string;
  messageId: string;
  safetyReportId: string;
  generatedAt: string;
  validationWarnings: string[];
}

export interface E2BDrug {
  productName: string;
  dose?: string;
  doseUnit?: string;
  route?: string;
  routeLabel?: string;
  indication?: string;
  startDate?: string;
  endDate?: string;
  actionTaken?: string;
  actionTakenLabel?: string;
  characterization?: string;
  batchNumber?: string;
  authorizationNumber?: string;
  authorizationCountry?: string;
}

export interface E2BReaction {
  termReported: string;
  meddraCode?: string;
  meddraSOC?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  durationUnit?: string;
  outcome?: string;
  outcomeLabel?: string;
  seriousness?: string;
}

export interface E2BReporter {
  qualification?: string;
  qualificationLabel?: string;
  country?: string;
  countryLabel?: string;
  organization?: string;
  department?: string;
  title?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  phone?: string;
}

export interface E2BTest {
  testName: string;
  testDate?: string;
  result?: string;
  unit?: string;
  normalRange?: string;
  moreInfo?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Escape special XML characters
 */
function escapeXml(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date to E2B format (YYYYMMDD or CCYYMMDDHHMMSS)
 */
function formatE2BDate(dateStr: string | undefined | null, includeTime = false): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (includeTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
    
    return `${year}${month}${day}`;
  } catch {
    return '';
  }
}

/**
 * Generate UUID for message/report IDs
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create XML element with optional value
 */
function element(
  name: string, 
  value: string | undefined | null, 
  attrs?: Record<string, string>
): string {
  if (!value && !attrs) return '';
  
  const attrStr = attrs 
    ? ' ' + Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ')
    : '';
  
  if (!value) {
    return `<${name}${attrStr}/>`;
  }
  
  return `<${name}${attrStr}>${escapeXml(value)}</${name}>`;
}

/**
 * Wrap content in element if content exists
 */
function wrapIfContent(name: string, content: string): string {
  if (!content.trim()) return '';
  return `<${name}>${content}</${name}>`;
}

// =============================================================================
// E2B SECTION GENERATORS
// =============================================================================

/**
 * Generate Section A - Administrative and Identification Information
 */
function generateSectionA(
  form: E2BFormState,
  options: E2BXMLOptions
): { xml: string; safetyReportId: string } {
  const safetyReportId = form.senderReportId || generateUUID();
  const now = new Date();
  
  let xml = '';
  
  // A.1 Identification of the Case Safety Report
  xml += element('safetyreportversion', '1');
  xml += element('safetyreportid', safetyReportId);
  xml += element('primarysourcecountry', 
    (form.reporters as E2BReporter[])?.[0]?.country || 'US'
  );
  xml += element('occurcountry', 
    (form.reporters as E2BReporter[])?.[0]?.country || 'US'
  );
  xml += element('transmissiondateformat', '102');
  xml += element('transmissiondate', formatE2BDate(now.toISOString()));
  
  // A.1.4 Report Type
  xml += element('reporttype', form.reportType === 'followup' ? '2' : '1');
  
  // A.1.6 Date of First Receipt
  xml += element('receivedate', formatE2BDate(form.receiptDate));
  xml += element('receivedateformat', '102');
  
  // A.1.7 Date of Most Recent Information
  xml += element('receiptdate', formatE2BDate(form.mostRecentDate || form.receiptDate));
  xml += element('receiptdateformat', '102');
  
  // A.1.10 Worldwide Unique Case Identification
  if (options.senderId) {
    xml += element('authoritynumb', `${options.senderId}-${safetyReportId}`);
  }
  
  // A.1.11 Other Case Identifiers
  xml += element('companynumb', safetyReportId);
  
  // A.2 Primary Source(s)
  const reporters = form.reporters as E2BReporter[];
  if (reporters && reporters.length > 0) {
    reporters.forEach((reporter, index) => {
      xml += '<primarysource>';
      xml += element('reportertitle', reporter.title);
      xml += element('reportergivename', reporter.givenName);
      xml += element('reporterfamilyname', reporter.familyName);
      xml += element('reporterorganization', reporter.organization);
      xml += element('reporterdepartment', reporter.department);
      xml += element('reporterstreet', '');
      xml += element('reportercity', '');
      xml += element('reporterstate', '');
      xml += element('reporterpostcode', '');
      xml += element('reportercountry', reporter.country || 'US');
      xml += element('qualification', reporter.qualification || '5');
      xml += element('literaturereference', '');
      xml += element('studyname', '');
      xml += element('sponsorstudynumb', '');
      xml += element('observestudytype', '');
      if (index === 0) {
        xml += element('primarysourcecountry', reporter.country || 'US');
      }
      xml += '</primarysource>';
    });
  }
  
  // A.3 Sender Information
  xml += '<sender>';
  xml += element('sendertype', '2'); // 2 = Pharmaceutical company
  xml += element('senderorganization', options.senderId || 'Ligature');
  xml += element('senderdepartment', 'Drug Safety');
  xml += element('senderfamilyname', '');
  xml += element('sendergivename', '');
  xml += element('senderstreetaddress', '');
  xml += element('sendercity', '');
  xml += element('senderstate', '');
  xml += element('senderpostcode', '');
  xml += element('sendercountrycode', 'US');
  xml += element('sendertel', '');
  xml += element('senderfax', '');
  xml += element('senderemailaddress', '');
  xml += '</sender>';
  
  // A.4 Receiver Information  
  xml += '<receiver>';
  xml += element('receivertype', '1'); // 1 = Regulatory authority
  xml += element('receiverorganization', options.receiverId || 'FDA');
  xml += element('receiverdepartment', '');
  xml += element('receiverfamilyname', '');
  xml += element('receivergivename', '');
  xml += element('receiverstreetaddress', '');
  xml += element('receivercity', '');
  xml += element('receiverstate', '');
  xml += element('receiverpostcode', '');
  xml += element('receivercountrycode', 'US');
  xml += '</receiver>';
  
  return { xml, safetyReportId };
}

/**
 * Generate Section B - Patient Information (Demographics)
 */
function generateSectionB(form: E2BFormState): string {
  let xml = '<patient>';
  
  // B.1 Patient Characteristics
  xml += element('patientinitial', form.patientInitials);
  
  // B.1.1 Patient GP Medical Record Number
  xml += element('patientgpmedicalrecordnumb', form.patientId);
  
  // B.1.2 Age Information
  if (form.age) {
    xml += '<patientonsetage>';
    xml += element('patientonsetagenum', form.age);
    xml += element('patientonsetageunit', form.ageUnit || '801'); // 801 = Year
    xml += '</patientonsetage>';
  }
  
  if (form.ageGroup) {
    xml += element('patientagegroup', form.ageGroup);
  }
  
  // B.1.3 Body Weight
  if (form.weight) {
    xml += element('patientweight', form.weight);
  }
  
  // B.1.4 Height
  if (form.height) {
    xml += element('patientheight', form.height);
  }
  
  // B.1.5 Sex
  xml += element('patientsex', form.sex || '0'); // 0 = Unknown
  
  // B.1.7 Medical History
  if (form.medicalHistory && form.medicalHistory.length > 0) {
    xml += '<patientmedicalhistorytext>';
    xml += escapeXml(form.medicalHistory.join('; '));
    xml += '</patientmedicalhistorytext>';
  }
  
  // B.1.9 Death Information
  if (form.resultsInDeath && form.deathDate) {
    xml += element('patientdeath', '1');
    xml += element('patientdeathdate', formatE2BDate(form.deathDate));
    xml += element('patientdeathdateformat', '102');
    xml += element('patientautopsyyesno', form.autopsyDone ? '1' : '2');
  }
  
  // Reactions will be added here (Section E)
  // Drugs will be added here (Section G)
  // Tests will be added here (Section F)
  
  return xml;
}

/**
 * Generate Section E - Reaction(s)/Event(s)
 */
function generateSectionE(form: E2BFormState): string {
  let xml = '';
  const reactions = form.reactions as E2BReaction[];
  
  if (!reactions || reactions.length === 0) {
    return xml;
  }
  
  reactions.forEach((reaction, index) => {
    xml += '<reaction>';
    xml += element('primarysourcereaction', reaction.termReported);
    
    // MedDRA coding
    if (reaction.meddraCode) {
      xml += element('reactionmeddraversionllt', '26.1');
      xml += element('reactionmeddrallt', reaction.meddraCode);
    }
    
    // Reaction dates
    if (reaction.startDate) {
      xml += element('reactionstartdate', formatE2BDate(reaction.startDate));
      xml += element('reactionstartdateformat', '102');
    }
    if (reaction.endDate) {
      xml += element('reactionenddate', formatE2BDate(reaction.endDate));
      xml += element('reactionenddateformat', '102');
    }
    
    // Duration
    if (reaction.duration) {
      xml += element('reactionduration', reaction.duration);
      xml += element('reactiondurationunit', reaction.durationUnit || '804'); // 804 = Day
    }
    
    // First reaction indicator
    if (index === 0) {
      xml += element('reactionfirsttime', '');
      xml += element('reactionfirsttimeunit', '');
    }
    
    // Outcome
    xml += element('reactionoutcome', reaction.outcome || '0');
    
    xml += '</reaction>';
  });
  
  return xml;
}

/**
 * Generate Section F - Tests and Procedures
 */
function generateSectionF(form: E2BFormState): string {
  let xml = '';
  const tests = form.tests as E2BTest[];
  
  if (!tests || tests.length === 0) {
    return xml;
  }
  
  tests.forEach((test) => {
    xml += '<test>';
    xml += element('testdate', formatE2BDate(test.testDate));
    xml += element('testdateformat', '102');
    xml += element('testname', test.testName);
    xml += element('testresult', test.result);
    xml += element('testunit', test.unit);
    xml += element('lowtestrange', '');
    xml += element('hightestrange', '');
    xml += element('moreinformation', test.moreInfo);
    xml += '</test>';
  });
  
  return xml;
}

/**
 * Generate Section G - Drug(s) Information
 */
function generateSectionG(form: E2BFormState): string {
  let xml = '';
  const drugs = form.drugs as E2BDrug[];
  
  if (!drugs || drugs.length === 0) {
    return xml;
  }
  
  drugs.forEach((drug) => {
    xml += '<drug>';
    
    // G.k.1 Characterization of Drug Role
    xml += element('drugcharacterization', drug.characterization || '1'); // 1 = Suspect
    
    // G.k.2 Drug Identification
    xml += element('medicinalproduct', drug.productName);
    
    // G.k.3 Batch/Lot Number
    if (drug.batchNumber) {
      xml += element('drugbatchnumb', drug.batchNumber);
    }
    
    // G.k.4 Authorization
    if (drug.authorizationNumber) {
      xml += element('drugauthorizationnumb', drug.authorizationNumber);
      xml += element('drugauthorizationcountry', drug.authorizationCountry || 'US');
    }
    
    // G.k.5 Dosage Information
    if (drug.dose || drug.doseUnit) {
      xml += '<drugstructuredosagenumb>';
      xml += element('drugstructuredosagenumb', drug.dose);
      xml += element('drugstructuredosageunit', drug.doseUnit || 'mg');
      xml += '</drugstructuredosagenumb>';
    }
    
    // G.k.6 Route of Administration
    if (drug.route) {
      xml += element('drugadministrationroute', drug.route);
    }
    
    // G.k.7 Indication for Use
    if (drug.indication) {
      xml += '<drugindicationmeddraversion>26.1</drugindicationmeddraversion>';
      xml += element('drugindication', drug.indication);
    }
    
    // G.k.8 Start/End Dates
    if (drug.startDate) {
      xml += element('drugstartdate', formatE2BDate(drug.startDate));
      xml += element('drugstartdateformat', '102');
    }
    if (drug.endDate) {
      xml += element('drugenddate', formatE2BDate(drug.endDate));
      xml += element('drugenddateformat', '102');
    }
    
    // G.k.9 Action Taken with Drug
    xml += element('drugactiondrug', drug.actionTaken || '0'); // 0 = Unknown
    
    // G.k.10 Drug-Reaction Assessment (for each reaction)
    const reactions = form.reactions as E2BReaction[];
    reactions?.forEach((reaction) => {
      xml += '<drugreactionassess>';
      xml += element('drugreactionassessmeddraversion', '26.1');
      xml += element('drugreactionasses', reaction.meddraCode || reaction.termReported);
      xml += '<drugassessmentsource>';
      xml += element('drugassessmentsource', 'SPONSOR');
      xml += element('drugresult', ''); // Causality assessment result
      xml += '</drugassessmentsource>';
      xml += '</drugreactionassess>';
    });
    
    xml += '</drug>';
  });
  
  return xml;
}

/**
 * Generate Section H - Narrative Information
 */
function generateSectionH(form: E2BFormState): string {
  let xml = '';
  
  // H.1 Case Narrative
  if (form.narrative) {
    xml += element('narrativeincludeclinical', form.narrative);
  }
  
  // H.2 Reporter's Comments
  if (form.reporterComments) {
    xml += element('reportercomment', form.reporterComments);
  }
  
  // H.4 Sender's Comments
  if (form.senderComments) {
    xml += element('sendercomment', form.senderComments);
  }
  
  // H.5 Sender's Diagnosis
  if (form.senderDiagnosis) {
    xml += element('senderdiagnosis', form.senderDiagnosis);
    xml += element('senderdiagnosismeddraversion', '26.1');
  }
  
  return xml;
}

/**
 * Generate Seriousness Criteria
 */
function generateSeriousness(form: E2BFormState): string {
  let xml = '';
  
  xml += element('serious', form.seriousness === 'serious' ? '1' : '2');
  
  if (form.seriousness === 'serious') {
    xml += element('seriousnessdeath', form.resultsInDeath ? '1' : '2');
    xml += element('seriousnesslifethreatening', form.lifeThreatening ? '1' : '2');
    xml += element('seriousnesshospitalization', form.hospitalization ? '1' : '2');
    xml += element('seriousnessdisabling', form.disability ? '1' : '2');
    xml += element('seriousnesscongenitalanomali', form.congenitalAnomaly ? '1' : '2');
    xml += element('seriousnessother', form.otherMedicallyImportant ? '1' : '2');
  }
  
  return xml;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Generate complete E2B(R3) XML from form data
 */
export function generateE2BXML(
  form: E2BFormState,
  options: E2BXMLOptions = {}
): E2BXMLResult {
  const {
    includeHeader = true,
    prettyPrint = true,
    indent = '  ',
    messageId = generateUUID(),
    senderId = 'LIGATURE',
    receiverId = 'FDA',
  } = options;
  
  const validationWarnings: string[] = [];
  const generatedAt = new Date().toISOString();
  
  // Validate minimum required data
  if (!form.drugs || (form.drugs as E2BDrug[]).length === 0) {
    validationWarnings.push('At least one drug is required');
  }
  if (!form.reactions || (form.reactions as E2BReaction[]).length === 0) {
    validationWarnings.push('At least one reaction is required');
  }
  if (!form.receiptDate) {
    validationWarnings.push('Receipt date is required');
  }
  
  // Build XML structure
  let xml = '';
  
  // Section A
  const sectionA = generateSectionA(form, { ...options, senderId, receiverId, messageId });
  
  // Build safety report
  let safetyReport = '<safetyreport>';
  safetyReport += sectionA.xml;
  
  // Seriousness
  safetyReport += generateSeriousness(form);
  
  // Section B (Patient) - starts container
  safetyReport += generateSectionB(form);
  
  // Section E (Reactions) - inside patient
  safetyReport += generateSectionE(form);
  
  // Section F (Tests) - inside patient  
  safetyReport += generateSectionF(form);
  
  // Section G (Drugs) - inside patient
  safetyReport += generateSectionG(form);
  
  // Close patient
  safetyReport += '</patient>';
  
  // Section H (Narrative)
  safetyReport += generateSectionH(form);
  
  safetyReport += '</safetyreport>';
  
  // Wrap in ICSR message
  xml = '<ichicsr>';
  xml += element('messagetype', 'ichicsr');
  xml += element('messageformatversion', '2.1');
  xml += element('messageformatrelease', '2.0');
  xml += element('messagenumb', messageId);
  xml += element('messagesenderidentifier', senderId);
  xml += element('messagereceiveridentifier', receiverId);
  xml += element('messagedateformat', '204');
  xml += element('messagedate', formatE2BDate(generatedAt, true));
  xml += safetyReport;
  xml += '</ichicsr>';
  
  // Add header
  if (includeHeader) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + xml;
  }
  
  // Pretty print
  if (prettyPrint) {
    xml = formatXML(xml, indent);
  }
  
  return {
    xml,
    messageId,
    safetyReportId: sectionA.safetyReportId,
    generatedAt,
    validationWarnings,
  };
}

/**
 * Simple XML formatter for pretty printing
 */
function formatXML(xml: string, indentStr: string = '  '): string {
  let formatted = '';
  let indentLevel = 0;
  
  // Split by tags, preserving tag delimiters
  const parts = xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.trim()) continue;
    
    if (part.startsWith('</')) {
      // Closing tag - decrement first, but never go below 0
      indentLevel = Math.max(0, indentLevel - 1);
      formatted += indentStr.repeat(indentLevel) + part + '\n';
    } else if (part.startsWith('<?')) {
      // XML declaration
      formatted += part + '\n';
    } else if (part.startsWith('<') && part.endsWith('/>')) {
      // Self-closing tag
      formatted += indentStr.repeat(indentLevel) + part + '\n';
    } else if (part.startsWith('<')) {
      // Opening tag - check if next part is text content (not a tag)
      const nextPart = i + 1 < parts.length ? parts[i + 1] : '';
      if (nextPart && !nextPart.startsWith('<') && nextPart.trim()) {
        // Text content follows — write tag + text + closing tag on one line
        // Look ahead for the closing tag after the text
        const closingTag = i + 2 < parts.length ? parts[i + 2] : '';
        if (closingTag.startsWith('</')) {
          formatted += indentStr.repeat(indentLevel) + part + nextPart + closingTag + '\n';
          i += 2; // Skip text content and closing tag (already consumed)
        } else {
          // Text content but no immediate closing tag — just output the opening tag
          formatted += indentStr.repeat(indentLevel) + part + nextPart;
          i += 1; // Skip text content
          indentLevel++;
        }
      } else {
        // No text content follows — opening tag on its own line
        formatted += indentStr.repeat(indentLevel) + part + '\n';
        indentLevel++;
      }
    } else {
      // Standalone text content (shouldn't normally happen after above logic)
      formatted = formatted.trimEnd() + part;
    }
  }
  
  return formatted;
}

/**
 * Validate E2B form data against minimum requirements
 */
export function validateE2BForm(form: E2BFormState): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!form.receiptDate) {
    errors.push('Receipt date (A.1.6) is required');
  }
  
  if (!form.drugs || (form.drugs as E2BDrug[]).length === 0) {
    errors.push('At least one drug (Section G) is required');
  }
  
  if (!form.reactions || (form.reactions as E2BReaction[]).length === 0) {
    errors.push('At least one reaction (Section E) is required');
  }
  
  // Recommended fields
  if (!form.patientInitials && !form.patientId) {
    warnings.push('Patient identifier (B.1) is recommended');
  }
  
  if (!form.reporters || (form.reporters as E2BReporter[]).length === 0) {
    warnings.push('Primary source (Section A.2) is recommended');
  }
  
  if (!form.narrative) {
    warnings.push('Case narrative (H.1) is recommended');
  }
  
  if (form.seriousness === 'serious') {
    const hasCriteria = form.resultsInDeath || form.lifeThreatening || 
      form.hospitalization || form.disability || 
      form.congenitalAnomaly || form.otherMedicallyImportant;
    if (!hasCriteria) {
      warnings.push('Seriousness criteria should be specified for serious cases');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
