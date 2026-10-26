import {alexasState,swampert,observe} from './alexasAerodactyl.js';
import {battleReducer} from '../../src/battle/battleState.js';
import {battleMove} from '../../src/battle/reference.js';
import {evaluateFrontierCandidates} from '../../src/battle/frontierCandidateDamage.js';
import {aggregateFrontierDamage} from '../../src/battle/frontierDamageAggregation.js';
import {frontierDamageDisplayParts} from '../../src/battle/frontierDamagePresentation.js';
export function performanceCases() {
 const one=battleReducer(observe(alexasState(),'item','Choice Band'),{type:'observeOpponentAbility',slot:0,speciesId:142,value:'Pressure'});
 const dynamic=alexasState();dynamic.matchupConditions.player[0]={currentHp:90,status:'none',stages:{}};
 const rain=alexasState('Doubles');rain.field.weather='rain';
 return [
  {name:'one-set-one-ability',state:one,move:'Ice Beam'},
  {name:'four-sets-two-abilities',state:alexasState(),move:'Ice Beam'},
  {name:'four-sets-doubles-spread',state:alexasState('Doubles'),move:'Surf'},
  {name:'four-sets-five-hit',state:alexasState(),move:'DoubleSlap',options:{selection:'5'}},
  {name:'hp-dependent-power',state:dynamic,move:'Eruption'},
  {name:'uncertain-weather-ball',state:rain,move:'Weather Ball'},
  {name:'unresolved-trace',state:alexasState(),move:'Ice Beam',player:{...swampert,dex:282,ability:'Trace'}},
  {name:'reverse-two-sets',state:observe(alexasState(),0,'Earthquake'),move:'Earthquake',options:{direction:'enemy'}},
 ];
}
export function calculateCase(value) {
 const summary=aggregateFrontierDamage(evaluateFrontierCandidates(value.state,value.player??swampert,battleMove(value.move),value.options));
 frontierDamageDisplayParts(summary);
 return summary;
}
export function statistics(samples) {
 const sorted=[...samples].sort((a,b)=>a-b);
 return {samples:samples.length,minMs:sorted[0],medianMs:sorted[Math.floor(sorted.length/2)],
  p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),meanMs:samples.reduce((a,b)=>a+b,0)/samples.length};
}
