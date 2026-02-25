import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from "recharts";

export default function Analytics() {
  const [attacks, setAttacks] = useState([]);
  const [timeseries, setTimeseries] = useState([]);
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("http://localhost:3000/attacks");
        const data = res.data || [];
        setAttacks(data);

        // Build hourly buckets for 24 hours
        const buckets = {};
        const now = Date.now();
        const HOUR = 3600 * 1000;

        // Pre-fill buckets
        for (let i = 23; i >= 0; i--) {
          const timestamp = now - i * HOUR;
          const key = new Date(timestamp).toLocaleString([], {
            hour: "2-digit",
            hour12: false,
            day: "2-digit",
            month: "short",
          });
          buckets[key] = 0;
        }

        // Increment bucket values
        data.forEach((a) => {
          const t = new Date(a.createdAt || a.ts).getTime();
          const key = new Date(t).toLocaleString([], {
            hour: "2-digit",
            hour12: false,
            day: "2-digit",
            month: "short",
          });
          if (key in buckets) buckets[key] += 1;
        });

        setTimeseries(
          Object.entries(buckets).map(([time, value]) => ({ time, value }))
        );
      } catch (err) {
        console.error("Failed loading analytics:", err);
      }
    }

    load();
  }, []);

  // Chart colors
  const textColor = dark ? "#e5e7eb" : "#374151";
  const gridColor = dark ? "#4b5563" : "#e5e7eb";
  const primaryColor = dark ? "#22c55e" : "#16a34a";

  // Severity distribution
  const severityCounts = [
    {
      name: "Low",
      value: attacks.filter((a) => a?.ml?.severity === "low").length,
    },
    {
      name: "Moderate",
      value: attacks.filter((a) => a?.ml?.severity === "moderate").length,
    },
    {
      name: "Critical",
      value: attacks.filter((a) => a?.ml?.severity === "critical").length,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold dark:text-gray-100">Analytics</h2>

        {/* Theme Toggle */}
        
      </div>

      {/* Time Series Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <h3 className="font-semibold mb-4 dark:text-gray-200">Attacks (Last 24 Hours)</h3>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeseries}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke={textColor} />
            <YAxis stroke={textColor} allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={primaryColor}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Severity Distribution */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <h3 className="font-semibold mb-4 dark:text-gray-200">Severity Distribution</h3>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={severityCounts}>
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke={textColor} />
            <YAxis stroke={textColor} />
            <Tooltip />
            <Legend wrapperStyle={{ color: textColor }} />
            <Bar dataKey="value" fill={primaryColor} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
