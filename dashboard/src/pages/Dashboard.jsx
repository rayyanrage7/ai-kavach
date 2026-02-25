import { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import LiveFeed from "../components/LiveFeed";
import IoCTable from "../components/IoCTable";
import AttackMap from "../components/AttackMap";
import { io } from "socket.io-client";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    uniqueIps: 0,
  });

  // ----------------------
  // Load dashboard stats
  // ----------------------
  async function loadStats() {
    try {
      const res = await fetch("http://localhost:3000/attacks");
      const data = await res.json();

      const total = data.length;
      const critical = data.filter(
        (a) => a.ml?.severity === "critical"
      ).length;
      const uniqueIps = new Set(data.map((a) => a.src_ip)).size;

      setStats({ total, critical, uniqueIps });
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  // ----------------------
  // Clear all logs
  // ----------------------
  async function clearAll() {
    if (!confirm("Delete ALL stored logs?")) return;

    try {
      const res = await fetch("http://localhost:3000/reset", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear logs");

      alert("All logs cleared.");

      // refresh UI states
      loadStats();
      window.dispatchEvent(new Event("ai-kavach-reset"));
    } catch (err) {
      alert("Failed clearing logs: " + err.message);
    }
  }

  // ----------------------
  // Initial load + WebSocket updates
  // ----------------------
  useEffect(() => {
    loadStats();

    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
    });

    socket.on("attack", () => loadStats());
    socket.on("delete_attack", () => loadStats());
    socket.on("reset_attacks", () => loadStats());

    return () => socket.disconnect();
  }, []);

  return (
    <div className="space-y-10">
      {/* Clear Logs Button */}
      <div className="flex justify-end">
        <button
          onClick={clearAll}
          className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600"
        >
          Clear All Logs
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard label="Total Attacks" value={stats.total} />
        <StatsCard label="Critical Threats" value={stats.critical} />
        <StatsCard label="Unique IPs" value={stats.uniqueIps} />
      </div>

      {/* Live Feed */}
      <section>
        <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">
          Live Feed
        </h2>
        <LiveFeed />
      </section>

      {/* IoC */}
      <section>
        <h2 className="text-xl font-semibold mb-4 mt-6 dark:text-gray-200">
          Indicators of Compromise
        </h2>
        <IoCTable />
      </section>

      {/* Attack Map */}
      <section>
        <AttackMap />
      </section>
    </div>
  );
}
