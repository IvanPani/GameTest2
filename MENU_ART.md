# Illustrated main menu

The supplied `falling_socks_menu_assets_v1` artwork is installed under `assets/menu/`. The original supplied folder remains untouched. Runtime uses six individual textures (background, Customize, Upgrades, Records, Play and the basket foreground), not `assembled_preview.png`.

`src/menu-art.js` exposes literal asset URLs; Boot preloads them and Vite includes hashed copies in the production bundle. Main uses the supplied 400×700 layout: Customize above the basket, Upgrades left, Records right, and Play on the washer. The title and tagline remain separate canvas text. Currency stays fixed at the top right; the next-upgrade goal appears on a small bottom plate.

The main sock is static frame 0 of the shared `CUSTOM_SOCK_TEXTURE`, in the player's saved colors/patterns. It uses the cuff-up orientation. A source-frame crop places its lower portion behind the basket rim. Root-level sprite and foreground layers preserve the overlap when panning; no collision or source alpha data is changed. The foreground texture is a supplied provisional crop, not newly generated art.

Buttons have transparent-pixel hit testing and hover/press scaling. Mouse/touch signs and keyboard routes both preserve the existing camera pans: Up to Customize, Left to Upgrades, Right to Records. Return controls and Escape lead back to Main. Inactive rooms and transitions cannot accept navigation/purchase inputs. Menu arrow keys and Space are captured to prevent webpage scrolling.

Play locks menu input, clears the menu-only crop, and animates the customized sock upward from the basket and into the washer, shrinks it into the drum, then fades to the existing Level. This takes about 0.9 seconds. Press Enter or Space again to skip. A completion guard starts Level once; shutdown removes listeners and scene-owned tweens. Gameplay's spawn, controls, collisions, weight states, scoring and reward rules are unchanged.

Validation: `npm test` (24 passing tests), production Vite build, and browser checks for all four illustrated buttons, camera returns, preserved customization, normal animated entry, skipped entry, and the full death/results/menu return using the isolated shop fixture. The scene returns with a fresh stationary sock, updated currency and working menu input. Browser console reported no errors.
