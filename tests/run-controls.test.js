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

test('sound preference survives reload and old saves default to enabled without changing wallet', () => {
    let saved=JSON.stringify({...defaultProfile(),currency:5000});
    const storage={getItem:()=>saved,setItem:(_,value)=>{saved=value;}};
    const p=new PlayerData(()=>storage);p.load();p.setSoundEnabled(false);
    assert.equal(new PlayerData(()=>storage).load().settings.soundEnabled,false);
    assert.equal(p.getProfile().currency,5000);assert.equal(p.setSoundEnabled('false'),false);
    const old=defaultProfile();delete old.settings;saved=JSON.stringify(old);
    assert.equal(new PlayerData(()=>storage).load().settings.soundEnabled,true);
});
