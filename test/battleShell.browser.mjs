// Isolated browser verification; synthetic save data never enters app assets.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
try {
  const context = await browser.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const navigate = async name => {
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('button',{name,exact:true}).click();
  };
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5174');
  await navigate('Battle');
  await page.getByRole('tab',{name:'Matchup',exact:true}).waitFor();
  assert.equal(await page.locator('.battle-team-slot img').count(),0);
  assert.equal(await page.locator('.battle-slot-empty').count(),6);
  assert.equal(await page.locator('.battle-conditions-shell').count(),0);
  const b1 = new Uint8Array(15752), b2 = new Uint8Array(3884), storage = new Uint8Array(33744);
  b2.set([188,204,191,200,190,187,200,255]);
  for (const [index,species] of [1,4,7].entries()) storage.set(makePokemon({species,pid:index}),4+index*80);
  const encoded = Buffer.from(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2,storage}})).toString('base64');
  await page.evaluate(encoded => {
    localStorage.setItem('emerald-companion-2.save.v1',encoded);
    localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier'}));
  },encoded);
  await page.reload(); await navigate('Battle');
  await page.locator('.battle-side-player .battle-team-slot img').nth(2).waitFor();
  assert.equal(await page.locator('.battle-side-player .battle-trainer-identity strong').innerText(),'BRENDAN');
  assert.equal(await page.locator('.battle-side-enemy .battle-team-slot img').count(),0);
  await page.locator('.battle-side-player button.battle-team-slot').nth(1).click();
  assert.equal(await page.locator('.battle-side-player button.battle-team-slot').nth(1).getAttribute('aria-pressed'),'true');
  for (const width of [320,375,430,960]) {
    await page.setViewportSize({width,height:width === 320 ? 568 : 800});
    await page.evaluate(() => window.scrollTo(0,0));
    const bounds = [];
    for (const tab of ['Matchup','Trainers','Sets','Teams','Rules']) {
      await page.getByRole('tab',{name:tab,exact:true}).click();
      const geometry = await page.evaluate(() => {
        const rect = selector => {const r=document.querySelector(selector).getBoundingClientRect(); return [r.x,r.y,r.width,r.height];};
        return {headers:rect('.battle-team-headers'),tabs:rect('.battle-tabs'),panel:rect('.battle-panel-area'),overflow:document.documentElement.scrollWidth>innerWidth,
          tabsFit:[...document.querySelectorAll('.battle-tabs button')].every(e=>e.scrollWidth<=e.clientWidth),
          slotHeights:[...document.querySelectorAll('.battle-team-slot')].map(e=>e.getBoundingClientRect().height)};
      });
      assert.equal(geometry.overflow,false); assert.equal(geometry.tabsFit,true);
      assert.ok(geometry.slotHeights.every(height=>height>=44));
      bounds.push(geometry);
    }
    for (const [index,geometry] of bounds.entries()) {
      assert.deepEqual(geometry.headers,bounds[0].headers);
      assert.deepEqual(geometry.tabs,bounds[0].tabs);
      // Content now follows natural document height; only the header/tab dimensions stay fixed.
    }
    await page.getByRole('tab',{name:'Matchup',exact:true}).click();
    await page.screenshot({path:`/private/tmp/battle-shell-${width}.png`,fullPage:true});
  }
  await page.getByRole('tab',{name:'Matchup',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Trainers',exact:true}).getAttribute('aria-selected'),'true');
  await navigate('Trainer'); await page.locator('.trainer-content').waitFor();
  await navigate('My Pokémon'); await page.locator('.pokemon-card').first().waitFor();
  await page.locator('.pokemon-card').first().click(); await page.locator('.pokemon-profile').waitFor();
  await navigate('Resources'); await page.getByRole('searchbox',{name:'Search Pokémon, moves and abilities',exact:true}).waitFor();
  await navigate('Battle');
  assert.equal(await page.getByRole('tab',{name:'Trainers',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.battle-side-player button.battle-team-slot').nth(1).getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]);
  console.log('Battle shell passed: empty/imported states, role-backed team, active selection, all tabs, keyboard navigation, stable geometry and no overflow at 320/375/430/960px, page navigation retention, existing-page smoke checks, no page errors.');
} finally { await browser.close(); }
