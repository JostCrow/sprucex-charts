import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const base = 'http://127.0.0.1:4321';
const checks = [];
const record = (name, ok, detail = '') => checks.push({ name, ok, detail });
const implementedDocOptions = [
  'sx-chart-options.series[].markerShape',
  'sx-chart-options.series[].barWidth',
  'sx-chart-options.series[].labels',
  'sx-chart-options.series[].format',
  'sx-chart-options.axes.x.tickCount',
  'sx-chart-options.axes.x.tickValues',
  'sx-chart-options.axes.x.tickFormat',
  'sx-chart-options.axes.x.labelRotation',
  'sx-chart-options.axes.x.title',
  'sx-chart-options.axes.x.grid',
  'sx-chart-options.axes.y.scaleType',
  'sx-chart-options.axes.y.tickCount',
  'sx-chart-options.axes.y.tickValues',
  'sx-chart-options.axes.y.tickFormat',
  'sx-chart-options.axes.y.labelRotation',
  'sx-chart-options.axes.y.title',
  'sx-chart-options.legend.position',
  'sx-chart-options.legend.layout',
  'sx-chart-options.legend.alignment',
  'sx-chart-options.legend.inside',
  'sx-chart-options.legend.itemShape',
  'sx-chart-options.legend.itemSpacing',
  'sx-chart-options.legend.labelFormatter',
  'sx-chart-options.legend.scroll',
  'sx-chart-options.legend.pagination',
  'sx-chart-options.tooltip.enabled',
  'sx-chart-options.tooltip.formatter',
  'sx-chart-options.interactions.brush',
  'sx-chart-options.interactions.zoom',
  'sx-chart-options.interactions.pan',
  'sx-chart-options.interactions.resetZoom',
  'sx-chart-options.interactions.drilldown',
  'sx-chart-options.map.pointKey',
  'sx-chart-options.map.pointRadius',
];
const removedDocOptions = [
  'sx-chart-options.series[].stack',
  'sx-chart-options.axes.x.position',
  'sx-chart-options.axes.x.tickInterval',
  'sx-chart-options.axes.x.reverse',
  'sx-chart-options.axes.x.domainPadding',
  'sx-chart-options.axes.y.position',
  'sx-chart-options.axes.y.tickInterval',
  'sx-chart-options.axes.y.reverse',
  'sx-chart-options.axes.y.domainPadding',
  'sx-chart-options.tooltip.followCursor',
  'sx-chart-options.tooltip.html',
  'sx-chart-options.tooltip.rowSort',
  'sx-chart-options.interactions.hover',
  'sx-chart-options.interactions.select',
  'sx-chart-options.interactions.highlight',
  'sx-chart-options.interactions.crosshair',
  'sx-chart-options.interactions.touch',
  'sx-chart-options.interactions.responsive',
  'sx-chart-options.annotations[]',
  'sx-chart-options.theme',
  'sx-chart-options.accessibility.description',
  'sx-chart-options.accessibility.keyboard',
  'sx-chart-options.export',
  'sx-chart-options.background',
  'sx-chart-options.map.labelKey',
];
const serializeConfig = (value) => JSON.parse(JSON.stringify(value, (_key, current) => {
  if (typeof current === 'function') {
    return { __fn__: current.toString() };
  }
  return current;
}));

async function goto(path, expectChart = true) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  if (expectChart) {
    await page.waitForSelector('.sx-chart-svg', { timeout: 15000 });
  }
}

async function mountChart(config, name = 'tempChart', width = 820) {
  await page.evaluate(({ config, name, width }) => {
    const reviveFunctions = (value) => {
      if (Array.isArray(value)) {
        return value.map(reviveFunctions);
      }
      if (value && typeof value === 'object') {
        if ('__fn__' in value && typeof value.__fn__ === 'string') {
          return new Function(`return (${value.__fn__})`)();
        }
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, reviveFunctions(entry)]));
      }
      return value;
    };
    const hydratedConfig = reviveFunctions(config);
    let sandbox = document.getElementById('verify-sandbox');
    if (!sandbox) {
      sandbox = document.createElement('div');
      sandbox.id = 'verify-sandbox';
      document.body.appendChild(sandbox);
    }
    sandbox.setAttribute('style', [
      'position:fixed',
      'top:24px',
      'left:24px',
      'z-index:2147483647',
      `width:${width}px`,
      'max-height:calc(100vh - 48px)',
      'overflow:auto',
      'padding:12px',
      'background:var(--background, #ffffff)',
      'box-shadow:0 18px 40px rgba(0,0,0,0.18)',
      'border-radius:16px',
    ].join(';'));
    sandbox.replaceChildren();
    const dataName = `verify_${name}`;
    window.SpruceX.data(dataName, () => ({
      chartData: hydratedConfig.data,
      chartType: hydratedConfig.type,
      chartOptions: hydratedConfig,
    }));
    const root = document.createElement('div');
    root.id = `${name}-root`;
    root.setAttribute('sx-data', dataName);
    root.innerHTML = `
      <div
        id="${name}"
        style="width: 100%;"
        sx-chart="chartData"
        sx-chart-type="chartType"
        sx-chart-options="chartOptions"
      ></div>
    `;
    sandbox.appendChild(root);
    window.SpruceX.init();
    window.__chart = window.SpruceXCharts.getChartInstance(root.querySelector(`#${name}`));
  }, { config: serializeConfig(config), name, width });
  await page.waitForSelector(`#${name} .sx-chart-svg`, { timeout: 15000 });
}

await goto('/documentation/', false);
record('docs-shell-no-main-ts', (await page.locator('script[src*="main.ts"]').count()) === 0);
record(
  'docs-implemented-options',
  (await Promise.all(implementedDocOptions.map((option) => page.locator(`text=${option}`).count()))).every((count) => count === 1),
);
record(
  'docs-removed-options',
  (await Promise.all(removedDocOptions.map((option) => page.locator(`text=${option}`).count()))).every((count) => count === 0),
);
const axisRowText = await page.locator('tr:has-text("sx-chart-options.series[].axis")').textContent();
const paddingRowText = await page.locator('tr:has-text("sx-chart-options.padding")').textContent();
record(
  'docs-changed-options',
  (axisRowText?.includes('y, y2') ?? false) &&
    !(axisRowText?.includes('x,') ?? false) &&
    (paddingRowText?.includes('number') ?? false) &&
    (paddingRowText?.includes('40') ?? false) &&
    !(paddingRowText?.includes('Partial<Padding>') ?? false),
);

await goto('/examples/multi-axis/');
record('multi-axis-y2-visible', (await page.locator('.sx-axis-y2 text').count()) > 0);

await goto('/examples/horizontal-bar/');
const horizontalBars = await page.locator('.sx-plot rect[data-sx-chart-key]').evaluateAll((nodes) =>
  nodes.map((node) => Number(node.getAttribute('width') || 0)).filter((value) => value > 0),
);
record('horizontal-bar-renders', horizontalBars.length > 0 && Math.max(...horizontalBars) > Math.min(...horizontalBars));

await goto('/examples/stacked-bar/');
record('stacked-bar-rounded-stack', (await page.locator('clipPath[id*="stack"]').count()) > 0);

await goto('/examples/line/');
const lineEdgeToEdge = await page.evaluate(() => {
  const plot = document.querySelector('.sx-plot');
  const circles = Array.from(plot?.querySelectorAll('circle') || []);
  const first = Number(circles[0]?.getAttribute('cx'));
  const last = Number(circles[circles.length - 1]?.getAttribute('cx'));
  const axis = document.querySelector('.sx-axis-x line');
  return { first, last, left: Number(axis?.getAttribute('x1')), right: Number(axis?.getAttribute('x2')) };
});
record(
  'line-edge-to-edge',
  Math.abs(lineEdgeToEdge.first - lineEdgeToEdge.left) < 0.5 &&
    Math.abs(lineEdgeToEdge.last - lineEdgeToEdge.right) < 0.5,
);

await goto('/examples/polar/');
await page.locator('[data-sx-chart-key="Clarity"]').hover();
record(
  'polar-hover-targeting',
  (await page.locator('.sx-chart-tooltip').textContent())?.includes('Clarity') ?? false,
);

await goto('/examples/gauge/');
record(
  'gauge-redesign-present',
  (await page.locator('[data-sx-gauge-needle="true"]').count()) === 1 &&
    (await page.locator('text=87').count()) > 0,
);

await goto('/examples/map/');
record('map-point-overlays-example', (await page.locator('[data-sx-chart-key^="point:"]').count()) > 0);

await goto('/documentation/', false);
await mountChart({
  type: 'pie',
  tooltip: { enabled: false },
  animate: false,
  series: [{ id: 'mix', name: 'Mix', xKey: 'label', valueKey: 'value' }],
  data: [{ label: 'Alpha', value: 12 }, { label: 'Beta', value: 18 }],
}, 'tooltipCheck');
await page.locator('#tooltipCheck svg').hover({ position: { x: 410, y: 180 } });
record(
  'tooltip-enabled-false',
  await page.evaluate(() => {
    const host = document.getElementById('tooltipCheck');
    const tooltip = host?.parentElement?.querySelector('.sx-chart-tooltip');
    return tooltip ? !tooltip.classList.contains('is-visible') : true;
  }),
);

await mountChart({
  type: 'line',
  animate: false,
  series: [{ id: 's1', name: 'Series', xKey: 'x', yKey: 'y', markerShape: 'square', markerSize: 6 }],
  axes: { x: { scaleType: 'category' } },
  data: [{ x: 'A', y: 10 }, { x: 'B', y: 20 }],
}, 'markerCheck');
record('marker-shape-square', (await page.locator('#markerCheck .sx-plot rect').count()) > 0);

await mountChart({
  type: 'bar',
  animate: false,
  series: [{ id: 's1', name: 'Series', xKey: 'x', yKey: 'y', barWidth: 18, labels: true, format: (value) => `${value}k` }],
  axes: { x: { scaleType: 'category' } },
  data: [{ x: 'A', y: 10 }, { x: 'B', y: 20 }],
}, 'barWidthCheck');
const barWidthCheck = await page.evaluate(() => {
  const widths = Array.from(document.querySelectorAll('#barWidthCheck .sx-plot rect[data-sx-chart-key]')).map((node) => Number(node.getAttribute('width') || 0));
  return { widths, text: document.getElementById('barWidthCheck')?.textContent || '' };
});
record('bar-width-and-format', barWidthCheck.widths.every((value) => value <= 18) && barWidthCheck.text.includes('10k'));
record('data-labels', (await page.locator('#barWidthCheck [data-sx-data-label="true"]').count()) === 2);

await mountChart({
  type: 'line',
  animate: false,
  series: [{ id: 's1', name: 'Series', xKey: 'x', yKey: 'y' }],
  axes: {
    x: { scaleType: 'category', tickValues: ['A', 'C'], title: 'Quarter', grid: true, labelRotation: -30 },
    y: { tickCount: 3, tickFormat: '.0%', title: 'Rate' },
  },
  data: [{ x: 'A', y: 0.1 }, { x: 'B', y: 0.3 }, { x: 'C', y: 0.5 }],
}, 'axisCheck');
const axisCheck = await page.evaluate(() => ({
  xTicks: Array.from(document.querySelectorAll('#axisCheck .sx-axis-x text')).map((node) => node.textContent),
  yTicks: Array.from(document.querySelectorAll('#axisCheck .sx-axis-y text')).map((node) => node.textContent),
  gridCount: document.querySelectorAll('#axisCheck .sx-grid line').length,
}));
record(
  'axis-options',
  axisCheck.xTicks.includes('A') &&
    axisCheck.xTicks.includes('C') &&
    axisCheck.xTicks.includes('Quarter') &&
    axisCheck.yTicks.some((tick) => tick?.includes('%')) &&
    axisCheck.yTicks.includes('Rate') &&
    axisCheck.gridCount > 0,
);

await mountChart({
  type: 'line',
  animate: false,
  legend: {
    position: 'bottom',
    layout: 'wrapped',
    alignment: 'center',
    itemShape: 'line',
    itemSpacing: 4,
    labelFormatter: (label) => `Legend ${label}`,
    pagination: true,
  },
  series: [
    { id: 'a', name: 'A', xKey: 'x', yKey: 'a' },
    { id: 'b', name: 'B', xKey: 'x', yKey: 'b' },
    { id: 'c', name: 'C', xKey: 'x', yKey: 'c' },
    { id: 'd', name: 'D', xKey: 'x', yKey: 'd' },
    { id: 'e', name: 'E', xKey: 'x', yKey: 'e' },
    { id: 'f', name: 'F', xKey: 'x', yKey: 'f' },
  ],
  axes: { x: { scaleType: 'category' } },
  data: [{ x: 'Jan', a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }, { x: 'Feb', a: 2, b: 3, c: 4, d: 5, e: 6, f: 7 }],
}, 'legendCheck', 280);
record(
  'legend-options',
  (await page.locator('.sx-legend-pagination').count()) > 0 &&
    ((await page.locator('.sx-legend-item text').first().textContent())?.includes('Legend') ?? false),
);

await mountChart({
  type: 'bar',
  animate: false,
  interactions: { drilldown: (point) => { window.__drill = point; } },
  series: [{ id: 's1', name: 'Series', xKey: 'x', yKey: 'y' }],
  axes: { x: { scaleType: 'category' } },
  data: [{ x: 'A', y: 10 }, { x: 'B', y: 20 }],
}, 'drilldownCheck');
const drillBar = await page.locator('#drilldownCheck [data-sx-chart-key="A"]').boundingBox();
if (!drillBar) throw new Error('Missing drilldown bar bounding box');
await page.mouse.click(drillBar.x + drillBar.width / 2, drillBar.y + drillBar.height / 2);
const drillResult = await page.evaluate(() => window.__drill);
record('drilldown-callback', drillResult?.x === 'A' && drillResult?.y === 10);

await mountChart({
  type: 'line',
  animate: false,
  interactions: { brush: true, zoom: true, pan: true, resetZoom: true },
  series: [{ id: 's1', name: 'Series', xKey: 'x', yKey: 'y' }],
  data: [{ x: 0, y: 10 }, { x: 25, y: 18 }, { x: 50, y: 12 }, { x: 75, y: 22 }, { x: 100, y: 16 }],
}, 'interactionCheck');
const box = await page.locator('#interactionCheck').boundingBox();
if (!box) throw new Error('Missing interactionCheck bounding box');
await page.keyboard.down('Shift');
await page.mouse.move(box.x + 120, box.y + 200);
await page.mouse.down({ button: 'left' });
await page.mouse.move(box.x + 460, box.y + 200);
await page.mouse.up({ button: 'left' });
await page.keyboard.up('Shift');
const zoomed = await page.evaluate(() => window.__chart.getState().zoomX);
await page.mouse.move(box.x + 500, box.y + 200);
await page.mouse.wheel(0, -400);
const wheelZoomed = await page.evaluate(() => window.__chart.getState().zoomX);
await page.mouse.down({ button: 'left' });
await page.mouse.move(box.x + 540, box.y + 200);
await page.mouse.up({ button: 'left' });
const panned = await page.evaluate(() => window.__chart.getState().zoomX);
await page.locator('#interactionCheck').dblclick();
const reset = await page.evaluate(() => window.__chart.getState().zoomX);
record('interaction-options', Array.isArray(zoomed) && Array.isArray(wheelZoomed) && Array.isArray(panned) && reset == null);

await mountChart({
  type: 'map',
  animate: false,
  series: [{ id: 'countries', name: 'Countries', xKey: 'id', valueKey: 'value' }],
  map: { source: 'world', projection: 'equal-earth', valueKey: 'value', pointKey: 'marker', pointRadius: 9 },
  data: [{ id: '752', marker: '752', value: 12 }, { id: '840', marker: '840', value: 30 }],
}, 'mapPointCheck');
const mapPoints = await page.evaluate(() => Array.from(document.querySelectorAll('#mapPointCheck [data-sx-chart-key^="point:"]')).map((node) => node.getAttribute('r')));
record('map-point-options', mapPoints.length === 2 && mapPoints.every((value) => value === '9'));

await browser.close();
for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}
if (checks.some((check) => !check.ok)) process.exitCode = 1;
