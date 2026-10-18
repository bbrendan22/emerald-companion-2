import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {catalogEntries} from '../src/resources/search.js';
import {moveLearners} from '../src/resources/moves/learners.js';
import {moveResources} from '../src/resources/learnset/data/moveResources.js';
const require=createRequire(import.meta.url), {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Resources',exact:true}).click();
  await page.getByRole('link',{name:'Moves',exact:true}).click();
  await page.evaluate(()=>{window.__moveScrollCalls=[]; const scrollTo=window.scrollTo; window.scrollTo=function(...args){window.__moveScrollCalls.push('scrollTo'); return scrollTo.apply(this,args)}; const scrollIntoView=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(...args){window.__moveScrollCalls.push('scrollIntoView'); return scrollIntoView.apply(this,args)};});
  const search=page.getByRole('searchbox',{name:'Search Moves',exact:true});
  const rows=page.locator('.resources-move-row');
  const panel=page.locator('.resources-move-learners');
  const toggle=name=>page.getByRole('button',{name,exact:true});
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const assertPanel=async name=>{
    const move=catalogEntries('moves').find(e=>e.name===name);
    assert.deepEqual(await panel.locator('h2').allTextContents(),moveLearners(move.id).map(g=>g.title));
    const ids=await panel.locator('li').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.dex)));
    assert.equal(new Set(ids).size,ids.length);
    for(const [i,group] of moveLearners(move.id).entries()){
      assert.deepEqual(await panel.locator('section').nth(i).locator('li').evaluateAll(ns=>ns.map(n=>Number(n.dataset.dex))),group.pokemon.map(p=>p.dex));
    }
    assert.equal(await panel.locator('a,button,[tabindex]').count(),0);
    await panel.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>{i.loading='eager';return i.decode()})));
    assert.equal(await panel.locator('img').evaluateAll((imgs,base)=>imgs.every(i=>i.naturalWidth>0&&i.getAttribute('src')===`${base}pokemon/emerald/normal/${i.parentElement.dataset.dex}.png`),assetPath('/')),true);
    assert.equal(await panel.locator('li').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).cursor!=='pointer'&&getComputedStyle(n).backgroundColor==='rgba(0, 0, 0, 0)')),true);
  };
  for(const width of [320,375,390,430,1280]){
    await page.setViewportSize({width,height:844}); await search.fill('');
    assert.equal(await rows.count(),354);
    assert.deepEqual(await rows.locator('strong').allTextContents(),catalogEntries('moves').map(e=>e.name));
    assert.equal(await panel.count(),0); assert.equal(await page.locator('.resources-learner-grid img').count(),0);
    assert.equal(await page.getByRole('status').innerText(),'');
    const values=await rows.evaluateAll(ns=>ns.map(n=>({id:Number(n.id.split('-').pop()),description:n.querySelector('p').textContent,labels:[...n.querySelectorAll('dt')].map(e=>e.textContent),values:[...n.querySelectorAll('dd')].map(e=>e.textContent),rights:[...n.querySelectorAll('dd')].map(e=>e.getBoundingClientRect().right),padding:getComputedStyle(n).paddingTop})));
    for(const r of values){const m=moveResources[r.id];assert.equal(r.description,m.description);assert.deepEqual(r.labels,['Pwr','Acc','Eff','PP']);assert.deepEqual(r.values,[m.power===0?'—':m.power===1?'Var':String(m.power),m.accuracy===0?'—':`${m.accuracy}%`,m.effectChance?`${m.effectChance}%`:'—',String(m.pp)]);assert.deepEqual(r.rights,values[0].rights);assert.equal(r.padding,'12px');}
    for(const query of ['a','  THUNDER  ']){await search.fill(query);assert.deepEqual(await rows.locator('strong').allTextContents(),catalogEntries('moves',query).map(e=>e.name));}
    await search.fill('');
    await toggle('Earthquake').click(); assert.equal(await panel.count(),1); await assertPanel('Earthquake');
    assert.ok((await panel.locator('section').first().innerText()).includes('Swampert'));
    assert.equal(await panel.locator('[data-dex="260"]').count(),1);
    assert.equal(await panel.locator('ul').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width<700?4:8);
    await toggle('Earthquake').click(); assert.equal(await panel.count(),0);
    await toggle('Earthquake').click();await toggle('Ember').click();assert.equal(await panel.count(),1);assert.equal(await toggle('Earthquake').getAttribute('aria-expanded'),'false');await assertPanel('Ember');
    await search.fill('Surf'); assert.equal(await panel.count(),0);await toggle('Surf').focus();await page.keyboard.press('Enter');await assertPanel('Surf');
    assert.ok((await panel.innerText()).includes('Raichu'));
    await page.keyboard.press('Space');assert.equal(await panel.count(),0);
    await search.fill('Toxic');await toggle('Toxic').click();await assertPanel('Toxic');assert.ok(await panel.locator('li').count()>300);await overflow();
    await search.fill('Struggle');await toggle('Struggle').click();assert.equal(await panel.innerText(),'No verified learners recorded.');
    await search.fill('Curse');const curse=page.locator('#resources-entry-moves-174');assert.equal(await curse.locator('img').count(),0);assert.ok(!(await curse.innerText()).includes('???'));
    await search.fill('');const x=await curse.locator('strong').evaluate(e=>e.getBoundingClientRect().left);assert.equal(x,await rows.first().locator('strong').evaluate(e=>e.getBoundingClientRect().left));
    await search.fill('Earthquake');await toggle('Earthquake').click();await assertPanel('Earthquake');
    const control=toggle('Earthquake');const appearance=()=>control.evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.color,s.borderColor,s.boxShadow]});await control.blur();await page.mouse.move(0,0);const normal=await appearance();await control.hover();assert.deepEqual(await appearance(),normal);await page.mouse.down();assert.deepEqual(await appearance(),normal);await page.mouse.move(0,0);await page.mouse.up();
    await panel.locator('[data-dex="260"] img').click();assert.equal(await panel.count(),1);assert.equal(await page.locator('.species-profile').count(),0);
    await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:`/private/tmp/moves-learners-${width}.png`,fullPage:false});await overflow();
    await search.fill('no-such-name');assert.equal(await rows.count(),0);assert.equal(await panel.count(),0);assert.equal(await page.getByRole('status').innerText(),'No results.');
    await search.fill('');await overflow();
  }
  assert.deepEqual(await page.evaluate(()=>window.__moveScrollCalls),[]);
  assert.deepEqual(errors,[]);
  console.log('Moves passed: 354 alphabetized canonical entries, unchanged values, 12px padding, single expansion/collapse and keyboard controls, priority groups/dedup/Dex order, Box Surf, large Toxic and empty Struggle, decoded local sprites, display-only grids, Curse alignment, no counts; 320/375/390/430/1280px without horizontal overflow.');
} finally {await browser.close();}
