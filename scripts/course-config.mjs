// Finds a course folder, reads its course.json, checks it and fills in the defaults.
//
// A course folder looks like this (see examples/demo-course):
//   course.json            name, brand, home page copy, kinds, code languages
//   content/topics.json    the topics, in display order
//   content/lessons/*.md   one bite per file
//   content/legacy.json    optional: old lesson URLs → the bites that replaced them
//   quiz/questions.json    the question bank
//   assets/                optional: favicon and logo named in course.json
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const shellRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEMO_COURSE = resolve(shellRoot, 'examples', 'demo-course');

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const SCALE_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
export const TRACK_LEVELS = ['beginner', 'intermediate', 'advanced'];
export const REQUIRED_GUIDED_KINDS = ['concept', 'task', 'build', 'troubleshoot'];

/** Chip colours a lesson kind can take; each has a `chip-<tone>` utility in styles.css. */
export const TONES = ['violet', 'blue', 'emerald', 'cyan', 'orange', 'neutral'];

/** Used when course.json has no `kinds`: a set that fits most programming courses. */
export const DEFAULT_KINDS = [
  { id: 'concept', label: 'Concept', hint: 'How and why something works', tone: 'violet' },
  { id: 'api', label: 'API', hint: 'A specific function, decorator or syntax', tone: 'blue' },
  { id: 'technique', label: 'Technique', hint: 'How to get a particular job done', tone: 'emerald' },
  { id: 'pattern', label: 'Pattern', hint: 'A reusable way to structure code', tone: 'cyan' },
  { id: 'pitfall', label: 'Pitfall', hint: 'A common mistake and its fix', tone: 'orange' },
  { id: 'tool', label: 'Tool', hint: 'CLI and tooling', tone: 'neutral' },
];

export const DEFAULT_GUIDED_KINDS = [
  { id: 'concept', label: 'Concept', hint: 'What something is and why it exists', tone: 'violet' },
  { id: 'task', label: 'How-to', hint: 'Steps to get one job done', tone: 'emerald' },
  { id: 'build', label: 'Build it', hint: 'Put a chapter together in a small project', tone: 'orange' },
  { id: 'troubleshoot', label: 'Fix it', hint: 'A symptom, its cause and the fix', tone: 'blue' },
];

/** Fence names that need no Prism component: they are shown as plain text. */
const PLAIN_LANGS = new Set(['text', 'plain', 'plaintext', 'txt']);
/** Languages already inside node_modules/prismjs/prism.js. */
const PRISM_CORE = new Set(['markup', 'css', 'clike', 'javascript']);

/** The course folder to use: the argument, else $COURSE_DIR, else the demo course. */
export function resolveCourseDir(arg) {
  const dir = resolve(process.cwd(), arg ?? process.env.COURSE_DIR ?? DEMO_COURSE);
  if (!existsSync(resolve(dir, 'course.json'))) {
    throw new Error(`No course.json in ${dir}. Pass the path of a course folder.`);
  }
  return dir;
}

export function coursePaths(dir) {
  const content = resolve(dir, 'content');
  return {
    dir,
    config: resolve(dir, 'course.json'),
    content,
    lessons: resolve(content, 'lessons'),
    topics: resolve(content, 'topics.json'),
    legacy: resolve(content, 'legacy.json'),
    quizDir: resolve(dir, 'quiz'),
    bank: resolve(dir, 'quiz', 'questions.json'),
  };
}

export function readCourseJson(dir) {
  const file = resolve(dir, 'course.json');
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`course.json is not valid JSON: ${e.message}`);
  }
}

// ---- Prism languages -------------------------------------------------------

let prismIndex;
/** Maps every Prism language id and alias to its component id. */
function prismLanguages() {
  if (!prismIndex) {
    const { languages } = require('prismjs/components.json');
    const byName = new Map();
    for (const [id, def] of Object.entries(languages)) {
      if (id === 'meta') continue;
      byName.set(id, id);
      for (const alias of [def.alias ?? []].flat()) byName.set(alias, id);
    }
    prismIndex = { languages, byName };
  }
  return prismIndex;
}

export function isKnownLanguage(name) {
  return PLAIN_LANGS.has(name) || prismLanguages().byName.has(name);
}

/**
 * The Prism component files needed for `names`, each after the ones it requires,
 * leaving out what prism.js already contains. Paths are relative to node_modules/prismjs.
 */
export function prismComponentFiles(names) {
  const { languages, byName } = prismLanguages();
  const ordered = [];
  const visit = (id) => {
    if (PRISM_CORE.has(id) || ordered.includes(id)) return;
    for (const dep of [languages[id].require ?? []].flat()) visit(dep);
    ordered.push(id);
  };
  for (const name of names) {
    if (PLAIN_LANGS.has(name)) continue;
    visit(byName.get(name));
  }
  return ordered.map((id) => `components/prism-${id}.min.js`);
}

// ---- Colours ---------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (from, to, amount) =>
  '#' +
  rgb(from)
    .map((v, i) => Math.round(v + (rgb(to)[i] - v) * amount).toString(16).padStart(2, '0'))
    .join('');

/** A 50–950 scale around one brand colour, which sits at 600. */
export function scaleFrom(color) {
  const tint = (t) => mix(color, '#ffffff', t);
  const shade = (t) => mix(color, '#000000', t);
  return {
    50: tint(0.94),
    100: tint(0.88),
    200: tint(0.76),
    300: tint(0.58),
    400: tint(0.36),
    500: tint(0.16),
    600: color.toLowerCase(),
    700: shade(0.16),
    800: shade(0.3),
    900: shade(0.42),
    950: shade(0.66),
  };
}

// ---- Checking --------------------------------------------------------------

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isHex = (v) => typeof v === 'string' && HEX_RE.test(v);

/** Every problem in a raw course.json, as readable messages. Empty when it is fine. */
export function checkCourseJson(raw, dir) {
  const errors = [];
  const bad = (msg) => errors.push(msg);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['must be a JSON object'];

  if (!isText(raw.id) || !SLUG_RE.test(raw.id)) bad('id: required, kebab-case, the same as the repository name');
  for (const key of ['name', 'subject', 'description']) if (!isText(raw[key])) bad(`${key}: required text`);

  if (raw.format !== undefined && raw.format !== 'bites' && raw.format !== 'guided') {
    bad('format: must be "bites" or "guided"');
  }

  if (raw.format === 'guided') {
    if (!Array.isArray(raw.tracks) || raw.tracks.length === 0) {
      bad('tracks: required when format is guided');
    } else {
      const trackIds = new Set();
      for (const t of raw.tracks) {
        const where = `tracks "${t?.id ?? '?'}"`;
        if (!isText(t?.id) || !SLUG_RE.test(t.id)) bad(`${where}: id must be kebab-case`);
        if (trackIds.has(t?.id)) bad(`${where}: duplicate id`);
        trackIds.add(t?.id);
        if (!isText(t?.title)) bad(`${where}: missing title`);
        if (!isText(t?.blurb) || t.blurb.length > 160) bad(`${where}: blurb must be text <= 160 characters`);
        if (!TRACK_LEVELS.includes(t?.level)) bad(`${where}: level must be beginner, intermediate, or advanced`);
      }
    }

    if (raw.kinds === undefined || !Array.isArray(raw.kinds) || raw.kinds.length === 0) {
      bad('kinds: required when format is guided');
    } else {
      const ids = new Set(raw.kinds.map((k) => k?.id));
      if (ids.size !== 4 || !REQUIRED_GUIDED_KINDS.every((id) => ids.has(id))) {
        bad('kinds: guided format requires exactly 4 kinds: concept, task, build, troubleshoot');
      }
    }
  }

  const brand = raw.brand;
  if (!brand || typeof brand !== 'object') {
    bad('brand: required object with at least "color"');
  } else {
    if (!isHex(brand.color)) bad('brand.color: required, a colour like "#DD0031"');
    if (brand.scale !== undefined) {
      const keys = Object.keys(brand.scale ?? {});
      if (keys.length !== SCALE_STEPS.length || !SCALE_STEPS.every((s) => isHex(brand.scale[s])))
        bad(`brand.scale: needs a "#rrggbb" colour for each of ${SCALE_STEPS.join(', ')}`);
    }
    for (const key of ['gradient', 'gradientDark']) {
      if (brand[key] !== undefined && !(Array.isArray(brand[key]) && brand[key].length === 3 && brand[key].every(isHex)))
        bad(`brand.${key}: needs exactly 3 colours like "#DD0031"`);
    }
    const asset = (key, exts) => {
      if (brand[key] === undefined || brand[key] === null) return;
      if (!isText(brand[key])) bad(`brand.${key}: must be a path inside the course folder`);
      else if (!exts.includes(extname(brand[key]).toLowerCase())) bad(`brand.${key}: must end in ${exts.join(' or ')}`);
      else if (!existsSync(resolve(dir, brand[key]))) bad(`brand.${key}: ${brand[key]} does not exist`);
    };
    asset('logo', ['.svg']);
    asset('favicon', ['.ico', '.svg', '.png']);
  }

  const languages = raw.codeLanguages ?? [];
  if (!Array.isArray(languages) || !languages.every(isText)) {
    bad('codeLanguages: must be a list of language names, such as ["typescript", "bash"]');
  } else {
    for (const name of languages) {
      if (!isKnownLanguage(name)) bad(`codeLanguages: "${name}" is not a language Prism knows`);
    }
  }

  if (raw.kinds !== undefined) {
    if (!Array.isArray(raw.kinds) || raw.kinds.length === 0) {
      bad('kinds: must be a non-empty list');
    } else {
      const ids = new Set();
      for (const k of raw.kinds) {
        const where = `kinds "${k?.id ?? '?'}"`;
        if (!isText(k?.id) || !SLUG_RE.test(k.id)) bad(`${where}: id must be kebab-case`);
        if (ids.has(k?.id)) bad(`${where}: duplicate id`);
        ids.add(k?.id);
        if (!isText(k?.label)) bad(`${where}: missing label`);
        if (!isText(k?.hint)) bad(`${where}: missing hint`);
        if (!TONES.includes(k?.tone)) bad(`${where}: tone must be one of ${TONES.join(', ')}`);
      }
    }
  }

  const home = raw.home;
  if (home !== undefined && (typeof home !== 'object' || home === null)) {
    bad('home: must be an object');
  } else if (home) {
    if (home.badge !== undefined && home.badge !== null && !isText(home.badge)) bad('home.badge: must be text');
    if (home.headline !== undefined && !(Array.isArray(home.headline) && home.headline.length === 3 && home.headline.every((s) => typeof s === 'string')))
      bad('home.headline: needs 3 parts: text before, the highlighted words, text after');
    if (home.searchExamples !== undefined && !(Array.isArray(home.searchExamples) && home.searchExamples.length <= 3 && home.searchExamples.every(isText)))
      bad('home.searchExamples: up to 3 search words');
    if (home.featuredLesson !== undefined && home.featuredLesson !== null && !isText(home.featuredLesson))
      bad('home.featuredLesson: must be a lesson slug');
    if (home.featuredCode !== undefined && home.featuredCode !== null) {
      const c = home.featuredCode;
      if (!isText(c?.lang) || !isText(c?.code)) bad('home.featuredCode: needs "lang" and "code"');
      else if (!PLAIN_LANGS.has(c.lang) && Array.isArray(languages) && !languages.includes(c.lang))
        bad(`home.featuredCode: lang "${c.lang}" is not in codeLanguages`);
      else if (c.code.split('\n').length > 8) bad('home.featuredCode: keep the code to 8 lines');
    }
    if (home.quizPreview !== undefined && home.quizPreview !== null) {
      const q = home.quizPreview;
      const options = Array.isArray(q?.options) && q.options.length >= 2 && q.options.length <= 4 && q.options.every(isText);
      if (!isText(q?.topic) || !isText(q?.prompt) || !options) bad('home.quizPreview: needs "topic", "prompt" and 2–4 "options"');
      else if (!Number.isInteger(q.selected) || q.selected < 0 || q.selected >= q.options.length)
        bad('home.quizPreview.selected: the position of the highlighted option, counting from 0');
    }
  }
  return errors;
}

/** course.json with every optional part filled in. Call after `checkCourseJson` passes. */
export function normalizeCourse(raw) {
  const isGuided = raw.format === 'guided';
  const scale = raw.brand.scale
    ? Object.fromEntries(SCALE_STEPS.map((s) => [s, raw.brand.scale[s].toLowerCase()]))
    : scaleFrom(raw.brand.color);
  const home = raw.home ?? {};
  const defaultHeadline = isGuided
    ? [`Learn ${raw.subject} `, 'step by step', ', one short lesson at a time.']
    : [`Learn ${raw.subject} one `, 'five‑minute bite', ' at a time.'];
  return {
    id: raw.id,
    format: raw.format ?? 'bites',
    tracks: raw.tracks ?? [],
    name: raw.name,
    subject: raw.subject,
    description: raw.description,
    brand: {
      scale,
      gradient: raw.brand.gradient ?? [scale[500], scale[600], scale[800]],
      gradientDark: raw.brand.gradientDark ?? raw.brand.gradient ?? [scale[400], scale[300], scale[200]],
      logo: raw.brand.logo ?? null,
      favicon: raw.brand.favicon ?? null,
    },
    home: {
      badge: home.badge ?? null,
      headline: home.headline ?? defaultHeadline,
      searchExamples: home.searchExamples ?? [],
      featuredLesson: home.featuredLesson ?? null,
      featuredCode: home.featuredCode ?? null,
      quizPreview: home.quizPreview ?? null,
    },
    kinds: raw.kinds ?? (isGuided ? DEFAULT_GUIDED_KINDS : DEFAULT_KINDS),
    codeLanguages: raw.codeLanguages ?? [],
  };
}

/** Reads, checks and normalises a course's config. Throws listing every problem. */
export function loadCourse(dir) {
  const raw = readCourseJson(dir);
  const errors = checkCourseJson(raw, dir);
  if (errors.length) throw new Error(`course.json has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  return normalizeCourse(raw);
}
