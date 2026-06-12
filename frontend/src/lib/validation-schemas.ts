

/**
 * API Validation Schemas
 * ======================
 * Zod schemas for all API inputs including request bodies,
 * query parameters, and path parameters.
 * 
 * @version 0.15.6
 */

import { z } from 'zod';

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Non-empty string
 */
export const nonEmptyString = z.string().min(1, 'Required');

/**
 * Optional string that becomes undefined if empty
 */
export const optionalString = z.string().optional().transform(v => v === '' ? undefined : v);

/**
 * Date string in YYYY-MM-DD format
 */
export const dateString = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  'Date must be in YYYY-MM-DD format'
).refine(
  (val) => !isNaN(Date.parse(val)),
  'Invalid date'
);

/**
 * ISO datetime string
 */
export const isoDatetime = z.string().datetime({ message: 'Invalid ISO datetime' });

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Sort parameters
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * Search parameter
 */
export const searchSchema = z.object({
  search: z.string().optional(),
});

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

export const productStatus = z.enum(['Active', 'On Hold', 'Discontinued', 'Approved']);

export const therapeuticArea = z.enum([
  'Oncology',
  'Immunology',
  'Neurology',
  'Cardiology',
  'Rare Disease',
  'Infectious Disease',
  'Metabolic',
  'Respiratory',
  'Dermatology',
  'Ophthalmology',
  'Other',
]);

export const developmentPhase = z.enum([
  'Discovery',
  'Preclinical',
  'Phase 1',
  'Phase 2',
  'Phase 3',
  'Submitted',
  'Approved',
]);

export const createProductSchema = z.object({
  name: nonEmptyString.max(200, 'Name must be 200 characters or less'),
  code: nonEmptyString.max(50, 'Code must be 50 characters or less'),
  genericName: optionalString,
  brandName: optionalString,
  therapeuticArea: therapeuticArea.optional(),
  indication: optionalString.transform(v => v?.slice(0, 500)),
  phase: developmentPhase.optional(),
  status: productStatus.default('Active'),
  metadata: z.any().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  therapeuticArea: z.string().optional(),
  phase: z.string().optional(),
  status: z.string().optional(),
  includeCounts: z.coerce.boolean().default(false),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// HAQ SCHEMAS
// =============================================================================

export const haqStatus = z.enum([
  'new',
  'open',
  'in-progress',
  'draft-ready',
  'under-review',
  'partially-responded',
  'submitted',
  'closed',
]);

export const haqPriority = z.enum(['critical', 'major', 'minor']);

export const haqSource = z.enum(['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA', 'Other']);

export const haqDiscipline = z.enum([
  'Clinical',
  'CMC',
  'Nonclinical',
  'Pharmacology',
  'Statistics',
  'Regulatory',
  'Safety',
  'Other',
]);

export const questionType = z.enum(['IR', 'AI', 'MR', 'CR', 'RTQ', 'Other']);

export const createHaqSchema = z.object({
  subject: nonEmptyString.max(500, 'Subject must be 500 characters or less'),
  questionText: optionalString,
  discipline: haqDiscipline.default('Clinical'),
  subdiscipline: optionalString,
  ctdSection: optionalString,
  type: questionType.default('IR'),
  source: haqSource.default('FDA'),
  priority: haqPriority.default('minor'),
  receivedDate: dateString.optional(),
  dueDate: dateString.optional(),
  status: haqStatus.default('new'),
  productId: uuidSchema.optional().nullable(),
  applicationId: uuidSchema.optional().nullable(),
  assignedTo: uuidSchema.optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: optionalString,
});

export const updateHaqSchema = z.object({
  subject: optionalString,
  questionText: optionalString,
  discipline: haqDiscipline.optional(),
  subdiscipline: optionalString,
  ctdSection: optionalString,
  type: questionType.optional(),
  source: haqSource.optional(),
  priority: haqPriority.optional(),
  dueDate: dateString.optional(),
  status: haqStatus.optional(),
  assignedTo: uuidSchema.optional().nullable(),
  responseText: optionalString,
  tags: z.array(z.string()).optional(),
  notes: optionalString,
});

export const haqQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  productId: z.string().optional(),
  applicationId: z.string().optional(),
  discipline: z.string().optional(),
  source: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// STUDY SCHEMAS
// =============================================================================

export const studyPhase = z.enum([
  'Phase 1',
  'Phase 1/2',
  'Phase 2',
  'Phase 2/3',
  'Phase 3',
  'Phase 4',
  'Observational',
]);

export const studyStatus = z.enum([
  'Planning',
  'Active',
  'Enrolling',
  'Completed',
  'Terminated',
  'Suspended',
  'Withdrawn',
]);

export const createStudySchema = z.object({
  protocolNumber: nonEmptyString.max(50),
  title: nonEmptyString.max(500),
  shortTitle: optionalString,
  phase: studyPhase,
  status: studyStatus.default('Planning'),
  indication: optionalString,
  productId: uuidSchema.optional().nullable(),
  sponsorName: optionalString,
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  targetEnrollment: z.coerce.number().int().min(0).optional(),
  metadata: z.any().optional(),
});

export const updateStudySchema = createStudySchema.partial();

export const studyQuerySchema = z.object({
  phase: z.string().optional(),
  status: z.string().optional(),
  productId: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// APPLICATION SCHEMAS
// =============================================================================

export const applicationType = z.enum([
  'NDA',
  'BLA',
  'ANDA',
  'IND',
  'MAA',
  'CTA',
  'JNDA',
  '510(k)',
  'PMA',
  'Other',
]);

export const applicationStatus = z.enum([
  'Planning',
  'In Preparation',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Withdrawn',
]);

export const createApplicationSchema = z.object({
  applicationNumber: nonEmptyString.max(50),
  type: applicationType,
  status: applicationStatus.default('Planning'),
  productId: uuidSchema,
  region: nonEmptyString.max(50),
  submissionDate: dateString.optional(),
  approvalDate: dateString.optional(),
  targetDate: dateString.optional(),
  metadata: z.any().optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial().omit({ productId: true });

export const applicationQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  productId: z.string().optional(),
  region: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// DOCUMENT SCHEMAS
// =============================================================================

export const documentType = z.enum([
  'Protocol',
  'IB',
  'CSR',
  'Module 1',
  'Module 2',
  'Module 3',
  'Module 4',
  'Module 5',
  'Correspondence',
  'Meeting Minutes',
  'SOP',
  'Form',
  'Report',
  'Other',
]);

export const documentStatus = z.enum([
  'Draft',
  'In Review',
  'Approved',
  'Effective',
  'Superseded',
  'Obsolete',
]);

export const createDocumentSchema = z.object({
  documentNumber: nonEmptyString.max(100),
  title: nonEmptyString.max(500),
  type: documentType,
  status: documentStatus.default('Draft'),
  version: z.string().max(20).default('1.0'),
  effectiveDate: dateString.optional(),
  expiryDate: dateString.optional(),
  productId: uuidSchema.optional().nullable(),
  studyId: uuidSchema.optional().nullable(),
  applicationId: uuidSchema.optional().nullable(),
  authorId: uuidSchema.optional().nullable(),
  content: optionalString,
  metadata: z.any().optional(),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export const documentQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  productId: z.string().optional(),
  studyId: z.string().optional(),
  applicationId: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// SAFETY CASE SCHEMAS
// =============================================================================

export const caseType = z.enum([
  'Spontaneous',
  'Clinical Trial',
  'Literature',
  'Solicited',
  'Other',
]);

export const caseSeriousness = z.enum([
  'Non-Serious',
  'Serious',
  'Fatal',
]);

export const caseStatus = z.enum([
  'New',
  'In Progress',
  'Medical Review',
  'QC Review',
  'Submitted',
  'Closed',
]);

export const createSafetyCaseSchema = z.object({
  caseNumber: optionalString, // Auto-generated if not provided
  type: caseType.default('Spontaneous'),
  seriousness: caseSeriousness.default('Non-Serious'),
  status: caseStatus.default('New'),
  receiptDate: dateString,
  reportType: z.enum(['Initial', 'Follow-up', 'Final']).default('Initial'),
  productId: uuidSchema.optional().nullable(),
  patientAge: z.coerce.number().int().min(0).max(150).optional(),
  patientGender: z.enum(['Male', 'Female', 'Unknown', 'Other']).optional(),
  eventDescription: optionalString,
  eventOnsetDate: dateString.optional(),
  outcome: z.enum(['Recovered', 'Recovering', 'Not Recovered', 'Fatal', 'Unknown']).optional(),
  reporterType: z.enum(['Healthcare Professional', 'Consumer', 'Other']).optional(),
  countryOfOccurrence: z.string().max(100).optional(),
  metadata: z.any().optional(),
});

export const updateSafetyCaseSchema = createSafetyCaseSchema.partial();

export const safetyCaseQuerySchema = z.object({
  type: z.string().optional(),
  seriousness: z.string().optional(),
  status: z.string().optional(),
  productId: z.string().optional(),
  reportType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// SUBMISSION SCHEMAS
// =============================================================================

export const submissionType = z.enum([
  'Original',
  'Amendment',
  'Supplement',
  'Annual Report',
  'Response',
  'Other',
]);

export const submissionStatus = z.enum([
  'Draft',
  'In Preparation',
  'QC Review',
  'Ready to Submit',
  'Submitted',
  'Acknowledged',
]);

export const createSubmissionSchema = z.object({
  sequenceNumber: nonEmptyString.max(10),
  type: submissionType,
  status: submissionStatus.default('Draft'),
  applicationId: uuidSchema,
  title: nonEmptyString.max(500),
  description: optionalString,
  targetDate: dateString.optional(),
  submissionDate: dateString.optional(),
  metadata: z.any().optional(),
});

export const updateSubmissionSchema = createSubmissionSchema.partial().omit({ applicationId: true });

export const submissionQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  applicationId: z.string().optional(),
}).merge(searchSchema).merge(sortSchema);

// =============================================================================
// AUTH SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().default(false),
});

export const refreshTokenSchema = z.object({
  refreshToken: nonEmptyString,
});

// =============================================================================
// AUDIT SCHEMAS
// =============================================================================

export const auditQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).merge(paginationSchema).merge(sortSchema);

// =============================================================================
// PATH PARAMETER SCHEMAS
// =============================================================================

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const itemIdParamSchema = z.object({
  itemId: uuidSchema,
});

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Parse and validate request body
 */
export async function validateBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T>> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Parse and validate query parameters
 */
export function validateQuery<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

/**
 * Parse and validate path parameters
 */
export function validateParams<T extends z.ZodSchema>(
  params: Record<string, string>,
  schema: T
): z.infer<T> {
  return schema.parse(params);
}

/**
 * Safe parse that returns result object instead of throwing
 */
export function safeParse<T extends z.ZodSchema>(
  data: unknown,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

export type CreateHaqInput = z.infer<typeof createHaqSchema>;
export type UpdateHaqInput = z.infer<typeof updateHaqSchema>;
export type HaqQuery = z.infer<typeof haqQuerySchema>;

export type CreateStudyInput = z.infer<typeof createStudySchema>;
export type UpdateStudyInput = z.infer<typeof updateStudySchema>;
export type StudyQuery = z.infer<typeof studyQuerySchema>;

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentQuery = z.infer<typeof documentQuerySchema>;

export type CreateSafetyCaseInput = z.infer<typeof createSafetyCaseSchema>;
export type UpdateSafetyCaseInput = z.infer<typeof updateSafetyCaseSchema>;
export type SafetyCaseQuery = z.infer<typeof safetyCaseQuerySchema>;

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type SubmissionQuery = z.infer<typeof submissionQuerySchema>;

export type LoginInput = z.infer<typeof loginSchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
