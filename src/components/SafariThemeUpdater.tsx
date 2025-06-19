"use client";

import { useTheme } from "./theme-provider";
import { useEffect, useState } from "react";

export function SafariThemeUpdater() {
  const [mounted, setMounted] = useState(false);
  
  // Only access theme hook after component mounts to avoid SSR issues
  let theme = "light";
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch {
    // Theme context not available, use default
    theme = "light";
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only run on client side after component is mounted
    if (!mounted) return;

    // Update theme-color meta tag dynamically
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const themeColor = theme === "dark" ? "#252528" : "#ffffff";
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", themeColor);
    } else {
      // Create meta tag if it doesn't exist
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = themeColor;
      document.head.appendChild(meta);
    }

    // Update iOS Safari status bar style
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const statusBarStyle = theme === "dark" ? "black-translucent" : "default";
    
    if (statusBarMeta) {
      statusBarMeta.setAttribute("content", statusBarStyle);
    } else {
      const meta = document.createElement("meta");
      meta.name = "apple-mobile-web-app-status-bar-style";
      meta.content = statusBarStyle;
      document.head.appendChild(meta);
    }

    // Add media query based theme-color meta tags for better system integration
    const existingDarkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    const existingLightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    
    if (!existingDarkMeta) {
      const darkMeta = document.createElement("meta");
      darkMeta.name = "theme-color";
      darkMeta.media = "(prefers-color-scheme: dark)";
      darkMeta.content = "#252528";
      document.head.appendChild(darkMeta);
    }
    
    if (!existingLightMeta) {
      const lightMeta = document.createElement("meta");
      lightMeta.name = "theme-color";
      lightMeta.media = "(prefers-color-scheme: light)";
      lightMeta.content = "#ffffff";
      document.head.appendChild(lightMeta);
    }
  }, [theme, mounted]);

  // Don't render anything during SSR
  if (!mounted) {
    return null;
  }

  return null;
} 