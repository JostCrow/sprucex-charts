import { expect, test, type Locator } from "@playwright/test";

test("docs app renders the initial chart", async ({ page }) => {
  await page.goto("/examples/line", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Line", exact: true })).toBeVisible();
  await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
});

test("sidebar navigation loads a real chart example page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("summary", { hasText: "Examples" }).click();
  await page.getByRole("link", { name: "Bar", exact: true }).click();
  await expect(page).toHaveURL(/\/examples\/bar$/);
  await expect(page.getByRole("heading", { name: "Bar", exact: true })).toBeVisible();
  await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
});

test("bar examples render bucketed daily bars for dense and sparse series", async ({ page }) => {
  await page.goto("/examples/bar", { waitUntil: "domcontentloaded" });

  const charts = page.locator("svg.sx-chart-svg");
  await expect(charts).toHaveCount(2);

  const denseBars = charts.nth(0).locator(".sx-plot rect[data-sx-chart-key]");
  const sparseBars = charts.nth(1).locator(".sx-plot rect[data-sx-chart-key]");
  await expect(denseBars).toHaveCount(58);
  await expect(sparseBars).toHaveCount(6);

  const sparseYAxisLabels = await charts
    .nth(1)
    .locator(".sx-axis-y text")
    .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim() ?? ""));

  expect(sparseYAxisLabels).toEqual(["0", "1", "2"]);
});

test("legend toggling keeps the legend entry and marks it hidden", async ({ page }) => {
  await page.goto("/examples/combo", { waitUntil: "domcontentloaded" });
  const legendItems = page.locator("svg .sx-legend-item");
  await expect(legendItems).toHaveCount(2);
  await legendItems.first().dispatchEvent("click");
  await expect(page.locator("svg .sx-legend-item")).toHaveCount(2);
  await expect(page.locator("svg .sx-legend-item.is-hidden").first()).toBeVisible();
});

test("tooltip only appears when hovering the plot area", async ({ page }) => {
  await page.goto("/examples/combo", { waitUntil: "domcontentloaded" });

  const tooltip = page.locator(".sx-chart-tooltip").first();
  const plotTarget = page.locator("svg .sx-plot [data-sx-chart-key]").first();
  const title = page.locator("svg text").filter({ hasText: "Bookings vs Margin" }).first();
  const legendItem = page.locator("svg .sx-legend-item").first();

  const hoverCenter = async (locator: Locator) => {
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error("Expected locator to have a bounding box");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  };

  await hoverCenter(plotTarget);
  await expect(tooltip).toHaveClass(/is-visible/);

  await hoverCenter(title);
  await expect(tooltip).not.toHaveClass(/is-visible/);

  await hoverCenter(plotTarget);
  await expect(tooltip).toHaveClass(/is-visible/);

  await hoverCenter(legendItem);
  await expect(tooltip).not.toHaveClass(/is-visible/);
});

test("new chart-type routes render example charts", async ({ page }) => {
  const routes = [
    { href: "/examples/horizontal-bar", heading: "Horizontal Bar" },
    { href: "/examples/stacked-bar", heading: "Stacked Bar" },
    { href: "/examples/stacked-area", heading: "Stacked Area" },
    { href: "/examples/histogram", heading: "Histogram" },
    { href: "/examples/box-plot", heading: "Box Plot" },
    { href: "/examples/candlestick", heading: "Candlestick" },
    { href: "/examples/ohlc", heading: "OHLC" },
    { href: "/examples/map", heading: "Map" },
  ];

  for (const route of routes) {
    await page.goto(route.href, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible();
    await expect(page.locator("svg.sx-chart-svg").first()).toBeVisible();
  }
});

test("mobile docs sidebar can be opened and closed", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/documentation", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator("#docs-sidebar");
  const openButton = page.getByRole("button", { name: "Toggle navigation" });
  const closeButton = page.getByRole("button", { name: "Close navigation" });

  await expect(openButton).toBeVisible();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");

  await openButton.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");

  await closeButton.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
});

test("mobile sidebar toggle still works after SpruceX page navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/documentation", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator("#docs-sidebar");
  const openButton = page.getByRole("button", { name: "Toggle navigation" });
  const closeButton = page.getByRole("button", { name: "Close navigation" });

  await openButton.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");

  await page.locator("#docs-sidebar summary", { hasText: "Examples" }).click();
  await page.getByRole("link", { name: "Bar", exact: true }).click();
  await expect(page).toHaveURL(/\/examples\/bar$/);

  await openButton.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "false");

  await closeButton.click();
  await expect(sidebar).toHaveAttribute("aria-hidden", "true");
});
