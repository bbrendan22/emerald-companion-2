import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';

const server = await preview({preview:{host:'127.0.0.1',port:5199,strictPort:true}});
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const navigate = async name => {
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('button',{name,exact:true}).click();
  };
  await mkdir('artifacts/battle-foundation',{recursive:true});
  for (const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
    const header = await page.locator('.header').evaluate(el => el.outerHTML);
    await navigate('Battle');
    const layout = page.locator('.battle-foundation');
    const panels = layout.locator(':scope > section');
    assert.equal(await panels.count(),1);
    assert.ok(await layout.evaluate(el => {
      const [rules,matchup] = [...el.children].map(child=>child.getBoundingClientRect());
      const teams = el.querySelector('.battle-compact-teams').getBoundingClientRect();
      const pair = el.querySelector('.battle-matchup-pair').getBoundingClientRect();
      const [mine,opponent] = [...el.querySelector('.battle-compact-teams').children].map(child=>child.getBoundingClientRect());
      return rules.bottom <= matchup.top
        && teams.bottom <= pair.top && mine.y === opponent.y && mine.right <= opponent.left;
    }),'rules above two full-width panels, with side-by-side teams above matchup');
    assert.equal(await layout.getByRole('heading',{name:'Battle Intelligence',exact:true}).count(),0);
    assert.equal(await layout.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);
    assert.equal(await page.locator('.header').evaluate(el => el.outerHTML),header);
    assert.equal(await page.locator('.battle-foundation > section').count(),1);
    assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
    assert.equal(await page.locator('.battle-matchup-position').count(),2);
    assert.equal(await page.locator('.battle-matchup-sprite').count(),0);
    assert.equal(await page.getByRole('region',{name:'My Team',exact:true}).count(),1);
    assert.equal(await page.getByRole('region',{name:'Opponent Team',exact:true}).count(),1);
    assert.equal(await page.locator('.battle-compact-slot').count(),6);
    assert.ok(await page.locator('.battle-compact-slots').evaluateAll(rows => rows.every(row => {
      const boxes = [...row.children].map(slot => slot.getBoundingClientRect());
      const bounds = row.getBoundingClientRect();
      return boxes.every(box => box.y === boxes[0].y && box.x >= bounds.x && box.right <= bounds.right + 1)
        && Math.abs(boxes[0].x - bounds.x) < 1;
    })));
    assert.ok(await page.locator('.battle-compact-teams > section').evaluateAll(sections => sections.every(section => {
      const bounds=section.getBoundingClientRect();
      const children=section.querySelector('.battle-player-heading')?.children
        ?? section.querySelector('.battle-opponent-trigger').children;
      const boxes=[...children].map(child=>child.getBoundingClientRect());
      return Math.abs(Math.min(...boxes.map(b=>b.x)) - bounds.x)<1;
    })));
    await page.getByRole('button',{name:'Choose opponent trainer: Select Trainer',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'Select opponent trainer'}).count(),1);
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Add Pokémon, My Team, empty slot 1',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'My Team selection'}).count(),1);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.locator('.battle-compact-slots img').count(),0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:`artifacts/battle-foundation/battle-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Battle foundation: stacked panel geometry, integrated team rows, unchanged header, empty matchup positions, top rules control and no overflow at 320/375/390/430/1440px.');
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
