export const HAZARD_ART = Object.freeze([
    { key: 'rusty-nut', url: new URL('../assets/Falling_Socks_5_Hazard_Sprites (1)/rusty_nut.png', import.meta.url).href },
    { key: 'valve-wheel', url: new URL('../assets/Falling_Socks_5_Hazard_Sprites (1)/valve_wheel.png', import.meta.url).href },
    { key: 'crushed-can', url: new URL('../assets/Falling_Socks_5_Hazard_Sprites (1)/crushed_can.png', import.meta.url).href },
    { key: 'bottle-shard', url: new URL('../assets/Falling_Socks_5_Hazard_Sprites (1)/bottle_shard.png', import.meta.url).href },
    { key: 'toy-block', url: new URL('../assets/Falling_Socks_5_Hazard_Sprites (1)/toy_block.png', import.meta.url).href }
].map(Object.freeze));

// Each table totals 100. Deeper areas retain every earlier danger.
export const HAZARD_POOLS = Object.freeze([
    [['soap', 30], ['rusty-nut', 35], ['valve-wheel', 35]],
    [['soap', 20], ['rusty-nut', 40], ['valve-wheel', 40]],
    [['soap', 10], ['rusty-nut', 10], ['valve-wheel', 10], ['crushed-can', 35], ['bottle-shard', 35]],
    [['soap', 8], ['rusty-nut', 8], ['valve-wheel', 8], ['crushed-can', 8], ['bottle-shard', 8], ['toy-block', 60]]
].map(pool => Object.freeze(pool.map(Object.freeze))));

export function chooseHazard(regionIndex, random = Math.random) {
    const pool = HAZARD_POOLS[regionIndex] || HAZARD_POOLS[0];
    let roll = Math.max(0, Math.min(1, random())) * 100;
    for (const [key, weight] of pool) {
        roll -= weight;
        if (roll < 0) return key;
    }
    return pool.at(-1)[0];
}

// Tight visual frames keep transparent PNG padding out of sizing/spawn clearance.
// Internal transparent holes remain part of the alpha mask, never solid boxes.
export function getMaskBounds({ width, height, pixels }) {
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        if (!pixels[y * width + x]) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
