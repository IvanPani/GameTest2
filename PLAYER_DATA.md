# Player progress and menu

Boot loads `playerData` once and opens `menu`. Play starts `level`; death settles the score before opening `end`; tapping the results returns to `menu`.

- `Level.score` is the current run's points, including combo multipliers. The existing SCORE HUD displays it.
- `Level.buttonsCollected` is the current run's physical load. Only this count drives weight, speed and fullness. Every Level creation resets both counters and weight to zero.
- `playerData.getProfile().currency` is the saved balance. Each completed run adds its entire score, including on death. Reloading mid-run abandons unbanked score.
- `src/player-data.js` owns the only localStorage access, under `falling-socks.player.v1`. Currency, upgrades, owned cosmetics, selected style and the active run identifier share a versioned save. Completion clears the active identifier in the same write as awarding currency; duplicate callbacks or stale results cannot settle again.
- `purchaseUpgrade(id, { costs })`, `purchaseUnlock(category, id, price)` and `selectStyle(style)` support future shop/customization callers. Costs must come from trusted game definitions. No upgrade effects, shop screens, or layered cosmetic rendering are added here.
- `getProfile()` returns a copy. Permanent changes must use service methods. Their boolean indicates acceptance; inspect `saveError` for persistence failures.
- Malformed fields receive validated defaults. Unreadable/corrupt/unsupported saves remain untouched and the game displays a temporary-progress message. Write failures retain progress in memory and display a warning. Version 1 is the first format; later formats need explicit migrations. Newer formats are never overwritten.
- Storage belongs to this browser profile and origin. Development and deployed URLs have independent balances. Clearing site data removes progress. No cross-device sync or simultaneous multi-tab conflict resolution is included.

## Validation

Run `npm test` for profile reload, settlement idempotency, purchases/selections, invalid transactions, malformed saves and storage-failure checks. Install with `npm ci --ignore-scripts` (Electron packaging is not needed for browser work). Build using `npx vite build --outDir dist`; preview with `npx vite --host 127.0.0.1`.

Manual acceptance: open menu → Play → collect a button → observe score and weight → lose all hearts → results → menu → confirm currency equals old balance plus final score → reload → confirm balance → Play → confirm score and weight both start at zero. Repeat the loop to check input cleanup. Verify the same result after closing and reopening the site in the same browser profile.

For deterministic scene integration checks, open `/tests/browser.html` on the Vite server and click **Run scene checks**. It exercises real Level pickup/death code with forced overlap, End/Menu transitions, empty retry state and listener cleanup. Reload the harness to verify saved currency. Use a separate browser origin/profile for the harness because it awards real test currency in that origin. The test harness is excluded from the production entry.
