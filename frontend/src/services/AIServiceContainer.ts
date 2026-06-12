
/**
 * AI Service Container
 * =============================================================================
 * Centralized dependency injection for AI services.
 * Switches between mock and production implementations based on AI_PROVIDER env var.
 * 
 * Usage:
 *   import { aiServices } from '@/services/AIServiceContainer';
 *   
 *   const ragService = await aiServices.rag();
 *   const results = await ragService.search('hepatocellular carcinoma');
 * 
 * Configuration:
 *   Set AI_PROVIDER environment variable:
 *   - 'mock' (default): Uses in-memory mock services for demos
 *   - 'production': Uses real AI APIs (requires API keys)
 * 
 * Version: 0.27.10
 */

import { logger } from '@/lib/logger';
import { getAnthropicApiKey } from '@/config/api-keys';
import type { IProductionRAGService } from './rag/production-rag-service';
import type { IPDFExtractionService } from '@/types/pdf-extraction';
import type { ITrackChangesExportService } from '@/types/track-changes';
import type { INativeStructuredContentService } from '@/types/structured-content';

export type AIProvider = 'mock' | 'production';

interface AIServiceInstances {
  rag?: IProductionRAGService;
  pdfExtraction?: IPDFExtractionService;
  trackChanges?: ITrackChangesExportService;
  structuredContent?: INativeStructuredContentService;
}

interface AIServiceHealth {
  provider: AIProvider;
  services: {
    rag: { available: boolean; mode: string };
    pdfExtraction: { available: boolean; mode: string };
    trackChanges: { available: boolean; mode: string };
    structuredContent: { available: boolean; mode: string };
  };
  configuration: {
    anthropicKeyConfigured: boolean;
    voyageKeyConfigured: boolean;
    pgvectorEnabled: boolean;
  };
}

class AIServiceContainer {
  private static instance: AIServiceContainer;
  private provider: AIProvider;
  private instances: AIServiceInstances = {};
  private initializationErrors: Map<string, Error> = new Map();

  private constructor() {
    // Check for demo mode first (forces mock regardless of AI_PROVIDER)
    const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
    const envProvider = process.env.AI_PROVIDER as AIProvider;
    
    if (demoMode) {
      this.provider = 'mock';
      logger.debug('AIService', 'Demo mode enabled - using mock services');
    } else {
      this.provider = envProvider === 'production' ? 'production' : 'mock';
      logger.debug('AIService', `Using ${this.provider} AI provider`);
    }

    // Log configuration status
    this.logConfiguration();
  }

  private logConfiguration(): void {
    const config = {
      provider: this.provider,
      anthropicKey: !!getAnthropicApiKey(),
      voyageKey: !!process.env.VOYAGE_API_KEY,
      pgvector: process.env.PGVECTOR_ENABLED === 'true',
    };

    if (this.provider === 'production') {
      if (!config.anthropicKey) {
        logger.warn('AIService', 'ANTHROPIC_API_KEY not configured - some features may fail');
      }
      if (!config.pgvector) {
        logger.warn('AIService', 'PGVECTOR_ENABLED not set - falling back to in-memory vector store');
      }
    }
  }

  static getInstance(): AIServiceContainer {
    if (!AIServiceContainer.instance) {
      AIServiceContainer.instance = new AIServiceContainer();
    }
    return AIServiceContainer.instance;
  }

  /**
   * Get current provider mode
   */
  getProvider(): AIProvider {
    return this.provider;
  }

  /**
   * Check if running in production mode
   */
  isProduction(): boolean {
    return this.provider === 'production';
  }

  /**
   * Clear cached service instances (useful for testing)
   */
  clearCache(): void {
    this.instances = {};
    this.initializationErrors.clear();
  }

  /**
   * Get health status of all AI services
   */
  async getHealth(): Promise<AIServiceHealth> {
    return {
      provider: this.provider,
      services: {
        rag: {
          available: !this.initializationErrors.has('rag'),
          mode: this.instances.rag ? 'initialized' : 'pending',
        },
        pdfExtraction: {
          available: !this.initializationErrors.has('pdfExtraction'),
          mode: this.instances.pdfExtraction ? 'initialized' : 'pending',
        },
        trackChanges: {
          available: !this.initializationErrors.has('trackChanges'),
          mode: this.instances.trackChanges ? 'initialized' : 'pending',
        },
        structuredContent: {
          available: !this.initializationErrors.has('structuredContent'),
          mode: this.instances.structuredContent ? 'initialized' : 'pending',
        },
      },
      configuration: {
        anthropicKeyConfigured: !!getAnthropicApiKey(),
        voyageKeyConfigured: !!process.env.VOYAGE_API_KEY,
        pgvectorEnabled: process.env.PGVECTOR_ENABLED === 'true',
      },
    };
  }

  /**
   * Get RAG (Retrieval-Augmented Generation) Service
   * Handles document ingestion, embedding, and semantic search
   * Note: Uses production service with MemoryVectorStore fallback (no separate mock)
   */
  async rag(): Promise<IProductionRAGService> {
    if (!this.instances.rag) {
      try {
        // Always use production service - it falls back to MemoryVectorStore internally
        const { createProductionRAGService } = await import('./rag/production-rag-service');
        this.instances.rag = await createProductionRAGService();
        logger.debug('AIService', 'RAG service initialized');
      } catch (error) {
        this.initializationErrors.set('rag', error as Error);
        logger.error('AIService', 'Failed to initialize RAG service', error);
        throw error;
      }
    }
    return this.instances.rag!;
  }

  /**
   * Get PDF Extraction Service
   * Handles PDF parsing, table extraction, figure detection, and section mapping
   */
  async pdfExtraction(): Promise<IPDFExtractionService> {
    if (!this.instances.pdfExtraction) {
      try {
        if (this.provider === 'production') {
          const { createProductionPDFService } = await import('./pdf/production-pdf-service');
          this.instances.pdfExtraction = await createProductionPDFService();
          logger.debug('AIService', 'Production PDF extraction service initialized');
        } else {
          const { MockPDFExtractionService } = await import('./mock/MockPDFExtractionService');
          this.instances.pdfExtraction = new MockPDFExtractionService();
          logger.debug('AIService', 'Mock PDF extraction service initialized');
        }
      } catch (error) {
        this.initializationErrors.set('pdfExtraction', error as Error);
        logger.error('AIService', 'Failed to initialize PDF extraction service', error);
        
        // Fallback to mock on production failure
        if (this.provider === 'production') {
          logger.warn('AIService', 'Falling back to mock PDF extraction service');
          const { MockPDFExtractionService } = await import('./mock/MockPDFExtractionService');
          this.instances.pdfExtraction = new MockPDFExtractionService();
        } else {
          throw error;
        }
      }
    }
    return this.instances.pdfExtraction!;
  }

  /**
   * Get Track Changes Export Service
   * Handles document comparison and DOCX export with revision marks
   */
  async trackChanges(): Promise<ITrackChangesExportService> {
    if (!this.instances.trackChanges) {
      try {
        if (this.provider === 'production') {
          const { getTrackChangesExportService } = await import('./track-changes/track-changes-service');
          this.instances.trackChanges = getTrackChangesExportService();
          logger.debug('AIService', 'Production track changes service initialized');
        } else {
          const { MockTrackChangesExportService } = await import('./mock/MockTrackChangesExportService');
          this.instances.trackChanges = new MockTrackChangesExportService();
          logger.debug('AIService', 'Mock track changes service initialized');
        }
      } catch (error) {
        this.initializationErrors.set('trackChanges', error as Error);
        logger.error('AIService', 'Failed to initialize track changes service', error);
        
        // Fallback to mock on production failure
        if (this.provider === 'production') {
          logger.warn('AIService', 'Falling back to mock track changes service');
          const { MockTrackChangesExportService } = await import('./mock/MockTrackChangesExportService');
          this.instances.trackChanges = new MockTrackChangesExportService();
        } else {
          throw error;
        }
      }
    }
    return this.instances.trackChanges!;
  }

  /**
   * Get Structured Content Service
   * Handles component library, document assembly, and content derivation
   */
  async structuredContent(): Promise<INativeStructuredContentService> {
    if (!this.instances.structuredContent) {
      try {
        if (this.provider === 'production') {
          const { StructuredContentService } = await import('./structured-content/structured-content-service');
          this.instances.structuredContent = new StructuredContentService({
            tenantId: 'default',
            currentUser: 'system',
          });
          logger.debug('AIService', 'Production structured content service initialized');
        } else {
          const { MockStructuredContentService } = await import('./mock/MockStructuredContentService');
          this.instances.structuredContent = new MockStructuredContentService();
          logger.debug('AIService', 'Mock structured content service initialized');
        }
      } catch (error) {
        this.initializationErrors.set('structuredContent', error as Error);
        logger.error('AIService', 'Failed to initialize structured content service', error);
        
        // Fallback to mock on production failure
        if (this.provider === 'production') {
          logger.warn('AIService', 'Falling back to mock structured content service');
          const { MockStructuredContentService } = await import('./mock/MockStructuredContentService');
          this.instances.structuredContent = new MockStructuredContentService();
        } else {
          throw error;
        }
      }
    }
    return this.instances.structuredContent!;
  }
}

// Export singleton instance
export const aiServices = AIServiceContainer.getInstance();

// Export class for testing
export { AIServiceContainer };

// Re-export types for convenience
export type { IProductionRAGService } from './rag/production-rag-service';
export type { IPDFExtractionService } from '@/types/pdf-extraction';
export type { ITrackChangesExportService } from '@/types/track-changes';
export type { INativeStructuredContentService } from '@/types/structured-content';
