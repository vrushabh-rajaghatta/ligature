
/**
 * Service Container
 * Centralized dependency injection for data repositories
 * Version: 0.9.6 - Auth & Part 11 Core
 * 
 * Usage:
 *   import { services } from '@/services/ServiceContainer';
 *   
 *   const productRepo = await services.products();
 *   const products = await productRepo.findAll();
 * 
 * Configuration:
 *   Set NEXT_PUBLIC_DATA_PROVIDER environment variable:
 *   - 'mock' (default): Uses in-memory mock data
 *   - 'database': Uses PostgreSQL via Prisma
 */

import type { IProductRepository } from './interfaces/IProductRepository';
import type { IStudyRepository } from './interfaces/IStudyRepository';
import type { IHAQRepository } from './interfaces/IHAQRepository';
import type { ISubmissionRepository } from './interfaces/ISubmissionRepository';
import type { IDocumentRepository } from './interfaces/IDocumentRepository';
import type { IApplicationRepository } from './interfaces/IApplicationRepository';

export type DataProvider = 'mock' | 'database';

interface ServiceInstances {
  products?: IProductRepository;
  studies?: IStudyRepository;
  haqs?: IHAQRepository;
  submissions?: ISubmissionRepository;
  documents?: IDocumentRepository;
  applications?: IApplicationRepository;
}

class ServiceContainer {
  private static instance: ServiceContainer;
  private provider: DataProvider;
  private instances: ServiceInstances = {};

  private constructor() {
    const envProvider = import.meta.env.VITE_DATA_PROVIDER as DataProvider;
    this.provider = envProvider === 'database' ? 'database' : 'mock';
  }

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  getProvider(): DataProvider {
    return this.provider;
  }

  /**
   * Clear cached instances (useful for testing)
   */
  clearCache(): void {
    this.instances = {};
  }

  /**
   * Get Product Repository
   */
  async products(): Promise<IProductRepository> {
    if (!this.instances.products) {
      if (this.provider === 'database') {
        const { DatabaseProductRepository } = await import('./database/DatabaseProductRepository');
        this.instances.products = new DatabaseProductRepository();
      } else {
        const { MockProductRepository } = await import('./mock/MockProductRepository');
        this.instances.products = new MockProductRepository();
      }
    }
    return this.instances.products;
  }

  /**
   * Get Study Repository
   */
  async studies(): Promise<IStudyRepository> {
    if (!this.instances.studies) {
      if (this.provider === 'database') {
        const { DatabaseStudyRepository } = await import('./database/DatabaseStudyRepository');
        this.instances.studies = new DatabaseStudyRepository();
      } else {
        const { MockStudyRepository } = await import('./mock/MockStudyRepository');
        this.instances.studies = new MockStudyRepository();
      }
    }
    return this.instances.studies;
  }

  /**
   * Get HAQ Repository
   */
  async haqs(): Promise<IHAQRepository> {
    if (!this.instances.haqs) {
      if (this.provider === 'database') {
        const { DatabaseHAQRepository } = await import('./database/DatabaseHAQRepository');
        this.instances.haqs = new DatabaseHAQRepository();
      } else {
        const { MockHAQRepository } = await import('./mock/MockHAQRepository');
        this.instances.haqs = new MockHAQRepository();
      }
    }
    return this.instances.haqs;
  }

  /**
   * Get Submission Repository
   */
  async submissions(): Promise<ISubmissionRepository> {
    if (!this.instances.submissions) {
      if (this.provider === 'database') {
        const { DatabaseSubmissionRepository } = await import('./database/DatabaseSubmissionRepository');
        this.instances.submissions = new DatabaseSubmissionRepository();
      } else {
        const { MockSubmissionRepository } = await import('./mock/MockSubmissionRepository');
        this.instances.submissions = new MockSubmissionRepository();
      }
    }
    return this.instances.submissions;
  }

  /**
   * Get Document Repository
   */
  async documents(): Promise<IDocumentRepository> {
    if (!this.instances.documents) {
      if (this.provider === 'database') {
        const { DatabaseDocumentRepository } = await import('./database/DatabaseDocumentRepository');
        this.instances.documents = new DatabaseDocumentRepository();
      } else {
        const { MockDocumentRepository } = await import('./mock/MockDocumentRepository');
        this.instances.documents = new MockDocumentRepository();
      }
    }
    return this.instances.documents;
  }

  /**
   * Get Application Repository
   */
  async applications(): Promise<IApplicationRepository> {
    if (!this.instances.applications) {
      if (this.provider === 'database') {
        const { DatabaseApplicationRepository } = await import('./database/DatabaseApplicationRepository');
        this.instances.applications = new DatabaseApplicationRepository();
      } else {
        const { MockApplicationRepository } = await import('./mock/MockApplicationRepository');
        this.instances.applications = new MockApplicationRepository();
      }
    }
    return this.instances.applications;
  }
}

// Export singleton instance
export const services = ServiceContainer.getInstance();

// Export class for testing
export { ServiceContainer };
