// Ignore faint antialiasing/glow pixels; 0 = transparent, 255 = fully opaque.
export const COLLISION_ALPHA_THRESHOLD = 64;
// Half a game pixel gives subpixel contact accuracy without testing full-size art.
export const COLLISION_SAMPLE_STEP = 0.5;

const masks = new WeakMap();

export function getFrameMask(frame) {
    if (masks.has(frame)) return masks.get(frame);
    const canvas = document.createElement('canvas');
    canvas.width = frame.cutWidth;
    canvas.height = frame.cutHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(frame.source.image, frame.cutX, frame.cutY,
        frame.cutWidth, frame.cutHeight, 0, 0, canvas.width, canvas.height);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const pixels = new Uint8Array(canvas.width * canvas.height);
    for (let index = 0; index < pixels.length; index += 1) {
        pixels[index] = rgba[index * 4 + 3] >= COLLISION_ALPHA_THRESHOLD ? 1 : 0;
    }
    const mask = { width: canvas.width, height: canvas.height, pixels };
    masks.set(frame, mask);
    return mask;
}

function sampleSprite(sprite) {
    const mask = getFrameMask(sprite.frame);
    const matrix = sprite.getWorldTransformMatrix();
    const point = {};
    return (worldX, worldY) => {
        // Includes the player's parent Container, scale, rotation and position.
        matrix.applyInverse(worldX, worldY, point);
        let x = point.x + sprite.displayOriginX;
        let y = point.y + sprite.displayOriginY;
        if (sprite.flipX) x = mask.width - x;
        if (sprite.flipY) y = mask.height - y;
        x = Math.floor(x);
        y = Math.floor(y);
        return x >= 0 && y >= 0 && x < mask.width && y < mask.height
            && mask.pixels[y * mask.width + x] === 1;
    };
}

export function silhouettesOverlap(first, second) {
    const a = first.getBounds();
    const b = second.getBounds();
    const left = Math.max(a.x, b.x);
    const top = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    if (left >= right || top >= bottom) return false;

    const containsFirst = sampleSprite(first);
    const containsSecond = sampleSprite(second);
    // Sample cell centres, including a partial final cell at narrow contacts.
    for (let y = top; y < bottom; y += COLLISION_SAMPLE_STEP) {
        const sampleY = Math.min(y + COLLISION_SAMPLE_STEP / 2, (y + bottom) / 2);
        for (let x = left; x < right; x += COLLISION_SAMPLE_STEP) {
            const sampleX = Math.min(x + COLLISION_SAMPLE_STEP / 2, (x + right) / 2);
            if (containsFirst(sampleX, sampleY) && containsSecond(sampleX, sampleY)) return true;
        }
    }
    return false;
}
