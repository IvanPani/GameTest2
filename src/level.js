import Phaser from 'phaser';
import Player from './player.js';
import { MOVEMENT, getWeight, getFallSpeed, getSpeedKmh, steer } from './movement.js';

const WIDTH = 400;
const HEIGHT = 700;
const PLAYER_Y_RATIO = 0.23;
const MAX_HEALTH = 3;
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

export default class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'level' });
    }

    create() {
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
        this.obstacleDistance = SPAWNING.firstObstacleDistance;
        this.collectibleDistance = SPAWNING.firstButtonDistance;
        this.damageTimer = 0;
        this.score = 0;
        this.weight = getWeight(this.score);
        this.health = MAX_HEALTH;

        this.createHud();

        this.input.on('pointerdown', (pointer) => {
            this.targetX = pointer.x;
            this.pointerSteering = true;
        });
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.targetX = pointer.x;
                this.pointerSteering = true;
            }
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
        this.add.rectangle(WIDTH / 2, 48, WIDTH, 96, 0x102131, 0.96).setDepth(10);
        this.add.text(12, 15, 'Fabric', this.hudStyle(15, '#f3f6ed')).setDepth(11);
        this.hearts = Array.from({ length: MAX_HEALTH }, (_, index) => {
            const heart = this.add.graphics({ x: 22 + index * 24, y: 56 }).setDepth(11);
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
        this.add.text(WIDTH - 12, 15, 'Score', this.hudStyle(15, '#f3f6ed'))
            .setOrigin(1, 0).setDepth(11);
        this.scoreText = this.add.text(WIDTH - 12, 45, '', this.hudStyle(22, '#f3f6ed'))
            .setOrigin(1, 0).setDepth(11);
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
        this.weightText.setText(`Weight  ${this.weight.toFixed(1)} kg`);
        this.speedText.setText(`Speed  ${getSpeedKmh(this.score).toFixed(1)} km/h`);
        this.hearts.forEach((heart, index) => {
            heart.setAlpha(index < this.health ? 1 : 0.2);
        });
    }

    spawnObstacle() {
        const frames = ['small', 'medium', 'large'];
        const frame = frames[Phaser.Math.Between(0, frames.length - 1)];
        const textureFrame = this.textures.getFrame('soap', frame);
        const size = Phaser.Math.Between(54, 80);
        const scale = size / Math.max(textureFrame.width, textureFrame.height);
        const displayWidth = textureFrame.width * scale;
        const displayHeight = textureFrame.height * scale;
        const angle = Phaser.Math.Between(0, 359);
        const radians = Phaser.Math.DegToRad(angle);
        // Rotated bounds are shared by spawn spacing and collision detection.
        const width = Math.abs(Math.cos(radians)) * displayWidth + Math.abs(Math.sin(radians)) * displayHeight;
        const height = Math.abs(Math.sin(radians)) * displayWidth + Math.abs(Math.cos(radians)) * displayHeight;
        const x = this.findSpawnX(width, height, HEIGHT + height, 42 + width / 2, WIDTH - 42 - width / 2);
        if (x === null) return;
        const shape = this.add.image(x, HEIGHT + height, 'soap', frame)
            .setScale(scale).setAngle(angle).setDepth(1);
        this.obstacles.push({ shape, width, height });
    }

    spawnCollectible() {
        const x = this.findSpawnX(34, 34, HEIGHT + 24, 54, WIDTH - 54);
        if (x === null) return;
        const shape = this.add.image(x, HEIGHT + 24, 'button')
            .setDisplaySize(38, 38)
            .setAngle(Phaser.Math.Between(0, 359))
            .setDepth(1);
        this.collectibles.push({ shape, width: 34, height: 34 });
    }

    update(_time, delta) {
        const seconds = Math.min(delta, 50) / 1000;
        this.elapsed += delta;
        this.damageTimer = Math.max(0, this.damageTimer - delta);

        this.movePlayer(seconds);

        const fallSpeed = getFallSpeed(this.score);
        this.scrollShaft(fallSpeed * seconds);
        this.moveObjects(fallSpeed * seconds);
        this.updateSpawns(fallSpeed * seconds);

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
        const movement = steer(this.steeringVelocity, targetVelocity, this.weight, seconds);
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
                    this.damageTimer = MOVEMENT.damageInvulnerabilityMs;
                    this.updateHud();
                    if (this.health <= 0) {
                        this.scene.start('end', { score: this.score, weight: this.weight });
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
                this.score += 1;
                this.weight = getWeight(this.score);
                this.player.setButtonCount(this.score);
                this.updateHud();
            } else if (collectible.shape.y < -collectible.height) {
                collectible.shape.destroy();
                this.collectibles.splice(index, 1);
            }
        }
    }

    overlapsPlayer(object) {
        return Math.abs(object.shape.x - this.player.x) < object.width / 2 + this.player.collisionHalfWidth
            && Math.abs(object.shape.y - this.player.y) < object.height / 2 + this.player.collisionHalfHeight;
    }
}
