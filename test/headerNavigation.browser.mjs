import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
const server=await preview({preview:{host:'127.0.0.1',port:5201,strictPort:true}});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 await mkdir('artifacts/header-navigation',{recursive:true});
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();};
 const check=async width=>{
  const data=await page.evaluate(()=>{
   const header=document.querySelector('.header'), rect=header.getBoundingClientRect(),brand=document.querySelector('.brand').getBoundingClientRect();
   const top=rect.top+parseFloat(getComputedStyle(header).paddingTop);
   const controls=[...header.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scroll:x.scrollWidth,client:x.clientWidth};});
   return {height:rect.height,center:(brand.left+brand.right)/2,viewport:innerWidth,top,bottom:rect.bottom,controls,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(data.height,45);assert.ok(Math.abs(data.center-width/2)<.5);
  assert.equal(data.overflow,false);for(const c of data.controls){assert.ok(c.y>=data.top);assert.ok(c.bottom<=data.bottom);assert.ok(c.x>=0&&c.right<=width);assert.ok(c.width>=24&&c.height>=24);assert.ok(c.scroll<=c.client);}
 };
 for(const width of [320,375,390,430]) {
  await page.setViewportSize({width,height:900});await check(width);
  for(const name of ['Collection','Battle','Home']){await navigate(name);await check(width);}
  await page.getByRole('link',{name:'Pokédex',exact:true}).click();await page.getByRole('button',{name:'Back to Resources',exact:true}).waitFor();await check(width);
  const boxes=await page.locator('.header').evaluate(h=>({brand:h.querySelector('.brand-pokeball').getBoundingClientRect().toJSON(),left:h.querySelector('.header-left').getBoundingClientRect().toJSON(),settings:h.querySelector('.header-settings').getBoundingClientRect().toJSON()}));assert.ok(boxes.left.right<=boxes.brand.left);assert.ok(boxes.brand.right<=boxes.settings.left);
  await page.locator('.resources-species-entry').first().click();await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();await page.getByRole('button',{name:'Back to Resources',exact:true}).click();await page.locator('.home-resources').waitFor();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#save-file').waitFor();await check(width);
  await navigate('Home');
  await page.screenshot({path:`artifacts/header-navigation/header-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();
 await page.getByRole('button',{name:'Close navigation',exact:true}).click();
 assert.equal(await page.locator('#navigation-drawer').isVisible(),false);
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.keyboard.press('Escape');
 await page.locator('#navigation-drawer').waitFor({state:'hidden'});
 assert.equal(await page.locator('.header-navigation').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: 320/375/390/430px; previous/current header 73/45px (plus device safe-area inset); centered branding, bounds/tap targets, hamburger open/close and destinations, Settings, Resources and nested Back.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
