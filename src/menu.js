import { DEV_CHECKPOINTS_ENABLED } from './level-regions.js';
import { setMusic } from './music.js';
import { createAudioControls } from './run-controls.js';
import Phaser from 'phaser';
import { createCreditsRoom } from './credits-room.js';
import { createReunionsAlbum } from './reunions-album.js';
import { createCustomizeIcons } from './customize-icons.js';
import { createRecordNotes } from './record-note.js';
import { playerData } from './player-data.js';
import { UPGRADES, getRunStats, cycleDevUpgrades, getDevUpgradeMode, getEffectiveUpgrades } from './upgrades.js';
import { getUpgradeProgress } from './upgrade-progress.js';
import { SOCK_VISUALS } from './player.js';
import { CUSTOM_SOCK_TEXTURE, applySockStyle } from './sock-skin.js';
import { SOCK_PATTERNS, getSockColorName } from './sock-customization.js';

const WIDTH = 400;
const HEIGHT = 700;
const LOCATIONS = Object.freeze({
    main: { x: 0, y: 0 },
    customize: { x: 0, y: -HEIGHT },
    upgrades: { x: -WIDTH, y: 0 },
    records: { x: WIDTH, y: 0 },
    credits: { x: WIDTH * 2, y: 0 }
});
const ROUTES = {
    main: { UP: 'customize', LEFT: 'upgrades', RIGHT: 'records', DOWN: 'play' },
    customize: { DOWN: 'main' },
    upgrades: { RIGHT: 'main' },
    records: { LEFT: 'main', RIGHT: 'credits' },
    credits: { LEFT: 'records' }
};
const TEXT = { fontFamily: 'Fredoka, sans-serif', fontStyle: 'bold', color: '#f3f6ed' };

// One spatial hub, one profile: the camera travels between the laundry rooms.
export default class Menu extends Phaser.Scene {
    constructor() { super({ key: 'menu' }); }

    create() {
        setMusic(this);
        this.location = 'main';
        this.transitioning = false;
        this.starting = false;
        this.entryFinished = false;
        this.navigationSigns = {};
        this.focusedButton = null;
        this.menuTouch = null;
        this.controls = [];
        this.cameras.main.setBackgroundColor('#182b3d');
        this.cameras.main.setScroll(0, 0);
        this.createMain();
        this.createCustomize();
        this.createUpgrades();
        this.createRecords();
        this.creditsRoom = createCreditsRoom(this, LOCATIONS.credits);

        this.currencyBadge = this.add.image(324, 35, 'customize-currency-badge')
            .setDisplaySize(150, 44).setScrollFactor(0).setDepth(20);
        this.currencyText = this.add.text(345, 35, '', {
            ...TEXT, fontSize: '14px', color: '#4b3027'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(21);
        const audio = createAudioControls(this, 74, {
            depth: 20, scrollFactor: 0,
            canToggle: () => !this.transitioning && !this.starting
        });
        for (const { button, activate } of Object.values(audio)) {
            this.controls.push({ button, action: activate });
        }
        this.focusOutline = this.add.graphics().setScrollFactor(0).setDepth(45);
        this.saveWarning = this.add.text(200, 675, playerData.saveError || '', {
            ...TEXT, fontSize: '16px', color: '#ffcf70', align: 'center', wordWrap: { width: 350 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(11);

        const navigationKeys = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        const keys = Object.fromEntries(navigationKeys.map(direction => [direction, event => {
            if (!event.repeat) this.selectDirection(direction);
        }]));
        keys.ENTER = event => {
            if (!event.repeat && !this.transitioning && !this.starting) {
                this.focusOptions().find(option => option.button === this.focusedButton)?.action();
            }
        };
        navigationKeys.push('ENTER');
        if (DEV_CHECKPOINTS_ENABLED) {
            keys.ZERO = keys.NUMPAD_ZERO = event => {
                if (event.repeat || this.transitioning || this.starting) return;
                cycleDevUpgrades();
                if (!getDevUpgradeMode()) this.shopMessage.setText('SAVED UPGRADES RESTORED');
                this.updateShop();
            };
        }
        this.input.keyboard?.addCapture(navigationKeys);
        for (const [key, handler] of Object.entries(keys)) this.input.keyboard?.on(`keydown-${key}`, handler);
        this.input.on('pointerdown', this.beginMenuTouch, this);
        this.input.on('pointerup', this.endMenuTouch, this);
        this.input.on('pointerupoutside', this.cancelMenuTouch, this);
        const camera = this.cameras.main;
        this.events.once('shutdown', () => {
            for (const [key, handler] of Object.entries(keys)) this.input.keyboard?.off(`keydown-${key}`, handler);
            this.input.keyboard?.removeCapture(navigationKeys);
            this.input.off('pointerdown', this.beginMenuTouch, this);
            this.input.off('pointerup', this.endMenuTouch, this);
            this.input.off('pointerupoutside', this.cancelMenuTouch, this);
            camera.off('camerapancomplete', this.finishNavigation, this);
            camera.off('camerafadeoutcomplete', this.finishEntry, this);
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

    registerMenuControl(room, button, action) {
        const control = { room, button, action };
        this.controls.push(control);
        button.on('pointerdown', pointer => {
            if (pointer.wasTouch && button.input?.enabled) action();
        });
        return control;
    }

    // Hub poses share the live customized texture, but have no animation state.
    // Frame 0 is toe-up in the source art: turn it cuff-up and anchor at the cuff
    // so the clothesline peg holds the sock instead of its transparent frame.
    sock(panel, x, y, scale = 1) {
        const sock = this.add.image(x, y, CUSTOM_SOCK_TEXTURE, 0)
            .setOrigin(0.61, 0.83)
            .setAngle(180)
            .setScale(SOCK_VISUALS.scale * scale);
        if (panel) panel.add(sock);
        return sock;
    }

    navigationSign(panel, x, y, key, width) {
        const sign = this.add.image(x, y, key);
        sign.setScale(width / sign.width);
        panel.add(sign);
        return sign;
    }

    focusOptions() {
        const controls = this.controls.filter(({ room, button }) =>
            (!room || room === this.location) && button.input?.enabled);
        const signs = Object.entries(this.navigationSigns[this.location] || {}).map(([direction, button]) => ({
            button, direction, action: () => this.activateDirection(direction)
        }));
        return [...controls, ...signs];
    }

    focusBounds(button) {
        const bounds = button.getBounds();
        const camera = this.cameras.main;
        bounds.x -= camera.scrollX * button.scrollFactorX;
        bounds.y -= camera.scrollY * button.scrollFactorY;
        return bounds;
    }

    setFocus(button) {
        this.focusedButton = button;
        this.focusOutline?.clear();
        if (!button) return;
        const bounds = this.focusBounds(button);
        this.focusOutline.lineStyle(4, 0x493322)
            .strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 6)
            .lineStyle(2, 0xffdf82)
            .strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 6);
    }

    selectDirection(direction) {
        if (this.transitioning || this.starting) return;
        const options = this.focusOptions();
        const current = options.find(option => option.button === this.focusedButton);
        const exit = options.find(option => option.direction === direction);
        if (current && current === exit) {
            current.action();
            return;
        }
        if (!current) {
            const first = exit || options.find(option => option.room === this.location) || options[0];
            if (first) this.setFocus(first.button);
            return;
        }

        const origin = this.focusBounds(current.button);
        const horizontal = direction === 'LEFT' || direction === 'RIGHT';
        const sign = direction === 'LEFT' || direction === 'UP' ? -1 : 1;
        let closest = null;
        let best = Infinity;
        for (const option of options) {
            if (option === current) continue;
            const bounds = this.focusBounds(option.button);
            const dx = bounds.centerX - origin.centerX;
            const dy = bounds.centerY - origin.centerY;
            const forward = sign * (horizontal ? dx : dy);
            if (forward < 8) continue;
            const score = forward + 2 * Math.abs(horizontal ? dy : dx);
            if (score < best) {
                closest = option;
                best = score;
            }
        }
        const next = closest || exit;
        if (next) this.setFocus(next.button);
    }

    activateDirection(direction) {
        if (this.transitioning || this.starting || !this.navigationSigns[this.location]?.[direction]) return;
        this.menuTouch = null;
        this.setFocus(null);
        const destination = ROUTES[this.location][direction];
        if (destination === 'play') this.startRun();
        else this.navigate(destination);
    }

    beginMenuTouch(pointer, controls) {
        if (!pointer.wasTouch || controls.length || this.menuTouch || this.transitioning || this.starting) return;
        this.menuTouch = { id: pointer.id, x: pointer.x, y: pointer.y };
    }

    cancelMenuTouch(pointer) {
        if (this.menuTouch?.id === pointer.id) this.menuTouch = null;
    }

    endMenuTouch(pointer) {
        const start = this.menuTouch;
        if (start?.id !== pointer.id) return;
        this.menuTouch = null;
        if (pointer.wasCanceled) return;

        const dx = pointer.x - start.x;
        const dy = pointer.y - start.y;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        if (distance >= 36) {
            const direction = Math.abs(dx) > Math.abs(dy)
                ? (dx < 0 ? 'LEFT' : 'RIGHT')
                : (dy < 0 ? 'UP' : 'DOWN');
            this.activateDirection(direction);
        } else if (distance <= 12) {
            const camera = this.cameras.main;
            const down = camera.getWorldPoint(start.x, start.y);
            const up = camera.getWorldPoint(pointer.x, pointer.y);
            for (const [direction, sign] of Object.entries(this.navigationSigns[this.location])) {
                const bounds = sign.getBounds();
                if (bounds.contains(down.x, down.y) && bounds.contains(up.x, up.y)) {
                    this.activateDirection(direction);
                    break;
                }
            }
        }
    }

    // Build complete panels: the supplied side-sign PNGs end mid-border/text.
    createWholeMenuSign(sourceKey, title, arrow) {
        const key = `${sourceKey}-whole`;
        if (this.textures.exists(key)) return;
        const texture = this.textures.createCanvas(key, 180, 140);
        const ctx = texture.context;
        const fill = ctx.createLinearGradient(0, 0, 180, 140);
        fill.addColorStop(0, '#ffe3b6');
        fill.addColorStop(1, '#efae78');
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#6e432b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(3, 3, 174, 134, 9);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#fff0ce';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 164, 124);
        const source = this.textures.get(sourceKey).getSourceImage();
        ctx.drawImage(source, sourceKey === 'menu-upgrades' ? 65 : 60, 5, 42, 39, 69, 12, 42, 39);
        ctx.fillStyle = '#302219';
        ctx.font = 'bold 25px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(title, 90, 75, 158);
        ctx.font = 'bold 48px sans-serif';
        ctx.fillText(arrow, 90, 111);
        for (const x of [14, 166]) {
            for (const y of [16, 124]) {
                ctx.fillStyle = '#b5a394';
                ctx.strokeStyle = '#614d3e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
        texture.refresh();
    }

    createMain() {
        const panel = this.add.container(0, 0);
        this.mainPanel = panel;
        panel.setDepth(2);
        this.add.image(200, 350, 'menu-background').setDisplaySize(WIDTH, HEIGHT).setDepth(-1);
        // The same saved sock as Customize and Player, standing behind the basket rim.
        this.mainSock = this.sock(null, 200, 230, 1.5).setDepth(1);
        const rim = this.add.image(210, 259, 'menu-basket-rim');
        rim.setScale(225 / rim.width).setCrop(0, 18, rim.width, 20);
        panel.add(rim);
        panel.add(this.add.text(200, 73, 'FALLING SOCKS', {
            fontFamily: 'DynaPuff, sans-serif', fontSize: '31px', fontStyle: 'bold',
            color: '#fff0c8', stroke: '#45372b', strokeThickness: 5
        }).setOrigin(0.5));
        panel.add(this.add.text(200, 103, 'Socks to be you!', {
            ...TEXT, fontSize: '15px', color: '#fff0c8', stroke: '#45372b', strokeThickness: 3
        }).setOrigin(0.5));
        this.createWholeMenuSign('menu-upgrades', 'UPGRADES', '←');
        this.createWholeMenuSign('menu-records', 'RECORDS', '→');
        this.navigationSigns.main = {
            UP: this.navigationSign(panel, 200, 158, 'menu-customize', 222),
            LEFT: this.navigationSign(panel, 52, 366, 'menu-upgrades-whole', 96),
            RIGHT: this.navigationSign(panel, 348, 366, 'menu-records-whole', 96),
            DOWN: this.navigationSign(panel, 193, 526, 'menu-play', 145)
        };
        const navigationHint = window.matchMedia('(pointer: coarse)').matches
            ? 'TAP A SIGN OR SWIPE ITS WAY'
            : 'ARROWS TO MOVE • ENTER TO SELECT';
        this.label(panel, 200, 614, navigationHint, 13, '#fff0c8')
            .setStroke('#45372b', 3);
        panel.add(this.add.rectangle(200, 647, 354, 29, 0x102131, 0.82));
        this.nextUpgradeGoal = this.label(panel, 200, 647, '', 14, '#ffcf70');
    }

    createCustomize() {
        const panel = this.add.container(0, LOCATIONS.customize.y);
        panel.add(this.add.image(200, 350, 'customize-background').setDisplaySize(WIDTH, HEIGHT));
        const image = (x, y, key, width) => {
            const item = this.add.image(x, y, key).setScale(width / this.textures.get(key).getSourceImage().width);
            panel.add(item);
            return item;
        };
        image(200, 91, 'customize-title', 270);
        image(200, 171, 'customize-clothespin', 24);
        this.customizeSock = this.sock(panel, 200, 210, 1.6);
        this.createSkinControls(panel);
        this.navigationSigns.customize = { DOWN: image(200, 666, 'customize-back', 220) };
        this.label(panel, 200, 690, '↓  ↓', 14, '#fff0c8').setStroke('#45372b', 3);
    }

    createSkinControls(panel) {
        this.skinColorControls = [];
        this.skinPatternButtons = [];
        this.skinToggleButtons = [];
        const choose = partial => {
            if (this.location !== 'customize' || this.transitioning || this.starting) return;
            if (!playerData.selectStyle(partial)) return;
            applySockStyle(this, playerData.getProfile().sockStyle);
            this.updateSkinSelection();
            this.saveWarning?.setText(playerData.saveError || '');
        };
        const addButtonImage = (x, y, key, width, action) => {
            const button = this.add.image(x, y, key)
                .setScale(width / this.textures.get(key).getSourceImage().width)
                .setInteractive({ useHandCursor: true });
            panel.add(button);
            this.registerMenuControl('customize', button, action);
            return button;
        };
        createCustomizeIcons(this);
        for (const [property, title, x] of [['toesEnabled', 'TOES', 112], ['cuffEnabled', 'CUFF', 288]]) {
            const button = addButtonImage(x, 340, 'customize-pattern-default', 154,
                () => choose({ [property]: !playerData.getProfile().sockStyle[property] }));
            button.setDisplaySize(154, 49);
            const icon = this.add.image(x - 48, 340, property === 'toesEnabled' ? 'customize-toe-icon' : 'customize-cuff-icon');
            icon.setScale(38 / Math.max(icon.width, icon.height));
            panel.add(icon);
            const label = this.add.text(x + 17, 340, '', {
                ...TEXT, fontSize: '13px', color: '#4b3027', align: 'center'
            }).setOrigin(0.5);
            panel.add(label);
            this.skinToggleButtons.push({ property, title, button, label });
        }
        const colorRows = [
            ['bodyColor', 'customize-label-sock', 391],
            ['accentColor', 'customize-label-toes-band', 433],
            ['patternColor', 'customize-label-pattern', 475]
        ];
        for (const [property, labelKey, y] of colorRows) {
            const label = this.add.image(76, y, labelKey)
                .setScale(110 / this.textures.get(labelKey).getSourceImage().width);
            panel.add(label);
            const cycle = direction => {
                const profile = playerData.getProfile();
                const colors = profile.unlocks.colors;
                const index = colors.indexOf(profile.sockStyle[property]);
                const next = index < 0 ? (direction > 0 ? 0 : colors.length - 1)
                    : (index + direction + colors.length) % colors.length;
                choose({ [property]: colors[next] });
            };
            addButtonImage(196, y, 'customize-arrow-left', 35, () => cycle(-1));
            const valueBackground = this.add.image(270, y, 'customize-selector')
                .setScale(104 / this.textures.get('customize-selector').getSourceImage().width);
            panel.add(valueBackground);
            const swatch = this.add.rectangle(233, y, 17, 17, 0xffffff);
            panel.add(swatch);
            const swatchFrame = this.add.image(233, y, 'customize-swatch-frame')
                .setScale(31 / this.textures.get('customize-swatch-frame').getSourceImage().width);
            panel.add(swatchFrame);
            const name = this.add.text(286, y, '', {
                ...TEXT, fontSize: '10px', color: '#4b3027', align: 'center'
            }).setOrigin(0.5);
            panel.add(name);
            addButtonImage(344, y, 'customize-arrow-right', 35, () => cycle(1));
            this.skinColorControls.push({ property, swatch, name });
        }
        for (const [index, pattern] of SOCK_PATTERNS.entries()) {
            const x = 50 + (index % 4) * 100;
            const y = 545 + Math.floor(index / 4) * 36;
            const button = addButtonImage(x, y, 'customize-pattern-default', 84,
                () => choose({ patternId: pattern.id }));
            button.setDisplaySize(84, 34);
            const label = this.add.text(x, y, pattern.name.toUpperCase(), {
                ...TEXT, fontSize: '12px', color: '#3b2026'
            }).setOrigin(0.5);
            panel.add(label);
            this.skinPatternButtons.push({ button, id: pattern.id });
        }
        const patternHeader = this.add.text(200, 511, 'CHOOSE A PATTERN', {
            ...TEXT, fontSize: '12px', color: '#fff0c8', stroke: '#45372b', strokeThickness: 3
        }).setOrigin(0.5);
        panel.add(patternHeader);
        const preview = this.add.image(200, 617, 'customize-preview').setDisplaySize(260, 26);
        panel.add(preview);
        this.updateSkinSelection();
    }

    updateSkinSelection() {
        const style = playerData.getProfile().sockStyle;
        for (const { property, swatch, name } of this.skinColorControls || []) {
            swatch.setFillStyle(Phaser.Display.Color.HexStringToColor(style[property]).color);
            name.setText(getSockColorName(style[property]));
        }
        for (const { property, title, button, label } of this.skinToggleButtons || []) {
            const active = style[property];
            button.setTexture(active ? 'customize-pattern-selected' : 'customize-pattern-default')
                .setDisplaySize(154, 49);
            label.setText(`${title}: ${active ? 'ON' : 'OFF'}`);
        }
        for (const { button, id } of this.skinPatternButtons || []) {
            const selected = style.patternId === id;
            button.setTexture(selected ? 'customize-pattern-selected' : 'customize-pattern-default')
                .setDisplaySize(84, 34);
        }
    }

    createUpgrades() {
        const panel = this.add.container(LOCATIONS.upgrades.x, LOCATIONS.upgrades.y);
        const art = (x, y, key, width) => {
            const image = this.add.image(x, y, key);
            image.setScale(width / image.width);
            panel.add(image);
            return image;
        };
        panel.add(this.add.image(200, 350, 'upgrade-background').setDisplaySize(WIDTH, HEIGHT));
        art(101, 73, 'upgrade-title', 168);
        this.label(panel, 101, 73, 'UPGRADES', 24, '#392e24');
        art(84, 225, 'upgrade-fabric', 152);
        this.label(panel, 84, 225, 'FABRIC', 22, '#392e24');
        art(316, 225, 'upgrade-steering', 152);
        this.label(panel, 316, 225, 'STEERING', 22, '#392e24');
        // Static shared skin in the clear space between the two upgrade chains.
        this.upgradeSock = this.sock(panel, 200, 400, 1.75).setOrigin(0.5);
        const names = {
            fabric: ['Reinforced\nStitching', 'Double\nLayer', 'Tough\nFabric', 'Master\nWeave', 'Unbreakable\nThread'],
            steering: ['Better\nHandling', 'Sharper\nTurns', 'Total\nControl', 'Precision\nSteering', 'Silky\nSteering']
        };
        this.upgradeTiers = [];
        for (const id of ['fabric', 'steering']) {
            const x = id === 'fabric' ? 82 : 318;
            for (let tier = 1; tier <= UPGRADES[id].costs.length; tier++) {
                const y = 278 + (tier - 1) * 60;
                const button = art(x, y, `upgrade-${id}-${tier}`, 152)
                    .setInteractive({ useHandCursor: true });
                this.registerMenuControl('upgrades', button, () => this.buyUpgrade(id, tier));
                const name = this.label(panel, x + 16, y - 8, names[id][tier - 1].toUpperCase(), 15, '#392e24').setLineSpacing(-2);
                if (name.width > 100) name.setFontSize(Math.floor(15 * 100 / name.width));
                const status = this.label(panel, x + 10, y + 16, '', 12, '#665543');
                const check = this.add.graphics({ x: x + 62, y: y + 16 });
                check.fillStyle(0x258a48).fillCircle(0, 0, 6);
                check.lineStyle(2, 0xffffff).beginPath().moveTo(-3, 0).lineTo(-1, 2).lineTo(3, -3).strokePath();
                panel.add(check);
                // A small drawn padlock stays legible even when fonts lack lock glyphs.
                const lock = this.add.graphics({ x: x + 61, y: y + 15 });
                lock.lineStyle(2, 0x666b70).strokeRoundedRect(-3, -7, 6, 8, 3);
                lock.fillStyle(0x666b70).fillRoundedRect(-5, -3, 10, 8, 2);
                panel.add(lock);
                const highlight = this.add.rectangle(x, y - 2, 148, 51).setFillStyle(0, 0).setStrokeStyle(2, 0xf2c764);
                panel.add(highlight);
                this.upgradeTiers.push({ id, tier, button, name, status, check, lock, highlight });
            }
        }
        panel.add(this.add.rectangle(200, 567, 366, 28, 0x102131, 0.8));
        const stats = getRunStats(playerData.getProfile().upgrades);
        this.shopMessage = this.label(panel, 200, 567, `${stats.maxHealth} HEARTS • +${Math.round((stats.steeringSpeedMultiplier - 1) * 100)}% SPEED • -${Math.round((1 - stats.steeringDelayMultiplier) * 100)}% DELAY`, 14, '#ffcf70');
        this.navigationSigns.upgrades = { RIGHT: art(300, 610, 'upgrade-back', 183) };
        this.label(panel, 300, 610, 'WASHING ROOM  >', 17, '#392e24');
    }

    updateShop() {
        const profile = playerData.getProfile();
        this.currencyText?.setText(profile.currency.toLocaleString('en-US'));
        this.saveWarning?.setY(this.location === 'customize' ? 323 : 675);
        const testing = getDevUpgradeMode();
        const upgrades = getEffectiveUpgrades(profile.upgrades);
        this.nextUpgradeGoal.setText(testing ? this.devUpgradeMessage() : getUpgradeProgress(profile).message);
        if (testing) this.shopMessage.setText(this.devUpgradeMessage());
        this.saveWarning?.setText(playerData.saveError || '');
        for (const item of this.upgradeTiers) {
            const level = upgrades[item.id];
            const owned = item.tier <= level;
            const next = !testing && item.tier === level + 1;
            const price = UPGRADES[item.id].costs[item.tier - 1];
            // Let players inspect the next tier and get a price message even when short on currency.
            item.button.shopEnabled = next;
            item.button.setAlpha(owned || next ? 1 : 0.65);
            item.name.setAlpha(owned || next ? 1 : 0.65);
            item.check.setVisible(owned);
            item.lock.setVisible(!owned && !next);
            item.highlight.setVisible(next);
            item.status.setText(owned ? 'OWNED' : next ? price.toLocaleString('en-US') : 'LOCKED');
            item.status.setColor(owned ? '#258a48' : next && profile.currency < price ? '#9e553d' : '#665543');
        }
        this.refreshControls();
    }

    devUpgradeMessage() {
        return getDevUpgradeMode() === 'max' ? 'DEV: ALL UPGRADES ON' : 'DEV: ALL UPGRADES OFF';
    }

    buyUpgrade(id, tier) {
        if (getDevUpgradeMode() || this.location !== 'upgrades' || this.transitioning || this.starting) return;
        const profile = playerData.getProfile();
        if (tier !== profile.upgrades[id] + 1) return;
        const purchased = playerData.purchaseUpgrade(id, tier);
        const stats = getRunStats(playerData.getProfile().upgrades);
        this.shopMessage.setText((purchased ? id === 'fabric'
            ? `Fabric improved! Next run: ${stats.maxHealth} hearts.`
            : `+${Math.round((stats.steeringSpeedMultiplier - 1) * 100)}% SPEED • -${Math.round((1 - stats.steeringDelayMultiplier) * 100)}% WEIGHT DELAY`
            : playerData.saveError ? 'Could not save purchase. No currency spent.' : `YOU NEED ${UPGRADES[id].costs[tier - 1].toLocaleString('en-US')} CURRENCY FOR THIS LEVEL.`).toUpperCase());
        this.updateShop();
    }

    createRecords() {
        const panel = this.add.container(LOCATIONS.records.x, LOCATIONS.records.y);
        const art = (x, y, key, width) => {
            const image = this.add.image(x, y, key);
            image.setScale(width / image.width);
            panel.add(image);
            return image;
        };
        panel.add(this.add.image(200, 350, 'records-background').setDisplaySize(WIDTH, HEIGHT));
        art(200, 375, 'records-board', 360);
        const personalSheet=this.add.container(0,0);
        panel.add(personalSheet);
        personalSheet.add(art(200, 375, 'records-paper', 326));
        // Values line up with the icons, labels and rules printed on the paper.
        // The paper's original dimensions are 409 x 512.
        const scale = 326 / 409;
        const paperTop = 375 - 512 * scale / 2;
        const records = playerData.getProfile().records;
        const number = value => value >= 1000000
            ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
            : value.toLocaleString('en-US');
        const rows = [
            [126, number(records.bestScore), 96],
            [168, `${number(Number(records.maxSpeedKmh.toFixed(1)))} KM/H`, 116],
            [211, `${number(Number(records.maxWeight.toFixed(1)))} KG`, 116],
            [252, number(records.maxStreak), 100],
            [295, number(records.mostButtons), 64],
            [338, number(records.totalButtons), 100],
            [382, number(records.totalCurrencyEarned), 90],
            [426, number(records.completedRuns), 90]
        ];
        for (const [nativeY, value, maxWidth] of rows) {
            const entry = this.add.text(348, paperTop + nativeY * scale, value, {
                ...TEXT, fontSize: '20px', color: '#3c202b'
            }).setOrigin(1, 0.5);
            if (entry.width > maxWidth) entry.setScale(maxWidth / entry.width);
            personalSheet.add(entry);
        }
        art(200, 109, 'records-title', 280).setCrop(0, 0, 509, 200);
        createRecordNotes(this);
        art(48, 565, 'records-note-sock', 65).setAngle(-7);
        art(352, 565, 'records-note-star', 65).setAngle(8);
        this.label(personalSheet, 200, 562, `TOTAL RUNS: ${number(records.totalRuns)}`, 14, '#fff0c8')
            .setStroke('#45372b', 2);
        this.recordsAlbum=createReunionsAlbum(this,panel,personalSheet);
        const credits = art(324, 595, 'credits-sign-right', 131);
        this.label(panel, 313, 595, 'CREDITS', 13, '#4b3027');
        const back = art(200, 646, 'records-back', 240).setCrop(0, 0, 466, 157);
        this.navigationSigns.records = { LEFT: back, RIGHT: credits };
    }

    refreshControls() {
        for (const { room, button } of this.controls) {
            button.input.enabled = (!room || room === this.location) && !this.transitioning && !this.starting && button.shopEnabled !== false && button.pageEnabled !== false;
        }
        if (this.focusedButton && !this.focusOptions().some(option => option.button === this.focusedButton)) {
            this.setFocus(null);
        }
    }

    navigate(destination) {
        if (this.transitioning || this.starting || destination === this.location || !Object.hasOwn(LOCATIONS, destination)) return;
        if (!Object.values(ROUTES[this.location]).includes(destination)) return;
        this.transitioning = true;
        this.setFocus(null);
        if (this.location === 'credits') this.creditsRoom.closeCredit();
        this.destination = destination;
        this.refreshControls();
        const { x, y } = LOCATIONS[destination];
        this.cameras.main.once('camerapancomplete', this.finishNavigation, this);
        this.cameras.main.pan(x + WIDTH / 2, y + HEIGHT / 2, 450, 'Sine.easeInOut');
    }

    finishNavigation() {
        this.location = this.destination;
        this.transitioning = false;
        this.saveWarning.setY(this.location === 'customize' ? 323 : 675);
        this.refreshControls();
    }

    startRun() {
        if (this.location !== 'main' || this.transitioning || this.starting || this.entryFinished) return;
        this.starting = true;
        this.refreshControls();
        this.mainSock.setCrop();
        this.mainSock.setDepth(3);
        this.tweens.add({
            targets: this.mainSock, x: 238, y: 168, angle: 230,
            duration: 210, ease: 'Sine.easeOut',
            onComplete: () => this.tweens.add({
                targets: this.mainSock, x: 200, y: 456, angle: 360,
                duration: 410, ease: 'Sine.easeIn',
                onComplete: () => this.tweens.add({
                    targets: this.mainSock, y: 471, scale: 0.03, alpha: 0,
                    duration: 120, ease: 'Sine.easeIn',
                    onComplete: () => {
                        this.cameras.main.once('camerafadeoutcomplete', this.finishEntry, this);
                        this.cameras.main.fadeOut(170, 0, 0, 0);
                    }
                })
            })
        });
    }

    finishEntry() {
        if (this.entryFinished) return;
        this.entryFinished = true;
        this.tweens.killTweensOf(this.mainSock);
        this.scene.start('level');
    }
}
