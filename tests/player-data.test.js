import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerData, SAVE_KEY } from '../src/player-data.js';
import { getWeight } from '../src/movement.js';

function fixture() {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    let id = 0;
    return { data, storage, open: () => new PlayerData(() => storage, () => `run-${++id}`) };
}

test('score banks once across reloads, and a new run has no inherited weight', () => {
    const f = fixture();
    const first = f.open();
    first.load();
    const id = first.beginRun();
    const buttonsCollected = 5;
    assert.equal(getWeight(buttonsCollected), 3);
    assert.equal(first.completeRun(id, 60), true);
    assert.equal(first.completeRun(id, 60), false);
    const second = f.open();
    assert.equal(second.load().currency, 60);
    assert.equal(second.completeRun(id, 60), false);
    const next = second.beginRun();
    assert.notEqual(next, id);
    assert.equal(second.getProfile().currency, 60);
    assert.equal(getWeight(0), 0);
    assert.equal('weight' in second.getProfile(), false);
    assert.equal('score' in second.getProfile(), false);
    second.completeRun(next, 20);
    assert.equal(f.open().load().currency, 80);
});

test('purchases and style survive a new service; invalid transactions change nothing', () => {
    const f = fixture();
    const p = f.open();
    p.completeRun(p.beginRun(), 1080);
    assert.equal(p.purchaseUpgrade('fabric'), true);
    assert.equal(p.purchaseUpgrade('fabric'), false);
    assert.equal(p.purchaseUnlock('patterns', 'chevrons', 30), true);
    assert.equal(p.purchaseUnlock('patterns', 'chevrons', 30), false);
    assert.equal(p.purchaseUnlock('colors', '#123456', 10), true);
    assert.equal(p.purchaseUnlock('cosmetics', 'bow', 10), true);
    assert.equal(p.selectStyle({ patternId: 'chevrons', bodyColor: '#123456' }), true);
    assert.equal(p.selectStyle({ patternId: 'locked' }), false);
    assert.equal(p.purchaseUnlock('cosmetics', 'crown', 99), false);
    const saved = f.open().load();
    assert.equal(saved.currency, 30);
    assert.equal(saved.upgrades.fabric, 1);
    assert.equal(saved.sockStyle.bodyColor, '#123456');
    assert.equal(saved.sockStyle.patternId, 'chevrons');
    assert.deepEqual(saved.unlocks.cosmetics, ['bow']);
});

test('abandoned runs, invalid scores, and mutation of returned profiles cannot grant currency', () => {
    const p = fixture().open();
    const abandoned = p.beginRun();
    const current = p.beginRun();
    assert.equal(p.completeRun(abandoned, 999), false);
    for (const score of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => p.completeRun(current, score));
    }
    const snapshot = p.getProfile();
    snapshot.currency = 999;
    assert.equal(p.getProfile().currency, 0);
    assert.equal(p.completeRun(current, 0), true);
});

test('corrupt and future saves are preserved; malformed fields are validated', () => {
    for (const raw of ['{bad json', '{"schemaVersion":2,"currency":100}']) {
        const f = fixture();
        f.data.set(SAVE_KEY, raw);
        const p = f.open();
        assert.equal(p.load().currency, 0);
        assert.ok(p.saveError);
        p.completeRun(p.beginRun(), 10);
        assert.equal(f.data.get(SAVE_KEY), raw);
    }
    const f = fixture();
    f.data.set(SAVE_KEY, JSON.stringify({ schemaVersion: 1, currency: -9, upgrades: { fabric: 0.5 },
        sockStyle: { patternId: 'locked' }, unlocks: { patterns: [null, 2, 'plain', 'dots'] } }));
    const saved = f.open().load();
    assert.equal(saved.currency, 0);
    assert.equal(saved.upgrades.fabric, 0);
    assert.equal(saved.sockStyle.patternId, 'plain');
    assert.ok(['plain', 'dots', 'stripes', 'stars', 'crescents', 'skulls', 'spirals'].every(id => saved.unlocks.patterns.includes(id)));
    assert.equal(saved.unlocks.patterns.some(id => typeof id !== 'string'), false);
});

test('unavailable and full storage do not crash, and display a save error', () => {
    const denied = new PlayerData(() => { throw new Error('denied'); }, () => 'run');
    denied.load();
    denied.completeRun(denied.beginRun(), 10);
    assert.ok(denied.saveError);
    const full = new PlayerData(() => ({ getItem: () => null, setItem: () => { throw new Error('full'); } }), () => 'run');
    full.completeRun(full.beginRun(), 10);
    assert.equal(full.getProfile().currency, 10);
    assert.equal(full.completeRun('run', 10), false);
    assert.ok(full.saveError);
});
