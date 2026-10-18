import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try{
 const page=await browser.newPage({viewport:{width:375,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__locationScrollCalls=[];for(const name of ['scrollTo','scrollBy','scroll']){const original=window[name];window[name]=function(...args){window.__locationScrollCalls.push(name);return original.apply(this,args);};}const original=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(...args){window.__locationScrollCalls.push('scrollIntoView');return original.apply(this,args);};});
 await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Resources',exact:true}).click();
 await page.getByRole('link',{name:'Pokémon Database',exact:true}).click();
 const gameColors={Emerald:'#08755d',Ruby:'#b52d43',Sapphire:'#245cbb',FireRed:'#c44a1b',LeafGreen:'#438022',Colosseum:'#6552a3',XD:'#903a9b'}, seenGames=new Set();
 const rgb=hex=>`rgb(${[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')})`;
 const search=page.getByRole('searchbox',{name:'Search Pokémon Database',exact:true});
 const open=async dex=>{await search.fill(`#${String(dex).padStart(3,'0')}`);await page.locator('.resources-species-entry').click();await page.getByRole('tab',{name:'Locations',exact:true}).click();};
 for(let dex=1;dex<=386;dex++){
  await open(dex);assert.equal(await page.locator('.species-locations > details[open]').count(),0);assert.ok((await page.locator('.species-locations').textContent()).trim());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();assert.equal(await search.inputValue(),`#${String(dex).padStart(3,'0')}`);
 }
 for(const width of [320,375,390,430,1280]){
  await page.setViewportSize({width,height:850});
  for(const dex of [25,129,172,252,283,349,374,376,151,251,386,201]){
   await open(dex);const identity=await page.locator('.species-identity').innerHTML();const header=await page.locator('.header').innerHTML();assert.equal(await page.locator('.header .brand span').innerText(),'Emerald Companion');
   const games=page.locator('.species-locations > details');const names=await games.locator(':scope > summary').allTextContents();
   assert.equal(await page.locator('.species-locations > details[open]').count(),0);
   if(await games.count()>1){const first=games.nth(0),second=games.nth(1);await first.locator(':scope > summary').click();await second.locator(':scope > summary').click();assert.equal(await first.evaluate(e=>e.open),true);assert.equal(await second.evaluate(e=>e.open),true);await first.locator(':scope > summary').click();assert.equal(await first.evaluate(e=>e.open),false);assert.equal(await second.evaluate(e=>e.open),true);await second.locator(':scope > summary').click();}
   const order=['Emerald','Ruby','Sapphire','FireRed','LeafGreen','Colosseum','XD'];assert.deepEqual(names,[...names].sort((a,b)=>order.indexOf(a)-order.indexOf(b)));
   if(dex===251||dex===201)assert.ok(!names.includes('Emerald'));
   await page.evaluate(()=>{window.__locationScrollCalls=[];});
   for(const game of await games.all()){
    const summary=game.locator(':scope > summary'), name=await summary.innerText();seenGames.add(name);
    const color=rgb(gameColors[name]);
    assert.equal(await summary.locator('[data-game]').evaluate(e=>getComputedStyle(e).color),color);
    assert.equal(await summary.evaluate(e=>getComputedStyle(e,'::after').borderRightColor),await summary.evaluate(e=>getComputedStyle(e).color));
    if(!await game.evaluate(e=>e.open)){assert.equal(await game.evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(255, 255, 255, 0.043)');await summary.click();}
    assert.equal(await summary.evaluate(e=>getComputedStyle(e).borderBottomColor),'rgba(244, 180, 0, 0.333)');
   }
   assert.equal(await page.locator('.header').innerHTML(),header);assert.equal(await page.locator('.species-identity').innerHTML(),identity);
   const text=await page.locator('.species-locations').innerText();
   if(dex===349)assert.match(text,/Special fishing/);
   if(dex===283)assert.match(text,/Record-mixed outbreak/);
   if(dex===374)assert.match(text,/Gift · Lv. 5/);
   if(dex===376)assert.match(text,/Evolve Metang/);
   if(dex===386)assert.match(text,/AuroraTicket needed/);
   if(dex===251)assert.match(text,/Bonus Disc/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.deepEqual(await page.evaluate(()=>window.__locationScrollCalls),[]);
   if([25,172,349,251].includes(dex))await page.screenshot({path:`/private/tmp/resources-locations-${width}-${dex}.png`,fullPage:true});
   await page.getByRole('tab',{name:'More',exact:true}).click();await page.getByRole('tab',{name:'Locations',exact:true}).click();assert.equal(await page.locator('.species-locations > details[open]').count(),0);for(const game of await games.all())await game.locator(':scope > summary').click();
   if(dex===172){
    const breed=page.getByRole('button',{name:'Breed from Pikachu →',exact:true}).first();await breed.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.notEqual(await breed.evaluate(e=>getComputedStyle(e).outlineStyle),'none');await breed.press('Enter');
    assert.equal(await page.getByRole('heading',{level:1}).innerText(),'Pikachu');assert.equal(await page.getByRole('tab',{name:'Locations',exact:true}).getAttribute('aria-selected'),'true');assert.equal(await page.locator('.species-locations > details[open]').count(),0);
   }
   if(dex===252){await page.getByRole('tab',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'View Grovyle profile',exact:true}).click();await page.getByRole('tab',{name:'Locations',exact:true}).click();assert.equal(await page.locator('.species-locations > details[open]').count(),0);await page.locator('.species-locations > details').first().locator(':scope > summary').click();assert.match(await page.locator('.species-locations').innerText(),/Evolve Treecko/);}
   await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();assert.equal(await search.inputValue(),`#${String(dex).padStart(3,'0')}`);
  }
 }
 assert.deepEqual([...seenGames].sort(),Object.keys(gameColors).sort());
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);
 console.log('Locations passed: all 386 rendered; wild/special/import/event/breeding/evolution cases, ID mapping, game order/expansion, keyboard, species switching, header unchanged by interactions, Back/query retention; 320/375/390/430/1280px, no overflow or new scroll calls.');
}finally{await browser.close();}
