// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChart, getChartRuntime } from "./chart";
import type { ChartOptions, ChartType } from "../types";
const charts: ReturnType<typeof createChart>[] = [];
function setup(options: ChartOptions = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const chart = createChart(host, {
    animate: false,
    width: 400,
    height: 280,
    series: [
      { id: "metric", xKey: "x", yKey: "y", valueKey: "y", labels: true },
    ],
    data: [
      { x: "A", y: 5 },
      { x: "B", y: null },
      { x: "C", y: 0 },
      { x: "D" },
      { x: "E", y: 9 },
    ],
    ...options,
  });
  charts.push(chart);
  return { host, chart };
}
afterEach(() => {
  charts.splice(0).forEach((chart) => chart.destroy());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});
describe("BI presentation", () => {
  it.each(["line", "area"] as const)(
    "preserves zero and splits %s paths only on request",
    (type) => {
      const { host, chart } = setup({ type });
      const paths = () =>
        host.querySelectorAll(
          '.sx-plot path[fill="none"][stroke-linecap="round"]',
        );
      expect(paths()).toHaveLength(1);
      chart.update({
        series: [{ xKey: "x", yKey: "y", missingValues: "gap", labels: true }],
      });
      expect(paths()).toHaveLength(3);
      expect(host.querySelectorAll("[data-sx-data-label]")).toHaveLength(3);
      expect(host.querySelector(".sx-plot")?.textContent).toContain("0");
      expect(host.innerHTML).not.toMatch(/NaN|undefined/);
    },
  );
  it.each([
    "bar",
    "horizontal-bar",
    "pie",
    "polar",
    "treemap",
    "funnel",
    "heatmap",
    "box-plot",
    "radar",
    "stacked-bar",
    "stacked-area",
    "histogram",
    "gauge",
  ] as ChartType[])(
    "does not produce invalid geometry for missing %s observations",
    (type) => {
      const { host, chart } = setup({ type });
      expect(host.innerHTML).not.toMatch(/NaN|undefined/);
      chart.setData([{ x: "A", y: null }, { x: "B" }]);
      expect(host.innerHTML).not.toMatch(/NaN|undefined/);
    },
  );
  it("shares whole-percent field formatting across axes, labels and tooltips", () => {
    const { host } = setup({
      type: "bar",
      fieldFormats: { y: { type: "percent", encoding: "whole-percent" } },
      axes: { y: { tickValues: [0, 5, 10] } },
    });
    expect(host.querySelector(".sx-axis-y")?.textContent).toContain("5%");
    expect(host.querySelector(".sx-plot")?.textContent).toContain("5%");
    expect(
      getChartRuntime(host)?.context?.interactivePoints.map(
        (point) => point.value,
      ),
    ).toEqual(["5%", "0%", "9%"]);
  });
  it("formats heatmap values independently from category fields", () => {
    const { host } = setup({
      type: "heatmap",
      series: [{ xKey: "region", yKey: "category", valueKey: "rate" }],
      data: [{ region: "EU", category: "A", rate: 25 }],
      fieldFormats: { rate: { type: "percent", encoding: "whole-percent" } },
    });
    expect(getChartRuntime(host)?.context?.interactivePoints[0].value).toBe(
      "25%",
    );
  });
  it("retains fraction percent default and exports typed raw JSON or formatted CSV", async () => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:test");
    URL.revokeObjectURL = vi.fn();
    const { chart, host } = setup({
      fieldFormats: { y: { type: "percent" } },
      data: [
        { x: 'A,"B"', y: 0.25 },
        { x: "missing", y: null },
      ],
    });
    expect(host.textContent).toContain("25%");
    expect(JSON.parse(String((await chart.export("json")).content))).toEqual([
      { x: 'A,"B"', y: 0.25 },
      { x: "missing", y: null },
    ]);
    expect(
      (await chart.export("csv", { values: "formatted" })).content,
    ).toContain('"A,""B""","25%"');
    expect(chart.getConfig()).not.toHaveProperty("data");
  });
  it("bounds compact legends and retains full labels in titles", () => {
    const { host } = setup({
      legend: { compact: true, maxLabelWidth: 60 },
      series: Array.from({ length: 10 }, (_, index) => ({
        id: String(index),
        name: `Very long metric name ${index}`,
        xKey: "x",
        yKey: "y",
      })),
    });
    expect(host.querySelector(".sx-legend-pagination")).not.toBeNull();
    expect(
      host.querySelector(".sx-legend-item text title")?.textContent,
    ).toContain("Very long metric");
  });
  it("reports zoom, brush and pan ranges only for user interactions", () => {
    const { host, chart } = setup({
      axes: { x: { scaleType: "linear" } },
      data: [
        { x: 1, y: 2 },
        { x: 10, y: 4 },
      ],
      interactions: { zoom: true, brush: true, pan: true },
    });
    const listener = vi.fn();
    host.addEventListener("sx-chart:range", listener);
    vi.spyOn(
      host.querySelector("svg")!,
      "getBoundingClientRect",
    ).mockReturnValue({ left: 0, top: 0, width: 400, height: 280 } as DOMRect);
    host.dispatchEvent(new WheelEvent("wheel", { clientX: 200, deltaY: -1 }));
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      source: "zoom",
      range: chart.getState().zoomX,
    });
    host.dispatchEvent(
      new MouseEvent("pointerdown", { clientX: 120, shiftKey: true }),
    );
    host.dispatchEvent(new MouseEvent("pointermove", { clientX: 240 }));
    window.dispatchEvent(new MouseEvent("pointerup"));
    expect(listener.mock.calls[1][0].detail.source).toBe("brush");
    host.dispatchEvent(new MouseEvent("pointerdown", { clientX: 180 }));
    host.dispatchEvent(new MouseEvent("pointermove", { clientX: 200 }));
    window.dispatchEvent(new MouseEvent("pointerup"));
    expect(listener.mock.calls[2][0].detail.source).toBe("pan");
    chart.setData([{ x: 1, y: 7 }]);
    expect(listener).toHaveBeenCalledTimes(3);
  });
  it("hides measured label collisions only when requested", () => {
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 10,
      right: 90,
      top: 10,
      bottom: 25,
      width: 80,
      height: 15,
    } as DOMRect);
    const { host } = setup({
      axes: { x: { labelDensity: "auto" } },
      labelDensity: "auto",
    });
    expect(
      host.querySelectorAll('.sx-axis-x text[visibility="hidden"]').length,
    ).toBeGreaterThan(0);
    expect(
      host.querySelectorAll('[data-sx-data-label][visibility="hidden"]'),
    ).toHaveLength(2);
  });
  it("emits detached selection and reset events without requiring drilldown", () => {
    const { host } = setup({ type: "bar" });
    const select = vi.fn();
    const reset = vi.fn();
    host.addEventListener("sx-chart:selection", select);
    host.addEventListener("sx-chart:reset", reset);
    host
      .querySelector('[data-sx-chart-key="A"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(select).toHaveBeenCalledOnce();
    expect(select.mock.calls[0][0].detail).toMatchObject({
      seriesId: "metric",
      datum: { x: "A", y: 5 },
    });
    host.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(reset.mock.calls[0][0].detail).toEqual({ source: "double-click" });
  });
});
