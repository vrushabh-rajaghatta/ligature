
// Interface for Study Repository
// v0.42.27: Made generic to eliminate any types

export interface StudyRecord {
  id: string;
  [key: string]: unknown;
}

export interface IStudyRepository<T extends StudyRecord = StudyRecord> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'> | Record<string, unknown>): Promise<T>;
  update(id: string, data: Partial<T> | Record<string, unknown>): Promise<T>;
  delete(id: string): Promise<void>;
}
