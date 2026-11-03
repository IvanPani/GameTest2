import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GAME_AUDIO, pickupSoundKey, playGameSound } from '../src/game-audio.js';
import { SAMPLE_RATE, createPickupSamples, createHazardSamples, encodeWav } from '../src/sound-design.js';

test('each combo gets its own pickup cue, including newly reached multiplier thresholds', () => {
    for (let tier = 1; tier <= 5; tier++) assert.equal(pickupSoundKey(tier), `pickup-x${tier}`);
    assert.equal(pickupSoundKey(99), 'pickup-x5');
    for (const value of [NaN, -1, undefined]) assert.equal(pickupSoundKey(value), 'pickup-x1');
});

test('generated effects are distinct, short, unclipped and fade to silence; WAV assets match the source', () => {
    const fingerprints = new Set();
    for (const [key, url] of GAME_AUDIO) {
        const samples = key === 'hazard-hit' ? createHazardSamples() : createPickupSamples(Number(key.at(-1)));
        assert.ok(samples.length / SAMPLE_RATE < 0.3);
        assert.ok(samples.some(value => Math.abs(value) > 0.1));
        assert.ok(samples.every(value => Number.isFinite(value) && Math.abs(value) <= 0.71));
        assert.equal(Math.abs(samples[0]), 0);
        assert.equal(Math.abs(samples.at(-1)), 0);
        const wav = encodeWav(samples);
        assert.deepEqual(new Uint8Array(readFileSync(new URL(url))), wav);
        fingerprints.add(Buffer.from(wav).toString('base64'));
    }
    assert.equal(fingerprints.size, 6);
});

test('audio playback respects browser locking and missing/no-audio environments', () => {
    const played = [];
    const scene = {sound:{locked:false,play:(...args)=>{played.push(args);return true;}},cache:{audio:{exists:()=>true}}};
    assert.equal(playGameSound(scene, 'pickup-x3'), true);
    assert.deepEqual(played[0], ['pickup-x3', {volume:0.45}]);
    scene.sound.locked = true;
    assert.equal(playGameSound(scene, 'hazard-hit'), false);
    scene.sound.locked = false; scene.cache.audio.exists = () => false;
    assert.equal(playGameSound(scene, 'hazard-hit'), false);
    assert.equal(playGameSound({}, 'pickup-x1'), false);
    assert.equal(played.length, 1);
});
