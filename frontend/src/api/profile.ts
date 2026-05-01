import client from "./client";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  nationality: string | null;
  visa_status: string | null;
  needs_sponsor: boolean;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  nationality?: string;
  visa_status?: string;
  needs_sponsor?: boolean;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
}

export const getProfile = () =>
  client.get<Profile>("/profile").then((r) => r.data);

export const updateProfile = (data: ProfileUpdate) =>
  client.patch<Profile>("/profile", data).then((r) => r.data);
