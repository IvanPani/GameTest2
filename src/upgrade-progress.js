import { UPGRADES } from './upgrades.js';

// Only currently purchasable levels count toward the next progression goal.
export function getUpgradeProgress(profile) {
    const prices = Object.entries(UPGRADES)
        .map(([id, definition]) => definition.costs[profile.upgrades[id]])
        .filter(price => price !== undefined);
    if (prices.length === 0) return { remaining: 0, message: 'All upgrades complete!' };
    const remaining = Math.max(0, Math.min(...prices) - profile.currency);
    return {
        remaining,
        message: remaining === 0 ? 'Upgrade ready at the sewing table!'
            : `${remaining.toLocaleString('en-US')} currency to your next upgrade`
    };
}
