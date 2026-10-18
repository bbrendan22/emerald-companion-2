import {assetPath} from './helpers/browserPaths.js';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 800}, hasTouch: true}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
  const navigate = async name => {
    await page.getByRole('button', {name: 'Open navigation', exact: true}).click();
    await page.getByRole('button', {name, exact: true}).click();
  };
  await navigate('Resources');
  const search = page.getByRole('searchbox', {name: 'Search Pokémon, moves and abilities', exact: true});
  const overflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const expectHeader = async title => {
    title = 'Emerald Companion';
    await page.locator('.header .brand span').filter({hasText: new RegExp(`^${title}$`)}).waitFor();
    assert.equal(await page.locator('.header .brand span').innerText(), title);
  };
  const back = async () => {
    await page.getByRole('button', {name: 'Back to Resources', exact: true}).click();
    await page.locator('.header .brand span').filter({hasText: /^Emerald Companion$/}).waitFor();
    await search.waitFor();
  };
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  assert.equal(await page.locator('.resources-home h1').count(), 0);
  assert.equal(await page.locator('.resources-hint').count(), 0);
  assert.deepEqual(await page.locator('.resources-section:has(#resources-pokemon-heading) .resources-destinations a').allTextContents(), ['Pokémon Database', 'Moves', 'Abilities']);
  for (const width of [320, 375, 390, 430, 1280]) {
    await page.setViewportSize({width, height: 800});
    await search.fill(''); await overflow();
    assert.deepEqual(await page.locator('.resources-section > h2').allTextContents(), ['Pokémon', 'Items & Berries', 'Battle Frontier', 'Tools', 'Charts']);
    const expectedSections = [
      ['Battle', 'Utility', 'Berries', 'Poké Balls', 'TM/HM', 'Misc.'],
      ['Pokémon Sets', 'Trainers'],
      ['IV Calculator', 'Hidden Power Calculator', 'Stat Calculator', 'Move Coverage'],
      ['Nature Chart', 'Type Chart', 'Emerald Pickup Table', 'Move Tutors'],
    ];
    for (const [index, expected] of expectedSections.entries()) {
      const section = page.locator('.resources-section').nth(index + 1);
      assert.deepEqual(await section.locator('li').allTextContents(), expected);
      assert.equal(await section.locator('a, button, [tabindex], [role="link"]').count(), index === 0 ? 6 : index === 2 ? 4 : index === 3 ? 4 : 0);
    }
    const geometry = await page.evaluate(() => {
      const field = document.querySelector('.resources-search-field').getBoundingClientRect();
      const section = document.querySelector('.resources-section').getBoundingClientRect();
      return {gap: section.top - field.bottom, fieldHeight: field.height,
        heights: [...document.querySelectorAll('.resources-destinations li')].map(row => row.getBoundingClientRect().height),
        fonts: [...document.querySelectorAll('.resources-destinations li')].map(row => getComputedStyle(row).fontSize)};
    });
    assert.equal(geometry.gap, 18); assert.equal(geometry.fieldHeight, 46);
    assert.ok(geometry.heights.every(height => height === 40));
    assert.ok(geometry.fonts.every(font => font === '14.4px'));

    for (const [linkIndex, link] of (await page.locator('.resources-section:has(#resources-pokemon-heading) .resources-destinations a').all()).entries()) {
      const bounds = await link.boundingBox();
      const textWidth = await link.evaluate(element => {const range = document.createRange(); range.selectNodeContents(element); return range.getBoundingClientRect().width;});
      assert.ok(Math.abs(bounds.width - textWidth) < 2);
      const row = await link.locator('..').boundingBox();
      await page.touchscreen.tap(row.x + row.width - 8, row.y + row.height / 2);
      assert.equal(await page.locator('.resources-catalog').count(), 0, 'whitespace must not navigate');
      const appearance = () => link.evaluate(element => {const c = getComputedStyle(element); return [c.color, c.backgroundColor, c.boxShadow, c.transform, c.textDecorationLine];});
      await page.mouse.move(0, 0); const normal = await appearance();
      await link.hover(); assert.deepEqual(await appearance(), normal);
      await page.mouse.down(); assert.deepEqual(await appearance(), normal);
      await page.mouse.move(0, 0); await page.mouse.up();
      await search.focus();
      for (let step = 0; step <= linkIndex; step++) await page.keyboard.press('Tab');
      assert.equal(await link.evaluate(element => document.activeElement === element), true);
      assert.equal(await link.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
    }
    await page.evaluate(() => document.activeElement?.blur());
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: `/private/tmp/resources-sprites-home-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Pokémon Database', exact: true}).click();
    await expectHeader('Pokémon Database');
    const dexSearch = page.getByRole('searchbox', {name: 'Search Pokémon Database', exact: true});
    const rows = page.locator('.resources-pokedex-row');
    const numbers = await rows.locator('.resources-pokedex-number').allTextContents();
    assert.deepEqual(numbers, Array.from({length: 386}, (_, index) => `#${String(index + 1).padStart(3, '0')}`));
    assert.deepEqual(await rows.locator('.resources-pokedex-sprite img').evaluateAll(images => images.map(image => image.getAttribute('src'))), Array.from({length: 386}, (_, index) => assetPath(`/pokemon/emerald/normal/${index + 1}.png`)));
    // Decode actual browser images, including offscreen lazy sprites, rather than checking filenames alone.
    await rows.locator('img').evaluateAll(images => Promise.all(images.map(image => {image.loading = 'eager'; return image.decode();})));
    assert.equal(await rows.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0)), true);
    assert.equal(await rows.locator('.resources-pokedex-types img').evaluateAll(images => images.every(image => image.alt.endsWith(' type') && !image.src.includes('fairy'))), true);
    const alignment = await rows.evaluateAll(rows => rows.map(row => [...row.querySelector('.resources-species-entry').children].map(cell => cell.getBoundingClientRect().left)));
    assert.ok(alignment.every(columns => columns.every((left, index) => left === alignment[0][index])));
    for (const [number, name, types] of [[1, 'Bulbasaur', ['Grass', 'Poison']], [6, 'Charizard', ['Fire', 'Flying']], [25, 'Pikachu', ['Electric']], [152, 'Chikorita', ['Grass']], [260, 'Swampert', ['Water', 'Ground']], [358, 'Chimecho', ['Psychic']], [386, 'Deoxys', ['Psychic']]]) {
      await dexSearch.fill(`#${String(number).padStart(3, '0')}`);
      assert.equal(await rows.count(), 1);
      assert.equal(await rows.locator('.resources-pokedex-name').innerText(), name);
      assert.equal(await rows.locator('.resources-pokedex-number').innerText(), `#${String(number).padStart(3, '0')}`);
      assert.deepEqual(await rows.locator('.resources-pokedex-types img').evaluateAll(images => images.map(image => image.alt)), types.map(type => `${type} type`));
      await rows.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      for (const image of await rows.locator('img').all()) assert.equal(await image.isVisible(), true);
      assert.equal(await page.getByRole('status').innerText(), '');
      await overflow();
      await page.evaluate(() => document.activeElement?.blur());
      await rows.screenshot({path: `/private/tmp/resources-pokedex-${width}-${number}.png`});
      if (width === 320 && number === 25) await page.screenshot({path: '/private/tmp/resources-pokedex-full-320.png', fullPage: true});
    }
    // A failed sprite keeps the reserved slot and row dimensions, with an accessible fallback.
    await dexSearch.fill('#025');
    const beforeFallback = await rows.boundingBox();
    await page.route('**/pokemon/emerald/normal/25.png?failure-check', route => route.abort());
    await rows.locator('.resources-pokedex-sprite img').evaluate(image => {image.src += '?failure-check';});
    await page.getByRole('img', {name: 'Pikachu sprite unavailable', exact: true}).waitFor();
    const afterFallback = await rows.boundingBox();
    assert.equal(afterFallback.height, beforeFallback.height); assert.equal(afterFallback.width, beforeFallback.width);
    await page.unroute('**/pokemon/emerald/normal/25.png?failure-check');
    await back();
    for (const [title, count, query, expected] of [['Pokémon Database', 386, '#358', 'Chimecho'], ['Moves', 354, '  THUNDERB  ', 'Thunderbolt'], ['Abilities', 77, 'overgrow', 'Overgrow']]) {
      await page.getByRole('link', {name: title, exact: true}).tap();
      await page.getByRole('heading', {name: title, exact: true}).waitFor();
      await expectHeader(title);
      await page.locator('.header').getByRole('button', {name: 'Back to Resources', exact: true}).waitFor();
      assert.equal(await page.locator('.header').getByRole('button', {name: 'Back to Resources', exact: true}).count(), 1);
      assert.equal(await page.locator('main').getByRole('button', {name: 'Back to Resources', exact: true}).count(), 0);
      assert.equal(await page.locator('.resources-catalog-list li').count(), count);
      if (title === 'Pokémon Database') assert.equal(await page.getByRole('status').innerText(), '');
      assert.equal(await page.locator('.resources-catalog h1').evaluate(element => document.activeElement === element), true);
      await overflow();
      const catalogSearch = page.getByRole('searchbox', {name: `Search ${title}`, exact: true});
      await catalogSearch.fill(query);
      assert.match(await page.locator('.resources-catalog-list').innerText(), new RegExp(expected));
      if (title === 'Pokémon Database') assert.equal(await page.getByRole('status').innerText(), '');
      await catalogSearch.fill('no-such-name'); assert.match(await page.getByRole('status').innerText(), /No results/);
      if (title === 'Pokémon Database') assert.equal(await page.getByRole('status').innerText(), 'No results.');
      await page.getByRole('button', {name: 'Clear search', exact: true}).click();
      assert.equal(await page.locator('.resources-catalog-list li').count(), count);
      await back();
      await expectHeader('Emerald Companion');
      assert.equal(await page.getByRole('link', {name: title, exact: true}).evaluate(element => document.activeElement === element), true);
    }
    for (const [query, name] of [['  PIKA  ', 'Pikachu'], ['#025', 'Pikachu'], ['#386', 'Deoxys'], ['surf', 'Surf'], ['overgrow', 'Overgrow']]) {
      await search.fill(query);
      const result = page.locator('.resources-results a').filter({hasText: name});
      await result.click();
      const selected = page.locator('.resources-catalog-list [aria-current="true"]');
      assert.match(await selected.innerText(), new RegExp(name));
      assert.equal(await selected.evaluate(element => document.activeElement === element), true);
      await overflow(); await back();
      assert.equal(await search.inputValue(), query);
      assert.equal(await result.evaluate(element => document.activeElement === element), true);
    }
    await search.fill('a'); assert.ok(await page.locator('.resources-results li').count() <= 15);
    assert.match(await page.getByRole('status').innerText(), /Refine/); await overflow();
    await page.screenshot({path: `/private/tmp/resources-r1c-search-${width}.png`, fullPage: true});
    for (const query of ['no-such-name', 'x'.repeat(10000)]) {
      await search.fill(query); assert.match(await page.getByRole('status').innerText(), /No results/); await overflow();
    }
    await page.getByRole('button', {name: 'Clear search', exact: true}).click();
    assert.equal(await search.inputValue(), '');
    assert.equal(await search.evaluate(element => document.activeElement === element), true);
  }
  await search.fill('surf'); await search.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  assert.equal(await page.locator('.resources-results a').first().evaluate(element => document.activeElement === element), true);
  await page.keyboard.press('Enter'); await page.getByRole('heading', {name: 'Moves', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Back to Resources', exact: true}).focus(); await page.keyboard.press('Enter');
  assert.equal(await search.inputValue(), 'surf');
  await page.getByRole('button', {name: 'Clear search', exact: true}).click();
  await page.getByRole('link', {name: 'Pokémon Database', exact: true}).focus(); await page.keyboard.press('Enter');
  await page.getByRole('heading', {name: 'Pokémon Database', exact: true}).waitFor();
  await page.screenshot({path: '/private/tmp/resources-r1c-catalog-1280.png', fullPage: false});
  await back();
  for (const name of ['Trainer', 'My Pokémon', 'Battle', 'Resources']) {
    await navigate(name); await page.getByRole('main', {name, exact: true}).waitFor();
  }
  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  await page.getByRole('main', {name: 'Settings', exact: true}).waitFor();
  // Exercise the shared header with an actual owned Pokémon, after Resources use.
  const storage = new Uint8Array(33744); storage.set(makePokemon({species: 25}), 4);
  const encoded = Buffer.from(makeSave({blocks: {storage}})).toString('base64');
  await page.evaluate(encoded => localStorage.setItem('emerald-companion-2.save.v1', encoded), encoded);
  await page.reload(); await navigate('My Pokémon');
  await page.locator('.pokemon-card').first().click(); await page.locator('.pokemon-profile').waitFor();
  await expectHeader('Emerald Companion');
  await page.getByRole('button', {name: 'Back to collection', exact: true}).click();
  await page.locator('.pokemon-card').first().waitFor();
  assert.equal(await page.locator('.pokemon-profile').count(), 0);
  await navigate('Resources'); await search.fill('surf');
  await page.getByRole('link', {name: 'Moves', exact: true}).click();
  await navigate('Resources'); assert.equal(await search.inputValue(), 'surf');
  await page.getByRole('link', {name: 'Moves', exact: true}).click();
  await page.getByRole('button', {name: 'Settings', exact: true}).click();
  await expectHeader('Emerald Companion');
  assert.equal(await page.getByRole('button', {name: 'Back to Resources', exact: true}).count(), 0);
  assert.deepEqual(errors, []);
  console.log('Resources sprites passed: all 386 numbered sprite paths decoded; required species/types visible at every width; aligned columns; stable failed-sprite fallback; exact section order/entries, six Useful Items links and noninteractive remaining sections, 40px rows/18px gap/unchanged search field; text-only hit areas; unchanged hover/pressed styling; keyboard focus; shared-header titles/back; Profile Back; complete catalogs; search, matching entry/focus, back/query retention, keyboard navigation, no-save operation; 320/375/390/430/1280px without overflow.');
} finally { await browser.close(); }
