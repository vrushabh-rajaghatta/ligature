
// Mock Product Repository
// v0.42.27: Updated to use generic types
import type { IProductRepository, ProductRecord } from '../interfaces/IProductRepository';

export class MockProductRepository implements IProductRepository<ProductRecord> {
  private items: ProductRecord[] = [];

  async findAll(): Promise<ProductRecord[]> {
    return this.items;
  }

  async findById(id: string): Promise<ProductRecord | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async create(data: Record<string, unknown>): Promise<ProductRecord> {
    const item: ProductRecord = { id: `${Date.now()}`, ...data };
    this.items.push(item);
    return item;
  }

  async update(id: string, data: Record<string, unknown>): Promise<ProductRecord> {
    const index = this.items.findIndex(item => item.id === id);
    if (index >= 0) {
      this.items[index] = { ...this.items[index], ...data };
      return this.items[index];
    }
    throw new Error('Not found');
  }

  async delete(id: string): Promise<void> {
    this.items = this.items.filter(item => item.id !== id);
  }
}
