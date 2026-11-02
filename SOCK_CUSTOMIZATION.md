# Sock customization

The clothesline now offers eight pattern choices: None, Stars, Dots, Moons (crescents), Skulls, horizontal Stripes Spirals and Squares. The same ten named colors are available for sock fabric, patterns, and shared toe/cuff accents: Red, Yellow, Navy blue, Sky blue, Hard green, Soft green, White, Black, Grey and Pink. Cycle either direction using the arrows; the current color name and swatch are shown.

Toes and Cuff band have separate on/off switches. The Toes switch controls the original toe/heel patches together. Disabled patches are neutralized before body tint and pattern are applied, rather than leaving the source red visible. The shared accent color is retained while either switch is off. Changes save immediately and update the existing shared texture, including stationary cuff-up hub images and the five animated gameplay states.

`src/sock-customization.js` owns the palette, pattern IDs and procedural motif shapes. Motifs use cached, antialiased repeating tiles. `src/sock-skin.js` applies a soft mask for original red-painted toe/heel patches and a procedural cuff-band mask aligned to each frame's opaque bounds. These remain masks derived from flattened artwork; separate artist-authored region masks could further refine seam placement. Source pixels and every alpha byte are preserved, so silhouettes and frame geometry do not change.

Existing saves retain their selected colors, even legacy colors outside the new palette (displayed as “Saved color” until cycled). Both switches default to on when missing in an older save. The new palette/pattern IDs are added to available options without changing currency or upgrades. New profiles start white with red accents. The existing `stripes` ID now means horizontal stripes instead of the older diagonal prototype.

Run `npm test` for palette uniqueness, motif coverage, horizontal stripes, independent switches, neutralized red, five-row consistency, alpha preservation, save/reload and older-save compatibility, alongside the rest of the game tests.

Open `/tests/skin-preview.html` in the Vite server for the real `Player` at button thresholds 0/10/25/50/100. Its pattern selector and independent switches change only the preview texture, not the saved style. “Check all 30 frames” verifies all frames exist and compares every alpha byte against the original sheet. The original six motifs were visually inspected across the five states; separate clothesline/main-menu checks verify static pose, live updates and reload persistence.
