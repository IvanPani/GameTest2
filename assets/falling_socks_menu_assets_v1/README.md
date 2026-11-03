# Falling Socks main-menu art assets — v1

These are extracted **separate PNG files** from a generated concept sheet, NOT yet installed in the user's local Phaser project. Please review them before treating them as production art.

- `main_menu_background.png`: portrait 800x1400 image; **no sock, no title, no menu buttons**. Sized to the existing 400x700 logical Phaser scene at 2x resolution.
- `button_customize.png`, `button_upgrades.png`, `button_records.png`, `button_play.png`: individual illustrated RGBA sign/button assets with transparent exterior, usable as interactive Phaser Images. These are not baked into the background.
- `basket_foreground_occlusion.png`: provisional overlapping laundry basket foreground piece. It comes from the same original image; its mask is approximate and may need Photoshop refinement.
- `assembled_preview.png`: example composition (not a game texture).

**Hero sock:** Do not use the white/red sock illustrations from concept sheets. Reuse `src/sock-skin.js`'s `CUSTOM_SOCK_TEXTURE`, with the saved style from `playerData`. In main menu, use static frame `0` (no fall animation) or a future dedicated hanging-frame asset. Place at basket right edge above washer; use a duplicate of the basket rim with higher depth to occlude as needed.

**Buttons:** Phaser objects should be interactive (`setInteractive`) with hover/pressed tweens. Actions: Customize -> customize room; Upgrades -> upgrades room; Records -> records room; Play -> animate sock to washing drum then fade to gameplay. Render text/logo separately if needed.

**Room navigation:** Fade out for ~180-250ms; switch room/camera position while black; fade in for ~180-250ms. Records is the new fourth hub destination and needs its own placeholder scene/room.

**Play:** short skippable leap into open top-loading washer, then fade to game, spawn sock just above top of gameplay and animate to normal fixed Y; control after landing. Never show the prior baked white/red sock.

**Limitations:** These are crops from generated concept art. The button sprite text is embedded *in each button image*, making buttons independent but text not localization-ready. The crop-based alpha masks may need an edge cleanup. No Phaser files have been changed.
