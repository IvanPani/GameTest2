import test from 'node:test';
import assert from 'node:assert/strict';
import { CREDIT_NOTES, ACADEMIC_NOTE, CREDITS_ART } from '../src/credits-data.js';

test('credits list contains exactly one record for each of the requested sections', () => {
  assert.deepEqual(CREDIT_NOTES.map(item => item.id), ['team','music','assets','teachers']);
  assert.ok(ACADEMIC_NOTE.description.includes('UCM'));
});

test('all credits are real data, and external music sources use precise licenses', () => {
  assert.ok(CREDIT_NOTES.every(item => item.sections.length > 0));
  const songs = CREDIT_NOTES.find(item => item.id === 'music').sections;
  assert.equal(songs[0].name, 'Happy Clappy Loop');
  assert.equal(songs[0].credit, 'OwlishMedia · CC0');
  assert.equal(songs[1].name, 'Windfish');
  assert.equal(songs[1].credit, 'Of Far Different Nature · CC BY 4.0');
  for (const note of CREDIT_NOTES) for (const section of note.sections) {
    assert.ok(section.heading && section.name);
    if (section.url) assert.equal(new URL(section.url).protocol, 'https:');
  }
});

test('the credits art keys are unique and provided as literal asset URLs', () => {
  assert.equal(new Set(CREDITS_ART.map(item => item[0])).size, CREDITS_ART.length);
  for (const [key, url] of CREDITS_ART) {
    assert.match(key,/^credits-/);
    assert.match(url,/^file:\/\//);
    assert.match(url,/\.png$/);
  }
});
