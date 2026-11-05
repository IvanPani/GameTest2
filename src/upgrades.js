// Five permanent levels; each successive tier doubles in price.
export const UPGRADES = Object.freeze(Object.fromEntries(['fabric', 'steering'].map(id => [id,
    Object.freeze({ costs: Object.freeze([500, 1000, 2000, 4000, 8000]) })
])));

// Each purchase removes another 20% of weight-induced steering delay.
const STEERING_DELAY_BY_LEVEL = Object.freeze([1, 0.8, 0.6, 0.4, 0.2, 0]);

export function getRunStats(upgrades = {}) {
    const level = id => Number.isSafeInteger(upgrades[id])
        ? Math.max(0, Math.min(UPGRADES[id].costs.length, upgrades[id])) : 0;
    return Object.freeze({
        maxHealth: 3 + level('fabric'),
        steeringDelayMultiplier: STEERING_DELAY_BY_LEVEL[level('steering')],
        steeringSpeedMultiplier: 1 + 0.1 * level('steering')
    });
}

// Session-only presets let testing bypass purchases without touching the save.
const DEV_UPGRADE_MODES = ['saved', 'max', 'locked'];
let devUpgradeMode = 'saved';

export function cycleDevUpgrades() {
    const index = DEV_UPGRADE_MODES.indexOf(devUpgradeMode);
    devUpgradeMode = DEV_UPGRADE_MODES[(index + 1) % DEV_UPGRADE_MODES.length];
}

export function getDevUpgradeMode() {
    return devUpgradeMode === 'saved' ? null : devUpgradeMode;
}

export function getEffectiveUpgrades(savedUpgrades) {
    if (devUpgradeMode === 'saved') return savedUpgrades;
    return Object.fromEntries(Object.entries(UPGRADES).map(([id, upgrade]) => [
        id, devUpgradeMode === 'max' ? upgrade.costs.length : 0
    ]));
}
