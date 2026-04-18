# ImpactGrid

Real-time renewable energy investment intelligence — Claude calls 12 live data APIs and streams the analysis to your browser as it happens.

## Setup

### Prerequisites

- Node.js 20+
- An Anthropic API key (required)
- ACLED and GFW keys (optional — missing keys degrade gracefully with explicit data-gap notes)

### Terminal 1 — Backend

```bash
cp .env.example .env
# Fill in ANTHROPIC_API_KEY at minimum; see .env.example for all keys
npm install
curl -o public/countries.geo.json \
  https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson
node --env-file=.env server.js
```

### Terminal 2 — Frontend

```bash
npm run dev
# Vite dev server on http://localhost:5173, proxies /api to :3001
```

Open `http://localhost:5173`.

## API Keys

| Service | Signup |
|---|---|
| Anthropic (Claude) | https://console.anthropic.com |
| ACLED conflict data | https://developer.acleddata.com |
| Global Forest Watch | https://globalforestwatch.org/help/developers |

## Demo Script

1. Fill the intake form: **Company** = "Acme Solar", **Focus** = solar, **Geography** = "Kenya, Nigeria", **Size** = $5M–$50M, **Horizon** = 10 years, **Risk** = medium.
2. Submit. Watch 12 live tool calls stream in the LiveFeed panel — each tile shows the tool name, a spinner while pending, a green check on success, and a red `!` on failure.
3. Once `done` fires, switch to the **Deliverables** tabs. Open **Second-Order Risks** and note that no existing tool directly connects permafrost × wind foundations × investment horizon — that gap is explicitly flagged in the output.
4. Click **Export all** to download `impactgrid-acme-solar-YYYY-MM-DD.md` — the full deliverable package with a `## Sources` footer listing every cited tool call.

## DEMO_MODE=replay

Set `DEMO_MODE=replay` in `.env` to play back a canned event sequence instead of calling real APIs. The UI shows a persistent "REPLAY MODE — canned data" banner. Useful for demos with no internet or API keys.

If `.sessions/demo-fixture.jsonl` exists, that file is replayed line by line. Otherwise a built-in stub sequence fires (6 tool calls + 6 sections + done).

## Known Constraints

- **12-call budget cap**: The agentic loop is hard-capped at 12 tool calls and 6 iterations. Multi-country analyses with many data dimensions may be truncated. The demo script is designed to stay within budget.
- **SEDAC GPZ replaced**: The NASA SEDAC Global Permafrost Zones dataset requires OAuth not suitable for a demo. The `get_permafrost_data` tool uses the WorldPop REST API as a proxy for ground-stability risk.
- **GSA/GWA fallback**: Global Solar Atlas and Global Wind Atlas ArcGIS endpoints are unstable in automated contexts. `get_renewable_resource_potential` uses the NASA POWER climatology API directly.
- **Sea level portal**: The NASA Sea Level Change Portal API is undocumented and not reliably accessible outside a browser. `get_sea_level_projections` returns `ok:false` with an explanatory message when unavailable; the final brief notes the gap explicitly.
- **Approximate cost**: One full run costs roughly $0.50–$1.50 in Anthropic API credits at current pricing (claude-sonnet-4 at 4096 tokens/turn × up to 6 iterations).
