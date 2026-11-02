export const COMBO = Object.freeze({
    // Total collected within the current combo: +5, then +10, then +15, then +20.
    multiplierThresholds: Object.freeze([5, 15, 30, 50]),
    pointsPerButton: 10,
    keyboardTestingEnabled: true,
    missesBeforeReset: 3
});

export function getComboMultiplier(streak) {
    return 1 + COMBO.multiplierThresholds.filter(threshold => streak >= threshold).length;
}
