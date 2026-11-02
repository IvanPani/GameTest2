import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerData } from '../src/player-data.js';
import { getRunStats } from '../src/upgrades.js';
import { getUpgradeProgress } from '../src/upgrade-progress.js';
import { scorePickups } from '../scripts/balance-report.mjs';

test('several losing runs fund a permanent upgrade, then the next run keeps ownership and empty weight', () => {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    let run = 0;
    const open = () => new PlayerData(() => storage, () => `run-${++run}`);
    let p = open();
    for (let index = 0; index < 3; index++) {
        const id = p.beginRun();
        assert.equal(p.completeRun(id, scorePickups(25, 10)), true);
        assert.equal(p.completeRun(id, scorePickups(25, 10)), false);
        p = open();
        p.load();
    }
    assert.equal(p.getProfile().currency, 1140);
    assert.equal(getUpgradeProgress(p.getProfile()).remaining, 0);
    assert.equal(p.purchaseUpgrade('fabric'), true);
    assert.equal(p.getProfile().currency, 140);
    p = open();
    p.load();
    p.beginRun();
    assert.equal(getRunStats(p.getProfile().upgrades).maxHealth, 4);
    assert.equal('weight' in p.getProfile(), false);
    assert.equal(getUpgradeProgress(p.getProfile()).remaining, 860);
});

test('progress accounts for the remaining purchasable upgrade and completes cleanly', () => {
    assert.equal(getUpgradeProgress({ currency: 100, upgrades: { fabric: 5, steering: 0 } }).remaining, 900);
    assert.equal(getUpgradeProgress({ currency: 1000, upgrades: { fabric: 0, steering: 0 } }).remaining, 0);
    assert.match(getUpgradeProgress({ currency: 0, upgrades: { fabric: 5, steering: 5 } }).message, /complete/i);
});

test('reward baseline reflects actual combo thresholds and interrupted streaks', () => {
    assert.equal(scorePickups(12, 4), 120);
    assert.equal(scorePickups(25, 10), 380);
    assert.equal(scorePickups(36), 970);
    assert.equal(scorePickups(37), 1010);
    assert.equal(scorePickups(50), 1540);
});
