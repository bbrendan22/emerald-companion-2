import React from 'react';

export default function Icon({name, ...props}) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === 'menu' && <path d="M4 6h16M4 12h16M4 18h16" />}
    {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
    {name === 'ball' && <><circle cx="12" cy="12" r="9" /><path d="M3 12h6m6 0h6" /><circle cx="12" cy="12" r="3" /></>}
    {name === 'settings' && <><path d="m9 3-.6 2.2-2 .9-2.1-.6-2 3.5 1.6 1.6v2.8L2.3 15l2 3.5 2.1-.6 2 .9L9 21h4l.6-2.2 2-.9 2.1.6 2-3.5-1.6-1.6v-2.8L19.7 9l-2-3.5-2.1.6-2-.9L13 3Z" /><circle cx="11" cy="12" r="3" /></>}
  </svg>;
}
