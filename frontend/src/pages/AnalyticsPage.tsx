import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Analytics, getAnalytics } from "../api/analytics";
import Navbar from "../components/Navbar";

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <p className="text-gray-500 text-sm p-8">Loading...</p>
    </div>
  );

  if (!data) return null;

  const funnelData = Object.entries(data.status_breakdown).map(([name, count]) => ({ name, count }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Total applications</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{data.total_applications}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Response rate</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{data.response_rate_pct}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <p className="text-sm text-gray-500">Offers</p>
            <p className="text-3xl font-semibold text-gray-900 mt-1">{data.status_breakdown["offer"] ?? 0}</p>
          </div>
        </div>

        {/* Application funnel */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">Application funnel</h2>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">No data yet.</p>
          )}
        </div>

        {/* Top skills */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">Top skills in JDs</h2>
          {data.top_skills.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.top_skills} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="skill" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500">Add job descriptions to see skill trends.</p>
          )}
        </div>
      </div>
    </div>
  );
}
