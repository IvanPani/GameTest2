// The supplied Resources sheet has a baked checkerboard. Remove only dark,
// neutral pixels connected to the crop border, retaining ink inside the note.
export function cutoutNotePixels(source, width, height) {
    if (source.length !== width * height * 4) throw new Error('Invalid note dimensions');
    const output = new Uint8ClampedArray(source);
    const visited = new Uint8Array(width * height);
    const queue = new Uint32Array(width * height);
    let head = 0, tail = 0;
    const visit = index => {
        if (visited[index]) return;
        visited[index] = 1;
        const i = index * 4;
        const max = Math.max(source[i], source[i + 1], source[i + 2]);
        const min = Math.min(source[i], source[i + 1], source[i + 2]);
        if (source[i + 3] === 0 || (max < 110 && max - min < 22)) queue[tail++] = index;
    };
    for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
    while (head < tail) {
        const index = queue[head++];
        output[index * 4 + 3] = 0;
        const x = index % width, y = Math.floor(index / width);
        if (x > 0) visit(index - 1);
        if (x < width - 1) visit(index + 1);
        if (y > 0) visit(index - width);
        if (y < height - 1) visit(index + width);
    }
    return output;
}

function createResourceCutout(scene, key, x, y, width, height) {
    if (scene.textures.exists(key)) return;
    const sheet = scene.textures.get('records-resources').getSourceImage();
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(sheet, x, y, width, height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height);
    pixels.data.set(cutoutNotePixels(pixels.data, width, height));
    context.putImageData(pixels, 0, 0);
    scene.textures.addCanvas(key, canvas);
}

export function createHudIcons(scene) {
    for (const [key, x, y, width, height] of [
        ['hud-speed-icon', 1002, 500, 130, 92],
        ['hud-weight-icon', 840, 600, 110, 102]
    ]) {
        createResourceCutout(scene, key, x, y, width, height);
    }
}

export function createRecordNotes(scene) {
    for (const [key, x, y, width, height] of [
        ['records-note-sock', 1170, 505, 170, 196],
        ['records-note-star', 1345, 532, 155, 168]
    ]) {
        createResourceCutout(scene, key, x, y, width, height);
    }
}
