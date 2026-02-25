import React, { useEffect, useState } from "react";
import * as d3 from "d3";
import { io } from "socket.io-client";

export default function AttackMap() {
  const [world, setWorld] = useState(null);
  const [attacks, setAttacks] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null);

  useEffect(() => {
    // Load GeoJSON world map
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((res) => res.json())
      .then((data) => setWorld(data))
      .catch((err) => console.error("Failed loading world map:", err));

    // Initial attack load
    fetch("http://localhost:3000/attacks")
      .then((res) => res.json())
      .then((data) => {
        const points = data
          .filter((a) => a.geo?.lat && a.geo?.lon)
          .map((a) => ({
            lat: a.geo.lat,
            lon: a.geo.lon,
          }));
        setAttacks(points);
      })
      .catch((err) => console.error(err));

    // Real-time WebSockets
    const socket = io("http://localhost:3000", {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("attack", (data) => {
      const g = data?.attack?.geo;
      if (g?.lat && g?.lon) {
        setAttacks((prev) => [...prev, { lat: g.lat, lon: g.lon }]);
      }
    });

    socket.on("reset_attacks", () => setAttacks([]));

    return () => socket.disconnect();
  }, []);

  if (!world) {
    return (
      <div className="p-6 bg-white dark:bg-gray-900 rounded-xl">
        Loading map…
      </div>
    );
  }

  // D3 Map Projection
  const projection = d3.geoMercator().scale(120).translate([400, 200]);
  const path = d3.geoPath().projection(projection);

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border dark:border-gray-700 relative">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-200">
        Cyber Attack Map
      </h2>

      {/* Hover Label */}
      {hoverCountry && (
        <div className="absolute top-4 right-6 bg-black/80 text-white px-3 py-1 rounded-md text-sm">
          {hoverCountry}
        </div>
      )}

      <div
        className="w-full rounded-lg border dark:border-gray-700 bg-black relative"
        style={{ height: 480 }}
      >
        <svg width="100%" height="100%" viewBox="0 0 800 400">
          {/* World countries */}
          {world.features.map((country, i) => (
            <path
              key={i}
              d={path(country)}
              fill={hoverCountry === country.properties.name ? "#1e293b" : "#0f172a"}
              stroke={
                hoverCountry === country.properties.name ? "#22d3ee" : "#1e293b"
              }
              strokeWidth={hoverCountry === country.properties.name ? 1.5 : 0.5}
              onMouseEnter={() =>
                setHoverCountry(country.properties.name || "Unknown")
              }
              onMouseLeave={() => setHoverCountry(null)}
              style={{
                transition: "all 0.2s ease-in-out",
                cursor: "pointer",
              }}
            />
          ))}

          {/* Attack Points */}
          {attacks.map((a, i) => {
            const [x, y] = projection([a.lon, a.lat]) || [];

            if (typeof x !== "number" || typeof y !== "number") return null;

            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill="#ff3333" />

                {/* Pulse animation */}
                <circle cx={x} cy={y} r={12} fill="rgba(255,0,0,0.3)">
                  <animate
                    attributeName="r"
                    from="4"
                    to="20"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="1"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
