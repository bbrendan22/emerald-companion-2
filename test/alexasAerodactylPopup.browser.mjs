import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5311,strictPort:true},plugins:[{name:'alexas-reproduction',configureServer(s){s.middlewares.use('/__alexas',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/alexasAerodactyl.jsx"></script>');});}}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/frontier-candidate-popup',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.goto(`${server.resolvedUrls.local[0]}__alexas`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true}),enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true}),dialog=page.getByRole('dialog');
  const open=(name,reverse=false)=>(reverse?enemy:player).getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  const close=async()=>{await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);};
  const combined=async name=>{await open(name);assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);assert.equal(await dialog.locator('.battle-core-damage-hp').count(),1);};
  const available=async(name,range,reverse=false)=>{await open(name,reverse);const hp=dialog.locator('.battle-core-damage-hp');assert.equal(await hp.innerText(),`${range} HP damage`);assert.equal(await hp.evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');await hp.tap();assert.equal(await dialog.count(),0);};
  const item=enemy.getByRole('combobox',{name:'Opponent held item',exact:true}),ability=enemy.getByRole('combobox',{name:'Opponent ability',exact:true});
  for(const format of ['Singles','Doubles']) {
   await tap(`Use ${format}`);await item.selectOption('');assert.match(await enemy.locator('.battle-active-stats').innerText(),/155–176/);
   assert.equal(await page.getByRole('status',{name:'Diagnostic reason'}).innerText(),'missing-damage-data');
   for(const name of ['Ice Beam','Surf','Earthquake']){await combined(name);if(name==='Ice Beam')await page.screenshot({path:`artifacts/frontier-candidate-popup/regression-${format}-${width}.png`});await close();}
   await ability.selectOption('Pressure');await combined('Ice Beam');await close();await ability.selectOption('Rock Head');await combined('Ice Beam');await close();await ability.selectOption('');
   await item.selectOption('Kings Rock');await combined('Ice Beam');await close();
   await item.selectOption('Choice Band');assert.equal(await page.getByRole('status',{name:'Possible set IDs'}).innerText(),'Aerodactyl 2');
   await available('Ice Beam','71–84');await available('Surf',format==='Singles'?'107–126':'56–66');await available('Earthquake','0–0');await available('Earthquake','90–107',true);
   if(format==='Singles')await tap('Battle Conditions');
   const weather=page.getByRole('combobox',{name:'Battle weather',exact:true});
   for(const value of ['sun','rain','sand','hail']){await weather.selectOption(value);await available('Ice Beam','71–84');}
   await weather.selectOption('rain');await open('Surf');if(format==='Doubles')assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);else assert.equal(await dialog.locator('.battle-damage-unavailable').count(),0);await close();await weather.selectOption('none');
   await item.selectOption('Kings Rock');await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).selectOption('Double Edge');
   await available('Ice Beam','71–84');assert.equal(await page.getByRole('status',{name:'Possible set IDs'}).innerText(),'Aerodactyl 3, Aerodactyl 4');
   await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).selectOption('');await item.selectOption('');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: ALEXAS/Aerodactyl candidate regression in Singles/Doubles; observations, abilities, reverse moves, weather, percentage-first, dismissal and no overflow`);
 }
} finally {await browser?.close();await server.close();}
