// Validates a course before build/ship: course.json, micro-lesson rules, the
// legacy mapping and the question bank. Every problem is listed.
//
//   npm run validate -- ../my-course             # unfinished topics/legacy entries are warnings
//   npm run validate -- ../my-course --strict    # release mode: they are errors (the deploy workflow)
import { existsSync, readFileSync } from 'node:fs';
import { checkCourseJson, coursePaths, normalizeCourse, readCourseJson } from './course-config.mjs';
import { DIAGRAM_LANGS, maskFences, readJson, readLessonFiles } from './generate-manifest.mjs';
import { parseDiagram } from '../src/app/shared/diagram/diagram-parser.ts';

const SECTIONS = ['The idea', 'See it', 'Go deeper', 'Watch out', 'Remember'];
const REQUIRED_SECTIONS = ['The idea', 'See it', 'Remember'];
const MAX_WORDS = 700;
const MAX_CODE_BLOCKS = 3; // diagrams (sequence / tree / flow) are counted separately (max 1)
const MAX_CODE_LINES = 25;
// A bite should take 3–5 minutes: long enough to teach the idea properly, short enough to finish in one go.
const MIN_MINUTES = 3;
const MAX_MINUTES = 5;
const MIN_QUESTIONS_PER_TOPIC = 8;
const QUESTION_TYPES = ['single-choice', 'multiple-choice', 'fill-blank', 'ordering', 'match-pair'];
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const GUIDED_KINDS = {
  concept: {
    allowed: ['Why you need it', 'Try it', 'How it works', 'Common mistakes', 'Going further', 'Recap'],
    required: ['Why you need it', 'How it works', 'Recap'],
  },
  task: {
    allowed: ['Why you need it', 'Try it', 'How it works', 'Common mistakes', 'Going further', 'Recap'],
    required: ['Why you need it', 'Try it', 'How it works', 'Recap'],
  },
  build: {
    allowed: ["What you'll build", 'Steps', 'Check your work', 'Solution', 'Recap'],
    required: ["What you'll build", 'Steps', 'Check your work', 'Recap'],
  },
  troubleshoot: {
    allowed: ['What you see', 'Why it happens', 'How to fix it', 'Recap'],
    required: ['What you see', 'Why it happens', 'How to fix it', 'Recap'],
  },
};

const bullets = (text) => (text.match(/^\s{0,1}(?:[-*]|\d+\.)\s+\S/gm) ?? []).length;
const countSteps = (text) => (text.match(/^\s*(?:\*\*[Ss]tep\s+\d+|[0-9]+\.)/gm) ?? []).length;

const sectionInProse = (name, prose) => {
  const m = new RegExp(`^## ${name}\\s*$`, 'm').exec(prose);
  if (!m) return null;
  const rest = prose.slice(m.index + m[0].length);
  const next = /^## .+$/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};

export function checkBiteBody({ where, body, stats, prose, teachesCode, allowedFences, course, fail }) {
  if (/^# .+$/m.test(prose)) fail(where, 'no H1 in the body — the title comes from front-matter');
  if (!/^\s*> \*\*In one line:\*\*/.test(body)) fail(where, 'body must open with the "> **In one line:** …" callout');

  const h2s = [...prose.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  let last = -1;
  for (const h of h2s) {
    const idx = SECTIONS.indexOf(h);
    if (idx === -1) fail(where, `unknown section "## ${h}" (allowed: ${SECTIONS.join(', ')})`);
    else if (idx < last) fail(where, `section out of order: "## ${h}"`);
    else last = idx;
  }
  for (const s of REQUIRED_SECTIONS) if (!h2s.includes(s)) fail(where, `missing section "## ${s}"`);

  const remember = sectionInProse('Remember', prose);
  if (remember !== null && bullets(remember) !== 3) fail(where, `"## Remember" needs exactly 3 bullets (got ${bullets(remember)})`);
  const watch = sectionInProse('Watch out', prose);
  if (watch !== null && (bullets(watch) < 1 || bullets(watch) > 3))
    fail(where, `"## Watch out" needs 1–3 bullets (got ${bullets(watch)})`);

  if (stats.words > MAX_WORDS) fail(where, `${stats.words} words (max ${MAX_WORDS}) — split the lesson`);
  if (stats.minutes > MAX_MINUTES) fail(where, `${stats.minutes} min (max ${MAX_MINUTES}) — split the lesson`);
  if (stats.minutes < MIN_MINUTES)
    fail(where, `${stats.minutes} min (min ${MIN_MINUTES}) — add depth: a second example, a "Go deeper" section, or a diagram`);

  const code = stats.blocks.filter((b) => !DIAGRAM_LANGS.has(b.lang));
  const diagrams = stats.blocks.filter((b) => DIAGRAM_LANGS.has(b.lang));
  for (const d of diagrams) {
    try {
      parseDiagram(d.lang, d.text);
    } catch (e) {
      fail(where, `${d.lang} diagram: ${e.message}`);
    }
  }
  if (code.length > MAX_CODE_BLOCKS) fail(where, `${code.length} code blocks (max ${MAX_CODE_BLOCKS})`);
  if (diagrams.length > 1) fail(where, `${diagrams.length} diagrams (max 1)`);
  if (teachesCode && code.length === 0) fail(where, 'needs at least one code block');
  for (const b of code) {
    if (b.lines > MAX_CODE_LINES) fail(where, `a ${b.lang || 'plain'} code block has ${b.lines} lines (max ${MAX_CODE_LINES})`);
  }
  for (const b of stats.blocks) {
    if (b.lang === '') fail(where, 'code fence without a language');
    else if (!allowedFences.has(b.lang))
      fail(where, `code fence \`\`\`${b.lang} is not in course.json "codeLanguages" (${[...course.codeLanguages, 'text'].join(', ')})`);
  }

  const hasTable = /^\s*\|.*\|\s*$\n^\s*\|[\s:|-]+\|\s*$/m.test(prose);
  const hasDiagram = diagrams.length > 0;
  const hasCallout = /^\s*> \*\*(?:Tip|Note|Watch out)[:.]?\*\*/m.test(prose);
  const hasBeforeAfter = code.some((b) => /\bBefore\b/.test(b.text) && /\bAfter\b/.test(b.text));
  if (!(hasTable || hasDiagram || hasCallout || hasBeforeAfter))
    fail(
      where,
      'needs at least one visual that fits the information: a table, a Tip/Note/Watch out callout, a Before/After code block, or (when it is a sequence, a choice or a dependency graph) a diagram. See CONTENT_GUIDE.md',
    );
}

export function checkGuidedLesson({ where, meta, body, stats, prose, teachesCode, allowedFences, topicById, trackById, fail }) {
  const kindDef = GUIDED_KINDS[meta.kind];
  if (!kindDef) {
    fail(where, `kind "${meta.kind}" not one of concept, task, build, troubleshoot`);
    return;
  }

  if (/^# .+$/m.test(prose)) fail(where, 'no H1 in the body — the title comes from front-matter');

  const h2s = [...prose.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]);
  let last = -1;
  for (const h of h2s) {
    const idx = kindDef.allowed.indexOf(h);
    if (idx === -1) {
      fail(where, `unknown section "## ${h}" for kind "${meta.kind}" (allowed: ${kindDef.allowed.join(', ')})`);
    } else if (idx < last) {
      fail(where, `section out of order: "## ${h}"`);
    } else {
      last = idx;
    }
  }
  for (const s of kindDef.required) {
    if (!h2s.includes(s)) fail(where, `missing section "## ${s}"`);
  }

  const recap = sectionInProse('Recap', prose);
  if (recap !== null && bullets(recap) !== 3) {
    fail(where, `"## Recap" needs exactly 3 bullets (got ${bullets(recap)})`);
  }
  const commonMistakes = sectionInProse('Common mistakes', prose);
  if (commonMistakes !== null && (bullets(commonMistakes) < 1 || bullets(commonMistakes) > 3)) {
    fail(where, `"## Common mistakes" needs 1–3 bullets (got ${bullets(commonMistakes)})`);
  }
  const steps = sectionInProse('Steps', prose);
  if (steps !== null && countSteps(steps) < 2) {
    fail(where, `"## Steps" needs at least 2 steps (got ${countSteps(steps)})`);
  }

  if (h2s.includes('Going further')) {
    const topic = topicById.get(meta.topic);
    const track = topic ? trackById.get(topic.track) : null;
    if (track?.level !== 'advanced') {
      fail(where, '"## Going further" is only allowed in advanced tracks');
    }
  }

  const isBuild = meta.kind === 'build';
  const minMin = 2;
  const maxMin = isBuild ? 10 : 7;
  const maxWords = isBuild ? 1500 : 1100;
  const maxCode = isBuild ? 10 : 6;

  if (stats.words > maxWords) fail(where, `${stats.words} words (max ${maxWords}) — split the lesson`);
  if (stats.minutes < minMin || stats.minutes > maxMin) {
    fail(where, `${stats.minutes} min (must be ${minMin}–${maxMin} min)`);
  }

  const code = stats.blocks.filter((b) => !DIAGRAM_LANGS.has(b.lang));
  const diagrams = stats.blocks.filter((b) => DIAGRAM_LANGS.has(b.lang));
  for (const d of diagrams) {
    try {
      parseDiagram(d.lang, d.text);
    } catch (e) {
      fail(where, `${d.lang} diagram: ${e.message}`);
    }
  }
  if (code.length > maxCode) fail(where, `${code.length} code blocks (max ${maxCode})`);
  if (diagrams.length > 1) fail(where, `${diagrams.length} diagrams (max 1)`);
  if (teachesCode && (meta.kind === 'task' || isBuild) && code.length === 0) {
    fail(where, 'needs at least one code block');
  }
  for (const b of code) {
    if (b.lines > 25) fail(where, `a ${b.lang || 'plain'} code block has ${b.lines} lines (max 25)`);
  }
  for (const b of stats.blocks) {
    if (b.lang === '') fail(where, 'code fence without a language');
    else if (!allowedFences.has(b.lang)) {
      fail(where, `code fence \`\`\`${b.lang} is not in course.json "codeLanguages"`);
    }
  }

  const images = [...body.matchAll(/!\[(.*?)\]\((.*?)\)/g)];
  if (images.length > 2) fail(where, `${images.length} images (max 2)`);
}

/**
 * Checks the course in `courseDir`. Returns `{ errors, warnings, summary }`; the
 * course may ship only when `errors` is empty.
 */
export function validateCourse(courseDir, { strict = false } = {}) {
  const paths = coursePaths(courseDir);
  const errors = [];
  const warnings = [];
  const fail = (where, msg) => errors.push(`[${where}] ${msg}`);
  /** A problem that only blocks a release: a warning while topics are being written. */
  const pending = (where, msg) => (strict ? fail(where, msg) : warnings.push(`[${where}] ${msg}`));

  // ---- course.json ---------------------------------------------------------
  let course;
  try {
    const raw = readCourseJson(courseDir);
    const problems = checkCourseJson(raw, courseDir);
    for (const p of problems) fail('course.json', p);
    if (!problems.length) course = normalizeCourse(raw);
  } catch (e) {
    fail('course.json', e.message);
  }
  if (!course) return { errors, warnings, summary: '' };

  const isGuided = course.format === 'guided';
  const kinds = course.kinds.map((k) => k.id);
  const allowedFences = new Set([...course.codeLanguages, 'text', ...DIAGRAM_LANGS]);
  // A course with no code languages (cooking, critical thinking) has no code to show.
  const teachesCode = course.codeLanguages.length > 0;

  // ---- Topics --------------------------------------------------------------
  let topics = [];
  try {
    topics = readJson(paths.topics);
    if (!Array.isArray(topics)) throw new Error('must be an array');
  } catch (e) {
    fail('topics.json', `cannot be read: ${e.message}`);
    topics = [];
  }
  const topicIds = new Set(topics.map((t) => t.id));
  if (topicIds.size !== topics.length) fail('topics.json', 'duplicate topic id');
  for (const t of topics) {
    for (const key of ['id', 'title', 'blurb', 'order']) {
      if (t[key] === undefined || t[key] === '') fail('topics.json', `${t.id ?? '?'}: missing ${key}`);
    }
  }

  const trackIds = new Set((course.tracks ?? []).map((t) => t.id));
  const trackById = new Map((course.tracks ?? []).map((t) => [t.id, t]));
  const topicById = new Map();
  const allTopicLessons = new Map(); // slug -> topicId
  const roadmapOrder = [];
  const slugPosition = new Map();

  if (isGuided) {
    for (const t of topics) {
      topicById.set(t.id, t);
      if (!t.track || !trackIds.has(t.track)) {
        fail('topics.json', `topic "${t.id}": missing or invalid track "${t.track}"`);
      }
      if (!Array.isArray(t.lessons)) {
        fail('topics.json', `topic "${t.id}": lessons must be an array`);
      } else {
        for (const s of t.lessons) {
          if (!SLUG_RE.test(s)) fail('topics.json', `topic "${t.id}": lesson slug "${s}" must be kebab-case`);
          if (allTopicLessons.has(s)) {
            fail('topics.json', `slug "${s}" appears in more than one topic (also in "${allTopicLessons.get(s)}")`);
          }
          allTopicLessons.set(s, t.id);
        }
      }
    }

    const trackIndex = new Map((course.tracks ?? []).map((t, i) => [t.id, i]));
    const sortedTopics = [...topics].sort((a, b) => {
      const ta = trackIndex.get(a.track) ?? 999;
      const tb = trackIndex.get(b.track) ?? 999;
      if (ta !== tb) return ta - tb;
      return (a.order ?? 0) - (b.order ?? 0);
    });

    for (const t of sortedTopics) {
      for (const s of t.lessons ?? []) {
        slugPosition.set(s, roadmapOrder.length);
        roadmapOrder.push(s);
      }
    }
  }

  // ---- Legacy mapping (read early for alias checks) -------------------------
  let legacy = [];
  try {
    legacy = readJson(paths.legacy, []);
    if (!Array.isArray(legacy)) throw new Error('must be an array');
  } catch (e) {
    fail('legacy.json', `cannot be read: ${e.message}`);
    legacy = [];
  }
  const legacySlugs = new Set();
  const legacyIds = new Set();
  for (const e of legacy) {
    for (const key of ['id', 'slug', 'title']) if (!e[key]) fail('legacy.json', `${e.id ?? '?'}: missing ${key}`);
    if (legacyIds.has(e.id)) fail('legacy.json', `duplicate id ${e.id}`);
    if (legacySlugs.has(e.slug)) fail('legacy.json', `duplicate slug ${e.slug}`);
    legacyIds.add(e.id);
    legacySlugs.add(e.slug);
  }

  // ---- Lessons -------------------------------------------------------------
  const files = readLessonFiles(paths);
  const slugs = new Set();
  const titles = new Map();
  const lessonBySlug = new Map();
  const allAliases = new Map(); // alias -> lesson slug
  if (!files.length) fail('lessons', 'no lessons found in content/lessons');

  for (const f of files) {
    if (f.error) {
      fail(`lessons/${f.file}`, `front-matter: ${f.error}`);
      continue;
    }
    const where = `lessons/${f.file}`;
    const { meta, body, stats } = f;
    lessonBySlug.set(meta.slug, meta);

    for (const key of ['slug', 'title', 'topic', 'kind', 'summary']) {
      if (!meta[key]) fail(where, `missing front-matter: ${key}`);
    }
    if (meta.slug) {
      if (!SLUG_RE.test(meta.slug)) fail(where, `slug "${meta.slug}" must be kebab-case`);
      if (`${meta.slug}.md` !== f.file) fail(where, `slug "${meta.slug}" != filename`);
      if (slugs.has(meta.slug)) fail(where, `duplicate slug ${meta.slug}`);
      slugs.add(meta.slug);
    }
    if (meta.title) {
      const key = meta.title.toLowerCase();
      if (titles.has(key)) fail(where, `duplicate title "${meta.title}" (also ${titles.get(key)})`);
      titles.set(key, f.file);
      if (isGuided) {
        if (meta.title.length > 60) fail(where, `title is ${meta.title.length} chars (max 60)`);
        const wordLetters = (meta.title.match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => /\p{L}/u.test(w));
        if (wordLetters.length < 2) fail(where, 'title needs at least two words with letters');
        if (/^pitfall\b/i.test(meta.title.trim())) fail(where, 'title must not begin with "Pitfall"');
      } else {
        if (!/[A-Za-z0-9]/.test(meta.title)) fail(where, 'title needs at least one letter or digit (used to sort A–Z)');
      }
    }
    if (meta.topic && !topicIds.has(meta.topic)) fail(where, `unknown topic "${meta.topic}"`);
    if (meta.kind && !kinds.includes(meta.kind)) fail(where, `kind "${meta.kind}" not one of ${kinds.join('|')}`);
    if (meta.summary) {
      if (meta.summary.length > 160) fail(where, `summary is ${meta.summary.length} chars (max 160)`);
      if (!/[.!?]$/.test(meta.summary.trim())) fail(where, 'summary should end with punctuation');
    }
    if (!Array.isArray(meta.tags) || meta.tags.length < 1 || meta.tags.length > 6)
      fail(where, `tags: need 1–6 (got ${Array.isArray(meta.tags) ? meta.tags.length : 0})`);

    if (isGuided) {
      if (!meta.goal) {
        fail(where, 'missing front-matter: goal');
      } else {
        if (meta.goal.length > 160) fail(where, `goal is ${meta.goal.length} chars (max 160)`);
        if (!/^\p{Lu}/u.test(meta.goal.trim())) fail(where, 'goal must start with a capital letter');
        if (!meta.goal.trim().endsWith('.')) fail(where, 'goal must end with a period');
      }

      if (meta.requires !== undefined) {
        if (!Array.isArray(meta.requires) || meta.requires.length > 4) {
          fail(where, 'requires: must be a list of 0–4 slugs');
        } else {
          for (const r of meta.requires) {
            if (!slugPosition.has(r)) {
              fail(where, `requires "${r}" is not in the course roadmap`);
            } else if (slugPosition.get(r) >= slugPosition.get(meta.slug)) {
              fail(where, `requires "${r}" must come before "${meta.slug}" in the roadmap`);
            }
          }
        }
      }

      if (meta.api !== undefined) {
        if (!Array.isArray(meta.api) || meta.api.length > 3 || !meta.api.every((s) => typeof s === 'string' && s.length <= 40)) {
          fail(where, 'api: must be a list of 0–3 items, each ≤ 40 chars');
        }
      }

      if (meta.aliases !== undefined) {
        if (!Array.isArray(meta.aliases)) {
          fail(where, 'aliases: must be an array');
        } else {
          for (const a of meta.aliases) {
            if (!SLUG_RE.test(a)) fail(where, `alias "${a}" must be kebab-case`);
            if (roadmapOrder.includes(a)) fail(where, `alias "${a}" collides with a lesson slug`);
            if (allAliases.has(a)) fail(where, `duplicate alias "${a}" (also in ${allAliases.get(a)})`);
            if (legacySlugs.has(a)) fail(where, `alias "${a}" collides with a legacy slug`);
            allAliases.set(a, meta.slug);
          }
        }
      }

      if (meta.related !== undefined) {
        if (!Array.isArray(meta.related) || meta.related.length > 4) {
          fail(where, 'related: must be 0–4 slugs');
        }
      }

      if (allTopicLessons.has(meta.slug) && allTopicLessons.get(meta.slug) !== meta.topic) {
        fail(where, `slug "${meta.slug}" is in topic "${meta.topic}" in front-matter but listed in "${allTopicLessons.get(meta.slug)}" in topics.json`);
      } else if (!allTopicLessons.has(meta.slug)) {
        fail(where, `slug "${meta.slug}" is not listed in topic "${meta.topic}" lessons`);
      }
    } else {
      if (!Array.isArray(meta.related) || meta.related.length < 2 || meta.related.length > 4)
        fail(where, `related: need 2–4 slugs (got ${Array.isArray(meta.related) ? meta.related.length : 0})`);
    }

    if (Array.isArray(meta.related) && meta.related.includes(meta.slug)) fail(where, 'related lists itself');
    if (meta.since !== undefined && !/^\d+(\.\d+)?$/.test(String(meta.since)))
      fail(where, `since "${meta.since}" must be a version like "17"`);

    // ---- body rules ----
    const prose = maskFences(body);
    if (isGuided) {
      checkGuidedLesson({
        where,
        meta,
        body,
        stats,
        prose,
        teachesCode,
        allowedFences,
        topicById,
        trackById,
        fail,
      });
    } else {
      checkBiteBody({
        where,
        body,
        stats,
        prose,
        teachesCode,
        allowedFences,
        course,
        fail,
      });
    }
  }

  // Cross references (needs the full slug set).
  for (const f of files) {
    if (f.error) continue;
    for (const r of f.meta.related ?? []) {
      if (!slugs.has(r)) {
        if (isGuided && roadmapOrder.includes(r)) {
          pending(`lessons/${f.file}`, `related "${r}" has no file yet`);
        } else {
          fail(`lessons/${f.file}`, `related "${r}" does not exist`);
        }
      }
    }
    if (isGuided) {
      for (const req of f.meta.requires ?? []) {
        if (slugPosition.has(req) && !slugs.has(req)) {
          pending(`lessons/${f.file}`, `requires "${req}" has no file yet`);
        }
      }
    }
  }
  if (course.home.featuredLesson) {
    if (!slugs.has(course.home.featuredLesson)) {
      if (isGuided && roadmapOrder.includes(course.home.featuredLesson)) {
        pending('course.json', `home.featuredLesson "${course.home.featuredLesson}" has no file yet`);
      } else {
        fail('course.json', `home.featuredLesson "${course.home.featuredLesson}" does not exist`);
      }
    }
  }

  // ---- Topic coverage & roadmap pending files --------------------------------
  const lessonsPerTopic = new Map();
  for (const m of lessonBySlug.values()) lessonsPerTopic.set(m.topic, (lessonsPerTopic.get(m.topic) ?? 0) + 1);
  for (const t of topics) {
    if (!lessonsPerTopic.get(t.id)) pending('topics', `"${t.id}" has no lessons yet`);
  }

  if (isGuided) {
    for (const s of roadmapOrder) {
      if (!slugs.has(s)) {
        pending('lessons', `slug "${s}" is listed in topic "${allTopicLessons.get(s)}" but has no file yet`);
      }
    }
  }

  // ---- Check legacy entries ------------------------------------------------
  for (const e of legacy) {
    if (!Array.isArray(e.lessons)) {
      fail('legacy.json', `${e.id}: lessons must be an array`);
      continue;
    }
    if (e.lessons.length === 0) pending('legacy', `${e.id} (${e.slug}) is not migrated yet`);
    for (const s of e.lessons) {
      if (!slugs.has(s)) {
        if (isGuided && roadmapOrder.includes(s)) {
          pending('legacy', `${e.id}: lesson "${s}" has no file yet`);
        } else {
          fail('legacy.json', `${e.id}: lesson "${s}" does not exist`);
        }
      }
    }
  }

  // ---- Question bank -------------------------------------------------------
  let bank = [];
  if (!existsSync(paths.bank)) {
    fail('quiz', 'quiz/questions.json missing');
  } else {
    try {
      bank = JSON.parse(readFileSync(paths.bank, 'utf8'));
    } catch (e) {
      fail('quiz', `invalid JSON: ${e.message}`);
    }
    if (!Array.isArray(bank)) {
      fail('quiz', 'questions.json must be an array');
      bank = [];
    }
  }

  const ids = new Set();
  const perTopic = new Map();
  for (const q of bank) {
    const where = `quiz/${q.id ?? '?'}`;
    if (!q.id || !/^[a-z0-9-]+$/.test(q.id)) fail(where, 'id must be lowercase kebab-case');
    if (ids.has(q.id)) fail(where, 'duplicate question id');
    ids.add(q.id);
    if (!topicIds.has(q.topic)) fail(where, `unknown topic "${q.topic}"`);
    else perTopic.set(q.topic, (perTopic.get(q.topic) ?? 0) + 1);
    if (q.lesson !== undefined) {
      if (isGuided && allAliases.has(q.lesson)) {
        fail(where, `quiz question references alias "${q.lesson}"; must use current lesson slug "${allAliases.get(q.lesson)}"`);
      } else {
        const l = lessonBySlug.get(q.lesson);
        if (!l) {
          if (isGuided && roadmapOrder.includes(q.lesson)) {
            pending(where, `lesson "${q.lesson}" has no file yet`);
          } else {
            fail(where, `lesson "${q.lesson}" does not exist`);
          }
        } else if (l.topic !== q.topic) {
          fail(where, `lesson "${q.lesson}" is in topic "${l.topic}", not "${q.topic}"`);
        }
      }
    }
    if (!QUESTION_TYPES.includes(q.type)) fail(where, `bad type "${q.type}"`);
    if (!q.prompt) fail(where, 'missing prompt');
    if (!q.explanation) fail(where, 'missing explanation');
    const optIds = Array.isArray(q.options) ? q.options.map((o) => o.id) : [];
    switch (q.type) {
      case 'single-choice':
        if (!q.options || q.options.length < 2) fail(where, 'needs ≥2 options');
        if (new Set(optIds).size !== optIds.length) fail(where, 'duplicate option id');
        if (!optIds.includes(q.answer)) fail(where, 'answer is not an option id');
        break;
      case 'multiple-choice':
        if (!q.options || q.options.length < 2) fail(where, 'needs ≥2 options');
        if (new Set(optIds).size !== optIds.length) fail(where, 'duplicate option id');
        if (!Array.isArray(q.answer) || q.answer.length < 1) fail(where, 'answer must be a non-empty array');
        else if (!q.answer.every((a) => optIds.includes(a))) fail(where, 'answer has an unknown option id');
        break;
      case 'fill-blank':
        if (!Array.isArray(q.answer) || q.answer.length < 1) fail(where, 'answer must be a non-empty array');
        break;
      case 'ordering': {
        const itemIds = Array.isArray(q.items) ? q.items.map((o) => o.id) : [];
        if (itemIds.length < 2) fail(where, 'needs ≥2 items');
        if (!Array.isArray(q.answer) || q.answer.length !== itemIds.length) fail(where, 'answer must order every item');
        else if ([...q.answer].sort().join() !== [...itemIds].sort().join())
          fail(where, 'answer is not a permutation of the item ids');
        break;
      }
      case 'match-pair':
        if (!Array.isArray(q.pairs) || q.pairs.length < 2) fail(where, 'needs ≥2 pairs');
        else if (!q.pairs.every((p) => p.left && p.right)) fail(where, 'each pair needs left and right');
        // The UI keys rows by `left` and lists every `right` as a dropdown option, so both must be unique.
        else if (new Set(q.pairs.map((p) => p.left)).size !== q.pairs.length) fail(where, 'duplicate left value');
        else if (new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length) fail(where, 'duplicate right value');
        break;
    }
  }
  for (const t of topics) {
    const n = perTopic.get(t.id) ?? 0;
    if (!lessonsPerTopic.get(t.id)) {
      if (n === 0) pending('quiz', `topic "${t.id}" has no questions yet`);
    } else if (n < MIN_QUESTIONS_PER_TOPIC) {
      fail('quiz', `topic "${t.id}" has ${n} questions (need ≥ ${MIN_QUESTIONS_PER_TOPIC})`);
    }
  }

  const minutes = files.filter((f) => !f.error).map((f) => f.stats.minutes);
  const avg = minutes.length ? (minutes.reduce((a, b) => a + b, 0) / minutes.length).toFixed(1) : '0';
  const summary = `${course.name}: ${files.length} lessons (avg ${avg} min), ${bank.length} questions, ${legacy.length} legacy entries`;
  return { errors, warnings, summary };
}

/** Prints the result the way the CLI shows it. Returns true when the course may ship. */
export function reportValidation({ errors, warnings, summary }, { strict = false } = {}) {
  if (warnings.length) {
    console.warn(`\n⚠ ${warnings.length} item(s) still to finish (errors with --strict):`);
    const shown = warnings.slice(0, 12);
    for (const w of shown) console.warn('  - ' + w);
    if (warnings.length > shown.length) console.warn(`  … and ${warnings.length - shown.length} more`);
  }
  if (errors.length) {
    console.error(`\n✗ Course validation FAILED with ${errors.length} problem(s):\n`);
    for (const e of errors) console.error('  - ' + e);
    console.error('');
    return false;
  }
  console.log(`\n✓ Course validation passed${strict ? ' (strict)' : ''}. ${summary}.\n`);
  return true;
}
