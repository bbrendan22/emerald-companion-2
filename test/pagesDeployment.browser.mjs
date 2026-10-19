// Production-only deployment smoke test. Uses synthetic data in an isolated browser.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.PAGES_URL||'http://127.0.0.1:5192/emerald-companion-2/';
const base=new URL(url).pathname;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page=await browser.newPage({viewport:{width:375,height:850}}),errors=[],badResponses=[],requests=[],failedRequests=[],consoleErrors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`);});
  page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await page.goto(url);
  const images=async()=>{
    await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>{x.loading='eager';return x.decode();})));
    assert.ok(await page.locator('img').evaluateAll((xs,base)=>xs.every(x=>x.naturalWidth>0&&x.getAttribute('src').startsWith(base)),base));
  };
  const navigate=async name=>{await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();};
  const back=async()=>page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await images();
  await navigate('Home');
  for(const name of ['Pokédex','Moves','Abilities']){
    await page.getByRole('link',{name,exact:true}).click();await images();
    if(name==='Pokédex'){
      await page.locator('.resources-species-entry').first().click();
      for(const tab of ['Overview','Stats & Matchups','Locations','Learnset','More']) {await page.getByRole('tab',{name:tab,exact:true}).click();await images();}
      await page.getByRole('button',{name:'Back to National Pokédex',exact:true}).click();
    } else {await page.locator('.resources-move-toggle').first().click();await images();}
    if(name==='Moves'||name==='Abilities') await page.getByRole('dialog').locator('.resources-move-heading').click();
    await back();
  }
  for(const name of ['Useful Items','Berries']){
    await page.locator('.resources-section:has(#resources-items-heading)').getByRole('link',{name,exact:true}).click();await images();await back();
  }
  for(const name of ['IV Calculator','Hidden Power Calculator','Stat Calculator','Move Coverage','Nature Chart','Type Chart','Emerald Pickup Table','Move Tutors']){
    await page.getByRole('link',{name,exact:true}).click();await images();
    if(name==='Hidden Power Calculator'){await page.getByRole('combobox').selectOption('dark');await images();}
    if(name==='Move Coverage'){await page.getByRole('button',{name:'Fire',exact:true}).click();await images();}
    if(name==='Emerald Pickup Table'){await page.getByRole('combobox').selectOption('9');await images();}
    if(name==='Move Tutors')for(const tab of ['Battle Frontier','FRLG'])await page.getByRole('tab',{name:tab,exact:true}).click();
    await back();
  }
  // Import through the real file input and confirm persistence after reload.
  const b1=new Uint8Array(15752),storage=new Uint8Array(33744);
  new DataView(b1.buffer).setUint32(0x234,1,true);b1.set(makePokemon({party:true}),0x238);
  storage.set(makePokemon({species:1}),4);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.locator('#save-file').setInputFiles({name:'synthetic.sav',mimeType:'application/octet-stream',buffer:Buffer.from(makeSave({blocks:{saveBlock1:b1,storage}}))});
  await page.getByText('Save imported. Open Home to view your progress.',{exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')));
  await page.reload();await images();
  await navigate('Collection');await images();
  await page.locator('.pokemon-card').first().click();await images();
  await page.locator('.profile-roles').getByRole('button',{name:'Frontier',exact:true}).click();
  await page.getByRole('button',{name:'Back to collection',exact:true}).click();
  await page.getByRole('button',{name:'Box',exact:true}).click();await images();
  await navigate('Home');await images();
  await navigate('Battle');await images();
  await page.getByRole('tab',{name:'Trainers',exact:true}).click();await images();
  await page.getByRole('tab',{name:'Sets',exact:true}).click();await images();
  await page.getByRole('searchbox',{name:'Search Pokémon sets',exact:true}).fill('Sunkern');
  await page.getByRole('button',{name:'Select Sunkern 1',exact:true}).click();await images();
  await page.locator('.battle-matchup-moves.battle-matchup-player button').first().click();
  const damage=page.getByRole('dialog').locator('.battle-basic-damage p');
  await damage.waitFor();assert.match(await damage.innerText(),/\d.*%.*HP/);
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);
  assert.deepEqual(failedRequests,[]);assert.deepEqual(consoleErrors,[]);
  assert.ok(requests.every(request=>request.method==='GET'&&new URL(request.url).origin===new URL(url).origin&&new URL(request.url).pathname.startsWith(base)),'No root-path requests or save-data uploads');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

  // Every copied public asset must match its production response byte-for-byte;
  // this also rejects an HTML SPA fallback masquerading as an image response.
  async function files(dir,prefix=''){
    const result=[];
    for(const entry of await readdir(dir,{withFileTypes:true})){
      if(entry.name.startsWith('.'))continue;
      const path=prefix+entry.name;
      if(entry.isDirectory())result.push(...await files(new URL(entry.name+'/',dir),path+'/'));
      else result.push(path);
    }
    return result;
  }
  const assets=await files(new URL('../public/',import.meta.url));
  let next=0;
  await Promise.all(Array.from({length:12},async()=>{
    while(next<assets.length){
      const path=assets[next++],response=await page.request.get(new URL(path.split('/').map(encodeURIComponent).join('/'),url).href);
      assert.equal(response.status(),200,path);
      const actual=await response.body(),expected=await readFile(new URL('../public/'+path,import.meta.url));
      assert.equal(createHash('sha256').update(actual).digest('hex'),createHash('sha256').update(expected).digest('hex'),path);
      await response.dispose();
    }
  }));
  const manifest=await (await page.request.get(new URL('manifest.webmanifest',url).href)).json();
  assert.equal(new URL(manifest.start_url,url).pathname,base);
  console.log(`Pages production smoke passed under ${base}: all Resources links, profiles/tabs, save import/reload, Home/Collection/Battle images; all ${assets.length} public assets match; no HTTP errors or save uploads.`);
} finally {await browser.close();}
