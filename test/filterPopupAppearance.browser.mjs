import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {makeSave} from './fixtures/synthetic.js';
const server=await preview({preview:{host:'127.0.0.1',port:5214,strictPort:true}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:375,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave()).toString('base64'));await page.reload();
 async function navigate(name){await page.evaluate(async()=>{scrollTo(0,0);await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();}
 async function appearance(popup){return popup.evaluate(element=>{
  const properties=['display','rowGap','columnGap','width','padding','border','borderRadius','backgroundColor','color','fontFamily','fontSize','fontWeight','lineHeight','boxShadow','textAlign','height','margin'];
  const read=node=>Object.fromEntries(properties.map(property=>[property,getComputedStyle(node)[property]]));
  return {popup:read(element),label:read(element.querySelector('label')),select:read(element.querySelector('select')),clear:read(element.querySelector(':scope > button'))};
 });}
 for(const width of [375,430]) {
  await page.setViewportSize({width,height:844});await navigate('Collection');
  const buttons=page.locator('.collection-role-toggles button'),before=await buttons.evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,color:getComputedStyle(node).color})));
  for(const name of ['Frontier','Utility','Shiny']) {
   await page.locator('.collection-role-toggles').getByRole('button',{name,exact:true}).click();
   assert.ok(await buttons.evaluateAll(nodes=>nodes.every(node=>getComputedStyle(node).backgroundColor==='rgba(0, 0, 0, 0)')));
   assert.deepEqual(await buttons.evaluateAll(nodes=>nodes.map(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,color:getComputedStyle(node).color}))),before);
   assert.equal(await page.locator('.collection-role-toggles button[aria-pressed="true"]').evaluate(node=>getComputedStyle(node).borderBottomColor),'rgb(181, 187, 197)');
  }
  await page.getByRole('button',{name:'Filter Collection',exact:true}).click();const collection=page.getByRole('dialog',{name:'Collection filters',exact:true});const expected=await appearance(collection);
  await page.screenshot({path:`/tmp/collection-filter-style-${width}.png`});await page.keyboard.press('Escape');
  await navigate('Home');await page.getByRole('link',{name:'Pokédex',exact:true}).click();
  const anchor=page.getByRole('button',{name:'Filter directory',exact:true});await anchor.click();const home=page.getByRole('dialog',{name:'Directory filters',exact:true});
  assert.deepEqual(await appearance(home),expected);
  const a=await anchor.boundingBox(),p=await home.boundingBox();assert.ok(Math.abs(p.x+p.width-a.x-a.width)<1);assert.ok(Math.abs(p.y-a.y-a.height-6)<1);
  assert.equal(await home.locator('select:focus').count(),0);assert.equal(await home.getByRole('button',{name:'Clear Filters',exact:true}).evaluate(node=>getComputedStyle(node).fontSize),'12px');
  await page.screenshot({path:`/tmp/home-filter-style-${width}.png`});await page.keyboard.press('Escape');await page.getByRole('button',{name:'Close directory',exact:true}).click();
 }
 assert.deepEqual(errors,[]);console.log('PASS: identical Home/Collection popup geometry, typography, spacing, colors, borders and clear action at 375/430px; preserved anchoring; role fills removed with unchanged underline/dimensions/colors.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
