import Phaser from 'phaser';
import { playerData } from './player-data.js';

const WIDTH = 400;
const HEIGHT = 700;
const LOCATIONS = Object.freeze({
    main: { x: 0, y: 0 },
    customize: { x: 0, y: -HEIGHT },
    upgrades: { x: -WIDTH, y: 0 }
});
const TEXT = { fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold', color: '#f3f6ed' };

// One spatial hub, one profile: the camera travels between three placeholder rooms.
export default class Menu extends Phaser.Scene {
    constructor() { super({ key: 'menu' }); }

    create() {
        this.location = 'main';
        this.transitioning = false;
        this.starting = false;
        this.controls = [];
        this.cameras.main.setBackgroundColor('#182b3d');
        this.cameras.main.setScroll(0, 0);
        this.createMain();
        this.createCustomize();
        this.createUpgrades();

        this.add.rectangle(200, 30, WIDTH, 60, 0x102131, 0.97).setScrollFactor(0).setDepth(10);
        this.add.text(384, 20, `CURRENCY  ${playerData.getProfile().currency}`, {
            ...TEXT, fontSize: '22px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(11);
        if (playerData.saveError) this.add.text(200, 642, playerData.saveError, {
            ...TEXT, fontSize: '16px', color: '#ffcf70', align: 'center', wordWrap: { width: 350 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        const keys = {
            UP: () => this.navigate('customize'),
            LEFT: () => this.navigate('upgrades'),
            DOWN: () => { if (this.location === 'customize') this.navigate('main'); },
            RIGHT: () => { if (this.location === 'upgrades') this.navigate('main'); },
            ESC: () => this.navigate('main'),
            ENTER: () => this.startRun(),
            SPACE: () => this.startRun()
        };
        for (const [key, handler] of Object.entries(keys)) this.input.keyboard?.on(`keydown-${key}`, handler);
        const camera = this.cameras.main;
        this.events.once('shutdown', () => {
            for (const [key, handler] of Object.entries(keys)) this.input.keyboard?.off(`keydown-${key}`, handler);
            camera.off('camerapancomplete', this.finishNavigation, this);
        });
        this.refreshControls();
    }

    room(id, color, heading, subtitle) {
        const { x, y } = LOCATIONS[id];
        const panel = this.add.container(x, y);
        panel.add(this.add.rectangle(200, 350, WIDTH, HEIGHT, color));
        this.label(panel, 200, 103, heading, 30);
        this.label(panel, 200, 143, subtitle, 16, '#b8c7d2');
        panel.add(this.add.rectangle(200, 547, WIDTH, 2, 0x49677c));
        return panel;
    }

    label(panel, x, y, text, size = 20, color = '#f3f6ed') {
        const label = this.add.text(x, y, text, { ...TEXT, fontSize: `${size}px`, color, align: 'center' }).setOrigin(0.5);
        panel.add(label);
        return label;
    }

    button(panel, room, x, y, text, action, width = 300) {
        const button = this.add.text(x, y, text, {
            ...TEXT, fontSize: '21px', backgroundColor: '#35566c', align: 'center',
            fixedWidth: width, padding: { x: 10, y: 16 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        panel.add(button);
        button.on('pointerdown', () => {
            if (this.location === room && !this.transitioning && !this.starting) action();
        });
        this.controls.push({ room, button });
        return button;
    }

    // Neutral sock silhouette stands in for the shared customizable character.
    sock(panel, x, y, scale = 1) {
        const sock = this.add.graphics({ x, y });
        sock.fillStyle(0xe6ece8);
        sock.fillPoints([
            { x: -18, y: -45 }, { x: 18, y: -45 }, { x: 18, y: 12 },
            { x: 40, y: 25 }, { x: 36, y: 44 }, { x: 16, y: 48 },
            { x: -18, y: 25 }
        ], true);
        sock.fillStyle(0xcc655a);
        sock.fillRect(-18, -45, 36, 12);
        sock.setScale(scale);
        panel.add(sock);
    }

    createMain() {
        const panel = this.room('main', 0x182b3d, 'MAIN MENU', 'Socks to be you!');
        this.button(panel, 'main', 200, 204, 'CUSTOMIZE  /  UP', () => this.navigate('customize'));
        // Top-loading washer, with Play on the appliance's control panel.
        panel.add(this.add.rectangle(200, 394, 170, 210, 0x8ca6b5).setStrokeStyle(3, 0x49677c));
        panel.add(this.add.ellipse(200, 290, 170, 54, 0xb8c7d2).setStrokeStyle(3, 0x49677c));
        panel.add(this.add.ellipse(200, 289, 110, 30, 0x102131));
        panel.add(this.add.rectangle(200, 432, 126, 66, 0x708c9e));
        this.button(panel, 'main', 200, 360, 'PLAY', () => this.startRun(), 136);
        // Shelf, sock and basket mark the intended main-room composition.
        panel.add(this.add.rectangle(62, 425, 86, 10, 0x826b62));
        this.sock(panel, 58, 383, 0.65);
        panel.add(this.add.rectangle(335, 462, 68, 58, 0x826b62).setStrokeStyle(2, 0xb8a291));
        this.label(panel, 335, 463, 'BASKET', 12);
        this.button(panel, 'main', 200, 589, 'UPGRADES  /  LEFT', () => this.navigate('upgrades'));
    }

    createCustomize() {
        const panel = this.room('customize', 0x253e4a, 'CUSTOMIZE', 'The clothesline');
        panel.add(this.add.rectangle(200, 256, 344, 4, 0xb8c7d2));
        this.sock(panel, 193, 326, 1.3);
        panel.add(this.add.rectangle(181, 263, 10, 27, 0xccaa78));
        this.label(panel, 200, 444, 'COLORS  /  PATTERNS  /  COSMETICS', 16, '#8fe0d4');
        this.label(panel, 200, 483, 'Customization controls coming later', 16, '#b8c7d2');
        this.button(panel, 'customize', 200, 589, 'MAIN MENU  /  DOWN', () => this.navigate('main'));
    }

    createUpgrades() {
        const panel = this.room('upgrades', 0x3b3544, 'UPGRADES', 'The sewing table');
        panel.add(this.add.rectangle(200, 375, 290, 24, 0x997f71));
        for (const x of [82, 318]) panel.add(this.add.rectangle(x, 444, 18, 115, 0x826b62));
        // Sewing-machine and thread placeholders.
        panel.add(this.add.rectangle(170, 316, 105, 74, 0x8ca6b5));
        panel.add(this.add.rectangle(201, 333, 39, 45, 0x3b3544));
        panel.add(this.add.rectangle(173, 356, 124, 10, 0xb8c7d2));
        panel.add(this.add.rectangle(276, 342, 26, 36, 0xcc655a));
        for (const y of [322, 362]) panel.add(this.add.rectangle(276, y, 38, 6, 0xb8c7d2));
        this.label(panel, 200, 466, 'FABRIC  /  STEERING', 18, '#8fe0d4');
        this.label(panel, 200, 510, 'Upgrade controls coming later', 16, '#b8c7d2');
        this.button(panel, 'upgrades', 200, 589, 'MAIN MENU  /  RIGHT', () => this.navigate('main'));
    }

    refreshControls() {
        for (const { room, button } of this.controls) {
            button.input.enabled = room === this.location && !this.transitioning && !this.starting;
        }
    }

    navigate(destination) {
        if (this.transitioning || this.starting || destination === this.location || !Object.hasOwn(LOCATIONS, destination)) return;
        // Side rooms connect through Main, matching the laundry-room layout.
        if (this.location !== 'main' && destination !== 'main') return;
        this.transitioning = true;
        this.destination = destination;
        this.refreshControls();
        const { x, y } = LOCATIONS[destination];
        this.cameras.main.once('camerapancomplete', this.finishNavigation, this);
        this.cameras.main.pan(x + WIDTH / 2, y + HEIGHT / 2, 450, 'Sine.easeInOut');
    }

    finishNavigation() {
        this.location = this.destination;
        this.transitioning = false;
        this.refreshControls();
    }

    startRun() {
        if (this.location !== 'main' || this.transitioning || this.starting) return;
        this.starting = true;
        this.refreshControls();
        this.scene.start('level');
    }
}
