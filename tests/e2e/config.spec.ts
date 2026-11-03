import { expect, test } from "@playwright/test";

test("config bindings update field mapping, formatting, and saved legend visibility", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/documentation", { waitUntil: "domcontentloaded" });
  const demo = page
    .locator("section")
    .filter({
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
