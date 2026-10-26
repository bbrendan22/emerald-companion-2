import {conditionalCases} from './conditionalDamage.js';

// Selection metadata only: damage continues to use the existing canonical cases.
export function conditionalSelector(move) {
 const cases=conditionalCases(move);
 if(!cases.length)return null;
 const turns=[205,301].includes(move.id);
 const label=turns?'Turn':move.id===222?'Magnitude':[228,279].includes(move.id)?'Scenario':'Power';
 const options=cases.filter(c=>!c.defenseCurl).map(c=>({value:c.id,label:String(
  turns?c.stage:move.id===222?c.level:move.id===228?(c.id==='normal'?'Normal':'Target Switching'):
  move.id===279?(c.id==='normal'?'Normal':'Took Damage'):c.power)}));
 return {label,options,defenseCurl:turns,defaultValue:move.id===222?'magnitude-7':options[0].value};
}
export function selectedConditionalCase(move,value,defenseCurl=false) {
 const config=conditionalSelector(move);
 if(!config)return null;
 const valid=config.options.some(option=>option.value===value)?value:config.defaultValue;
 return conditionalCases(move).find(c=>c.id===`${valid}${config.defenseCurl&&defenseCurl?'-curl':''}`);
}
export function selectConditionalAbilityDamage(abilityDamage,condition) {
 if(!condition||abilityDamage.kind!=='conditional-ability-scenarios')return abilityDamage;
 return {...abilityDamage,conditions:abilityDamage.conditions.filter(c=>c.id===condition.id)};
}
