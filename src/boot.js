import Phaser from 'phaser';

const FALL_ANIMATION_FPS = 8;

export default class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'boot' });
    }

    preload() {
        this.load.spritesheet(
            'white-sock-fall-sheet',
            new URL('../assets/sprites/Sprite_sheet_White_Sock.png', import.meta.url).href,
            { frameWidth: 512, frameHeight: 512 }
        );
        this.load.image(
            'white-sock-static',
            new URL('../assets/sprites/Sprite_White_Sock.png', import.meta.url).href
        );
    }

    create() {
        this.anims.create({
            key: 'white-sock-fall',
            frames: this.anims.generateFrameNumbers('white-sock-fall-sheet', {
                start: 0,
                end: 5
            }),
            frameRate: FALL_ANIMATION_FPS,
            repeat: -1
        });
        this.scene.start('level');
    }
}
