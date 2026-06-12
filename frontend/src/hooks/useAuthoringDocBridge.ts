
/**
 * useAuthoringDocBridge
 *
 * Watches the Authoring store for documents with status 'approved' or
 * 'submission-ready' and automatically syncs them into DocumentControlStore
 * so they appear in the Document Control module without manual re-entry.
 *
 * Idempotent: tracks synced IDs in a local ref so it never duplicates.
 * Runs as a side-effect inside any component that mounts it — intended
 * for DocumentControlScreen so it activates when the user navigates there.
 *
 * v0.44.12
 */


import { useEffect, useRef } from 'react';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import { useDocumentControlStore } from '@/store/useDocumentControlStore';
import type { AuthoringDocument } from '@/types/authoring';

// Map authoring document types to DocumentControl categories
function mapDocTypeToCategory(docType: string): string {
  const map: Record<string, string> = {
    csr: 'regulatory',
    protocol: 'regulatory',
    ib: 'regulatory',
    icf: 'regulatory',
    dsur: 'regulatory',
    sap: 'regulatory',
    ctr: 'regulatory',
    summary: 'regulatory',
    overview: 'regulatory',
    'module-27': 'regulatory',
    sop: 'quality',
    work_instruction: 'quality',
    policy: 'quality',
    specification: 'technical',
    report: 'technical',
  };
  return map[docType] || 'regulatory';
}

// Map authoring doc type to retention category
function mapRetentionCategory(docType: string): string {
  const clinical = ['csr', 'protocol', 'ib', 'icf', 'sap', 'dsur', 'ctr'];
  if (clinical.includes(docType)) return 'regulatory-submission';
  if (docType === 'sop' || docType === 'policy') return 'quality-record';
  return 'regulatory-submission';
}

export function useAuthoringDocBridge() {
  const syncedIds = useRef<Set<string>>(new Set());

  const authoringDocs = useAuthoringStore(s => s.documents);
  const createDocControlDoc = useDocumentControlStore(s => s.createDocument);
  const updateDocControlDoc = useDocumentControlStore(s => s.updateDocument);
  const docControlDocs = useDocumentControlStore(s => s.documents);

  useEffect(() => {
    // Find approved/submission-ready authoring docs not yet in DocControl
    const approved = authoringDocs.filter(
      d => d.status === 'approved' || d.status === 'submission-ready'
    );

    for (const doc of approved) {
      const bridgeKey = `authoring-bridge:${doc.id}`;

      // Already synced in this session?
      if (syncedIds.current.has(doc.id)) {
        // Still update version/status if the authoring doc changed
        const existing = Object.values(docControlDocs).find(
          d => d.customMetadata?.authoringDocId === doc.id
        );
        if (existing && existing.version !== doc.version) {
          updateDocControlDoc(existing.id, {
            version: doc.version,
            status: doc.status === 'submission-ready' ? 'approved' : 'approved',
            updatedAt: new Date().toISOString(),
          });
        }
        continue;
      }

      // Check if already in DocControl from a previous session (by authoringDocId metadata)
      const alreadyPresent = Object.values(docControlDocs).some(
        d => d.customMetadata?.authoringDocId === doc.id
      );

      if (!alreadyPresent) {
        // Parse version components
        const [major, minor] = doc.version.split('.').map(Number);

        createDocControlDoc({
          title: doc.title,
          description: `${doc.documentType.toUpperCase()} — ${doc.programName}${doc.studyName ? ' / ' + doc.studyName : ''}. Approved from Authoring module.`,
          category: mapDocTypeToCategory(doc.documentType) as any,
          classification: 'controlled',
          contentType: 'document',
          version: doc.version,
          majorVersion: isNaN(major) ? 1 : major,
          minorVersion: isNaN(minor) ? 0 : minor,
          patchVersion: 0,
          status: 'approved',
          effectiveDate: doc.approvedDate || new Date().toISOString(),
          ownerId: doc.ownerId,
          ownerName: doc.ownerName,
          ownerDepartment: 'regulatory-affairs',
          authorId: doc.authorId,
          authorName: doc.authorName,
          fileFormat: 'pdf' as any,
          filePath: `/docs/${doc.id}.pdf`,
          tags: doc.tags || [],
          keywords: [doc.documentType, doc.programName, doc.productName].filter(Boolean),
          retentionCategory: mapRetentionCategory(doc.documentType) as any,
          retentionPeriodYears: 15,
          securityClassification: 'confidential',
          linkedModules: [
            { moduleType: 'authoring', moduleEntityId: doc.id, moduleEntityName: doc.title || doc.id, linkType: 'source', id: `link-${doc.id}`, createdAt: new Date().toISOString(), createdBy: 'system' },
          ],
          customMetadata: {
            authoringDocId: doc.id,
            documentType: doc.documentType,
            programName: doc.programName,
            productName: doc.productName,
            studyId: doc.studyId || '',
            approvedDate: doc.approvedDate || '',
            bridgedAt: new Date().toISOString(),
          },
        });
      }

      syncedIds.current.add(doc.id);
    }
  }, [authoringDocs, createDocControlDoc, updateDocControlDoc, docControlDocs]);
}
