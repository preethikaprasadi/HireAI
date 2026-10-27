import type {
  LoginRequest,
  LoginResponse,
  User,
} from "../types/auth";

import { apiRequest } from "./api";

const TOKEN_KEY = "hireai_access_token";

export async function login(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiRequest<LoginResponse>(
    "/api/v1/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );

  localStorage.setItem(
    TOKEN_KEY,
    response.access_token,
  );

  return response;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "CANDIDATE" | "RECRUITER";
}

export async function register(
  data: RegisterRequest,
): Promise<User> {
  return apiRequest<User>(
    "/api/v1/auth/register",
    {
      method: "POST",
      body: JSON.stringify({
        ...data,
        email: data.email.trim().toLowerCase(),
      }),
    },
  );
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<User> {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Not authenticated.");
  }

  return apiRequest<User>(
    "/api/v1/auth/me",
    {
      method: "GET",
      token,
    },
  );
}

export async function logout(): Promise<void> {
  clearAccessToken();
}
