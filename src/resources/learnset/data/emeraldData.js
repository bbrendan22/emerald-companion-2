import reference from '../../../data/reference.json' with {type:'json'};
export const moveNames=Object.fromEntries(Object.entries(reference.moves).map(([id,move])=>[id,move.name]));
