export default function SeverityBadge({ severity }) {
  const s = (severity || "unknown").toLowerCase();
  const map = {
    low: "bg-green-100 text-green-700 border-green-200",
    moderate: "bg-yellow-100 text-yellow-700 border-yellow-200",
    critical: "bg-red-100 text-red-700 border-red-200",
    unknown: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${map[s] || map.unknown}`}>
      {String(severity || "unknown").toUpperCase()}
    </span>
  );
}
