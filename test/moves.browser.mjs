import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {filterMoves} from '../src/resources/moves/filterMoves.js';
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
  const dialog=page.getByRole('dialog');
  const close=()=>page.getByRole('dialog').locator('.resources-move-heading').click();
  const panel=page.locator('.resources-move-learners');
  const toggle=name=>page.getByRole('button',{name,exact:true});
  const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const assertPanel=async name=>{
    const move=catalogEntries('moves').find(e=>e.name===name);
    const summary=page.locator(`#resources-entry-moves-${move.id} .resources-move-summary`);
    assert.equal(await dialog.locator('.resources-move-summary').innerText(),await summary.innerText());
    assert.deepEqual(await dialog.locator('.resources-move-summary img').evaluateAll(ns=>ns.map(n=>n.getAttribute('src'))),await summary.locator('img').evaluateAll(ns=>ns.map(n=>n.getAttribute('src'))));
    assert.deepEqual(await dialog.evaluate(e=>{const s=getComputedStyle(e);return [s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth,s.outlineStyle];}),['0px','0px','0px','0px','none']);
    const bounds=await dialog.locator('.resources-move-dialog').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=page.viewportSize().width&&bounds.y+bounds.height<=844);
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
    for(const query of ['a','  THUNDER  ']){await search.fill(query);assert.deepEqual(await rows.locator('strong').allTextContents(),filterMoves(query).map(e=>e.name));}
    await search.fill('');
    await toggle('Earthquake').scrollIntoViewIfNeeded();
    const listY=await page.evaluate(()=>scrollY);
    const rowBounds=await rows.evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight]));
    const normalEntry=await toggle('Earthquake').evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderTopWidth,s.boxShadow];});
    await toggle('Earthquake').click(); assert.equal(await dialog.locator('button').count(),0); assert.equal(await panel.count(),1); await assertPanel('Earthquake');
    assert.ok((await panel.locator('section').first().innerText()).includes('Swampert'));
    assert.equal(await panel.locator('[data-dex="260"]').count(),1);
    assert.equal(await panel.locator('ul').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width<700?4:8);
    await close(); assert.equal(await toggle('Earthquake').evaluate(e=>getComputedStyle(e).outlineStyle),'none');assert.deepEqual(await toggle('Earthquake').evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderTopWidth,s.boxShadow];}),normalEntry);assert.equal(await panel.count(),0);assert.equal(await page.evaluate(()=>scrollY),listY);assert.deepEqual(await rows.evaluateAll(ns=>ns.map(n=>[n.offsetTop,n.offsetHeight])),rowBounds);
    await toggle('Earthquake').click();await page.keyboard.press('Escape');await toggle('Ember').click();assert.equal(await dialog.count(),1);await assertPanel('Ember');await close();
    await search.fill('Surf'); assert.equal(await panel.count(),0);await search.focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.equal(await toggle('Surf').evaluate(e=>e===document.activeElement),true);assert.equal(await toggle('Surf').evaluate(e=>e.matches(':focus-visible')),true);assert.notEqual(await toggle('Surf').evaluate(e=>getComputedStyle(e).outlineStyle),'none');await page.keyboard.press('Enter');await assertPanel('Surf');
    assert.ok((await panel.innerText()).includes('Raichu'));
    await page.keyboard.press('Escape');assert.equal(await panel.count(),0);
    await search.fill('Toxic');await toggle('Toxic').click();await assertPanel('Toxic');assert.ok(await panel.locator('li').count()>300);await overflow();
    const before=await page.evaluate(()=>scrollY);
    const touch=await page.context().newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:Math.round(width/2),y:650}]});
    for(const y of [580,500,420,340,260]) await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:Math.round(width/2),y}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await touch.detach();
    await page.waitForTimeout(300);
    assert.equal(await dialog.count(),1);assert.ok(await dialog.locator('.resources-move-dialog').evaluate(e=>e.scrollTop>0));
    await page.waitForTimeout(400);assert.equal(await dialog.count(),1);
    // A drag that returns to its origin must still be rejected as a tap.
    await page.mouse.move(width/2,400);await page.mouse.down();await page.mouse.move(width/2,350);await page.mouse.move(width/2,400);await page.mouse.up();
    assert.equal(await dialog.count(),1);
    // Scrolling while a pointer is down cancels even a stationary release.
    await page.mouse.down();await dialog.locator('.resources-move-dialog').evaluate(e=>{e.scrollTop+=50;});await page.waitForTimeout(50);await page.mouse.up();assert.equal(await dialog.count(),1);
    await dialog.locator('.resources-move-dialog').evaluate(e=>{e.scrollTop=e.scrollHeight;});assert.ok(await dialog.locator('.resources-move-dialog').evaluate(e=>e.scrollTop>0));
    await page.mouse.click(2,2);assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>scrollY),before);
    await search.fill('Struggle');await toggle('Struggle').click();assert.equal(await panel.innerText(),'No verified learners recorded.');await close();
    await search.fill('Curse');const curse=page.locator('#resources-entry-moves-174');assert.equal(await curse.locator('img').count(),0);assert.ok(!(await curse.innerText()).includes('???'));
    await search.fill('');const x=await curse.locator('strong').evaluate(e=>e.getBoundingClientRect().left);assert.equal(x,await rows.first().locator('strong').evaluate(e=>e.getBoundingClientRect().left));
    await search.fill('Earthquake');await toggle('Earthquake').click();await assertPanel('Earthquake');
    await panel.locator('[data-dex="260"] img').tap();assert.equal(await panel.count(),0);await toggle('Earthquake').click();await panel.locator('[data-dex="260"] span').tap();assert.equal(await panel.count(),0);await toggle('Earthquake').click();assert.equal(await page.locator('.species-profile').count(),0);
    await page.evaluate(()=>document.activeElement?.blur());await page.screenshot({path:`/private/tmp/moves-learners-${width}.png`,fullPage:false});await overflow();
    await dialog.locator('.resources-move-dialog').tap({position:{x:5,y:5}});assert.equal(await dialog.count(),0);await search.fill('no-such-name');assert.equal(await rows.count(),0);assert.equal(await panel.count(),0);assert.equal(await page.getByRole('status').innerText(),'No results.');
    await search.fill('');await overflow();
  }
  assert.deepEqual(await page.evaluate(()=>window.__moveScrollCalls),[]);
  assert.deepEqual(errors,[]);
  console.log('Moves passed: 354 alphabetized canonical entries, unchanged values, 12px padding, modal dismissal, scrolling and keyboard controls, priority groups/dedup/Dex order, Box Surf, large Toxic and empty Struggle, decoded local sprites, display-only grids, Curse alignment, no counts; 320/375/390/430/1280px without horizontal overflow.');
} finally {await browser.close();}
