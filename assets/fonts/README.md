# Local game fonts

- `dynapuff/DynaPuff-Variable.ttf`: Falling Socks page title; weights 400–700.
- `fredoka/Fredoka-Variable.ttf`: all other page and Phaser canvas text; weights 300–700.

Downloaded from the official Google Fonts repository:
https://github.com/google/fonts/tree/main/ofl/dynapuff
https://github.com/google/fonts/tree/main/ofl/fredoka

Each font includes its SIL Open Font License in its own `OFL.txt`.
CSS declarations are in `css/game.css`. Canvas font families are in `src/level.js` and `src/end.js`. `src/game.js` waits for fonts before starting Phaser. Fonts are bundled locally for offline use and Electron; no runtime font service is required.
