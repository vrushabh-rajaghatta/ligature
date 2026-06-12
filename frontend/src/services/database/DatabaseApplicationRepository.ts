
// Database Application Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { IApplicationRepository, ApplicationRecord } from '../interfaces/IApplicationRepository';

export class DatabaseApplicationRepository implements IApplicationRepository<ApplicationRecord> {
  async findAll(): Promise<ApplicationRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { application: { findMany: () => Promise<ApplicationRecord[]> } }).application.findMany();
  }

  async findById(id: string): Promise<ApplicationRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { application: { findUnique: (opts: { where: { id: string } }) => Promise<ApplicationRecord | null> } }).application.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<ApplicationRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { application: { create: (opts: { data: Record<string, unknown> }) => Promise<ApplicationRecord> } }).application.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<ApplicationRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { application: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<ApplicationRecord> } }).application.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { application: { delete: (opts: { where: { id: string } }) => Promise<void> } }).application.delete({ where: { id } });
  }
}
