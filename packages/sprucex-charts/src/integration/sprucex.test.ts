// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import SpruceX from "sprucex";
import { getChartInstance, getChartRuntime } from "../runtime/chart";
import { registerSpruceXCharts } from "./sprucex";
import type { SpruceXComponentLike, SpruceXLike } from "../types";

function createComponent(state: Record<string, unknown>): SpruceXComponentLike {
  const root = document.createElement("div");
  return {
    root,
    state,
    evaluateExpressionOrLiteral(raw: string) {
      return state[raw];
    },
    assignStateValue() {},
  };
}

function mockElementRect(el: Element, width = 820, height = 460) {
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
    }),
    configurable: true,
  });
}

describe("registerSpruceXCharts", () => {
  Object.defineProperty(Element.prototype, "animate", {
    value: () => ({ cancel() {}, finished: Promise.resolve(), play() {} }),
    configurable: true,
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses sx-chart-type as the only chart family selector (legacy integration fallback)", () => {
    let integration: Parameters<SpruceXLike["integration"]>[1] | undefined;
    const legacySpruceX: SpruceXLike = {
      integration(_name, nextIntegration) {
        integration = nextIntegration;
      },
    };

    registerSpruceXCharts(legacySpruceX);
    expect(integration?.preserveOnSwap).toBe(true);
    expect(typeof integration?.unmount).toBe("function");

    const component = createComponent({
      chartData: [
        { label: "Jan", value: 12 },
        { label: "Feb", value: 18 },
        { label: "Mar", value: 15 },
      ],
      chartType: "bar",
      chartOptions: {
        type: "pie",
        title: "SpruceX only",
        axes: { x: { scaleType: "category" }, y: { grid: true } },
      },
    });

    mockElementRect(component.root);

    component.root.setAttribute("sx-chart", "chartData");
    component.root.setAttribute("sx-chart-type", "chartType");
    component.root.setAttribute("sx-chart-options", "chartOptions");
    document.body.appendChild(component.root);

    integration?.setup?.(component);
    integration?.scan?.(component, component.root);
    integration?.update?.(component);

    let runtime = getChartRuntime(component.root);
    expect(runtime?.config.type).toBe("bar");
    expect(component.root.querySelector("svg")).not.toBeNull();

    component.state.chartType = "pie";
    component.state.chartOptions = {
      type: "line",
      title: "SpruceX only",
    };

    integration?.update?.(component);

    runtime = getChartRuntime(component.root);
    expect(runtime?.config.type).toBe("pie");
    expect(component.root.querySelectorAll("path").length).toBeGreaterThan(0);

    integration?.unmount?.(component, component.root);
    expect(component.root.innerHTML).toBe("");
    expect(getChartRuntime(component.root)).toBeUndefined();
  });

  it("binds configuration in both directions and restores it without retaining removed options", () => {
    let integration: Parameters<SpruceXLike["integration"]>[1] | undefined;
    registerSpruceXCharts({
      integration(_name, value) {
        integration = value;
      },
    });
    const component = createComponent({
      rows: [{ month: "Jan", revenue: 12, profit: 4 }],
      config: {
        type: "bar",
        animate: false,
        title: "Saved title",
        series: [{ id: "sales", xKey: "month", yKey: "revenue" }],
      },
    });
    let assignments = 0;
    component.assignStateValue = (key, value) => {
      assignments++;
      component.state[key] = value;
      integration?.update?.(component);
    };
    component.root.setAttribute("sx-chart", "rows");
    component.root.setAttribute("sx-chart-config", "config");
    document.body.append(component.root);
    integration?.setup?.(component);
    integration?.scan?.(component, component.root);
    integration?.update?.(component);
    const runtime = getChartRuntime(component.root)!;
    expect(runtime.config.type).toBe("bar");
    component.root
      .querySelector(".sx-legend-item")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(
      (component.state.config as { hiddenSeries: string[] }).hiddenSeries,
    ).toEqual(["sales"]);
    expect(assignments).toBe(1);
    component.state.config = {
      type: "line",
      animate: false,
      series: [{ id: "sales", xKey: "month", yKey: "profit" }],
    };
    integration?.update?.(component);
    expect(runtime.config.title).toBeUndefined();
    expect(runtime.config.series![0].yKey).toBe("profit");
    expect(runtime.config.data).toBe(component.state.rows);
    expect(runtime.state.hiddenSeries.size).toBe(0);
    expect(assignments).toBe(2);
    integration?.teardown?.(component);
    expect(component.root.innerHTML).toBe("");
  });

  it("registers as a fine-grained SpruceX 1.2 directive, unwraps raw data, and ignores unrelated state changes", async () => {
    registerSpruceXCharts(SpruceX as unknown as SpruceXLike);
    expect(typeof SpruceX.directive("chart")).toBe("function");

    const rawRows = SpruceX.markRaw([
      { month: "Jan", revenue: 12, profit: 4 },
      { month: "Feb", revenue: 24, profit: 9 },
    ]);

    const host = document.createElement("div");
    host.setAttribute("sx-data", "chartDirectiveFixture");
    host.innerHTML = `<div id="chart" sx-chart="rows" sx-chart-config="config"></div>`;
    document.body.appendChild(host);

    const chartEl = host.querySelector<HTMLElement>("#chart")!;
    mockElementRect(chartEl);

    SpruceX.data("chartDirectiveFixture", () => ({
      unrelatedCount: 0,
      rows: rawRows,
      config: {
        type: "bar",
        animate: false,
        series: [{ id: "sales", xKey: "month", yKey: "revenue" }],
      },
    }));

    const comp = SpruceX.mount(host)!;
    expect(comp).not.toBeNull();

    const instance = getChartInstance(chartEl)!;
    const runtime = getChartRuntime(chartEl)!;
    expect(instance).toBeDefined();
    expect(runtime.config.type).toBe("bar");
    expect(runtime.config.data).toBe(rawRows);

    const setDataSpy = vi.spyOn(instance, "setData");
    const setConfigSpy = vi.spyOn(instance, "setConfig");

    // Unrelated state mutations must not trigger chart updates.
    comp.state.unrelatedCount = 42;
    await SpruceX.nextTick();
    expect(setDataSpy).not.toHaveBeenCalled();
    expect(setConfigSpy).not.toHaveBeenCalled();

    // Nested config mutation updates config without touching data.
    (
      comp.state.config as { series: Array<{ yKey: string }> }
    ).series[0].yKey = "profit";
    await SpruceX.nextTick();
    expect(setConfigSpy).toHaveBeenCalledTimes(1);
    expect(setDataSpy).not.toHaveBeenCalled();
    expect(runtime.config.series?.[0].yKey).toBe("profit");

    // A second nested mutation after configchange write-back must still trigger updates.
    (
      comp.state.config as { series: Array<{ xKey: string }> }
    ).series[0].xKey = "period";
    await SpruceX.nextTick();
    expect(setConfigSpy).toHaveBeenCalledTimes(2);
    expect(runtime.config.series?.[0].xKey).toBe("period");

    // Replacing markRaw data updates only data without emitting config changes.
    const nextRows = SpruceX.markRaw([
      { month: "Mar", revenue: 30, profit: 14 },
    ]);
    comp.state.rows = nextRows;
    await SpruceX.nextTick();
    expect(setDataSpy).toHaveBeenCalledTimes(1);
    expect(setConfigSpy).toHaveBeenCalledTimes(2);
    expect(runtime.config.data).toBe(nextRows);

    // Legend toggle writes back to reactive config without triggering a loop.
    chartEl
      .querySelector(".sx-legend-item")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await SpruceX.nextTick();
    expect(
      (comp.state.config as { hiddenSeries?: string[] }).hiddenSeries,
    ).toEqual(["sales"]);
    expect(setConfigSpy).toHaveBeenCalledTimes(2);

    SpruceX.unmount(host);
    expect(getChartRuntime(chartEl)).toBeUndefined();
    expect(chartEl.innerHTML).toBe("");
  });

  it("supports shallow/reactive data mutations and sx-if/sx-for lifecycles in SpruceX 1.2", async () => {
    registerSpruceXCharts(SpruceX as unknown as SpruceXLike);

    const host = document.createElement("div");
    host.setAttribute("sx-data", "chartLifecycleFixture");
    host.innerHTML = `
      <template sx-if="visible">
        <div id="conditional-chart" sx-chart="rows" sx-chart-type="'line'" sx-chart-options="options"></div>
      </template>
      <template sx-for="card in cards" sx-key="card.id">
        <div class="loop-chart" sx-chart="card.rows" sx-chart-type="card.type" sx-chart-options="card.options"></div>
      </template>
    `;
    document.body.appendChild(host);

    const shallowRows = SpruceX.shallow([
      { x: "A", y: 10 },
      { x: "B", y: 20 },
    ]);

    SpruceX.data("chartLifecycleFixture", () => ({
      visible: true,
      rows: shallowRows,
      options: { animate: false },
      cards: [
        {
          id: "c1",
          type: "bar",
          rows: [{ x: "Q1", y: 5 }],
          options: { animate: false },
        },
        {
          id: "c2",
          type: "pie",
          rows: [{ x: "Q2", value: 9 }],
          options: { animate: false },
        },
      ],
    }));

    const comp = SpruceX.mount(host)!;
    const conditionalEl = host.querySelector<HTMLElement>("#conditional-chart")!;
    expect(conditionalEl).not.toBeNull();
    expect(getChartRuntime(conditionalEl)?.config.type).toBe("line");

    const loopEls = host.querySelectorAll<HTMLElement>(".loop-chart");
    expect(loopEls).toHaveLength(2);
    expect(getChartRuntime(loopEls[0])?.config.type).toBe("bar");
    expect(getChartRuntime(loopEls[1])?.config.type).toBe("pie");

    // Mutating shallow array in place updates the chart.
    (comp.state.rows as Array<{ x: string; y: number }>).push({ x: "C", y: 30 });
    await SpruceX.nextTick();
    expect(
      (getChartRuntime(conditionalEl)?.config.data as unknown[]).length,
    ).toBe(3);

    // Hiding sx-if destroys the chart instance cleanly.
    comp.state.visible = false;
    await SpruceX.nextTick();
    expect(host.querySelector("#conditional-chart")).toBeNull();
    expect(getChartRuntime(conditionalEl)).toBeUndefined();

    // Removing a loop card destroys its chart while keeping remaining cards intact.
    const keptInstance = getChartInstance(loopEls[0]);
    const removedEl = loopEls[1];
    (comp.state.cards as Array<unknown>).pop();
    await SpruceX.nextTick();
    expect(host.querySelectorAll(".loop-chart")).toHaveLength(1);
    expect(getChartInstance(loopEls[0])).toBe(keptInstance);
    expect(getChartRuntime(removedEl)).toBeUndefined();

    SpruceX.unmount(host);
  });
});
