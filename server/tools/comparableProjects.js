import { request } from './httpClient.js';

export default async function handler({ country }) {
  if (!country) return { ok: false, reason: 'missing_country', url: null };

  const iso2 = country.trim().toUpperCase();
  const url = `https://search.worldbank.org/api/v2/projects?format=json&countrycode_exact=${iso2}&rows=10`;

  const result = await request({ url, timeoutMs: 8000 });
  if (!result.ok) return { ok: false, reason: result.reason ?? 'request_failed', url };

  const parsed = result.data;

  const rawProjects = parsed?.projects ?? parsed?.data ?? null;
  const projects = Array.isArray(rawProjects)
    ? rawProjects
    : (rawProjects && typeof rawProjects === 'object')
      ? Object.values(rawProjects)
      : [];
  if (projects.length === 0) return { ok: false, reason: 'no_data', url };

  const data = projects.map(p => ({
    id: p.id ?? p.project_id ?? null,
    project_name: p.project_name ?? p.projectname ?? null,
    totalcommamt: p.totalcommamt ?? null,
    status: p.status ?? null,
    boardapprovaldate: p.boardapprovaldate ?? null,
  }));

  return {
    ok: true,
    data,
    source: 'World Bank Projects',
    url,
  };
}
