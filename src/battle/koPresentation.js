import {calculateKoProbabilities} from './koProbability.js';

// Classification uses exact counts before rounding for display.
function percentage(chance) {
  if(chance.numerator===0n)return '0.0';
  if(chance.numerator===chance.denominator)return '100.0';
  const rounded=(chance.probability*100).toFixed(1);
  return rounded==='0.0'?'<0.1':rounded==='100.0'?'>99.9':rounded;
}
export function koDisplayLabels(ko) {
  if(ko?.availability!=='available')return [];
  const labels=[];
  for(const chance of ko.chances) {
    const min=chance.min??chance,max=chance.max??chance;
    if(max.numerator===0n)continue;
    const label=chance.attacks===1?'OHKO':`${chance.attacks}HKO`;
    if(min.numerator===min.denominator&&max.numerator===max.denominator) {
      labels.push(`Guaranteed ${label}`);
      break;
    }
    const equal=min.numerator*max.denominator===max.numerator*min.denominator;
    labels.push(`${equal?percentage(min):`${percentage(min)}–${percentage(max)}`}% ${label}`);
  }
  return labels;
}

// Scalar ability uncertainty is a range over complete raw scenarios, never
// over the formatted damage groups. Missing leaves suppress the whole row.
export function scalarKoDisplayResult(scenarios,defender,move) {
  const hp=defender?.currentHp===null?defender?.stats?.hp:defender?.currentHp;
  if(!scenarios?.length||!Number.isInteger(defender?.stats?.hp)||hp>defender.stats.hp)return null;
  const results=scenarios.map(scenario=>scenario.availability==='available'
    ?calculateKoProbabilities(scenario.result,hp,move):null);
  if(results.some(result=>result?.availability!=='available'))return null;
  const less=(a,b)=>a.numerator*b.denominator<b.numerator*a.denominator;
  return {availability:'available',chances:[0,1,2].map(index=>{
    const values=results.map(result=>result.chances[index]);
    return {attacks:index+1,min:values.reduce((a,b)=>less(a,b)?a:b),max:values.reduce((a,b)=>less(a,b)?b:a)};
  })};
}
