import client from "./client";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  created_at: string;
}

export const register = (email: string, password: string) =>
  client.post<UserResponse>("/auth/register", { email, password }).then((r) => r.data);

export const login = (email: string, password: string) =>
  client.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () =>
  client.get<UserResponse>("/auth/me").then((r) => r.data);
