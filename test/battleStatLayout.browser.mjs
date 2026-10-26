import assert from 'node:assert/strict';
import React from 'react';
import {frontierStatReference} from '../src/battle/frontierStatReference.js';
const reference=frontierStatReference();
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {webkit,chromium} from 'playwright';
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
let Row;
try {Row=(await vite.ssrLoadModule('/src/ui/components/BattleStatRow.jsx')).default;}finally{await vite.close();}
const css=(await Promise.all(['base','collection-pokemon-stats','battle'].map(name=>readFile(`src/ui/styles/${name}.css`,'utf8')))).join('\n');
const keys=['hp','attack','defense','spAttack','spDefense','speed'];
const values=items=>Object.fromEntries(keys.map((key,index)=>[key,items[index]]));
const exact=values([207,167,152,137,150,121]);
const ranged=values(['175–207','123–167','130–152','110–137','120–150','100–121']);
const mixed={...ranged,hp:207,defense:152,speed:121};
const row=stats=>renderToStaticMarkup(React.createElement(Row,{values:stats}));
const position=stats=>`<div class="battle-matchup-position"><div>Pokémon</div><div class="battle-active-artwork"></div><div class="battle-active-facts"><div>Item</div><div>Ability</div></div>${row(stats)}<ul class="battle-active-moves"><li>Move 1</li><li>Move 2</li><li>Move 3</li><li>Move 4</li></ul></div>`;
const safari=process.argv.includes('--webkit');
const browser=await(safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
 await mkdir('artifacts/stat-layout',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await page.setContent(`<meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><main style="padding:12px"><div class="battle-matchup-pair">${position(exact)}${position(ranged)}</div></main>`);
  const geometry=()=>page.locator('.battle-matchup-position').evaluateAll(els=>els.map(el=>{
   const stats=el.querySelector('dl').getBoundingClientRect(),moves=el.querySelector('ul').getBoundingClientRect();
   return {statsTop:stats.top,statsHeight:stats.height,movesTop:moves.top};
  }));
  const initial=await geometry();assert.ok(Math.abs(initial[0].statsHeight-113)<.01);assert.deepEqual(initial[0],initial[1]);
  for(const stats of [ranged,exact,mixed,values(keys.map(key=>reference[key].min)),values(keys.map(key=>reference[key].max)),ranged,exact]) {
   await page.locator('.battle-matchup-position').nth(1).locator('dl').evaluate((el,html)=>{el.outerHTML=html;},row(stats));
   assert.deepEqual(await geometry(),initial,'stat and move positions remain constant for every shape');
   assert.ok(await page.locator('.battle-active-stats').evaluateAll(rows=>rows.every(row=>{
    const cells=[...row.children];
    return cells.length===6&&cells.every((cell,index)=>{
     const box=cell.getBoundingClientRect(),dd=cell.querySelector('dd'),track=dd.querySelector('.battle-stat-track'),number=dd.querySelector('.battle-stat-value');
     const bar=track.getBoundingClientRect(),text=number.getBoundingClientRect(),label=cell.querySelector('dt').getBoundingClientRect();
     if(Math.abs(box.height-18)>.01||bar.width<=0||text.right>bar.left||label.right>text.left||bar.right>box.right+.5||getComputedStyle(track).backgroundColor!=='rgba(0, 0, 0, 0)')return false;
     if(index&&Math.abs(box.top-cells[index-1].getBoundingClientRect().bottom)>.01)return false;
     const [min,max=min]=dd.dataset.value.split('–').map(Number);
     const solid=track.querySelector('.battle-stat-solid'),extension=track.querySelector('.battle-stat-extension');
     if(!solid||Boolean(extension)!==(min!==max))return false;
     if(extension){
      const solidBox=solid.getBoundingClientRect(),extra=extension.getBoundingClientRect();
      if(Number(getComputedStyle(extension).opacity)>=1||getComputedStyle(extension).backgroundColor!==getComputedStyle(solid).backgroundColor)return false;
      if(Math.abs(extra.left-solidBox.right)>.1||extra.right>bar.right+.1)return false;
     }
     return true;
    });
   })),'six fixed rows, separated label/bar/value, same-color range extension, no clipping');
   assert.ok(await page.locator('.battle-active-stats').evaluateAll((rows,reference)=>{
    const percent=(value,range)=>Math.max(5,Math.min(100,5+95*(value-range.min)/(range.max-range.min)));
    return [...rows[0].children].every((cell,index)=>{
     const other=rows[1].children[index];
     return Math.abs(cell.getBoundingClientRect().top-other.getBoundingClientRect().top)<.01&&[cell,other].every(row=>{
      const dd=row.querySelector('dd'),track=dd.querySelector('.battle-stat-track').getBoundingClientRect();
      const [min,max=min]=dd.dataset.value.split('–').map(Number),range=reference[row.dataset.stat];
      const solid=dd.querySelector('.battle-stat-solid').getBoundingClientRect(),extension=dd.querySelector('.battle-stat-extension')?.getBoundingClientRect();
      const end=extension?.right??solid.right;
      return Math.abs(100*solid.width/track.width-percent(min,range))<.1&&Math.abs(100*(end-track.left)/track.width-percent(max,range))<.1;
     });
    });
   },reference),'both Pokémon use the same Frontier-wide reference and scale both endpoints correctly');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('.battle-matchup-position').nth(1).locator('dl').evaluate((el,html)=>{el.outerHTML=html;},row(mixed));
  await page.screenshot({path:`artifacts/stat-layout/${safari?'webkit':'chrome'}-${width}.png`});
  await page.close();console.log(`PASS fixed stat layout ${width}px: six exact, six ranges, mixed, transitions, fixed moves, colored bars and extensions, no overflow.`);
 }
}finally{await browser.close();}
