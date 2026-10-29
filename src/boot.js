import Phaser from 'phaser';

const FALL_ANIMATION_FPS = 8;

export default class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'boot' });
    }

    preload() {
        this.load.image('button', new URL('../assets/sprites/button.png', import.meta.url).href);
        this.load.image('soap', new URL('../assets/sprites/soap.png', import.meta.url).href);
        this.load.image(
            'washing-machine-background',
            new URL('../assets/sprites/Background_Washing_Machine2.png', import.meta.url).href
        );
        this.load.spritesheet(
            'white-sock-stages',
            new URL('../assets/sprites/Sprite_Sheet_White_Sock_Stages.png', import.meta.url).href,
            { frameWidth: 512, frameHeight: 512 }
        );
        this.load.image(
            'white-sock-static',
            new URL('../assets/sprites/Sprite_White_Sock.png', import.meta.url).href
        );
    }

    create() {
        // Three independent soap clusters from the source illustration.
        const soap = this.textures.get('soap');
        soap.add('small', 0, 65, 175, 400, 400);
        soap.add('medium', 0, 610, 60, 610, 575);
        soap.add('large', 0, 1300, 10, 855, 700);
        for (let stage = 0; stage < 5; stage += 1) {
            this.anims.create({
            key: `white-sock-stage-${stage}`,
            frames: this.anims.generateFrameNumbers('white-sock-stages', {
                start: stage * 6,
                end: stage * 6 + 5
            }),
            frameRate: FALL_ANIMATION_FPS,
            repeat: -1
        });
        }
        this.scene.start('level');
    }
}
