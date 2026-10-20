import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { SCHEMA_SQL } from './schema.js';

export interface QueryResult<T> {
  rows: T[];
}

export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  kind: 'postgres' | 'pglite';
}

let db: Db | null = null;

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({ connectionString: url });
    return {
      kind: 'postgres',
      query: async <T>(text: string, params?: unknown[]) => {
        const res = await pool.query(text, params as unknown[]);
        return { rows: res.rows as T[] };
      },
      close: () => pool.end(),
    };
  }

  // No DATABASE_URL: run real Postgres embedded via PGlite (WASM), persisted to ./pgdata.
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pgdata');
  const lite = new PGlite(dir);
  await lite.waitReady;
  return {
    kind: 'pglite',
    query: async <T>(text: string, params?: unknown[]) => {
      const res = await lite.query<T>(text, params as unknown[]);
      return { rows: res.rows };
    },
    close: () => lite.close(),
  };
}

export async function getDb(): Promise<Db> {
  if (!db) {
    db = await connect();
    for (const stmt of SCHEMA_SQL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await db.query(stmt);
    }
  }
  return db;
}
