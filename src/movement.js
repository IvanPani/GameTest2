// Movement units are pixels and seconds; damage/blink durations are milliseconds.
export const MOVEMENT = Object.freeze({
    // Fantasy speed shown at the starting gameplay speed; display only.
    displayedBaseSpeedKmh: 30,
    baseFallSpeed: 190,
    fallSpeedPerButton: 2.5,
    weightPerButton: 0.6,
    steeringSpeed: 310,
    // Response time grows linearly with weight (seconds per kg).
    // Baseline response: 0.3s at 10 buttons, 0.75s at 25, 1.5s at 50.
    // Steering upgrades progressively remove this inertia, reaching zero at tier 5.
    steeringDelayPerWeight: 0.05,
    damageInvulnerabilityMs: 2000,
    blinkIntervalMs: 100,
    blinkAlpha: 0.45
});

export function getWeight(buttons) {
    return buttons * MOVEMENT.weightPerButton;
}

export function getFallSpeed(buttons) {
    return MOVEMENT.baseFallSpeed + buttons * MOVEMENT.fallSpeedPerButton;
}

// Exact exponential response and integrated travel: independent of frame rate.
export function steer(velocity, targetVelocity, weight, seconds, delayMultiplier = 1) {
    const delay = weight * MOVEMENT.steeringDelayPerWeight * delayMultiplier;
    if (delay === 0) {
        return { velocity: targetVelocity, distance: targetVelocity * seconds };
    }
    const response = -Math.expm1(-seconds / delay);
    return {
        velocity: velocity + (targetVelocity - velocity) * response,
        distance: targetVelocity * seconds + (velocity - targetVelocity) * delay * response
    };
}

export function getSpeedKmh(buttons) {
    return getFallSpeed(buttons) / MOVEMENT.baseFallSpeed * MOVEMENT.displayedBaseSpeedKmh;
}
