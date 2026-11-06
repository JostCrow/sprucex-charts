export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "horizontal-bar"
  | "stacked-bar"
  | "stacked-area"
  | "pie"
  | "scatter"
  | "bubble"
  | "histogram"
  | "combo"
  | "multi-axis"
  | "heatmap"
  | "box-plot"
  | "radar"
  | "treemap"
  | "sankey"
  | "funnel"
  | "gauge"
  | "polar"
  | "candlestick"
  | "ohlc"
  | "map";

export type ScaleType = "linear" | "log" | "time" | "category" | "percentage";
export type LegendPosition = "top" | "right" | "bottom" | "left" | "inside";
export type LegendLayout = "horizontal" | "vertical" | "wrapped";
export type LineMode = "straight" | "stepped" | "smooth";

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** JSON-friendly display rules, independent of the axis scale. */
export type ValueFormat =
  | { type: "text" }
  | { type: "number"; options?: Intl.NumberFormatOptions }
  | {
      type: "percent";
      encoding?: "fraction" | "whole-percent";
      options?: Intl.NumberFormatOptions;
    }
  | { type: "currency"; currency: string; options?: Intl.NumberFormatOptions }
  | { type: "date"; options?: Intl.DateTimeFormatOptions };

export interface AxisConfig {
  /** Opt-in measured label thinning and truncation. */
  labelDensity?: "all" | "auto";
  maxLabelWidth?: number;
  format?: ValueFormat;
  enabled?: boolean;
  scaleType?: ScaleType;
  min?: number | Date | string;
  max?: number | Date | string;
  tickCount?: number;
  tickValues?: Array<number | string | Date>;
  tickFormat?: string | ((value: unknown) => string);
  labelRotation?: number;
  title?: string;
  grid?: boolean;
}

export interface LegendConfig {
  /** Wrap and paginate to one row; truncate labels to maxLabelWidth. */
  compact?: boolean;
  maxLabelWidth?: number;
  enabled?: boolean;
  position?: LegendPosition;
  layout?: LegendLayout;
  alignment?: "start" | "center" | "end";
  inside?: boolean;
  itemShape?: "line" | "dot" | "square";
  itemSpacing?: number;
  toggle?: boolean;
  labelFormatter?: (label: string) => string;
  scroll?: boolean;
  pagination?: boolean;
}

export interface TooltipConfig {
  enabled?: boolean;
  shared?: boolean;
  formatter?: (point: Record<string, unknown>, series: SeriesConfig) => string;
  conditional?: (point: Record<string, unknown>) => boolean;
}

export interface InteractionConfig {
  hover?: boolean;
  brush?: boolean;
  zoom?: boolean;
  pan?: boolean;
  resetZoom?: boolean;
  drilldown?: (point: Record<string, unknown>) => void;
}

export interface AccessibilityConfig {
  title?: string;
}

export interface TrendlineConfig {
  id?: string;
  type?: "auto" | "target";
  seriesId?: string;
  value?: number;
  label?: string;
  color?: string;
  strokeWidth?: number;
  dashStyle?: string;
  axis?: "y" | "y2";
  visible?: boolean;
}

export interface ChartEventConfig {
  id?: string;
  label?: string;
  date?: number | string | Date;
  startDate?: number | string | Date;
  endDate?: number | string | Date;
  color?: string;
  textColor?: string;
  opacity?: number;
}

export interface DonutCenterConfig {
  enabled?: boolean;
  showPercentage?: boolean;
  formatter?: (
    value: number,
    total: number,
    label: string,
    percentage: number,
  ) => string;
}

export interface ThemeConfig {
  name?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  axis?: string;
  grid?: string;
  tooltipBackground?: string;
  tooltipForeground?: string;
  palette?: string[];
}

export interface BaseSeriesConfig {
  /** Line/area only. Defaults to connect for compatibility. */
  missingValues?: "connect" | "gap";
  id?: string;
  name?: string;
  type?: ChartType;
  xKey?: string;
  yKey?: string;
  valueKey?: string;
  openKey?: string;
  highKey?: string;
  lowKey?: string;
  closeKey?: string;
  sizeKey?: string;
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  areaOpacity?: number;
  markerShape?: "circle" | "square" | "diamond";
  markerSize?: number;
  barWidth?: number;
  lineMode?: LineMode;
  dashStyle?: string;
  visible?: boolean;
  labels?: boolean;
  order?: number;
  axis?: "y" | "y2";
  format?: ValueFormat | ((value: unknown) => string);
}

export interface SankeySeriesConfig extends BaseSeriesConfig {
  nodes?: Array<{ id: string; name?: string; value?: number }>;
  links?: Array<{ source: string; target: string; value: number }>;
}

export interface MapConfig {
  features?: unknown;
  source?: unknown;
  objectKey?: string;
  projection?: "mercator" | "equal-earth" | "orthographic" | "custom";
  valueKey?: string;
  pointKey?: string;
  pointRadius?: number;
}

export type SeriesConfig = BaseSeriesConfig | SankeySeriesConfig;

export interface ChartOptions {
  /** Hide overlapping point labels after measuring their rendered bounds. */
  labelDensity?: "all" | "auto";
  /** Shared field display rules; explicit series/axis formats take precedence. */
  fieldFormats?: Record<string, ValueFormat>;
  hiddenSeries?: string[];
  type?: ChartType;
  data?: Record<string, unknown>[] | Record<string, unknown>;
  series?: SeriesConfig[];
  animate?: boolean;
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
    y2?: AxisConfig;
  };
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  interactions?: InteractionConfig;
  trendlines?: TrendlineConfig[];
  events?: ChartEventConfig[];
  locale?: string;
  timeZone?: string;
  responsive?: boolean;
  accessibility?: AccessibilityConfig;
  syncGroup?: string;
  title?: string;
  subtitle?: string;
  padding?: number;
  emptyState?: string;
  width?: number;
  height?: number;
  map?: MapConfig;
  donutCenter?: DonutCenterConfig;
  volumeOverlay?: {
    enabled?: boolean;
    data?: Record<string, unknown>[];
    xKey?: string;
    yKey?: string;
  };
}

/** Save this separately from the chart's data source. Use declarative formats for JSON storage. */
export type ChartConfiguration = Omit<ChartOptions, "data">;

export interface ChartConfigChangeEvent {
  config: ChartConfiguration;
}

export type SpruceXChartOptions = Omit<ChartOptions, "data" | "type">;

export interface ChartState {
  hiddenSeries: Set<string>;
  hoveredKey?: string | number;
  hoveredX?: number;
  hoveredY?: number;
  zoomX?: [number, number];
  panOffsetX?: number;
}

export interface ChartExportOptions {
  values?: "raw" | "formatted";
}

export interface ChartSelectionEvent {
  key: string | number;
  seriesId?: string;
  datum: Record<string, unknown>;
}

export interface ChartRangeEvent {
  source: "brush" | "zoom" | "pan";
  /** Numeric horizontal domain (value domain for horizontal bars); time uses epoch milliseconds. */
  range: [number, number];
}

export interface ChartResetEvent {
  source: "double-click";
}

export interface ExportResult {
  content: string | Blob;
  mimeType: string;
  fileName: string;
}

export interface ChartInstance {
  /** Detached configuration snapshot, excluding the main data source. */
  getConfig(): ChartConfiguration;
  /** Replace configuration, retaining the current data source. */
  setConfig(config: ChartConfiguration): void;
  update(nextConfig: ChartOptions): void;
  setData(nextData: Record<string, unknown>[] | Record<string, unknown>): void;
  resize(): void;
  export(
    format: "svg" | "png" | "csv" | "json",
    options?: ChartExportOptions,
  ): Promise<ExportResult>;
  destroy(): void;
  getState(): ChartState;
}

export interface SpruceXComponentLike {
  root: HTMLElement;
  state: Record<string, unknown>;
  evaluateExpressionOrLiteral(
    raw: string,
    locals?: Record<string, unknown>,
  ): unknown;
  assignStateValue(targetExpr: string, value: unknown): void;
}

export interface SpruceXLike {
  integration(
    name: string,
    integration: {
      setup?: (component: SpruceXComponentLike) => void;
      scan?: (component: SpruceXComponentLike, el: HTMLElement) => void;
      update?: (component: SpruceXComponentLike) => void;
      teardown?: (component: SpruceXComponentLike) => void;
    },
  ): void;
}

/** Detail payloads for bubbling DOM CustomEvents on the chart host. */
export interface ChartInteractionEventMap {
  "sx-chart:selection": ChartSelectionEvent;
  "sx-chart:range": ChartRangeEvent;
  "sx-chart:reset": ChartResetEvent;
  "sx-chart:configchange": ChartConfigChangeEvent;
}
