import { Link, useLocation } from "react-router-dom";

export default function Navbar({ theme, setTheme }) {
  const location = useLocation();

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const navLink = (path, label) => (
    <Link
      to={path}
      className={`font-medium ${
        location.pathname === path
          ? "text-green-600 dark:text-green-400"
          : "text-gray-600 dark:text-gray-300"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav
      className="
        bg-white/90 dark:bg-gray-800/90 backdrop-blur
        dark:text-gray-200 shadow-sm
        border-b dark:border-gray-700
        sticky top-0 z-50
      "
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-green-600 dark:text-green-400">
          AI-KAVACH
        </h1>

        <div className="flex items-center gap-8">
          {navLink("/", "Dashboard")}
          {navLink("/analytics", "Analytics")}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="px-3 py-1 rounded-md border dark:border-gray-600 
            bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        </div>
      </div>
    </nav>
  );
}
