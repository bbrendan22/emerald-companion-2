import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5319,strictPort:true},plugins:[{
 name:'exact-frontier-set',configureServer(s){s.middlewares.use('/__exact-set',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/exactFrontierSet.jsx"></script>');
 });}
}]});
let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,channel:'chrome'});
 for(const width of [320,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(`${server.resolvedUrls.local[0]}__exact-set`);
  const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const name=enemy.locator('.battle-matchup-species'),section=page.getByRole('region',{name:'Possible Sets',exact:true});
  const choose=async label=>{await page.getByRole('button',{name:label,exact:true}).click();};
  await name.waitFor();
  assert.equal(await name.innerText(),'Metagross');assert.equal(await section.locator('button').count(),8);
  await choose('Exact 2');assert.equal(await name.innerText(),'Metagross 2');assert.equal(await section.count(),0);
  assert.match(await enemy.locator('.battle-active-moves').innerText(),/Psych Up/);
  assert.equal(await enemy.locator('.battle-active-item').innerText(),'Lum Berry');
  await choose('Multiple');assert.equal(await name.innerText(),'Metagross');assert.equal(await section.locator('button').count(),8);
  await choose('Exact 2');await choose('Other species');assert.equal(await name.innerText(),'Gardevoir');assert.ok(await section.locator('button').count()>1);
  assert.equal(await enemy.locator('.battle-opponent-ability-values').innerText(),'Synchronize / Trace');
  await choose('Trainer');assert.equal(await name.innerText(),'Metagross 1');assert.equal(await section.count(),0);
  await choose('Brain');assert.equal(await name.innerText(),'Alakazam');assert.equal(await section.count(),0);
  await choose('Zero');assert.equal(await name.innerText(),'Metagross');assert.equal(await section.count(),1);assert.equal(await section.locator('button').count(),0);
  await choose('Exact 2');await choose('Multiple');assert.equal(await name.innerText(),'Metagross');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS exact set display ${width}px: canonical number, hidden section, transitions, species reset, zero candidates, retained moves/item and ability uncertainty`);
 }
}finally{await browser?.close();await server.close();}
