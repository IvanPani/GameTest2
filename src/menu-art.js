// Independent artwork supplied in falling_socks_menu_assets_v1.
// Literal asset URLs let Vite emit hashed files for browser and Electron builds.
export const MENU_ART = Object.freeze([
    ['menu-background', new URL('../assets/menu/main_menu_background.png', import.meta.url).href],
    ['menu-customize', new URL('../assets/menu/button_customize.png', import.meta.url).href],
    ['menu-upgrades', new URL('../assets/menu/button_upgrades.png', import.meta.url).href],
    ['menu-records', new URL('../assets/menu/button_records.png', import.meta.url).href],
    ['menu-play', new URL('../assets/menu/button_play.png', import.meta.url).href],
    ['menu-basket-rim', new URL('../assets/menu/basket_foreground_occlusion.png', import.meta.url).href]
]);
