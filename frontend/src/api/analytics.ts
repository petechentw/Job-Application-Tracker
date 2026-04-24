import client from "./client";

export interface Analytics {
  total_applications: number;
  status_breakdown: Record<string, number>;
  response_rate_pct: number;
  top_skills: { skill: string; count: number }[];
}

export const getAnalytics = () =>
  client.get<Analytics>("/analytics").then((r) => r.data);
