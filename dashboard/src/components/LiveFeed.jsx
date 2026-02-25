import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AttackCard from "./AttackCard";

export default function LiveFeed() {
  const [attacks, setAttacks] = useState([]);
  const [connected, setConnected] = useState(false);

  // ----------------------
  // DELETE ONE ATTACK
  // ----------------------
  async function deleteAttack(id) {
    if (!confirm("Delete this attack?")) return;

    try {
      const res = await fetch(`http://localhost:3000/attack/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      // optimistic update
      setAttacks((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert("Failed to delete attack: " + err.message);
    }
  }

  useEffect(() => {
    let mounted = true;

    // initial load
    (async () => {
      try {
        const res = await fetch("http://localhost:3000/latest");
        const data = await res.json();
        if (mounted) setAttacks(data);
      } catch (err) {
        console.error("Failed to load latest attacks:", err);
      }
    })();

    // socket with robust reconnection
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("WS connected", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("WS disconnected");
      setConnected(false);
    });

    socket.on("attack", (data) => {
      if (!data || !data.attack) return;
      setAttacks((prev) => [data.attack, ...prev]);
    });

    socket.on("delete_attack", ({ id }) => {
      setAttacks((prev) => prev.filter((a) => a._id !== id));
    });

    socket.on("reset_attacks", () => {
      setAttacks([]);
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`px-2 py-1 rounded text-sm ${
            connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}
        >
          {connected ? "Live" : "Disconnected"}
        </span>
      </div>

      {attacks.map((a) => (
        <AttackCard key={a._id} attack={a} onDelete={deleteAttack} />
      ))}
    </div>
  );
}
