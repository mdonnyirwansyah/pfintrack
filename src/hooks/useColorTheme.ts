"use client";

import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "blue" | "pink";

const STORAGE_KEY = "pfintrack_color_theme";

export function useColorTheme(): {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
} {
  const [colorThemeState, setColorThemeState] = useState<ColorTheme>("blue");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ColorTheme | null;
    if (stored === "blue" || stored === "pink") {
      setColorThemeState(stored);
    }
  }, []);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    setColorThemeState(theme);
    document.documentElement.dataset.colorTheme = theme;
  }, []);

  return { colorTheme: colorThemeState, setColorTheme };
}
