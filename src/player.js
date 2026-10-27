import Phaser from 'phaser';

const SOCK_VISUAL_SCALE = 0.14;

export default class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.setSize(42, 58);

        const sock = scene.add.sprite(0, 0, 'white-sock-fall-sheet')
            .setScale(SOCK_VISUAL_SCALE)
            .play('white-sock-fall');
        this.add(sock);

        scene.add.existing(this);
    }
}
