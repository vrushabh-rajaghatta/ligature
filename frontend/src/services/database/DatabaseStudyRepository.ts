
// Database Study Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { IStudyRepository, StudyRecord } from '../interfaces/IStudyRepository';

export class DatabaseStudyRepository implements IStudyRepository<StudyRecord> {
  async findAll(): Promise<StudyRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { study: { findMany: () => Promise<StudyRecord[]> } }).study.findMany();
  }

  async findById(id: string): Promise<StudyRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { study: { findUnique: (opts: { where: { id: string } }) => Promise<StudyRecord | null> } }).study.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<StudyRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { study: { create: (opts: { data: Record<string, unknown> }) => Promise<StudyRecord> } }).study.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<StudyRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { study: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<StudyRecord> } }).study.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { study: { delete: (opts: { where: { id: string } }) => Promise<void> } }).study.delete({ where: { id } });
  }
}
