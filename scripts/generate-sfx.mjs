import { mkdir, writeFile } from 'node:fs/promises';
import { createPickupSamples, createHazardSamples, encodeWav } from '../src/sound-design.js';
const directory = new URL('../assets/audio/', import.meta.url);
await mkdir(directory, { recursive: true });
for (let tier = 1; tier <= 5; tier++) await writeFile(new URL(`pickup-x${tier}.wav`, directory), encodeWav(createPickupSamples(tier)));
await writeFile(new URL('hazard-hit.wav', directory), encodeWav(createHazardSamples()));
