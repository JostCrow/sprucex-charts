import { DEFAULT_PADDING, DEFAULT_THEME } from "../themes/defaults";
import { resolveMapFeatureCollection } from "../maps";
import type {
  AxisConfig,
  ChartEventConfig,
  ChartInstance,
  ChartOptions,
  ChartState,
  ChartType,
  ExportResult,
  LegendConfig,
  SeriesConfig,
  ThemeConfig,
  TrendlineConfig,
} from "../types";

type AnyDatum = Record<string, unknown>;
type Point = { x: number; y: number };
type ProjectionType = "mercator" | "equal-earth" | "orthographic" | "custom";

interface InteractivePoint {
  x: number;
  y: number;
  key: string | number;
  label: string;
  value: string;
  raw: AnyDatum;
  series: SeriesConfig;
  color?: string;
}

interface CartesianContext {
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
  xToCoord: (value: unknown) => number;
  coordToX: (value: number) => number;
  keyToCoord: (key: string | number) => number | undefined;
  zoomable: boolean;
  hoverAxis: "x" | "y";
  hoverThreshold: number;
  crosshairAxis: "x" | "y";
}

interface RenderContext {
  width: number;
  height: number;
  plotWidth: number;
  plotHeight: number;
  padding: typeof DEFAULT_PADDING;
  theme: ThemeConfig;
  interactivePoints: InteractivePoint[];
  csvRows: Record<string, unknown>[];
  cartesian?: CartesianContext;
  crosshairMarkup: string;
  axesMarkup?: string;
  gridMarkup?: string;
}

interface ChartRuntime {
  container: HTMLElement;
  svg: SVGSVGElement;
  tooltip: HTMLDivElement;
  liveRegion: HTMLDivElement;
  config: ChartOptions;
  state: ChartState;
  context: RenderContext | null;
  instance?: ChartInstance;
  destroyed: boolean;
  teardownFns: Array<() => void>;
  clipPathId: string;
  animateOnNextRender: boolean;
  animationCursor: number;
  legendPage: number;
  brushSelection?: [number, number];
}

interface LinearScale {
  scale: (value: number) => number;
  invert: (coord: number) => number;
  ticks: (count?: number) => number[];
}

interface BandScale {
  scale: (value: string) => number | undefined;
  bandwidth: () => number;
  domain: string[];
}

interface PieSlice {
  startAngle: number;
  endAngle: number;
  value: number;
  datum: AnyDatum;
}

interface HistogramBucket {
  x0: number;
  x1: number;
  length: number;
  values: number[];
}

interface LegendEntry {
  key: string;
  label: string;
  color: string;
}

type AnimationPreset = "fade-up" | "grow-y" | "grow-x" | "pop" | "scale";

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  level: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceY: number;
  targetY: number;
  width: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const syncGroups = new Map<string, Set<ChartRuntime>>();
const runtimeMap = new WeakMap<HTMLElement, ChartRuntime>();
const instanceMap = new WeakMap<HTMLElement, ChartInstance>();
let chartRuntimeId = 0;
const RENDER_ANIMATION_DURATION = 560;
const RENDER_ANIMATION_STAGGER = 34;
const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;
const renderableCartesianTypes = new Set<ChartType>([
  "line",
  "area",
  "bar",
  "horizontal-bar",
  "stacked-bar",
  "stacked-area",
  "scatter",
  "bubble",
  "histogram",
  "combo",
  "multi-axis",
  "candlestick",
  "ohlc",
]);

function asArray(data: ChartOptions["data"]): AnyDatum[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}

function sumValues(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function maxValue(values: number[]): number {
  return values.length ? Math.max(...values) : 0;
}

function minValue(values: number[]): number {
  return values.length ? Math.min(...values) : 0;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function groupBy<T>(
  values: T[],
  keyFn: (value: T) => string,
): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  values.forEach((value) => {
    const key = keyFn(value);
    map.set(key, [...(map.get(key) ?? []), value]);
  });
  return Array.from(map.entries());
}

function quantileSorted(values: number[], q: number): number {
  if (!values.length) return 0;
  const index = (values.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  const weight = index - lower;
  return values[lower] * (1 - weight) + values[upper] * weight;
}

function toDateMs(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return 0;
}

function toOptionalDateMs(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : undefined;
  }
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return undefined;
}

function toNumber(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && /\d{4}-\d{2}-\d{2}/.test(value)) return parsed;
  }
  return 0;
}

function parseTickFormat(pattern: string, value: number): string {
  const decimalsMatch = pattern.match(/\.(\d+)/);
  const decimals = decimalsMatch ? Number(decimalsMatch[1]) : 0;
  if (pattern.includes("%")) {
    return `${(value * 100).toFixed(decimals)}%`;
  }
  return value.toFixed(decimals);
}

function formatValue(
  value: unknown,
  axis?: AxisConfig,
  locale = "en-US",
  timeZone?: string,
): string {
  if (axis?.tickFormat && typeof axis.tickFormat === "function") {
    return axis.tickFormat(value);
  }
  if (typeof axis?.tickFormat === "string" && typeof value === "number") {
    return parseTickFormat(axis.tickFormat, value);
  }
  if (
    value instanceof Date ||
    (typeof value === "string" &&
      !Number.isNaN(Date.parse(value)) &&
      /\d{4}-\d{2}-\d{2}/.test(value))
  ) {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone,
    }).format(value instanceof Date ? value : new Date(value));
  }
  if (typeof value === "number") {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
      value,
    );
  }
  return String(value ?? "");
}

function formatSeriesValue(
  value: unknown,
  series: SeriesConfig | undefined,
  axis: AxisConfig | undefined,
  config: ChartOptions,
) {
  if (series?.format) {
    return series.format(value);
  }
  return formatValue(value, axis, config.locale, config.timeZone);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolvePadding(config: ChartOptions) {
  if (typeof config.padding === "number" && Number.isFinite(config.padding)) {
    return {
      top: config.padding,
      right: config.padding,
      bottom: config.padding,
      left: config.padding,
    };
  }

  if (
    config.padding &&
    typeof config.padding === "object" &&
    !Array.isArray(config.padding)
  ) {
    return { ...DEFAULT_PADDING, ...(config.padding as Partial<typeof DEFAULT_PADDING>) };
  }

  return DEFAULT_PADDING;
}

function resolveTheme(_config: ChartOptions): ThemeConfig {
  return {
    ...DEFAULT_THEME,
    palette: DEFAULT_THEME.palette,
  };
}

function resolveChartType(config: ChartOptions): ChartType {
  return config.type ?? "line";
}

function seriesId(series: SeriesConfig, index: number): string {
  return series.id ?? series.name ?? `${series.type ?? "series"}-${index}`;
}

function seriesName(series: SeriesConfig, index: number): string {
  return series.name ?? series.id ?? `Series ${index + 1}`;
}

function seriesColor(
  series: SeriesConfig,
  theme: ThemeConfig,
  index: number,
): string {
  return (
    series.color ??
    theme.palette?.[index % (theme.palette?.length ?? 1)] ??
    "var(--primary)"
  );
}

function mapValueColor(
  value: number,
  theme: ThemeConfig,
  series: SeriesConfig,
) {
  const palette = (theme.palette ?? []).filter(Boolean);
  if (!Number.isFinite(value) || value <= 0) {
    return theme.grid ?? series.color ?? palette[0] ?? "var(--chart-1)";
  }
  return series.color ?? palette[0] ?? "var(--chart-1)";
}

function seriesKey(series: SeriesConfig, index: number): string {
  return seriesId(series, index);
}

function getSize(container: HTMLElement, config: ChartOptions) {
  const rect = container.getBoundingClientRect();
  return {
    width: config.width ?? Math.max(320, Math.round(rect.width || 820)),
    height: config.height ?? 460,
  };
}

function ensureSeries(
  config: ChartOptions,
  data: AnyDatum[],
  type: ChartType,
): SeriesConfig[] {
  if (config.series?.length) {
    return config.series.map((series) => ({
      ...series,
      visible: series.visible ?? true,
      type: series.type ?? type,
      xKey: series.xKey ?? "x",
      yKey: series.yKey ?? "y",
      valueKey: series.valueKey ?? "value",
    }));
  }

  const keys = data.length ? Object.keys(data[0]) : [];
  const xKey =
    keys.find((key) => key !== "value" && typeof data[0]?.[key] !== "number") ??
    keys[0] ??
    "x";
  const yKey = keys.find((key) => key !== xKey) ?? "value";
  return [
    {
      id: "default",
      name: "Series 1",
      type,
      xKey,
      yKey,
      valueKey: yKey,
      visible: true,
    },
  ];
}

function createSvgRoot(width: number, height: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "sx-chart-svg");
  return svg;
}

function appendStyles(container: HTMLElement) {
  if (container.querySelector(":scope > style[data-sx-chart]")) return;
  const style = document.createElement("style");
  style.dataset.sxChart = "true";
  style.textContent = `
    .sx-chart-root { position: relative; width: 100%; }
    .sx-chart-svg { display: block; width: 100%; height: auto; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; }
    .sx-chart-tooltip {
      position: absolute;
      display: grid;
      width: max-content;
      z-index: 5;
      pointer-events: none;
      transform: translate(-50%, calc(-100% - 16px));
      min-width: 120px;
      max-width: min(260px, calc(100% - 24px));
      padding: 0.55rem 0.7rem;
      border-radius: 12px;
      font: 12px/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(8px);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
      opacity: 0;
      transition: opacity 120ms ease;
      white-space: normal;
    }
    .sx-chart-tooltip.is-visible { opacity: 1; }
    .sx-legend-item { cursor: pointer; }
    .sx-legend-item.is-hidden { opacity: 0.58; }
    .sx-chart-live {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(1px, 1px, 1px, 1px);
      white-space: nowrap;
    }
  `;
  container.prepend(style);
}

function resolveScaleType(
  axis: AxisConfig | undefined,
  sampleValue: unknown,
): AxisConfig["scaleType"] {
  if (axis?.scaleType) return axis.scaleType;
  if (sampleValue instanceof Date) return "time";
  if (
    typeof sampleValue === "string" &&
    !Number.isNaN(Date.parse(sampleValue)) &&
    /\d{4}-\d{2}-\d{2}/.test(sampleValue)
  ) {
    return "time";
  }
  return typeof sampleValue === "number" ? "linear" : "category";
}

function createLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): LinearScale {
  const safeMax = domainMax === domainMin ? domainMin + 1 : domainMax;
  const scale = (value: number) => {
    const ratio = (value - domainMin) / (safeMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
  const invert = (coord: number) => {
    const ratio = (coord - rangeMin) / (rangeMax - rangeMin || 1);
    return domainMin + ratio * (safeMax - domainMin);
  };
  const ticks = (count = 5) => {
    const results: number[] = [];
    if (count <= 1) return [domainMin, safeMax];
    for (let index = 0; index < count; index += 1) {
      results.push(domainMin + ((safeMax - domainMin) * index) / (count - 1));
    }
    return results;
  };
  return { scale, invert, ticks };
}

function createLogScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): LinearScale {
  const safeMin = Math.max(0.0001, domainMin);
  const safeMax = Math.max(safeMin * 10, domainMax);
  const logMin = Math.log10(safeMin);
  const logMax = Math.log10(safeMax);
  const scale = (value: number) => {
    const safeValue = Math.max(safeMin, value);
    const ratio = (Math.log10(safeValue) - logMin) / Math.max(0.0001, logMax - logMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
  const invert = (coord: number) => {
    const ratio = (coord - rangeMin) / (rangeMax - rangeMin || 1);
    return 10 ** (logMin + ratio * (logMax - logMin));
  };
  const ticks = (count = 5) => {
    if (count <= 1) return [safeMin, safeMax];
    const values: number[] = [];
    for (let index = 0; index < count; index += 1) {
      values.push(10 ** (logMin + ((logMax - logMin) * index) / (count - 1)));
    }
    return values;
  };
  return { scale, invert, ticks };
}

function createBandScale(
  domain: string[],
  rangeMin: number,
  rangeMax: number,
  padding = 0.18,
): BandScale {
  const uniqueDomain = unique(domain);
  const count = Math.max(1, uniqueDomain.length);
  const fullStep = (rangeMax - rangeMin) / count;
  const band = fullStep * (1 - padding);
  const offset = (fullStep - band) / 2;
  return {
    scale: (value: string) => {
      const index = uniqueDomain.indexOf(value);
      if (index === -1) return undefined;
      return rangeMin + index * fullStep + offset;
    },
    bandwidth: () => band,
    domain: uniqueDomain,
  };
}

function createTimeTicks(minMs: number, maxMs: number, count = 6): Date[] {
  if (count <= 1) return [new Date(minMs), new Date(maxMs)];
  const span = Math.max(1, maxMs - minMs);
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = dayMs * 7;
  const monthThreshold = dayMs * 45;
  const yearThreshold = dayMs * 370;
  const ticks: Date[] = [];

  if (span <= monthThreshold) {
    const stepDays = Math.max(1, Math.ceil(span / dayMs / (count - 1)));
    const current = new Date(minMs);
    current.setUTCHours(0, 0, 0, 0);
    while (current.getTime() <= maxMs) {
      ticks.push(new Date(current.getTime()));
      current.setUTCDate(current.getUTCDate() + stepDays);
    }
  } else if (span <= yearThreshold) {
    const stepWeeks = Math.max(1, Math.ceil(span / weekMs / (count - 1)));
    const current = new Date(minMs);
    current.setUTCHours(0, 0, 0, 0);
    while (current.getUTCDay() !== 1)
      current.setUTCDate(current.getUTCDate() - 1);
    while (current.getTime() <= maxMs) {
      ticks.push(new Date(current.getTime()));
      current.setUTCDate(current.getUTCDate() + stepWeeks * 7);
    }
  } else {
    const stepMonths = Math.max(
      1,
      Math.ceil(span / monthThreshold / (count - 1)),
    );
    const current = new Date(
      Date.UTC(
        new Date(minMs).getUTCFullYear(),
        new Date(minMs).getUTCMonth(),
        1,
      ),
    );
    while (current.getTime() <= maxMs) {
      ticks.push(new Date(current.getTime()));
      current.setUTCMonth(current.getUTCMonth() + stepMonths);
    }
  }

  if (!ticks.length || ticks[0].getTime() !== minMs)
    ticks.unshift(new Date(minMs));
  if (ticks[ticks.length - 1].getTime() !== maxMs) ticks.push(new Date(maxMs));
  return buildTicks(ticks, count);
}

function buildTicks<T>(values: T[], count = 6): T[] {
  if (values.length <= count) return values;
  const step = Math.max(1, Math.floor(values.length / count));
  return values.filter(
    (_value, index) => index % step === 0 || index === values.length - 1,
  );
}

function axisTickCount(axis: AxisConfig | undefined, fallback: number) {
  const tickCount = axis?.tickCount;
  return typeof tickCount === "number" && tickCount > 1
    ? Math.max(2, Math.round(tickCount))
    : fallback;
}

function resolveTickValues<T>(
  axis: AxisConfig | undefined,
  fallback: T[],
  count: number,
) {
  if (axis?.tickValues?.length) {
    return axis.tickValues as T[];
  }
  return buildTicks(fallback, count);
}

function approximateTextWidth(value: string, fontSize = 11) {
  return value.length * fontSize * 0.62;
}

function rotatedLabelWidth(
  labels: string[],
  rotation = 0,
  fontSize = 11,
): number {
  if (!labels.length) return 0;
  const radians = (Math.abs(rotation) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return Math.max(
    ...labels.map((label) => {
      const width = approximateTextWidth(label, fontSize);
      const height = fontSize;
      return Math.abs(width * cosine) + Math.abs(height * sine);
    }),
  );
}

function estimateAxisReserve(
  labels: string[],
  axis: AxisConfig | undefined,
  {
    includeTitle = true,
    fontSize = 11,
    base = 30,
  }: {
    includeTitle?: boolean;
    fontSize?: number;
    base?: number;
  } = {},
) {
  const labelWidth = rotatedLabelWidth(
    labels,
    axis?.labelRotation ?? 0,
    fontSize,
  );
  const titleWidth = includeTitle && axis?.title ? 22 : 0;
  return Math.ceil(labelWidth + base + titleWidth);
}

function renderMarker(
  x: number,
  y: number,
  size: number,
  color: string,
  shape: SeriesConfig["markerShape"] = "circle",
) {
  if (shape === "square") {
    return `<rect x="${x - size}" y="${y - size}" width="${size * 2}" height="${size * 2}" fill="${color}" />`;
  }
  if (shape === "diamond") {
    return `<path d="M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z" fill="${color}" />`;
  }
  return `<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" />`;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function shouldAnimateRender(runtime: ChartRuntime) {
  return (
    runtime.animateOnNextRender &&
    runtime.config.animate !== false &&
    !prefersReducedMotion()
  );
}

function animationTransformOrigin(origin: string) {
  return `transform-box: fill-box; transform-origin: ${origin};`;
}

function wrapAnimatedMarkup(
  runtime: ChartRuntime,
  markup: string,
  preset: AnimationPreset,
  origin = "center center",
) {
  if (!markup || !shouldAnimateRender(runtime)) return markup;
  const delay =
    Math.min(runtime.animationCursor, 18) * RENDER_ANIMATION_STAGGER;
  runtime.animationCursor += 1;
  return `<g data-sx-chart-anim="${preset}" data-sx-chart-anim-delay="${delay}" style="${animationTransformOrigin(origin)}">${markup}</g>`;
}

function animationKeyframes(preset: AnimationPreset): Keyframe[] {
  switch (preset) {
    case "grow-y":
      return [
        { opacity: 0.22, transform: "scaleY(0.08)" },
        { opacity: 1, transform: "scaleY(1)" },
      ];
    case "grow-x":
      return [
        { opacity: 0.22, transform: "scaleX(0.08)" },
        { opacity: 1, transform: "scaleX(1)" },
      ];
    case "pop":
      return [
        { opacity: 0, transform: "scale(0.72)" },
        { opacity: 1, transform: "scale(1)" },
      ];
    case "scale":
      return [
        { opacity: 0, transform: "scale(0.94)" },
        { opacity: 1, transform: "scale(1)" },
      ];
    case "fade-up":
    default:
      return [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ];
  }
}

function runRenderAnimations(runtime: ChartRuntime) {
  if (!shouldAnimateRender(runtime)) return;
  const animatedElements = Array.from(
    runtime.svg.querySelectorAll<SVGGElement>("[data-sx-chart-anim]"),
  );
  animatedElements.forEach((element) => {
    if (typeof element.animate !== "function") return;
    const preset =
      (element.dataset.sxChartAnim as AnimationPreset | undefined) ?? "fade-up";
    const delay = Number(element.dataset.sxChartAnimDelay ?? 0);
    element.animate(animationKeyframes(preset), {
      duration: RENDER_ANIMATION_DURATION,
      delay,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    });
  });
}

function linePath(points: Point[]): string {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function areaPath(points: Point[], baselineY: number): string {
  if (!points.length) return "";
  const top = linePath(points);
  const reversed = [...points].reverse();
  const bottom = reversed.map((point) => `L ${point.x} ${baselineY}`).join(" ");
  return `${top} ${bottom} Z`;
}

function arcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function donutSectorPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const largeArc = endAngle - startAngle <= Math.PI ? "0" : "1";
  if (innerRadius <= 0) {
    return `M ${cx} ${cy} L ${outerStart.x} ${outerStart.y} A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y} Z`;
  }
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): Point {
  return {
    x: cx + Math.cos(angle - Math.PI / 2) * radius,
    y: cy + Math.sin(angle - Math.PI / 2) * radius,
  };
}

function createPieSlices(data: AnyDatum[], valueKey: string): PieSlice[] {
  const values = data.map((datum) => Math.max(0, toNumber(datum[valueKey])));
  const total = sumValues(values) || 1;
  let currentAngle = 0;
  return data.map((datum, index) => {
    const sliceValue = values[index];
    const startAngle = currentAngle;
    const endAngle = currentAngle + (sliceValue / total) * Math.PI * 2;
    currentAngle = endAngle;
    return { startAngle, endAngle, value: sliceValue, datum };
  });
}

function histogram(values: number[], bucketCount = 10): HistogramBucket[] {
  if (!values.length) return [];
  const min = minValue(values);
  const max = maxValue(values);
  const safeMax = max === min ? min + 1 : max;
  const step = (safeMax - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_value, index) => ({
    x0: min + step * index,
    x1: min + step * (index + 1),
    length: 0,
    values: [] as number[],
  }));
  values.forEach((value) => {
    const rawIndex = Math.floor((value - min) / step);
    const index = clamp(rawIndex, 0, bucketCount - 1);
    buckets[index].length += 1;
    buckets[index].values.push(value);
  });
  return buckets;
}

function stackSeries(data: AnyDatum[], keys: string[]) {
  return keys.map((key, seriesIndex) =>
    data.map((datum, datumIndex) => {
      const start = keys
        .slice(0, seriesIndex)
        .reduce(
          (total, previousKey) =>
            total + toNumber(data[datumIndex][previousKey]),
          0,
        );
      const end = start + toNumber(datum[key]);
      return [start, end, datum, key] as const;
    }),
  );
}

function formatTooltip(point: InteractivePoint, config: ChartOptions): string {
  const custom = config.tooltip?.formatter;
  if (custom) return custom(point.raw, point.series);
  return `<strong>${escapeHtml(point.label)}</strong><br />${escapeHtml(point.value)}`;
}

function isTooltipEnabled(config: ChartOptions) {
  return config.tooltip?.enabled !== false;
}

function isHoverEnabled(config: ChartOptions) {
  return config.interactions?.hover !== false;
}

function isAxisEnabled(axis: AxisConfig | undefined) {
  return axis?.enabled !== false;
}

function hideTooltip(runtime: ChartRuntime) {
  runtime.tooltip.classList.remove("is-visible");
  runtime.tooltip.innerHTML = "";
  runtime.liveRegion.textContent = "";
}

function renderDataLabel(
  x: number,
  y: number,
  text: string,
  {
    anchor = "middle",
    baseline = "middle",
    fill = "var(--foreground)",
    stroke,
  }: {
    anchor?: "start" | "middle" | "end";
    baseline?:
      | "auto"
      | "hanging"
      | "middle"
      | "central"
      | "alphabetic"
      | "ideographic";
    fill?: string;
    stroke?: string;
  } = {},
) {
  return `<text data-sx-data-label="true" x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="${baseline}" font-size="11" font-weight="600" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="3" paint-order="stroke"` : ""}>${escapeHtml(text)}</text>`;
}

function createTreemapRects(
  data: AnyDatum[],
  valueKey: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const total =
    sumValues(data.map((datum) => Math.max(0, toNumber(datum[valueKey])))) || 1;
  let cursor = x;
  return data.map((datum) => {
    const ratio = Math.max(0, toNumber(datum[valueKey])) / total;
    const rectWidth = width * ratio;
    const rect = { x: cursor, y, width: rectWidth, height, datum };
    cursor += rectWidth;
    return rect;
  });
}

function createSankeyLayout(
  nodesInput: Array<{ id: string; name?: string; value?: number }>,
  linksInput: Array<{ source: string; target: string; value: number }>,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const nodeMap = new Map<string, SankeyNode>();
  nodesInput.forEach((node) => {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.name ?? node.id,
      value: node.value ?? 0,
      level: 0,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
    });
  });

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  linksInput.forEach((link) => {
    outgoing.set(link.source, (outgoing.get(link.source) ?? 0) + link.value);
    incoming.set(link.target, (incoming.get(link.target) ?? 0) + link.value);
  });

  nodeMap.forEach((node) => {
    node.value = Math.max(
      node.value,
      incoming.get(node.id) ?? 0,
      outgoing.get(node.id) ?? 0,
      1,
    );
  });

  let changed = true;
  while (changed) {
    changed = false;
    linksInput.forEach((link) => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) return;
      const nextLevel = source.level + 1;
      if (target.level < nextLevel) {
        target.level = nextLevel;
        changed = true;
      }
    });
  }

  const columns = groupBy(Array.from(nodeMap.values()), (node) =>
    String(node.level),
  ).sort((a, b) => Number(a[0]) - Number(b[0]));
  const maxLevel = Math.max(
    0,
    ...Array.from(nodeMap.values()).map((node) => node.level),
  );
  const columnWidth = width / Math.max(1, maxLevel + 1);
  const nodeWidth = Math.min(24, columnWidth * 0.18);
  const pixelsPerUnit = columns.reduce((best, [_levelText, nodes]) => {
    const gap = 18;
    const availableHeight = height - gap * Math.max(0, nodes.length - 1);
    const columnTotal = sumValues(nodes.map((node) => node.value)) || 1;
    return Math.min(best, availableHeight / columnTotal);
  }, Number.POSITIVE_INFINITY);
  columns.forEach(([levelText, nodes]) => {
    const level = Number(levelText);
    const gap = 18;
    const columnHeight =
      sumValues(nodes.map((node) => node.value)) * pixelsPerUnit +
      gap * Math.max(0, nodes.length - 1);
    let cursorY = y + Math.max(0, (height - columnHeight) / 2);
    nodes.forEach((node) => {
      const nodeHeight = Math.max(18, node.value * pixelsPerUnit);
      node.x0 = x + level * columnWidth;
      node.x1 = node.x0 + nodeWidth;
      node.y0 = cursorY;
      node.y1 = cursorY + nodeHeight;
      cursorY += nodeHeight + gap;
    });
  });

  const sourceOffsets = new Map<string, number>();
  const targetOffsets = new Map<string, number>();
  const links: SankeyLink[] = linksInput.map((link) => {
    const source = nodeMap.get(link.source)!;
    const target = nodeMap.get(link.target)!;
    const widthFactor = Math.max(4, link.value * pixelsPerUnit);
    const sourceOffset = sourceOffsets.get(link.source) ?? 0;
    const targetOffset = targetOffsets.get(link.target) ?? 0;
    const sourceY = source.y0 + sourceOffset + widthFactor / 2;
    const targetY = target.y0 + targetOffset + widthFactor / 2;
    sourceOffsets.set(link.source, sourceOffset + widthFactor);
    targetOffsets.set(link.target, targetOffset + widthFactor);
    return {
      source: link.source,
      target: link.target,
      value: link.value,
      sourceY,
      targetY,
      width: widthFactor,
    };
  });

  return { nodes: Array.from(nodeMap.values()), links };
}

function sankeyLinkPath(
  sourceX: number,
  targetX: number,
  sourceY: number,
  targetY: number,
): string {
  const curve = (targetX - sourceX) * 0.5;
  return `M ${sourceX} ${sourceY} C ${sourceX + curve} ${sourceY}, ${targetX - curve} ${targetY}, ${targetX} ${targetY}`;
}

function projectionPoint(
  lon: number,
  lat: number,
  type: ProjectionType,
): Point {
  const lambda = (lon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  if (type === "orthographic") {
    return { x: Math.cos(phi) * Math.sin(lambda), y: Math.sin(phi) };
  }
  if (type === "equal-earth") {
    return { x: lambda * 0.8 * Math.cos(phi * 0.45), y: phi * 0.75 };
  }
  const clampedPhi =
    (clamp(lat, -WEB_MERCATOR_MAX_LATITUDE, WEB_MERCATOR_MAX_LATITUDE) *
      Math.PI) /
    180;
  return { x: lambda, y: Math.log(Math.tan(Math.PI / 4 + clampedPhi / 2)) };
}

function collectGeoPoints(
  geometry: any,
  type: ProjectionType,
  points: Point[],
) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring: number[][]) =>
      ring.forEach(([lon, lat]) =>
        points.push(projectionPoint(lon, lat, type)),
      ),
    );
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon: number[][][]) =>
      polygon.forEach((ring) =>
        ring.forEach(([lon, lat]) =>
          points.push(projectionPoint(lon, lat, type)),
        ),
      ),
    );
  } else if (geometry.type === "LineString") {
    geometry.coordinates.forEach(([lon, lat]: number[]) =>
      points.push(projectionPoint(lon, lat, type)),
    );
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach((line: number[][]) =>
      line.forEach(([lon, lat]) =>
        points.push(projectionPoint(lon, lat, type)),
      ),
    );
  } else if (geometry.type === "Point") {
    points.push(
      projectionPoint(geometry.coordinates[0], geometry.coordinates[1], type),
    );
  }
}

function geoTransform(
  features: any[],
  type: ProjectionType,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const points: Point[] = [];
  features.forEach((feature) =>
    collectGeoPoints(feature.geometry, type, points),
  );
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = minValue(xs);
  const maxX = maxValue(xs);
  const minY = minValue(ys);
  const maxY = maxValue(ys);
  const safeWidth = maxX === minX ? 1 : maxX - minX;
  const safeHeight = maxY === minY ? 1 : maxY - minY;
  const scale = Math.min(
    (width * 0.98) / safeWidth,
    (height * 0.98) / safeHeight,
  );
  const offsetX = x + (width - safeWidth * scale) / 2 - minX * scale;
  const offsetY = y + (height - safeHeight * scale) / 2 + maxY * scale;
  return (lon: number, lat: number) => {
    const projected = projectionPoint(lon, lat, type);
    return {
      x: projected.x * scale + offsetX,
      y: offsetY - projected.y * scale,
    };
  };
}

function collectTransformedGeometryPoints(
  geometry: any,
  transform: (lon: number, lat: number) => Point,
  points: Point[],
) {
  if (!geometry) return;
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring: number[][]) =>
      ring.forEach(([lon, lat]) => points.push(transform(lon, lat))),
    );
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon: number[][][]) =>
      polygon.forEach((ring) =>
        ring.forEach(([lon, lat]) => points.push(transform(lon, lat))),
      ),
    );
  } else if (geometry.type === "LineString") {
    geometry.coordinates.forEach(([lon, lat]: number[]) =>
      points.push(transform(lon, lat)),
    );
  } else if (geometry.type === "MultiLineString") {
    geometry.coordinates.forEach((line: number[][]) =>
      line.forEach(([lon, lat]) => points.push(transform(lon, lat))),
    );
  } else if (geometry.type === "Point") {
    points.push(transform(geometry.coordinates[0], geometry.coordinates[1]));
  }
}

function featureAnchorPoint(
  geometry: any,
  transform: (lon: number, lat: number) => Point,
  fallback: Point,
): Point {
  const points: Point[] = [];
  collectTransformedGeometryPoints(geometry, transform, points);
  if (!points.length) return fallback;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x: (minValue(xs) + maxValue(xs)) / 2,
    y: (minValue(ys) + maxValue(ys)) / 2,
  };
}

function pointsMatch(a: number[], b: number[]) {
  return Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function crossesAntimeridian(a: number[], b: number[]) {
  return Math.abs(b[0] - a[0]) > 180;
}

function antimeridianSplitPoints(a: number[], b: number[]) {
  if (a[0] < 0 && b[0] > 0) {
    const adjustedLon = b[0] - 360;
    const denominator = adjustedLon - a[0];
    const t = Math.abs(denominator) < 1e-9 ? 0.5 : (-180 - a[0]) / denominator;
    const lat = a[1] + (b[1] - a[1]) * t;
    return {
      endPoint: [-180, lat] as number[],
      startPoint: [180, lat] as number[],
    };
  }

  const adjustedLon = b[0] + 360;
  const denominator = adjustedLon - a[0];
  const t = Math.abs(denominator) < 1e-9 ? 0.5 : (180 - a[0]) / denominator;
  const lat = a[1] + (b[1] - a[1]) * t;
  return {
    endPoint: [180, lat] as number[],
    startPoint: [-180, lat] as number[],
  };
}

function splitClosedRingAtAntimeridian(ring: number[][]) {
  const baseRing =
    ring.length > 1 && pointsMatch(ring[0], ring[ring.length - 1])
      ? ring.slice(0, -1)
      : ring.slice();
  if (baseRing.length < 2) return [baseRing];

  const firstCrossingIndex = baseRing.findIndex((point, index) =>
    crossesAntimeridian(point, baseRing[(index + 1) % baseRing.length]),
  );
  if (firstCrossingIndex === -1) return [baseRing];

  const crossing = antimeridianSplitPoints(
    baseRing[firstCrossingIndex],
    baseRing[(firstCrossingIndex + 1) % baseRing.length],
  );
  const rotated = baseRing
    .slice(firstCrossingIndex + 1)
    .concat(baseRing.slice(0, firstCrossingIndex + 1));

  const segments: number[][][] = [];
  let current = [crossing.startPoint, rotated[0]];

  for (let index = 1; index < rotated.length; index += 1) {
    const previous = rotated[index - 1];
    const point = rotated[index];
    if (crossesAntimeridian(previous, point)) {
      const split = antimeridianSplitPoints(previous, point);
      current.push(split.endPoint);
      segments.push(current);
      current = [split.startPoint, point];
      continue;
    }
    current.push(point);
  }

  current.push(crossing.endPoint);
  segments.push(current);
  return segments;
}

function splitOpenLineAtAntimeridian(line: number[][]) {
  if (line.length < 2) return [line];
  const segments: number[][][] = [];
  let current = [line[0]];

  for (let index = 1; index < line.length; index += 1) {
    const previous = line[index - 1];
    const point = line[index];
    if (crossesAntimeridian(previous, point)) {
      const split = antimeridianSplitPoints(previous, point);
      current.push(split.endPoint);
      segments.push(current);
      current = [split.startPoint, point];
      continue;
    }
    current.push(point);
  }

  segments.push(current);
  return segments;
}

function geoPathString(
  geometry: any,
  transform: (lon: number, lat: number) => Point,
): string {
  if (!geometry) return "";
  const lineForPoints = (points: number[][], close = false) =>
    points
      .map(([lon, lat], index) => {
        const point = transform(lon, lat);
        return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
      })
      .join(" ") + (close ? " Z" : "");
  const lineForRing = (ring: number[][]) =>
    splitClosedRingAtAntimeridian(ring)
      .map((segment) => lineForPoints(segment, true))
      .join(" ");
  if (geometry.type === "Polygon") {
    return geometry.coordinates
      .map((ring: number[][]) => lineForRing(ring))
      .join(" ");
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .flatMap((polygon: number[][][]) =>
        polygon.map((ring) => lineForRing(ring)),
      )
      .join(" ");
  }
  if (geometry.type === "LineString") {
    return splitOpenLineAtAntimeridian(geometry.coordinates)
      .map((segment) => lineForPoints(segment))
      .join(" ");
  }
  return "";
}

function download(content: Blob | string, fileName: string, mimeType: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function renderAxes({
  plotX,
  plotY,
  plotWidth,
  plotHeight,
  xTicks,
  yTicks,
  y2Ticks = [],
  config,
  theme,
  xToCoord,
  yToCoord,
  y2ToCoord,
  horizontalBars = false,
}: {
  plotX: number;
  plotY: number;
  plotWidth: number;
  plotHeight: number;
  xTicks: Array<string | number | Date>;
  yTicks: Array<string | number | Date>;
  y2Ticks?: Array<string | number | Date>;
  config: ChartOptions;
  theme: ThemeConfig;
  xToCoord: (value: unknown) => number;
  yToCoord: (value: unknown) => number;
  y2ToCoord?: (value: unknown) => number;
  horizontalBars?: boolean;
}): { grid: string; axes: string } {
  const xAxis = config.axes?.x;
  const yAxis = config.axes?.y;
  const yAxis2 = config.axes?.y2;
  const xAxisEnabled = isAxisEnabled(xAxis);
  const yAxisEnabled = isAxisEnabled(yAxis);
  const y2AxisEnabled = isAxisEnabled(yAxis2);
  const xRotation = xAxis?.labelRotation ?? 0;
  const yRotation = yAxis?.labelRotation ?? 0;
  const y2Rotation = yAxis2?.labelRotation ?? 0;

  if (horizontalBars) {
    const verticalGrid =
      !yAxisEnabled || yAxis?.grid === false
        ? ""
        : xTicks
            .map((tick) => {
              const x = xToCoord(tick);
              return `<line x1="${x}" y1="${plotY}" x2="${x}" y2="${plotY + plotHeight}" stroke="${theme.grid}" stroke-width="1" />`;
            })
            .join("");
    const horizontalGrid =
      xAxisEnabled && xAxis?.grid
        ? yTicks
            .map((tick) => {
              const y = yToCoord(tick);
              return `<line x1="${plotX}" y1="${y}" x2="${plotX + plotWidth}" y2="${y}" stroke="${theme.grid}" stroke-width="1" />`;
            })
            .join("")
        : "";
    const xMarkup = yAxisEnabled
      ? xTicks
          .map((tick) => {
            const x = xToCoord(tick);
            return `<g transform="translate(${x}, ${plotY + plotHeight})">
        <line y2="6" stroke="${theme.axis}" />
        <text y="${xRotation ? 16 : 22}" text-anchor="${xRotation > 0 ? "start" : xRotation < 0 ? "end" : "middle"}" fill="${theme.muted}" font-size="11"${xRotation ? ` transform="rotate(${xRotation})"` : ""}>${escapeHtml(formatValue(tick, yAxis, config.locale, config.timeZone))}</text>
      </g>`;
          })
          .join("")
      : "";
    const yMarkup = xAxisEnabled
      ? yTicks
          .map((tick) => {
            const y = yToCoord(tick);
            return `<g transform="translate(${plotX}, ${y})">
        <line x2="-6" stroke="${theme.axis}" />
        <text x="-12" dy="0.35em" text-anchor="end" fill="${theme.muted}" font-size="11"${yRotation ? ` transform="rotate(${yRotation}, -12, 0)"` : ""}>${escapeHtml(formatValue(tick, xAxis, config.locale, config.timeZone))}</text>
      </g>`;
          })
          .join("")
      : "";
    return {
      grid: `<g class="sx-grid">${verticalGrid}${horizontalGrid}</g>`,
      axes: `
      <g class="sx-axis sx-axis-x">
        ${yAxisEnabled ? `<line x1="${plotX}" y1="${plotY + plotHeight}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight}" stroke="${theme.axis}" />` : ""}
        ${xMarkup}
        ${yAxisEnabled && yAxis?.title ? `<text x="${plotX + plotWidth / 2}" y="${plotY + plotHeight + 38}" text-anchor="middle" fill="${theme.foreground}" font-size="12" font-weight="600">${escapeHtml(yAxis.title)}</text>` : ""}
      </g>
      <g class="sx-axis sx-axis-y">
        ${xAxisEnabled ? `<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotHeight}" stroke="${theme.axis}" />` : ""}
        ${yMarkup}
        ${xAxisEnabled && xAxis?.title ? `<text x="${plotX - 44}" y="${plotY + plotHeight / 2}" text-anchor="middle" fill="${theme.foreground}" font-size="12" font-weight="600" transform="rotate(-90, ${plotX - 44}, ${plotY + plotHeight / 2})">${escapeHtml(xAxis.title)}</text>` : ""}
      </g>
    `,
    };
  }

  const horizontalGrid =
    !yAxisEnabled || yAxis?.grid === false
      ? ""
      : yTicks
          .map((tick) => {
            const y = yToCoord(tick);
            return `<line x1="${plotX}" y1="${y}" x2="${plotX + plotWidth}" y2="${y}" stroke="${theme.grid}" stroke-width="1" />`;
          })
          .join("");
  const verticalGrid =
    xAxisEnabled && xAxis?.grid
      ? xTicks
          .map((tick) => {
            const x = xToCoord(tick);
            return `<line x1="${x}" y1="${plotY}" x2="${x}" y2="${plotY + plotHeight}" stroke="${theme.grid}" stroke-width="1" />`;
          })
          .join("")
      : "";
  const xMarkup = xAxisEnabled
    ? xTicks
        .map((tick) => {
          const x = xToCoord(tick);
          return `<g transform="translate(${x}, ${plotY + plotHeight})">
      <line y2="6" stroke="${theme.axis}" />
      <text y="${xRotation ? 16 : 22}" text-anchor="${xRotation > 0 ? "start" : xRotation < 0 ? "end" : "middle"}" fill="${theme.muted}" font-size="11"${xRotation ? ` transform="rotate(${xRotation})"` : ""}>${escapeHtml(formatValue(tick, xAxis, config.locale, config.timeZone))}</text>
    </g>`;
        })
        .join("")
    : "";
  const yMarkup = yAxisEnabled
    ? yTicks
        .map((tick) => {
          const y = yToCoord(tick);
          return `<g transform="translate(${plotX}, ${y})">
      <line x2="-6" stroke="${theme.axis}" />
      <text x="-12" dy="0.35em" text-anchor="end" fill="${theme.muted}" font-size="11"${yRotation ? ` transform="rotate(${yRotation}, -12, 0)"` : ""}>${escapeHtml(formatValue(tick, yAxis, config.locale, config.timeZone))}</text>
    </g>`;
        })
        .join("")
    : "";
  const y2Markup =
    y2AxisEnabled && y2ToCoord && y2Ticks.length
      ? y2Ticks
          .map((tick) => {
            const y = y2ToCoord(tick);
            return `<g transform="translate(${plotX + plotWidth}, ${y})">
      <line x2="6" stroke="${theme.axis}" />
      <text x="12" dy="0.35em" text-anchor="start" fill="${theme.muted}" font-size="11"${y2Rotation ? ` transform="rotate(${y2Rotation}, 12, 0)"` : ""}>${escapeHtml(formatValue(tick, yAxis2, config.locale, config.timeZone))}</text>
    </g>`;
          })
          .join("")
      : "";
  return {
    grid: `<g class="sx-grid">${horizontalGrid}${verticalGrid}</g>`,
    axes: `
    <g class="sx-axis sx-axis-x">
      ${xAxisEnabled ? `<line x1="${plotX}" y1="${plotY + plotHeight}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight}" stroke="${theme.axis}" />` : ""}
      ${xMarkup}
      ${xAxisEnabled && xAxis?.title ? `<text x="${plotX + plotWidth / 2}" y="${plotY + plotHeight + 38}" text-anchor="middle" fill="${theme.foreground}" font-size="12" font-weight="600">${escapeHtml(xAxis.title)}</text>` : ""}
    </g>
    <g class="sx-axis sx-axis-y">
      ${yAxisEnabled ? `<line x1="${plotX}" y1="${plotY}" x2="${plotX}" y2="${plotY + plotHeight}" stroke="${theme.axis}" />` : ""}
      ${yMarkup}
      ${yAxisEnabled && yAxis?.title ? `<text x="${plotX - 44}" y="${plotY + plotHeight / 2}" text-anchor="middle" fill="${theme.foreground}" font-size="12" font-weight="600" transform="rotate(-90, ${plotX - 44}, ${plotY + plotHeight / 2})">${escapeHtml(yAxis.title)}</text>` : ""}
    </g>
    <g class="sx-axis sx-axis-y2">
      ${y2AxisEnabled && y2Markup ? `<line x1="${plotX + plotWidth}" y1="${plotY}" x2="${plotX + plotWidth}" y2="${plotY + plotHeight}" stroke="${theme.axis}" />` : ""}
      ${y2Markup}
      ${y2AxisEnabled && yAxis2?.title && y2Markup ? `<text x="${plotX + plotWidth + 44}" y="${plotY + plotHeight / 2}" text-anchor="middle" fill="${theme.foreground}" font-size="12" font-weight="600" transform="rotate(90, ${plotX + plotWidth + 44}, ${plotY + plotHeight / 2})">${escapeHtml(yAxis2.title)}</text>` : ""}
    </g>
  `,
  };
}

function resolveLegendPosition(config: ChartOptions) {
  if (config.legend?.inside) return "inside";
  return config.legend?.position ?? "top";
}

function legendItemLabel(config: ChartOptions, label: string) {
  return config.legend?.labelFormatter ? config.legend.labelFormatter(label) : label;
}

function renderLegendMarker(
  shape: LegendConfig["itemShape"],
  color: string,
  hidden: boolean,
) {
  if (shape === "line") {
    return `<line x1="-6" y1="0" x2="6" y2="0" stroke="${color}" stroke-width="2.5" stroke-linecap="round" />`;
  }
  if (shape === "square") {
    return `<rect x="-5" y="-5" width="10" height="10" rx="2" fill="${hidden ? "transparent" : color}" stroke="${color}" stroke-width="2" />`;
  }
  return `<circle cx="0" cy="0" r="5" fill="${hidden ? "transparent" : color}" stroke="${color}" stroke-width="2" />`;
}

function estimateLegendItemWidth(config: ChartOptions, label: string) {
  return 34 + legendItemLabel(config, label).length * 7 + (config.legend?.itemSpacing ?? 18);
}

function buildLegendRows(
  entries: LegendEntry[],
  config: ChartOptions,
  availableWidth: number,
) {
  const layout =
    config.legend?.layout ??
    (["left", "right"].includes(resolveLegendPosition(config))
      ? "vertical"
      : "horizontal");
  const rows: LegendEntry[][] = [];

  if (layout === "vertical") {
    return entries.map((entry) => [entry]);
  }

  if (layout === "horizontal") {
    return [entries];
  }

  let currentRow: LegendEntry[] = [];
  let currentWidth = 0;
  entries.forEach((entry) => {
    const width = estimateLegendItemWidth(config, entry.label);
    if (currentRow.length && currentWidth + width > availableWidth) {
      rows.push(currentRow);
      currentRow = [entry];
      currentWidth = width;
      return;
    }
    currentRow.push(entry);
    currentWidth += width;
  });
  if (currentRow.length) rows.push(currentRow);
  return rows.length ? rows : [entries];
}

function legendBlockHeight(
  config: ChartOptions,
  legendEntries: LegendEntry[],
  availableWidth: number,
) {
  if (config.legend?.enabled === false || !legendEntries.length) return 0;
  const position = resolveLegendPosition(config);
  if (position === "left" || position === "right" || position === "inside") {
    return 0;
  }
  const rows = buildLegendRows(legendEntries, config, availableWidth);
  const pageable = (config.legend?.pagination || config.legend?.scroll) && rows.length > 1;
  return (pageable ? 58 : 18) + Math.max(1, pageable ? 1 : rows.length) * 22;
}

function legendBlockWidth(
  config: ChartOptions,
  legendEntries: LegendEntry[],
  availableWidth: number,
) {
  if (config.legend?.enabled === false || !legendEntries.length) return 0;
  const position = resolveLegendPosition(config);
  if (position !== "left" && position !== "right") return 0;
  const rows = buildLegendRows(legendEntries, config, availableWidth);
  return Math.max(
    120,
    ...rows.map((row) =>
      row.reduce((total, entry) => total + estimateLegendItemWidth(config, entry.label), 0),
    ),
  );
}

function renderLegend(
  entries: LegendEntry[],
  theme: ThemeConfig,
  state: ChartState,
  config: ChartOptions,
  availableWidth: number,
  runtime: ChartRuntime,
) {
  const rows = buildLegendRows(entries, config, availableWidth);
  const itemSpacing = config.legend?.itemSpacing ?? 18;
  const alignment = config.legend?.alignment ?? "start";
  const shape = config.legend?.itemShape ?? "dot";
  const pageable = (config.legend?.pagination || config.legend?.scroll) && rows.length > 1;
  const page = pageable ? clamp(runtime.legendPage, 0, rows.length - 1) : 0;
  runtime.legendPage = page;
  const visibleRows = pageable ? rows.slice(page, page + 1) : rows;
  const rowMarkup = visibleRows
    .map((row, rowIndex) => {
      const rowWidth = row.reduce(
        (total, entry) => total + estimateLegendItemWidth(config, entry.label),
        0,
      );
      const startX =
        alignment === "center"
          ? Math.max(0, (availableWidth - rowWidth) / 2)
          : alignment === "end"
            ? Math.max(0, availableWidth - rowWidth)
            : 0;
      let cursorX = startX + 16;
      const y = rowIndex * 22 + 18;
      return row
        .map((item) => {
          const hidden = state.hiddenSeries.has(item.key);
          const label = legendItemLabel(config, item.label);
          const width = estimateLegendItemWidth(config, item.label);
          const markup = `<g class="sx-legend-item${hidden ? " is-hidden" : ""}" data-series="${escapeHtml(item.key)}" transform="translate(${cursorX}, ${y})" tabindex="0" role="button" aria-pressed="${hidden ? "false" : "true"}">
      ${renderLegendMarker(shape, item.color, hidden)}
      <text x="12" y="4" fill="${hidden ? theme.muted : theme.foreground}" font-size="12">${escapeHtml(label)}</text>
    </g>`;
          cursorX += width + itemSpacing;
          return markup;
        })
        .join("");
    })
    .join("");

  const controls =
    pageable
      ? `<g class="sx-legend-pagination" transform="translate(16, 18)">
      <g data-sx-legend-page="prev" role="button" tabindex="0" aria-label="Previous legend page">
        <rect x="0" y="-11" width="22" height="18" rx="5" fill="transparent" stroke="${theme.axis}" />
        <path d="M 14 -6 L 8 -2 L 14 2" fill="none" stroke="${theme.foreground}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>
      <text x="34" y="2" fill="${theme.muted}" font-size="11">${page + 1} / ${rows.length}</text>
      <g data-sx-legend-page="next" role="button" tabindex="0" aria-label="Next legend page" transform="translate(72, 0)">
        <rect x="0" y="-11" width="22" height="18" rx="5" fill="transparent" stroke="${theme.axis}" />
        <path d="M 8 -6 L 14 -2 L 8 2" fill="none" stroke="${theme.foreground}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    </g>`
      : "";

  return `${controls}<g transform="translate(0, ${pageable ? 18 : 0})">${rowMarkup}</g>`;
}

function getResolvedSeries(
  config: ChartOptions,
  theme: ThemeConfig,
  data: AnyDatum[],
  type: ChartType,
) {
  return ensureSeries(config, data, type)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((series, index) => ({
      ...series,
      color: seriesColor(series, theme, index),
    }));
}

function getVisibleSeries(series: SeriesConfig[], state: ChartState) {
  return series.filter(
    (entry, index) =>
      entry.visible !== false &&
      !state.hiddenSeries.has(seriesKey(entry, index)),
  );
}

function resolveLegendEntries(
  config: ChartOptions,
  theme: ThemeConfig,
  data: AnyDatum[],
  type: ChartType,
  allSeries: SeriesConfig[],
): LegendEntry[] {
  if (type === "pie" && allSeries.length) {
    const series = allSeries[0];
    const labelKey = series.xKey ?? "label";
    return data.map((datum, index) => ({
      key: String(datum[labelKey] ?? `Slice ${index + 1}`),
      label: String(datum[labelKey] ?? `Slice ${index + 1}`),
      color:
        theme.palette?.[index % (theme.palette?.length ?? 1)] ??
        series.color ??
        "var(--primary)",
    }));
  }

  return allSeries.map((series, index) => ({
    key: seriesKey(series, index),
    label: series.name ?? `Series ${index + 1}`,
    color: series.color ?? seriesColor(series, theme, index),
  }));
}

function pointsForLine(
  data: AnyDatum[],
  series: SeriesConfig,
  xToCoord: (value: unknown) => number,
  yToCoord: (value: number) => number,
) {
  return data
    .map((datum) => {
      const rawX = datum[series.xKey ?? "x"];
      const rawY = datum[series.yKey ?? "y"];
      if (rawY == null) return null;
      return {
        point: { x: xToCoord(rawX), y: yToCoord(toNumber(rawY)) },
        rawX,
        rawY,
        datum,
      };
    })
    .filter(Boolean) as Array<{
    point: Point;
    rawX: unknown;
    rawY: unknown;
    datum: AnyDatum;
  }>;
}

function matchesSeriesIdentifier(
  series: SeriesConfig,
  index: number,
  identifier: string | undefined,
) {
  if (!identifier) return true;
  return [series.id, series.name, seriesKey(series, index)].includes(
    identifier,
  );
}

function supportsTrendline(type: ChartType) {
  return (
    type === "line" ||
    type === "area" ||
    type === "scatter" ||
    type === "bubble" ||
    type === "bar" ||
    type === "combo" ||
    type === "multi-axis"
  );
}

function trendlineColor(
  trendline: TrendlineConfig,
  fallback: string | undefined,
  theme: ThemeConfig,
) {
  return trendline.color ?? fallback ?? theme.foreground ?? "var(--foreground)";
}

function renderTrendlineLabel(
  x: number,
  y: number,
  label: string | undefined,
  color: string,
) {
  if (!label) return "";
  return `<text x="${x}" y="${y}" text-anchor="end" font-size="11" font-weight="600" fill="${color}">${escapeHtml(label)}</text>`;
}

function renderCartesianEvents(
  events: ChartEventConfig[] | undefined,
  xToCoord: (value: unknown) => number,
  coordToX: (coord: number) => number,
  plotX: number,
  plotY: number,
  plotWidth: number,
  plotHeight: number,
  theme: ThemeConfig,
) {
  if (!events?.length) return { underlay: "", overlay: "" };
  const visibleStart = coordToX(plotX);
  const visibleEnd = coordToX(plotX + plotWidth);
  const minX = Math.min(visibleStart, visibleEnd);
  const maxX = Math.max(visibleStart, visibleEnd);
  const underlay: string[] = [];
  const overlay: string[] = [];

  events.forEach((event, index) => {
    const start = toOptionalDateMs(event.startDate ?? event.date);
    const end = toOptionalDateMs(event.endDate ?? event.date);
    if (start == null || end == null) return;
    const rangeStart = Math.min(start, end);
    const rangeEnd = Math.max(start, end);
    if (rangeEnd < minX || rangeStart > maxX) return;

    const color =
      event.color ??
      theme.palette?.[index % (theme.palette?.length ?? 1)] ??
      theme.foreground;
    const textColor = event.textColor ?? color;
    const clampedStart = clamp(rangeStart, minX, maxX);
    const clampedEnd = clamp(rangeEnd, minX, maxX);
    const startCoord = xToCoord(clampedStart);
    const endCoord = xToCoord(clampedEnd);
    const label = event.label ? escapeHtml(event.label) : "";

    if (Math.abs(endCoord - startCoord) < 1) {
      overlay.push(
        `<g data-sx-event="${escapeHtml(event.id ?? `event-${index}`)}" data-sx-event-kind="line"><line x1="${startCoord}" y1="${plotY}" x2="${startCoord}" y2="${plotY + plotHeight}" stroke="${color}" stroke-width="2" stroke-dasharray="5 5" />${label ? `<text x="${Math.min(plotX + plotWidth - 6, startCoord + 6)}" y="${plotY + 14}" font-size="11" fill="${textColor}">${label}</text>` : ""}</g>`,
      );
      return;
    }

    underlay.push(
      `<g data-sx-event="${escapeHtml(event.id ?? `event-${index}`)}" data-sx-event-kind="range"><rect x="${Math.min(startCoord, endCoord)}" y="${plotY}" width="${Math.max(1, Math.abs(endCoord - startCoord))}" height="${plotHeight}" fill="${color}" fill-opacity="${event.opacity ?? 0.12}" rx="8" />${label ? `<text x="${Math.min(plotX + plotWidth - 6, Math.min(startCoord, endCoord) + 8)}" y="${plotY + 14}" font-size="11" fill="${textColor}">${label}</text>` : ""}</g>`,
    );
  });

  return { underlay: underlay.join(""), overlay: overlay.join("") };
}

function renderCartesianTrendlines(
  trendlines: TrendlineConfig[] | undefined,
  data: AnyDatum[],
  chartType: ChartType,
  visibleSeries: SeriesConfig[],
  xScaleType: AxisConfig["scaleType"],
  xToCoord: (value: unknown) => number,
  yToCoord: (value: unknown) => number,
  y2ToCoord: ((value: unknown) => number) | undefined,
  plotX: number,
  plotWidth: number,
  config: ChartOptions,
  theme: ThemeConfig,
) {
  if (!trendlines?.length) return "";
  const markup: string[] = [];

  trendlines
    .filter((trendline) => trendline.visible !== false)
    .forEach((trendline, trendlineIndex) => {
      if (trendline.type === "target") {
        const value = trendline.value;
        if (!isNumber(value)) return;
        const targetScale =
          trendline.axis === "y2" && y2ToCoord ? y2ToCoord : yToCoord;
        const y = targetScale(value);
        const color = trendlineColor(
          trendline,
          trendline.axis === "y2"
            ? (theme.muted ?? theme.foreground)
            : (theme.foreground ?? theme.muted),
          theme,
        );
        markup.push(
          `<g data-sx-trendline="${escapeHtml(trendline.id ?? `target-${trendlineIndex}`)}" data-sx-trendline-kind="target"><line x1="${plotX}" y1="${y}" x2="${plotX + plotWidth}" y2="${y}" stroke="${color}" stroke-width="${trendline.strokeWidth ?? 2}" stroke-dasharray="${trendline.dashStyle ?? "8 6"}" />${renderTrendlineLabel(plotX + plotWidth - 6, y - 6, trendline.label ?? formatValue(value, trendline.axis === "y2" ? config.axes?.y2 : config.axes?.y, config.locale, config.timeZone), color)}</g>`,
        );
        return;
      }

      const targetSeries = visibleSeries.filter((series, seriesIndex) => {
        const effectiveType =
          chartType === "combo"
            ? (series.type ?? (seriesIndex % 2 === 0 ? "bar" : "line"))
            : chartType === "multi-axis"
              ? (series.type ?? "line")
              : (series.type ?? chartType);
        return (
          supportsTrendline(effectiveType) &&
          matchesSeriesIdentifier(series, seriesIndex, trendline.seriesId)
        );
      });

      targetSeries.forEach((series, seriesIndex) => {
        const points = data
          .map((datum, datumIndex) => {
            const rawX = datum[series.xKey ?? "x"];
            const rawY = datum[series.yKey ?? series.valueKey ?? "y"];
            const yValue = toNumber(rawY);
            if (!Number.isFinite(yValue)) return null;
            const xValue =
              xScaleType === "time"
                ? toDateMs(rawX)
                : xScaleType === "category"
                  ? datumIndex
                  : toNumber(rawX);
            if (!Number.isFinite(xValue)) return null;
            return { rawX, xValue, yValue };
          })
          .filter(Boolean) as Array<{
          rawX: unknown;
          xValue: number;
          yValue: number;
        }>;
        if (points.length < 2) return;

        const sumX = sumValues(points.map((point) => point.xValue));
        const sumY = sumValues(points.map((point) => point.yValue));
        const sumXY = sumValues(
          points.map((point) => point.xValue * point.yValue),
        );
        const sumXX = sumValues(
          points.map((point) => point.xValue * point.xValue),
        );
        const denominator = points.length * sumXX - sumX * sumX;
        const slope =
          Math.abs(denominator) < 1e-9
            ? 0
            : (points.length * sumXY - sumX * sumY) / denominator;
        const intercept = (sumY - slope * sumX) / points.length;
        const first = points[0];
        const last = points[points.length - 1];
        const startXValue =
          xScaleType === "category"
            ? first.xValue
            : minValue(points.map((point) => point.xValue));
        const endXValue =
          xScaleType === "category"
            ? last.xValue
            : maxValue(points.map((point) => point.xValue));
        const startCoord =
          xScaleType === "category"
            ? xToCoord(first.rawX)
            : xToCoord(startXValue);
        const endCoord =
          xScaleType === "category" ? xToCoord(last.rawX) : xToCoord(endXValue);
        const targetScale =
          series.axis === "y2" && y2ToCoord ? y2ToCoord : yToCoord;
        const startY = targetScale(slope * startXValue + intercept);
        const endY = targetScale(slope * endXValue + intercept);
        const color = trendlineColor(
          trendline,
          series.color ?? theme.foreground ?? "var(--foreground)",
          theme,
        );
        const resolvedIndex = visibleSeries.indexOf(series);

        markup.push(
          `<g data-sx-trendline="${escapeHtml(trendline.id ?? `${series.id ?? `series-${resolvedIndex}`}-auto`)}" data-sx-trendline-kind="auto"><line x1="${startCoord}" y1="${startY}" x2="${endCoord}" y2="${endY}" stroke="${color}" stroke-width="${trendline.strokeWidth ?? 2}" stroke-dasharray="${trendline.dashStyle ?? "6 6"}" />${renderTrendlineLabel(endCoord - 4, endY - 8, trendline.label ?? `${series.name ?? `Series ${resolvedIndex + 1}`} trend`, color)}</g>`,
        );
      });
    });

  return markup.join("");
}

function decimate<T>(values: T[], limit: number): T[] {
  if (values.length <= limit) return values;
  const stride = Math.ceil(values.length / limit);
  return values.filter(
    (_value, index) => index % stride === 0 || index === values.length - 1,
  );
}

function estimateHoverThreshold(
  points: InteractivePoint[],
  axis: "x" | "y",
  fallback = 42,
) {
  const coords = unique(
    points
      .map((point) => (axis === "x" ? point.x : point.y))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b),
  );
  if (coords.length < 2) return fallback;
  const minGap = coords.slice(1).reduce((smallest, value, index) => {
    return Math.min(smallest, value - coords[index]);
  }, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(minGap)) return fallback;
  return clamp(minGap * 0.6, 12, 72);
}

function renderTitle(config: ChartOptions, ctx: RenderContext) {
  return `
    <text x="${ctx.padding.left}" y="28" fill="${ctx.theme.foreground}" font-size="20" font-weight="700">${escapeHtml(config.title ?? "")}</text>
    <text x="${ctx.padding.left}" y="48" fill="${ctx.theme.muted}" font-size="12">${escapeHtml(config.subtitle ?? "")}</text>
  `;
}

function titleBlockHeight(config: ChartOptions) {
  if (config.title && config.subtitle) return 54;
  if (config.title || config.subtitle) return 34;
  return 0;
}

function autoDomainBounds(
  values: number[],
  axis: AxisConfig | undefined,
  includeZero: boolean,
) {
  const rawMin = minValue(values);
  const rawMax = maxValue(values);
  const explicitMin = axis?.min != null ? toNumber(axis.min) : undefined;
  const explicitMax = axis?.max != null ? toNumber(axis.max) : undefined;
  let min = explicitMin ?? (includeZero ? Math.min(0, rawMin) : rawMin);
  let max = explicitMax ?? Math.max(rawMax, includeZero ? 0 : rawMax, 1);
  const span = Math.max(1, max - min);
  const padding = span * 0.08;

  if (explicitMax == null) max += padding;
  if (explicitMin == null) {
    if (includeZero && rawMin >= 0) min = 0;
    else min -= padding;
  }
  if (max === min) max = min + 1;
  return { min, max };
}

function createNumericAxisScale(
  axis: AxisConfig | undefined,
  min: number,
  max: number,
  rangeMin: number,
  rangeMax: number,
) {
  if (axis?.scaleType === "log") {
    return createLogScale(Math.max(0.0001, min), Math.max(min * 10, max), rangeMin, rangeMax);
  }
  return createLinearScale(min, max, rangeMin, rangeMax);
}

function formatSharedTooltip(points: InteractivePoint[], config: ChartOptions) {
  if (!points.length) return "";
  if (points.length === 1) {
    return formatTooltip(points[0], config);
  }

  const title = points[0].label.includes(" / ")
    ? points[0].label.split(" / ").slice(-1)[0]
    : points[0].label;
  const rows = points
    .map(
      (
        point,
      ) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
        <span style="display:flex;align-items:center;gap:8px;">
          <span style="width:9px;height:9px;border-radius:50%;background:${escapeHtml(point.color ?? point.series.color ?? "var(--primary)")};display:inline-block;"></span>
          <span>${escapeHtml(point.series.name ?? "Series")}</span>
        </span>
        <strong>${escapeHtml(point.value)}</strong>
      </div>`,
    )
    .join("");

  return `<div style="display:grid;gap:6px;min-width:180px;">
    <strong>${escapeHtml(title)}</strong>
    ${rows}
  </div>`;
}

function renderPieFamily(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  visibleSeries: SeriesConfig[],
  runtime: ChartRuntime,
) {
  const series = visibleSeries[0];
  const valueKey = series?.valueKey ?? "value";
  const labelKey = series?.xKey ?? "label";
  const radius = Math.min(ctx.plotWidth, ctx.plotHeight) / 2 - 18;
  const hoveredSliceGrowBy = 8;
  const centerX = ctx.padding.left + ctx.plotWidth / 2;
  const centerY = ctx.padding.top + ctx.plotHeight / 2;
  const rendersCenter = config.donutCenter != null;
  const innerRadius = rendersCenter ? radius * 0.55 : 0;
  const visibleData = data.filter(
    (datum, index) =>
      !runtime.state.hiddenSeries.has(
        String(datum[labelKey] ?? `Slice ${index + 1}`),
      ),
  );
  const slices = createPieSlices(visibleData, valueKey);
  const total = sumValues(slices.map((slice) => slice.value)) || 1;
  const sliceMarkup = slices
    .map((slice, index) => {
      const color =
        ctx.theme.palette?.[index % (ctx.theme.palette?.length ?? 1)] ??
        series?.color ??
        "var(--primary)";
      const label = String(slice.datum[labelKey] ?? `Slice ${index + 1}`);
      const isHovered = String(runtime.state.hoveredKey ?? "") === label;
      const outerRadius = radius + (isHovered ? hoveredSliceGrowBy : 0);
      const angle = slice.startAngle + (slice.endAngle - slice.startAngle) / 2;
      const hoverRadius = innerRadius + (outerRadius - innerRadius) * 0.58;
      const point = polarToCartesian(centerX, centerY, hoverRadius, angle);
      ctx.interactivePoints.push({
        x: point.x,
        y: point.y,
        key: label,
        label,
        value: formatSeriesValue(
          slice.datum[valueKey],
          series,
          config.axes?.y,
          config,
        ),
        raw: slice.datum,
        series,
        color,
      });
      const labelMarkup =
        series?.labels
          ? renderDataLabel(
              point.x,
              point.y,
              formatSeriesValue(
                slice.datum[valueKey],
                series,
                config.axes?.y,
                config,
              ),
              {
                fill: ctx.theme.background ?? "#ffffff",
              },
            )
          : "";
      return wrapAnimatedMarkup(
        runtime,
        `<path d="${donutSectorPath(centerX, centerY, innerRadius, outerRadius, slice.startAngle, slice.endAngle)}" fill="${color}" stroke="${ctx.theme.background}" stroke-width="2" data-sx-chart-key="${escapeHtml(label)}" />${labelMarkup}`,
        "scale",
      );
    })
    .join("");

  if (!rendersCenter) return sliceMarkup;

  const hovered = slices.find(
    (slice) =>
      String(slice.datum[labelKey] ?? "") ===
      String(runtime.state.hoveredKey ?? ""),
  );
  const centerValue = hovered?.value ?? total;
  const centerLabel = hovered
    ? String(hovered.datum[labelKey] ?? "")
    : config.donutCenter?.showPercentage
      ? "Total / 100%"
      : "Total";
  const percentage = hovered ? (hovered.value / total) * 100 : 100;
  const centerText = config.donutCenter?.formatter
    ? config.donutCenter.formatter(centerValue, total, centerLabel, percentage)
    : config.donutCenter?.showPercentage
      ? `${percentage.toFixed(0)}%`
      : formatValue(
          centerValue,
          config.axes?.y,
          config.locale,
          config.timeZone,
        );

  const centerMarkup =
    config.donutCenter?.enabled === false
      ? ""
      : wrapAnimatedMarkup(
          runtime,
          `<text x="${centerX}" y="${centerY - 4}" text-anchor="middle" font-size="26" font-weight="700" fill="${ctx.theme.foreground}">${escapeHtml(centerText)}</text>
       <text x="${centerX}" y="${centerY + 18}" text-anchor="middle" font-size="11" fill="${ctx.theme.muted}">${escapeHtml(centerLabel)}</text>`,
          "fade-up",
        );

  return `${sliceMarkup}${centerMarkup}`;
}

function renderFunnel(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const labelKey = series.xKey ?? "label";
  const valueKey = series.valueKey ?? "value";
  const max = maxValue(data.map((datum) => toNumber(datum[valueKey]))) || 1;
  const segmentHeight = ctx.plotHeight / Math.max(1, data.length);
  return data
    .map((datum, index) => {
      const value = toNumber(datum[valueKey]);
      const nextValue = toNumber(data[index + 1]?.[valueKey] ?? value * 0.82);
      const widthTop = (value / max) * ctx.plotWidth;
      const widthBottom = (nextValue / max) * ctx.plotWidth;
      const center = ctx.padding.left + ctx.plotWidth / 2;
      const y = ctx.padding.top + index * segmentHeight;
      const path = `M ${center - widthTop / 2} ${y}
      L ${center + widthTop / 2} ${y}
      L ${center + widthBottom / 2} ${y + segmentHeight - 8}
      L ${center - widthBottom / 2} ${y + segmentHeight - 8} Z`;
      ctx.interactivePoints.push({
        x: center,
        y: y + segmentHeight / 2,
        key: String(datum[labelKey] ?? index),
        label: String(datum[labelKey] ?? `Stage ${index + 1}`),
        value: formatValue(
          value,
          config.axes?.y,
          config.locale,
          config.timeZone,
        ),
        raw: datum,
        series,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<path d="${path}" fill="${seriesColor(series, ctx.theme, index)}" opacity="${0.92 - index * 0.08}" />
      <text x="${center}" y="${y + segmentHeight / 2}" text-anchor="middle" dy="0.35em" fill="var(--chart-label, #fff)" font-size="12">${escapeHtml(String(datum[labelKey] ?? `Stage ${index + 1}`))}</text>`,
        "fade-up",
        "center bottom",
      );
    })
    .join("");
}

function renderGauge(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const value = toNumber(data[0]?.[series.valueKey ?? "value"] ?? 0);
  const min = Number(config.axes?.y?.min ?? 0);
  const max = Number(config.axes?.y?.max ?? 100);
  const ratio = clamp((value - min) / Math.max(1, max - min), 0, 1);
  const radius = Math.min(ctx.plotWidth * 0.4, ctx.plotHeight * 0.78);
  const trackWidth = Math.max(18, radius * 0.18);
  const centerX = ctx.padding.left + ctx.plotWidth / 2;
  const centerY = ctx.padding.top + ctx.plotHeight - trackWidth * 0.7;
  const startAngle = -Math.PI / 2;
  const endAngle = Math.PI / 2;
  const valueAngle = startAngle + (endAngle - startAngle) * ratio;
  const needleTip = polarToCartesian(
    centerX,
    centerY,
    radius - trackWidth * 0.3,
    valueAngle,
  );
  const tickCount = 5;
  const valueText = formatSeriesValue(
    value,
    series,
    config.axes?.y,
    config,
  );
  const anchorForAngle = (angle: number) => {
    const cosine = Math.cos(angle);
    if (cosine > 0.35) return "start";
    if (cosine < -0.35) return "end";
    return "middle";
  };
  const tickMarkup = Array.from({ length: tickCount }, (_, index) => {
    const tickRatio = index / Math.max(1, tickCount - 1);
    const angle = startAngle + (endAngle - startAngle) * tickRatio;
    const tickValue = min + (max - min) * tickRatio;
    const outer = polarToCartesian(centerX, centerY, radius + 4, angle);
    const inner = polarToCartesian(
      centerX,
      centerY,
      radius - trackWidth * 0.42,
      angle,
    );
    const labelPoint = polarToCartesian(
      centerX,
      centerY,
      radius + trackWidth * 0.9,
      angle,
    );
    return `<g class="sx-gauge-tick">
      <line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${ctx.theme.muted}" stroke-width="${index === 0 || index === tickCount - 1 ? 2 : 1.5}" stroke-linecap="round" />
      <text x="${labelPoint.x}" y="${labelPoint.y}" text-anchor="${anchorForAngle(angle)}" dy="0.35em" font-size="10" fill="${ctx.theme.muted}">${escapeHtml(formatValue(tickValue, config.axes?.y, config.locale, config.timeZone))}</text>
    </g>`;
  }).join("");
  const targetLines = (config.trendlines ?? [])
    .filter(
      (trendline) => trendline.visible !== false && trendline.type === "target",
    )
    .map((trendline, index) => {
      if (!isNumber(trendline.value)) return "";
      const targetRatio = clamp(
        (trendline.value - min) / Math.max(1, max - min),
        0,
        1,
      );
      const angle = startAngle + (endAngle - startAngle) * targetRatio;
      const outer = polarToCartesian(centerX, centerY, radius + trackWidth, angle);
      const inner = polarToCartesian(
        centerX,
        centerY,
        radius - trackWidth * 0.22,
        angle,
      );
      const labelPoint = polarToCartesian(
        centerX,
        centerY,
        radius + trackWidth * 1.75,
        angle,
      );
      const color = trendlineColor(
        trendline,
        ctx.theme.foreground ?? "var(--foreground)",
        ctx.theme,
      );
      return `<g data-sx-trendline="${escapeHtml(trendline.id ?? `gauge-target-${index}`)}" data-sx-trendline-kind="target"><line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${color}" stroke-width="${trendline.strokeWidth ?? 3}" stroke-linecap="round" />${renderTrendlineLabel(labelPoint.x, labelPoint.y, trendline.label ?? formatValue(trendline.value, config.axes?.y, config.locale, config.timeZone), color)}</g>`;
    })
    .join("");
  ctx.interactivePoints.push({
    x: needleTip.x,
    y: needleTip.y,
    key: "gauge",
    label: series.name ?? "Value",
    value: valueText,
    raw: data[0] ?? {},
    series,
  });
  const startLabel = polarToCartesian(centerX, centerY, radius + trackWidth * 0.95, startAngle);
  const endLabel = polarToCartesian(centerX, centerY, radius + trackWidth * 0.95, endAngle);
  const capPoint = polarToCartesian(centerX, centerY, radius, valueAngle);
  const centerCardY = centerY - radius * 0.34;
  return wrapAnimatedMarkup(
    runtime,
    `
    <path d="${arcPath(centerX, centerY, radius, startAngle, endAngle)}" fill="none" stroke="${ctx.theme.grid}" stroke-width="${trackWidth}" stroke-linecap="round" />
    <path d="${arcPath(centerX, centerY, radius, startAngle, valueAngle)}" fill="none" stroke="${series.color}" stroke-width="${trackWidth}" stroke-linecap="round" />
    <circle cx="${capPoint.x}" cy="${capPoint.y}" r="${Math.max(6, trackWidth * 0.28)}" fill="${series.color}" stroke="${ctx.theme.background}" stroke-width="3" />
    ${tickMarkup}
    ${targetLines}
    <line data-sx-gauge-needle="true" x1="${centerX}" y1="${centerY}" x2="${needleTip.x}" y2="${needleTip.y}" stroke="${ctx.theme.foreground}" stroke-width="2.5" stroke-linecap="round" opacity="0.45" />
    <circle cx="${centerX}" cy="${centerY}" r="${Math.max(7, trackWidth * 0.24)}" fill="${ctx.theme.foreground}" />
    <rect x="${centerX - 72}" y="${centerCardY - 36}" width="144" height="74" rx="18" fill="${ctx.theme.background}" stroke="${ctx.theme.axis}" />
    <text x="${centerX}" y="${centerCardY - 6}" text-anchor="middle" font-size="34" font-weight="700" fill="${ctx.theme.foreground}">
      ${escapeHtml(valueText)}
    </text>
    <text x="${centerX}" y="${centerCardY + 16}" text-anchor="middle" font-size="12" fill="${ctx.theme.muted}">
      ${escapeHtml(series.name ?? "Gauge")}
    </text>
    <text x="${startLabel.x}" y="${startLabel.y}" text-anchor="end" font-size="11" fill="${ctx.theme.muted}">${escapeHtml(formatValue(min, config.axes?.y, config.locale, config.timeZone))}</text>
    <text x="${endLabel.x}" y="${endLabel.y}" text-anchor="start" font-size="11" fill="${ctx.theme.muted}">${escapeHtml(formatValue(max, config.axes?.y, config.locale, config.timeZone))}</text>
    ${series.labels ? renderDataLabel(centerX, centerCardY + 34, valueText, { fill: ctx.theme.foreground }) : ""}
  `,
    "scale",
  );
}

function renderRadar(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  visibleSeries: SeriesConfig[],
  runtime: ChartRuntime,
): string {
  const categories = data.map((datum) =>
    String(datum[visibleSeries[0]?.xKey ?? "label"] ?? ""),
  );
  const radius = Math.min(ctx.plotWidth, ctx.plotHeight) / 2 - 28;
  const centerX = ctx.padding.left + ctx.plotWidth / 2;
  const centerY = ctx.padding.top + ctx.plotHeight / 2;
  const max =
    maxValue(
      visibleSeries.flatMap((series) =>
        data.map((datum) => toNumber(datum[series.yKey ?? "value"])),
      ),
    ) || 1;
  const rings = [0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const points = categories
        .map((_category, index) => {
          const angle = (Math.PI * 2 * index) / categories.length;
          const point = polarToCartesian(
            centerX,
            centerY,
            radius * ratio,
            angle + Math.PI / 2,
          );
          return `${point.x},${point.y}`;
        })
        .join(" ");
      return `<polygon points="${points}" fill="none" stroke="${ctx.theme.grid}" stroke-width="1" />`;
    })
    .join("");
  const seriesMarkup = visibleSeries
    .map((series, seriesIndex) => {
      const points = data
        .map((datum, pointIndex) => {
          const angle = (Math.PI * 2 * pointIndex) / categories.length;
          const ratio = toNumber(datum[series.yKey ?? "value"]) / max;
          const point = polarToCartesian(
            centerX,
            centerY,
            radius * ratio,
            angle + Math.PI / 2,
          );
          ctx.interactivePoints.push({
            x: point.x,
            y: point.y,
            key: String(datum[series.xKey ?? "label"] ?? pointIndex),
            label: `${series.name ?? `Series ${seriesIndex + 1}`} / ${String(datum[series.xKey ?? "label"] ?? pointIndex)}`,
            value: formatValue(
              datum[series.yKey ?? "value"],
              config.axes?.y,
              config.locale,
              config.timeZone,
            ),
            raw: datum,
            series,
          });
          return `${point.x},${point.y}`;
        })
        .join(" ");
      return wrapAnimatedMarkup(
        runtime,
        `<polygon points="${points}" fill="${series.color}" fill-opacity="0.18" stroke="${series.color}" stroke-width="2" />`,
        "scale",
      );
    })
    .join("");
  const labels = categories
    .map((category, index) => {
      const angle = (Math.PI * 2 * index) / categories.length;
      const point = polarToCartesian(
        centerX,
        centerY,
        radius + 16,
        angle + Math.PI / 2,
      );
      return `<text x="${point.x}" y="${point.y}" text-anchor="middle" font-size="11" fill="${ctx.theme.muted}">${escapeHtml(category)}</text>`;
    })
    .join("");
  return `${rings}${seriesMarkup}${labels}`;
}

function renderPolar(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const radius = Math.min(ctx.plotWidth, ctx.plotHeight) / 2 - 24;
  const hoveredSegmentGrowBy = 8;
  const centerX = ctx.padding.left + ctx.plotWidth / 2;
  const centerY = ctx.padding.top + ctx.plotHeight / 2;
  const max =
    maxValue(
      data.map((datum) => toNumber(datum[series.valueKey ?? "value"])),
    ) || 1;
  return data
    .map((datum, index) => {
      const startAngle = (Math.PI * 2 * index) / data.length;
      const endAngle = (Math.PI * 2 * (index + 1)) / data.length;
      const angle = startAngle + (endAngle - startAngle) / 2;
      const label = String(
        datum[series.xKey ?? "label"] ?? `Slice ${index + 1}`,
      );
      const isHovered = String(runtime.state.hoveredKey ?? "") === label;
      const outerRadius =
        radius * (toNumber(datum[series.valueKey ?? "value"]) / max) +
        (isHovered ? hoveredSegmentGrowBy : 0);
      const hoverRadius = radius * 0.18 + (outerRadius - radius * 0.18) * 0.58;
      const point = polarToCartesian(centerX, centerY, hoverRadius, angle);
      ctx.interactivePoints.push({
        x: point.x,
        y: point.y,
        key: label,
        label,
        value: formatSeriesValue(
          datum[series.valueKey ?? "value"],
          series,
          config.axes?.y,
          config,
        ),
        raw: datum,
        series,
      });
      const labelMarkup = series.labels
        ? renderDataLabel(
            point.x,
            point.y,
            formatSeriesValue(
              datum[series.valueKey ?? "value"],
              series,
              config.axes?.y,
              config,
            ),
            {
              fill: ctx.theme.background ?? "#ffffff",
            },
          )
        : "";
      return wrapAnimatedMarkup(
        runtime,
        `<path d="${donutSectorPath(centerX, centerY, radius * 0.18, outerRadius, startAngle, endAngle)}" fill="${ctx.theme.palette?.[index % (ctx.theme.palette?.length ?? 1)]}" data-sx-chart-key="${escapeHtml(label)}" />${labelMarkup}`,
        "scale",
      );
    })
    .join("");
}

function renderTreemap(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const labelKey = series.xKey ?? "label";
  const valueKey = series.valueKey ?? "value";
  return createTreemapRects(
    data,
    valueKey,
    ctx.padding.left,
    ctx.padding.top,
    ctx.plotWidth,
    ctx.plotHeight,
  )
    .map((rect, index) => {
      ctx.interactivePoints.push({
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        key: String(rect.datum[labelKey] ?? index),
        label: String(rect.datum[labelKey] ?? `Node ${index + 1}`),
        value: formatSeriesValue(
          rect.datum[valueKey],
          series,
          config.axes?.y,
          config,
        ),
        raw: rect.datum,
        series,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<rect x="${rect.x}" y="${rect.y}" width="${Math.max(0, rect.width - 4)}" height="${rect.height}" rx="8" fill="${ctx.theme.palette?.[index % (ctx.theme.palette?.length ?? 1)]}" data-sx-chart-key="${escapeHtml(String(rect.datum[labelKey] ?? index))}" />
        <text x="${rect.x + 12}" y="${rect.y + 22}" fill="var(--chart-label, #fff)" font-size="12">${escapeHtml(String(rect.datum[labelKey] ?? `Node ${index + 1}`))}</text>${series.labels ? renderDataLabel(rect.x + rect.width / 2, rect.y + rect.height / 2, formatSeriesValue(rect.datum[valueKey], series, config.axes?.y, config), { fill: ctx.theme.background ?? "#ffffff" }) : ""}`,
        "fade-up",
      );
    })
    .join("");
}

function renderSankeyChart(
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const sankeySeries = series as SeriesConfig & {
    nodes?: Array<{ id: string; name?: string; value?: number }>;
    links?: Array<{ source: string; target: string; value: number }>;
  };
  const layout = createSankeyLayout(
    sankeySeries.nodes ?? [],
    sankeySeries.links ?? [],
    ctx.padding.left,
    ctx.padding.top,
    ctx.plotWidth,
    ctx.plotHeight,
  );
  const linkMarkup = layout.links
    .map((link) => {
      const sourceNode = layout.nodes.find((node) => node.id === link.source)!;
      const targetNode = layout.nodes.find((node) => node.id === link.target)!;
      ctx.interactivePoints.push({
        x: (sourceNode.x1 + targetNode.x0) / 2,
        y: (link.sourceY + link.targetY) / 2,
        key: `${link.source}-${link.target}`,
        label: `${sourceNode.name} -> ${targetNode.name}`,
        value: formatValue(
          link.value,
          config.axes?.y,
          config.locale,
          config.timeZone,
        ),
        raw: {
          ...link,
          sourceName: sourceNode.name,
          targetName: targetNode.name,
        },
        series,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<path d="${sankeyLinkPath(sourceNode.x1, targetNode.x0, link.sourceY, link.targetY)}" fill="none" stroke="${series.color}" stroke-opacity="0.28" stroke-width="${link.width}" />`,
        "fade-up",
      );
    })
    .join("");
  const nodeMarkup = layout.nodes
    .map((node, index) => {
      return wrapAnimatedMarkup(
        runtime,
        `<rect x="${node.x0}" y="${node.y0}" width="${node.x1 - node.x0}" height="${node.y1 - node.y0}" rx="6" fill="${ctx.theme.palette?.[index % (ctx.theme.palette?.length ?? 1)]}" />
      <text x="${node.x1 + 8}" y="${(node.y0 + node.y1) / 2}" dy="0.35em" fill="${ctx.theme.foreground}" font-size="11">${escapeHtml(node.name)}</text>`,
        "grow-y",
        "center bottom",
      );
    })
    .join("");
  return `${linkMarkup}${nodeMarkup}`;
}

function renderHeatmap(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const xKey = series.xKey ?? "x";
  const yKey = series.yKey ?? "y";
  const valueKey = series.valueKey ?? "value";
  const xValues = unique(data.map((datum) => String(datum[xKey] ?? "")));
  const yValues = unique(data.map((datum) => String(datum[yKey] ?? "")));
  const cellWidth = ctx.plotWidth / Math.max(1, xValues.length);
  const cellHeight = ctx.plotHeight / Math.max(1, yValues.length);
  const max = maxValue(data.map((datum) => toNumber(datum[valueKey]))) || 1;
  const cells = data
    .slice(0, 300)
    .map((datum) => {
      const xIndex = xValues.indexOf(String(datum[xKey] ?? ""));
      const yIndex = yValues.indexOf(String(datum[yKey] ?? ""));
      const value = toNumber(datum[valueKey]);
      const x = ctx.padding.left + xIndex * cellWidth;
      const y = ctx.padding.top + yIndex * cellHeight;
      ctx.interactivePoints.push({
        x: x + cellWidth / 2,
        y: y + cellHeight / 2,
        key: `${datum[xKey]}-${datum[yKey]}`,
        label: `${String(datum[xKey])} / ${String(datum[yKey])}`,
        value: formatValue(
          value,
          config.axes?.y,
          config.locale,
          config.timeZone,
        ),
        raw: datum,
        series,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<rect x="${x}" y="${y}" width="${Math.max(1, cellWidth - 2)}" height="${Math.max(1, cellHeight - 2)}" rx="6" fill="${series.color}" fill-opacity="${Math.max(0.12, value / max)}" />`,
        "pop",
      );
    })
    .join("");
  const xLabels = xValues
    .map(
      (value, index) =>
        `<text x="${ctx.padding.left + index * cellWidth + cellWidth / 2}" y="${ctx.padding.top + ctx.plotHeight + 16}" text-anchor="middle" font-size="10" fill="${ctx.theme.muted}">${escapeHtml(value)}</text>`,
    )
    .join("");
  const yLabels = yValues
    .map(
      (value, index) =>
        `<text x="${ctx.padding.left - 8}" y="${ctx.padding.top + index * cellHeight + cellHeight / 2}" text-anchor="end" dy="0.35em" font-size="10" fill="${ctx.theme.muted}">${escapeHtml(value)}</text>`,
    )
    .join("");
  return `${cells}${xLabels}${yLabels}`;
}

function renderBoxPlot(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const xKey = series.xKey ?? "group";
  const yKey = series.yKey ?? "value";
  const grouped = groupBy(data, (datum) => String(datum[xKey] ?? ""));
  const band = createBandScale(
    grouped.map(([group]) => group),
    ctx.padding.left,
    ctx.padding.left + ctx.plotWidth,
    0.32,
  );
  const allValues = data.map((datum) => toNumber(datum[yKey]));
  const yScale = createLinearScale(
    minValue(allValues),
    maxValue(allValues) || 1,
    ctx.padding.top + ctx.plotHeight,
    ctx.padding.top,
  );
  return grouped
    .map(([group, groupValues]) => {
      const sorted = groupValues
        .map((datum) => toNumber(datum[yKey]))
        .sort((a, b) => a - b);
      const q1 = quantileSorted(sorted, 0.25);
      const median = quantileSorted(sorted, 0.5);
      const q3 = quantileSorted(sorted, 0.75);
      const low = sorted[0] ?? 0;
      const high = sorted[sorted.length - 1] ?? 0;
      const x = band.scale(group) ?? ctx.padding.left;
      const width = band.bandwidth();
      const yQ1 = yScale.scale(q1);
      const yMedian = yScale.scale(median);
      const yQ3 = yScale.scale(q3);
      const yLow = yScale.scale(low);
      const yHigh = yScale.scale(high);
      ctx.interactivePoints.push({
        x: x + width / 2,
        y: yMedian,
        key: group,
        label: group,
        value: `Median ${formatValue(median, config.axes?.y, config.locale, config.timeZone)}`,
        raw: { group, q1, median, q3, low, high },
        series,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<line x1="${x + width / 2}" y1="${yLow}" x2="${x + width / 2}" y2="${yHigh}" stroke="${series.color}" />
      <rect x="${x}" y="${yQ3}" width="${width}" height="${Math.max(2, yQ1 - yQ3)}" fill="${series.color}" fill-opacity="0.2" stroke="${series.color}" />
      <line x1="${x}" y1="${yMedian}" x2="${x + width}" y2="${yMedian}" stroke="${series.color}" stroke-width="2" />
      <line x1="${x + width * 0.2}" y1="${yLow}" x2="${x + width * 0.8}" y2="${yLow}" stroke="${series.color}" />
      <line x1="${x + width * 0.2}" y1="${yHigh}" x2="${x + width * 0.8}" y2="${yHigh}" stroke="${series.color}" />
      <text x="${x + width / 2}" y="${ctx.padding.top + ctx.plotHeight + 18}" text-anchor="middle" font-size="11" fill="${ctx.theme.muted}">${escapeHtml(group)}</text>`,
        "grow-y",
        "center bottom",
      );
    })
    .join("");
}

function renderMap(
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  series: SeriesConfig,
  runtime: ChartRuntime,
): string {
  const featureCollection = resolveMapFeatureCollection(config.map);
  const features = featureCollection.features ?? [];
  const projection = (config.map?.projection ?? "mercator") as ProjectionType;
  const transform = geoTransform(
    features,
    projection,
    ctx.padding.left,
    ctx.padding.top,
    ctx.plotWidth,
    ctx.plotHeight,
  );
  const valueKey = config.map?.valueKey ?? series.valueKey ?? "value";
  const labelKey = series.xKey ?? "id";
  const values = new Map(
    data.map((datum) => [String(datum[labelKey] ?? datum.name ?? ""), datum]),
  );
  const max = maxValue(data.map((datum) => toNumber(datum[valueKey]))) || 1;
  const featureCenters = new Map<string, Point>();
  const regionMarkup = features
    .map((feature: any, index: number) => {
      const id = String(
        feature.id ??
          feature.properties?.name ??
          feature.properties?.id ??
          index,
      );
      const datum =
        values.get(id) ??
        values.get(String(feature.properties?.name ?? "")) ??
        feature.properties ??
        {};
      const value = toNumber(datum[valueKey]);
      const path = geoPathString(feature.geometry, transform);
      const center = featureAnchorPoint(feature.geometry, transform, {
        x: ctx.padding.left + ctx.plotWidth / 2,
        y: ctx.padding.top + ctx.plotHeight / 2,
      });
      featureCenters.set(id, center);
      if (feature.properties?.name) {
        featureCenters.set(String(feature.properties.name), center);
      }
      const isHovered = String(runtime.state.hoveredKey ?? "") === id;
      const fillColor = mapValueColor(value, ctx.theme, series);
      const fillOpacity =
        value > 0
          ? max
            ? Math.max(isHovered ? 0.42 : 0.18, value / max)
            : isHovered
              ? 0.42
              : 0.18
          : 1;
      ctx.interactivePoints.push({
        x: center.x,
        y: center.y,
        key: id,
        label: String(feature.properties?.name ?? id),
        value: formatSeriesValue(
          value,
          series,
          config.axes?.y,
          config,
        ),
        raw: datum,
        series,
        color: fillColor,
      });
      return wrapAnimatedMarkup(
        runtime,
        `<path d="${path}" data-sx-chart-key="${escapeHtml(id)}" fill="${fillColor}" fill-opacity="${fillOpacity}" stroke="${isHovered ? fillColor : ctx.theme.background}" stroke-width="${isHovered ? 2.5 : 1.5}" />`,
        "scale",
      );
    })
    .join("");

  const pointRadius = Math.max(2, config.map?.pointRadius ?? 6);
  const pointMarkup =
    config.map?.pointKey
      ? data
          .map((datum, index) => {
            const source = datum[config.map!.pointKey!];
            let point: Point | undefined;
            if (Array.isArray(source) && source.length >= 2) {
              point = transform(toNumber(source[0]), toNumber(source[1]));
            } else if (source && typeof source === "object") {
              const candidate = source as Record<string, unknown>;
              const lon = candidate.lon ?? candidate.lng ?? candidate.longitude;
              const lat = candidate.lat ?? candidate.latitude;
              if (lon != null && lat != null) {
                point = transform(toNumber(lon), toNumber(lat));
              }
            } else if (source != null) {
              point =
                featureCenters.get(String(source)) ??
                featureCenters.get(String(datum[labelKey] ?? datum.name ?? ""));
            }
            if (!point) return "";
            const pointLabel = String(datum[labelKey] ?? datum.name ?? `Point ${index + 1}`);
            ctx.interactivePoints.push({
              x: point.x,
              y: point.y,
              key: `point:${pointLabel}`,
              label: pointLabel,
              value: formatSeriesValue(
                datum[valueKey],
                series,
                config.axes?.y,
                config,
              ),
              raw: datum,
              series,
              color: series.color,
            });
            return wrapAnimatedMarkup(
              runtime,
              `<circle cx="${point.x}" cy="${point.y}" r="${pointRadius}" fill="${series.color ?? "var(--primary)"}" stroke="${ctx.theme.background}" stroke-width="2" data-sx-chart-key="${escapeHtml(`point:${pointLabel}`)}" />`,
              "scale",
            );
          })
          .join("")
      : "";

  return `${regionMarkup}${pointMarkup}`;
}

function renderCartesianChart(
  type: ChartType,
  data: AnyDatum[],
  config: ChartOptions,
  ctx: RenderContext,
  visibleSeries: SeriesConfig[],
  runtime: ChartRuntime,
) {
  const plotX = ctx.padding.left;
  const plotY = ctx.padding.top;
  const plotWidth = ctx.plotWidth;
  const plotHeight = ctx.plotHeight;
  const xAxis = config.axes?.x;
  const yAxis = config.axes?.y;
  const yAxis2 = config.axes?.y2;
  const sampleX = data[0]?.[visibleSeries[0]?.xKey ?? "x"];
  const xScaleType = resolveScaleType(xAxis, sampleX);
  const isHorizontalBarChart = type === "horizontal-bar";
  const edgeToEdgeCategoryPaths =
    type === "line" || type === "area" || type === "stacked-area";

  let categoryScale: BandScale | undefined;
  let xToCoord = (_value: unknown) => plotX;
  let xToStart = (_value: unknown) => plotX;
  let coordToX = (coord: number) => coord;
  let xTicks: Array<string | number | Date> = [];
  let yTicks: Array<string | number | Date> = [];
  let keyToCoord = (_key: string | number) => undefined as number | undefined;
  let zoomable = xScaleType !== "category";

  let stackedMax = 0;
  if (type === "stacked-bar" || type === "stacked-area") {
    data.forEach((datum) => {
      stackedMax = Math.max(
        stackedMax,
        sumValues(
          visibleSeries.map((series) =>
            toNumber(datum[series.yKey ?? series.valueKey ?? "value"]),
          ),
        ),
      );
    });
  }

  const allY = visibleSeries.flatMap((series) => {
    if (type === "candlestick" || type === "ohlc") {
      return data.flatMap((datum) => [
        toNumber(datum[series.lowKey ?? "low"]),
        toNumber(datum[series.highKey ?? "high"]),
      ]);
    }
    if (type === "histogram") {
      const values = data.map((datum) =>
        toNumber(datum[series.valueKey ?? series.yKey ?? "value"]),
      );
      return histogram(values).map((bucket) => bucket.length);
    }
    return data.map((datum) =>
      toNumber(datum[series.yKey ?? series.valueKey ?? "y"]),
    );
  });
  const primaryBounds =
    yAxis?.scaleType === "percentage"
      ? {
          min: yAxis.min != null ? toNumber(yAxis.min) : 0,
          max:
            yAxis.max != null
              ? toNumber(yAxis.max)
              : maxValue([...allY, stackedMax]) <= 1
                ? 1
                : 100,
        }
      : autoDomainBounds([...allY, stackedMax], yAxis, true);
  const yMin = primaryBounds.min;
  const yMax = primaryBounds.max;
  const yScale = createNumericAxisScale(yAxis, yMin, yMax, plotY + plotHeight, plotY);
  const numericYToCoord = (value: number) => yScale.scale(value);
  let yToCoord: (value: unknown) => number = (value) =>
    numericYToCoord(toNumber(value));

  if (isHorizontalBarChart) {
    categoryScale = createBandScale(
      unique(
        data.map((datum) => String(datum[visibleSeries[0]?.xKey ?? "x"] ?? "")),
      ),
      plotY,
      plotY + plotHeight,
      0.18,
    );
    const valueScale = createNumericAxisScale(yAxis, yMin, yMax, plotX, plotX + plotWidth);
    xToCoord = (value) => valueScale.scale(toNumber(value));
    coordToX = (coord) => valueScale.invert(coord);
    xTicks = resolveTickValues(
      yAxis,
      valueScale.ticks(axisTickCount(yAxis, 6)),
      axisTickCount(yAxis, 6),
    );
    yTicks = categoryScale.domain;
    yToCoord = (value) =>
      (categoryScale!.scale(String(value)) ?? plotY) +
      categoryScale!.bandwidth() / 2;
    keyToCoord = (key) =>
      (categoryScale!.scale(String(key)) ?? plotY) +
      categoryScale!.bandwidth() / 2;
    zoomable = true;
  } else if (type === "histogram") {
    const values = data.map((datum) =>
      toNumber(
        datum[visibleSeries[0]?.valueKey ?? visibleSeries[0]?.yKey ?? "value"],
      ),
    );
    const buckets = histogram(values);
    categoryScale = createBandScale(
      buckets.map((bucket) => `${bucket.x0}`),
      plotX,
      plotX + plotWidth,
      0.12,
    );
    xToCoord = (value) =>
      (categoryScale!.scale(String(value)) ?? plotX) +
      categoryScale!.bandwidth() / 2;
    xToStart = (value) => categoryScale!.scale(String(value)) ?? plotX;
    coordToX = (coord) => coord - plotX;
    xTicks = resolveTickValues(
      xAxis,
      buckets.map((bucket) => bucket.x0),
      axisTickCount(xAxis, 6),
    );
    yTicks = resolveTickValues(
      yAxis,
      yScale.ticks(axisTickCount(yAxis, 5)),
      axisTickCount(yAxis, 5),
    );
    keyToCoord = (key) => {
      const left = categoryScale!.scale(String(key));
      return left == null ? undefined : left + categoryScale!.bandwidth() / 2;
    };
  } else if (xScaleType === "time") {
    const values = data.map((datum) =>
      toDateMs(datum[visibleSeries[0]?.xKey ?? "x"]),
    );
    let min = Number(xAxis?.min ? toDateMs(xAxis.min) : minValue(values));
    let max = Number(xAxis?.max ? toDateMs(xAxis.max) : maxValue(values));
    if (runtime.state.zoomX) [min, max] = runtime.state.zoomX;
    const scale = createNumericAxisScale(
      xAxis,
      min,
      max || min + 1,
      plotX,
      plotX + plotWidth,
    );
    xToCoord = (value) => scale.scale(toDateMs(value));
    coordToX = (coord) => scale.invert(coord);
    xTicks = resolveTickValues(
      xAxis,
      createTimeTicks(min, max || min + 1, axisTickCount(xAxis, 6)),
      axisTickCount(xAxis, 6),
    );
    yTicks = resolveTickValues(
      yAxis,
      yScale.ticks(axisTickCount(yAxis, 5)),
      axisTickCount(yAxis, 5),
    );
    keyToCoord = (key) => xToCoord(Number(key));
  } else if (xScaleType === "category") {
    categoryScale = createBandScale(
      unique(
        data.map((datum) => String(datum[visibleSeries[0]?.xKey ?? "x"] ?? "")),
      ),
      plotX,
      plotX + plotWidth,
      0.18,
    );
    if (edgeToEdgeCategoryPaths) {
      const domain = categoryScale.domain;
      xToCoord = (value) => {
        const index = domain.indexOf(String(value));
        if (index === -1) return plotX;
        if (domain.length === 1) return plotX + plotWidth / 2;
        return plotX + (index / (domain.length - 1)) * plotWidth;
      };
    } else {
      xToCoord = (value) =>
        (categoryScale!.scale(String(value)) ?? plotX) +
        categoryScale!.bandwidth() / 2;
    }
    xToStart = (value) => categoryScale!.scale(String(value)) ?? plotX;
    coordToX = (coord) => coord - plotX;
    xTicks = resolveTickValues(
      xAxis,
      categoryScale.domain,
      axisTickCount(xAxis, 6),
    );
    yTicks = resolveTickValues(
      yAxis,
      yScale.ticks(axisTickCount(yAxis, 5)),
      axisTickCount(yAxis, 5),
    );
    keyToCoord = (key) => {
      if (edgeToEdgeCategoryPaths) {
        const index = categoryScale!.domain.indexOf(String(key));
        if (index === -1) return undefined;
        if (categoryScale!.domain.length === 1) return plotX + plotWidth / 2;
        return plotX + (index / (categoryScale!.domain.length - 1)) * plotWidth;
      }
      const left = categoryScale!.scale(String(key));
      return left == null ? undefined : left + categoryScale!.bandwidth() / 2;
    };
  } else {
    const values = data.map((datum) =>
      toNumber(datum[visibleSeries[0]?.xKey ?? "x"]),
    );
    let min = Number(xAxis?.min ?? minValue(values));
    let max = Number(xAxis?.max ?? maxValue(values));
    if (runtime.state.zoomX) [min, max] = runtime.state.zoomX;
    const scale = createNumericAxisScale(
      xAxis,
      min,
      max || min + 1,
      plotX,
      plotX + plotWidth,
    );
    xToCoord = (value) => scale.scale(toNumber(value));
    coordToX = (coord) => scale.invert(coord);
    xTicks = resolveTickValues(
      xAxis,
      scale.ticks(axisTickCount(xAxis, 6)),
      axisTickCount(xAxis, 6),
    );
    yTicks = resolveTickValues(
      yAxis,
      yScale.ticks(axisTickCount(yAxis, 5)),
      axisTickCount(yAxis, 5),
    );
    keyToCoord = (key) => xToCoord(Number(key));
  }

  const y2Series = visibleSeries.filter((series) => series.axis === "y2");
  const y2Values = y2Series.flatMap((series) =>
    data.map((datum) => toNumber(datum[series.yKey ?? series.valueKey ?? "y"])),
  );
  const y2Scale = y2Series.length
    ? createNumericAxisScale(
        yAxis2,
        autoDomainBounds(y2Values, yAxis2, true).min,
        autoDomainBounds(y2Values, yAxis2, true).max,
        plotY + plotHeight,
        plotY,
      )
    : undefined;

  ctx.cartesian = {
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    xToCoord,
    coordToX,
    keyToCoord,
    zoomable,
    hoverAxis: isHorizontalBarChart ? "y" : "x",
    hoverThreshold: 42,
    crosshairAxis: isHorizontalBarChart ? "y" : "x",
  };

  const axes = renderAxes({
    plotX,
    plotY,
    plotWidth,
    plotHeight,
    xTicks,
    yTicks,
    y2Ticks: y2Scale
      ? resolveTickValues(
          yAxis2,
          y2Scale.ticks(axisTickCount(yAxis2, 5)),
          axisTickCount(yAxis2, 5),
        )
      : [],
    config,
    theme: ctx.theme,
    xToCoord,
    yToCoord,
    y2ToCoord: y2Scale ? (value) => y2Scale.scale(toNumber(value)) : undefined,
    horizontalBars: isHorizontalBarChart,
  });

  ctx.gridMarkup = axes.grid;
  ctx.axesMarkup = axes.axes;
  const underlays: string[] = [];
  const layers: string[] = [];
  const overlays: string[] = [];

  if (xScaleType === "time") {
    const events = renderCartesianEvents(
      config.events,
      xToCoord,
      coordToX,
      plotX,
      plotY,
      plotWidth,
      plotHeight,
      ctx.theme,
    );
    if (events.underlay) underlays.push(events.underlay);
    if (events.overlay) overlays.push(events.overlay);
  }

  if (type === "stacked-bar" || type === "stacked-area") {
    const keys = visibleSeries.map(
      (series, index) => series.yKey ?? series.valueKey ?? `series-${index}`,
    );
    const stacked = stackSeries(data, keys);

    if (type === "stacked-area") {
      stacked.forEach((layer, layerIndex) => {
        const series = visibleSeries[layerIndex];
        const top = layer.map(([_, end, datum]) => ({
          x: xToCoord(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"]),
          y: yToCoord(end),
        }));
        const bottom = layer
          .map(([start, _, datum]) => ({
            x: xToCoord(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"]),
            y: yToCoord(start),
          }))
          .reverse();
        layers.push(
          wrapAnimatedMarkup(
            runtime,
            `<path d="${linePath(top)} ${bottom.map((point) => `L ${point.x} ${point.y}`).join(" ")} Z" fill="${series.color}" fill-opacity="${series.areaOpacity ?? 0.28}" stroke="${series.color}" stroke-width="2" />${series.labels ? layer
              .map(([_, end, datum]) =>
                renderDataLabel(
                  xToCoord(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"]),
                  yToCoord(end) - 10,
                  formatValue(
                    datum[series.yKey ?? series.valueKey ?? "value"],
                    config.axes?.y,
                    config.locale,
                    config.timeZone,
                  ),
                  {
                    fill: ctx.theme.foreground,
                    stroke: ctx.theme.background,
                  },
                ),
              )
              .join("") : ""}`,
            "fade-up",
            "center bottom",
          ),
        );
      });
    } else {
      const width = Math.max(
        6,
        Math.min(
          categoryScale?.bandwidth() ?? 18,
          visibleSeries[0]?.barWidth ?? (categoryScale?.bandwidth() ?? 18),
        ),
      );
      const stackDefs = data
        .map((datum, pointIndex) => {
          const x =
            xToCoord(
              datum[visibleSeries[0].xKey ?? "x"],
            ) - width / 2;
          const total = sumValues(
            visibleSeries.map((series) =>
              toNumber(datum[series.yKey ?? series.valueKey ?? "value"]),
            ),
          );
          const y = yToCoord(total);
          const height = yToCoord(0) - y;
          if (height <= 0) return "";
          const clipId = `${runtime.clipPathId}-stack-${pointIndex}`;
          return `<clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="6" /></clipPath>`;
        })
        .filter(Boolean)
        .join("");

      if (stackDefs) underlays.push(`<defs>${stackDefs}</defs>`);

      stacked.forEach((layer, layerIndex) => {
        const series = visibleSeries[layerIndex];
        layer.forEach(([start, end, datum], pointIndex) => {
          const x =
            xToCoord(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"]) -
            width / 2;
          const y = yToCoord(end);
          const height = yToCoord(start) - y;
          const clipId = `${runtime.clipPathId}-stack-${pointIndex}`;
          if (height <= 0) return;
          layers.push(
            wrapAnimatedMarkup(
              runtime,
              `<rect x="${x}" y="${y}" width="${width}" height="${Math.max(0, height)}" fill="${series.color}" clip-path="url(#${clipId})" data-sx-chart-key="${escapeHtml(String(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"] ?? pointIndex))}" />${series.labels ? renderDataLabel(
                x + width / 2,
                height >= 20 ? y + height / 2 : y - 8,
                formatSeriesValue(
                  end - start,
                  series,
                  config.axes?.y,
                  config,
                ),
                height >= 20
                  ? { fill: ctx.theme.background ?? "#ffffff" }
                  : {
                      fill: ctx.theme.foreground,
                      stroke: ctx.theme.background,
                    },
              ) : ""}`,
              "grow-y",
              "center bottom",
            ),
          );

          ctx.interactivePoints.push({
            x: x + width / 2,
            y,
            key: String(
              datum[series.xKey ?? visibleSeries[0].xKey ?? "x"] ?? pointIndex,
            ),
            label: `${series.name ?? "Series"} / ${String(datum[series.xKey ?? visibleSeries[0].xKey ?? "x"] ?? pointIndex)}`,
            value: formatSeriesValue(
              end - start,
              series,
              config.axes?.y,
              config,
            ),
            raw: datum,
            series,
          });
        });
      });
    }
  } else if (type === "histogram") {
    const series = visibleSeries[0];
    const values = data.map((datum) =>
      toNumber(datum[series.valueKey ?? series.yKey ?? "value"]),
    );
    const buckets = histogram(values);
    const band = createBandScale(
      buckets.map((bucket) => `${bucket.x0}`),
      plotX,
      plotX + plotWidth,
      0.12,
    );
    buckets.forEach((bucket) => {
      const x = band.scale(`${bucket.x0}`) ?? plotX;
      const y = yToCoord(bucket.length);
      const width = band.bandwidth();
      const height = plotY + plotHeight - y;
      layers.push(
        wrapAnimatedMarkup(
          runtime,
          `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${series.color}" data-sx-chart-key="${escapeHtml(`${bucket.x0}`)}" />${series.labels ? renderDataLabel(
            x + width / 2,
            height >= 20 ? y + height / 2 : y - 8,
            formatSeriesValue(bucket.length, series, config.axes?.y, config),
            height >= 20
              ? { fill: ctx.theme.background ?? "#ffffff" }
              : {
                  fill: ctx.theme.foreground,
                  stroke: ctx.theme.background,
                },
          ) : ""}`,
          "grow-y",
          "center bottom",
        ),
      );
      ctx.interactivePoints.push({
        x: x + width / 2,
        y: y + height / 2,
        key: `${bucket.x0}`,
        label: `${bucket.x0.toFixed(0)} - ${bucket.x1.toFixed(0)}`,
        value: formatSeriesValue(bucket.length, series, config.axes?.y, config),
        raw: {
          bucketStart: bucket.x0,
          bucketEnd: bucket.x1,
          count: bucket.length,
        },
        series,
      });
    });
  } else {
    visibleSeries.forEach((series, seriesIndex) => {
      const effectiveType =
        type === "combo"
          ? (series.type ?? (seriesIndex % 2 === 0 ? "bar" : "line"))
          : type === "multi-axis"
            ? (series.type ?? "line")
            : (series.type ?? type);
      const targetY =
        series.axis === "y2" && y2Scale
          ? (value: number) => y2Scale.scale(value)
          : yToCoord;

      if (
        effectiveType === "line" ||
        effectiveType === "area" ||
        effectiveType === "multi-axis"
      ) {
        const points = decimate(
          pointsForLine(data, series, xToCoord, targetY),
          1500,
        );
        const linePointsOnly = points.map((entry) => entry.point);
        const seriesLayers: string[] = [];
        if (effectiveType === "area") {
          seriesLayers.push(
            `<path d="${areaPath(linePointsOnly, plotY + plotHeight)}" fill="${series.color}" fill-opacity="${series.areaOpacity ?? 0.22}" />`,
          );
        }
        seriesLayers.push(
          `<path d="${linePath(linePointsOnly)}" fill="none" stroke="${series.color}" stroke-width="${series.strokeWidth ?? 2.5}" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="${series.dashStyle ?? ""}" />`,
        );
        points.forEach((entry) => {
          if ((series.markerSize ?? 3) > 0) {
            seriesLayers.push(
              `<g data-sx-chart-key="${escapeHtml(String(xScaleType === "time" ? toDateMs(entry.rawX) : entry.rawX))}">${renderMarker(
                entry.point.x,
                entry.point.y,
                series.markerSize ?? 3,
                series.color ?? "var(--primary)",
                series.markerShape,
              )}</g>`,
            );
          }
          if (series.labels) {
            seriesLayers.push(
              renderDataLabel(
                entry.point.x,
                entry.point.y - 10,
                formatSeriesValue(
                  entry.rawY,
                  series,
                  series.axis === "y2" ? config.axes?.y2 : config.axes?.y,
                  config,
                ),
                {
                  fill: ctx.theme.foreground,
                  stroke: ctx.theme.background,
                },
              ),
            );
          }
          ctx.interactivePoints.push({
            x: entry.point.x,
            y: entry.point.y,
            key:
              xScaleType === "time" ? toDateMs(entry.rawX) : String(entry.rawX),
            label: `${series.name ?? "Series"} / ${formatValue(entry.rawX, config.axes?.x, config.locale, config.timeZone)}`,
            value: formatSeriesValue(
              entry.rawY,
              series,
              series.axis === "y2" ? config.axes?.y2 : config.axes?.y,
              config,
            ),
            raw: entry.datum,
            series,
          });
        });
        layers.push(
          wrapAnimatedMarkup(
            runtime,
            seriesLayers.join(""),
            "fade-up",
            "center bottom",
          ),
        );
      } else if (
        effectiveType === "bar" ||
        effectiveType === "horizontal-bar"
      ) {
        const groupedBarSeries = visibleSeries.filter((entry, index) => {
          const nextType =
            type === "combo"
              ? (entry.type ?? (index % 2 === 0 ? "bar" : "line"))
              : type === "multi-axis"
                ? (entry.type ?? "line")
                : (entry.type ?? type);
          return nextType === "bar" || nextType === "horizontal-bar";
        });
        const barIndex = groupedBarSeries.findIndex(
          (entry) =>
            seriesKey(entry, visibleSeries.indexOf(entry)) ===
            seriesKey(series, seriesIndex),
        );
        const groupCount = Math.max(1, groupedBarSeries.length);
        const bandWidth =
          categoryScale?.bandwidth() ??
          Math.max(8, plotWidth / Math.max(1, data.length * groupCount) - 6);
        data.forEach((datum, pointIndex) => {
          const xValue = datum[series.xKey ?? "x"];
          const yValue = toNumber(datum[series.yKey ?? series.valueKey ?? "y"]);
          const slotWidth = bandWidth / groupCount;
          const segmentWidth = Math.max(
            6,
            Math.min(slotWidth, series.barWidth ?? slotWidth),
          );
          const xBase =
            xToStart(xValue) +
            Math.max(0, barIndex) * slotWidth +
            (slotWidth - segmentWidth) / 2;
          const y = targetY(yValue);
          const height = plotY + plotHeight - y;
          if (effectiveType === "horizontal-bar") {
            const baselineX = xToCoord(0);
            const valueX = xToCoord(yValue);
            const barLeft = Math.min(baselineX, valueX);
            const barWidth = Math.abs(valueX - baselineX);
            const slotHeight = bandWidth / groupCount;
            const segmentHeight = Math.max(
              6,
              Math.min(slotHeight, series.barWidth ?? slotHeight),
            );
            const top =
              (categoryScale?.scale(String(xValue)) ?? plotY) +
              Math.max(0, barIndex) * slotHeight +
              (slotHeight - segmentHeight) / 2;
            layers.push(
              wrapAnimatedMarkup(
                runtime,
                `<rect x="${barLeft}" y="${top}" width="${Math.max(0, barWidth)}" height="${segmentHeight}" rx="6" fill="${series.color}" data-sx-chart-key="${escapeHtml(String(xValue ?? pointIndex))}" />${series.labels ? renderDataLabel(
                  barWidth >= 36 ? barLeft + barWidth / 2 : valueX + 6,
                  top + segmentHeight / 2,
                  formatSeriesValue(
                    yValue,
                    series,
                    config.axes?.y,
                    config,
                  ),
                  barWidth >= 36
                    ? { fill: ctx.theme.background ?? "#ffffff" }
                    : {
                        anchor: "start",
                        fill: ctx.theme.foreground,
                        stroke: ctx.theme.background,
                      },
                ) : ""}`,
                "grow-x",
                `${baselineX <= valueX ? "left" : "right"} center`,
              ),
            );
            ctx.interactivePoints.push({
              x: valueX,
              y: top + segmentHeight / 2,
              key: String(xValue ?? pointIndex),
              label: `${series.name ?? "Series"} / ${String(xValue ?? pointIndex)}`,
              value: formatSeriesValue(
                yValue,
                series,
                config.axes?.y,
                config,
              ),
              raw: datum,
              series,
            });
          } else {
            layers.push(
              wrapAnimatedMarkup(
                runtime,
                `<rect x="${xBase}" y="${y}" width="${Math.max(6, segmentWidth)}" height="${Math.max(0, height)}" rx="6" fill="${series.color}" fill-opacity="${series.fillOpacity ?? 0.88}" data-sx-chart-key="${escapeHtml(String(xValue ?? pointIndex))}" />${series.labels ? renderDataLabel(
                  xBase + segmentWidth / 2,
                  height >= 20 ? y + height / 2 : y - 8,
                  formatSeriesValue(
                    yValue,
                    series,
                    series.axis === "y2" ? config.axes?.y2 : config.axes?.y,
                    config,
                  ),
                  height >= 20
                    ? { fill: ctx.theme.background ?? "#ffffff" }
                    : {
                        fill: ctx.theme.foreground,
                        stroke: ctx.theme.background,
                      },
                ) : ""}`,
                "grow-y",
                "center bottom",
              ),
            );
            ctx.interactivePoints.push({
              x: xBase + segmentWidth / 2,
              y: y + height / 2,
              key: String(xValue ?? pointIndex),
              label: `${series.name ?? "Series"} / ${String(xValue ?? pointIndex)}`,
              value: formatSeriesValue(
                yValue,
                series,
                series.axis === "y2" ? config.axes?.y2 : config.axes?.y,
                config,
              ),
              raw: datum,
              series,
            });
          }
        });
      } else if (effectiveType === "scatter" || effectiveType === "bubble") {
        decimate(data, 2000).forEach((datum, pointIndex) => {
          const xValue = datum[series.xKey ?? "x"];
          const yValue = toNumber(datum[series.yKey ?? "y"]);
          const radius =
            effectiveType === "bubble"
              ? Math.max(
                  4,
                  Math.min(24, toNumber(datum[series.sizeKey ?? "size"]) || 6),
                )
              : Math.max(0, series.markerSize ?? 5);
          const x = xToCoord(xValue);
          const y = targetY(yValue);
          if (radius > 0) {
            layers.push(
              wrapAnimatedMarkup(
                runtime,
                `<circle cx="${x}" cy="${y}" r="${radius}" fill="${series.color}" fill-opacity="0.7" stroke="${ctx.theme.background}" stroke-width="1.5" />`,
                "pop",
              ),
            );
          }
          ctx.interactivePoints.push({
            x,
            y,
            key: String(xValue ?? pointIndex),
            label: `${series.name ?? "Series"} / ${String(xValue ?? pointIndex)}`,
            value: formatValue(
              yValue,
              config.axes?.y,
              config.locale,
              config.timeZone,
            ),
            raw: datum,
            series,
          });
        });
      } else if (effectiveType === "candlestick" || effectiveType === "ohlc") {
        const width =
          categoryScale?.bandwidth() ??
          Math.max(6, plotWidth / Math.max(1, data.length * 1.8));
        data.forEach((datum, pointIndex) => {
          const x = xToCoord(datum[series.xKey ?? "x"]);
          const open = toNumber(datum[series.openKey ?? "open"]);
          const high = toNumber(datum[series.highKey ?? "high"]);
          const low = toNumber(datum[series.lowKey ?? "low"]);
          const close = toNumber(datum[series.closeKey ?? "close"]);
          const bullish = close >= open;
          const color = bullish ? "var(--primary)" : "var(--destructive)";
          const yHigh = yToCoord(high);
          const yLow = yToCoord(low);
          const yOpen = yToCoord(open);
          const yClose = yToCoord(close);
          const candleLayers = [
            `<line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${color}" stroke-width="1.6" />`,
          ];
          if (effectiveType === "candlestick") {
            candleLayers.push(
              `<rect x="${x - width / 2}" y="${Math.min(yOpen, yClose)}" width="${width}" height="${Math.max(2, Math.abs(yClose - yOpen))}" fill="${color}" rx="3" />`,
            );
          } else {
            candleLayers.push(
              `<line x1="${x - width / 2}" y1="${yOpen}" x2="${x}" y2="${yOpen}" stroke="${color}" stroke-width="1.8" />`,
            );
            candleLayers.push(
              `<line x1="${x}" y1="${yClose}" x2="${x + width / 2}" y2="${yClose}" stroke="${color}" stroke-width="1.8" />`,
            );
          }
          layers.push(
            wrapAnimatedMarkup(
              runtime,
              candleLayers.join(""),
              "grow-y",
              "center bottom",
            ),
          );
          ctx.interactivePoints.push({
            x,
            y: yHigh,
            key: String(datum[series.xKey ?? "x"] ?? pointIndex),
            label: `${series.name ?? effectiveType} / ${String(datum[series.xKey ?? "x"] ?? pointIndex)}`,
            value: `O ${open} H ${high} L ${low} C ${close}`,
            raw: datum,
            series,
          });
        });
      }
    });
  }

  if (config.volumeOverlay?.enabled && config.volumeOverlay.data?.length) {
    const overlay = config.volumeOverlay.data;
    const max =
      maxValue(
        overlay.map((datum) =>
          toNumber(datum[config.volumeOverlay?.yKey ?? "volume"]),
        ),
      ) || 1;
    overlay.forEach((datum) => {
      const x = xToCoord(
        datum[config.volumeOverlay?.xKey ?? visibleSeries[0]?.xKey ?? "x"],
      );
      const volumeHeight =
        (toNumber(datum[config.volumeOverlay?.yKey ?? "volume"]) / max) *
        (plotHeight * 0.2);
      layers.push(
        wrapAnimatedMarkup(
          runtime,
          `<rect x="${x - 4}" y="${plotY + plotHeight - volumeHeight}" width="8" height="${volumeHeight}" fill="${ctx.theme.muted}" fill-opacity="0.35" />`,
          "grow-y",
          "center bottom",
        ),
      );
    });
  }

  const trendlineMarkup = renderCartesianTrendlines(
    config.trendlines,
    data,
    type,
    visibleSeries,
    xScaleType,
    xToCoord,
    yToCoord,
    y2Scale ? (value) => y2Scale.scale(toNumber(value)) : undefined,
    plotX,
    plotWidth,
    config,
    ctx.theme,
  );
  if (trendlineMarkup) overlays.push(trendlineMarkup);

  if (isHoverEnabled(config) && runtime.state.hoveredKey != null) {
    const coord = keyToCoord(runtime.state.hoveredKey);
    if (coord != null) {
      ctx.crosshairMarkup =
        ctx.cartesian?.crosshairAxis === "y"
          ? `<line x1="${plotX}" y1="${coord}" x2="${plotX + plotWidth}" y2="${coord}" stroke="${ctx.theme.muted}" stroke-dasharray="4 4" />`
          : `<line x1="${coord}" y1="${plotY}" x2="${coord}" y2="${plotY + plotHeight}" stroke="${ctx.theme.muted}" stroke-dasharray="4 4" />`;
    }
  }

  if (ctx.cartesian) {
    ctx.cartesian.hoverThreshold = estimateHoverThreshold(
      ctx.interactivePoints,
      ctx.cartesian.hoverAxis,
      isHorizontalBarChart
        ? Math.max(18, (categoryScale?.bandwidth() ?? 30) / 2)
        : 42,
    );
  }

  overlays.push(
    `<rect x="${plotX}" y="${plotY}" width="${plotWidth}" height="${plotHeight}" fill="transparent" class="sx-chart-overlay" pointer-events="none" />`,
  );
  return [...underlays, ...layers, ...overlays].join("");
}

function estimateCartesianSideReserves(
  type: ChartType,
  data: AnyDatum[],
  config: ChartOptions,
  visibleSeries: SeriesConfig[],
  padding: typeof DEFAULT_PADDING,
) {
  if (!visibleSeries.length || !data.length) {
    return { left: padding.left, right: padding.right };
  }

  const xAxis = config.axes?.x;
  const yAxis = config.axes?.y;
  const yAxis2 = config.axes?.y2;
  const xAxisEnabled = isAxisEnabled(xAxis);
  const yAxisEnabled = isAxisEnabled(yAxis);
  const y2AxisEnabled = isAxisEnabled(yAxis2);
  const isHorizontalBarChart = type === "horizontal-bar";
  const sampleX = data[0]?.[visibleSeries[0]?.xKey ?? "x"];
  const xScaleType = resolveScaleType(xAxis, sampleX);
  let stackedMax = 0;

  if (type === "stacked-bar" || type === "stacked-area") {
    data.forEach((datum) => {
      stackedMax = Math.max(
        stackedMax,
        sumValues(
          visibleSeries.map((series) =>
            toNumber(datum[series.yKey ?? series.valueKey ?? "value"]),
          ),
        ),
      );
    });
  }

  const allY = visibleSeries.flatMap((series) => {
    if (type === "candlestick" || type === "ohlc") {
      return data.flatMap((datum) => [
        toNumber(datum[series.lowKey ?? "low"]),
        toNumber(datum[series.highKey ?? "high"]),
      ]);
    }
    if (type === "histogram") {
      const values = data.map((datum) =>
        toNumber(datum[series.valueKey ?? series.yKey ?? "value"]),
      );
      return histogram(values).map((bucket) => bucket.length);
    }
    return data.map((datum) =>
      toNumber(datum[series.yKey ?? series.valueKey ?? "y"]),
    );
  });

  const primaryBounds =
    yAxis?.scaleType === "percentage"
      ? {
          min: yAxis.min != null ? toNumber(yAxis.min) : 0,
          max:
            yAxis.max != null
              ? toNumber(yAxis.max)
              : maxValue([...allY, stackedMax]) <= 1
                ? 1
                : 100,
        }
      : autoDomainBounds([...allY, stackedMax], yAxis, true);
  const primaryScale = createNumericAxisScale(
    yAxis,
    primaryBounds.min,
    primaryBounds.max,
    0,
    1,
  );
  const numericLabels = resolveTickValues(
    yAxis,
    primaryScale.ticks(axisTickCount(yAxis, 5)),
    axisTickCount(yAxis, 5),
  ).map((tick) => formatValue(tick, yAxis, config.locale, config.timeZone));

  const categoryLabels = resolveTickValues(
    xAxis,
    unique(data.map((datum) => String(datum[visibleSeries[0]?.xKey ?? "x"] ?? ""))),
    axisTickCount(xAxis, 6),
  ).map((tick) => formatValue(tick, xAxis, config.locale, config.timeZone));

  const leftAxisEnabled = isHorizontalBarChart ? xAxisEnabled : yAxisEnabled;
  const left = leftAxisEnabled
    ? Math.max(
        padding.left,
        estimateAxisReserve(
          isHorizontalBarChart ? categoryLabels : numericLabels,
          isHorizontalBarChart ? xAxis : yAxis,
        ),
      )
    : padding.left;

  const y2Series = visibleSeries.filter((series) => series.axis === "y2");
  const right =
    y2AxisEnabled && y2Series.length && !isHorizontalBarChart
      ? Math.max(
          padding.right,
          estimateAxisReserve(
            resolveTickValues(
              yAxis2,
              createNumericAxisScale(
                yAxis2,
                autoDomainBounds(
                  y2Series.flatMap((series) =>
                    data.map((datum) =>
                      toNumber(datum[series.yKey ?? series.valueKey ?? "y"]),
                    ),
                  ),
                  yAxis2,
                  true,
                ).min,
                autoDomainBounds(
                  y2Series.flatMap((series) =>
                    data.map((datum) =>
                      toNumber(datum[series.yKey ?? series.valueKey ?? "y"]),
                    ),
                  ),
                  yAxis2,
                  true,
                ).max,
                0,
                1,
              ).ticks(axisTickCount(yAxis2, 5)),
              axisTickCount(yAxis2, 5),
            ).map((tick) =>
              formatValue(tick, yAxis2, config.locale, config.timeZone),
            ),
            yAxis2,
          ),
        )
      : padding.right;

  if (xScaleType === "category" && leftAxisEnabled) {
    return { left: Math.max(left, 52), right };
  }

  return { left, right };
}

function renderChart(runtime: ChartRuntime) {
  runtime.animationCursor = 0;
  const config = runtime.config;
  const data = asArray(config.data);
  const theme = resolveTheme(config);
  const padding = resolvePadding(config);
  const { width, height } = getSize(runtime.container, config);
  const type = resolveChartType(config);
  const allSeries = getResolvedSeries(config, theme, data, type);
  const visibleSeries = getVisibleSeries(allSeries, runtime.state);
  const legendEntries = resolveLegendEntries(
    config,
    theme,
    data,
    type,
    allSeries,
  );
  const titleHeight = titleBlockHeight(config);
  const legendPosition = resolveLegendPosition(config);
  const legendAvailableWidth = width - padding.left - padding.right;
  const legendHeight = legendBlockHeight(config, legendEntries, legendAvailableWidth);
  const legendWidth = legendBlockWidth(config, legendEntries, legendAvailableWidth);
  const axisSideReserves = renderableCartesianTypes.has(type)
    ? estimateCartesianSideReserves(type, data, config, visibleSeries, padding)
    : { left: padding.left, right: padding.right };
  const plotTop = Math.max(
    padding.top,
    22 + titleHeight + (legendPosition === "top" ? legendHeight : 0) + 12,
  );
  const plotLeft =
    axisSideReserves.left + (legendPosition === "left" ? legendWidth + 16 : 0);
  const plotRight =
    axisSideReserves.right + (legendPosition === "right" ? legendWidth + 16 : 0);
  const plotBottom = padding.bottom + (legendPosition === "bottom" ? legendHeight : 0);
  const plotWidth = Math.max(120, width - plotLeft - plotRight);
  const plotHeight = Math.max(120, height - plotTop - plotBottom);

  runtime.svg.setAttribute("width", String(width));
  runtime.svg.setAttribute("height", String(height));
  runtime.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  runtime.svg.setAttribute("role", "img");
  runtime.svg.setAttribute(
    "aria-label",
    config.accessibility?.title ?? config.title ?? `${type} chart`,
  );

  const ctx: RenderContext = {
    width,
    height,
    plotWidth,
    plotHeight,
    padding: {
      ...padding,
      left: plotLeft,
      right: plotRight,
      top: plotTop,
      bottom: plotBottom,
    },
    theme,
    interactivePoints: [],
    csvRows: data,
    crosshairMarkup: "",
  };

  let plotMarkup = "";
  const primarySeries = visibleSeries[0] ?? {
    color: theme.palette?.[0],
    xKey: "x",
    yKey: "y",
    valueKey: "value",
  };
  if (!visibleSeries.length && type !== "sankey" && type !== "map") {
    plotMarkup = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${theme.muted}" font-size="14">All series are hidden</text>`;
  } else if (!data.length && type !== "sankey" && type !== "map") {
    plotMarkup = `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="${theme.muted}" font-size="14">${escapeHtml(config.emptyState ?? "No data to display")}</text>`;
  } else {
    switch (type) {
      case "pie":
        plotMarkup = renderPieFamily(data, config, ctx, visibleSeries, runtime);
        break;
      case "radar":
        plotMarkup = renderRadar(data, config, ctx, visibleSeries, runtime);
        break;
      case "gauge":
        plotMarkup = renderGauge(data, config, ctx, primarySeries, runtime);
        break;
      case "polar":
        plotMarkup = renderPolar(data, config, ctx, primarySeries, runtime);
        break;
      case "treemap":
        plotMarkup = renderTreemap(data, config, ctx, primarySeries, runtime);
        break;
      case "sankey":
        plotMarkup = renderSankeyChart(config, ctx, primarySeries, runtime);
        break;
      case "funnel":
        plotMarkup = renderFunnel(data, config, ctx, primarySeries, runtime);
        break;
      case "heatmap":
        plotMarkup = renderHeatmap(data, config, ctx, primarySeries, runtime);
        break;
      case "box-plot":
        plotMarkup = renderBoxPlot(data, config, ctx, primarySeries, runtime);
        break;
      case "map":
        plotMarkup = renderMap(data, config, ctx, primarySeries, runtime);
        break;
      default:
        plotMarkup = renderCartesianChart(
          type,
          data,
          config,
          ctx,
          visibleSeries,
          runtime,
        );
        break;
    }
  }

  const legendMarkup =
    config.legend?.enabled === false || !legendEntries.length
      ? ""
      : (() => {
          const y =
            legendPosition === "bottom"
              ? plotTop + plotHeight + 18
              : legendPosition === "inside"
                ? plotTop + 16
                : 22 + titleHeight;
          const x =
            legendPosition === "right"
              ? width - legendWidth - 8
              : legendPosition === "left"
                ? 8
                : legendPosition === "inside"
                  ? plotLeft + 12
                  : padding.left;
          const availableWidthForLegend =
            legendPosition === "left" || legendPosition === "right"
              ? legendWidth
              : legendAvailableWidth;
          return `<g class="sx-legend" transform="translate(${x}, ${y})">${renderLegend(
            legendEntries,
            theme,
            runtime.state,
            config,
            availableWidthForLegend,
            runtime,
          )}</g>`;
        })();

  const cartesian = ctx.cartesian;
  const useClipPath = Boolean(cartesian && runtime.state.zoomX);
  const clipMarkup = useClipPath
    ? `<defs><clipPath id="${runtime.clipPathId}"><rect x="${cartesian!.plotX}" y="${cartesian!.plotY}" width="${cartesian!.plotWidth}" height="${cartesian!.plotHeight}" rx="6" /></clipPath></defs>`
    : "";

  const clipPathAttribute = useClipPath
    ? ` clip-path="url(#${runtime.clipPathId})"`
    : "";
  const brushMarkup =
    cartesian && runtime.brushSelection
      ? `<rect x="${Math.min(runtime.brushSelection[0], runtime.brushSelection[1])}" y="${cartesian.plotY}" width="${Math.abs(runtime.brushSelection[1] - runtime.brushSelection[0])}" height="${cartesian.plotHeight}" fill="${theme.palette?.[0] ?? "var(--primary)"}" fill-opacity="0.12" stroke="${theme.palette?.[0] ?? "var(--primary)"}" stroke-dasharray="4 4" rx="6" />`
      : "";

  runtime.svg.innerHTML = `
    ${clipMarkup}
    <rect x="0" y="0" width="${width}" height="${height}" fill="${theme.background}" rx="20" />
    ${renderTitle(config, ctx)}
    ${legendMarkup}
    <g class="sx-grid-layer">${ctx.gridMarkup ?? ""}</g>
    <g class="sx-plot"${clipPathAttribute}>${plotMarkup}</g>
    <g class="sx-brush">${brushMarkup}</g>
    <g class="sx-axes">${ctx.axesMarkup ?? ""}</g>
    <g class="sx-crosshair"${clipPathAttribute}>${ctx.crosshairMarkup}</g>
  `;
  runtime.context = ctx;
  runtime.tooltip.style.background =
    theme.tooltipBackground ?? "var(--popover)";
  runtime.tooltip.style.color =
    theme.tooltipForeground ?? "var(--popover-foreground)";
  if (!isTooltipEnabled(config) || !isHoverEnabled(config)) {
    hideTooltip(runtime);
    runtime.tooltip.setAttribute("aria-hidden", "true");
  } else {
    runtime.tooltip.removeAttribute("aria-hidden");
  }
  runRenderAnimations(runtime);
  runtime.animateOnNextRender = false;
}

function nearestPoint(context: RenderContext, x: number, y: number) {
  if (context.cartesian) {
    const axis = context.cartesian.hoverAxis;
    const pointerCoord = axis === "x" ? x : y;
    let best: InteractivePoint | undefined;
    let bestAxisDistance = Infinity;
    let bestDistance = Infinity;
    for (const point of context.interactivePoints) {
      const axisCoord = axis === "x" ? point.x : point.y;
      const axisDistance = Math.abs(axisCoord - pointerCoord);
      const nextDistance = Math.hypot(point.x - x, point.y - y);
      if (
        axisDistance < bestAxisDistance ||
        (Math.abs(axisDistance - bestAxisDistance) < 1e-6 &&
          nextDistance < bestDistance)
      ) {
        best = point;
        bestAxisDistance = axisDistance;
        bestDistance = nextDistance;
      }
    }
    return bestAxisDistance <= context.cartesian.hoverThreshold ? best : undefined;
  }

  let best: InteractivePoint | undefined;
  let distance = Infinity;
  for (const point of context.interactivePoints) {
    const nextDistance = Math.hypot(point.x - x, point.y - y);
    if (nextDistance < distance) {
      distance = nextDistance;
      best = point;
    }
  }
  return distance < 110 ? best : undefined;
}

function registerSync(runtime: ChartRuntime) {
  if (!runtime.config.syncGroup) return;
  const group =
    syncGroups.get(runtime.config.syncGroup) ?? new Set<ChartRuntime>();
  group.add(runtime);
  syncGroups.set(runtime.config.syncGroup, group);
  runtime.teardownFns.push(() => {
    group.delete(runtime);
    if (!group.size) syncGroups.delete(runtime.config.syncGroup!);
  });
}

function broadcastHover(
  runtime: ChartRuntime,
  key: string | number | undefined,
) {
  const group = runtime.config.syncGroup
    ? syncGroups.get(runtime.config.syncGroup)
    : undefined;
  group?.forEach((chart) => {
    if (chart === runtime) return;
    if (!isHoverEnabled(chart.config)) return;
    chart.state.hoveredKey = key;
    renderChart(chart);
  });
}

function tooltipPointsForKey(context: RenderContext, key: string | number) {
  const seen = new Set<string>();
  return context.interactivePoints.filter((point) => {
    if (point.key !== key) return false;
    const marker = `${point.series.id ?? point.series.name ?? "series"}:${point.label}`;
    if (seen.has(marker)) return false;
    seen.add(marker);
    return true;
  });
}

function attachInteractions(runtime: ChartRuntime) {
  const onClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const legendPageControl = target.closest<SVGGElement>("[data-sx-legend-page]");
    if (legendPageControl) {
      const direction = legendPageControl.getAttribute("data-sx-legend-page");
      runtime.legendPage += direction === "prev" ? -1 : 1;
      renderChart(runtime);
      return;
    }
    const legendItem = target.closest<SVGGElement>(".sx-legend-item");
    if (legendItem) {
      if (runtime.config.legend?.toggle === false) return;
      const id = legendItem.dataset.series;
      if (!id) return;
      if (runtime.state.hiddenSeries.has(id))
        runtime.state.hiddenSeries.delete(id);
      else runtime.state.hiddenSeries.add(id);
      runtime.animateOnNextRender = runtime.config.animate !== false;
      renderChart(runtime);
      return;
    }

    if (!runtime.config.interactions?.drilldown || !runtime.context) return;

    const svgBounds = runtime.svg.getBoundingClientRect();
    const pointerEvent = event as MouseEvent;
    const x =
      (((pointerEvent.clientX ?? 0) - svgBounds.left) /
        Math.max(1, svgBounds.width)) *
      runtime.context.width;
    const y =
      (((pointerEvent.clientY ?? 0) - svgBounds.top) /
        Math.max(1, svgBounds.height)) *
      runtime.context.height;
    const hoverKey = (target as HTMLElement | null)
      ?.closest<SVGElement>("[data-sx-chart-key]")
      ?.getAttribute("data-sx-chart-key");
    const point = hoverKey
      ? tooltipPointsForKey(runtime.context, hoverKey)[0]
      : nearestPoint(runtime.context, x, y);
    if (point) {
      runtime.config.interactions.drilldown(point.raw);
    }
  };

  let isPanning = false;
  let panStartX = 0;
  let zoomAtStart: [number, number] | undefined;

  const onPointerMove = (event: PointerEvent) => {
    if (!runtime.context) return;
    const containerBounds = runtime.container.getBoundingClientRect();
    const svgBounds = runtime.svg.getBoundingClientRect();
    const x =
      ((event.clientX - svgBounds.left) / Math.max(1, svgBounds.width)) *
      runtime.context.width;
    const y =
      ((event.clientY - svgBounds.top) / Math.max(1, svgBounds.height)) *
      runtime.context.height;
    if (isPanning && runtime.context.cartesian?.zoomable && zoomAtStart) {
      const domainDelta =
        runtime.context.cartesian.coordToX(panStartX) -
        runtime.context.cartesian.coordToX(x);
      runtime.state.zoomX = [
        zoomAtStart[0] + domainDelta,
        zoomAtStart[1] + domainDelta,
      ];
      renderChart(runtime);
      return;
    }
    if (
      runtime.brushSelection &&
      runtime.config.interactions?.brush &&
      runtime.context.cartesian?.zoomable
    ) {
      runtime.brushSelection = [runtime.brushSelection[0], x];
      renderChart(runtime);
      return;
    }
    if (!isHoverEnabled(runtime.config)) {
      hideTooltip(runtime);
      if (runtime.state.hoveredKey != null) {
        runtime.state.hoveredKey = undefined;
        broadcastHover(runtime, undefined);
        renderChart(runtime);
      }
      return;
    }
    const isMapChart = resolveChartType(runtime.config) === "map";
    const hoverKey = (event.target as HTMLElement | null)
      ?.closest<SVGElement>("[data-sx-chart-key]")
      ?.getAttribute("data-sx-chart-key");
    const point = hoverKey
      ? tooltipPointsForKey(runtime.context, hoverKey)[0]
      : isMapChart
        ? undefined
        : nearestPoint(runtime.context, x, y);
    if (!point || runtime.config.tooltip?.conditional?.(point.raw) === false) {
      hideTooltip(runtime);
      runtime.state.hoveredKey = undefined;
      broadcastHover(runtime, undefined);
      renderChart(runtime);
      return;
    }
    const previousKey = runtime.state.hoveredKey;
    runtime.state.hoveredKey = point.key;
    if (!isTooltipEnabled(runtime.config)) {
      hideTooltip(runtime);
      if (previousKey !== point.key) {
        renderChart(runtime);
        broadcastHover(runtime, point.key);
      }
      return;
    }
    const tooltipPoints =
      runtime.config.tooltip?.shared === false
        ? [point]
        : tooltipPointsForKey(runtime.context, point.key);
    runtime.tooltip.innerHTML = formatSharedTooltip(
      tooltipPoints,
      runtime.config,
    );
    runtime.tooltip.classList.add("is-visible");
    const tooltipWidth = runtime.tooltip.offsetWidth || 180;
    const tooltipHeight = runtime.tooltip.offsetHeight || 64;
    const pointerX = event.clientX - containerBounds.left;
    const pointerY = event.clientY - containerBounds.top;
    const clampedLeft = clamp(
      pointerX,
      tooltipWidth / 2 + 8,
      containerBounds.width - tooltipWidth / 2 - 8,
    );
    const clampedTop = clamp(
      pointerY - 12,
      tooltipHeight + 24,
      containerBounds.height - 8,
    );
    runtime.tooltip.style.left = `${clampedLeft}px`;
    runtime.tooltip.style.top = `${clampedTop}px`;
    runtime.liveRegion.textContent = tooltipPoints
      .map((entry) => `${entry.series.name ?? "Series"} ${entry.value}`)
      .join(", ");
    if (previousKey !== point.key) {
      renderChart(runtime);
      broadcastHover(runtime, point.key);
    }
  };

  const onPointerLeave = () => {
    hideTooltip(runtime);
    runtime.state.hoveredKey = undefined;
    renderChart(runtime);
    broadcastHover(runtime, undefined);
  };

  const onWheel = (event: WheelEvent) => {
    if (
      runtime.config.legend?.scroll &&
      (event.target as HTMLElement | null)?.closest(".sx-legend")
    ) {
      event.preventDefault();
      runtime.legendPage += event.deltaY < 0 ? -1 : 1;
      renderChart(runtime);
      return;
    }
    if (
      !runtime.config.interactions?.zoom ||
      !runtime.context?.cartesian?.zoomable
    )
      return;
    event.preventDefault();
    const bounds = runtime.svg.getBoundingClientRect();
    const x =
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
      runtime.context.width;
    const center = runtime.context.cartesian.coordToX(x);
    const [currentMin, currentMax] = runtime.state.zoomX ?? [
      runtime.context.cartesian.coordToX(runtime.context.cartesian.plotX),
      runtime.context.cartesian.coordToX(
        runtime.context.cartesian.plotX + runtime.context.cartesian.plotWidth,
      ),
    ];
    const currentSpan = currentMax - currentMin;
    const nextSpan = event.deltaY < 0 ? currentSpan * 0.85 : currentSpan * 1.15;
    const ratio = (center - currentMin) / (currentSpan || 1);
    runtime.state.zoomX = [
      center - nextSpan * ratio,
      center + nextSpan * (1 - ratio),
    ];
    renderChart(runtime);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (
      runtime.config.interactions?.brush &&
      runtime.context?.cartesian?.zoomable &&
      (event.shiftKey || !runtime.config.interactions?.pan)
    ) {
      const bounds = runtime.svg.getBoundingClientRect();
      const x =
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
        runtime.context.width;
      runtime.brushSelection = [x, x];
      renderChart(runtime);
      return;
    }
    if (
      !runtime.config.interactions?.pan ||
      !runtime.context?.cartesian?.zoomable
    )
      return;
    isPanning = true;
    const bounds = runtime.svg.getBoundingClientRect();
    panStartX =
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
      runtime.context.width;
    zoomAtStart = runtime.state.zoomX;
    if (!zoomAtStart) {
      zoomAtStart = [
        runtime.context.cartesian.coordToX(runtime.context.cartesian.plotX),
        runtime.context.cartesian.coordToX(
          runtime.context.cartesian.plotX + runtime.context.cartesian.plotWidth,
        ),
      ];
    }
  };

  const onPointerUp = () => {
    if (
      runtime.brushSelection &&
      runtime.context?.cartesian?.zoomable &&
      runtime.config.interactions?.brush
    ) {
      const [start, end] = runtime.brushSelection;
      runtime.brushSelection = undefined;
      if (Math.abs(end - start) > 8) {
        runtime.state.zoomX = [
          runtime.context.cartesian.coordToX(Math.min(start, end)),
          runtime.context.cartesian.coordToX(Math.max(start, end)),
        ];
      }
      renderChart(runtime);
    }
    isPanning = false;
  };

  const onDoubleClick = () => {
    if (runtime.config.interactions?.resetZoom === false) return;
    runtime.state.zoomX = undefined;
    renderChart(runtime);
  };

  runtime.container.addEventListener("click", onClick);
  runtime.container.addEventListener("pointermove", onPointerMove);
  runtime.container.addEventListener("pointerleave", onPointerLeave);
  runtime.container.addEventListener("wheel", onWheel, { passive: false });
  runtime.container.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  runtime.container.addEventListener("dblclick", onDoubleClick);

  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("click", onClick),
  );
  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("pointermove", onPointerMove),
  );
  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("pointerleave", onPointerLeave),
  );
  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("wheel", onWheel),
  );
  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("pointerdown", onPointerDown),
  );
  runtime.teardownFns.push(() =>
    window.removeEventListener("pointerup", onPointerUp),
  );
  runtime.teardownFns.push(() =>
    runtime.container.removeEventListener("dblclick", onDoubleClick),
  );
}

async function exportChart(
  runtime: ChartRuntime,
  format: "svg" | "png" | "csv",
): Promise<ExportResult> {
  const baseName =
    String(runtime.config.title ?? "sprucex-chart")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sprucex-chart";
  if (format === "svg") {
    const content = new XMLSerializer().serializeToString(runtime.svg);
    return { content, mimeType: "image/svg+xml", fileName: `${baseName}.svg` };
  }
  if (format === "csv") {
    const rows = runtime.context?.csvRows ?? [];
    const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const lines = [keys.join(",")].concat(
      rows.map((row) =>
        keys.map((key) => JSON.stringify(row[key] ?? "")).join(","),
      ),
    );
    return {
      content: lines.join("\n"),
      mimeType: "text/csv",
      fileName: `${baseName}.csv`,
    };
  }
  const svgContent = new XMLSerializer().serializeToString(runtime.svg);
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = runtime.context?.width ?? 1024;
  canvas.height = runtime.context?.height ?? 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is unavailable");
  const theme = resolveTheme(runtime.config);
  const backgroundColor = theme.background ?? "#ffffff";
  context.fillStyle = backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Failed to render PNG export"));
    }, "image/png");
  });
  return { content: blob, mimeType: "image/png", fileName: `${baseName}.png` };
}

export function createChart(
  container: HTMLElement,
  initialConfig: ChartOptions,
): ChartInstance {
  appendStyles(container);
  container.classList.add("sx-chart-root");
  container.style.position = "relative";
  const style = container.querySelector(":scope > style[data-sx-chart]");
  const size = getSize(container, initialConfig);
  const svg = createSvgRoot(size.width, size.height);
  const tooltip = document.createElement("div");
  tooltip.className = "sx-chart-tooltip";
  const liveRegion = document.createElement("div");
  liveRegion.className = "sx-chart-live";
  liveRegion.setAttribute("aria-live", "polite");
  container.replaceChildren(
    ...(style ? [style] : []),
    svg,
    tooltip,
    liveRegion,
  );

  const runtime: ChartRuntime = {
    container,
    svg,
    tooltip,
    liveRegion,
    config: initialConfig,
    state: { hiddenSeries: new Set<string>() },
    context: null,
    destroyed: false,
    teardownFns: [],
    clipPathId: `sx-chart-clip-${++chartRuntimeId}`,
    animateOnNextRender: initialConfig.animate !== false,
    animationCursor: 0,
    legendPage: 0,
  };

  attachInteractions(runtime);
  registerSync(runtime);
  renderChart(runtime);
  runtimeMap.set(container, runtime);

  const onWindowResize = () => {
    if (runtime.config.responsive !== false) {
      runtime.animateOnNextRender = false;
      renderChart(runtime);
    }
  };
  window.addEventListener("resize", onWindowResize);
  runtime.teardownFns.push(() =>
    window.removeEventListener("resize", onWindowResize),
  );

  const instance: ChartInstance = {
    update(nextConfig) {
      runtime.config = { ...runtime.config, ...nextConfig };
      runtime.animateOnNextRender = runtime.config.animate !== false;
      renderChart(runtime);
    },
    setData(nextData) {
      runtime.config = { ...runtime.config, data: nextData };
      runtime.animateOnNextRender = runtime.config.animate !== false;
      renderChart(runtime);
    },
    resize() {
      runtime.animateOnNextRender = false;
      renderChart(runtime);
    },
    async export(format) {
      const result = await exportChart(runtime, format);
      download(result.content, result.fileName, result.mimeType);
      return result;
    },
    destroy() {
      if (runtime.destroyed) return;
      runtime.destroyed = true;
      runtime.teardownFns.forEach((fn) => fn());
      runtimeMap.delete(container);
      instanceMap.delete(container);
      container.replaceChildren();
    },
    getState() {
      return runtime.state;
    },
  };

  runtime.instance = instance;
  instanceMap.set(container, instance);
  return instance;
}

export function getChartRuntime(container: HTMLElement) {
  return runtimeMap.get(container);
}

export function getChartInstance(container: HTMLElement) {
  return instanceMap.get(container);
}
