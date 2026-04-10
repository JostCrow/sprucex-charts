import { createChart, getChartRuntime } from "../runtime/chart";
import type { ChartOptions, SpruceXComponentLike, SpruceXLike } from "../types";

interface ChartBinding {
  el: HTMLElement;
  dataExpr: string;
  typeExpr?: string;
  optionsExpr?: string;
  instance?: ReturnType<typeof createChart>;
  signature?: string;
}

const bindingsByComponent = new WeakMap<SpruceXComponentLike, ChartBinding[]>();

function evaluateConfig(component: SpruceXComponentLike, binding: ChartBinding): ChartOptions {
  const data = component.evaluateExpressionOrLiteral(binding.dataExpr);
  const explicitType = binding.typeExpr ? component.evaluateExpressionOrLiteral(binding.typeExpr) : undefined;
  const rawOptions = (binding.optionsExpr ? component.evaluateExpressionOrLiteral(binding.optionsExpr) : {}) as ChartOptions;
  const { type: _ignoredType, data: _ignoredData, ...options } = typeof rawOptions === "object" && rawOptions ? rawOptions : {};
  return {
    ...options,
    data: Array.isArray(data) || (typeof data === "object" && data) ? (data as ChartOptions["data"]) : [],
    type: (explicitType as ChartOptions["type"]) ?? "line",
  };
}

function stableSignature(config: ChartOptions) {
  return JSON.stringify(config, (_key, value) => {
    if (typeof value === "function") return `[fn:${value.name || "anonymous"}]`;
    if (value instanceof Set) return Array.from(value);
    if (value instanceof Date) return value.toISOString();
    return value;
  });
}

export function registerSpruceXCharts(SpruceX: SpruceXLike) {
  SpruceX.integration("chart", {
    setup(component) {
      bindingsByComponent.set(component, []);
    },
    scan(component, el) {
      const dataExpr = el.getAttribute("sx-chart");
      if (!dataExpr) return;
      const bindings = bindingsByComponent.get(component) ?? [];
      const existing = bindings.find((binding) => binding.el === el);
      if (existing) {
        existing.dataExpr = dataExpr;
        existing.typeExpr = el.getAttribute("sx-chart-type") ?? undefined;
        existing.optionsExpr = el.getAttribute("sx-chart-options") ?? undefined;
      } else {
        bindings.push({
          el,
          dataExpr,
          typeExpr: el.getAttribute("sx-chart-type") ?? undefined,
          optionsExpr: el.getAttribute("sx-chart-options") ?? undefined,
        });
      }
      bindingsByComponent.set(component, bindings);
    },
    update(component) {
      const bindings = (bindingsByComponent.get(component) ?? []).filter((binding) => binding.el.isConnected);
      bindingsByComponent.set(component, bindings);
      bindings.forEach((binding) => {
        const config = evaluateConfig(component, binding);
        const signature = stableSignature(config);
        if (binding.signature === signature) return;
        binding.signature = signature;
        if (!binding.instance) {
          binding.instance = createChart(binding.el, config);
          return;
        }
        binding.instance.update(config);
      });
    },
    teardown(component) {
      const bindings = bindingsByComponent.get(component) ?? [];
      bindings.forEach((binding) => {
        binding.instance?.destroy();
        const runtime = getChartRuntime(binding.el);
        runtime?.container.replaceChildren();
      });
      bindingsByComponent.delete(component);
    },
  });
}

declare global {
  interface Window {
    SpruceX?: SpruceXLike;
  }
}

export function autoRegisterSpruceXCharts() {
  if (typeof window !== "undefined" && window.SpruceX) {
    registerSpruceXCharts(window.SpruceX);
  }
}
