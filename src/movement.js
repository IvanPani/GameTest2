// Movement units are pixels and seconds; damage/blink durations are milliseconds.
export const MOVEMENT = Object.freeze({
    // Fantasy speed shown at the starting gameplay speed; display only.
    displayedBaseSpeedKmh: 10,
    baseFallSpeed: 190,
    fallSpeedPerButton: 1.6,
    weightPerButton: 0.6,
    steeringSpeed: 310,
    // Response time grows linearly with weight (seconds per kg).
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
export function steer(velocity, targetVelocity, weight, seconds) {
    const delay = weight * MOVEMENT.steeringDelayPerWeight;
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
