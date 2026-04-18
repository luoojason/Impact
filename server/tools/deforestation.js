import { request } from './httpClient.js';

export async function handler({ country }) {
  const key = process.env.GFW_API_KEY;

  if (!key) {
    return { ok: false, reason: 'missing_key', message: 'GFW_API_KEY is required' };
  }

  const iso3 = country.toUpperCase();
  const url = 'https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/latest/query';
  const body = {
    sql: `SELECT SUM(area__ha) as loss_ha, umd_tree_cover_loss__year as year FROM data WHERE iso='${iso3}' GROUP BY year ORDER BY year DESC LIMIT 10`,
  };

  const result = await request(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return { ok: false, reason: result.reason, message: result.message, source: 'Global Forest Watch', url };
  }

  const rows = result.data?.data ?? [];
  const loss_by_year = rows.map(r => ({ year: r.year, loss_ha: r.loss_ha }));

  return {
    ok: true,
    data: { loss_by_year },
    source: 'Global Forest Watch',
    url,
  };
}
