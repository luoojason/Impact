# Fix Failing Tool Calls in ImpactGrid

## Context

The `request()` helper in `server/tools/httpClient.js` takes a **single options object**:

```js
export async function request({ url, method = 'GET', headers = {}, body, timeoutMs = 8000, parse = 'json' })
```

Three tools call it with a positional string (or `(url, opts)`), so `url` is `undefined` inside `request()` and every call fails at `fetch(undefined, opts)` -> TypeError caught as `reason: 'network'`. A fourth tool mis-shapes its parser for the World Bank Projects response (object vs array). A fifth tool (`get_conflict_data` via ACLED) is failing for an independent reason -- ACLED's OAuth password-grant endpoint may have changed -- and needs diagnosis, not a blind code change. Two others (`get_climate_projections`, `get_political_risk`) already use the correct calling convention and likely fail due to upstream availability.

Scope: fix bugs 1-4 as code edits, diagnose bug 5, verify bug 6 is not a code bug. No refactors, no new abstractions, no changes to `httpClient.js` signature.

## Work Objectives

1. Correct the three `request()` call sites so `url` is passed via the options object.
2. Fix `comparableProjects.js` to handle the World Bank Projects object-keyed response shape.
3. Determine whether ACLED auth failure is a credential issue, an endpoint change, or both; pick the minimal working path (OAuth fix or legacy API-key fallback).
4. Confirm `get_climate_projections` and `get_political_risk` are not code bugs; surface upstream HTTP status in the error payload so future failures are self-diagnosing.

## Guardrails

### Must Have
- Every fix is a targeted edit to an existing file. No new files except the diagnostic script in step 5 (which may live at `/tmp/` and is not committed).
- `httpClient.js` signature is unchanged.
- Tools that currently pass (`foodInsecurity`, `permafrost`, `deforestation` on happy path) return `{ ok: true, data: ... }` after the fix, shaped identically to before.
- Error paths continue to return `{ ok: false, reason, ... }` -- no thrown exceptions leaking to callers.
- ACLED diagnosis is evidence-based: do not rewrite auth until the current failure mode is captured (HTTP status + body).

### Must NOT Have
- No refactor of `httpClient.js` to accept positional args "for backward compat".
- No new wrapper modules, no retry/backoff layer, no logging framework.
- No edits to `agent.js`, `toolSchemas.js`, `index.js`, or `server.js`.
- No dependency additions.
- No speculative fix for bug 5; if OAuth works once creds are present, leave it alone.

## Task Flow

```
Step 1 (code)  -> Step 2 (code)  -> Step 3 (code)  -> Step 4 (code)
     |                                                     |
     +---> Step 5 (diagnose ACLED) ----+                   |
                                       |                   |
                                       v                   v
                              Step 6 (smoke test all fixed tools end-to-end)
```

Steps 1-4 are independent edits and can be done in any order, but verification (step 6) must wait until all four land.

## Detailed TODOs

### Step 1 - Fix `foodInsecurity.js` call site

**File:** `server/tools/foodInsecurity.js`
**Line:** 6

Replace:
```js
const result = await request(url);
```
with:
```js
const result = await request({ url });
```

**Acceptance:** Calling the tool with a valid ISO3 country (e.g. `{ country: 'KEN' }`) returns `{ ok: true, data: { period, phase_classification, pop_analyzed, pop_in_phase3_plus }, source: 'IPC', url }`. On a country with no IPC data (e.g. `'USA'`), returns `{ ok: false, reason: 'no_data', ... }` -- never `reason: 'network'` from an undefined URL.

### Step 2 - Fix `permafrost.js` call site

**File:** `server/tools/permafrost.js`
**Line:** 11

Replace:
```js
const result = await request(url);
```
with:
```js
const result = await request({ url });
```

**Acceptance:** Calling with `{ country: 'RUS', lat: 68.0, lon: 161.0 }` returns `{ ok: true, data: { permafrost_zone_index: 'n/a', note, population_density_proxy: <number>, lat, lon }, source: 'WorldPop (SEDAC proxy)', url }`. Missing `lat`/`lon` still returns `{ ok: false, reason: 'missing_key' }`.

### Step 3 - Fix `deforestation.js` call site

**File:** `server/tools/deforestation.js`
**Lines:** 16-23

Replace the two-positional-arg call:
```js
const result = await request(url, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});
```
with a single options object, and pass `body` as the raw object (since `httpClient.js` already does `JSON.stringify(body)` internally when `body` is truthy):
```js
const result = await request({
  url,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body,
});
```

Rationale for unwrapping the stringify: `httpClient.js` line 6 does `if (body) opts.body = JSON.stringify(body);`. Passing an already-stringified body would produce a double-encoded JSON string (`"\"{\\\"sql\\\":...}\""`) that GFW's SQL endpoint will reject with 400.

**Acceptance:** With a valid `GFW_API_KEY`, calling with `{ country: 'BRA' }` returns `{ ok: true, data: { loss_by_year: [ { year, loss_ha }, ... up to 10 ] }, source: 'Global Forest Watch', url }`. Without the key, returns `{ ok: false, reason: 'missing_key' }` (unchanged path). If GFW returns non-200, returns `{ ok: false, reason: 'http_<status>', ... }` -- never `reason: 'network'` from an undefined URL.

### Step 4 - Fix `comparableProjects.js` response shape

**File:** `server/tools/comparableProjects.js`
**Line:** 14

Replace:
```js
const projects = parsed?.projects ?? parsed?.data ?? [];
if (!Array.isArray(projects) || projects.length === 0) return { ok: false, reason: 'no_data', url };
```
with:
```js
const rawProjects = parsed?.projects ?? parsed?.data ?? null;
const projects = Array.isArray(rawProjects)
  ? rawProjects
  : (rawProjects && typeof rawProjects === 'object')
    ? Object.values(rawProjects)
    : [];
if (projects.length === 0) return { ok: false, reason: 'no_data', url };
```

The rest of the function (`projects.map(...)`) is unchanged since it already operates on an array of project objects. Each value yielded by `Object.values(parsed.projects)` is a single project object with `id`, `project_name`, `totalcommamt`, `status`, `boardapprovaldate` fields -- matching the existing `.map` call.

**Acceptance:** Calling with a country that has World Bank Energy-and-Extractives projects (e.g. `{ country: 'KE' }`) returns `{ ok: true, data: [ { id, project_name, totalcommamt, status, boardapprovaldate }, ... up to 10 ], source: 'World Bank Projects', url }`. A country with no matching projects returns `{ ok: false, reason: 'no_data', url }` instead of `{ ok: true, data: [] }`.

### Step 5 - Diagnose ACLED auth

**Files (read-only during diagnosis):** `server/tools/acledAuth.js`, `server/tools/conflictData.js`

Do not edit yet. Run the diagnostic script below and branch on results.

**5a. Capture the real failure.** Create `/tmp/acled-probe.mjs`:
```js
const email = process.env.ACLED_EMAIL;
const password = process.env.ACLED_PASSWORD;
const key = process.env.ACLED_API_KEY;

async function probe(label, url, opts) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`[${label}] status=${res.status} body=${text.slice(0, 400)}`);
  } catch (err) {
    console.log(`[${label}] threw ${err.message}`);
  }
}

// Current code path: OAuth password grant
if (email && password) {
  await probe('oauth-password', 'https://acleddata.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password, grant_type: 'password', client_id: 'acled' }),
  });
}

// Legacy API-key path
if (key && email) {
  const params = new URLSearchParams({ key, email, limit: '1', _format: 'json' });
  await probe('legacy-key', `https://acleddata.com/api/acled/read?${params}`);
}

// Unauthenticated probe (endpoint existence check)
await probe('unauth-read', 'https://acleddata.com/api/acled/read?limit=1&_format=json');
await probe('unauth-oauth', 'https://acleddata.com/oauth/token');
```

Run: `cd /Users/jasonluo08/impactgrid && node --env-file=.env /tmp/acled-probe.mjs`

**5b. Decide from the output:**
- **If `oauth-password` returns 200 with a token** -> OAuth works; the original failure was a credential or a transient issue. No code change. Document in plan output that `ACLED_EMAIL`/`ACLED_PASSWORD` need to be set and valid.
- **If `oauth-password` returns 401/403** -> credentials wrong. No code change; flag for user to update `.env`.
- **If `oauth-password` returns 404 or the endpoint body says the flow is deprecated** -> ACLED retired password-grant. Implement 5c below.
- **If `legacy-key` returns 200** -> fallback path works. Implement 5c below.

**5c. (Conditional) Switch to legacy API-key path.** Only if 5b determines OAuth is broken *and* legacy key works. Edit `server/tools/conflictData.js` to bypass `getAccessToken()`:

Replace lines 9-22 and 35-39 so the tool reads `ACLED_API_KEY` + `ACLED_EMAIL` and appends them as query params, dropping the `Authorization` header:

```js
const apiKey = process.env.ACLED_API_KEY;
const apiEmail = process.env.ACLED_EMAIL;
if (!apiKey || !apiEmail) {
  return {
    ok: false,
    reason: 'missing_credentials',
    message: 'ACLED_API_KEY and ACLED_EMAIL are required',
    source: 'ACLED',
  };
}

const params = new URLSearchParams({
  key: apiKey,
  email: apiEmail,
  _format: 'json',
  country,
  event_date: '2024-01-01|2025-12-31',
  event_date_where: 'BETWEEN',
  limit: '200',
  fields: 'event_date|event_type|fatalities',
});
const url = `https://acleddata.com/api/acled/read?${params.toString()}`;

const t0 = Date.now();
const result = await request({ url, timeoutMs: 45000 });
```

Leave `acledAuth.js` on disk but unused (it already handles its own missing-credential case; removing it is out of scope).

**Acceptance:**
- The probe script output is attached to the plan discussion so the branch decision is explicit, not guessed.
- If 5c runs: calling `get_conflict_data` with `{ country: 'NGA' }` returns `{ ok: true, data: { total_events, total_fatalities, by_type }, source: 'ACLED', url }`.
- If 5c does not run: the plan's "handoff notes" record which env vars the user must set and what 5a output proved OAuth still works.

### Step 6 - Surface upstream HTTP status on `get_climate_projections` and `get_political_risk`

**Files:** `server/tools/climateProjections.js`, `server/tools/politicalRisk.js`

Both already use `request({ url, ... })` correctly. The issue is that when the upstream returns non-200, the tool returns `{ ok: false, reason: result.reason ?? 'request_failed', url }` -- the `reason` is already `http_<status>`, but no `message` is passed through and no `status` field is exposed. One-line fix in each file:

In `climateProjections.js` line 14:
```js
if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url: fallbackUrl };
```
becomes:
```js
if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', status: result.status, message: result.message, url: fallbackUrl };
```

In `politicalRisk.js` line 10:
```js
if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url };
```
becomes:
```js
if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', status: result.status, message: result.message, url };
```

**Acceptance:** When either upstream returns e.g. 503, the tool response now includes `status: 503`. When upstream times out, `reason: 'timeout'` and `message: 'Request timed out'` pass through. On success, response shape is unchanged.

### Step 7 - End-to-end smoke test

Create `/tmp/smoke-tools.mjs` (not committed):
```js
import foodHandler from '/Users/jasonluo08/impactgrid/server/tools/foodInsecurity.js';
import permaHandler from '/Users/jasonluo08/impactgrid/server/tools/permafrost.js';
import deforHandler from '/Users/jasonluo08/impactgrid/server/tools/deforestation.js';
import compHandler from '/Users/jasonluo08/impactgrid/server/tools/comparableProjects.js';
import conflictHandler from '/Users/jasonluo08/impactgrid/server/tools/conflictData.js';
import climateHandler from '/Users/jasonluo08/impactgrid/server/tools/climateProjections.js';
import riskHandler from '/Users/jasonluo08/impactgrid/server/tools/politicalRisk.js';

// Note: foodInsecurity/permafrost/deforestation/conflictData export `handler`;
// comparableProjects/climateProjections/politicalRisk export default.
// Adjust the imports to match the actual export shape of each file before running.

const cases = [
  ['food',       foodHandler,     { country: 'KEN' }],
  ['permafrost', permaHandler,    { country: 'RUS', lat: 68.0, lon: 161.0 }],
  ['deforest',   deforHandler,    { country: 'BRA' }],
  ['compProj',   compHandler,     { country: 'KE' }],
  ['conflict',   conflictHandler, { country: 'NGA' }],
  ['climate',    climateHandler,  { country: 'KEN' }],
  ['polrisk',    riskHandler,     { country: 'KE' }],
];
for (const [name, fn, args] of cases) {
  try {
    const r = await fn(args);
    console.log(name, JSON.stringify(r).slice(0, 300));
  } catch (e) {
    console.log(name, 'THREW', e.message);
  }
}
```

Run: `cd /Users/jasonluo08/impactgrid && node --env-file=.env /tmp/smoke-tools.mjs`

**Acceptance (per tool):**
| Tool | Expected on success | Expected on graceful failure |
|------|---------------------|------------------------------|
| food | `ok: true` with `data.period, phase_classification, pop_analyzed, pop_in_phase3_plus` | `ok: false, reason: 'no_data'` or `http_<n>` |
| permafrost | `ok: true` with numeric `population_density_proxy` | `ok: false, reason: 'missing_key'` if lat/lon absent; never `'network'` from undefined url |
| deforest | `ok: true` with `loss_by_year` array len <= 10 | `ok: false, reason: 'missing_key'` or `http_<n>`; never `'network'` from undefined url |
| compProj | `ok: true` with `data` as non-empty array of project records | `ok: false, reason: 'no_data'` |
| conflict | `ok: true` with `total_events`, `total_fatalities`, `by_type` | `ok: false, reason: 'missing_credentials'` or `auth_failed` (diagnosed in step 5) |
| climate | `ok: true` with `variable` and/or `values` | `ok: false` with `reason` + new `status` + `message` fields populated |
| polrisk | `ok: true` with `date`, `value`, `indicator: 'PV.EST'` | `ok: false` with `reason` + new `status` + `message` fields populated |

No tool returns `reason: 'network'` with an undefined url. No tool throws an uncaught exception.

## Success Criteria

- All three positional-arg bugs (foodInsecurity, permafrost, deforestation) produce `ok: true` on a happy-path country.
- `comparableProjects` returns a non-empty `data` array for a country with World Bank energy projects.
- ACLED status is one of: (a) working as-is with valid creds, (b) fixed via legacy-key fallback, or (c) documented as blocked on user-side credential/endpoint action -- with the probe output as evidence.
- `climateProjections` and `politicalRisk` error payloads include upstream `status` and `message` for future debuggability.
- Smoke script exit is clean; each line prints a JSON result shorter than 300 chars.
- `httpClient.js` is byte-identical to the pre-plan version.
- No new files remain in the repo (probe/smoke scripts live in `/tmp`).

## Open Questions

- Bug 5 branch: does `ACLED_API_KEY` exist in the user's `.env`? If not, 5c cannot be verified without the user providing one. Recorded in `open-questions.md`.
- Are any of the `ok: false, reason: 'no_data'` outcomes acceptable to the agent layer, or should the agent retry with a different country code (ISO2 vs ISO3 mismatch between `comparableProjects` which uses ISO2 and `foodInsecurity`/`deforestation` which use ISO3)? Out of scope for this plan; flagged for later.
