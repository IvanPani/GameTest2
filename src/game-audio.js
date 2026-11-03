export const GAME_AUDIO = Object.freeze([
    ['pickup-x1', new URL('../assets/audio/pickup-x1.wav', import.meta.url).href],
    ['pickup-x2', new URL('../assets/audio/pickup-x2.wav', import.meta.url).href],
    ['pickup-x3', new URL('../assets/audio/pickup-x3.wav', import.meta.url).href],
    ['pickup-x4', new URL('../assets/audio/pickup-x4.wav', import.meta.url).href],
    ['pickup-x5', new URL('../assets/audio/pickup-x5.wav', import.meta.url).href],
    ['hazard-hit', new URL('../assets/audio/hazard-hit.wav', import.meta.url).href]
]);

export function pickupSoundKey(multiplier) {
    const tier = Number.isFinite(multiplier) ? Math.max(1, Math.min(5, Math.floor(multiplier))) : 1;
    return `pickup-x${tier}`;
}

export function playGameSound(scene, key) {
    // Phaser unlocks audio on the first click/tap/key. Drop locked events instead
    // of queuing stale effects that would burst when the browser is unlocked.
    if (!scene.sound || scene.sound.locked || !scene.cache.audio.exists(key)) return false;
    return scene.sound.play(key, { volume: key === 'hazard-hit' ? 0.5 : 0.45 });
}
