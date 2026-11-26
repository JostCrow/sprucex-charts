# Changelog

All notable changes to this project will be documented in this file.

## [0.4.0] - 2026-11-26

### Added

- Registered `sx-chart` as an element-scoped custom directive via `SpruceX.directive("chart", ...)` on SpruceX 1.2+, with independent fine-grained `effect()` tracking for data and configuration so unrelated component state no longer re-renders charts and untouched charts survive partial HTML swaps.
- Added `SpruceX.toRaw()` unwrapping and proxy-aware data tracking so large datasets wrapped with `SpruceX.markRaw()`, `SpruceX.shallow()`, or loaded with `sx-json-into.shallow` render without deep Proxy overhead while still updating on changes.
- Extended `SpruceXLike` TypeScript definitions for SpruceX 1.2 directives, `toRaw`, `markRaw`, `shallow`, and integration `preserveOnSwap`/`unmount` hooks.
- Added `preserveOnSwap: true` and element-level `unmount` support to the `SpruceX.integration("chart", ...)` fallback for older SpruceX runtimes.
- Upgraded the docs site to SpruceX 1.2.0, including automatic vendoring of `sprucex.js`, a persisted cross-tab `theme` store, `sx-boost` sidebar prefetching, `$dispatch` event handlers, and SpruceX-driven settings search (`sx-model`, `sx-effect`, `sx-show`, and `.esc` clearing).

### Fixed

- Removed the conflicting global `Window.SpruceX` declaration in `sprucex-charts` so strict TypeScript projects using both `sprucex` 1.2+ and `sprucex-charts` compile without declaration modifier conflicts.

## [0.3.0] - 2026-11-09

### Added

- Added shared `fieldFormats` and explicit `fraction` or `whole-percent` percentage encoding for consistent labels, tooltips, axes, and formatted exports.
- Added `missingValues: "gap"` for line and area series, including combo and multi-axis charts; the default remains `"connect"`.
- Added opt-in measured label density and axis label truncation, plus compact legends with bounded label widths and full-text titles.
- Added JSON exports and a `values: "raw" | "formatted"` option for data exports; raw values remain the default.
- Added typed, bubbling `sx-chart:selection`, `sx-chart:range`, and `sx-chart:reset` events for dashboard integrations without changing persisted configuration.
- Added a BI integration guide covering configuration persistence, missing observations, formatting, exports, compact layouts, and interaction contracts.

### Fixed

- Treat null, undefined, empty strings, and non-finite numeric observations as missing rather than zero across chart rendering, numeric domains, labels, and tooltips. Genuine zero values remain visible.
- Escape CSV quotes correctly and export missing cells as empty values.

## [0.2.0] - 2026-11-03

### Added

- Added `sx-chart-config` for two-way SpruceX configuration binding, including chart type, field mappings, and display rules.
- Added detached `getConfig()` snapshots, replacement via `setConfig()`, and bubbling `sx-chart:configchange` events for persistence.
- Added JSON-friendly text, date, number, percent, and currency formats for axes and series.
- Added persistable legend visibility via `hiddenSeries` and an interactive configuration example in the documentation.

### Fixed

- Format numeric time-axis ticks as dates and clean up chart sync groups when configuration changes.
- Align the docs workspace dependency and lint command with the published `sprucex-charts` package name.

### Previously unreleased


- Added a compact spark-style area chart example to the area docs page.
- Added `axes.x.enabled`, `axes.y.enabled`, and `axes.y2.enabled` chart options to hide rendered axes when needed.
- Added `interactions.hover` to disable hover state, tooltip behavior, and crosshair rendering for minimal chart presentations.
- Documented the new axis visibility and hover options in the docs reference.
