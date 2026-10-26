import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';

// Production integration smoke: selected canonical sets, evidence and temporary
// Rules must flow through the real App. Exhaustive controls/mechanics live in
// the focused selector, session and damage suites.
const storage=new Uint8Array(33744);
storage.set(makePokemon({species:285,experience:117360,moveIds:[58,57,89,70],heldItemId:0}),4);
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mon=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).find(Boolean);
const persisted={
  'emerald-companion-2.save.v1':encoded,
  'emerald-companion-2.roles.v1':JSON.stringify({[mon.identity]:'Frontier'}),
  // Old storage must neither override fresh defaults nor be rewritten by Battle.
  'emerald-companion-2.battle-rules.v1':JSON.stringify({facility:'Tower',format:'Doubles',levelMode:'open',openLevel:92}),
  'emerald-companion-2.battle-round.v1':JSON.stringify('7'),
};
const server=await preview({preview:{host:'127.0.0.1',port:5315,strictPort:true}});
let browser;
const results=[];
try {
  browser=await webkit.launch({headless:true});
  await mkdir('artifacts/frontier-candidate-step6',{recursive:true});
  for(const width of [320,375,390,430]) {
    const context=await browser.newContext({viewport:{width,height:844},screen:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
    try {
      // This flag exercises the standalone branch, not physical iPhone behavior.
      if(width===390)await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{get:()=>true}));
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.setDefaultTimeout(10000);
      const navigate=async name=>{
        await page.getByRole('button',{name:'Open navigation',exact:true}).tap();
        await page.getByRole('button',{name,exact:true}).tap();
      };
      const control=name=>page.getByRole('combobox',{name,exact:true});
      const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
      const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
      const trainers=control('Select Trainer');
      const critical=page.getByRole('checkbox',{name:'Critical Hit',exact:true});
      const permanent=()=>page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(persisted));
      const defaults=async()=>{
        for(const [name,value] of [['Facility','Tower'],['Format','Singles'],['Level','50'],['Round','']])
          assert.equal(await control(name).inputValue(),value,`fresh ${name}`);
      };
      const empty=async format=>{
        const suffix=format==='Doubles'?' Slot 1':'';
        assert.equal(await control(`Select my Pokémon${suffix}`).inputValue(),'');
        assert.equal(await trainers.inputValue(),'');
        assert.equal(await control(`Select opponent Pokémon${suffix}`).inputValue(),'');
        assert.equal(await control(`Select opponent Pokémon${suffix}`).isDisabled(),true);
        if(format==='Doubles')for(const name of ['Select my Pokémon Slot 2','Select opponent Pokémon Slot 2'])
          assert.equal(await control(name).inputValue(),'');
        assert.equal(await page.locator('.battle-matchup-sprite').count(),0);
        assert.equal(await page.getByRole('region',{name:'Observations',exact:true}).count(),0);
        assert.equal(await page.getByRole('spinbutton').count(),0,'empty encounter has no stale HP controls');
        assert.equal(await page.locator('select[aria-label^="Select opponent set"]').count(),0);
        assert.equal(await page.getByRole('dialog').count(),0);
      };
      const snapshot=async()=>({
        controls:await page.locator('.battle-foundation select').evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('aria-label'),node.value])),
        player:await player.innerText(),enemy:await enemy.innerText(),
        observations:await page.getByRole('region',{name:'Observations',exact:true}).innerText(),
        critical:await critical.isChecked(),
        hp:await page.getByRole('spinbutton').evaluateAll(nodes=>nodes.map(node=>[node.getAttribute('aria-label'),node.value])),
      });
      const damage=async(name,{keyboard=false,screenshot=false}={})=>{
        const trigger=player.getByRole('button',{name:`Move information: ${name}`,exact:true});
        if(keyboard){await trigger.focus();await page.keyboard.press('Enter');}else await trigger.tap();
        const dialog=page.getByRole('dialog');await dialog.waitFor();
        assert.equal(await dialog.getByRole('heading',{name,exact:true}).count(),1);
        assert.equal(await dialog.locator('.battle-core-damage-percent').count(),1,await dialog.innerText());
        const hp=dialog.locator('.battle-core-damage-hp');
        assert.equal(await hp.evaluate(node=>node.previousElementSibling.className),'battle-core-damage-percent');
        const text=await hp.innerText();
        assert.match(text,/^\d+–\d+ HP damage$/);
        assert.doesNotMatch(await dialog.innerText(),/Across \d+ possible sets/,'analysis uses the selected canonical set');
        if(name==='Earthquake')assert.equal(text,'0–0 HP damage','Aerodactyl remains immune to Ground');
        else assert.ok(Number(text.match(/^\d+/)[0])>0,`${name} deals positive damage`);
        const box=await dialog.locator('.battle-move-dialog').boundingBox();
        assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=844,`${name} popup fits ${width}px`);
        if(screenshot)await page.screenshot({path:`artifacts/frontier-candidate-step6/production-${width}.png`});
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(),0);
        assert.equal(await page.evaluate(()=>document.body.style.position),'','popup releases scroll lock');
        if(keyboard)assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);
        return text;
      };
      await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
      // Seed once, so reload cannot conceal storage mutations by reseeding.
      await page.evaluate(entries=>{for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);},persisted);
      await page.reload();await navigate('Battle');
      await defaults();await empty('Singles');
      assert.deepEqual(await permanent(),persisted);
      await control('Level').selectOption('85');
      await control('Round').selectOption('8+');

      for(const format of ['Singles','Doubles']) {
        // Entering Doubles from the populated Singles encounter must clear it.
        if(format==='Doubles') {
          await control('Format').selectOption(format);
          await empty(format);
          assert.equal(await control('Level').inputValue(),'85');
          assert.equal(await control('Round').inputValue(),'8+');
        }
        const suffix=format==='Doubles'?' Slot 1':'';
        const own=control(`Select my Pokémon${suffix}`),opponent=control(`Select opponent Pokémon${suffix}`);
        const sets=control(`Select opponent set${suffix}`);
        await own.selectOption(mon.identity);
        assert.equal(await own.inputValue(),mon.identity);
        assert.equal(await player.locator('.battle-active-level').innerText(),`Lv. ${mon.level}`,'saved player level is unchanged');
        await trainers.selectOption('Expert (M):ALEXAS');
        assert.equal(await opponent.inputValue(),'','selecting a trainer does not auto-populate opponents');
        await opponent.selectOption({label:'Aerodactyl'});
        assert.equal(await opponent.locator('option:checked').innerText(),'Aerodactyl');
        assert.equal(await enemy.locator('.battle-active-level').innerText(),'Lv. 85');
        assert.deepEqual(await sets.locator('option').allTextContents(),['Set 1','Set 2','Set 3','Set 4']);
        await sets.selectOption('Aerodactyl 2');
        assert.equal(await sets.inputValue(),'Aerodactyl 2');
        assert.equal(await enemy.locator('.battle-active-item').innerText(),'Choice Band');
        assert.deepEqual(await enemy.locator('.battle-active-moves button').allTextContents(),['Hyper Beam','Earthquake','Aerial Ace','AncientPower']);
        const item=control('Observed held item'),move=control('Add observed move');
        assert.equal(await item.inputValue(),'','canonical displayed item is not evidence');
        await item.selectOption('Kings Rock');
        assert.deepEqual(await sets.locator('option').allTextContents(),['Set 1','Set 3','Set 4']);
        assert.equal(await sets.inputValue(),'Aerodactyl 1','incompatible analysis selection reconciles');
        await move.selectOption('Double Edge');
        assert.deepEqual(await sets.locator('option').allTextContents(),['Set 3','Set 4']);
        await sets.selectOption('Aerodactyl 4');
        assert.deepEqual(await enemy.locator('.battle-active-moves button').allTextContents(),['Double Edge','Earthquake','Fire Blast','Bite']);
        await control('Opponent ability').selectOption('Pressure');
        assert.equal(await critical.isChecked(),false,'new encounter clears critical-hit state');
        const surf=await damage('Surf');
        await critical.check();
        const criticalSurf=await damage('Surf');
        assert.ok(Number(criticalSurf.match(/^\d+/)[0])>Number(surf.match(/^\d+/)[0]),'critical-hit state reaches production damage');
        const before=await snapshot();
        await damage('Ice Beam',{keyboard:true,screenshot:format==='Doubles'});
        await damage('Earthquake');
        assert.deepEqual(await snapshot(),before,'damage popups do not mutate encounter state');
        for(const destination of ['Home','Collection']) {
          await navigate(destination);await navigate('Battle');
          assert.deepEqual(await snapshot(),before,`${destination} navigation preserves Rules, selections, evidence and conditions`);
        }
        assert.equal(await damage('Surf'),criticalSurf,'damage remains synchronized after navigation');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.deepEqual(await permanent(),persisted);
      }
      // Verify the reverse format transition also discards the populated encounter.
      await control('Format').selectOption('Singles');await empty('Singles');
      await control('Format').selectOption('Doubles');
      await control('Select my Pokémon Slot 1').selectOption(mon.identity);
      await trainers.selectOption('Expert (M):ALEXAS');
      await control('Select opponent Pokémon Slot 1').selectOption({label:'Aerodactyl'});
      await control('Observed held item').selectOption('Kings Rock');
      await critical.check();
      // Reload must discard a populated workspace, not merely keep it empty.
      await page.reload();await navigate('Battle');
      await defaults();await empty('Singles');
      assert.deepEqual(await permanent(),persisted,'reload preserves permanent data and ignores legacy Rules');
      assert.equal(await control('Select my Pokémon').locator(`option[value="${mon.identity}"]`).count(),1,'import and Frontier role remain usable');
      assert.deepEqual(errors,[]);
      results.push({width,standaloneFlagSimulation:width===390,formats:['Singles','Doubles'],navigationState:'preserved',formatSwitch:'fresh encounter',reloadRules:'defaults',reloadWorkspace:'empty',permanentData:'preserved'});
      console.log(`PASS production WebKit ${width}px: inline Singles/Doubles selections, canonical sets/evidence, damage updates/popups, navigation retention, format reset and clean reload`);
    } finally {await context.close();}
  }
  await writeFile('artifacts/frontier-candidate-step6/production-validation.json',JSON.stringify(results,null,2)+'\n');
} finally {await browser?.close();await server.close();}
