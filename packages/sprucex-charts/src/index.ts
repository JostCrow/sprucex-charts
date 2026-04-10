export { getChartInstance } from "./runtime/chart";
export { autoRegisterSpruceXCharts, registerSpruceXCharts } from "./integration/sprucex";
export { builtinMaps, resolveMapFeatureCollection } from "./maps";
export * from "./types";

import { autoRegisterSpruceXCharts } from "./integration/sprucex";

autoRegisterSpruceXCharts();
