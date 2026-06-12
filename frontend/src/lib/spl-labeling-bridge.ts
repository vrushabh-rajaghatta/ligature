
// =============================================================================
// SPL ↔ LABELING BRIDGE — v0.42.45
// =============================================================================
// Cross-module data flow between SPL (FDA Structured Product Labeling) and
// Labeling (USPI/SmPC/PIL authoring). Provides bidirectional section mapping,
// sync operations, and status tracking.
//
// Key concept: USPI section numbers map to SPL section codes per FDA PLR.
// This bridge translates between the two models so changes in either module
// propagate to the other without manual re-entry.
// =============================================================================

import { useSPLStore } from '@/store/useSPLStore';
import { useLabelingStore } from '@/store/useLabelingStore';
import type { SPLDocument, SPLComponent } from '@/store/splTypes';
import type { LabelDocument, LabelSection } from '@/store/useLabelingStore';

// =============================================================================
// SECTION MAPPING TABLE — USPI Section Numbers ↔ SPL Section Codes
// =============================================================================
// Based on FDA Physician Labeling Rule (PLR) structure.

export interface SectionMapping {
  uspiSection: string;  // e.g. "1", "2", "5.1"
  uspiTitle: string;
  splCode: string;       // SPL section code
  splTitle: string;
  category: 'highlights' | 'full-pi' | 'patient-info';
}

export const SECTION_MAPPINGS: SectionMapping[] = [
  { uspiSection: '1', uspiTitle: 'Indications and Usage', splCode: 'indications-usage', splTitle: 'INDICATIONS AND USAGE', category: 'full-pi' },
  { uspiSection: '2', uspiTitle: 'Dosage and Administration', splCode: 'dosage-administration', splTitle: 'DOSAGE AND ADMINISTRATION', category: 'full-pi' },
  { uspiSection: '3', uspiTitle: 'Dosage Forms and Strengths', splCode: 'dosage-forms-strengths', splTitle: 'DOSAGE FORMS AND STRENGTHS', category: 'full-pi' },
  { uspiSection: '4', uspiTitle: 'Contraindications', splCode: 'contraindications', splTitle: 'CONTRAINDICATIONS', category: 'full-pi' },
  { uspiSection: '5', uspiTitle: 'Warnings and Precautions', splCode: 'warnings-precautions', splTitle: 'WARNINGS AND PRECAUTIONS', category: 'full-pi' },
  { uspiSection: '6', uspiTitle: 'Adverse Reactions', splCode: 'adverse-reactions', splTitle: 'ADVERSE REACTIONS', category: 'full-pi' },
  { uspiSection: '7', uspiTitle: 'Drug Interactions', splCode: 'drug-interactions', splTitle: 'DRUG INTERACTIONS', category: 'full-pi' },
  { uspiSection: '8', uspiTitle: 'Use in Specific Populations', splCode: 'use-specific-populations', splTitle: 'USE IN SPECIFIC POPULATIONS', category: 'full-pi' },
  { uspiSection: '10', uspiTitle: 'Overdosage', splCode: 'overdosage', splTitle: 'OVERDOSAGE', category: 'full-pi' },
  { uspiSection: '11', uspiTitle: 'Description', splCode: 'description', splTitle: 'DESCRIPTION', category: 'full-pi' },
  { uspiSection: '12', uspiTitle: 'Clinical Pharmacology', splCode: 'clinical-pharmacology', splTitle: 'CLINICAL PHARMACOLOGY', category: 'full-pi' },
  { uspiSection: '13', uspiTitle: 'Nonclinical Toxicology', splCode: 'nonclinical-toxicology', splTitle: 'NONCLINICAL TOXICOLOGY', category: 'full-pi' },
  { uspiSection: '14', uspiTitle: 'Clinical Studies', splCode: 'clinical-studies', splTitle: 'CLINICAL STUDIES', category: 'full-pi' },
  { uspiSection: '16', uspiTitle: 'How Supplied/Storage and Handling', splCode: 'how-supplied', splTitle: 'HOW SUPPLIED/STORAGE AND HANDLING', category: 'full-pi' },
  { uspiSection: '17', uspiTitle: 'Patient Counseling Information', splCode: 'patient-counseling', splTitle: 'PATIENT COUNSELING INFORMATION', category: 'patient-info' },
];

// Lookup helpers
export function splCodeFromUspi(uspiSection: string): string | null {
  const mapping = SECTION_MAPPINGS.find(m => m.uspiSection === uspiSection);
  return mapping?.splCode ?? null;
}

export function uspiSectionFromSplCode(splCode: string): string | null {
  const mapping = SECTION_MAPPINGS.find(m => m.splCode === splCode);
  return mapping?.uspiSection ?? null;
}

export function getMappingForSplCode(splCode: string): SectionMapping | null {
  return SECTION_MAPPINGS.find(m => m.splCode === splCode) ?? null;
}

export function getMappingForUspiSection(uspiSection: string): SectionMapping | null {
  return SECTION_MAPPINGS.find(m => m.uspiSection === uspiSection) ?? null;
}

// =============================================================================
// SYNC STATUS
// =============================================================================

export type SyncDirection = 'spl-to-labeling' | 'labeling-to-spl' | 'bidirectional';
export type SyncStatus = 'synced' | 'spl-ahead' | 'labeling-ahead' | 'conflict' | 'unlinked';

export interface CrossModuleStatus {
  splDocumentId: string | null;
  labelingDocumentId: string | null;
  linked: boolean;
  syncStatus: SyncStatus;
  mappedSections: number;
  unmappedSplSections: number;
  unmappedLabelingSections: number;
  lastSyncedAt: string | null;
}

export function getCrossModuleStatus(
  splDoc: SPLDocument | null,
  labelDoc: LabelDocument | null,
): CrossModuleStatus {
  if (!splDoc || !labelDoc) {
    return {
      splDocumentId: splDoc?.id ?? null,
      labelingDocumentId: labelDoc?.id ?? null,
      linked: false,
      syncStatus: 'unlinked',
      mappedSections: 0,
      unmappedSplSections: splDoc?.components?.length ?? 0,
      unmappedLabelingSections: labelDoc?.sections?.length ?? 0,
      lastSyncedAt: null,
    };
  }

  const splCodes = new Set(splDoc.components.map(c => c.sectionCode));
  const labelSections = new Set(labelDoc.sections.map(s => s.sectionNumber));

  let mapped = 0;
  let unmappedSpl = 0;
  let unmappedLabeling = 0;

  for (const code of Array.from(splCodes)) {
    const uspiSection = uspiSectionFromSplCode(code);
    if (uspiSection && labelSections.has(uspiSection)) {
      mapped++;
    } else {
      unmappedSpl++;
    }
  }

  for (const section of Array.from(labelSections)) {
    const splCode = splCodeFromUspi(section);
    if (!splCode || !splCodes.has(splCode as any)) {
      unmappedLabeling++;
    }
  }

  // Determine sync status based on timestamps
  const splUpdated = new Date(splDoc.updatedAt).getTime();
  const labelUpdated = new Date(labelDoc.updatedAt).getTime();
  const timeDiff = Math.abs(splUpdated - labelUpdated);
  const SYNC_THRESHOLD_MS = 60_000; // 1 minute

  let syncStatus: SyncStatus;
  if (timeDiff < SYNC_THRESHOLD_MS) {
    syncStatus = 'synced';
  } else if (splUpdated > labelUpdated) {
    syncStatus = 'spl-ahead';
  } else {
    syncStatus = 'labeling-ahead';
  }

  return {
    splDocumentId: splDoc.id,
    labelingDocumentId: labelDoc.id,
    linked: true,
    syncStatus,
    mappedSections: mapped,
    unmappedSplSections: unmappedSpl,
    unmappedLabelingSections: unmappedLabeling,
    lastSyncedAt: new Date(Math.max(splUpdated, labelUpdated)).toISOString(),
  };
}

// =============================================================================
// SECTION SYNC OPERATIONS
// =============================================================================

/**
 * Map labeling sections to SPL components based on the PLR mapping table.
 * Returns an array of SPL component partials ready to be added/updated.
 */
export function mapLabelingSectionsToSPL(
  labelSections: LabelSection[],
): Partial<SPLComponent>[] {
  const mapped: Partial<SPLComponent>[] = [];

  for (const section of labelSections) {
    const mapping = getMappingForUspiSection(section.sectionNumber);
    if (!mapping) continue;

    mapped.push({
      sectionCode: mapping.splCode as any,
      title: mapping.splTitle,
      text: { content: section.content },
      effectiveTime: { low: section.lastModifiedAt || new Date().toISOString() },
    });
  }

  return mapped;
}

/**
 * Map SPL components to labeling section partials based on the PLR mapping table.
 * Returns an array of labeling section partials ready to be added/updated.
 */
export function mapSPLSectionsToLabeling(
  splComponents: SPLComponent[],
): Partial<LabelSection>[] {
  const mapped: Partial<LabelSection>[] = [];

  for (const component of splComponents) {
    const mapping = getMappingForSplCode(component.sectionCode);
    if (!mapping) continue;

    mapped.push({
      sectionNumber: mapping.uspiSection,
      title: mapping.uspiTitle,
      content: component.text?.content || '',
      status: 'modified',
      lastModifiedAt: component.effectiveTime?.low || new Date().toISOString(),
      lastModifiedBy: 'SPL Sync',
      changeJustification: 'Synced from SPL module',
    });
  }

  return mapped;
}

/**
 * Create a bidirectional link between an SPL document and a labeling document.
 * Updates both stores atomically.
 */
export function createBidirectionalLink(splDocumentId: string, labelingDocumentId: string): void {
  const splStore = useSPLStore.getState();
  const labelStore = useLabelingStore.getState();

  splStore.linkToLabeling(splDocumentId, labelingDocumentId);
  labelStore.linkToSPL(labelingDocumentId, splDocumentId);
}

/**
 * Sync labeling sections into SPL document.
 * Creates mapped SPL components from labeling sections.
 */
export function syncLabelingToSPL(labelingDocumentId: string, splDocumentId: string): number {
  const labelStore = useLabelingStore.getState();
  const splStore = useSPLStore.getState();

  const labelDoc = labelStore.labels[labelingDocumentId];
  if (!labelDoc) return 0;

  const mappedComponents = mapLabelingSectionsToSPL(labelDoc.sections);

  for (const component of mappedComponents) {
    splStore.addSection(splDocumentId, component);
  }

  // Ensure link exists
  createBidirectionalLink(splDocumentId, labelingDocumentId);

  return mappedComponents.length;
}

/**
 * Sync SPL sections into labeling document.
 * Creates mapped labeling sections from SPL components.
 */
export function syncSPLToLabeling(splDocumentId: string, labelingDocumentId: string): number {
  const splStore = useSPLStore.getState();
  const labelStore = useLabelingStore.getState();

  const splDoc = splStore.documents[splDocumentId];
  if (!splDoc) return 0;

  const mappedSections = mapSPLSectionsToLabeling(splDoc.components);

  for (const section of mappedSections) {
    labelStore.addSection(labelingDocumentId, section);
  }

  // Ensure link exists
  createBidirectionalLink(splDocumentId, labelingDocumentId);

  return mappedSections.length;
}
