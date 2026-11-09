# Changelog

All notable changes to this project will be documented in this file.

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
