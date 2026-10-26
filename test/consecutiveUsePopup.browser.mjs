import {selectedScenarioSections} from './fixtures/selectedScenarioSections.mjs';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5302,strictPort:true},plugins:[{
 name:'consecutive-use-popup',configureServer(s){s.middlewares.use('/__consecutive-use',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/consecutiveUsePopup.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__consecutive-use`);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const open=async(side,name)=>{await tap(`${side} ${name}`);return page.getByRole('dialog');};
  const labels=name=>Array.from({length:5},(_,i)=>{
   const stage=i+1,power=(name==='Fury Cutter'?10:30)*2**i;
   return name==='Fury Cutter'?[`HIT ${stage}${stage===5?'+':''} · ${power} POWER`]:[`HIT ${stage} · ${power} POWER`,`HIT ${stage} · DEFENSE CURL · ${power*2} POWER`];
  }).flat();
  const sections=(dialog,name)=>selectedScenarioSections(dialog,labels(name));
  const base=[15,28,28,54,54,107,107,213,213,424],fury=[6,10,19,37,72];
  const close=async dialog=>{await dialog.locator('.battle-core-damage-hp').last().tap();assert.equal(await page.getByRole('dialog').count(),0);};
  const check=async(side,name,ends)=>{
   const dialog=await open(side,name);
   assert.equal(await dialog.locator('dd').first().innerText(),name==='Fury Cutter'?'10':'30');
   assert.equal(await dialog.locator('header img').getAttribute('alt'),`${name==='Rollout'?'rock':name==='Ice Ball'?'ice':'bug'} type`);
   for await(const [i,section] of sections(dialog,name).entries()) {
    const max=ends[i],min=Math.floor(max*85/100),percentage=`${(min/2).toFixed(1)}% – ${(max/2).toFixed(1)}%`;
    assert.deepEqual(await section.locator('p').allTextContents(),[labels(name)[i],percentage,`${min}–${max} HP damage`]);
   }
   assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
   const box=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844);
   await dialog.locator('.battle-core-damage-hp').last().scrollIntoViewIfNeeded();
   const last=await dialog.locator('.battle-core-damage-hp').last().boundingBox();assert.ok(last.y>=0&&last.y+last.height<=844);
   await close(dialog);
  };
  await check('Player','Rollout',base);await check('Player','Ice Ball',base);await check('Player','Fury Cutter',fury);
  await check('Opponent','Rollout',[21,41,41,81,81,160,160,318,318,635]);
  await check('Opponent','Ice Ball',[13,25,25,49,49,97,97,192,192,382]);
  await check('Opponent','Fury Cutter',[8,15,28,54,107]);
  await tap('Battle Conditions');
  await page.getByRole('checkbox',{name:'Opponent Reflect',exact:true}).check();await check('Player','Rollout',[8,15,15,28,28,54,54,107,107,213]);
  await page.getByRole('checkbox',{name:'Opponent Light Screen',exact:true}).check();await check('Player','Ice Ball',[8,15,15,28,28,54,54,107,107,213]);
  await page.getByRole('checkbox',{name:'Critical Hit',exact:true}).check();await check('Player','Rollout',base.map(n=>n*2));await check('Player','Ice Ball',base.map(n=>n*2));await check('Player','Fury Cutter',fury.map(n=>n*2));
  await tap('Reset');
  await page.getByRole('combobox',{name:'Player status',exact:true}).selectOption('burn');await check('Player','Rollout',[8,15,15,28,28,54,54,107,107,213]);await check('Player','Ice Ball',base);
  await tap('guts');await check('Player','Rollout',[21,41,41,81,81,160,160,318,318,635]);
  await tap('Reset');await tap('normal');await page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption('rain');await check('Player','Ice Ball',base);
  await tap('thick');let dialog=await open('Player','Ice Ball');
  for await(const [i,section] of sections(dialog,'Ice Ball').entries()) {
   assert.deepEqual(await section.locator('.battle-ability-label').allTextContents(),[labels('Ice Ball')[i],'Immunity','Thick Fat']);
   assert.equal(await section.locator('.battle-core-damage-percent').count(),2);
  }
  assert.deepEqual(await (await sections(dialog,'Ice Ball').at(-1)).locator('.battle-core-damage-hp').allTextContents(),['360–424 HP damage','181–213 HP damage']);await close(dialog);
  await tap('huge');dialog=await open('Opponent','Rollout');
  assert.deepEqual(await (await sections(dialog,'Rollout').at(0)).locator('.battle-core-damage-hp').allTextContents(),['17–21 HP damage','34–41 HP damage']);
  assert.deepEqual(await (await sections(dialog,'Rollout').at(-1)).locator('.battle-core-damage-hp').allTextContents(),['539–635 HP damage','1078–1269 HP damage']);await close(dialog);
  await tap('wonder');dialog=await open('Player','Fury Cutter');
  for await(const section of sections(dialog,'Fury Cutter'))assert.equal(await section.locator('.battle-core-damage-hp').last().innerText(),'Blocked by Wonder Guard');await close(dialog);
  await tap('unknown');dialog=await open('Player','Rollout');
  assert.equal(await dialog.locator('.battle-damage-unavailable').count(),1);await page.keyboard.press('Escape');
  await tap('huge');await page.setViewportSize({width,height:480});dialog=await open('Opponent','Rollout');
  const panel=await dialog.locator('.battle-move-dialog').boundingBox();assert.ok(panel.y>=0&&panel.y+panel.height<=480);
  await dialog.locator('.battle-core-damage-hp').last().scrollIntoViewIfNeeded();
  const last=await dialog.locator('.battle-core-damage-hp').last().boundingBox();assert.ok(last.y>=0&&last.y+last.height<=480);
  await close(dialog);assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all ordered stages/Curl alternatives, both directions, percentage-first, screens/crit/burn/Guts/weather, independent ability scenarios, prevention/unavailable, compact popup bounds and dismissal`);
 }
} finally {await browser?.close();await server.close();}
