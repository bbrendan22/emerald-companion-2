import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';

const server=await preview({preview:{host:'127.0.0.1',port:5235,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT==='1';
const browser=await (safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cases=[
    {species:101,pid:555,experience:27000,heldItemId:0,name:'Electrode',nickname:'SPARK',gender:null,nature:'Bold',ability:'Soundproof',item:'None',dex:'101',gen:1,level:30},
    {species:115,pid:777,experience:1000000,name:'Kangaskhan',nickname:'KANGASKHAN',gender:'female',nature:'Brave',ability:'Early Bird',item:'Potion',dex:'115',gen:1,level:100},
    {species:12,pid:0,experience:560,heldItemId:214,name:'Butterfree',nickname:'BUTTERFLY',gender:'female',nature:'Hardy',ability:'Compound Eyes',item:'TwistedSpoon',dex:'012',gen:1,shiny:true,level:8},
    {species:160,pid:255,experience:1059860,heldItemId:0,name:'Feraligatr',nickname:'FERALIGATR',gender:'male',nature:'Bold',ability:'Torrent',item:'None',dex:'160',gen:2,level:100},
    {species:400,pid:888,experience:1250000,heldItemId:0,name:'Metagross',nickname:'ABCDEFGHIJ',gender:null,nature:'Jolly',ability:'Clear Body',item:'None',dex:'376',gen:3,level:100},
    {species:29,pid:0,name:'Nidoran♀',nickname:'FLOWER',gender:'female',nature:'Hardy',ability:'Poison Point',item:'Potion',dex:'029',gen:1,shiny:true,level:10},
  ];
  const storage=new Uint8Array(33744);
  cases.forEach((data,i)=>{
    const record=makePokemon(data);record.fill(255,8,18);
    record.set([...data.nickname].map(c=>187+c.charCodeAt(0)-65),8);
    storage.set(record,4+i*80);
  });
  const url=new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href;
  await page.goto(url);await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
  const collection=async()=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();};
  await collection();
  const modal=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  const overview=modal.locator('.collection-overview');
  const cards=page.locator('.pokemon-card');
  const open=async data=>{await cards.filter({has:page.locator(`img[src$="/${data.shiny?'shiny':'normal'}/${Number(data.dex)}.png"]`)}).click();};
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});
    for(const data of cases) {
      await open(data);
      assert.equal(await overview.locator('.collection-overview-name').innerText(),data.name);
      assert.equal(await overview.locator('.collection-overview-level').innerText(),`Lv. ${data.level}`);
      assert.equal(await overview.locator('.collection-overview-metadata').innerText().then(s=>s.replace(/\s*★/,'')),`#${data.dex} · Gen ${data.gen}`);
      assert.equal(await overview.locator('.collection-overview-gender').count(),data.gender?1:0);
      if(data.gender)assert.equal(await overview.locator('.collection-overview-gender').getAttribute('aria-label'),data.gender);
      assert.equal(await overview.getByRole('img',{name:'Shiny',exact:true}).count(),data.shiny?1:0);
      assert.equal(await modal.locator('.collection-pokemon-info dt').allTextContents().then(x=>x.join(',')),'Nature,Ability,Held Item');
      assert.deepEqual(await modal.locator('.collection-pokemon-info dd').allTextContents(),[data.nature,data.ability,data.item]);
      assert.equal(await modal.locator('.collection-pokemon-held-item img').count(),data.item==='None'?0:1);
      const nickname=overview.locator('.collection-overview-nickname');
      if(data.nickname.toLowerCase()===data.name.toLowerCase())assert.equal(await nickname.count(),0);
      else assert.equal(await nickname.innerText(),`“${data.nickname}”`);
      assert.match(await overview.locator('.collection-overview-artwork').getAttribute('src'),new RegExp(`/artwork/${data.shiny?'shiny':'normal'}/${Number(data.dex)}\\.png$`));
      await overview.locator('img').evaluateAll(images=>Promise.all(images.map(e=>e.decode())));
      assert.equal(await overview.locator('img').evaluateAll(images=>images.every(e=>e.naturalWidth>0)),true);
      const geometry=await overview.evaluate(root=>{
        const name=root.querySelector('.collection-overview-name'),level=root.querySelector('.collection-overview-level-group');
        const n=name.getBoundingClientRect(),l=level.getBoundingClientRect();
        return {overflow:root.scrollWidth>root.clientWidth,centers:Math.abs(n.y+n.height/2-l.y-l.height/2),sameRow:Math.abs(n.y-l.y)<5,
          typography:[getComputedStyle(name).fontSize,getComputedStyle(name).fontWeight,getComputedStyle(root.querySelector('.collection-overview-level')).fontSize],
          clipped:[...root.querySelectorAll('.collection-overview-name, .collection-overview-nickname, dd')].some(e=>e.scrollWidth>e.clientWidth+1 && getComputedStyle(e).overflowX==='hidden'),
          glyphs:[...root.querySelectorAll('.collection-overview-gender svg')].every(e=>e.getBoundingClientRect().width<=12 && e.getBoundingClientRect().height<=12)};
      });
      assert.equal(geometry.overflow,false);assert.equal(geometry.clipped,false);
      assert.equal(geometry.glyphs,true,'shared gender glyph remains within its font-sized box');
      assert.deepEqual(geometry.typography,['16px','600','12px']);
      if(geometry.sameRow)assert.ok(geometry.centers<.1,'name and level share their center');
      assert.equal(await overview.locator('dt,dd').count(),0,'facts are below the overview divider');
      assert.equal(await overview.locator('h1,h2,header').count(),0);
      assert.equal(await overview.getByText('Overview',{exact:true}).count(),0);
      await page.screenshot({path:`/tmp/collection-overview-${safari?'webkit':'chrome'}-${width}-${data.dex}.png`});
      await overview.locator('.collection-overview-artwork').tap();assert.equal(await modal.count(),0);
    }
    await open(cases[0]);
    const role=modal.getByRole('button',{name:/^Pokémon role:/});await role.tap();
    assert.equal(await modal.count(),1);assert.equal(await modal.getByRole('group',{name:'Assign role',exact:true}).count(),1);
    await modal.getByRole('group',{name:'Assign role',exact:true}).getByRole('button',{name:'Frontier',exact:true}).tap();
    assert.equal(await role.getAttribute('aria-label'),'Pokémon role: Frontier');assert.equal(await modal.count(),1);
    await role.focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
    assert.equal(await modal.count(),1);assert.equal(await role.getAttribute('aria-expanded'),'false');
    await page.keyboard.press('Escape');assert.equal(await modal.count(),0);
    // Changing a role under an active filter must keep the selected details open.
    await page.locator('.collection-role-toggles').getByRole('button',{name:'Frontier',exact:true}).click();
    assert.equal(await cards.count(),1);await cards.first().click();await role.click();
    await modal.getByRole('group',{name:'Assign role',exact:true}).getByRole('button',{name:'Utility',exact:true}).click();
    assert.equal(await cards.count(),0);assert.equal(await modal.count(),1);
    assert.equal(await role.getAttribute('aria-label'),'Pokémon role: Utility');
    await page.keyboard.press('Escape');await page.locator('.collection-role-toggles').getByRole('button',{name:'Frontier',exact:true}).click();
    await page.reload();await collection();await open(cases[0]);assert.equal(await role.getAttribute('aria-label'),'Pokémon role: Utility');
    // Real compact viewport overflow, without adding any production filler.
    await page.setViewportSize({width,height:200});
    const surface=modal.locator('.collection-detail-surface');assert.ok(await surface.evaluate(e=>e.scrollHeight>e.clientHeight));
    await surface.evaluate(e=>e.scrollTop=60);await page.waitForTimeout(50);assert.equal(await modal.count(),1);
    assert.equal(await page.evaluate(()=>scrollY),0);
    await page.setViewportSize({width,height:844});await page.keyboard.press('Escape');
  }
  // Failed storage writes retain the previous assignment and leave a useful error.
  await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Full','QuotaExceededError');};});
  await open(cases[0]);await modal.getByRole('button',{name:/^Pokémon role:/}).click();
  await modal.getByRole('group',{name:'Assign role',exact:true}).getByRole('button',{name:'Frontier',exact:true}).click();
  assert.match(await modal.getByRole('alert').innerText(),/Role could not be saved/);
  assert.equal(await modal.getByRole('button',{name:/^Pokémon role:/}).getAttribute('aria-label'),'Pokémon role: Utility');
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?'WebKit':'Chrome'} overview data, assets, typography/wrapping/alignment, persistent roles, filter changes, storage failure and dismissal at 375/430px.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
