import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {moveTutorTabs, moveTutorLists} from '../src/resources/charts/moveTutors.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE});
try {
  const page=await browser.newPage({viewport:{width:375,height:800}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.BATTLE_URL||'http://127.0.0.1:5189');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Resources',exact:true}).click();
  const link=page.getByRole('link',{name:'Move Tutors',exact:true});
  const bounds=await link.boundingBox();
  const textWidth=await link.evaluate(x=>{const r=document.createRange();r.selectNodeContents(x);return r.getBoundingClientRect().width;});
  assert.ok(Math.abs(bounds.width-textWidth)<2);
  const row=await link.locator('..').boundingBox();
  await page.mouse.click(row.x+row.width-5,row.y+row.height/2);
  assert.equal(await page.locator('.move-tutors').count(),0);
  await page.evaluate(()=>{
    window.__tutorScroll=[];
    for(const key of ['scroll','scrollTo','scrollBy']){const original=window[key];window[key]=function(...args){window.__tutorScroll.push(key);return original.apply(this,args);};}
    const original=Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView=function(...args){window.__tutorScroll.push('scrollIntoView');return original.apply(this,args);};
  });
  await link.click();
  const root=page.locator('.move-tutors');
  assert.deepEqual(await root.getByRole('tab').allTextContents(),['Emerald','Battle Frontier','FRLG']);
  assert.equal(await root.getByRole('tab',{name:'Emerald',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await root.locator('input,select,a,img').count(),0);
  assert.equal(await root.locator('button').count(),3);
  for(const width of [320,375,390,430,1280]){
    await page.setViewportSize({width,height:800});
    const tabs=await root.getByRole('tab').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().y));
    assert.ok(tabs.every(y=>y===tabs[0]));
    for(const tab of moveTutorTabs){
      await root.getByRole('tab',{name:tab.label,exact:true}).click();
      assert.equal(await root.getByRole('tab',{selected:true}).innerText(),tab.label);
      const panel=root.getByRole('tabpanel');
      assert.equal(await panel.count(),1);
      assert.deepEqual(await panel.locator('thead th').allTextContents(),tab.id==='frontier'?['Move','Location','BP']:['Move','Location']);
      assert.deepEqual(await panel.locator('tbody tr').evaluateAll(xs=>xs.map(x=>[...x.children].map(x=>x.textContent))),moveTutorLists[tab.id].map(row=>tab.id==='frontier'?[row.name,row.location,String(row.cost)]:[row.name,row.location]));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.ok(await panel.locator('th,td').evaluateAll(xs=>xs.every(x=>x.scrollWidth<=x.clientWidth+1)));
      if(tab.id==='frontier')assert.ok(await panel.locator('tbody td:last-child').evaluateAll(xs=>xs.every(x=>getComputedStyle(x).textAlign==='right')));
      const starts=await panel.locator('tbody tr').evaluateAll(xs=>xs.map(x=>[...x.children].map(x=>x.getBoundingClientRect().x)));
      assert.ok(starts.every(xs=>xs.every((x,i)=>Math.abs(x-starts[0][i])<1)));
      await page.screenshot({path:`/private/tmp/move-tutors-${tab.id}-${width}.png`,fullPage:true});
    }
  }
  await page.setViewportSize({width:375,height:800});
  await root.getByRole('tab',{name:'Emerald',exact:true}).click();
  await page.keyboard.press('ArrowRight');assert.equal(await root.getByRole('tab',{selected:true}).innerText(),'Battle Frontier');
  await page.keyboard.press('End');assert.equal(await root.getByRole('tab',{selected:true}).innerText(),'FRLG');
  await page.keyboard.press('Home');assert.equal(await root.getByRole('tab',{selected:true}).innerText(),'Emerald');
  const tab=root.getByRole('tab',{name:'FRLG',exact:true});
  const appearance=()=>tab.evaluate(x=>{const s=getComputedStyle(x);return [s.color,s.backgroundColor,s.boxShadow,s.transform];});
  await page.mouse.move(0,0);const before=await appearance();await tab.hover();assert.deepEqual(await appearance(),before);
  await page.mouse.down();assert.deepEqual(await appearance(),before);await page.mouse.up();
  await page.getByRole('button',{name:'Back to Resources',exact:true}).click();
  await link.waitFor();assert.equal(await root.count(),0);
  assert.deepEqual(await page.evaluate(()=>window.__tutorScroll),[]);assert.deepEqual(errors,[]);
  console.log('Move Tutors: 10 Emerald/20 Frontier/18 FRLG rows, all tabs/default/keyboard, exact locations and BP, text-only navigation, unchanged hover/pressed styles and scrolling; 320/375/390/430/1280px passed.');
} finally {await browser.close();}
