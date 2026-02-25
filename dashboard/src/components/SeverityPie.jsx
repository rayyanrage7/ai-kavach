import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

/**
 * SeverityPie
 * - Fetches /attacks
 * - Counts low/moderate/critical
 */
export default function SeverityPie() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/attacks");
        const attacks = await res.json();

        const counts = { low: 0, moderate: 0, critical: 0, unknown: 0 };
        for (const a of attacks) {
          const s = (a.ml && a.ml.severity && a.ml.severity.toLowerCase()) || "unknown";
          if (s in counts) counts[s] += 1;
          else counts.unknown += 1;
        }

        const chart = [
          { name: "Critical", value: counts.critical },
          { name: "Moderate", value: counts.moderate },
          { name: "Low", value: counts.low },
          { name: "Unknown", value: counts.unknown },
        ];

        if (mounted) setData(chart);
      } catch (err) {
        console.error("SeverityPie error", err);
        if (mounted) setData([]);
      }
    })();
    return () => (mounted = false);
  }, []);

  const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#94a3b8"];

  if (!data) return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">Loading severity distribution…</div>;
  if (!data.length) return <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">No severity data available.</div>;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-sm">
      <h3 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Severity Distribution</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
