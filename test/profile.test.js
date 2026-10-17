import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {hiddenPower,typeMatchups,pokerusState,earnedRibbons,profileStats,profileData} from '../src/pokemon/profile.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {makePokemon} from './fixtures/synthetic.js';
const keys=['hp','attack','defense','speed','spAttack','spDefense'];
const spread=n=>Object.fromEntries(keys.map(k=>[k,n]));
test('Gen 3 Hidden Power uses the correct stat order and both IV bits',()=>{
  assert.deepEqual(hiddenPower(spread(0)),{type:'fighting',power:30});
  assert.deepEqual(hiddenPower(spread(31)),{type:'dark',power:70});
  assert.deepEqual(hiddenPower(spread(30)),{type:'fighting',power:70});
  assert.deepEqual(hiddenPower({...spread(31),attack:30,defense:30}),{type:'ice',power:70});
  assert.deepEqual(hiddenPower({...spread(0),speed:1}),{type:'flying',power:30});
  assert.deepEqual(hiddenPower({...spread(0),spDefense:2}),{type:'fighting',power:50});
  assert.equal(hiddenPower({...spread(31),hp:32}),null);
  assert.equal(hiddenPower({}),null);
  // Independently assemble every 2-bit combination; 4096 patterns cover type/power inputs.
  const types=['fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark'];
  for(let typeBits=0;typeBits<64;typeBits++) for(let powerBits=0;powerBits<64;powerBits++) {
    const ivs=Object.fromEntries(keys.map((k,i)=>[k,((typeBits>>i)&1)+2*((powerBits>>i)&1)]));
    assert.deepEqual(hiddenPower(ivs),{type:types[Math.trunc(typeBits*15/63)],power:Math.trunc(powerBits*40/63)+30});
  }
});
test('Gen 3 matchups multiply dual types and retain pre-Gen-6 Steel resistances',()=>{
  const chart=types=>Object.fromEntries(typeMatchups(types).map(m=>[m.type,m.multiplier]));
  const swampert=chart(['water','ground']);
  assert.equal(swampert.grass,4);assert.equal(swampert.electric,0);assert.equal(swampert.fire,.5);
  const metagross=chart(['steel','psychic']);
  assert.equal(metagross.ghost,1);assert.equal(metagross.dark,1);assert.equal(metagross.psychic,.25);assert.equal(metagross.poison,0);
  assert.equal(chart(['steel']).dark,.5);assert.equal(chart(['steel']).ghost,.5);
  assert.equal(chart(['normal','flying']).ghost,0);assert.equal(chart(['normal','flying']).ground,0);
  assert.equal(chart(['fire','fire']).water,2);
  assert.equal(typeMatchups(['water']).length,17);
});
test('Pokérus distinguishes never, active, and cured from strain and days',()=>{
  assert.equal(pokerusState(0),'Never infected');assert.equal(pokerusState(0x21),'Active');assert.equal(pokerusState(0x20),'Cured');assert.equal(pokerusState(null),'Unavailable');
});
test('ribbon bits decode cumulative contest ranks and special ribbons without treating flags as awards',()=>{
  assert.deepEqual(earnedRibbons(0),[]);
  const ribbons=earnedRibbons(4|(2<<3)|(1<<15)|(1<<24)|(1<<26)|(1<<31));
  assert.equal(ribbons.length,9);
  assert.deepEqual(ribbons.slice(0,4).map(r=>r.name),['Cool Normal Ribbon','Cool Super Ribbon','Cool Hyper Ribbon','Cool Master Ribbon']);
  assert.ok(ribbons.some(r=>r.name==='National Ribbon'));
  assert.ok(ribbons.some(r=>r.name==='World Ribbon'));
  assert.ok(!ribbons.some(r=>r.name.includes('Fateful')));
  for(const r of earnedRibbons((4|(4<<3)|(4<<6)|(4<<9)|(4<<12)|0x7ff8000)>>>0)) assert.ok(existsSync(new URL(`../public/ribbons/${r.file}.png`,import.meta.url)));
  assert.deepEqual(earnedRibbons(7),[]);
});
test('profile stats prefer recorded party values, identify calculations, and never invent PC HP',()=>{
  const party={...readPokemon(makePokemon({party:true})),source:{kind:'party',slot:0}};
  assert.equal(profileStats(party).values,party.recorded.stats);
  assert.equal(profileStats(party).currentHp,12);
  const box={...readPokemon(makePokemon()),source:{kind:'box',box:0,slot:0}};
  assert.equal(profileStats(box).values,box.calculated.stats);assert.equal(profileStats(box).currentHp,null);
  assert.match(profileStats({...box,source:{kind:'daycare',slot:0}}).description,/deposit/);
  assert.equal(profileStats({...box,isEgg:true}).values,null);
});
test('profile names, move types, PP, items and base stats come from Gen 3 data',()=>{
  const p={...readPokemon(makePokemon()),source:{kind:'box',box:0,slot:0}};
  const data=profileData(p);
  assert.equal(data.heldItem,'Potion');assert.equal(data.moves[0].name,'Tackle');assert.equal(data.moves[0].type,'normal');assert.equal(data.moves[0].maxPp,42);
  assert.equal(data.moves[1].id,0);assert.deepEqual(data.types,['grass','poison']);assert.equal(data.baseStats.hp,45);
  const hidden=profileData({...p,moves:[{id:237,slot:0}]});assert.equal(hidden.moves[0].type,hidden.hiddenPower.type);
  assert.equal(profileData({...p,heldItemId:0}).heldItem,'None');
  assert.match(profileData({...p,heldItemId:999}).heldItem,/Unknown item/);
  assert.equal(profileData({...p,ribbons:{raw:7,contestRanks:[7,0,0,0,0]}}).invalidRibbonRanks,true);
});
test('Curse retains Gen 3 mystery typing; physical/special modern retyping is not applied',()=>{
  const p={...readPokemon(makePokemon()),source:{kind:'box',box:0,slot:0}};
  const data=profileData({...p,moves:[{id:174,slot:0},{id:44,slot:1},{id:16,slot:2},{id:2,slot:3}]});
  assert.deepEqual(data.moves.map(m=>m.type),['mystery','dark','flying','fighting']);
});
test('ribbon collection catalog contains exactly the 32 Gen 3 awards in stable decoder order',async()=>{
  const {ribbonCatalog}=await import('../src/pokemon/profile.js');
  assert.equal(ribbonCatalog.length,32);
  assert.equal(new Set(ribbonCatalog.map(r=>r.file)).size,32);
  const expected=[];
  for(const category of ['Cool','Beauty','Cute','Smart','Tough']) for(const rank of ['Normal','Super','Hyper','Master']) expected.push(`${category} ${rank} Ribbon`);
  expected.push(...['Champion','Winning','Victory','Artist','Effort','Marine','Land','Sky','Country','National','Earth','World'].map(name=>`${name} Ribbon`));
  assert.deepEqual(ribbonCatalog.map(r=>r.name),expected);
  for(const r of ribbonCatalog)assert.ok(existsSync(new URL(`../public/ribbons/${r.file}.png`,import.meta.url)));
  assert.equal(earnedRibbons(0).length,0);
  for(const bit of [15,16,17,18,19,20,21,22,23,24,25,26])assert.deepEqual(earnedRibbons(2**bit),[ribbonCatalog[20+bit-15]]);
});
