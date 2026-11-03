import test from 'node:test';
import assert from 'node:assert/strict';
import { cutoutNotePixels } from '../src/record-note.js';

test('post-it cleanup removes connected checkerboard but retains enclosed ink and colored paper', () => {
    const source = new Uint8ClampedArray(7 * 7 * 4);
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        source.set(x >= 1 && x <= 5 && y >= 1 && y <= 5 ? [245, 209, 117, 255] : [30, 30, 32, 255], (y * 7 + x) * 4);
    }
    source.set([25, 25, 25, 255], (3 * 7 + 3) * 4);
    const output = cutoutNotePixels(source, 7, 7);
    assert.equal(output[3], 0);
    assert.equal(output[(3 * 7 + 3) * 4 + 3], 255);
    assert.equal(output[(1 * 7 + 1) * 4 + 3], 255);
    assert.equal(source[3], 255);
    assert.throws(() => cutoutNotePixels(source, 3, 3));
});
