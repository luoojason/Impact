import { request } from './httpClient.js';

export async function handler({ country }) {
  const key = process.env.ACLED_API_KEY;
  const email = process.env.ACLED_EMAIL;

  if (!key || !email) {
    return { ok: false, reason: 'missing_key', message: 'ACLED_API_KEY and ACLED_EMAIL are required' };
  }

  const url = `https://api.acleddata.com/acled/read?key=${encodeURIComponent(key)}&email=${encodeURIComponent(email)}&country=${encodeURIComponent(country)}&event_date=2023-01-01|2025-12-31&limit=500`;
  const result = await request(url);

  if (!result.ok) {
    return { ok: false, reason: result.reason, message: result.message, source: 'ACLED', url };
  }

  const events = result.data?.data ?? [];
  let total_events = 0;
  let total_fatalities = 0;
  const by_type = {};

  for (const ev of events) {
    total_events++;
    const fat = parseInt(ev.fatalities ?? 0, 10);
    total_fatalities += fat;
    const type = ev.event_type ?? 'unknown';
    if (!by_type[type]) by_type[type] = { count: 0, fatalities_sum: 0 };
    by_type[type].count++;
    by_type[type].fatalities_sum += fat;
  }

  return {
    ok: true,
    data: { total_events, total_fatalities, by_type },
    source: 'ACLED',
    url,
  };
}
