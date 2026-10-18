import {spawn} from 'node:child_process';
import {readdir, mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {createServer, preview} from 'vite';

const {values} = parseArgs({options: {
  url: {type:'string'}, serve: {type:'string'}, port: {type:'string'},
  workers: {type:'string', default:'2'}, smoke: {type:'boolean', default:false},
}});
if (Boolean(values.url) === Boolean(values.serve)) throw new Error('Choose --url <application URL> or --serve development|production.');
if (values.serve && !['development','production'].includes(values.serve)) throw new Error('Unknown server mode.');
const workers = Number(values.workers), port = Number(values.port || (values.serve === 'development' ? 5196 : 5197));
if (!Number.isInteger(workers) || workers < 1 || workers > 4) throw new Error('Use 1–4 workers.');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid server port.');
const root = fileURLToPath(new URL('../', import.meta.url));
const logDir = await mkdtemp(join(tmpdir(), 'emerald-browser-'));
let server;
const children = new Set();
async function close() {
  for (const child of children) child.kill('SIGTERM');
  if (server) await (server.close ? server.close() : new Promise(resolve => server.httpServer.close(resolve)));
}
for (const signal of ['SIGINT','SIGTERM']) process.once(signal, async () => {await close(); process.exit(1);});
try {
  let url = values.url;
  if (values.serve === 'development') {
    server = await createServer({root, server:{host:'127.0.0.1', port, strictPort:true}});
    await server.listen(); url = server.resolvedUrls.local[0];
  } else if (values.serve === 'production') {
    server = await preview({root, preview:{host:'127.0.0.1', port, strictPort:true}});
    // Test the required Pages mount even if Vite's base accidentally changes.
    url = new URL('/emerald-companion-2/', server.resolvedUrls.local[0]).href;
  }
  const application = new URL(url);
  if (!['http:','https:'].includes(application.protocol) || !application.pathname.endsWith('/')) throw new Error('Use an HTTP(S) application URL ending in /.');
  console.log(`Browser target: ${url}\nLogs: ${logDir}`);
  const files = values.smoke ? ['pagesDeployment.browser.mjs'] : (await readdir(new URL('../test/', import.meta.url))).filter(file => file.endsWith('.browser.mjs')).sort();
  if (!files.length) throw new Error('No browser scripts found.');
  const env = {...process.env, BROWSER_URL:url, BATTLE_URL:url, SHOWCASE_URL:url, PAGES_URL:url};
  const results = [];
  let next = 0;
  async function worker() {
    while (next < files.length) {
      const file = files[next++], start = Date.now();
      const result = await new Promise(resolve => {
        const child = spawn(process.execPath, [join(root, 'test', file)], {cwd:root, env});
        children.add(child);
        let output = '', timedOut = false;
        child.stdout.on('data', data => {output += data;});
        child.stderr.on('data', data => {output += data;});
        const timer = setTimeout(() => {timedOut = true; child.kill('SIGTERM');}, 180_000);
        child.on('error', error => {output += error.stack;});
        child.on('close', (code, signal) => {
          clearTimeout(timer); children.delete(child);
          resolve({file, code, signal, timedOut, seconds:Math.round((Date.now()-start)/1000), output});
        });
      });
      await writeFile(join(logDir, file+'.log'), result.output);
      const {output, ...summary} = result;
      results.push(summary);
      console.log(`${result.code === 0 ? 'PASS' : 'FAIL'} ${file} (${result.seconds}s)`);
      if (result.code !== 0) console.error(result.output);
    }
  }
  await Promise.all(Array.from({length:Math.min(workers, files.length)}, worker));
  await writeFile(join(logDir, 'summary.json'), JSON.stringify({url, results}, null, 2));
  const passed = results.filter(result => result.code === 0).length;
  console.log(`Total ${files.length}; passed ${passed}; failed ${files.length-passed}`);
  if (passed !== files.length) process.exitCode = 1;
} finally {await close();}
