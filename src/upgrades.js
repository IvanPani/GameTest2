// Initial shop balance: five permanent levels, each costing 1,000 currency.
export const UPGRADES = Object.freeze(Object.fromEntries(['fabric', 'steering'].map(id => [id,
    Object.freeze({ costs: Object.freeze([1000, 1000, 1000, 1000, 1000]) })
])));

// Each purchase removes another 20% of weight-induced steering delay.
const STEERING_DELAY_BY_LEVEL = Object.freeze([1, 0.8, 0.6, 0.4, 0.2, 0]);

export function getRunStats(upgrades = {}) {
    const level = id => Number.isSafeInteger(upgrades[id])
        ? Math.max(0, Math.min(UPGRADES[id].costs.length, upgrades[id])) : 0;
    return Object.freeze({
        maxHealth: 3 + level('fabric'),
        steeringDelayMultiplier: STEERING_DELAY_BY_LEVEL[level('steering')]
    });
}
