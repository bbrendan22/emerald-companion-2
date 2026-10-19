import React from 'react';
import {createRoot} from 'react-dom/client';
import AbilityDialog from '../../src/resources/abilities/AbilityDialog.jsx';
const root=createRoot(document.getElementById('root'));
window.openAbility=id=>root.render(<AbilityDialog abilityId={id} onClose={()=>root.render(null)} />);
window.openAbility('26');
