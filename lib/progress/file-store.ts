import fs from 'node:fs/promises';
import path from 'node:path';
import type { LearnerRecord, ProgressStore } from './types';

/**
 * Zero-configuration default: one JSON file, written atomically.
 * Suitable for one server process (local development, a single Docker
 * container with a mounted volume). It does not persist on serverless hosts.
 */
export function createFileStore(file: string): ProgressStore {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<Record<string, LearnerRecord>> => {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw error;
    }
  };
  // Serialize writers in this process so a read-modify-write is never interleaved.
  const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };
  const write = async (all: Record<string, LearnerRecord>) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(all), { mode: 0o600 });
    await fs.rename(temporary, file);
  };
  return {
    kind: 'file',
    get: async (id) => (await read())[id] ?? null,
    findByCode: async (code) => Object.values(await read()).find((record) => record.code === code) ?? null,
    put: (record) => exclusive(async () => write({ ...(await read()), [record.id]: record })),
    delete: (id) => exclusive(async () => {
      const all = await read();
      delete all[id];
      await write(all);
    }),
  };
}
