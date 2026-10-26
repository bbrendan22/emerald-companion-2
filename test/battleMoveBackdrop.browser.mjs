import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const useWebKit=process.argv.includes('--webkit'),pwaGap=process.argv.includes('--pwa-gap');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5268:5267,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);
[1,4].forEach((species,pid)=>storage.set(makePokemon({species,pid,moveIds:[33,0,45,205]}),4+pid*80));
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/battle-move-info',{recursive:true});
 for(const width of (pwaGap?[393]:[320,375,430])) {
  const context=await browser.newContext({viewport:{width,height:pwaGap?784:844},screen:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},{encoded,roles});
  if(pwaGap)await context.addInitScript(()=>{
    // Model the photographed Home Screen mismatch: the CSS containing block
    // ends 60px above the actual full-screen window reported to JavaScript.
    Object.defineProperty(navigator,'standalone',{get:()=>true});
    Object.defineProperty(window,'outerHeight',{get:()=>window.visualViewport.height+60});
  });
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
  const viewportCheck=async(label,trigger)=>{
    await trigger.scrollIntoViewIfNeeded();
    const before=await page.evaluate(()=>({
      scroll:scrollY,htmlStyle:document.documentElement.getAttribute('style'),bodyStyle:document.body.getAttribute('style'),
      standalone:navigator.standalone===true,documentHeight:document.documentElement.getBoundingClientRect().height,appHeight:navigator.standalone?Math.max(outerHeight,screen.width===innerWidth?screen.height:0):innerHeight,
      header:document.querySelector('.header').outerHTML,
      main:document.querySelector('main').getBoundingClientRect().toJSON()
    }));
    if(before.standalone)assert.ok(before.documentHeight>=before.appHeight-1,'the Home Screen page canvas is already full-height before a move is tapped');
    await page.evaluate(()=>{
      window.__moveOpeningFrames=[];
      const observer=new MutationObserver(()=>{
        const modal=document.querySelector('.battle-move-viewport');
        if(!modal)return;
        observer.disconnect();
        const sample=()=>{
          const height=Math.max(innerHeight,visualViewport?.height ?? 0,navigator.standalone?outerHeight:0);
          window.__moveOpeningFrames.push({open:modal.open,height:modal.getBoundingClientRect().height,expected:height,pinned:document.body.style.position==='fixed'});
          if(window.__moveOpeningFrames.length<3)requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      observer.observe(document.body,{childList:true,subtree:true});
    });
    await tap(trigger);
    await page.waitForFunction(()=>window.__moveOpeningFrames.length===3);
    assert.ok((await page.evaluate(()=>window.__moveOpeningFrames)).every(frame=>frame.open && frame.pinned && frame.height>=frame.expected-1),`${label}: viewport is correct from the first animation frame`);
    const size=await popup.evaluate(el=>{
      const b=getComputedStyle(el),r=el.getBoundingClientRect(),panel=el.querySelector('.battle-move-dialog').getBoundingClientRect();
      return {html:document.documentElement.getBoundingClientRect().height,body:document.body.getBoundingClientRect().height,
        visual:visualViewport.height,inner:Math.max(innerHeight,navigator.standalone?outerHeight:0),viewWidth:innerWidth,backHeight:r.height,backWidth:r.width,
        position:b.position,top:b.top,bottom:b.bottom,color:b.backgroundColor,frame:r.toJSON(),dialog:panel.toJSON()};
    });
    assert.ok(size.frame.height>=Math.max(size.visual,size.inner)-1 && size.frame.width>=width-1,`${label}: painted modal frame covers the viewport even when the body is short`);
    assert.equal(await page.evaluate(()=>document.body.style.position),'fixed');
    assert.notEqual(await page.evaluate(()=>document.documentElement.style.overflow),'hidden');
    if(before.standalone && before.documentHeight<=before.appHeight+1)assert.ok(Math.abs(size.html-before.documentHeight)<1,'opening a short-page popup does not resize the document canvas');
    assert.equal(size.position,'fixed');assert.equal(size.top,'0px');assert.equal(size.bottom,'0px');
    assert.ok(size.backHeight>=size.visual-1 && size.backWidth>=width-1,`${label}: full viewport backdrop`);
    assert.equal(size.color,'rgba(0, 0, 0, 0.6)');
    assert.ok(Math.abs(size.dialog.y+size.dialog.height/2-size.inner/2)<2,'popup stays centered');
    await page.screenshot({path:`/tmp/battle-backdrop-${useWebKit?'webkit':'chrome'}-${label}-${width}.png`});
    await tap(popup.locator('h2'));assert.equal(await popup.count(),0);
    const after=await page.evaluate(()=>({scroll:scrollY,htmlStyle:document.documentElement.getAttribute('style'),bodyStyle:document.body.getAttribute('style'),header:document.querySelector('.header').outerHTML,main:document.querySelector('main').getBoundingClientRect().toJSON()}));
    // Restoring an originally absent style attribute as an empty attribute is
    // equivalent; compare the inline declarations instead of attribute presence.
    assert.equal(after.htmlStyle||'',before.htmlStyle||'');assert.equal(after.bodyStyle||'',before.bodyStyle||'');
    assert.equal(after.header,before.header);assert.deepEqual(after.main,before.main);assert.equal(after.scroll,before.scroll);
  };
  const double=async el=>{await el.scrollIntoViewIfNeeded();await page.waitForTimeout(450);if(width<500){await el.tap();await el.tap();}else await el.dblclick();await page.waitForTimeout(450);};
  await viewportCheck('my-only-no-trainer',info(own,'Tackle'));
  await tap(opponent.locator('.battle-opponent-trigger'));await page.getByRole('dialog',{name:'Select opponent trainer'}).getByRole('searchbox').fill('VINCE');await tap(page.getByRole('button',{name:'Select trainer VINCE',exact:true}));
  await add(0,'Metagross');await tap(slots.first());await observe(0,'Psychic');
  await viewportCheck('both-my-move',info(own,'Tackle'));
  await viewportCheck('both-opponent-move',info(enemy,'Psychic'));
  await double(mine.first());assert.equal(await own.locator('.battle-active-moves').count(),0);
  await viewportCheck('opponent-only',info(enemy,'Psychic'));
  await tap(mine.first());await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mons[0].identity}"]`));await tap(mine.first());
  // Leave a selected trainer but remove the opponent: this is another short
  // page, independent of whether a roster/trainer has already been chosen.
  await double(slots.first());assert.equal(await enemy.locator('.battle-active-moves').count(),0);
  await viewportCheck('no-opponent',info(own,'Tackle'));
  // Resizing while open models expansion/collapse of Safari's browser chrome.
  await tap(info(own,'Tackle'));
  for(const height of [667,932,844]) {
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>document.querySelector('.battle-move-viewport').getBoundingClientRect().height>=Math.max(innerHeight,visualViewport.height,navigator.standalone?outerHeight:0)-1);
    assert.ok(await popup.evaluate(el=>el.getBoundingClientRect().height>=Math.max(innerHeight,visualViewport.height,navigator.standalone?outerHeight:0)-1));
  }
  await page.keyboard.press('Escape');
  console.log(`PASS ${useWebKit?'WebKit':'Chrome'} ${width}px: one/both/no opponent, ${pwaGap?'Home Screen viewport mismatch; ':''}full painted modal frame over short/tall documents, dynamic viewport, unchanged header/matchup, restored scroll and styles.`);
  assert.deepEqual(errors,[]);await context.close();
 }
} finally {await browser.close();await server.close();}
