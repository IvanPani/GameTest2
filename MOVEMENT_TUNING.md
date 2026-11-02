# Sock movement tuning

All adjustable values are in `src/movement.js`, in the `MOVEMENT` object.

| Variable | Default | Effect |
| --- | --- | --- |
| baseFallSpeed | 190 | Initial falling speed, pixels/second |
| displayedBaseSpeedKmh | 30 | Fantasy starting speed shown in the HUD; display only |
| fallSpeedPerButton | 2.5 | Added falling speed per collected button; no cap |
| weightPerButton | 0.6 | Added weight per collected button; no cap |
| steeringSpeed | 310 | Target lateral speed, pixels/second |
| steeringDelayPerWeight | 0.005 | Seconds of steering response time per weight unit; no cap |
| damageInvulnerabilityMs | 2000 | Protection after damage, milliseconds |
| blinkIntervalMs | 100 | Time between blink phases, milliseconds |
| blinkAlpha | 0.45 | Opacity during dim blink phases (0–1) |

Weight and falling speed are calculated from the collected button count (`buttonsCollected`, separate from score) to avoid accumulated fractional rounding errors. At 10 buttons: weight 6 kg, falling speed 215 px/s, steering response time 0.03 seconds. At 100: weight 60 kg, falling speed 440 px/s, response time 0.3 seconds. Scaling never stops, including beyond a ten-minute run.

Steering has zero smoothing at zero weight. With weight, velocity eases toward the requested direction: acceleration, stopping and reversing all become slower. The response time is an exponential time constant: about 63% of a velocity change completes in that time, and about 95% in three times that time. This is inertia, rather than queued input or a period when controls are ignored. Integration is independent of frame rate. Pointer movement stops at the selected destination to prevent oscillation; shaft walls cancel outward velocity. Keyboard steering takes priority until the next pointer interaction.

`src/level.js` applies movement, pickups, invulnerability and blinking. The sock stays at a fixed screen height while the shaft, hazards and buttons scroll upward at the falling speed. Damage is ignored while the protection timer is positive. A new run resets weight, speed, steering velocity and protection. `src/end.js` displays weight to one decimal, as does the in-game HUD.

Previous behavior capped fall speed at 430, gave each pickup 1 weight and 22 falling speed, reduced lateral top speed with weight, and protected against damage for 900 ms. Those speed caps and lateral-speed penalties have been replaced by the settings above.

## HUD and units

`src/level.js` → `createHud()` defines the HUD layout: Fabric and three red hearts on the left, weight and speed in the centre, Score on the right. `updateHud()` refreshes the values and dims lost hearts. `MAX_HEALTH` in that file controls the initial health and heart count.

Weight is displayed in kg. Gameplay speed stays in pixels/second. `MOVEMENT.baseFallSpeed = 190` restores the original falling pace. `MOVEMENT.displayedBaseSpeedKmh = 30` sets its fantasy HUD equivalent. `getSpeedKmh()` scales the display proportionally: displayed speed = actual speed / baseFallSpeed × displayedBaseSpeedKmh. At 10 buttons: 215 px/s displays as 33.9 km/h. Changing displayedBaseSpeedKmh affects only the label, not movement, steering or spawning. This replaces pixelsPerMetre.

## Spawn spacing

The pile-up was caused by time-based spawning combined with a reduction from 190 to 10 pixels/second. New objects arrived before previous ones had moved away.

`SPAWNING` at the top of `src/level.js` now controls distance-based spacing in pixels: firstObstacleDistance (95), firstButtonDistance (152), obstacleGapMin/Max (162–247), buttonGapMin/Max (190–295), and clearance (24). At 190 px/s this preserves the original approximate cadence. At slower speeds spawns take longer, keeping the same physical spacing. `findSpawnX()` keeps new objects clear of nearby hazards/buttons; if no safe position is available, that spawn is skipped. Restart the current run to clear objects already piled up in memory.

## Background pace

`BACKGROUND_SCROLL_RATIO` in `src/level.js` is 0.02: the washing-machine background moves at 2% of gameplay scrolling speed. It uses `Background_Washing_Machine2.png` once, without mirroring or repetition, and holds at its end.

## Sock fullness and object sprites

`src/player.js` → `SOCK_VISUALS` holds the visual scale (0.14), stage thresholds (`stageButtons`: 0, 10, 25, 50, 100 buttons), and visual scale. Each of the five rows in `Sprite_Sheet_White_Sock_Stages.png` supplies six animation frames; `src/boot.js` registers the five animations at 8 FPS. The final appearance stays at stage five while speed and weight keep scaling without a cap. Every new run starts empty.

`src/level.js` → `spawnCollectible()` uses `button.png` (38 px display size, 34 px pickup bounds). `spawnObstacle()` selects one of three soap clusters, sizes it to 54–80 px, and randomly rotates it 0–359 degrees. These are fixed random orientations, not continuous spinning. Rotated bounding boxes drive spawn spacing; visible silhouettes drive actual collisions. `src/boot.js` defines the three named soap frames from `soap.png`.

## Silhouette collisions

`src/silhouette-collision.js` replaces rectangular hitboxes for soap, sock and buttons. Cached alpha masks come from each texture frame; checks include rotation, scale, parent-container position and sprite flips. Sock masks follow the current animation frame and fullness stage. Disconnected soap pieces and their transparent gaps remain separate. Invulnerability blinking does not affect masks.

`COLLISION_ALPHA_THRESHOLD` (64 out of 255) ignores faint transparent edge pixels. Increase it to make edge contacts more forgiving. `COLLISION_SAMPLE_STEP` (0.5 game pixels) controls contact sampling accuracy; smaller values cost more CPU. Accuracy is subpixel sampled rather than mathematically exact polygon contact. Rectangle overlap is only a broad-phase rejection. `src/boot.js` warms the masks before gameplay; no texture readback is performed during collision checks. Old manually configured sock collision widths were removed.

## Opening tutorial phase

`INTRO` near the top of `src/level.js` controls the opening of every run. Start with 3000 ms empty falling; spawn one button aligned with the sock. After it is collected or passes the sock, wait 1000 ms and spawn a second button 70 px to the right (clamped inside the shaft). After that encounter, wait 1500 ms and spawn one soap aligned with the sock so the player must dodge. After the soap is hit or passes, wait `normalFlowDelayMs` (3000 ms), then enable regular distance-based spawning.

Each step has `type`, `delayMs`, and `offsetX`. Encounters continue to move and collide normally. Missing a button never blocks progress. Delays use the same capped gameplay timestep as movement, preventing a frame stall from skipping the sequence. Normal spawn distances are held during the intro. Restarting resets the sequence.

## Combo scoring

`src/combo.js` holds `COMBO.multiplierThresholds` ([5, 15, 30, 50]), `COMBO.pointsPerButton` (10), and `COMBO.missesBeforeReset` (3). Multipliers are capped at 5X: combo counts 0–4 give 1X, 5–14 give 2X, 15–29 give 3X, and 30–49 give 4X, and 50+ give 5X. That means 5 pickups to reach 2X, 10 more to reach 3X, then 15 more to reach 4X and 20 more to reach 5X. The threshold button itself receives the new multiplier. Points per pickup are 10, 20, 30, 40 or 50 respectively. The combo count and recorded MAX COMBO may continue past 30, even though the multiplier stays 5X.

`src/level.js` tracks `combo`, weighted `score`, and `buttonsCollected` separately. Weight, falling speed, HUD speed and sock fullness depend only on the number actually collected. Missing three consecutive buttons (counted once each as they fully pass the sock) or taking actual damage resets the streak; protected contacts during invulnerability do not reset it. A missed button resets only once. Only an active multiplier appears below SCORE (no streak count or 1X label). Every run starts at 0 combo and ×1.

`COMBO.missesBeforeReset` in `src/combo.js` is 3. One or two misses preserve the combo and multiplier. Any collected button clears `consecutiveMisses`. The third consecutive miss resets the combo and miss counter; actual damage resets both immediately. Previously missed buttons do not count again on later frames.

## Uppercase UI and multiplier colours

Interface text uses uppercase Fredoka, while the Falling Socks title retains DynaPuff and its original casing. `src/level.js` creates the multiplier label at 24 px and updates it in `updateHud()`: 1X is hidden, 2X is electric yellow (#fff200), 3X is vivid orange (#ff8500), and 4X or higher is hot red (#ff244f). Scoring rules are unchanged.

## Run-over results

`src/level.js` resets `maxCombo` on each new run and records the highest `combo` after each pickup. Resets from damage or three misses do not erase the best achieved streak. At death, it passes weight, final displayed speed (`speedKmh`), max combo count (not multiplier), and score to `src/end.js`. The result card displays WEIGHT, SPEED, TOTAL BUTTONS, MAX COMBO, then a separate larger SCORE row. Layout and font sizes are in `src/end.js`.

TOTAL BUTTONS is the actual number collected (`buttonsCollected`), independent of score bonuses. Each pickup awards `COMBO.pointsPerButton` (10) times the active multiplier.

Multiplier emphasis is configured in `MULTIPLIER_STYLE` near the top of `src/level.js`: font size, colours, 3 px dark outline, pop scale (1.18), pop duration (120 ms each way), pulse scale (1.045) and pulse duration (650 ms each way). `updateMultiplier()` pops once on each tier increase, then pulses continuously at every active multiplier, with increasing intensity from 2X to 4X. Ordinary score updates do not restart animations. Combo resets cancel animation, restore scale and hide the label. The HUD panel is 108 px tall to accommodate the larger label below SCORE.

`MULTIPLIER_STYLE.pulseByMultiplier` defines progressive pulses: 2X = 1.025 scale / 900 ms, 3X = 1.045 / 700 ms, 4X = 1.075 / 500 ms each half-cycle. All active tiers pulse; 4X is strongest and fastest. MAX COMBO remains the highest button count reached within a combo, without a cap; only the score multiplier caps at 5X.

## 5X and keyboard testing

5X unlocks at 50 buttons, uses magenta (#ff2bff), a 1.25 pop scale, and a 1.10 pulse scale with a 400 ms half-cycle. These values are in `MULTIPLIER_STYLE` in `src/level.js`.

Press the UP arrow once per tier to advance the active multiplier: 2X → 3X → 4X → 5X (capped). `COMBO.keyboardTestingEnabled` in `src/combo.js` enables this shortcut; set it to false to disable testing. Holding UP does not repeatedly advance tiers. The test multiplier affects points earned on subsequent pickups but never grants buttons or changes weight, speed, fullness or MAX COMBO. Real combo tracking continues independently. Actual damage, three consecutive misses, or a new run clears the testing override.
