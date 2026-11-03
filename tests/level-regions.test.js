import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LEVEL_REGIONS, REGION_DISTANCE, getRegionProgress, getDevCheckpoint } from '../src/level-regions.js';

test('all four backgrounds exist in the requested travel order', () => {
    assert.deepEqual(LEVEL_REGIONS.map(region => region.name), ['PIPES', 'RUSTED PIPES', 'SEWER', 'PIT OF LOST THINGS']);
    for (const region of LEVEL_REGIONS) assert.ok(existsSync(new URL(region.url)), region.url);
});

test('distance advances through each region and holds at the end of the pit', () => {
    for (let index = 0; index < LEVEL_REGIONS.length; index++) {
        assert.deepEqual(getRegionProgress(index * REGION_DISTANCE), { index, progress: 0, blend: 0 });
        assert.equal(getRegionProgress((index + 0.5) * REGION_DISTANCE).progress, 0.5);
    }
    assert.deepEqual(getRegionProgress(1e9), { index: 3, progress: 1, blend: 0 });
    assert.deepEqual(getRegionProgress(-100), getRegionProgress(0));
});

test('area transitions blend into the next beginning then reset cleanly at the boundary', () => {
    assert.equal(getRegionProgress(REGION_DISTANCE - 300).blend, 0.5);
    assert.equal(getRegionProgress(REGION_DISTANCE).index, 1);
    assert.equal(getRegionProgress(REGION_DISTANCE).progress, 0);
    assert.equal(getRegionProgress(4 * REGION_DISTANCE + 5900).blend, 0);
});

test('eight development checkpoints bracket all four areas with transition lead-in', () => {
    for (let index = 0; index < 4; index++) {
        const start = getDevCheckpoint(index * 2 + 1);
        const end = getDevCheckpoint(index * 2 + 2);
        assert.deepEqual(start, { index, distance: index * REGION_DISTANCE });
        assert.equal(getRegionProgress(end.distance).index, index);
        assert.ok(end.distance > start.distance);
        assert.equal(getRegionProgress(end.distance).blend, 0);
        assert.ok(end.distance < (index + 1) * REGION_DISTANCE);
    }
    for (const invalid of [0, 10, 1.5, NaN]) assert.equal(getDevCheckpoint(invalid), null);
});

test('key nine places the sock just before the reunion trigger', () => {
    const point = getDevCheckpoint(9);
    assert.equal(point.index, LEVEL_REGIONS.length - 1);
    assert.equal(point.distance, LEVEL_REGIONS.length * REGION_DISTANCE - 60);
    assert.ok(point.distance > getDevCheckpoint(8).distance);
});
