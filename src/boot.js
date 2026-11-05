import Phaser from 'phaser';
import { MUSIC_TRACKS } from './music.js';
import { GAME_AUDIO } from './game-audio.js';
import { HAZARD_ART, getMaskBounds } from './hazards.js';
import { LEVEL_REGIONS } from './level-regions.js';
import { CREDITS_ART } from './credits-data.js';
import { MENU_ART, CUSTOMIZE_ART, UPGRADE_ART, RECORD_ART } from './menu-art.js';
import { playerData } from './player-data.js';
import { createHudIcons } from './record-note.js';
import { applySockStyle, CUSTOM_SOCK_TEXTURE } from './sock-skin.js';
import { getFrameMask } from './silhouette-collision.js';

const FALL_ANIMATION_FPS = 8;

export default class Boot extends Phaser.Scene {
    constructor() {
        super({ key: 'boot' });
    }

    preload() {
        for (const [key, url] of [...GAME_AUDIO, ...MUSIC_TRACKS]) this.load.audio(key, url);
        for (const [key, url] of [...MENU_ART, ...CUSTOMIZE_ART, ...UPGRADE_ART, ...RECORD_ART, ...CREDITS_ART]) this.load.image(key, url);
        this.load.image('button', new URL('../assets/sprites/button.png', import.meta.url).href);
        for (const { key, url } of HAZARD_ART) this.load.image(key, url);
        this.load.image('soap', new URL('../assets/sprites/soap.png', import.meta.url).href);
        for (const { key, url } of LEVEL_REGIONS) this.load.image(key, url);
        this.load.spritesheet(
            'white-sock-stages',
            new URL('../assets/sprites/Sprite_Sheet_White_Sock_Stages.png', import.meta.url).href,
            { frameWidth: 512, frameHeight: 512 }
        );
        this.load.image(
            'white-sock-static',
            new URL('../assets/sprites/Sprite_White_Sock.png', import.meta.url).href
        );
    }

    create() {
        // Three independent soap clusters from the source illustration.
        const soap = this.textures.get('soap');
        soap.add('small', 0, 65, 175, 400, 400);
        soap.add('medium', 0, 610, 60, 610, 575);
        soap.add('large', 0, 1300, 10, 855, 700);
        for (let stage = 0; stage < 5; stage += 1) {
            this.anims.create({
            key: `white-sock-stage-${stage}`,
            frames: this.anims.generateFrameNumbers('white-sock-stages', {
                start: stage * 6,
                end: stage * 6 + 5
            }),
            frameRate: FALL_ANIMATION_FPS,
            repeat: -1
        });
        }
        // Cache source silhouettes once, before gameplay (not on every collision).
        // The customized frames have the same alpha as the original spritesheet.
        // Precompute their collision silhouettes after creating the custom texture.
        for (const name of ['small', 'medium', 'large']) getFrameMask(soap.get(name));
        for (const { key } of HAZARD_ART) {
            const texture = this.textures.get(key);
            const bounds = getMaskBounds(getFrameMask(texture.get()));
            if (!bounds) throw new Error(`Hazard artwork has no solid pixels: ${key}`);
            texture.add('object', 0, bounds.x, bounds.y, bounds.width, bounds.height);
            getFrameMask(texture.get('object'));
        }
        getFrameMask(this.textures.getFrame('button'));
        createHudIcons(this);
        playerData.load();
        applySockStyle(this, playerData.getProfile().sockStyle);
        const customStages = this.textures.get(CUSTOM_SOCK_TEXTURE);
        for (let frame = 0; frame < 30; frame += 1) getFrameMask(customStages.get(frame));
        this.scene.start('menu');
    }
}
