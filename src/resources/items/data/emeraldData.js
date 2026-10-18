import reference from '../../../data/reference.json' with {type:'json'};
import profile from '../../../data/profileReference.json' with {type:'json'};
export const itemNames=profile.itemNames;
export const moveNames=Object.fromEntries(Object.entries(reference.moves).map(([id,move])=>[id,move.name]));
