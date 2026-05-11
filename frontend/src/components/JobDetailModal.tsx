import type { Job } from "../api/jobs";

interface Props {
  job: Job;
  resumeName: string;
  onClose: () => void;
}

/** Coloured ring showing the numeric fit score with a label. */
function FitScoreRing({ score }: { score: number }) {
  const color =
    score >= 75 ? "text-green-600 border-green-400" :
    score >= 50 ? "text-yellow-600 border-yellow-400" :
                  "text-red-600 border-red-400";
  return (
    <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-full border-4 ${color}`}>
      <span className="text-2xl font-bold leading-none">{score}</span>
      <span className="text-xs font-medium mt-0.5">/ 100</span>
    </div>
  );
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
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{job.company}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{job.role}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* ── Meta grid ── */}
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

          {/* ── Resume + Fit Score side by side ── */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Resume used</p>
              <p className="text-sm text-gray-800">{resumeName}</p>
            </div>
            {job.fit_score !== null && (
              <div className="flex flex-col items-center gap-1">
                <FitScoreRing score={job.fit_score} />
                <p className="text-xs text-gray-400">AI Fit Score</p>
              </div>
            )}
          </div>

          {/* ── Job description ── */}
          {job.jd_text && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Job description</p>
              <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {job.jd_text}
              </div>
            </div>
          )}

          {/* ── AI Analysis ── */}
          {job.analysis_status === "done" && analysis ? (
            <div>
              <p className="text-xs text-gray-400 mb-3">AI Analysis</p>
              <div className="space-y-3">

                {/* Summary */}
                {analysis.summary ? (
                  <div className="bg-blue-50 border border-blue-100 rounded px-4 py-3 text-sm text-blue-800">
                    {String(analysis.summary)}
                  </div>
                ) : null}

                {/* Seniority */}
                {analysis.seniority_level ? (
                  <div className="bg-gray-50 rounded border border-gray-200 px-4 py-3 inline-block">
                    <p className="text-xs text-gray-400 mb-1">Seniority</p>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {String(analysis.seniority_level)}
                    </p>
                  </div>
                ) : null}

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
            <div className="text-sm text-gray-400 italic">AI analysis in progress…</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
