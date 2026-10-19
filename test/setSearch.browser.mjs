import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
try {
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5174');
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  const tab=async name=>page.getByRole('tab',{name,exact:true}).click();
  await navigate('Battle');await tab('Sets');
  const search=page.getByRole('searchbox',{name:'Search Pokémon sets'});
  assert.equal(await page.locator('.battle-set-entry').count(),882);
  assert.match(await page.locator('.battle-set-context').innerText(),/31 assumed/);
  assert.equal(await page.locator('[data-set-id="Caterpie 1"] .battle-set-move-name').count(),2);
  assert.equal(await page.locator('[data-set-id="Caterpie 1"] .battle-move-dot').count(),1);
  assert.equal(await page.locator('.battle-set-faster').count(),0);
  // Audit every ordinary entry, including the longest move/item names, at each width.
  for (const width of [320,375,430,960]) {
    await page.setViewportSize({width,height:width === 320 ? 568 : 800});
    const problems = await page.locator('.battle-set-entry').evaluateAll(entries => entries.flatMap(entry => {
      const rect = selector => entry.querySelector(selector).getBoundingClientRect();
      const textRect = element => {const range=document.createRange();range.selectNodeContents(element);return range.getBoundingClientRect();};
      const body=rect('.battle-set-body'),name=rect('.battle-set-identity strong'),item=rect('.battle-set-item'),stats=rect('.battle-set-stats'),hide=rect('.battle-set-hide');
      const moves=[...entry.querySelectorAll('.battle-set-moves > span')];
      const moveRects=moves.map(textRect),labels=[...entry.querySelectorAll('dt')],values=[...entry.querySelectorAll('dd')];
      const failures=[];
      if(entry.getBoundingClientRect().height>56) failures.push('row height');
      if(textRect(entry.querySelector('.battle-set-identity strong')).right>stats.left+1) failures.push('name/stat overlap');
      if(item.right>stats.left+1) failures.push('item/stat overlap');
      if(new Set(moveRects.map(r=>r.top.toFixed(1))).size!==1) failures.push('wrapped moves');
      if(moveRects.at(-1).right>entry.getBoundingClientRect().right-5) failures.push('move overflow');
      if(moveRects.some(r=>r.top<hide.bottom && r.bottom>hide.top && r.right>hide.left)) failures.push('hide overlap');
      if(moveRects.some((r,i)=>i>0 && r.left<moveRects[i-1].right)) failures.push('move overlap');
      if(Math.abs(moveRects[0].left-name.left)>1 || Math.abs(item.left-name.left)>1) failures.push('left alignment');
      if(Math.abs(name.left-entry.getBoundingClientRect().left-51)>1) failures.push('trainer indent mismatch');
      if(Math.abs(hide.top-entry.getBoundingClientRect().top)>1) failures.push('hide not top-right');
      if(labels.some((label,i)=>Math.abs(label.getBoundingClientRect().top-name.top)>1 || Math.abs(values[i].getBoundingClientRect().top-item.top)>1)) failures.push('stat line alignment');
      if(entry.querySelector('.battle-set-select > img').getAttribute('src').includes('/box/')) failures.push('box sprite');
      return failures.length ? [{id:entry.dataset.setId,failures, movesWidth:moveRects.at(-1).right-body.left, availableWidth:body.width}] : [];
    }));
    assert.deepEqual(problems,[],`Three-line layout at ${width}px`);
  }
  await search.fill('sNoRlAx');
  const count=await page.locator('.battle-set-entry').count();assert.ok(count>3);
  assert.ok(await page.locator('.battle-set-move-name[style]').count()>0);
  const icon = page.locator('.battle-set-item img').first();
  await icon.evaluate(image => image.decode());
  assert.ok(await icon.evaluate(image => image.naturalWidth > 0));
  assert.match(await icon.getAttribute('src'), new RegExp('^'+assetPath('/items/')+'\\d+\\.png$'));
  assert.ok(await page.locator('.battle-set-item').first().evaluate(element => {
    const text = element.querySelector('span').getBoundingClientRect(), icon = element.querySelector('img').getBoundingClientRect();
    return icon.left >= text.right && icon.left - text.right <= 3;
  }));
  const first=await page.locator('.battle-set-entry').first().getAttribute('data-set-id');
  await page.getByRole('button',{name:`Hide ${first}`,exact:true}).click();
  assert.equal(await page.locator('.battle-set-entry').count(),count-1);
  assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),0);
  await search.focus();assert.equal(await search.inputValue(),'');assert.equal(await page.locator('.battle-set-entry').count(),882);await search.fill('Snorlax');
  for(const width of [320,375,430,960]) {
    await page.setViewportSize({width,height:width===320?568:800});
    await search.fill('Snorlax');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.battle-set-entry').first().locator('dt').count(),6);
    assert.equal(await page.locator('.battle-set-entry').first().locator('.battle-set-moves > span').count(),4);
    const heights=await page.locator('.battle-set-entry').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
    assert.ok(Math.max(...heights)-Math.min(...heights)<2);
    await page.screenshot({path:`/private/tmp/set-search-${width}.png`,fullPage:false});
  }
  await page.setViewportSize({width:375,height:667});
  for(let i=0;i<3;i++) {
    await search.fill(['Snorlax','Tyranitar','Sunkern'][i]);
    const candidate=page.locator('.battle-set-select:not(:disabled)').first();
    await candidate.click();assert.equal(await page.getByRole('tab',{name:'Matchup',exact:true}).getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),i+1);
    await tab('Sets');
    assert.equal(await search.inputValue(),'');
  }
  assert.equal(await page.locator('.battle-opponent-full').count(),0);
  assert.equal(await page.locator('.battle-set-select:not(:disabled)').count(),0);
  assert.equal(await page.locator('.battle-set-hide:not(:disabled)').count(),0);
  const selected=page.locator('.battle-set-select[aria-pressed="true"]').first();
  assert.equal(await selected.isDisabled(),true);
  await selected.evaluate(button=>button.click());
  assert.equal(await page.getByRole('tab',{name:'Sets',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('.battle-side-enemy button.battle-team-slot').first().click();
  assert.equal(await page.locator('.battle-side-enemy button.battle-team-slot').first().getAttribute('aria-pressed'),'true');
  await page.locator('.battle-side-enemy button.battle-team-slot').first().dblclick();
  assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),2);
  assert.ok(await page.locator('.battle-set-select:not(:disabled)').count()>0);
  await search.fill('zzzzz');await page.getByRole('status').filter({hasText:'No sets match'}).waitFor();
  await tab('Trainers');
  const trainers=page.getByRole('searchbox',{name:'Search trainers'});
  await trainers.fill('Brady');await page.locator('.battle-trainer-result').click();
  assert.equal(await search.inputValue(),'');assert.equal(await page.locator('.battle-set-entry').count(),62);
  assert.match(await page.locator('.battle-set-context').innerText(),/IVs 3/);
  assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),0);
  for(const symbol of ['Silver','Gold']) {
    await tab('Trainers');await trainers.fill(`Anabel ${symbol}`);await page.locator('.battle-trainer-result').click();
    assert.equal(await page.locator('.battle-set-entry').count(),3);
    assert.ok((await page.locator('.battle-set-entry').evaluateAll(es=>es.map(e=>e.dataset.setId))).every(id=>id.startsWith(`Anabel ${symbol}:`)));
    await page.locator('.battle-set-select').first().click();await navigate('Trainer');await navigate('Battle');
    assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),1);
  }
  assert.deepEqual(errors,[]);
  // A failed item asset removes only the image; its real name stays visible.
  await tab('Sets');
  const item = page.locator('.battle-set-item').first();
  const itemName = await item.innerText();
  await item.locator('img').dispatchEvent('error');
  await item.locator('img').waitFor({state:'detached'});
  assert.equal(await item.locator('img').count(),0);
  assert.equal(await item.innerText(),itemName);
  // Genuine parser-shaped synthetic records exercise live active-player updates.
  const storage=new Uint8Array(33744);
  storage.set(makePokemon({species:1,pid:0}),4);
  storage.set(makePokemon({species:101,pid:1,experience:1000000}),84);
  const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
  await page.evaluate(encoded=>{
    localStorage.setItem('emerald-companion-2.save.v1',encoded);
    localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier'}));
  },encoded);
  await page.reload(); await navigate('Battle'); await tab('Sets');
  await search.fill('Snorlax');
  assert.ok(await page.locator('.battle-set-faster').count()>0);
  await tab('Matchup');await page.locator('.battle-side-player button.battle-team-slot').nth(1).click();await tab('Sets');
  assert.equal(await page.locator('.battle-set-faster').count(),0);
  await search.fill('Snor');
  assert.equal(await page.locator('.battle-set-faster').count(),0); // Snorlax + Snorunt.
  await search.blur();await search.focus();assert.equal(await search.inputValue(),'');
  assert.equal(await page.locator('.battle-set-entry').count(),882);
  await tab('Trainers');await trainers.fill('Brady');await trainers.blur();await trainers.focus();
  assert.equal(await trainers.inputValue(),'');assert.equal(await page.locator('.battle-trainer-result').count(),302);
  assert.deepEqual(errors,[]);
  console.log('Sets browser checks passed: ordinary/trainer/Brain pools, prefix search, stats/moves, duplicate colors, hiding/restoration, selection/navigation, capacity/removal, active switching, session retention, stable rows and no overflow at 320/375/430/960px.');
} finally {await browser.close();}
