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

// Canvas text must be created after the local font finishes loading.
async function startGame() {
    try {
        await Promise.all([
            document.fonts.load('400 16px Fredoka'),
            document.fonts.load('700 16px Fredoka'),
            document.fonts.load('700 24px DynaPuff')
        ]);
    } catch (error) {
        console.warn('Custom fonts could not load; using fallback fonts.', error);
    }
    new Phaser.Game(config);
}

startGame();
