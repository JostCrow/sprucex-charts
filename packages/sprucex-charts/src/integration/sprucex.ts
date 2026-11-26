import { cloneConfig, sameConfig } from "../runtime/config";
import { createChart, getChartRuntime } from "../runtime/chart";
import type {
  ChartConfigChangeEvent,
  ChartConfiguration,
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
  configSnapshot?: ChartConfiguration;
  dataSnapshot?: ChartOptions["data"];
  rawDataRef?: ChartOptions["data"];
}

const bindingsByComponent = new WeakMap<SpruceXComponentLike, ChartBinding[]>();

function unwrapRaw<T>(value: T, toRaw?: <U>(input: U) => U): T {
  return typeof toRaw === "function" ? toRaw(value) : value;
}

function normalizeData(value: unknown): NonNullable<ChartOptions["data"]> {
  return Array.isArray(value) || (typeof value === "object" && value !== null)
    ? (value as NonNullable<ChartOptions["data"]>)
    : [];
}

/**
 * Subscribe to reactive Proxy nodes while stopping immediately on raw values
 * (such as `SpruceX.markRaw()`, `sx-json-into.shallow`, or children of `SpruceX.shallow()`).
 */
function trackReactiveData(
  value: unknown,
  toRaw?: <T>(input: T) => T,
  seen = new WeakSet<object>(),
): void {
  if (typeof toRaw !== "function" || !value || typeof value !== "object") {
    return;
  }
  const raw = toRaw(value);
  if (raw === value) {
    return;
  }
  if (seen.has(raw as object)) {
    return;
  }
  seen.add(raw as object);
  if (Array.isArray(value)) {
    for (const item of value) {
      trackReactiveData(item, toRaw, seen);
    }
    return;
  }
  for (const key of Object.keys(value)) {
    trackReactiveData((value as Record<string, unknown>)[key], toRaw, seen);
  }
}

function evaluateChartConfiguration(
  evaluateOrLiteral: (expr: string) => unknown,
  attrs: {
    typeExpr?: string;
    optionsExpr?: string;
    configExpr?: string;
  },
): ChartConfiguration {
  const explicitType = attrs.typeExpr
    ? evaluateOrLiteral(attrs.typeExpr)
    : undefined;
  const rawConfig = attrs.configExpr
    ? (evaluateOrLiteral(attrs.configExpr) as ChartOptions | undefined)
    : undefined;
  const rawOptions = (
    attrs.configExpr
      ? rawConfig
      : attrs.optionsExpr
        ? evaluateOrLiteral(attrs.optionsExpr)
        : {}
  ) as ChartOptions | undefined;
  // Clone reads every nested key on reactive Proxies (enabling fine-grained tracking)
  // and returns an unproxied configuration object.
  const clonedOptions =
    typeof rawOptions === "object" && rawOptions
      ? cloneConfig(rawOptions)
      : {};
  const {
    type: configType,
    data: _ignoredData,
    ...options
  } = clonedOptions as ChartOptions;
  return {
    ...options,
    type:
      (explicitType as ChartOptions["type"]) ??
      (attrs.configExpr ? configType : undefined) ??
      "line",
  };
}

function destroyBinding(binding: ChartBinding) {
  binding.cleanup?.();
  binding.cleanup = undefined;
  binding.instance?.destroy();
  binding.instance = undefined;
  const runtime = getChartRuntime(binding.el);
  runtime?.container.replaceChildren();
}

function registerChartDirective(SpruceX: SpruceXLike) {
  SpruceX.directive?.("chart", (el, ctx) => {
    if (!(el instanceof HTMLElement)) return;
    const dataExpr = ctx.expression.trim();
    if (!dataExpr) return;

    const attrs = {
      typeExpr: el.getAttribute("sx-chart-type") ?? undefined,
      optionsExpr: el.getAttribute("sx-chart-options") ?? undefined,
      configExpr: el.getAttribute("sx-chart-config") ?? undefined,
    };

    let instance: ReturnType<typeof createChart> | undefined;
    let currentData: NonNullable<ChartOptions["data"]> = [];
    let configSnapshot: ChartConfiguration | undefined;

    const onChange = (event: Event) => {
      if (event.target !== el || !attrs.configExpr) return;
      const { config } = (event as CustomEvent<ChartConfigChangeEvent>).detail;
      configSnapshot = cloneConfig(config);
      ctx.component.assignStateValue(attrs.configExpr, config);
    };
    el.addEventListener("sx-chart:configchange", onChange);

    // Track data independently so config edits do not re-traverse large datasets
    // and data updates do not re-diff configuration or emit configchange events.
    ctx.effect(() => {
      const evaluated = ctx.evaluateOrLiteral(dataExpr);
      trackReactiveData(evaluated, SpruceX.toRaw);
      const nextData = normalizeData(unwrapRaw(evaluated, SpruceX.toRaw));
      currentData = nextData;
      if (instance) {
        instance.setData(nextData);
      }
    });

    // Track chart type/options/config independently so unrelated state changes
    // in the same component never touch this chart.
    ctx.effect(() => {
      const nextConfig = evaluateChartConfiguration(
        (expr) => ctx.evaluateOrLiteral(expr),
        attrs,
      );
      if (!instance) {
        configSnapshot = cloneConfig(nextConfig);
        instance = createChart(el, {
          ...nextConfig,
          data: currentData,
        });
        return;
      }
      if (sameConfig(configSnapshot, nextConfig)) {
        return;
      }
      configSnapshot = cloneConfig(nextConfig);
      if (attrs.configExpr) {
        instance.setConfig(nextConfig);
        // setConfig emits sx-chart:configchange synchronously, which replaces
        // the bound config object via assignStateValue while this effect is
        // active. Re-track the newly assigned proxy so subsequent nested edits
        // (e.g. sx-model="config.series[0].xKey") trigger this effect.
        trackReactiveData(ctx.evaluateOrLiteral(attrs.configExpr), SpruceX.toRaw);
      } else {
        instance.update({ ...nextConfig, data: currentData });
      }
    });

    ctx.cleanup(() => {
      el.removeEventListener("sx-chart:configchange", onChange);
      instance?.destroy();
      instance = undefined;
      const runtime = getChartRuntime(el);
      runtime?.container.replaceChildren();
    });
  });
}

function registerChartIntegration(SpruceX: SpruceXLike) {
  SpruceX.integration("chart", {
    preserveOnSwap: true,
    setup(component) {
      if (!bindingsByComponent.has(component)) {
        bindingsByComponent.set(component, []);
      }
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
          binding.configSnapshot = cloneConfig(config);
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
          destroyBinding(binding);
          return false;
        },
      );
      bindingsByComponent.set(component, bindings);
      bindings.forEach((binding) => {
        const evaluatedData = component.evaluateExpressionOrLiteral(
          binding.dataExpr,
        );
        const rawData = normalizeData(unwrapRaw(evaluatedData, SpruceX.toRaw));
        const nextConfig = evaluateChartConfiguration(
          (expr) => component.evaluateExpressionOrLiteral(expr),
          binding,
        );

        const isProxiedData =
          typeof SpruceX.toRaw === "function" &&
          evaluatedData !== null &&
          typeof evaluatedData === "object" &&
          SpruceX.toRaw(evaluatedData) !== evaluatedData;

        const configChanged = !sameConfig(binding.configSnapshot, nextConfig);
        const dataChanged = !binding.instance
          ? true
          : isProxiedData || typeof SpruceX.toRaw !== "function"
            ? !sameConfig(binding.dataSnapshot, rawData)
            : binding.rawDataRef !== rawData;

        if (!configChanged && !dataChanged) return;

        binding.configSnapshot = cloneConfig(nextConfig);
        binding.rawDataRef = rawData;
        binding.dataSnapshot =
          isProxiedData || typeof SpruceX.toRaw !== "function"
            ? cloneConfig(rawData)
            : undefined;

        if (!binding.instance) {
          binding.instance = createChart(binding.el, {
            ...nextConfig,
            data: rawData,
          });
          return;
        }
        if (binding.configExpr) {
          if (dataChanged) {
            binding.instance.setData(rawData);
          }
          if (configChanged) {
            binding.instance.setConfig(nextConfig);
          }
        } else if (configChanged) {
          binding.instance.update({ ...nextConfig, data: rawData });
        } else {
          binding.instance.setData(rawData);
        }
      });
    },
    unmount(component, el) {
      const bindings = bindingsByComponent.get(component);
      if (!bindings) return;
      const remaining = bindings.filter((binding) => {
        if (binding.el !== el) return true;
        destroyBinding(binding);
        return false;
      });
      bindingsByComponent.set(component, remaining);
    },
    teardown(component) {
      const bindings = bindingsByComponent.get(component) ?? [];
      bindings.forEach(destroyBinding);
      bindingsByComponent.delete(component);
    },
  });
}

export function registerSpruceXCharts(SpruceX: SpruceXLike) {
  if (typeof SpruceX.directive === "function") {
    registerChartDirective(SpruceX);
    return;
  }
  registerChartIntegration(SpruceX);
}

export function autoRegisterSpruceXCharts() {
  if (typeof window !== "undefined") {
    const globalSpruceX = (window as { SpruceX?: SpruceXLike }).SpruceX;
    if (globalSpruceX) {
      registerSpruceXCharts(globalSpruceX);
    }
  }
}
