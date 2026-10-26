import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5253:5252,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4].forEach((species,pid)=>storage.set(makePokemon({species,pid}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/battle-conditions',{recursive:true});
 for(const width of [320,375,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},{encoded,roles});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const tap=async el=>width<500?el.tap():el.click();
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);await navigate('Battle');
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true}),slots=opponent.locator('.battle-compact-slot');
  const mine=page.getByRole('region',{name:'My Team',exact:true}).locator('.battle-compact-slot');
  const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true}),list=page.locator('.battle-possible-set-list > button');
  const observe=async(field,value)=>{const name=field==='item'?'Opponent held item':`Opponent move ${field+1}`;await enemy.getByRole('combobox',{name,exact:true}).selectOption(value);};
  const add=async(slot,name)=>{await tap(slots.nth(slot));const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});await popup.getByRole('searchbox').fill(name);await tap(popup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));};
  const display=async()=>({
   stats:await enemy.locator('.battle-active-stats dd').evaluateAll(els=>els.map(el=>el.dataset.value)),
   moves:await enemy.locator('.battle-active-moves .battle-observation-value').allTextContents(),
   item:await enemy.locator('.battle-active-item .battle-observation-display').innerText(),
   fields:await enemy.locator('select').evaluateAll(els=>els.map(el=>({name:el.getAttribute('aria-label'),value:el.value}))),
   sets:await list.allTextContents(),
   readonly:await enemy.locator('.battle-active-moves li').evaluateAll(rows=>rows.map(row=>!row.querySelector('select'))),
  });
  const conditions=page.getByRole('region',{name:'Battle Conditions',exact:true});
  const possible=page.getByRole('region',{name:'Possible Sets',exact:true});
  assert.equal(await page.getByText('Battle Intelligence',{exact:true}).count(),0);
  assert.equal(await conditions.count(),0);assert.equal(await possible.count(),0);
  await tap(opponent.locator('.battle-opponent-trigger'));
  await page.getByRole('dialog',{name:'Select opponent trainer'}).getByRole('searchbox').fill('VINCE');
  await tap(page.getByRole('button',{name:'Select trainer VINCE',exact:true}));
  await add(0,'Metagross');await add(1,'Gardevoir');await tap(slots.first());
  assert.equal(await possible.count(),1);assert.equal(await conditions.count(),0);
  for(const [slot,mon]of mons.entries()) {await tap(mine.nth(slot));await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mon.identity}"]`));}
  await tap(mine.first());
  const toggle=conditions.getByRole('button',{name:'Battle Conditions'});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  const matchup=()=>page.locator('.battle-matchup-pair').evaluate(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};});
  const before=await matchup();await tap(toggle);assert.deepEqual(await matchup(),before);
  assert.ok(await conditions.evaluate(el=>el.getBoundingClientRect().bottom<=document.querySelector('.battle-possible-sets').getBoundingClientRect().top));
  const input=name=>conditions.getByLabel(name,{exact:true});
  assert.equal(await input('Opponent current HP').getAttribute('placeholder'),'Full');
  assert.ok((await conditions.locator('.battle-condition-hp').nth(1).innerText()).includes('–'));
  await page.screenshot({path:`artifacts/battle-conditions/${useWebKit?'webkit':'chrome'}-full-${width}.png`,fullPage:true});
  await input('Opponent current HP').fill('45');await input('Opponent status').selectOption('toxic');
  await input('Player current HP').fill('12');await input('Player status').selectOption('burn');
  await input('Player Atk stage').selectOption('6');await input('Opponent Spe stage').selectOption('-6');
  await input('Player Reflect').check();await input('Opponent Light Screen').check();
  await input('Battle weather').selectOption('rain');await input('Critical Hit').check();
  for(const select of await conditions.locator('.battle-condition-stages select').all()) {
   assert.deepEqual(await select.locator('option').evaluateAll(els=>els.map(el=>Number(el.value))),Array.from({length:13},(_,i)=>i-6));
  }
  await tap(mine.nth(1));assert.equal(await input('Player status').inputValue(),'none');
  assert.equal(await input('Battle weather').inputValue(),'rain');
  await input('Player status').selectOption('sleep');await tap(slots.nth(1));
  await input('Opponent status').selectOption('freeze');
  await tap(conditions.getByRole('button',{name:'Reset',exact:true}));
  assert.equal(await input('Battle weather').inputValue(),'none');assert.equal(await input('Critical Hit').isChecked(),false);
  assert.equal(await input('Player status').inputValue(),'none');assert.equal(await input('Opponent status').inputValue(),'none');
  await tap(mine.first());await tap(slots.first());
  assert.equal(await input('Player current HP').inputValue(),'12');assert.equal(await input('Opponent current HP').inputValue(),'45');
  assert.equal(await input('Player Atk stage').inputValue(),'6');assert.equal(await input('Opponent Spe stage').inputValue(),'-6');
  assert.equal(await input('Player Reflect').isChecked(),false);assert.equal(await input('Opponent Light Screen').isChecked(),false);
  await observe(2,'Psychic');await observe('item','Quick Claw');
  assert.equal(await input('Opponent current HP').inputValue(),'45');
  assert.ok(!(await conditions.locator('.battle-condition-hp').nth(1).innerText()).includes('–'));
  assert.deepEqual(await list.allTextContents(),['Metagross 4']);
  await page.screenshot({path:`artifacts/battle-conditions/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  const geometry=await conditions.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,nodes:[...el.querySelectorAll('*')].filter(node=>node.scrollWidth>node.clientWidth+1).map(node=>({tag:node.tagName,cls:node.className,scroll:node.scrollWidth,client:node.clientWidth}))}));
  assert.ok(geometry.scroll<=geometry.client+1,JSON.stringify(geometry));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await conditions.evaluate(el=>{
    const style=getComputedStyle(el);
    const transparent=color=>color==='rgba(0, 0, 0, 0)' || color==='transparent';
    return transparent(style.backgroundColor) && [...el.querySelectorAll('select,input[type="number"]')].every(control=>{
      const s=getComputedStyle(control);
      return transparent(s.backgroundColor) && s.borderTopWidth==='0px';
    });
  }),'conditions and editable controls have no panel backgrounds or borders');
  assert.ok(await conditions.locator('.battle-condition-select').evaluateAll(controls=>controls.every(control=>{
    const text=control.querySelector('.battle-observation-value').getBoundingClientRect();
    const arrow=control.querySelector('.battle-observation-arrow').getBoundingClientRect();
    const box=control.getBoundingClientRect();
    return arrow.left>=text.right-1 && arrow.left-text.right<=4 && arrow.right<=box.right+1;
  })),'every selected value has a small adjacent triangle without overlapping');
  assert.ok(await conditions.locator('.battle-condition-columns').evaluate(el=>{
    const [left,right]=[...el.children].map(node=>node.getBoundingClientRect());
    return left.top===right.top && left.right<=right.left && Math.abs(left.width-right.width)<1;
  }),'two equal-width Pokémon columns remain side by side');

  assert.ok(await conditions.locator('.battle-condition-stages').evaluateAll(rows=>rows.every(row=>{
    const boxes=[...row.querySelectorAll('select')].map(el=>el.getBoundingClientRect());
    return boxes.length===5 && boxes.every(box=>box.width>=20 && Math.abs(box.top-boxes[0].top)<1 && Math.abs(box.width-boxes[0].width)<1); 
  })));

  await tap(toggle);assert.deepEqual(await matchup(),before);await tap(toggle);
  assert.equal(await input('Player status').inputValue(),'burn');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Battle condition visibility, controls, slot memory, HP inference and narrow layouts passed.');
} finally {await browser.close();await server.close();}
