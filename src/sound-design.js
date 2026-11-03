// Original procedural effects: no external recordings or runtime synthesis required.
export const SAMPLE_RATE = 44100;
export const PICKUP_SEMITONES = Object.freeze([0, 2, 4, 7, 9]);
const TAU = Math.PI * 2;

function bell(t, frequency, strength = 1) {
    if (t < 0) return 0;
    const attack = Math.min(1, t / 0.006);
    return strength * attack * Math.exp(-t * 24) * (
        Math.sin(TAU * frequency * t) + 0.22 * Math.sin(TAU * frequency * 2 * t) * Math.exp(-t * 14)
        + 0.08 * Math.sin(TAU * frequency * 3 * t) * Math.exp(-t * 30));
}

function finish(samples) {
    let peak = 0;
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
    for (let i = 0; i < samples.length; i++) {
        const tail = Math.min(1, (samples.length - 1 - i) / (SAMPLE_RATE * 0.02));
        samples[i] = samples[i] / Math.max(1, peak / 0.7) * tail;
    }
    return samples;
}

export function createPickupSamples(tier) {
    const index = Math.max(0, Math.min(4, Math.round(tier) - 1));
    const frequency = 880 * 2 ** (PICKUP_SEMITONES[index] / 12);
    const samples = new Float32Array(Math.round(SAMPLE_RATE * 0.28));
    for (let i = 0; i < samples.length; i++) {
        const t = i / SAMPLE_RATE;
        samples[i] = bell(t, frequency, 0.48) + bell(t - 0.045, frequency * 1.5, 0.28)
            + (index >= 2 ? bell(t - 0.085, frequency * 2, 0.06 + index * 0.018) : 0);
    }
    return finish(samples);
}

export function createHazardSamples() {
    const samples = new Float32Array(Math.round(SAMPLE_RATE * 0.24));
    let seed = 7419, filteredNoise = 0;
    for (let i = 0; i < samples.length; i++) {
        const t = i / SAMPLE_RATE;
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        filteredNoise += ((seed / 4294967296 * 2 - 1) - filteredNoise) * 0.14;
        const attack = Math.min(1, t / 0.004);
        // A descending rounded note and a little fabric-like noise, never a harsh crash.
        const phase = TAU * (260 * t - 320 * t * t);
        samples[i] = attack * (0.52 * Math.sin(phase) * Math.exp(-t * 24)
            + 0.27 * filteredNoise * Math.exp(-t * 38));
    }
    return finish(samples);
}

export function encodeWav(samples) {
    const bytes = new Uint8Array(44 + samples.length * 2);
    const view = new DataView(bytes.buffer);
    const text = (offset, value) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
    text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), true);
    return bytes;
}
