import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "migrations");

/**
 * Runs all pending migrations from the `migrations/` folder.
 * Tracks applied migrations in a `_migrations` table.
 * Pass the raw Database instance (before any schema init).
 */
export function runMigrations(db: Database): void {
  // Ensure tracking table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      appliedAt INTEGER NOT NULL
    );
  `);

  let files: string[];
  try {
    files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    console.warn("⚠️  No migrations directory found at", MIGRATIONS_DIR);
    return;
  }

  if (files.length === 0) return;

  const applied = new Set(
    (db.prepare("SELECT name FROM _migrations").all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`  ↳ Running migration: ${file}`);

    try {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name, appliedAt) VALUES (?, ?)").run(
        file,
        Date.now(),
      );
      ran++;
    } catch (err) {
      console.error(`❌ Migration ${file} failed:`, (err as Error).message);
      throw err;
    }
  }

  if (ran > 0) {
    console.log(`✅ Applied ${ran} migration${ran > 1 ? "s" : ""}`);
  } else {
    console.log("  ↳ All migrations up to date");
  }
}

// ── Standalone CLI: npx tsx server/migrate.ts ──
// Uses process.argv to check if this file is the main entry point
const isMain = process.argv[1] &&
  (process.argv[1].endsWith("/migrate.ts") || process.argv[1].endsWith("\\migrate.ts"));
if (isMain) {
  (async () => {
    const Database = (await import("better-sqlite3")).default;
    const DB_PATH = path.join(__dirname, "..", "drivehub.db");
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    console.log("Running migrations...");
    runMigrations(db);
    console.log("Done.");
    db.close();
  })();
}
