import {battleMove} from '../src/battle/reference.js';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {webkit} from 'playwright';
import {createServer} from 'vite';
const server=await createServer({server:{host:'127.0.0.1',port:5278,strictPort:true},plugins:[{
 name:'core-damage-popup-fixture',configureServer(server){
  server.middlewares.use('/__core-damage-popup',(_request,response)=>{
   response.setHeader('Content-Type','text/html');
   response.end('<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div><script type="module" src="/test/fixtures/coreDamagePopup.jsx"></script>');
  });
 }
}]});
await server.listen();
let browser;
try {
 browser=await webkit.launch({headless:true});
 await mkdir('artifacts/core-damage-popup',{recursive:true});
 for(const width of [320,375,390,430]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup`);
  const own=page.getByRole('group',{name:'My matchup Pokémon',exact:true});
  const enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const popup=page.getByRole('dialog'),section=popup.getByRole('region',{name:'Damage Calculation'});
  const open=async(group,name)=>group.getByRole('button',{name:`Move information: ${name}`,exact:true}).tap();
  const unavailable=async()=>assert.equal(await section.locator('p').innerText(),'Damage unavailable for this matchup.');
  const range=async(percent,hp)=>assert.deepEqual(await section.locator('.battle-core-damage-percent,.battle-core-damage-hp').allTextContents(),[percent,hp]);
  await page.getByRole('button',{name:'Select Snorlax',exact:true}).tap();
  await open(own,'Strength');await unavailable();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Opponent Alakazam',exact:true}).tap();
  await open(own,'Strength');await range('40.0% – 47.9%','56–67 HP damage');
  const styles=await section.evaluate(el=>{
   const [primary,secondary]=el.querySelectorAll('p');
   return {primary:parseFloat(getComputedStyle(primary).fontSize),secondary:parseFloat(getComputedStyle(secondary).fontSize),colors:[getComputedStyle(primary).color,getComputedStyle(secondary).color]};
  });
  assert.ok(styles.primary>styles.secondary);assert.notEqual(...styles.colors);
  const box=await popup.locator('.battle-move-dialog').boundingBox();
  assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=844);
  assert.equal(await popup.locator('button').count(),0);
  assert.equal(await popup.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
  await page.screenshot({path:`artifacts/core-damage-popup/webkit-${width}.png`});
  await section.locator('p').last().tap();assert.equal(await popup.count(),0);
  // Exercise the existing controls and reducer, reopening the real matchup popup.
  await page.getByRole('button',{name:'Battle Conditions',exact:true}).tap();
  const stage=async(side,stat,value)=>page.getByRole('combobox',{name:`${side} ${stat} stage`,exact:true}).selectOption(String(value));
  await stage('Player','Atk',2);
  await open(own,'Strength');await range('80.0% – 94.3%','112–132 HP damage');await page.keyboard.press('Escape');
  await stage('Opponent','Def',2);
  await open(own,'Strength');await range('40.0% – 47.9%','56–67 HP damage');await page.keyboard.press('Escape');
  await stage('Player','Atk',0);
  await open(own,'Strength');await range('20.0% – 24.3%','28–34 HP damage');await page.keyboard.press('Escape');
  await stage('Opponent','Def',0);
  await stage('Player','SpA',2);
  await open(own,'Ember');await range('21.4% – 25.7%','30–36 HP damage');await page.keyboard.press('Escape');
  await stage('Opponent','SpD',2);
  await open(own,'Ember');await range('11.4% – 13.6%','16–19 HP damage');await page.keyboard.press('Escape');
  await stage('Player','SpA',0);await stage('Opponent','SpD',0);
  await stage('Opponent','SpA',2);
  await open(enemy,'Fire Punch');await range('51.0% – 60.0%','102–120 HP damage');await page.keyboard.press('Escape');
  await stage('Player','SpD',2);
  await open(enemy,'Fire Punch');await range('25.5% – 30.5%','51–61 HP damage');await page.keyboard.press('Escape');
  await stage('Opponent','SpA',0);await stage('Player','SpD',0);
  await stage('Player','Spe',6);await stage('Opponent','Spe',-6);
  await open(own,'Strength');await range('40.0% – 47.9%','56–67 HP damage');await page.keyboard.press('Escape');
  await open(own,'Ember');await range('11.4% – 13.6%','16–19 HP damage');await page.keyboard.press('Escape');
  await open(own,'Growl');assert.equal(await popup.getByRole('region',{name:'Move effect',exact:true}).locator('p').textContent(),battleMove('Growl').description);await page.keyboard.press('Escape');
  await open(enemy,'Fire Punch');await range('25.5% – 30.5%','51–61 HP damage');await page.keyboard.press('Escape');
  // Use the actual shared Weather dropdown; each reopened popup reads current state.
  const weather=async value=>page.getByRole('combobox',{name:'Battle weather',exact:true}).selectOption(value);
  await weather('rain');
  await open(own,'Ember');await range('5.7% – 7.1%','8–10 HP damage');await page.keyboard.press('Escape');
  await open(enemy,'Fire Punch');await range('13.0% – 15.5%','26–31 HP damage');await page.keyboard.press('Escape');
  await weather('sun');
  await open(own,'Ember');await range('15.7% – 19.3%','22–27 HP damage');await page.keyboard.press('Escape');
  await open(enemy,'Fire Punch');await range('38.0% – 45.0%','76–90 HP damage');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Select Swampert',exact:true}).tap();
  await weather('none');
  const playerHp=page.getByRole('spinbutton',{name:'Player current HP',exact:true});
  const enemyHp=page.getByRole('spinbutton',{name:'Opponent current HP',exact:true});
  await playerHp.fill('67'); // HP200:67*3 >200, Torrent inactive.
  await open(own,'Surf');await range('37.9% – 45.0%','53–63 HP damage');await page.keyboard.press('Escape');
  await playerHp.fill('66'); // 66*3 <=200, Torrent active.
  await open(own,'Surf');await range('56.4% – 67.1%','79–94 HP damage');await page.keyboard.press('Escape');
  await playerHp.fill('65');
  await open(own,'Surf');await range('56.4% – 67.1%','79–94 HP damage');await page.keyboard.press('Escape');
  await weather('rain');
  await open(own,'Surf');await range('84.3% – 99.3%','118–139 HP damage');await page.keyboard.press('Escape');
  await weather('none');await playerHp.fill('200');await enemyHp.fill('1');
  await open(own,'Surf');await range('37.9% – 45.0%','53–63 HP damage');await page.keyboard.press('Escape');
  await enemyHp.fill('140');
  // Clearing HP restores the existing full-HP convention, rather than using save HP1.
  await playerHp.fill('');await playerHp.blur();
  await open(own,'Surf');await range('37.9% – 45.0%','53–63 HP damage');await page.keyboard.press('Escape');
  for(const [value,percent,hp] of [
   ['rain','56.4% – 66.4%','79–93 HP damage'],
   ['sun','20.0% – 23.6%','28–33 HP damage'],
   ['sand','37.9% – 45.0%','53–63 HP damage'],
   ['hail','37.9% – 45.0%','53–63 HP damage'],
   ['none','37.9% – 45.0%','53–63 HP damage'],
  ]) {
   await weather(value);
   await open(own,'Surf');await range(percent,hp);await page.keyboard.press('Escape');
   await open(own,'Earthquake');await range('50.7% – 60.0%','71–84 HP damage');await page.keyboard.press('Escape');
  }
  await weather('rain');await stage('Player','SpA',2);
  await open(own,'Surf');await range('111.4% – 131.4%','156–184 HP damage');await page.keyboard.press('Escape');
  await stage('Player','SpA',0);await weather('none');
  const crit=page.getByRole('checkbox',{name:'Critical Hit',exact:true});
  await crit.check();
  await open(own,'Earthquake');await range('101.4% – 120.0%','142–168 HP damage');await page.keyboard.press('Escape');
  await stage('Player','Atk',-2);await stage('Opponent','Def',2);
  await open(own,'Earthquake');await range('101.4% – 120.0%','142–168 HP damage');await page.keyboard.press('Escape');
  // Toggling Crit must leave the stored stages intact, and unchecked uses them.
  assert.equal(await page.getByRole('combobox',{name:'Player Atk stage',exact:true}).inputValue(),'-2');
  assert.equal(await page.getByRole('combobox',{name:'Opponent Def stage',exact:true}).inputValue(),'2');
  await crit.uncheck();
  await open(own,'Earthquake');await range('12.9% – 15.7%','18–22 HP damage');await page.keyboard.press('Escape');
  await crit.check();
  await stage('Player','SpA',-2);await stage('Opponent','SpD',2);
  await open(own,'Surf');await range('76.4% – 90.0%','107–126 HP damage');await page.keyboard.press('Escape');
  await weather('rain');
  await open(own,'Surf');await range('112.9% – 132.9%','158–186 HP damage');await page.keyboard.press('Escape');
  await stage('Opponent','SpA',-2);await stage('Player','SpD',2);
  await open(enemy,'Fire Punch');await range('13.0% – 15.5%','26–31 HP damage');await page.keyboard.press('Escape');
  await weather('sun');
  await open(enemy,'Fire Punch');await range('38.0% – 45.0%','76–90 HP damage');await page.keyboard.press('Escape');
  await crit.uncheck();await weather('none');
  for(const [side,stat] of [['Player','Atk'],['Opponent','Def'],['Player','SpA'],['Opponent','SpD'],['Opponent','SpA'],['Player','SpD']])await stage(side,stat,0);
  const status=async(side,value)=>page.getByRole('combobox',{name:`${side} status`,exact:true}).selectOption(value);
  await status('Player','burn');
  await open(own,'Earthquake');await range('25.7% – 30.7%','36–43 HP damage');await page.keyboard.press('Escape');
  await open(own,'Surf');await range('37.9% – 45.0%','53–63 HP damage');await page.keyboard.press('Escape');
  await crit.check();await stage('Player','Atk',-2);await stage('Opponent','Def',2);
  await open(own,'Earthquake');await range('52.1% – 62.1%','73–87 HP damage');await page.keyboard.press('Escape');
  await crit.uncheck();await stage('Player','Atk',0);await stage('Opponent','Def',0);
  // Burned defender does not reduce incoming damage; Fire Punch is Special.
  await open(enemy,'Fire Punch');await range('12.5% – 15.0%','25–30 HP damage');await page.keyboard.press('Escape');
  await status('Opponent','burn');
  await open(enemy,'Fire Punch');await range('12.5% – 15.0%','25–30 HP damage');await page.keyboard.press('Escape');
  await status('Opponent','none');
  await page.getByRole('button',{name:'Opponent Snorlax',exact:true}).tap();
  await open(enemy,'Body Slam');await range('38.5% – 45.5%','77–91 HP damage');await page.keyboard.press('Escape');
  await status('Opponent','burn');
  await open(enemy,'Body Slam');await range('19.5% – 23.0%','39–46 HP damage');await page.keyboard.press('Escape');
  await status('Player','none');
  await open(enemy,'Body Slam');await range('19.5% – 23.0%','39–46 HP damage');await page.keyboard.press('Escape');
  await status('Opponent','none');
  await page.getByRole('button',{name:'Opponent Alakazam',exact:true}).tap();
  await page.getByRole('button',{name:'Select Gengar',exact:true}).tap();
  await open(own,'Shadow Ball');await range('80.7% – 95.7%','113–134 HP damage');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Opponent Snorlax',exact:true}).tap();
  await crit.check();
  await open(own,'Shadow Ball');await range('0% – 0%','0–0 HP damage');await page.keyboard.press('Escape');
  // Stacked ability results use the same typography and scroll container.
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup?ability-groups`);
  const scenarioDialog=page.getByRole('dialog',{name:'Ability scenario fixture'});
  assert.equal(await scenarioDialog.locator('.battle-ability-result').count(),4);
  assert.equal(await scenarioDialog.locator('.battle-ability-label').count(),4);
  assert.equal(await scenarioDialog.locator('button,select,input').count(),0);
  const panel=scenarioDialog.locator('.battle-move-dialog');
  await panel.evaluate(el=>{el.style.maxHeight='170px';});
  assert.ok(await panel.evaluate(el=>el.scrollHeight>el.clientHeight));
  const bounds=await panel.boundingBox();assert.ok(bounds.y>=0 && bounds.y+bounds.height<=844);
  await panel.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await scenarioDialog.locator('.battle-core-damage-hp').last().tap();
  assert.equal(await scenarioDialog.count(),0);assert.equal(await page.locator('output').innerText(),'0');
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup?offensive-abilities`);
  await page.getByRole('button',{name:'Opponent physical',exact:true}).tap();
  const realGroups=page.getByRole('dialog').locator('.battle-ability-result');
  assert.deepEqual(await realGroups.locator('.battle-ability-label').allTextContents(),['Thick Fat','Huge Power']);
  assert.deepEqual(await realGroups.locator('.battle-core-damage-percent').allTextContents(),['11.0% – 13.0%','21.5% – 25.5%']);
  assert.deepEqual(await realGroups.locator('.battle-core-damage-hp').allTextContents(),['22–26 HP damage','43–51 HP damage']);
  await realGroups.locator('.battle-core-damage-hp').last().tap();
  await page.getByRole('button',{name:'Opponent special',exact:true}).tap();
  assert.equal(await realGroups.count(),1);assert.equal(await realGroups.locator('.battle-ability-label').count(),0);
  assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),'39–46 HP damage');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Known player physical',exact:true}).tap();
  assert.equal(await realGroups.count(),1);assert.equal(await realGroups.locator('.battle-ability-label').count(),0);
  assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),'43–51 HP damage');
  await page.keyboard.press('Escape');
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup?defensive-abilities`);
  await page.getByRole('button',{name:'fat',exact:true}).tap();
  assert.deepEqual(await realGroups.locator('.battle-ability-label').allTextContents(),['Immunity','Thick Fat']);
  assert.deepEqual(await realGroups.locator('.battle-core-damage-percent').allTextContents(),['18.0% – 21.5%','9.0% – 11.0%']);
  assert.deepEqual(await realGroups.locator('.battle-core-damage-hp').allTextContents(),['36–43 HP damage','18–22 HP damage']);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'levitate',exact:true}).tap();
  assert.equal(await realGroups.locator('.battle-core-damage-percent').innerText(),'0% – 0%');
  assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),'0–0 HP damage');
  await realGroups.locator('.battle-core-damage-hp').tap();assert.equal(await page.getByRole('dialog').count(),0);
  await page.getByRole('button',{name:'scale',exact:true}).tap();
  assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),'31–37 HP damage');
  await page.keyboard.press('Escape');
  for(const [button,labels,percentages,hp] of [
   ['water',['Water Absorb','Damp'],['0% – 0%','8.5% – 10.5%'],['0–0 HP damage','17–21 HP damage']],
   ['volt',['Volt Absorb','Illuminate'],['0% – 0%','18.0% – 21.5%'],['0–0 HP damage','36–43 HP damage']],
   ['flash',['Run Away','Flash Fire'],['8.5% – 10.5%','0% – 0%'],['17–21 HP damage','0–0 HP damage']],
   ['frozenFlash',[],['8.5% – 10.5%'],['17–21 HP damage']],
  ]) {
   await page.getByRole('button',{name:button,exact:true}).tap();
   assert.deepEqual(await realGroups.locator('.battle-ability-label').allTextContents(),labels);
   assert.deepEqual(await realGroups.locator('.battle-core-damage-percent').allTextContents(),percentages);
   assert.deepEqual(await realGroups.locator('.battle-core-damage-hp').allTextContents(),hp);
   assert.equal(await page.getByRole('dialog').locator('.battle-damage-unavailable').count(),0);
   await realGroups.locator('.battle-core-damage-hp').last().tap();
  }
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup?held-items`);
  for(const [button,percent,hp] of [
   ['band','34.0% – 40.5%','68–81 HP damage'],
   ['sand','21.0% – 25.0%','42–50 HP damage'],
   ['water','19.5% – 23.5%','39–47 HP damage'],
   ['incense','19.0% – 22.5%','38–45 HP damage'],
  ]) {
   await page.getByRole('button',{name:button,exact:true}).tap();
   assert.equal(await realGroups.locator('.battle-core-damage-percent').innerText(),percent);
   assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),hp);
   assert.equal(await realGroups.locator('.battle-ability-label').count(),0);
   await page.keyboard.press('Escape');
  }
  await page.getByRole('button',{name:'unknown',exact:true}).tap();
  assert.equal(await realGroups.locator('.battle-damage-unavailable').innerText(),'Damage unavailable for this matchup.');
  await page.keyboard.press('Escape');
  await page.goto(`${server.resolvedUrls.local[0]}__core-damage-popup?specialized-items`);
  for(const [button,percent,hp] of [
   ['light','53.5% – 63.5%','107–127 HP damage'],
   ['club','57.0% – 67.5%','114–135 HP damage'],
   ['tooth','53.5% – 63.5%','107–127 HP damage'],
   ['scale','4.5% – 5.5%','9–11 HP damage'],
   ['dew','18.0% – 21.5%','36–43 HP damage'],
   ['powderKnown','11.5% – 14.0%','23–28 HP damage'],
   ['powderTransformed','23.0% – 27.5%','46–55 HP damage'],
  ]) {
   await page.getByRole('button',{name:button,exact:true}).tap();
   assert.equal(await realGroups.locator('.battle-core-damage-percent').innerText(),percent);
   assert.equal(await realGroups.locator('.battle-core-damage-hp').innerText(),hp);
   await realGroups.locator('.battle-core-damage-hp').tap();
  }
  await page.getByRole('button',{name:'powderUnknown',exact:true}).tap();
  assert.equal(await realGroups.locator('.battle-damage-unavailable').innerText(),'Damage unavailable for this matchup.');
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS WebKit ${width}px: both directions, maximum HP, move/Pokémon updates, stage/weather/critical/burn controls in both directions, unavailable, immunity and compact layout.`);
 }
} finally {await browser?.close();await server.close();}
