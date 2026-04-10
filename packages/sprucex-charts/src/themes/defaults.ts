import type { Padding, ThemeConfig } from "../types";

export const DEFAULT_PADDING: Padding = {
  top: 40,
  right: 40,
  bottom: 40,
  left: 40,
};

export const DEFAULT_THEME: ThemeConfig = {
  name: "shadcn",
  background: "var(--background)",
  foreground: "var(--foreground)",
  muted: "var(--muted-foreground)",
  axis: "var(--border)",
  grid: "var(--border)",
  tooltipBackground: "var(--popover)",
  tooltipForeground: "var(--popover-foreground)",
  palette: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--primary)",
    "var(--secondary)",
    "var(--accent)",
  ],
};
