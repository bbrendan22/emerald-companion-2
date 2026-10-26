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
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5266:5265,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4].forEach((species,pid)=>storage.set(makePokemon({species,pid,moveIds:[33,0,45,205]}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/battle-move-info',{recursive:true});
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
  const popup=page.getByRole('dialog'),own=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  const info=(group,name)=>group.getByRole('button',{name:`Move information: ${name}`,exact:true});
  for(const [slot,mon]of mons.entries()) {await tap(mine.nth(slot));await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mon.identity}"]`));}
  await tap(mine.first());
  const header=()=>page.locator('.header').evaluate(el=>{
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return {markup:el.outerHTML,border:s.borderBottom,background:s.backgroundColor,outline:s.outline,shadow:s.boxShadow,x:r.x,y:r.y,width:r.width,height:r.height};
  });
  const mainFocused=()=>page.evaluate(()=>document.activeElement===document.getElementById('main'));
  const original=await header();
  for (const selector of ['.battle-active-move-name','.battle-active-move-pp','img']) {
    const target=own.locator('.battle-active-moves li').first().locator(selector);
    await target.scrollIntoViewIfNeeded();
    for (const dismiss of ['inside','outside','Escape']) {
      await tap(target);assert.equal(await popup.count(),1);
      assert.equal(await mainFocused(),false);
      if(dismiss==='inside')await tap(popup.locator('h2'));
      else if(dismiss==='Escape')await page.keyboard.press('Escape');
      else if(width<500)await page.touchscreen.tap(2,2);
      else await page.mouse.click(2,2);
      assert.equal(await popup.count(),0);
      assert.equal(await mainFocused(),false,'touch/pointer dismissal never restores focus to the page');
      assert.equal(await page.evaluate(()=>document.getElementById('main').matches(':focus-visible')),false);
      assert.deepEqual(await header(),original,'header appearance and state remain unchanged');
      assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    }
  }
  const trigger=info(own,'Tackle');
  await trigger.focus();await page.keyboard.press('Enter');assert.equal(await popup.count(),1);
  await page.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(el=>document.activeElement===el),true,'keyboard focus returns to the move button');
  assert.deepEqual(await header(),original);
  if(width===375)await page.screenshot({path:`/tmp/battle-focus-fixed-${useWebKit?'webkit':'chrome'}.png`});
  console.log(`PASS ${useWebKit?'WebKit':'Chrome'} ${width}px: repeated name/PP/icon opens; inside/outside/Escape dismissal; no page focus outline; unchanged header; keyboard focus restored.`);
  assert.deepEqual(errors,[]);await context.close();
 }
} finally {await browser.close();await server.close();}
