import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {createServer} from 'vite';
import {searchTowerTrainers} from '../src/battle/towerTrainers.js';
import {createBattleState} from '../src/battle/battleState.js';

const server = await createServer({server:{host:'127.0.0.1',port:5204,strictPort:true}});
await server.listen();
const browser = process.argv.includes('--webkit')
  ? await webkit.launch({headless:true}) : await chromium.launch({headless:true,channel:'chrome'});
try {
 for (const width of [320,390]) {
  const context = await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page = await context.newPage(), errors = [];
  page.on('pageerror',error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Battle',exact:true}).click();
  const select = page.getByRole('combobox',{name:'Select Trainer',exact:true});
  const player = page.getByRole('region',{name:'My Team',exact:true});
  const opponent = page.getByRole('region',{name:'Opponent Team',exact:true});
  const playerBefore = await player.innerHTML();
  const storageBefore = await page.evaluate(() => JSON.stringify(localStorage));
  const geometry = () => opponent.locator('.battle-compact-slots').evaluate(el => {
    const box=el.getBoundingClientRect();return {x:box.x,y:box.y,width:box.width,height:box.height};
  });
  const before = await geometry();
  assert.equal(await select.evaluate(el => el.tagName),'SELECT');
  assert.equal(await select.inputValue(),'');
  assert.equal(await select.locator('option').first().innerText(),'Select Trainer');
  assert.equal(await select.evaluate(el => getComputedStyle(el).fontSize),'16px');
  const labels = (await select.locator('option').allTextContents()).slice(1);
  assert.deepEqual(labels,[...labels].sort((a,b) => {
    const [an,ac]=a.split(' · '), [bn,bc]=b.split(' · ');
    return an.localeCompare(bn) || ac.localeCompare(bc);
  }));
  assert.ok(labels.every(label => label.includes(' · ') && !/\b[A-Z]{2,}\b/.test(label)));
  assert.equal(await select.evaluate(el => getComputedStyle(el).appearance),'none');
  assert.equal(await page.locator('.battle-opponent-trainer-caption > .battle-round-chevron').innerText(),'▾');
  assert.equal(await page.locator('.battle-opponent-trainer-control').evaluate(el => getComputedStyle(el).fontSize),
    await opponent.locator('h3').evaluate(el => getComputedStyle(el).fontSize));
  const values = await select.locator('option').evaluateAll(options => options.slice(1).map(o=>o.value));
  assert.equal(new Set(values).size,values.length);
  assert.ok(values.includes('Anabel Silver') && values.includes('Anabel Gold'),'identical labels retain distinct IDs');
  for (const round of ['1','5','8+','']) {
    await page.getByLabel('Round',{exact:true}).selectOption(round);
    const state = {...createBattleState(),round};
    assert.deepEqual(new Set(await select.locator('option').evaluateAll(options=>options.slice(1).map(o=>o.value))),
      new Set(searchTowerTrainers('',{state,format:state.rules.format}).map(entry=>entry.key)));
  }
  await select.tap();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog',{name:'Select opponent trainer',exact:true}).count(),0);
  await select.selectOption('Youngster:BRADY');
  assert.equal(await select.locator('option:checked').innerText(),'Brady · Youngster');
  const addOpponent = async () => {
    await page.getByRole('button',{name:'Add Pokémon, Opponent Team, empty slot 1',exact:true}).click();
    await page.getByRole('searchbox',{name:'Search opponent Pokémon'}).fill('Sunkern');
    await page.getByRole('button',{name:'Select Pokémon Sunkern',exact:true}).click();
  };
  await addOpponent();
  const slotsBefore = await opponent.locator('.battle-compact-slots').innerHTML();
  await select.tap();await page.keyboard.press('Escape');
  assert.equal(await select.inputValue(),'Youngster:BRADY');
  assert.equal(await opponent.locator('.battle-compact-slots').innerHTML(),slotsBefore);
  await select.selectOption('Youngster:BRADY');
  assert.equal(await opponent.locator('.battle-compact-slots').innerHTML(),slotsBefore);
  await select.selectOption('Anabel Silver');
  assert.equal(await opponent.locator('.battle-compact-slots img').count(),0);
  await select.selectOption('Youngster:BRADY');await addOpponent();
  await select.selectOption('');
  assert.equal(await opponent.locator('.battle-compact-slots img').count(),0);
  assert.equal(await select.inputValue(),'');
  // Independent Pokémon selection still uses the existing search popup.
  await addOpponent();
  await select.selectOption('');
  assert.equal(await opponent.locator('.battle-compact-slots img').count(),1);
  assert.equal(await player.innerHTML(),playerBefore);
  assert.equal(await page.evaluate(() => JSON.stringify(localStorage)),storageBefore);
  assert.deepEqual(await geometry(),before);
  assert.ok(await select.evaluate(el => {
    const box=el.getBoundingClientRect(), slots=el.closest('section').querySelector('.battle-compact-slots').getBoundingClientRect();
    return box.x>=0 && box.right<=innerWidth && box.bottom<=slots.y;
  }),'Trainer control fits the viewport and does not overlap Pokémon slots');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS native Trainer select at ${width}px: sorted canonical options, round filtering, immediate selection, reopen/same selection preserve Pokémon, change/clear reset, player and layout preserved.`);
 }
} finally {await browser.close();await server.close();}
