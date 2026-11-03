/**
 * Falling Socks - cosmetic renderer, prototype v1.
 * Builds ONE recolored 30-frame Phaser CanvasTexture from the original sheet.
 * No additional spritesheets are required for colors or basic patterns.
 *
 * Trade-off: original art is flattened, so red accents are detected by color.
 * For production, artist-authored body/heel/toe masks should replace detection.
 */
export const CUSTOM_SOCK_TEXTURE = 'custom-sock-stages';
const SOURCE_SOCK_TEXTURE = 'white-sock-stages';
const FRAME_SIZE = 512;
const COLUMNS = 6;
const ROWS = 5;
const ANIMATION_FPS = 8;

let sourceCache = null;

function parseColor(hex, fallback = '#ffffff') {
    const valid = typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
    return [1, 3, 5].map(i => parseInt(valid.slice(i, i + 2), 16));
}

function clampByte(value) {
    return Math.min(255, Math.max(0, Math.round(value)));
}

// Finds the clearly red patches without altering the dark line art.
// Current art was painted with red toe and heel; this is an approximation.
export function isSockAccent(red, green, blue) {
    return red > 40 && red > green * 1.55 && red > blue * 1.55 && red - green > 35;
}

function distanceToDot(localX, localY) {
    const dx = ((localX + 6) % 48) - 24;
    const dy = ((localY + 11) % 48) - 24;
    return Math.sqrt(dx * dx + dy * dy);
}

export function patternOpacity(patternId, localX, localY) {
    if (patternId === 'dots') {
        const d = distanceToDot(localX, localY);
        return Math.max(0, Math.min(1, 8.5 - d));
    }
    if (patternId === 'stripes') {
        // Attached to coordinates within each animation frame, not the screen.
        // Diagonal bands are deliberately simple for this initial art test.
        const band = ((localX + localY * 0.45) % 50 + 50) % 50;
        return band < 9 ? 1 : band < 10 ? 10 - band : 0;
    }
    return 0;
}

/** Returns a new RGBA pixel buffer; source pixels are never changed. */
export function recolorSockPixels(source, width, height, style) {
    if (source.length !== width * height * 4) throw new Error('Invalid RGBA dimensions');
    const out = new Uint8ClampedArray(source);
    const body = parseColor(style?.bodyColor, '#ffffff');
    const accent = parseColor(style?.accentColor, '#cc655a');
    const pattern = parseColor(style?.patternColor, '#ffffff');
    const patternId = ['dots', 'stripes'].includes(style?.patternId) ? style.patternId : 'plain';
    const keepBody = body.every(channel => channel === 255);
    const keepAccent = accent[0] === 204 && accent[1] === 101 && accent[2] === 90;

    for (let y = 0; y < height; y++) {
        const localY = y % FRAME_SIZE;
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (source[i + 3] === 0) continue;
            const r = source[i], g = source[i + 1], b = source[i + 2];
            const isAccent = isSockAccent(r, g, b);
            if (isAccent) {
                if (!keepAccent) {
                    // Original accent is a mid-red. Scale the selected color by its
                    // original local brightness to keep red-patch texture/folds.
                    const light = r / 204;
                    out[i] = clampByte(accent[0] * light);
                    out[i + 1] = clampByte(accent[1] * light);
                    out[i + 2] = clampByte(accent[2] * light);
                }
            } else {
                if (!keepBody) {
                    // Multiply, rather than replace, so the knitted shading survives.
                    out[i] = clampByte(r * body[0] / 255);
                    out[i + 1] = clampByte(g * body[1] / 255);
                    out[i + 2] = clampByte(b * body[2] / 255);
                }
                // Avoid patterning black outlines and deeply shaded folds.
                const brightness = (r + g + b) / 3;
                if (patternId !== 'plain' && brightness > 140 && source[i + 3] > 32) {
                    const amount = patternOpacity(patternId, x % FRAME_SIZE, localY) * 0.86;
                    if (amount > 0) {
                        // Retain the source fabric shadows underneath each mark.
                        const shading = Math.min(1.08, brightness / 228);
                        out[i] = clampByte(out[i] * (1 - amount) + pattern[0] * shading * amount);
                        out[i + 1] = clampByte(out[i + 1] * (1 - amount) + pattern[1] * shading * amount);
                        out[i + 2] = clampByte(out[i + 2] * (1 - amount) + pattern[2] * shading * amount);
                    }
                }
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
    }
    return sourceCache;
}

/**
 * Rebuild a cached canvas texture only when style changes.
 * Existing Sprite and Animation objects remain valid across rebuilds.
 */
export function applySockStyle(scene, style) {
    const original = readSource(scene);
    const colorized = recolorSockPixels(original.pixels, original.width, original.height, style);
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
