import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSockAccent, patternOpacity, recolorSockPixels } from '../src/sock-skin.js';

test('red toe pixels are distinguished from cream body and dark outlines', () => {
  assert.equal(isSockAccent(210, 62, 55), true);
  assert.equal(isSockAccent(243, 231, 207), false);
  assert.equal(isSockAccent(45, 38, 30), false);
});

test('colors do not mutate source and preserve alpha', () => {
  const rgba = new Uint8ClampedArray([242,230,216,255, 210,62,55,240, 0,0,0,0]);
  const recolored = recolorSockPixels(rgba, 3, 1, {
    bodyColor: '#73c770', accentColor: '#edc35d', patternId: 'plain', patternColor: '#ffffff'
  });
  assert.notDeepEqual(Array.from(recolored.slice(0, 3)), Array.from(rgba.slice(0, 3)));
  assert.notDeepEqual(Array.from(recolored.slice(4, 7)), Array.from(rgba.slice(4, 7)));
  assert.equal(recolored[3], 255);
  assert.equal(recolored[7], 240);
  assert.equal(recolored[11], 0);
  assert.equal(rgba[0], 242);
});

test('two patterns are distinct and plain pattern does nothing', () => {
  assert.equal(patternOpacity('plain', 20, 20), 0);
  assert.equal(patternOpacity('dots', 18, 13) >= 0, true);
  assert.equal(patternOpacity('stripes', 0, 0), 1);
  assert.equal(patternOpacity('stripes', 0, 20), 0);
});

test('white/plain original body is retained for default style', () => {
  const rgba = new Uint8ClampedArray([240,225,208,255]);
  const recolored = recolorSockPixels(rgba, 1, 1, {
    bodyColor:'#ffffff', accentColor:'#cc655a', patternId:'plain', patternColor:'#ffffff'
  });
  assert.deepEqual(Array.from(recolored), Array.from(rgba));
});
