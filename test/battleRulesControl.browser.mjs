import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {makeSave} from './fixtures/synthetic.js';
import {preview} from 'vite';
const server = process.argv.includes('--production') ? await preview({preview:{host:'127.0.0.1',port:5201,strictPort:true}}) : null;
const url = server ? new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href : process.env.BATTLE_URL || 'http://127.0.0.1:5173/';

const browser = await (process.argv.includes('--webkit') ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  const navigate = async (name='Battle') => {
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.getByRole('button',{name,exact:true}).click();
  };
  // Seed once, so reload checks cannot silently restore test data after a write.
  await page.goto(url);
  const persisted={
    'emerald-companion-2.battle-rules.v1':JSON.stringify({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:92}),
    'emerald-companion-2.battle-round.v1':JSON.stringify('7'),
    'emerald-companion-2.save.v1':Buffer.from(makeSave()).toString('base64'),
    'emerald-companion-2.roles.v1':JSON.stringify({example:'Frontier'}),
    'emerald-companion-2.battle-teams.v1':JSON.stringify([]),
    'emerald-companion-2.session-test.preferences':JSON.stringify({keep:true}),
  };
  await page.evaluate(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},persisted);
  const preserved=()=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(persisted));
  const defaults=async()=>{
    assert.equal(await page.getByLabel('Facility',{exact:true}).inputValue(),'Tower');
    assert.equal(await page.getByLabel('Format',{exact:true}).inputValue(),'Singles');
    assert.equal(await page.getByLabel('Level',{exact:true}).inputValue(),'50');
    assert.equal(await page.getByLabel('Round',{exact:true}).inputValue(),'');
  };
  await mkdir('artifacts/battle-rules',{recursive:true});
  for (const [width,height] of [[320,568],[375,812],[390,844],[430,932],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(url);
    await navigate();
    await defaults();
    assert.deepEqual(await preserved(),persisted,'fresh initialization ignores old Rules without changing saved data');
    const row = page.getByRole('group',{name:'Battle settings'});
    assert.equal(await row.locator('select').count(),3);
    assert.equal(await page.getByRole('button',{name:'Battle Rules',exact:true}).count(),0);
    assert.equal(await page.getByRole('dialog',{name:'Battle Rules',exact:true}).count(),0);
    assert.deepEqual(await row.getByLabel('Facility',{exact:true}).locator('option').allTextContents(),['Tower']);
    assert.deepEqual(await row.getByLabel('Format',{exact:true}).locator('option').allTextContents(),['Singles','Doubles']);
    const level=row.getByLabel('Level',{exact:true});
    assert.deepEqual(await level.locator('option').allTextContents(),[50,...Array.from({length:41},(_,i)=>i+60)].map(n=>`Level ${n}`));
    for (const value of [50,60,61,78,100,50,78]) {
      await level.selectOption(String(value));
      assert.equal(await level.inputValue(),String(value));
    }
    await row.getByLabel('Format',{exact:true}).selectOption('Doubles');
    await page.getByLabel('Round',{exact:true}).selectOption('2');
    // Page navigation remounts BattlePage, but the App-owned state survives.
    for(const destination of ['Home','Collection']) {
      await navigate(destination);await navigate();
      assert.equal(await level.inputValue(),'78');
      assert.equal(await row.getByLabel('Format',{exact:true}).inputValue(),'Doubles');
      assert.equal(await page.getByLabel('Round',{exact:true}).inputValue(),'2');
    }
    await page.getByRole('button',{name:'Open navigation',exact:true}).click();
    await page.keyboard.press('Escape');
    assert.equal(await level.inputValue(),'78');
    assert.equal(await row.getByLabel('Format',{exact:true}).inputValue(),'Doubles');
    assert.equal(await page.getByLabel('Round',{exact:true}).inputValue(),'2');
    const boxes=await row.locator('label').evaluateAll(labels=>labels.map(label=>{const r=label.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,width:r.width,height:r.height,font:getComputedStyle(label).fontSize};}));
    assert.ok(boxes.every(box=>box.y===boxes[0].y && box.x>=0 && box.right<=width && box.height>=32 && box.font===(width<=420?'12px':'13px')));
    assert.ok(boxes.every((box,index)=>!index || box.x>=boxes[index-1].right));
    const roundBox=await page.locator('.battle-round-control').boundingBox();
    assert.equal(roundBox.y,boxes[0].y);
    assert.ok(roundBox.x>=boxes[2].right);
    const toolbarBox=await page.locator('.battle-rules-toolbar').boundingBox();
    assert.ok(Math.abs(roundBox.x+roundBox.width-(toolbarBox.x+toolbarBox.width))<2);
    assert.equal(await row.locator('.battle-rules-separator').count(),2);
    assert.equal(await row.locator('label').first().evaluate(el=>getComputedStyle(el).color),await page.locator('.battle-round-control').evaluate(el=>getComputedStyle(el).color));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`artifacts/battle-rules/rules-${width}.png`,fullPage:true});
    await page.getByLabel('Round',{exact:true}).selectOption('');
    assert.equal(await page.getByLabel('Round',{exact:true}).inputValue(),'','Round can be cleared');
    await page.getByLabel('Round',{exact:true}).selectOption('8+');
    assert.deepEqual(await preserved(),persisted,'changing Rules and navigating leaves saved data untouched');
    await page.reload();await navigate();await defaults();
    assert.deepEqual(await preserved(),persisted,'fresh launch preserves all seeded data, including legacy Rules keys');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS inline Rules: supported options, all levels, session defaults, empty Round, navigation retention, reload reset and saved-data preservation, 320/375/390/430/1440px fit, readable text, no page errors.');
} finally { await browser.close(); if(server) await new Promise(resolve => server.httpServer.close(resolve)); }
