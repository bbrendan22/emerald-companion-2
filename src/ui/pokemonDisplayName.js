export function customNickname(pokemon) {
  const nickname = pokemon?.nickname?.trim();
  return nickname && nickname.toLocaleLowerCase() !== pokemon.speciesName.toLocaleLowerCase() ? nickname : null;
}
