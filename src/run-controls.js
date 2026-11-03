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

export function createRunControls(scene) {
    const control = (x, text, action) => {
        const button = scene.add.image(x, 76, 'customize-pattern-default')
            .setDisplaySize(72, 28).setDepth(41).setInteractive({useHandCursor:true});
        const label = scene.add.text(x, 76, text, {
            ...scene.hudStyle(10, '#4b3027')
        }).setOrigin(0.5).setDepth(42);
        button.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
            if (!scene.runEnded) action();
        });
        return {button,label};
    };
    scene.pauseControl = control(285, 'PAUSE', () => setRunPaused(scene, !scene.runPaused));
    scene.soundControl = control(363, '', () => {
        const enabled = !playerData.getProfile().settings.soundEnabled;
        playerData.setSoundEnabled(enabled);
        scene.sound.mute = !enabled;
        refreshSound();
    });
    const refreshSound = () => {
        const enabled = playerData.getProfile().settings.soundEnabled;
        scene.sound.mute = !enabled;
        scene.soundControl.label.setText(enabled ? 'SOUND ON' : 'SOUND OFF');
        scene.soundControl.button.setTexture(enabled ? 'customize-pattern-selected' : 'customize-pattern-default').setDisplaySize(72,28);
    };
    refreshSound();
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
