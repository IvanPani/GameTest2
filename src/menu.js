import Phaser from 'phaser';
import { playerData } from './player-data.js';

export default class Menu extends Phaser.Scene {
    constructor() { super({ key: 'menu' }); }

    create() {
        this.starting = false;
        this.cameras.main.setBackgroundColor('#182b3d');
        const style = { fontFamily: 'Fredoka, sans-serif', color: '#f3f6ed', fontStyle: 'bold' };
        this.add.text(384, 20, `CURRENCY  ${playerData.getProfile().currency}`, {
            ...style, fontSize: '22px'
        }).setOrigin(1, 0);
        this.add.text(200, 230, 'FALLING SOCKS', { ...style, fontSize: '32px' }).setOrigin(0.5);
        const play = this.add.text(200, 350, 'PLAY', {
            ...style, fontSize: '30px', backgroundColor: '#35566c',
            padding: { x: 42, y: 18 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const start = () => {
            if (this.starting) return;
            this.starting = true;
            this.scene.start('level');
        };
        play.on('pointerdown', start);
        this.input.keyboard?.on('keydown-ENTER', start);
        this.input.keyboard?.on('keydown-SPACE', start);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown-ENTER', start);
            this.input.keyboard?.off('keydown-SPACE', start);
        });
        if (playerData.saveError) this.add.text(200, 580, playerData.saveError, {
            ...style, fontSize: '16px', color: '#ffcf70', align: 'center', wordWrap: { width: 350 }
        }).setOrigin(0.5);
    }
}
