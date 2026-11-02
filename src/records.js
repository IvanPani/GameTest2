const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const measurement = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER ? value : 0;
const add = (a, b) => Math.min(Number.MAX_SAFE_INTEGER, a + b);

export function defaultRecords() {
    return { bestScore: 0, maxSpeedKmh: 0, maxWeight: 0, maxStreak: 0,
        totalCurrencyEarned: 0, totalRuns: 0, totalButtons: 0, mostButtons: 0 };
}

export function validateRecords(raw = {}) {
    const records = defaultRecords();
    for (const key of Object.keys(records)) {
        records[key] = ['maxSpeedKmh', 'maxWeight'].includes(key)
            ? measurement(raw?.[key]) : count(raw?.[key]);
    }
    return records;
}

export function recordCompletedRun(previous, score, result = {}) {
    const records = validateRecords(previous);
    const buttons = count(result?.totalButtons);
    return {
        bestScore: Math.max(records.bestScore, score),
        maxSpeedKmh: Math.max(records.maxSpeedKmh, measurement(result?.speedKmh)),
        maxWeight: Math.max(records.maxWeight, measurement(result?.weight)),
        maxStreak: Math.max(records.maxStreak, count(result?.bestPickupStreak ?? result?.maxCombo)),
        totalCurrencyEarned: add(records.totalCurrencyEarned, score),
        totalRuns: add(records.totalRuns, 1),
        totalButtons: add(records.totalButtons, buttons),
        mostButtons: Math.max(records.mostButtons, buttons)
    };
}
