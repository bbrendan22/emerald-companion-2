// Visit the same canonical cases as the former all-at-once popup tests, now
// through the real native controls. Keep their independent damage expectations.
export function selectedScenarioSections(dialog,labels) {
 const at=async index=>{
  if(index<0)index=labels.length+index;
  const label=labels[index];
  if(label.startsWith('MAGNITUDE'))await dialog.getByRole('combobox',{name:'Magnitude',exact:true}).selectOption(`magnitude-${label.split(' ')[1]}`);
  else if(label.startsWith('DAMAGING PRESENT'))await dialog.getByRole('combobox',{name:'Power',exact:true}).selectOption(`present-${label.split(' ')[3]}`);
  else if(label.startsWith('HIT')){
   const stage=label.split(' ')[1].replace('+','');
   const curl=dialog.getByRole('checkbox',{name:'Defense Curl',exact:true});
   await dialog.getByRole('combobox',{name:await curl.count()?'Turn':'Power',exact:true}).selectOption(`stage-${stage}`);
   if(await curl.count())await curl.setChecked(label.includes('DEFENSE CURL'));
  }else await dialog.getByRole('combobox',{name:'Scenario',exact:true}).selectOption(label.startsWith('TARGET')?'switching':label.startsWith('AFTER')?'damaged':'normal');
  const power=label.match(/(\d+) POWER/)[1];
  const displayed=await dialog.locator('dd').first().innerText();
  if(displayed!==power)throw new Error(`Expected selected power ${power}; got ${displayed}`);
  return dialog.getByRole('group',{name:label,exact:true});
 };
 return {at,async *entries(){for(let i=0;i<labels.length;i++)yield [i,await at(i)];},async *[Symbol.asyncIterator](){for(let i=0;i<labels.length;i++)yield await at(i);}};
}
