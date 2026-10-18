import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const [mode, legacyRoot] = process.argv.slice(2);
const localOnly = ['verifyPokemonDatabase.mjs', 'verifyResourcesItems.mjs', 'verifyResourcesLearnset.mjs', 'verifyResourcesLocations.mjs', 'verifyMoveCoverageParity.mjs'];
if (mode !== '--ci' && (mode !== '--local' || !legacyRoot)) throw new Error('Use --ci or --local <read-only legacy root>.');
const scripts = ['verifyResourcesItemsRender.mjs', ...(mode === '--local' ? localOnly : [])];
if (mode === '--ci') console.log('CI: standalone item-render integrity check. Five legacy parity checks require --local <legacy root>; they are not CI checks.');
for (const script of scripts) {
  console.log(`\nChecking ${script}`);
  const result = spawnSync(process.execPath, ['tools/'+script, ...(script === 'verifyResourcesItemsRender.mjs' ? [] : [legacyRoot])], {cwd:root, stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`${scripts.length} Resources checks passed (${mode === '--ci' ? 'CI-compatible' : 'local, legacy read-only'}).`);
