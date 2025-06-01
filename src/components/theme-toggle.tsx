"use client";

import { useTheme } from "./theme-provider";
import { useEffect, useState } from "react";

function ThemeToggleInner() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <div className="theme-toggle-container inline-flex bg-white dark:bg-gray-800 rounded-full p-1 gap-1 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-200">
        <button
          onClick={() => setTheme("light")}
          className={`theme-toggle-button flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium select-none tracking-wide cursor-pointer ${
            theme === "light"
              ? "active bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm"
              : "text-gray-500 dark:text-gray-400"
          }`}
          aria-label="Switch to light mode"
          style={{ WebkitTapHighlightColor: "rgba(0,0,0,0)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        
        <button
          onClick={() => setTheme("dark")}
          className={`theme-toggle-button flex items-center justify-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium select-none tracking-wide cursor-pointer ${
            theme === "dark"
              ? "active bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm"
              : "text-gray-500 dark:text-gray-400"
          }`}
          aria-label="Switch to dark mode"
          style={{ WebkitTapHighlightColor: "rgba(0,0,0,0)" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ThemeToggleInner />;
} 