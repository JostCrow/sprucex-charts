export type DocSection =
  | "overview"
  | "documentation"
  | "data-structures"
  | "examples";

export interface DocAction {
  href: string;
  label: string;
  variant: "primary" | "secondary";
}

export interface DocPage {
  browserTitle: string;
  description: string;
  eyebrow?: string;
  heading: string;
  href: string;
  mainAttributes?: Record<string, string>;
  navLabel: string;
  pills?: string[];
  section: DocSection;
  showSearch?: boolean;
  slug: string;
  variant: "hero" | "standard";
  actions?: DocAction[];
}

export const docPages: readonly DocPage[] = [
  {
    browserTitle: "SpruceX Charts | Overview",
    description:
      "Most charting libraries demand weeks of configuration. SpruceX Charts works the opposite way—most of the time, it just works. Define your data, pick a chart type, and you're done.",
    eyebrow: "SVG Charts for SpruceX",
    heading: "Charts that feel like native HTML",
    href: "/",
    navLabel: "Overview",
    section: "overview",
    slug: "index",
    variant: "hero",
    actions: [
      { href: "/documentation", label: "Read the Docs", variant: "primary" },
      { href: "/examples/line", label: "See Examples", variant: "secondary" },
    ],
  },
  {
    browserTitle: "SpruceX Charts | Documentation",
    description:
      "Below here we will tell you about all the options that you can set in order to make a chart.",
    heading: "SpruceX Charts - Documentation",
    href: "/documentation",
    mainAttributes: {
      "sx-data": "docsDocs",
      "sx-init": "searchQuery = ''",
    },
    navLabel: "Documentation",
    section: "documentation",
    showSearch: true,
    slug: "documentation",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Data Structures",
    description:
      "How to shape chart data, bind it with sx-chart, and configure single-series and multi-series datasets correctly.",
    heading: "Data Structures",
    href: "/data-structures",
    navLabel: "Data Structures",
    section: "data-structures",
    slug: "data-structures",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Line",
    description: "Single-series line rendering over shared category steps.",
    heading: "Line",
    href: "/examples/line",
    navLabel: "Line",
    section: "examples",
    slug: "line",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Area",
    description: "Soft area fills with the same categorical axis structure.",
    heading: "Area / Spark",
    href: "/examples/area",
    navLabel: "Area / Spark",
    section: "examples",
    slug: "area",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Stacked Area",
    description: "Layered area bands that accumulate across multiple series.",
    heading: "Stacked Area",
    href: "/examples/stacked-area",
    navLabel: "Stacked Area",
    section: "examples",
    slug: "stacked-area",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Bar",
    description: "Single-series vertical bars over a categorical axis.",
    heading: "Bar",
    href: "/examples/bar",
    navLabel: "Bar",
    section: "examples",
    slug: "bar",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Horizontal Bar",
    description: "Horizontal bars for ranked category comparisons.",
    heading: "Horizontal Bar",
    href: "/examples/horizontal-bar",
    navLabel: "Horizontal Bar",
    section: "examples",
    slug: "horizontal-bar",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Stacked Bar",
    description: "Stacked bars showing part-to-whole contribution by category.",
    heading: "Stacked Bar",
    href: "/examples/stacked-bar",
    navLabel: "Stacked Bar",
    section: "examples",
    slug: "stacked-bar",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Pie",
    description:
      "Circular composition charts with optional center content using donutCenter.",
    heading: "Pie / Donut",
    href: "/examples/pie",
    navLabel: "Pie / Donut",
    section: "examples",
    slug: "pie",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Scatter",
    description:
      "Numeric cartesian plots that focus on point distribution alone.",
    heading: "Scatter",
    href: "/examples/scatter",
    navLabel: "Scatter",
    section: "examples",
    slug: "scatter",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Bubble",
    description:
      "Bubble charts use point size as a second quantitative channel.",
    heading: "Bubble",
    href: "/examples/bubble",
    navLabel: "Bubble",
    section: "examples",
    slug: "bubble",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Histogram",
    description: "Bucketed numeric distributions rendered as frequency bars.",
    heading: "Histogram",
    href: "/examples/histogram",
    navLabel: "Histogram",
    section: "examples",
    slug: "histogram",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Combo",
    description:
      "Mixed bar and line rendering inside a single coordinated chart.",
    heading: "Combo",
    href: "/examples/combo",
    navLabel: "Combo",
    section: "examples",
    slug: "combo",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Multi-Axis",
    description:
      "Dual-axis overlays keep separate scales readable in one chart.",
    heading: "Multi-Axis",
    href: "/examples/multi-axis",
    navLabel: "Multi-Axis",
    section: "examples",
    slug: "multi-axis",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Heatmap",
    description: "A dense grid chart with categorical x and y domains.",
    heading: "Heatmap",
    href: "/examples/heatmap",
    navLabel: "Heatmap",
    section: "examples",
    slug: "heatmap",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Box Plot",
    description: "Grouped quartile summaries over categorical domains.",
    heading: "Box Plot",
    href: "/examples/box-plot",
    navLabel: "Box Plot",
    section: "examples",
    slug: "box-plot",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Radar",
    description: "Radar charts compare values across radial category spokes.",
    heading: "Radar",
    href: "/examples/radar",
    navLabel: "Radar",
    section: "examples",
    slug: "radar",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Treemap",
    description:
      "Hierarchy-inspired proportional rectangles for portfolio sizing.",
    heading: "Treemap",
    href: "/examples/treemap",
    navLabel: "Treemap",
    section: "examples",
    slug: "treemap",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Sankey",
    description: "Flow rendering using the first-party SVG sankey layout.",
    heading: "Sankey",
    href: "/examples/sankey",
    navLabel: "Sankey",
    section: "examples",
    slug: "sankey",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Funnel",
    description: "A tapered stage chart for conversion tracking.",
    heading: "Funnel",
    href: "/examples/funnel",
    navLabel: "Funnel",
    section: "examples",
    slug: "funnel",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Gauge",
    description:
      "Gauge charts emphasize progress against a bounded radial target.",
    heading: "Gauge",
    href: "/examples/gauge",
    navLabel: "Gauge",
    section: "examples",
    slug: "gauge",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Polar",
    description: "Polar charts place values on angular and radial scales.",
    heading: "Polar",
    href: "/examples/polar",
    navLabel: "Polar",
    section: "examples",
    slug: "polar",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Candlestick",
    description: "Financial candles with open, high, low, and close values.",
    heading: "Candlestick",
    href: "/examples/candlestick",
    navLabel: "Candlestick",
    section: "examples",
    slug: "candlestick",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | OHLC",
    description: "OHLC ticks for compact price action displays.",
    heading: "OHLC",
    href: "/examples/ohlc",
    navLabel: "OHLC",
    section: "examples",
    slug: "ohlc",
    variant: "standard",
  },
  {
    browserTitle: "SpruceX Charts | Map",
    description:
      "Render real GeoJSON or TopoJSON maps, including built-in world and US shapes plus custom files you import yourself.",
    heading: "Map",
    href: "/examples/map",
    navLabel: "Map",
    section: "examples",
    slug: "map",
    variant: "standard",
  },
] as const;

const docPagesBySlug = new Map(docPages.map((page) => [page.slug, page]));

export function getDocPageBySlug(slug: string) {
  return docPagesBySlug.get(slug);
}

export function requireDocPage(slug: string) {
  const page = getDocPageBySlug(slug);
  if (!page) {
    throw new Error(`Missing docs page metadata for ${slug}`);
  }
  return page;
}
