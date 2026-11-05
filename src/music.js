import { playerData } from './player-data.js';

const MUSIC_KEY = 'music-menu';
export const MUSIC_TRACKS = Object.freeze([
    [MUSIC_KEY, new URL('../assets/audio/Music/HappyClappyLoop.wav', import.meta.url).href]
]);

// Volume ranges from 0 (silent) to 1 (full volume).
const MUSIC_VOLUME = 0.08;
const soundtracks = new WeakMap();

export function setMusic(scene) {
    const manager = scene.sound;
    if (!manager || !scene.cache.audio.exists(MUSIC_KEY)) return;

    // The sound manager is shared by all scenes, so the loop survives scene changes.
    let soundtrack = soundtracks.get(manager);
    if (!soundtrack) {
        soundtrack = { track: null };
        soundtracks.set(manager, soundtrack);
        if (manager.locked) manager.once('unlocked', () => startLoop(manager, soundtrack));
    }

    if (!manager.locked) startLoop(manager, soundtrack);
}

function startLoop(manager, soundtrack) {
    soundtrack.track ??= manager.add(MUSIC_KEY);
    const track = soundtrack.track;
    if (track.isPlaying || track.isPaused) return;
    track.play({ loop: true, volume: MUSIC_VOLUME, mute: !playerData.getAudioSettings().musicEnabled });
}

export function setMusicMuted(scene, muted) {
    soundtracks.get(scene.sound)?.track?.setMute(muted);
}
