import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { glossaryNotes, readabilityNotes, sentences } from './writing-notes.mjs';
import { validateCourse } from './validate-course.mjs';
import { shellRoot } from './course-config.mjs';

describe('writing notes (S13)', () => {
  it('splits running text into sentences, ignoring code, tables and headings', () => {
    const body = [
      '## Why you need it',
      '',
      'You want a total. Angular can do it!',
      '',
      '```ts',
      'const total = 1; // not a sentence. Not this either.',
      '```',
      '',
      '| a | b |',
      '|---|---|',
      '',
      '- First point',
      '- Second point',
    ].join('\n');
    assert.deepEqual(sentences(body), ['You want a total.', 'Angular can do it!', 'First point', 'Second point']);
  });

  it('flags a long average and every sentence over 30 words', () => {
    const long = Array.from({ length: 32 }, (_, i) => `word${i}`).join(' ') + '.';
    const notes = readabilityNotes(long);
    assert.ok(notes.some((n) => n.startsWith('average sentence is')), notes.join('; '));
    assert.ok(notes.some((n) => n.startsWith('32-word sentence')), notes.join('; '));
    assert.deepEqual(readabilityNotes('A short sentence. Another short one.'), []);
  });

  it('notes a term used before the lesson that defines it, but not in code or after', () => {
    const position = new Map([
      ['one', 0],
      ['two', 1],
      ['three', 2],
    ]);
    const files = [
      { file: 'one.md', meta: { slug: 'one' }, body: 'Make a Signal here.' },
      { file: 'two.md', meta: { slug: 'two' }, body: 'Only in code: `signal(0)`.' },
      { file: 'three.md', meta: { slug: 'three' }, body: 'A signal again.' },
    ];
    const entries = [{ term: 'signal', aliases: [], definedIn: 'two' }];
    assert.deepEqual(glossaryNotes(entries, files, position), [
      { file: 'one.md', msg: 'uses "signal" before lesson "two" defines it' },
    ]);
  });

  it('never turns a note into an error, even with --strict', () => {
    const dir = mkdtempSync(join(tmpdir(), 'notes-test-'));
    try {
      cpSync(resolve(shellRoot, 'examples', 'guided-course'), dir, { recursive: true });
      writeFileSync(
        join(dir, 'content', 'glossary.json'),
        // "lesson" appears in every earlier lesson of the sample course.
        JSON.stringify([{ term: 'lesson', aliases: [], definition: 'One short page.', definedIn: 'why-tests-fail' }]),
      );
      const res = validateCourse(dir, { strict: true });
      assert.equal(res.errors.length, 0, res.errors.join(', '));
      assert.ok(res.notes.length > 0, 'expected at least one note');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
