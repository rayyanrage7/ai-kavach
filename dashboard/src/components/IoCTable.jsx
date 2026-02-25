import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function IoCTable() {
  const [iocs, setIocs] = useState([]);

  useEffect(() => {
    let mounted = true;

    // Load existing IoCs at start
    fetch("http://localhost:3000/iocs")
      .then((res) => res.json())
      .then((data) => {
        if (mounted) setIocs(data);
      })
      .catch((err) => console.error("Failed loading IoCs:", err));

    // WebSocket for new IoCs
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("attack", (data) => {
      if (!data?.iocs?.length) return;

      // Prepend new IoCs (avoid duplicates)
      setIocs((prev) => {
        const newOnes = data.iocs.filter(
          (ioc) => !prev.some((p) => p._id === ioc._id)
        );
        return [...newOnes, ...prev].slice(0, 200); // keep max 200 rows
      });
    });

    socket.on("reset_attacks", () => setIocs([]));

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  return (
    <table className="w-full bg-white dark:bg-gray-800 border rounded-xl shadow-sm dark:border-gray-700">
      <thead>
        <tr className="bg-gray-100 dark:bg-gray-700">
          <th className="p-3 text-gray-700 dark:text-gray-200">Type</th>
          <th className="p-3 text-gray-700 dark:text-gray-200">Value</th>
          <th className="p-3 text-gray-700 dark:text-gray-200">Timestamp</th>
        </tr>
      </thead>

      <tbody>
        {iocs.length === 0 ? (
          <tr>
            <td
              colSpan="3"
              className="p-4 text-center text-gray-500 dark:text-gray-400"
            >
              No IoCs available
            </td>
          </tr>
        ) : (
          iocs.map((ioc) => (
            <tr className="border-t dark:border-gray-700" key={ioc._id}>
              <td className="p-3 text-gray-800 dark:text-gray-300">{ioc.type}</td>
              <td className="p-3 text-gray-800 dark:text-gray-300 break-words">
                {ioc.value}
              </td>
              <td className="p-3 text-sm text-gray-500 dark:text-gray-400">
                {new Date(ioc.createdAt).toLocaleString()}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
