
// Interface for Submission Repository
// v0.42.27: Made generic to eliminate any types

export interface SubmissionRecord {
  id: string;
  [key: string]: unknown;
}

export interface ISubmissionRepository<T extends SubmissionRecord = SubmissionRecord> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'> | Record<string, unknown>): Promise<T>;
  update(id: string, data: Partial<T> | Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<void>;
}
