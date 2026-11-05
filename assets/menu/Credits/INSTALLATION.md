# Falling Socks — Credits Room

This is an additive, ready-to-integrate credits-room asset/code pack for the Phaser 4 project. It **does not change your GitHub repository or local VS Code project automatically**. The folder structure matches the repo root; copy the files into the repo and let Codex make the surgical edits described below. No generated art contains credit names or baked-in interactive controls.

## Install the new assets and modules

Copy these supplied folders to the repo root:

- `assets/menu/Credits Menu/` — one 800×1400 background (displayed at 400×700), six blank painted notes, and two arrow-sign backgrounds.
- `src/credits-data.js` — all editable credit names, titles, licenses and source URLs, plus literal asset URLs.
- `src/credits-room.js` — the spatial room (at x=800) with interactive Post-its, dynamic credit details and source links.
- `tests/credits-data.test.js` — isolated data integrity test.

**Verified credit details:** Happy Clappy Loop by OwlishMedia is CC0. Windfish by Of Far Different Nature is from Loop Box #4 and licensed CC BY 4.0 (requires attribution). Fredoka designers: Milena Brandão and Hafontia; DynaPuff: Toshi Omagari and Jennifer Daniel. Fonts SIL OFL 1.1. Source links are data-driven. A class-project UCM note appears at the top of the board.

## Minimal edits to the current code

### `src/boot.js`

Add:

```js
import { CREDITS_ART } from './credits-data.js';
```

Extend the image loading loop:

```js
for (const [key, url] of [...MENU_ART, ...CUSTOMIZE_ART, ...UPGRADE_ART, ...RECORD_ART, ...CREDITS_ART]) this.load.image(key, url);
```

### `src/menu.js`

Add import:

```js
import { createCreditsRoom } from './credits-room.js';
```

Extend LOCATIONS with a room one screen to the right of Records:

```js
credits: { x: WIDTH * 2, y: 0 }
```

Call `this.createCredits()` after `this.createRecords()` in `Menu.create()`:

```js
createCredits() { this.creditsRoom = createCreditsRoom(this); }
```

At the end of `createRecords()`, replace the **old** `TRACKING STARTS WITH THIS UPDATE` text with the additional Credits sign. Place it below the corkboard to avoid colliding with the Reunions page-turn controls:

```js
const creditsSign = art(324, 595, 'credits-sign-right', 131);
this.label(panel, 313, 595, 'CREDITS', 13, '#4b3027');
this.navigationSigns.records.RIGHT = creditsSign;
```

Leave the existing `this.navigationSigns.records.LEFT` washing-room sign unchanged.

Update `activateDirection(direction)` so Credits is reachable from Records, Records is reachable from Credits, and every other room behaves as before:

```js
activateDirection(direction) {
    if (this.transitioning || this.starting || !this.navigationSigns[this.location]?.[direction]) return;
    this.menuTouch = null;
    this.setNavigationSelection(null);
    const next = {
        main: { UP: 'customize', LEFT: 'upgrades', RIGHT: 'records', DOWN: 'play' },
        customize: { DOWN: 'main' },
        upgrades: { RIGHT: 'main' },
        records: { LEFT: 'main', RIGHT: 'credits' },
        credits: { LEFT: 'records' }
    }[this.location]?.[direction];
    if (next === 'play') this.startRun();
    else if (next) this.navigate(next);
}
```

Extend `navigate(destination)`: currently the menu allows only side-room↔main. Permit the special adjacent rooms Records↔Credits, but keep all other connections unchanged. Replace the single current restriction:

```js
const recordsCredits = (this.location === 'records' && destination === 'credits')
    || (this.location === 'credits' && destination === 'records');
if (!recordsCredits && this.location !== 'main' && destination !== 'main') return;
if (this.location === 'credits') this.creditsRoom?.closeCredit();
```

Keep the rest of `navigate` and the existing `finishNavigation` camera pan intact. The menu's keyboard two-step selection and swipe/touch handling already delegate to `activateDirection`, so this update supports them automatically. The new credit notes are Phaser interactive images and are registered in `scene.controls` for room-specific input gating.

If you implement Escape, keep its existing behavior as a direct main-room escape only if that is already an intentional menu convention. Do not change gameplay input.

## What is interactive?

- Four Post-its on a painted corkboard open larger readable notes (Team / Music / Fonts & Assets / UCM Teachers).
- The music-source and font-source links open their respective websites.
- The academic note is permanently visible on the credits board.
- `← RECORDS` returns through the camera pan to Records.
- `CREDITS →` appears below the Records board beside the existing main-menu back sign.
- Text is created at runtime in Phaser; no names, licensing claims or university details are baked into PNG artwork.

## Validation checklist

1. Run `node --test tests/credits-data.test.js` and the full test suite in the project.
2. Run `npm run build` in the project (Node dependencies required).
3. Confirm Main → Records → Credits and Credits → Records → Main navigation on touch/mouse and keyboard.
4. Confirm clicking all four Post-its opens readable content and that closing a detail restores note interactivity.
5. Confirm OpenGameArt and font links open safely and that the classroom/UCM statement is visible on the top note.
6. Confirm the currency badge and existing Records Reunions album remain functional.

This package has been syntax-checked and its isolated data tests run. The complete Phaser app has **not** been built or run by this package because the repo is not mounted in the current environment.
