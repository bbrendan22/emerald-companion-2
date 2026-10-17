// Verified against pret/pokeemerald: global.h SaveBlock1.flags (0x1270),
// constants/flags.h (0x8C4–0x8D1), event_data.c FlagGet, and
// frontier_util.c GiveFacilitySymbol. See docs/SAVE_PARSER.md for exact bits.
const facilities = [
  ['tower', 'Battle Tower', 'Ability'],
  ['dome', 'Battle Dome', 'Tactics'],
  ['palace', 'Battle Palace', 'Spirits'],
  ['arena', 'Battle Arena', 'Guts'],
  ['factory', 'Battle Factory', 'Knowledge'],
  ['pike', 'Battle Pike', 'Luck'],
  ['pyramid', 'Battle Pyramid', 'Brave'],
];

export function readFrontierSymbols({blocks: {saveBlock1}}) {
  if (saveBlock1.length !== 0x3d88) throw new Error('Expected validated Emerald save block');
  const hasFlag = id => Boolean(saveBlock1[0x1270 + (id >>> 3)] & (1 << (id & 7)));
  const symbols = facilities.map(([id, facility, symbol], index) => {
    const silver = hasFlag(0x8c4 + index * 2);
    const gold = hasFlag(0x8c5 + index * 2);
    return {id, facility, symbol, silver, gold, status: gold ? 'gold' : silver ? 'silver' : 'unearned'};
  });
  return {symbols, silverCount: symbols.filter(s => s.silver).length, goldCount: symbols.filter(s => s.gold).length};
}
