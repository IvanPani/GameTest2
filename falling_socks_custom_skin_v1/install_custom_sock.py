#!/usr/bin/env python3
"""Install Falling Socks cosmetic prototype into the GameTest2 repository.

Usage: python3 install_custom_sock.py /path/to/GameTest2
Edits only src/boot.js, src/player.js, src/player-data.js, src/menu.js;
adds src/sock-skin.js. Aborts if expected anchors changed or tracked edits exist.
"""
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).parent


def replace_once(text, original, replacement, name):
    found = text.count(original)
    if found != 1:
        raise RuntimeError(f'{name}: expected one known code anchor, found {found}. Aborting safely.')
    return text.replace(original, replacement, 1)


def patch_boot(code):
    code = replace_once(code,
        "import { playerData } from './player-data.js';",
        "import { playerData } from './player-data.js';\nimport { applySockStyle } from './sock-skin.js';",
        'boot import')
    code = replace_once(code,
        "        playerData.load();\n        this.scene.start('menu');",
        "        playerData.load();\n        applySockStyle(this, playerData.getProfile().sockStyle);\n        this.scene.start('menu');",
        'boot initialization')
    return code


def patch_player(code):
    code = replace_once(code, "scene.add.sprite(0, 0, 'white-sock-stages')",
                        "scene.add.sprite(0, 0, 'custom-sock-stages')", 'player texture')
    code = replace_once(code, 'this.sock.play(`white-sock-stage-${stage}`)',
                        'this.sock.play(`custom-sock-stage-${stage}`)', 'player animation')
    return code


def patch_data(code):
    code = replace_once(code,
        "unlocks: { colors: ['#ffffff', '#cc655a'], patterns: ['plain'], cosmetics: [] },",
        "unlocks: { colors: ['#ffffff', '#cc655a', '#8bc78b', '#eecb68'], "
        "patterns: ['plain', 'dots', 'stripes'], cosmetics: [] },",
        'default starter cosmetics')
    return replace_once(code,
        "result.unlocks.patterns = [...new Set(['plain', ...ids(raw.unlocks?.patterns)])];",
        "result.unlocks.patterns = [...new Set([...result.unlocks.patterns, ...ids(raw.unlocks?.patterns)])];",
        'existing save starter patterns')


MENU_METHOD = '''
    // Temporary appearance controls. Later move these into the clothesline room.
    createSkinControls() {
        const colors = ['#ffffff', '#cc655a', '#8bc78b', '#eecb68'];
        const patternIds = ['plain', 'dots', 'stripes'];
        const labelStyle = {
            fontFamily: 'Fredoka, sans-serif', fontSize: '15px', color: '#f3f6ed'
        };
        const onStyleChange = (partial) => {
            if (!playerData.selectStyle(partial)) return;
            applySockStyle(this, playerData.getProfile().sockStyle);
            // Same canvas texture is refreshed: both preview and gameplay use it.
        };
        this.sockPreview = this.add.sprite(200, 115, CUSTOM_SOCK_TEXTURE, 0).setScale(0.35);
        this.sockPreview.play('custom-sock-stage-0');
        [
            ['BODY', 'bodyColor', 430],
            ['ACCENT', 'accentColor', 474],
            ['PATTERN COLOUR', 'patternColor', 518]
        ].forEach(([label, key, y]) => {
            this.add.text(16, y - 8, label, { ...labelStyle, fontSize: '13px' });
            colors.forEach((hex, index) => {
                const x = 202 + index * 43;
                const swatch = this.add.rectangle(x, y, 27, 27,
                    Phaser.Display.Color.HexStringToColor(hex).color)
                    .setStrokeStyle(2, 0xffffff, 0.8)
                    .setInteractive({ useHandCursor: true });
                swatch.on('pointerdown', () => onStyleChange({ [key]: hex }));
            });
        });
        this.add.text(16, 561, 'PATTERN', { ...labelStyle, fontSize: '13px' });
        patternIds.forEach((id, index) => {
            const item = this.add.text(145 + index * 81, 560, id.toUpperCase(), {
                ...labelStyle, fontSize: '13px', backgroundColor: '#35566c',
                padding: { x: 8, y: 7 }
            }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
            item.on('pointerdown', () => onStyleChange({ patternId: id }));
        });
        this.add.text(200, 625, 'COSMETIC TEST  •  SAVES AUTOMATICALLY', {
            ...labelStyle, fontSize: '12px', color: '#8fe0d4'
        }).setOrigin(0.5);
    }
'''


def patch_menu(code):
    code = replace_once(code,
        "import { playerData } from './player-data.js';",
        "import { playerData } from './player-data.js';\n"
        "import { CUSTOM_SOCK_TEXTURE, applySockStyle } from './sock-skin.js';",
        'menu import')
    code = replace_once(code,
        "        if (playerData.saveError) this.add.text(200, 580, playerData.saveError, {",
        "        this.createSkinControls();\n"
        "        if (playerData.saveError) this.add.text(200, 665, playerData.saveError, {",
        'menu customization insertion')
    end = code.rfind('\n}')
    if end == -1 or 'createSkinControls() {' in code:
        raise RuntimeError('menu: expected a class ending and no existing skin controls')
    return code[:end] + '\n' + MENU_METHOD.rstrip() + code[end:]


def install(project):
    project = Path(project).expanduser().resolve()
    files = {
        'src/boot.js': patch_boot,
        'src/player.js': patch_player,
        'src/player-data.js': patch_data,
        'src/menu.js': patch_menu,
    }
    if not (project / 'package.json').is_file():
        raise RuntimeError('Not a project root: package.json not found')
    if (project / 'src/sock-skin.js').exists():
        raise RuntimeError('src/sock-skin.js already exists; not overwriting')
    # A typical local workflow may have uncommitted Codex changes: stop rather
    # than overwriting them. Committing first creates a restore point.
    status = subprocess.run(
        ['git', 'status', '--porcelain', '--', *files.keys(), 'src/sock-skin.js'],
        cwd=project, capture_output=True, text=True, check=False)
    if status.returncode == 0 and status.stdout.strip():
        raise RuntimeError('These files have uncommitted changes:\n' + status.stdout +
                           '\nCommit or back up your changes before applying this prototype.')
    updated = {}
    for path, transformer in files.items():
        full = project / path
        if not full.exists():
            raise RuntimeError(f'Missing expected file {path}')
        updated[path] = transformer(full.read_text(encoding='utf-8'))
    # Write only after all replacements passed validation.
    for path, contents in updated.items():
        (project / path).write_text(contents, encoding='utf-8')
    shutil.copyfile(ROOT / 'src/sock-skin.js', project / 'src/sock-skin.js')
    print('Installed customizable sock prototype: 4 modified files + src/sock-skin.js')
    print('Run npm start, open Main Menu, and try BODY / ACCENT / PATTERN COLOUR / PATTERN.')
    print('Review git diff before committing. Original spritesheet is unchanged.')


if __name__ == '__main__':
    try:
        install(sys.argv[1] if len(sys.argv) > 1 else '.')
    except Exception as exc:
        print(f'Installation aborted: {exc}', file=sys.stderr)
        raise SystemExit(1)
