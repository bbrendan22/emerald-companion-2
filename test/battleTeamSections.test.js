import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createBattleState, battleReducer} from '../src/battle/battleState.js';

test('My Team renders visible native selects and independent sprite buttons', async () => {
  const server = await createServer({server:{middlewareMode:true,hmr:false}, appType:'custom'});
  try {
    const {default:TeamSections} = await server.ssrLoadModule('/src/ui/components/BattleTeamSections.jsx');
    const pool=[{identity:'a',name:'Swampert',dex:260,level:72},{identity:'b',name:'Swampert',dex:260,level:50}];
    const render=state=>renderToStaticMarkup(React.createElement(TeamSections,{state,frontierPool:pool}));
    const state=createBattleState();
    const myTeam=html=>html.split('<section aria-label="My Team">')[1].split('</section>')[0];
    const singles=myTeam(render(state));
    assert.equal((singles.match(/<select/g)??[]).length,3);
    assert.equal((singles.match(/<option value="" selected="">Empty slot<\/option>/g)??[]).length,3);
    assert.doesNotMatch(singles,/dialog|battle-player-sprite/);
    const doubles=myTeam(render({...state,rules:{...state.rules,format:'Doubles',teamSize:4},team:['a','b'],matchup:{player:'a'}}));
    assert.equal((doubles.match(/<select/g)??[]).length,4);
    assert.match(doubles,/Select My Team slot 1, Swampert · Lv. 72/);
    assert.match(doubles,/Select My Team slot 2, Swampert · Lv. 50/);
    const opponent=html=>html.split('<section aria-label="Opponent Team">')[1];
    assert.equal(opponent(render({...state,team:['a'],matchup:{player:'a'}})),opponent(render(state)));
  } finally {await server.close();}
});

test('active position selection replaces, clears and rejects same individual while allowing same species', () => {
  const pool = [{identity:'a',name:'Swampert'},{identity:'b',name:'Swampert'}];
  let state = createBattleState();
  const select = (slot,identity) => battleReducer(state,{type:'selectPlayerPosition',slot,identity,pool});
  state = select(0,'a');
  assert.equal(state.matchup.player,'a');
  assert.equal(select(3,'b'),state);
  state = select(2,'b');
  assert.equal(state.team[2],'b');
  state = select(2,null);
  assert.equal(select(0,'missing'),state);
  state = battleReducer(state,{type:'rules',patch:{format:'Doubles'}});
  assert.deepEqual(state.team,[]);
  state = select(0,'a');
  state = select(1,'b');
  assert.deepEqual(state.team,['a','b']);
  assert.equal(state.matchup.player,'a');
  state = select(1,null);
  state = select(2,null);
  state = select(3,'b');
  assert.equal(state.team[3],'b');
  state = select(3,null);
  state = select(1,'b');
  assert.equal(select(0,'b'),state);
  state = select(1,null);
  assert.equal(state.matchup.player,'a');
  state = select(0,'b');
  assert.equal(state.matchup.player,'b');
  state = select(0,null);
  assert.equal(state.matchup.player,null);
  assert.deepEqual(state.team,[null,null,null,null]);
});
