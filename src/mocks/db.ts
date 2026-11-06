/**
 * In-browser "database" for the mock API. Saved to localStorage so demo
 * changes survive a page refresh. "Reset demo data" in the profile menu
 * calls resetMockDb().
 */
import { createSeed, type MockDb } from "./seed";

const KEY = "industrialink.mockdb.v2";
let db: MockDb | null = null;

export function getDb(): MockDb {
  if (db) return db;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) db = JSON.parse(raw) as MockDb;
  } catch {
    /* storage blocked or corrupt: fall back to fresh seed */
  }
  db ??= createSeed();
  return db;
}

export function saveDb() {
  try {
    localStorage.setItem(KEY, JSON.stringify(getDb()));
  } catch {
    /* ignore: demo still works in memory */
  }
}

export function resetMockDb() {
  db = createSeed();
  saveDb();
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
export const now = () => new Date().toISOString();
