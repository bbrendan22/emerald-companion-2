// Public files keep their existing root-relative identifiers in data/helpers.
// Prefix only at the rendering boundary; external and already-prefixed URLs pass through.
export function publicAsset(source, base = import.meta.env?.BASE_URL ?? '/') {
  if (typeof source !== 'string' || !source.startsWith('/') || source.startsWith('//') || base === '/' || source.startsWith(base)) return source;
  return `${base}${source.slice(1)}`;
}
