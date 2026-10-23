import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave} from './fixtures/synthetic.js';
import {towerTrainerEntries} from '../src/battle/towerTrainers.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit ? 5205 : 5204,strictPort:true}});
const browser=useWebKit ? await webkit.launch({headless:true}) : await chromium.launch({headless:true,channel:'chrome'});
const artifactDir=`artifacts/opponent-trainer${useWebKit ? '-webkit' : ''}`;
const errors=[];
try {
 await mkdir(artifactDir,{recursive:true});
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[1440,900]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Battle',exact:true}).click();
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const player=page.getByRole('region',{name:'My Team',exact:true});
  const trigger=opponent.locator('.battle-opponent-trigger');
  const popup=page.getByRole('dialog',{name:'Select opponent trainer',exact:true});
  const search=popup.getByRole('searchbox',{name:'Search Tower trainers'});
  const activate=async locator=>{if(width<500)await locator.tap();else await locator.click();};
  const assertFit=async()=>{
    // Viewport resize events update the fixed popup on the next browser turn.
    await page.waitForFunction(({width,height})=>{
      const popup=document.querySelector('.battle-opponent-popup');if(!popup)return false;
      const rect=popup.getBoundingClientRect();
      return rect.x>=0 && rect.y>=0 && rect.right<=width+1 && rect.bottom<=height+1;
    },{width,height:page.viewportSize().height},{timeout:5000});
  };
  const teamGeometry=()=>page.locator('.battle-compact-teams > section').evaluateAll(sections=>sections.map(section=>{
    const box=section.getBoundingClientRect(), heading=section.querySelector('h3').getBoundingClientRect(), slots=section.querySelector('.battle-compact-slots').getBoundingClientRect();
    const caption=section.querySelector('.battle-player-name, .battle-opponent-trigger > span').getBoundingClientRect();
    return {height:box.height,headingHeight:heading.height,slotsOffset:slots.y-box.y,captionOffset:caption.y-box.y,top:box.y-section.parentElement.getBoundingClientRect().y};
  }));
  const initialGeometry=await teamGeometry();
  assert.ok(initialGeometry.every(section=>section.height===84 && section.headingHeight===48 && section.slotsOffset===52));
  const playerBefore=await player.innerHTML();
  const slotsSnapshot=()=>opponent.locator('.battle-compact-slot').evaluateAll(slots=>slots.map(slot=>({label:slot.getAttribute('aria-label'),popup:slot.getAttribute('aria-haspopup'),expanded:slot.getAttribute('aria-expanded'),text:slot.textContent,sprite:slot.querySelector('img')?.getAttribute('src')??null})));
  const slotsBefore=await slotsSnapshot();
  const storageBefore=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
  assert.equal(await trigger.locator('.battle-opponent-chevron').innerText(),'▾');
  assert.ok(await trigger.evaluate(el=>{
    const name=el.querySelector('.battle-opponent-name').getBoundingClientRect();
    const arrow=el.querySelector('.battle-opponent-chevron').getBoundingClientRect();
    return Math.abs((name.y+name.height/2)-(arrow.y+arrow.height/2))<1;
  }),'empty opponent arrow is vertically centered with its text');
  await activate(trigger.locator('span').first());await assertFit();
  assert.equal(await popup.locator('.battle-opponent-result').count(),towerTrainerEntries.length);
  assert.equal(await popup.locator('input').count(),1);
  assert.equal(await popup.getByRole('spinbutton').count(),0);
  assert.equal(await popup.getByRole('button',{name:'Clear opponent trainer'}).count(),0);
  const inputY=(await search.boundingBox()).y;
  await popup.locator('.battle-opponent-results').evaluate(el=>el.scrollTop=400);
  assert.ok(await popup.isVisible());assert.equal((await search.boundingBox()).y,inputY);
  await activate(search);
  assert.ok(await search.evaluate(el=>document.activeElement===el),'a normal field tap focuses search');
  // Model the page pan caused by opening a mobile software keyboard.
  await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
  assert.ok(await popup.isVisible(),'keyboard-induced page scroll does not close search');
  assert.ok(await search.evaluate(el=>document.activeElement===el));
  await search.pressSequentially(' bRaDy ');
  assert.equal(await popup.locator('.battle-opponent-result').count(),1);
  assert.equal(await popup.locator('.battle-opponent-result-identity').innerText(),'BRADY · Youngster');
  assert.equal(await popup.locator('.battle-opponent-result').getAttribute('aria-description'),'Youngster');
  assert.equal(await popup.locator('.battle-opponent-results').evaluate(el=>el.scrollTop),0);
  await search.fill('no-such-trainer');assert.equal(await popup.getByRole('status').innerText(),'No trainers found.');
  await search.fill('BRADY');
  if(width<500) {
   // Simulate the reduced viewport while a phone's software keyboard is open.
   await page.setViewportSize({width,height:Math.max(320,height-250)});
   await assertFit();assert.ok(await search.isVisible());
   await page.evaluate(()=>window.dispatchEvent(new Event('scroll')));
   assert.ok(await search.evaluate(el=>document.activeElement===el),'search retains focus after keyboard resize and pan');
  }
  await activate(popup.getByRole('button',{name:'Select trainer BRADY',exact:true}));
  assert.equal(await popup.count(),0);assert.equal(await trigger.locator('.battle-opponent-name').innerText(),'BRADY');
  assert.equal(await trigger.getAttribute('aria-haspopup'),null);
  assert.equal(await trigger.locator('.battle-opponent-chevron').count(),0);
  assert.deepEqual(await teamGeometry(),initialGeometry,'selecting a trainer never moves the slots or changes section spacing');
  assert.match(await trigger.locator('img').getAttribute('src'),/trainers\/frontier\/youngster.png/);
  assert.equal(await trigger.locator('.battle-opponent-class').innerText(),'Youngster');
  assert.equal(await trigger.locator('.battle-opponent-class').evaluate(el=>getComputedStyle(el).fontSize),'10px');
  assert.ok(await trigger.evaluate(el=>{
    const name=el.querySelector('.battle-opponent-name').getBoundingClientRect(), cls=el.querySelector('.battle-opponent-class').getBoundingClientRect();
    return cls.y>=name.bottom-1 && Math.abs(cls.x-name.x)<1;
  }),'trainer class sits directly below the name');
  await trigger.locator('img').evaluate(img=>img.decode());
  assert.ok(await trigger.evaluate(el=>{
    const text=el.querySelector('.battle-opponent-identity').getBoundingClientRect();
    const sprite=el.querySelector('img').getBoundingClientRect();
    return Math.abs((text.y+text.height/2)-(sprite.y+sprite.height/2))<1;
  }),'opponent sprite is vertically centered beside the name and class');
  assert.ok(await trigger.evaluate(button=>{
    const region=button.closest('section').getBoundingClientRect();
    const boxes=[...button.children].map(child=>child.getBoundingClientRect());
    return Math.abs(Math.min(...boxes.map(b=>b.x))-region.x)<1
      && boxes[0].right<=boxes[1].x && button.firstElementChild.tagName==='SPAN' && button.lastElementChild.tagName==='IMG';
  }),'selected trainer heading is left aligned with its sprite after the name');
  assert.equal(await player.innerHTML(),playerBefore);
  assert.deepEqual(await slotsSnapshot(),slotsBefore);
  assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),storageBefore);
  await page.setViewportSize({width,height});
  await activate(trigger);assert.equal(await popup.count(),0,'single tap on a selected trainer does not open search');
  await page.waitForTimeout(400);
  const clearSelected=async()=>{
    const scale=await page.evaluate(()=>visualViewport.scale);
    if(width<500){await trigger.tap();await trigger.tap();}else await trigger.dblclick();
    assert.equal(await popup.count(),0,'clearing does not reopen search through a follow-up click');
    assert.equal(await trigger.locator('.battle-opponent-name').innerText(),'Opponent');
    assert.equal(await trigger.locator('.battle-opponent-chevron').innerText(),'▾');
    assert.equal(await trigger.locator('img').count(),0);
    assert.deepEqual(await teamGeometry(),initialGeometry,'clearing a trainer preserves both section heights and slot positions');
    assert.equal(await page.evaluate(()=>visualViewport.scale),scale);
    assert.equal(await page.evaluate(()=>getSelection().toString()),'');
    assert.equal(await player.innerHTML(),playerBefore);
    assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage))),storageBefore);
  };
  await clearSelected();
  assert.deepEqual(await slotsSnapshot(),slotsBefore);
  await page.waitForTimeout(450);
  await activate(trigger.locator('.battle-opponent-chevron'));
  assert.equal(await popup.locator('.battle-opponent-result').count(),towerTrainerEntries.length);
  await search.fill('Anabel');assert.equal(await popup.locator('.battle-opponent-result').count(),2);
  await page.screenshot({path:`${artifactDir}/search-${width}.png`,fullPage:true});
  await activate(popup.getByRole('button',{name:'Select trainer Anabel Gold',exact:true}));
  assert.equal(await trigger.locator('.battle-opponent-name').innerText(),'Anabel');assert.match(await trigger.locator('img').getAttribute('src'),/salon_maiden_anabel/);
  assert.equal(await trigger.locator('.battle-opponent-chevron').count(),0);
  assert.deepEqual(await teamGeometry(),initialGeometry,'selecting a trainer never moves the slots or changes section spacing');
  assert.equal(await opponent.locator('.battle-compact-slots img').count(),3);
  await activate(trigger);assert.equal(await popup.count(),0);
  await page.waitForTimeout(400);
  await clearSelected();
  assert.deepEqual(await slotsSnapshot(),slotsBefore);
  await page.waitForTimeout(450);
  await activate(trigger);await popup.click({position:{x:2,y:2}});assert.equal(await popup.count(),0);
  await activate(trigger);await page.mouse.click(10,100);assert.equal(await popup.count(),0);
  await activate(trigger);await page.keyboard.press('Escape');assert.equal(await popup.count(),0);
  await activate(trigger);await trigger.click();assert.equal(await popup.count(),0);
  assert.equal(await page.locator('.battle-matchup-title').innerText(),'Matchup');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`${artifactDir}/cleared-${width}.png`,fullPage:true});
  // Imported player identity and a completely missing profile share one layout.
  const trainerBlock=new Uint8Array(3884);trainerBlock.set([187,188,255]);
  const profileSave=Buffer.from(makeSave({blocks:{saveBlock2:trainerBlock}})).toString('base64');
  await page.evaluate(encoded=>localStorage.setItem('emerald-companion-2.save.v1',encoded),profileSave);
  await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Battle',exact:true}).click();
  assert.equal(await player.locator('.battle-compact-trainer').count(),1);
  assert.ok(await player.evaluate(el=>{
    const text=el.querySelector('.battle-player-name').getBoundingClientRect();
    const sprite=el.querySelector('.battle-compact-trainer').getBoundingClientRect();
    return Math.abs((text.y+text.height/2)-(sprite.y+sprite.height/2))<1;
  }),'player sprite is vertically centered beside the trainer name');
  assert.deepEqual(await teamGeometry(),initialGeometry,'imported player profile uses the same fixed section geometry');
  await page.evaluate(()=>localStorage.removeItem('emerald-companion-2.save.v1'));
  await page.reload();
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  await page.getByRole('button',{name:'Battle',exact:true}).click();
  assert.equal(await player.locator('.battle-compact-trainer').count(),0);
  assert.deepEqual(await teamGeometry(),initialGeometry,'removing player info keeps the same height and spacing');
  await context.close();
  console.log(`PASS opponent trainer ${width}px: all entries, name search, correct sprites, selection/clear preserve slots, scroll, keyboard viewport, background/outside/Escape/trigger dismissal.`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
