/** Tiny router used by the mock adapter: matches "GET /jobs/:id" style patterns. */
import type { User } from "@/types";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "ERROR") {
    super(message);
  }
}

export interface MockRequest {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: any;
  user: User | null;
}

type Handler = (req: MockRequest) => unknown;
interface Route { method: string; regex: RegExp; keys: string[]; handler: Handler }

const routes: Route[] = [];

export function route(method: string, pattern: string, handler: Handler) {
  const keys: string[] = [];
  const regex = new RegExp(
    "^" + pattern.replace(/:(\w+)/g, (_, k: string) => { keys.push(k); return "([^/]+)"; }) + "/?$",
  );
  routes.push({ method: method.toUpperCase(), regex, keys, handler });
}

export function match(method: string, path: string) {
  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue;
    const m = r.regex.exec(path);
    if (!m) continue;
    const params: Record<string, string> = {};
    r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
    return { handler: r.handler, params };
  }
  return null;
}
