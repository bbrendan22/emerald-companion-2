import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';

const server = await preview({preview:{host:'127.0.0.1',port:5212,strictPort:true}});
const browser = await (process.env.PROFILE_WEBKIT === '1' ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
try {
  const page = await browser.newPage({viewport:{width:375,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const storage=new Uint8Array(33744);
  for(let i=0;i<100;i++) storage.set(makePokemon({species:i===99?115:i===98?101:1,pid:i}),4+i*80);
  const roles=JSON.stringify({'0:0:0':'Frontier','0:1:0':'Utility'});
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(({save,roles})=>{
    localStorage.setItem('emerald-companion-2.save.v1',save);
    localStorage.setItem('emerald-companion-2.roles.v1',roles);
  },{save:Buffer.from(makeSave({blocks:{storage}})).toString('base64'),roles});
  await page.reload();
  const navigate=async name=>{
    await page.getByRole('button',{name:'Open navigation',exact:true}).evaluate(e=>e.click());
    await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();
  };
  const cards=page.locator('.pokemon-card');
  const toggle=name=>page.locator('.collection-role-toggles').getByRole('button',{name,exact:true}).click();
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});await navigate('Collection');
    assert.equal(await cards.count(),100);
    assert.equal(await page.locator('.pokemon-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),4);
    await cards.first().locator('img').evaluate(async e=>{await e.decode();});
    assert.ok(await cards.first().locator('img').evaluate(e=>e.naturalWidth)>0);
    assert.ok(await cards.first().locator('.pokemon-name').innerText());
    const shinyCount=await cards.evaluateAll(nodes=>nodes.filter(e=>e.getAttribute('aria-label').includes(', shiny,')).length);
    await toggle('Frontier');assert.equal(await cards.count(),1);
    await toggle('Utility');assert.equal(await cards.count(),1);
    await toggle('Shiny');assert.equal(await cards.count(),shinyCount);await toggle('Shiny');
    const search=page.getByRole('searchbox',{name:'Search Pokémon',exact:true});
    await search.fill('Electrode');assert.equal(await cards.count(),1);await cards.first().click();await page.getByRole('dialog',{name:'Pokémon details',exact:true}).waitFor();await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button',{name:'Clear Pokémon search',exact:true}).click();
    await page.getByRole('button',{name:'Filter Collection',exact:true}).click();
    const filters=page.getByRole('dialog',{name:'Collection filters',exact:true});
    await filters.getByLabel('Type',{exact:true}).selectOption('electric');assert.equal(await cards.count(),1);
    await page.getByRole('button',{name:'Filter Collection',exact:true}).click();
    await filters.getByLabel('Generation',{exact:true}).selectOption('3');assert.equal(await cards.count(),0);
    await page.getByRole('button',{name:'Filter Collection',exact:true}).click();
    await filters.getByRole('button',{name:'Clear Filters',exact:true}).click();assert.equal(await cards.count(),100);
    await cards.nth(60).scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);
    await cards.nth(60).tap();await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    assert.equal(await page.locator('.app').evaluate(e=>e.inert),false);
    assert.equal(await page.evaluate(()=>scrollY),before);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.roles.v1')),roles);
    await navigate('Home');await page.reload();
  }
  await navigate('Collection');await toggle('Frontier');assert.equal(await cards.count(),1);
  assert.equal(await cards.first().getAttribute('aria-label').then(s=>s.endsWith('Frontier')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: Collection gallery, sprites/names, stored roles, search, category/type/generation filters, scrolling, navigation and popup opening/dismissal at 375/430px.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
