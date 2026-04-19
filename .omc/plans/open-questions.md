# Open Questions

## fix-failing-tool-calls - 2026-04-18

- [ ] Does `.env` currently contain `ACLED_API_KEY` in addition to `ACLED_EMAIL`/`ACLED_PASSWORD`? Step 5c (legacy-key fallback) cannot be verified without it. If only OAuth credentials exist and OAuth is broken upstream, user must obtain an API key from ACLED before the fix can be validated.
- [ ] ACLED auth failure mode: is the current failure a credential problem, an endpoint retirement, or a transient ACLED outage? Step 5a's probe output determines the branch; do not pick a fix before running it.
- [ ] ISO2 vs ISO3 inconsistency across tools: `comparableProjects` and `politicalRisk` use ISO2 (`KE`), while `foodInsecurity`, `deforestation`, `climateProjections` use ISO3 (`KEN`). Is the agent layer normalizing this, or will callers hit `no_data` from a country-code mismatch? Out of scope for this plan; flagged for future work.
- [ ] Are `ok: false, reason: 'no_data'` responses retried by the agent, or surfaced to the user as "no data"? Affects whether step 4's change from empty-array success to `no_data` failure is a behavioral regression anywhere.
