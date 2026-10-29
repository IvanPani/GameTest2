# Sock movement tuning

All adjustable values are in `src/movement.js`, in the `MOVEMENT` object.

| Variable | Default | Effect |
| --- | --- | --- |
| baseFallSpeed | 190 | Initial falling speed, pixels/second |
| displayedBaseSpeedKmh | 10 | Fantasy starting speed shown in the HUD; display only |
| fallSpeedPerButton | 1.2 | Added falling speed per collected button; no cap |
| weightPerButton | 0.4 | Added weight per collected button; no cap |
| steeringSpeed | 310 | Target lateral speed, pixels/second |
| steeringDelayPerWeight | 0.1 | Seconds of steering response time per weight unit; no cap |
| damageInvulnerabilityMs | 2000 | Protection after damage, milliseconds |
| blinkIntervalMs | 100 | Time between blink phases, milliseconds |
| blinkAlpha | 0.45 | Opacity during dim blink phases (0–1) |

Weight and falling speed are calculated from the collected button count (currently `score`) to avoid accumulated fractional rounding errors. At 10 buttons: weight 4 kg, falling speed 202 px/s, steering response time 0.4 seconds. At 100: weight 40 kg, falling speed 310 px/s, response time 4 seconds. Scaling never stops, including beyond a ten-minute run.

Steering has zero smoothing at zero weight. With weight, velocity eases toward the requested direction: acceleration, stopping and reversing all become slower. The response time is an exponential time constant: about 63% of a velocity change completes in that time, and about 95% in three times that time. This is inertia, rather than queued input or a period when controls are ignored. Integration is independent of frame rate. Pointer movement stops at the selected destination to prevent oscillation; shaft walls cancel outward velocity. Keyboard steering takes priority until the next pointer interaction.

`src/level.js` applies movement, pickups, invulnerability and blinking. The sock stays at a fixed screen height while the shaft, hazards and buttons scroll upward at the falling speed. Damage is ignored while the protection timer is positive. A new run resets weight, speed, steering velocity and protection. `src/end.js` displays weight to one decimal, as does the in-game HUD.

Previous behavior capped fall speed at 430, gave each pickup 1 weight and 22 falling speed, reduced lateral top speed with weight, and protected against damage for 900 ms. Those speed caps and lateral-speed penalties have been replaced by the settings above.

## HUD and units

`src/level.js` → `createHud()` defines the HUD layout: Fabric and three red hearts on the left, weight and speed in the centre, Score on the right. `updateHud()` refreshes the values and dims lost hearts. `MAX_HEALTH` in that file controls the initial health and heart count.

Weight is displayed in kg. Gameplay speed stays in pixels/second. `MOVEMENT.baseFallSpeed = 190` restores the original falling pace. `MOVEMENT.displayedBaseSpeedKmh = 10` sets its fantasy HUD equivalent. `getSpeedKmh()` scales the display proportionally: displayed speed = actual speed / baseFallSpeed × displayedBaseSpeedKmh. At 10 buttons: 202 px/s displays as 10.6 km/h. Changing displayedBaseSpeedKmh affects only the label, not movement, steering or spawning. This replaces pixelsPerMetre.

## Spawn spacing

The pile-up was caused by time-based spawning combined with a reduction from 190 to 10 pixels/second. New objects arrived before previous ones had moved away.

`SPAWNING` at the top of `src/level.js` now controls distance-based spacing in pixels: firstObstacleDistance (95), firstButtonDistance (152), obstacleGapMin/Max (162–247), buttonGapMin/Max (190–295), and clearance (24). At 190 px/s this preserves the original approximate cadence. At slower speeds spawns take longer, keeping the same physical spacing. `findSpawnX()` keeps new objects clear of nearby hazards/buttons; if no safe position is available, that spawn is skipped. Restart the current run to clear objects already piled up in memory.
