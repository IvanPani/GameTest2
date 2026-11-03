// Change these distances to tune area lengths without changing run mechanics.
// Visual travel only: hazards, steering and button physics retain their speed.
// Target approximately four minutes across all four areas with ideal collection.
// Retain the 3–5 minute ideal run target with fewer pickups and capped speed.
export const BACKGROUND_SPEED_MULTIPLIER = 0.23;
// Preserve the total route length after removing Washing Machine.
export const REGION_DISTANCE = 7500;
export const STACK_SEAM_OVERLAP = 32;
export const LEVEL_REGIONS = Object.freeze([
    { key: 'pipes-background', width: 743, height: 2117, name: 'PIPES', url: new URL('../assets/sprites/Levels/Level_Pipes.png', import.meta.url).href },
    { key: 'rusted-pipes-background', width: 743, height: 2116, name: 'RUSTED PIPES', url: new URL('../assets/sprites/Levels/Level_Rusted_Pipes.png', import.meta.url).href },
    { key: 'sewer-background', width: 742, height: 2119, name: 'SEWER', url: new URL('../assets/sprites/Levels/Level_Sewer_Sistem.png', import.meta.url).href },
    { key: 'pit-background', width: 743, height: 2117, name: 'PIT OF LOST THINGS', url: new URL('../assets/sprites/Levels/Level_Pit_of_Lost_thing.png', import.meta.url).href }
].map(Object.freeze));

// All four illustrations occupy one vertical world. Progress maps to one camera
// offset so scroll speed never resets or slows at a biome boundary.
export function getBackgroundLayout(width = 400, viewportHeight = 700) {
    let top = 0;
    const sections = LEVEL_REGIONS.map((region, index) => {
        const scale = Math.max(width / region.width, viewportHeight / region.height);
        const height = region.height * scale;
        const section = { top, height };
        top += height - (index < LEVEL_REGIONS.length - 1 ? STACK_SEAM_OVERLAP : 0);
        return section;
    });
    return { sections, maxOffset: Math.max(0, top - viewportHeight), viewportHeight };
}

export function getStackOffset(distance, layout = getBackgroundLayout()) {
    const safe = Number.isFinite(distance) ? Math.max(0, distance) : 0;
    return Math.min(safe / (LEVEL_REGIONS.length * REGION_DISTANCE), 1) * layout.maxOffset;
}

export function getRegionProgress(distance, layout = getBackgroundLayout()) {
    const offset = getStackOffset(distance, layout);
    let index = 0;
    while (index < layout.sections.length - 1 && offset >= layout.sections[index + 1].top - 1e-6) index++;
    const section = layout.sections[index];
    const travel = index === layout.sections.length - 1 ? section.height - layout.viewportHeight : section.height;
    return { index, progress: offset >= layout.maxOffset ? 1 : Math.min(1, Math.max(0, (offset - section.top) / travel)) };
}

// End shortcuts show the outgoing art just before the next section enters below.
export function getDevCheckpoint(checkpoint) {
    if (checkpoint === 9) return { index: LEVEL_REGIONS.length - 1,
        distance: LEVEL_REGIONS.length * REGION_DISTANCE - 60 };
    if (!Number.isInteger(checkpoint) || checkpoint < 1 || checkpoint > LEVEL_REGIONS.length * 2) return null;
    const layout = getBackgroundLayout();
    const index = Math.floor((checkpoint - 1) / 2);
    const atEnd = checkpoint % 2 === 0;
    const offset = atEnd
        ? (index === LEVEL_REGIONS.length - 1 ? layout.maxOffset - 32
            : layout.sections[index + 1].top - layout.viewportHeight - 32)
        : layout.sections[index].top;
    return { index, distance: offset / layout.maxOffset * LEVEL_REGIONS.length * REGION_DISTANCE };
}

// Explicit testing switch, also available when testing a built/preview copy.
export const DEV_CHECKPOINTS_ENABLED = true;

export function getDevShortcut(event) {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;
    const code = /^(?:Digit|Numpad)([1-9])$/.exec(event.code || '');
    if (code) return Number(code[1]);
    if (/^[1-9]$/.test(event.key || '')) return Number(event.key);
    const value = event.keyCode ?? event.which;
    if (value >= 49 && value <= 57) return value - 48;
    if (value >= 97 && value <= 105) return value - 96;
    return null;
}
