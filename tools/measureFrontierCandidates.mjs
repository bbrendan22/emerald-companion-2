import {mkdir,writeFile} from 'node:fs/promises';
import {performanceCases,calculateCase,statistics} from '../test/fixtures/frontierPerformance.js';
const cases=performanceCases(),results=[];
for(const value of cases) {
 for(let n=0;n<50;n++)calculateCase(value);
 const durations=[];let summary;
 for(let n=0;n<500;n++) {const start=performance.now();summary=calculateCase(value);durations.push(performance.now()-start);}
 results.push({case:value.name,candidates:summary.candidateCount,branches:summary.branches.length,kind:summary.kind,...statistics(durations)});
}
const heap=[];
if(global.gc) {
 for(let batch=0;batch<=10;batch++) {
  if(batch)for(let n=0;n<500;n++)calculateCase(cases[1]);
  global.gc();heap.push({evaluations:batch*500,heapUsedBytes:process.memoryUsage().heapUsed});
 }
}
const report={runtime:process.version,platform:process.platform,architecture:process.arch,
 methodology:'50 warmups + 500 timed full construction/evaluation/aggregation/presentation calls per case; unthrottled host Node runtime',
 results,memory:{method:global.gc?'forced GC after each batch of 500 evaluations':'GC unavailable',samples:heap,
  retainedDeltaBytes:heap.length?heap.at(-1).heapUsedBytes-heap[0].heapUsedBytes:null}};
await mkdir('artifacts/frontier-candidate-step6',{recursive:true});
await writeFile('artifacts/frontier-candidate-step6/node-performance.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
