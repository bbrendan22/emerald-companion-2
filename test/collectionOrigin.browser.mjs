import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {readPokemon} from '../src/save/readPokemon.js';
import reference from '../src/data/reference.json' with {type:'json'};
import {expForLevel} from '../src/save/stats.js';

const server=await preview({preview:{host:'127.0.0.1',port:5239,strictPort:true}});
const safari=process.env.PROFILE_WEBKIT==='1';
const browser=await (safari?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
try {
  const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const cases=[
    {game:3,location:12,level:33,ball:4,ot:'ALICE',tid:12345,expected:['ALICE','12345','Emerald','Poké Ball','Lilycove City','33']},
    {game:2,location:58,level:50,ball:2,ot:'BOB',tid:7,expected:['BOB','00007','Ruby','Ultra Ball','Battle Tower','50']},
    {game:1,location:0,level:5,ball:5,ot:'SALLY',tid:0,expected:['SALLY','00000','Sapphire','Safari Ball','Littleroot Town','5']},
    {game:4,location:129,level:16,ball:11,ot:'RED',tid:65535,expected:['RED','65535','FireRed','Luxury Ball','Underground Path','16']},
    {game:5,location:196,level:25,ball:12,ot:'LEAF',tid:42,expected:['LEAF','00042','LeafGreen','Premier Ball','Celadon Dept.','25']},
    {game:3,location:209,level:40,ball:3,ot:'ALICE',tid:10,expected:['ALICE','00010','Emerald','Great Ball','Desert Underpass','40']},
    {game:15,location:12,level:50,ball:1,ot:'WES',tid:12,expected:['WES','00012','Colosseum / XD','Master Ball','Distant Land','50']},
    {game:15,dex:200,location:15,level:30,ball:3,ribbonRaw:0x1000000,ot:'WES',tid:24,expected:['WES','00024','Colosseum','Great Ball','Pyrite Town','30']},
    {game:15,dex:216,location:143,level:11,ball:4,ribbonRaw:0x81000000,ot:'MICHAEL',tid:25,expected:['MICHAEL','00025','XD','Poké Ball','Pokémon HQ Lab','11']},
    {game:15,dex:20,location:76,level:34,ball:2,ribbonRaw:0x81000000,ot:'MICHAEL',tid:26,expected:['MICHAEL','00026','XD','Ultra Ball','Citadark Isle','34']},
    {game:15,dex:196,location:254,level:25,ball:4,ribbonRaw:0,ot:'WES',tid:28,expected:['WES','00028','Colosseum','Poké Ball','In-game trade','25']},
    {game:15,dex:196,location:0,level:10,ball:4,ribbonRaw:0x80000000,ot:'MICHAEL',tid:29,expected:['MICHAEL','00029','XD','Poké Ball','Distant Land','10']},
    {game:15,dex:299,location:59,level:26,ball:2,ribbonRaw:0x81000000,ot:'MICHAEL',tid:30,expected:['MICHAEL','00030','XD','Ultra Ball','Realgam Tower','26']},
    {game:15,location:255,level:0,ball:1,ot:'EVENT',tid:27,expected:['EVENT','00027','Colosseum / XD','Master Ball','Distant Land','—']},
    {game:3,location:254,level:5,ball:4,ot:'NPC',tid:19,expected:['NPC','00019','Emerald','Poké Ball','In-game trade','5']},
    {game:5,location:255,level:0,ball:1,ot:'EVENT',tid:20,expected:['EVENT','00020','LeafGreen','Master Ball','Fateful encounter','—']},
    {game:3,location:253,level:0,ball:4,ot:'EGG',tid:21,egg:true,expected:['EGG','00021','Emerald','Poké Ball','Special egg','—']},
    {game:0,location:250,level:127,ball:15,ot:'UNKNOWN',tid:22,expected:['UNKNOWN','00022','—','—','—','—']},
    {game:3,location:5,level:0,ball:4,ot:'HATCHED',tid:23,expected:['HATCHED','00023','Emerald','Poké Ball','Verdanturf Town','5']},
  ];
  const storage=new Uint8Array(33744);
  cases.forEach((data,i)=>{
    const [internalId,species]=Object.entries(reference.species).find(([,p])=>p.nationalDexId===(data.dex??1));
    const record=makePokemon({species:Number(internalId),experience:expForLevel(70,species.growthRate),ribbonRaw:data.ribbonRaw,pid:100+i,otId:(0xabcd0000|data.tid)>>>0,origins:data.level|(data.game<<7)|(data.ball<<11),metLocationId:data.location,egg:data.egg});
    record.fill(255,20,27);record.set([...data.ot].map(c=>187+c.charCodeAt(0)-65),20);storage.set(record,4+i*80);
    const decoded=readPokemon(record);assert.equal(decoded.ot.trainerId,data.tid);assert.equal(decoded.ot.name,data.ot);
    assert.deepEqual(decoded.origin,{gameId:data.game,metLevel:data.level,metLocationId:data.location,ballId:data.ball});
  });
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage}})).toString('base64'));await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Collection',exact:true}).click();
  const sortedCases=[...cases].sort((a,b)=>(a.dex??1)-(b.dex??1));
  const modal=page.getByRole('dialog',{name:'Pokémon details',exact:true});
  for(const width of [375,430]) {
    await page.setViewportSize({width,height:844});
    for(const [i,data] of cases.entries()) {
      await page.locator('.pokemon-card').nth(sortedCases.indexOf(data)).click();const origin=modal.getByRole('region',{name:'Origin',exact:true});
      assert.equal(await origin.getByRole('heading').count(),0);
      assert.deepEqual(await origin.locator('dt').allTextContents(),['OT','TID','Origin Game','Poké Ball','Met Location','Met Level']);
      assert.deepEqual(await origin.locator('dd').allTextContents(),data.expected);
      if(data.ball<=12) {
        const icon=origin.locator('img');assert.equal(await icon.count(),1);assert.match(await icon.getAttribute('src'),new RegExp(`/items/${data.ball}\\.png$`));await icon.evaluate(e=>e.decode());
      } else assert.equal(await origin.locator('img').count(),0);
      const geometry=await origin.evaluate(root=>{
        const fields=[...root.querySelectorAll('dl > div')].map(e=>e.getBoundingClientRect()),box=root.getBoundingClientRect(),previous=root.previousElementSibling.getBoundingClientRect();
        const ball=root.querySelector('.collection-origin-ball'),name=ball.querySelector('span').getBoundingClientRect(),icon=ball.querySelector('img')?.getBoundingClientRect();
        return {rows:[0,2,4].map(i=>Math.abs(fields[i].top-fields[i+1].top)),columns:fields[0].right<fields[1].left,below:Math.abs(box.top-previous.bottom),
          text:[...root.querySelectorAll('dt,dd')].every(e=>getComputedStyle(e).textAlign==='left'||getComputedStyle(e).textAlign==='start'),
          icon:icon?{right:icon.left>name.right,center:Math.abs(icon.y+icon.height/2-name.y-name.height/2)}:null,
          overflow:[root,...root.querySelectorAll('*')].some(e=>e.scrollWidth>e.clientWidth+1)};
      });
      assert.ok(geometry.rows.every(n=>n<.1));assert.equal(geometry.columns,true);assert.ok(geometry.below<.1);assert.equal(geometry.text,true);assert.equal(geometry.overflow,false);
      if(geometry.icon){assert.equal(geometry.icon.right,true);assert.ok(geometry.icon.center<.1);}
      await origin.scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/collection-origin-${safari?'webkit':'chrome'}-${width}-${i}.png`});
      await page.waitForTimeout(200);await origin.locator('dt').first().tap();assert.equal(await modal.count(),0);
    }
  }
  assert.deepEqual(errors,[]);console.log(`PASS: ${safari?'WebKit':'Chrome'} Origin saved OT/TID, all origin games, locations, ball assets, special/missing metadata and two-column layout at 375/430px.`);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
