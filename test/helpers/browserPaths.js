// Expected public URLs must be derived independently from the configured test URL,
// not normalized from the application's actual src (which could hide a bad base).
export function browserTestUrl(env = process.env) {
  return env.BROWSER_URL || env.BATTLE_URL || env.SHOWCASE_URL || env.PAGES_URL || 'http://127.0.0.1:5173/';
}

export function assetPath(source, url = browserTestUrl()) {
  if (!source.startsWith('/') || source.startsWith('//')) throw new Error('Expected a root-relative public asset identifier.');
  const base = new URL(url).pathname.replace(/\/?$/, '/');
  return `${base}${source.slice(1)}`;
}
