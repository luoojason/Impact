// Downloads Global Solar Atlas GHI and Global Wind Atlas wind-speed-100 GeoTIFFs,
// downsamples each to a 0.5° lat/lon grid, emits packed JSON to public/data/.
//
// Run: node data-prep/fetch-and-grid.mjs [--skip-download]

import { createWriteStream, existsSync, mkdirSync, copyFileSync, openSync, readSync, closeSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';

function sniffFormat(filePath) {
  const fd = openSync(filePath, 'r');
  const buf = Buffer.alloc(4);
  try {
    readSync(fd, buf, 0, 4, 0);
  } finally {
    closeSync(fd);
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'zip';
  // GeoTIFF: little-endian "II*\0" or big-endian "MM\0*"
  if (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) return 'tif';
  if (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a) return 'tif';
  return 'unknown';
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, 'raw');
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'data');

const SOURCES = [
  {
    key: 'solar',
    url: 'https://api.globalsolaratlas.info/download/World/World_GHI_GISdata_LTAy_AvgDailyTotals_GlobalSolarAtlas-v2_GEOTIFF.zip',
    zipName: 'solar-ghi.zip',
    tifMatch: /GHI\.tif$/i,
    unit: 'kWh/m²/day',
  },
  {
    // WorldClim v2.1 supplies 12 monthly 10m wind-speed rasters; we average them.
    // The Global Wind Atlas 100m feed is WAF-gated and unreachable from CLI.
    key: 'wind',
    url: 'https://geodata.ucdavis.edu/climate/worldclim/2_1/base/wc2.1_10m_wind.zip',
    zipName: 'wind-10m.zip',
    tifMatch: /wc2\.1_10m_wind_\d+\.tif$/i,
    unit: 'm/s @ 10m (annual mean)',
  },
];

const RES = 0.5;
const W = Math.round(360 / RES);
const H = Math.round(180 / RES);

async function download(url, dest) {
  console.log(`[download] ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const total = Number(res.headers.get('content-length')) || 0;
  let seen = 0;
  let lastPct = -1;
  const reader = res.body.getReader();
  const out = createWriteStream(dest);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out.write(value);
    seen += value.length;
    if (total) {
      const pct = Math.floor((seen / total) * 100);
      if (pct !== lastPct && pct % 5 === 0) {
        process.stdout.write(`\r[download] ${pct}%`);
        lastPct = pct;
      }
    }
  }
  out.end();
  await new Promise((r) => out.on('close', r));
  process.stdout.write('\n');
}

function extractTifs(zipPath, match, destDir) {
  // Stream-extract via shell `unzip` to handle >2 GiB archives that adm-zip can't load.
  const list = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  const entries = list.split('\n').filter(Boolean);
  const tifEntries = entries.filter((name) => match.test(name) && !name.endsWith('/'));
  if (tifEntries.length === 0) {
    throw new Error(`No .tif matching ${match} in zip. First entries:\n  ${entries.slice(0, 20).join('\n  ')}`);
  }
  // -j junks paths, -o overwrites, -d destination dir
  execFileSync('unzip', ['-j', '-o', zipPath, ...tifEntries, '-d', destDir], { stdio: 'inherit' });
  return tifEntries.map((e) => path.join(destDir, path.basename(e)));
}

async function downsample(tifPath) {
  console.log(`[grid] reading ${path.basename(tifPath)}`);
  const tiff = await fromFile(tifPath);
  const image = await tiff.getImage();
  const srcW = image.getWidth();
  const srcH = image.getHeight();
  const [minX, minY, maxX, maxY] = image.getBoundingBox();
  const noData = image.getGDALNoData();
  console.log(`[grid] source ${srcW}x${srcH}, bbox [${minX.toFixed(2)}, ${minY.toFixed(2)}, ${maxX.toFixed(2)}, ${maxY.toFixed(2)}], nodata=${noData}`);

  const out = new Float32Array(W * H);
  out.fill(NaN);

  // Stream rows by source chunks to avoid loading full raster in RAM.
  // We iterate target rows (y in 0..H), compute source row range, read window, then
  // average each target column.
  const pxPerDegX = srcW / (maxX - minX);
  const pxPerDegY = srcH / (maxY - minY);

  for (let y = 0; y < H; y++) {
    const targetLatTop = 90 - y * RES;
    const targetLatBot = 90 - (y + 1) * RES;
    const sy0 = Math.max(0, Math.floor((maxY - targetLatTop) * pxPerDegY));
    const sy1 = Math.min(srcH, Math.ceil((maxY - targetLatBot) * pxPerDegY));
    if (sy1 <= sy0) continue;

    const raster = await image.readRasters({ window: [0, sy0, srcW, sy1], samples: [0] });
    const band = raster[0];
    const bandRows = sy1 - sy0;

    for (let x = 0; x < W; x++) {
      const targetLonLeft = -180 + x * RES;
      const targetLonRight = -180 + (x + 1) * RES;
      const sx0 = Math.max(0, Math.floor((targetLonLeft - minX) * pxPerDegX));
      const sx1 = Math.min(srcW, Math.ceil((targetLonRight - minX) * pxPerDegX));
      if (sx1 <= sx0) continue;

      let sum = 0;
      let count = 0;
      // Subsample (every 4th pixel) for speed — the grid cell is huge anyway.
      const step = Math.max(1, Math.floor((sx1 - sx0) / 8));
      for (let sy = 0; sy < bandRows; sy += step) {
        const rowOffset = sy * srcW;
        for (let sx = sx0; sx < sx1; sx += step) {
          const v = band[rowOffset + sx];
          if (v == null || v === noData || !Number.isFinite(v) || v < 0) continue;
          sum += v;
          count++;
        }
      }
      if (count > 0) out[y * W + x] = sum / count;
    }
    if (y % 30 === 0) process.stdout.write(`\r[grid] row ${y}/${H}`);
  }
  process.stdout.write('\n');
  return out;
}

function quantize(grid) {
  // Collect finite values for both extrema and percentile clamps.
  const finite = [];
  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    if (Number.isFinite(v)) finite.push(v);
  }
  finite.sort((a, b) => a - b);
  const min = finite[0];
  const max = finite[finite.length - 1];
  // Percentile clamps stretch the palette across the bulk of the distribution,
  // so a handful of mountain/polar outliers don't crush everything else to dark.
  const p1 = finite[Math.floor(finite.length * 0.01)];
  const p99 = finite[Math.floor(finite.length * 0.99)];
  const range = max - min || 1;
  const cells = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x];
      if (!Number.isFinite(v)) continue;
      const q = Math.round(((v - min) / range) * 1000);
      cells.push([x, y, q]);
    }
  }
  return { min, max, p1, p99, cells };
}

async function main() {
  const skipDownload = process.argv.includes('--skip-download');
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  for (const src of SOURCES) {
    console.log(`\n=== ${src.key.toUpperCase()} ===`);
    const dlPath = path.join(RAW_DIR, src.zipName);

    if (!skipDownload && !existsSync(dlPath)) {
      await download(src.url, dlPath);
    } else {
      console.log(`[download] skip — ${dlPath} exists`);
    }

    const fmt = sniffFormat(dlPath);
    console.log(`[format] ${src.key}: ${fmt}`);
    let tifPaths;
    if (fmt === 'zip') {
      tifPaths = extractTifs(dlPath, src.tifMatch, RAW_DIR);
      console.log(`[unzip] ${tifPaths.length} tif(s): ${tifPaths.map((p) => path.basename(p)).join(', ')}`);
    } else if (fmt === 'tif') {
      const tifPath = path.join(RAW_DIR, `${src.key}.tif`);
      if (dlPath !== tifPath) copyFileSync(dlPath, tifPath);
      console.log(`[direct-tif] ${tifPath}`);
      tifPaths = [tifPath];
    } else {
      throw new Error(`Unknown file format for ${dlPath} (first bytes not zip or tiff)`);
    }

    // Downsample each raster, then average across them per cell (NaN-aware).
    const grids = [];
    for (const tp of tifPaths) grids.push(await downsample(tp));
    const grid = new Float32Array(W * H);
    for (let i = 0; i < grid.length; i++) {
      let sum = 0;
      let count = 0;
      for (const g of grids) {
        const v = g[i];
        if (Number.isFinite(v)) { sum += v; count++; }
      }
      grid[i] = count > 0 ? sum / count : NaN;
    }
    const { min, max, p1, p99, cells } = quantize(grid);

    const payload = {
      key: src.key,
      unit: src.unit,
      resolution: RES,
      width: W,
      height: H,
      bounds: [-180, -90, 180, 90],
      min,
      max,
      p1,
      p99,
      cells,
    };
    const outPath = path.join(OUT_DIR, `${src.key}-grid.json`);
    await writeFile(outPath, JSON.stringify(payload));
    console.log(`[write] ${outPath}  (${cells.length} cells, min=${min.toFixed(2)}, max=${max.toFixed(2)})`);
  }
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
