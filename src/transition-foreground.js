// A short shadowed pipe mouth covers each artwork join. The shadow sits behind
// gameplay sprites; only the side-wall rims sit in front, outside the play lane.
export function createTransitionForeground(scene, index, worldY) {
    const palettes = [
        { shadow: '9,24,33', metal: '#365566', edge: '#91a9ad', rust: '#875238' },
        { shadow: '13,27,23', metal: '#3b5044', edge: '#9aa572', rust: '#875634' },
        { shadow: '27,17,40', metal: '#4c3c55', edge: '#ad8c91', rust: '#805341' }
    ];
    const palette = palettes[index];
    const veilKey = `transition-shadow-${index}`, rimKey = `transition-rim-${index}`;
    if (!scene.textures.exists(veilKey)) {
        const texture = scene.textures.createCanvas(veilKey, 400, 240);
        const ctx = texture.context;
        const shadow = ctx.createLinearGradient(0, 0, 0, 240);
        for (const [position, alpha] of [[0,0],[0.2,0.25],[0.36,0.85],[0.43,1],[0.57,1],[0.64,0.85],[0.8,0.25],[1,0]]) {
            shadow.addColorStop(position, `rgba(${palette.shadow},${alpha})`);
        }
        ctx.fillStyle = shadow;
        ctx.fillRect(0, 0, 400, 240);
        // Low-contrast curved wisps break up the straight edge of the shadow.
        for (let i = 0; i < 7; i++) {
            ctx.strokeStyle = `rgba(139,169,163,${0.018 + i % 3 * 0.006})`;
            ctx.lineWidth = 3 + i % 3;
            ctx.beginPath();
            ctx.moveTo(-20, 67 + i * 17);
            ctx.bezierCurveTo(90, 45 + i * 19, 260, 94 + i * 13, 420, 60 + i * 19);
            ctx.stroke();
        }
        texture.refresh();
        const rim = scene.textures.createCanvas(rimKey, 400, 240);
        const rc = rim.context;
        // Keep the open centre completely clear of foreground geometry.
        rc.beginPath(); rc.rect(0,0,40,240); rc.rect(360,0,40,240); rc.clip();
        for (const [radius, width, color] of [[224,31,'#09121c'],[220,23,palette.metal],[215,3,palette.edge],[230,3,palette.rust]]) {
            rc.strokeStyle = color; rc.lineWidth = width;
            rc.beginPath(); rc.ellipse(200,120,radius,70,0,0,Math.PI*2); rc.stroke();
        }
        for (const x of [16,384]) for (const y of [86,120,154]) {
            rc.fillStyle='#15212b';rc.beginPath();rc.arc(x+1,y+2,5,0,Math.PI*2);rc.fill();
            rc.fillStyle=palette.edge;rc.beginPath();rc.arc(x,y,3.5,0,Math.PI*2);rc.fill();
            rc.strokeStyle=palette.metal;rc.lineWidth=1;rc.beginPath();rc.moveTo(x-2,y);rc.lineTo(x+2,y);rc.stroke();
        }
        rim.refresh();
    }
    return {
        worldY,
        veil: scene.add.image(200, worldY, veilKey).setDepth(-1),
        rim: scene.add.image(200, worldY, rimKey).setDepth(3)
    };
}
