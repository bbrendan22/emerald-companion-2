import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {battleMove} from '../src/battle/reference.js';
import {conditionalSelector,selectedConditionalCase} from '../src/battle/conditionalSelection.js';
const server=await createServer({server:{host:'127.0.0.1',port:5305,strictPort:true},plugins:[{
 name:'scenario-selectors',configureServer(s){s.middlewares.use('/__selectors',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/scenarioSelectorsPopup.jsx"></script>');
 });}
}]});
let browser;
try{
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430]){
  const page=await browser.newPage({viewport:{width,height:667},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${server.resolvedUrls.local[0]}__selectors`);
  await page.getByRole('button',{name:'Rollout',exact:true}).tap();
  for(const name of ['Rollout','Ice Ball','Fury Cutter','Magnitude','Present','Pursuit','Revenge']){
   const dialog=page.getByRole('dialog'),move=battleMove(name),config=conditionalSelector(move);
   assert.equal(await dialog.locator('h2').innerText(),name);
   const select=dialog.getByRole('combobox',{name:config.label,exact:true});
   assert.equal(await select.inputValue(),config.defaultValue,'move change resets selector');
   if(config.defenseCurl)assert.equal(await dialog.getByRole('checkbox',{name:'Defense Curl'}).isChecked(),false,'move change resets Curl');
   assert.equal(await dialog.locator('dd').first().innerText(),String(selectedConditionalCase(move,config.defaultValue).power));
   for(const option of config.options){
    await select.selectOption(option.value);
    for(const curl of config.defenseCurl?[false,true]:[false]){
     if(config.defenseCurl)await dialog.getByRole('checkbox',{name:'Defense Curl'}).setChecked(curl);
     assert.equal(await dialog.locator('dd').first().innerText(),String(selectedConditionalCase(move,option.value,curl).power));
     assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1);
     assert.equal(await dialog.getByRole('region',{name:'Damage Calculation'}).getByRole('group').count(),1);
     const box=await dialog.locator('.battle-move-scenario-controls').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width);
    }
   }
   if(name==='Present')assert.match(await dialog.locator('.battle-core-damage-note').innerText(),/Healing possibility/);
   await page.keyboard.press('n');
  }
  assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'Bite');
  assert.equal(await page.getByRole('combobox').count(),0,'ordinary moves have no scenario controls');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Rollout',exact:true}).tap();
  assert.equal(await page.getByRole('combobox',{name:'Turn',exact:true}).inputValue(),'stage-1','reopening resets');
  if(width===375)await page.screenshot({path:'/tmp/emerald-step2-selectors.png'});
  await page.getByRole('dialog').locator('.battle-core-damage-hp').tap();
  assert.equal(await page.getByRole('dialog').count(),0,'damage still supports tap dismissal');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: all selector options, defaults, Curl, power, single scenario, in-place move/reset, ordinary move, dismissal`);
 }
}finally{await browser?.close();await server.close();}
