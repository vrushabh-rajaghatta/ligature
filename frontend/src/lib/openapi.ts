/**
 * OpenAPI 3.0 Specification for Ligature IDOP API
 * Documents all 127 API routes across 18 tag groups.
 *
 * Original 39 routes defined in `paths` below.
 * Remaining 88 routes defined in openapi-extensions.ts → merged via extendedPaths.
 *
 * @version 0.85.0
 */

import { APP_VERSION } from '@/config/version';
import { extendedPaths, extendedTags } from '@/lib/openapi-extensions';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: { name: string; email?: string; url?: string };
    license?: { name: string; url?: string };
  };
  servers: Array<{ url: string; description: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, PathOperation>>;
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
    responses?: Record<string, ResponseObject>;
  };
  security?: Array<Record<string, string[]>>;
}

interface PathOperation {
  tags: string[];
  summary: string;
  description?: string;
  operationId: string;
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
}

interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: SchemaObject;
}

interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: SchemaObject }>;
}

interface ResponseObject {
  description: string;
  content?: Record<string, { schema: SchemaObject }>;
}

interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: string[];
  $ref?: string;
  nullable?: boolean;
  example?: unknown;
  additionalProperties?: boolean | SchemaObject;
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  description?: string;
}

// =============================================================================
// SHARED PARAMETER DEFINITIONS
// =============================================================================

const idPathParam: ParameterObject = {
  name: 'id',
  in: 'path',
  description: 'Unique identifier (UUID)',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

const searchQueryParam: ParameterObject = {
  name: 'search',
  in: 'query',
  description: 'Search term for filtering results',
  schema: { type: 'string' }
};

const sortByQueryParam: ParameterObject = {
  name: 'sortBy',
  in: 'query',
  description: 'Field to sort by',
  schema: { type: 'string' }
};

const sortDirQueryParam: ParameterObject = {
  name: 'sortDir',
  in: 'query',
  description: 'Sort direction',
  schema: { type: 'string', enum: ['asc', 'desc'] }
};

// =============================================================================
// SHARED RESPONSE DEFINITIONS
// =============================================================================

const errorResponse: ResponseObject = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' }
        },
        required: ['error']
      }
    }
  }
};

const successResponse: ResponseObject = {
  description: 'Success response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' }
        }
      }
    }
  }
};

// =============================================================================
// SCHEMA DEFINITIONS
// =============================================================================

const schemas: Record<string, SchemaObject> = {
  // === Common Schemas ===
  UUID: {
    type: 'string',
    format: 'uuid',
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000'
  },
  
  DateString: {
    type: 'string',
    format: 'date',
    description: 'ISO date string (YYYY-MM-DD)',
    example: '2026-01-09'
  },
  
  DateTimeString: {
    type: 'string',
    format: 'date-time',
    description: 'ISO datetime string',
    example: '2026-01-09T12:00:00.000Z'
  },
  
  PaginatedResponse: {
    type: 'object',
    properties: {
      data: { type: 'array', items: {} },
      total: { type: 'integer', description: 'Total count' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' }
    }
  },
  
  // === User & Auth Schemas ===
  User: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      role: { type: 'string', enum: ['admin', 'regulatory_lead', 'reviewer', 'author', 'viewer'] },
      department: { type: 'string', nullable: true },
      title: { type: 'string', nullable: true },
      mustChangePassword: { type: 'boolean' }
    },
    required: ['id', 'email', 'name', 'role']
  },
  
  LoginRequest: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' }
    },
    required: ['email', 'password']
  },
  
  SessionResponse: {
    type: 'object',
    properties: {
      authenticated: { type: 'boolean' },
      user: { $ref: '#/components/schemas/User', nullable: true },
      session: {
        type: 'object',
        nullable: true,
        properties: {
          id: { type: 'string' },
          expiresAt: { $ref: '#/components/schemas/DateTimeString' },
          refreshed: { type: 'boolean' }
        }
      },
      error: { type: 'string', nullable: true }
    }
  },
  
  // === Product Schemas ===
  Product: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      name: { type: 'string' },
      genericName: { type: 'string', nullable: true },
      therapeuticArea: { type: 'string' },
      indication: { type: 'string', nullable: true },
      phase: { type: 'string', enum: ['Discovery', 'Preclinical', 'Phase I', 'Phase II', 'Phase III', 'NDA/BLA', 'Approved'] },
      status: { type: 'string', enum: ['Active', 'On Hold', 'Discontinued', 'Approved'] },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'name', 'therapeuticArea', 'phase', 'status']
  },
  
  ProductCreate: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      genericName: { type: 'string' },
      therapeuticArea: { type: 'string' },
      indication: { type: 'string' },
      phase: { type: 'string', enum: ['Discovery', 'Preclinical', 'Phase I', 'Phase II', 'Phase III', 'NDA/BLA', 'Approved'] }
    },
    required: ['name', 'therapeuticArea']
  },
  
  // === HAQ Schemas ===
  HAQDiscipline: {
    type: 'string',
    enum: ['CMC', 'Clinical', 'Nonclinical', 'Biometrics', 'Pharmacology', 'Labeling', 'Administrative', 'Safety'],
    description: 'Regulatory discipline category'
  },
  
  HAQPriority: {
    type: 'string',
    enum: ['critical', 'major', 'minor'],
    description: 'Question priority level'
  },
  
  HAQStatus: {
    type: 'string',
    enum: ['new', 'open', 'in-progress', 'draft-ready', 'under-review', 'partially-responded', 'submitted', 'closed'],
    description: 'Question response status'
  },
  
  HAQSource: {
    type: 'string',
    enum: ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA', 'NMPA'],
    description: 'Health authority source'
  },
  
  QuestionType: {
    type: 'string',
    enum: ['IR', 'RTF', 'CRL', 'Day-74', 'Day-120', 'RSI', 'GMP', 'Pre-submission'],
    description: 'Type of regulatory question'
  },
  
  HAQuestion: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      applicationId: { type: 'string' },
      applicationNumber: { type: 'string' },
      productId: { type: 'string' },
      productName: { type: 'string' },
      questionNumber: { type: 'string' },
      questionText: { type: 'string' },
      discipline: { $ref: '#/components/schemas/HAQDiscipline' },
      subdiscipline: { type: 'string', nullable: true },
      ctdSection: { type: 'string', nullable: true },
      type: { $ref: '#/components/schemas/QuestionType' },
      source: { $ref: '#/components/schemas/HAQSource' },
      priority: { $ref: '#/components/schemas/HAQPriority' },
      receivedDate: { $ref: '#/components/schemas/DateString' },
      dueDate: { $ref: '#/components/schemas/DateString' },
      submittedDate: { $ref: '#/components/schemas/DateString', nullable: true },
      status: { $ref: '#/components/schemas/HAQStatus' },
      assignedTo: { type: 'string', nullable: true },
      assignedToName: { type: 'string', nullable: true },
      responseText: { type: 'string', nullable: true },
      tags: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'questionNumber', 'questionText', 'discipline', 'status', 'priority', 'receivedDate', 'dueDate']
  },
  
  HAQCreate: {
    type: 'object',
    properties: {
      subject: { type: 'string' },
      questionText: { type: 'string' },
      discipline: { $ref: '#/components/schemas/HAQDiscipline' },
      type: { $ref: '#/components/schemas/QuestionType' },
      source: { $ref: '#/components/schemas/HAQSource' },
      priority: { $ref: '#/components/schemas/HAQPriority' },
      receivedDate: { $ref: '#/components/schemas/DateString' },
      dueDate: { $ref: '#/components/schemas/DateString' },
      productId: { type: 'string' },
      applicationId: { type: 'string' },
      assignedTo: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } }
    }
  },
  
  HAQUpdate: {
    type: 'object',
    properties: {
      status: { $ref: '#/components/schemas/HAQStatus' },
      priority: { $ref: '#/components/schemas/HAQPriority' },
      assignedTo: { type: 'string', nullable: true },
      dueDate: { $ref: '#/components/schemas/DateString' },
      responseText: { type: 'string' },
      questionText: { type: 'string' },
      discipline: { $ref: '#/components/schemas/HAQDiscipline' },
      tags: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' }
    }
  },
  
  // === Safety Schemas ===
  SafetyReportType: {
    type: 'string',
    enum: ['ICSR', 'PSUR', 'DSUR', 'PBRER', 'FOLLOW_UP'],
    description: 'Type of safety report'
  },
  
  SafetyReportStatus: {
    type: 'string',
    enum: ['initial', 'in-progress', 'submitted', 'closed'],
    description: 'Safety case processing status'
  },
  
  CaseSeriousness: {
    type: 'string',
    enum: ['serious', 'non-serious'],
    description: 'Case seriousness classification'
  },
  
  CasePriority: {
    type: 'string',
    enum: ['routine', 'high', 'expedited-15-day', 'expedited-7-day', 'emergency'],
    description: 'Case processing priority'
  },
  
  SafetyReport: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      caseNumber: { type: 'string' },
      reportType: { $ref: '#/components/schemas/SafetyReportType' },
      seriousness: { $ref: '#/components/schemas/CaseSeriousness', nullable: true },
      patientInitials: { type: 'string', nullable: true },
      patientAge: { type: 'integer', nullable: true },
      patientSex: { type: 'string', nullable: true },
      eventDescription: { type: 'string', nullable: true },
      eventTermPreferred: { type: 'string', nullable: true },
      eventSOC: { type: 'string', nullable: true },
      onsetDate: { $ref: '#/components/schemas/DateString', nullable: true },
      reporterType: { type: 'string', enum: ['HCP', 'Consumer', 'Study', 'Literature', 'Authority', 'Other'], nullable: true },
      reporterCountry: { type: 'string', nullable: true },
      reportDate: { $ref: '#/components/schemas/DateString' },
      regulatoryDeadline: { $ref: '#/components/schemas/DateString', nullable: true },
      status: { $ref: '#/components/schemas/SafetyReportStatus' },
      priority: { $ref: '#/components/schemas/CasePriority' },
      expeditedReport: { type: 'boolean' },
      e2bSubmitted: { type: 'boolean' },
      productId: { type: 'string', nullable: true },
      productName: { type: 'string', nullable: true },
      studyId: { type: 'string', nullable: true },
      narrativeSummary: { type: 'string', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'caseNumber', 'reportType', 'status', 'reportDate']
  },
  
  SafetyReportCreate: {
    type: 'object',
    properties: {
      caseNumber: { type: 'string' },
      reportType: { $ref: '#/components/schemas/SafetyReportType' },
      seriousness: { $ref: '#/components/schemas/CaseSeriousness' },
      patientInitials: { type: 'string' },
      patientAge: { type: 'integer' },
      patientSex: { type: 'string' },
      eventDescription: { type: 'string' },
      eventTermPreferred: { type: 'string' },
      onsetDate: { $ref: '#/components/schemas/DateString' },
      reporterType: { type: 'string' },
      reporterCountry: { type: 'string' },
      reportDate: { $ref: '#/components/schemas/DateString' },
      priority: { $ref: '#/components/schemas/CasePriority' },
      expeditedReport: { type: 'boolean' },
      productId: { type: 'string' },
      studyId: { type: 'string' }
    }
  },
  
  // === Submission Schemas ===
  SubmissionType: {
    type: 'string',
    enum: ['NDA', 'BLA', 'MAA', 'J-NDA', 'IND', 'CTA', 'sNDA', 'sBLA', 'Type II Variation'],
    description: 'Regulatory submission type'
  },
  
  SubmissionStatus: {
    type: 'string',
    enum: ['Draft', 'In Progress', 'QC Review', 'Ready', 'Submitted', 'Under Review', 'Approved', 'CRL'],
    description: 'Submission processing status'
  },
  
  Region: {
    type: 'string',
    enum: ['US', 'EU', 'Japan', 'China', 'Canada', 'Australia', 'Brazil', 'UK', 'APAC', 'LATAM'],
    description: 'Regulatory region'
  },
  
  Submission: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      productId: { type: 'string' },
      productName: { type: 'string', nullable: true },
      applicationId: { type: 'string', nullable: true },
      applicationNumber: { type: 'string', nullable: true },
      sequenceNumber: { type: 'string' },
      type: { $ref: '#/components/schemas/SubmissionType' },
      region: { $ref: '#/components/schemas/Region' },
      agency: { type: 'string' },
      status: { $ref: '#/components/schemas/SubmissionStatus' },
      targetDate: { $ref: '#/components/schemas/DateString' },
      daysUntilTarget: { type: 'integer' },
      modulesComplete: { type: 'integer' },
      modulesTotal: { type: 'integer' },
      moduleProgress: { type: 'object', additionalProperties: { type: 'number' } },
      qcStatus: { type: 'string', enum: ['Not Started', 'In Progress', 'Passed', 'Failed'] },
      ectdStatus: { type: 'string', enum: ['Pending', 'Valid', 'Invalid'] },
      description: { type: 'string', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'sequenceNumber', 'type', 'region', 'status']
  },
  
  SubmissionCreate: {
    type: 'object',
    properties: {
      productId: { type: 'string' },
      applicationId: { type: 'string' },
      type: { $ref: '#/components/schemas/SubmissionType' },
      region: { $ref: '#/components/schemas/Region' },
      agency: { type: 'string' },
      targetDate: { $ref: '#/components/schemas/DateString' },
      description: { type: 'string' }
    },
    required: ['productId']
  },
  
  // === Document Schemas ===
  DocumentCategory: {
    type: 'string',
    enum: ['SOP', 'WI', 'Form', 'Template', 'Policy', 'Specification', 'Report', 'Protocol', 'Other'],
    description: 'Document category'
  },
  
  DocumentStatus: {
    type: 'string',
    enum: ['Draft', 'In Review', 'Approved', 'Effective', 'Superseded', 'Archived'],
    description: 'Document lifecycle status'
  },
  
  Document: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      documentNumber: { type: 'string' },
      title: { type: 'string' },
      category: { $ref: '#/components/schemas/DocumentCategory' },
      version: { type: 'string' },
      status: { $ref: '#/components/schemas/DocumentStatus' },
      effectiveDate: { $ref: '#/components/schemas/DateString', nullable: true },
      expirationDate: { $ref: '#/components/schemas/DateString', nullable: true },
      ownerId: { type: 'string', nullable: true },
      ownerName: { type: 'string', nullable: true },
      department: { type: 'string', nullable: true },
      fileSize: { type: 'integer', nullable: true },
      fileUrl: { type: 'string', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'documentNumber', 'title', 'category', 'version', 'status']
  },
  
  // === Study Schemas ===
  StudyPhase: {
    type: 'string',
    enum: ['Phase I', 'Phase I/II', 'Phase II', 'Phase II/III', 'Phase III', 'Phase IV'],
    description: 'Clinical study phase'
  },
  
  StudyStatus: {
    type: 'string',
    enum: ['Planning', 'Recruiting', 'Active', 'Completed', 'Terminated', 'Suspended'],
    description: 'Study execution status'
  },
  
  Study: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      studyId: { type: 'string' },
      title: { type: 'string' },
      phase: { $ref: '#/components/schemas/StudyPhase' },
      status: { $ref: '#/components/schemas/StudyStatus' },
      indication: { type: 'string', nullable: true },
      targetEnrollment: { type: 'integer', nullable: true },
      currentEnrollment: { type: 'integer', nullable: true },
      startDate: { $ref: '#/components/schemas/DateString', nullable: true },
      endDate: { $ref: '#/components/schemas/DateString', nullable: true },
      productId: { type: 'string', nullable: true },
      productName: { type: 'string', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'studyId', 'title', 'phase', 'status']
  },
  
  // === Application Schemas ===
  ApplicationType: {
    type: 'string',
    enum: ['IND', 'NDA', 'BLA', 'MAA', 'CTA', 'J_NDA'],
    description: 'Regulatory application type'
  },
  
  Application: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      applicationNumber: { type: 'string' },
      type: { $ref: '#/components/schemas/ApplicationType' },
      status: { type: 'string' },
      region: { type: 'string' },
      agency: { type: 'string' },
      productId: { type: 'string', nullable: true },
      productName: { type: 'string', nullable: true },
      filingDate: { $ref: '#/components/schemas/DateString', nullable: true },
      approvalDate: { $ref: '#/components/schemas/DateString', nullable: true },
      createdAt: { $ref: '#/components/schemas/DateTimeString' },
      updatedAt: { $ref: '#/components/schemas/DateTimeString' }
    },
    required: ['id', 'applicationNumber', 'type', 'status']
  },
  
  // === Audit Schemas ===
  AuditEntry: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      timestamp: { $ref: '#/components/schemas/DateTimeString' },
      userId: { type: 'string', nullable: true },
      userName: { type: 'string', nullable: true },
      action: { type: 'string' },
      entityType: { type: 'string' },
      entityId: { type: 'string', nullable: true },
      details: { type: 'object', additionalProperties: true },
      ipAddress: { type: 'string', nullable: true },
      userAgent: { type: 'string', nullable: true },
      checksum: { type: 'string' }
    },
    required: ['id', 'timestamp', 'action', 'entityType', 'checksum']
  },
  
  // === Gateway Schemas ===
  GatewayType: {
    type: 'string',
    enum: ['FDA_ESG', 'EMA_CESP', 'PMDA_GATEWAY'],
    description: 'Regulatory gateway type'
  },
  
  GatewaySubmission: {
    type: 'object',
    properties: {
      id: { $ref: '#/components/schemas/UUID' },
      gateway: { $ref: '#/components/schemas/GatewayType' },
      submissionId: { type: 'string' },
      status: { type: 'string', enum: ['pending', 'submitted', 'acknowledged', 'rejected', 'error'] },
      trackingNumber: { type: 'string', nullable: true },
      submittedAt: { $ref: '#/components/schemas/DateTimeString', nullable: true },
      acknowledgedAt: { $ref: '#/components/schemas/DateTimeString', nullable: true },
      errorMessage: { type: 'string', nullable: true }
    },
    required: ['id', 'gateway', 'submissionId', 'status']
  },
  
  // === Upload Schema ===
  UploadResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      fileId: { type: 'string' },
      fileName: { type: 'string' },
      fileSize: { type: 'integer' },
      mimeType: { type: 'string' },
      url: { type: 'string' }
    },
    required: ['success', 'fileId', 'fileName']
  }
};

// =============================================================================
// PATH DEFINITIONS
// =============================================================================

const paths: Record<string, Record<string, PathOperation>> = {
  // === Authentication ===
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'User login',
      description: 'Authenticate user with email and password. Sets HTTP-only session cookie.',
      operationId: 'login',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  user: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        '401': errorResponse
      },
      security: []
    }
  },
  
  '/api/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'User logout',
      description: 'End user session and clear authentication cookie.',
      operationId: 'logout',
      responses: {
        '200': successResponse
      }
    }
  },
  
  '/api/auth/session': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current session',
      description: 'Returns current authenticated user and session info. Auto-refreshes tokens near expiry.',
      operationId: 'getSession',
      responses: {
        '200': {
          description: 'Session info',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SessionResponse' } }
          }
        }
      }
    }
  },
  
  // === Products ===
  '/api/products': {
    get: {
      tags: ['Products'],
      summary: 'List products',
      description: 'Retrieve all pharmaceutical products with optional filtering.',
      operationId: 'listProducts',
      parameters: [
        searchQueryParam,
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'phase', in: 'query', schema: { type: 'string' } },
        { name: 'therapeuticArea', in: 'query', schema: { type: 'string' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of products',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                  total: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Products'],
      summary: 'Create product',
      description: 'Create a new pharmaceutical product.',
      operationId: 'createProduct',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ProductCreate' } }
        }
      },
      responses: {
        '201': {
          description: 'Product created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Get product by ID',
      operationId: 'getProduct',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Product details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Products'],
      summary: 'Update product',
      operationId: 'updateProduct',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ProductCreate' } }
        }
      },
      responses: {
        '200': {
          description: 'Product updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Product' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Products'],
      summary: 'Delete product',
      operationId: 'deleteProduct',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  // === HAQs ===
  '/api/haqs': {
    get: {
      tags: ['HAQ Intelligence'],
      summary: 'List health authority questions',
      description: 'Retrieve HAQs with filtering by status, priority, discipline, etc.',
      operationId: 'listHAQs',
      parameters: [
        searchQueryParam,
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/HAQStatus' } },
        { name: 'priority', in: 'query', schema: { $ref: '#/components/schemas/HAQPriority' } },
        { name: 'productId', in: 'query', schema: { type: 'string' } },
        { name: 'applicationId', in: 'query', schema: { type: 'string' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of HAQs',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/HAQuestion' } },
                  total: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['HAQ Intelligence'],
      summary: 'Create HAQ',
      description: 'Create a new health authority question record.',
      operationId: 'createHAQ',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HAQCreate' } }
        }
      },
      responses: {
        '201': {
          description: 'HAQ created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/HAQuestion' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/haqs/{id}': {
    get: {
      tags: ['HAQ Intelligence'],
      summary: 'Get HAQ by ID',
      description: 'Retrieve HAQ details including response draft history.',
      operationId: 'getHAQ',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'HAQ details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/HAQuestion' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['HAQ Intelligence'],
      summary: 'Update HAQ',
      description: 'Update HAQ status, assignment, response, or other fields.',
      operationId: 'updateHAQ',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/HAQUpdate' } }
        }
      },
      responses: {
        '200': {
          description: 'HAQ updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/HAQuestion' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['HAQ Intelligence'],
      summary: 'Delete HAQ',
      operationId: 'deleteHAQ',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/haqs/{id}/drafts': {
    get: {
      tags: ['HAQ Intelligence'],
      summary: 'List HAQ response drafts',
      operationId: 'listHAQDrafts',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'List of drafts',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['HAQ Intelligence'],
      summary: 'Create HAQ response draft',
      operationId: 'createHAQDraft',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                aiGenerated: { type: 'boolean' }
              },
              required: ['content']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Draft created',
          content: {
            'application/json': { schema: { type: 'object' } }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  // === Safety ===
  '/api/safety': {
    get: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'List safety reports',
      description: 'Retrieve safety/adverse event reports with filtering.',
      operationId: 'listSafetyReports',
      parameters: [
        searchQueryParam,
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/SafetyReportStatus' } },
        { name: 'reportType', in: 'query', schema: { $ref: '#/components/schemas/SafetyReportType' } },
        { name: 'seriousness', in: 'query', schema: { $ref: '#/components/schemas/CaseSeriousness' } },
        { name: 'productId', in: 'query', schema: { type: 'string' } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of safety reports',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/SafetyReport' } },
                  total: { type: 'integer' },
                  stats: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer' },
                      serious: { type: 'integer' },
                      expedited: { type: 'integer' },
                      pending: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Create safety report',
      description: 'Create a new ICSR or safety report.',
      operationId: 'createSafetyReport',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SafetyReportCreate' } }
        }
      },
      responses: {
        '201': {
          description: 'Safety report created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/SafetyReport' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/safety/{id}': {
    get: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Get safety report by ID',
      operationId: 'getSafetyReport',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Safety report details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/SafetyReport' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Update safety report',
      operationId: 'updateSafetyReport',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SafetyReportCreate' } }
        }
      },
      responses: {
        '200': {
          description: 'Safety report updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/SafetyReport' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Delete safety report',
      operationId: 'deleteSafetyReport',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/safety/draft': {
    post: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Generate AI narrative draft',
      description: 'Generate AI-assisted case narrative from structured data.',
      operationId: 'generateSafetyNarrativeDraft',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                caseId: { type: 'string' },
                caseData: { type: 'object' }
              },
              required: ['caseId']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Generated narrative',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  narrative: { type: 'string' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/safety/narrative': {
    post: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Save case narrative',
      operationId: 'saveSafetyNarrative',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                caseId: { type: 'string' },
                narrative: { type: 'string' }
              },
              required: ['caseId', 'narrative']
            }
          }
        }
      },
      responses: {
        '200': successResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/safety/e2b-xml': {
    post: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Generate E2B XML',
      description: 'Generate ICH E2B(R3) XML from case data for regulatory submission.',
      operationId: 'generateE2BXML',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                caseId: { type: 'string' }
              },
              required: ['caseId']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'E2B XML generated',
          content: {
            'application/xml': { schema: { type: 'string' } }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/safety/workflow': {
    post: {
      tags: ['Safety & Pharmacovigilance'],
      summary: 'Advance case workflow',
      operationId: 'advanceSafetyWorkflow',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                caseId: { type: 'string' },
                action: { type: 'string', enum: ['submit', 'approve', 'reject', 'reopen'] }
              },
              required: ['caseId', 'action']
            }
          }
        }
      },
      responses: {
        '200': successResponse,
        '500': errorResponse
      }
    }
  },
  
  // === Submissions ===
  '/api/submissions': {
    get: {
      tags: ['Submissions'],
      summary: 'List submissions',
      description: 'Retrieve regulatory submissions with filtering.',
      operationId: 'listSubmissions',
      parameters: [
        searchQueryParam,
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/SubmissionStatus' } },
        { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/SubmissionType' } },
        { name: 'applicationId', in: 'query', schema: { type: 'string' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of submissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Submission' } },
                  total: { type: 'integer' },
                  stats: { type: 'object' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Submissions'],
      summary: 'Create submission',
      operationId: 'createSubmission',
      requestBody: {
        required: true,
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SubmissionCreate' } }
        }
      },
      responses: {
        '201': {
          description: 'Submission created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Submission' }
                }
              }
            }
          }
        },
        '400': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/{id}': {
    get: {
      tags: ['Submissions'],
      summary: 'Get submission by ID',
      operationId: 'getSubmission',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Submission details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Submission' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Submissions'],
      summary: 'Update submission',
      operationId: 'updateSubmission',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/SubmissionCreate' } }
        }
      },
      responses: {
        '200': {
          description: 'Submission updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Submission' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Submissions'],
      summary: 'Delete submission',
      operationId: 'deleteSubmission',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/{id}/documents': {
    get: {
      tags: ['Submissions'],
      summary: 'List submission documents',
      operationId: 'listSubmissionDocuments',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'List of documents',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Submissions'],
      summary: 'Add document to submission',
      operationId: 'addSubmissionDocument',
      parameters: [idPathParam],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                documentId: { type: 'string' },
                module: { type: 'string' },
                section: { type: 'string' }
              },
              required: ['documentId']
            }
          }
        }
      },
      responses: {
        '201': successResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/{id}/validate-pdfs': {
    post: {
      tags: ['Submissions'],
      summary: 'Validate submission PDFs',
      description: 'Run PDF/A compliance and eCTD specification validation.',
      operationId: 'validateSubmissionPDFs',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Validation results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  valid: { type: 'boolean' },
                  errors: { type: 'array', items: { type: 'object' } },
                  warnings: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/{id}/generate-ectd': {
    post: {
      tags: ['Submissions'],
      summary: 'Generate eCTD package',
      description: 'Generate complete eCTD submission package with XML backbone.',
      operationId: 'generateECTDPackage',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'eCTD package generated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  packageUrl: { type: 'string' },
                  validationStatus: { type: 'string' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  // === Submission Queue ===
  '/api/submissions/queue': {
    get: {
      tags: ['Submission Queue'],
      summary: 'List queue items',
      operationId: 'listQueueItems',
      responses: {
        '200': {
          description: 'Queue items',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Submission Queue'],
      summary: 'Add to queue',
      operationId: 'addToQueue',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                submissionId: { type: 'string' },
                priority: { type: 'string' }
              },
              required: ['submissionId']
            }
          }
        }
      },
      responses: {
        '201': successResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/queue/{itemId}': {
    get: {
      tags: ['Submission Queue'],
      summary: 'Get queue item',
      operationId: 'getQueueItem',
      parameters: [{ ...idPathParam, name: 'itemId' }],
      responses: {
        '200': {
          description: 'Queue item details',
          content: {
            'application/json': { schema: { type: 'object' } }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Submission Queue'],
      summary: 'Remove from queue',
      operationId: 'removeFromQueue',
      parameters: [{ ...idPathParam, name: 'itemId' }],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/queue/{itemId}/retry': {
    post: {
      tags: ['Submission Queue'],
      summary: 'Retry queue item',
      operationId: 'retryQueueItem',
      parameters: [{ ...idPathParam, name: 'itemId' }],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/queue/validate': {
    post: {
      tags: ['Submission Queue'],
      summary: 'Validate queue submissions',
      operationId: 'validateQueueSubmissions',
      responses: {
        '200': {
          description: 'Validation results',
          content: {
            'application/json': { schema: { type: 'object' } }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/submissions/queue/publish': {
    post: {
      tags: ['Submission Queue'],
      summary: 'Publish queue submissions',
      operationId: 'publishQueueSubmissions',
      responses: {
        '200': {
          description: 'Publish results',
          content: {
            'application/json': { schema: { type: 'object' } }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  // === Documents ===
  '/api/documents': {
    get: {
      tags: ['Documents'],
      summary: 'List documents',
      operationId: 'listDocuments',
      parameters: [
        searchQueryParam,
        { name: 'category', in: 'query', schema: { $ref: '#/components/schemas/DocumentCategory' } },
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/DocumentStatus' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of documents',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
                  total: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Documents'],
      summary: 'Create document',
      operationId: 'createDocument',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { $ref: '#/components/schemas/DocumentCategory' },
                department: { type: 'string' }
              },
              required: ['title', 'category']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Document created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Document' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/documents/{id}': {
    get: {
      tags: ['Documents'],
      summary: 'Get document by ID',
      operationId: 'getDocument',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Document details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Document' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Documents'],
      summary: 'Update document',
      operationId: 'updateDocument',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } }
        }
      },
      responses: {
        '200': {
          description: 'Document updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Document' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Documents'],
      summary: 'Delete document',
      operationId: 'deleteDocument',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  // === Studies ===
  '/api/studies': {
    get: {
      tags: ['Studies'],
      summary: 'List studies',
      operationId: 'listStudies',
      parameters: [
        searchQueryParam,
        { name: 'phase', in: 'query', schema: { $ref: '#/components/schemas/StudyPhase' } },
        { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/StudyStatus' } },
        { name: 'productId', in: 'query', schema: { type: 'string' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of studies',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Study' } },
                  total: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Studies'],
      summary: 'Create study',
      operationId: 'createStudy',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                phase: { $ref: '#/components/schemas/StudyPhase' },
                indication: { type: 'string' },
                productId: { type: 'string' }
              },
              required: ['title', 'phase']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Study created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Study' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/studies/{id}': {
    get: {
      tags: ['Studies'],
      summary: 'Get study by ID',
      operationId: 'getStudy',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Study details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Study' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Studies'],
      summary: 'Update study',
      operationId: 'updateStudy',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } }
        }
      },
      responses: {
        '200': {
          description: 'Study updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Study' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Studies'],
      summary: 'Delete study',
      operationId: 'deleteStudy',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  // === Applications ===
  '/api/applications': {
    get: {
      tags: ['Applications'],
      summary: 'List applications',
      operationId: 'listApplications',
      parameters: [
        searchQueryParam,
        { name: 'type', in: 'query', schema: { $ref: '#/components/schemas/ApplicationType' } },
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'productId', in: 'query', schema: { type: 'string' } },
        sortByQueryParam,
        sortDirQueryParam
      ],
      responses: {
        '200': {
          description: 'List of applications',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Application' } },
                  total: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    },
    post: {
      tags: ['Applications'],
      summary: 'Create application',
      operationId: 'createApplication',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                type: { $ref: '#/components/schemas/ApplicationType' },
                region: { type: 'string' },
                agency: { type: 'string' },
                productId: { type: 'string' }
              },
              required: ['type', 'productId']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Application created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Application' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/applications/{id}': {
    get: {
      tags: ['Applications'],
      summary: 'Get application by ID',
      operationId: 'getApplication',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Application details',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Application' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    patch: {
      tags: ['Applications'],
      summary: 'Update application',
      operationId: 'updateApplication',
      parameters: [idPathParam],
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } }
        }
      },
      responses: {
        '200': {
          description: 'Application updated',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/Application' }
                }
              }
            }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    },
    delete: {
      tags: ['Applications'],
      summary: 'Delete application',
      operationId: 'deleteApplication',
      parameters: [idPathParam],
      responses: {
        '200': successResponse,
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  '/api/applications/{id}/sequence': {
    get: {
      tags: ['Applications'],
      summary: 'Get application submission sequence',
      operationId: 'getApplicationSequence',
      parameters: [idPathParam],
      responses: {
        '200': {
          description: 'Submission sequence',
          content: {
            'application/json': { schema: { type: 'object' } }
          }
        },
        '404': errorResponse,
        '500': errorResponse
      }
    }
  },
  
  // === Audit ===
  '/api/audit': {
    get: {
      tags: ['Audit Trail'],
      summary: 'List audit entries',
      description: 'Retrieve audit log entries with filtering. Supports 21 CFR Part 11 compliance.',
      operationId: 'listAuditEntries',
      parameters: [
        { name: 'entityType', in: 'query', schema: { type: 'string' } },
        { name: 'action', in: 'query', schema: { type: 'string' } },
        { name: 'userId', in: 'query', schema: { type: 'string' } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'page', in: 'query', schema: { type: 'integer' } },
        { name: 'pageSize', in: 'query', schema: { type: 'integer' } }
      ],
      responses: {
        '200': {
          description: 'List of audit entries',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/AuditEntry' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/audit/entity/{type}/{id}': {
    get: {
      tags: ['Audit Trail'],
      summary: 'Get audit history for entity',
      operationId: 'getEntityAuditHistory',
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string' } },
        idPathParam
      ],
      responses: {
        '200': {
          description: 'Entity audit history',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/AuditEntry' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/audit/stats': {
    get: {
      tags: ['Audit Trail'],
      summary: 'Get audit statistics',
      operationId: 'getAuditStats',
      responses: {
        '200': {
          description: 'Audit statistics',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  totalEntries: { type: 'integer' },
                  byAction: { type: 'object' },
                  byEntityType: { type: 'object' },
                  recentActivity: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/audit/export': {
    get: {
      tags: ['Audit Trail'],
      summary: 'Export audit log',
      description: 'Export audit entries as CSV for compliance reporting.',
      operationId: 'exportAuditLog',
      parameters: [
        { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'pdf'] } },
        { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
        { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } }
      ],
      responses: {
        '200': {
          description: 'Exported audit log',
          content: {
            'text/csv': { schema: { type: 'string' } },
            'application/pdf': { schema: { type: 'string', format: 'binary' } }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  // === Gateways ===
  '/api/gateways': {
    get: {
      tags: ['Regulatory Gateways'],
      summary: 'List gateway configurations',
      operationId: 'listGateways',
      responses: {
        '200': {
          description: 'Gateway configurations',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { type: 'object' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/gateways/submit': {
    post: {
      tags: ['Regulatory Gateways'],
      summary: 'Submit to gateway',
      description: 'Submit eCTD package to regulatory gateway (FDA ESG, EMA CESP).',
      operationId: 'submitToGateway',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                submissionId: { type: 'string' },
                gateway: { $ref: '#/components/schemas/GatewayType' }
              },
              required: ['submissionId', 'gateway']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Submission initiated',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GatewaySubmission' }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  '/api/gateways/history': {
    get: {
      tags: ['Regulatory Gateways'],
      summary: 'Get gateway submission history',
      operationId: 'getGatewayHistory',
      parameters: [
        { name: 'gateway', in: 'query', schema: { $ref: '#/components/schemas/GatewayType' } },
        { name: 'submissionId', in: 'query', schema: { type: 'string' } }
      ],
      responses: {
        '200': {
          description: 'Gateway submission history',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/GatewaySubmission' } }
                }
              }
            }
          }
        },
        '500': errorResponse
      }
    }
  },
  
  // === Upload ===
  '/api/upload': {
    post: {
      tags: ['File Upload'],
      summary: 'Upload file',
      description: 'Upload file to cloud storage (Cloudflare R2).',
      operationId: 'uploadFile',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: { type: 'string', format: 'binary' },
                folder: { type: 'string' }
              },
              required: ['file']
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'File uploaded',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UploadResponse' } }
          }
        },
        '400': errorResponse,
        '500': errorResponse
      }
    }
  }
};

// =============================================================================
// GENERATE OPENAPI SPEC
// =============================================================================

export function generateOpenAPISpec(): OpenAPISpec {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Ligature IDOP API',
      description: `
# Ligature Intelligent Development & Operations Platform API

The Ligature API provides programmatic access to the pharmaceutical regulatory intelligence platform.

## Authentication

All API endpoints (except login) require authentication via HTTP-only session cookie.
Authenticate by calling \`POST /api/auth/login\` with valid credentials.

## Rate Limiting

API requests are rate-limited to 100 requests per minute per user.

## Error Handling

All errors return JSON with an \`error\` field describing the issue.

## Versioning

API version is tied to the application version. Breaking changes will be documented.

## Compliance

This API supports 21 CFR Part 11 compliance requirements including:
- Tamper-evident audit trails
- Electronic signatures
- User authentication and authorization
      `.trim(),
      version: APP_VERSION,
      contact: {
        name: 'Ligature API Support',
        url: 'https://ligature.io/support'
      },
      license: {
        name: 'Proprietary',
        url: 'https://ligature.io/terms'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.ligature.io',
        description: 'Production server'
      }
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'Products', description: 'Pharmaceutical product management' },
      { name: 'HAQ Intelligence', description: 'Health Authority Question management and AI-assisted responses' },
      { name: 'Safety & Pharmacovigilance', description: 'Adverse event reporting and safety case management' },
      { name: 'Submissions', description: 'Regulatory submission management and eCTD packaging' },
      { name: 'Submission Queue', description: 'Submission publishing queue management' },
      { name: 'Documents', description: 'Document control and version management' },
      { name: 'Studies', description: 'Clinical study management' },
      { name: 'Applications', description: 'Regulatory application management' },
      { name: 'Audit Trail', description: '21 CFR Part 11 compliant audit logging' },
      { name: 'Regulatory Gateways', description: 'FDA ESG and EMA CESP gateway integration' },
      { name: 'File Upload', description: 'File upload and storage management' },
      ...extendedTags,
    ],
    paths: { ...paths, ...extendedPaths },
    components: {
      schemas,
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'ligature-session',
          description: 'HTTP-only session cookie set by login endpoint'
        }
      },
      responses: {
        NotFound: errorResponse,
        ServerError: errorResponse,
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Authentication required' }
                }
              }
            }
          }
        }
      }
    },
    security: [
      { sessionAuth: [] }
    ]
  };
}

// Export for direct usage
export const openAPISpec = generateOpenAPISpec();
