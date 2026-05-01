import { useEffect, useState } from "react";
import type { Job } from "../api/jobs";
import { createJob, deleteJob, listJobs, updateJob } from "../api/jobs";
import type { Resume } from "../api/resumes";
import { listResumes } from "../api/resumes";
import Navbar from "../components/Navbar";
import JobDetailModal from "../components/JobDetailModal";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700",
  interview: "bg-yellow-100 text-yellow-700",
  offer: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["applied", "interview", "offer", "rejected"] as const;

export default function ApplicationsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [form, setForm] = useState({
    company: "",
    role: "",
    platform: "",
    jd_text: "",
    resume_id: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [j, r] = await Promise.all([listJobs(), listResumes()]);
      setJobs(j);
      setResumes(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createJob({
        company: form.company,
        role: form.role,
        platform: form.platform || undefined,
        jd_text: form.jd_text || undefined,
        resume_id: form.resume_id || undefined,
      });
      setForm({ company: "", role: "", platform: "", jd_text: "", resume_id: "" });
      setShowForm(false);
      fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: Job["status"]) => {
    await updateJob(id, { status });
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, status } : j));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (selectedJob?.id === id) setSelectedJob(null);
  };

  const getResumeName = (resume_id: string | null) => {
    if (!resume_id) return "—";
    return resumes.find((r) => r.id === resume_id)?.name ?? "—";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Applications</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            + Add application
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
            <h2 className="font-medium text-gray-900">New application</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Company *</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Role *</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Platform</label>
                <input
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  placeholder="LinkedIn, Indeed…"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Resume used</label>
                <select
                  value={form.resume_id}
                  onChange={(e) => setForm({ ...form, resume_id: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">— None —</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Job description <span className="text-gray-400">(optional — triggers AI analysis)</span>
              </label>
              <textarea
                value={form.jd_text}
                onChange={(e) => setForm({ ...form, jd_text: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : jobs.length === 0 ? (
          <p className="text-gray-500 text-sm">No applications yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Resume</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Analysis</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedJob(job)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{job.company}</td>
                    <td className="px-4 py-3 text-gray-600">{job.role}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{getResumeName(job.resume_id)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value as Job["status"])}
                        className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[job.status]} border-0 cursor-pointer`}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${
                        job.analysis_status === "done" ? "bg-green-100 text-green-700" :
                        job.analysis_status === "pending" ? "bg-gray-100 text-gray-500" :
                        job.analysis_status === "processing" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-600"
                      }`}>
                        {job.analysis_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          resumeName={getResumeName(selectedJob.resume_id)}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
