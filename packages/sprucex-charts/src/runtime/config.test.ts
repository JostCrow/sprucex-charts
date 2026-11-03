// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { createChart, getChartRuntime } from "./chart";
import type { ChartConfiguration } from "../types";

function setup() {
  const el = document.createElement("div");
  document.body.append(el);
  const config: ChartConfiguration = {
    type: "line",
    animate: false,
    series: [{ id: "sales", xKey: "date", yKey: "revenue" }],
    axes: {
      x: {
        scaleType: "time",
        format: { type: "date", options: { month: "long", timeZone: "UTC" } },
      },
      y: { format: { type: "currency", currency: "USD" } },
    },
  };
  const data = [
    { date: "2026-01-01", revenue: 12, profit: 4 },
    { date: "2026-02-01", revenue: 24, profit: 8 },
  ];
  return { el, data, config, chart: createChart(el, { ...config, data }) };
}

describe("chart configuration", () => {
  it("round trips configuration independently of data and replaces removed options", () => {
    const { el, chart, config, data } = setup();
    expect(el.textContent).toContain("January");
    expect(el.textContent).toContain("$");
    expect(chart.getConfig()).toEqual(config);
    const saved = JSON.parse(JSON.stringify(chart.getConfig()));
    saved.series[0].yKey = "profit";
    saved.axes.x.format = { type: "text" };
    saved.axes.x.scaleType = "category";
    chart.setConfig(saved);
    expect(getChartRuntime(el)?.config.data).toBe(data);
    expect(getChartRuntime(el)?.context?.interactivePoints[0].value).toContain(
      "4",
    );
    expect(el.textContent).toContain("2026-01-01");
    chart.setConfig({ type: "bar", series: saved.series, animate: false });
    expect(chart.getConfig().axes).toBeUndefined();
    chart.destroy();
  });

  it("isolates input, snapshots, and event payloads from runtime configuration", () => {
    const { el, chart, config } = setup();
    config.series![0].yKey = "profit";
    const snapshot = chart.getConfig();
    snapshot.series![0].yKey = "profit";
    expect(chart.getConfig().series![0].yKey).toBe("revenue");
    el.addEventListener("sx-chart:configchange", (event) => {
      (event as CustomEvent).detail.config.series[0].yKey = "profit";
    });
    chart.update({ title: "Updated" });
    expect(chart.getConfig().series![0].yKey).toBe("revenue");
    chart.destroy();
  });

  it("emits only configuration changes, and persists legend visibility", () => {
    const { el, chart } = setup();
    const onChange = vi.fn();
    el.addEventListener("sx-chart:configchange", onChange);
    chart.update({ title: "New title" });
    chart.update({ title: "New title" });
    chart.setData([{ date: "2026-01-01", revenue: 50 }]);
    chart.resize();
    expect(onChange).toHaveBeenCalledTimes(1);
    el.querySelector(".sx-legend-item")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(chart.getConfig().hiddenSeries).toEqual(["sales"]);
    const saved = chart.getConfig();
    chart.setConfig({ ...saved, hiddenSeries: [] });
    chart.setConfig(saved);
    expect(getChartRuntime(el)?.state.hiddenSeries.has("sales")).toBe(true);
    chart.destroy();
  });

  it("formats numeric time ticks as dates and supports serializable percent formats", () => {
    const { el, chart } = setup();
    chart.update({
      axes: {
        x: { scaleType: "time", tickValues: [Date.UTC(2026, 0, 1)] },
        y: { tickValues: [0.5], format: { type: "percent" } },
      },
      timeZone: "UTC",
    });
    expect(el.textContent).toContain("Jan 1, 2026");
    expect(el.textContent).toContain("50%");
    chart.destroy();
  });
});
