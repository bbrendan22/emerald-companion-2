import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5215,strictPort:true,hmr:false},plugins:[{name:'ability-results-fixture',configureServer(server){server.middlewares.use('/ability-results',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/frontierAbilityResults.jsx"></script>');});}}]});
await server.listen();
try {
 for(const engine of [chromium,webkit]) {
  const browser=await engine.launch({headless:true,timeout:15000,...(engine===chromium?{channel:'chrome'}:{})});
  try {
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.setDefaultTimeout(15000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:5215/ability-results');
   const selector=page.getByRole('combobox',{name:'Select opponent set',exact:true});
   await page.locator('.battle-set-static').waitFor();assert.match(await page.locator('.battle-set-static').innerText(),/^Set \d+$/);
   const player=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
   const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
   const open=async move=>{await player.getByRole('button',{name:`Move information: ${move}`,exact:true}).tap();await page.getByRole('dialog').waitFor();};
   const close=async()=>{await page.getByRole('dialog').tap({position:{x:10,y:10}});await page.getByRole('dialog').waitFor({state:'hidden'});};
   await open('Ice Beam');
   const damage=page.getByRole('region',{name:'Damage Calculation',exact:true});
   for(const ability of ['Immunity','Thick Fat']) {
    const group=damage.getByRole('group',{name:ability,exact:true});assert.equal(await group.count(),1);
    assert.equal(await group.locator('.battle-core-damage-percent').count(),1);
    assert.equal(await group.locator('.battle-core-damage-hp').count(),1);
   }
   await page.screenshot({path:`/private/tmp/frontier-ability-popup-${engine.name()}.png`});
   const before=await damage.innerText();await close();
   for(const ability of ['Thick Fat','Immunity']) {
    await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption(ability);
    await open('Ice Beam');assert.equal(await damage.getByRole('group').count(),0);
    assert.equal(await damage.locator('.battle-core-damage-percent').count(),1);await close();
   }
   await page.getByRole('combobox',{name:'Opponent ability',exact:true}).selectOption('');
   await open('Earthquake');assert.equal(await damage.getByRole('group').count(),0);assert.equal(await damage.locator('.battle-core-damage-percent').count(),1);await close();
   await page.getByLabel('Opponent Light Screen',{exact:true}).check();
   await open('Ice Beam');assert.notEqual(await damage.innerText(),before);assert.equal(await damage.getByRole('group').count(),2);await close();
   for(const symbol of ['Silver','Gold']) {
    await page.getByRole('combobox',{name:'Select Trainer',exact:true}).selectOption(`Anabel ${symbol}`);
    const pokemon=page.getByRole('combobox',{name:'Select opponent Pokémon',exact:true});
    await pokemon.selectOption({label:'Snorlax'});
    assert.equal(await selector.count(),0);
    assert.doesNotMatch(await page.locator('.battle-selection-opponent').innerText(),/Set Anabel/);
    assert.equal(await enemy.locator('.battle-active-moves button').count(),4);
    assert.ok((await enemy.locator('.battle-active-stats').innerText()).includes('HP'));
    await open('Ice Beam');assert.equal(await damage.getByRole('group').count(),2);await close();
   }
   assert.deepEqual(errors,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`/private/tmp/frontier-ability-results-${engine.name()}.png`,fullPage:true});
   console.log(`PASS ${engine.name()}: ordinary numbered sets, both Anabel rosters without set controls, ability-specific Ice Beam, explicit ability, shared Earthquake, conditions refresh`);
  } finally {await browser.close();}
 }
} finally {await server.close();}
