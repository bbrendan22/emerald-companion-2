import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
import {frontierEVSpread, eligibleFrontierTrainers, searchFrontierBrains, frontierBrainInfo, frontierResourceSetKey} from '../src/resources/frontier/sets.js';
import {battleMove} from '../src/battle/reference.js';
import {battleItemId} from '../src/battle/itemLookup.js';
import {assetPath} from './helpers/browserPaths.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport:{width:375,height:844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button', {name:'Open navigation',exact:true}).click();
  await page.getByRole('button', {name:'Resources',exact:true}).click();
  await page.getByRole('link', {name:'Pokémon Sets',exact:true}).click();
  const search = page.getByRole('searchbox', {name:'Search Pokémon Sets',exact:true});
  const rows = page.locator('.frontier-set-list > li');
  const details = page.locator('.frontier-set-details');
  const standardTab = page.getByRole('tab',{name:'Standard Sets',exact:true});
  const brainsTab = page.getByRole('tab',{name:'Frontier Brains',exact:true});
  assert.equal(await standardTab.getAttribute('aria-selected'),'true');
  await page.evaluate(() => {
    window.__frontierScrollCalls = [];
    for (const [target,key] of [[window,'scrollTo'],[Element.prototype,'scrollIntoView']]) {
      const original = target[key];
      target[key] = function(...args) { window.__frontierScrollCalls.push(key); return original.apply(this,args); };
    }
  });
  for (const width of [320,375,390,430]) {
    await page.setViewportSize({width,height:844});
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('');
    assert.equal(await rows.count(),882);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(n => Number(n.dataset.entry))), frontierPokemon.map(s => s.entry));
    assert.equal(await page.getByRole('status').innerText(),'');
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('  sNoRlAx ');
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(n => Number(n.dataset.entry))), frontierPokemon.filter(s => s.species === 'Snorlax').map(s => s.entry));
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.first().getByRole('button').click();
    assert.equal(await details.count(),1);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.nth(1).getByRole('button').click();
    assert.equal(await details.count(),1);
    assert.equal(await rows.first().getByRole('button').getAttribute('aria-haspopup'),'dialog');
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('882');
    assert.equal(await rows.count(),1);
    await rows.getByRole('button').focus();
    await page.keyboard.press('Enter');
    const set = frontierPokemon[881];
    assert.deepEqual(await details.locator('dd').allTextContents(),[set.nature,set.possibleAbility.replaceAll(' / ', '/'),frontierEVSpread(set)]);
    assert.deepEqual(await rows.locator('.frontier-set-move > span:last-child').allTextContents(),set.moves);
    await details.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode())));
    await rows.locator('button img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
    assert.equal(await rows.locator('.frontier-pokemon-sprite').getAttribute('src'),assetPath('/pokemon/emerald/normal/245.png'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    await page.screenshot({path:`/private/tmp/frontier-sets-${width}.png`,fullPage:false});
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape');
    assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('2'); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.getByRole('button').click();
    assert.equal(await details.locator('abbr').nth(1).getAttribute('title'),'Possible abilities');
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('#007');
    assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.getByRole('button').click();
    assert.deepEqual(await rows.locator('.frontier-set-move > span:last-child').allTextContents(),['Flail','—','—','—']);
    // Trainer links are pool membership for this exact ID, not species matches.
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('1'); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.getByRole('button').click();
    assert.deepEqual(await details.locator('.frontier-set-trainers li span').allTextContents(),eligibleFrontierTrainers(frontierPokemon[0]).map(t => t.name));
    assert.equal(await details.locator('.frontier-set-trainers ul').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
    assert.equal(await page.getByRole('dialog').evaluate(e => e.scrollWidth > e.clientWidth),false);
    await details.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
    assert.deepEqual(await details.locator('img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))),eligibleFrontierTrainers(frontierPokemon[0]).map(t => assetPath(`/trainers/frontier/${t.sprite}.png`)));
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('127'); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.getByRole('button').click();
    assert.equal(await details.locator('.frontier-set-trainers p').innerText(),'No verified trainer associations.');
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('');
    // All collapsed records keep four move slots, the item, and the adjacent number.
    assert.equal(await page.locator('.frontier-set-move').count(),882*4);
    assert.deepEqual(await rows.locator('.frontier-set-name strong').allTextContents(),frontierPokemon.map(s => s.id));
    assert.equal(await rows.locator('.frontier-set-number').count(),0);
    assert.equal(await details.locator('h2').count(),0);
    assert.deepEqual(await rows.locator('.frontier-set-item > span').allTextContents(),frontierPokemon.map(s => s.item));
    assert.deepEqual(await rows.locator('.frontier-set-item img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))),frontierPokemon.map(s => assetPath(`/items/${battleItemId(s.item)}.png`)));
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(n => [...n.querySelectorAll('.frontier-set-move > span:last-child')].map(e => e.textContent))),frontierPokemon.map(s => Array.from({length:4},(_,i) => s.moves[i] || '—')));
    assert.deepEqual(await rows.locator('.frontier-set-move img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))),frontierPokemon.flatMap(s => s.moves.map(n => battleMove(n).type).filter(t => t !== 'MYSTERY').map(t => assetPath(`/types/icons/${t.toLowerCase()}.png`))));
    assert.equal(await rows.evaluateAll(nodes => nodes.every(n => {
      const l=n.querySelector('.frontier-set-pokemon').getBoundingClientRect(), r=n.querySelector('.frontier-set-moves').getBoundingClientRect();
      const moves=[...n.querySelectorAll('.frontier-set-move')].map(e=>e.getBoundingClientRect());
      const name=n.querySelector('.frontier-set-name strong').getBoundingClientRect(), item=n.querySelector('.frontier-set-item').getBoundingClientRect();
      const itemName=n.querySelector('.frontier-set-item > span').getBoundingClientRect(), itemIcon=n.querySelector('.frontier-set-item img').getBoundingClientRect();
      return itemIcon.left >= itemName.right && item.top >= name.bottom && l.right <= r.left && moves[0].top===moves[1].top && moves[2].top===moves[3].top && moves[2].top > moves[0].top;
    })),true);
    await page.screenshot({path:`/private/tmp/frontier-sets-refined-list-${width}.png`,fullPage:false});
    // Worst-case ability and three-stat spreads must also fit the one-line facts.
    for (const number of [1,2,127,frontierPokemon.find(s => s.id === 'Shiftry 1').entry,frontierPokemon.find(s => s.id === 'Crawdaunt 1').entry]) {
      if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill(String(number)); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.getByRole('button').click();
      await page.waitForFunction(() => {const e=document.querySelector('.frontier-set-facts'); return e && parseFloat(getComputedStyle(e).fontSize)>0 && e.scrollWidth<=Math.ceil(e.getBoundingClientRect().width)+1;});
      assert.equal(await details.locator('.frontier-set-facts').evaluate(e => {
        const rect=e.getBoundingClientRect(); const fields=[...e.children].map(n=>n.getBoundingClientRect());
        return fields.every(f => f.top === fields[0].top && f.right <= rect.right+1) && e.scrollWidth <= Math.ceil(rect.width)+1;
      }),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    }
    await details.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
    await page.screenshot({path:`/private/tmp/frontier-sets-refined-expanded-${width}.png`,fullPage:false});
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('missing-pokemon');
    assert.equal(await rows.count(),0); assert.equal(await details.count(),0);
    assert.equal(await page.getByRole('status').innerText(),'No results.');
    await page.getByRole('button',{name:'Clear search',exact:true}).click();
    assert.equal(await rows.count(),882);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.first().getByRole('button').click();
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await brainsTab.click();
    assert.equal(await brainsTab.getAttribute('aria-selected'),'true');
    assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('');
    const brainSets = searchFrontierBrains();
    assert.equal(await rows.count(),36);
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(n => n.dataset.setKey)),brainSets.map(frontierResourceSetKey));
    assert.equal(await rows.evaluateAll(nodes => nodes.every(node => !node.hasAttribute('data-entry'))),true);
    assert.deepEqual(await rows.locator('.frontier-set-name strong').allTextContents(),brainSets.map(set => `${set.species} ${frontierBrainInfo(set).symbol}`));
    assert.deepEqual(await rows.locator('.frontier-set-item > span').allTextContents(),brainSets.map(set => set.item));
    assert.deepEqual(await rows.evaluateAll(nodes => nodes.map(n => [...n.querySelectorAll('.frontier-set-move > span:last-child')].map(e => e.textContent))),brainSets.map(set => set.moves));
    assert.equal(await rows.evaluateAll(nodes => nodes.every(n => {
      const left=n.querySelector('.frontier-set-pokemon').getBoundingClientRect(), right=n.querySelector('.frontier-set-moves').getBoundingClientRect();
      const moves=[...n.querySelectorAll('.frontier-set-move')].map(e=>e.getBoundingClientRect());
      return left.right <= right.left && moves[0].top===moves[1].top && moves[2].top===moves[3].top && moves[2].top > moves[0].top;
    })),true);
    await rows.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
    await page.screenshot({path:`/private/tmp/frontier-brains-list-${width}.png`,fullPage:false});
    for (const [index, set] of brainSets.entries()) {
      if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.nth(index).getByRole('button').click();
      assert.equal(await details.count(),1);
      const brain = frontierBrainInfo(set);
      assert.deepEqual(await details.locator('dd').allTextContents(),[set.nature,set.possibleAbility.replaceAll(' / ', '/'),frontierEVSpread(set)]);
      assert.equal(await details.locator('.frontier-set-brain span').innerText(),`${brain.name} · ${brain.facility} · ${brain.symbol} Symbol`);
      assert.equal(await details.locator('.frontier-set-brain img').getAttribute('src'),assetPath(`/trainers/frontier/${brain.sprite}.png`));
      await details.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
      await page.waitForFunction(() => {const e=document.querySelector('.frontier-set-facts'); return e && parseFloat(getComputedStyle(e).fontSize)>0 && e.scrollWidth<=Math.ceil(e.getBoundingClientRect().width)+1;});
      assert.equal(await details.locator('.frontier-set-facts').evaluate(e => {
        const rect=e.getBoundingClientRect(), fields=[...e.children].map(n=>n.getBoundingClientRect());
        return fields.every(f => f.top === fields[0].top && f.right <= rect.right+1) && e.scrollWidth <= Math.ceil(rect.width)+1;
      }),true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    }
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill(' SnOrLaX '); assert.equal(await rows.count(),2); assert.equal(await details.count(),0);
    assert.deepEqual(await rows.locator('.frontier-set-name strong').allTextContents(),['Snorlax Silver','Snorlax Gold']);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.first().getByRole('button').click(); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('Lucy Silver'); assert.equal(await rows.count(),3);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await rows.nth(1).getByRole('button').click();
    await details.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
    await page.screenshot({path:`/private/tmp/frontier-brains-expanded-${width}.png`,fullPage:false});
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await standardTab.click(); assert.equal(await details.count(),0); assert.equal(await rows.count(),882);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('882'); assert.equal(await rows.count(),1);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await brainsTab.click(); assert.equal(await search.inputValue(),'Lucy Silver'); assert.equal(await rows.count(),3); assert.equal(await details.count(),0);
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('Noland'); assert.equal(await rows.count(),0); assert.equal(await page.getByRole('status').innerText(),'No results.');
    await brainsTab.focus(); await page.keyboard.press('Home'); assert.equal(await standardTab.getAttribute('aria-selected'),'true');
    assert.equal(await search.inputValue(),'882');
    await page.keyboard.press('End'); assert.equal(await brainsTab.getAttribute('aria-selected'),'true');
    if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill(''); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await standardTab.click(); if (await page.getByRole('dialog').count()) await page.keyboard.press('Escape'); await search.fill('');
  }
  assert.deepEqual(await page.evaluate(() => window.__frontierScrollCalls),[]);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  assert.equal(await page.getByRole('link',{name:'Pokémon Sets',exact:true}).count(),1);
  assert.equal(await page.getByRole('link',{name:'Trainers',exact:true}).count(),1);
  await page.getByRole('link',{name:'Pokémon Sets',exact:true}).click();
  assert.equal(await rows.count(),882); assert.equal(await details.count(),0);
  assert.deepEqual(errors,[]);
  console.log('Frontier tabs passed: 36 verified Brain entries, Silver/Gold identity, per-tab search, keyboard tabs, all Brain popup details and sprites; standard sets passed: 882 rows, name/number search, values, abilities, empty move slots, single popup, keyboard, Back, assets and no overflow at 320/375/390/430px.');
} finally { await browser.close(); }
