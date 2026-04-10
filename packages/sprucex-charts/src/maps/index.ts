import worldCountries110m from "world-atlas/countries-110m.json";
import worldLand110m from "world-atlas/land-110m.json";
import usStates10m from "us-atlas/states-10m.json";
import usCounties10m from "us-atlas/counties-10m.json";
import usNation10m from "us-atlas/nation-10m.json";
import { feature as topojsonFeature } from "topojson-client";

import type { MapConfig } from "../types";

type GeoFeature = { type: string; id?: string | number; properties?: Record<string, unknown>; geometry?: unknown };
type GeoFeatureCollection = { type: "FeatureCollection"; features: GeoFeature[] };
type TopologyObject = { type?: string };
type Topology = { type: "Topology"; objects: Record<string, TopologyObject> };

const BUILTIN_MAPS = {
  world: worldCountries110m,
  "world-countries": worldCountries110m,
  "world-land": worldLand110m,
  "us-states": usStates10m,
  "us-counties": usCounties10m,
  "us-nation": usNation10m,
} as const;

export type BuiltinMapName = keyof typeof BUILTIN_MAPS;

function unwrapModule(value: unknown): unknown {
  if (value && typeof value === "object" && "default" in value) {
    return unwrapModule((value as { default: unknown }).default);
  }
  return value;
}

function isFeatureCollection(value: unknown): value is GeoFeatureCollection {
  return !!value && typeof value === "object" && (value as { type?: string }).type === "FeatureCollection" && Array.isArray((value as { features?: unknown }).features);
}

function isFeature(value: unknown): value is GeoFeature {
  return !!value && typeof value === "object" && (value as { type?: string }).type === "Feature";
}

function isTopology(value: unknown): value is Topology {
  return !!value && typeof value === "object" && (value as { type?: string }).type === "Topology" && !!(value as { objects?: unknown }).objects;
}

function toFeatureCollection(value: unknown): GeoFeatureCollection {
  const resolved = unwrapModule(value);
  if (isFeatureCollection(resolved)) return resolved;
  if (Array.isArray(resolved)) {
    return { type: "FeatureCollection", features: resolved.filter((item) => !!item && typeof item === "object") as GeoFeature[] };
  }
  if (isFeature(resolved)) {
    return { type: "FeatureCollection", features: [resolved] };
  }
  if (resolved && typeof resolved === "object" && "type" in resolved && "coordinates" in resolved) {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: resolved }],
    };
  }
  return { type: "FeatureCollection", features: [] };
}

function topologyToFeatureCollection(topology: Topology, objectKey?: string): GeoFeatureCollection {
  const resolvedObjectKey = objectKey ?? Object.keys(topology.objects)[0];
  if (!resolvedObjectKey || !topology.objects[resolvedObjectKey]) {
    return { type: "FeatureCollection", features: [] };
  }

  const geoJson = topojsonFeature(topology, topology.objects[resolvedObjectKey]);
  return isFeatureCollection(geoJson) ? geoJson : toFeatureCollection(geoJson);
}

export function resolveMapFeatureCollection(map?: MapConfig): GeoFeatureCollection {
  const sourceValue = unwrapModule(map?.source ?? map?.features);
  const resolvedSource =
    typeof sourceValue === "string" ? BUILTIN_MAPS[sourceValue as BuiltinMapName] ?? sourceValue : sourceValue;

  if (isTopology(resolvedSource)) {
    return topologyToFeatureCollection(resolvedSource, map?.objectKey);
  }

  return toFeatureCollection(resolvedSource);
}

export const builtinMaps = BUILTIN_MAPS;
