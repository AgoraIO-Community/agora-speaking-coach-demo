import fs from 'node:fs/promises';
import path from 'node:path';
import type { LearnerRecord, ProgressStore } from './types';

type FileData = { learners: Record<string, LearnerRecord>; agents: Record<string, string> };

/**
 * Zero-configuration default: one JSON file, written atomically.
 * Suitable for one server process (local development, a single Docker
 * container with a mounted volume). It does not persist on serverless hosts.
 */
export function createFileStore(file: string): ProgressStore {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<FileData> => {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8')) as Partial<FileData>;
      return { learners: data.learners ?? {}, agents: data.agents ?? {} };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { learners: {}, agents: {} };
      throw error;
    }
  };
  // Serialize writers in this process so a read-modify-write is never interleaved.
  const exclusive = <T>(task: () => Promise<T>): Promise<T> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };
  const write = async (data: FileData) => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(temporary, file);
  };
  const update = (change: (data: FileData) => void) => exclusive(async () => {
    const data = await read();
    change(data);
    await write(data);
  });
  return {
    kind: 'file',
    get: async (id) => (await read()).learners[id] ?? null,
    findByCode: async (code) => Object.values((await read()).learners).find((record) => record.code === code) ?? null,
    put: (record) => update((data) => { data.learners[record.id] = record; }),
    delete: (id) => update((data) => {
      delete data.learners[id];
      for (const [agentId, learnerId] of Object.entries(data.agents)) if (learnerId === id) delete data.agents[agentId];
    }),
    linkAgent: (agentId, learnerId) => update((data) => { data.agents[agentId] = learnerId; }),
    findByAgent: async (agentId) => {
      const data = await read();
      return data.learners[data.agents[agentId]] ?? null;
    },
  };
}
