// Mount the public component with an ID, without ResourcesPage or a database list.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5198,strictPort:true}});
await server.listen();
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
  const page=await browser.newPage();
  const url=new URL('ability-dialog-test',server.resolvedUrls.local[0]).href;
  await page.route(url,route=>route.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script type="module" src="/test/helpers/abilityDialogHarness.jsx"></script></body></html>`}));
  await page.goto(url);
  const dialog=page.getByRole('dialog',{name:'Levitate',exact:true});await dialog.waitFor();
  assert.equal(await dialog.locator('.resources-ability-description').innerText(),'Not hit by GROUND attacks.');
  assert.equal(await dialog.locator('[data-dex="94"]').innerText(),'Gengar');
  assert.equal(await page.locator('.resources-catalog-list').count(),0);
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await page.evaluate(()=>window.openAbility(999));assert.equal(await page.getByRole('dialog').count(),0);
  await page.evaluate(()=>window.openAbility(65));await page.getByRole('dialog',{name:'Overgrow',exact:true}).waitFor();
  await page.getByRole('dialog').click();assert.equal(await page.getByRole('dialog').count(),0);
  console.log('AbilityDialog: canonical string/numeric IDs work independently of database, invalid ID renders nothing, Escape and tap dismiss.');
} finally {await browser?.close();await server.close();}
