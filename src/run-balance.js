// Distances are gameplay pixels travelled by falling objects, not wall-clock time.
export const SPAWNING = Object.freeze({
    firstObstacleDistance: 500,
    firstButtonDistance: 152,
    buttonGapMin: 340,
    buttonGapMax: 460,
    clearance: 24,
    obstacleGapStart: 900,
    obstacleGapEnd: 300,
    obstacleGapJitter: 0.15
});

// The base hazard rate increases exponentially and continuously with descent.
// This changes density without abrupt resets at the biome boundaries.
export function getHazardSpawnGap(progress, random = Math.random) {
    const depth = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    const base = SPAWNING.obstacleGapStart * (SPAWNING.obstacleGapEnd / SPAWNING.obstacleGapStart) ** depth;
    const jitter = 1 + (Math.max(0, Math.min(1, random())) * 2 - 1) * SPAWNING.obstacleGapJitter;
    return Math.round(base * jitter);
}
