// This module contains the Credits room's editable text and art URLs.
// Unlike the illustrated background, all visible credit text is drawn live in Phaser.
export const CREDITS_ART = Object.freeze([
    ['credits-background', new URL('../assets/menu/Credits Menu/credits_background.png', import.meta.url).href],
    ['credits-note-academic', new URL('../assets/menu/Credits Menu/note_academic.png', import.meta.url).href],
    ['credits-note-team', new URL('../assets/menu/Credits Menu/note_team.png', import.meta.url).href],
    ['credits-note-music', new URL('../assets/menu/Credits Menu/note_music.png', import.meta.url).href],
    ['credits-note-assets', new URL('../assets/menu/Credits Menu/note_assets.png', import.meta.url).href],
    ['credits-note-teachers', new URL('../assets/menu/Credits Menu/note_teachers.png', import.meta.url).href],
    ['credits-note-detail', new URL('../assets/menu/Credits Menu/note_detail.png', import.meta.url).href],
    ['credits-sign-left', new URL('../assets/menu/Credits Menu/sign_left_blank.png', import.meta.url).href],
    ['credits-sign-right', new URL('../assets/menu/Credits Menu/sign_right_blank.png', import.meta.url).href]
]);

export const CREDIT_NOTES = Object.freeze([
    {
        id: 'team', title: 'THE TEAM', teaser: 'Design, code & art', texture: 'credits-note-team',
        sections: [
            { heading: 'Game Design', name: 'Ivan Panisello' },
            { heading: 'Programming and Art', name: 'Codex' }
        ]
    },
    {
        id: 'music', title: 'MUSIC', teaser: 'Background music', texture: 'credits-note-music',
        sections: [
            { heading: 'Soundtrack', name: 'Happy Clappy Loop', credit: 'OwlishMedia · CC0',
              linkLabel: 'OpenGameArt.org', url: 'https://opengameart.org/content/happy-clappy-loop' }
        ]
    },
    {
        id: 'assets', title: 'FONTS & ASSETS', teaser: 'Typefaces', texture: 'credits-note-assets',
        sections: [
            { heading: 'DynaPuff · SIL OFL 1.1', name: 'Toshi Omagari & Jennifer Daniel',
              linkLabel: 'Font information', url: 'https://fonts.google.com/specimen/DynaPuff' },
            { heading: 'Fredoka · SIL OFL 1.1', name: 'Milena Brandão & Hafontia',
              linkLabel: 'Font information', url: 'https://fonts.google.com/specimen/Fredoka' }
        ]
    },
    {
        id: 'teachers', title: 'UCM TEACHERS', teaser: 'With thanks', texture: 'credits-note-teachers',
        sections: [
            { heading: 'Phaser blueprint', name: 'Carlos León' },
            { heading: 'Design consultation', name: 'Juan de Miguel Contreras' }
        ]
    }
]);

export const ACADEMIC_NOTE = Object.freeze({
    heading: 'A UNIVERSITY CLASS PROJECT',
    description: "Master's in Video Game Design & Development · UCM"
});
