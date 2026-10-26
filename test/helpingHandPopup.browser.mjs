import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5308,strictPort:true},plugins:[{name:'helping-hand',configureServer(s){s.middlewares.use('/__helping',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/doublesSideConditions.jsx"></script>');});}}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/helping-hand',{recursive:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__helping`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const own=page.getByRole('checkbox',{name:'Player Helping Hand Active',exact:true}),enemy=page.getByRole('checkbox',{name:'Opponent Helping Hand Active',exact:true});
  const dialog=page.getByRole('dialog'),hp=dialog.locator('.battle-core-damage-hp');
  const checkRange=async range=>{assert.equal(await hp.innerText(),`${range} HP damage`);assert.equal(await hp.evaluate(el=>el.previousElementSibling.className),'battle-core-damage-percent');await hp.tap();assert.equal(await dialog.count(),0);};
  await tap('Battle Conditions');assert.equal(await own.count(),0);await tap('Use Doubles');assert.equal(await own.isChecked(),false);assert.equal(await enemy.isChecked(),false);
  await tap('Player Strength');await checkRange('46–55');await own.check();await tap('Player Strength');await checkRange('69–82');
  await tap('Player Surf');await page.keyboard.press('h');assert.equal(await hp.innerText(),'18–22 HP damage');await page.keyboard.press('h');await checkRange('28–33');await tap('Player DoubleSlap');await checkRange('45–54');await tap('Player Psywave');await checkRange('25–75');
  await tap('Opponent Strength');await checkRange('31–37');await enemy.check();await tap('Opponent Strength');await checkRange('46–55');
  await tap('Select Gengar');assert.equal(await own.isChecked(),false);await own.check();await tap('Select Snorlax');assert.equal(await own.isChecked(),true);
  await tap('Opponent Houndoom');assert.equal(await enemy.isChecked(),false);await tap('Opponent Gardevoir');assert.equal(await enemy.isChecked(),true);
  await tap('Battle Conditions');await tap('Battle Conditions');assert.equal(await own.isChecked(),true);
  await tap('Use Singles');assert.equal(await own.count(),0);await tap('Player Strength');await checkRange('46–55');await tap('Use Doubles');assert.equal(await own.isChecked(),true);
  // Production matchup must project recipient state into its actual damage popup.
  const actual=page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Surf',exact:true});
  await actual.tap();const boosted=await hp.innerText();await hp.tap();await own.uncheck();await actual.tap();const normal=await hp.innerText();assert.ok(parseInt(boosted.split('–')[1])>parseInt(normal.split('–')[1]));await hp.tap();await own.check();
  await page.screenshot({path:`artifacts/helping-hand/webkit-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await tap('Remove Snorlax');await tap('Add Snorlax');await tap('Select Snorlax');assert.equal(await own.isChecked(),false);
  await own.check();await tap('Reset');assert.equal(await own.isChecked(),false);assert.equal(await enemy.isChecked(),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS WebKit ${width}px: recipient controls, both directions, actual popup, state restoration/reset/removal, percentage-first, dismissal and no overflow`);
 }
} finally {await browser?.close();await server.close();}
