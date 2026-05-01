import client from "./client";

export interface Education {
  id: string;
  school: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  gpa: string | null;
  order: number;
}

export interface EducationCreate {
  school: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
  order?: number;
}

export const listEducations = () =>
  client.get<Education[]>("/educations").then((r) => r.data);

export const createEducation = (data: EducationCreate) =>
  client.post<Education>("/educations", data).then((r) => r.data);

export const updateEducation = (id: string, data: Partial<EducationCreate>) =>
  client.patch<Education>(`/educations/${id}`, data).then((r) => r.data);

export const deleteEducation = (id: string) =>
  client.delete(`/educations/${id}`);
