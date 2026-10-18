import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import reference from '../src/data/reference.json' with {type: 'json'};
import ownTypes from '../src/data/pokemonTypes.json' with {type: 'json'};
import {GEN3_TYPE_DISPLAY_ORDER} from '../src/pokemon/typeDisplayOrder.js';
import {baseStatRows, defensiveMatchupGroups} from '../src/resources/speciesStats.js';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 800}, hasTouch: true}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__statsScrollCalls = [];
    for (const name of ['scrollTo', 'scrollBy', 'scroll']) {
      const original = window[name]; window[name] = function (...args) {window.__statsScrollCalls.push(name); return original.apply(this, args);};
    }
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {window.__statsScrollCalls.push('scrollIntoView'); return original.apply(this, args);};
  });
  const navigate = async name => {
    await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
    await page.getByRole('button', {name, exact: true}).click();
  };
  const start = async () => {await navigate('Resources'); await page.getByRole('link', {name: 'Pokémon Database', exact: true}).click();};
  const search = page.getByRole('searchbox', {name: 'Search Pokémon Database', exact: true});
  const colors = ['rgb(237, 132, 147)', 'rgb(237, 170, 112)', 'rgb(222, 203, 117)', 'rgb(120, 169, 232)', 'rgb(139, 200, 166)', 'rgb(186, 152, 227)'];
  const groupColors = {'4': 'rgb(216, 82, 96)', '2': 'rgb(237, 147, 151)', '0.5': 'rgb(143, 214, 160)', '0.25': 'rgb(55, 153, 104)', '0': 'rgb(164, 169, 182)'};
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173'); await start();
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({width, height: 800});
    for (const [dex, name, total] of [[260, 'Swampert', 535], [82, 'Magneton', 465], [6, 'Charizard', 534], [292, 'Shedinja', 236], [386, 'Deoxys', 600]]) {
      await search.fill(`#${String(dex).padStart(3, '0')}`); await page.locator('.resources-species-entry').click();
      await page.getByRole('heading', {name, exact: true}).waitFor();
      const profile = page.locator('.species-profile');
      const identity = await profile.locator('.species-identity').innerHTML();
      const overviewMarkup = await profile.locator('#species-overview').innerHTML();
      await page.evaluate(() => {window.__statsScrollCalls = [];});
      await page.getByRole('tab', {name: 'Stats & Matchups', exact: true}).click();
      const statsPanel = page.getByRole('tabpanel', {name: 'Stats & Matchups', exact: true}); await statsPanel.waitFor();
      assert.equal(await profile.locator('.species-identity').innerHTML(), identity);
      assert.deepEqual(await profile.locator('.species-types img').evaluateAll(images => images.map(image => image.getAttribute('src'))), ownTypes[dex].map(type => assetPath(`/types/icons/${type}.png`)));
      const canonical = Object.values(reference.species).find(species => species.nationalDexId === dex);
      const rows = baseStatRows(canonical.baseStats);
      assert.deepEqual(await statsPanel.locator('.species-base-stat > span').allTextContents(), ['HP', 'Attack', 'Defense', 'Sp. Attack', 'Sp. Defense', 'Speed']);
      assert.deepEqual(await statsPanel.locator('.species-base-stat strong').allTextContents(), rows.map(row => String(row.value)));
      const visuals = await statsPanel.locator('.species-stat-track > span').evaluateAll(bars => bars.map(bar => ({percent: parseFloat(bar.style.width), color: getComputedStyle(bar).backgroundColor})));
      for (const [index, bar] of visuals.entries()) {assert.ok(Math.abs(bar.percent - rows[index].percent) < .001); assert.equal(bar.color, colors[index]);}
      assert.equal(await statsPanel.locator('.species-base-stat-total strong').innerText(), String(total));
      const totalBox = await statsPanel.locator('.species-base-stat-total strong').boundingBox(), panelBox = await statsPanel.boundingBox();
      assert.ok(Math.abs(totalBox.x + totalBox.width - (panelBox.x + panelBox.width)) < 1);
      const expected = defensiveMatchupGroups(ownTypes[dex]);
      assert.deepEqual(await statsPanel.locator('.species-matchup-multiplier').allTextContents(), expected.map(group => group.label));
      for (const [index, group] of expected.entries()) {
        const row = statsPanel.locator('.species-type-matchup').nth(index);
        assert.deepEqual(await row.locator('img').evaluateAll(images => images.map(image => image.getAttribute('src'))), group.types.map(type => assetPath(`/types/icons/${type}.png`)));
        assert.equal(await row.locator('.species-matchup-multiplier').evaluate(element => getComputedStyle(element).color), groupColors[group.multiplier]);
        assert.ok(await row.locator('img').evaluateAll(images => images.every(image => getComputedStyle(image).filter === 'none')));
      }
      await statsPanel.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => document.activeElement?.blur());
      await page.screenshot({path: `/private/tmp/resources-r2c-${width}-${dex}.png`, fullPage: true});
      // Keyboard selection returns to the unchanged Overview and gold-label treatment.
      await page.getByRole('tab', {name: 'Stats & Matchups', exact: true}).focus(); await page.keyboard.press('ArrowLeft');
      await page.getByRole('tabpanel', {name: 'Overview', exact: true}).waitFor();
      assert.equal(await profile.locator('#species-overview').innerHTML(), overviewMarkup);
      assert.deepEqual(await page.evaluate(() => window.__statsScrollCalls), []);
      await page.getByRole('button', {name: 'Back to National Pokédex', exact: true}).click(); await search.waitFor();
      assert.equal(await search.inputValue(), `#${String(dex).padStart(3, '0')}`);
    }
  }
  // Compare the same species in the existing owned profile and Resources, rather than
  // relying only on duplicated expected colors or a new formula in this test.
  const storage = new Uint8Array(33744); storage.set(makePokemon({species: 1}), 4);
  await page.evaluate(encoded => localStorage.setItem('emerald-companion-2.save.v1', encoded), Buffer.from(makeSave({blocks: {storage}})).toString('base64'));
  await page.reload(); await navigate('My Pokémon');
  assert.deepEqual(await page.getByRole('combobox', {name: 'Type', exact: true}).locator('option').evaluateAll(options => options.map(option => option.value).filter(value => value !== 'All')), GEN3_TYPE_DISPLAY_ORDER);
  await page.locator('.pokemon-card').first().click(); await page.locator('.pokemon-profile').waitFor();
  const ownedBars = await page.locator('.profile-stats .profile-stat-track span').evaluateAll(bars => bars.map(bar => ({width: bar.style.width, color: getComputedStyle(bar).backgroundColor})));
  await page.getByRole('button', {name: 'Back to collection', exact: true}).click();
  await start(); await search.fill('#001'); await page.locator('.resources-species-entry').click();
  await page.getByRole('tab', {name: 'Stats & Matchups', exact: true}).click();
  const resourceBars = await page.locator('.species-stat-track > span').evaluateAll(bars => bars.map(bar => ({width: bar.style.width, color: getComputedStyle(bar).backgroundColor})));
  assert.deepEqual(resourceBars, ownedBars);
  assert.deepEqual(errors, []);
  console.log('R2C passed: canonical stats/totals, actual owned-profile color/scale parity, global type dropdown order, preserved own typing, ordered Gen 3 matchup icons/colors, Overview/identity unchanged, keyboard/back retention; 320/375/390/430/1280px, no overflow or new scroll calls.');
} finally { await browser.close(); }
