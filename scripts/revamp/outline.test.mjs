import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { parseOutline, validateOutline } from './outline.mjs';

const SAMPLE_OUTLINE = `
# Outline: Test Course

## Chặng · Foundations (Nền tảng)

\`track: foundations\` · \`level: beginner\` · blurb: Basic concepts.

### Chương 1 · First Steps

\`topic: first-steps\` · blurb: Learn the basics.

| # | Title | slug | kind | aliases | from | notes |
|---|---|---|---|---|---|---|
| 1.1 | Intro | \`intro\` | concept | — | \`old-intro\` | Start |
| 1.2 | Do Something | \`do-something\` | task | \`legacy-do\` | \`old-do\` | Practical |
`;

describe('outline parser and validator', () => {
  it('parses chapters, metadata, and lesson rows', () => {
    const { topics, rows, parseErrors } = parseOutline(SAMPLE_OUTLINE);
    assert.equal(parseErrors.length, 0);
    assert.equal(topics.length, 1);
    assert.equal(topics[0].id, 'first-steps');
    assert.equal(topics[0].track, 'foundations');
    assert.equal(topics[0].lessons.length, 2);
    assert.deepEqual(topics[0].lessons, ['intro', 'do-something']);
    assert.equal(rows.length, 2);
  });

  it('fails if duplicate slugs exist', () => {
    const dupe = SAMPLE_OUTLINE + '| 1.3 | Dup | `intro` | concept | — | `old-dup` | Dup |\n';
    const { topics, rows } = parseOutline(dupe);
    const { errors } = validateOutline(topics, rows, { sources: new Set(), type: 'none' });
    assert.ok(errors.some((e) => e.includes('Duplicate slug "intro"')));
  });

  it('fails if alias collides with a slug', () => {
    const aliasCol = SAMPLE_OUTLINE + '| 1.3 | Dup | `another-slug` | concept | `intro` | `old-alias` | Dup |\n';
    const { topics, rows } = parseOutline(aliasCol);
    const { errors } = validateOutline(topics, rows, { sources: new Set(), type: 'none' });
    assert.ok(errors.some((e) => e.includes('Alias collision: "intro"')));
  });

  it('fails if kind is invalid', () => {
    const badKind = SAMPLE_OUTLINE.replace('| concept |', '| invalid-kind |');
    const { topics, rows } = parseOutline(badKind);
    const { errors } = validateOutline(topics, rows, { sources: new Set(), type: 'none' });
    assert.ok(errors.some((e) => e.includes('Invalid kind "invalid-kind"')));
  });

  it('fails if an old source is missing from the from column', () => {
    const { topics, rows } = parseOutline(SAMPLE_OUTLINE);
    const { errors } = validateOutline(topics, rows, { sources: new Set(['old-intro', 'uncovered-slug']), type: 'bites' });
    assert.ok(errors.some((e) => e.includes('Old sources missing in "from" column')));
  });

  it('correctly matches angular revamp outline and topics.json', () => {
    const outlinePath = resolve(process.cwd(), '../angular/revamp/OUTLINE.md');
    const topicsPath = resolve(process.cwd(), '../angular/revamp/topics.json');
    const outlineContent = readFileSync(outlinePath, 'utf8');
    const expectedTopics = JSON.parse(readFileSync(topicsPath, 'utf8'));

    const { topics, rows, parseErrors } = parseOutline(outlineContent);
    assert.equal(parseErrors.length, 0);
    assert.equal(topics.length, 31);
    assert.equal(rows.length, 198);
    assert.deepEqual(topics, expectedTopics);
  });
});
