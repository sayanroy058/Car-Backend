import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations } from "./migrate";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "drivehub.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
  }
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
  }
}
