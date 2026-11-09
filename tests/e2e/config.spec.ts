import { expect, test } from "@playwright/test";

test("config bindings update field mapping, formatting, and saved legend visibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/documentation", { waitUntil: "domcontentloaded" });
  const demo = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Editable chart configuration" }),
  });
  const chart = demo.locator("[sx-chart]");
  const json = demo.locator("code[sx-text]");
  await expect(chart.locator("svg")).toBeVisible();
  await demo.getByLabel("Y field").selectOption("profit");
  await demo.getByLabel("Y display").selectOption("currency");
  await expect(chart.locator(".sx-axis-y")).toContainText("$");
  await expect(json).toContainText('"yKey": "profit"');
  await demo.getByLabel("X field").selectOption("period");
  await demo.getByLabel("X display").selectOption("text");
  await expect(chart.locator(".sx-axis-x")).toContainText("January");
  await chart.locator(".sx-legend-item").dispatchEvent("click");
  await expect(json).toContainText('"hiddenSeries"');
  await demo.getByRole("button", { name: "Save snapshot" }).click();
  await chart.locator(".sx-legend-item").dispatchEvent("click");
  await demo.getByLabel("Y field").selectOption("revenue");
  await demo.getByRole("button", { name: "Restore snapshot" }).click();
  await expect(demo.getByLabel("Y field")).toHaveValue("profit");
  await expect(chart.locator(".sx-legend-item")).toHaveClass(/is-hidden/);
  expect(errors).toEqual([]);
});

test("compact BI layouts use measured labels and paginated legends", async ({
  page,
}) => {
  await page.goto("/documentation", { waitUntil: "domcontentloaded" });
  const host = page.locator("[sx-chart]").first();
  await expect(host.locator("svg")).toBeVisible();
  await host.evaluate((element) => {
    const chart = (window as any).SpruceXCharts.getChartInstance(element);
    chart.setConfig({
      type: "bar",
      width: 360,
      height: 280,
      animate: false,
      axes: {
        x: { scaleType: "category", maxLabelWidth: 60, labelDensity: "auto" },
      },
      legend: { compact: true, maxLabelWidth: 80 },
      labelDensity: "auto",
      series: Array.from({ length: 8 }, (_, i) => ({
        id: String(i),
        name: `Long metric description ${i}`,
        xKey: "x",
        yKey: "y",
        labels: true,
      })),
    });
    chart.setData(
      Array.from({ length: 12 }, (_, i) => ({
        x: `Category with a long name ${i}`,
        y: i + 1,
      })),
    );
  });
  await expect(host.locator(".sx-legend-pagination")).toBeVisible();
  const metrics = await host.evaluate((element) => ({
    widths: Array.from(
      element.querySelectorAll<SVGTextElement>(".sx-legend-item text"),
    ).map((node) => node.getComputedTextLength()),
    hidden: element.querySelectorAll('.sx-axis-x text[visibility="hidden"]')
      .length,
    titles: element.querySelectorAll(".sx-axis-x text title").length,
  }));
  expect(metrics.widths.every((width) => width <= 80)).toBe(true);
  expect(metrics.hidden).toBeGreaterThan(0);
  expect(metrics.titles).toBeGreaterThan(0);
  await page.goto("/bi-integration");
  await expect(
    page.getByRole("heading", { name: "Dashboard interaction contracts" }),
  ).toBeVisible();
});
