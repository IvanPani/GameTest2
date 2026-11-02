# Player progress and menu

Boot loads `playerData` once and opens `menu`. Play starts `level`; death settles the score before opening `end`; tapping the results returns to `menu`.

- `Level.score` is the current run's points, including combo multipliers. The existing SCORE HUD displays it.
- `Level.buttonsCollected` is the current run's physical load. Only this count drives weight, speed and fullness. Every Level creation resets both counters and weight to zero.
- `playerData.getProfile().currency` is the saved balance. Each completed run adds its entire score, including on death. Reloading mid-run abandons unbanked score.
- `src/player-data.js` owns the only localStorage access, under `falling-socks.player.v1`. Currency, upgrades, owned cosmetics, selected style and the active run identifier share a versioned save. Completion clears the active identifier in the same write as awarding currency; duplicate callbacks or stale results cannot settle again.
- `purchaseUpgrade(id)`, `purchaseUnlock(category, id, price)` and `selectStyle(style)` support future shop/customization callers. Upgrade prices and caps are defined in `src/upgrades.js`. The sewing-table shop applies purchased levels to the next run; cosmetic rendering remains independent.
- `getProfile()` returns a copy. Permanent changes must use service methods. Their boolean indicates acceptance; inspect `saveError` for persistence failures.
- Malformed fields receive validated defaults. Unreadable/corrupt/unsupported saves remain untouched and the game displays a temporary-progress message. Write failures retain progress in memory and display a warning. Version 1 is the first format; later formats need explicit migrations. Newer formats are never overwritten.
- Storage belongs to this browser profile and origin. Development and deployed URLs have independent balances. Clearing site data removes progress. No cross-device sync or simultaneous multi-tab conflict resolution is included.

## Validation

Run `npm test` for profile reload, settlement idempotency, purchases/selections, invalid transactions, malformed saves and storage-failure checks. Install with `npm ci --ignore-scripts` (Electron packaging is not needed for browser work). Build using `npx vite build --outDir dist`; preview with `npx vite --host 127.0.0.1`.

Manual acceptance: open menu → Play → collect a button → observe score and weight → lose all hearts → results → menu → confirm currency equals old balance plus final score → reload → confirm balance → Play → confirm score and weight both start at zero. Repeat the loop to check input cleanup. Verify the same result after closing and reopening the site in the same browser profile.

For deterministic scene integration checks, open `/tests/browser.html` on the Vite server and click **Run scene checks**. It exercises real Level pickup/death code with forced overlap, End/Menu transitions, empty retry state and listener cleanup. Reload the harness to verify saved currency. Use a separate browser origin/profile for the harness because it awards real test currency in that origin. The test harness is excluded from the production entry.

## Upgrade shop

Fabric and Steering each have five levels, all priced at 1,000 currency. Fabric grants one extra heart per level (3–8 total); the HUD uses up to two rows. Steering scales weight-related response delay by `1 / (1 + 0.25 * level)` (20% less delay at level 1, about 56% at level 5). Zero-weight steering and maximum movement speed are unchanged. Each run snapshots these bonuses on creation.

The shop shows current/next effects and owned levels, disables unaffordable/maxed purchases, and refreshes the currency display after a purchase. Upgrade purchases use the fixed catalog rather than caller-supplied prices. If saving fails, currency and ownership are rolled back and the shop displays the failure.

`npm test` includes cosmetic, player-data and upgrade tests. The older cosmetic fixtures now buy a pattern that is not unlocked by default, matching the installed customization system. For browser verification, `/tests/upgrade-shop.html` uses a separate session-storage fixture with 2,000 test currency; it never changes the real localStorage save. Buy one level of each, reload, return to Main and Play: the status should report 4 hearts, 4 HUD hearts, a 0.8 steering delay multiplier and initial weight 0.

## Replay pacing

Main and End display progress toward the cheapest remaining upgrade; after both trees are complete they show completion instead. `npm run balance:report` prints repeatable reward and handling comparisons from the live tuning definitions. See `BALANCE_BASELINE.md` for generated values and `BALANCE_PLAYTEST.md` for the provisional pacing decision, player feedback, limitations and human playtest protocol.

## Records corkboard

The room to the right of Main contains the player's paper record sheet. Right enters from Main; Left or Escape returns. The Upgrades room remains to the left and Customize above.

Version-1 profiles now have an additive `records` object: best score, max speed (km/h), max weight (kg), biggest streak (consecutive buttons), most buttons in one run, total buttons, total currency earned and total completed runs. Legacy saves default these counters to zero, preserving their wallet, upgrades and appearance. No past statistics are inferred from current currency because prior spending and run history cannot be recovered. The sheet states that tracking starts with this update.

`completeRun(runId, score, result)` receives the same result object displayed by End. Currency, completed-run records and the settlement marker share one save transaction. Duplicate or stale completions cannot increment records twice. Starting/reloading/abandoning a run does not increment completed runs. Since speed and weight only increase during a run, their final values are their run maxima. Spending currency never reduces total currency earned. Records from interrupted runs are not saved.

The paper’s biggest streak uses a separate consecutive-pickup counter: any missed button or damaging hit resets it. Scoring combo behavior (three consecutive misses to reset) stays unchanged. `bestPickupStreak` is included in the end-run result for records.
