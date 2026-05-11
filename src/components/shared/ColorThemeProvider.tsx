"use client";

import { useEffect } from "react";
import { useColorTheme } from "@/hooks/useColorTheme";

interface ColorThemeProviderProps {
  children: React.ReactNode;
}

export function ColorThemeProvider({ children }: ColorThemeProviderProps): React.JSX.Element {
  const { colorTheme } = useColorTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-color-theme", colorTheme);
  }, [colorTheme]);

  return <>{children}</>;
}
