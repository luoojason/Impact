import { request } from './httpClient.js';

export async function handler({ country_iso2, country_iso3 }) {
  if (!country_iso2 && !country_iso3) {
    return { ok: false, reason: 'missing_country', message: 'country_iso2 or country_iso3 is required' };
  }

  const results = {};

  // Source 1: World Bank intentional homicide rate (conflict-violence proxy)
  if (country_iso2) {
    const wbUrl = `https://api.worldbank.org/v2/country/${country_iso2}/indicator/VC.IHR.PSRC.P5?format=json&mrv=5`;
    const wbResult = await request({ url: wbUrl, timeoutMs: 15000 });
    if (wbResult.ok) {
      const entries = (wbResult.data?.[1] ?? []).filter((r) => r.value != null);
      if (entries.length) {
        results.homicide_rate_per_100k = entries[0].value;
        results.homicide_year = entries[0].date;
        results.homicide_trend = entries.length >= 2
          ? (entries[0].value > entries[entries.length - 1].value ? 'increasing' : 'decreasing')
          : 'stable';
      }
    }
  }

  // Source 2: UNHCR displacement data (refugees + IDPs — strong conflict proxy)
  const iso = country_iso3 || country_iso2;
  const unhcrUrl = `https://api.unhcr.org/population/v1/population/?year=2023&coo=${iso}&limit=1`;
  const unhcrResult = await request({ url: unhcrUrl, timeoutMs: 15000 });
  if (unhcrResult.ok) {
    const item = unhcrResult.data?.items?.[0];
    if (item) {
      results.refugees_abroad = item.refugees ?? 0;
      results.asylum_seekers_abroad = item.asylum_seekers ?? 0;
      results.idps = typeof item.idps === 'number' ? item.idps : null;
      results.displacement_year = 2023;
    }
  }

  if (!Object.keys(results).length) {
    return {
      ok: false,
      reason: 'no_data',
      message: `No conflict proxy data found for ${iso}`,
      source: 'World Bank / UNHCR',
    };
  }

  return {
    ok: true,
    data: results,
    source: 'World Bank (homicide rate VC.IHR.PSRC.P5) + UNHCR (displacement 2023)',
    note: 'Homicide rate reflects political violence intensity; displacement figures reflect conflict-driven population movement.',
  };
}
