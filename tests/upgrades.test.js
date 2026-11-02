import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerData } from '../src/player-data.js';
import { UPGRADES, getRunStats } from '../src/upgrades.js';
import { steer } from '../src/movement.js';

function fixture() {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    let id = 0;
    const open = () => new PlayerData(() => storage, () => `run-${++id}`);
    return { storage, open };
}

test('each upgrade level costs exactly 1000, persists, and stops at the cap', () => {
    for (const id of Object.keys(UPGRADES)) {
        const { open } = fixture();
        const p = open();
        p.completeRun(p.beginRun(), 6000);
        for (let level = 1; level <= 5; level++) {
            assert.equal(p.purchaseUpgrade(id), true);
            const saved = open().load();
            assert.equal(saved.upgrades[id], level);
            assert.equal(saved.currency, 6000 - level * 1000);
        }
        assert.equal(p.purchaseUpgrade(id), false);
        assert.equal(p.getProfile().currency, 1000);
        assert.equal(p.purchaseUpgrade('unknown'), false);
    }
});

test('insufficient funds and failed saves cannot spend currency or grant upgrades', () => {
    const { open, storage } = fixture();
    const p = open();
    p.completeRun(p.beginRun(), 999);
    assert.equal(p.purchaseUpgrade('fabric'), false);
    p.completeRun(p.beginRun(), 1001);
    const before = p.getProfile();
    storage.setItem = () => { throw new Error('full'); };
    assert.equal(p.purchaseUpgrade('fabric'), false);
    assert.deepEqual(p.getProfile(), before);
    assert.ok(p.saveError);
});

test('bonuses are immutable run snapshots, one extra heart per Fabric level', () => {
    const owned = { fabric: 1, steering: 1 };
    const run = getRunStats(owned);
    assert.equal(run.maxHealth, 4);
    assert.equal(run.steeringDelayMultiplier, 0.8);
    owned.fabric = 5;
    assert.equal(run.maxHealth, 4);
    assert.equal(getRunStats(owned).maxHealth, 8);
    assert.ok(Object.isFrozen(run));
    assert.deepEqual(getRunStats(), { maxHealth: 3, steeringDelayMultiplier: 1 });
    assert.equal(getRunStats({ fabric: 999999, steering: 999999 }).maxHealth, 8);
});

test('Steering improves heavy response while retaining weight and zero-weight handling', () => {
    const base = steer(0, 310, 60, 0.05);
    let previous = base.velocity;
    for (let level = 1; level <= 5; level++) {
        const multiplier = getRunStats({ steering: level }).steeringDelayMultiplier;
        const improved = steer(0, 310, 60, 0.05, multiplier);
        assert.ok(improved.velocity > previous);
        assert.ok(improved.distance > base.distance);
        assert.ok(improved.velocity < steer(0, 310, 0, 0.05, multiplier).velocity);
        assert.deepEqual(steer(0, 310, 0, 0.05, multiplier), steer(0, 310, 0, 0.05));
        previous = improved.velocity;
    }
});
