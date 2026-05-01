import { useEffect, useRef, useState } from "react";
import type { Resume } from "../api/resumes";
import { getResumeUrl, listResumes, uploadResume } from "../api/resumes";
import Navbar from "../components/Navbar";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      setResumes(await listResumes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadResume(file);
      await fetchResumes();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (id: string, name: string) => {
    const url = await getResumeUrl(id);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Resumes</h1>
          <label className={`bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-blue-700 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            {uploading ? "Uploading..." : "+ Upload PDF"}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-gray-500">No resumes uploaded yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {resumes.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(r.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(r.id, r.name)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
