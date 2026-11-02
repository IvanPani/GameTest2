import Phaser from 'phaser';
import Player from './player.js';
import { playerData } from './player-data.js';
import { getRunStats } from './upgrades.js';
import { COMBO, getComboMultiplier } from './combo.js';
import { silhouettesOverlap } from './silhouette-collision.js';
import { MOVEMENT, getWeight, getFallSpeed, getSpeedKmh, steer } from './movement.js';

const WIDTH = 400;
const HEIGHT = 700;
const PLAYER_Y_RATIO = 0.23;
const MULTIPLIER_STYLE = Object.freeze({
    fontSize: 24,
    yellow: '#fff200',
    orange: '#ff8500',
    red: '#ff244f',
    magenta: '#ff2bff',
    topTierPopScale: 1.25,
    outline: '#07121f',
    outlineWidth: 3,
    popScale: 1.18,
    popDurationMs: 120,
    // Pulse strength rises with the multiplier; duration is each half-cycle.
    pulseByMultiplier: Object.freeze({
        2: { scale: 1.025, durationMs: 900 },
        3: { scale: 1.045, durationMs: 700 },
        4: { scale: 1.075, durationMs: 500 },
        5: { scale: 1.10, durationMs: 400 }
    })
});
// Background moves more slowly than hazards to give the tunnel depth.
const BACKGROUND_SCROLL_RATIO = 0.02;
// Distances in pixels: match the original spawn cadence at 190 px/s.
const SPAWNING = Object.freeze({
    firstObstacleDistance: 95,
    firstButtonDistance: 152,
    obstacleGapMin: 162,
    obstacleGapMax: 247,
    buttonGapMin: 190,
    buttonGapMax: 295,
    clearance: 24
});

// Delays begin once the previous tutorial object is collected or passes the sock.
const INTRO = Object.freeze({
    steps: [
        { type: 'button', delayMs: 3000, offsetX: 0 },
        { type: 'button', delayMs: 1000, offsetX: 70 },
        { type: 'soap', delayMs: 1500, offsetX: 0 }
    ],
    normalFlowDelayMs: 3000
});

export default class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'level' });
    }

    create() {
        this.runId = playerData.beginRun();
        this.runStats = getRunStats(playerData.getProfile().upgrades);
        this.runEnded = false;
        this.cameras.main.setBackgroundColor('#182b3d');
        this.createShaft();

        this.player = new Player(this, WIDTH / 2, this.scale.height * PLAYER_Y_RATIO);
        this.player.setDepth(2);
        this.cursors = this.input.keyboard?.createCursorKeys();
        this.targetX = this.player.x;
        this.steeringVelocity = 0;
        this.pointerSteering = false;
        this.obstacles = [];
        this.collectibles = [];
        this.elapsed = 0;
        this.introStep = 0;
        this.introWaitMs = INTRO.steps[0].delayMs;
        this.introEncounter = null;
        this.introComplete = false;
        this.obstacleDistance = SPAWNING.firstObstacleDistance;
        this.collectibleDistance = SPAWNING.firstButtonDistance;
        this.damageTimer = 0;
        this.score = 0;
        this.buttonsCollected = 0;
        this.combo = 0;
        this.testMultiplier = 1;
        this.maxCombo = 0;
        this.pickupStreak = 0;
        this.bestPickupStreak = 0;
        this.consecutiveMisses = 0;
        this.weight = getWeight(this.buttonsCollected);
        this.health = this.runStats.maxHealth;

        this.createHud();

        const onPointerDown = (pointer) => {
            this.targetX = pointer.x;
            this.pointerSteering = true;
        };
        const onPointerMove = (pointer) => {
            if (pointer.isDown) {
                this.targetX = pointer.x;
                this.pointerSteering = true;
            }
        };
        this.input.on('pointerdown', onPointerDown);
        this.input.on('pointermove', onPointerMove);
        this.events.once('shutdown', () => {
            this.input.off('pointerdown', onPointerDown);
            this.input.off('pointermove', onPointerMove);
        });
    }

    createShaft() {
        const texture = this.textures.get('washing-machine-background').getSourceImage();
        const scale = Math.max(WIDTH / texture.width, HEIGHT / texture.height);
        this.backgroundHeight = texture.height * scale;
        this.background = this.add.image(WIDTH / 2, 0, 'washing-machine-background')
            .setOrigin(0.5, 0)
            .setScale(scale)
            .setDepth(-2);
        this.backgroundOffset = 0;
        this.backgroundMaxOffset = Math.max(0, this.backgroundHeight - HEIGHT);
    }

    createHud() {
        this.add.rectangle(WIDTH / 2, 54, WIDTH, 108, 0x102131, 0.96).setDepth(10);
        this.add.text(12, 15, 'FABRIC', this.hudStyle(15, '#f3f6ed')).setDepth(11);
        this.hearts = Array.from({ length: this.runStats.maxHealth }, (_, index) => {
            // Four hearts per row keeps all eight clear of weight/speed and combo.
            const heart = this.add.graphics({ x: 22 + (index % 4) * 22, y: 50 + Math.floor(index / 4) * 24 }).setDepth(11);
            // Draw hearts as geometry so they stay red on every platform/font.
            const points = Array.from({ length: 48 }, (_, point) => {
                const angle = point / 48 * Math.PI * 2;
                return {
                    x: 16 * Math.sin(angle) ** 3 * 0.6,
                    y: -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle)
                        - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * 0.6
                };
            });
            heart.fillStyle(0xef4444, 1);
            heart.fillPoints(points, true);
            return heart;
        });
        this.add.text(WIDTH - 12, 15, 'SCORE', this.hudStyle(15, '#f3f6ed'))
            .setOrigin(1, 0).setDepth(11);
        this.scoreText = this.add.text(WIDTH - 12, 38, '', this.hudStyle(22, '#f3f6ed'))
            .setOrigin(1, 0).setDepth(11);
        this.comboText = this.add.text(WIDTH - 12, 104, '', {
            ...this.hudStyle(MULTIPLIER_STYLE.fontSize, MULTIPLIER_STYLE.yellow),
            stroke: MULTIPLIER_STYLE.outline,
            strokeThickness: MULTIPLIER_STYLE.outlineWidth,
            padding: { left: 4, right: 4, top: 4, bottom: 4 }
        }).setOrigin(1, 1).setDepth(12);
        this.displayedMultiplier = 1;
        this.weightText = this.add.text(WIDTH / 2, 18, '', this.hudStyle(14, '#8fe0d4'))
            .setOrigin(0.5, 0).setDepth(11);
        this.speedText = this.add.text(WIDTH / 2, 49, '', this.hudStyle(14, '#8fe0d4'))
            .setOrigin(0.5, 0).setDepth(11);
        this.updateHud();
    }

    hudStyle(size, color) {
        return {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: `${size}px`,
            fontStyle: 'bold',
            color
        };
    }

    updateHud() {
        this.scoreText.setText(`${this.score}`);
        const multiplier = this.getActiveMultiplier();
        this.updateMultiplier(multiplier);
        this.weightText.setText(`WEIGHT  ${this.weight.toFixed(1)} KG`);
        this.speedText.setText(`SPEED  ${getSpeedKmh(this.buttonsCollected).toFixed(1)} KM/H`);
        this.hearts.forEach((heart, index) => {
            heart.setAlpha(index < this.health ? 1 : 0.2);
        });
    }

    getActiveMultiplier() {
        return Math.max(getComboMultiplier(this.combo), this.testMultiplier);
    }

    advanceTestMultiplier() {
        if (!COMBO.keyboardTestingEnabled) return;
        const maxMultiplier = COMBO.multiplierThresholds.length + 1;
        this.testMultiplier = Math.min(this.getActiveMultiplier() + 1, maxMultiplier);
        this.updateHud();
    }

    updateMultiplier(multiplier) {
        this.comboText.setText(multiplier > 1 ? `${multiplier}X` : '');
        this.comboText.setColor(multiplier >= 5 ? MULTIPLIER_STYLE.magenta
            : multiplier === 4 ? MULTIPLIER_STYLE.red
            : multiplier === 3 ? MULTIPLIER_STYLE.orange : MULTIPLIER_STYLE.yellow);
        this.comboText.setVisible(multiplier > 1);
        if (multiplier === this.displayedMultiplier) return;

        this.tweens.killTweensOf(this.comboText);
        this.comboText.setScale(1);
        const increased = multiplier > this.displayedMultiplier;
        this.displayedMultiplier = multiplier;
        if (multiplier <= 1) return;

        const startPulse = () => {
            if (this.displayedMultiplier !== multiplier || multiplier < 2) return;
            const pulse = MULTIPLIER_STYLE.pulseByMultiplier[multiplier];
            this.tweens.add({
                targets: this.comboText,
                scale: pulse.scale,
                duration: pulse.durationMs,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });
        };
        if (increased) {
            this.tweens.add({
                targets: this.comboText,
                scale: multiplier === 5 ? MULTIPLIER_STYLE.topTierPopScale : MULTIPLIER_STYLE.popScale,
                duration: MULTIPLIER_STYLE.popDurationMs,
                ease: 'Quad.easeOut',
                yoyo: true,
                onComplete: startPulse
            });
        } else {
            startPulse();
        }
    }

    spawnObstacle(preferredX = null) {
        const frames = ['small', 'medium', 'large'];
        const frame = frames[Phaser.Math.Between(0, frames.length - 1)];
        const textureFrame = this.textures.getFrame('soap', frame);
        const size = Phaser.Math.Between(54, 80);
        const scale = size / Math.max(textureFrame.width, textureFrame.height);
        const displayWidth = textureFrame.width * scale;
        const displayHeight = textureFrame.height * scale;
        const angle = Phaser.Math.Between(0, 359);
        const radians = Phaser.Math.DegToRad(angle);
        // Rotated bounds keep spawns apart; silhouette masks decide actual contact.
        const width = Math.abs(Math.cos(radians)) * displayWidth + Math.abs(Math.sin(radians)) * displayHeight;
        const height = Math.abs(Math.sin(radians)) * displayWidth + Math.abs(Math.cos(radians)) * displayHeight;
        const minX = 42 + width / 2;
        const maxX = WIDTH - 42 - width / 2;
        const requestedX = preferredX === null ? null : Phaser.Math.Clamp(Math.round(preferredX), Math.ceil(minX), Math.floor(maxX));
        const x = this.findSpawnX(width, height, HEIGHT + height,
            requestedX ?? minX, requestedX ?? maxX);
        if (x === null) return;
        const shape = this.add.image(x, HEIGHT + height, 'soap', frame)
            .setScale(scale).setAngle(angle).setDepth(1);
        const obstacle = { shape, width, height };
        this.obstacles.push(obstacle);
        return obstacle;
    }

    spawnCollectible(preferredX = null) {
        const requestedX = preferredX === null ? null : Phaser.Math.Clamp(Math.round(preferredX), 54, WIDTH - 54);
        const x = this.findSpawnX(34, 34, HEIGHT + 24, requestedX ?? 54, requestedX ?? (WIDTH - 54));
        if (x === null) return;
        const shape = this.add.image(x, HEIGHT + 24, 'button')
            .setDisplaySize(38, 38)
            .setAngle(Phaser.Math.Between(0, 359))
            .setDepth(1);
        const collectible = { shape, width: 34, height: 34 };
        this.collectibles.push(collectible);
        return collectible;
    }

    update(_time, delta) {
        if (this.runEnded) return;
        const seconds = Math.min(delta, 50) / 1000;
        this.elapsed += delta;
        this.damageTimer = Math.max(0, this.damageTimer - delta);

        if (COMBO.keyboardTestingEnabled && this.cursors?.up
            && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.advanceTestMultiplier();
        }
        this.movePlayer(seconds);

        const fallSpeed = getFallSpeed(this.buttonsCollected);
        this.scrollShaft(fallSpeed * seconds);
        this.moveObjects(fallSpeed * seconds);
        if (this.runEnded) return;
        if (this.introComplete) {
            this.updateSpawns(fallSpeed * seconds);
        } else {
            this.updateIntro(seconds * 1000);
        }

        if (this.damageTimer === 0) {
            this.player.setAlpha(1);
        } else {
            this.player.setAlpha(Math.floor(this.damageTimer / MOVEMENT.blinkIntervalMs) % 2 === 0 ? MOVEMENT.blinkAlpha : 1);
        }
    }

    movePlayer(seconds) {
        const left = this.cursors?.left.isDown;
        const right = this.cursors?.right.isDown;
        const direction = left === right ? 0 : (left ? -1 : 1);
        if (direction !== 0) {
            this.pointerSteering = false;
        }

        this.targetX = Phaser.Math.Clamp(this.targetX, 42, WIDTH - 42);
        const difference = this.targetX - this.player.x;
        const targetVelocity = direction !== 0
            ? direction * MOVEMENT.steeringSpeed
            : (this.pointerSteering ? Math.sign(difference) * MOVEMENT.steeringSpeed : 0);
        const movement = steer(this.steeringVelocity, targetVelocity, this.weight, seconds, this.runStats.steeringDelayMultiplier);
        this.steeringVelocity = movement.velocity;

        // A pointer selects a destination: stop there rather than oscillating around it.
        if (this.pointerSteering && direction === 0
            && (difference === 0 || (Math.sign(movement.distance) === Math.sign(difference)
                && Math.abs(movement.distance) >= Math.abs(difference)))) {
            this.player.x = this.targetX;
            this.steeringVelocity = 0;
        } else {
            this.player.x += movement.distance;
        }

        const boundedX = Phaser.Math.Clamp(this.player.x, 42, WIDTH - 42);
        if (boundedX !== this.player.x) {
            this.steeringVelocity = 0;
        }
        this.player.x = boundedX;
    }

    scrollShaft(distance) {
        // This biome is a single illustration, not a seamless repeating texture.
        // Hold its final view until a future biome/tutorial transition takes over.
        this.backgroundOffset = Math.min(
            this.backgroundOffset + distance * BACKGROUND_SCROLL_RATIO,
            this.backgroundMaxOffset
        );
        this.background.y = -this.backgroundOffset;
    }

    findSpawnX(width, height, y, minX, maxX) {
        // Keep buttons out of hazards, including hazards spawned beside existing buttons.
        const candidates = [];
        const objects = [...this.obstacles, ...this.collectibles];
        for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += 1) {
            const clear = objects.every((object) =>
                Math.abs(object.shape.y - y) >= (object.height + height) / 2 + SPAWNING.clearance
                || Math.abs(object.shape.x - x) >= (object.width + width) / 2 + SPAWNING.clearance);
            if (clear) candidates.push(x);
        }
        return candidates.length ? candidates[Phaser.Math.Between(0, candidates.length - 1)] : null;
    }

    updateIntro(deltaMs) {
        if (this.introEncounter) {
            const { object, type } = this.introEncounter;
            const objects = type === 'button' ? this.collectibles : this.obstacles;
            const passedSock = object.shape.y + object.height / 2
                < this.player.y - this.player.sock.displayHeight / 2;
            if (objects.includes(object) && !passedSock) return;
            this.introEncounter = null;
            this.introWaitMs = INTRO.steps[this.introStep]?.delayMs ?? INTRO.normalFlowDelayMs;
            return;
        }

        this.introWaitMs = Math.max(0, this.introWaitMs - deltaMs);
        if (this.introWaitMs > 0) return;
        const step = INTRO.steps[this.introStep];
        if (!step) {
            this.introComplete = true;
            return;
        }
        // Place each lesson relative to the sock's current position.
        const x = this.player.x + step.offsetX;
        const object = step.type === 'button' ? this.spawnCollectible(x) : this.spawnObstacle(x);
        if (!object) return; // Retry if an earlier, already-passed object blocks spawning.
        this.introEncounter = { object, type: step.type };
        this.introStep += 1;
    }

    updateSpawns(distance) {
        this.obstacleDistance -= distance;
        this.collectibleDistance -= distance;

        if (this.obstacleDistance <= 0) {
            this.spawnObstacle();
            this.obstacleDistance = Phaser.Math.Between(SPAWNING.obstacleGapMin, SPAWNING.obstacleGapMax);
        }
        if (this.collectibleDistance <= 0) {
            this.spawnCollectible();
            this.collectibleDistance = Phaser.Math.Between(SPAWNING.buttonGapMin, SPAWNING.buttonGapMax);
        }
    }

    moveObjects(distance) {
        for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
            const obstacle = this.obstacles[index];
            obstacle.shape.y -= distance;

            if (this.overlapsPlayer(obstacle)) {
                obstacle.shape.destroy();
                this.obstacles.splice(index, 1);
                if (this.damageTimer === 0) {
                    this.health -= 1;
                    this.combo = 0;
                    this.pickupStreak = 0;
                    this.testMultiplier = 1;
                    this.consecutiveMisses = 0;
                    this.damageTimer = MOVEMENT.damageInvulnerabilityMs;
                    this.updateHud();
                    if (this.health <= 0) {
                        this.runEnded = true;
                        const result = {
                            score: this.score,
                            weight: this.weight,
                            speedKmh: getSpeedKmh(this.buttonsCollected),
                            totalButtons: this.buttonsCollected,
                            maxCombo: this.maxCombo,
                            bestPickupStreak: this.bestPickupStreak
                        };
                        playerData.completeRun(this.runId, this.score, result);
                        this.scene.start('end', result);
                        return;
                    }
                }
            } else if (obstacle.shape.y < -obstacle.height) {
                obstacle.shape.destroy();
                this.obstacles.splice(index, 1);
            }
        }

        for (let index = this.collectibles.length - 1; index >= 0; index -= 1) {
            const collectible = this.collectibles[index];
            collectible.shape.y -= distance;

            if (this.overlapsPlayer(collectible)) {
                collectible.shape.destroy();
                this.collectibles.splice(index, 1);
                this.buttonsCollected += 1;
                this.pickupStreak += 1;
                this.bestPickupStreak = Math.max(this.bestPickupStreak, this.pickupStreak);
                this.combo += 1;
                this.maxCombo = Math.max(this.maxCombo, this.combo);
                this.consecutiveMisses = 0;
                this.score += COMBO.pointsPerButton * this.getActiveMultiplier();
                this.weight = getWeight(this.buttonsCollected);
                this.player.setButtonCount(this.buttonsCollected);
                this.updateHud();
            } else {
                // Count each missed button once as soon as it fully passes the sock.
                if (!collectible.missed
                    && collectible.shape.getBounds().bottom < this.player.sock.getBounds().top) {
                    collectible.missed = true;
                    this.pickupStreak = 0;
                    this.consecutiveMisses += 1;
                    if (this.consecutiveMisses >= COMBO.missesBeforeReset) {
                        this.combo = 0;
                        this.testMultiplier = 1;
                        this.consecutiveMisses = 0;
                    }
                    this.updateHud();
                }
                if (collectible.shape.y < -collectible.height) {
                    collectible.shape.destroy();
                    this.collectibles.splice(index, 1);
                }
            }
        }
    }

    overlapsPlayer(object) {
        return silhouettesOverlap(this.player.sock, object.shape);
    }
}
