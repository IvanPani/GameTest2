import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LEVEL_REGIONS, REGION_DISTANCE, getRegionProgress, getDevCheckpoint, getBackgroundLayout, getStackOffset, STACK_SEAM_OVERLAP, getDevShortcut, DEV_CHECKPOINTS_ENABLED } from '../src/level-regions.js';

test('all four backgrounds exist in the requested travel order', () => {
    assert.deepEqual(LEVEL_REGIONS.map(region => region.name), ['PIPES', 'RUSTED PIPES', 'SEWER', 'PIT OF LOST THINGS']);
    for (const region of LEVEL_REGIONS) assert.ok(existsSync(new URL(region.url)), region.url);
});

test('stacked illustrations overlap only at their touching edges and reach the Pit floor at the same total distance', () => {
    const layout = getBackgroundLayout();
    assert.equal(layout.sections[0].top, 0);
    for (let i = 1; i < layout.sections.length; i++) {
        assert.equal(layout.sections[i].top, layout.sections[i - 1].top + layout.sections[i - 1].height - STACK_SEAM_OVERLAP);
    }
    assert.equal(getStackOffset(0), 0);
    assert.equal(getStackOffset(LEVEL_REGIONS.length * REGION_DISTANCE), layout.maxOffset);
    assert.equal(getStackOffset(1e9), layout.maxOffset);
    assert.deepEqual(getRegionProgress(1e9), {index:3, progress:1});
    assert.deepEqual(getRegionProgress(-1), {index:0, progress:0});
});

test('scrolling stays continuous across boundaries with both backgrounds fully opaque', () => {
    const layout = getBackgroundLayout();
    for (let i = 1; i < layout.sections.length; i++) {
        const distance = layout.sections[i].top / layout.maxOffset * LEVEL_REGIONS.length * REGION_DISTANCE;
        assert.ok(Math.abs(getStackOffset(distance) - layout.sections[i].top) < 1e-9);
        assert.ok(getStackOffset(distance + 1) - getStackOffset(distance - 1) < 1);
    }
});

test('eight checkpoints follow the actual stacked artwork, with a lead-in before each seam', () => {
    const layout = getBackgroundLayout();
    for (let index = 0; index < LEVEL_REGIONS.length; index++) {
        const start = getDevCheckpoint(index * 2 + 1);
        const end = getDevCheckpoint(index * 2 + 2);
        assert.equal(start.index, index);
        assert.equal(getRegionProgress(start.distance).index, index);
        assert.ok(Math.abs(getStackOffset(start.distance) - layout.sections[index].top) < 1e-9);
        assert.ok(end.distance > start.distance);
        if (index < 3) assert.ok(layout.sections[index + 1].top - getStackOffset(end.distance) > 700);
    }
    for (const invalid of [0,10,1.5,NaN]) assert.equal(getDevCheckpoint(invalid),null);
});

test('key nine places the sock just before the reunion trigger', () => {
    const point = getDevCheckpoint(9);
    assert.equal(point.index, LEVEL_REGIONS.length - 1);
    assert.equal(point.distance, LEVEL_REGIONS.length * REGION_DISTANCE - 60);
    assert.ok(point.distance > getDevCheckpoint(8).distance);
});

test('testing shortcuts are enabled and accept browser, key-name and numpad events', () => {
    assert.equal(DEV_CHECKPOINTS_ENABLED, true);
    for (let key = 1; key <= 9; key++) {
        for (const event of [{code:`Digit${key}`}, {code:`Numpad${key}`}, {key:String(key)},
            {keyCode:48+key}, {keyCode:96+key}, {which:48+key}]) {
            assert.equal(getDevShortcut(event), key);
        }
    }
    for (const event of [{key:'0'}, {key:'a'}, {key:'9',repeat:true}, {key:'1',metaKey:true},
        {key:'2',ctrlKey:true}, {key:'3',altKey:true}]) assert.equal(getDevShortcut(event), null);
});
