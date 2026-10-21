import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';

const server=await preview({preview:{host:'127.0.0.1',port:5234,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT === '1';
// Playwright cannot send wheel/drag touch input in mobile WebKit. Run mobile
// tap/geometry checks separately from native wheel scrolling at the same widths.
const mobileWebkit=safari && process.env.WEBKIT_MOBILE === '1';
const browser=await (safari ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},isMobile:!safari || mobileWebkit,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const storage=new Uint8Array(33744);
  for(let i=0;i<100;i++)storage.set(makePokemon({species:i%2 ? 101 : 115,pid:i}),4+i*80);
  const url=new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href;
  const save=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
  await page.goto(url);await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),save);await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  // Observe real underlying activations, rather than assuming modal clicks stop.
  await page.evaluate(()=>{window.underlyingClicks=0;document.querySelector('.app').addEventListener('click',()=>window.underlyingClicks++,true);});
  const modal=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  const surface=modal.locator('.collection-detail-surface');
  const cards=page.locator('.pokemon-card');
  const settle=()=>page.waitForTimeout(200);
  async function open(index=0) {await cards.nth(index).tap();await modal.waitFor();}
  async function tapInside() {const b=await surface.boundingBox();await page.touchscreen.tap(b.x+30,b.y+30);assert.equal(await modal.count(),0);}
  async function unchangedClicks(count) {assert.equal(await page.evaluate(()=>window.underlyingClicks),count);}
  async function gesture(events) {
    await modal.evaluate((node,events)=>{
      for(const [type,x,y] of events)node.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y}));
      node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
    },events);
  }
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});await page.evaluate(()=>scrollTo(0,0));await open();
    let clicks=await page.evaluate(()=>window.underlyingClicks);
    const header=await page.locator('.header').boundingBox();
    const b=await surface.boundingBox();assert.ok(Math.abs(b.y-(header.y+header.height+8))<1);
    assert.equal(b.x,12);assert.equal(b.width,width-24);assert.ok(Math.abs(b.y+b.height-844)<1);
    const style=await surface.evaluate(e=>{const s=getComputedStyle(e);return {background:s.backgroundColor,border:s.borderTopColor,width:s.borderTopWidth,radius:s.borderRadius,shadow:s.boxShadow,overflow:s.overflowY};});
    assert.deepEqual(style,{background:'rgb(32, 35, 41)',border:'rgb(57, 61, 68)',width:'1px',radius:'8px',shadow:'none',overflow:'auto'});
    assert.equal(await modal.evaluate(e=>getComputedStyle(e,'::backdrop').backgroundColor),'rgba(0, 0, 0, 0.6)');
    assert.equal(await modal.evaluate(e=>e.matches(':modal')),true);
    assert.equal(await modal.locator('.collection-overview').count(),1);
    assert.equal(await modal.getByText('Temporary scroll test',{exact:true}).count(),0);
    // Test-only overflow fixture keeps gesture coverage independent of how many
    // real profile sections currently exist. Production has no filler content.
    await surface.evaluate(e=>{const spacer=document.createElement('div');spacer.style.height='160vh';spacer.setAttribute('aria-hidden','true');e.append(spacer);});
    assert.equal(await modal.evaluate(e=>e.scrollHeight===e.clientHeight),true,'only surface scrolls');
    assert.ok(await surface.evaluate(e=>e.scrollHeight>e.clientHeight));
    // Dynamic viewport changes must resize the surface, with no bottom strip.
    await page.setViewportSize({width,height:650});assert.ok(Math.abs(await surface.evaluate(e=>e.getBoundingClientRect().bottom)-650)<1);
    await page.setViewportSize({width,height:844});
    const initialScroll=await page.evaluate(()=>scrollY);
    if(!safari) {
      const session=await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:650}]});
      assert.equal(await modal.count(),1,'touch down never dismisses');
      for(const y of [620,550,450,330])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
    } else if(mobileWebkit) {await surface.evaluate(e=>e.scrollTop=350);} else {await page.mouse.move(180,400);await page.mouse.wheel(0,350);}
    await settle();assert.equal(await modal.count(),1);assert.ok(await surface.evaluate(e=>e.scrollTop)>0);
    assert.equal(await page.evaluate(()=>scrollY),initialScroll);await unchangedClicks(clicks);
    // A returning drag still fails the tap test even when its endpoints match.
    await gesture([['pointerdown',80,200],['pointermove',80,250],['pointerup',80,200]]);
    assert.equal(await modal.count(),1);
    await gesture([['pointerdown',80,200],['pointercancel',80,200],['pointerup',80,200]]);
    assert.equal(await modal.count(),1);
    await modal.evaluate(node=>{
      const p={bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:80,clientY:200};
      node.dispatchEvent(new PointerEvent('pointerdown',p));node.querySelector('.collection-detail-surface').dispatchEvent(new Event('scroll'));
      node.dispatchEvent(new PointerEvent('pointerup',p));node.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    });assert.equal(await modal.count(),1,'scroll release cannot dismiss');
    await page.touchscreen.tap(80,200);assert.equal(await modal.count(),1,'touch stopping momentum is consumed');
    await page.waitForTimeout(500);await tapInside();await unchangedClicks(clicks);
    // Backdrop over the header, filters, tiles and side gutter must consume taps.
    for(const target of ['.header .icon-button','.collection-filter-toggle','.pokemon-card']) {
      await open();clicks=await page.evaluate(()=>window.underlyingClicks);
      const t=await page.locator(target).first().boundingBox();
      await page.touchscreen.tap(t.x+t.width/2,t.y+t.height/2);
      assert.equal(await modal.count(),0);await unchangedClicks(clicks);
      assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).count(),0);
    }
    await open();clicks=await page.evaluate(()=>window.underlyingClicks);await page.touchscreen.tap(2,400);assert.equal(await modal.count(),0);await unchangedClicks(clicks);
    await cards.nth(60).scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);assert.ok(before>0);
    await open(60);if(!mobileWebkit){await page.mouse.move(2,400);await page.mouse.wheel(0,350);}await settle();assert.equal(await page.evaluate(()=>scrollY),before);
    await page.keyboard.press('Tab');assert.equal(await modal.getByRole('button',{name:/^Pokémon role:/}).evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Escape');assert.equal(await modal.count(),0);assert.equal(await page.evaluate(()=>scrollY),before);
    assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.evaluate(()=>scrollTo(0,0));await open();await page.screenshot({path:`/tmp/collection-container-${safari?'webkit':'chrome'}-${width}.png`});await page.keyboard.press('Escape');
  }
  const desktop=await browser.newPage({viewport:{width:1200,height:900}});
  await desktop.goto(url);await desktop.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),save);await desktop.reload();
  await desktop.getByRole('button',{name:'Open navigation',exact:true}).click();await desktop.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  // Navigation restores main focus on the next frame; let that finish before
  // explicitly focusing a tile for this keyboard-opening check.
  await desktop.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  await desktop.locator('.pokemon-card').first().focus();await desktop.keyboard.press('Enter');
  const d=desktop.getByRole('dialog',{name:'Pokémon details',exact:true});await d.waitFor();
  const bounds=await d.locator('.collection-detail-surface').boundingBox();assert.equal(bounds.width,760);assert.equal(bounds.x,220);
  await desktop.keyboard.press('Escape');assert.equal(await d.count(),0);
  assert.equal(await desktop.locator('.pokemon-card').first().evaluate(e=>e===document.activeElement),true);
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?(mobileWebkit?'mobile WebKit':'WebKit'):'Chrome'} Collection container geometry, style, dynamic height, single scroll surface, gestures, no click-through, scroll/focus restoration and desktop Escape.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
