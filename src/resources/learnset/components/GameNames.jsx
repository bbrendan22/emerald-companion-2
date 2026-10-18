import React from 'react';
const colors = {
  Ruby: '#b52d43', R: '#b52d43', Sapphire: '#245cbb', S: '#245cbb',
  Emerald: '#08755d', E: '#08755d', FireRed: '#c44a1b', FR: '#c44a1b',
  LeafGreen: '#438022', LG: '#438022', Colosseum: '#6552a3', Colo: '#6552a3',
  XD: '#903a9b', 'Pokémon Box': '#956b16',
}

export default function GameNames({ children }) {
  return String(children).split(/(Pokémon Box|FireRed|LeafGreen|Colosseum|Emerald|Sapphire|Ruby|\bColo\b|\bXD\b|\bFR\b|\bLG\b|\bR\b|\bS\b|\bE\b)/).map((part, index) =>
    colors[part] ? <span key={index} style={{ color: colors[part], fontWeight: 600 }}>{part}</span> : part,
  )
}
