export default function StatsCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border text-center dark:border-gray-700">
      <p className="text-gray-600 dark:text-gray-300">{label}</p>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </h2>
    </div>
  );
}
