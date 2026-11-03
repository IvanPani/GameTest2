// Extract the supplied icon from its button backing at runtime. Dark outlines
// protect the pale fabric inside; only border-connected backing is removed.
export function clearIconBacking(rgba, width, height) {
    const out = new Uint8ClampedArray(rgba);
    const corners = [0, width - 1, (height - 1) * width, width * height - 1]
        .map(i => Array.from(rgba.subarray(i * 4, i * 4 + 3)))
        .filter(([r, g, b]) => r > 180 && g > 110 && b > 40);
    const seen = new Uint8Array(width * height), queue = [];
    const visit = i => {
        if (seen[i]) return;
        seen[i] = 1;
        const p = i * 4;
        if (rgba[p + 3] !== 0 && (rgba[p] < 170 || rgba[p + 1] < 110 || !corners.some(c =>
            Math.hypot(rgba[p] - c[0], rgba[p + 1] - c[1], rgba[p + 2] - c[2]) < 85))) return;
        out[p + 3] = 0;
        queue.push(i);
    };
    for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
    for (let q = 0; q < queue.length; q++) {
        const i = queue[q], x = i % width;
        if (x) visit(i - 1);
        if (x < width - 1) visit(i + 1);
        if (i >= width) visit(i - width);
        if (i < width * (height - 1)) visit(i + width);
    }
    return out;
}

export function createCustomizeIcons(scene) {
    for (const [key, sourceKey, x, y, width, height] of [
        ['customize-toe-icon', 'customize-toggle-active', 35, 13, 86, 73],
        ['customize-cuff-icon', 'customize-toggle-inactive', 26, 13, 85, 79]
    ]) {
        if (scene.textures.exists(key)) continue;
        const texture = scene.textures.createCanvas(key, width, height);
        const ctx = texture.context;
        ctx.drawImage(scene.textures.get(sourceKey).getSourceImage(), x, y, width, height, 0, 0, width, height);
        const image = ctx.getImageData(0, 0, width, height);
        image.data.set(clearIconBacking(image.data, width, height));
        ctx.putImageData(image, 0, 0);
        texture.refresh();
    }
}
