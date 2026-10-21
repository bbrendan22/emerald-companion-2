import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customNickname} from '../src/ui/pokemonDisplayName.js';
test('display names distinguish custom nicknames from missing and default species names',()=>{
 for(const nickname of [undefined, '', '  ', 'Electrode', 'ELECTRODE', ' electrode '])assert.equal(customNickname({speciesName:'Electrode',nickname}),null);
 assert.equal(customNickname({speciesName:'Electrode',nickname:'VOLT'}),'VOLT');
});
