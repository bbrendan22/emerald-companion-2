import React from 'react';

// Keep the actual character for text/copy/accessibility, but draw its visible
// shape without OS fallback-font metrics (which differ on iPhone and macOS).
function SpeciesSymbol({text}) {
  const female = text[0] === '♀';
  return React.createElement('span', {className:`pokemon-species-symbol${female ? ' pokemon-species-symbol-female' : ''}`},
    React.createElement('span', {className:'pokemon-species-symbol-text'}, text),
    React.createElement('svg', {viewBox:female ? '3 1 14 22' : '0 3 20 19', 'aria-hidden':true, focusable:false, fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round'},
      React.createElement('circle', {cx:female ? 10 : 7, cy:female ? 7 : 16, r:5}),
      React.createElement('path', {d:female ? 'M10 12V22M6 18H14' : 'M10.5 12.5L18 5M12 5H18V11'})));
}

// Match only the species token; individual Pokémon gender UI is untouched.
export default function PokemonName({children}) {
  if (typeof children !== 'string' || !/\bNidoran[♀♂]/i.test(children)) return children;
  return React.createElement(React.Fragment, null,
    children.split(/(\bNidoran[♀♂][\uFE0E\uFE0F]?)/gi).map((part, index) =>
      /^Nidoran[♀♂][\uFE0E\uFE0F]?$/i.test(part)
        ? React.createElement('span', {className:'pokemon-species-name', key:index},
          part.slice(0, 7), React.createElement(SpeciesSymbol, {text:part.slice(7)}))
        : part));
}
