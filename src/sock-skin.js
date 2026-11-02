/** Shared cosmetic renderer for all 30 frames; source pixels and alpha stay intact.
 * Toe/heel regions come from the source red paint. The cuff band follows each
 * frame's opaque bounds; these are procedural masks over the flattened artwork.
 */
import { SOCK_PATTERNS, patternOpacity } from './sock-customization.js';
export { patternOpacity } from './sock-customization.js';
export const CUSTOM_SOCK_TEXTURE = 'custom-sock-stages';
const SOURCE_SOCK_TEXTURE = 'white-sock-stages';
const FRAME_SIZE = 512;
const COLUMNS = 6;
const ROWS = 5;
const ANIMATION_FPS = 8;
let sourceCache = null;
const tiles = new Map();
const clamp = value => Math.min(1, Math.max(0, value));
const byte = value => Math.min(255, Math.max(0, Math.round(value)));

function parseColor(hex, fallback) {
    const value = typeof hex === 'string' && /^#[\da-f]{6}$/i.test(hex) ? hex : fallback;
    return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
}

function toeOpacity(r, g, b) {
    // Soft transitions retain antialiased fabric edges and shaded red patches.
    return clamp((r - Math.max(g, b) - 12) / 28) * clamp((r / Math.max(1, g, b) - 1.2) / 0.4);
}
export function isSockAccent(r, g, b) { return toeOpacity(r, g, b) > 0.5; }

export function getSockFrameBounds(pixels, width, height) {
    if (width % FRAME_SIZE || height % FRAME_SIZE) return [];
    const bounds = [];
    for (let row = 0; row < height / FRAME_SIZE; row++) {
        for (let column = 0; column < width / FRAME_SIZE; column++) {
            let left = FRAME_SIZE, top = FRAME_SIZE, right = 0, bottom = 0;
            for (let y = 0; y < FRAME_SIZE; y++) {
                for (let x = 0; x < FRAME_SIZE; x++) {
                    if (pixels[((row * FRAME_SIZE + y) * width + column * FRAME_SIZE + x) * 4 + 3] < 64) continue;
                    left = Math.min(left, x); right = Math.max(right, x);
                    top = Math.min(top, y); bottom = Math.max(bottom, y);
                }
            }
            bounds.push({ left, top, width: right - left + 1, height: bottom - top + 1 });
        }
    }
    return bounds;
}

export function cuffBandOpacity(x, y, bounds) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return 0;
    const u = (x - bounds.left) / bounds.width;
    const v = (y - bounds.top) / bounds.height;
    if (u < 0.4 || v < 0.65) return 0;
    // A sloping band on the lower-right cuff in the original toe-up frames.
    const band = v - 0.18 * (u - 0.65);
    return clamp((band - 0.74) / 0.008) * clamp((0.81 - band) / 0.008);
}

function patternTile(id) {
    if (!tiles.has(id)) {
        // 192 is a common period for 64-pixel motifs and 48-pixel stripes.
        const tile = new Float32Array(192 * 192);
        for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
            let coverage = 0;
            for (const dx of [0.25, 0.75]) for (const dy of [0.25, 0.75]) coverage += patternOpacity(id, x + dx, y + dy);
            tile[y * 192 + x] = coverage / 4;
        }
        tiles.set(id, tile);
    }
    return tiles.get(id);
}

export function recolorSockPixels(source, width, height, style, frameBounds = getSockFrameBounds(source, width, height)) {
    if (source.length !== width * height * 4) throw new Error('Invalid RGBA dimensions');
    const out = new Uint8ClampedArray(source);
    const body = parseColor(style?.bodyColor, '#ffffff');
    const accent = parseColor(style?.accentColor, '#cc655a');
    const pattern = parseColor(style?.patternColor, '#ffffff');
    const patternId = SOCK_PATTERNS.some(item => item.id === style?.patternId) ? style.patternId : 'plain';
    const tile = patternId === 'plain' ? null : patternTile(patternId);
    const columns = width / FRAME_SIZE;
    for (let y = 0; y < height; y++) {
        const localY = y % FRAME_SIZE;
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (!source[i + 3]) continue;
            const localX = x % FRAME_SIZE;
            const r = source[i], g = source[i + 1], b = source[i + 2];
            const toe = toeOpacity(r, g, b);
            const light = r / 204;
            // Remove baked-in red before applying body color, so OFF is neutral fabric.
            const nr = r * (1 - toe) + 242 * light * toe;
            const ng = g * (1 - toe) + 230 * light * toe;
            const nb = b * (1 - toe) + 216 * light * toe;
            const brightness = (nr + ng + nb) / 3;
            const cuff = cuffBandOpacity(localX, localY, frameBounds[Math.floor(y / FRAME_SIZE) * columns + Math.floor(x / FRAME_SIZE)]);
            const accentAmount = Math.max(style?.toesEnabled === false ? 0 : toe,
                style?.cuffEnabled === false ? 0 : cuff);
            const shading = Math.min(1.08, brightness / 228);
            const mark = tile && brightness > 140 && source[i + 3] > 32
                ? tile[(localY % 192) * 192 + localX % 192] * 0.86 * (1 - accentAmount) : 0;
            for (let channel = 0; channel < 3; channel++) {
                const fabric = (channel === 0 ? nr : channel === 1 ? ng : nb) * body[channel] / 255;
                const colored = fabric * (1 - accentAmount) + accent[channel] * shading * accentAmount;
                out[i + channel] = byte(colored * (1 - mark) + pattern[channel] * shading * mark);
            }
        }
    }
    return out;
}

function readSource(scene) {
    const image = scene.textures.get(SOURCE_SOCK_TEXTURE).getSourceImage();
    if (!image || image.width !== FRAME_SIZE * COLUMNS || image.height !== FRAME_SIZE * ROWS) {
        throw new Error('Expected existing 3072x2560 sock spritesheet with 30 frames');
    }
    if (!sourceCache || sourceCache.image !== image) {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        sourceCache = {
            image,
            width: image.width,
            height: image.height,
            pixels: context.getImageData(0, 0, image.width, image.height).data
        };
        sourceCache.bounds = getSockFrameBounds(sourceCache.pixels, image.width, image.height);
    }
    return sourceCache;
}

/**
 * Rebuild a cached canvas texture only when style changes.
 * Existing Sprite and Animation objects remain valid across rebuilds.
 */
export function applySockStyle(scene, style) {
    const original = readSource(scene);
    const colorized = recolorSockPixels(original.pixels, original.width, original.height, style, original.bounds);
    let texture;
    let canvas;
    if (scene.textures.exists(CUSTOM_SOCK_TEXTURE)) {
        texture = scene.textures.get(CUSTOM_SOCK_TEXTURE);
        canvas = texture.getSourceImage();
    } else {
        canvas = document.createElement('canvas');
        canvas.width = original.width;
        canvas.height = original.height;
        texture = scene.textures.addCanvas(CUSTOM_SOCK_TEXTURE, canvas);
        // A CanvasTexture only starts with a __BASE frame. Define all 30 frames.
        for (let index = 0; index < COLUMNS * ROWS; index++) {
            const column = index % COLUMNS;
            const row = Math.floor(index / COLUMNS);
            texture.add(index, 0, column * FRAME_SIZE, row * FRAME_SIZE, FRAME_SIZE, FRAME_SIZE);
        }
    }
    const context = canvas.getContext('2d');
    const imageData = context.createImageData(original.width, original.height);
    imageData.data.set(colorized);
    context.putImageData(imageData, 0, 0);
    texture.refresh();
    for (let stage = 0; stage < ROWS; stage++) {
        const key = `custom-sock-stage-${stage}`;
        if (scene.anims.exists(key)) continue;
        scene.anims.create({
            key,
            frames: scene.anims.generateFrameNumbers(CUSTOM_SOCK_TEXTURE, {
                start: stage * COLUMNS,
                end: stage * COLUMNS + COLUMNS - 1
            }),
            frameRate: ANIMATION_FPS,
            repeat: -1
        });
    }
    return texture;
}
