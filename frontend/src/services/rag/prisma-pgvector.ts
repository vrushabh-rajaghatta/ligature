/**
 * Browser stub for the former Prisma/pgvector store.
 *
 * The real pgvector-backed RAG store now lives in the FastAPI backend
 * (vector search goes through /api/rag/* endpoints). This stub keeps the
 * module shape so the production RAG service still compiles; calling the
 * store in the browser is a programming error and throws.
 */
export interface PgVectorClientConfig {
  connectionString?: string;
}

const BACKEND_ONLY =
  'pgvector RAG store is backend-only — call the /api/rag endpoints instead.';

export function createPgVectorStoreWithPrisma(): never {
  throw new Error(BACKEND_ONLY);
}

export async function getPgVectorStore(): Promise<never> {
  throw new Error(BACKEND_ONLY);
}

export async function closePgVectorStore(): Promise<void> {
  // nothing to close in the browser
}

export async function checkPgVectorHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  return { healthy: false, error: BACKEND_ONLY };
}

export { PgVectorStore } from './pgvector-store';
