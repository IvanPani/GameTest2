// Scenarios use actual reward/upgrade/movement definitions. They are arithmetic
// comparisons, not a model of collision survival or measured human playtime.
import { COMBO, getComboMultiplier } from '../src/combo.js';
import { UPGRADES, getRunStats } from '../src/upgrades.js';
import { MOVEMENT, getWeight, steer } from '../src/movement.js';

export function scorePickups(count, resetEvery = Infinity) {
    let score = 0;
    for (let index = 0; index < count; index++) {
        score += COMBO.pointsPerButton * getComboMultiplier(index % resetEvery + 1);
    }
    return score;
}

export function balanceReport() {
    const price = UPGRADES.fabric.costs[0];
    const lines = [
        '# Falling Socks — balance baseline', '',
        'Generated from the current game definitions. These are illustrative pickup/reset scenarios, not measured player results. Resets represent damage or three consecutive misses. Run length and spawn success are not simulated.', '',
        '| Scenario | Pickups/run | Reset after pickups | Currency/run | Runs to first upgrade | Runs to all 10 levels* |',
        '| --- | ---: | ---: | ---: | ---: | ---: |'
    ];
    const totalCost = Object.values(UPGRADES).flatMap(definition => definition.costs).reduce((a, b) => a + b, 0);
    for (const [label, count, reset] of [
        ['Short, interrupted streaks', 12, 4],
        ['Developing consistency', 25, 10],
        ['Unbroken combo', 50, Infinity]
    ]) {
        const score = scorePickups(count, reset);
        lines.push(`| ${label} | ${count} | ${Number.isFinite(reset) ? reset : 'Never'} | ${score} | ${Math.ceil(price / score)} | ${Math.ceil(totalCost / score)} |`);
    }
    let pickups = 1;
    while (scorePickups(pickups) < price) pickups++;
    lines.push('', `First upgrade from a perfect streak: **${pickups} pickups / ${scorePickups(pickups)} currency**.`, '',
        '*All-level estimates assume the same rewards every run and retain spare currency. Upgrades may change survival and earning; these figures do not predict completion time.', '',
        '| Level | Price/level | Total hearts | More hits than base | Less steering delay | Heavy steering speed after 50 ms** |',
        '| ---: | ---: | ---: | ---: | ---: | ---: |');
    for (let level = 0; level <= UPGRADES.fabric.costs.length; level++) {
        const stats = getRunStats({ fabric: level, steering: level });
        const response = steer(0, MOVEMENT.steeringSpeed, getWeight(100), 0.05, stats.steeringDelayMultiplier);
        lines.push(`| ${level} | ${level ? price : '—'} | ${stats.maxHealth} | ${Math.round((stats.maxHealth / 3 - 1) * 100)}% | ${Math.round((1 - stats.steeringDelayMultiplier) * 100)}% | ${response.velocity.toFixed(1)} px/s |`);
    }
    lines.push('', '**At 100 collected buttons (60 kg), starting from rest toward maximum input. Steering still responds more slowly under weight; top steering speed and falling speed are unchanged.', '',
        'This report cannot establish whether steering feels good or estimate real currency/minute. Record duration, pickups, score, owned levels and perceived control for real runs before changing prices or rewards.');
    return lines.join('\n');
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) console.log(balanceReport());
