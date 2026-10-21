import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const server=await preview({preview:{host:'127.0.0.1',port:5213,strictPort:true}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:375,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 const storage=new Uint8Array(33744);storage.set(makePokemon(),4);
 await page.evaluate(encoded=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier'}));},Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
 async function noResults(input,root=page){assert.equal(await input.getAttribute('placeholder'),'Search');await input.fill('zzzz_no_such_entry');assert.equal(await root.getByRole('status').filter({hasText:'No results.'}).innerText(),'No results.');}
 const homeSearch=page.getByRole('searchbox',{name:'Search Resources',exact:true});
 await noResults(homeSearch);await page.getByRole('button',{name:'Clear search',exact:true}).click();
 for(const name of ['Pokédex','Moves','Abilities','Useful Items','Berries']) {
  await page.getByRole('link',{name,exact:true}).click();const input=page.getByRole('searchbox');await noResults(input);
  await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await input.inputValue(),'');await page.getByRole('button',{name:'Close directory',exact:true}).click();
 }
 for(const [link,rootSelector,tabs] of [['Trainers','.frontier-trainers',['Trainers','Frontier Brains']],['Pokémon Sets','.frontier-sets',['Standard Sets','Frontier Brains']]]) {
  await page.getByRole('link',{name:link,exact:true}).click();const root=page.locator(rootSelector);
  for(const name of tabs){await root.getByRole('tab',{name,exact:true}).click();await noResults(root.getByRole('searchbox'),root);await root.getByRole('button',{name:'Clear search',exact:true}).click();}
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
 }
 for(const link of ['IV Calculator','Stat Calculator']) {
  await page.getByRole('link',{name:link,exact:true}).click();const root=page.locator(link==='IV Calculator' ? '.iv-calculator' : '.stat-calculator');await noResults(root.getByRole('searchbox'),root);
  await root.getByRole('searchbox').fill('bulba');assert.ok(await root.getByRole('button',{name:'Bulbasaur',exact:true}).count()>0);await root.getByRole('button',{name:'Bulbasaur',exact:true}).click();assert.equal(await root.getByRole('searchbox').inputValue(),'Bulbasaur');
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
 }
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Battle',exact:true}).click();
 for(const name of ['Trainers','Sets']) {await page.getByRole('tab',{name,exact:true}).click();const panel=page.getByRole('tabpanel',{name,exact:true});await noResults(panel.getByRole('searchbox'),panel);}
 await page.getByRole('tab',{name:'Teams',exact:true}).click();const teams=page.getByRole('tabpanel',{name:'Teams',exact:true});assert.match(await teams.innerText(),/No saved teams yet/);
 await teams.getByRole('button',{name:'Add Team',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Add Team',exact:true});const picker=dialog.getByRole('searchbox',{name:'Frontier Pokémon',exact:true});assert.equal(await picker.getAttribute('placeholder'),'Search');await picker.fill('zzzz_no_such_entry');assert.equal(await dialog.getByText('No results.',{exact:true}).count(),1);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: Search placeholders, exact No results. messages, unchanged labels/clear controls, resource directories, Frontier lists, calculators, Battle searches/team picker, and preserved non-search empty states.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
