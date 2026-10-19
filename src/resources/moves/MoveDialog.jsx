import React from 'react';
import {catalogEntries} from '../search.js';
import ResourceDialog from '../components/ResourceDialog.jsx';
import MoveSummary from './MoveSummary.jsx';
import MoveLearners from './MoveLearners.jsx';

// Controlled by a canonical move ID, independently of the database list.
export default function MoveDialog({moveId, onClose, returnFocus = null}) {
  const entry = catalogEntries('moves').find(move => move.id === Number(moveId));
  if (!entry) return null;
  return <ResourceDialog name={entry.name} onClose={onClose} returnFocus={returnFocus}>
    <MoveSummary entry={entry} />
    <MoveLearners move={entry.id} />
  </ResourceDialog>;
}
