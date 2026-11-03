import test from 'node:test';
import assert from 'node:assert/strict';
import { MOVEMENT, getFallSpeed, getSpeedKmh } from '../src/movement.js';
import { SPAWNING, getHazardSpawnGap } from '../src/run-balance.js';

test('physical and displayed fall speed reach 760 px/s and 120 km/h, then stop increasing', () => {
    assert.equal(getFallSpeed(0),190);
    assert.equal(getSpeedKmh(0),30);
    assert.equal(getFallSpeed(227),757.5);
    for(const count of [228,300,400,600,10000]) {
        assert.equal(getFallSpeed(count),760);
        assert.equal(getSpeedKmh(count),120);
    }
    assert.equal(MOVEMENT.maxFallSpeed,760);
});

test('button spacing is substantially wider without touching currency or combo rewards', () => {
    assert.equal(SPAWNING.buttonGapMin,340);
    assert.equal(SPAWNING.buttonGapMax,460);
    assert.ok((SPAWNING.buttonGapMin+SPAWNING.buttonGapMax)/2>1.6*(190+295)/2);
});

test('hazard spawn density grows exponentially with depth and clamps at the endpoints', () => {
    const gaps=[0,.25,.5,.75,1].map(depth=>getHazardSpawnGap(depth,()=>.5));
    assert.equal(gaps[0],900);assert.equal(gaps.at(-1),300);
    for(let i=1;i<gaps.length;i++) {
        assert.ok(gaps[i]<gaps[i-1]);
        assert.ok(Math.abs(gaps[i]/gaps[i-1]-Math.pow(1/3,.25))<.003);
    }
    assert.equal(getHazardSpawnGap(-1,()=>.5),900);
    assert.equal(getHazardSpawnGap(2,()=>.5),300);
    assert.equal(getHazardSpawnGap(0,()=>0),765);
    assert.equal(getHazardSpawnGap(1,()=>1),345);
});
