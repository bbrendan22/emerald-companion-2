import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:0,hmr:false},base:'/'});
await server.listen();
const safari=process.argv.includes('--webkit');
const browser=await(safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const url=new URL(server.resolvedUrls.local[0]);
 await page.route('**/hp-input-fixture?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/battleHpInputs.jsx"></script>'}));
 for(const width of [320,375,430])for(const format of ['Singles','Doubles']) {
  await page.setViewportSize({width,height:844});
  await page.goto(new URL(`/hp-input-fixture?format=${format}`,url).href);
  const saved=()=>page.getByRole('status',{name:'HP state'}).textContent().then(JSON.parse);
  const checks=async playerMax=>{
   for(const [side,label,max] of [['player','Player',playerMax],['enemy','Opponent',150]]) {
    const hp=page.getByRole('spinbutton',{name:`${label} current HP`});
    assert.equal(await hp.getAttribute('min'),'1');
    assert.equal(await hp.getAttribute('inputmode'),'numeric');
    const layout=await hp.evaluate(input=>{
     const row=input.closest('.battle-condition-hp'),maximum=row.querySelector('span');
     const box=input.getBoundingClientRect(),end=maximum.getBoundingClientRect();
     const own=getComputedStyle(input),other=getComputedStyle(maximum);
     return {alignment:getComputedStyle(row).alignItems,gap:end.left-box.right,align:own.textAlign,
      size:parseFloat(own.fontSize),labelSize:parseFloat(getComputedStyle(row).fontSize),maximumSize:parseFloat(other.fontSize),
      line:parseFloat(own.lineHeight),maximumLine:parseFloat(other.lineHeight),
      fontsMatch:['fontFamily','fontWeight','fontStyle','fontVariantNumeric','letterSpacing'].every(key=>own[key]===other[key]),
      fits:end.right<=row.getBoundingClientRect().right+1,sameRow:box.top<end.bottom&&end.top<box.bottom};
    });
    assert.equal(layout.alignment,'baseline');assert.equal(layout.align,'right');
    assert.ok(layout.gap>=2&&layout.gap<=4,JSON.stringify(layout));
    assert.ok(layout.size>=16,JSON.stringify(layout));
    assert.ok(Math.abs(layout.maximumSize-layout.labelSize)<.1,JSON.stringify(layout));
    assert.ok(layout.line<=28,JSON.stringify(layout));
    assert.ok(layout.fits&&layout.sameRow,JSON.stringify(layout));
    assert.ok(layout.fontsMatch,'current and maximum HP must use identical typography');
    const viewport=()=>page.evaluate(()=>({scale:visualViewport.scale,x:scrollX,y:scrollY}));
    const before=await viewport();
    await hp.tap();
    assert.equal(await hp.evaluate(el=>el===document.activeElement),true);
    assert.deepEqual(await viewport(),before,'HP focus preserves viewport scale and scroll');
    assert.equal(await hp.evaluate(el=>{for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);if(s.transform!=='none'||Number(s.zoom)!==1)return false;}return true;}),true,'no transform or CSS zoom reduces effective font size');
    for(const [input,expected] of [['0',1],['-12',1],['1',1],['37',37],[String(max),max],['99999',max]]) {
     await hp.fill(input);
     assert.equal(await hp.inputValue(),String(expected),`${format} ${label}: ${input}`);
     assert.equal((await saved())[side],expected,'display and reducer HP match');
    }
    await hp.fill('');assert.equal(await hp.inputValue(),'');
    assert.equal((await saved())[side],max,'clearing preserves state during edit');
    await hp.fill('45');assert.equal((await saved())[side],45);
    await hp.fill('');await hp.blur();
    assert.equal((await saved())[side],null,'blank blur restores full HP');
   }
  };
  await checks(120);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===375&&format==='Singles')await page.screenshot({path:'/private/tmp/emerald-hp-spacing-webkit.png'});
  if(format==='Doubles') {
   await page.getByRole('button',{name:'Switch pair'}).click();await checks(140);
   await page.getByRole('spinbutton',{name:'Player current HP'}).fill('23');
   await page.getByRole('button',{name:'Switch pair'}).click();
   assert.equal((await saved()).player,null,'other slot retained its full-HP default');
   await page.getByRole('button',{name:'Switch pair'}).click();
   assert.equal(await page.getByRole('spinbutton',{name:'Player current HP'}).inputValue(),'23','slot HP survives switching');
  }
 }
 console.log(`PASS ${safari?'WebKit':'Chrome'} HP inputs/layout at 320/375/430px: 16px effective input font, stable focus scale/scroll, baseline, compact slash gap, Singles and both Doubles pairs; zero/negative/valid/max clamp; blank editing and blur; display/reducer synchronization and slot retention.`);
} finally {await browser.close();await server.close();}
