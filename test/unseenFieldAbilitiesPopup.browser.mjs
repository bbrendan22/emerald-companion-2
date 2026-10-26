import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5309,strictPort:true},plugins:[{name:'unseen-field',configureServer(s){s.middlewares.use('/__field',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/weatherSuppressionPopup.jsx"></script>');});}}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/unseen-field',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__field`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const dialog=page.getByRole('dialog'),hp=dialog.locator('.battle-core-damage-hp'),unavailable=dialog.locator('.battle-damage-unavailable');
  const open=(side,name)=>tap(`${side} ${name}`);
  const close=async()=>{await dialog.getByRole('heading',{name:'Damage Calculation',exact:true}).tap();assert.equal(await dialog.count(),0);};
  const available=async(side,name)=>{await open(side,name);assert.equal(await unavailable.count(),0);assert.ok(await hp.count()>0);if(await dialog.locator('.battle-core-damage-percent').count())assert.equal(await hp.first().evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');await close();};
  const unknown=async(side,name)=>{await open(side,name);assert.equal(await unavailable.innerText(),'Damage unavailable for this matchup.');assert.equal(await hp.count(),0);const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);};
  await tap('Battle Conditions');const weather=page.getByRole('combobox',{name:'Battle weather',exact:true});
  await tap('Use Doubles');assert.equal(await page.getByRole('checkbox',{name:'Player Helping Hand Active',exact:true}).isChecked(),false);
  for(const side of ['Player','Opponent']) {
   await available(side,'Surf');await available(side,'Strength');await unknown(side,'Explosion');await close();
   await weather.selectOption('rain');await unknown(side,'Surf');await close();await available(side,'Strength');await available(side,'Seismic Toss');
   await unknown(side,'Weather Ball');assert.equal(await dialog.locator('dd').first().innerText(),'—');assert.equal(await dialog.locator('header img[alt="water type"]').count(),0);await close();
   await weather.selectOption('none');
  }
  for(const mode of ['player-cloud','enemy-air','player-trace-cloud']) {
   await tap(mode);await weather.selectOption('rain');
   await available('Player','Surf');await open('Player','Weather Ball');assert.equal(await unavailable.count(),0);assert.equal(await dialog.locator('dd').first().innerText(),'50');assert.equal(await dialog.locator('header img').getAttribute('alt'),'normal type');await close();
  }
  await tap('enemy-trace-damp');await open('Player','Explosion');assert.equal(await hp.innerText(),'Prevented by Damp');await close();
  for(const mode of ['player-forecast','enemy-forecast']) {
   await tap(mode);await weather.selectOption('sun');await unknown(mode==='player-forecast'?'Player':'Opponent','Strength');await close();
  }
  await tap('off');await weather.selectOption('sand');await available('Player','Surf');await unknown('Player','SolarBeam');await close();
  await weather.selectOption('sun');await tap('uncertain-enemy');await open('Player','Flamethrower');assert.equal(await unavailable.count(),1);assert.equal(await hp.count(),1);await close();
  await tap('off');await tap('Use Singles');await weather.selectOption('rain');await available('Player','Surf');await open('Player','Weather Ball');assert.equal(await dialog.locator('dd').first().innerText(),'100');await close();await available('Player','Explosion');
  await tap('Use Doubles');await unknown('Player','Weather Ball');await page.screenshot({path:`artifacts/unseen-field/webkit-${width}.png`});await close();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: targeted unseen weather/Damp guards, both directions, Forecast/Trace, metadata, numerical exceptions, Singles, dismissal and no overflow`);
 }
} finally {await browser?.close();await server.close();}
