import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5214,strictPort:true,hmr:false},plugins:[{name:'selected-set-fixture',configureServer(server){server.middlewares.use('/selected-set',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/test/fixtures/battleSelectedSet.jsx"></script></body></html>');});}}]});
await server.listen();
try {
 for(const engine of [chromium,webkit]) {
  console.log(`Launching ${engine.name()}`);
  const browser=await engine.launch({timeout:15000,headless:true,...(engine===chromium?{channel:'chrome'}:{})});
  try {
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.setDefaultTimeout(15000);
   page.on('pageerror',error=>console.log(error.message));
   console.log('Loading fixture');
   await page.goto('http://127.0.0.1:5214/selected-set');
   const selector=page.getByRole('combobox',{name:'Select opponent set',exact:true});
   await selector.waitFor();
   const options=await selector.locator('option').allTextContents();assert.equal(options[0],'Set 1');
   assert.match(await page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true}).locator('option:checked').innerText(),/^Aerodactyl$/);
   assert.equal(await page.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);
   const playerSelect=page.getByRole('combobox',{name:'Select my Pokémon',exact:true});
   const playerCaption=page.locator('.battle-selection-player .battle-pokemon-caption > span:first-child');
   assert.equal(await playerCaption.innerText(),'Swampert');
   const playerOptions=await playerSelect.locator('option').allTextContents();
   for(const text of ['Swampert · Lv. 47','Ditto · Lv. 40','Ditto · Lv. 41'])assert.ok(playerOptions.includes(text));
   for(const level of [40,41]) {
    await playerSelect.selectOption({label:`Ditto · Lv. ${level}`});
    assert.equal(await playerSelect.inputValue(),`ditto-${level}`);
    assert.equal(await playerCaption.innerText(),'Ditto');
    assert.equal(await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).locator('.battle-active-level').innerText(),`Lv. ${level}`);
   }
   await playerSelect.selectOption('alexas-swampert');

   const opponent=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
   const before=await opponent.innerText();
   await selector.selectOption({index:1});assert.notEqual(await opponent.innerText(),before);
   assert.equal(await opponent.locator('.battle-active-moves select').count(),0);
   for(const name of ['My matchup Pokémon','Opponent matchup Pokémon']) {
    const moves=page.getByRole('group',{name,exact:true}).locator('.battle-active-moves button');
    for(let i=0;i<await moves.count();i++) {
     await moves.nth(i).tap();await page.getByRole('dialog').waitFor();
     await page.getByRole('dialog').tap({position:{x:10,y:10}});await page.getByRole('dialog').waitFor({state:'hidden'});
    }
   }
   assert.equal(await page.getByRole('heading',{name:'Battle Conditions',exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name:'Battle Conditions',exact:true}).count(),0);
   const stages=page.locator('.battle-condition-stages select');
   assert.equal(await stages.count(),10);
   for(let i=0;i<await stages.count();i++) {
    const stage=stages.nth(i);
    assert.equal(await stage.evaluate(el=>getComputedStyle(el).appearance),'none');
    assert.equal(await stage.evaluate(el=>getComputedStyle(el.parentElement.querySelector('.battle-observation-arrow')).fontSize),'0px');
    await stage.selectOption('2');assert.equal(await stage.inputValue(),'2');
    assert.equal(await stage.locator('..').locator('.battle-observation-value').innerText(),'+2');
    await stage.selectOption('0');
   }
   const observedMoves=page.getByRole('list',{name:'Observed moves',exact:true});
   const addMove=page.getByLabel('Add observed move',{exact:true});
   assert.equal(await observedMoves.count(),0);
   assert.equal(await page.locator('#battle-observation-controls select').count(),2);
   assert.equal(await page.locator('#battle-observation-controls p').count(),0);
   assert.equal(await page.getByLabel('Add observed move',{exact:true}).inputValue(),'');
   await page.getByLabel('Add observed move',{exact:true}).selectOption('Earthquake');
   assert.equal(await observedMoves.locator('li').count(),1);
   assert.equal(await addMove.locator('option[value="Earthquake"]').count(),0);
   const selectedSet=await selector.inputValue();
   await selector.selectOption({index:0});
   assert.equal(await observedMoves.locator('li').count(),1);
   await selector.selectOption(selectedSet);
   assert.ok(await selector.locator('option').count()<=options.length);
   await page.getByLabel('Observed held item',{exact:true}).selectOption('Kings Rock');
   assert.equal(await selector.count(),0);
   assert.equal(await page.locator('.battle-set-static').innerText(),'Set 4');
   assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name:'Reset observations',exact:true}).count(),1);
   assert.equal(await page.locator('.battle-set-static select,.battle-set-static .battle-round-chevron').count(),0);
   assert.equal(await addMove.locator('option[value="Roar"]').count(),0);
   assert.equal(await page.getByLabel('Observed held item',{exact:true}).locator('option[value="Choice Band"]').count(),0);
   assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).getByRole('status').count(),0);
   const item=page.getByLabel('Observed held item',{exact:true});
   assert.equal(await item.locator('option[value=""]').isDisabled(),true);
   assert.equal(await page.getByRole('button',{name:/Remove observed move/}).count(),0);
   await page.getByRole('button',{name:'Reset observations',exact:true}).click();
   assert.equal(await selector.isDisabled(),false);
   assert.equal(await observedMoves.count(),0);assert.equal(await item.inputValue(),'');
   assert.ok(await addMove.locator('option[value="Roar"]').count()>0);
   for(const move of ['Earthquake','Double Edge','Bite','Fire Blast'])await addMove.selectOption(move);
   assert.deepEqual(await observedMoves.locator('li').allTextContents(),['Earthquake','Double Edge','Bite','Fire Blast']);
   assert.equal(await addMove.isDisabled(),true);
   assert.equal(await observedMoves.locator('button').count(),0);
   assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).getByRole('button').count(),1);
   await item.selectOption('Kings Rock');
   assert.equal(await page.getByRole('heading',{name:'Observations',exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name:'Observations',exact:true}).count(),0);
   assert.equal(await observedMoves.isVisible(),true);
   assert.equal(await observedMoves.locator('li').count(),4);
   await page.getByRole('button',{name:'Reset observations',exact:true}).click();
   assert.equal(await observedMoves.count(),0);assert.equal(await item.inputValue(),'');
   for(const move of ['Earthquake','Double Edge','Bite','Fire Blast'])await addMove.selectOption(move);
   for(const width of [320,375,390]) {
    await page.setViewportSize({width,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const polish=await page.evaluate(()=>{
     const css=el=>getComputedStyle(el),rect=el=>{const {x,width,top,bottom}=el.getBoundingClientRect();return {x,width,top,bottom};};
     const sections=[...document.querySelectorAll('.battle-foundation > .battle-conditions')];
     const workspace=document.querySelector('.battle-workspace-panel');
     const probe=document.createElement('span');document.body.append(probe);
     const color=value=>{probe.style.color=value;return css(probe).color;};
     const effectiveness=[...document.querySelectorAll('.battle-active-move-effectiveness')].map(el=>{
      const value=el.dataset.effectiveness;
      return {value,text:el.textContent,color:css(el).color,expected:color(css(el).getPropertyValue(Number(value)>1?'--text-status-success':Number(value)<1?'--text-status-error':'--text-muted'))};
     });probe.remove();
     return {sections:sections.map(el=>({rect:rect(el),border:css(el).borderTopWidth,headerBorder:css(el.querySelector('.battle-conditions-heading')).borderBottomWidth,padding:css(el).paddingTop})),workspace:rect(workspace),effectiveness,
      moves:[...document.querySelectorAll('.battle-active-moves')].map(el=>({paddingTop:css(el).paddingTop,paddingBottom:css(el).paddingBottom,rows:[...el.children].map(rect)})),
      stats:[...document.querySelectorAll('.battle-active-stats')].map(el=>({top:css(el).paddingTop,bottom:css(el).paddingBottom})),
     };
    });
    for(const section of polish.sections) {
     assert.equal(section.border,'1px');assert.equal(section.headerBorder,'0px');assert.equal(section.padding,'4px');
     assert.equal(section.rect.x,polish.workspace.x);assert.equal(section.rect.width,polish.workspace.width);
    }
    assert.ok(Math.abs(polish.sections[0].rect.top-polish.workspace.bottom)<1);
    if(polish.sections.length>1)assert.ok(Math.abs(polish.sections[1].rect.top-polish.sections[0].rect.bottom)<1);
    for(const stat of polish.stats)assert.deepEqual(stat,{top:'4px',bottom:'4px'});
    for(const move of polish.moves) {
     assert.equal(move.paddingTop,'4px');assert.equal(move.paddingBottom,'4px');
     for(let i=1;i<move.rows.length;i++)assert.equal(move.rows[i].top-move.rows[i-1].top,move.rows[1].top-move.rows[0].top);
    }
    for(const row of polish.effectiveness) {
     if(row.value!==undefined) {
      if(Number(row.value)!==1)assert.equal(row.color,row.expected);
      if(row.value==='0.5')assert.equal(row.text,'.5×');
      if(row.value==='0.25')assert.equal(row.text,'.25×');
     }
    }

    const observationsLayout=await page.evaluate(()=>{
     const rect=el=>{const {x,y,width,height,bottom}=el.getBoundingClientRect();return {x,y,width,height,bottom};};
     return {
      section:rect(document.querySelector('.battle-observations')),
      conditions:rect(document.querySelector('[aria-label="Battle Conditions"]')),
      columns:[...document.querySelectorAll('.battle-observation-column')].map(rect),
      controls:[...document.querySelectorAll('.battle-observation-compact-select')].map(rect),
      moves:[...document.querySelectorAll('.battle-observed-moves li')].map(el=>({rect:rect(el),background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderWidth,display:getComputedStyle(el).display,separator:getComputedStyle(el,'::before').content})),
     };
    });
    assert.ok(observationsLayout.section.bottom<=observationsLayout.conditions.y+1);
    assert.equal(observationsLayout.columns[0].width,observationsLayout.columns[1].width);
    assert.equal(observationsLayout.controls[0].y,observationsLayout.controls[1].y);
    for(let i=0;i<observationsLayout.moves.length;i++) {
     const row=observationsLayout.moves[i];
     assert.equal(row.background,'rgba(0, 0, 0, 0)');assert.equal(row.border,'0px');
     assert.equal(row.display,'inline');
     if(i)assert.ok(row.separator.includes('·'));
    }

    const layout=await page.evaluate(()=>{
     const rect=el=>{const {left,right,top,bottom}=el.getBoundingClientRect();return {left,right,top,bottom};};
     const controls=[...document.querySelectorAll('.battle-opponent-selectors > .battle-pokemon-control')].map(rect);
     const column=rect(document.querySelector('.battle-selection-opponent'));
     const positions=[...document.querySelectorAll('.battle-matchup-position')].map(el=>({
      header:rect(el.querySelector('.battle-active-header')),types:rect(el.querySelector('.battle-active-types')),
      level:rect(el.querySelector('.battle-active-level')),art:rect(el.querySelector('.battle-active-artwork')),
      item:rect(el.querySelector('.battle-active-item')),ability:rect(el.querySelector('.battle-active-ability')),
      bounds:rect(el),icons:[...el.querySelectorAll('.battle-active-types img')].map(rect),
     }));
     return {controls,column,positions,selectFonts:[...document.querySelectorAll('.battle-pokemon-select')].map(el=>parseFloat(getComputedStyle(el).fontSize))};
    });
    assert.equal(layout.controls[0].top,layout.controls[1].top);
    assert.ok(layout.controls[0].right<=layout.controls[1].left);
    assert.ok(layout.controls[0].left>=layout.column.left && layout.controls[1].right<=layout.column.right+1);
    assert.ok(layout.selectFonts.every(size=>size>=16));
    for(const position of layout.positions) {
     assert.ok(position.header.bottom<=position.art.top+1);
     assert.ok(Math.abs(position.types.left-position.bounds.left)<1);
     assert.ok(Math.abs(position.level.right-position.bounds.right)<1);
     assert.ok(position.item.top>=position.art.bottom-1 && position.ability.top>=position.item.bottom-1);
     for(const part of [position.item,position.ability])assert.ok(Math.abs((part.left+part.right)-(position.bounds.left+position.bounds.right))<2);
    }
    assert.equal(await page.getByRole('group',{name:'My matchup Pokémon',exact:true}).locator('.battle-active-level').innerText(),'Lv. 47');
    assert.equal(await opponent.locator('.battle-active-level').innerText(),'Lv. 50');

    for(const control of [page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true})]) {
     assert.ok(await control.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}));
    }
   }
   await page.screenshot({path:`/private/tmp/battle-selected-set-${engine.name()}.png`,fullPage:true});
   const trainers=page.getByRole('combobox',{name:'Select Trainer',exact:true});
   const samples=await trainers.locator('option').evaluateAll(options=>options.filter(option=>option.value).sort((a,b)=>b.text.length-a.text.length).slice(0,6).map(option=>option.value));
   samples.push('Ruin Maniac:AIDEN');
   for(const width of [320,375,390]) {
    await page.setViewportSize({width,height:844});
    for(const key of samples) {
     if(!await trainers.locator('option').evaluateAll((options,key)=>options.some(option=>option.value===key),key))continue;
     await trainers.selectOption(key);
     const header=await page.locator('.battle-selection-opponent .battle-selection-trainer').evaluate(el=>{
      const name=el.querySelector('.battle-opponent-trainer-name'),className=el.querySelector('.battle-opponent-trainer-class'),caption=el.querySelector('.battle-opponent-trainer-caption'),sprite=el.querySelector('img'),chevron=el.querySelector('.battle-round-chevron');
      const n=name.getBoundingClientRect(),c=className.getBoundingClientRect(),s=sprite.getBoundingClientRect(),arrow=chevron.getBoundingClientRect(),r=el.getBoundingClientRect();
      return {nameSize:parseFloat(getComputedStyle(name).fontSize),classSize:parseFloat(getComputedStyle(className).fontSize),nameLines:name.getClientRects().length,classLines:className.getClientRects().length,right:c.right,arrowLeft:arrow.left,arrowRight:arrow.right,spriteLeft:s.left,columnRight:r.right,captionWidth:caption.getBoundingClientRect().width};
     });
     assert.equal(header.nameLines,1);assert.equal(header.classLines,1);
     assert.ok(header.classSize<header.nameSize);
     assert.ok(header.right<=header.arrowLeft+1 && header.arrowRight<=header.spriteLeft+1 && header.arrowRight<=header.columnRight+1,JSON.stringify({key,width,header}));
     assert.ok(header.arrowLeft-header.right<6);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
   }
   await trainers.selectOption('Cooltrainer (M):COOPER');
   await page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true}).selectOption({label:'Metagross'});
   assert.equal(await page.locator('.battle-set-static').count(),1);
   assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).count(),0);
   assert.equal(await page.getByRole('button',{name:'Reset observations',exact:true}).count(),0);
   assert.equal(await page.getByRole('region',{name:'Battle Conditions',exact:true}).count(),1);
   for(const width of [320,375,390]) {
    await page.setViewportSize({width,height:844});
    assert.ok(await page.getByRole('region',{name:'Battle Conditions',exact:true}).evaluate(el=>{
     const workspace=document.querySelector('.battle-workspace-panel');
     return getComputedStyle(el).borderTopWidth==='1px' && getComputedStyle(el.querySelector('.battle-conditions-heading')).borderBottomWidth==='0px'
      && Math.abs(el.getBoundingClientRect().top-workspace.getBoundingClientRect().bottom)<1
      && document.documentElement.scrollWidth<=innerWidth+1;
    }));
   }

   await trainers.selectOption('Expert (M):ALEXAS');
   await page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true}).selectOption({label:'Aerodactyl'});
   assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).count(),1);
   assert.equal(await selector.locator('option').count(),4);
   console.log(`PASS ${engine.name()}: initial single-set Observations hidden, observation-narrowed single-set remains visible/resettable, eligibility context refresh, Battle Conditions preserved and mobile bounds`);
  } finally {await browser.close();}
 }
} finally {await server.close();}
