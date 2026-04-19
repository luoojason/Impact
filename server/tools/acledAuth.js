const TOKEN_URL = 'https://acleddata.com/oauth/token';
const SAFETY_WINDOW_MS = 60_000;

let cached = null;
let inflight = null;

async function fetchToken(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const e = new Error(err.name === 'AbortError' ? 'acled_oauth_timeout' : `acled_oauth_network: ${err.message}`);
    e.reason = 'timeout';
    throw e;
  }
  clearTimeout(timer);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`acled_oauth_${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const data = await res.json();
  const expiresInMs = (Number(data.expires_in) || 86400) * 1000;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + expiresInMs - SAFETY_WINDOW_MS,
  };
}

async function passwordGrant(email, password) {
  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: 'password',
    client_id: 'acled',
  });
  return fetchToken(body);
}

async function refreshGrant(refreshToken) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: 'acled',
  });
  return fetchToken(body);
}

export async function getAccessToken() {
  const email = process.env.ACLED_EMAIL;
  const password = process.env.ACLED_PASSWORD;
  if (!email || !password) {
    const err = new Error('missing_credentials');
    err.reason = 'missing_credentials';
    throw err;
  }

  if (cached && cached.expiresAt > Date.now()) return cached.accessToken;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      if (cached?.refreshToken) {
        try {
          cached = await refreshGrant(cached.refreshToken);
          return cached.accessToken;
        } catch {
          cached = null;
        }
      }
      cached = await passwordGrant(email, password);
      return cached.accessToken;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function _resetForTests() {
  cached = null;
  inflight = null;
}
