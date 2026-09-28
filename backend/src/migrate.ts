import { readdir, readFile } from 'node:fs/promises';
import { createConnection } from 'mysql2/promise';
import { poolOptions } from '@/db.ts';

/*
 * The schema bootstrap: every `migrations/*.sql` not yet in `schema_migrations`
 * runs once, in file-name order. A named lock keeps two starts (the server and
 * a test run) from applying the same file twice. MySQL commits DDL as it goes,
 * so a file that fails half-way is fixed by hand, never edited after it ran.
 */
const MIGRATIONS = new URL('../migrations/', import.meta.url);

export async function migrate(databaseUrl: string): Promise<string[]> {
  const db = await createConnection({ ...poolOptions(databaseUrl), multipleStatements: true });
  try {
    await db.query("SELECT GET_LOCK('schema_migrations', 60)");
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(191) NOT NULL PRIMARY KEY, applied_at DATETIME(3) NOT NULL)');
    const [rows] = await db.query('SELECT name FROM schema_migrations');
    const done = new Set((rows as { name: string }[]).map((row) => row.name));

    const applied: string[] = [];
    for (const file of (await readdir(MIGRATIONS)).filter((name) => name.endsWith('.sql')).sort()) {
      if (done.has(file)) continue;
      await db.query(await readFile(new URL(file, MIGRATIONS), 'utf8'));
      await db.query('INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)', [file, new Date()]);
      applied.push(file);
    }
    return applied;
  } finally {
    await db.end();
  }
}

if (import.meta.main) {
  const applied = await migrate(process.env.DATABASE_URL ?? '');
  console.log(applied.length ? `Applied ${applied.join(', ')}` : 'Schema is up to date');
}
