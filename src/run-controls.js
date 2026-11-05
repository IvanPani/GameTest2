import { setMusicMuted } from './music.js';
import { stopGameSounds } from './game-audio.js';
import { playerData } from './player-data.js';

export function setRunPaused(scene, paused) {
    if (scene.runEnded || scene.runPaused === paused) return;
    scene.runPaused = paused;
    scene.dragSteering?.cancel();
    scene.pointerSteering = false;
    scene.steeringVelocity = 0;
    scene.targetX = scene.player.x;
    scene.time.paused = paused;
    if (paused) {
        scene.tweens.pauseAll();
        scene.player.sock.anims.pause();
        scene.sound.pauseAll();
    } else {
        scene.tweens.resumeAll();
        scene.player.sock.anims.resume();
        scene.sound.resumeAll();
    }
    scene.pauseOverlay?.setVisible(paused);
    scene.pauseControl?.label.setText(paused ? 'RESUME' : 'PAUSE');
    scene.pauseControl?.button.setTexture(paused ? 'customize-pattern-selected' : 'customize-pattern-default').setDisplaySize(72, 28);
}

function hudButton(scene, x, y, text, { depth, scrollFactor = 1, canToggle }, action) {
    const button = scene.add.image(x, y, 'customize-pattern-default')
        .setDisplaySize(72, 28).setDepth(depth).setScrollFactor(scrollFactor)
        .setInteractive({ useHandCursor: true });
    const label = scene.add.text(x, y, text, {
        fontFamily: 'Fredoka, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#4b3027'
    }).setOrigin(0.5).setDepth(depth + 1).setScrollFactor(scrollFactor);
    button.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        if (canToggle()) action();
    });
    return { button, label };
}

export function createAudioControls(scene, y, options) {
    const createToggle = (x, channel, name, onToggle) => {
        const refresh = () => {
            const enabled = playerData.getAudioSettings()[channel];
            control.label.setText(name + (enabled ? ' ON' : ' OFF'));
            control.button.setTexture(enabled ? 'customize-pattern-selected' : 'customize-pattern-default')
                .setDisplaySize(72, 28);
        };
        const control = hudButton(scene, x, y, '', options, () => {
            const enabled = !playerData.getAudioSettings()[channel];
            playerData.setAudioEnabled(channel, enabled);
            onToggle(enabled);
            refresh();
        });
        refresh();
        return control;
    };
    return {
        sfx: createToggle(285, 'sfxEnabled', 'SFX', enabled => {
            if (!enabled) stopGameSounds(scene);
        }),
        music: createToggle(363, 'musicEnabled', 'MUSIC', enabled => setMusicMuted(scene, !enabled))
    };
}

export function createRunControls(scene) {
    const options = { depth: 41, canToggle: () => !scene.runEnded };
    scene.pauseControl = hudButton(scene, 185, 92, 'PAUSE', options, () => setRunPaused(scene, !scene.runPaused));
    scene.audioControls = createAudioControls(scene, 76, options);
    const shade = scene.add.rectangle(200,404,400,592,0x09121c,0.78).setInteractive();
    shade.on('pointerdown',(pointer,x,y,event)=>event.stopPropagation());
    scene.pauseOverlay = scene.add.container(0,0,[shade,
        scene.add.text(200,310,'PAUSED',{...scene.hudStyle(40,'#fff0c8')}).setOrigin(0.5),
        scene.add.text(200,355,'TAP RESUME TO CONTINUE',{...scene.hudStyle(16,'#fff0c8')}).setOrigin(0.5)
    ]).setDepth(30).setVisible(false);
    const togglePause = event => {
        if (event.repeat) return;
        setRunPaused(scene,!scene.runPaused);
    };
    scene.input.keyboard?.on('keydown-P',togglePause);
    scene.input.keyboard?.on('keydown-ESC',togglePause);
    scene.events.once('shutdown',()=>{
        scene.input.keyboard?.off('keydown-P',togglePause);
        scene.input.keyboard?.off('keydown-ESC',togglePause);
        scene.time.paused=false;
        if(scene.runPaused) scene.sound.stopAll();
    });
}
