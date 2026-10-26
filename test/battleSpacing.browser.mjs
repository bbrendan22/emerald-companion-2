import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';
const phase=process.env.SPACING_PHASE??'after';
const server=await createServer({server:{host:'127.0.0.1',port:5216,strictPort:true,hmr:false},plugins:[{name:'spacing-fixture',configureServer(server){server.middlewares.use('/spacing',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">import "/src/ui/styles/page.css";import "/test/fixtures/battleSelectedSet.jsx";</script>');});}}]});
await server.listen();
try {
 for(const engine of [chromium,webkit]) {
  const browser=await engine.launch({headless:true,timeout:15000,...(engine===chromium?{channel:'chrome'}:{})});
  try {
   for(const width of [375,390]) {
    const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
    page.setDefaultTimeout(15000);
    await page.goto('http://127.0.0.1:5216/spacing');
    await page.getByLabel('Select opponent Pokémon',{exact:true}).waitFor();
    await page.locator('main').evaluate(el=>el.className='page battle-page');
    for(const visibility of ['visible','hidden']) {
     if(visibility==='hidden') {
      await page.getByLabel('Select Trainer',{exact:true}).selectOption('Cooltrainer (M):COOPER');
      await page.getByLabel('Select opponent Pokémon',{exact:true}).selectOption({label:'Metagross'});
     }
     const metrics=await page.evaluate(()=>{
      const rect=el=>{if(!el)return null;const {x,y,width,height,bottom}=el.getBoundingClientRect();return {x,y,width,height,bottom};};
      const selectors={page:'main',foundation:'.battle-foundation',rules:'.battle-rules-heading',rulesButton:'.battle-rules-heading > button',workspace:'.battle-workspace-panel',selection:'.battle-single-selection',trainer:'.battle-selection-trainer',pokemon:'.battle-pokemon-control',pair:'.battle-matchup-pair',types:'.battle-active-header',art:'.battle-active-artwork',facts:'.battle-active-facts',item:'.battle-active-item',ability:'.battle-active-ability',stats:'.battle-active-stats',moves:'.battle-active-moves',observations:'.battle-observations',conditions:'[aria-label="Battle Conditions"]',conditionContent:'#battle-condition-controls'};
      const result=Object.fromEntries(Object.entries(selectors).map(([name,selector])=>{
       const el=document.querySelector(selector);if(!el)return [name,null];const s=getComputedStyle(el);
       return [name,{...rect(el),margin:s.margin,padding:s.padding,minHeight:s.minHeight,gap:s.gap,lineHeight:s.lineHeight,border:s.borderTopWidth+' '+s.borderTopColor}];
      }));
      result.statRows=[...document.querySelectorAll('.battle-active-stats:first-of-type > div')].map(rect);
      result.moveRows=[...document.querySelector('.battle-active-moves').children].map(rect);
      result.sprite=rect(document.querySelector('.battle-matchup-sprite'));
      result.bar=rect(document.querySelector('.battle-stat-track'));
      result.overflow=document.documentElement.scrollWidth>innerWidth;
      result.major=[...document.querySelectorAll('.battle-foundation > .battle-conditions')].map(el=>({rect:rect(el),border:getComputedStyle(el).borderTopWidth+' '+getComputedStyle(el).borderTopColor,headerBorder:getComputedStyle(el.querySelector('.battle-conditions-heading')).borderBottomWidth}));
      return result;
     });
     const path=`/private/tmp/battle-spacing-${phase}-${engine.name()}-${width}-${visibility}`;
     await writeFile(path+'.json',JSON.stringify(metrics,null,2));
     await page.screenshot({path:path+'.png',fullPage:true});
     assert.equal(metrics.overflow,false);
     if(phase==='after') {
      const before=JSON.parse(await readFile(path.replace('-after-','-before-')+'.json','utf8'));
      assert.ok(metrics.foundation.height<before.foundation.height);
      assert.ok(metrics.workspace.y<before.workspace.y);
      assert.ok(metrics.types.y<before.types.y);
      assert.equal(metrics.sprite.width,before.sprite.width);assert.equal(metrics.sprite.height,before.sprite.height);
      assert.equal(metrics.bar.height,before.bar.height);
      const statRows=metrics.statRows.slice(0,6);
      assert.ok(statRows.every(row=>row.height===18));
      for(const [section,rows] of [[metrics.stats,statRows],[metrics.moves,metrics.moveRows]]) {
       assert.equal(rows[0].y-section.y-1,4);
       assert.equal(section.bottom-rows.at(-1).bottom,4);
      }
      for(const el of metrics.major) {
       assert.equal(el.rect.x,metrics.workspace.x);assert.equal(el.rect.width,metrics.workspace.width);
      }
      assert.equal(metrics.major[0].rect.y,metrics.workspace.bottom);
      if(metrics.major.length===2)assert.equal(metrics.major[1].rect.y,metrics.major[0].rect.bottom);
      assert.ok(metrics.rulesButton.height>=32);
      assert.ok(metrics.moveRows.every(row=>row.height>=30));
      for(const name of ['stats','moves',...(visibility==='visible'?['observations']:[]),'conditions'])assert.equal(metrics[name].border,'1px rgb(57, 61, 68)');
      for(const section of metrics.major)assert.equal(section.headerBorder,'0px');
      assert.equal(await page.getByRole('heading',{name:'Battle Conditions',exact:true}).count(),1);
      assert.equal(await page.getByRole('button',{name:'Battle Conditions',exact:true}).count(),0);
      console.log(`${engine.name()} ${width}px ${visibility}: page ${before.foundation.height.toFixed(1)} → ${metrics.foundation.height.toFixed(1)}px; types top ${before.types.y.toFixed(1)} → ${metrics.types.y.toFixed(1)}px; divider rgb(57,61,68)`);
     } else console.log(`${engine.name()} ${width}px ${visibility}: before ${metrics.foundation.height.toFixed(1)}px; rules/workspace/types ${metrics.rules.y}/${metrics.workspace.y}/${metrics.types.y}`);
    }
    await page.close();
   }
  } finally {await browser.close();}
 }
} finally {await server.close();}
