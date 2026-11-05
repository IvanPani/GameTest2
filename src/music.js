import { playerData } from './player-data.js';

export const MUSIC_TRACKS = Object.freeze([
    ['music-menu', new URL('../assets/audio/Music/HappyClappyLoop.wav', import.meta.url).href],
    ['music-gameplay', new URL('../assets/audio/Music/Of Far Different Nature - Windfish (CC-BY 4.0).ogg', import.meta.url).href]
]);

// Track volumes range from 0 (silent) to 1 (full volume).
const MUSIC_VOLUME = {
    'music-menu': 0.16,
    'music-gameplay': 0.045
};
const CROSSFADE_MS = 900;
const soundtracks = new WeakMap();

export function setMusic(scene, mode) {
    const manager = scene.sound;
    const key = 'music-' + mode;
    if (!manager || !scene.cache.audio.exists(key)) return;

    // Audio belongs to the game, so camera pans and scene shutdowns don't restart it.
    const game = scene.sys.game;
    let soundtrack = soundtracks.get(game);
    if (!soundtrack) {
        soundtrack = createSoundtrack(game, manager);
        soundtracks.set(game, soundtrack);
    }
    soundtrack.setMuted(!playerData.getAudioSettings().musicEnabled);
    soundtrack.request(key);
}

export function setMusicMuted(scene, muted) {
    soundtracks.get(scene.sys.game)?.setMuted(muted);
}

function createSoundtrack(game, manager) {
    const tracks = new Map();
    let requested;
    let active;
    let fade;
    let muted = false;

    function startRequested() {
        if (manager.locked || !requested) return;
        let incoming = tracks.get(requested);
        if (incoming && incoming === active && (incoming.isPlaying || incoming.isPaused)) return;

        if (!incoming) {
            incoming = manager.add(requested);
            tracks.set(requested, incoming);
        }

        const targetVolume = MUSIC_VOLUME[requested];
        const playing = [...tracks.values()].filter(track => track !== incoming && track.isPlaying);
        if (!incoming.isPlaying && !incoming.isPaused) {
            const volume = playing.length ? 0 : targetVolume;
            if (!incoming.play({ loop: true, volume, mute: muted })) return;
        }

        active = incoming;
        fade = playing.length ? {
            elapsed: 0,
            tracks: [incoming, ...playing].map(track => ({
                track, from: track.volume, to: track === incoming ? targetVolume : 0
            }))
        } : undefined;
        if (!fade) incoming.setVolume(targetVolume);
    }

    function step(_time, delta) {
        startRequested();
        if (!fade || active.isPaused) return;
        fade.elapsed += delta;
        const progress = Math.min(1, fade.elapsed / CROSSFADE_MS);
        for (const { track, from, to } of fade.tracks) {
            track.setVolume(from + (to - from) * progress);
            if (progress === 1 && to === 0) track.stop();
        }
        if (progress === 1) fade = undefined;
    }

    game.events.on('step', step);
    game.events.once('destroy', () => game.events.off('step', step));
    return {
        setMuted(value) {
            if (muted === value) return;
            muted = value;
            for (const track of tracks.values()) track.setMute(muted);
        },
        request(key) {
            requested = key;
            startRequested();
        }
    };
}
