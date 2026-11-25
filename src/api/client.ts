/**
 * The ONE place that talks to the backend (VITE_API_URL).
 * Screens only call the functions in src/api/*.
 */
import axios, { AxiosError } from "axios";
import { session } from "@/lib/session";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  timeout: 20_000,
});

http.interceptors.request.use((config) => {
  const token = session.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fired when the server says the session is no longer valid. */
export const UNAUTHORIZED_EVENT = "industrialink:unauthorized";

http.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && session.get()) {
      session.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  },
);

export interface ApiErrorBody { message?: string; code?: string }

export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    if (!err.response) return "Can't reach the server. Check your internet and try again.";
    return (err.response.data as ApiErrorBody)?.message ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export function errorCode(err: unknown): string | undefined {
  return err instanceof AxiosError ? (err.response?.data as ApiErrorBody)?.code : undefined;
}

/** Small helpers so endpoint files stay one-liners. */
export const get = <T>(url: string, params?: object) => http.get<T>(url, { params }).then((r) => r.data);
export const post = <T>(url: string, body?: unknown) => http.post<T>(url, body).then((r) => r.data);
export const patch = <T>(url: string, body?: unknown) => http.patch<T>(url, body).then((r) => r.data);
export const del = <T>(url: string) => http.delete<T>(url).then((r) => r.data);
