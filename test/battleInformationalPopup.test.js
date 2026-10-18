import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {movePopupValues} from '../src/battle/matchupPresentation.js';
import {battleMove} from '../src/battle/reference.js';

test('informational popup keeps reference metadata for damaging, status and special moves',()=>{
 assert.deepEqual(movePopupValues(battleMove('Water Pulse')), {power:60,accuracy:'100%',effect:'20%',type:'WATER'});
 assert.equal(movePopupValues(battleMove('Growl')).power,'—');
 assert.equal(movePopupValues(battleMove('Counter')).power,'2× received');
 assert.equal(movePopupValues(battleMove('Guillotine')).accuracy,'Level-based');
});
test('active application import graph cannot execute the retired preview, KO or damage engine',()=>{
 const seen=new Set();
 function visit(file){
  file=resolve(file);if(seen.has(file))return;seen.add(file);
  const source=readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g)){
   if(!match[1].startsWith('.'))continue;
   const dependency=resolve(dirname(file),match[1]);
   if(/\.[cm]?[jt]sx?$/.test(dependency)&&existsSync(dependency))visit(dependency);
  }
 }
 visit('src/ui/App.jsx');
 for(const file of seen)assert.doesNotMatch(file,/(?:BattleDamageResults|damagePreview|koProbability|battleDamage|battleRetaliation)\.[jt]sx?$/);
 const popup=readFileSync('src/ui/components/BattleMoveDetails.jsx','utf8');
 assert.doesNotMatch(popup,/BattleDamageResults|battle-damage|useMemo/);
 assert.match(popup,/onPointerDown/);assert.match(popup,/onCancel/);
});
