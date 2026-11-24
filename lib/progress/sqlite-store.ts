import fs from 'node:fs';
import path from 'node:path';
import type { LearnerRecord, ProgressStore } from './types';

/**
 * SQLite adapter using Node's built-in `node:sqlite` (no native dependency).
 * Node 24 loads it without a flag and may print an ExperimentalWarning.
 * Like the file store, it needs a persistent disk: not for serverless hosts.
 */
export async function createSqliteStore(file: string): Promise<ProgressStore> {
  const { DatabaseSync } = await import('node:sqlite');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec(`CREATE TABLE IF NOT EXISTS learner_progress (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS learner_agents (
    agent_id TEXT PRIMARY KEY,
    learner_id TEXT NOT NULL
  );`);
  const parse = (row: unknown) => (row ? (JSON.parse((row as { data: string }).data) as LearnerRecord) : null);
  const byId = database.prepare('SELECT data FROM learner_progress WHERE id = ?');
  const byCode = database.prepare('SELECT data FROM learner_progress WHERE code = ?');
  const byAgent = database.prepare(`SELECT p.data FROM learner_agents a
    JOIN learner_progress p ON p.id = a.learner_id WHERE a.agent_id = ?`);
  const upsert = database.prepare(`INSERT INTO learner_progress (id, code, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET code = excluded.code, data = excluded.data, updated_at = excluded.updated_at`);
  const link = database.prepare(`INSERT INTO learner_agents (agent_id, learner_id) VALUES (?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET learner_id = excluded.learner_id`);
  const remove = database.prepare('DELETE FROM learner_progress WHERE id = ?');
  const unlink = database.prepare('DELETE FROM learner_agents WHERE learner_id = ?');
  return {
    kind: 'sqlite',
    get: async (id) => parse(byId.get(id)),
    findByCode: async (code) => parse(byCode.get(code)),
    put: async (record) => { upsert.run(record.id, record.code, JSON.stringify(record), record.updatedAt); },
    delete: async (id) => { unlink.run(id); remove.run(id); },
    linkAgent: async (agentId, learnerId) => { link.run(agentId, learnerId); },
    findByAgent: async (agentId) => parse(byAgent.get(agentId)),
    close: async () => database.close(),
  };
}
