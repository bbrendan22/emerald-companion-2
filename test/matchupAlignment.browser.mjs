import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5305,strictPort:true},plugins:[{
 name:'matchup-alignment',configureServer(s){s.middlewares.use('/__matchup-alignment',(_req,res)=>{
 res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/matchupAlignment.jsx"></script>');
 });}
}]});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});await mkdir('artifacts/matchup-alignment',{recursive:true});
 for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`${server.resolvedUrls.local[0]}__matchup-alignment`);
  await page.getByRole('button',{name:'Butterfree',exact:true}).waitFor();await page.locator('.battle-matchup-sprite').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  const geometry=()=>page.locator('.battle-matchup-position').evaluateAll(els=>els.map(el=>{
   const rect=s=>{const r=el.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
   const ability=el.querySelector('.battle-active-ability'),values=ability.querySelector('.battle-opponent-ability-values')??ability;
   const text=document.createRange();text.selectNodeContents(values);const r=text.getBoundingClientRect();
   const lines=new Set(),walker=document.createTreeWalker(values,NodeFilter.SHOW_TEXT);
   while(walker.nextNode()) {const part=document.createRange();part.selectNodeContents(walker.currentNode);for(const box of part.getClientRects())if(box.width>0)lines.add(box.top.toFixed(2));}
   return {identity:rect('.battle-active-identity'),artwork:rect('.battle-active-artwork'),ability:rect('.battle-active-ability'),item:rect('.battle-active-item'),stats:rect('.battle-active-stats'),moves:rect('.battle-active-moves'),abilityText:{top:r.top,bottom:r.bottom,height:r.height},lineCount:lines.size,lineHeight:parseFloat(getComputedStyle(ability).lineHeight),moveRows:[...el.querySelectorAll('.battle-active-moves li')].map(li=>({top:li.getBoundingClientRect().top,height:li.getBoundingClientRect().height}))};
  }));
  // Reproduce the selector regression for a direct before/after comparison.
  const previous=await page.addStyleTag({content:'.battle-active-ability{display:block}.battle-opponent-ability-select{min-height:30px}'});
  const before=await geometry();await page.screenshot({path:`artifacts/matchup-alignment/before-${width}.png`,fullPage:true});await previous.evaluate(el=>el.remove());
  const after=await geometry();
  assert.ok(after[0].stats.top<=before[0].stats.top);
  if(width>=375)assert.ok(before[0].ability.height-after[0].ability.height>10,'selector minimum no longer enlarges a single-line ability row');
  await page.screenshot({path:`artifacts/matchup-alignment/after-${width}.png`,fullPage:true});
  // Compare shared track geometry with the pre-selector plain-text structure.
  const plain=await page.locator('.battle-matchup-pair').evaluate(pair=>{
   const clone=pair.cloneNode(true);clone.style.cssText=`position:absolute;visibility:hidden;width:${pair.getBoundingClientRect().width}px`;
   const ability=clone.querySelectorAll('.battle-active-ability')[1],names=ability.querySelector('.battle-opponent-ability-values');
   if(names)ability.replaceChildren(names.cloneNode(true));pair.parentNode.append(clone);
   const height=clone.querySelector('.battle-active-ability').getBoundingClientRect().height;clone.remove();return height;
  });
  assert.ok(Math.abs(after[0].ability.height-plain)<1,'selector shares the original intrinsic text track');
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  let cases=0;
  for(const player of ['Diglett','Wailord','Butterfree'])for(const opponent of ['Gardevoir','Rhydon','Weezing'])for(const moves of ['Empty moves','Populated moves']) {
   await tap(player);await tap(opponent);await tap(moves);
   await page.locator('.battle-matchup-sprite').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   const select=page.getByRole('combobox',{name:'Opponent ability',exact:true});
   const choices=await select.count()?await select.locator('option').evaluateAll(opts=>opts.map(o=>o.value)):[''];
   for(const ability of choices) {
    if(await select.count())await select.selectOption(ability);
    const [left,right]=await geometry();
    for(const row of ['identity','artwork','ability','item','stats','moves'])for(const edge of ['top','bottom'])assert.ok(Math.abs(left[row][edge]-right[row][edge])<1,`${width} ${player}/${opponent} ${moves} ${ability}: ${row} ${edge}`);
    assert.ok(Math.abs((left.abilityText.top+left.abilityText.bottom)-(right.abilityText.top+right.abilityText.bottom))<2,'ability content centers align even with wrapped names');
    assert.ok(Math.abs(left.ability.height-Math.max(left.lineCount*left.lineHeight,right.lineCount*right.lineHeight))<1,'ability track has no padding from control minimums');
    for(const side of [left,right]) {
     assert.equal(side.artwork.height,96,'artwork frame unchanged');assert.equal(side.stats.height,113,'stat layout unchanged');
     for(const [above,below] of [['artwork','ability'],['ability','item'],['item','stats'],['stats','moves']])assert.ok(Math.abs(side[below].top-side[above].bottom-2)<1,'only the existing shared row gap');
    }
    assert.deepEqual(left.moveRows,right.moveRows,'all four populated/empty move tracks stay shared');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width} ${player}/${opponent} ${moves} ${ability}: overflow`);cases++;
   }
   if(player==='Diglett'&&opponent==='Weezing'&&moves==='Empty moves'||player==='Wailord'&&opponent==='Gardevoir'&&moves==='Populated moves')
    await page.screenshot({path:`artifacts/matchup-alignment/${width}-${player}-${opponent}-${moves.startsWith('Empty')?'empty':'populated'}.png`,fullPage:true});
  }
  await tap('Gardevoir');await tap('Empty moves');
  const move=page.getByRole('combobox',{name:'Opponent move 1',exact:true});
  const original=await move.locator('option').nth(1).getAttribute('value');
  await move.selectOption(original);assert.equal(await move.inputValue(),original,'clipped native select remains functional');
  await move.selectOption('');assert.equal(await move.inputValue(),'');await move.selectOption(original);
  await page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true}).getByRole('button',{name:`Move information: ${original}`,exact:true}).tap();
  assert.equal(await page.getByRole('dialog').count(),1);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  console.log(`PASS WebKit ${width}px: ${cases} layout combinations; shared tracks, content-sized abilities, original artwork/stats/moves, pre-selector comparison and before/after screenshots`);
  assert.deepEqual(errors,[]);await page.close();
 }
} finally {await browser?.close();await server.close();}
