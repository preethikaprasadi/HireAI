export type UserRole =
  | "CANDIDATE"
  | "RECRUITER";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}
