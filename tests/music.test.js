import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setMusic } from '../src/music.js';

function fixture() {
    const tracks = new Map();
    const events = new EventEmitter();
    const sound = {
        locked: false,
        add(key) {
            const track = {
                starts: 0,
                isPlaying: false,
                play({ loop, volume }) {
                    this.starts++;
                    this.loop = loop;
                    this.volume = volume;
                    this.isPlaying = true;
                    return true;
                },
                setVolume(volume) { this.volume = volume; },
                stop() { this.isPlaying = false; }
            };
            tracks.set(key, track);
            return track;
        }
    };
    const scene = { sound, sys: { game: { events } }, cache: { audio: { exists: () => true } } };
    return { scene, tracks, step: delta => events.emit('step', 0, delta) };
}

test('music waits for audio unlock and a second scene requesting the same loop keeps it playing', () => {
    const { scene, tracks, step } = fixture();
    scene.sound.locked = true;
    setMusic(scene, 'menu');
    step(16);
    assert.equal(tracks.size, 0);
    scene.sound.locked = false;
    step(16);
    setMusic({ ...scene }, 'menu');
    const menu = tracks.get('music-menu');
    assert.equal(menu.starts, 1);
    assert.equal(menu.loop, true);
    assert.ok(menu.volume > 0);
});

test('tracks overlap in both directions and an interrupted fade keeps the current volumes', () => {
    const directGameplay = fixture();
    setMusic(directGameplay.scene, 'gameplay');
    const gameplayVolume = directGameplay.tracks.get('music-gameplay').volume;

    const { scene, tracks, step } = fixture();
    setMusic(scene, 'menu');
    const menu = tracks.get('music-menu');
    const fullVolume = menu.volume;
    setMusic(scene, 'gameplay');
    const gameplay = tracks.get('music-gameplay');
    assert.equal(gameplay.loop, true);
    assert.equal(gameplay.volume, 0);
    step(450);
    assert.equal(menu.volume, fullVolume / 2);
    assert.equal(gameplay.volume, gameplayVolume / 2);
    assert.ok(menu.isPlaying && gameplay.isPlaying);

    setMusic(scene, 'menu');
    assert.equal(menu.volume, fullVolume / 2);
    assert.equal(gameplay.volume, gameplayVolume / 2);
    step(900);
    assert.equal(menu.volume, fullVolume);
    assert.equal(menu.starts, 1);
    assert.equal(gameplay.isPlaying, false);

    setMusic(scene, 'gameplay');
    step(900);
    assert.equal(gameplay.volume, gameplayVolume);
    assert.ok(gameplay.volume < fullVolume);
    assert.equal(menu.isPlaying, false);
    setMusic(scene, 'menu');
    step(900);
    assert.equal(menu.volume, fullVolume);
    assert.equal(gameplay.isPlaying, false);
});
