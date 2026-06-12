
/**
 * Publishing Orchestrator Service
 * 
 * Chains publishing tools into an end-to-end workflow:
 * 1. Validate PDFs (eCTD compliance)
 * 2. Detect & auto-link hyperlinks
 * 3. Generate eCTD backbone XML
 * 4. Create submission package
 * 5. Submit to gateway (optional)
 * 
 * This is the "IDOP" thesis in action - not just tools, but orchestrated processes.
 */

import { ECTDDocument } from '@/types/ectd';
import { RegionalSpec, PDFValidationResult, ectdPDFValidator } from './ectd-pdf-validator';
import { hyperlinkService, DetectedReference, HyperlinkValidationResult } from './hyperlink-service';
import { 
  ectdBackboneGenerator, 
  SubmissionEnvelope, 
  RegionalInfo, 
  StudyTaggingInfo,
  BackboneFiles 
} from './ectd-backbone-generator';
import { gatewayService, GatewayType, GatewaySubmissionResult } from './gateway-service';
import { auditService } from './audit-service';

// ============================================================================
// TYPES
// ============================================================================

export type WorkflowStepId = 
  | 'pdf-validation'
  | 'hyperlink-detection'
  | 'hyperlink-linking'
  | 'hyperlink-validation'
  | 'backbone-generation'
  | 'backbone-validation'
  | 'package-creation'
  | 'gateway-submission';

export type WorkflowStepStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'warning';

export interface WorkflowStep {
  id: WorkflowStepId;
  name: string;
  description: string;
  status: WorkflowStepStatus;
  order: number;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;  // milliseconds
  progress?: number;  // 0-100
  result?: WorkflowStepResult;
  error?: string;
  canRetry: boolean;
  isOptional: boolean;
}

export interface WorkflowStepResult {
  success: boolean;
  summary: string;
  details?: Record<string, unknown>;
  warnings?: string[];
  errors?: string[];
}

export interface PublishingWorkflowConfig {
  // Regions to validate against
  regions: RegionalSpec[];
  
  // Hyperlink options
  autoLinkMinConfidence: number;
  autoLinkTypes?: DetectedReference['type'][];
  
  // Backbone options
  envelope: SubmissionEnvelope;
  regionalInfo?: RegionalInfo;
  studies?: StudyTaggingInfo[];
  
  // Gateway options
  submitToGateway: boolean;
  gateway?: GatewayType;
  
  // Workflow options
  stopOnError: boolean;
  skipOptionalOnWarning: boolean;
  parallelValidation: boolean;
}

export interface PublishingWorkflowState {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  steps: WorkflowStep[];
  currentStepIndex: number;
  config: PublishingWorkflowConfig;
  
  // Timing
  startedAt?: Date;
  completedAt?: Date;
  totalDuration?: number;
  
  // Results aggregated from steps
  documentsProcessed: number;
  totalDocuments: number;
  errorsFound: number;
  warningsFound: number;
  
  // Generated outputs
  pdfValidationResults?: PDFValidationResult[];
  detectedReferences?: DetectedReference[];
  linkValidationResults?: HyperlinkValidationResult[];
  backboneFiles?: BackboneFiles;
  gatewayResult?: GatewaySubmissionResult;
}

export type WorkflowEventType = 
  | 'workflow-started'
  | 'workflow-completed'
  | 'workflow-failed'
  | 'workflow-cancelled'
  | 'step-started'
  | 'step-progress'
  | 'step-completed'
  | 'step-failed'
  | 'step-skipped';

export interface WorkflowEvent {
  type: WorkflowEventType;
  timestamp: Date;
  stepId?: WorkflowStepId;
  progress?: number;
  message?: string;
  data?: Record<string, unknown>;
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void;

// ============================================================================
// DEFAULT WORKFLOW STEPS
// ============================================================================

const DEFAULT_WORKFLOW_STEPS: Omit<WorkflowStep, 'status' | 'result'>[] = [
  {
    id: 'pdf-validation',
    name: 'PDF Validation',
    description: 'Validate all PDFs for eCTD compliance (fonts, bookmarks, page size, etc.)',
    order: 1,
    canRetry: true,
    isOptional: false,
  },
  {
    id: 'hyperlink-detection',
    name: 'Hyperlink Detection',
    description: 'Scan documents for linkable references (tables, figures, sections)',
    order: 2,
    canRetry: true,
    isOptional: true,
  },
  {
    id: 'hyperlink-linking',
    name: 'Auto-Link References',
    description: 'Automatically create hyperlinks for detected references',
    order: 3,
    canRetry: true,
    isOptional: true,
  },
  {
    id: 'hyperlink-validation',
    name: 'Hyperlink Validation',
    description: 'Validate all hyperlinks point to valid targets',
    order: 4,
    canRetry: true,
    isOptional: true,
  },
  {
    id: 'backbone-generation',
    name: 'Backbone Generation',
    description: 'Generate eCTD XML backbone (index.xml, regional XML)',
    order: 5,
    canRetry: true,
    isOptional: false,
  },
  {
    id: 'backbone-validation',
    name: 'Backbone Validation',
    description: 'Validate generated XML against DTD specifications',
    order: 6,
    canRetry: true,
    isOptional: false,
  },
  {
    id: 'package-creation',
    name: 'Package Creation',
    description: 'Create final submission package with checksums',
    order: 7,
    canRetry: true,
    isOptional: false,
  },
  {
    id: 'gateway-submission',
    name: 'Gateway Submission',
    description: 'Submit package to regulatory gateway (FDA ESG, EMA CESP)',
    order: 8,
    canRetry: true,
    isOptional: true,
  },
];

// ============================================================================
// ORCHESTRATOR CLASS
// ============================================================================

class PublishingOrchestrator {
  private workflows: Map<string, PublishingWorkflowState> = new Map();
  private eventHandlers: Map<string, Set<WorkflowEventHandler>> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Create a new publishing workflow
   */
  createWorkflow(
    name: string,
    config: PublishingWorkflowConfig
  ): PublishingWorkflowState {
    const id = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const correlationId = auditService.generateCorrelationId();
    
    // Initialize steps based on config
    const steps: WorkflowStep[] = DEFAULT_WORKFLOW_STEPS.map(step => ({
      ...step,
      status: 'pending' as WorkflowStepStatus,
      // Skip gateway submission if not configured
      ...(step.id === 'gateway-submission' && !config.submitToGateway 
        ? { status: 'skipped' as WorkflowStepStatus } 
        : {}),
    }));

    const workflow: PublishingWorkflowState = {
      id,
      name,
      status: 'idle',
      steps,
      currentStepIndex: -1,
      config,
      documentsProcessed: 0,
      totalDocuments: 0,
      errorsFound: 0,
      warningsFound: 0,
    };

    // Store correlation ID for audit trail
    (workflow as any)._auditCorrelationId = correlationId;

    this.workflows.set(id, workflow);
    
    // Log workflow creation
    auditService.logWorkflowEvent({
      workflowId: id,
      workflowName: name,
      action: 'workflow.created',
      summary: `Created publishing workflow "${name}" for ${config.regions.join(', ')} region(s)`,
      details: `Auto-link threshold: ${config.autoLinkMinConfidence}%, Gateway: ${config.submitToGateway ? config.gateway : 'None'}`,
      correlationId,
      metadata: {
        regions: config.regions,
        autoLinkMinConfidence: config.autoLinkMinConfidence,
        submitToGateway: config.submitToGateway,
        gateway: config.gateway,
      },
    });
    
    return workflow;
  }

  /**
   * Execute the full publishing workflow
   */
  async executeWorkflow(
    workflowId: string,
    documents: ECTDDocument[]
  ): Promise<PublishingWorkflowState> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Get correlation ID for audit trail
    const correlationId = (workflow as any)._auditCorrelationId || auditService.generateCorrelationId();

    // Set up abort controller
    const abortController = new AbortController();
    this.abortControllers.set(workflowId, abortController);

    // Update workflow state
    workflow.status = 'running';
    workflow.startedAt = new Date();
    workflow.totalDocuments = documents.length;

    this.emitEvent(workflowId, {
      type: 'workflow-started',
      timestamp: new Date(),
      message: `Starting publishing workflow with ${documents.length} documents`,
    });

    // Log workflow started
    auditService.logWorkflowEvent({
      workflowId,
      workflowName: workflow.name,
      action: 'workflow.started',
      summary: `Started publishing workflow "${workflow.name}" with ${documents.length} documents`,
      correlationId,
      metadata: {
        documentCount: documents.length,
        documentIds: documents.map(d => d.id),
      },
    });

    try {
      // Execute each step in sequence
      for (let i = 0; i < workflow.steps.length; i++) {
        // Check for abort
        if (abortController.signal.aborted) {
          workflow.status = 'cancelled';
          break;
        }

        const step = workflow.steps[i];
        
        // Skip already skipped steps
        if (step.status === 'skipped') {
          continue;
        }

        workflow.currentStepIndex = i;
        
        try {
          await this.executeStep(workflowId, step, documents, correlationId);
          
          // Check if we should stop on error
          if (step.status === 'failed' && workflow.config.stopOnError && !step.isOptional) {
            workflow.status = 'failed';
            break;
          }
          
          // Skip remaining optional steps if this one had warnings
          if (step.status === 'warning' && workflow.config.skipOptionalOnWarning) {
            // Skip next optional steps
            for (let j = i + 1; j < workflow.steps.length; j++) {
              if (workflow.steps[j].isOptional) {
                workflow.steps[j].status = 'skipped';
              }
            }
          }
        } catch (error) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : 'Unknown error';
          workflow.errorsFound++;
          
          this.emitEvent(workflowId, {
            type: 'step-failed',
            timestamp: new Date(),
            stepId: step.id,
            message: step.error,
          });

          // Log step failure
          auditService.logWorkflowEvent({
            workflowId,
            workflowName: workflow.name,
            action: 'workflow.step.failed',
            stepId: step.id,
            stepName: step.name,
            summary: `Step "${step.name}" failed: ${step.error}`,
            correlationId,
            metadata: { error: step.error },
          });

          if (workflow.config.stopOnError && !step.isOptional) {
            workflow.status = 'failed';
            break;
          }
        }
      }

      // Finalize workflow
      if (workflow.status === 'running') {
        const hasFailures = workflow.steps.some(s => s.status === 'failed' && !s.isOptional);
        workflow.status = hasFailures ? 'failed' : 'completed';
      }

      workflow.completedAt = new Date();
      workflow.totalDuration = workflow.completedAt.getTime() - workflow.startedAt!.getTime();

      this.emitEvent(workflowId, {
        type: workflow.status === 'completed' ? 'workflow-completed' : 'workflow-failed',
        timestamp: new Date(),
        message: `Workflow ${workflow.status} in ${workflow.totalDuration}ms`,
        data: {
          documentsProcessed: workflow.documentsProcessed,
          errorsFound: workflow.errorsFound,
          warningsFound: workflow.warningsFound,
        },
      });

      // Log workflow completion/failure
      auditService.logWorkflowEvent({
        workflowId,
        workflowName: workflow.name,
        action: workflow.status === 'completed' ? 'workflow.completed' : 'workflow.failed',
        summary: workflow.status === 'completed'
          ? `Publishing workflow "${workflow.name}" completed successfully in ${Math.round(workflow.totalDuration / 1000)}s`
          : `Publishing workflow "${workflow.name}" failed after ${Math.round(workflow.totalDuration / 1000)}s`,
        details: `Documents: ${workflow.documentsProcessed}/${workflow.totalDocuments}, Errors: ${workflow.errorsFound}, Warnings: ${workflow.warningsFound}`,
        correlationId,
        metadata: {
          duration: workflow.totalDuration,
          documentsProcessed: workflow.documentsProcessed,
          totalDocuments: workflow.totalDocuments,
          errorsFound: workflow.errorsFound,
          warningsFound: workflow.warningsFound,
          stepResults: workflow.steps.map(s => ({ id: s.id, status: s.status })),
        },
      });

    } finally {
      this.abortControllers.delete(workflowId);
    }

    return workflow;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    workflowId: string,
    step: WorkflowStep,
    documents: ECTDDocument[],
    correlationId?: string
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId)!;
    const corrId = correlationId || (workflow as any)._auditCorrelationId;
    
    step.status = 'running';
    step.startedAt = new Date();
    step.progress = 0;

    this.emitEvent(workflowId, {
      type: 'step-started',
      timestamp: new Date(),
      stepId: step.id,
      message: `Starting ${step.name}`,
    });

    // Log step started
    auditService.logWorkflowEvent({
      workflowId,
      workflowName: workflow.name,
      action: 'workflow.step.started',
      stepId: step.id,
      stepName: step.name,
      summary: `Started step "${step.name}"`,
      correlationId: corrId,
    });

    let result: WorkflowStepResult;

    switch (step.id) {
      case 'pdf-validation':
        result = await this.executePDFValidation(workflowId, documents, step);
        break;
      case 'hyperlink-detection':
        result = await this.executeHyperlinkDetection(workflowId, documents, step);
        break;
      case 'hyperlink-linking':
        result = await this.executeHyperlinkLinking(workflowId, documents, step);
        break;
      case 'hyperlink-validation':
        result = await this.executeHyperlinkValidation(workflowId, step);
        break;
      case 'backbone-generation':
        result = await this.executeBackboneGeneration(workflowId, documents, step);
        break;
      case 'backbone-validation':
        result = await this.executeBackboneValidation(workflowId, step);
        break;
      case 'package-creation':
        result = await this.executePackageCreation(workflowId, step);
        break;
      case 'gateway-submission':
        result = await this.executeGatewaySubmission(workflowId, step);
        break;
      default:
        throw new Error(`Unknown step: ${step.id}`);
    }

    step.result = result;
    step.completedAt = new Date();
    step.duration = step.completedAt.getTime() - step.startedAt!.getTime();
    step.progress = 100;

    if (!result.success) {
      step.status = 'failed';
      workflow.errorsFound += result.errors?.length || 1;
    } else if (result.warnings && result.warnings.length > 0) {
      step.status = 'warning';
      workflow.warningsFound += result.warnings.length;
    } else {
      step.status = 'completed';
    }

    this.emitEvent(workflowId, {
      type: step.status === 'failed' ? 'step-failed' : 'step-completed',
      timestamp: new Date(),
      stepId: step.id,
      message: result.summary,
      data: result.details,
    });

    // Log step completion
    auditService.logWorkflowEvent({
      workflowId,
      workflowName: workflow.name,
      action: step.status === 'failed' ? 'workflow.step.failed' : 'workflow.step.completed',
      stepId: step.id,
      stepName: step.name,
      summary: `Step "${step.name}" ${step.status}: ${result.summary}`,
      details: result.warnings?.length ? `Warnings: ${result.warnings.join('; ')}` : undefined,
      correlationId: corrId,
      metadata: {
        duration: step.duration,
        success: result.success,
        warnings: result.warnings?.length || 0,
        errors: result.errors?.length || 0,
        details: result.details,
      },
    });
  }

  // ============================================================================
  // STEP IMPLEMENTATIONS
  // ============================================================================

  private async executePDFValidation(
    workflowId: string,
    documents: ECTDDocument[],
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    const pdfDocs = documents.filter(d => d.fileType === 'pdf');
    const results: PDFValidationResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < pdfDocs.length; i++) {
      const doc = pdfDocs[i];
      
      // Simulate PDF data (in real impl, would load actual file)
      const mockPdfData = new ArrayBuffer(doc.fileSize || 100000);
      
      const result = await ectdPDFValidator.validateDocument(
        doc.id,
        doc.title,
        mockPdfData,
        workflow.config.regions
      );
      
      results.push(result);
      
      if (!result.isValid) {
        errors.push(`${doc.title}: ${result.issues.filter(i => i.severity === 'error').length} errors`);
      }
      
      const docWarnings = result.issues.filter(i => i.severity === 'warning');
      if (docWarnings.length > 0) {
        warnings.push(`${doc.title}: ${docWarnings.length} warnings`);
      }

      // Update progress
      step.progress = Math.round(((i + 1) / pdfDocs.length) * 100);
      workflow.documentsProcessed = i + 1;
      
      this.emitEvent(workflowId, {
        type: 'step-progress',
        timestamp: new Date(),
        stepId: step.id,
        progress: step.progress,
        message: `Validated ${i + 1}/${pdfDocs.length} PDFs`,
      });
    }

    workflow.pdfValidationResults = results;

    const validCount = results.filter(r => r.isValid).length;
    const avgScore = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
      : 0;

    return {
      success: errors.length === 0,
      summary: `Validated ${pdfDocs.length} PDFs: ${validCount} passed, ${pdfDocs.length - validCount} failed (avg score: ${avgScore}%)`,
      details: {
        totalPDFs: pdfDocs.length,
        validPDFs: validCount,
        invalidPDFs: pdfDocs.length - validCount,
        averageScore: avgScore,
      },
      warnings,
      errors,
    };
  }

  private async executeHyperlinkDetection(
    workflowId: string,
    documents: ECTDDocument[],
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    const allReferences: DetectedReference[] = [];

    // Register documents in hyperlink service index
    for (const doc of documents) {
      hyperlinkService.registerDocument(doc.id, doc.title, doc.module, doc.section || '');
    }

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      // Simulate document content (in real impl, would extract text from PDF)
      const mockContent = this.generateMockDocumentContent(doc);
      
      const refs = await hyperlinkService.scanDocument(doc.id, mockContent, doc.module);
      allReferences.push(...refs);

      step.progress = Math.round(((i + 1) / documents.length) * 100);
      
      this.emitEvent(workflowId, {
        type: 'step-progress',
        timestamp: new Date(),
        stepId: step.id,
        progress: step.progress,
        message: `Scanned ${i + 1}/${documents.length} documents`,
      });
    }

    workflow.detectedReferences = allReferences;

    // Group by type
    const byType: Record<string, number> = {};
    for (const ref of allReferences) {
      byType[ref.type] = (byType[ref.type] || 0) + 1;
    }

    return {
      success: true,
      summary: `Detected ${allReferences.length} linkable references across ${documents.length} documents`,
      details: {
        totalReferences: allReferences.length,
        byType,
        highConfidence: allReferences.filter(r => r.confidence >= 80).length,
      },
      warnings: allReferences.length === 0 ? ['No linkable references detected'] : undefined,
    };
  }

  private async executeHyperlinkLinking(
    workflowId: string,
    documents: ECTDDocument[],
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    let totalLinked = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      
      const result = await hyperlinkService.autoLink(doc.id, {
        minConfidence: workflow.config.autoLinkMinConfidence,
        types: workflow.config.autoLinkTypes,
      });
      
      totalLinked += result.linked;
      totalSkipped += result.skipped;
      totalFailed += result.failed;

      step.progress = Math.round(((i + 1) / documents.length) * 100);
      
      this.emitEvent(workflowId, {
        type: 'step-progress',
        timestamp: new Date(),
        stepId: step.id,
        progress: step.progress,
        message: `Linked ${i + 1}/${documents.length} documents`,
      });
    }

    const warnings: string[] = [];
    if (totalFailed > 0) {
      warnings.push(`${totalFailed} references could not be linked (no target found)`);
    }
    if (totalSkipped > 0) {
      warnings.push(`${totalSkipped} references skipped (below confidence threshold)`);
    }

    return {
      success: true,
      summary: `Created ${totalLinked} hyperlinks (${totalSkipped} skipped, ${totalFailed} failed)`,
      details: {
        linked: totalLinked,
        skipped: totalSkipped,
        failed: totalFailed,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async executeHyperlinkValidation(
    workflowId: string,
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    
    const linkExport = hyperlinkService.exportHyperlinks();
    const validationResults = await hyperlinkService.validateLinks();
    
    workflow.linkValidationResults = validationResults;

    const validCount = validationResults.filter(r => r.status === 'valid').length;
    const brokenCount = validationResults.filter(r => r.status === 'broken').length;
    const warningCount = validationResults.filter(r => r.status === 'warning').length;

    const errors = brokenCount > 0 
      ? [`${brokenCount} broken links detected`]
      : undefined;
    
    const warnings = warningCount > 0
      ? [`${warningCount} links with warnings`]
      : undefined;

    return {
      success: brokenCount === 0,
      summary: `Validated ${validationResults.length} links: ${validCount} valid, ${brokenCount} broken, ${warningCount} warnings`,
      details: {
        totalLinks: validationResults.length,
        valid: validCount,
        broken: brokenCount,
        warnings: warningCount,
        byType: linkExport.summary.byType,
      },
      warnings,
      errors,
    };
  }

  private async executeBackboneGeneration(
    workflowId: string,
    documents: ECTDDocument[],
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    const { envelope, regionalInfo, studies } = workflow.config;

    // Clear previous generation
    ectdBackboneGenerator.clear();

    step.progress = 25;
    this.emitEvent(workflowId, {
      type: 'step-progress',
      timestamp: new Date(),
      stepId: step.id,
      progress: 25,
      message: 'Building CTD tree structure...',
    });

    // Generate backbone files
    const backboneFiles = await ectdBackboneGenerator.generateBackbone(
      envelope,
      documents,
      regionalInfo,
      studies
    );

    step.progress = 75;
    this.emitEvent(workflowId, {
      type: 'step-progress',
      timestamp: new Date(),
      stepId: step.id,
      progress: 75,
      message: 'Generating XML files...',
    });

    workflow.backboneFiles = backboneFiles;

    return {
      success: true,
      summary: `Generated eCTD backbone: index.xml${regionalInfo ? ' + regional XML' : ''}${studies?.length ? ` + ${studies.length} STF files` : ''}`,
      details: {
        indexXmlSize: backboneFiles.indexXml.length,
        hasRegionalXml: !!backboneFiles.regionalXml,
        stfFileCount: backboneFiles.stfFiles.length,
        checksumEntries: backboneFiles.checksumFile.split('\n').length - 4,
      },
    };
  }

  private async executeBackboneValidation(
    workflowId: string,
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    
    if (!workflow.backboneFiles) {
      return {
        success: false,
        summary: 'No backbone files to validate',
        errors: ['Backbone generation must complete first'],
      };
    }

    const validation = ectdBackboneGenerator.validateBackbone(workflow.backboneFiles);

    return {
      success: validation.isValid,
      summary: validation.isValid 
        ? 'Backbone validation passed'
        : `Backbone validation failed: ${validation.errors.length} errors`,
      details: {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
      },
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      errors: validation.errors.length > 0 ? validation.errors : undefined,
    };
  }

  private async executePackageCreation(
    workflowId: string,
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    
    // In a real implementation, this would:
    // 1. Create the folder structure
    // 2. Copy documents to appropriate locations
    // 3. Write backbone XML files
    // 4. Generate final checksums
    // 5. Create ZIP archive

    step.progress = 50;
    this.emitEvent(workflowId, {
      type: 'step-progress',
      timestamp: new Date(),
      stepId: step.id,
      progress: 50,
      message: 'Creating submission package...',
    });

    // Simulate package creation
    await this.simulateDelay(500);

    const packageName = `${workflow.config.envelope.applicationNumber}_${workflow.config.envelope.sequenceNumber}.zip`;

    return {
      success: true,
      summary: `Created submission package: ${packageName}`,
      details: {
        packageName,
        documentCount: workflow.totalDocuments,
        estimatedSize: `${Math.round(workflow.totalDocuments * 0.5)}MB`, // Rough estimate
      },
    };
  }

  private async executeGatewaySubmission(
    workflowId: string,
    step: WorkflowStep
  ): Promise<WorkflowStepResult> {
    const workflow = this.workflows.get(workflowId)!;
    const { gateway, envelope } = workflow.config;

    if (!gateway) {
      return {
        success: false,
        summary: 'No gateway configured',
        errors: ['Gateway must be specified for submission'],
      };
    }

    step.progress = 25;
    this.emitEvent(workflowId, {
      type: 'step-progress',
      timestamp: new Date(),
      stepId: step.id,
      progress: 25,
      message: `Connecting to ${gateway}...`,
    });

    // Submit to gateway
    const result = await gatewayService.submitToGateway(
      {
        id: workflowId,
        projectId: envelope.submissionId,
        sequenceNumber: envelope.sequenceNumber,
        applicationNumber: envelope.applicationNumber,
        submissionType: envelope.submissionType,
        gateway: gateway,
        fileName: `${envelope.applicationNumber}_${envelope.sequenceNumber}.zip`,
        fileSize: workflow.totalDocuments * 500000, // Rough estimate
        checksum: 'simulated-checksum',
        checksumType: 'md5',
      },
      { gateway, environment: 'test' }
    );

    workflow.gatewayResult = result;

    step.progress = 100;

    if (!result.success) {
      return {
        success: false,
        summary: `Gateway submission failed: ${result.message}`,
        errors: [result.message],
      };
    }

    return {
      success: true,
      summary: `Submitted to ${gateway}: Tracking #${result.trackingNumber || 'pending'}`,
      details: {
        trackingNumber: result.trackingNumber,
        submissionId: result.submissionId,
        acknowledgments: result.acknowledgments.length,
      },
    };
  }

  // ============================================================================
  // WORKFLOW CONTROL
  // ============================================================================

  /**
   * Cancel a running workflow
   */
  cancelWorkflow(workflowId: string): boolean {
    const controller = this.abortControllers.get(workflowId);
    if (controller) {
      controller.abort();
      
      const workflow = this.workflows.get(workflowId);
      if (workflow) {
        workflow.status = 'cancelled';
        this.emitEvent(workflowId, {
          type: 'workflow-cancelled',
          timestamp: new Date(),
          message: 'Workflow cancelled by user',
        });

        // Log workflow cancelled
        const correlationId = (workflow as any)._auditCorrelationId;
        auditService.logWorkflowEvent({
          workflowId,
          workflowName: workflow.name,
          action: 'workflow.cancelled',
          summary: `Publishing workflow "${workflow.name}" cancelled by user`,
          details: `Cancelled at step ${workflow.currentStepIndex + 1} of ${workflow.steps.length}`,
          correlationId,
          metadata: {
            currentStep: workflow.steps[workflow.currentStepIndex]?.name,
            completedSteps: workflow.steps.filter(s => s.status === 'completed').length,
          },
        });
      }
      
      return true;
    }
    return false;
  }

  /**
   * Retry a failed step
   */
  async retryStep(
    workflowId: string,
    stepId: WorkflowStepId,
    documents: ECTDDocument[]
  ): Promise<WorkflowStepResult | null> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return null;

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step || !step.canRetry) return null;

    // Reset step
    step.status = 'pending';
    step.result = undefined;
    step.error = undefined;
    step.progress = 0;

    // Re-execute
    await this.executeStep(workflowId, step, documents);
    
    return step.result || null;
  }

  /**
   * Get workflow state
   */
  getWorkflow(workflowId: string): PublishingWorkflowState | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): PublishingWorkflowState[] {
    return Array.from(this.workflows.values());
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Subscribe to workflow events
   */
  subscribe(workflowId: string, handler: WorkflowEventHandler): () => void {
    if (!this.eventHandlers.has(workflowId)) {
      this.eventHandlers.set(workflowId, new Set());
    }
    this.eventHandlers.get(workflowId)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(workflowId)?.delete(handler);
    };
  }

  private emitEvent(workflowId: string, event: WorkflowEvent): void {
    const handlers = this.eventHandlers.get(workflowId);
    if (handlers) {
      Array.from(handlers).forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in workflow event handler:', error);
        }
      });
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private generateMockDocumentContent(doc: ECTDDocument): string {
    // Generate realistic document content for testing
    const content = [
      `Document: ${doc.title}`,
      `Module: ${doc.module}`,
      `Section: ${doc.section || 'N/A'}`,
      '',
      'This document contains references to:',
      '- Study ABC-123-001 demonstrated efficacy',
      '- See Table 1.2 for demographics',
      '- Figure 3 shows the primary endpoint',
      '- Section 2.7.1 provides the clinical summary',
      '- Appendix A contains individual patient data',
      '- As reported by Smith et al., 2023 [1-3]',
      '',
      'Cross-module references:',
      '- Module 5 clinical study reports',
      '- M2.7 Clinical Summary',
      '- See CSR ABC-123-001',
    ];
    
    return content.join('\n');
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all workflows (for testing)
   */
  clear(): void {
    this.workflows.clear();
    this.eventHandlers.clear();
    this.abortControllers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const publishingOrchestrator = new PublishingOrchestrator();
export { PublishingOrchestrator };

// Re-export types from other services for convenience
export type { SubmissionEnvelope, RegionalInfo, StudyTaggingInfo } from './ectd-backbone-generator';
