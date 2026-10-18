import test from 'node:test'
import assert from 'node:assert/strict'
import {stageStat,battleSpeed,displayedBattleStat} from '../src/battle/battleConditions.js'
test('stat stages clamp to six and round down at each ratio',()=>{
 assert.equal(stageStat(101,1),151)
 assert.equal(stageStat(101,-1),67)
 assert.equal(stageStat(100,6),400)
 assert.equal(stageStat(100,-6),25)
 assert.equal(stageStat(100,9),400)
})
test('Gen III paralysis quarters Speed after stages and Macho Brace',()=>{
 const mon={stats:{speed:101},stages:{speed:1},status:'paralysis',item:'Macho Brace'}
 assert.equal(battleSpeed(mon),18)
 assert.equal(displayedBattleStat(mon,'speed'),18)
 assert.equal(battleSpeed({...mon,item:'None',status:'none'}),151)
})
test('weather Speed abilities and possible weather suppression preserve every outcome',async()=>{
 const {battleSpeedValues}=await import('../src/battle/battleConditions.js')
 const mon={stats:{speed:101},ability:'Swift Swim / Rain Dish',weather:'rain'}
 assert.deepEqual(battleSpeedValues(mon,{ability:'Overgrow'}),[101,202])
 assert.deepEqual(battleSpeedValues(mon,{ability:'Cloud Nine'}),[101])
 assert.deepEqual(battleSpeedValues({...mon,ability:'Chlorophyll',weather:'sun'},{ability:'Overgrow'}),[202])
})
