import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerData, SAVE_KEY, defaultProfile } from '../src/player-data.js';
import { defaultRecords, validateRecords } from '../src/records.js';

function fixture(initial) {
    const data = new Map(initial ? [[SAVE_KEY, JSON.stringify(initial)]] : []);
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    let id = 0;
    return () => new PlayerData(() => storage, () => `run-${++id}`);
}

test('run records persist once with currency and combine maxima and lifetime totals', () => {
    const open = fixture();
    const p = open();
    const id = p.beginRun();
    assert.equal(p.getProfile().records.totalRuns, 0);
    p.completeRun(id, 1200, { totalButtons: 40, speedKmh: 45.8, weight: 24, maxCombo: 25 });
    assert.equal(p.completeRun(id, 1200, { totalButtons: 40 }), false);
    assert.deepEqual(open().load().records, {
        bestScore: 1200, maxSpeedKmh: 45.8, maxWeight: 24, maxStreak: 25,
        totalCurrencyEarned: 1200, totalRuns: 1, completedRuns: 0, totalButtons: 40, mostButtons: 40
    });
    p.completeRun(p.beginRun(), 300, { totalButtons: 50, speedKmh: 49.7, weight: 30, maxCombo: 8 });
    assert.deepEqual(open().load().records, {
        bestScore: 1200, maxSpeedKmh: 49.7, maxWeight: 30, maxStreak: 25,
        totalCurrencyEarned: 1500, totalRuns: 2, completedRuns: 0, totalButtons: 90, mostButtons: 50
    });
    assert.equal(p.purchaseUpgrade('fabric'), true);
    assert.equal(p.getProfile().currency, 1000);
    assert.equal(open().load().records.totalCurrencyEarned, 1500);
});

test('existing saves keep money, upgrades and appearance without inventing past run history', () => {
    const legacy = defaultProfile();
    delete legacy.records;
    legacy.currency = 765;
    legacy.upgrades.fabric = 2;
    legacy.sockStyle.bodyColor = '#8bc78b';
    const loaded = fixture(legacy)().load();
    assert.equal(loaded.currency, 765);
    assert.equal(loaded.upgrades.fabric, 2);
    assert.equal(loaded.sockStyle.bodyColor, '#8bc78b');
    assert.deepEqual(loaded.records, defaultRecords());
});

test('invalid record fields and run metadata cannot poison the save', () => {
    assert.deepEqual(validateRecords({ bestScore: -1, maxSpeedKmh: Infinity, maxWeight: NaN,
        maxStreak: 1.5, totalRuns: '9', totalButtons: null }), defaultRecords());
    const p = fixture()();
    p.completeRun(p.beginRun(), 0, { totalButtons: -5, speedKmh: NaN, weight: -3, maxCombo: Infinity });
    assert.deepEqual(p.getProfile().records, { ...defaultRecords(), totalRuns: 1 });
    const before = p.getProfile();
    const abandoned = p.beginRun();
    const active = p.beginRun();
    assert.equal(p.completeRun(abandoned, 100), false);
    assert.throws(() => p.completeRun(active, -1));
    assert.deepEqual(p.getProfile().records, before.records);
});


test('consecutive pickup streak takes precedence over the more forgiving scoring combo', () => {
    const p = fixture()();
    p.completeRun(p.beginRun(), 100, { totalButtons: 12, maxCombo: 12, bestPickupStreak: 4 });
    assert.equal(p.getProfile().records.maxStreak, 4);
    p.completeRun(p.beginRun(), 0, { maxCombo: 20, bestPickupStreak: 0 });
    assert.equal(p.getProfile().records.maxStreak, 4);
});

test('successful reunions count separately from deaths and persist exactly once across reloads', () => {
    const open = fixture();
    const p = open();
    p.completeRun(p.beginRun(), 10, { completed: false });
    assert.equal(p.getProfile().records.completedRuns, 0);
    const run = p.beginRun();
    p.completeRun(run, 123, { completed: true, totalButtons: 10 });
    const reloaded = open();
    assert.equal(reloaded.load().records.completedRuns, 1);
    assert.equal(reloaded.completeRun(run, 123, { completed: true }), false);
    assert.equal(reloaded.getProfile().currency, 133);
    reloaded.completeRun(reloaded.beginRun(), 30, { completed: true });
    assert.equal(open().load().records.completedRuns, 2);
    assert.equal(open().load().records.totalRuns, 3);
});

test('old run totals never turn into victories; completion requires a true boolean', () => {
    const old = defaultProfile();
    delete old.records.completedRuns;
    old.records.totalRuns = 50;
    const p = fixture(old)();
    assert.equal(p.load().records.completedRuns, 0);
    p.completeRun(p.beginRun(), 0, { completed: 'true' });
    assert.equal(p.getProfile().records.completedRuns, 0);
});
