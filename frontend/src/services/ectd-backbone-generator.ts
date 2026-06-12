
/**
 * eCTD Backbone Generator Service
 * 
 * Generates eCTD backbone XML files including:
 * - index.xml (ICH backbone)
 * - Regional XML files (us-regional.xml, eu-regional.xml)
 * - STF files (Study Tagging Files)
 * - MD5/SHA-256 checksums
 * - Lifecycle management
 */

import { ECTDDocument, CTD_MODULES } from '@/types/ectd';

// eCTD Leaf element
export interface ECTDLeaf {
  id: string;
  title: string;
  href: string;
  operation: 'new' | 'replace' | 'append' | 'delete';
  checksum?: string;
  checksumType?: 'md5' | 'sha256';
  fileSize?: number;
  modifiedFile?: string;
  xlink?: string;
}

// CTD Node (section in the hierarchy)
export interface CTDNode {
  id: string;
  title: string;
  ctdNumber: string;  // e.g., "2.7.1", "3.2.S"
  operation?: 'new' | 'replace' | 'delete';
  children: CTDNode[];
  leaves: ECTDLeaf[];
}

// Submission envelope
export interface SubmissionEnvelope {
  submissionId: string;
  sequenceNumber: string;
  submissionType: string;
  submissionSubType?: string;
  applicationType: string;
  applicationNumber: string;
  companyName: string;
  relatedSequences?: string[];
}

// Regional information
export interface RegionalInfo {
  region: 'us' | 'eu' | 'ca' | 'jp' | 'au' | 'br' | 'ch';
  agencyCode?: string;
  applicationId?: string;
  dossierType?: string;
  productName?: string;
  manufacturerName?: string;
  contactInfo?: {
    name: string;
    email: string;
    phone?: string;
  };
}

// STF (Study Tagging File) info
export interface StudyTaggingInfo {
  studyId: string;
  studyTitle: string;
  studyType: 'clinical' | 'nonclinical';
  studySubType?: string;
  datasets: Array<{
    name: string;
    href: string;
    defineXml?: string;
    standard?: 'SDTM' | 'ADaM' | 'SEND';
    version?: string;
  }>;
}

// Generated backbone files
export interface BackboneFiles {
  indexXml: string;
  regionalXml?: string;
  stfFiles: Array<{ filename: string; content: string }>;
  checksumFile: string;
}

// XML namespaces
const NAMESPACES = {
  ectd: 'http://www.ich.org/ectd',
  xlink: 'http://www.w3.org/1999/xlink',
  usRegional: 'http://www.fda.gov/cder/regional',
  euRegional: 'http://esubmission.ema.europa.eu/eumodule1',
};

// DTD references
const DTD_REFERENCES = {
  ich: '<!DOCTYPE ectd:ectd SYSTEM "../../util/dtd/ich-ectd-3-2.dtd">',
  usRegional: '<!DOCTYPE us-regional:us-regional SYSTEM "../../util/dtd/us-regional-v3-3.dtd">',
  euRegional: '<!DOCTYPE eu:eu-backbone SYSTEM "../../util/dtd/eu-regional-v2-4.dtd">',
};

class ECTDBackboneGenerator {
  private documentMap: Map<string, ECTDLeaf> = new Map();
  private checksums: Map<string, { md5: string; sha256: string }> = new Map();

  /**
   * Generate complete eCTD backbone files
   */
  async generateBackbone(
    envelope: SubmissionEnvelope,
    documents: ECTDDocument[],
    regional?: RegionalInfo,
    studies?: StudyTaggingInfo[]
  ): Promise<BackboneFiles> {
    // Build CTD tree from documents
    const ctdTree = this.buildCTDTree(documents);

    // Generate checksums for all documents
    await this.generateChecksums(documents);

    // Generate index.xml
    const indexXml = this.generateIndexXml(envelope, ctdTree);

    // Generate regional XML if applicable
    let regionalXml: string | undefined;
    if (regional) {
      regionalXml = this.generateRegionalXml(envelope, regional, documents);
    }

    // Generate STF files for studies
    const stfFiles = studies
      ? studies.map(study => ({
          filename: `stf-${study.studyId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.xml`,
          content: this.generateSTF(study),
        }))
      : [];

    // Generate checksum manifest
    const checksumFile = this.generateChecksumFile();

    return {
      indexXml,
      regionalXml,
      stfFiles,
      checksumFile,
    };
  }

  /**
   * Build CTD tree structure from flat document list
   */
  private buildCTDTree(documents: ECTDDocument[]): CTDNode[] {
    const tree: CTDNode[] = [];
    const nodeMap = new Map<string, CTDNode>();

    // Create module nodes (M1-M5) from the CTD_MODULES Record
    for (const [moduleNum, moduleInfo] of Object.entries(CTD_MODULES)) {
      const moduleNode: CTDNode = {
        id: `m${moduleNum}`,
        title: moduleInfo.name,
        ctdNumber: moduleNum,
        children: [],
        leaves: [],
      };
      tree.push(moduleNode);
      nodeMap.set(`m${moduleNum}`, moduleNode);
    }

    // Place documents into appropriate sections
    for (const doc of documents) {
      const leaf = this.createLeaf(doc);
      this.documentMap.set(doc.id, leaf);

      // Find parent section
      const sectionKey = `${doc.module}.${doc.section}`;
      let parentNode = nodeMap.get(sectionKey);

      if (!parentNode) {
        // Try just module if section not found
        parentNode = nodeMap.get(doc.module);
      }

      if (parentNode) {
        parentNode.leaves.push(leaf);
      }
    }

    return tree;
  }

  /**
   * Create leaf element from document
   */
  private createLeaf(doc: ECTDDocument): ECTDLeaf {
    const href = this.buildHref(doc);
    const checksum = this.checksums.get(doc.id);

    return {
      id: `leaf-${doc.id}`,
      title: doc.title,
      href,
      operation: doc.operation || 'new',
      checksum: checksum?.md5,
      checksumType: 'md5',
      fileSize: doc.fileSize,
    };
  }

  /**
   * Build relative href path for document
   */
  private buildHref(doc: ECTDDocument): string {
    // Build path like: m1/us/cover-letter.pdf or m2/27-clin-sum/clinical-summary.pdf
    const modulePath = doc.module;
    const sectionPath = doc.section?.replace(/\./g, '') || '';
    const filename = doc.filePath?.split('/').pop() || `${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;

    if (sectionPath) {
      return `${modulePath}/${sectionPath}/${filename}`;
    }
    return `${modulePath}/${filename}`;
  }

  /**
   * Generate index.xml (ICH backbone)
   */
  private generateIndexXml(envelope: SubmissionEnvelope, tree: CTDNode[]): string {
    const lines: string[] = [];

    // XML declaration and DTD
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(DTD_REFERENCES.ich);
    lines.push('');

    // Root element
    lines.push(`<ectd:ectd xmlns:ectd="${NAMESPACES.ectd}" xmlns:xlink="${NAMESPACES.xlink}">`);
    lines.push('');

    // Submission info
    lines.push('  <submission>');
    lines.push(`    <submission-id>${envelope.submissionId}</submission-id>`);
    lines.push(`    <sequence-number>${envelope.sequenceNumber}</sequence-number>`);
    lines.push(`    <submission-type>${envelope.submissionType}</submission-type>`);
    if (envelope.submissionSubType) {
      lines.push(`    <submission-sub-type>${envelope.submissionSubType}</submission-sub-type>`);
    }
    lines.push(`    <application-type>${envelope.applicationType}</application-type>`);
    lines.push(`    <application-number>${envelope.applicationNumber}</application-number>`);
    lines.push(`    <company-name>${this.escapeXml(envelope.companyName)}</company-name>`);
    if (envelope.relatedSequences?.length) {
      lines.push('    <related-sequences>');
      for (const seq of envelope.relatedSequences) {
        lines.push(`      <related-sequence>${seq}</related-sequence>`);
      }
      lines.push('    </related-sequences>');
    }
    lines.push('  </submission>');
    lines.push('');

    // CTD modules
    for (const module of tree) {
      this.renderCTDNode(module, lines, 1);
    }

    lines.push('</ectd:ectd>');

    return lines.join('\n');
  }

  /**
   * Render CTD node (recursive)
   */
  private renderCTDNode(node: CTDNode, lines: string[], depth: number): void {
    const indent = '  '.repeat(depth);
    const hasContent = node.children.length > 0 || node.leaves.length > 0;

    if (!hasContent) return;

    // Open section tag
    const attrs = node.operation ? ` operation="${node.operation}"` : '';
    lines.push(`${indent}<m${node.ctdNumber.replace(/\./g, '-')}${attrs}>`);

    // Title
    lines.push(`${indent}  <title>${this.escapeXml(node.title)}</title>`);

    // Leaves
    for (const leaf of node.leaves) {
      this.renderLeaf(leaf, lines, depth + 1);
    }

    // Child sections
    for (const child of node.children) {
      this.renderCTDNode(child, lines, depth + 1);
    }

    lines.push(`${indent}</m${node.ctdNumber.replace(/\./g, '-')}>`);
  }

  /**
   * Render leaf element
   */
  private renderLeaf(leaf: ECTDLeaf, lines: string[], depth: number): void {
    const indent = '  '.repeat(depth);

    lines.push(`${indent}<leaf`);
    lines.push(`${indent}  ID="${leaf.id}"`);
    lines.push(`${indent}  operation="${leaf.operation}"`);
    if (leaf.checksum) {
      lines.push(`${indent}  checksum="${leaf.checksum}"`);
      lines.push(`${indent}  checksum-type="${leaf.checksumType || 'md5'}"`);
    }
    lines.push(`${indent}  xlink:href="${leaf.href}">`);
    lines.push(`${indent}  <title>${this.escapeXml(leaf.title)}</title>`);
    lines.push(`${indent}</leaf>`);
  }

  /**
   * Generate regional XML (FDA us-regional.xml)
   */
  private generateRegionalXml(
    envelope: SubmissionEnvelope,
    regional: RegionalInfo,
    documents: ECTDDocument[]
  ): string {
    const lines: string[] = [];

    if (regional.region === 'us') {
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push(DTD_REFERENCES.usRegional);
      lines.push('');
      lines.push(`<us-regional:us-regional xmlns:us-regional="${NAMESPACES.usRegional}">`);
      lines.push('');

      // Admin info
      lines.push('  <admin>');
      lines.push(`    <application-set>`);
      lines.push(`      <application-type>${envelope.applicationType}</application-type>`);
      lines.push(`      <application-number>${envelope.applicationNumber}</application-number>`);
      if (regional.productName) {
        lines.push(`      <product-name>${this.escapeXml(regional.productName)}</product-name>`);
      }
      lines.push(`    </application-set>`);
      
      if (regional.manufacturerName) {
        lines.push(`    <manufacturer-name>${this.escapeXml(regional.manufacturerName)}</manufacturer-name>`);
      }
      
      if (regional.contactInfo) {
        lines.push('    <contact>');
        lines.push(`      <contact-name>${this.escapeXml(regional.contactInfo.name)}</contact-name>`);
        lines.push(`      <contact-email>${regional.contactInfo.email}</contact-email>`);
        if (regional.contactInfo.phone) {
          lines.push(`      <contact-phone>${regional.contactInfo.phone}</contact-phone>`);
        }
        lines.push('    </contact>');
      }
      lines.push('  </admin>');
      lines.push('');

      // Module 1 documents (regional)
      const m1Docs = documents.filter(d => d.module === 'm1');
      if (m1Docs.length > 0) {
        lines.push('  <m1-us>');
        for (const doc of m1Docs) {
          const leaf = this.documentMap.get(doc.id);
          if (leaf) {
            this.renderLeaf(leaf, lines, 2);
          }
        }
        lines.push('  </m1-us>');
      }

      lines.push('</us-regional:us-regional>');
    } else if (regional.region === 'eu') {
      // EU regional backbone
      lines.push('<?xml version="1.0" encoding="UTF-8"?>');
      lines.push(DTD_REFERENCES.euRegional);
      lines.push('');
      lines.push(`<eu:eu-backbone xmlns:eu="${NAMESPACES.euRegional}">`);
      // ... EU-specific content
      lines.push('</eu:eu-backbone>');
    }

    return lines.join('\n');
  }

  /**
   * Generate Study Tagging File (STF)
   */
  private generateSTF(study: StudyTaggingInfo): string {
    const lines: string[] = [];

    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<study>');
    lines.push(`  <study-id>${this.escapeXml(study.studyId)}</study-id>`);
    lines.push(`  <study-title>${this.escapeXml(study.studyTitle)}</study-title>`);
    lines.push(`  <study-type>${study.studyType}</study-type>`);
    if (study.studySubType) {
      lines.push(`  <study-sub-type>${study.studySubType}</study-sub-type>`);
    }
    lines.push('');

    if (study.datasets.length > 0) {
      lines.push('  <datasets>');
      for (const dataset of study.datasets) {
        lines.push('    <dataset>');
        lines.push(`      <name>${this.escapeXml(dataset.name)}</name>`);
        lines.push(`      <href>${dataset.href}</href>`);
        if (dataset.defineXml) {
          lines.push(`      <define-xml>${dataset.defineXml}</define-xml>`);
        }
        if (dataset.standard) {
          lines.push(`      <standard>${dataset.standard}</standard>`);
          if (dataset.version) {
            lines.push(`      <standard-version>${dataset.version}</standard-version>`);
          }
        }
        lines.push('    </dataset>');
      }
      lines.push('  </datasets>');
    }

    lines.push('</study>');

    return lines.join('\n');
  }

  /**
   * Generate checksums for documents
   */
  private async generateChecksums(documents: ECTDDocument[]): Promise<void> {
    for (const doc of documents) {
      // In real implementation, would compute actual checksums from file content
      // For now, generate simulated checksums
      const md5 = this.simulateMD5(doc.id + doc.title);
      const sha256 = this.simulateSHA256(doc.id + doc.title);
      this.checksums.set(doc.id, { md5, sha256 });
    }
  }

  /**
   * Generate checksum manifest file
   */
  private generateChecksumFile(): string {
    const lines: string[] = [];
    lines.push('# eCTD Checksum Manifest');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push('# Format: MD5 | SHA-256 | Filename');
    lines.push('');

    for (const [docId, checksums] of Array.from(Array.from(Array.from(Array.from(Array.from(this.checksums.entries())))))) {
      const leaf = this.documentMap.get(docId);
      if (leaf) {
        lines.push(`${checksums.md5}  ${checksums.sha256}  ${leaf.href}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Validate generated backbone
   */
  validateBackbone(backbone: BackboneFiles): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check index.xml
    if (!backbone.indexXml.includes('<?xml version')) {
      errors.push('index.xml missing XML declaration');
    }
    if (!backbone.indexXml.includes('ectd:ectd')) {
      errors.push('index.xml missing ectd namespace');
    }
    if (!backbone.indexXml.includes('<submission>')) {
      errors.push('index.xml missing submission element');
    }

    // Check for well-formed XML (basic check)
    const openTags = (backbone.indexXml.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (backbone.indexXml.match(/<\/[^>]+>/g) || []).length;
    const selfClosing = (backbone.indexXml.match(/<[^>]+\/>/g) || []).length;

    if (openTags !== closeTags + selfClosing) {
      warnings.push('index.xml may have unclosed tags');
    }

    // Check regional XML if present
    if (backbone.regionalXml) {
      if (!backbone.regionalXml.includes('<?xml version')) {
        errors.push('Regional XML missing XML declaration');
      }
    }

    // Check checksums
    if (!backbone.checksumFile || backbone.checksumFile.trim().split('\n').length < 4) {
      warnings.push('Checksum file appears empty or incomplete');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get lifecycle operation for document update
   */
  getLifecycleOperation(
    existingDoc: ECTDLeaf | null,
    action: 'add' | 'update' | 'remove'
  ): 'new' | 'replace' | 'append' | 'delete' {
    if (!existingDoc) {
      return 'new';
    }

    switch (action) {
      case 'add':
        return existingDoc ? 'append' : 'new';
      case 'update':
        return 'replace';
      case 'remove':
        return 'delete';
      default:
        return 'new';
    }
  }

  /**
   * Clear internal state
   */
  clear(): void {
    this.documentMap.clear();
    this.checksums.clear();
  }

  // Helper methods
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private simulateMD5(input: string): string {
    // Simulate MD5 hash (32 hex chars)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const base = Math.abs(hash).toString(16).padStart(8, '0');
    return (base + base + base + base).slice(0, 32);
  }

  private simulateSHA256(input: string): string {
    // Simulate SHA-256 hash (64 hex chars)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 7) - hash) + char;
      hash = hash & hash;
    }
    const base = Math.abs(hash).toString(16).padStart(8, '0');
    return (base.repeat(8)).slice(0, 64);
  }
}

// Export singleton instance
export const ectdBackboneGenerator = new ECTDBackboneGenerator();

// Export types and class for testing
export { ECTDBackboneGenerator };
