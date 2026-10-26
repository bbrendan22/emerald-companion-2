import assert from 'node:assert/strict';
import {webkit} from 'playwright';
import {createServer} from 'vite';
import {speciesTypes} from '../src/battle/reference.js';
import {opponentSpeciesById} from '../src/battle/opponentSpecies.js';
const server=await createServer({base:'/',server:{host:'127.0.0.1',port:0,hmr:false}});
let browser;
try {
 await server.listen();browser=await webkit.launch({headless:true});
 for(const width of [320,375,430])for(const mode of ['Singles','Doubles','DoublesOpen']) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/type-level?*',route=>route.fulfill({contentType:'text/html',body:'<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/battleTypeLevelHeader.jsx"></script>'}));
  const format=mode==='Singles'?'Singles':'Doubles';
  await page.goto(new URL(`/type-level?format=${format}${mode==='DoublesOpen'?'&open=1':''}`,server.resolvedUrls.local[0]).href);
  const state=()=>page.getByLabel('Header battle state').textContent().then(JSON.parse);
  const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true}),opponent=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const check=async(group,types,level)=>{
   assert.equal(await group.locator('.battle-active-level').innerText(),`Lv. ${level}`);
   assert.deepEqual(await group.locator('.battle-active-types img').evaluateAll(images=>images.map(img=>img.alt.toUpperCase().replace(' TYPE',''))),types);
   assert.equal(await group.locator('.battle-active-types').count(),1);
   assert.equal(await group.locator('.battle-active-header + .battle-active-artwork').count(),1);
   const geometry=await group.evaluate(el=>{
    const box=node=>node.getBoundingClientRect();
    const col=box(el),header=box(el.querySelector('.battle-active-header')),types=box(el.querySelector('.battle-active-types')),level=box(el.querySelector('.battle-active-level'));
    const sprite=box(el.querySelector('.battle-matchup-sprite')),facts=box(el.querySelector('.battle-active-facts'));
    return {aligned:Math.abs(types.left-col.left)<1&&Math.abs(level.right-col.right)<1,
     sameRow:Math.abs(types.top+types.height/2-level.top-level.height/2)<1,
     above:header.bottom<=sprite.top+1,centered:Math.abs(sprite.left+sprite.width/2-col.left-col.width/2)<1,
     size:sprite.width===96&&sprite.height===96,factsBelow:facts.top>=sprite.bottom-1};
   });
   assert.ok(Object.values(geometry).every(Boolean),JSON.stringify(geometry));
  };
  const checkCurrent=async()=>{
   const s=await state(),own=s.matchup.player==='swellow'?{types:['NORMAL','FLYING'],level:65}:{types:['WATER','GROUND'],level:47};
   const other=opponentSpeciesById(s.matchup.opponent);
   await check(player,own.types,own.level);await check(opponent,speciesTypes(other.dex),s.rules.opponentLevel);
   const bounds=await page.locator('.battle-pokemon-selection, .battle-single-selection, .battle-doubles-selection').first().boundingBox();
   assert.ok((await player.locator('.battle-active-header').boundingBox()).y>=bounds.y+bounds.height-1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  };
  await checkCurrent();
  if(format==='Doubles') {
   const before=await state();
   for(let i=0;i<4;i++) {
    await player.locator('.battle-sprite-switch').tap();if(i%2===0)await opponent.locator('.battle-sprite-switch').tap();
    await checkCurrent();
    const after=await state();
    for(const key of ['team','opponentSpecies','matchupConditions','matchupSides','field'])assert.deepEqual(after[key],before[key],key);
   }
   const sets=page.getByRole('combobox',{name:'Select opponent set Slot 1',exact:true});
   const options=await sets.locator('option').evaluateAll(options=>options.map(o=>o.value));
   assert.ok(options.length>1);await sets.selectOption(options.at(-1));await checkCurrent();
  } else assert.equal(await player.locator('.battle-sprite-switch').count(),0);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${mode} ${width}px: shared type/level header, correct records/rules/Sets, sprite switching/centering and no overflow`);
 }
} finally {await browser?.close();await server.close();}
