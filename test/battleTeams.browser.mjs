import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try{
 const context=await browser.newContext({viewport:{width:375,height:800},isMobile:true,hasTouch:true}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5174');
 const storage=new Uint8Array(33744);[1,4,7,25,133].forEach((species,i)=>storage.set(makePokemon({species,pid:i}),4+i*80));
 const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier','0:1:0':'Frontier','0:2:0':'Frontier','0:3:0':'Frontier'}));},encoded);await page.reload();
 const battle=async()=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();};
 await battle();await page.getByRole('tab',{name:'Teams',exact:true}).click();await page.getByRole('button',{name:'Add Team',exact:true}).click();
 const dialog=page.getByRole('dialog');assert.equal(await dialog.locator('.battle-team-picker button').count(),4);
 await dialog.getByRole('textbox',{name:'Team name',exact:true}).fill('Tower A');
 assert.equal(await dialog.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
 for(let i=0;i<3;i++)await dialog.locator('.battle-team-picker button').nth(i).click();
 for(const width of [320,375,430]){await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await dialog.evaluate(e=>e.getBoundingClientRect().width<=innerWidth));await page.screenshot({path:`/private/tmp/team-editor-${width}.png`});}
 await dialog.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('button',{name:'Edit Tower A',exact:true}).click();await dialog.getByRole('textbox',{name:'Team name',exact:true}).fill('Discarded');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Load Tower A',exact:true}).count(),1);
 await page.getByRole('button',{name:'Edit Tower A',exact:true}).click();await dialog.getByRole('textbox',{name:'Team name',exact:true}).fill('Renamed');await dialog.getByRole('button',{name:'Choose team slot 3',exact:true}).click();await dialog.locator('.battle-team-picker button').nth(3).click();await dialog.getByRole('button',{name:'Save',exact:true}).click();
 await page.reload();await battle();await page.getByRole('tab',{name:'Teams',exact:true}).click();await page.getByRole('button',{name:'Load Renamed',exact:true}).click();
 assert.equal(await page.getByRole('tab',{name:'Matchup',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.battle-side-player button.battle-team-slot').count(),3);assert.equal(await page.locator('.battle-side-player button.battle-team-slot img').nth(2).getAttribute('src'),'/pokemon/box/25.png');
 await page.getByRole('tab',{name:'Teams',exact:true}).click();await page.getByRole('button',{name:'Edit Renamed',exact:true}).click();await dialog.getByRole('button',{name:'Delete',exact:true}).click();assert.equal(await dialog.getByRole('button',{name:'Confirm delete',exact:true}).count(),1);await dialog.getByRole('button',{name:'Keep team',exact:true}).click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.evaluate(()=>localStorage.removeItem('emerald-companion-2.save.v1'));await page.reload();await battle();await page.getByRole('tab',{name:'Teams',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Load Renamed',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Edit Renamed',exact:true}).click();await dialog.getByRole('button',{name:'Delete',exact:true}).click();await dialog.getByRole('button',{name:'Confirm delete',exact:true}).click();assert.equal(await page.locator('.battle-saved-team').count(),0);assert.deepEqual(errors,[]);
 console.log('Saved Teams browser checks passed: Frontier picker, validation, create/edit/cancel/delete confirmation, reload persistence, load/active header, missing references, 320/375/430px fit, no page errors.');
}finally{await browser.close();}
