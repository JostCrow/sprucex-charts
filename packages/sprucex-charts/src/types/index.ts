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

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface AxisConfig {
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
  dashStyle?: string;
  visible?: boolean;
  labels?: boolean;
  order?: number;
  axis?: "y" | "y2";
  format?: (value: unknown) => string;
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

export type SpruceXChartOptions = Omit<ChartOptions, "data" | "type">;

export interface ChartState {
  hiddenSeries: Set<string>;
  hoveredKey?: string | number;
  hoveredX?: number;
  hoveredY?: number;
  zoomX?: [number, number];
  panOffsetX?: number;
}

export interface ExportResult {
  content: string | Blob;
  mimeType: string;
  fileName: string;
}

export interface ChartInstance {
  update(nextConfig: ChartOptions): void;
  setData(nextData: Record<string, unknown>[] | Record<string, unknown>): void;
  resize(): void;
  export(format: "svg" | "png" | "csv"): Promise<ExportResult>;
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
