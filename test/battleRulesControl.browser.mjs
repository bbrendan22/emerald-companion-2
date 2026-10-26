import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
const server = await preview({preview:{host:'127.0.0.1',port:5201,strictPort:true}});
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror',e => errors.push(e.message));
  const navigate = async name => {
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('button',{name,exact:true}).click();
  };
  const trigger = page.getByRole('button',{name:'Battle Rules',exact:true});
  const popup = page.getByRole('dialog',{name:'Battle Rules',exact:true});
  await mkdir('artifacts/battle-rules',{recursive:true});
  for (const [width,height] of [[320,568],[390,844],[430,932],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
    await navigate('Battle');
    const before = await page.locator('.battle-foundation').boundingBox();
    await trigger.click();
    assert.equal(await popup.locator('select').count(),2);
    assert.equal(await popup.locator('.battle-rules-facility').innerText(),'Facility\nTower');
    assert.equal(await popup.getByLabel('Facility').count(),0);
    assert.deepEqual(await popup.getByLabel('Level',{exact:true}).locator('option').allTextContents(),
      [50,...Array.from({length:41},(_,i) => i + 60)].map(level => `Level ${level}`));
    for (const level of [50,60,61,78,100,50,78]) {
      await popup.getByLabel('Level',{exact:true}).selectOption(String(level));
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('emerald-companion-2.battle-rules.v1')));
      assert.equal(saved.levelMode,level === 50 ? '50' : 'open');
      if (level !== 50) assert.equal(saved.openLevel,level);
    }
    await popup.getByLabel('Battle Type').selectOption('Doubles');

    assert.ok(await popup.isVisible());
    assert.deepEqual(await page.locator('.battle-foundation').boundingBox(),before);
    assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
    assert.equal(await popup.getByRole('heading').count(),0);
    const rect = await popup.boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
    await page.screenshot({path:`artifacts/battle-rules/rules-${width}.png`,fullPage:true});
    assert.ok(rect.height < 190 && rect.width < 240, 'compact content-sized popup');
    assert.ok(await popup.locator('label').evaluateAll(labels => labels.every(label => {
      const text = label.getBoundingClientRect(), select = label.querySelector('select').getBoundingClientRect();
      return select.x > text.x && select.y >= text.y && select.y + select.height <= text.y + text.height + 1;
    })));
    await popup.click({position:{x:3,y:3}});
    assert.equal(await popup.count(),0);
    await trigger.click();
    assert.equal(await popup.locator('.battle-rules-facility').innerText(),'Facility\nTower');
    const panel = await page.locator('.battle-workspace-panel').last().boundingBox();
    await page.mouse.click(panel.x + panel.width - 4, panel.y + panel.height - 4);
    assert.equal(await popup.count(),0);
    await trigger.click();
    await page.keyboard.press('Escape');
    assert.equal(await popup.count(),0);
    await page.reload();
    await navigate('Battle');
    await trigger.click();
    assert.equal(await popup.locator('.battle-rules-facility').innerText(),'Facility\nTower');
    assert.equal(await popup.getByLabel('Battle Type').inputValue(),'Doubles');
    assert.equal(await popup.getByLabel('Level',{exact:true}).inputValue(),'78');
    await trigger.click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Battle Rules: compact popup, selectors remain open, background/outside/Escape dismissal, reload persistence, unchanged workspace geometry at iPhone and desktop sizes.');
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
