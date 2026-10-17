import test from 'node:test';
import assert from 'node:assert/strict';
import {loadShowcase, storeShowcase, changeShowcaseSlot, emptyShowcase, showcaseSlots, showcaseKey} from '../src/storage/trainerShowcase.js';
import {importSave} from '../src/storage/saveStorage.js';
import {makeSave} from './fixtures/synthetic.js';
const memory = () => {const data = new Map(); return {getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v)};};
test('six independent decorative selections restore normal/shiny and allow repeated species', () => {
 const storage=memory(), slots=Array.from({length:6},(_,i)=>({nationalDexId:i<2?386:i+1,shiny:i%2===0}));
 assert.equal(loadShowcase(storage),null);
 storeShowcase(storage,slots);assert.deepEqual(loadShowcase(storage),slots);
 const next=changeShowcaseSlot(slots,1,{nationalDexId:386,shiny:true});storeShowcase(storage,next);
 assert.equal(loadShowcase(storage)[1].shiny,true);assert.equal(slots[1].shiny,false);
});
test('clearing a slot and resetting persist empty custom positions without party refill', () => {
 const storage=memory();const slots=changeShowcaseSlot(null,2,{nationalDexId:25,shiny:false});
 storeShowcase(storage,slots);assert.deepEqual(loadShowcase(storage),slots);
 storeShowcase(storage,changeShowcaseSlot(slots,2,null));assert.deepEqual(loadShowcase(storage),emptyShowcase());
 storeShowcase(storage,Array(6).fill({nationalDexId:1,shiny:true}));storeShowcase(storage,emptyShowcase());
 const party=[{source:{kind:'party',slot:0},nationalDexId:150,shiny:false}];
 assert.deepEqual(showcaseSlots(loadShowcase(storage),party),emptyShowcase());
});
test('invalid preferences are safely empty and malformed slots are isolated', () => {
 const storage=memory();
 for(const raw of ['invalid','null','{}','[]','[1,2,3,4,5,6]']) {storage.setItem(showcaseKey,raw);assert.deepEqual(loadShowcase(storage),emptyShowcase());}
 const raw=[{nationalDexId:0,shiny:false},{nationalDexId:387,shiny:false},{nationalDexId:1,shiny:'false'},{nationalDexId:2.5,shiny:true},null,{nationalDexId:386,shiny:true,identity:'ignored'}];
 storage.setItem(showcaseKey,JSON.stringify(raw));assert.deepEqual(loadShowcase(storage),[null,null,null,null,null,{nationalDexId:386,shiny:true}]);
 assert.throws(()=>storeShowcase(storage,raw),/Invalid/);assert.throws(()=>changeShowcaseSlot(null,6,null),/Invalid/);
});
test('showcase persists independently through save imports and does not write raw save data', () => {
 const storage=memory(),saveKey='emerald-companion-2.save.v1';importSave(makeSave(),storage);const original=storage.getItem(saveKey);
 const slots=changeShowcaseSlot(null,5,{nationalDexId:151,shiny:true});storeShowcase(storage,slots);
 assert.equal(storage.getItem(saveKey),original);importSave(makeSave({counters:[30,31]}),storage);assert.deepEqual(loadShowcase(storage),slots);
});
test('fallback retains party placement and ignores PC until customization', () => {
 const records=Array.from({length:6},(_,i)=>({source:{kind:'party',slot:i},nationalDexId:i+1,shiny:i===0,isEgg:false}));records.push({source:{kind:'box',box:0,slot:0},nationalDexId:150,shiny:true});
 assert.deepEqual(showcaseSlots(null,records).map(p=>p.nationalDexId),[1,2,3,4,5,6]);
 assert.equal(showcaseSlots(null,records.slice(0,1)).filter(Boolean).length,1);
 assert.deepEqual(showcaseSlots(emptyShowcase(),records),emptyShowcase());
});
test('failed writes preserve saved configuration', () => {
 const storage=memory();storeShowcase(storage,emptyShowcase());storage.setItem=()=>{throw new Error('Full');};
 assert.throws(()=>storeShowcase(storage,changeShowcaseSlot(null,0,{nationalDexId:25,shiny:false})),/Full/);assert.deepEqual(loadShowcase(storage),emptyShowcase());
});
