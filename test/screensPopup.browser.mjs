import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5298,strictPort:true},plugins:[{
 name:'screens-popup',configureServer(s){s.middlewares.use('/__screens',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/screensPopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__screens`);
  const group=side=>page.getByRole('group',{name:side==='Player'?'My matchup Pokémon':'Opponent matchup Pokémon',exact:true});
  const open=async(side,name)=>{await group(side).getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();return page.getByRole('dialog');};
  const check=async(side,name,min,max,deterministic=false)=>{
   const dialog=await open(side,name),maximum=side==='Player'?194:200;
   const percentage=deterministic?`${(min*100/maximum).toFixed(1)}%`:`${(min*100/maximum).toFixed(1)}% – ${(max*100/maximum).toFixed(1)}%`;
   assert.equal(await dialog.locator('.battle-core-damage-percent').innerText(),percentage);
   assert.equal(await dialog.locator('.battle-core-damage-hp').innerText(),deterministic?`${min} HP damage`:`${min}–${max} HP damage`);
   const p=await dialog.getByRole('region',{name:'Damage Calculation'}).locator('p').allTextContents();assert.equal(p[0],percentage,'percentage precedes HP');
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await dialog.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  };
  await check('Player','Strength',61,72);await check('Player','Surf',23,28);
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  const screen=(side,name,value)=>page.getByRole('checkbox',{name:`${side} ${name}`,exact:true}).setChecked(value);
  await screen('Opponent','Reflect',true);await check('Player','Strength',31,37);await check('Player','Surf',23,28);
  await check('Player','Double Kick',16,20);await check('Player','Triple Kick',16,21);
  await screen('Opponent','Light Screen',true);await check('Player','Surf',11,14);
  await screen('Player','Reflect',true);await screen('Player','Light Screen',true);
  await check('Opponent','Earthquake',16,19);await check('Opponent','Water Spout',35,42);
  await screen('Opponent','Reflect',false);await check('Player','Strength',61,72);await check('Opponent','Earthquake',16,19);
  await screen('Opponent','Reflect',true);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','Strength',122,144);await check('Player','Surf',48,57);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await page.getByRole('button',{name:'Select Gengar',exact:true}).tap();
  await check('Player','DoubleSlap',15,18);await check('Player','Icicle Spear',3,6);
  await check('Player','Seismic Toss',50,50,true);await check('Player','Brick Break',38,45);
  await page.getByRole('button',{name:'Use Doubles',exact:true}).tap();
  assert.equal(await page.getByRole('combobox',{name:'Opponent Side active Pokémon',exact:true}).inputValue(),'2');
  await check('Player','DoubleSlap',15,18);
  await check('Player','Seismic Toss',50,50,true);await check('Player','Brick Break',38,45);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','DoubleSlap',51,60);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).uncheck();
  await page.getByRole('button',{name:'Use Singles',exact:true}).tap();
  await page.getByRole('button',{name:'Reset',exact:true}).tap();await check('Player','DoubleSlap',24,30);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: real matchup screen controls, physical/special/multi-hit/deterministic, both directions, critical bypass, Doubles shared counts and unchanged dismissal`);
 }
} finally {await browser?.close();await server.close();}
