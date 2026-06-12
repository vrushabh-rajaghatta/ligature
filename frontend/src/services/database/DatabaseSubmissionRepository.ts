
// Database Submission Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { ISubmissionRepository, SubmissionRecord } from '../interfaces/ISubmissionRepository';

export class DatabaseSubmissionRepository implements ISubmissionRepository<SubmissionRecord> {
  async findAll(): Promise<SubmissionRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { submission: { findMany: () => Promise<SubmissionRecord[]> } }).submission.findMany();
  }

  async findById(id: string): Promise<SubmissionRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { submission: { findUnique: (opts: { where: { id: string } }) => Promise<SubmissionRecord | null> } }).submission.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<SubmissionRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { submission: { create: (opts: { data: Record<string, unknown> }) => Promise<SubmissionRecord> } }).submission.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<SubmissionRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { submission: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<SubmissionRecord> } }).submission.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { submission: { delete: (opts: { where: { id: string } }) => Promise<void> } }).submission.delete({ where: { id } });
  }
}
