export function globalLimit(n) {
  let active = 0;
  const queue = [];
  function next() {
    if (active >= n || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve().then(() => fn()).then(
      result => { active--; resolve(result); next(); },
      err => { active--; reject(err); next(); }
    );
  }
  return {
    run(fn) {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        next();
      });
    }
  };
}

const hostLimiters = new Map();

export function hostLimiterFor(url, perHostLimit = 2, wbOverride = 3) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    origin = url;
  }
  const limit = origin.includes('api.worldbank.org') ? wbOverride : perHostLimit;
  if (!hostLimiters.has(origin)) {
    hostLimiters.set(origin, globalLimit(limit));
  }
  return hostLimiters.get(origin);
}
