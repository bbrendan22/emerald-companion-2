import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {collectionImage} from '../src/ui/collectionFilters.js';

function validPng(path,{staticImage=true}={}) {
  const bytes=readFileSync(new URL(`../public${path}`,import.meta.url));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],path);
  const imageData=[];
  let offset=8,ended=false;
  while(offset<bytes.length) {
    assert.ok(offset+12<=bytes.length,`${path}: complete chunk header`);
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8);
    assert.ok(offset+12+length<=bytes.length,`${path}: complete ${type} chunk`);
    if(offset===8) {
      assert.equal(type,'IHDR',path);
      assert.equal(length,13,path);
      assert.ok(bytes.readUInt32BE(offset+8)>0&&bytes.readUInt32BE(offset+12)>0,`${path}: nonzero dimensions`);
    }
    if(staticImage)assert.notEqual(type,'acTL',`${path}: static PNG, not APNG`);
    if(type==='IDAT')imageData.push(bytes.subarray(offset+8,offset+8+length));
    offset+=12+length;
    if(type==='IEND') {
      assert.equal(length,0,path);
      assert.equal(offset,bytes.length,`${path}: no data after IEND`);
      ended=true;
    }
  }
  assert.ok(ended,`${path}: IEND present`);
  assert.ok(imageData.length>0,`${path}: image data present`);
  assert.ok(inflateSync(Buffer.concat(imageData)).length>0,`${path}: valid compressed image data`);
}

test('all 386 normal and shiny Emerald front sprites are valid static PNGs',()=>{
  for(const variant of ['normal','shiny'])for(let dex=1;dex<=386;dex++)
    validPng(`/pokemon/emerald/${variant}/${dex}.png`);
});

test('every Collection gallery artwork and Box sprite resolves to a valid static PNG',()=>{
  for(let dex=1;dex<=386;dex++) {
    for(const shiny of [false,true])
      validPng(collectionImage({nationalDexId:dex,shiny,isEgg:false},'Gallery'));
    validPng(collectionImage({nationalDexId:dex},'Box'));
  }
});

test('Collection egg artwork is a valid PNG, with its existing animation allowed',()=>{
  validPng(collectionImage({nationalDexId:1,isEgg:true},'Gallery'),{staticImage:false});
});
