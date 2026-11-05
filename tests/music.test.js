import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { setMusic, setMusicMuted } from '../src/music.js';

test('the single background loop starts after unlock and continues across scenes', () => {
    const starts = [];
    const track = {
        play(config) {
            starts.push(config);
            this.isPlaying = true;
        },
        setMute(muted) { this.muted = muted; }
    };
    const sound = Object.assign(new EventEmitter(), {
        locked: true,
        add(key) {
            assert.equal(key, 'music-menu');
            return track;
        }
    });
    const scene = () => ({ sound, cache: { audio: { exists: () => true } } });

    setMusic(scene());
    setMusic(scene());
    assert.equal(starts.length, 0);
    sound.locked = false;
    sound.emit('unlocked');
    setMusic(scene());
    setMusic(scene());
    assert.equal(starts.length, 1);
    assert.equal(starts[0].loop, true);
    assert.ok(starts[0].volume > 0 && starts[0].volume < 1);
    setMusicMuted(scene(), true);
    assert.equal(track.muted, true);
    setMusicMuted(scene(), false);
    assert.equal(track.muted, false);
    assert.equal(starts.length, 1);
});
