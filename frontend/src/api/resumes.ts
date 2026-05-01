import client from "./client";

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  s3_key: string;
  uploaded_at: string;
  is_active: boolean;
  parse_status: "pending" | "processing" | "done" | "failed";
  parsed_skills: string[] | null;
  parsed_summary: string | null;
  tags: string[] | null;
}

export const listResumes = () =>
  client.get<Resume[]>("/resumes").then((r) => r.data);

export const uploadResume = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return client
    .post<Resume>("/resumes", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const deactivateResume = (id: string) =>
  client.patch<Resume>(`/resumes/${id}/deactivate`).then((r) => r.data);

export const activateResume = (id: string) =>
  client.patch<Resume>(`/resumes/${id}/activate`).then((r) => r.data);

export const getResumeUrl = (id: string) =>
  client.get<{ url: string }>(`/resumes/${id}/url`).then((r) => r.data.url);
