import type { AuthResponse, User } from "@/types";
import { get, post } from "./client";

export const authApi = {
  requestOtp: (phone: string) => post<{ sent: boolean; isNewUser: boolean }>("/auth/otp/request", { phone }),
  verifyOtp: (phone: string, code: string, name?: string) => post<AuthResponse>("/auth/otp/verify", { phone, code, name }),
  login: (email: string, password: string) => post<AuthResponse>("/auth/login", { email, password }),
  signupEmployer: (body: { name: string; email: string; password: string; companyName: string }) =>
    post<AuthResponse>("/auth/signup/employer", body),
  /** Backend test login (local development only, until the real login method is chosen). */
  devLogin: (body: { phone: string } | { email: string }) => post<AuthResponse>("/auth/dev-login", body),
  me: () => get<User>("/auth/me"),
  logout: () => post<{ ok: boolean }>("/auth/logout"),
  completeOnboarding: () => post<User>("/auth/onboarding/complete"),
};
