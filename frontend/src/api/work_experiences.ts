import client from "./client";

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  order: number;
}

export interface WorkExperienceCreate {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  order?: number;
}

export const listWorkExperiences = () =>
  client.get<WorkExperience[]>("/work-experiences").then((r) => r.data);

export const createWorkExperience = (data: WorkExperienceCreate) =>
  client.post<WorkExperience>("/work-experiences", data).then((r) => r.data);

export const updateWorkExperience = (id: string, data: Partial<WorkExperienceCreate>) =>
  client.patch<WorkExperience>(`/work-experiences/${id}`, data).then((r) => r.data);

export const deleteWorkExperience = (id: string) =>
  client.delete(`/work-experiences/${id}`);
