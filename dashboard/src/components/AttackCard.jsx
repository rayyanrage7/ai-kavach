export default function AttackCard({ attack, onDelete }) {
  const severity = String(attack?.ml?.severity || "unknown").toLowerCase();

  const severityColor = {
    low: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    unknown: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm dark:border-gray-700 relative">

      {/* Delete Button */}
      <button
        onClick={() => onDelete(attack._id)}
        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg"
        title="Delete this attack"
      >
        🗑️
      </button>

      <div className="flex justify-between pr-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
          {attack.src_ip || "Unknown IP"}
        </h3>

        <span
          className={`px-2 py-1 text-sm rounded ${severityColor[severity]}`}
        >
          {severity.toUpperCase()}
        </span>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
        Commands: {attack.features?.cmd_count ?? 0}
      </p>

      <p className="text-gray-400 dark:text-gray-400 text-xs mt-1">
        At: {new Date(attack.ts).toLocaleString()}
      </p>
    </div>
  );
}
