// Independent fixture encoder. No imports from production code or reference data.
// Protocol constants are deliberately literal here; see fixtures/README.md.
const lengths=[3884,3968,3968,3968,3848,3968,3968,3968,3968,3968,3968,3968,3968,2000];
export function makeSave({counters=[10,11],rotations=[0,0],blocks={}}={}) {
  const out=new Uint8Array(131072).fill(255);
  for(let slot=0;slot<2;slot++) {
    if(counters[slot]===null) continue;
    const chunks=[new Uint8Array(3884),new Uint8Array(15752),new Uint8Array(33744)];
    for(const [key,index] of [['saveBlock2',0],['saveBlock1',1],['storage',2]]) if(blocks[key]) chunks[index].set(blocks[key]);
    let b1=0,pc=0;
    for(let id=0;id<14;id++) {
      const physical=(id+rotations[slot])%14;
      const sector=out.subarray((slot*14+physical)*4096,(slot*14+physical+1)*4096);
      sector.fill(0);
      const payload=id===0 ? chunks[0] : id<=4 ? chunks[1].subarray(b1,b1+lengths[id]):chunks[2].subarray(pc,pc+lengths[id]);
      sector.set(payload);
      if(id>=1 && id<=4) b1+=lengths[id]; else if(id>=5) pc+=lengths[id];
      const v=new DataView(sector.buffer,sector.byteOffset,4096);
      let sum=0n;
      for(let i=0;i<lengths[id];i+=4) sum+=BigInt(v.getUint32(i,true));
      sum &= 0xffffffffn;
      const checksum=Number(((sum>>16n)+(sum&65535n))&65535n);
      v.setUint16(4084,id,true); v.setUint16(4086,checksum,true);
      v.setUint32(4088,134291493,true); v.setUint32(4092,counters[slot],true);
    }
  }
  return out;
}
function permutations(list) {
  return list.length===0 ? [[]]:list.flatMap((x,i)=>permutations(list.filter((_,j)=>j!==i)).map(rest=>[x,...rest]));
}
const orders=permutations([0,1,2,3]);
export function makePokemon({pid=0,otId=0,species=1,heldItemId=13,moveIds=[33,0,45,0],ppUps=[1,2,0,3],currentPp=[17,0,25,0],egg=false,party=false,ivWord=1073741823,evs=[0,0,0,0,0,0],experience=560,origins=8581,metLocationId=12,friendship=70,pokerus=33,ribbonRaw=32770,flags,recordedLevel=10}={}) {
  const out=new Uint8Array(party?100:80), v=new DataView(out.buffer);
  v.setUint32(0,pid,true); v.setUint32(4,otId,true);
  out.fill(255,8,18); out[8]=187; out[9]=188; // AB
  out[18]=2; out[19]=flags ?? (egg?6:2);
  out.fill(255,20,27); out[20]=189; // C
  const chunks=Array.from({length:4},()=>new Uint8Array(12));
  const [g,a,e,m]=chunks.map(x=>new DataView(x.buffer));
  g.setUint16(0,species,true); g.setUint16(2,heldItemId,true); g.setUint32(4,experience,true); g.setUint8(8,ppUps.reduce((bits,count,i)=>bits | (count << (2*i)),0)); g.setUint8(9,friendship);
  moveIds.forEach((id,i)=>a.setUint16(i*2,id,true));
  currentPp.forEach((pp,i)=>a.setUint8(8+i,pp));
  evs.forEach((ev,i)=>e.setUint8(i,ev));
  [1,2,3,4,5,6].forEach((value,i)=>e.setUint8(6+i,value));
  m.setUint8(0,pokerus);m.setUint8(1,metLocationId);m.setUint16(2,origins,true);
  m.setUint32(4,(ivWord | (egg ? 1073741824:0))>>>0,true);m.setUint32(8,ribbonRaw,true);
  const plaintext=new Uint8Array(48);
  orders[pid%24].forEach((id,i)=>plaintext.set(chunks[id],i*12));
  let checksum=0;
  for(let i=0;i<48;i+=2) checksum+=plaintext[i]+256*plaintext[i+1];
  v.setUint16(28,checksum%65536,true);
  for(let i=0;i<48;i+=4) {
    const word=plaintext[i]+plaintext[i+1]*256+plaintext[i+2]*65536+plaintext[i+3]*16777216;
    v.setUint32(32+i,(word^pid^otId)>>>0,true);
  }
  if(party) {
    v.setUint32(80,8,true); out[84]=recordedLevel;
    [12,31,16,18,20,22,24].forEach((value,i)=>v.setUint16(86+i*2,value,true));
  }
  return out;
}
