# Falling Socks — customizable sock prototype (v1)

This **source patch**, not a replacement project, adds a runtime recoloring test to the existing Phaser game.
It is based on GitHub `IvanPani/GameTest2` `main` inspected November 2, 2026, **including the newer Menu, player-data, and combo changes**. It does not commit, push, or modify GitHub. It may not match more recent uncommitted Codex work.

## Install

1. Commit or back up local work in GitHub Desktop first.
2. Extract this ZIP anywhere.
3. Open a terminal in your `GameTest2` project folder.
4. Run:

   **macOS:** `python3 /path/to/falling_socks_custom_skin_v1/install_custom_sock.py .`

   **Windows:** `py C:\\path\\to\\falling_socks_custom_skin_v1\\install_custom_sock.py .`

5. Run `npm start` as you normally do.
6. In the Main Menu, change BODY, ACCENT, PATTERN COLOUR and PATTERN. Press PLAY. Your selections are saved and used by the animated game sock.
7. Inspect `git diff` and commit only after playtesting.

The installer checks its exact integration points and aborts if the project has changed. It does not overwrite files with uncommitted changes. To undo after installation, use GitHub Desktop to discard the 4 edited files and delete `src/sock-skin.js` (only if you have no other edits to preserve).

## What this proves

- Reuses the original **30-frame sheet**, five weight stages and six-frame falling animation.
- Detects baked-in red toe/heel regions and recolors them separately from cream fabric.
- Applies dots or diagonal stripes in *frame-local* coordinates so patterns move with the sprite rather than remain fixed on the screen.
- Allows independent body, accents and pattern colors (four starter swatches).
- Caches a combined **CanvasTexture**, updated only on style changes, never on every gameplay frame.
- Saves selected style using the existing `playerData` / localStorage implementation.

## Known limitations

- Region detection is color-based and approximate; original flattened art may show edge artifacts. High-quality production skins need actual authored grayscale + region masks for all 30 frames.
- Pattern overlays are clipped to the body and anchored within each frame but **not physically warped with fabric folds**. A full art pass is needed for perfect pattern deformation.
- Current gameplay still uses silhouette-based player collision. This patch preserves the existing collision behavior but does **not** implement our separately planned fixed-size hitbox.
- This patch provides only a temporary color/pattern test UI in the menu; it is not the final clothesline customization scene.
- The player-data defaults grant a few complimentary starter colors and patterns, including to existing v1 saves. Pricing/unlocks can be designed later.
- Rendering a 3072 × 2560 custom texture requires memory. Optimize and benchmark on phones before shipping.

## Source files

- `src/sock-skin.js` — new modular renderer and frame generation.
- `src/boot.js` — generates customized frames at launch after profile loads.
- `src/player.js` — uses customized frames with the original stage thresholds.
- `src/player-data.js` — grants prototype cosmetics to existing profiles.
- `src/menu.js` — temporary playable appearance controls and preview.
- `tests/sock-skin.test.mjs` — tests the pixel classification, color preservation and patterns.

Run module tests from this extracted folder: `node --test tests/sock-skin.test.mjs`.

**Note:** `node` needs to interpret `.js` as ES modules. The included `package.json` sets `type: module` for tests.
