
// Database HAQ Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { IHAQRepository, HAQRecord } from '../interfaces/IHAQRepository';

export class DatabaseHAQRepository implements IHAQRepository<HAQRecord> {
  async findAll(): Promise<HAQRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { haq: { findMany: () => Promise<HAQRecord[]> } }).haq.findMany();
  }

  async findById(id: string): Promise<HAQRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { haq: { findUnique: (opts: { where: { id: string } }) => Promise<HAQRecord | null> } }).haq.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<HAQRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { haq: { create: (opts: { data: Record<string, unknown> }) => Promise<HAQRecord> } }).haq.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<HAQRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { haq: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<HAQRecord> } }).haq.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { haq: { delete: (opts: { where: { id: string } }) => Promise<void> } }).haq.delete({ where: { id } });
  }
}
