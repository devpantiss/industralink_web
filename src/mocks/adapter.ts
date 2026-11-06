/**
 * Axios adapter that answers requests from the mock handlers instead of the
 * network. Only loaded when VITE_USE_MOCKS=true.
 */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { getDb } from "./db";
import { HttpError, match } from "./router";
import "./handlers";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function userFromToken(config: InternalAxiosRequestConfig) {
  const auth = String(config.headers?.Authorization ?? "");
  const id = auth.startsWith("Bearer mock.") ? auth.slice("Bearer mock.".length) : null;
  const user = id ? getDb().users.find((u) => u.id === id) : undefined;
  if (!user) return null;
  const { password: _pw, ...rest } = user;
  return rest;
}

export const mockAdapter: AxiosAdapter = async (config) => {
  await delay(250 + Math.random() * 350); // feel like a real network
  const url = new URL(config.url ?? "", "http://mock.local/");
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const query: Record<string, string | undefined> = Object.fromEntries(url.searchParams.entries());
  for (const [k, v] of Object.entries(config.params ?? {})) if (v !== undefined && v !== "" && v !== null) query[k] = String(v);
  const body = typeof config.data === "string" ? JSON.parse(config.data || "null") : config.data;

  const respond = (status: number, data: unknown): AxiosResponse => ({
    data, status, statusText: String(status), headers: new AxiosHeaders(), config,
  });

  const found = match(config.method ?? "get", path);
  try {
    if (!found) throw new HttpError(404, `No mock for ${config.method?.toUpperCase()} ${path}`, "NO_ROUTE");
    const data = await found.handler({ params: found.params, query, body, user: userFromToken(config) });
    // deep copy so the UI can't mutate the mock database by accident
    return respond(200, data === undefined ? null : JSON.parse(JSON.stringify(data)));
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, "Something went wrong.");
    if (!(e instanceof HttpError)) console.error("[mock api]", e);
    const res = respond(err.status, { message: err.message, code: err.code });
    throw new AxiosError(err.message, String(err.status), config, null, res);
  }
};
