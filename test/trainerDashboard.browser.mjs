// Uses an available Playwright installation and isolated synthetic save data.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROME_EXECUTABLE?{executablePath:process.env.CHROME_EXECUTABLE}:{})});
const b1=new Uint8Array(15752), b2=new Uint8Array(3884),a=new DataView(b1.buffer),b=new DataView(b2.buffer);
b2.set([188,204,191,200,190,187,200,255]);
b.setUint16(0xa,65535,true);b.setUint16(0xc,54321,true);b.setUint16(0xe,9999,true);b2[0x10]=59;b2[0x11]=59;
b.setUint32(0xac,0xf1234567,true);a.setUint32(0x490,(999999^0xf1234567)>>>0,true);b.setUint16(0xeb8,65535,true);
const flag=id=>{b1[0x1270+(id>>>3)]|=1<<(id&7)};
flag(0x864);for(let i=0;i<8;i++)flag(0x867+i);
for(const id of [0x8c4,0x8c6,0x8c7,0x8cc,0x8cd])flag(id);
for(const [block,offset] of [[b2,0x28],[b2,0x5c],[b1,0x988],[b1,0x3b24]]) {block.fill(255,offset,offset+48);block[offset+48]=3;}
a.setUint32(0x234,1,true);b1.set(makePokemon({party:true}),0x238);
const selections=Array.from({length:6},(_,i)=>({nationalDexId:[3,6,9,143,130,25][i],shiny:i===1}));
try {
 const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:850}}),page=await context.newPage();page.setDefaultTimeout(10000);
 await page.goto(process.env.SHOWCASE_URL || 'http://localhost:5173');
 const load=async gender=>{b2[8]=gender;const encoded=Buffer.from(makeSave({blocks:{saveBlock1:b1,saveBlock2:b2}})).toString('base64');await page.evaluate(({encoded,selections})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.showcase.v1',JSON.stringify(selections))},{encoded,selections});await page.reload();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));};
 for(const gender of [0,1]){
  await load(gender);
  assert.equal(await page.locator('.trainer-fullbody').getAttribute('src'),`/trainers/${gender?'may':'brendan'}.png`);
  assert.equal(await page.locator('.trainer-artwork-heading h2').innerText(),'BRENDAN');
  assert.deepEqual(await page.locator('.trainer-fields dd').allTextContents(),['65535','54321','₽999,999','65,535','9999:59:59']);
  assert.equal(await page.locator('.dex-completion').innerText(),'386 / 386 caught');assert.equal(await page.locator('.dex-percentage').innerText(),'100.0%');
  assert.deepEqual(await page.locator('.dex-stats dd').allTextContents(),['386','1','1']);
  assert.equal(await page.locator('progress').getAttribute('value'),'386');
  assert.equal(await page.locator('.gym-card .section-heading > span').count(),0);
  assert.equal(await page.locator('.frontier-progress').count(),0);
  assert.equal(await page.locator('.frontier-unearned').count(),4);assert.equal(await page.locator('.trainer-champion').getAttribute('alt'),'Pokémon League Champion');assert.equal(await page.locator('.hof-card').count(),0);
  for(const width of [320,375,430,960]){
   await page.setViewportSize({width,height:width===320?568:850});
   const geometry=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();const art=rect('.trainer-artwork-card'),summary=rect('.trainer-summary-row'),card=rect('.trainer-card'),dex=rect('.dex-card'),gym=rect('.gym-card'),frontier=rect('.frontier-card');
    const rows=s=>{const values=[...document.querySelectorAll(s)].map(e=>e.getBoundingClientRect());return [...new Set(values.map(r=>r.top.toFixed(1)))].map(top=>values.filter(r=>r.top.toFixed(1)===top));};
    const badgeRows=rows('.badge-row img'),frontierRows=rows('.frontier-symbols img');
    const bottom=frontierRows[1];
    const image=rect('.trainer-fullbody'),artHeading=rect('.trainer-artwork-heading');
    const contained=image.top>=artHeading.bottom && image.bottom<art.bottom && image.left>=art.left && image.right<=art.right;
    const headings=[...document.querySelectorAll('.trainer-content h2')].map(e=>{const c=getComputedStyle(e);return {font:c.fontSize,weight:c.fontWeight,letter:c.letterSpacing,transform:c.textTransform,border:c.borderBottomWidth,padding:c.paddingBottom,margin:c.marginBottom,color:c.color};});
    const fits=[...document.querySelectorAll('.trainer-fields dd,.dex-completion,.dex-stats dd')].every(e=>e.scrollWidth<=e.clientWidth+1);
    return {overflow:document.documentElement.scrollWidth>innerWidth,topAligned:art.top===summary.top && art.bottom===summary.bottom,summaryStacked:card.bottom+1===dex.top && card.left===dex.left && card.right===dex.right,bottomAligned:gym.top===frontier.top && gym.bottom===frontier.bottom,ratio:art.width/(art.width+summary.width),badgeRows:badgeRows.map(r=>r.length),frontierRows:frontierRows.map(r=>r.length),centered:Math.abs((bottom[0].left+bottom[2].right)/2-(frontier.left+frontier.right)/2)<1,showcaseRows:rows('.trainer-team-slot').map(r=>r.length),contained,headings,height:rect('.trainer-fullbody').height,ribbon:rect('.trainer-champion').width,fits,zoom:visualViewport.scale};
   });
   assert.equal(geometry.overflow,false);assert.equal(geometry.topAligned,true);assert.equal(geometry.summaryStacked,true);assert.equal(geometry.bottomAligned,true);assert.ok(Math.abs(geometry.ratio-.5)<.01);assert.deepEqual(geometry.badgeRows,[4,4]);assert.deepEqual(geometry.frontierRows,[4,3]);assert.equal(geometry.centered,true);assert.deepEqual(geometry.showcaseRows,[6]);assert.equal(geometry.fits,true);assert.equal(geometry.zoom,1);assert.ok(geometry.height>150 && geometry.height<=274);assert.equal(geometry.ribbon,36);assert.equal(geometry.contained,true);for(const h of geometry.headings)assert.deepEqual(h,{font:'12.8px',weight:'650',letter:'normal',transform:'none',border:'1px',padding:'4px',margin:'8px',color:'rgb(57, 255, 156)'});
   await page.screenshot({path:`/private/tmp/trainer-stage37-${gender?'may':'brendan'}-${width}.png`,fullPage:true});
  }
 }
 // Smoke-check the existing collection, profile, and Settings routes.
 await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'My Pokémon',exact:true}).click();await page.locator('.pokemon-card').first().click();await page.locator('.pokemon-profile').waitFor();
 const profileStyle=await page.locator('.profile-card h2').first().evaluate(e=>{const c=getComputedStyle(e);return [c.fontSize,c.fontWeight,c.letterSpacing,c.textTransform,c.borderBottomWidth,c.paddingBottom,c.marginBottom]});assert.deepEqual(profileStyle,['12.8px','650','normal','none','1px','4px','8px']);
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByText('Your save file',{exact:true}).waitFor();await page.getByRole('button',{name:'Reset Showcase',exact:true}).waitFor();
 console.log('Dashboard checks passed: both artworks, stacked summaries, aligned 50/50 top and bottom cards, prominent artwork, all save-derived values, Champion, badge/symbol states, 4×2 badges, centered 4+3 symbols, six-sprite showcase row, 320/375/430/960px fit without zoom/overflow, collection/profile/Settings smoke checks.');
} finally {await browser.close();}
