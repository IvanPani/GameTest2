import Phaser from 'phaser';
import Player from './player.js';

const WIDTH = 400;
const HEIGHT = 700;
const PLAYER_Y = 520;
const BASE_FALL_SPEED = 190;
const FALL_SPEED_PER_WEIGHT = 22;
const MAX_FALL_SPEED = 430;
const BASE_STEERING_SPEED = 310;
const MIN_STEERING_SPEED = 125;
const STEERING_LOSS_PER_WEIGHT = 0.12;
const DAMAGE_COOLDOWN = 900;

export default class Level extends Phaser.Scene {
    constructor() {
        super({ key: 'level' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#182b3d');
        this.createShaft();

        this.player = new Player(this, WIDTH / 2, PLAYER_Y);
        this.player.setDepth(2);
        this.cursors = this.input.keyboard?.createCursorKeys();
        this.targetX = this.player.x;
        this.obstacles = [];
        this.collectibles = [];
        this.elapsed = 0;
        this.obstacleTimer = 500;
        this.collectibleTimer = 800;
        this.damageTimer = 0;
        this.score = 0;
        this.weight = 0;
        this.health = 3;

        this.createHud();

        this.input.on('pointerdown', (pointer) => {
            this.targetX = pointer.x;
        });
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.targetX = pointer.x;
            }
        });
    }

    createShaft() {
        this.add.rectangle(12, HEIGHT / 2, 24, HEIGHT, 0x263c50);
        this.add.rectangle(WIDTH - 12, HEIGHT / 2, 24, HEIGHT, 0x263c50);
        this.add.rectangle(27, HEIGHT / 2, 3, HEIGHT, 0x49677c);
        this.add.rectangle(WIDTH - 27, HEIGHT / 2, 3, HEIGHT, 0x49677c);

        this.shaftDetails = [];
        for (let y = 100; y < HEIGHT + 100; y += 100) {
            const detail = this.add.rectangle(WIDTH / 2, y, WIDTH - 64, 2, 0x31485b, 0.8);
            this.shaftDetails.push({ shape: detail, y });
        }

        this.add.text(WIDTH / 2, 112, 'WASHER SHAFT', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            color: '#8da5b5',
            letterSpacing: 3
        }).setOrigin(0.5);
    }

    createHud() {
        this.add.rectangle(WIDTH / 2, 48, WIDTH, 96, 0x102131, 0.96).setDepth(10);
        this.scoreText = this.add.text(18, 17, '', this.hudStyle(18, '#f3f6ed')).setDepth(11);
        this.weightText = this.add.text(18, 47, '', this.hudStyle(15, '#8fe0d4')).setDepth(11);
        this.healthText = this.add.text(18, 73, '', this.hudStyle(14, '#ffb4a2')).setDepth(11);
        this.updateHud();
    }

    hudStyle(size, color) {
        return {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${size}px`,
            fontStyle: 'bold',
            color
        };
    }

    updateHud() {
        const fallSpeed = Math.min(
            BASE_FALL_SPEED + this.weight * FALL_SPEED_PER_WEIGHT,
            MAX_FALL_SPEED
        );
        this.scoreText.setText(`SCORE  ${this.score}`);
        this.weightText.setText(`WEIGHT  ${this.weight}   |   FALL  ${fallSpeed}`);
        this.healthText.setText(`FABRIC  ${this.health} / 3`);
    }

    spawnObstacle() {
        const width = Phaser.Math.Between(48, 86);
        const height = Phaser.Math.Between(24, 38);
        const x = Phaser.Math.Between(58 + width / 2, WIDTH - 58 - width / 2);
        const shape = this.add.rectangle(
            x,
            HEIGHT + height,
            width,
            height,
            0xd66b59
        ).setStrokeStyle(3, 0xf6b078).setDepth(1);
        this.obstacles.push({ shape, width, height });
    }

    spawnCollectible() {
        const x = Phaser.Math.Between(54, WIDTH - 54);
        const coin = this.add.circle(0, 0, 15, 0xf2c14e).setStrokeStyle(3, 0xffe7a1);
        const mark = this.add.text(0, 0, '+', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#76521b'
        }).setOrigin(0.5);
        const shape = this.add.container(x, HEIGHT + 24, [coin, mark])
            .setSize(34, 34)
            .setDepth(1);
        this.collectibles.push({ shape, width: 34, height: 34 });
    }

    update(_time, delta) {
        const seconds = Math.min(delta, 50) / 1000;
        this.elapsed += delta;
        this.damageTimer = Math.max(0, this.damageTimer - delta);

        this.movePlayer(seconds);

        const fallSpeed = Math.min(
            BASE_FALL_SPEED + this.weight * FALL_SPEED_PER_WEIGHT,
            MAX_FALL_SPEED
        );
        this.scrollShaft(fallSpeed * seconds);
        this.updateSpawns(delta);
        this.moveObjects(fallSpeed * seconds);

        if (this.damageTimer === 0) {
            this.player.setAlpha(1);
        } else {
            this.player.setAlpha(Math.floor(this.elapsed / 100) % 2 === 0 ? 0.45 : 1);
        }
    }

    movePlayer(seconds) {
        const left = this.cursors?.left.isDown;
        const right = this.cursors?.right.isDown;
        const direction = left === right ? 0 : (left ? -1 : 1);
        const steeringSpeed = Math.max(
            BASE_STEERING_SPEED / (1 + this.weight * STEERING_LOSS_PER_WEIGHT),
            MIN_STEERING_SPEED
        );

        if (direction !== 0) {
            this.player.x += direction * steeringSpeed * seconds;
            this.targetX = this.player.x;
        } else {
            const difference = this.targetX - this.player.x;
            const step = Math.min(Math.abs(difference), steeringSpeed * seconds);
            this.player.x += Math.sign(difference) * step;
        }

        this.player.x = Phaser.Math.Clamp(this.player.x, 42, WIDTH - 42);
        this.targetX = Phaser.Math.Clamp(this.targetX, 42, WIDTH - 42);
    }

    scrollShaft(distance) {
        for (const detail of this.shaftDetails) {
            detail.y -= distance;
            if (detail.y < 145) {
                detail.y += 800;
            }
            detail.shape.y = detail.y;
        }
    }

    updateSpawns(delta) {
        this.obstacleTimer -= delta;
        this.collectibleTimer -= delta;

        if (this.obstacleTimer <= 0) {
            this.spawnObstacle();
            this.obstacleTimer = Phaser.Math.Between(850, 1300);
        }
        if (this.collectibleTimer <= 0) {
            this.spawnCollectible();
            this.collectibleTimer = Phaser.Math.Between(1000, 1550);
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
                    this.damageTimer = DAMAGE_COOLDOWN;
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
                this.weight += 1;
                this.updateHud();
            } else if (collectible.shape.y < -collectible.height) {
                collectible.shape.destroy();
                this.collectibles.splice(index, 1);
            }
        }
    }

    overlapsPlayer(object) {
        return Math.abs(object.shape.x - this.player.x) < object.width / 2 + 18
            && Math.abs(object.shape.y - this.player.y) < object.height / 2 + 24;
    }
}
