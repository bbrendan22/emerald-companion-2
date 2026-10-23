import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
import {readPokemon} from '../src/save/readPokemon.js';

const server=await preview({preview:{host:'127.0.0.1',port:5236,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT==='1';
const browser=await (safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cases=[
    {species:101,pid:0,heldItemId:203,moveIds:[209,89,56,246],ppUps:[0,3,3,2],currentPp:[1,2,3,4],
      names:['Spark','Earthquake','Hydro Pump','AncientPower'],pp:['PP 20','PP 16','PP 8','PP 7'],types:['electric','ground','water','rock']},
    {species:160,pid:555,heldItemId:214,moveIds:[9,120,0,320],ppUps:[1,2,3,3],currentPp:[1,2,0,4],
      names:['ThunderPunch','Self Destruct',null,'GrassWhistle'],pp:['PP 18','PP 7',null,'PP 24'],types:['electric','normal',null,'grass']},
    {species:115,pid:888,heldItemId:0,moveIds:[0,0,0,0],ppUps:[3,2,1,0],currentPp:[0,0,0,0],
      names:[null,null,null,null],pp:[null,null,null,null],types:[null,null,null,null]},
  ];
  const storage=new Uint8Array(33744);
  cases.forEach((data,i)=>{
    const bytes=makePokemon(data);storage.set(bytes,4+i*80);
    const parsed=readPokemon(bytes);
    assert.deepEqual(parsed.moves.map(m=>m.ppUps),data.ppUps);
    assert.deepEqual(parsed.moves.map(m=>m.maxPp),data.pp.map(p=>p?Number(p.slice(3)):null),'Gen 3 max PP from actual saved PP Ups');
  });
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});
    for(const [index,data] of cases.entries()) {
      await page.locator('.pokemon-card').filter({has:page.locator(`img[src$="/${data.pid===0?'shiny':'normal'}/${data.species}.png"]`)}).click();
      const block=modal.locator('.collection-info-moves'),info=block.locator('.collection-pokemon-info'),moves=block.getByRole('list',{name:'Moves',exact:true});
      assert.equal(await modal.locator('.collection-overview dt').count(),0);
      assert.deepEqual(await info.locator('dt').allTextContents(),['Nature','Ability','Held Item']);
      assert.equal(await info.locator('h1,h2,h3').count(),0);
      assert.equal(await info.locator('dd').last().innerText(),index===0?'Soft Sand':index===1?'TwistedSpoon':'None');
      assert.equal(await info.locator('dd img').count(),index<2?1:0);
      const slots=moves.getByRole('listitem');assert.equal(await slots.count(),4);
      for(let slot=0;slot<4;slot++) {
        const row=slots.nth(slot);
        if(data.names[slot]) {
          assert.equal(await row.locator('.collection-pokemon-move-name').innerText(),data.names[slot]);
          assert.equal(await row.locator('small').innerText(),data.pp[slot]);
          assert.equal(await row.locator('img').getAttribute('alt'),`${data.types[slot]} type`);
          assert.equal(await row.locator('small').evaluate(e=>getComputedStyle(e).fontSize),'10px');
          assert.equal(await row.locator('.collection-pokemon-move-name').evaluate(e=>getComputedStyle(e).fontSize),'12px');
          const alignment=await row.evaluate(e=>{
            const icon=e.querySelector('img').getBoundingClientRect(),name=e.querySelector('.collection-pokemon-move-name').getBoundingClientRect(),pp=e.querySelector('small').getBoundingClientRect();
            return {centers:Math.abs(icon.y+icon.height/2-name.y-name.height/2),ppCenter:Math.abs(pp.y+pp.height/2-name.y-name.height/2),nameRight:name.right,ppLeft:pp.x,ppRight:pp.right,rowRight:e.getBoundingClientRect().right,iconWidth:icon.width};
          });
          assert.ok(alignment.centers<.1);assert.ok(alignment.ppCenter<.1);assert.ok(alignment.ppLeft>alignment.nameRight);assert.ok(Math.abs(alignment.ppRight-alignment.rowRight)<.1);assert.equal(alignment.iconWidth,21);
        } else {assert.equal(await row.innerText(),'—');assert.equal(await row.locator('img,small').count(),0);}
      }
      const moveGrid=await moves.evaluate(list=>{
        const rects=[...list.children].map(e=>e.getBoundingClientRect());
        return {starts:[...list.querySelectorAll('.collection-pokemon-move-name, .collection-pokemon-empty-move')].map(e=>e.getBoundingClientRect().x),
          rights:[...list.querySelectorAll('small')].map(e=>e.getBoundingClientRect().right),
          gaps:rects.slice(1).map((r,i)=>r.top-rects[i].bottom),
          iconGaps:[...list.querySelectorAll('img')].map(e=>e.nextElementSibling.getBoundingClientRect().left-e.getBoundingClientRect().right)};
      });
      assert.ok(moveGrid.starts.every(x=>Math.abs(x-moveGrid.starts[0])<.1),'move names and empty slots share their start');
      assert.ok(moveGrid.rights.every(x=>Math.abs(x-moveGrid.rights[0])<.1),'PP shares its right edge');
      assert.ok(moveGrid.gaps.every(g=>g>=4-.1 && Math.abs(g-moveGrid.gaps[0])<.1),'even distribution with compact minimum gaps');
      assert.ok(moveGrid.iconGaps.every(g=>Math.abs(g-4)<.1),'icons stay close to names');
      await block.locator('img').evaluateAll(images=>Promise.all(images.map(e=>e.decode())));
      const layout=await modal.evaluate(root=>{
        const overview=root.querySelector('.collection-overview'),section=root.querySelector('.collection-info-moves'),info=section.querySelector('dl'),moves=section.querySelector('ol');
        const o=overview.getBoundingClientRect(),s=section.getBoundingClientRect(),l=info.getBoundingClientRect(),r=moves.getBoundingClientRect();
        const labels=[...info.querySelectorAll('dt')].map(e=>e.getBoundingClientRect().x);
        const values=[...info.querySelectorAll('dd')].map(e=>e.getBoundingClientRect().x);
        const slots=[...moves.children].map(e=>e.getBoundingClientRect());
        return {touching:Math.abs(o.bottom-s.top),sameTop:Math.abs(l.y-r.y),sameHeight:Math.abs(l.height-r.height),firstTop:Math.abs(slots[0].top-l.top),lastBottom:Math.abs(slots.at(-1).bottom-l.bottom),columns:l.right<r.left&&r.width>l.width,labels,values,height:s.height,
          borders:[overview,section].map(e=>{const c=getComputedStyle(e);return [c.borderBottomWidth,c.borderBottomColor];}),
          overflow:[root,section,info,moves,...section.querySelectorAll('li,dd')].some(e=>e.scrollWidth>e.clientWidth+1)};
      });
      assert.ok(layout.touching<.1);assert.ok(layout.sameTop<.1);assert.equal(layout.columns,true);assert.equal(layout.overflow,false);
      assert.ok(layout.sameHeight<.1,'both columns occupy the same content height');assert.ok(layout.firstTop<.1);assert.ok(layout.lastBottom<.1,'fourth move finishes at the held item baseline area');
      assert.ok(layout.height<180,'compact section follows content without excess padding');
      assert.deepEqual(layout.borders,[['1px','rgba(255, 255, 255, 0.07)'],['1px','rgba(255, 255, 255, 0.07)']]);
      assert.ok(layout.labels.every(x=>x===layout.labels[0]));assert.deepEqual(layout.labels,layout.values);
      await page.screenshot({path:`/tmp/collection-info-moves-${safari?'webkit':'chrome'}-${width}-${index}.png`});
      await block.locator('dt').first().tap();assert.equal(await modal.count(),0,'information taps preserve dismissal');
    }
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?'WebKit':'Chrome'} two-column information/moves, PP Ups 0–3, max-only PP, empty slots, assets/alignment/wrapping and matching dividers at 375/430px.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
