import test from 'node:test';
import assert from 'node:assert/strict';
import { RelativeDrag, getDragVelocity } from '../src/drag-steering.js';

test('touching away from the sock does not jump; dragging moves relative to that touch', () => {
    const drag = new RelativeDrag();
    assert.equal(drag.begin(1,340,200),200);
    assert.equal(drag.move(1,340),200);
    assert.equal(drag.move(1,360),220);
    assert.equal(drag.move(1,310),170);
});

test('release cancels the target and a new touch anchors at the current sock position', () => {
    const drag = new RelativeDrag();
    drag.begin(1,20,200);drag.move(1,100);
    assert.equal(drag.end(1),true);
    assert.equal(drag.move(1,200),null);
    assert.equal(drag.begin(2,350,215),215);
});

test('extra fingers cannot steal steering; edge clamping reverses immediately', () => {
    const drag = new RelativeDrag();
    drag.begin(1,200,350);
    assert.equal(drag.begin(2,10,100),null);
    assert.equal(drag.move(2,100),null);
    assert.equal(drag.end(2),false);
    assert.equal(drag.move(1,300),358);
    assert.equal(drag.move(1,290),348);
    assert.equal(drag.move(1,-1000),42);
    drag.cancel();
    assert.equal(drag.move(1,200),null);
});

test('small corrections ease in; large swipes respect upgraded movement speed', () => {
    assert.equal(getDragVelocity(0,310),0);
    assert.ok(getDragVelocity(1,310)<10);
    assert.equal(getDragVelocity(1000,310),310);
    assert.equal(getDragVelocity(-1000,465),-465);
});
