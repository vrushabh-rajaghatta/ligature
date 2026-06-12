/**
 * OpenAPI Path Extensions — covers the 88 routes not in the original spec.
 * Merged into generateOpenAPISpec() in openapi.ts via extendedPaths.
 *
 * Groups:
 *   AI services           (/api/ai/*)                    10 routes
 *   Authoring             (/api/authoring/*)             11 routes
 *   CTMS                  (/api/ctms/*)                   6 routes
 *   Document Control      (/api/document-control/*)       4 routes
 *   Documents (extras)    (/api/documents/extract|ingest) 2 routes
 *   HAQ extras            (/api/haqs/{id}/audit|reviews…) 3 routes
 *   Health & Metrics      (/api/health/*, /api/metrics)   4 routes
 *   QMS                   (/api/qms/*)                    4 routes
 *   RAG                   (/api/rag/*)                    3 routes
 *   Safety extras         (/api/safety/signals, /api/safety/{id}/…) 5 routes
 *   Smart Submissions     (/api/smart-submissions/*)      2 routes
 *   Submissions extras    (/api/submissions/compile|lifecycle) 6 routes
 *   TMF                   (/api/tmf/*)                    9 routes
 *   Users                 (/api/users/*)                  3 routes
 *   Misc                  (adam, cdisc, citations, collab, cross-module,
 *                          define-xml, demo, docs, errors, haq/report,
 *                          spl, stability/report, cron/citations)  15 routes
 *
 * @version 0.85.0
 */

// ── Shared response shorthands ────────────────────────────────────────────────

const err401 = { $ref: '#/components/responses/Unauthorized' };
const err404 = { $ref: '#/components/responses/NotFound' };
const err500 = { $ref: '#/components/responses/ServerError' };

const err429 = {
  description: 'Rate limit exceeded',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error:       { type: 'string', example: 'Rate limit exceeded' },
          retryAfter:  { type: 'integer', description: 'Seconds to wait before retrying' },
        },
      },
    },
  },
};

const json = (schema: object) => ({ 'application/json': { schema } });

const listOf = (ref: string) => ({
  type: 'array',
  items: { $ref: ref },
});

const idParam = (description = 'Resource identifier') => ({
  name: 'id', in: 'path' as const, required: true,
  schema: { type: 'string', format: 'uuid' }, description,
});

const ok200 = (schema: object) => ({
  '200': { description: 'Success', content: json(schema) },
  '401': err401, '500': err500,
});

const ok200WithErrors = (schema: object) => ({
  ...ok200(schema),
  '404': err404,
});

const created201 = (schema: object) => ({
  '201': { description: 'Created', content: json(schema) },
  '400': { description: 'Validation error' },
  '401': err401, '500': err500,
});

const noContent204 = {
  '204': { description: 'No content' },
  '401': err401, '404': err404, '500': err500,
};

const aiResponses = (schema: object) => ({
  '200': { description: 'AI generation result', content: json(schema) },
  '429': err429,
  '401': err401, '503': { description: 'AI service not configured' }, '500': err500,
});

// ── Re-usable inline schemas ──────────────────────────────────────────────────

const PaginationParams = [
  { name: 'page',  in: 'query' as const, schema: { type: 'integer', default: 1 } },
  { name: 'limit', in: 'query' as const, schema: { type: 'integer', default: 20, maximum: 100 } },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extendedPaths: Record<string, Record<string, any>> = {

  // ══════════════════════════════════════════════════════════════════════════
  // AI SERVICES
  // ══════════════════════════════════════════════════════════════════════════

  '/api/ai/generate': {
    post: {
      tags: ['AI Services'],
      summary: 'Generate regulatory content',
      description: 'Generate pharmaceutical regulatory content using Claude. Supports streaming. Rate-limited to 20 req/min per user.',
      operationId: 'aiGenerate',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt:     { type: 'string', description: 'Generation prompt' },
            type:       { type: 'string', enum: ['haq-response', 'safety-narrative', 'document-section', 'signal-summary', 'general'], default: 'general' },
            context:    { type: 'string', description: 'Optional context injected before the prompt' },
            maxTokens:  { type: 'integer', default: 2000 },
            temperature:{ type: 'number', default: 0.7, minimum: 0, maximum: 1 },
            stream:     { type: 'boolean', default: false, description: 'Enable SSE streaming response' },
          },
        }),
      },
      responses: aiResponses({
        type: 'object',
        properties: {
          content:    { type: 'string' },
          usage:      { type: 'object', properties: { input_tokens: { type: 'integer' }, output_tokens: { type: 'integer' } } },
          model:      { type: 'string' },
          stopReason: { type: 'string' },
        },
      }),
    },
  },

  '/api/ai/health': {
    get: {
      tags: ['AI Services'],
      summary: 'AI service health check',
      operationId: 'aiHealth',
      security: [],
      responses: ok200({
        type: 'object',
        properties: {
          status:       { type: 'string', enum: ['configured', 'not_configured'] },
          message:      { type: 'string' },
          model:        { type: 'string', example: 'claude-sonnet-4-6' },
          capabilities: { type: 'array', items: { type: 'string' } },
        },
      }),
    },
  },

  '/api/ai/haq-rag': {
    post: {
      tags: ['AI Services'],
      summary: 'HAQ RAG generation',
      description: 'Retrieval-augmented HAQ response generation. Searches existing HAQ corpus before generating. Rate-limited to 20 req/min.',
      operationId: 'aiHaqRag',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['question'],
          properties: {
            question:   { type: 'string' },
            haqId:      { type: 'string' },
            context:    { type: 'string' },
            topK:       { type: 'integer', default: 5 },
          },
        }),
      },
      responses: aiResponses({
        type: 'object',
        properties: {
          answer:     { type: 'string' },
          sources:    { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, excerpt: { type: 'string' }, score: { type: 'number' } } } },
          confidence: { type: 'number' },
        },
      }),
    },
  },

  '/api/ai/safety-signal': {
    post: {
      tags: ['AI Services'],
      summary: 'Safety signal analysis',
      description: 'AI-powered analysis of a pharmacovigilance signal with RAG from historical signal database. Rate-limited to 20 req/min.',
      operationId: 'aiSafetySignal',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['signalId', 'signalName', 'drugName', 'reactionTerm', 'caseCount'],
          properties: {
            signalId:    { type: 'string' },
            signalName:  { type: 'string' },
            drugName:    { type: 'string' },
            drugClass:   { type: 'string' },
            reactionTerm:{ type: 'string' },
            caseCount:   { type: 'integer' },
            prr:         { type: 'number' },
            ror:         { type: 'number' },
            ic025:       { type: 'number' },
          },
        }),
      },
      responses: aiResponses({
        type: 'object',
        properties: {
          assessment:         { type: 'string' },
          strengthOfEvidence: { type: 'string', enum: ['strong', 'moderate', 'weak'] },
          recommendation:     { type: 'string' },
          regulatoryImplications: { type: 'string' },
          similarSignals:     { type: 'array', items: { type: 'object' } },
        },
      }),
    },
  },

  '/api/ai/safety-narrative': {
    post: {
      tags: ['AI Services'],
      summary: 'ICSR narrative generation',
      description: 'Generate an E2B(R3)-compliant ICSR narrative for a safety case. Rate-limited to 20 req/min.',
      operationId: 'aiSafetyNarrative',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['caseId'],
          properties: {
            caseId:       { type: 'string' },
            patientAge:   { type: 'integer' },
            patientSex:   { type: 'string' },
            drugName:     { type: 'string' },
            indication:   { type: 'string' },
            adverseEvent: { type: 'string' },
            outcome:      { type: 'string' },
          },
        }),
      },
      responses: aiResponses({ type: 'object', properties: { narrative: { type: 'string' }, wordCount: { type: 'integer' } } }),
    },
  },

  '/api/ai/safety-intelligence': {
    post: {
      tags: ['AI Services'],
      summary: 'Safety portfolio intelligence',
      description: 'AI analysis across the safety portfolio. Rate-limited to 20 req/min.',
      operationId: 'aiSafetyIntelligence',
      requestBody: {
        required: true,
        content: json({ type: 'object', properties: { productId: { type: 'string' }, analysisType: { type: 'string' } } }),
      },
      responses: aiResponses({ type: 'object', properties: { insights: { type: 'array', items: { type: 'object' } }, summary: { type: 'string' } } }),
    },
  },

  '/api/ai/document-qc': {
    post: {
      tags: ['AI Services'],
      summary: 'Document quality check',
      description: 'AI-powered QC review of a regulatory document section against ICH guidelines. Rate-limited to 20 req/min.',
      operationId: 'aiDocumentQc',
      requestBody: {
        required: true,
        content: json({ type: 'object', required: ['content', 'documentType'], properties: { content: { type: 'string' }, documentType: { type: 'string' }, section: { type: 'string' } } }),
      },
      responses: aiResponses({ type: 'object', properties: { issues: { type: 'array', items: { type: 'object' } }, score: { type: 'number' }, summary: { type: 'string' } } }),
    },
  },

  '/api/ai/section-generate': {
    post: {
      tags: ['AI Services'],
      summary: 'Generate document section',
      description: 'Generate a single eCTD document section. Rate-limited to 20 req/min.',
      operationId: 'aiSectionGenerate',
      requestBody: {
        required: true,
        content: json({ type: 'object', required: ['sectionCode', 'productContext'], properties: { sectionCode: { type: 'string', example: '3.2.S.2.4' }, productContext: { type: 'object' }, priorContent: { type: 'string' } } }),
      },
      responses: aiResponses({ type: 'object', properties: { content: { type: 'string' }, sectionCode: { type: 'string' }, wordCount: { type: 'integer' } } }),
    },
  },

  '/api/ai/batch-section': {
    post: {
      tags: ['AI Services'],
      summary: 'Batch section generation',
      description: 'Generate multiple eCTD sections in one call. Rate-limited to 5 req/min (batch preset).',
      operationId: 'aiBatchSection',
      requestBody: {
        required: true,
        content: json({ type: 'object', required: ['sections', 'productContext'], properties: { sections: { type: 'array', items: { type: 'string' }, description: 'eCTD section codes to generate' }, productContext: { type: 'object' } } }),
      },
      responses: aiResponses({ type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { sectionCode: { type: 'string' }, content: { type: 'string' }, status: { type: 'string' } } } } } }),
    },
  },

  '/api/ai/stream-spike': {
    post: {
      tags: ['AI Services'],
      summary: 'Streaming generation (spike)',
      description: 'Server-sent event streaming endpoint for live token output. Rate-limited to 20 req/min.',
      operationId: 'aiStreamSpike',
      requestBody: {
        required: true,
        content: json({ type: 'object', required: ['prompt'], properties: { prompt: { type: 'string' } } }),
      },
      responses: {
        '200': { description: 'SSE stream', content: { 'text/event-stream': { schema: { type: 'string' } } } },
        '429': err429, '401': err401, '500': err500,
      },
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHORING
  // ══════════════════════════════════════════════════════════════════════════

  '/api/authoring/documents': {
    get: {
      tags: ['Authoring'],
      summary: 'List authoring documents',
      operationId: 'listAuthoringDocuments',
      parameters: [
        ...PaginationParams,
        { name: 'status',       in: 'query', schema: { type: 'string' } },
        { name: 'documentType', in: 'query', schema: { type: 'string' } },
        { name: 'search',       in: 'query', schema: { type: 'string' } },
      ],
      responses: ok200({ type: 'object', properties: { documents: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }),
    },
    post: {
      tags: ['Authoring'],
      summary: 'Create authoring document',
      operationId: 'createAuthoringDocument',
      requestBody: { required: true, content: json({ type: 'object', required: ['title', 'documentType'], properties: { title: { type: 'string' }, documentType: { type: 'string' }, studyId: { type: 'string' }, productId: { type: 'string' } } }) },
      responses: created201({ type: 'object' }),
    },
  },

  '/api/authoring/documents/{id}': {
    parameters: [idParam('Authoring document ID')],
    get: {
      tags: ['Authoring'], summary: 'Get authoring document', operationId: 'getAuthoringDocument',
      responses: ok200WithErrors({ type: 'object' }),
    },
    patch: {
      tags: ['Authoring'], summary: 'Update authoring document', operationId: 'updateAuthoringDocument',
      requestBody: { required: true, content: json({ type: 'object' }) },
      responses: ok200WithErrors({ type: 'object' }),
    },
    delete: {
      tags: ['Authoring'], summary: 'Delete authoring document', operationId: 'deleteAuthoringDocument',
      responses: noContent204,
    },
  },

  '/api/authoring/sections': {
    get:  { tags: ['Authoring'], summary: 'List document sections', operationId: 'listAuthoringSections', parameters: [{ name: 'documentId', in: 'query', required: true, schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Authoring'], summary: 'Create document section', operationId: 'createAuthoringSection', requestBody: { required: true, content: json({ type: 'object', required: ['documentId', 'sectionCode'], properties: { documentId: { type: 'string' }, sectionCode: { type: 'string' }, content: { type: 'string' } } }) }, responses: created201({ type: 'object' }) },
  },

  '/api/authoring/sections/{id}': {
    parameters: [idParam('Section ID')],
    get:    { tags: ['Authoring'], summary: 'Get section', operationId: 'getAuthoringSection', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['Authoring'], summary: 'Update section', operationId: 'updateAuthoringSection', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['Authoring'], summary: 'Delete section', operationId: 'deleteAuthoringSection', responses: noContent204 },
  },

  '/api/authoring/templates': {
    get:  { tags: ['Authoring'], summary: 'List document templates', operationId: 'listAuthoringTemplates', responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Authoring'], summary: 'Create template', operationId: 'createAuthoringTemplate', requestBody: { required: true, content: json({ type: 'object', required: ['name', 'documentType'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/authoring/templates/{id}': {
    parameters: [idParam('Template ID')],
    get:    { tags: ['Authoring'], summary: 'Get template', operationId: 'getAuthoringTemplate', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['Authoring'], summary: 'Update template', operationId: 'updateAuthoringTemplate', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['Authoring'], summary: 'Delete template', operationId: 'deleteAuthoringTemplate', responses: noContent204 },
  },

  '/api/authoring/templates/{id}/approval': {
    parameters: [idParam('Template ID')],
    post: { tags: ['Authoring'], summary: 'Submit template for approval', operationId: 'approveAuthoringTemplate', requestBody: { required: true, content: json({ type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['approve', 'reject'] }, comment: { type: 'string' } } }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  '/api/authoring/templates/{id}/versions': {
    parameters: [idParam('Template ID')],
    get: { tags: ['Authoring'], summary: 'List template versions', operationId: 'listAuthoringTemplateVersions', responses: ok200WithErrors({ type: 'array', items: { type: 'object' } }) },
  },

  '/api/authoring/comments': {
    get:  { tags: ['Authoring'], summary: 'List comments', operationId: 'listAuthoringComments', parameters: [{ name: 'documentId', in: 'query', schema: { type: 'string' } }, { name: 'sectionId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Authoring'], summary: 'Create comment', operationId: 'createAuthoringComment', requestBody: { required: true, content: json({ type: 'object', required: ['documentId', 'body'], properties: { documentId: { type: 'string' }, sectionId: { type: 'string' }, body: { type: 'string' } } }) }, responses: created201({ type: 'object' }) },
  },

  '/api/authoring/comments/{id}': {
    parameters: [idParam('Comment ID')],
    patch:  { tags: ['Authoring'], summary: 'Update comment', operationId: 'updateAuthoringComment', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['Authoring'], summary: 'Delete comment', operationId: 'deleteAuthoringComment', responses: noContent204 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CTMS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/ctms/studies': {
    get:  { tags: ['CTMS'], summary: 'List clinical studies', operationId: 'listCtmsStudies', parameters: PaginationParams, responses: ok200({ type: 'object', properties: { studies: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
    post: { tags: ['CTMS'], summary: 'Create clinical study', operationId: 'createCtmsStudy', requestBody: { required: true, content: json({ type: 'object', required: ['protocolNumber', 'title', 'type', 'status'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/ctms/studies/{id}': {
    parameters: [idParam('CTMS study ID')],
    get:    { tags: ['CTMS'], summary: 'Get clinical study', operationId: 'getCtmsStudy', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['CTMS'], summary: 'Update clinical study', operationId: 'updateCtmsStudy', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['CTMS'], summary: 'Delete clinical study', operationId: 'deleteCtmsStudy', responses: noContent204 },
  },

  '/api/ctms/sites': {
    get:  { tags: ['CTMS'], summary: 'List study sites', operationId: 'listCtmsSites', parameters: [{ name: 'studyId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['CTMS'], summary: 'Add study site', operationId: 'createCtmsSite', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'siteName', 'country'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/ctms/sites/{id}': {
    parameters: [idParam('Site ID')],
    get:    { tags: ['CTMS'], summary: 'Get site', operationId: 'getCtmsSite', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['CTMS'], summary: 'Update site', operationId: 'updateCtmsSite', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['CTMS'], summary: 'Delete site', operationId: 'deleteCtmsSite', responses: noContent204 },
  },

  '/api/ctms/subjects': {
    get:  { tags: ['CTMS'], summary: 'List study subjects', operationId: 'listCtmsSubjects', parameters: [{ name: 'studyId', in: 'query', schema: { type: 'string' } }, { name: 'siteId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['CTMS'], summary: 'Enroll subject', operationId: 'createCtmsSubject', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'siteId', 'subjectId'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/ctms/subjects/{id}': {
    parameters: [idParam('Subject ID')],
    get:   { tags: ['CTMS'], summary: 'Get subject', operationId: 'getCtmsSubject', responses: ok200WithErrors({ type: 'object' }) },
    patch: { tags: ['CTMS'], summary: 'Update subject', operationId: 'updateCtmsSubject', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENT CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  '/api/document-control/templates': {
    get:  { tags: ['Document Control'], summary: 'List controlled templates', operationId: 'listDcTemplates', responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Document Control'], summary: 'Create controlled template', operationId: 'createDcTemplate', requestBody: { required: true, content: json({ type: 'object' }) }, responses: created201({ type: 'object' }) },
  },

  '/api/document-control/workflows': {
    get:  { tags: ['Document Control'], summary: 'List review workflows', operationId: 'listDcWorkflows', responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Document Control'], summary: 'Create review workflow', operationId: 'createDcWorkflow', requestBody: { required: true, content: json({ type: 'object', required: ['documentId', 'workflowType'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/document-control/review-cycles': {
    get:  { tags: ['Document Control'], summary: 'List review cycles', operationId: 'listDcReviewCycles', responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Document Control'], summary: 'Start review cycle', operationId: 'createDcReviewCycle', requestBody: { required: true, content: json({ type: 'object', required: ['documentId'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/document-control/archives': {
    get: { tags: ['Document Control'], summary: 'List archived documents', operationId: 'listDcArchives', parameters: PaginationParams, responses: ok200({ type: 'object', properties: { archives: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS — additional operations
  // ══════════════════════════════════════════════════════════════════════════

  '/api/documents/ingest': {
    post: {
      tags: ['Documents'],
      summary: 'Ingest document for RAG',
      description: 'Extract text from an uploaded document and index it into the RAG vector store.',
      operationId: 'ingestDocument',
      requestBody: { required: true, content: json({ type: 'object', required: ['documentId'], properties: { documentId: { type: 'string' }, chunkSize: { type: 'integer', default: 512 } } }) },
      responses: ok200({ type: 'object', properties: { chunksIndexed: { type: 'integer' }, documentId: { type: 'string' } } }),
    },
  },

  '/api/documents/extract': {
    post: {
      tags: ['Documents'],
      summary: 'Extract document text',
      description: 'Extract plain text and metadata from a PDF or Office document.',
      operationId: 'extractDocument',
      requestBody: { required: true, content: json({ type: 'object', required: ['documentId'], properties: { documentId: { type: 'string' } } }) },
      responses: ok200({ type: 'object', properties: { text: { type: 'string' }, pageCount: { type: 'integer' }, metadata: { type: 'object' } } }),
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HAQ — additional operations
  // ══════════════════════════════════════════════════════════════════════════

  '/api/haqs/{id}/audit': {
    parameters: [idParam('HAQ ID')],
    get: { tags: ['HAQ Intelligence'], summary: 'HAQ audit trail', operationId: 'getHaqAudit', responses: ok200WithErrors({ type: 'array', items: { type: 'object' } }) },
  },

  '/api/haqs/{id}/reviews': {
    parameters: [idParam('HAQ ID')],
    get:  { tags: ['HAQ Intelligence'], summary: 'List HAQ reviews', operationId: 'listHaqReviews', responses: ok200WithErrors({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['HAQ Intelligence'], summary: 'Submit HAQ review', operationId: 'createHaqReview', requestBody: { required: true, content: json({ type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['approve', 'reject', 'request-changes'] }, comment: { type: 'string' } } }) }, responses: created201({ type: 'object' }) },
  },

  '/api/haqs/{id}/drafts/current': {
    parameters: [idParam('HAQ ID')],
    get: { tags: ['HAQ Intelligence'], summary: 'Get current draft', operationId: 'getHaqCurrentDraft', responses: ok200WithErrors({ type: 'object' }) },
  },

  '/api/haq/report': {
    get: { tags: ['HAQ Intelligence'], summary: 'Export HAQ report', description: 'Generate a PDF/Excel summary of all HAQs.', operationId: 'exportHaqReport', parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['pdf', 'xlsx'], default: 'pdf' } }], responses: { '200': { description: 'Report file', content: { 'application/pdf': {}, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {} } }, '401': err401 } },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH & METRICS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/health': {
    get: { tags: ['Health'], summary: 'Overall health check', operationId: 'healthCheck', security: [], responses: ok200({ type: 'object', properties: { status: { type: 'string' }, version: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' } } }) },
  },

  '/api/health/live': {
    get: { tags: ['Health'], summary: 'Liveness probe', description: 'Returns 200 if the process is alive. Used by Kubernetes/Vercel.', operationId: 'healthLive', security: [], responses: ok200({ type: 'object', properties: { status: { type: 'string', example: 'ok' } } }) },
  },

  '/api/health/ready': {
    get: { tags: ['Health'], summary: 'Readiness probe', description: 'Returns 200 only when the app is ready to serve traffic (DB connected, etc.).', operationId: 'healthReady', security: [], responses: ok200({ type: 'object', properties: { status: { type: 'string' }, checks: { type: 'object' } } }) },
  },

  '/api/metrics': {
    get: { tags: ['Health'], summary: 'Platform metrics', description: 'Prometheus-compatible metrics endpoint.', operationId: 'getMetrics', responses: { '200': { description: 'Metrics', content: { 'text/plain': { schema: { type: 'string' } } } }, '401': err401 } },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // QMS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/qms/deviations': {
    get:  { tags: ['QMS'], summary: 'List deviations', operationId: 'listQmsDeviations', parameters: [...PaginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'object', properties: { deviations: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
    post: { tags: ['QMS'], summary: 'Create deviation', operationId: 'createQmsDeviation', requestBody: { required: true, content: json({ type: 'object', required: ['title', 'description', 'severity'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/qms/deviations/{id}': {
    parameters: [idParam('Deviation ID')],
    get:    { tags: ['QMS'], summary: 'Get deviation', operationId: 'getQmsDeviation', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['QMS'], summary: 'Update deviation', operationId: 'updateQmsDeviation', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['QMS'], summary: 'Delete deviation', operationId: 'deleteQmsDeviation', responses: noContent204 },
  },

  '/api/qms/capas': {
    get:  { tags: ['QMS'], summary: 'List CAPAs', operationId: 'listQmsCapas', parameters: [...PaginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'object', properties: { capas: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
    post: { tags: ['QMS'], summary: 'Create CAPA', operationId: 'createQmsCapa', requestBody: { required: true, content: json({ type: 'object', required: ['title', 'description', 'targetDate'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/qms/capas/{id}': {
    parameters: [idParam('CAPA ID')],
    get:    { tags: ['QMS'], summary: 'Get CAPA', operationId: 'getQmsCapa', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['QMS'], summary: 'Update CAPA', operationId: 'updateQmsCapa', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['QMS'], summary: 'Delete CAPA', operationId: 'deleteQmsCapa', responses: noContent204 },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RAG
  // ══════════════════════════════════════════════════════════════════════════

  '/api/rag/ingest': {
    post: { tags: ['RAG'], summary: 'Ingest document chunks', description: 'Chunk and embed text into the vector store.', operationId: 'ragIngest', requestBody: { required: true, content: json({ type: 'object', required: ['documentId', 'content'], properties: { documentId: { type: 'string' }, content: { type: 'string' }, metadata: { type: 'object' }, chunkSize: { type: 'integer', default: 512 } } }) }, responses: ok200({ type: 'object', properties: { chunksCreated: { type: 'integer' }, documentId: { type: 'string' } } }) },
  },

  '/api/rag/search': {
    post: { tags: ['RAG'], summary: 'Semantic search', description: 'Vector similarity search across ingested documents.', operationId: 'ragSearch', requestBody: { required: true, content: json({ type: 'object', required: ['query'], properties: { query: { type: 'string' }, topK: { type: 'integer', default: 10 }, minScore: { type: 'number', default: 0.5 }, documentIds: { type: 'array', items: { type: 'string' } }, contentTypes: { type: 'array', items: { type: 'string' } } } }) }, responses: ok200({ type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, content: { type: 'string' }, score: { type: 'number' }, metadata: { type: 'object' } } } }, searchTimeMs: { type: 'number' } } }) },
  },

  '/api/rag/context': {
    post: { tags: ['RAG'], summary: 'Build RAG context block', description: 'Retrieve and format the top-k chunks for a prompt context window.', operationId: 'ragContext', requestBody: { required: true, content: json({ type: 'object', required: ['query'], properties: { query: { type: 'string' }, maxTokens: { type: 'integer', default: 2000 } } }) }, responses: ok200({ type: 'object', properties: { context: { type: 'string' }, sources: { type: 'array', items: { type: 'object' } } } }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY — additional operations
  // ══════════════════════════════════════════════════════════════════════════

  '/api/safety/signals': {
    get:  { tags: ['Safety & Pharmacovigilance'], summary: 'List safety signals', operationId: 'listSafetySignals', parameters: [...PaginationParams, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'object', properties: { signals: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
    post: { tags: ['Safety & Pharmacovigilance'], summary: 'Create safety signal', operationId: 'createSafetySignal', requestBody: { required: true, content: json({ type: 'object', required: ['signalName', 'drugName', 'reactionTerm'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/safety/signals/{id}': {
    parameters: [idParam('Signal ID')],
    get:    { tags: ['Safety & Pharmacovigilance'], summary: 'Get safety signal', operationId: 'getSafetySignal', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['Safety & Pharmacovigilance'], summary: 'Update safety signal', operationId: 'updateSafetySignal', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['Safety & Pharmacovigilance'], summary: 'Delete safety signal', operationId: 'deleteSafetySignal', responses: noContent204 },
  },

  '/api/safety/{id}/audit': {
    parameters: [idParam('Safety case ID')],
    get: { tags: ['Safety & Pharmacovigilance'], summary: 'Safety case audit trail', operationId: 'getSafetyCaseAudit', responses: ok200WithErrors({ type: 'array', items: { type: 'object' } }) },
  },

  '/api/safety/{id}/narrative': {
    parameters: [idParam('Safety case ID')],
    get:  { tags: ['Safety & Pharmacovigilance'], summary: 'Get case narrative', operationId: 'getSafetyCaseNarrative', responses: ok200WithErrors({ type: 'object', properties: { narrative: { type: 'string' }, generatedAt: { type: 'string', format: 'date-time' } } }) },
    post: { tags: ['Safety & Pharmacovigilance'], summary: 'Generate case narrative', operationId: 'generateSafetyCaseNarrative', requestBody: { required: false, content: json({ type: 'object', properties: { regenerate: { type: 'boolean', default: false } } }) }, responses: ok200WithErrors({ type: 'object', properties: { narrative: { type: 'string' } } }) },
  },

  '/api/safety/report': {
    get: { tags: ['Safety & Pharmacovigilance'], summary: 'Export safety report', operationId: 'exportSafetyReport', parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['pdf', 'xlsx'], default: 'pdf' } }, { name: 'productId', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Report file' }, '401': err401 } },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SMART SUBMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/smart-submissions': {
    post: { tags: ['Submissions'], summary: 'Smart submission validation', description: 'AI-assisted pre-submission validation against agency requirements.', operationId: 'smartSubmissionValidate', requestBody: { required: true, content: json({ type: 'object', required: ['submissionId'] }) }, responses: ok200({ type: 'object', properties: { issues: { type: 'array', items: { type: 'object' } }, score: { type: 'number' }, ready: { type: 'boolean' } } }) },
  },

  '/api/smart-submissions/pdfa3': {
    post: { tags: ['Submissions'], summary: 'Convert to PDF/A-3', description: 'Convert submission documents to PDF/A-3 format for eCTD compliance.', operationId: 'smartSubmissionPdfA3', requestBody: { required: true, content: json({ type: 'object', required: ['documentIds'], properties: { documentIds: { type: 'array', items: { type: 'string' } } } }) }, responses: ok200({ type: 'object', properties: { converted: { type: 'integer' }, failed: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } } } }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SUBMISSIONS — additional operations
  // ══════════════════════════════════════════════════════════════════════════

  '/api/submissions/compile': {
    post: { tags: ['Submissions'], summary: 'Compile eCTD package', description: 'Assemble all submission documents into a complete eCTD package.', operationId: 'compileSubmission', requestBody: { required: true, content: json({ type: 'object', required: ['submissionId'] }) }, responses: ok200({ type: 'object', properties: { packageId: { type: 'string' }, status: { type: 'string' } } }) },
  },

  '/api/submissions/compile/download/{packageId}': {
    parameters: [{ name: 'packageId', in: 'path', required: true, schema: { type: 'string' }, description: 'Compiled package ID' }],
    get: { tags: ['Submissions'], summary: 'Download compiled package', operationId: 'downloadCompiledPackage', responses: { '200': { description: 'eCTD ZIP package', content: { 'application/zip': {} } }, '401': err401, '404': err404 } },
  },

  '/api/submissions/lifecycle': {
    get:  { tags: ['Submissions'], summary: 'List submission lifecycles', operationId: 'listSubmissionLifecycles', parameters: PaginationParams, responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Submissions'], summary: 'Create lifecycle plan', operationId: 'createSubmissionLifecycle', requestBody: { required: true, content: json({ type: 'object', required: ['submissionId', 'phase'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/submissions/lifecycle/{id}': {
    parameters: [idParam('Lifecycle ID')],
    get:   { tags: ['Submissions'], summary: 'Get lifecycle', operationId: 'getSubmissionLifecycle', responses: ok200WithErrors({ type: 'object' }) },
    patch: { tags: ['Submissions'], summary: 'Update lifecycle', operationId: 'updateSubmissionLifecycle', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  '/api/submissions/lifecycle/tasks': {
    get:  { tags: ['Submissions'], summary: 'List lifecycle tasks', operationId: 'listLifecycleTasks', parameters: [{ name: 'lifecycleId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Submissions'], summary: 'Create lifecycle task', operationId: 'createLifecycleTask', requestBody: { required: true, content: json({ type: 'object', required: ['lifecycleId', 'title'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/submissions/lifecycle/tasks/{id}': {
    parameters: [idParam('Task ID')],
    get:   { tags: ['Submissions'], summary: 'Get lifecycle task', operationId: 'getLifecycleTask', responses: ok200WithErrors({ type: 'object' }) },
    patch: { tags: ['Submissions'], summary: 'Update lifecycle task', operationId: 'updateLifecycleTask', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TMF
  // ══════════════════════════════════════════════════════════════════════════

  '/api/tmf/zones': {
    get: { tags: ['TMF'], summary: 'List TMF zones', description: 'Returns all DIA TMF Reference Model zones with completeness scores.', operationId: 'listTmfZones', parameters: [{ name: 'studyId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object', properties: { zoneId: { type: 'string' }, zoneName: { type: 'string' }, completeness: { type: 'number' }, artifactCount: { type: 'integer' } } } }) },
  },

  '/api/tmf/artifacts': {
    get:  { tags: ['TMF'], summary: 'List TMF artifacts', operationId: 'listTmfArtifacts', parameters: [...PaginationParams, { name: 'studyId', in: 'query', schema: { type: 'string' } }, { name: 'zoneId', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'object', properties: { artifacts: { type: 'array', items: { type: 'object' } }, total: { type: 'integer' } } }) },
    post: { tags: ['TMF'], summary: 'Upload TMF artifact', operationId: 'createTmfArtifact', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'zoneId', 'title'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/tmf/artifacts/{id}': {
    parameters: [idParam('Artifact ID')],
    get:    { tags: ['TMF'], summary: 'Get artifact', operationId: 'getTmfArtifact', responses: ok200WithErrors({ type: 'object' }) },
    patch:  { tags: ['TMF'], summary: 'Update artifact', operationId: 'updateTmfArtifact', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
    delete: { tags: ['TMF'], summary: 'Delete artifact', operationId: 'deleteTmfArtifact', responses: noContent204 },
  },

  '/api/tmf/gaps': {
    get:  { tags: ['TMF'], summary: 'List TMF gaps', operationId: 'listTmfGaps', parameters: [{ name: 'studyId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['TMF'], summary: 'Create gap record', operationId: 'createTmfGap', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'artifactCode', 'reason'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/tmf/gaps/{id}': {
    parameters: [idParam('Gap ID')],
    get:   { tags: ['TMF'], summary: 'Get gap', operationId: 'getTmfGap', responses: ok200WithErrors({ type: 'object' }) },
    patch: { tags: ['TMF'], summary: 'Resolve gap', operationId: 'resolveTmfGap', requestBody: { required: true, content: json({ type: 'object', properties: { resolution: { type: 'string' }, status: { type: 'string', enum: ['resolved', 'waived', 'in-progress'] } } }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  '/api/tmf/qc': {
    get:  { tags: ['TMF'], summary: 'List QC reviews', operationId: 'listTmfQc', parameters: [{ name: 'studyId', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['TMF'], summary: 'Start QC review', operationId: 'createTmfQc', requestBody: { required: true, content: json({ type: 'object', required: ['studyId'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/tmf/qc/{id}': {
    parameters: [idParam('QC review ID')],
    get:   { tags: ['TMF'], summary: 'Get QC review', operationId: 'getTmfQc', responses: ok200WithErrors({ type: 'object' }) },
    patch: { tags: ['TMF'], summary: 'Update QC review', operationId: 'updateTmfQc', requestBody: { required: true, content: json({ type: 'object' }) }, responses: ok200WithErrors({ type: 'object' }) },
  },

  '/api/tmf/auto-link': {
    post: { tags: ['TMF'], summary: 'Auto-link artifacts', description: 'AI-powered automatic linking of uploaded documents to their correct TMF zones and artifacts.', operationId: 'tmfAutoLink', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'documentIds'], properties: { studyId: { type: 'string' }, documentIds: { type: 'array', items: { type: 'string' } } } }) }, responses: ok200({ type: 'object', properties: { linked: { type: 'integer' }, unresolved: { type: 'integer' }, results: { type: 'array', items: { type: 'object' } } } }) },
  },

  '/api/tmf/inspection-report': {
    get: { tags: ['TMF'], summary: 'Generate inspection report', description: 'Generate a TMF inspection readiness report in PDF format.', operationId: 'tmfInspectionReport', parameters: [{ name: 'studyId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'PDF inspection report', content: { 'application/pdf': {} } }, '401': err401, '404': err404 } },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/users': {
    get: { tags: ['Users'], summary: 'List users', operationId: 'listUsers', parameters: PaginationParams, responses: ok200({ type: 'object', properties: { users: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, status: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } } }, total: { type: 'integer' } } }) },
  },

  '/api/users/invite': {
    post: { tags: ['Users'], summary: 'Invite user', description: 'Send an email invitation to a new user. Requires Resend API key for email delivery; returns invite link in demo mode.', operationId: 'inviteUser', requestBody: { required: true, content: json({ type: 'object', required: ['email', 'role'], properties: { email: { type: 'string', format: 'email' }, role: { type: 'string' }, name: { type: 'string' } } }) }, responses: ok200({ type: 'object', properties: { inviteLink: { type: 'string' }, emailSent: { type: 'boolean' }, message: { type: 'string' } } }) },
  },

  '/api/users/invite/accept': {
    post: { tags: ['Users'], summary: 'Accept invite', description: 'Accept a user invitation and set a password. Activates the user account.', operationId: 'acceptInvite', requestBody: { required: true, content: json({ type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } }) }, responses: ok200({ type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } }) },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MISCELLANEOUS
  // ══════════════════════════════════════════════════════════════════════════

  '/api/adam': {
    post: { tags: ['Clinical Data'], summary: 'Generate ADaM datasets', description: 'Generate Analysis Data Model (ADaM) datasets from SDTM source data.', operationId: 'generateAdam', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'datasets'], properties: { studyId: { type: 'string' }, datasets: { type: 'array', items: { type: 'string', enum: ['ADSL', 'ADAE', 'ADLB', 'ADTTE', 'ADRS'] } } } }) }, responses: ok200({ type: 'object', properties: { generated: { type: 'array', items: { type: 'string' } }, downloadUrls: { type: 'object' } } }) },
  },

  '/api/cdisc-terminology': {
    get: { tags: ['Regulatory Standards'], summary: 'Search CDISC terminology', operationId: 'getCdiscTerminology', parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }, { name: 'codelist', in: 'query', schema: { type: 'string' } }, { name: 'version', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'object', properties: { terms: { type: 'array', items: { type: 'object', properties: { code: { type: 'string' }, term: { type: 'string' }, definition: { type: 'string' } } } } } }) },
  },

  '/api/citations/check': {
    post: { tags: ['Regulatory Standards'], summary: 'Check regulatory citations', description: 'Verify that cited ICH/FDA/EMA guideline references are current and haven\'t been superseded.', operationId: 'checkCitations', requestBody: { required: true, content: json({ type: 'object', required: ['citations'], properties: { citations: { type: 'array', items: { type: 'string' } } } }) }, responses: ok200({ type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { citation: { type: 'string' }, status: { type: 'string', enum: ['current', 'superseded', 'not-found'] }, currentVersion: { type: 'string' } } } } } }) },
  },

  '/api/collaboration': {
    get: { tags: ['Collaboration'], summary: 'List active collaboration sessions', operationId: 'listCollaborationSessions', responses: ok200({ type: 'array', items: { type: 'object', properties: { sessionId: { type: 'string' }, documentId: { type: 'string' }, participants: { type: 'integer' }, createdAt: { type: 'string', format: 'date-time' } } } }) },
  },

  '/api/collaboration/presence': {
    get:  { tags: ['Collaboration'], summary: 'Get presence state', operationId: 'getPresence', parameters: [{ name: 'documentId', in: 'query', required: true, schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Collaboration'], summary: 'Update presence', operationId: 'updatePresence', requestBody: { required: true, content: json({ type: 'object', required: ['documentId', 'cursor'] }) }, responses: ok200({ type: 'object' }) },
  },

  '/api/collaboration/operations': {
    post: { tags: ['Collaboration'], summary: 'Submit OT operation', description: 'Submit an operational transform operation for collaborative document editing.', operationId: 'submitOperation', requestBody: { required: true, content: json({ type: 'object', required: ['sessionId', 'operation', 'revision'], properties: { sessionId: { type: 'string' }, operation: { type: 'object' }, revision: { type: 'integer' } } }) }, responses: ok200({ type: 'object', properties: { revision: { type: 'integer' }, transformed: { type: 'object' } } }) },
  },

  '/api/collaboration/events': {
    get: { tags: ['Collaboration'], summary: 'Stream collaboration events', description: 'Server-sent event stream for real-time document collaboration events.', operationId: 'streamCollaborationEvents', parameters: [{ name: 'sessionId', in: 'query', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'SSE event stream', content: { 'text/event-stream': { schema: { type: 'string' } } } }, '401': err401 } },
  },

  '/api/cross-module': {
    get: { tags: ['Cross-Module'], summary: 'List cross-module events', operationId: 'listCrossModuleEvents', parameters: [...PaginationParams, { name: 'sourceModule', in: 'query', schema: { type: 'string' } }], responses: ok200({ type: 'array', items: { type: 'object' } }) },
  },

  '/api/cross-module/pipelines': {
    get:  { tags: ['Cross-Module'], summary: 'List cascade pipelines', operationId: 'listCascadePipelines', responses: ok200({ type: 'array', items: { type: 'object' } }) },
    post: { tags: ['Cross-Module'], summary: 'Trigger cascade pipeline', operationId: 'triggerCascadePipeline', requestBody: { required: true, content: json({ type: 'object', required: ['triggerType', 'sourceModule'] }) }, responses: created201({ type: 'object' }) },
  },

  '/api/define-xml': {
    post: { tags: ['Regulatory Standards'], summary: 'Generate define.xml', description: 'Generate a CDISC define.xml metadata file for a clinical dataset package.', operationId: 'generateDefineXml', requestBody: { required: true, content: json({ type: 'object', required: ['studyId', 'datasetType'], properties: { studyId: { type: 'string' }, datasetType: { type: 'string', enum: ['SDTM', 'ADaM'] } } }) }, responses: { '200': { description: 'define.xml file', content: { 'application/xml': {} } }, '401': err401, '500': err500 } },
  },

  '/api/spl': {
    post: { tags: ['Labeling'], summary: 'Generate SPL XML', description: 'Generate an FDA Structured Product Labeling (SPL) XML document.', operationId: 'generateSpl', requestBody: { required: true, content: json({ type: 'object', required: ['productId', 'labelType'] }) }, responses: { '200': { description: 'SPL XML', content: { 'application/xml': {} } }, '401': err401, '500': err500 } },
  },

  '/api/stability/report': {
    get: { tags: ['CMC'], summary: 'Generate stability report', operationId: 'generateStabilityReport', parameters: [{ name: 'studyId', in: 'query', required: true, schema: { type: 'string' } }, { name: 'format', in: 'query', schema: { type: 'string', enum: ['pdf', 'xlsx'], default: 'pdf' } }], responses: { '200': { description: 'Stability report file' }, '401': err401, '404': err404 } },
  },

  '/api/demo': {
    post: { tags: ['Demo'], summary: 'Reset demo state', description: 'Reset all demo data to default seed state. Demo mode only.', operationId: 'resetDemo', responses: ok200({ type: 'object', properties: { reset: { type: 'boolean' }, message: { type: 'string' } } }) },
    get:  { tags: ['Demo'], summary: 'Get demo status', operationId: 'getDemoStatus', responses: ok200({ type: 'object', properties: { demoMode: { type: 'boolean' }, version: { type: 'string' } } }) },
  },

  '/api/docs': {
    get: { tags: ['Documentation'], summary: 'OpenAPI specification', description: 'Returns the complete OpenAPI 3.0 specification for this API.', operationId: 'getApiDocs', security: [], responses: { '200': { description: 'OpenAPI spec', content: { 'application/json': { schema: { type: 'object' } } } } } },
  },

  '/api/errors': {
    post: { tags: ['Monitoring'], summary: 'Report client error', description: 'Submit a client-side error report for server-side logging and alerting.', operationId: 'reportError', requestBody: { required: true, content: json({ type: 'object', required: ['message'], properties: { message: { type: 'string' }, stack: { type: 'string' }, context: { type: 'object' } } }) }, responses: ok200({ type: 'object', properties: { received: { type: 'boolean' } } }) },
  },

  '/api/cron/citations': {
    get: { tags: ['Regulatory Standards'], summary: 'Cron: refresh citation hashes', description: 'Scheduled job that re-checks all regulatory citation fingerprints and flags changes. Triggered by Vercel cron (Mondays 08:00 UTC).', operationId: 'cronRefreshCitations', responses: ok200({ type: 'object', properties: { checked: { type: 'integer' }, changed: { type: 'integer' }, errors: { type: 'integer' } } }) },
  },

};

/**
 * New tags introduced by the extensions.
 * Merge these into the tags array in generateOpenAPISpec().
 */
export const extendedTags = [
  { name: 'AI Services',          description: 'Claude-powered generation, RAG, signal analysis, and document QC' },
  { name: 'Authoring',            description: 'Document authoring lifecycle — templates, sections, comments, approvals' },
  { name: 'CTMS',                 description: 'Clinical Trial Management System — studies, sites, subjects' },
  { name: 'Document Control',     description: 'Controlled document workflows, review cycles, and archives' },
  { name: 'QMS',                  description: 'Quality Management System — deviations and CAPAs' },
  { name: 'RAG',                  description: 'Retrieval-Augmented Generation — ingest, search, context' },
  { name: 'TMF',                  description: 'Trial Master File — zones, artifacts, QC, gaps, auto-link' },
  { name: 'Users',                description: 'User management and invitation flow' },
  { name: 'Health',               description: 'Health checks, liveness and readiness probes' },
  { name: 'Collaboration',        description: 'Real-time collaborative editing — OT, presence, sessions' },
  { name: 'Cross-Module',         description: 'Cross-module cascade engine and event bus' },
  { name: 'Clinical Data',        description: 'ADaM dataset generation and SDTM utilities' },
  { name: 'Regulatory Standards', description: 'CDISC terminology, define.xml, citation monitoring' },
  { name: 'Labeling',             description: 'SPL generation and label management' },
  { name: 'CMC',                  description: 'Chemistry, Manufacturing and Controls — stability reports' },
  { name: 'Monitoring',           description: 'Error reporting and observability' },
  { name: 'Demo',                 description: 'Demo mode state management' },
  { name: 'Documentation',        description: 'API self-documentation' },
];
