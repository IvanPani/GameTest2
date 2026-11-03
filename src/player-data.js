import { UPGRADES } from './upgrades.js';
import { SOCK_COLORS, SOCK_PATTERNS } from './sock-customization.js';
import { defaultRecords, validateRecords, recordCompletedRun } from './records.js';

export const SAVE_KEY = 'falling-socks.player.v1';
const integer = value => Number.isSafeInteger(value) && value >= 0;
const color = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const ids = value => Array.isArray(value)
    ? [...new Set(value.filter(id => typeof id === 'string' && /^[\w-]{1,80}$/.test(id)))] : [];

export function defaultProfile() {
    return {
        schemaVersion: 1,
        currency: 0,
        settings: { soundEnabled: true },
        records: defaultRecords(),
        upgrades: { fabric: 0, steering: 0 },
        sockStyle: { bodyColor: '#ffffff', accentColor: '#e34b4b', patternId: 'plain', patternColor: '#ffffff', toesEnabled: true, cuffEnabled: true },
        unlocks: { colors: [...SOCK_COLORS.map(color => color.hex), '#cc655a', '#8bc78b', '#eecb68'], patterns: SOCK_PATTERNS.map(pattern => pattern.id), cosmetics: [] },
        activeRunId: null
    };
}

function validate(raw) {
    if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 1) throw new Error('Unsupported save');
    const result = defaultProfile();
    if (integer(raw.currency)) result.currency = raw.currency;
    result.records = validateRecords(raw.records);
    if (typeof raw.settings?.soundEnabled === 'boolean') result.settings.soundEnabled = raw.settings.soundEnabled;
    for (const key of Object.keys(result.upgrades)) {
        if (integer(raw.upgrades?.[key])) result.upgrades[key] = raw.upgrades[key];
    }
    result.unlocks.colors = [...new Set([...result.unlocks.colors,
        ...(Array.isArray(raw.unlocks?.colors) ? raw.unlocks.colors.filter(color) : [])])];
    result.unlocks.patterns = [...new Set([...result.unlocks.patterns, ...ids(raw.unlocks?.patterns)])];
    result.unlocks.cosmetics = ids(raw.unlocks?.cosmetics);
    for (const key of ['bodyColor', 'accentColor', 'patternColor']) {
        if (result.unlocks.colors.includes(raw.sockStyle?.[key])) result.sockStyle[key] = raw.sockStyle[key];
    }
    if (result.unlocks.patterns.includes(raw.sockStyle?.patternId)) result.sockStyle.patternId = raw.sockStyle.patternId;
    for (const key of ['toesEnabled', 'cuffEnabled']) {
        if (typeof raw.sockStyle?.[key] === 'boolean') result.sockStyle[key] = raw.sockStyle[key];
    }
    if (typeof raw.activeRunId === 'string') result.activeRunId = raw.activeRunId;
    return result;
}

// One instance owns all permanent data. Run weight and score never enter the profile.
export class PlayerData {
    constructor(getStorage = () => globalThis.localStorage, createId = () => globalThis.crypto.randomUUID()) {
        this.getStorage = getStorage;
        this.createId = createId;
        this.profile = defaultProfile();
        this.loaded = false;
        this.saveError = null;
        this.readOnly = false;
    }

    load() {
        if (this.loaded) return this.getProfile();
        this.loaded = true;
        try {
            const text = this.getStorage().getItem(SAVE_KEY);
            if (text !== null) {
                const raw = JSON.parse(text);
                // Preserve a newer save rather than overwriting it with older defaults.
                if (raw?.schemaVersion > 1) this.readOnly = true;
                this.profile = validate(raw);
            }
        } catch {
            this.saveError = 'Progress could not be loaded. Playing with temporary defaults.';
            // Leave the original save untouched until storage is usable again or explicitly reset.
            this.readOnly = true;
        }
        return this.getProfile();
    }

    getProfile() { return structuredClone(this.profile); }

    commit(next) {
        this.profile = next;
        if (this.readOnly) return false;
        try {
            this.getStorage().setItem(SAVE_KEY, JSON.stringify(next));
            this.saveError = null;
            return true;
        } catch {
            this.saveError = 'Progress is temporary: browser storage could not save it.';
            return false;
        }
    }

    beginRun() {
        this.load();
        const next = this.getProfile();
        next.activeRunId = this.createId();
        this.commit(next);
        return next.activeRunId;
    }

    completeRun(runId, score, result = {}) {
        this.load();
        if (!runId || this.profile.activeRunId !== runId) return false;
        if (!integer(score) || !integer(this.profile.currency + score)) throw new Error('Invalid run score');
        const next = this.getProfile();
        next.currency += score;
        next.records = recordCompletedRun(next.records, score, result);
        next.activeRunId = null;
        // Currency, records and the settlement marker are one storage write.
        this.commit(next);
        return true;
    }

    setSoundEnabled(enabled) {
        this.load();
        if (typeof enabled !== 'boolean') return false;
        const next = this.getProfile();
        next.settings.soundEnabled = enabled;
        this.commit(next);
        return true;
    }

    purchaseUpgrade(id, requestedLevel) {
        this.load();
        if (!Object.hasOwn(this.profile.upgrades, id)) return false;
        const level = this.profile.upgrades[id];
        if (requestedLevel !== undefined && requestedLevel !== level + 1) return false;
        const price = UPGRADES[id]?.costs[level];
        if (!integer(price) || this.profile.currency < price) return false;
        const next = this.getProfile();
        next.currency -= price;
        next.upgrades[id] += 1;
        const previous = this.profile;
        if (!this.commit(next)) {
            // A permanent purchase must be saved before granting its bonus.
            this.profile = previous;
            return false;
        }
        return true;
    }

    purchaseUnlock(category, id, price) {
        this.load();
        if (!['colors', 'patterns', 'cosmetics'].includes(category) || !integer(price)) return false;
        if (category === 'colors' ? !color(id) : ids([id]).length !== 1) return false;
        if (this.profile.unlocks[category].includes(id) || this.profile.currency < price) return false;
        const next = this.getProfile();
        next.currency -= price;
        next.unlocks[category].push(id);
        this.commit(next);
        return true;
    }

    selectStyle(style) {
        this.load();
        const next = this.getProfile();
        for (const [key, value] of Object.entries(style)) {
            if (!Object.hasOwn(next.sockStyle, key)) return false;
            if (['toesEnabled', 'cuffEnabled'].includes(key)) {
                if (typeof value !== 'boolean') return false;
                next.sockStyle[key] = value;
                continue;
            }
            const owned = key === 'patternId' ? next.unlocks.patterns : next.unlocks.colors;
            if (!owned.includes(value)) return false;
            next.sockStyle[key] = value;
        }
        this.commit(next);
        return true;
    }
}

export const playerData = new PlayerData();
