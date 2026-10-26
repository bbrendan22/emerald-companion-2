// Read-only audit: node tools/verifyTowerRoundData.mjs /path/to/pret/pokeemerald
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {towerTrainerIds} from '../src/battle/towerTrainerIds.js';
const root=process.argv[2];
if(!root)throw Error('Supply a local pret/pokeemerald source checkout.');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const trainers=read('src/data/battle_frontier/battle_frontier_trainers.h');
const constants=read('include/constants/battle_frontier_trainers.h');
const mons=read('include/constants/battle_frontier_mons.h');
const ids=Object.fromEntries([...constants.matchAll(/#define (FRONTIER_TRAINER_\w+)\s+(\d+)/g)].map(m=>[m[1],+m[2]]));
const expanded=spawnSync('clang',['-E','-P','-x','c','-include',path.join(root,'include/constants/battle_frontier_mons.h'),path.join(root,'src/data/battle_frontier/battle_frontier_trainer_mons.h')],{encoding:'utf8'});
assert.equal(expanded.status,0,expanded.stderr);
const rosters=Object.fromEntries([...expanded.stdout.matchAll(/const u16 (\w+)\[\] =\s*\{([^}]+)\}/g)].map(m=>[m[1],m[2].split(',').filter(x=>x.trim()).map(x=>Number(x.trim())).filter(x=>Number.isFinite(x)&&x>=0&&x!==65535)]));
const canonical=[...trainers.matchAll(/\[(FRONTIER_TRAINER_\w+)\] = \{\s*\.facilityClass = (\w+),\s*\.trainerName = _\("([^"]+)"\)[\s\S]*?\.monSet = (\w+)/g)].map(m=>({id:ids[m[1]],name:m[3],cls:m[2],roster:rosters[m[4]]}));
const monByEntry=new Map(frontierPokemon.map(p=>[p.entry-1,p.id]));
const mapped=[];
for(const trainer of frontierTrainers){
  const key=`${trainer.trainerClass}:${trainer.name}`;
  // Full exact roster disambiguates duplicate display names; no array-index mapping.
  const matches=canonical.filter(c=>c.name===trainer.name&&c.roster.length===trainer.pokemonSetIds.length&&c.roster.every(id=>trainer.pokemonSetIds.includes(monByEntry.get(id))));
  assert.equal(matches.length,1,key);
  assert.equal(towerTrainerIds[key],matches[0].id,key);
  mapped.push(matches[0].id);
}
assert.equal(mapped.length,300);assert.equal(new Set(mapped).size,300);
const norm=s=>s.toUpperCase().replace('♂','M').replace('♀','F').replace(/[^A-Z0-9]/g,'');
const monConstants=[...mons.matchAll(/#define FRONTIER_MON_(\w+)\s+(\d+)/g)];
assert.equal(monConstants.length,882);
for(const m of monConstants){
  const set=frontierPokemon.find(p=>p.entry===+m[2]+1);
  assert.ok(set,m[1]);
  assert.equal(norm(set.species),norm(m[1].replace(/_\d+$/,'')),m[1]);
  assert.equal(set.instance,Number(m[1].match(/_(\d+)$/)?.[1]??1),m[1]);
}
console.log('PASS canonical audit: 300 unique trainer IDs and exact rosters; 882 species/variant set IDs.');
