import client from "./client";

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  s3_key: string;
  uploaded_at: string;
}

export const listResumes = () =>
  client.get<Resume[]>("/resumes").then((r) => r.data);

export const uploadResume = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return client.post<Resume>("/resumes", form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
};

export const getResumeUrl = (id: string) =>
  client.get<{ url: string }>(`/resumes/${id}/url`).then((r) => r.data.url);
