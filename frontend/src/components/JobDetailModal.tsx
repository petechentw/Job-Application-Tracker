import type { Job } from "../api/jobs";

interface Props {
  job: Job;
  resumeName: string;
  onClose: () => void;
}

export default function JobDetailModal({ job, resumeName, onClose }: Props) {
  const analysis = job.jd_analysis as Record<string, unknown> | null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{job.company}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{job.role}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-1">Platform</p>
              <p className="text-gray-800">{job.platform ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Status</p>
              <p className="text-gray-800 capitalize">{job.status}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Applied</p>
              <p className="text-gray-800">{new Date(job.applied_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Resume */}
          <div>
            <p className="text-xs text-gray-400 mb-1">Resume used</p>
            <p className="text-sm text-gray-800">{resumeName}</p>
          </div>

          {/* JD */}
          {job.jd_text && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Job description</p>
              <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {job.jd_text}
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {job.analysis_status === "done" && analysis ? (
            <div>
              <p className="text-xs text-gray-400 mb-3">AI Analysis</p>
              <div className="space-y-3">
                {/* Summary */}
                {analysis.summary && (
                  <div className="bg-blue-50 border border-blue-100 rounded px-4 py-3 text-sm text-blue-800">
                    {analysis.summary as string}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {/* Seniority */}
                  {analysis.seniority_level && (
                    <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">Seniority</p>
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {analysis.seniority_level as string}
                      </p>
                    </div>
                  )}
                </div>
                {/* Required skills */}
                {Array.isArray(analysis.skills) && analysis.skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Required skills</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.skills as string[]).map((s) => (
                        <span key={s} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Nice to have */}
                {Array.isArray(analysis.nice_to_have_skills) && analysis.nice_to_have_skills.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Nice to have</p>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.nice_to_have_skills as string[]).map((s) => (
                        <span key={s} className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : job.analysis_status === "pending" || job.analysis_status === "processing" ? (
            <div className="text-sm text-gray-400 italic">AI analysis in progress...</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
