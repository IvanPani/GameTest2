import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HAZARD_ART, HAZARD_POOLS, chooseHazard, getMaskBounds } from '../src/hazards.js';

test('all five hazard assets exist and regional tables contain only loaded dangers', () => {
    const keys = new Set(['soap', ...HAZARD_ART.map(asset => asset.key)]);
    for (const asset of HAZARD_ART) assert.ok(existsSync(new URL(asset.url)));
    for (const pool of HAZARD_POOLS) {
        assert.equal(pool.reduce((sum, [, weight]) => sum + weight, 0), 100);
        for (const [key, weight] of pool) { assert.ok(keys.has(key)); assert.ok(weight > 0); }
    }
});

test('weighted selection favors native hazards while retaining all earlier types', () => {
    const expected = [
        {soap:100},
        {soap:20, 'rusty-nut':40, 'valve-wheel':40},
        {soap:10, 'rusty-nut':10, 'valve-wheel':10, 'crushed-can':35, 'bottle-shard':35},
        {soap:8, 'rusty-nut':8, 'valve-wheel':8, 'crushed-can':8, 'bottle-shard':8, 'toy-block':60}
    ];
    for (let region = 0; region < 4; region++) {
        const counts = {};
        for (let i = 0; i < 100; i++) {
            const key = chooseHazard(region, () => (i + 0.5) / 100);
            counts[key] = (counts[key] || 0) + 1;
        }
        assert.deepEqual(counts, expected[region]);
        for (const [key] of HAZARD_POOLS[Math.max(0, region - 1)]) assert.ok(counts[key]);
    }
});

test('tight hazard bounds trim only outer padding, preserving holes and empty corners', () => {
    const pixels = new Uint8Array(36);
    for (const index of [7, 8, 9, 13, 15, 19, 20, 21]) pixels[index] = 1;
    const before = new Uint8Array(pixels);
    assert.deepEqual(getMaskBounds({width:6, height:6, pixels}), {x:1,y:1,width:3,height:3});
    assert.deepEqual(pixels, before);
    assert.equal(pixels[14], 0);
    assert.equal(getMaskBounds({width:6, height:6, pixels:new Uint8Array(36)}), null);
});

test('no future hazard leaks into an earlier area, including roll boundaries', () => {
    const allowed = [
        ['soap'],
        ['soap', 'rusty-nut', 'valve-wheel'],
        ['soap', 'rusty-nut', 'valve-wheel', 'crushed-can', 'bottle-shard'],
        ['soap', 'rusty-nut', 'valve-wheel', 'crushed-can', 'bottle-shard', 'toy-block']
    ];
    for (let region = 0; region < allowed.length; region++) {
        const selected = new Set();
        for (let i = 0; i <= 1000; i++) selected.add(chooseHazard(region, () => i / 1000));
        assert.deepEqual([...selected].sort(), allowed[region].sort());
    }
});
