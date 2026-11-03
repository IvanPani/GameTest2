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
        if (level < 5) assert.ok(improved.velocity < steer(0, 310, 0, 0.05, multiplier).velocity);
        else assert.deepEqual(improved, steer(0, 310, 0, 0.05));
        assert.deepEqual(steer(0, 310, 0, 0.05, multiplier), steer(0, 310, 0, 0.05));
        previous = improved.velocity;
    }
});


test('explicit tier purchases cannot skip levels or rebuy owned tiers; tracks advance independently', () => {
    const { open } = fixture();
    const p = open();
    p.completeRun(p.beginRun(), 6000);
    assert.equal(p.purchaseUpgrade('fabric', 3), false);
    assert.equal(p.getProfile().currency, 6000);
    assert.equal(p.purchaseUpgrade('fabric', 1), true);
    assert.equal(p.purchaseUpgrade('fabric', 1), false);
    assert.equal(p.purchaseUpgrade('fabric', 3), false);
    assert.equal(p.purchaseUpgrade('steering', 1), true);
    assert.equal(p.purchaseUpgrade('fabric', 2), true);
    const saved = open().load();
    assert.deepEqual(saved.upgrades, { fabric: 2, steering: 1 });
    assert.equal(saved.currency, 3000);
});

test('Steering tiers remove delay in 20% steps; max tier immediately turns and stops at every weight', () => {
    assert.deepEqual(Array.from({ length: 6 }, (_, steering) => getRunStats({ steering }).steeringDelayMultiplier),
        [1, 0.8, 0.6, 0.4, 0.2, 0]);
    const max = getRunStats({ steering: 5 }).steeringDelayMultiplier;
    for (const weight of [0, 6, 15, 30, 60, 600]) {
        assert.deepEqual(steer(310, -310, weight, 0.05, max), { velocity: -310, distance: -15.5 });
        assert.deepEqual(steer(310, 0, weight, 0.05, max), { velocity: 0, distance: 0 });
    }
    assert.equal(getRunStats({ steering: 999 }).steeringDelayMultiplier, 0);
    assert.equal(getRunStats({ steering: -1 }).steeringDelayMultiplier, 1);
});
