import test from 'node:test';
import assert from 'node:assert/strict';
import { clearIconBacking } from '../src/customize-icons.js';

test('icon backing clears at the edges while enclosed fabric and its outline remain', () => {
    const pixels = new Uint8ClampedArray(7 * 7 * 4);
    for (let i = 0; i < 49; i++) pixels.set([255, 220, 170, 255], i * 4);
    for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) pixels.set([30, 20, 10, 255], (y * 7 + x) * 4);
    pixels.set([255, 220, 170, 255], (3 * 7 + 3) * 4);
    const before = new Uint8ClampedArray(pixels);
    const result = clearIconBacking(pixels, 7, 7);
    assert.equal(result[3], 0);
    assert.equal(result[(3 * 7 + 3) * 4 + 3], 255);
    assert.equal(result[(2 * 7 + 2) * 4 + 3], 255);
    assert.deepEqual(pixels, before);
});
