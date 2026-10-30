import Phaser from 'phaser';

export const SOCK_VISUALS = Object.freeze({
    scale: 0.14,
    // One threshold per animation row, starting with the empty sock.
    stageButtons: [0, 10, 25, 50, 100]
});

export default class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.sock = scene.add.sprite(0, 0, 'white-sock-stages')
            .setScale(SOCK_VISUALS.scale);
        this.add(this.sock);
        this.stage = -1;
        this.setButtonCount(0);
        scene.add.existing(this);
    }

    setButtonCount(buttons) {
        let stage = 0;
        for (let index = 1; index < SOCK_VISUALS.stageButtons.length; index += 1) {
            if (buttons >= SOCK_VISUALS.stageButtons[index]) stage = index;
        }
        if (stage === this.stage) return;
        this.stage = stage;
        this.sock.play(`white-sock-stage-${stage}`);
        this.setSize(this.sock.displayWidth, this.sock.displayHeight);
    }
}
