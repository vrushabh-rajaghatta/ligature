
// Database Product Repository
// v0.42.27: Updated to use generic types
import { prisma } from '@/lib/prisma';
import type { IProductRepository, ProductRecord } from '../interfaces/IProductRepository';

export class DatabaseProductRepository implements IProductRepository<ProductRecord> {
  async findAll(): Promise<ProductRecord[]> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { product: { findMany: () => Promise<ProductRecord[]> } }).product.findMany();
  }

  async findById(id: string): Promise<ProductRecord | null> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { product: { findUnique: (opts: { where: { id: string } }) => Promise<ProductRecord | null> } }).product.findUnique({ where: { id } });
  }

  async create(data: Record<string, unknown>): Promise<ProductRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { product: { create: (opts: { data: Record<string, unknown> }) => Promise<ProductRecord> } }).product.create({ data });
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProductRecord> {
    // @ts-ignore - Prisma model may not be in generated client
    return (prisma as unknown as { product: { update: (opts: { where: { id: string }; data: Record<string, unknown> }) => Promise<ProductRecord> } }).product.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    // @ts-ignore - Prisma model may not be in generated client
    await (prisma as unknown as { product: { delete: (opts: { where: { id: string } }) => Promise<void> } }).product.delete({ where: { id } });
  }
}
