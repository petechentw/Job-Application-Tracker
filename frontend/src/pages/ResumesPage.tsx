import { useEffect, useRef, useState } from "react";
import type { Resume } from "../api/resumes";
import {
  activateResume,
  deactivateResume,
  getResumeUrl,
  listResumes,
  uploadResume,
} from "../api/resumes";
import Navbar from "../components/Navbar";

// Badge shown next to the parse_status of a resume
function ParseStatusBadge({ status }: { status: Resume["parse_status"] }) {
  const styles: Record<Resume["parse_status"], string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// A single resume card with download, tags, and activate/deactivate button
function ResumeCard({
  resume,
  onToggle,
}: {
  resume: Resume;
  onToggle: (r: Resume) => void;
}) {
  const handleDownload = async () => {
    const url = await getResumeUrl(resume.id);
    const a = document.createElement("a");
    a.href = url;
    a.download = resume.name;
    a.click();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{resume.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(resume.uploaded_at).toLocaleDateString()}
          </p>
        </div>
        <ParseStatusBadge status={resume.parse_status} />
      </div>

      {/* AI-parsed tags */}
      {resume.tags && resume.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resume.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* AI-parsed skills preview */}
      {resume.parsed_skills && resume.parsed_skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resume.parsed_skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
            >
              {skill}
            </span>
          ))}
          {resume.parsed_skills.length > 8 && (
            <span className="text-xs text-gray-400">
              +{resume.parsed_skills.length - 8} more
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={handleDownload}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Download
        </button>
        <button
          onClick={() => onToggle(resume)}
          className={`text-xs font-medium ${
            resume.is_active
              ? "text-gray-500 hover:text-gray-700"
              : "text-green-600 hover:text-green-800"
          }`}
        >
          {resume.is_active ? "Move to History" : "Restore to Active"}
        </button>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    fetchResumes();
  }, []);

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

  // Toggle a resume between Active and History
  const handleToggle = async (resume: Resume) => {
    try {
      const updated = resume.is_active
        ? await deactivateResume(resume.id)
        : await activateResume(resume.id);
      setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      // Error is handled silently; the list will be stale until next refresh
    }
  };

  const active = resumes.filter((r) => r.is_active);
  const history = resumes.filter((r) => !r.is_active);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Resumes</h1>
          <label
            className={`bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium cursor-pointer hover:bg-blue-700 ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
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
        ) : (
          <>
            {/* ── Active zone ── */}
            <section className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Active ({active.length})
              </h2>
              {active.length === 0 ? (
                <p className="text-sm text-gray-400">No active resumes.</p>
              ) : (
                <div className="grid gap-3">
                  {active.map((r) => (
                    <ResumeCard key={r.id} resume={r} onToggle={handleToggle} />
                  ))}
                </div>
              )}
            </section>

            {/* ── History zone ── */}
            {history.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  History ({history.length})
                </h2>
                <div className="grid gap-3 opacity-75">
                  {history.map((r) => (
                    <ResumeCard key={r.id} resume={r} onToggle={handleToggle} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
