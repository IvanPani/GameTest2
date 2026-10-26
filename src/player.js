import Phaser from 'phaser';

export default class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.scene = scene;
        this.setSize(42, 58);

        const sock = scene.add.graphics();
        sock.fillStyle(0xf5f0df, 1);
        sock.fillRoundedRect(-13, -27, 26, 46, 10);
        sock.fillRoundedRect(-13, 7, 39, 19, 9);
        sock.fillStyle(0x56c7c2, 1);
        sock.fillRoundedRect(-13, -27, 26, 9, 4);
        sock.fillRoundedRect(9, 8, 12, 12, 5);
        sock.lineStyle(2, 0x243447, 1);
        sock.strokeRoundedRect(-13, -27, 26, 46, 10);
        sock.strokeRoundedRect(-13, 7, 39, 19, 9);
        this.add(sock);

        scene.add.existing(this);
    }
}
