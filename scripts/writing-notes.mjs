// Writing notes for guided courses. These are advice for
// the author, never errors: they do not fail `validate --strict`.
//
//  - glossary: a term from content/glossary.json used in a lesson that comes
//    before the lesson that defines it (`definedIn`);
//  - readability: in beginner tracks, a lesson whose average sentence is longer
//    than 18 words, and every sentence longer than 30 words.
import { existsSync, readFileSync } from 'node:fs';

export const MAX_AVG_SENTENCE_WORDS = 18;
export const LONG_SENTENCE_WORDS = 30;

/**
 * The lesson's running text: no code blocks, tables, headings or front-matter;
 * inline code becomes a placeholder word so it still counts as one word.
 */
export function plainText(body) {
  return body
    .replace(/^\s*```[\s\S]*?^\s*```[^\n]*$/gm, ' ')
    .split('\n')
    .filter((line) => !/^\s*(```|\||#)/.test(line))
    .join('\n')
    .replace(/`[^`]*`/g, 'CODE')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>]/g, ' ');
}

/** Sentences of the running text; list items and paragraphs end a sentence too. */
export function sentences(body) {
  return plainText(body)
    .split(/\n\s*\n|\n(?=\s*(?:[-+]|\d+[.)]|[①②③④⑤⑥⑦⑧⑨])\s)|(?<=[.!?:])\s+/)
    .map((s) => s.replace(/^\s*(?:[-+]|\d+[.)]|[①②③④⑤⑥⑦⑧⑨])\s+/, '').replace(/\s+/g, ' ').trim())
    .filter((s) => /[A-Za-z]{2}/.test(s));
}

const wordCount = (s) => s.split(' ').filter(Boolean).length;

/** Notes about long sentences, for one lesson in a beginner track. */
export function readabilityNotes(body) {
  const list = sentences(body);
  if (list.length === 0) return [];
  const notes = [];
  const avg = list.reduce((n, s) => n + wordCount(s), 0) / list.length;
  if (avg > MAX_AVG_SENTENCE_WORDS) {
    notes.push(`average sentence is ${avg.toFixed(1)} words (aim for ${MAX_AVG_SENTENCE_WORDS} or fewer)`);
  }
  for (const s of list) {
    const n = wordCount(s);
    if (n > LONG_SENTENCE_WORDS) notes.push(`${n}-word sentence: "${s.slice(0, 70)}…"`);
  }
  return notes;
}

/** Reads content/glossary.json. Returns `{ entries, problems }`; a missing file is fine. */
export function readGlossary(file) {
  if (!existsSync(file)) return { entries: [], problems: [] };
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    return { entries: [], problems: [`invalid JSON: ${e.message}`] };
  }
  if (!Array.isArray(raw)) return { entries: [], problems: ['must be an array of terms'] };
  const problems = [];
  const entries = [];
  raw.forEach((t, i) => {
    const where = `term ${i + 1}${typeof t?.term === 'string' ? ` "${t.term}"` : ''}`;
    if (typeof t?.term !== 'string' || !t.term.trim()) return problems.push(`${where}: "term" is required`);
    if (typeof t.definition !== 'string' || !t.definition.trim()) problems.push(`${where}: "definition" is required`);
    if (typeof t.definedIn !== 'string') return problems.push(`${where}: "definedIn" (a lesson slug) is required`);
    if (t.aliases !== undefined && !Array.isArray(t.aliases)) problems.push(`${where}: "aliases" must be an array`);
    entries.push({ term: t.term, aliases: Array.isArray(t.aliases) ? t.aliases : [], definedIn: t.definedIn });
  });
  return { entries, problems };
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A whole-word, case-insensitive matcher; null for names with no letters (such as "..."). */
function matcher(name) {
  if (!/[A-Za-z]/.test(name)) return null;
  return new RegExp(`(?<![\\w$])${escape(name)}(?![\\w$])`, 'i');
}

/**
 * Notes for lessons that use a glossary term before the lesson that defines it.
 * `position` maps a slug to its place on the path.
 */
export function glossaryNotes(entries, files, position) {
  const notes = [];
  for (const entry of entries) {
    const definedAt = position.get(entry.definedIn);
    if (definedAt === undefined) continue; // reported as a problem by the caller
    const patterns = [entry.term, ...entry.aliases].map(matcher).filter(Boolean);
    for (const f of files) {
      const at = position.get(f.meta.slug);
      if (at === undefined || at >= definedAt) continue;
      const text = plainText(f.body).replace(/\bCODE\b/g, ' ');
      if (patterns.some((re) => re.test(text))) {
        notes.push({ file: f.file, msg: `uses "${entry.term}" before lesson "${entry.definedIn}" defines it` });
      }
    }
  }
  return notes;
}
