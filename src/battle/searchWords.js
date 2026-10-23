export function matchesBattleWords(text, query = '') {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  return terms.every(term => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}`,'iu').test(text);
  });
}
