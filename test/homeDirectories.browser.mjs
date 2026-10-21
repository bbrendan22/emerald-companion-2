import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
import {homeDirectory} from '../src/resources/homeSearch.js';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
try {
 const page=await browser.newPage({viewport:{width:375,height:700},hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BROWSER_URL || 'http://127.0.0.1:5173/');
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave()).toString('base64'));await page.reload();
 const master=page.getByRole('searchbox',{name:'Search Resources',exact:true});
 const geometry=()=>page.locator('.home-trainer').evaluate(e=>{const r=e.getBoundingClientRect();return [r.width,r.height];});
 const before=await geometry();
 const searchPosition=await master.boundingBox();
 const labelPosition=await page.locator('#resources-pokemon-heading').boundingBox();
 for(const [category,title,query,name] of [['pokemon','Pokédex','s','Snorlax'],['moves','Moves','s','Surf'],['abilities','Abilities','s','Sturdy'],['items','Useful Items','s','Soothe Bell'],['berries','Berries','s','Sitrus Berry']]){
  await page.getByRole('link',{name:title,exact:true}).tap();
  const list=page.getByRole('region',{name:`${title} directory`,exact:true});
  const search=page.getByRole('searchbox',{name:`Search ${title}`,exact:true});
  const fieldPosition=await search.boundingBox(),headingPosition=await page.locator('.home-directory-heading h2').boundingBox();
  assert.equal(fieldPosition.y,searchPosition.y,'search does not jump');assert.equal(headingPosition.y,labelPosition.y,'directory label replaces Pokémon label');
  assert.deepEqual(await geometry(),before);assert.equal(await page.locator('.home-detail').count(),0);
  assert.equal(await list.locator('button').count(),homeDirectory(category).results.length);
  assert.equal(await page.locator('.resources-catalog, .resource-items-page, select').count(),0);
  await search.fill(query.toUpperCase());
  assert.equal(await list.locator('button').count(),homeDirectory(category,query).results.length);
  await search.fill('zzzzzz');assert.equal(await list.innerText(),'No results.');
  await search.fill(query);
  await list.getByRole('button',{name,exact:true}).scrollIntoViewIfNeeded();
  const scroll=await list.evaluate(e=>e.scrollTop);
  await list.getByRole('button',{name,exact:true}).tap();
  if(category==='pokemon'){
   await page.locator('.species-profile').waitFor();await page.getByRole('button',{name:'Back to Pokédex',exact:true}).tap();
  }else{
   const dialog=page.getByRole('dialog');await dialog.waitFor();assert.equal(await dialog.getAttribute('aria-label'),name);
   await page.keyboard.press('Escape');
  }
  assert.equal(await search.inputValue(),query);assert.ok(Math.abs(await list.evaluate(e=>e.scrollTop)-scroll)<1,'return preserves filtered list scroll');
  assert.equal(await search.evaluate(e=>e===document.activeElement),false,'selection dismisses keyboard focus');
  // Verify returning also preserves a scrolled, unfiltered directory.
  await search.fill('');await page.waitForTimeout(60);
  await list.evaluate(e=>{e.scrollTop=Math.min(180,e.scrollHeight-e.clientHeight);});
  const index=await list.locator('button').evaluateAll(nodes=>nodes.findIndex(n=>{const r=n.getBoundingClientRect(),p=n.closest('[role="region"]').getBoundingClientRect();return r.top>=p.top&&r.bottom<=Math.min(p.bottom,innerHeight);}));
  assert.ok(index>=0);const savedScroll=await list.evaluate(e=>e.scrollTop);assert.ok(savedScroll>0,`${category} full list should scroll`);
  await list.locator('button').nth(index).tap();
  if(category==='pokemon'){await page.locator('.species-profile').waitFor();await page.getByRole('button',{name:'Back to Pokédex',exact:true}).tap();}
  else {await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');}
  await page.waitForTimeout(50);const restored=await list.evaluate(e=>e.scrollTop);assert.ok(Math.abs(restored-savedScroll)<1,`${category} return preserves full directory scroll: ${savedScroll} -> ${restored}`);
  await page.getByRole('button',{name:'Close directory',exact:true}).tap();assert.equal(await master.inputValue(),'');assert.equal(await list.count(),0);
 }
 for(const width of [320,375,430]){
  await page.setViewportSize({width,height:700});
  for(const title of ['Pokédex','Moves','Abilities','Useful Items','Berries']) {
   await page.getByRole('link',{name:title,exact:true}).tap();
   const list=page.getByRole('region',{name:`${title} directory`,exact:true});
   assert.ok(await list.evaluate(e=>e.scrollHeight>e.clientHeight));
   const sizes=await list.locator('button').evaluateAll(nodes=>nodes.map(button=>{
    const label=button.querySelector('.home-result-name'),icon=button.querySelector('img, .home-result-icon-space'),r=icon?.getBoundingClientRect();
    return {font:getComputedStyle(label).fontSize,icon:r?[r.width,r.height]:null,overflow:button.scrollWidth>button.clientWidth};
   }));
   for(const row of sizes){assert.equal(row.font,'12px');assert.equal(row.overflow,false);if(title!=='Abilities')assert.deepEqual(row.icon,[20,20]);}
   assert.equal(await list.evaluate(e=>e.scrollWidth>e.clientWidth),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.equal(await page.locator('.home-search').evaluate(e=>getComputedStyle(e).fontSize),'16px');
   assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
   await page.getByRole('button',{name:'Close directory',exact:true}).tap();
  }
 }
 for(const [name,selector] of [['Pokémon Sets','.frontier-sets-page'],['Trainers','.frontier-trainers-page']]){
  await page.getByRole('link',{name,exact:true}).tap();await page.locator('.home-detail').waitFor();
  assert.equal(await page.locator('.home-directory-heading').count(),0);
  assert.equal(await page.getByRole('searchbox').count(),1);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).tap();await master.waitFor();
 }
 await master.fill('oran');await page.getByRole('region',{name:'Search results',exact:true}).getByRole('button',{name:'Oran Berry',exact:true}).tap();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 assert.equal(await master.inputValue(),'');assert.equal(await page.locator('.home-directory-heading').count(),0);
 assert.ok(await page.getByRole('link',{name:'Pokédex',exact:true}).isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: five compact directories, canonical counts, live prefix search, unchanged Trainer geometry, profile/popup and search/scroll restoration, Back, zoom-safe narrow layout, Frontier full pages, Master Search.');
}finally{await browser.close();}
