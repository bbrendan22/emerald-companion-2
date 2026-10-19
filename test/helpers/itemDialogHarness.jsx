import React from 'react';
import {createRoot} from 'react-dom/client';
import ItemDialog from '../../src/resources/items/components/ItemDialog.jsx';
import '../../src/ui/styles/resources.css';
const root=createRoot(document.getElementById('root'));
window.openItem=id=>root.render(<ItemDialog key={String(id)} itemId={id} onClose={()=>root.render(null)} />);
window.openItem('200');
