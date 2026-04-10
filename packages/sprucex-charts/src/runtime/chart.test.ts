// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { builtinMaps } from "../maps";
import { createChart, getChartRuntime } from "./chart";

describe("createChart", () => {
  Object.defineProperty(Element.prototype, "animate", {
    value: () => ({ cancel() {}, finished: Promise.resolve(), play() {} }),
    configurable: true,
  });

  it("renders an SVG line chart and updates it", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      title: "Test chart",
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "value" },
      ],
      axes: { x: { scaleType: "category" }, y: { grid: true } },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(
      container.querySelectorAll("[data-sx-chart-anim]").length,
    ).toBeGreaterThan(0);

    chart.update({
      type: "pie",
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", valueKey: "value" },
      ],
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    chart.destroy();
    expect(container.innerHTML).toBe("");
  });

  it("allows chart render animations to be disabled", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "bar",
      animate: false,
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "value" },
      ],
      axes: { x: { scaleType: "category" }, y: { grid: true } },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    expect(container.querySelectorAll("[data-sx-chart-anim]").length).toBe(0);
    chart.destroy();
  });

  it("defaults to CSS variable theme values and still respects series-level colors", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "value" },
      ],
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
      ],
    });

    expect(container.querySelector("rect")?.getAttribute("fill")).toBe(
      "var(--background)",
    );

    chart.update({
      series: [
        {
          id: "revenue",
          name: "Revenue",
          xKey: "month",
          yKey: "value",
          color: "#abcdef",
        },
      ],
    });

    expect(container.querySelector("rect")?.getAttribute("fill")).toBe(
      "var(--background)",
    );
    expect(container.querySelector("path")?.getAttribute("stroke")).toBe(
      "#abcdef",
    );

    chart.destroy();
  });

  it("grows hovered pie-center and polar segments", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const pieChart = createChart(container, {
      type: "pie",
      animate: false,
      donutCenter: {
        enabled: true,
      },
      series: [{ id: "mix", name: "Mix", xKey: "label", valueKey: "value" }],
      data: [
        { label: "Alpha", value: 12 },
        { label: "Beta", value: 18 },
        { label: "Gamma", value: 15 },
      ],
    });

    const pieBefore = container.querySelector("path")?.getAttribute("d");
    const pieRuntime = getChartRuntime(container)!;
    pieRuntime.state.hoveredKey = "Alpha";
    pieChart.update({});
    const pieAfter = container.querySelector("path")?.getAttribute("d");
    expect(pieAfter).not.toBe(pieBefore);

    pieRuntime.state.hoveredKey = undefined;
    pieChart.update({
      type: "polar",
      animate: false,
      series: [{ id: "mix", name: "Mix", xKey: "label", valueKey: "value" }],
      data: [
        { label: "Alpha", value: 20 },
        { label: "Beta", value: 28 },
        { label: "Gamma", value: 24 },
      ],
    });

    const polarBefore = container.querySelector("path")?.getAttribute("d");
    pieRuntime.state.hoveredKey = "Alpha";
    pieChart.update({});
    const polarAfter = container.querySelector("path")?.getAttribute("d");
    expect(polarAfter).not.toBe(polarBefore);

    pieChart.destroy();
  });

  it("renders pie legend items per slice instead of per series", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "pie",
      animate: false,
      donutCenter: {
        enabled: true,
      },
      series: [{ id: "mix", name: "Mix", xKey: "label", valueKey: "value" }],
      data: [
        { label: "Alpha", value: 12 },
        { label: "Beta", value: 18 },
        { label: "Gamma", value: 15 },
      ],
    });

    const legendItems = Array.from(
      container.querySelectorAll(".sx-legend-item text"),
    ).map((node) => node.textContent);
    expect(legendItems).toEqual(["Alpha", "Beta", "Gamma"]);

    chart.destroy();
  });

  it("keeps tooltips hidden when tooltip.enabled is false", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "pie",
      animate: false,
      tooltip: { enabled: false },
      donutCenter: {
        enabled: true,
      },
      series: [{ id: "mix", name: "Mix", xKey: "label", valueKey: "value" }],
      data: [
        { label: "Alpha", value: 12 },
        { label: "Beta", value: 18 },
        { label: "Gamma", value: 15 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const hoverPoint = runtime.context!.interactivePoints[0];
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperty(pointerMove, "clientX", { value: hoverPoint.x });
    Object.defineProperty(pointerMove, "clientY", { value: hoverPoint.y });
    container.dispatchEvent(pointerMove);

    expect(runtime.state.hoveredKey).toBe("Alpha");
    expect(runtime.tooltip.classList.contains("is-visible")).toBe(false);
    expect(runtime.tooltip.innerHTML).toBe("");

    chart.destroy();
  });

  it("hides configured axes when axis.enabled is false", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 320,
        height: 140,
        top: 0,
        left: 0,
        right: 320,
        bottom: 140,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "area",
      animate: false,
      legend: { enabled: false },
      series: [
        {
          id: "revenue",
          name: "Revenue",
          xKey: "month",
          yKey: "value",
          markerSize: 0,
        },
      ],
      axes: {
        x: { scaleType: "category", enabled: false },
        y: { enabled: false, grid: false },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    expect(container.querySelector(".sx-axis-x line")).toBeNull();
    expect(container.querySelector(".sx-axis-x text")).toBeNull();
    expect(container.querySelector(".sx-axis-y line")).toBeNull();
    expect(container.querySelector(".sx-axis-y text")).toBeNull();
    expect(container.querySelector(".sx-grid line")).toBeNull();

    chart.destroy();
  });

  it("keeps hover state disabled when interactions.hover is false", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "area",
      animate: false,
      interactions: { hover: false },
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "value" },
      ],
      axes: { x: { scaleType: "category" }, y: { grid: true } },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const hoverPoint = runtime.context!.interactivePoints[0];
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperty(pointerMove, "clientX", { value: hoverPoint.x });
    Object.defineProperty(pointerMove, "clientY", { value: hoverPoint.y });
    container.dispatchEvent(pointerMove);

    expect(runtime.state.hoveredKey).toBeUndefined();
    expect(runtime.tooltip.classList.contains("is-visible")).toBe(false);
    expect(container.querySelector(".sx-crosshair line")).toBeNull();

    chart.destroy();
  });

  it("renders a visible secondary y2 axis for multi-axis charts", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "multi-axis",
      animate: false,
      series: [
        {
          id: "revenue",
          name: "Revenue",
          type: "bar",
          xKey: "month",
          yKey: "revenue",
        },
        {
          id: "pipeline",
          name: "Pipeline",
          type: "line",
          xKey: "month",
          yKey: "pipeline",
          axis: "y2",
        },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
        y2: { grid: false },
      },
      data: [
        { month: "Jan", revenue: 38, pipeline: 280 },
        { month: "Feb", revenue: 54, pipeline: 400 },
        { month: "Mar", revenue: 70, pipeline: 380 },
      ],
    });

    const secondaryAxis = container.querySelector(".sx-axis-y2");
    expect(secondaryAxis).not.toBeNull();
    expect(secondaryAxis?.querySelector("line")).not.toBeNull();
    expect(secondaryAxis?.querySelectorAll("text").length).toBeGreaterThan(0);

    chart.destroy();
  });

  it("hovers the correct polar segment instead of always selecting the first one", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "polar",
      animate: false,
      series: [{ id: "mix", name: "Mix", xKey: "label", valueKey: "value" }],
      data: [
        { label: "Alpha", value: 20 },
        { label: "Beta", value: 28 },
        { label: "Gamma", value: 24 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const hoverPoint = runtime.context!.interactivePoints[1];
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperty(pointerMove, "clientX", { value: hoverPoint.x });
    Object.defineProperty(pointerMove, "clientY", { value: hoverPoint.y });
    container.dispatchEvent(pointerMove);

    expect(runtime.state.hoveredKey).toBe("Beta");

    chart.destroy();
  });

  it("renders horizontal bars with measurable widths from the value baseline", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "horizontal-bar",
      animate: false,
      series: [
        { id: "pipeline", name: "Pipeline", xKey: "region", yKey: "value" },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: false },
      },
      data: [
        { region: "Nordics", value: 28 },
        { region: "DACH", value: 38 },
        { region: "US", value: 70 },
      ],
    });

    const bars = Array.from(container.querySelectorAll("rect"))
      .map((node) => Number(node.getAttribute("width") ?? 0))
      .filter((width) => width > 0 && width < 820);

    expect(bars.length).toBeGreaterThanOrEqual(3);
    expect(Math.max(...bars)).toBeGreaterThan(Math.min(...bars));
    expect(container.textContent).toContain("Nordics");
    expect(container.textContent).toContain("US");

    chart.destroy();
  });

  it("clips stacked bars to a single rounded outer shape per stack", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "stacked-bar",
      animate: false,
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "revenue" },
        { id: "pipeline", name: "Pipeline", xKey: "month", yKey: "pipeline" },
        { id: "margin", name: "Margin", xKey: "month", yKey: "margin" },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", revenue: 38, pipeline: 28, margin: 17 },
        { month: "Feb", revenue: 54, pipeline: 40, margin: 22 },
        { month: "Mar", revenue: 70, pipeline: 38, margin: 26 },
      ],
    });

    expect(container.querySelectorAll("clipPath[id*='stack']").length).toBe(3);
    expect(container.querySelectorAll("rect[clip-path]").length).toBe(9);

    chart.destroy();
  });

  it("renders category line charts from the left edge to the right edge", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      animate: false,
      series: [{ id: "revenue", name: "Revenue", xKey: "month", yKey: "value" }],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    const circles = Array.from(container.querySelectorAll(".sx-plot circle"));
    const firstX = Number(circles[0]?.getAttribute("cx"));
    const lastX = Number(circles[circles.length - 1]?.getAttribute("cx"));

    expect(firstX).toBe(runtime.context!.cartesian!.plotX);
    expect(lastX).toBe(
      runtime.context!.cartesian!.plotX + runtime.context!.cartesian!.plotWidth,
    );

    chart.destroy();
  });

  it("reserves enough left space for larger y-axis labels", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      animate: false,
      series: [{ id: "revenue", name: "Revenue", xKey: "month", yKey: "value" }],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", value: 12500 },
        { month: "Feb", value: 18400 },
        { month: "Mar", value: 23100 },
      ],
    });

    expect(getChartRuntime(container)!.context!.cartesian!.plotX).toBeGreaterThan(70);

    chart.destroy();
  });

  it("snaps category line hover selection even near the bottom edge", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      animate: false,
      series: [{ id: "revenue", name: "Revenue", xKey: "month", yKey: "value" }],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const firstPoint = runtime.context!.interactivePoints[0];
    container.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: firstPoint.x,
        clientY:
          runtime.context!.cartesian!.plotY + runtime.context!.cartesian!.plotHeight - 6,
      }),
    );

    expect(runtime.state.hoveredKey).toBe("Jan");

    chart.destroy();
  });

  it("snaps histogram hover selection across the full bar height", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "histogram",
      animate: false,
      series: [{ id: "distribution", name: "Latency", valueKey: "value" }],
      data: [{ value: 8 }, { value: 11 }, { value: 12 }, { value: 14 }, { value: 18 }],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const firstBucket = runtime.context!.interactivePoints[0];
    container.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: firstBucket.x,
        clientY:
          runtime.context!.cartesian!.plotY + runtime.context!.cartesian!.plotHeight - 4,
      }),
    );

    expect(runtime.state.hoveredKey).toBe(firstBucket.key);

    chart.destroy();
  });

  it("renders a horizontal crosshair for horizontal-bar hover states", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "horizontal-bar",
      animate: false,
      series: [
        { id: "pipeline", name: "Pipeline", xKey: "region", yKey: "value" },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { region: "Nordics", value: 28 },
        { region: "DACH", value: 38 },
        { region: "US", value: 70 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    Object.defineProperty(runtime.svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    const targetPoint = runtime.context!.interactivePoints.find(
      (point) => point.key === "US",
    )!;
    container.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: runtime.context!.cartesian!.plotX + runtime.context!.cartesian!.plotWidth - 10,
        clientY: targetPoint.y,
      }),
    );

    const crosshair = container.querySelector(".sx-crosshair line");
    expect(runtime.state.hoveredKey).toBe("US");
    expect(crosshair?.getAttribute("y1")).toBe(crosshair?.getAttribute("y2"));

    chart.destroy();
  });

  it("applies configured marker shapes for line series", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      animate: false,
      series: [
        {
          id: "revenue",
          name: "Revenue",
          xKey: "month",
          yKey: "value",
          markerShape: "square",
          markerSize: 5,
        },
      ],
      axes: {
        x: { scaleType: "category" },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
      ],
    });

    expect(container.querySelectorAll(".sx-plot rect").length).toBeGreaterThan(0);

    chart.destroy();
  });

  it("applies explicit bar widths and series formatters", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "bar",
      animate: false,
      series: [
        {
          id: "revenue",
          name: "Revenue",
          xKey: "month",
          yKey: "value",
          barWidth: 18,
          labels: true,
          format: (value) => `${value}k`,
        },
      ],
      axes: {
        x: { scaleType: "category" },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
      ],
    });

    const widths = Array.from(container.querySelectorAll(".sx-plot rect[data-sx-chart-key]"))
      .map((node) => Number(node.getAttribute("width") ?? 0))
      .filter((width) => width > 0 && width < 820);

    expect(widths.every((width) => width <= 18)).toBe(true);
    expect(container.textContent).toContain("12k");

    chart.destroy();
  });

  it("renders data labels when series.labels is enabled for cartesian bars", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "bar",
      animate: false,
      series: [
        {
          id: "revenue",
          name: "Revenue",
          xKey: "month",
          yKey: "value",
          labels: true,
        },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
        { month: "Mar", value: 15 },
      ],
    });

    expect(container.querySelectorAll("[data-sx-data-label='true']").length).toBe(3);
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("18");

    chart.destroy();
  });

  it("renders data labels when series.labels is enabled for pie-center charts", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "pie",
      animate: false,
      donutCenter: {
        enabled: true,
      },
      series: [
        { id: "mix", name: "Mix", xKey: "label", valueKey: "value", labels: true },
      ],
      data: [
        { label: "Alpha", value: 12 },
        { label: "Beta", value: 18 },
        { label: "Gamma", value: 15 },
      ],
    });

    expect(container.querySelectorAll("[data-sx-data-label='true']").length).toBeGreaterThanOrEqual(3);
    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("18");

    chart.destroy();
  });

  it("invokes drilldown handlers with the clicked datum", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const drilldown = vi.fn();
    const chart = createChart(container, {
      type: "bar",
      animate: false,
      interactions: { drilldown },
      series: [{ id: "revenue", name: "Revenue", xKey: "month", yKey: "value" }],
      axes: {
        x: { scaleType: "category" },
      },
      data: [
        { month: "Jan", value: 12 },
        { month: "Feb", value: 18 },
      ],
    });

    container
      .querySelector('[data-sx-chart-key="Jan"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(drilldown).toHaveBeenCalledWith({ month: "Jan", value: 12 });

    chart.destroy();
  });

  it("renders stacked area charts edge to edge on category axes", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "stacked-area",
      animate: false,
      series: [
        { id: "revenue", name: "Revenue", xKey: "month", yKey: "revenue" },
        { id: "pipeline", name: "Pipeline", xKey: "month", yKey: "pipeline" },
      ],
      axes: {
        x: { scaleType: "category" },
        y: { grid: true },
      },
      data: [
        { month: "Jan", revenue: 38, pipeline: 28 },
        { month: "Feb", revenue: 54, pipeline: 40 },
        { month: "Mar", revenue: 70, pipeline: 38 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    const firstPath = container.querySelector("path");
    const plotX = runtime.context!.cartesian!.plotX;
    const plotRight = plotX + runtime.context!.cartesian!.plotWidth;

    expect(firstPath?.getAttribute("d")).toContain(`M ${plotX} `);
    expect(firstPath?.getAttribute("d")).toContain(`L ${plotRight} `);

    chart.destroy();
  });

  it("renders cartesian trendlines and time events while skipping out-of-range events", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "line",
      animate: false,
      series: [{ id: "revenue", name: "Revenue", xKey: "date", yKey: "value" }],
      axes: { x: { scaleType: "time" }, y: { min: 0, max: 30 } },
      trendlines: [
        { id: "auto-revenue", type: "auto", seriesId: "revenue" },
        { id: "target", type: "target", value: 18, label: "Target" },
      ],
      events: [
        { id: "launch", label: "Launch", date: "2026-01-02" },
        {
          id: "promo",
          label: "Promo",
          startDate: "2026-01-03",
          endDate: "2026-01-04",
        },
        { id: "ignore", label: "Ignore", date: "2026-02-10" },
      ],
      data: [
        { date: "2026-01-01", value: 10 },
        { date: "2026-01-02", value: 14 },
        { date: "2026-01-03", value: 16 },
        { date: "2026-01-04", value: 22 },
      ],
    });

    expect(
      container.querySelector('[data-sx-trendline="auto-revenue"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-sx-trendline="target"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-sx-event="launch"]')).not.toBeNull();
    expect(
      container.querySelector(
        '[data-sx-event="promo"][data-sx-event-kind="range"]',
      ),
    ).not.toBeNull();
    expect(container.querySelector('[data-sx-event="ignore"]')).toBeNull();

    chart.destroy();
  });

  it("renders gauge target trendlines", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "gauge",
      animate: false,
      series: [{ id: "score", name: "Score", valueKey: "value" }],
      axes: { y: { min: 0, max: 100 } },
      trendlines: [{ id: "goal", type: "target", value: 72, label: "Goal" }],
      data: [{ value: 64 }],
    });

    expect(
      container.querySelector('[data-sx-trendline="goal"]'),
    ).not.toBeNull();
    expect(container.querySelector("[data-sx-gauge-needle='true']")).not.toBeNull();
    expect(container.textContent).toContain("Goal");
    expect(container.textContent).toContain("0");
    expect(container.textContent).toContain("100");

    chart.destroy();
  });

  it("renders gauge tracks as a half circle", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "gauge",
      animate: false,
      series: [{ id: "score", name: "Score", valueKey: "value" }],
      axes: { y: { min: 0, max: 100 } },
      data: [{ value: 64 }],
    });

    const trackPath = container.querySelector("path")?.getAttribute("d") ?? "";
    expect(trackPath).toContain(" 0 0 0 ");
    expect(trackPath).not.toContain(" 0 1 0 ");

    chart.destroy();
  });

  it("scales sankey node heights down when the next stage has less volume", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "sankey",
      animate: false,
      series: [
        {
          id: "flow",
          name: "Flow",
          nodes: [
            { id: "Visitors", value: 5000 },
            { id: "Qualified", value: 2800 },
            { id: "Demo", value: 1480 },
          ],
          links: [
            { source: "Visitors", target: "Qualified", value: 2800 },
            { source: "Qualified", target: "Demo", value: 1480 },
          ],
        },
      ],
      data: [],
    });

    const nodeHeights = Array.from(container.querySelectorAll(".sx-plot rect"))
      .map((node) => Number(node.getAttribute("height") ?? 0))
      .filter((height) => height > 0)
      .slice(0, 3);

    expect(nodeHeights[0]).toBeGreaterThan(nodeHeights[1]);
    expect(nodeHeights[1]).toBeGreaterThan(nodeHeights[2]);

    chart.destroy();
  });

  it("renders a built-in world map source", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "map",
      animate: false,
      series: [
        { id: "countries", name: "Countries", xKey: "id", valueKey: "value" },
      ],
      map: {
        source: "world",
        valueKey: "value",
      },
      data: [
        { id: "752", value: 14 },
        { id: "840", value: 28 },
      ],
    });

    expect(container.querySelectorAll("path").length).toBeGreaterThan(100);
    const firstPath = container.querySelector("path");
    expect(firstPath?.getAttribute("data-sx-chart-key")).toBeTruthy();
    expect(firstPath?.getAttribute("d")).not.toContain("Infinity");
    expect(firstPath?.getAttribute("d")).not.toContain("NaN");
    const russiaPath = container.querySelector('[data-sx-chart-key="643"]');
    const fijiPath = container.querySelector('[data-sx-chart-key="242"]');
    expect(
      russiaPath?.getAttribute("d")?.match(/\bM\b/g)?.length ?? 0,
    ).toBeGreaterThan(1);
    expect(
      fijiPath?.getAttribute("d")?.match(/\bM\b/g)?.length ?? 0,
    ).toBeGreaterThan(1);
    chart.destroy();
  });

  it("accepts imported topojson objects as custom map sources", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "map",
      animate: false,
      series: [{ id: "states", name: "States", xKey: "id", valueKey: "value" }],
      map: {
        source: builtinMaps["us-states"],
        objectKey: "states",
        valueKey: "value",
      },
      data: [
        { id: "06", value: 18 },
        { id: "48", value: 12 },
      ],
    });

    expect(container.querySelectorAll("path").length).toBeGreaterThan(40);
    chart.destroy();
  });

  it("only highlights map regions when hovering an actual region", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "map",
      animate: false,
      series: [
        { id: "countries", name: "Countries", xKey: "id", valueKey: "value" },
      ],
      map: {
        source: "world",
        projection: "equal-earth",
        valueKey: "value",
      },
      data: [
        { id: "752", value: 14 },
        { id: "840", value: 28 },
      ],
    });

    const runtime = getChartRuntime(container)!;
    const svg = container.querySelector("svg")!;
    Object.defineProperty(svg, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });

    svg.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 30,
        clientY: 430,
      }),
    );

    expect(runtime.state.hoveredKey).toBeUndefined();
    expect(runtime.tooltip.classList.contains("is-visible")).toBe(false);

    chart.destroy();
  });

  it("uses only the first chart color for map regions", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "map",
      animate: false,
      series: [
        {
          id: "countries",
          name: "Countries",
          xKey: "id",
          valueKey: "value",
          color: "#2667ff",
        },
      ],
      map: {
        source: "world",
        projection: "equal-earth",
        valueKey: "value",
      },
      data: [
        { id: "752", value: 10 },
        { id: "840", value: 30 },
      ],
    });

    const lowValueRegion = container.querySelector('[data-sx-chart-key="752"]');
    const highValueRegion = container.querySelector(
      '[data-sx-chart-key="840"]',
    );

    expect(lowValueRegion?.getAttribute("fill")).toBe("#2667ff");
    expect(highValueRegion?.getAttribute("fill")).toBe("#2667ff");
    expect(Number(lowValueRegion?.getAttribute("fill-opacity"))).toBeLessThan(
      Number(highValueRegion?.getAttribute("fill-opacity")),
    );

    chart.destroy();
  });

  it("renders map point overlays with configurable radius", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 820,
        height: 460,
        top: 0,
        left: 0,
        right: 820,
        bottom: 460,
      }),
    });
    document.body.appendChild(container);

    const chart = createChart(container, {
      type: "map",
      animate: false,
      series: [
        { id: "countries", name: "Countries", xKey: "id", valueKey: "value" },
      ],
      map: {
        source: "world",
        projection: "equal-earth",
        valueKey: "value",
        pointKey: "marker",
        pointRadius: 9,
      },
      data: [
        { id: "752", marker: "752", value: 10 },
        { id: "840", marker: "840", value: 30 },
      ],
    });

    const overlays = Array.from(
      container.querySelectorAll('[data-sx-chart-key^="point:"]'),
    );
    expect(overlays.length).toBe(2);
    expect(overlays[0]?.getAttribute("r")).toBe("9");

    chart.destroy();
  });
});
