export const SOCK_COLORS = Object.freeze([
    { name: 'Red', hex: '#e34b4b' },
    { name: 'Yellow', hex: '#f3cf4b' },
    { name: 'Navy blue', hex: '#182c60' },
    { name: 'Sky blue', hex: '#73bdeb' },
    { name: 'Hard green', hex: '#208741' },
    { name: 'Soft green', hex: '#9bd49b' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Black', hex: '#17191f' },
    { name: 'Grey', hex: '#90959e' },
    { name: 'Pink', hex: '#ed81b1' }
]);
export const SOCK_PATTERNS = Object.freeze([
    { id: 'plain', name: 'NONE' },
    { id: 'stars', name: 'STARS' },
    { id: 'dots', name: 'DOTS' },
    { id: 'crescents', name: 'MOONS' },
    { id: 'skulls', name: 'SKULLS' },
    { id: 'stripes', name: 'STRIPES' },
    { id: 'spirals', name: 'SPIRALS' },
    { id: 'squares', name: 'SQUARES' }
]);

const star = Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5;
    const radius = i % 2 ? 7 : 17;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
});
const mod = (n, size) => (n % size + size) % size;
function inStar(x, y) {
    let inside = false;
    for (let i = 0, j = star.length - 1; i < star.length; j = i++) {
        const [ax, ay] = star[i], [bx, by] = star[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
}

export function patternOpacity(id, localX, localY) {
    if (id === 'plain') return 0;
    if (id === 'stripes') return mod(localY, 48) < 10 ? 1 : 0;
    const x = mod(localX, 64) - 32;
    const y = mod(localY, 64) - 32;
    if (id === 'dots') return Math.max(0, Math.min(1, 8.5 - Math.hypot(x, y)));
    if (id === 'squares') return Math.abs(x) < 12 && Math.abs(y) < 12 ? 1 : 0;
    if (id === 'stars') return inStar(x, y) ? 1 : 0;
    if (id === 'crescents') return x * x + y * y < 17 * 17 && (x - 8) ** 2 + (y + 5) ** 2 > 15 * 15 ? 1 : 0;
    if (id === 'skulls') {
        const head = x * x / 225 + (y + 4) ** 2 / 196 < 1;
        const jaw = Math.abs(x) < 9 && y >= 3 && y < 17;
        const eyes = (x - 6) ** 2 + (y + 4) ** 2 < 12 || (x + 6) ** 2 + (y + 4) ** 2 < 12;
        const nose = Math.abs(x) < 2 && y > 0 && y < 5;
        const teeth = y > 10 && y < 17 && (Math.abs(x - 4) < 1 || Math.abs(x + 4) < 1);
        return (head || jaw) && !eyes && !nose && !teeth ? 1 : 0;
    }
    if (id === 'spirals') {
        const radius = Math.hypot(x, y);
        if (radius > 21) return 0;
        const angle = mod(Math.atan2(y, x), Math.PI * 2);
        let distance = Infinity;
        for (let turn = 0; turn < 3; turn++) distance = Math.min(distance, Math.abs(radius - (1.2 + 1.05 * (angle + turn * Math.PI * 2))));
        return Math.max(0, Math.min(1, 2.2 - distance));
    }
    return 0;
}
