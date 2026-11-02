import test from 'node:test';
import assert from 'node:assert/strict';
import { SOCK_COLORS, SOCK_PATTERNS, patternOpacity } from '../src/sock-customization.js';
import { recolorSockPixels, cuffBandOpacity } from '../src/sock-skin.js';
import { PlayerData, defaultProfile } from '../src/player-data.js';

function paintedFrame() {
    const pixels = new Uint8ClampedArray(512 * 512 * 4);
    for (let y = 50; y < 470; y++) for (let x = 100; x < 420; x++) {
        const i = (y * 512 + x) * 4;
        pixels.set(x < 200 && y < 150 ? [210, 62, 55, 255] : [242, 230, 216, 255], i);
    }
    return pixels;
}
const pixel = (data, x, y) => Array.from(data.slice((y * 512 + x) * 4, (y * 512 + x) * 4 + 4));

test('the ten named colors and all requested motifs are distinct', () => {
    assert.equal(SOCK_COLORS.length, 10);
    assert.equal(new Set(SOCK_COLORS.map(item => item.hex)).size, 10);
    assert.equal(SOCK_PATTERNS.length, 8);
    const fingerprints = new Set();
    for (const { id } of SOCK_PATTERNS) {
        const values = Array.from({ length: 64 * 64 }, (_, i) => patternOpacity(id, i % 64, Math.floor(i / 64)));
        assert.ok(values.every(value => value >= 0 && value <= 1));
        if (id !== 'plain') assert.ok(values.some(value => value > 0));
        fingerprints.add(values.join(','));
    }
    assert.equal(fingerprints.size, SOCK_PATTERNS.length);
    assert.equal(patternOpacity('stripes', 0, 4), patternOpacity('stripes', 120, 4));
    assert.notEqual(patternOpacity('stripes', 0, 4), patternOpacity('stripes', 0, 24));
});

test('toe and cuff switches work independently and never alter source alpha', () => {
    const source = paintedFrame();
    const original = new Uint8ClampedArray(source);
    assert.equal(cuffBandOpacity(350, 380, { left: 100, top: 50, width: 320, height: 420 }), 1);
    for (const toesEnabled of [false, true]) for (const cuffEnabled of [false, true]) {
        const result = recolorSockPixels(source, 512, 512, { bodyColor: '#ffffff', accentColor: '#208741', patternId: 'plain', toesEnabled, cuffEnabled });
        const toe = pixel(result, 130, 100), cuff = pixel(result, 350, 380);
        assert.equal(toe[1] > toe[0], toesEnabled);
        assert.equal(cuff[1] > cuff[0], cuffEnabled);
        if (!toesEnabled) assert.ok(toe[0] - toe[1] < 25, 'OFF must neutralize baked red');
        for (let i = 3; i < result.length; i += 4) assert.equal(result[i], source[i]);
    }
    assert.deepEqual(source, original);
});

test('every pattern recolors fabric for all five rows with identical local coverage', () => {
    const source = new Uint8ClampedArray(512 * 2560 * 4);
    for (let i = 0; i < source.length; i += 4) source.set([242, 230, 216, 255], i);
    for (const { id } of SOCK_PATTERNS.filter(item => item.id !== 'plain')) {
        const out = recolorSockPixels(source, 512, 2560, { bodyColor: '#73bdeb', patternId: id,
            patternColor: '#182c60', toesEnabled: false, cuffEnabled: false });
        for (let row = 1; row < 5; row++) {
            const first = out.subarray(0, 512 * 512 * 4);
            assert.deepEqual(out.subarray(row * first.length, (row + 1) * first.length), first);
        }
    }
});

test('new options persist, old saves get enabled switches, and invalid switches are rejected', () => {
    const legacy = defaultProfile();
    delete legacy.sockStyle.toesEnabled;
    delete legacy.sockStyle.cuffEnabled;
    let saved = JSON.stringify(legacy);
    const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    const p = new PlayerData(() => storage);
    assert.equal(p.load().sockStyle.toesEnabled, true);
    assert.equal(p.getProfile().sockStyle.cuffEnabled, true);
    assert.equal(p.selectStyle({ bodyColor: '#ed81b1', accentColor: '#ed81b1', patternColor: '#ed81b1', patternId: 'squares', toesEnabled: false, cuffEnabled: true }), true);
    const reloaded = new PlayerData(() => storage).load();
    assert.equal(reloaded.sockStyle.toesEnabled, false);
    assert.equal(reloaded.sockStyle.cuffEnabled, true);
    assert.equal(reloaded.sockStyle.patternId, 'squares');
    assert.equal(reloaded.sockStyle.bodyColor, '#ed81b1');
    assert.equal(reloaded.sockStyle.accentColor, '#ed81b1');
    assert.equal(reloaded.sockStyle.patternColor, '#ed81b1');
    assert.equal(p.selectStyle({ cuffEnabled: 'false' }), false);
    assert.equal(p.selectStyle({ toesEnabled: 0 }), false);
    assert.equal(p.getProfile().currency, 0);
});
