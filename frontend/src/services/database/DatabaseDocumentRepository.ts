
// Database Document Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { IDocumentRepository, DocumentRecord } from '../interfaces/IDocumentRepository';

export class DatabaseDocumentRepository implements IDocumentRepository<DocumentRecord> {
  async findAll(): Promise<DocumentRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { document: { findMany: () => Promise<DocumentRecord[]> } }).document.findMany();
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { document: { findUnique: (opts: { where: { id: string } }) => Promise<DocumentRecord | null> } }).document.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<DocumentRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { document: { create: (opts: { data: Record<string, unknown> }) => Promise<DocumentRecord> } }).document.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<DocumentRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { document: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<DocumentRecord> } }).document.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { document: { delete: (opts: { where: { id: string } }) => Promise<void> } }).document.delete({ where: { id } });
  }
}
