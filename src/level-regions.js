// Change these distances to tune area lengths without changing run mechanics.
// Visual travel only: hazards, steering and button physics retain their speed.
// Target approximately four minutes across all four areas with ideal collection.
export const BACKGROUND_SPEED_MULTIPLIER = 0.18;
// Preserve the total route length after removing Washing Machine.
export const REGION_DISTANCE = 7500;
export const REGION_BLEND_DISTANCE = 600;
export const LEVEL_REGIONS = Object.freeze([
    { key: 'pipes-background', name: 'PIPES', url: new URL('../assets/sprites/Levels/Level_Pipes.png', import.meta.url).href },
    { key: 'rusted-pipes-background', name: 'RUSTED PIPES', url: new URL('../assets/sprites/Levels/Level_Rusted_Pipes.png', import.meta.url).href },
    { key: 'sewer-background', name: 'SEWER', url: new URL('../assets/sprites/Levels/Level_Sewer_Sistem.png', import.meta.url).href },
    { key: 'pit-background', name: 'PIT OF LOST THINGS', url: new URL('../assets/sprites/Levels/Level_Pit_of_Lost_thing.png', import.meta.url).href }
].map(Object.freeze));

export function getRegionProgress(distance) {
    const safeDistance = Number.isFinite(distance) ? Math.max(0, distance) : 0;
    const index = Math.min(Math.floor(safeDistance / REGION_DISTANCE), LEVEL_REGIONS.length - 1);
    const localDistance = Math.min(safeDistance - index * REGION_DISTANCE, REGION_DISTANCE);
    return {
        index,
        progress: localDistance / REGION_DISTANCE,
        blend: index === LEVEL_REGIONS.length - 1 ? 0
            : Math.max(0, (localDistance - (REGION_DISTANCE - REGION_BLEND_DISTANCE)) / REGION_BLEND_DISTANCE)
    };
}

// End checkpoints leave a short approach before the blend, so it can be inspected.
export function getDevCheckpoint(checkpoint) {
    if (!Number.isInteger(checkpoint) || checkpoint < 1 || checkpoint > LEVEL_REGIONS.length * 2) return null;
    const index = Math.floor((checkpoint - 1) / 2);
    const atEnd = checkpoint % 2 === 0;
    const leadIn = index === LEVEL_REGIONS.length - 1 ? 240 : REGION_BLEND_DISTANCE + 240;
    return { index, distance: (index + (atEnd ? 1 : 0)) * REGION_DISTANCE - (atEnd ? leadIn : 0) };
}
