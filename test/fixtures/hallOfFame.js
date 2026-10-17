// Independent synthetic encoder: literal layout, BigInt checksum, no decoder imports.
export function addHallOfFame(save, teams = []) {
  const out = save.slice();
  const payload = new Uint8Array(7936), v = new DataView(payload.buffer);
  for (const [teamIndex, team] of teams.entries()) for (const [slot, pokemon] of team.entries()) {
    if (!pokemon) continue;
    const start = teamIndex * 120 + slot * 20;
    v.setUint32(start, pokemon.otId ?? 0, true);
    v.setUint32(start + 4, pokemon.personality ?? 0, true);
    v.setUint16(start + 8, (pokemon.species ?? 1) + (pokemon.level ?? 50) * 512, true);
    payload.fill(255, start + 10, start + 20);
    payload.set(pokemon.nickname ?? [187, 188, 189], start + 10);
  }
  for (let i = 0; i < 2; i++) {
    const sector = out.subarray((28 + i) * 4096, (29 + i) * 4096);
    sector.fill(0);
    sector.set(payload.subarray(i * 3968, (i + 1) * 3968));
    const footer = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
    let sum = 0n;
    for (let p = 0; p < 3968; p += 4) sum += BigInt(footer.getUint32(p, true));
    sum &= 4294967295n;
    footer.setUint16(4084, Number(((sum >> 16n) + (sum & 65535n)) & 65535n), true);
    footer.setUint32(4088, 134291493, true);
  }
  return out;
}
