import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium, webkit} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch({headless: true, ...(engineName === 'chromium' ? {executablePath: process.env.CHROME_EXECUTABLE} : {})});
  try {
    for (const mobile of [true, false]) {
      const page = await browser.newPage({viewport: {width: mobile ? 390 : 1280, height: 844}, hasTouch: mobile, isMobile: mobile});
      await page.goto(process.env.BATTLE_URL || 'http://127.0.0.1:5173');
      const activate = locator => mobile ? locator.tap() : locator.click();
      await activate(page.getByRole('button', {name: 'Open navigation', exact: true}));
      await activate(page.getByRole('button', {name: 'Resources', exact: true}));
      await activate(page.getByRole('link', {name: 'Abilities', exact: true}));
      const rowVisuals = () => page.locator('#resources-abilities .resources-move-row').evaluateAll(rows => rows.map(row => [row, row.querySelector('button')].map(element => {
        const style = getComputedStyle(element);
        return [style.outlineStyle, style.outlineWidth, style.backgroundColor, style.borderColor, style.boxShadow];
      })));
      const normal = await rowVisuals();
      for (const name of ['Air Lock', 'Arena Trap', 'Air Lock']) {
        await activate(page.getByRole('button', {name, exact: true}));
        assert.deepEqual(await rowVisuals(), normal, `${engineName}: no entry highlight while open`);
        await activate(page.getByRole('dialog').locator('.resources-move-heading'));
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.deepEqual(await rowVisuals(), normal, `${engineName}: no row OR button highlight after pointer dismissal`);
        assert.equal(await page.locator('#resources-abilities .resources-move-row:focus, #resources-abilities .resources-move-toggle:focus').count(), 0);
      }
      const search = page.getByRole('searchbox', {name: 'Search Abilities', exact: true});
      await search.fill('Levitate');
      await search.focus();
      // macOS WebKit uses Option-Tab to include buttons without Full Keyboard Access.
      const tab = engineName === 'webkit' ? 'Alt+Tab' : 'Tab';
      await page.keyboard.press(tab); // clear search
      await page.keyboard.press(tab); // move trigger
      const trigger = page.getByRole('button', {name: 'Levitate', exact: true});
      assert.equal(await trigger.evaluate(e => e === document.activeElement && e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'), true);
      await page.keyboard.press('Enter');
      await page.getByRole('dialog').evaluate(element=>{
        const send=(type,x,y)=>element.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y}));
        send('pointerdown',50,50);send('pointermove',50,20);send('pointermove',50,50);send('pointerup',50,50);
        element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      });
      assert.equal(await page.getByRole('dialog').count(),1,'a returning drag never dismisses');
      await page.getByRole('dialog').evaluate(element=>{
        const pointer={bubbles:true,pointerId:1,isPrimary:true,button:0,clientX:50,clientY:50};
        element.dispatchEvent(new PointerEvent('pointerdown',pointer));element.dispatchEvent(new Event('scroll'));
        element.dispatchEvent(new PointerEvent('pointerup',pointer));element.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      });
      assert.equal(await page.getByRole('dialog').count(),1,'scroll cancels a stationary release');
      await page.keyboard.press('Escape');
      assert.equal(await trigger.evaluate(e => e === document.activeElement && e.matches(':focus-visible') && getComputedStyle(e).outlineStyle !== 'none'), true, `${engineName}: restore visible keyboard focus`);
      await page.close();
    }
    console.log(`${engineName}: ability focus passed for touch/mobile and mouse/desktop; row and button styles unchanged, repeated/different entries, keyboard focus and Escape restoration.`);
  } finally {
    await browser.close();
  }
}
