// Actual production A -> B service-worker installation, activation and offline reload.
import assert from 'node:assert/strict';
import {mkdtemp, readFile, stat, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, extname} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'vite';
import {chromium, webkit} from 'playwright';
import {makeSave, makePokemon} from './fixtures/synthetic.js';
const directory = await mkdtemp(join(tmpdir(), 'emerald-pwa-'));
let deployed = 'A', networkUnavailable = false;
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webmanifest':'application/manifest+json'};
const server = createServer(async (request, response) => {
  if (networkUnavailable) { request.socket.destroy(); return; }
  try {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace('/emerald-companion-2/', '');
    const file = join(directory, deployed, path || 'index.html');
    assert.ok(file.startsWith(join(directory, deployed)));
    assert.ok((await stat(file)).isFile());
    response.writeHead(200, {'Content-Type':mime[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'});
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
try {
  for (const version of ['A','B']) {
    process.env.PWA_BUILD_ID = version;
    await build({build:{outDir:join(directory,version)}, plugins:[{
      name:'visible-test-version', transform(code, id) {
        if (id.endsWith('/SettingsPage.jsx')) return code.replace('Your save file', `Your save file — Version ${version}`);
      },
    }]});
  }
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${server.address().port}/emerald-companion-2/`;
  for (const [engine, width] of [[chromium,375],[webkit,430]]) {
    deployed = 'A'; networkUnavailable=false;
    const browser = await engine.launch({headless:true});
    try {
      const context = await browser.newContext({viewport:{width,height:850},isMobile:true,hasTouch:true});
      const page = await context.newPage();
      const errors=[];
      let loads=0;
      page.on('load',()=>loads++);
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(()=>navigator.serviceWorker.controller);
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.appVersion),'A');
      assert.equal(loads,1,'First installation must not reload the document');
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByText('Your save file — Version A',{exact:true}).waitFor();
      const b1=new Uint8Array(15752);
      new DataView(b1.buffer).setUint32(0x234,1,true);
      b1.set(makePokemon({party:true}),0x238);
      const save=Buffer.from(makeSave({blocks:{saveBlock1:b1}}));
      // Hold a real import across the update. A must remain usable until it completes.
      await page.evaluate(()=>{
        const original=File.prototype.arrayBuffer;
        File.prototype.arrayBuffer=function(){return new Promise(resolve=>{window.finishImport=async()=>resolve(await original.call(this));});};
        localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify({'0:0:0':'Frontier'}));
        localStorage.setItem('pwa-test-preference','keep');
        localStorage.setItem('emerald-companion-2.battle-teams.v1',JSON.stringify([{id:'pwa-team',name:'Saved Team',ids:['one','two','three']} ]));
        localStorage.setItem('emerald-companion-2.battle-rules.v1',JSON.stringify({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:85}));
        return new Promise((resolve,reject)=>{
          const request=indexedDB.open('pwa-test-storage',1);
          request.onupgradeneeded=()=>request.result.createObjectStore('records');
          request.onerror=()=>reject(request.error);
          request.onsuccess=()=>{const db=request.result;const tx=db.transaction('records','readwrite');tx.objectStore('records').put('keep','save');tx.oncomplete=()=>{db.close();resolve();};};
        });
      });
      await page.evaluate(async()=>{const cache=await caches.open('unrelated-cache');await cache.put('/sentinel',new Response('keep'));});
      await page.locator('#save-file').setInputFiles({name:'synthetic.sav',mimeType:'application/octet-stream',buffer:save});
      await page.waitForFunction(()=>typeof window.finishImport==='function');
      const draftPage=await context.newPage();
      await draftPage.goto(url);
      await draftPage.getByRole('button',{name:'Open navigation',exact:true}).click();
      await draftPage.getByRole('button',{name:'Battle',exact:true}).click();
      await page.bringToFront();
      deployed='B';
      await page.evaluate(()=>window.dispatchEvent(new Event('online')));
      await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting),{},{timeout:30000});
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.appVersion),'A','Import blocks activation/reload');
      await page.evaluate(()=>window.finishImport());
      await page.waitForFunction(()=>document.documentElement.dataset.appVersion==='B',{},{timeout:30000});
      await draftPage.waitForFunction(async()=>{
        const worker=navigator.serviceWorker.controller;
        return new Promise(resolve=>{const c=new MessageChannel();c.port1.onmessage=e=>resolve(e.data==='B');worker.postMessage({type:'GET_VERSION'},[c.port2]);});
      });
      assert.equal(await draftPage.evaluate(()=>document.documentElement.dataset.appVersion),'A','External activation must not reload a Battle session');
      await draftPage.getByRole('button',{name:'Open navigation',exact:true}).click();
      await draftPage.getByRole('button',{name:'Home',exact:true}).click();
      await draftPage.waitForFunction(()=>document.documentElement.dataset.appVersion==='B',{},{timeout:30000});
      await draftPage.close();
      await page.bringToFront();
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByText('Your save file — Version B',{exact:true}).waitFor();
      assert.equal(loads,2,'An updated worker must reload exactly once');
      assert.ok(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')));
      assert.equal(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.roles.v1')),'{"0:0:0":"Frontier"}');
      assert.equal(await page.evaluate(()=>localStorage.getItem('pwa-test-preference')),'keep');
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-teams.v1'))),[{id:'pwa-team',name:'Saved Team',ids:['one','two','three']}]);
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emerald-companion-2.battle-rules.v1'))),{facility:'Tower',format:'Doubles',levelMode:'open',openLevel:85});
      assert.equal(await page.evaluate(async()=>{const c=await caches.open('unrelated-cache');return (await c.match('/sentinel')).text();}),'keep');
      assert.equal(await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('pwa-test-storage');r.onsuccess=()=>{const db=r.result;const q=db.transaction('records').objectStore('records').get('save');q.onsuccess=()=>{resolve(q.result);db.close();};};})),'keep');
      await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      await page.getByRole('button',{name:'Collection',exact:true}).click();
      await page.locator('.pokemon-card').first().click();
      await page.getByRole('button',{name:'Pokémon role: Frontier',exact:true}).waitFor();
      await page.keyboard.press('Escape');
      // Playwright WebKit offline emulation rejects even literal SW responses (#42775).
      // Disconnect the actual origin instead; Chromium additionally emulates offline.
      networkUnavailable=true;
      if (engine===chromium) await context.setOffline(true);
      await page.reload();
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByText('Your save file — Version B',{exact:true}).waitFor();
      assert.ok(await page.evaluate(()=>localStorage.getItem('emerald-companion-2.save.v1')));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.deepEqual(errors,[]);
      console.log(`${engine.name()} ${width}px: A installed -> B deferred during import -> automatic UI update; save/roles/preferences/IndexedDB/unrelated cache preserved; offline B reload passed`);
      await context.close();
    } finally { await browser.close(); }
  }
} finally {
  delete process.env.PWA_BUILD_ID;
  await new Promise(resolve=>server.close(resolve));
  await rm(directory,{recursive:true,force:true});
}
