import type { LearnerRecord, ProgressStore } from './types';

/**
 * Postgres adapter for hosted databases such as Neon or Supabase. Use this on
 * serverless hosts (for example Vercel), where local files do not persist.
 *
 * NOT VERIFIED AGAINST A LIVE DATABASE in this repository's checks: the SQL is
 * standard and small, but run it against your own Neon or Supabase project
 * before relying on it. `prepare: false` keeps it compatible with
 * transaction-mode connection poolers (Supabase pooler, Neon pooled URLs).
 */
export async function createPostgresStore(connectionString: string): Promise<ProgressStore> {
  // Loaded only when PROGRESS_STORE=postgres so other setups never open a socket.
  const { default: postgres } = await import('postgres');
  const sql = postgres(connectionString, { prepare: false, max: 1, idle_timeout: 20 });
  let ready: Promise<unknown> | null = null;
  const ensure = () => (ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS learner_progress (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      data TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS learner_agents (
      agent_id TEXT PRIMARY KEY,
      learner_id TEXT NOT NULL
    )`;
  })().catch((error: unknown) => { ready = null; throw error; }));
  const parse = (rows: readonly { data: string }[]) => (rows[0] ? (JSON.parse(rows[0].data) as LearnerRecord) : null);
  return {
    kind: 'postgres',
    get: async (id) => {
      await ensure();
      return parse(await sql<{ data: string }[]>`SELECT data FROM learner_progress WHERE id = ${id}`);
    },
    findByCode: async (code) => {
      await ensure();
      return parse(await sql<{ data: string }[]>`SELECT data FROM learner_progress WHERE code = ${code}`);
    },
    put: async (record) => {
      await ensure();
      await sql`INSERT INTO learner_progress (id, code, data, updated_at)
        VALUES (${record.id}, ${record.code}, ${JSON.stringify(record)}, ${record.updatedAt})
        ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
    },
    delete: async (id) => {
      await ensure();
      await sql`DELETE FROM learner_agents WHERE learner_id = ${id}`;
      await sql`DELETE FROM learner_progress WHERE id = ${id}`;
    },
    linkAgent: async (agentId, learnerId) => {
      await ensure();
      await sql`INSERT INTO learner_agents (agent_id, learner_id) VALUES (${agentId}, ${learnerId})
        ON CONFLICT (agent_id) DO UPDATE SET learner_id = EXCLUDED.learner_id`;
    },
    findByAgent: async (agentId) => {
      await ensure();
      return parse(await sql<{ data: string }[]>`SELECT p.data FROM learner_agents a
        JOIN learner_progress p ON p.id = a.learner_id WHERE a.agent_id = ${agentId}`);
    },
    close: async () => { await sql.end(); },
  };
}
