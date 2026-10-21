import {startPwaUpdates} from './pwa/updates.js';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './ui/App.jsx';
import './ui/styles/palette.css';
import './ui/styles/base.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

if (import.meta.env.PROD) {
  document.documentElement.dataset.appVersion = __APP_VERSION__;
  startPwaUpdates();
}
