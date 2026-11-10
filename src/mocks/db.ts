/**
 * In-browser "database" for the mock API. Saved to localStorage so demo
 * changes survive a page refresh. "Reset demo data" in the profile menu
 * calls resetMockDb().
 */
import { createSeed, type MockDb } from "./seed";

const KEY = "industrialink.mockdb.v3";
let db: MockDb | null = null;

// Another tab saved: drop our copy so we read theirs next time.
// Otherwise this tab's older copy would overwrite new sign-ups on its next save.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === KEY || e.key === null) db = null; });
}

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

/** Big uploads (photos, files kept as data URLs) are what fill the 5 MB storage. */
const isBigDataUrl = (v: unknown) => typeof v === "string" && v.startsWith("data:") && v.length > 50_000;

function withoutBigFiles(d: MockDb): MockDb {
  return {
    ...d,
    documents: d.documents.map((doc) => (isBigDataUrl(doc.url) ? { ...doc, url: undefined } : doc)),
    workers: d.workers.map((w) => (isBigDataUrl(w.photoUrl) ? { ...w, photoUrl: undefined } : w)),
    companyDocs: d.companyDocs?.map((doc) => (isBigDataUrl(doc.url) ? { ...doc, url: undefined } : doc)),
  };
}

export function saveDb() {
  const data = getDb();
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full: keep accounts, jobs and applications; drop file previews from the saved copy.
    try {
      localStorage.setItem(KEY, JSON.stringify(withoutBigFiles(data)));
      console.warn("[mock db] Browser storage is full. Saved without file previews. Use \"Reset demo data\" to clear it.");
    } catch {
      console.warn("[mock db] Could not save demo data. Changes will be lost on refresh.");
    }
  }
}

export function resetMockDb() {
  db = createSeed();
  saveDb();
}

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}`;
export const now = () => new Date().toISOString();
