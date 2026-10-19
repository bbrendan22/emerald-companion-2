import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import PokemonName from '../src/ui/components/PokemonName.js';
import {speciesByName} from '../src/battle/reference.js';
const render = name => renderToStaticMarkup(React.createElement(PokemonName, null, name));
const text = html => html.replace(/<[^>]*>/g, '');

test('shared Nidoran renderer preserves species text, case, set labels and repeated names', () => {
  for (const name of ['Nidoran♂','Nidoran♀','NIDORAN♂','Nidoran♀ 1','Trade Nidoran♂, then evolve Nidoran♀.','Nidoran♂\uFE0E']) {
    const html=render(name);
    assert.equal(text(html),name);
    assert.equal((html.match(/class="pokemon-species-name"/g) ?? []).length, (name.match(/Nidoran[♂♀]/gi) ?? []).length);
    assert.ok(html.includes('pokemon-species-symbol-text'));
    assert.ok(html.includes('aria-hidden="true"'));
    assert.ok(html.includes('<svg'));
    assert.ok(!html.includes('Nidoran '));
  }
});
test('all other names and separate individual gender indicators render without wrappers', () => {
  for (const name of ['Bulbasaur','Nidorina','Nidorino','Nidoqueen','Nidoking','Pikachu ♂','Nidoran ♂','Male','Female','♂','♀','']) assert.equal(render(name),name);
  assert.equal(PokemonName({children:42}),42);
});
test('Nidoran National Dex identities remain distinct and unchanged', () => {
  assert.equal(speciesByName.get('nidoran♀').nationalDexId,29);
  assert.equal(speciesByName.get('nidoran♂').nationalDexId,32);
  assert.equal(text(render('Nidoran♀')),speciesByName.get('nidoran♀').name);
  assert.equal(text(render('Nidoran♂')),speciesByName.get('nidoran♂').name);
});
