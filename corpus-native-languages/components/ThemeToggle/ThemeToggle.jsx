"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./ThemeToggle.css";

const STORAGE_KEY = "nl-theme";

/**
 * Light/dark switch.
 *
 * The actual class swap is tiny, so it lives here instead of pulling in a
 * theming dependency. The inline script in app/layout.tsx applies the stored
 * choice before first paint. Both icons are rendered and CSS reveals the one
 * that matches the current theme, which keeps server and client markup equal.
 */
function ThemeToggle({ className = "" }) {
  const toggle = () => {
    const root = document.documentElement;
    const next = root.classList.contains("light") ? "dark" : "light";

    root.classList.toggle("light", next === "light");
    root.classList.toggle("dark", next === "dark");

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage; the in-memory theme still works.
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`themeToggle ${className}`}
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <Sun className="themeToggle__icon themeToggle__icon--sun" aria-hidden="true" />
      <Moon className="themeToggle__icon themeToggle__icon--moon" aria-hidden="true" />
    </Button>
  );
}

export default ThemeToggle;
