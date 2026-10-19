const normalize = value => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function matchesItemSearch(item, value = '') {
 const prefix = normalize(value);
 return [item.name, item.code ?? ''].some(field => {
  const text = normalize(field);
  return text.startsWith(prefix) || text.includes(` ${prefix}`);
 });
}
