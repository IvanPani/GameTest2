import Phaser from 'phaser';
import { playerData } from './player-data.js';
import { UPGRADES, getRunStats } from './upgrades.js';
import { getUpgradeProgress } from './upgrade-progress.js';
import { SOCK_VISUALS } from './player.js';
import { CUSTOM_SOCK_TEXTURE, applySockStyle } from './sock-skin.js';
import { SOCK_COLORS, SOCK_PATTERNS } from './sock-customization.js';

const WIDTH = 400;
const HEIGHT = 700;
const LOCATIONS = Object.freeze({
    main: { x: 0, y: 0 },
    customize: { x: 0, y: -HEIGHT },
    upgrades: { x: -WIDTH, y: 0 },
    records: { x: WIDTH, y: 0 }
});
const TEXT = { fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold', color: '#f3f6ed' };

// One spatial hub, one profile: the camera travels between the laundry rooms.
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
        this.createRecords();

        this.add.rectangle(200, 30, WIDTH, 60, 0x102131, 0.97).setScrollFactor(0).setDepth(10);
        this.currencyText = this.add.text(384, 20, `CURRENCY  ${playerData.getProfile().currency}`, {
            ...TEXT, fontSize: '22px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(11);
        this.saveWarning = this.add.text(200, 675, playerData.saveError || '', {
            ...TEXT, fontSize: '16px', color: '#ffcf70', align: 'center', wordWrap: { width: 350 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        const keys = {
            UP: () => this.navigate('customize'),
            LEFT: () => this.navigate(this.location === 'records' ? 'main' : 'upgrades'),
            DOWN: () => { if (this.location === 'customize') this.navigate('main'); },
            RIGHT: () => this.navigate(this.location === 'upgrades' ? 'main' : 'records'),
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
        this.updateShop();
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
        this.nextUpgradeGoal = this.label(panel, 200, 518, '', 14, '#ffcf70');
        this.button(panel, 'main', 110, 589, 'UPGRADES\nLEFT', () => this.navigate('upgrades'), 164).setFontSize(18);
        this.button(panel, 'main', 290, 589, 'RECORDS\nRIGHT', () => this.navigate('records'), 164).setFontSize(18);
    }

    createCustomize() {
        const panel = this.room('customize', 0x253e4a, 'CUSTOMIZE', 'The clothesline');
        panel.add(this.add.rectangle(200, 225, 344, 4, 0xb8c7d2));
        this.customizeSock = this.sock(panel, 192, 235, 1.85);
        panel.add(this.add.rectangle(192, 228, 10, 26, 0xccaa78));
        this.createSkinControls(panel);
        this.button(panel, 'customize', 200, 645, 'MAIN MENU  /  DOWN', () => this.navigate('main'), 280);
    }

    createSkinControls(panel) {
        this.skinColorControls = [];
        this.skinPatternButtons = [];
        this.skinToggleButtons = [];
        const register = element => {
            panel.add(element);
            this.controls.push({ room: 'customize', button: element });
            return element;
        };
        const choose = partial => {
            if (this.location !== 'customize' || this.transitioning || this.starting) return;
            if (!playerData.selectStyle(partial)) return;
            applySockStyle(this, playerData.getProfile().sockStyle);
            this.updateSkinSelection();
        };
        const smallButton = (x, y, text, action, width = 42) => {
            const button = register(this.add.text(x, y, text, {
                ...TEXT, fontSize: '16px', backgroundColor: '#35566c', align: 'center',
                fixedWidth: width, padding: { x: 4, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true }));
            button.on('pointerdown', action);
            return button;
        };
        for (const [property, title, x] of [['toesEnabled', 'TOES', 108], ['cuffEnabled', 'CUFF BAND', 290]]) {
            const button = smallButton(x, 361, '', () => choose({ [property]: !playerData.getProfile().sockStyle[property] }), 160);
            this.skinToggleButtons.push({ property, title, button });
        }
        for (const [title, property, y] of [['SOCK', 'bodyColor', 405], ['TOES / BAND', 'accentColor', 449], ['PATTERN', 'patternColor', 493]]) {
            this.label(panel, 60, y, title, title === 'TOES / BAND' ? 11 : 14);
            const cycle = direction => {
                const current = playerData.getProfile().sockStyle[property];
                const index = SOCK_COLORS.findIndex(color => color.hex === current);
                const next = index < 0 ? (direction > 0 ? 0 : SOCK_COLORS.length - 1)
                    : (index + direction + SOCK_COLORS.length) % SOCK_COLORS.length;
                choose({ [property]: SOCK_COLORS[next].hex });
            };
            smallButton(132, y, '<', () => cycle(-1));
            const swatch = this.add.rectangle(177, y, 24, 24, 0xffffff).setStrokeStyle(1, 0xb8c7d2);
            panel.add(swatch);
            const name = this.label(panel, 252, y, '', 14);
            smallButton(348, y, '>', () => cycle(1));
            this.skinColorControls.push({ property, swatch, name });
        }
        for (const [index, pattern] of SOCK_PATTERNS.entries()) {
            const x = 74 + (index % 4) * 84;
            const y = 541 + Math.floor(index / 4) * 39;
            const button = smallButton(x, y, pattern.name, () => choose({ patternId: pattern.id }), 78).setFontSize(12);
            this.skinPatternButtons.push({ button, id: pattern.id });
        }
        this.label(panel, 200, 611, 'LIVE PREVIEW  /  SAVES AUTOMATICALLY', 10, '#8fe0d4');
        this.updateSkinSelection();
    }

    updateSkinSelection() {
        const style = playerData.getProfile().sockStyle;
        for (const { property, swatch, name } of this.skinColorControls || []) {
            swatch.setFillStyle(Phaser.Display.Color.HexStringToColor(style[property]).color);
            name.setText(SOCK_COLORS.find(color => color.hex === style[property])?.name || 'Saved color');
        }
        for (const { property, title, button } of this.skinToggleButtons || []) {
            button.setText(`${title}: ${style[property] ? 'ON' : 'OFF'}`);
            button.setBackgroundColor(style[property] ? '#527a86' : '#35566c');
        }
        for (const { button, id } of this.skinPatternButtons || []) {
            button.setBackgroundColor(style.patternId === id ? '#709aaa' : '#35566c');
        }
    }

    createUpgrades() {
        const panel = this.room('upgrades', 0x3b3544, 'UPGRADES', 'The sewing table');
        // Keep a small sewing-table marker above the two functional shop cards.
        panel.add(this.add.rectangle(200, 205, 240, 10, 0x997f71));
        panel.add(this.add.rectangle(177, 183, 65, 35, 0x8ca6b5));
        panel.add(this.add.rectangle(195, 190, 20, 20, 0x3b3544));
        panel.add(this.add.rectangle(250, 190, 18, 22, 0xcc655a));
        this.upgradeCards = {};
        for (const [id, title, top] of [['fabric', 'FABRIC', 245], ['steering', 'STEERING', 395]]) {
            panel.add(this.add.rectangle(200, top + 53, 344, 140, 0x292735).setStrokeStyle(1, 0x709aaa));
            this.label(panel, 200, top, title, 22);
            const description = this.label(panel, 200, top + 28, '', 16, '#8fe0d4');
            const owned = this.label(panel, 200, top + 51, '', 14, '#b8c7d2');
            const buy = this.button(panel, 'upgrades', 200, top + 88, '', () => this.buyUpgrade(id), 290);
            this.upgradeCards[id] = { description, owned, buy };
        }
        this.shopMessage = this.label(panel, 200, 538, 'Bonuses apply to your next run', 14, '#ffcf70');
        this.button(panel, 'upgrades', 200, 589, 'MAIN MENU  /  RIGHT', () => this.navigate('main'));
    }

    updateShop() {
        const profile = playerData.getProfile();
        const stats = getRunStats(profile.upgrades);
        this.currencyText?.setText(`CURRENCY  ${profile.currency}`);
        this.nextUpgradeGoal.setText(getUpgradeProgress(profile).message);
        this.saveWarning?.setText(playerData.saveError || '');
        for (const [id, card] of Object.entries(this.upgradeCards)) {
            const level = profile.upgrades[id];
            const max = UPGRADES[id].costs.length;
            const price = UPGRADES[id].costs[level];
            const capped = level >= max;
            card.description.setText(id === 'fabric'
                ? `${stats.maxHealth} hearts${capped ? '' : `  →  ${stats.maxHealth + 1} hearts`}`
                : `${Math.round((1 - stats.steeringDelayMultiplier) * 100)}% less weight delay${capped ? '' : `  →  ${Math.round((1 - 1 / (1 + 0.25 * (level + 1))) * 100)}%`}`);
            card.owned.setText(`LEVEL ${level} / ${max}`);
            card.buy.setText(capped ? 'MAX LEVEL' : profile.currency < price ? 'NEED 1,000 CURRENCY' : 'BUY  /  1,000 CURRENCY');
            card.buy.shopEnabled = !capped && profile.currency >= price;
            card.buy.setAlpha(card.buy.shopEnabled ? 1 : 0.5);
        }
        this.refreshControls();
    }

    buyUpgrade(id) {
        if (this.location !== 'upgrades' || this.transitioning || this.starting) return;
        const purchased = playerData.purchaseUpgrade(id);
        this.shopMessage.setText(purchased ? `${id === 'fabric' ? 'Fabric' : 'Steering'} improved! Applies next run.`
            : playerData.saveError ? 'Could not save purchase. No currency spent.' : 'Purchase unavailable');
        this.updateShop();
    }

    createRecords() {
        const panel = this.room('records', 0x2c3d36, 'RECORDS', 'Your laundry legends');
        // Wood-framed corkboard, a pinned paper sheet and subtle cork flecks.
        panel.add(this.add.rectangle(200, 350, 350, 390, 0x795442));
        panel.add(this.add.rectangle(200, 350, 328, 368, 0xb68c5a));
        for (let row = 0; row < 13; row++) {
            for (let column = 0; column < 14; column++) {
                panel.add(this.add.rectangle(45 + column * 24 + (row % 2) * 5,
                    177 + row * 28, 3, 2, (row + column) % 2 ? 0x997044 : 0xcaa575));
            }
        }
        panel.add(this.add.rectangle(204, 359, 296, 350, 0x624b36, 0.35));
        panel.add(this.add.rectangle(200, 354, 296, 350, 0xf3eddc));
        this.label(panel, 200, 211, 'PERSONAL BESTS', 22, '#463b32');
        panel.add(this.add.rectangle(200, 232, 254, 2, 0xcac1aa));
        const records = playerData.getProfile().records;
        const number = value => value.toLocaleString('en-US');
        const rows = [
            ['BEST SCORE', number(records.bestScore)],
            ['MAX SPEED', `${records.maxSpeedKmh.toFixed(1)} KM/H`],
            ['MAX WEIGHT', `${records.maxWeight.toFixed(1)} KG`],
            ['BIGGEST STREAK', `${number(records.maxStreak)} buttons`],
            ['MOST BUTTONS / RUN', number(records.mostButtons)],
            ['TOTAL BUTTONS', number(records.totalButtons)],
            ['CURRENCY EARNED', number(records.totalCurrencyEarned)],
            ['COMPLETED RUNS', number(records.totalRuns)]
        ];
        for (const [index, [label, value]] of rows.entries()) {
            const y = 256 + index * 29;
            panel.add(this.add.text(69, y, label, { ...TEXT, fontSize: '12px', color: '#665645' }).setOrigin(0, 0.5));
            // Fit even large lifetime totals without overlapping the row label.
            const entry = this.add.text(331, y, value, { ...TEXT, fontSize: '16px', color: '#352e28' }).setOrigin(1, 0.5);
            if (entry.width > 118) entry.setScale(118 / entry.width);
            panel.add(entry);
            panel.add(this.add.rectangle(200, y + 14, 262, 1, 0xdcd4c1));
        }
        this.label(panel, 200, 501, 'Tracking starts with this update', 11, '#80715e');
        panel.add(this.add.circle(201, 186, 7, 0x614332, 0.3));
        panel.add(this.add.circle(200, 183, 6, 0xcc655a));
        panel.add(this.add.circle(198, 181, 2, 0xf3b39a));
        this.button(panel, 'records', 200, 589, 'MAIN MENU  /  LEFT', () => this.navigate('main'));
    }

    refreshControls() {
        for (const { room, button } of this.controls) {
            button.input.enabled = room === this.location && !this.transitioning && !this.starting && button.shopEnabled !== false;
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
