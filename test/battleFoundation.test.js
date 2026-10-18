import test from 'node:test';
import assert from 'node:assert/strict';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {frontierBrainPokemon} from '../src/battle/data/frontierBrains.js';
import {speciesByName, reference, profile, battleMove} from '../src/battle/reference.js';
import {emeraldStat, ivNatures} from '../src/battle/stats.js';
import {calculateBasicDamage} from '../src/battle/basicDamage.js';
import {toTowerOpponent} from '../src/battle/frontierAdapter.js';
import {createTowerRules, towerOpponentIVs, towerBrainSets, towerTrainerSets, trainerKey, selectTowerTrainer, freshBattleConditions, domeOrdinaryOpponentIVs} from '../src/battle/towerRules.js';
import {toBattlePokemon, frontierPokemonPool} from '../src/battle/pokemonAdapter.js';
import {readPokemon} from '../src/save/readPokemon.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {makePokemon} from './fixtures/synthetic.js';

test('Frontier counts, identifiers and every trainer association survive migration', () => {
  assert.equal(frontierPokemon.length, 882);
  assert.equal(frontierTrainers.length, 300);
  assert.equal(frontierBrainPokemon.length, 42);
  assert.equal(towerBrainSets.length, 6);
  const ids = new Set(frontierPokemon.map(set => set.id));
  assert.equal(ids.size, 882);
  assert.equal(new Set(frontierTrainers.map(trainerKey)).size, 300);
  for (const trainer of frontierTrainers) {
    assert.ok(trainer.pokemonSetIds.length);
    assert.ok([3,6,9,12,15,18,21,31].includes(trainer.ivs));
    for (const id of trainer.pokemonSetIds) assert.ok(ids.has(id), id);
  }
  assert.equal(new Set(frontierPokemon.map(set => set.species)).size, 376);
  assert.ok(frontierPokemon.filter(set => set.species === 'Snorlax').length > 1);
});

test('all migrated sets resolve species, moves, abilities, items, natures and EV fields', () => {
  const itemKey = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  const items = new Set(Object.values(profile.itemNames).map(itemKey));
  for (const set of [...frontierPokemon, ...frontierBrainPokemon]) {
    const species = speciesByName.get(set.species.toLowerCase());
    assert.ok(species, set.species);
    assert.ok(ivNatures.includes(set.nature));
    assert.ok(items.has(itemKey(set.item)), set.item);
    for (const name of set.moves) assert.ok(battleMove(name), name);
    const abilities = species.abilities.map(id => reference.abilityNames[id]);
    for (const ability of set.possibleAbility.split(' / ')) assert.ok(abilities.includes(ability), `${set.species}: ${ability}`);
    assert.deepEqual(Object.keys(set.evs).sort(), ['hp','atk','def','spa','spd','spe'].sort());
    for (const ev of Object.values(set.evs)) assert.ok(Number.isInteger(ev) && ev >= 0 && ev <= 255);
    const total = Object.values(set.evs).reduce((sum, value) => sum + value, 0);
    assert.equal(total, set.brainSet === 'Lucy Silver' && set.species === 'Shuckle' ? 610 : 510);
  }
});

test('Tucker Silver abilities corrected; cartridge Shuckle anomaly deliberately preserved', () => {
  assert.deepEqual(frontierBrainPokemon.filter(set => set.brainSet === 'Tucker Silver').map(set => set.possibleAbility), ['Torrent','Intimidate','Blaze']);
  const shuckle = frontierBrainPokemon.find(set => set.brainSet === 'Lucy Silver' && set.species === 'Shuckle');
  assert.deepEqual(shuckle.evs, {hp:252, atk:0, def:0, spa:106, spd:252, spe:0});
  assert.throws(() => toTowerOpponent(shuckle), /unsupported/);
});

test('Tower level rules accept each manual Open Level and reject invalid values', () => {
  assert.deepEqual(createTowerRules(), {facility:'Tower',format:'Singles',teamSize:3,levelMode:'50',openLevel:60,opponentLevel:50});
  for (let level = 60; level <= 100; level++) {
    const rules = createTowerRules({levelMode:'open',openLevel:level});
    const mon = toTowerOpponent(frontierPokemon[0], rules);
    assert.equal(mon.level, level);
    assert.equal(mon.stats.hp, Math.floor(154 * level / 100) + level + 10); // 2*30 + IV31 + floor(255/4).
  }
  for (const openLevel of [59,101,60.5,'60',null,NaN]) assert.throws(() => createTowerRules({levelMode:'open',openLevel}));
  assert.throws(() => createTowerRules({levelMode:'100'}));
  assert.equal(toTowerOpponent(frontierPokemon[0],createTowerRules({openLevel:99})).level,50);
});

test('trainer IVs, explicit fallback, fixed Anabel IVs and future Dome exception', () => {
  assert.deepEqual(towerOpponentIVs(), {value:31,source:'assumption',assumed:true});
  for (const trainer of frontierTrainers) assert.deepEqual(towerOpponentIVs(trainerKey(trainer)), {value:trainer.ivs,source:'trainer',assumed:false});
  assert.equal(towerOpponentIVs('Anabel',towerBrainSets[0]).value,24);
  assert.equal(towerOpponentIVs('Anabel',towerBrainSets[3]).value,31);
  assert.equal(toTowerOpponent(frontierPokemon[0],createTowerRules(),trainerKey(frontierTrainers[0])).ivs.hp,3);
  assert.throws(() => towerOpponentIVs('missing'));
  assert.throws(() => towerOpponentIVs('Anabel'));
  assert.equal(domeOrdinaryOpponentIVs(),3);
});

test('Tower pool resolution retains trainer associations and excludes other Brains', () => {
  for (const trainer of frontierTrainers) assert.deepEqual(towerTrainerSets(trainerKey(trainer)).map(set => set.id),trainer.pokemonSetIds);
  assert.deepEqual(towerTrainerSets('Anabel'),towerBrainSets);
  assert.equal(towerTrainerSets().length,888);
  assert.throws(() => towerTrainerSets('Tucker'));
  const trainer = frontierTrainers[0];
  const outside = frontierPokemon.find(set => !trainer.pokemonSetIds.includes(set.id));
  assert.throws(() => toTowerOpponent(outside,createTowerRules(),trainerKey(trainer)),/does not belong/);
  assert.throws(() => toTowerOpponent(towerBrainSets[0],createTowerRules(),trainerKey(trainer)),/does not belong/);
  for (const set of towerTrainerSets()) {
    const mon = toTowerOpponent(set);
    assert.ok(Object.values(mon.stats).every(value => Number.isInteger(value) && value > 0));
    assert.ok(mon.moves.every(Boolean));
  }
});

test('damage uses each chosen opponent level while retaining Gen 3 STAB and rounding', () => {
  const defender = {level:50,types:['NORMAL'],ability:'None',item:'None',stats:{hp:999,attack:100,defense:100,spAttack:100,spDefense:100}};
  for (const level of [50,...Array.from({length:41},(_,i) => i+60)]) {
    const rules = createTowerRules(level === 50 ? {} : {levelMode:'open',openLevel:level});
    const opponent = {...toTowerOpponent(frontierPokemon[0],rules),types:['NORMAL'],ability:'None',item:'None',stats:{...defender.stats}};
    const result = calculateBasicDamage({name:'Test',type:'NORMAL',power:100,effect:'HIT'},opponent,defender);
    const base = Math.floor(Math.floor(100*100*(Math.floor(2*level/5)+2)/100)/50)+2;
    assert.equal(result.max,Math.floor(base*1.5));
    assert.equal(result.min,Math.floor(Math.floor(base*1.5)*.85));
  }
});

test('trainer selection preserves player team/rules and all temporary conditions', () => {
  const team = ['a','b','c'], rules = createTowerRules({levelMode:'open',openLevel:77});
  const state = {team,active:'b',rules,opponents:['old'],enemy:'old',hpByPokemon:{old:1},conditionsByPokemon:{old:{status:'burn',stages:{attack:6}}},field:{weather:'rain',critical:true,playerScreens:{reflect:true},enemyScreens:{lightScreen:true}}};
  const next = selectTowerTrainer(state,trainerKey(frontierTrainers[0]));
  assert.equal(next.team,team); assert.equal(next.rules,rules); assert.equal(next.active,'b');
  assert.deepEqual(next.opponents,[]); assert.equal(next.enemy,null);
  for (const key of ['field','hpByPokemon','conditionsByPokemon']) assert.equal(next[key],state[key]);
  assert.equal(state.hpByPokemon.old,1);
  assert.equal(selectTowerTrainer(next,null).field,next.field);
});

const parsed = (options = {}) => ({...readPokemon(makePokemon(options)),source:{kind:options.party ? 'party':'box',slot:0}});
const identified = options => identifyPokemon([parsed(options)])[0];

test('2.0 party adapter preserves actual stats, identity, moves and zero friendship', () => {
  const record = identified({party:true,friendship:0});
  const before = structuredClone(record), mon = toBattlePokemon(record);
  assert.ok(mon); assert.equal(mon.identity,record.identity);
  assert.deepEqual(mon.stats,record.recorded.stats); assert.equal(mon.level,record.recorded.level);
  assert.equal(mon.ability,record.ability.name); assert.equal(mon.item,profile.itemNames[record.heldItemId]);
  assert.deepEqual(mon.ivs,record.ivs); assert.deepEqual(mon.evs,record.evs);
  assert.equal(mon.friendship,0); assert.equal(mon.moves[0].id,33);
  assert.equal(mon.moves[0].currentPp,17); assert.equal(mon.moves[0].pp,record.moves[0].maxPp);
  assert.equal(mon.moves[1],null); assert.equal(mon.status,'none'); assert.equal(mon.currentHp,mon.stats.hp);
  mon.stats.hp = 1; assert.deepEqual(record,before);
});

test('PC and Day Care use parser-calculated stats without selected-level rescaling', () => {
  for (const kind of ['box','daycare']) {
    const record = identified(); record.source.kind = kind;
    const mon = toBattlePokemon(record);
    assert.deepEqual(mon.stats,record.calculated.stats); assert.equal(mon.level,record.calculated.level);
    const low = toTowerOpponent(frontierPokemon[0]);
    const high = toTowerOpponent(frontierPokemon[0],createTowerRules({levelMode:'open',openLevel:100}));
    assert.ok(high.stats.hp > low.stats.hp);
    assert.deepEqual(mon.stats,record.calculated.stats);
    assert.ok(calculateBasicDamage(mon.moves[0],mon,low));
  }
});

test('Frontier role pool uses full-collection occurrence identities for same species and clones', () => {
  const records = [parsed(),parsed(),parsed({pid:1})];
  const ids = identifyPokemon(records).map(record => record.identity);
  const pool = frontierPokemonPool(records,{[ids[1]]:'Frontier',[ids[2]]:'Frontier'});
  assert.deepEqual(pool.map(mon => mon.identity),ids.slice(1));
  assert.notEqual(pool[0].identity,pool[1].identity);
  assert.deepEqual(frontierPokemonPool(records,{}),[]);
});

test('missing, egg, corrupt and malformed player records never produce guessed battle stats', () => {
  for (const record of [null,{},identified({egg:true}),{...identified(),identity:undefined},{...identified(),checksumValid:false},
    {...identified(),internalSpeciesId:999},{...identified(),ivs:null},{...identified(),nature:'invalid'},
    {...identified(),ability:{id:22,name:'Intimidate'}},{...identified(),calculated:null},
    {...identified(),moves:[{id:999},null,null,null]}, {...identified(),heldItemId:9999},
    {...identified(),calculated:{level:101,stats:identified().calculated.stats}}]) assert.equal(toBattlePokemon(record),null);
});

test('migrated nature/stat math retains known values and Shedinja override', () => {
  assert.equal(emeraldStat(100,'attack',31,252,50,'Adamant'),167);
  assert.equal(emeraldStat(100,'attack',31,252,50,'Modest'),136);
  assert.equal(emeraldStat(1,'hp',31,252,100,'Hardy',true),1);
  const shedinja = frontierPokemon.find(set => set.species === 'Shedinja');
  assert.equal(toTowerOpponent(shedinja).stats.hp,1);
});
