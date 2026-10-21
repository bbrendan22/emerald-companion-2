import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave, makePokemon} from './fixtures/synthetic.js';

const server=await preview({preview:{host:'127.0.0.1',port:5238,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT==='1';
const browser=await (safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Explicit independent expectations: Hasty Bulbasaur at Lv. 50, Adamant
  // Pikachu at Lv. 40, neutral Electrode at Lv. 100, and Shedinja's 1 HP rule.
  const ivWord=31 | (30<<5) | (25<<10) | (31<<15) | (20<<20) | (19<<25);
  const storage=new Uint8Array(33744),b1=new Uint8Array(15752);
  storage.set(makePokemon({species:1,pid:11,experience:117360,ivWord,evs:[0,252,0,252,0,4],friendship:255,pokerus:0}),4);
  storage.set(makePokemon({species:101,pid:6,experience:1000000,evs:[255,251,4,0,0,0],pokerus:32}),84);
  storage.set(makePokemon({species:303,pid:0,experience:600000,ivWord:0}),164);
  storage.set(makePokemon({species:4,pid:1,egg:true}),244);
  for(const [i,options] of [
    {species:285,pid:0,experience:117360,ivWord:0},
    {species:285,pid:3,experience:1059860,evs:[252,252,0,0,0,4]},
  ].entries()) {
    const record=makePokemon(options);record.fill(255,8,18);
    record.set([...(i===0?'LOW':'HIGH')].map(c=>187+c.charCodeAt(0)-65),8);
    storage.set(record,324+i*80);
  }
  new DataView(b1.buffer).setUint32(0x234,1,true);
  b1.set(makePokemon({species:25,pid:3,party:true,recordedLevel:40,experience:64000,friendship:0}),0x238);
  const cases=[
    {name:'Bulbasaur',friendship:255,status:'Never infected',values:[120,100,59,80,80,106],ivs:[31,30,25,20,19,31],evs:[0,252,0,0,4,252],total:[156,508]},
    {name:'Pikachu',friendship:0,values:[90,67,41,51,49,89],ivs:[31,31,31,31,31,31],evs:[0,0,0,0,0,0],total:[186,0]},
    {name:'Electrode',status:'Cured',values:[324,198,177,196,196,316],ivs:[31,31,31,31,31,31],evs:[255,251,4,0,0,0],total:[186,510]},
    {name:'Shedinja',values:[1,185,95,65,65,85],ivs:[0,0,0,0,0,0],evs:[0,0,0,0,0,0],total:[0,0]},
    {name:'Charmander',values:['—','—','—','—','—','—'],ivs:[31,31,31,31,31,31],evs:[0,0,0,0,0,0],total:[186,0],egg:true},
    {name:'Swampert',nickname:'LOW',values:[160,115,95,90,95,65],ivs:[0,0,0,0,0,0],evs:[0,0,0,0,0,0],total:[0,0]},
    {name:'Swampert',nickname:'HIGH',values:[404,350,216,185,217,156],ivs:[31,31,31,31,31,31],evs:[252,252,0,0,4,0],total:[186,508]},
  ];
  const labels=['HP','Atk','Def','SpA','SpD','Spe'];
  const colors=['rgb(237, 132, 147)','rgb(237, 170, 112)','rgb(222, 203, 117)','rgb(120, 169, 232)','rgb(139, 200, 166)','rgb(186, 152, 227)'];
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage,saveBlock1:b1}})).toString('base64'));await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});
    let swampertBars;
    for(const data of cases) {
      await page.getByRole('button',{name:new RegExp(`^${data.name},${data.nickname?' '+data.nickname+',':''}`)}).click();
      const section=modal.locator('.collection-training-stats'),table=section.getByRole('table',{name:'IVs and EVs',exact:true});
      assert.equal(await table.getByRole('row').count(),8,'one accessible combined table');
      assert.equal(await section.getByRole('heading',{name:'Stats',exact:true}).count(),1);
      assert.deepEqual(await section.locator('.collection-battle-stat-value').allTextContents(),data.values.map(String));
      assert.deepEqual(await section.locator('.collection-battle-stat > span:first-child').allTextContents(),labels);
      const rows=table.locator('tbody tr');
      for(let i=0;i<6;i++) {
        assert.equal(await rows.nth(i).getByRole('rowheader').innerText(),labels[i]);
        assert.deepEqual(await rows.nth(i).locator('td').allTextContents(),[data.ivs[i],data.evs[i]].map(String));
        const cellStyles=await rows.nth(i).locator('td').evaluateAll(nodes=>nodes.map(e=>{const s=getComputedStyle(e);return {color:s.color,align:s.textAlign,numeric:s.fontVariantNumeric,size:s.fontSize};}));
        for(let column=0;column<2;column++) {
          const highlighted=column===0?data.ivs[i]===31:data.evs[i]>=252;
          assert.equal(cellStyles[column].color,highlighted?'rgb(105, 217, 154)':'rgb(227, 230, 235)');
          assert.equal(cellStyles[column].align,'left');assert.equal(cellStyles[column].numeric,'tabular-nums');assert.equal(cellStyles[column].size,'12px');
        }
      }
      assert.deepEqual(await table.locator('tfoot td').allTextContents(),data.total.map(String));
      assert.deepEqual(await table.locator('tfoot td').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).color)),['rgb(227, 230, 235)','rgb(227, 230, 235)']);
      assert.equal(await table.locator('tfoot tr').evaluate(e=>getComputedStyle(e).borderTopWidth),'1px');
      const widthAdjustment=await table.evaluate(root=>{
        const section=root.closest('.collection-training-stats');
        if (!section.querySelector('.collection-battle-stat-track')) return null;
        const baseline=section.cloneNode(true);
        baseline.querySelectorAll('th,td').forEach(e=>e.style.paddingInlineEnd='0px');
        section.after(baseline);
        const measure=node=>({table:node.querySelector('table').getBoundingClientRect().width,bar:node.querySelector('.collection-battle-stat-track').getBoundingClientRect().width,columns:[...node.querySelector('tr').children].map(e=>e.getBoundingClientRect().width)});
        const current=measure(section),previous=measure(baseline);baseline.remove();
        return {table:current.table-previous.table,bar:previous.bar-current.bar,columns:current.columns.map((n,i)=>n-previous.columns[i])};
      });
      if (widthAdjustment) {
      assert.ok(Math.abs(widthAdjustment.table-20)<.2,'table gains 20px');
      assert.ok(Math.abs(widthAdjustment.bar-20)<.2,`stat tracks give up the same 20px: ${JSON.stringify(widthAdjustment)}`);
      assert.ok(widthAdjustment.columns.every(n=>Math.abs(n-20/3)<.1),'extra width is shared equally by all three columns');
      }
      const columns=await table.evaluate(root=>[...root.querySelectorAll('tr')].map(row=>[...row.children].map(cell=>{
        const r=cell.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(cell);const text=range.getBoundingClientRect();
        return {width:r.width,left:r.left,right:r.right,center:r.x+r.width/2,textLeft:text.left,textRight:text.right,textCenter:text.x+text.width/2,align:getComputedStyle(cell).textAlign};
      })));
      for(const row of columns) {
        assert.ok(Math.max(...row.map(c=>c.width))-Math.min(...row.map(c=>c.width))<.1,'three equal-width columns');
        assert.ok(Math.abs((row[1].center-row[0].center)-(row[2].center-row[1].center))<.1,'equally spaced column centers');
        row.forEach((cell,i)=>{
          assert.equal(cell.align,'left');
          assert.ok(Math.abs(cell.left-cell.textLeft)<.1,'all table text is left-aligned');
          assert.ok(Math.abs(cell.left-columns[0][i].left)<.1,'every row shares the heading starts');
        });
      }
      const power=section.getByRole('group',{name:'Hidden Power',exact:true});
      const expectedPower=data.name==='Bulbasaur'?{type:'grass',name:'Grass',power:57}:data.ivs.every(n=>n===0)?{type:'fighting',name:'Fighting',power:30}:{type:'dark',name:'Dark',power:70};
      assert.equal(await power.locator('span').innerText(),expectedPower.name);
      assert.equal(await power.locator('small').innerText(),`· ${expectedPower.power} power`);
      assert.match(await power.locator('img').getAttribute('src'),new RegExp(`/types/icons/${expectedPower.type}\\.png$`));
      await power.locator('img').evaluate(e=>e.decode());
      const powerGeometry=await power.evaluate(root=>{
        const icon=root.querySelector('img').getBoundingClientRect(),type=root.querySelector('span').getBoundingClientRect(),value=root.querySelector('small').getBoundingClientRect();
        const section=root.closest('.collection-training-stats'),total=section.querySelector('tfoot td').getBoundingClientRect(),last=section.querySelectorAll('.collection-battle-stat')[5].getBoundingClientRect();
        return {icon:[icon.width,icon.height],typeSize:getComputedStyle(root.querySelector('span')).fontSize,powerSize:getComputedStyle(root.querySelector('small')).fontSize,
          typeCenter:Math.abs(type.y+type.height/2-icon.y-icon.height/2),powerCenter:Math.abs(value.y+value.height/2-icon.y-icon.height/2),totalCenter:Math.abs(total.y+total.height/2-icon.y-icon.height/2),below:icon.top>=last.bottom};
      });
      assert.deepEqual(powerGeometry.icon,[21,21]);assert.equal(powerGeometry.typeSize,'12px');assert.equal(powerGeometry.powerSize,'10px');
      assert.ok(powerGeometry.typeCenter<.1);assert.ok(powerGeometry.powerCenter<.1);assert.ok(powerGeometry.totalCenter<3);assert.equal(powerGeometry.below,true);
      assert.equal(await section.locator('.collection-battle-stat-track').count(),data.egg?0:6);
      if(!data.egg)assert.deepEqual(await section.locator('.collection-battle-stat-track span').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).backgroundColor)),colors);
      if(data.name==='Swampert') {
        const fills=await section.locator('.collection-battle-stat-track span').evaluateAll(nodes=>nodes.map(e=>({percent:parseFloat(e.style.width),track:e.parentElement.getBoundingClientRect().width,fill:e.getBoundingClientRect().width})));
        const expected=[42.0275590551,69.3548387097,40.8888888889,54.4791666667,36.6666666667,34.8571428571];
        fills.forEach((bar,i)=>{assert.ok(Math.abs(bar.percent-expected[i])<.0001);assert.ok(Math.abs(bar.fill-bar.track*bar.percent/100)<.1);});
        if(swampertBars)assert.deepEqual(fills,swampertBars,'same species has identical fills and track lengths');else swampertBars=fills;
      }
      const geometry=await section.evaluate(root=>{
        const left=[...root.querySelectorAll('.collection-battle-stat')].map(e=>e.getBoundingClientRect());
        const right=[...root.querySelectorAll('tbody tr')].map(e=>e.getBoundingClientRect());
        const l=root.querySelector('.collection-battle-stats').getBoundingClientRect(),r=root.querySelector('table').getBoundingClientRect();
        const tracks=getComputedStyle(root).gridTemplateColumns.split(' ').map(parseFloat);
        const divider=root.querySelector('.collection-stat-divider').getBoundingClientRect();
        const barGaps=[...root.querySelectorAll('.collection-battle-stat-track')].map((bar,i)=>{
          const track=bar.getBoundingClientRect(),value=bar.previousElementSibling.getBoundingClientRect(),label=root.querySelectorAll('tbody th')[i].getBoundingClientRect();
          return {before:track.left-value.right,after:label.left-track.right,width:track.width};
        });
        return {centers:left.map((v,i)=>Math.abs(v.y+v.height/2-right[i].y-right[i].height/2)),noOverlap:l.right<r.left,ratio:l.width/(tracks[0]+tracks[2]),rightEdge:Math.abs(r.right-root.getBoundingClientRect().right),
          divider:{left:divider.left-l.right,right:r.left-divider.right,top:Math.abs(divider.top-l.top),bottom:Math.abs(divider.bottom-r.bottom),width:divider.width},fullStatsTrack:Math.abs(l.width-tracks[0]),compactTable:r.width<root.getBoundingClientRect().width*.4,barGaps,columnGap:getComputedStyle(root.querySelector('table')).columnGap,
          headings:Math.abs(root.querySelector('h2').getBoundingClientRect().y-root.querySelector('thead tr').getBoundingClientRect().y),
          overflow:[root,...root.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1)};
      });
      assert.ok(geometry.centers.every(n=>n<.1),`shared row centers: ${geometry.centers}`);assert.equal(geometry.noOverlap,true);assert.equal(geometry.overflow,false);
      assert.ok(geometry.ratio>=.58,'Stats uses all space beside the compact table');assert.ok(geometry.rightEdge<.1,'IV/EV table stays at the right edge');
      assert.ok(geometry.fullStatsTrack<.1);assert.equal(geometry.compactTable,true);assert.equal(geometry.columnGap,'3px');
      assert.ok(Math.abs(geometry.divider.left-6)<.1);assert.ok(Math.abs(geometry.divider.right-6)<.1);assert.equal(geometry.divider.width,1);
      assert.ok(geometry.divider.top<.1);assert.ok(geometry.divider.bottom<.1,'divider includes the Hidden Power/Total area');
      const condition=modal.locator('.collection-pokemon-condition');
      assert.deepEqual(await condition.locator('dt').allTextContents(),['Friendship','Pokérus']);
      assert.deepEqual(await condition.locator('dd').allTextContents(),[data.egg?'—':String(data.friendship??70),data.status??'Active']);
      const conditionLayout=await condition.evaluate(root=>{
        const a=root.children[0].getBoundingClientRect(),b=root.children[1].getBoundingClientRect(),origin=root.previousElementSibling.getBoundingClientRect(),bounds=root.getBoundingClientRect();
        return {sameTop:Math.abs(a.top-b.top),sameWidth:Math.abs(a.width-b.width),below:Math.abs(origin.bottom-bounds.top),
          border:getComputedStyle(root).borderBottomColor,originBorder:getComputedStyle(root.previousElementSibling).borderBottomColor,previous:root.previousElementSibling.className,next:root.nextElementSibling.className,
          labels:[...root.querySelectorAll('dt')].map(e=>getComputedStyle(e).fontSize),values:[...root.querySelectorAll('dd')].map(e=>getComputedStyle(e).fontSize),
          overflow:[root,...root.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1)};
      });
      assert.ok(conditionLayout.sameTop<.1);assert.ok(conditionLayout.sameWidth<.1);assert.ok(conditionLayout.below<.1);assert.equal(conditionLayout.border,conditionLayout.originBorder);
      assert.equal(conditionLayout.previous,'collection-pokemon-origin');assert.equal(conditionLayout.next,'collection-pokemon-ribbons');
      assert.deepEqual(conditionLayout.labels,['10px','10px']);assert.deepEqual(conditionLayout.values,['12px','12px']);assert.equal(conditionLayout.overflow,false);
      geometry.barGaps.forEach(gap=>{assert.ok(Math.abs(gap.before-6)<.1);assert.ok(Math.abs(gap.after-(gap.before*2+1))<.1,'divider and balanced gaps separate tracks from labels');assert.ok(Math.abs(gap.width-geometry.barGaps[0].width)<.1,'equal track widths');});
      assert.doesNotMatch(await section.innerText(),/Current HP|remaining|Calculated from|Saved party/i);
      await page.screenshot({path:`/tmp/collection-stats-${safari?'webkit':'chrome'}-${width}-${data.name}${data.nickname?'-'+data.nickname:''}.png`});
      await section.getByRole('heading',{name:'Stats',exact:true}).tap();assert.equal(await modal.count(),0);
    }
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?'WebKit':'Chrome'} calculated Gen 3 stats, party recalculation, Shedinja/egg handling, saved IV/EV totals and thresholds, colored bars and shared row alignment at 375/430px.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
