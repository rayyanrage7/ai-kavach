import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

/**
 * TrendChart
 * - Fetches /attacks
 * - Aggregates per-hour (past 48 hours) counts
 */
export default function TrendChart({ lookbackHours = 48 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("http://localhost:3000/attacks");
        const attacks = await res.json();

        // convert timestamps and keep last lookbackHours
        const now = Date.now();
        const bucketMs = 60 * 60 * 1000; // 1 hour
        const buckets = {};

        // initialize buckets
        for (let i = lookbackHours - 1; i >= 0; i--) {
          const t = now - i * bucketMs;
          const key = Math.floor(t / bucketMs) * bucketMs;
          buckets[key] = 0;
        }

        for (const a of attacks) {
          const ts = new Date(a.ts || a.createdAt || Date.now()).getTime();
          const key = Math.floor(ts / bucketMs) * bucketMs;
          if (key in buckets) buckets[key] += 1;
        }

        const chartData = Object.keys(buckets)
          .map((k) => ({
            time: new Date(Number(k)).toLocaleString([], {
              hour: "numeric",
              hour12: false,
              month: "short",
              day: "numeric",
            }),
            count: buckets[k],
            ts: Number(k),
          }))
          .sort((a, b) => a.ts - b.ts);

        setData(chartData);
      } catch (err) {
        console.error("TrendChart load error:", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [lookbackHours]);

  if (loading) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">Loading trend chart…</div>;
  }

  if (!data.length) {
    return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">No attack data yet for trend chart.</div>;
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Attack Trend (last {lookbackHours} hrs)</h3>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e6" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
