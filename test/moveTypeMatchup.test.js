import test from 'node:test';
import assert from 'node:assert/strict';
import {moveTypeMatchup} from '../src/battle/moveTypeMatchup.js';
import {battleMoveEffectiveness} from '../src/battle/battleMoveEffectiveness.js';
import {battleMove} from '../src/battle/reference.js';

test('row indicators use all six standard Gen III type multipliers', () => {
  for (const [attack,defenders,label] of [
    ['GROUND',['FLYING','ROCK'],'0×'], ['FIRE',['WATER','DRAGON'],'0.25×'],
    ['FIRE',['WATER'],'0.5×'], ['ICE',['NORMAL'],'1×'],
    ['FIRE',['GRASS'],'2×'], ['FIRE',['GRASS','STEEL'],'4×'],
    ['GHOST',['STEEL'],'0.5×'], ['DARK',['STEEL'],'0.5×'],
  ]) assert.equal(moveTypeMatchup({type:attack,power:80},defenders).label,label);
  assert.equal(moveTypeMatchup(battleMove('Growl'),['GHOST']).label,'—');
  assert.equal(moveTypeMatchup(battleMove('Seismic Toss'),['GHOST']).label,'0×','fixed-damage moves still show only their type matchup');
  assert.equal(moveTypeMatchup(battleMove('Ice Beam'),null).label,'—');
});

test('display applies supported known immunities without changing the damage-aware helper', () => {
  for (const [name,types,ability,chart,damageAware] of [
    ['Ice Beam',['NORMAL'],'Thick Fat','1×','.5×'],
    ['Ice Beam',['NORMAL'],'Immunity','1×','1×'],
    ['Earthquake',['GHOST','POISON'],'Levitate','0×','0×'],
    ['Surf',['BUG','GHOST'],'Wonder Guard','0×','0×'],
  ]) {
    const move=battleMove(name),defender={types,ability,item:'Leftovers',weather:'sun'};
    assert.equal(moveTypeMatchup(move,defender.types,undefined,[ability]).label,chart);
    assert.equal(battleMoveEffectiveness(move,defender).label,damageAware);
  }
  assert.equal(moveTypeMatchup(battleMove('Weather Ball'),['GHOST']).label,'0×','weather never changes the indicator type');
});

test('opponent immunity requires every possible ability to guarantee it', () => {
  for (const [move,types,abilities,label] of [
    ['Earthquake',['GHOST','POISON'],['Levitate'],'0×'],
    ['Surf',['WATER'],['Water Absorb'],'0×'],
    ['Surf',['WATER','GROUND'],['Damp','Water Absorb'],'1×'],
    ['Thunderbolt',['WATER'],['Volt Absorb'],'0×'],
    ['Flamethrower',['FIRE'],['Flash Fire'],'0×'],
    ['Surf',['NORMAL'],['Water Absorb','Wonder Guard'],'0×'],
    ['Flamethrower',['BUG','GHOST'],['Wonder Guard'],'2×'],
    ['Ice Beam',['NORMAL'],['Thick Fat','Immunity'],'1×'],
    ['Hyper Voice',['NORMAL'],['Soundproof'],'0×'],
    ['Earthquake',['GHOST','POISON'],[],'2×'],
    ['Surf',['NORMAL'],['Water Absorb',''],'1×'],
  ]) assert.equal(moveTypeMatchup(battleMove(move),types,undefined,abilities).label,label);
  assert.equal(moveTypeMatchup(battleMove('Growl'),['NORMAL'],undefined,['Wonder Guard']).label,'—');
});

test('Hidden Power uses its known Gen III type without inventing unknown opponent IVs', () => {
  const ivs=Object.fromEntries(['hp','attack','defense','speed','spAttack','spDefense'].map(key=>[key,31]));
  assert.equal(moveTypeMatchup(battleMove('Hidden Power'),['PSYCHIC'],ivs).label,'2×');
  assert.equal(moveTypeMatchup(battleMove('Hidden Power'),['PSYCHIC']).label,'—');
});

test('Gen III Soundproof blocks damaging sound moves only when guaranteed', () => {
  for (const name of ['Hyper Voice','Uproar','Snore']) {
    const move = battleMove(name);
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,['Soundproof']).label,'0×');
    assert.equal(moveTypeMatchup(move,['ROCK'],undefined,['Sturdy']).label,'0.5×');
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,['Soundproof','Static']).label,'1×');
  }
  for (const name of ['Growl','Roar','Sing','Supersonic','Screech','Metal Sound','GrassWhistle']) {
    assert.equal(moveTypeMatchup(battleMove(name),['NORMAL'],undefined,['Soundproof']).label,'—',name);
  }
  assert.equal(moveTypeMatchup(battleMove('Tackle'),['NORMAL'],undefined,['Soundproof']).label,'1×');
});

test('Damp prevents both explosion moves from either tracked active side', () => {
  for (const name of ['Self Destruct','Explosion']) {
    const move = battleMove(name);
    for (const [defender,attacker,expected] of [
      [['Damp'],[],'0×'], [[],['Damp'],'0×'],
      [['Damp','Water Absorb'],[],'1×'], [[],['Damp','Water Absorb'],'1×'],
      [['Damp','Water Absorb'],['Damp'],'0×'], [[],[],'1×'],
    ]) assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,defender,attacker).label,expected,name);
  }
  // Different possible abilities may each guarantee prevention by different rules.
  assert.equal(moveTypeMatchup(battleMove('Explosion'),['NORMAL'],undefined,['Damp','Wonder Guard']).label,'0×');
  assert.equal(moveTypeMatchup(battleMove('Surf'),['NORMAL'],undefined,['Damp'],['Damp']).label,'1×');
});

test('Gen III Sturdy blocks exactly the four OHKO moves; Damp does not', () => {
  for (const name of ['Fissure','Guillotine','Horn Drill','Sheer Cold']) {
    const move = battleMove(name);
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,['Sturdy']).label,'0×',name);
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,['Sturdy','Rock Head']).label,'1×',name);
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,['Damp'],['Damp']).label,'1×',name);
    assert.equal(moveTypeMatchup(move,['NORMAL'],undefined,[],['Sturdy']).label,'1×',name);
  }
  for (const name of ['Tackle','Earthquake','Ice Beam','Explosion']) {
    assert.equal(moveTypeMatchup(battleMove(name),['NORMAL'],undefined,['Sturdy']).label,'1×',name);
  }
});
