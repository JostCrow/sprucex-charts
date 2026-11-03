// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getChartRuntime } from "../runtime/chart";
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

describe("registerSpruceXCharts", () => {
  Object.defineProperty(Element.prototype, "animate", {
    value: () => ({ cancel() {}, finished: Promise.resolve(), play() {} }),
    configurable: true,
  });

  it("uses sx-chart-type as the only chart family selector", () => {
    let integration: Parameters<SpruceXLike["integration"]>[1] | undefined;
    const SpruceX: SpruceXLike = {
      integration(_name, nextIntegration) {
        integration = nextIntegration;
      },
    };

    registerSpruceXCharts(SpruceX);

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

    Object.defineProperty(component.root, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

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

    integration?.teardown?.(component);
    expect(component.root.innerHTML).toBe("");
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
});
