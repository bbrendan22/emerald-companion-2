import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';

const categories=['Cool','Beauty','Cute','Smart','Tough'],ranks=['Normal','Super','Hyper','Master'];
const labels=[...categories.flatMap(c=>ranks.map(r=>`${c} ${r}`)),'Champion','Winning','Victory','Artist','Effort','Marine','Land','Sky','Country','National','Earth','World'];
const cases=[
  {raw:0,earned:[]},
  {raw:4|(2<<3)|(1<<15),earned:['Cool Normal','Cool Super','Cool Hyper','Cool Master','Beauty Normal','Beauty Super','Champion']},
  {raw:1<<24,earned:['National']},
  {raw:(1<<16)|(1<<18)|(1<<19)|(1<<25)|(1<<26),earned:['Winning','Artist','Effort','Earth','World']},
  {raw:(4|(4<<3)|(4<<6)|(4<<9)|(4<<12)|(0xfff<<15)),earned:labels},
];
const server=await preview({preview:{host:'127.0.0.1',port:5240,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT==='1';
const browser=await(safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const storage=new Uint8Array(33744);cases.forEach((c,i)=>storage.set(makePokemon({pid:100+i,ribbonRaw:c.raw}),4+i*80));
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});
    for(const [i,data] of cases.entries()) {
      await page.locator('.pokemon-card').nth(i).click();
      const section=dialog.getByRole('region',{name:'Ribbons',exact:true});
      assert.equal(await section.getByRole('heading',{name:'Ribbons'}).count(),1);
      assert.deepEqual(await section.locator('li span').allTextContents(),labels);
      assert.deepEqual(await section.locator('li[data-earned="true"] span').allTextContents(),data.earned);
      assert.equal(await section.locator('button,a,[title],[tabindex]').count(),0);
      await section.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
      await section.scrollIntoViewIfNeeded();
      const geometry=await section.evaluate(root=>{
        const cells=[...root.querySelectorAll('li')],grid=root.querySelector('ul'),rects=cells.map(e=>e.getBoundingClientRect());
        return {count:cells.length,rows:new Set(rects.map(r=>r.top)).size,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          lastRow:rects.filter(r=>r.top===rects.at(-1).top).length,
          championLines:(()=>{const range=document.createRange();range.selectNodeContents(root.querySelectorAll('li span')[20]);return range.getClientRects().length;})(),
          order:root.previousElementSibling.className,
          sections:[...root.parentElement.children].map(e=>e.className),
          // Shared gender glyphs intentionally crop their font fallback; overview tests check their visible SVG bounds.
          completeOverflow:[root.parentElement,...root.parentElement.querySelectorAll('*')].filter(e=>!e.matches('.pokemon-species-symbol') && e.clientWidth>0 && e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,cls:e.className,w:e.clientWidth,scroll:e.scrollWidth,overflow:getComputedStyle(e).overflowX})),border:getComputedStyle(root).borderBottomColor,
          overflow:[root,...root.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1),
          cells:cells.map((cell,i)=>{const img=cell.querySelector('img'),label=cell.querySelector('span'),ir=img.getBoundingClientRect(),lr=label.getBoundingClientRect(),style=getComputedStyle(img),text=getComputedStyle(label);return {
            width:ir.width,height:ir.height,center:Math.abs(ir.x+ir.width/2-rects[i].x-rects[i].width/2),below:lr.top>=ir.bottom,
            lines:lr.height/parseFloat(text.lineHeight),size:parseFloat(text.fontSize),align:text.textAlign,filter:style.filter,opacity:style.opacity,color:text.color,earned:cell.dataset.earned};})};
      });
      assert.equal(geometry.championLines,1);assert.equal(geometry.lastRow,4);assert.equal(geometry.count,32);assert.equal(geometry.rows,5);assert.equal(geometry.columns,7);assert.equal(geometry.order,'collection-pokemon-condition');assert.deepEqual(geometry.sections,['collection-overview','collection-info-moves','collection-training-stats','collection-pokemon-origin','collection-pokemon-condition','collection-pokemon-ribbons']);assert.deepEqual(geometry.completeOverflow,[]);assert.equal(geometry.overflow,false);assert.equal(geometry.border,'rgba(255, 255, 255, 0.07)');
      for(const c of geometry.cells) {
        assert.equal(c.width,32);assert.equal(c.height,32);assert.ok(c.center<.1);assert.equal(c.below,true);assert.ok(c.lines<=2.01);assert.equal(c.size,10);assert.equal(c.align,'center');
        if(c.earned==='true'){assert.equal(c.filter,'none');assert.equal(c.opacity,'1');assert.equal(c.color,'rgb(243, 244, 246)');}
        else{assert.equal(c.filter,'grayscale(1)');assert.equal(c.opacity,'0.35');assert.equal(c.color,'rgb(157, 167, 179)');}
      }
      assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).overflow),'hidden');
      await page.screenshot({path:`/tmp/collection-ribbons-${safari?'webkit':'chrome'}-${width}-${i}.png`});
      assert.equal(await dialog.count(),1,'scrolling to ribbons must not dismiss');
      await page.waitForTimeout(200);await section.locator('li').first().tap();assert.equal(await dialog.count(),0);
    }
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?'WebKit':'Chrome'} 32 Gen 3 ribbons, exact 7×5 grid, earned states, two-line labels, no overflow and tap dismissal at 375/430px.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
