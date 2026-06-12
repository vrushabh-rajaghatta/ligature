
/**
 * useQMSDocBridge
 *
 * Watches the QMS store for controlled documents with status 'effective' or
 * 'approved' and syncs them into DocumentControlStore so they appear in the
 * Document Control module without manual re-entry.
 *
 * Idempotent: tracks synced IDs in a local ref.
 *
 * v0.44.12
 */


import { useEffect, useRef } from 'react';
import { useQMSStore } from '@/store/useQMSStore';
import { useDocumentControlStore } from '@/store/useDocumentControlStore';

export function useQMSDocBridge() {
  const syncedIds = useRef<Set<string>>(new Set());

  const qmsDocs = useQMSStore(s => s.controlledDocuments);
  const createDocControlDoc = useDocumentControlStore(s => s.createDocument);
  const updateDocControlDoc = useDocumentControlStore(s => s.updateDocument);
  const docControlDocs = useDocumentControlStore(s => s.documents);

  useEffect(() => {
    const effectiveDocs = Object.values(qmsDocs).filter(
      d => d.status === 'effective' || d.status === 'approved'
    );

    for (const doc of effectiveDocs) {
      if (syncedIds.current.has(doc.id)) {
        // Update version if changed
        const existing = Object.values(docControlDocs).find(
          d => d.customMetadata?.qmsDocId === doc.id
        );
        if (existing && existing.version !== doc.version) {
          updateDocControlDoc(existing.id, {
            version: doc.version,
            majorVersion: doc.majorVersion,
            minorVersion: doc.minorVersion,
            status: doc.status === 'effective' ? 'effective' : 'approved',
          });
        }
        continue;
      }

      const alreadyPresent = Object.values(docControlDocs).some(
        d => d.customMetadata?.qmsDocId === doc.id
      );

      if (!alreadyPresent) {
        const catMap: Record<string, string> = {
          sop: 'quality', policy: 'quality', 'work-instruction': 'quality',
          form: 'quality', template: 'quality', report: 'technical', specification: 'technical',
        };

        createDocControlDoc({
          title: doc.title,
          description: doc.description || `${doc.documentType.toUpperCase()} — ${doc.department}`,
          category: (catMap[doc.documentType] || 'quality') as any,
          classification: 'controlled',
          contentType: 'document',
          version: doc.version,
          majorVersion: doc.majorVersion,
          minorVersion: doc.minorVersion,
          patchVersion: 0,
          status: doc.status === 'effective' ? 'effective' : 'approved',
          effectiveDate: doc.effectiveDate,
          ownerId: doc.ownerId,
          ownerName: doc.owner,
          ownerDepartment: doc.department,
          authorId: doc.authorId,
          authorName: doc.author,
          fileFormat: 'pdf' as any,
          filePath: doc.fileLocation || `/docs/${doc.documentNumber}.pdf`,
          fileSize: doc.fileSize,
          tags: doc.keywords || [],
          keywords: doc.keywords || [],
          retentionCategory: 'quality-record' as any,
          retentionPeriodYears: doc.retentionYears,
          securityClassification: (doc.confidentialityLevel as any) || 'internal',
          linkedModules: [
            { moduleType: 'qms', moduleEntityId: doc.id, moduleEntityName: doc.title || doc.id, linkType: 'source', id: `link-${doc.id}`, createdAt: new Date().toISOString(), createdBy: 'system' },
          ],
          customMetadata: {
            qmsDocId: doc.id,
            documentNumber: doc.documentNumber,
            documentType: doc.documentType,
            department: doc.department,
            bridgedAt: new Date().toISOString(),
          },
        });
      }

      syncedIds.current.add(doc.id);
    }
  }, [qmsDocs, createDocControlDoc, updateDocControlDoc, docControlDocs]);
}
