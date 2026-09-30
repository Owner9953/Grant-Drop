import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Class-based theming: `index.css` declares `.dark` via
 * `@custom-variant dark (&:is(.dark *))`, so the provider toggles a class on
 * <html> rather than switching colour schemes in CSS.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
