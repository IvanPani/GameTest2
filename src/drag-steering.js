const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Pointer positions are Phaser game coordinates, independent of phone CSS size.
// Touching anywhere establishes an anchor; only finger travel changes the target.
export class RelativeDrag {
    constructor(minX = 42, maxX = 358) {
        this.minX = minX;
        this.maxX = maxX;
        this.cancel();
    }
    begin(id, pointerX, playerX) {
        if (this.id !== null) return null;
        this.id = id;
        this.lastX = pointerX;
        this.targetX = clamp(playerX, this.minX, this.maxX);
        return this.targetX;
    }
    move(id, pointerX) {
        if (this.id === null || id !== this.id) return null;
        this.targetX = clamp(this.targetX + pointerX - this.lastX, this.minX, this.maxX);
        this.lastX = pointerX;
        return this.targetX;
    }
    end(id) {
        if (this.id === null || id !== this.id) return false;
        this.cancel();
        return true;
    }
    cancel() { this.id = null; }
}

// Ease into small corrections rather than applying full speed for a 1px drag.
export function getDragVelocity(difference, maxSpeed) {
    return clamp(difference / 0.12, -maxSpeed, maxSpeed);
}
