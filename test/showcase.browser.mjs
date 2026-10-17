// Run with PLAYWRIGHT_MODULE pointing to an available Playwright installation.
// Uses synthetic saves in an isolated browser; never touches the user's browser data.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
const baseURL = process.env.SHOWCASE_URL || 'http://localhost:5173';
const key = 'emerald-companion-2.showcase.v1';
const b1=new Uint8Array(15752), b2=new Uint8Array(3884);
new DataView(b1.buffer).setUint32(0x234,1,true);b1.set(makePokemon({party:true}),0x238);b2[0]=187;b2[1]=255;
const encoded = Buffer.from(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}})).toString('base64');
const selections=Array.from({length:6},(_,i)=>({nationalDexId:[3,6,9,143,130,25][i],shiny:i===1}));
const errors=[];
async function setup(context) {
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('console',message=>{if(message.type()==='error' && !message.text().includes('net::ERR_FAILED')) errors.push(message.text());});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto(baseURL);await page.evaluate(({encoded,key,selections})=>{localStorage.clear();localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem(key,JSON.stringify(selections))},{encoded,key,selections});await page.reload();return page;
}
async function layout(page,width,touch=false) {
 await page.setViewportSize({width,height:850});
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 const geometry=await page.evaluate(()=>{const a=document.querySelector('.trainer-artwork-card').getBoundingClientRect(),b=document.querySelector('.trainer-summary-row').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,aligned:a.top===b.top && a.bottom===b.bottom,zoom:visualViewport.scale,broken:[...document.images].some(i=>!i.naturalWidth)}});
 assert.equal(geometry.overflow,false);assert.equal(geometry.aligned,true);assert.equal(geometry.broken,false);assert.equal(geometry.zoom,1);
 await page.locator('.trainer-showcase').screenshot({path:`/private/tmp/showcase-stage33-${touch?'touch':'desktop'}-${width}.png`});
}
try {
 const desktop=await browser.newContext();const page=await setup(desktop);
 const slots=page.locator('.trainer-team-slot'),popup=page.getByRole('dialog');
 const read=()=>page.evaluate(key=>localStorage.getItem(key),key);
 const initial=await read();
 await slots.first().click();assert.equal(await popup.count(),0);await slots.first().dblclick();await popup.waitFor();
 assert.equal(await page.getByRole('heading',{name:'Edit Showcase',exact:true}).count(),1);
 assert.equal(await page.getByRole('option',{name:'Venusaur',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.getByLabel('Shiny',{exact:true}).isChecked(),false);
 await page.getByLabel('Search Pokémon',{exact:true}).fill('25');await page.getByRole('option',{name:'Pikachu',exact:true}).click();await page.getByLabel('Shiny',{exact:true}).check();assert.equal(await read(),initial);
 assert.match(await page.getByRole('option',{name:'Pikachu',exact:true}).locator('img').getAttribute('src'),/artwork\/shiny\/25/);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await read(),initial);
 await slots.nth(1).dblclick();assert.equal(await page.getByLabel('Shiny',{exact:true}).isChecked(),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement.className === 'trainer-team-slot');assert.equal(await read(),initial);
 await slots.first().focus();await page.keyboard.press('Enter');await page.getByLabel('Search Pokémon',{exact:true}).fill('');assert.equal(await page.getByRole('option').count(),386);
 assert.equal(await page.locator('.showcase-results').evaluate(e=>e.clientHeight),132);
 assert.equal(await page.getByRole('option').first().evaluate(e=>e.getBoundingClientRect().height),44);
 await page.getByLabel('Search Pokémon',{exact:true}).fill('not a species');await page.getByText('No matches',{exact:true}).waitFor();assert.equal(await page.getByRole('option').count(),0);
 await page.getByLabel('Search Pokémon',{exact:true}).fill('Mewtwo');await page.getByLabel('Search Pokémon',{exact:true}).press('ArrowDown');await page.keyboard.press('Space');await page.getByLabel('Shiny',{exact:true}).check();await page.getByRole('button',{name:'Confirm',exact:true}).click();assert.match(await slots.first().locator('img').getAttribute('src'),/shiny\/150/);
 assert.equal(await page.evaluate(()=>document.activeElement.className),'trainer-team-slot');await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await slots.first().evaluate(e=>getComputedStyle(e).outlineColor),'rgb(199, 205, 213)');
 await slots.first().press('Space');await page.getByRole('button',{name:'Remove',exact:true}).click();assert.equal(await slots.first().innerText(),'+');
 await slots.first().click();assert.equal(await page.getByRole('heading',{name:'Add Pokémon',exact:true}).count(),1);assert.equal(await page.getByRole('button',{name:'Confirm',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'Remove',exact:true}).count(),0);
 await page.getByLabel('Shiny',{exact:true}).check();await page.getByLabel('Search Pokémon',{exact:true}).fill('386');await page.getByRole('option',{name:'Deoxys',exact:true}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.reload();assert.match(await slots.first().locator('img').getAttribute('src'),/shiny\/386/);
 for(const width of [320,375,430,960])await layout(page,width);
 const mobile=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:568}});const touch=await setup(mobile);const touchSlot=touch.locator('.trainer-team-slot').first();
 await touchSlot.tap();assert.equal(await touch.getByRole('dialog').count(),0);await touch.waitForTimeout(400);await touchSlot.tap();await touchSlot.tap();await touch.getByRole('dialog').waitFor();
 await touch.getByLabel('Search Pokémon',{exact:true}).fill('Mew');await touch.getByRole('option',{name:'Mew',exact:true}).click();await touch.getByLabel('Shiny',{exact:true}).check();await touch.getByRole('button',{name:'Confirm',exact:true}).click();assert.match(await touchSlot.locator('img').getAttribute('src'),/shiny\/151/);
 assert.equal(await touchSlot.evaluate(e=>getComputedStyle(e).outlineStyle),'none');assert.equal(await touchSlot.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 for(const width of [320,375,430]){
  await touch.setViewportSize({width,height:568});await touchSlot.focus();await touch.keyboard.press('Enter');await touch.getByLabel('Search Pokémon',{exact:true}).fill('');
  assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await touch.locator('.showcase-results').evaluate(e=>e.clientHeight),132);
  await touch.screenshot({path:`/private/tmp/showcase-stage38-popup-${width}.png`});await touch.getByRole('button',{name:'Cancel',exact:true}).click();
 }
 await touch.route('**/pokemon/artwork/normal/386.png',route=>route.abort());await touchSlot.press('Enter');await touch.getByLabel('Shiny',{exact:true}).uncheck();await touch.getByLabel('Search Pokémon',{exact:true}).fill('386');await touch.locator('.showcase-artwork-unavailable').waitFor();await touch.getByRole('option',{name:'Deoxys',exact:true}).click();await touch.getByRole('button',{name:'Confirm',exact:true}).click();await touchSlot.locator('.showcase-artwork-unavailable').waitFor();
 assert.deepEqual(errors,[]);console.log('Showcase checks passed: filtered 386-species results; three-row viewport; shiny; pending edits; confirm/cancel/remove; Enter/Space/arrows/Escape; persistence; single/double tap/click; pointer and keyboard focus; 320/375/430px popup fit; artwork fallback.');
} finally {await browser.close();}
