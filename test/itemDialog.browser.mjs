// Public ID-based component works without ResourcesPage or a mounted item list.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({server:{host:'127.0.0.1',port:5201,strictPort:true}});
await server.listen();
let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
 const page=await browser.newPage();
 const url=new URL('item-dialog-test',server.resolvedUrls.local[0]).href;
 await page.route(url,route=>route.fulfill({contentType:'text/html',body:`<html><body><div id="root"></div><script type="module" src="/test/helpers/itemDialogHarness.jsx"></script></body></html>`}));
 await page.goto(url);
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 assert.equal(await dialog.getAttribute('aria-label'),'Leftovers');
 assert.match(await dialog.innerText(),/Battle Frontier/);
 assert.equal(await page.locator('.resource-item-groups').count(),0);
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 await page.evaluate(()=>window.openItem(99999));assert.equal(await dialog.count(),0);
 await page.evaluate(()=>window.openItem(314));await dialog.waitFor();
 assert.equal(await dialog.getAttribute('aria-label'),'TM26 · Earthquake');
 assert.equal(await dialog.locator('img').getAttribute('src'),'/items/314.png');
 await dialog.locator('strong').first().click();assert.equal(await dialog.count(),0);
 await page.evaluate(()=>window.openItem('142'));await dialog.waitFor();
 assert.equal(await dialog.getAttribute('aria-label'),'Sitrus Berry');
 assert.equal(await dialog.locator('img').getAttribute('src'),'/items/142.png');
 assert.match(await dialog.innerText(),/Route/);
 await page.keyboard.press('Escape');assert.equal(await dialog.count(),0);
 console.log('ItemDialog: canonical string/numeric item IDs and machine IDs work independently of the list; invalid IDs, Escape and tap dismissal pass.');
}finally{await browser?.close();await server.close();}
