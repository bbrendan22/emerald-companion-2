import test from 'node:test';
import assert from 'node:assert/strict';
import {moveTutorLists, moveTutorTabs, moveTutorNotes} from '../src/resources/charts/moveTutors.js';
import {tutorResources} from '../src/resources/learnset/data/tutorResources.js';
import {crossGameMoves} from '../src/resources/learnset/data/crossGameMoves.js';
import reference from '../src/data/reference.json' with {type:'json'};

const ids = rows => rows.map(row=>row.moveId).sort((a,b)=>a-b);
test('All three Gen 3 lists are complete, unique and use canonical move names', () => {
  assert.deepEqual(moveTutorTabs.map(tab=>tab.label),['Emerald','Battle Frontier','FRLG']);
  assert.deepEqual(ids(moveTutorLists.emerald),[38,102,118,153,164,205,207,210,214,223]);
  assert.deepEqual(ids(moveTutorLists.emerald),ids(tutorResources.filter(tutor=>!tutor.repeatable)));
  assert.deepEqual(ids(moveTutorLists.frontier),ids(tutorResources.filter(tutor=>tutor.repeatable)));
  const frlg=new Set(Object.values(crossGameMoves).flat().filter(entry=>entry.method.toLowerCase().includes('tutor')&&entry.game==='FireRed / LeafGreen').map(entry=>entry.move));
  assert.deepEqual(ids(moveTutorLists.frlg),[...frlg].sort((a,b)=>a-b));
  assert.equal(moveTutorLists.frontier.length,20);assert.equal(moveTutorLists.frlg.length,18);
  for(const rows of Object.values(moveTutorLists)) {
    assert.equal(new Set(rows.map(row=>row.moveId)).size,rows.length);
    for(const row of rows) {assert.equal(row.name,reference.moves[row.moveId].name);assert.ok(row.location);assert.equal('species' in row,false);}
  }
  assert.ok(!moveTutorLists.emerald.some(row=>moveTutorLists.frontier.some(other=>other.moveId===row.moveId)));
});

test('All twenty BP prices and left/right tutor assignments match Lounge7 scripts', () => {
  const left=[[135,16],[69,24],[138,24],[5,24],[25,48],[34,48],[157,48],[68,48],[86,48],[14,48]];
  const right=[[111,16],[173,24],[189,24],[129,24],[196,24],[203,48],[244,48],[8,48],[9,48],[7,48]];
  for(const [side,expected] of [['Left tutor',left],['Right tutor',right]]) {
    const rows=moveTutorLists.frontier.filter(row=>row.side===side);
    assert.deepEqual(rows.map(row=>[row.moveId,row.cost]).sort((a,b)=>a[0]-b[0]),expected.sort((a,b)=>a[0]-b[0]));
    assert.deepEqual(rows.map(row=>row.name),rows.map(row=>row.name).sort((a,b)=>a.localeCompare(b,'en')));
  }
});

test('Verified locations and FRLG restrictions retain meaningful identifying details', () => {
  const location=(list,id)=>moveTutorLists[list].find(row=>row.moveId===id).location;
  const emerald={38:'Sootopolis',102:'Lavaridge',118:'Fallarbor',153:'Pacifidlog',164:'Lilycove',205:'Mauville',207:'Slateport',210:'Verdanturf',214:'Fortree',223:'Mossdeep'};
  for(const [id,town] of Object.entries(emerald)) assert.ok(location('emerald',Number(id)).startsWith(town));
  assert.match(location('emerald',118),/Poké Mart/);
  const frlg={5:'Route 4',25:'Route 4',69:'Pewter',157:'Rock Tunnel',68:'Celadon',135:'Celadon',102:'Saffron',86:'Saffron',164:'Fuchsia',138:'Viridian',118:'Cinnabar',38:'Victory Road',153:'Mt. Ember',338:'Two Island',307:'Two Island',308:'Two Island',34:'Four Island',14:'Seven Island'};
  for(const [id,town] of Object.entries(frlg)) assert.ok(location('frlg',Number(id)).startsWith(town));
  assert.match(location('frlg',38),/2F/);assert.match(location('frlg',86),/Silph Co., 2F/);
  assert.match(location('frlg',68),/Department Store, 3F/);assert.match(location('frlg',102),/Poké Doll/);
  assert.match(moveTutorNotes.frlg,/each move once per save/);assert.match(moveTutorNotes.frlg,/maximum friendship/);
});
