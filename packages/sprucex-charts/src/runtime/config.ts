import type { ChartConfiguration, ChartOptions } from "../types";

// Keep callbacks usable in memory while isolating mutable objects from callers.
export function cloneConfig<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(cloneConfig) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneConfig(item)]),
    ) as T;
  }
  return value;
}

export function configurationOf(options: ChartOptions): ChartConfiguration {
  const { data: _data, ...config } = options;
  return cloneConfig(config);
}

export function sameConfig(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const entries = Object.entries(a);
  return (
    entries.length === Object.keys(b).length &&
    entries.every(
      ([key, value]) =>
        Object.hasOwn(b, key) &&
        sameConfig(value, (b as Record<string, unknown>)[key]),
    )
  );
}
