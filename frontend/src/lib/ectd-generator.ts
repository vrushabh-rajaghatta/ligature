
// eCTD XML Backbone Generator
// Generates compliant eCTD v3.2.2 and v4.0 XML backbones

import { PublishingProject, PublishingDocument, ECTDVersionType } from '@/types/publishing';

interface BackboneGeneratorOptions {
  project: PublishingProject;
  includeRegionalXml: boolean;
}

// CTD Module structure definitions
const CTD_MODULES = {
  '1': {
    title: 'Administrative Information and Prescribing Information',
    sections: {
      '1.1': 'Forms',
      '1.2': 'Cover Letter',
      '1.3': 'Administrative Information',
      '1.4': 'References',
      '1.5': 'Field Copy Certification',
      '1.6': 'Debarment Certification',
      '1.7': 'Patent Information',
      '1.8': 'Patent Certification',
      '1.9': 'Claim of Categorical Exclusion',
      '1.10': 'User Fee Information',
      '1.11': 'Pediatric Information',
      '1.12': 'Request for Samples',
      '1.13': 'Other Information',
      '1.14': 'Labeling',
    },
  },
  '2': {
    title: 'Common Technical Document Summaries',
    sections: {
      '2.1': 'Table of Contents',
      '2.2': 'Introduction',
      '2.3': 'Quality Overall Summary',
      '2.4': 'Nonclinical Overview',
      '2.5': 'Clinical Overview',
      '2.6': 'Nonclinical Written and Tabulated Summaries',
      '2.7': 'Clinical Summary',
    },
  },
  '3': {
    title: 'Quality',
    sections: {
      '3.1': 'Table of Contents',
      '3.2': 'Body of Data',
      '3.3': 'Literature References',
    },
  },
  '4': {
    title: 'Nonclinical Study Reports',
    sections: {
      '4.1': 'Table of Contents',
      '4.2': 'Study Reports',
      '4.3': 'Literature References',
    },
  },
  '5': {
    title: 'Clinical Study Reports',
    sections: {
      '5.1': 'Table of Contents',
      '5.2': 'Tabular Listing of All Clinical Studies',
      '5.3': 'Clinical Study Reports',
      '5.4': 'Literature References',
    },
  },
};

// Generate eCTD v3.2.2 XML backbone
export function generateECTD322Backbone(options: BackboneGeneratorOptions): string {
  const { project } = options;
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ectd:ectd SYSTEM "ectd-3-2-2.dtd">
<ectd:ectd xmlns:ectd="http://www.ich.org/ectd" 
           xmlns:xlink="http://www.w3.org/1999/xlink"
           dtd-version="3.2.2">
  
  <admin sequence-number="${project.sequenceNumber}">
    <submission-description>${escapeXml(project.description)}</submission-description>
    <submission-type>${project.submissionType}</submission-type>
    <application-number>${project.applicationNumber}</application-number>
  </admin>
  
  <m1-administrative-information-and-prescribing-information>
${generateModule1Section322(project)}
  </m1-administrative-information-and-prescribing-information>
  
  <m2-common-technical-document-summaries>
${generateModule2Section322(project)}
  </m2-common-technical-document-summaries>
  
  <m3-quality>
${generateModule3Section322(project)}
  </m3-quality>
  
  <m4-nonclinical-study-reports>
${generateModule4Section322(project)}
  </m4-nonclinical-study-reports>
  
  <m5-clinical-study-reports>
${generateModule5Section322(project)}
  </m5-clinical-study-reports>
  
</ectd:ectd>`;

  return xml;
}

// Generate eCTD v4.0 XML backbone (FHIR-based)
export function generateECTD40Backbone(options: BackboneGeneratorOptions): string {
  const { project } = options;
  
  // v4.0 uses FHIR Bundle structure
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="${project.id}"/>
  <meta>
    <profile value="http://hl7.org/fhir/uv/ectd/StructureDefinition/Bundle-ectd"/>
  </meta>
  <type value="document"/>
  <timestamp value="${new Date().toISOString()}"/>
  
  <!-- Composition: Submission Header -->
  <entry>
    <fullUrl value="urn:uuid:composition-${project.id}"/>
    <resource>
      <Composition>
        <id value="composition-${project.id}"/>
        <meta>
          <profile value="http://hl7.org/fhir/uv/ectd/StructureDefinition/Composition-ectd"/>
        </meta>
        <status value="final"/>
        <type>
          <coding>
            <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/submission-type"/>
            <code value="${project.submissionType}"/>
          </coding>
        </type>
        <date value="${new Date().toISOString()}"/>
        <title value="${escapeXml(project.description)}"/>
        
        <!-- Submission Identifier -->
        <identifier>
          <system value="http://fda.gov/ectd/application-number"/>
          <value value="${project.applicationNumber}"/>
        </identifier>
        <identifier>
          <system value="http://fda.gov/ectd/sequence-number"/>
          <value value="${project.sequenceNumber}"/>
        </identifier>
        
        <!-- CTD Sections -->
${generateModule1Section40(project)}
${generateModule2Section40(project)}
${generateModule3Section40(project)}
${generateModule4Section40(project)}
${generateModule5Section40(project)}
        
      </Composition>
    </resource>
  </entry>
  
  <!-- Document References -->
${generateDocumentReferences40(project)}
  
</Bundle>`;

  return xml;
}

// Generate US Regional XML (for Module 1)
export function generateUSRegionalXml(project: PublishingProject): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE us-regional SYSTEM "us-regional.dtd">
<us-regional xmlns:xlink="http://www.w3.org/1999/xlink">
  
  <admin>
    <applicant-info>
      <applicant-name>Ligature Therapeutics, Inc.</applicant-name>
      <applicant-address>
        <street>100 Innovation Drive</street>
        <city>San Diego</city>
        <state>CA</state>
        <postal-code>92121</postal-code>
        <country>USA</country>
      </applicant-address>
    </applicant-info>
    
    <application-info>
      <application-number>${project.applicationNumber}</application-number>
      <submission-type>${project.submissionType}</submission-type>
      <sequence-number>${project.sequenceNumber}</sequence-number>
    </application-info>
    
    <product-info>
      <product-name>${escapeXml(project.productName)}</product-name>
    </product-info>
  </admin>
  
  <!-- Form 356h -->
  <form-356h>
${generateForm356hSection(project)}
  </form-356h>
  
  <!-- US Specific Documents -->
  <us-specific-documents>
${generateUSSpecificDocs(project)}
  </us-specific-documents>
  
</us-regional>`;

  return xml;
}

// Generate EU Regional XML
export function generateEURegionalXml(project: PublishingProject): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<eu:eu-regional xmlns:eu="http://europa.eu/ema/ectd"
                xmlns:xlink="http://www.w3.org/1999/xlink">
  
  <eu:envelope>
    <eu:submission>
      <eu:procedure-number>${project.applicationNumber}</eu:procedure-number>
      <eu:sequence>${project.sequenceNumber}</eu:sequence>
      <eu:submission-description>${escapeXml(project.description)}</eu:submission-description>
    </eu:submission>
    
    <eu:applicant>
      <eu:name>Ligature Therapeutics, Inc.</eu:name>
      <eu:contact>regulatory@ligature.com</eu:contact>
    </eu:applicant>
    
    <eu:product>
      <eu:invented-name>${escapeXml(project.productName)}</eu:invented-name>
    </eu:product>
  </eu:envelope>
  
  <eu:m1-eu>
${generateEUModule1(project)}
  </eu:m1-eu>
  
</eu:eu-regional>`;

  return xml;
}

// Helper functions for v3.2.2 module generation
function generateModule1Section322(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '1');
  if (docs.length === 0) return '    <!-- No Module 1 documents -->';
  
  return docs.map(doc => `    <leaf ID="id-${doc.id}" 
          operation="${doc.operation}"
          checksum="${doc.checksum || generateChecksum(doc.fileName)}"
          checksum-type="${doc.checksumType || 'md5'}"
          xlink:href="${doc.filePath}">
      <title>${escapeXml(doc.title)}</title>
    </leaf>`).join('\n');
}

function generateModule2Section322(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '2');
  if (docs.length === 0) return '    <!-- No Module 2 documents -->';
  
  let xml = '';
  
  // Group by section
  const sections = ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7'];
  sections.forEach(sectionNum => {
    const sectionDocs = docs.filter(d => d.sectionNumber.startsWith(sectionNum));
    if (sectionDocs.length > 0) {
      const sectionTitle = CTD_MODULES['2'].sections[sectionNum as keyof typeof CTD_MODULES['2']['sections']] || sectionNum;
      xml += `    <m${sectionNum.replace('.', '-')}-${sectionTitle.toLowerCase().replace(/\s+/g, '-')}>\n`;
      sectionDocs.forEach(doc => {
        xml += `      <leaf ID="id-${doc.id}" 
            operation="${doc.operation}"
            checksum="${doc.checksum || generateChecksum(doc.fileName)}"
            checksum-type="${doc.checksumType || 'md5'}"
            xlink:href="${doc.filePath}">
        <title>${escapeXml(doc.title)}</title>
      </leaf>\n`;
      });
      xml += `    </m${sectionNum.replace('.', '-')}-${sectionTitle.toLowerCase().replace(/\s+/g, '-')}>\n`;
    }
  });
  
  return xml || '    <!-- No Module 2 documents -->';
}

function generateModule3Section322(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '3');
  if (docs.length === 0) return '    <!-- No Module 3 documents -->';
  
  let xml = '    <m3-2-body-of-data>\n';
  
  // Drug Substance sections
  const dsDocs = docs.filter(d => d.sectionNumber.includes('3.2.S'));
  if (dsDocs.length > 0) {
    xml += '      <m3-2-s-drug-substance manufacturer="Ligature Manufacturing">\n';
    dsDocs.forEach(doc => {
      xml += `        <leaf ID="id-${doc.id}" 
              operation="${doc.operation}"
              checksum="${doc.checksum || generateChecksum(doc.fileName)}"
              checksum-type="${doc.checksumType || 'md5'}"
              xlink:href="${doc.filePath}">
          <title>${escapeXml(doc.title)}</title>
        </leaf>\n`;
    });
    xml += '      </m3-2-s-drug-substance>\n';
  }
  
  // Drug Product sections
  const dpDocs = docs.filter(d => d.sectionNumber.includes('3.2.P'));
  if (dpDocs.length > 0) {
    xml += '      <m3-2-p-drug-product>\n';
    dpDocs.forEach(doc => {
      xml += `        <leaf ID="id-${doc.id}" 
              operation="${doc.operation}"
              checksum="${doc.checksum || generateChecksum(doc.fileName)}"
              checksum-type="${doc.checksumType || 'md5'}"
              xlink:href="${doc.filePath}">
          <title>${escapeXml(doc.title)}</title>
        </leaf>\n`;
    });
    xml += '      </m3-2-p-drug-product>\n';
  }
  
  xml += '    </m3-2-body-of-data>';
  return xml;
}

function generateModule4Section322(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '4');
  if (docs.length === 0) return '    <!-- No Module 4 documents -->';
  
  return docs.map(doc => `    <leaf ID="id-${doc.id}" 
          operation="${doc.operation}"
          checksum="${doc.checksum || generateChecksum(doc.fileName)}"
          checksum-type="${doc.checksumType || 'md5'}"
          xlink:href="${doc.filePath}">
      <title>${escapeXml(doc.title)}</title>
    </leaf>`).join('\n');
}

function generateModule5Section322(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '5');
  if (docs.length === 0) return '    <!-- No Module 5 documents -->';
  
  let xml = '    <m5-3-clinical-study-reports>\n';
  
  docs.forEach(doc => {
    xml += `      <leaf ID="id-${doc.id}" 
            operation="${doc.operation}"
            checksum="${doc.checksum || generateChecksum(doc.fileName)}"
            checksum-type="${doc.checksumType || 'md5'}"
            xlink:href="${doc.filePath}">
        <title>${escapeXml(doc.title)}</title>
      </leaf>\n`;
  });
  
  xml += '    </m5-3-clinical-study-reports>';
  return xml;
}

// Helper functions for v4.0 FHIR-based generation
function generateModule1Section40(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '1');
  if (docs.length === 0) return '';
  
  return `        <section>
          <title value="Module 1: Administrative Information"/>
          <code>
            <coding>
              <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/ctd-sections"/>
              <code value="m1"/>
            </coding>
          </code>
${docs.map(doc => `          <entry>
            <reference value="DocumentReference/${doc.id}"/>
          </entry>`).join('\n')}
        </section>`;
}

function generateModule2Section40(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '2');
  if (docs.length === 0) return '';
  
  return `        <section>
          <title value="Module 2: CTD Summaries"/>
          <code>
            <coding>
              <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/ctd-sections"/>
              <code value="m2"/>
            </coding>
          </code>
${docs.map(doc => `          <entry>
            <reference value="DocumentReference/${doc.id}"/>
          </entry>`).join('\n')}
        </section>`;
}

function generateModule3Section40(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '3');
  if (docs.length === 0) return '';
  
  return `        <section>
          <title value="Module 3: Quality"/>
          <code>
            <coding>
              <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/ctd-sections"/>
              <code value="m3"/>
            </coding>
          </code>
${docs.map(doc => `          <entry>
            <reference value="DocumentReference/${doc.id}"/>
          </entry>`).join('\n')}
        </section>`;
}

function generateModule4Section40(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '4');
  if (docs.length === 0) return '';
  
  return `        <section>
          <title value="Module 4: Nonclinical"/>
          <code>
            <coding>
              <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/ctd-sections"/>
              <code value="m4"/>
            </coding>
          </code>
${docs.map(doc => `          <entry>
            <reference value="DocumentReference/${doc.id}"/>
          </entry>`).join('\n')}
        </section>`;
}

function generateModule5Section40(project: PublishingProject): string {
  const docs = project.documents.filter(d => d.moduleNumber === '5');
  if (docs.length === 0) return '';
  
  return `        <section>
          <title value="Module 5: Clinical"/>
          <code>
            <coding>
              <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/ctd-sections"/>
              <code value="m5"/>
            </coding>
          </code>
${docs.map(doc => `          <entry>
            <reference value="DocumentReference/${doc.id}"/>
          </entry>`).join('\n')}
        </section>`;
}

function generateDocumentReferences40(project: PublishingProject): string {
  return project.documents.map(doc => `  <entry>
    <fullUrl value="urn:uuid:${doc.id}"/>
    <resource>
      <DocumentReference>
        <id value="${doc.id}"/>
        <meta>
          <profile value="http://hl7.org/fhir/uv/ectd/StructureDefinition/DocumentReference-ectd"/>
        </meta>
        <status value="current"/>
        <type>
          <coding>
            <system value="http://hl7.org/fhir/uv/ectd/CodeSystem/document-type"/>
            <code value="${doc.documentType}"/>
          </coding>
        </type>
        <description value="${escapeXml(doc.title)}"/>
        <content>
          <attachment>
            <contentType value="application/pdf"/>
            <url value="${doc.filePath}"/>
            <size value="${doc.fileSize}"/>
            <hash value="${doc.checksum || generateChecksum(doc.fileName)}"/>
          </attachment>
        </content>
      </DocumentReference>
    </resource>
  </entry>`).join('\n');
}

// Regional XML helpers
function generateForm356hSection(project: PublishingProject): string {
  return `    <proposed-indication>${escapeXml(project.productName)} for treatment indication</proposed-indication>
    <type-of-submission>${project.submissionType}</type-of-submission>
    <application-number>${project.applicationNumber}</application-number>`;
}

function generateUSSpecificDocs(project: PublishingProject): string {
  const m1Docs = project.documents.filter(d => d.moduleNumber === '1');
  return m1Docs.map(doc => `    <document>
      <title>${escapeXml(doc.title)}</title>
      <file-path>${doc.filePath}</file-path>
    </document>`).join('\n');
}

function generateEUModule1(project: PublishingProject): string {
  return `    <eu:cover-letter>
      <eu:document xlink:href="m1/eu/cover-letter.pdf"/>
    </eu:cover-letter>
    <eu:application-form>
      <eu:document xlink:href="m1/eu/application-form.pdf"/>
    </eu:application-form>`;
}

// Utility functions
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateChecksum(fileName: string): string {
  // Generate a deterministic fake MD5 based on filename for demo
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    const char = fileName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

// Main export function
export function generateBackbone(project: PublishingProject): { 
  backbone: string; 
  regionalXml?: string;
  version: ECTDVersionType;
} {
  const backbone = project.ectdVersion === '4.0' 
    ? generateECTD40Backbone({ project, includeRegionalXml: true })
    : generateECTD322Backbone({ project, includeRegionalXml: true });
  
  let regionalXml: string | undefined;
  if (project.region === 'US') {
    regionalXml = generateUSRegionalXml(project);
  } else if (project.region === 'EU') {
    regionalXml = generateEURegionalXml(project);
  }
  
  return {
    backbone,
    regionalXml,
    version: project.ectdVersion,
  };
}
