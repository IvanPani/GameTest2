import Phaser from 'phaser';

export default class End extends Phaser.Scene {
    constructor() {
        super({ key: 'end' });
    }

    init(result) {
        this.result = result;
    }

    create() {
        this.cameras.main.setBackgroundColor('#182b3d');
        this.add.rectangle(200, 350, 340, 290, 0x102131, 0.98)
            .setStrokeStyle(2, 0x49677c);

        this.add.text(200, 260, 'RUN OVER', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#f3f6ed'
        }).setOrigin(0.5);

        this.add.text(200, 330, `Score  ${this.result.score}\nWeight  ${this.result.weight.toFixed(1)} kg`, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '21px',
            color: '#8fe0d4',
            align: 'center',
            lineSpacing: 12
        }).setOrigin(0.5);

        this.add.text(200, 430, 'TAP TO TRY AGAIN', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffcf70'
        }).setOrigin(0.5);
        this.add.text(200, 470, 'Press any key to restart', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '14px',
            color: '#b8c7d2'
        }).setOrigin(0.5);

        this.input.on('pointerdown', this.restart, this);
        this.input.keyboard?.once('keydown', this.restart, this);
    }

    restart() {
        this.scene.start('level');
    }
}
