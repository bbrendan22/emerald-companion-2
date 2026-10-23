import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createBattleState, battleReducer} from '../src/battle/battleState.js';

// Vite transforms the app's JSX while leaving browser state untouched.
test('compact teams show empty controls, selected trainer and existing box sprites', async () => {
  const server = await createServer({server:{middlewareMode:true}, appType:'custom'});
  try {
    const {default:TeamSections} = await server.ssrLoadModule('/src/ui/components/BattleTeamSections.jsx');
    const render = (state, records=[]) => renderToStaticMarkup(React.createElement(TeamSections,{state,records}));
    const state = createBattleState();
    const empty = render(state);
    assert.match(empty,/Choose opponent trainer: Opponent/);
    assert.equal((empty.match(/Add Pokémon/g) ?? []).length,6);
    assert.doesNotMatch(empty,/<img/);
    const selected = battleReducer(state,{type:'trainer',key:'Anabel Silver'});
    assert.deepEqual(selected.opponents,[]);
    const trainer = render(selected);
    assert.match(trainer,/Anabel; double-tap to clear opponent trainer and team/);
    assert.match(trainer,/trainers\/frontier\/salon_maiden_anabel.png/);
    assert.equal((trainer.match(/Add Pokémon/g) ?? []).length,6);
    const filled = render({...selected,team:['owned'],opponents:['Sunkern 1']},[{identity:'owned',name:'Pikachu',dex:25}]);
    assert.match(filled,/pokemon\/box\/25.png/);
    assert.match(filled,/pokemon\/box\/191.png/);
    assert.equal((filled.match(/Add Pokémon/g) ?? []).length,4);
  } finally {
    await server.close();
  }
});
