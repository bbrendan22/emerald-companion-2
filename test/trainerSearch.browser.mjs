import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
try {
  const context=await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5174');
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  await navigate('Battle');
  assert.equal(await page.locator('.battle-team-header h2').count(),0);
  assert.equal(await page.locator('.battle-trainer-portrait').first().evaluate(e=>e.getBoundingClientRect().height),50);
  assert.ok(await page.locator('.battle-team-headers').evaluate(e=>e.getBoundingClientRect().height<90));
  assert.equal(await page.getByText('Your Trainer',{exact:true}).count(),0);
  await page.getByRole('tab',{name:'Trainers',exact:true}).click();
  const search=page.getByRole('searchbox',{name:'Search trainers'});
  assert.equal(await page.locator('.battle-trainer-result').count(),302);
  await search.fill('bRaDy');assert.equal(await page.locator('.battle-trainer-result').count(),1);
  const count=await page.locator('.battle-result-count b').innerText();
  await page.locator('.battle-trainer-result').click();
  assert.equal(await page.getByRole('tab',{name:'Sets',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.battle-side-enemy .battle-trainer-identity strong').innerText(),'BRADY');
  assert.equal(await page.locator('.battle-side-enemy .battle-trainer-portrait').getAttribute('src'),assetPath('/trainers/frontier/youngster.png'));
  assert.equal(await page.locator('.battle-set-entry').count(),Number(count));
  assert.equal(await page.locator('.battle-side-enemy .battle-slot-empty').count(),3);
  await page.getByRole('tab',{name:'Trainers',exact:true}).click(); await search.fill('youngster');
  assert.ok(await page.locator('.battle-trainer-result').count()>1);
  await search.fill('zzzzzz');await page.getByRole('status').filter({hasText:'No results.'}).waitFor();
  for(const symbol of ['Silver','Gold']) {
    await search.fill(`Anabel ${symbol}`); assert.equal(await page.locator('.battle-trainer-result').count(),1);
    assert.equal(await page.locator('.battle-result-count b').innerText(),'3');
    await page.locator('.battle-trainer-result').click();
    assert.ok((await page.locator('.battle-side-enemy .battle-trainer-identity').innerText()).includes(symbol));
    await page.getByRole('tab',{name:'Trainers',exact:true}).click();
  }
  await search.fill('');
  for(const width of [320,375,430,960]) {
    await page.setViewportSize({width,height:width===320?568:800});
    await search.focus();await search.fill('');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.battle-trainer-results').evaluate(e=>getComputedStyle(e).overflowY),'visible');
    await page.evaluate(()=>window.scrollTo(0,500));
    assert.ok(await page.evaluate(()=>window.scrollY)>0);
    await page.locator('.battle-trainer-result').last().scrollIntoViewIfNeeded();
    await page.locator('.battle-trainer-result').last().click();
    assert.equal(await page.getByRole('tab',{name:'Sets',exact:true}).getAttribute('aria-selected'),'true');
    await page.getByRole('tab',{name:'Trainers',exact:true}).click();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({path:`/private/tmp/trainer-search-${width}.png`,fullPage:false});
  }
  await search.fill('Anabel Gold');await page.locator('.battle-trainer-result').click();
  await navigate('Trainer');await navigate('Battle');
  assert.equal(await page.getByRole('tab',{name:'Sets',exact:true}).getAttribute('aria-selected'),'true');
  assert.ok((await page.locator('.battle-side-enemy .battle-trainer-identity').innerText()).includes('Gold'));
  assert.deepEqual(errors,[]);
  console.log('Trainer browser checks passed: 302 entries, name/class/multiword search, empty results, ordinary/Anabel selections and counts, Sets navigation, empty opponent roster, session retention, compact headers, scrollable lists and no overflow at 320/375/430/960px.');
} finally {await browser.close();}
