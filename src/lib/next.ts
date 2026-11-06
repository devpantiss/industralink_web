/**
 * Remembers where to send someone after they log in or sign up,
 * e.g. back to a job they opened from a WhatsApp link.
 */
const KEY = "industrialink.next";

export function setNext(path: string) {
  try { sessionStorage.setItem(KEY, path); } catch { /* ignore */ }
}

/** Returns the saved path once, if it belongs to this role's area. */
export function takeNext(role: string): string | undefined {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return v && v.startsWith(`/${role}`) ? v : undefined;
  } catch { return undefined; }
}
