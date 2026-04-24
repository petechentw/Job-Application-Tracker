import client from "./client";

export interface Job {
  id: string;
  user_id: string;
  company: string;
  role: string;
  platform: string | null;
  status: "applied" | "interview" | "offer" | "rejected";
  applied_at: string;
  resume_id: string | null;
  jd_text: string | null;
  jd_analysis: Record<string, unknown> | null;
  analysis_status: "pending" | "processing" | "done" | "failed";
}

export interface JobCreate {
  company: string;
  role: string;
  platform?: string;
  resume_id?: string;
  jd_text?: string;
}

export interface JobUpdate {
  company?: string;
  role?: string;
  platform?: string;
  status?: Job["status"];
  jd_text?: string;
}

export const listJobs = () => client.get<Job[]>("/jobs").then((r) => r.data);

export const createJob = (data: JobCreate) =>
  client.post<Job>("/jobs", data).then((r) => r.data);

export const getJob = (id: string) =>
  client.get<Job>(`/jobs/${id}`).then((r) => r.data);

export const updateJob = (id: string, data: JobUpdate) =>
  client.patch<Job>(`/jobs/${id}`, data).then((r) => r.data);

export const deleteJob = (id: string) => client.delete(`/jobs/${id}`);
