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
  const measure = () => page.locator('main > .home-layout').evaluate(layout => {
    const box = element => {
      const {x,y,width} = element.getBoundingClientRect();
      return {x,y,width};
    };
    const right = layout.children[1];
    const divider = getComputedStyle(right,'::before');
    return {
      layout:box(layout), left:box(layout.children[0]), right:box(right),
      gap:getComputedStyle(layout).gap,
      divider:Object.fromEntries(['left','width','backgroundColor','top','bottom'].map(key => [key,divider[key]])),
    };
  });
  await mkdir('artifacts/battle-foundation',{recursive:true});
  for (const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
    const home = await measure();
    const header = await page.locator('.header').evaluate(el => el.outerHTML);
    await navigate('Battle');
    const battle = await measure();
    assert.deepEqual(battle,home,`Home geometry and divider at ${width}`);
    assert.equal(await page.locator('.header').evaluate(el => el.outerHTML),header);
    assert.equal(await page.locator('.battle-foundation > section').count(),2);
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
    await page.getByRole('button',{name:'Choose opponent trainer: Opponent',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'Select opponent trainer'}).count(),1);
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Add Pokémon, My Team, empty slot 1',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'My Team selection'}).count(),1);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.locator('.battle-compact-slots img').count(),0);
    const heading = await page.getByRole('button',{name:'Battle Rules',exact:true}).boundingBox();
    assert.equal(heading.x, battle.right.x);
    assert.equal(heading.y, battle.right.y);
    assert.ok(await page.locator('.home-resources').evaluate(el => el.getBoundingClientRect().height > 400));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:`artifacts/battle-foundation/battle-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Battle foundation: exact Home column geometry, spacing, divider, unchanged header, empty matchup positions, right heading and no overflow at 320/375/390/430/1440px.');
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
