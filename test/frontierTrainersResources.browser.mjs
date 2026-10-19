import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {frontierTrainers} from '../src/battle/data/frontierTrainers.js';
import {trainerKey} from '../src/battle/towerRules.js';
import {frontierTrainerSprite} from '../src/battle/towerTrainers.js';
import {speciesByName} from '../src/battle/reference.js';
import {searchResourceTrainers, resourceTrainerSets, resourceBrainTeams, resourceBrainIVRange} from '../src/resources/frontier/trainers.js';
import {assetPath} from './helpers/browserPaths.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page = await browser.newPage({viewport:{width:375,height:844}}), errors=[];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Resources',exact:true}).click();
  await page.getByRole('link',{name:'Trainers',exact:true}).click();
  const search = page.getByRole('searchbox',{name:'Search Frontier Trainers',exact:true});
  const regular = page.getByRole('tab',{name:'Trainers',exact:true});
  const brains = page.getByRole('tab',{name:'Frontier Brains',exact:true});
  const rows = page.locator('.frontier-trainer-list > li');
  const details = page.locator('.frontier-trainer-details');
  const grid = details.locator('.frontier-trainer-grid');
  const decode = async locator => locator.evaluateAll(imgs => Promise.all(imgs.map(img => {img.loading='eager'; return img.decode();})));
  const overflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
  const checkGrid = async (locator, sets, numbered) => {
    assert.deepEqual(await locator.locator('li > span').allTextContents(),sets.map(s => numbered ? s.id : s.species));
    assert.deepEqual(await locator.locator('img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))),sets.map(s => assetPath(`/pokemon/emerald/normal/${speciesByName.get(s.species.toLowerCase()).nationalDexId}.png`)));
    assert.equal(await locator.locator('a,button,dl,.frontier-set-moves').count(),0);
    assert.equal(await locator.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
    await decode(locator.locator('img'));
  };
  assert.equal(await regular.getAttribute('aria-selected'),'true');
  await page.evaluate(() => {
    window.__trainerResourceScroll=[];
    for (const [target,key] of [[window,'scrollTo'],[Element.prototype,'scrollIntoView']]) {
      const original=target[key]; target[key]=function(...args){window.__trainerResourceScroll.push(key);return original.apply(this,args);};
    }
  });
  for (const width of [320,375,390,430]) {
    await page.setViewportSize({width,height:844}); await search.fill('');
    assert.equal(await rows.count(),300);
    assert.deepEqual(await rows.evaluateAll(ns => ns.map(n => n.dataset.trainerKey)),frontierTrainers.map(trainerKey));
    assert.deepEqual(await rows.locator('.frontier-trainer-identity strong').allTextContents(),frontierTrainers.map(t => t.name));
    assert.deepEqual(await rows.locator('.frontier-trainer-class').allTextContents(),frontierTrainers.map(t => t.trainerClass));
    assert.deepEqual(await rows.locator('.frontier-trainer-ivs').allTextContents(),frontierTrainers.map(t => String(t.ivs)));
    assert.deepEqual(await rows.locator('.frontier-trainer-count').allTextContents(),frontierTrainers.map(t => String(t.pokemonSetIds.length)));
    assert.deepEqual(await rows.locator('.frontier-trainer-toggle > img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))),frontierTrainers.map(t => assetPath(`/trainers/frontier/${frontierTrainerSprite(t.trainerClass)}.png`)));
    await decode(rows.locator('.frontier-trainer-toggle > img'));
    assert.deepEqual(await rows.locator('.frontier-trainer-pool-size').allTextContents(),frontierTrainers.map(t => `${t.pokemonSetIds.length} sets`));
    assert.equal(await rows.evaluateAll(nodes => nodes.every(n => {
      const sprite=n.querySelector('.frontier-trainer-toggle > img').getBoundingClientRect();
      const cls=n.querySelector('.frontier-trainer-class'), iv=n.querySelector('.frontier-trainer-iv-label');
      return sprite.width===48 && sprite.height===48 && cls.nextElementSibling===iv;
    })),true);
    assert.equal(await page.getByRole('status').innerText(),''); await overflow();
    await page.screenshot({path:`/private/tmp/frontier-trainers-list-${width}.png`,fullPage:false});
    for (const value of [' bRaDy ','youngster','triathlete swimmer','missing']) {
      await search.fill(value);
      assert.deepEqual(await rows.locator('strong').allTextContents(),searchResourceTrainers(value).map(t => t.name));
    }
    assert.equal(await page.getByRole('status').innerText(),'No results.');
    await page.getByRole('button',{name:'Clear search',exact:true}).click();
    await rows.first().getByRole('button').click(); assert.equal(await details.count(),1);
    await checkGrid(grid,resourceTrainerSets(frontierTrainers[0]),true);
    assert.equal(await details.locator('p').count(),0);
    await rows.nth(1).getByRole('button').click(); assert.equal(await details.count(),1);
    assert.equal(await rows.first().getByRole('button').getAttribute('aria-expanded'),'false');
    await rows.nth(1).getByRole('button').click(); assert.equal(await details.count(),0);
    await rows.first().getByRole('button').focus(); await page.keyboard.press('Enter'); assert.equal(await details.count(),1);
    await page.keyboard.press('Space'); assert.equal(await details.count(),0);
    const large = frontierTrainers.reduce((a,b) => a.pokemonSetIds.length>b.pokemonSetIds.length ? a:b);
    await search.fill(`${large.name} ${large.trainerClass}`); assert.equal(await rows.count(),1);
    await rows.getByRole('button').click(); await checkGrid(grid,resourceTrainerSets(large),true); await overflow();
    await page.screenshot({path:`/private/tmp/frontier-trainers-expanded-${width}.png`,fullPage:false});
    await search.fill('BRADY'); assert.equal(await details.count(),0);
    await rows.getByRole('button').click(); await brains.click(); assert.equal(await details.count(),0);
    await search.fill('');
    const brainEntries=searchResourceTrainers('','brains');
    assert.equal(await rows.count(),6);
    assert.deepEqual(await rows.locator('strong').allTextContents(),brainEntries.map(b => b.name));
    assert.deepEqual(await rows.locator('.frontier-trainer-count').allTextContents(),Array(6).fill('6'));
    assert.deepEqual(await rows.locator('.frontier-trainer-ivs').allTextContents(),brainEntries.map(resourceBrainIVRange));
    assert.deepEqual(await rows.locator('.frontier-trainer-class').allTextContents(),brainEntries.map(b => b.facility));
    await decode(rows.locator('img'));
    for (const [index, brain] of brainEntries.entries()) {
      await rows.nth(index).getByRole('button').click(); assert.equal(await details.count(),1);
      const controls=await rows.nth(index).getByRole('button').getAttribute('aria-controls');
      assert.equal(/\s/.test(controls),false); assert.equal(await details.getAttribute('id'),controls);
      assert.deepEqual(await details.locator('h2').allTextContents(),['Silver Symbol','Gold Symbol']);
      const teams=resourceBrainTeams(brain);
      for (const [i,team] of teams.entries()) await checkGrid(grid.nth(i),team.sets,false);
      assert.equal(await details.locator('[data-entry],.frontier-trainer-set-number').count(),0);
      assert.equal(await rows.nth(index).locator('.frontier-trainer-toggle > img').getAttribute('src'),assetPath(`/trainers/frontier/${brain.sprite}.png`));
      assert.equal(await details.locator('p').count(),0);
      await overflow();
    }
    await page.screenshot({path:`/private/tmp/frontier-trainers-brains-${width}.png`,fullPage:false});
    await search.fill('battle palace'); assert.deepEqual(await rows.locator('strong').allTextContents(),['Spenser']); assert.equal(await details.count(),0);
    await search.fill('Noland'); assert.equal(await rows.count(),0);
    await regular.click(); assert.equal(await search.inputValue(),'BRADY'); assert.equal(await rows.count(),1); assert.equal(await details.count(),0);
    await regular.focus(); await page.keyboard.press('End'); assert.equal(await brains.getAttribute('aria-selected'),'true');
    await search.fill(''); await brains.focus(); await page.keyboard.press('Home'); assert.equal(await regular.getAttribute('aria-selected'),'true');
    await search.fill(''); await overflow();
    // Pointer states retain the same understated row appearance.
    const button=rows.first().getByRole('button');
    const background=()=>button.evaluate(e=>getComputedStyle(e).backgroundColor);
    await button.blur();await page.mouse.move(0,0);const normal=await background();await button.hover();assert.equal(await background(),normal);await page.mouse.down();assert.equal(await background(),normal);await page.mouse.move(0,0);await page.mouse.up();
  }
  assert.deepEqual(await page.evaluate(() => window.__trainerResourceScroll),[]);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  assert.equal(await page.getByRole('link',{name:'Trainers',exact:true}).count(),1);
  await page.getByRole('link',{name:'Pokémon Sets',exact:true}).click();
  assert.equal(await page.locator('.frontier-set-list > li').count(),882);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await page.getByRole('link',{name:'Trainers',exact:true}).click();
  assert.equal(await rows.count(),300); assert.equal(await regular.getAttribute('aria-selected'),'true'); assert.equal(await details.count(),0);
  assert.deepEqual(errors,[]);
  console.log('Resources Trainers passed: 300 ordered identities, exact IVs/counts/pools/numbers, decoded trainer/Pokémon assets, six Brains and all 36 Symbol entries, tab search/reset, expansion and keyboard, three-column grids, unchanged pointer appearance/scroll calls, Back and Pokémon Sets navigation; 320/375/390/430px without overflow.');
} finally {await browser.close();}
