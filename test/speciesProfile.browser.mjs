import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import overview from '../src/resources/data/overview.json' with {type: 'json'};
import reference from '../src/data/reference.json' with {type: 'json'};
import pokemonTypes from '../src/data/pokemonTypes.json' with {type: 'json'};
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 800}, hasTouch: true}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__profileScrollCalls = [];
    for (const method of ['scrollTo', 'scrollBy', 'scroll']) {
      const original = window[method];
      window[method] = function (...args) {window.__profileScrollCalls.push(method); return original.apply(this, args);};
    }
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {window.__profileScrollCalls.push('scrollIntoView'); return original.apply(this, args);};
  });
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
  await page.getByRole('button', {name: 'Resources', exact: true}).click();
  const homeSearch = page.getByRole('searchbox', {name: 'Search Pokémon, moves and abilities', exact: true});
  await homeSearch.fill('bulb');
  await page.getByRole('link', {name: 'Pokémon Database', exact: true}).click();
  const catalogSearch = page.getByRole('searchbox', {name: 'Search Pokémon Database', exact: true});
  const expectHeader = async name => page.locator('.header .brand span').filter({hasText: /^Emerald Companion$/}).waitFor();
  const open = async (dex, name) => {
    await catalogSearch.fill(`#${String(dex).padStart(3, '0')}`);
    await page.locator('.resources-species-entry').click();
    await page.getByRole('heading', {name, exact: true}).waitFor();
    await expectHeader(name);
  };
  const back = async () => {
    await page.getByRole('button', {name: 'Back to National Pokédex', exact: true}).click();
    await catalogSearch.waitFor(); await expectHeader('Pokémon Database');
  };
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({width, height: 800});
    // Every switch reuses the mounted profile and canonical data, with one Back destination.
    for (let [origin, originName, switches] of [
      [1, 'Bulbasaur', [[2, 'Ivysaur'], [3, 'Venusaur']]],
      [133, 'Eevee', [[134, 'Vaporeon']]],
      [79, 'Slowpoke', [[199, 'Slowking']]],
      [290, 'Nincada', [[292, 'Shedinja']]],
    ]) {
      await open(origin, originName);
      const profile = page.locator('.species-profile');
      await page.evaluate(() => {window.__profileScrollCalls = []; window.__originalSpeciesProfile = document.querySelector('.species-profile');});
      for (const [next, name] of switches) {
        const member = profile.locator('.species-evolution-grid-member').filter({has: page.getByRole('button', {name: `View ${name} profile`, exact: true})});
        const artwork = member.getByRole('button', {name: `View ${name} profile`, exact: true});
        // Adjacent names, requirements and whitespace are not navigation controls.
        await member.locator('.species-evolution-name').click(); await expectHeader(originName);
        await member.locator('.species-evolution-grid-method').click(); await expectHeader(originName);
        const box = await member.boundingBox();
        await page.mouse.click(box.x + 1, box.y + 1); await expectHeader(originName);
        const bounds = await artwork.boundingBox(), image = await artwork.locator('img').boundingBox();
        assert.equal(bounds.width, image.width); assert.equal(bounds.height, image.height);
        const appearance = () => artwork.evaluate(element => {const c = getComputedStyle(element); return [c.color, c.backgroundColor, c.boxShadow, c.transform];});
        await page.mouse.move(0, 0); const plain = await appearance();
        await artwork.hover(); assert.deepEqual(await appearance(), plain);
        await page.mouse.down(); assert.deepEqual(await appearance(), plain);
        await page.mouse.move(0, 0); await page.mouse.up();
        await artwork.focus(); await page.keyboard.press('ArrowRight');
        assert.equal(await artwork.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
        await page.keyboard.press('Enter'); await expectHeader(name);
        await page.getByRole('heading', {name, exact: true}).waitFor();
        assert.equal(await profile.locator('.species-kicker').innerText(), `#${String(next).padStart(3, '0')} · GEN ${next <= 151 ? 1 : next <= 251 ? 2 : 3}`);
        assert.equal(await profile.locator('.species-identity > img').getAttribute('src'), `/pokemon/artwork/normal/${next}.png`);
        assert.deepEqual(await profile.locator('.species-types img').evaluateAll(images => images.map(image => image.getAttribute('src'))), pokemonTypes[next].map(type => `/types/icons/${type}.png`));
        const canonical = Object.values(reference.species).find(species => species.nationalDexId === next);
        assert.deepEqual(await profile.locator('.species-abilities dt').allTextContents(), canonical.abilities.map(id => reference.abilityNames[id]));
        assert.equal(await profile.getByRole('region', {name: 'Pokédex Entry Emerald'}).locator('p').innerText(), overview.emeraldEntries[next]);
        assert.equal(await page.evaluate(() => window.__originalSpeciesProfile === document.querySelector('.species-profile')), true);
        const current = page.getByRole('button', {name: `View ${name} profile`, exact: true});
        await current.click(); await expectHeader(name);
        assert.equal(await page.evaluate(() => window.__originalSpeciesProfile === document.querySelector('.species-profile')), true);
        await noOverflow();
        // Subsequent clicks in a multi-step chain must retain the newly selected species.
        originName = name;
      }
      await back(); assert.equal(await catalogSearch.inputValue(), `#${String(origin).padStart(3, '0')}`);
      assert.deepEqual(await page.evaluate(() => window.__profileScrollCalls), []);
    }

    for (const [dex, name, gender, abilities, family] of [
      [1, 'Bulbasaur', '87.5% male · 12.5% female', 1, ['Bulbasaur', 'Ivysaur', 'Venusaur']],
      [2, 'Ivysaur', '87.5% male · 12.5% female', 1, ['Bulbasaur', 'Ivysaur', 'Venusaur']],
      [19, 'Rattata', '50% male · 50% female', 2, ['Rattata', 'Raticate']],
      [81, 'Magnemite', 'Genderless', 2, ['Magnemite', 'Magneton']],
      [133, 'Eevee', '87.5% male · 12.5% female', 1, ['Eevee', 'Vaporeon', 'Jolteon', 'Flareon', 'Espeon', 'Umbreon']],
      [129, 'Magikarp', '50% male · 50% female', 1, ['Magikarp', 'Gyarados']],
      [79, 'Slowpoke', '50% male · 50% female', 2, ['Slowpoke', 'Slowbro', 'Slowking']],
      [290, 'Nincada', '50% male · 50% female', 1, ['Nincada', 'Ninjask', 'Shedinja']],
      [60, 'Poliwag', '50% male · 50% female', 2, ['Poliwag', 'Poliwhirl', 'Poliwrath', 'Politoed']],
      [265, 'Wurmple', '50% male · 50% female', 1, ['Wurmple', 'Silcoon', 'Cascoon', 'Beautifly', 'Dustox']],
      [132, 'Ditto', 'Genderless', 1, ['Ditto']],
      [25, 'Pikachu', '50% male · 50% female', 1, ['Pichu', 'Pikachu', 'Raichu']],
      [349, 'Feebas', '50% male · 50% female', 1, ['Feebas', 'Milotic']],
      [386, 'Deoxys', 'Genderless', 1, ['Deoxys']],
    ]) {
      await open(dex, name);
      const profile = page.locator('.species-profile');
      assert.equal(await profile.locator('.species-kicker').innerText(), `#${String(dex).padStart(3, '0')} · GEN ${dex <= 151 ? 1 : dex <= 251 ? 2 : 3}`);
      assert.equal(await profile.locator('.species-gender').innerText(), gender);
      assert.equal(await profile.locator('.species-abilities dt').count(), abilities);
      assert.deepEqual(await profile.locator('.species-evolution-name').allTextContents(), family);
      assert.equal(await profile.getByRole('region', {name: 'Pokédex Entry Emerald'}).locator('p').innerText(), overview.emeraldEntries[dex]);
      assert.deepEqual(await profile.getByRole('tab').allTextContents(), ['Overview', 'Stats & Matchups', 'Locations', 'Learnset', 'More']);
      assert.equal(await profile.getByRole('tab', {name: 'Overview', exact: true}).getAttribute('aria-selected'), 'true');
      assert.equal(await profile.getByRole('tab').count(), 5);
      const polish = await profile.evaluate(element => {
        const label = element.querySelector('[aria-selected="true"] .species-tab-label');
        const range = document.createRange(); range.selectNodeContents(label);
        return {labelWidth: label.getBoundingClientRect().width, textWidth: range.getBoundingClientRect().width,
          underline: getComputedStyle(label).borderBottomWidth,
          spacing: [...element.querySelectorAll('.species-section')].map(section => getComputedStyle(section).marginTop)};
      });
      assert.ok(Math.abs(polish.labelWidth - polish.textWidth) < 1);
      assert.equal(polish.underline, '2px');
      assert.deepEqual(polish.spacing, ['8px', '16px', '16px']);
      assert.equal(await profile.locator('.species-tabs').evaluate(element => getComputedStyle(element).borderBottomWidth), '0px');
      assert.ok(await profile.locator('.species-section h2').evaluateAll(headings => headings.every(heading => getComputedStyle(heading).borderBottomWidth === '1px')));
      assert.equal(await profile.locator('.species-tabs button').first().evaluate(element => getComputedStyle(element).fontSize), width >= 700 ? '12.8px' : '10.4px');
      if (width >= 700) assert.equal(await profile.locator('.species-identity').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ')[0]), '200px');
      const cells = profile.locator('.species-evolution-grid-member');
      assert.equal(await cells.count(), family.length);
      const geometry = await cells.evaluateAll(cells => cells.map(cell => {
        const rect = cell.getBoundingClientRect();
        const image = cell.querySelector('img').getBoundingClientRect();
        const name = cell.querySelector('.species-evolution-name').getBoundingClientRect();
        const method = cell.querySelector('p').getBoundingClientRect();
        return {x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width,
          imageWidth: image.width, imageHeight: image.height, nameY: name.top,
          methodY: method.top, nameBottom: name.bottom, textWidth: name.width};
      }));
      const group = await profile.locator('.species-evolution-grid').boundingBox();
      const panel = await profile.locator('#species-overview').boundingBox();
      assert.ok(Math.abs(group.x + group.width / 2 - (panel.x + panel.width / 2)) < 1);
      assert.ok(geometry.every(cell => cell.width <= 112 && Math.abs(cell.width - geometry[0].width) < 1
        && cell.imageWidth === 64 && cell.imageHeight === 64 && cell.methodY - cell.nameBottom === 5));
      const rows = [];
      for (const cell of geometry) {
        const row = rows.find(row => Math.abs(row[0].y - cell.y) < 1);
        if (row) row.push(cell); else rows.push([cell]);
      }
      assert.deepEqual(rows.map(row => row.length), Array.from({length: Math.ceil(family.length / 3)}, (_, index) => Math.min(3, family.length - index * 3)));
      for (const row of rows) {
        assert.ok(Math.abs((row[0].x + row.at(-1).right) / 2 - (group.x + group.width / 2)) < 1);
        for (let column = 1; column < row.length; column++) {
          assert.ok(Math.abs(row[column].x - row[column - 1].right - 12) < 1);
          assert.equal(row[column].nameY, row[0].nameY);
        }
      }
      for (let row = 1; row < rows.length; row++) assert.ok(Math.abs(rows[row][0].y - Math.max(...rows[row - 1].map(cell => cell.bottom)) - 16) < 1);
      assert.equal(await profile.locator('.species-evolution-stages, .species-evolution-column').count(), 0);
      assert.equal(await cells.first().locator('.species-evolution-grid-method').innerText(), 'Base stage');
      if (dex === 133) assert.deepEqual(await cells.locator('.species-evolution-grid-method').allTextContents(), ['Base stage', 'Use Water Stone', 'Use Thunder Stone', 'Use Fire Stone', 'Level up · Friendship 220+ · Noon–11:59 PM (game clock)', 'Level up · Friendship 220+ · Midnight–11:59 AM (game clock)']);

      for (const tab of await profile.getByRole('tab').all()) assert.equal(await tab.isEnabled(), true);
      await profile.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      assert.equal(await profile.locator('.species-identity > img').evaluate(image => image.naturalWidth > 0), true);
      if (dex === 386) assert.match(await profile.locator('.species-identity > img').getAttribute('src'), /deoxys-speed/);
      assert.ok((await profile.locator('.species-types img').all()).length >= 1);
      assert.equal(await profile.locator('[title*="favorite"], .shiny-star').count(), 0);
      assert.equal(await profile.getByRole('button', {name: /Back/}).count(), 0);
      await noOverflow();
      if ([1, 129, 79, 290, 133, 60, 265].includes(dex)) {
        await page.evaluate(() => document.activeElement?.blur());
        await page.screenshot({path: `/private/tmp/resources-profile-artwork-nav-${width}-${dex}.png`, fullPage: true});
      }
      await back();
      assert.equal(await catalogSearch.inputValue(), `#${String(dex).padStart(3, '0')}`);
    }
  }
  await catalogSearch.fill('#002');
  await page.evaluate(() => {window.__profileScrollCalls = [];});
  await page.locator('.resources-species-entry').click(); await expectHeader('Ivysaur');
  await page.getByRole('button', {name: 'View Venusaur profile', exact: true}).click(); await expectHeader('Venusaur');
  await page.getByRole('heading', {name: 'Venusaur', exact: true}).waitFor();
  await back(); assert.equal(await catalogSearch.inputValue(), '#002');
  assert.deepEqual(await page.evaluate(() => window.__profileScrollCalls), []);
  await catalogSearch.fill('#029'); await page.locator('.resources-species-entry').click();
  assert.equal(await page.locator('.species-gender').innerText(), 'Female only'); await back();
  await catalogSearch.fill('#032'); await page.locator('.resources-species-entry').click();
  assert.equal(await page.locator('.species-gender').innerText(), 'Male only'); await back();
  // Simulate unavailable artwork: local sprite fallback must actually decode.
  await page.route('**/pokemon/artwork/normal/1.png', route => route.abort());
  await open(1, 'Bulbasaur');
  await page.locator('.species-identity > img[src="/pokemon/emerald/normal/1.png"]').waitFor();
  await page.locator('.species-identity > img').evaluate(image => image.decode());
  await back(); await page.unroute('**/pokemon/artwork/normal/1.png');
  // Native keyboard activation, returning through both levels of the header.
  await catalogSearch.fill('#001'); await page.locator('.resources-species-entry').focus(); await page.keyboard.press('Enter');
  await expectHeader('Bulbasaur'); await back();
  await page.getByRole('button', {name: 'Back to Resources', exact: true}).click();
  assert.equal(await homeSearch.inputValue(), 'bulb');
  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  await page.getByRole('main', {name: 'Settings', exact: true}).waitFor();
  assert.deepEqual(errors, []);
  console.log('Species profiles passed: no-save, identity/art/types/genders, one/two abilities, verified Emerald text, three-stage/branch/no-evolution families, profile links, header Back/query retention, disabled future tabs, keyboard, artwork fallback; 320/375/390/430/1280px; no overflow or new scroll calls.');
} finally { await browser.close(); }
