import { cloneConfig, sameConfig } from "../runtime/config";
import { createChart, getChartRuntime } from "../runtime/chart";
import type {
  ChartConfigChangeEvent,
  ChartOptions,
  SpruceXComponentLike,
  SpruceXLike,
} from "../types";

interface ChartBinding {
  el: HTMLElement;
  dataExpr: string;
  typeExpr?: string;
  optionsExpr?: string;
  configExpr?: string;
  cleanup?: () => void;
  instance?: ReturnType<typeof createChart>;
  snapshot?: ChartOptions;
}

const bindingsByComponent = new WeakMap<SpruceXComponentLike, ChartBinding[]>();

function evaluateConfig(
  component: SpruceXComponentLike,
  binding: ChartBinding,
): ChartOptions {
  const data = component.evaluateExpressionOrLiteral(binding.dataExpr);
  const explicitType = binding.typeExpr
    ? component.evaluateExpressionOrLiteral(binding.typeExpr)
    : undefined;
  const rawConfig = binding.configExpr
    ? (component.evaluateExpressionOrLiteral(
        binding.configExpr,
      ) as ChartOptions)
    : undefined;
  const rawOptions = (
    binding.configExpr
      ? rawConfig
      : binding.optionsExpr
        ? component.evaluateExpressionOrLiteral(binding.optionsExpr)
        : {}
  ) as ChartOptions;
  const {
    type: _ignoredType,
    data: _ignoredData,
    ...options
  } = typeof rawOptions === "object" && rawOptions ? rawOptions : {};
  return {
    ...options,
    data:
      Array.isArray(data) || (typeof data === "object" && data)
        ? (data as ChartOptions["data"])
        : [],
    type: (explicitType as ChartOptions["type"]) ?? rawConfig?.type ?? "line",
  };
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
        existing.configExpr = el.getAttribute("sx-chart-config") ?? undefined;
      } else {
        const binding: ChartBinding = {
          el,
          dataExpr,
          typeExpr: el.getAttribute("sx-chart-type") ?? undefined,
          optionsExpr: el.getAttribute("sx-chart-options") ?? undefined,
          configExpr: el.getAttribute("sx-chart-config") ?? undefined,
        };
        const onChange = (event: Event) => {
          if (event.target !== el || !binding.configExpr) return;
          const { config } = (event as CustomEvent<ChartConfigChangeEvent>)
            .detail;
          binding.snapshot = cloneConfig({
            ...config,
            data: component.evaluateExpressionOrLiteral(
              binding.dataExpr,
            ) as ChartOptions["data"],
          });
          component.assignStateValue(binding.configExpr, config);
        };
        el.addEventListener("sx-chart:configchange", onChange);
        binding.cleanup = () =>
          el.removeEventListener("sx-chart:configchange", onChange);
        bindings.push(binding);
      }
      bindingsByComponent.set(component, bindings);
    },
    update(component) {
      const bindings = (bindingsByComponent.get(component) ?? []).filter(
        (binding) => {
          if (binding.el.isConnected) return true;
          binding.cleanup?.();
          binding.instance?.destroy();
          return false;
        },
      );
      bindingsByComponent.set(component, bindings);
      bindings.forEach((binding) => {
        const config = evaluateConfig(component, binding);
        if (sameConfig(binding.snapshot, config)) return;
        binding.snapshot = cloneConfig(config);
        if (!binding.instance) {
          binding.instance = createChart(binding.el, config);
          return;
        }
        if (binding.configExpr) {
          binding.instance.setData(config.data ?? []);
          binding.instance.setConfig(config);
        } else {
          binding.instance.update(config);
        }
      });
    },
    teardown(component) {
      const bindings = bindingsByComponent.get(component) ?? [];
      bindings.forEach((binding) => {
        binding.cleanup?.();
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
