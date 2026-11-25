import path from 'node:path';
import type { ProgressStore } from './types';

export const PROGRESS_STORES = ['file', 'sqlite', 'postgres'] as const;

/**
 * Builds the adapter selected by PROGRESS_STORE (default `file`).
 * A misconfigured store throws; it never falls back to another adapter,
 * because silently saving somewhere else would lose learner progress.
 */
export async function createProgressStore(env: NodeJS.ProcessEnv = process.env): Promise<ProgressStore> {
  const kind = env.PROGRESS_STORE?.trim() || 'file';
  const directory = path.resolve(/* turbopackIgnore: true */ env.PROGRESS_DATA_DIR?.trim() || '.scenario-data');
  if (kind === 'file') return (await import('./file-store')).createFileStore(path.join(directory, 'progress.json'));
  if (kind === 'sqlite') return (await import('./sqlite-store')).createSqliteStore(path.join(directory, 'progress.sqlite'));
  if (kind === 'postgres') {
    const url = env.DATABASE_URL?.trim();
    if (!url) throw new Error('PROGRESS_STORE=postgres requires DATABASE_URL (a Neon or Supabase connection string).');
    return (await import('./postgres-store')).createPostgresStore(url);
  }
  throw new Error(`Unsupported PROGRESS_STORE "${kind}". Use one of: ${PROGRESS_STORES.join(', ')}.`);
}

let shared: Promise<ProgressStore> | null = null;

/** Process-wide store. A failed initialization is retried on the next call. */
export function getProgressStore(): Promise<ProgressStore> {
  return (shared ??= createProgressStore().catch((error) => { shared = null; throw error; }));
}

/** Test hook: drop the cached store so the next call re-reads the environment. */
export async function resetProgressStore(): Promise<void> {
  const current = shared;
  shared = null;
  await (await current?.catch(() => null))?.close?.();
}
