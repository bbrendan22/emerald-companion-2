import {ivNatures} from '../../battle/stats.js';

// Cartridge nature order differs from the chart's presentation order.
const cartridgeStats = ['attack', 'defense', 'speed', 'spAttack', 'spDefense'];
export const natureChartStats = [
  {key: 'attack', short: 'Atk', name: 'Attack'},
  {key: 'defense', short: 'Def', name: 'Defense'},
  {key: 'spAttack', short: 'SpA', name: 'Sp. Attack'},
  {key: 'spDefense', short: 'SpD', name: 'Sp. Defense'},
  {key: 'speed', short: 'Spe', name: 'Speed'},
];
export const natureChartRows = natureChartStats.map(down => ({
  ...down,
  cells: natureChartStats.map(up => ({
    name: ivNatures[cartridgeStats.indexOf(up.key) * 5 + cartridgeStats.indexOf(down.key)],
    neutral: up.key === down.key,
  })),
}));
