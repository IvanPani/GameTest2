import Boot from './boot.js';
import End from './end.js';
import Level from './level.js';
import Phaser from 'phaser';

const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 700,
    parent: 'juego',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true,
    scene: [Boot, Level, End],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

new Phaser.Game(config);
