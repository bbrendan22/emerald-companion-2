import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const server=await preview({preview:{host:'127.0.0.1',port:5228,strictPort:true}});
const browser=await (process.env.TYPOGRAPHY_WEBKIT ? webkit.launch({headless:true}) : chromium.launch({headless:true,channel:'chrome'}));
try {
 const page=await browser.newPage({viewport:{width:375,height:844},hasTouch:true,isMobile:true});
 page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
 const storage=new Uint8Array(33744),b1=new Uint8Array(15752);
 for(let i=0;i<100;i++)storage.set(makePokemon({species:i===0?115:12,pid:i}),4+i*80);
 new DataView(b1.buffer).setUint32(0x234,1,true);b1.set(makePokemon({party:true}),0x238);
 await page.evaluate(save=>localStorage.setItem('emerald-companion-2.save.v1',save),Buffer.from(makeSave({blocks:{storage,saveBlock1:b1}})).toString('base64'));await page.reload();
 const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).evaluate(e=>e.click());await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name,exact:true}).click();};
 const size=async(selector,expected)=>assert.equal(await page.locator(selector).first().evaluate(e=>getComputedStyle(e).fontSize),expected,selector);
 async function shot(name,width){console.log(`Check ${name} ${width}`);
 const unexpected=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());}).flatMap(e=>{
  const style=getComputedStyle(e),result=[];
  const exception=e.closest('.resources-clear,.collection-search-clear,.home-search-clear,.home-directory-heading button,.battle-set-hide,.pokemon-card .shiny-star,.battle-set-identity,.battle-set-item,.battle-set-stats,.battle-set-moves,.type-chart table,.frontier-set-facts');
  if(!exception&&!['10px','12px','13px','16px'].includes(style.fontSize))result.push(`${e.className}: ${style.fontSize}`);
  if(!['400','600'].includes(style.fontWeight))result.push(`${e.className}: weight ${style.fontWeight}`);
  return result;
 }));assert.deepEqual(unexpected,[],`${name}: unclassified typography`);
await page.locator('img').evaluateAll(nodes=>Promise.all(nodes.filter(n=>{const r=n.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).map(n=>{n.loading='eager';return n.decode().catch(()=>{});})));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} ${width} overflow`);await page.screenshot({path:`/tmp/typography-${name}-${width}.png`});}
 for(const width of [375,430]) {
  await page.setViewportSize({width,height:844});await navigate('Home');
  await size('.home-trainer-title','13px');await size('.trainer-name','16px');await size('.trainer-fields dt','10px');await size('.trainer-fields dd','12px');await size('.home-resources a','12px');
  const home=await page.locator('.home-layout').evaluate(e=>{const left=e.querySelector('.home-trainer').getBoundingClientRect(),right=e.querySelector('.home-resources').getBoundingClientRect();return {ratio:left.width/(left.width+right.width),overlap:left.right>right.left,height:left.height};});
  assert.ok(Math.abs(home.ratio-2/3)<.01);assert.equal(home.overlap,false);assert.ok(home.height<700,'Home remains compact');
  assert.equal(await page.locator('.trainer-sprite').evaluate(e=>e.getBoundingClientRect().width),72);
  const homeSnapshot=await page.locator('.home-layout').evaluate(root=>[root,...root.querySelectorAll('*')].map(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {tag:node.tagName,cls:node.className,rect:[r.x,r.y,r.width,r.height],font:s.fontSize,weight:s.fontWeight,line:s.lineHeight,spacing:s.letterSpacing,color:s.color};}));
  const baselinePath=`/tmp/emerald-home-typography-baseline-${width}.json`;
  if(process.env.TYPOGRAPHY_CAPTURE_BASELINE)await writeFile(baselinePath,JSON.stringify(homeSnapshot));
  if(process.env.TYPOGRAPHY_COMPARE_BASELINE)assert.deepEqual(homeSnapshot,JSON.parse(await readFile(baselinePath,'utf8')),`Home ${width}: preserve exact typography and geometry`);
  await shot('home',width);
  const search=page.getByRole('searchbox',{name:'Search Resources',exact:true});await search.fill('thunder');
  await size('.home-search-results button','12px');await size('.home-search','16px');
  assert.equal(await search.evaluate(e=>getComputedStyle(e).transform),'matrix(0.75, 0, 0, 0.75, 0, 0)');
  assert.equal(await page.locator('.home-layout').evaluate(e=>e.querySelector('.home-trainer').getBoundingClientRect().height),home.height);
  await shot('home-search',width);await search.fill('');
  if(process.env.TYPOGRAPHY_HOME_ONLY)continue;
  await navigate('Collection');await size('.pokemon-name','12px');
  assert.equal(await page.locator('.pokemon-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),4);
  await shot('collection',width);await page.locator('.pokemon-card').first().click();await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  await navigate('Battle');await size('.battle-page-title','13px');await shot('battle',width);
  for(const tab of ['Trainers','Sets','Teams','Rules']) {
   const button=page.getByRole('tab',{name:tab,exact:true});
   if(await button.count()){await button.click();await shot('battle-'+tab.toLowerCase(),width);}
  }
  await page.getByRole('button',{name:'Settings',exact:true}).click();await size('.import-panel h2','13px');assert.equal(await page.locator('.import-panel h2').evaluate(e=>getComputedStyle(e).lineHeight),'15.6px');await size('.import-panel p','12px');await shot('settings',width);
  await navigate('Home');
  await page.getByRole('link',{name:'Moves',exact:true}).click();
  const moves=page.getByRole('region',{name:'Moves directory',exact:true});await size('.home-search-results button','12px');
  await moves.getByRole('button',{name:'ThunderPunch',exact:true}).click();await size('.resources-move-heading strong','13px');
  await shot('resource-popup',width);await page.keyboard.press('Escape');await page.getByRole('button',{name:'Close directory',exact:true}).click();
  await page.getByRole('link',{name:'Pokémon Sets',exact:true}).click();await size('.frontier-set-move','12px');await shot('resource-sets',width);
  await page.locator('.frontier-set-toggle').first().click();await shot('resource-set-popup',width);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await page.getByRole('link',{name:'Nature Chart',exact:true}).click();await shot('nature-chart',width);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await page.getByRole('link',{name:'Type Chart',exact:true}).click();await shot('type-chart',width);
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();

 }
 assert.deepEqual(errors,[]);console.log('PASS: Home typography, compact Home layout, fixed artwork, Safari zoom workaround, Collection, Battle tabs, Settings, resource directories/popups and charts at 375/430px.');
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
