import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cases = [
  {name:'Moves', selector:'.resources-catalog-list button[aria-haspopup="dialog"]', queries:['', 'Surf', 'Ice']},
  {name:'Abilities', selector:'.resources-catalog-list button[aria-haspopup="dialog"]', queries:['', 'Levitate', 'Air']},
  {name:'Useful Items', selector:'button[data-item-id]', queries:['', 'Moon Stone', 'Shard'], tab:'Misc.'},
  {name:'Berries', selector:'button[data-item-id]', queries:['', 'Sitrus Berry', 'Cher']},
  {name:'Pokémon Sets', selector:'.frontier-set-list button', queries:['', '882', 'Snorlax']},
  {name:'Trainers', selector:'.frontier-trainer-list button', queries:['', 'BRADY', 'Anabel']},
];
for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  if (process.env.POPUP_ENGINE && process.env.POPUP_ENGINE !== engineName) continue;
  const browser = await engine.launch({headless:true, ...(engineName === 'chromium' ? {executablePath:process.env.CHROME_EXECUTABLE} : {})});
  try {
    const page = await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    for (const width of [320,375,390,430]) {
      await page.setViewportSize({width,height:844});
      for (const entry of cases) {
        await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
        await page.getByRole('button',{name:'Open navigation',exact:true}).click();
        await page.getByRole('button',{name:'Resources',exact:true}).click();
        await page.getByRole('link',{name:entry.name,exact:true}).click();
        const search = page.getByRole('searchbox');
        if (entry.tab) await page.getByRole('tab',{name:entry.tab,exact:true}).click();
        const queries = [...entry.queries];
        if (entry.name === 'Moves') queries.push('Ice'); // same search plus active type/category filters
        for (const [index, query] of queries.entries()) {
          if (entry.name === 'Trainers' && query === 'Anabel') await page.getByRole('tab',{name:'Frontier Brains',exact:true}).click();
          if (entry.name === 'Moves' && index === 3) {
            await page.getByRole('combobox',{name:'Move type'}).selectOption('ICE');
            await page.getByRole('combobox',{name:'Move category'}).selectOption('Special');
          }
          await search.fill(query); await search.blur();
          const trigger=page.locator(entry.selector).first(), dialog=page.getByRole('dialog');
          assert.ok(await page.locator(entry.selector).count()>0,`${entry.name}: ${query}`);
          const state=()=>page.locator('input[type="search"],select,[role="tab"]').evaluateAll(ns=>ns.map(n=>[n.value,n.getAttribute('aria-selected')]));
          const visuals=()=>trigger.evaluate(e=>{const s=getComputedStyle(e);return [s.backgroundColor,s.borderColor,s.outlineStyle,s.boxShadow];});
          const originalState=await state(), originalVisuals=await visuals();
          for (const target of ['bottom','inside','surface','escape']) {
            await trigger.tap(); await dialog.waitFor({state:'visible'});
            const listY=await page.evaluate(()=>scrollY);
            assert.deepEqual(await visuals(),originalVisuals);
            assert.equal(await page.evaluate(()=>document.documentElement.style.overflow),'hidden');
            // Unlike the native pseudo-backdrop, this is a real event target
            // even when the document/list ends above the bottom of the viewport.
            assert.equal(await dialog.evaluate((e, width)=>{
              const r=e.getBoundingClientRect();
              return Math.abs(r.x)<0.1 && Math.abs(r.y)<0.1 && Math.abs(r.width-width)<0.1 && Math.abs(r.height-innerHeight)<0.1
                && document.elementFromPoint(1,innerHeight-2)===e;
            },width),true);
            assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth),false);
            if(target==='bottom') await page.touchscreen.tap(Math.round(width/2),842);
            else if(target==='surface') await page.touchscreen.tap(1,842);
            else if(target==='inside') await dialog.locator('.resources-move-dialog').tap({position:{x:18,y:18}});
            else await page.keyboard.press('Escape');
            assert.equal(await dialog.count(),0,`${engineName}/${width}/${entry.name}/${query}/${target}`);
            assert.equal(await page.evaluate(()=>scrollY),listY);
            assert.deepEqual(await state(),originalState);
            assert.deepEqual(await visuals(),originalVisuals);
          }
          // Scroll and returning-drag invalidation must also work through the surface.
          await trigger.tap(); await dialog.waitFor({state:'visible'});
          await dialog.evaluate(e=>{
            const send=(type,y)=>e.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:9,isPrimary:true,button:0,clientX:1,clientY:y}));
            send('pointerdown',800);send('pointermove',750);send('pointermove',800);send('pointerup',800);e.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          });
          assert.equal(await dialog.count(),1);
          await dialog.evaluate(e=>{
            const p={bubbles:true,pointerId:9,isPrimary:true,button:0,clientX:20,clientY:20};
            e.dispatchEvent(new PointerEvent('pointerdown',p));e.dispatchEvent(new Event('scroll'));e.dispatchEvent(new PointerEvent('pointerup',p));e.dispatchEvent(new MouseEvent('click',{bubbles:true}));
          });
          assert.equal(await dialog.count(),1);
          await page.keyboard.press('Escape');
        }
      }
      console.log(`${engineName}: all six Resources pages, full/one/few results and supported filters; viewport targets, tap/Escape, state/scroll/appearance preservation and gesture invalidation at ${width}px.`);
    }
    const observerWarnings=errors.filter(message=>message==='ResizeObserver loop completed with undelivered notifications.');
    if(observerWarnings.length) console.warn(`${engineName}: ${observerWarnings.length} pre-existing Frontier facts ResizeObserver warnings (also reproduced with the pre-fix dialog).`);
    assert.deepEqual(errors.filter(message=>message!=='ResizeObserver loop completed with undelivered notifications.'),[]);
  } finally {await browser.close();}
}
