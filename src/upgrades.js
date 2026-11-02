// Initial shop balance: five permanent levels, each costing 1,000 currency.
export const UPGRADES = Object.freeze(Object.fromEntries(['fabric', 'steering'].map(id => [id,
    Object.freeze({ costs: Object.freeze([1000, 1000, 1000, 1000, 1000]) })
])));

export function getRunStats(upgrades = {}) {
    const level = id => Number.isSafeInteger(upgrades[id])
        ? Math.max(0, Math.min(UPGRADES[id].costs.length, upgrades[id])) : 0;
    return Object.freeze({
        maxHealth: 3 + level('fabric'),
        steeringDelayMultiplier: 1 / (1 + 0.25 * level('steering'))
    });
}
