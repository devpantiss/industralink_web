import type { AuthResponse, User } from "@/types";
import { get, http, post } from "./client";

export const authApi = {
  /** `role` is the tab the person chose (409 WRONG_ROLE for the other one); the admin page sends none. */
  login: (email: string, password: string, role?: "worker" | "employer") =>
    post<AuthResponse>("/auth/login", { email, password, role }),
  signupWorker: (body: { name: string; phone: string; email: string; password: string }) =>
    post<AuthResponse>("/auth/signup/worker", body),
  signupEmployer: (body: { name: string; email: string; password: string; companyName: string }) =>
    post<AuthResponse>("/auth/signup/employer", body),
  /**
   * Google: log in or create the account (201 = new). `idToken` is the `credential` from Google's
   * button / One Tap. A new HR account also needs `companyName` (else 422 COMPANY_NAME_NEEDED).
   */
  google: (idToken: string, role: "worker" | "employer", companyName?: string) =>
    http.post<AuthResponse>("/auth/google", { idToken, role, companyName }).then((r) => ({ ...r.data, created: r.status === 201 })),
  /** Backend test login (local development only, until the real login method is chosen). */
  devLogin: (body: { phone: string } | { email: string }) => post<AuthResponse>("/auth/dev-login", body),
  me: () => get<User>("/auth/me"),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  completeOnboarding: () => post<User>("/auth/onboarding/complete"),
};
