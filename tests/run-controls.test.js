import test from 'node:test';
import assert from 'node:assert/strict';
import { setRunPaused } from '../src/run-controls.js';
import { PlayerData, defaultProfile, SAVE_KEY } from '../src/player-data.js';

test('pause freezes animation/timers/audio, cancels steering, and resumes without changing progress', () => {
    const calls=[];
    const scene={runEnded:false,runPaused:false,score:120,health:2,player:{x:200,sock:{anims:{pause:()=>calls.push('animation pause'),resume:()=>calls.push('animation resume')}}},
        dragSteering:{cancel:()=>calls.push('cancel')},pointerSteering:true,steeringVelocity:150,targetX:350,time:{paused:false},
        tweens:{pauseAll:()=>calls.push('tween pause'),resumeAll:()=>calls.push('tween resume')},
        sound:{pauseAll:()=>calls.push('audio pause'),resumeAll:()=>calls.push('audio resume')}};
    setRunPaused(scene,true);
    assert.equal(scene.runPaused,true);assert.equal(scene.time.paused,true);assert.equal(scene.pointerSteering,false);
    assert.equal(scene.steeringVelocity,0);assert.equal(scene.targetX,200);
    const count=calls.length;setRunPaused(scene,true);assert.equal(calls.length,count);
    setRunPaused(scene,false);assert.equal(scene.time.paused,false);assert.equal(scene.runPaused,false);
    assert.equal(scene.score,120);assert.equal(scene.health,2);assert.ok(calls.includes('audio resume'));
    scene.runEnded=true;setRunPaused(scene,true);assert.equal(scene.runPaused,false);
});

test('music and SFX persist independently and inherit the legacy sound setting', () => {
    const profile = { ...defaultProfile(), currency: 5000, settings: { soundEnabled: false } };
    let saved = JSON.stringify(profile);
    const storage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
    const player = new PlayerData(() => storage);
    assert.deepEqual(player.getAudioSettings(), { musicEnabled: false, sfxEnabled: false });
    assert.equal(player.setAudioEnabled('musicEnabled', true), true);
    assert.deepEqual(new PlayerData(() => storage).getAudioSettings(), { musicEnabled: true, sfxEnabled: false });
    assert.equal(player.setAudioEnabled('sfxEnabled', 'true'), false);
    assert.equal(player.setAudioEnabled('other', true), false);
    assert.equal(player.getProfile().currency, 5000);
    delete profile.settings;
    saved = JSON.stringify(profile);
    assert.deepEqual(new PlayerData(() => storage).getAudioSettings(), { musicEnabled: true, sfxEnabled: true });
});
