import { SOCK_PATTERNS } from './sock-customization.js';

const color = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
export const REUNIONS_PER_PAGE = 4;

// Return fresh plain data: no references into the live customization object.
export function snapshotReunionStyle(raw) {
    if (!raw || !['bodyColor','accentColor','patternColor'].every(key => color(raw[key]))
        || !SOCK_PATTERNS.some(pattern => pattern.id === raw.patternId)
        || typeof raw.toesEnabled !== 'boolean' || typeof raw.cuffEnabled !== 'boolean') return null;
    return { bodyColor:raw.bodyColor, accentColor:raw.accentColor, patternId:raw.patternId,
        patternColor:raw.patternColor, toesEnabled:raw.toesEnabled, cuffEnabled:raw.cuffEnabled };
}

export function validateReunions(raw) {
    if (!Array.isArray(raw)) return [];
    const ids = new Set(), numbers = new Set(), entries = [];
    for (const entry of raw) {
        const style = snapshotReunionStyle(entry?.style);
        if (!style || typeof entry.id !== 'string' || !entry.id.length || entry.id.length > 160
            || !positive(entry.number) || !Number.isFinite(entry.completedAt)
            || entry.completedAt < 0 || entry.completedAt > 8640000000000000
            || ids.has(entry.id) || numbers.has(entry.number)) continue;
        ids.add(entry.id); numbers.add(entry.number);
        entries.push({id:entry.id,number:entry.number,completedAt:entry.completedAt,style});
    }
    return entries.sort((a,b)=>a.number-b.number);
}

export function getReunionPage(entries, requestedPage = 0) {
    const total = entries.length;
    const pageCount = Math.max(1,Math.ceil(total / REUNIONS_PER_PAGE));
    const page = Math.max(0,Math.min(pageCount-1,Number.isInteger(requestedPage)?requestedPage:0));
    return {page,pageCount,total,entries:entries.slice(page*REUNIONS_PER_PAGE,(page+1)*REUNIONS_PER_PAGE)};
}

export function reunionStyleKey(style) {
    return JSON.stringify([style.bodyColor,style.accentColor,style.patternId,style.patternColor,style.toesEnabled,style.cuffEnabled]);
}
