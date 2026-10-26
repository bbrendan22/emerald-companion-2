import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5314,strictPort:true},plugins:[{
 name:'mobile-release-fixture',configureServer(s){s.middlewares.use('/__mobile-release',(_req,res)=>{
  res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><div id="root"></div><script type="module" src="/test/fixtures/frontierCandidatePopup.jsx"></script>');
 });},
}]});
let browser;const results=[];
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/frontier-candidate-step6',{recursive:true});
 for(const width of [320,375,390,430])for(const standalone of [false,true]) {
  const context=await browser.newContext({viewport:{width,height:844},screen:{width,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(standalone=>{
   if(standalone)Object.defineProperty(navigator,'standalone',{get:()=>true});
   const types=new Set(['pointerdown','pointermove','pointerup','pointercancel','scroll','click','resize','keydown']);
   const live=new Map(),add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
   const key=(target,type,options)=>`${target===window?'window':'document'}:${type}:${typeof options==='boolean'?options:Boolean(options?.capture)}`;
   EventTarget.prototype.addEventListener=function(type,listener,options){
    if((this===window||this===document)&&types.has(type)) {const k=key(this,type,options);if(!live.has(k))live.set(k,new Set());live.get(k).add(listener);}
    return add.call(this,type,listener,options);
   };
   EventTarget.prototype.removeEventListener=function(type,listener,options){
    if((this===window||this===document)&&types.has(type))live.get(key(this,type,options))?.delete(listener);
    return remove.call(this,type,listener,options);
   };
   window.releaseListeners=()=>[...live].reduce((sum,[,listeners])=>sum+listeners.size,0);
  },standalone);
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
  await page.goto(`${server.resolvedUrls.local[0]}__mobile-release`);await page.waitForFunction(()=>window.frontierFixture);
  const result={width,standaloneSimulation:standalone};
  if(!standalone) {
   result.calculations=await page.evaluate(async()=>{
    const {performanceCases,calculateCase,statistics}=await import('/test/fixtures/frontierPerformance.js');
    const measurements=[];
    for(const value of performanceCases()) {
     for(let n=0;n<20;n++)calculateCase(value);
     const durations=[];let summary;
     // WebKit coarsens this timer to 1ms. Ten-call batches provide 0.1ms
     // amortized resolution; these are batch-average, not individual-call tails.
     for(let n=0;n<100;n++){const start=performance.now();for(let k=0;k<10;k++)summary=calculateCase(value);durations.push((performance.now()-start)/10);}
     measurements.push({case:value.name,candidates:summary.candidateCount,branches:summary.branches.length,kind:summary.kind,batchSize:10,...statistics(durations)});
    }
    return measurements;
   });
   result.interactions=await page.evaluate(async()=>{
    const {statistics}=await import('/test/fixtures/frontierPerformance.js');
    const settle=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const open=()=>document.querySelector('[aria-label="My matchup Pokémon"] button[aria-label="Move information: Ice Beam"]').click();
    const close=()=>document.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}));
    for(let n=0;n<10;n++){open();await settle();close();await settle();}
    const before={nodes:document.querySelectorAll('*').length,listeners:window.releaseListeners()};
    const latencies=[],frameGaps=[];let running=true,previous;
    const frame=time=>{if(previous!==undefined)frameGaps.push(time-previous);previous=time;if(running)requestAnimationFrame(frame);};requestAnimationFrame(frame);
    for(let n=0;n<100;n++) {
     const start=performance.now();open();await settle();latencies.push(performance.now()-start);
     if(document.querySelector('.battle-core-damage-hp')?.textContent!=='71–84 HP damage')throw Error('stale popup');
     close();await settle();
    }
    const after={nodes:document.querySelectorAll('*').length,listeners:window.releaseListeners()};
    open();await settle();const updates=[];
    for(let n=0;n<30;n++) {
     const value=n%2,start=performance.now();window.frontierFixture.dispatch({type:'matchupCondition',side:'enemy',slot:0,field:'stage',stat:'spDefense',value});
     await settle();updates.push(performance.now()-start);
     if(document.querySelector('.battle-core-damage-hp')?.textContent!==`${value?'47–56':'71–84'} HP damage`)throw Error('stale condition');
    }
    close();await settle();running=false;
    return {method:'programmatic DOM activation/cancel and reducer dispatch to second requestAnimationFrame; 10 warmups, 100 open/close cycles, 30 condition updates',
     opening:statistics(latencies),updates:statistics(updates),frameGaps:statistics(frameGaps),framesOver50ms:frameGaps.filter(n=>n>50).length,
     before,after,webKitHeapBytes:performance.memory?.usedJSHeapSize??null};
   });
   assert.deepEqual(result.interactions.after,result.interactions.before,'DOM and tracked popup listeners return to baseline');
   await page.evaluate(()=>window.frontierFixture.dispatch({type:'matchupCondition',side:'enemy',slot:0,field:'stage',stat:'spDefense',value:0}));
  }
  const dialog=page.getByRole('dialog');
  const open=()=>page.getByRole('group',{name:'My matchup Pokémon',exact:true}).getByRole('button',{name:'Move information: Ice Beam',exact:true}).tap();
  const fits=async()=>{
   const bounds=await dialog.locator('.battle-move-dialog').boundingBox();
   assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y>=0&&bounds.y+bounds.height<=844);
   assert.equal(await dialog.evaluate(node=>node.scrollWidth>node.clientWidth),false);
  };
  await open();await fits();
  assert.equal(await dialog.locator('.battle-core-damage-hp').evaluate(node=>node.previousElementSibling.className),'battle-core-damage-percent');
  result.viewport=await page.evaluate(()=>({innerHeight,visualHeight:visualViewport.height,scale:visualViewport.scale,
   standalone:navigator.standalone===true,displayMode:matchMedia('(display-mode: standalone)').matches,
   safeArea:(()=>{const node=document.createElement('div');node.style.padding='env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.append(node);const value=getComputedStyle(node).padding;node.remove();return value;})()}));
  await page.screenshot({path:`artifacts/frontier-candidate-step6/${standalone?'standalone-sim':'browser'}-${width}.png`});
  await page.keyboard.press('Escape');
  // Long missing-input explanations must wrap, scroll, and remain dismissible.
  await page.evaluate(()=>{const f=window.frontierFixture;f.setPlayer({...f.player,name:'Gardevoir',dex:282,ability:'Trace'});
   f.dispatch({type:'fixtureReplace',state:{...f.state,rules:{...f.state.rules,format:'Doubles'},field:{...f.state.field,weather:'rain'}}});});
  await open();await page.waitForFunction(()=>document.querySelector('.battle-damage-unavailable')?.textContent.includes('Trace'));
  await fits();const panel=dialog.locator('.battle-move-dialog');
  await panel.evaluate(node=>{node.style.maxHeight='145px';});
  assert.ok(await panel.evaluate(node=>node.scrollHeight>node.clientHeight));
  await dialog.locator('.battle-damage-unavailable').scrollIntoViewIfNeeded();
  assert.equal(await dialog.locator('.battle-damage-unavailable').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
  result.targets=await page.locator('.battle-active-moves li').evaluateAll(nodes=>({minRowHeight:Math.min(...nodes.map(node=>node.getBoundingClientRect().height)),
   minRowWidth:Math.min(...nodes.map(node=>node.getBoundingClientRect().width))}));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push(result);await context.close();console.log(`PASS WebKit ${width}px ${standalone?'navigator.standalone simulation':'browser performance/layout'}: scrolling, wrapping, touch opening, dismissal, no overflow`);
 }
 await writeFile('artifacts/frontier-candidate-step6/webkit-performance.json',JSON.stringify({methodology:'Unthrottled desktop Playwright WebKit; timing includes test harness and two animation frames; no physical-device or installed-app claims',results},null,2)+'\n');
} finally {await browser?.close();await server.close();}
