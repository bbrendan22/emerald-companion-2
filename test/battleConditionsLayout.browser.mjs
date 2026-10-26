import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const format of ['Singles','Doubles'])for(const width of [320,375,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/conditions-layout?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/conditionalAbilitiesPopup.jsx"></script>'}));
  await page.goto(new URL(`/conditions-layout?format=${format}`,server.resolvedUrls.local[0]).href);
  const tap=name=>page.getByRole('button',{name,exact:true}).tap();
  const specials=page.locator('.battle-condition-special-controls');
  const copy=side=>page.getByLabel(`${side} Trace Ability`,{exact:true});
  const flash=side=>page.getByLabel(`${side} Flash Fire Activated`,{exact:true});
  const aligned=async()=>{
   const rows=await page.locator('.battle-condition-side').evaluateAll(sides=>sides.map(side=>[...side.children].filter(el=>!el.classList.contains('battle-condition-special-controls')).map(el=>el.getBoundingClientRect().top)));
   assert.equal(rows[0].length,format==='Doubles'?6:5);
   rows[0].forEach((y,i)=>assert.ok(Math.abs(y-rows[1][i])<1,`row ${i} aligned`));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.ok(await specials.evaluateAll(groups=>groups.every(group=>group.previousElementSibling.classList.contains('battle-condition-screens'))));
  };
  assert.equal(await page.getByRole('region',{name:'Pokémon-Specific Conditions',exact:true}).count(),0);
  assert.ok(await copy('Player').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  assert.ok(await page.locator('.battle-condition-ability').first().evaluate(el=>{
   const [label,select]=[...el.children].map(node=>node.getBoundingClientRect());
   return Math.abs(label.top+label.height/2-select.top-select.height/2)<1;
  }),'Trace label and dropdown share a row');
  for(const side of ['Player','Opponent']) {
   const help=page.getByLabel(`${side} Helping Hand Active`,{exact:true});
   assert.equal(await help.count(),format==='Doubles'?1:0);
   if(format==='Doubles')await help.check();
  }
  await aligned();
  await copy('Player').selectOption('Flash Fire');await flash('Player').check();await aligned();
  await tap('Select Houndoom');assert.equal(await copy('Player').count(),0);assert.equal(await flash('Player').isChecked(),false);
  await tap('Select Ralts');assert.equal(await flash('Player').isChecked(),true);
  await page.getByLabel('Player current HP',{exact:true}).fill('37');
  await page.getByLabel('Player Atk stage',{exact:true}).selectOption('3');
  await page.getByLabel('Player Reflect',{exact:true}).check();
  await page.getByLabel('Battle weather',{exact:true}).selectOption('sun');
  await page.getByLabel('Critical Hit',{exact:true}).check();
  await tap('Select Houndoom');assert.equal(await page.getByLabel('Player Reflect',{exact:true}).isChecked(),true);
  if(format==='Doubles')assert.equal(await page.getByLabel('Player Helping Hand Active').isChecked(),false);
  await tap('Select Ralts');assert.equal(await page.getByLabel('Player current HP',{exact:true}).inputValue(),'37');
  if(format==='Doubles')assert.equal(await page.getByLabel('Player Helping Hand Active').isChecked(),true);
  await tap('Reset');assert.equal(await copy('Player').inputValue(),'');
  assert.equal(await page.getByLabel('Player current HP',{exact:true}).inputValue(),'200');
  assert.equal(await page.getByLabel('Player Atk stage',{exact:true}).inputValue(),'0');
  assert.equal(await page.getByLabel('Player Reflect',{exact:true}).isChecked(),false);
  assert.equal(await page.getByLabel('Battle weather',{exact:true}).inputValue(),'none');
  assert.equal(await page.getByLabel('Critical Hit',{exact:true}).isChecked(),false);
  await page.keyboard.press('Tab');await copy('Player').focus();
  const focus=await copy('Player').evaluate(el=>({outline:getComputedStyle(el.parentElement).outlineStyle,visible:el.matches(':focus-visible'),keyboard:el.closest('.battle-foundation').dataset.keyboardFocus}));
  assert.equal(focus.outline,'solid',JSON.stringify(focus));
  await page.locator('.battle-condition-side h4').first().evaluate(el=>el.textContent='A very long Pokémon name that wraps across several lines');
  await aligned();
  await tap('Select Houndoom');await tap('Opponent Houndoom');await aligned();
  if(format==='Singles') {await tap('Select Snorlax');await tap('Opponent Snorlax');assert.equal(await specials.count(),0);await aligned();}
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${format} ${width}px: aligned standard rows, inline Trace/Flash Fire, Safari sizing/focus, slot memory, Reset and no overflow`);
 }
} finally {await browser?.close();await server.close();}
