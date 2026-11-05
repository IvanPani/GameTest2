import { CREDIT_NOTES, ACADEMIC_NOTE } from './credits-data.js';

// Credits is the fifth room, one 400px camera pane to the right of Records.
// This scene function is called from Menu.createCredits().
// It deliberately keeps all writing and external links in Phaser objects.
const INK = '#42342f';
const FONT = 'Fredoka, sans-serif';
const addText = (scene, group, x, y, text, size = 14, color = INK, other = {}) => {
    const object = scene.add.text(x, y, text, {
        fontFamily: FONT, fontSize: `${size}px`, color, align: 'center',
        ...other
    }).setOrigin(.5);
    group.add(object);
    return object;
};

export function createCreditsRoom(scene, { x, y }) {
    const panel = scene.add.container(x, y);
    panel.add(scene.add.image(200, 350, 'credits-background').setDisplaySize(400, 700));
    addText(scene, panel, 200, 150, 'CREDITS', 28, '#fff0d3', {
        fontFamily: 'DynaPuff, sans-serif', fontStyle: 'bold',
        stroke: '#553524', strokeThickness: 5
    });

    // Permanent academic context. The rest of the text is placed on removable Post-its.
    panel.add(scene.add.image(200, 210, 'credits-note-academic').setDisplaySize(300, 70));
    addText(scene, panel, 200, 198, ACADEMIC_NOTE.heading, 13, INK, { fontStyle: 'bold' });
    addText(scene, panel, 200, 219, ACADEMIC_NOTE.description, 10, INK, {
        fontStyle: 'bold', wordWrap: { width: 276 }
    });

    const list = scene.add.container(0, 0);
    panel.add(list);
    const placements = [
        { x: 116, y: 315, angle: -3 },
        { x: 284, y: 315, angle: 3 },
        { x: 116, y: 440, angle: 2 },
        { x: 284, y: 440, angle: -2 }
    ];
    const buttons = [];
    const detail = scene.add.container(0, 0).setVisible(false);
    panel.add(detail);

    const detailControls = [];
    const registerDetailControl = (button, action) => {
        button.setInteractive({ useHandCursor: true });
        detailControls.push(scene.registerMenuControl('credits', button, action));
    };
    const addLink = (y, text, url, size = 13) => {
        const link = addText(scene, detail, 200, y, text, size, '#266d91', { fontStyle: 'bold' });
        registerDetailControl(link, () => window.open(url, '_blank', 'noopener,noreferrer'));
    };

    const openCredit = note => {
        if (scene.location !== 'credits' || scene.transitioning || scene.starting || detail.visible) return;
        detail.add(scene.add.rectangle(200, 350, 360, 426, 0x2a1c1c, 0.52));
        detail.add(scene.add.image(200, 350, 'credits-note-detail').setDisplaySize(338, 415));
        addText(scene, detail, 200, 193, note.title, 21, INK, { fontStyle: 'bold' });

        const sectionCount = note.sections.length;
        let top = sectionCount === 2 ? 237 : 216;
        for (const section of note.sections) {
            addText(scene, detail, 200, top, section.heading.toUpperCase(), 13, '#85563b', {fontStyle: 'bold'});
            addText(scene, detail, 200, top + 25, section.name, 16, INK, {
                fontStyle: 'bold', wordWrap: { width: 278 }
            });
            if (section.credit) addText(scene, detail, 200, top + 50, section.credit, 12, INK,
                {wordWrap: { width: 278 }});
            if (section.url) {
                addLink(top + (section.credit ? 74 : 55), section.linkLabel + ' ↗', section.url);
            }
            if (section.artistUrl) addLink(top + 94, 'Artist website ↗', section.artistUrl, 12);
            if (section.licenseUrl) addLink(top + 112, 'CC BY 4.0 license ↗', section.licenseUrl, 11);
            top += sectionCount > 2 ? 89 : 130;
        }
        const back = addText(scene, detail, 200, 514, '← BACK TO NOTES', 15, '#573b36', {
            fontStyle: 'bold', padding: { x: 18, y: 6 }, backgroundColor: '#f2cfac'
        });
        registerDetailControl(back, closeCredit);
        detail.setVisible(true);
        for (const button of buttons) button.pageEnabled = false;
        scene.refreshControls();
    };
    function closeCredit() {
        if (!detail.visible) return;
        detail.setVisible(false);
        for (const control of detailControls) {
            scene.controls.splice(scene.controls.indexOf(control), 1);
        }
        detailControls.length = 0;
        detail.removeAll(true);
        for (const button of buttons) button.pageEnabled = true;
        scene.refreshControls();
    }

    for (const [index, note] of CREDIT_NOTES.entries()) {
        const { x, y, angle } = placements[index];
        const image = scene.add.image(x, y, note.texture)
            .setDisplaySize(151, 114)
            .setAngle(angle)
            .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 20 });
        list.add(image);
        buttons.push(image);
        addText(scene, list, x, y - 15, note.title, note.title.length > 10 ? 13 : 16, INK, { fontStyle: 'bold' });
        addText(scene, list, x, y + 16, note.teaser, 11, '#76584b');
        scene.registerMenuControl('credits', image, () => openCredit(note));
    }

    // The existing navigation system tint/highlight works on image signs.
    const sign = scene.add.image(200, 633, 'credits-sign-left')
        .setDisplaySize(221, 62);
    panel.add(sign);
    addText(scene, panel, 210, 633, 'RECORDS', 17, INK, { fontStyle: 'bold' });
    scene.navigationSigns.credits = { LEFT: sign };

    // Called whenever the user leaves Credits, so the room doesn't reopen on a detail.
    return { panel, closeCredit, hasDetail: () => detail.visible };
}
