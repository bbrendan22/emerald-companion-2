import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({command, isPreview}) => {
  const version = process.env.PWA_BUILD_ID || process.env.GITHUB_SHA || new Date().toISOString();
  return {
    base: command === 'build' || isPreview ? '/emerald-companion-2/' : '/',
    define: {__APP_VERSION__: JSON.stringify(version)},
    plugins: [
      {name: 'app-version', generateBundle() {
        this.emitFile({type: 'asset', fileName: 'version.json', source: JSON.stringify({version})});
      }},
      VitePWA({
        strategies: 'injectManifest', srcDir: 'src/pwa', filename: 'sw.js',
        injectRegister: null, manifest: false,
        injectManifest: {
          rollupFormat: 'iife', maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,webmanifest}', 'icons/*.png', 'types/**/*.png', 'items/**/*.png', 'ribbons/gen3/*.png', 'status/*.png'],
        },
      }),
    ],
  };
});
