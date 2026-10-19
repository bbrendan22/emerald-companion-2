import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const types=['Type','Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Steel','Ghost','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark','Typeless'];
for (const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
  const browser=await engine.launch({headless:true,...(name==='chromium'?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
  try {
    const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
    await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
    await page.getByRole('button',{name:'Open navigation',exact:true}).tap();
    await page.getByRole('button',{name:'Resources',exact:true}).tap();
    await page.getByRole('link',{name:'Moves',exact:true}).tap();
    const search=page.getByRole('searchbox',{name:'Search Moves',exact:true}), type=page.getByRole('combobox',{name:'Move type',exact:true}), category=page.getByRole('combobox',{name:'Move category',exact:true});
    const names=()=>page.locator('.resources-move-row strong').allTextContents();
    for(const width of [320,375,390,430]) {
      await page.setViewportSize({width,height:844});
      assert.equal(await search.getAttribute('placeholder'),'Search');
      assert.deepEqual(await type.locator('option').allTextContents(),types);
      assert.deepEqual(await category.locator('option').allTextContents(),['Category','Physical','Special','Status']);
      const bounds=await Promise.all([page.locator('.resources-move-filters .resources-search-field'),type,category].map(e=>e.boundingBox()));
      assert.ok(bounds.every(b=>b.y===bounds[0].y));
      assert.ok(bounds[0].x+bounds[0].width>=width/2);
      assert.ok(bounds[0].width>bounds[1].width&&bounds[0].width>bounds[2].width);
      assert.ok(bounds[0].x+bounds[0].width<=bounds[1].x&&bounds[1].x+bounds[1].width<=bounds[2].x);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await search.fill('bolt');assert.deepEqual(await names(),[]);assert.equal(await page.getByRole('status').innerText(),'No results.');
      await search.fill('  THUN ');assert.deepEqual(await names(),['Thunder','Thunder Shock','Thunder Wave','Thunderbolt','ThunderPunch']);
      await type.selectOption('ELECTRIC');await category.selectOption('Special');assert.deepEqual(await names(),['Thunder','Thunder Shock','Thunderbolt','ThunderPunch']);
      await type.selectOption('WATER');assert.deepEqual(await names(),[]);
      await search.fill('sword');await type.selectOption('NORMAL');await category.selectOption('Status');assert.deepEqual(await names(),['Swords Dance']);
      await search.fill('');await type.selectOption('MYSTERY');assert.deepEqual(await names(),['Curse']);assert.equal(await page.locator('.resources-move-row img').count(),0);
      await type.selectOption('GHOST');assert.ok(!(await names()).includes('Curse'));
      await type.selectOption('');await category.selectOption('');assert.equal((await names()).length,354);
      assert.equal(await page.getByRole('dialog').count(),0);
      await search.fill('thun');await type.selectOption('ELECTRIC');await category.selectOption('Special');
      await page.getByRole('button',{name:'Thunderbolt',exact:true}).tap();assert.equal(await page.getByRole('dialog',{name:'Thunderbolt',exact:true}).count(),1);
      await page.getByRole('dialog').locator('.resources-move-heading').tap();
      assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await search.inputValue(),'thun');assert.equal(await type.inputValue(),'ELECTRIC');assert.equal(await category.inputValue(),'Special');
      assert.equal(await page.locator('.resources-move-row:focus, .resources-move-toggle:focus').count(),0);
      await search.fill('');await type.selectOption('');await category.selectOption('');
      await page.evaluate(()=>document.activeElement?.blur());
      await page.screenshot({path:`/private/tmp/move-filters-${name}-${width}.png`});
    }
    console.log(`${name}: move filters passed at 320/375/390/430px: prefix search, exact options, Gen 3 combinations, Curse, reset, no results, popup and focus preservation, one-line controls without overflow.`);
  } finally {await browser.close();}
}
