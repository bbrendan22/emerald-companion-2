import {clientsClaim, setCacheNameDetails} from 'workbox-core';
import {precacheAndRoute, createHandlerBoundToURL} from 'workbox-precaching';
import {registerRoute, NavigationRoute} from 'workbox-routing';
import {StaleWhileRevalidate} from 'workbox-strategies';
import {ExpirationPlugin} from 'workbox-expiration';

setCacheNameDetails({prefix: 'emerald-companion-2', suffix: 'v1'});
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)));
registerRoute(({request, url}) => request.destination === 'image' && url.origin === self.location.origin
  && url.pathname.startsWith(import.meta.env.BASE_URL), new StaleWhileRevalidate({
  cacheName: 'emerald-companion-2-images-v1',
  plugins: [new ExpirationPlugin({maxEntries: 768})],
}));
clientsClaim();
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'GET_VERSION') event.ports[0]?.postMessage(__APP_VERSION__);
});
