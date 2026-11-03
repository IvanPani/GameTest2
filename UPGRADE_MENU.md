# Illustrated upgrade shop

The sewing-table room uses the supplied artwork from `assets/menu/Upgrade Menu/upgrades/`, with `assembled_preview.jpg` as the visual reference. Background, title, Fabric/Steering headers, all ten tier buttons and the Washing Room sign are independent assets. Blank sign faces receive dynamic text; the reference JPG is not loaded as a game texture.

The player's shared custom sock is static and cuff-up in the middle of the cutting mat. The two columns retain the existing five permanent levels each. The reference shows four rows, but the supplied fifth-tier assets are included in a compact five-row layout so no existing upgrades are removed.

- Each side progresses independently, from tier 1 through tier 5.
- Owned tiers have a small drawn green check and an OWNED label; they cannot be bought again.
- Only the next tier is highlighted. It can be bought if the wallet has at least 1,000 currency.
- Later tiers are faded and marked LOCKED with a padlock; clicking them has no effect.
- Purchases update the check, next tier, currency and bonus summary immediately. Ownership is read from the saved `upgrades` levels and survives reloads.
- `purchaseUpgrade(id, requestedLevel)` rejects out-of-order requests before spending. Existing callers can omit the tier to buy the next level. Existing prices, caps, effects and save-failure rollback remain in force.
- The illustrated Washing Room button pans back to Main. Keyboard Right and Escape also return; inactive-room controls stay disabled.

Main menu asset references were updated to the user's reorganized `assets/menu/Main Menu/` folder, including the exact `customize_button .png` filename. The user's moved source-asset folders and deletions were preserved.

Validation: 25 tests pass, including a regression for skipping tiers, rebuying owned levels, independent tracks and reloaded ownership. Browser checks use isolated session storage with 2,000 currency: locked tier click leaves the wallet unchanged; buying Fabric 1 spends 1,000 and opens Fabric 2; another click on Fabric 1 spends nothing; buying Steering 1 independently spends the remaining 1,000. Reload retains both green checks and the 4-heart/20%-less-delay summary. The return sign and production build were verified.
