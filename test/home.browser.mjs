import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const server = await preview({preview:{host:'127.0.0.1',port:5198,strictPort:true}});
const browser = await chromium.launch({headless:true, channel:"chrome"});
try {
 const page = await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const url = new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href;
 const b1=new Uint8Array(15752), b2=new Uint8Array(3884), v1=new DataView(b1.buffer),v2=new DataView(b2.buffer);
 b2.set([187,188,255]);v2.setUint16(10,123,true);v2.setUint16(12,456,true);v2.setUint16(14,1234,true);b2[16]=37;
 v1.setUint32(0x490,123456,true);v1.setUint32(0x234,1,true);b1.set(makePokemon({party:true}),0x238);
 // Real save flags: first badge, Champion, and independent Silver/Gold symbols.
 const flag = id => {b1[0x1270+(id>>>3)] |= 1<<(id%8);}; flag(0x867);flag(0x864); b1[0x1388] = 16 | 128;
 await page.goto(url);
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
 await navigate('Home'); assert.ok(await page.locator('.home-resources').isVisible());
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.locator('#save-file').setInputFiles({name:'home.sav',mimeType:'application/octet-stream',buffer:Buffer.from(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}}))});
 await page.getByText('Save imported. Open Home to view your progress.',{exact:true}).waitFor();
 await navigate('Home');
 assert.match(await page.locator('.trainer-fields').innerText(),/00123/);assert.match(await page.locator('.trainer-fields').innerText(),/00456/);assert.match(await page.locator('.trainer-fields').innerText(),/123,456/);assert.match(await page.locator('.trainer-fields').innerText(),/1234h 37m/);
 assert.equal(await page.locator('.badge-earned').count(),1);assert.equal(await page.locator('.frontier-symbols img').count(),7);assert.equal(await page.locator('.trainer-champion').count(),1);assert.equal(await page.locator('.frontier-unearned').count(),5);assert.match(await page.locator('.frontier-symbols img').nth(0).getAttribute('src'),/tower-silver/);assert.match(await page.locator('.frontier-symbols img').nth(1).getAttribute('src'),/dome-gold/);
 assert.equal(await page.getByText('Showcase',{exact:true}).count(),0);
 const heading = 'rgb(181, 187, 197)';
 assert.equal(await page.locator('.home-trainer-title').innerText(),'Trainer');
 assert.equal(await page.locator('.home-trainer-title').evaluate(x=>getComputedStyle(x).color),'rgb(57, 255, 156)');
 assert.equal(await page.locator('.home-resources-title').evaluate(x=>getComputedStyle(x).color),'rgb(255, 216, 92)');
 assert.ok(await page.locator('.trainer-content h2:not(.home-trainer-title)').evaluateAll((xs,color)=>xs.every(x=>getComputedStyle(x).color===color),heading));
 assert.ok(await page.locator('.home-resources .resources-section > h2').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).color==='rgb(181, 187, 197)' && getComputedStyle(x).borderBottomColor==='rgb(57, 61, 68)')));
 assert.equal(await page.locator('.dex-card progress').evaluate(x=>getComputedStyle(x).color),'rgb(77, 206, 136)');
 assert.equal(await page.locator('.header').evaluate(x=>getComputedStyle(x).borderBottomColor),'rgb(57, 61, 68)');

 await mkdir('artifacts/home',{recursive:true});
 for(const width of [320,375,390,430]) {
  await page.setViewportSize({width,height:900});
  assert.ok(await page.locator('.home-search').isDisabled());
  await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  const left=await page.locator('.home-trainer').boundingBox(),right=await page.locator('.home-resources').boundingBox(); assert.ok(right.x>=left.x+left.width);assert.ok(Math.abs(left.width/(left.width+right.width)-(2/3))<.01);
  await page.screenshot({path:`artifacts/home/home-${width}.png`,fullPage:true});
 }
 const links=await page.locator('.home-resources a').evaluateAll(xs=>xs.map(x=>({id:x.id,href:x.getAttribute('href')})));
 for(const link of links){await page.locator(`a[href="${link.href}"]`).click();await page.locator('.home-trainer').waitFor({state:'hidden'});
 assert.ok(await page.locator('main').evaluate(x=>{const root=getComputedStyle(document.documentElement),current=getComputedStyle(x);return ['--trainer-medium','--resources-neon','--resources-medium'].every(key=>root.getPropertyValue(key).trim()===current.getPropertyValue(key).trim());}));await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.locator('.home-resources').waitFor();}
 await navigate('Collection');await page.locator('.pokemon-card').first().click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await navigate('Battle');
 assert.ok(await page.locator('main').evaluate(x=>getComputedStyle(x).getPropertyValue('--resources-neon')===getComputedStyle(document.documentElement).getPropertyValue('--resources-neon')));
 assert.ok(await page.locator('.battle-page').isVisible());
 // Reload a second save to verify that achievements are never inferred from the UI.
 b1.fill(0,0x1270,0x1390); b2[8]=1;
 await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),Buffer.from(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}})).toString('base64'));
 await page.reload();
 assert.equal(await page.locator('.trainer-champion').count(),0);
 assert.equal(await page.locator('.badge-unearned').count(),8);
 assert.equal(await page.locator('.frontier-unearned').count(),7);
 assert.match(await page.locator('.trainer-sprite').getAttribute('src'),/may-emerald/);
 assert.deepEqual(errors,[]);console.log('PASS Home: save values, assets, every resource destination and Back, disabled search, Collection/Battle, 320/375/390/430 layouts.');
} finally {await browser.close(); await new Promise(resolve=>server.httpServer.close(resolve));}
