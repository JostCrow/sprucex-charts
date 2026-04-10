import { expect, test } from "@playwright/test";

test("docs app renders the initial chart", async ({ page }) => {
  await page.goto("/line", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Line", exact: true })).toBeVisible();
  await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
});

test("sidebar navigation loads a real chart example page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("summary", { hasText: "Examples" }).click();
  await page.getByRole("link", { name: "Bar", exact: true }).click();
  await expect(page).toHaveURL(/\/bar$/);
  await expect(page.getByRole("heading", { name: "Bar", exact: true })).toBeVisible();
  await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
});

test("legend toggling keeps the legend entry and marks it hidden", async ({ page }) => {
  await page.goto("/combo", { waitUntil: "domcontentloaded" });
  const legendItems = page.locator("svg .sx-legend-item");
  await expect(legendItems).toHaveCount(2);
  await legendItems.first().dispatchEvent("click");
  await expect(page.locator("svg .sx-legend-item")).toHaveCount(2);
  await expect(page.locator("svg .sx-legend-item.is-hidden").first()).toBeVisible();
});

test("new chart-type routes render example charts", async ({ page }) => {
  const routes = [
    { href: "/horizontal-bar", heading: "Horizontal Bar" },
    { href: "/stacked-bar", heading: "Stacked Bar" },
    { href: "/stacked-area", heading: "Stacked Area" },
    { href: "/histogram", heading: "Histogram" },
    { href: "/time-series", heading: "Time Series" },
    { href: "/box-plot", heading: "Box Plot" },
    { href: "/candlestick", heading: "Candlestick" },
    { href: "/ohlc", heading: "OHLC" },
    { href: "/volume", heading: "Volume" },
    { href: "/map", heading: "Map" },
  ];

  for (const route of routes) {
    await page.goto(route.href, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible();
    await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
  }
});
