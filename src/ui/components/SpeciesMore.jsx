import React from 'react';
import {speciesMore} from '../../resources/speciesMore.js';
export default function SpeciesMore({dex}) {
 return <dl className="species-more">{speciesMore(dex)?.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
