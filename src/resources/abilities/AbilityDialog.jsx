import React from 'react';
import {catalogEntries} from '../search.js';
import ResourceDialog from '../components/ResourceDialog.jsx';
import AbilityEntry from './AbilityEntry.jsx';

// Reusable by any caller with a canonical ability ID, without a database list.
export default function AbilityDialog({abilityId, onClose, returnFocus = null}) {
  const entry = catalogEntries('abilities').find(ability => ability.id === Number(abilityId));
  if (!entry) return null;
  return <ResourceDialog name={entry.name} onClose={onClose} returnFocus={returnFocus}>
    <AbilityEntry entry={entry} expanded />
  </ResourceDialog>;
}
