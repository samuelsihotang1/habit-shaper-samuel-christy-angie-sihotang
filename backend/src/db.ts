import type { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';

/**
 * Pool options for DATABASE_URL, shared by the app, the migration runner and
 * the test helpers. `DATE` columns come back as `YYYY-MM-DD` strings, the shape
 * every day has in this app; a `Date` would be midnight in the process's zone
 * and could land on the day before. `DATETIME` values are read and written as
 * UTC. Only `uri` carries the connection: @fastify/mysql ignores every other
 * option when given a `connectionString`.
 */
export function poolOptions(databaseUrl: string): PoolOptions {
  return { uri: databaseUrl, dateStrings: ['DATE'], timezone: 'Z' };
}

/** A pool, or one of its connections inside a transaction. */
export type Db = Pick<Pool | PoolConnection, 'query'>;

/** The pool itself: what a service holds, so it can open a transaction. */
export type Database = Pick<Pool, 'query' | 'getConnection'>;

type Params = unknown[];

export async function select<T>(db: Db, sql: string, params: Params = []): Promise<T[]> {
  const [rows] = await (db as PoolConnection).query(sql, params);
  return rows as T[];
}

export async function first<T>(db: Db, sql: string, params: Params = []): Promise<T | null> {
  return (await select<T>(db, sql, params))[0] ?? null;
}

/** An INSERT, UPDATE or DELETE; answers how many rows it touched. */
export async function run(db: Db, sql: string, params: Params = []): Promise<number> {
  const [result] = await (db as PoolConnection).query(sql, params);
  return (result as { affectedRows: number }).affectedRows;
}

/** Every statement `work` runs on its connection commits together, or none does. */
export async function transaction<T>(pool: Pick<Pool, 'getConnection'>, work: (tx: Db) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** MySQL's duplicate-key error: a unique index refused the row. */
export const isDuplicate = (error: unknown): boolean => (error as { code?: string } | null)?.code === 'ER_DUP_ENTRY';
