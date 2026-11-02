import Phaser from 'phaser';
import { playerData } from './player-data.js';
import { getUpgradeProgress } from './upgrade-progress.js';

export default class End extends Phaser.Scene {
    constructor() {
        super({ key: 'end' });
    }

    init(result) {
        this.result = result;
    }

    create() {
        this.leaving = false;
        this.cameras.main.setBackgroundColor('#182b3d');
        this.add.rectangle(200, 350, 340, 540, 0x102131, 0.98)
            .setStrokeStyle(2, 0x49677c);

        this.add.text(200, 195, 'RUN OVER', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#f3f6ed'
        }).setOrigin(0.5);

        this.add.text(200, 310,
            `WEIGHT  ${this.result.weight.toFixed(1)} KG\nSPEED  ${this.result.speedKmh.toFixed(1)} KM/H\nTOTAL BUTTONS  ${this.result.totalButtons}\nMAX COMBO  ${this.result.maxCombo}`, {
                fontFamily: 'Fredoka, sans-serif',
                fontSize: '21px',
                color: '#8fe0d4',
                align: 'center',
                lineSpacing: 14
            }).setOrigin(0.5);

        this.add.text(200, 420, `SCORE  ${this.result.score}`, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#f3f6ed'
        }).setOrigin(0.5);

        this.add.text(200, 485, 'TAP FOR MAIN MENU', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffcf70'
        }).setOrigin(0.5);
        this.add.text(200, 525, 'PRESS ANY KEY FOR MENU', {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '14px',
            color: '#b8c7d2'
        }).setOrigin(0.5);

        this.add.text(200, 455, `+${this.result.score} CURRENCY`, {
            fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#8fe0d4'
        }).setOrigin(0.5);
        const profile = playerData.getProfile();
        this.add.text(200, 565, `CURRENCY  ${profile.currency.toLocaleString('en-US')}`, {
            fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#8fe0d4'
        }).setOrigin(0.5);
        this.add.text(200, 597, getUpgradeProgress(profile).message, {
            fontFamily: 'Fredoka, sans-serif', fontSize: '14px', color: '#ffcf70',
            align: 'center', wordWrap: { width: 310 }
        }).setOrigin(0.5);
        if (playerData.saveError) this.add.text(200, 655, playerData.saveError, {
            fontFamily: 'Fredoka, sans-serif', fontSize: '16px', color: '#ffcf70',
            align: 'center', wordWrap: { width: 350 }
        }).setOrigin(0.5);
        this.input.once('pointerdown', this.restart, this);
        this.input.keyboard?.once('keydown', this.restart, this);
        this.events.once('shutdown', () => {
            this.input.off('pointerdown', this.restart, this);
            this.input.keyboard?.off('keydown', this.restart, this);
        });
    }

    restart() {
        if (this.leaving) return;
        this.leaving = true;
        this.scene.start('menu');
    }
}
