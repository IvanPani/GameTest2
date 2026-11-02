import Phaser from 'phaser';
import { playerData } from './player-data.js';
import { SOCK_VISUALS } from './player.js';
import { CUSTOM_SOCK_TEXTURE, applySockStyle } from './sock-skin.js';

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

    // Hub poses share the live customized texture, but have no animation state.
    // Frame 0 is toe-up in the source art: turn it cuff-up and anchor at the cuff
    // so the clothesline peg holds the sock instead of its transparent frame.
    sock(panel, x, y, scale = 1) {
        const sock = this.add.image(x, y, CUSTOM_SOCK_TEXTURE, 0)
            .setOrigin(0.61, 0.83)
            .setAngle(180)
            .setScale(SOCK_VISUALS.scale * scale);
        panel.add(sock);
        return sock;
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
        this.mainSock = this.sock(panel, 58, 383, 0.65);
        panel.add(this.add.rectangle(335, 462, 68, 58, 0x826b62).setStrokeStyle(2, 0xb8a291));
        this.label(panel, 335, 463, 'BASKET', 12);
        this.button(panel, 'main', 200, 589, 'UPGRADES  /  LEFT', () => this.navigate('upgrades'));
    }

    createCustomize() {
        const panel = this.room('customize', 0x253e4a, 'CUSTOMIZE', 'The clothesline');
        panel.add(this.add.rectangle(200, 225, 344, 4, 0xb8c7d2));
        this.customizeSock = this.sock(panel, 192, 235, 1.85);
        panel.add(this.add.rectangle(192, 228, 10, 26, 0xccaa78));
        this.createSkinControls(panel);
        this.button(panel, 'customize', 200, 645, 'MAIN MENU  /  DOWN', () => this.navigate('main'), 280);
    }

    // Temporary customization controls in the actual clothesline room.
    // Any style change refreshes the shared cached texture, so both hub socks
    // and the next gameplay Player immediately use the same selected colors.
    createSkinControls(panel) {
        const colors = ['#ffffff', '#cc655a', '#8bc78b', '#eecb68'];
        const patterns = ['plain', 'dots', 'stripes'];
        this.skinSwatches = [];
        this.skinPatternButtons = [];
        const register = (element) => {
            panel.add(element);
            this.controls.push({ room: 'customize', button: element });
            return element;
        };
        const choose = (partial) => {
            if (this.location !== 'customize' || this.transitioning || this.starting) return;
            if (!playerData.selectStyle(partial)) return;
            applySockStyle(this, playerData.getProfile().sockStyle);
            this.updateSkinSelection();
        };
        for (const [label, property, y] of [
            ['BODY', 'bodyColor', 405],
            ['ACCENT', 'accentColor', 449],
            ['PATTERN COLOR', 'patternColor', 493]
        ]) {
            this.label(panel, 74, y, label, label === 'PATTERN COLOR' ? 12 : 15);
            for (const [index, color] of colors.entries()) {
                const swatch = register(this.add.rectangle(186 + index * 44, y, 29, 29,
                    Phaser.Display.Color.HexStringToColor(color).color)
                    .setInteractive({ useHandCursor: true }));
                swatch.on('pointerdown', () => choose({ [property]: color }));
                this.skinSwatches.push({ swatch, property, color });
            }
        }
        this.label(panel, 71, 547, 'PATTERN', 15);
        for (const [index, id] of patterns.entries()) {
            const button = register(this.add.text(171 + index * 76, 547, id.toUpperCase(), {
                ...TEXT, fontSize: '13px', backgroundColor: '#35566c',
                padding: { x: 7, y: 9 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
            button.on('pointerdown', () => choose({ patternId: id }));
            this.skinPatternButtons.push({ button, id });
        }
        this.label(panel, 200, 597, 'PREVIEW  •  SAVES AUTOMATICALLY', 12, '#8fe0d4');
        this.updateSkinSelection();
    }

    updateSkinSelection() {
        const style = playerData.getProfile().sockStyle;
        for (const { swatch, property, color } of this.skinSwatches || []) {
            const active = style[property] === color;
            swatch.setStrokeStyle(active ? 3 : 1, active ? 0xffd370 : 0xb8c7d2);
        }
        for (const { button, id } of this.skinPatternButtons || []) {
            button.setBackgroundColor(style.patternId === id ? '#709aaa' : '#35566c');
        }
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
