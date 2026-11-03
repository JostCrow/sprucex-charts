# Changelog

All notable changes to this project will be documented in this file.

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
