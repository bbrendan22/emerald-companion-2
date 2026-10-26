import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {preview} from 'vite';
import {makeSave,makePokemon} from './fixtures/synthetic.js';
import {loadStoredSave} from '../src/storage/saveStorage.js';
import {identifyPokemon} from '../src/storage/pokemonRoles.js';
import {toBattlePokemon} from '../src/battle/pokemonAdapter.js';
import {frontierPokemon} from '../src/battle/data/frontierPokemon.js';
const useWebKit=process.argv.includes('--webkit');
const server=await preview({preview:{host:'127.0.0.1',port:useWebKit?5237:5236,strictPort:true}});
const browser=await(useWebKit?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'chrome'}));
const storage=new Uint8Array(33744);storage.set(makePokemon({species:1,moveIds:[174,33,0,0]}),4);
const encoded=Buffer.from(makeSave({blocks:{storage}})).toString('base64');
const mons=identifyPokemon(loadStoredSave({getItem:()=>encoded}).collection.records).map(toBattlePokemon).filter(Boolean);
const roles=Object.fromEntries(mons.map(mon=>[mon.identity,'Frontier']));
try {
 await mkdir('artifacts/identification',{recursive:true});
 for(const width of [320,375,430,1440]) {
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<500,hasTouch:width<500,serviceWorkers:'block'});
  await context.addInitScript(({encoded,roles})=>{localStorage.setItem('emerald-companion-2.save.v1',encoded);localStorage.setItem('emerald-companion-2.roles.v1',JSON.stringify(roles));},{encoded,roles});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  const tap=async el=>width<500?el.tap():el.click();
  await page.goto(new URL('/emerald-companion-2/',server.resolvedUrls.local[0]).href);
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Battle',exact:true}).click();
  const opponent=page.getByRole('region',{name:'Opponent Team',exact:true});
  const slots=opponent.locator('.battle-compact-slot');
  const mine=page.getByRole('group',{name:'My matchup Pokémon',exact:true}), enemy=page.getByRole('group',{name:'Opponent matchup Pokémon',exact:true});
  const list=page.locator('.battle-possible-set-list > button');
  const add=async(slot,name)=>{await tap(slots.nth(slot));const popup=page.getByRole('dialog',{name:'Select opponent Pokémon'});await popup.getByRole('searchbox').fill(name);await tap(popup.getByRole('button',{name:`Select Pokémon ${name}`,exact:true}));};
  const observe=async(field,value)=>{const label=field==='item'?'Opponent held item':`Opponent move ${field+1}`;await page.getByRole('combobox',{name:label,exact:true}).selectOption(value);};
  const playerSlots=page.getByRole('region',{name:'My Team',exact:true}).locator('.battle-compact-slot');
  await tap(playerSlots.first());await tap(page.getByRole('dialog',{name:'My Team selection'}).locator(`[data-pokemon-id="${mons[0].identity}"]`));await tap(playerSlots.first());
  await add(0,'Metagross');await add(1,'Gardevoir');await tap(slots.nth(0));
  assert.equal(await list.count(),8);
  assert.deepEqual(await enemy.locator('.battle-active-moves select option:checked').allTextContents(),['Move 1','Move 2','Move 3','Move 4']);
  assert.equal(await enemy.getByRole('combobox').count(),5);
  assert.equal(await enemy.getByRole('combobox',{name:'Opponent held item'}).inputValue(),'');
  assert.equal(await enemy.locator('.battle-active-item img').count(),0,'unknown items have no sprite');
  assert.equal(await enemy.getByText(/Observed|Inferred/).count(),0);
  assert.ok(await enemy.locator('select').evaluateAll(selects=>selects.every(el=>el.tagName==='SELECT' && getComputedStyle(el).fontSize==='16px')));
  assert.ok(await page.locator('.battle-compact-teams > section').evaluateAll(sections=>sections.every(el=>el.getBoundingClientRect().height<=72)),'compact trainer and team rows');

  assert.equal(await mine.locator('.battle-active-facts dt').count(),0);
  assert.equal(await mine.locator('.battle-active-ability').innerText(),mons[0].ability);
  assert.equal(await enemy.locator('.battle-active-ability').innerText(),'Clear Body');
  assert.deepEqual(await mine.locator('.battle-active-stats dt').allTextContents(),['HP','ATK','DEF','SPA','SPD','SPE']);
  assert.deepEqual(await mine.locator('.battle-active-stats dd').allTextContents(),['hp','attack','defense','spAttack','spDefense','speed'].map(key=>String(mons[0].stats[key])));
  assert.deepEqual(await enemy.locator('.battle-active-stats dd').allTextContents(),Array(6).fill('—'));
  assert.equal(await mine.locator('.battle-active-move-pp').first().innerText(),'PP 17');
  assert.deepEqual(await enemy.locator('.battle-active-move-pp').allTextContents(),Array(4).fill('—'));
  assert.equal(await enemy.locator('.battle-active-moves li > span[aria-hidden="true"]').count(),4,'empty move slots reserve their icon column');
  assert.equal(await mine.locator('.battle-active-move-effectiveness').nth(1).innerText(),'0.5×','Tackle is resisted by Metagross');
  const sets=frontierPokemon.filter(set=>set.species==='Metagross');const target=sets[sets.length-1];
  await observe('item',target.item);assert.equal(await list.count(),sets.filter(set=>set.item===target.item).length===1?0:sets.filter(set=>set.item===target.item).length);
  await observe('item','');assert.equal(await list.count(),8);
  // A single observed move identifies a set; only that original field stays editable.
  await observe(0,'Aerial Ace');assert.equal(await list.count(),0);assert.equal(await page.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);
  assert.equal(await enemy.getByRole('combobox').count(),1);
  assert.equal(await enemy.locator('.is-inferred').count(),4);
  assert.equal(await enemy.locator('.is-inferred select, .is-inferred .battle-observation-arrow').count(),0);
  assert.equal(await enemy.locator('.battle-observation-arrow').count(),1);
  assert.equal(await enemy.locator('.battle-active-item img').count(),1);
  await tap(enemy.locator('.battle-active-moves .is-inferred').first());
  assert.equal(await enemy.getByRole('combobox').count(),1,'static inference cannot open a selector');
  assert.equal(await page.getByRole('dialog').count(),0);
  await observe(0,'Psych Up');assert.equal(await enemy.locator('.battle-matchup-species').innerText(),'Metagross 2');assert.equal(await list.count(),0);
  assert.equal(await enemy.locator('.battle-active-item').innerText(),'Lum Berry');
  await observe(0,'');assert.equal(await list.count(),8);assert.equal(await enemy.getByRole('combobox').count(),5);
  // A unique item keeps the item editable and all four moves static.
  await observe('item','Leftovers');assert.equal(await list.count(),0);assert.equal(await page.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);
  assert.equal(await enemy.locator('.battle-active-moves select, .battle-active-moves .battle-observation-arrow').count(),0);
  assert.equal(await enemy.getByRole('combobox').count(),1);
  await observe('item','Lum Berry');assert.equal(await enemy.locator('.battle-matchup-species').innerText(),'Metagross 2');assert.equal(await list.count(),0);
  assert.ok((await enemy.locator('.battle-active-moves').innerText()).includes('Psych Up'));
  await observe('item','');assert.equal(await list.count(),8);assert.equal(await enemy.getByRole('combobox').count(),5);
  // Mixed observations preserve one another when either original selection is cleared.
  await observe('item','Quick Claw');assert.equal(await list.count(),3);
  await observe(0,'Psychic');assert.equal(await enemy.locator('.battle-matchup-species').innerText(),'Metagross 4');assert.equal(await list.count(),0);
  assert.equal(await enemy.getByRole('combobox').count(),2);
  assert.equal(await enemy.locator('.is-inferred select, .is-inferred .battle-observation-arrow').count(),0);
  await observe('item','');assert.equal(await list.count(),2);
  assert.equal(await enemy.getByRole('combobox',{name:'Opponent move 1',exact:true}).inputValue(),'Psychic');
  assert.equal(await enemy.getByRole('combobox').count(),5);assert.equal(await enemy.locator('.is-inferred').count(),0);
  await observe('item','Quick Claw');await observe(0,'');assert.equal(await list.count(),3);
  assert.equal(await enemy.getByRole('combobox',{name:'Opponent held item',exact:true}).inputValue(),'Quick Claw');
  await observe('item','');assert.equal(await list.count(),8);
  const observed=[];
  for(let i=0;i<4;i++) {observed.push(target.moves[i]);await observe(i,target.moves[i]);const remaining=sets.filter(set=>observed.every(move=>set.moves.includes(move))).length;assert.equal(await list.count(),remaining===1?0:remaining);if(remaining===1)break;}
  assert.equal(await enemy.locator('.battle-active-moves li').first().locator('img').count(),1,'selected opponent move displays its type icon');
  assert.equal(await enemy.locator('.battle-active-move-pp').first().innerText(),'PP 10','Meteor Mash displays reference base PP');
  assert.equal(await enemy.locator('.battle-active-move-effectiveness').first().innerText(),'1×','Meteor Mash is neutral against Bulbasaur');
  assert.equal(await list.count(),0);assert.equal(await page.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);assert.ok(await enemy.locator('.is-inferred').count()>0);
  assert.equal(await enemy.locator('.battle-active-ability').innerText(),'Clear Body');
  assert.equal(await enemy.getByRole('combobox').count(),observed.length);
  assert.equal(await enemy.locator('.is-inferred select, .is-inferred .battle-observation-arrow').count(),0);
  assert.equal(await enemy.locator('.battle-active-moves li').nth(3).locator('img').count(),1,'inferred move retains its type icon');
  assert.ok((await enemy.locator('.battle-active-move-pp').nth(3).innerText()).startsWith('PP '));
  assert.equal(await page.getByRole('dialog').count(),0,'observations use native selects, with no custom popup');
  for(let i=0;i<observed.length;i++)await observe(i,'');assert.equal(await list.count(),8);assert.equal(await enemy.locator('.is-inferred').count(),0);
  const cooper=sets.find(set=>set.id==='Metagross 1');const incompatible=sets.flatMap(set=>set.moves).find(move=>!cooper.moves.includes(move));
  await observe(0,incompatible);
  await tap(opponent.locator('.battle-opponent-trigger'));const trainers=page.getByRole('dialog',{name:'Select opponent trainer'});await trainers.getByRole('searchbox').fill('COOPER');await tap(trainers.getByRole('button',{name:'Select trainer COOPER',exact:true}));
  assert.equal(await list.count(),0);await page.getByRole('status').filter({hasText:'No matching sets'}).waitFor();
  assert.equal(await page.getByRole('combobox',{name:'Opponent move 1',exact:true}).inputValue(),incompatible);
  await observe(0,'');assert.equal(await list.count(),0);assert.equal(await page.getByRole('region',{name:'Possible Sets',exact:true}).count(),0);assert.ok(await enemy.locator('.is-inferred').count()>0);
  await tap(slots.nth(1));assert.equal(await enemy.locator('.battle-active-ability').innerText(),'Synchronize / Trace');
  assert.equal(await enemy.getByText('Observed',{exact:true}).count(),0);
  await tap(slots.nth(0));
  assert.ok(await page.locator('.battle-matchup-pair').evaluate(pair=>{
   const [mine,enemy]=pair.children, rect=el=>el.getBoundingClientRect();
   const sides=[mine,enemy];
   return Math.abs(rect(mine.querySelector('.battle-active-identity')).top-rect(enemy.querySelector('.battle-active-identity')).top)<1
     && sides.every(side=>{
       const sprite=rect(side.querySelector('.battle-matchup-sprite'));
       const item=rect(side.querySelector('.battle-active-item'));
       const ability=rect(side.querySelector('.battle-active-ability'));
       const centered=box=>Math.abs(box.x+box.width/2-sprite.x-sprite.width/2)<1;
       return centered(item)&&centered(ability)&&sprite.bottom<=item.top&&item.bottom<=ability.top;
     });
  }),'aligned headers and centered item/ability footer beneath fixed sprite containers');
  assert.ok(!(await mine.locator('.battle-matchup-sprite').getAttribute('src')).includes('/back/'));
  assert.ok(!(await enemy.locator('.battle-matchup-sprite').getAttribute('src')).includes('/back/'));
  await page.locator('.battle-matchup-sprite').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  assert.ok(await page.locator('.battle-active-meta').evaluateAll(headers=>headers.every(header=>{
   const icons=header.querySelector('.battle-active-types').getBoundingClientRect(),level=header.querySelector('small').getBoundingClientRect();
   return icons.right<=level.left&&Math.abs(icons.y+icons.height/2-level.y-level.height/2)<1;
  })),'type icons and level share one horizontal line');
  assert.ok(await opponent.locator('.battle-opponent-identity').evaluate(el=>{
   const name=el.querySelector('.battle-opponent-name').getBoundingClientRect(),cls=el.querySelector('.battle-opponent-class').getBoundingClientRect();
   return name.right<cls.left&&Math.abs(name.y+name.height/2-cls.y-cls.height/2)<1;
  }),'trainer name and muted class share one line');
  assert.equal(await enemy.locator('.battle-active-item .battle-set-item img').count(),1);
  await enemy.locator('.battle-active-item .battle-set-item img').evaluate(img=>img.decode());
  assert.ok(await enemy.locator('.battle-observation-select:not(.is-inferred) .battle-observation-display').evaluateAll(rows=>rows.every(row=>{
   const text=row.firstElementChild.getBoundingClientRect(),arrow=row.lastElementChild.getBoundingClientRect();
   return arrow.left>=text.right-1&&arrow.left-text.right<=4;
  })),'arrows sit immediately after their text/item group');
  assert.ok(await page.locator('.battle-active-stats').evaluateAll(tables=>tables.every(table=>{
   const boxes=[...table.children].map(el=>el.getBoundingClientRect()),bounds=table.getBoundingClientRect();
   return boxes.every(box=>Math.abs(box.y-boxes[0].y)<1&&Math.abs(box.width-boxes[0].width)<1&&box.right<=bounds.right+1);
  })));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(await page.locator('.battle-active-moves').evaluateAll(lists=>{
   const rect=el=>el.getBoundingClientRect(), rows=lists.map(list=>[...list.children]);
   return rows.every(side=>side.every((row,i)=>{
    const cells=[...row.children].map(rect), other=[...rows[1][i].children].map(rect), box=rect(row);
    const center=cell=>cell.y+cell.height/2;
    return cells.length===4 && cells.every(cell=>Math.abs(center(cell)-center(cells[0]))<1&&cell.right<=box.right+1)
      && cells.slice(1).every((cell,j)=>cell.x>=cells[j].right)
      && Math.abs(cells[1].x-box.x-(other[1].x-rect(rows[1][i]).x))<1
      && Math.abs(cells[2].x-box.x-(other[2].x-rect(rows[1][i]).x))<1
      && Math.abs(cells[3].x-box.x-(other[3].x-rect(rows[1][i]).x))<1;
   }));
  }),'four single-line icon/name/PP/effectiveness rows with matching columns on both sides');
  assert.ok(await page.locator('.battle-active-move-pp, .battle-active-move-effectiveness').evaluateAll(cells=>cells.every(cell=>cell.scrollWidth<=cell.clientWidth)),'PP and effectiveness remain fully visible');
  assert.ok(await enemy.locator('.battle-active-moves li').evaluateAll(rows=>rows.every(el=>el.getBoundingClientRect().height<=30)),'tight native move rows');
  assert.ok(await enemy.locator('.battle-observation-select.is-inferred').evaluateAll(values=>values.every(el=>getComputedStyle(el).color==='rgb(181, 187, 197)')),'inferred values use the normal text styling');
  await tap(page.getByRole('button',{name:'Battle Rules',exact:true}));
  await page.getByRole('dialog',{name:'Battle Rules',exact:true}).getByLabel('Battle Type').selectOption('Doubles');await page.keyboard.press('Escape');
  assert.equal(await slots.count(),4);
  assert.ok(await page.locator('.battle-compact-teams').evaluate(teams=>{
   const sections=[...teams.children], rect=el=>el.getBoundingClientRect();
   const heights=sections.map(el=>rect(el).height);
   return Math.abs(heights[0]-heights[1])<1 && sections.every(section=>{
    const sprite=section.querySelector('.battle-compact-trainer'), slots=section.querySelector('.battle-compact-slots');
    if(!sprite)return true;
    return rect(sprite).left<rect(slots).left && rect(sprite).top>=rect(section.querySelector('h3')).bottom
      && rect(sprite).bottom<=rect(slots).bottom;
   });
  }),'equal-height teams: names above portraits and four slots');
  assert.ok(await page.locator('.battle-compact-slots').evaluateAll(rows=>rows.every(row=>{const box=row.getBoundingClientRect();return [...row.children].every(el=>{const r=el.getBoundingClientRect();return r.y===row.children[0].getBoundingClientRect().y&&r.right<=box.right+1;});})), 'Doubles team slots fit on one row');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/identification/${useWebKit?'webkit':'chrome'}-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS identification ${width}px: observations, compatible options, items, inference, clearing, trainer restriction, zero-match retention, species reset, Emerald abilities and horizontal stats.`);
 }
} finally {await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
