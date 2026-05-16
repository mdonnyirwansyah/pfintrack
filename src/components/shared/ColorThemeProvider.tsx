"use client";

import { useEffect } from "react";
import { useColorTheme } from "@/hooks/useColorTheme";

interface ColorThemeProviderProps {
  readonly children: React.ReactNode;
}

export function ColorThemeProvider({ children }: ColorThemeProviderProps): React.JSX.Element {
  const { colorTheme } = useColorTheme();

  useEffect(() => {
    document.documentElement.dataset.colorTheme = colorTheme;
  }, [colorTheme]);

  return <>{children}</>;
}
