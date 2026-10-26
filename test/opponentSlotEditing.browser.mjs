import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5214,strictPort:true}});
await server.listen();
const browser=await webkit.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(server.resolvedUrls.local[0]);
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Battle',exact:true}).click();
 const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
 const slots=opponent.locator('.battle-compact-slot');
 const picker=page.getByRole('dialog',{name:'Select opponent Pokémon',exact:true});
 const snapshot=()=>slots.evaluateAll(nodes=>nodes.map(node=>node.querySelector('img')?.getAttribute('src')??null));
 const choose=async name=>{
   await picker.getByRole('searchbox').fill(name);
   await picker.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}).tap();
 };
 for(const format of ['Singles','Doubles']) {
  if(format==='Doubles') {
   await page.getByRole('button',{name:'Battle Rules',exact:true}).tap();
   await page.getByLabel('Battle Type',{exact:true}).selectOption('Doubles');
   await page.keyboard.press('Escape');
  }
  const playerBefore=await page.getByRole('region',{name:'My Team',exact:true}).innerHTML();
  await slots.nth(1).tap();assert.ok(await picker.isVisible());
  assert.equal(await picker.getByRole('button',{name:'Remove Pokémon',exact:true}).count(),0);
  await choose('Sunkern');
  assert.deepEqual((await snapshot()).map(Boolean),format==='Singles'?[false,true,false]:[false,true,false,false]);
  await slots.nth(0).tap();await choose('Pikachu');
  await slots.nth(1).tap();assert.equal(await picker.count(),0);
  assert.equal(await slots.nth(1).getAttribute('aria-pressed'),'true');
  const before=await snapshot();
  await slots.nth(1).tap();assert.ok(await picker.isVisible());
  assert.ok(await picker.getByRole('button',{name:'Remove Pokémon',exact:true}).isVisible());
  await page.keyboard.press('Escape');assert.deepEqual(await snapshot(),before);
  await slots.nth(1).tap();await choose('Bulbasaur');
  const replaced=await snapshot();assert.equal(replaced[0],before[0]);assert.notEqual(replaced[1],before[1]);
  assert.equal(await slots.nth(1).getAttribute('aria-pressed'),'true');
  await slots.nth(1).tap();
  await picker.getByRole('button',{name:'Remove Pokémon',exact:true}).tap();
  const removed=await snapshot();assert.equal(removed[1],null);assert.equal(removed[0],before[0]);
  assert.equal(await slots.nth(0).getAttribute('aria-pressed'),'true');
  await slots.nth(0).dispatchEvent('dblclick');assert.deepEqual(await snapshot(),removed);
  assert.equal(await page.getByRole('region',{name:'My Team',exact:true}).innerHTML(),playerBefore);
  console.log(`PASS mobile WebKit ${format}: slot add, activate, edit, cancel, replace, remove, fallback activation, no double-click removal`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await server.close();}
