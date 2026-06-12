
// Mock HAQ Repository
// v0.42.27: Updated to use generic types
import type { IHAQRepository, HAQRecord } from '../interfaces/IHAQRepository';

export class MockHAQRepository implements IHAQRepository<HAQRecord> {
  private items: HAQRecord[] = [];

  async findAll(): Promise<HAQRecord[]> {
    return this.items;
  }

  async findById(id: string): Promise<HAQRecord | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async create(data: Record<string, unknown>): Promise<HAQRecord> {
    const item: HAQRecord = { id: `${Date.now()}`, ...data };
    this.items.push(item);
    return item;
  }

  async update(id: string, data: Record<string, unknown>): Promise<HAQRecord> {
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
