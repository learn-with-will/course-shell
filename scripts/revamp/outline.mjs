#!/usr/bin/env node
// scripts/revamp/outline.mjs
// Validates revamp/OUTLINE.md and generates content/topics.json (Step R2.7 in course-shell/REVAMP_PLAN.md).
//
// Usage:
//   node scripts/revamp/outline.mjs <course-path> [--write]
//   npm run revamp:outline -- ../<course> [--write]

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, basename, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const VALID_KINDS = new Set(['concept', 'task', 'build', 'troubleshoot']);

export function runCli(argv = process.argv.slice(2)) {
  const writeFlag = argv.includes('--write');
  const courseArg = argv.find((a) => !a.startsWith('-'));

  if (!courseArg) {
    console.error('Usage: node scripts/revamp/outline.mjs <course-path> [--write]');
    process.exit(2);
  }

  const courseDir = resolve(process.cwd(), courseArg);
  if (!existsSync(courseDir)) {
    console.error(`✗ Course directory not found: ${courseDir}`);
    process.exit(2);
  }

  const outlinePath = join(courseDir, 'revamp', 'OUTLINE.md');
  if (!existsSync(outlinePath)) {
    console.error(`✗ Outline file not found: ${outlinePath}`);
    process.exit(2);
  }

  const outlineContent = readFileSync(outlinePath, 'utf8');
  const { topics, rows, parseErrors } = parseOutline(outlineContent);
  const oldSourcesInfo = findOldSources(courseDir);
  const { errors, kindCounts, missingSources } = validateOutline(topics, rows, oldSourcesInfo);
  const allErrors = [...parseErrors, ...errors];

  const trackSet = new Set(topics.map((t) => t.track).filter(Boolean));
  const kindSummary = Object.entries(kindCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  console.log(`=== Outline: ${basename(courseDir)} ===`);
  console.log(`Chặng: ${trackSet.size} | Chương: ${topics.length} | Bài: ${rows.length}`);
  console.log(`Loại bài: ${kindSummary}`);
  if (oldSourcesInfo.sources.size > 0) {
    const covered = oldSourcesInfo.sources.size - missingSources.length;
    console.log(`Nguồn cũ (${oldSourcesInfo.type}): phủ ${covered}/${oldSourcesInfo.sources.size} bài cũ`);
  }

  if (allErrors.length > 0) {
    console.error(`\n✗ ${allErrors.length} validation error(s):`);
    for (const e of allErrors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  console.log('\n✓ Outline validation passed (no duplicate slugs, valid kinds, aliases clean, all old sources covered).');

  if (writeFlag) {
    const contentDir = join(courseDir, 'content');
    mkdirSync(contentDir, { recursive: true });
    const topicsJsonPath = join(contentDir, 'topics.json');
    writeFileSync(topicsJsonPath, JSON.stringify(topics, null, 2) + '\n', 'utf8');
    console.log(`✓ Wrote ${relative(process.cwd(), topicsJsonPath)} (${topics.length} topics)`);
  }

  return { topics, rows, errors: allErrors };
}

// Parse OUTLINE.md
export function parseOutline(content) {
  const lines = content.split(/\r?\n/);
  let currentTrack = null;
  const topics = [];
  let currentTopic = null;
  const rows = [];
  const parseErrors = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check track header: `track: <id>` · `level: <level>` · blurb: <blurb>
    const trackMatch = line.match(/^`track:\s*([a-z0-9-]+)`/);
    if (trackMatch) {
      currentTrack = trackMatch[1];
      continue;
    }

    // Check chapter header: ### Chương <n> · <Title>
    const chMatch = line.match(/^###\s+Chương\s+(\d+)\s+·\s+(.+)$/);
    if (chMatch) {
      const order = parseInt(chMatch[1], 10);
      const title = chMatch[2].trim();

      // Look ahead for `topic: <id>` · blurb: <blurb>
      let id = null;
      let blurb = null;
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const metaLine = lines[j].trim();
        const metaMatch = metaLine.match(/^`topic:\s*([a-z0-9-]+)`\s*·\s*blurb:\s*(.+)$/);
        if (metaMatch) {
          id = metaMatch[1];
          blurb = metaMatch[2].trim();
          break;
        }
      }

      if (!id) {
        parseErrors.push(`Chapter ${order} "${title}" is missing "\`topic: <id>\` · blurb: <blurb>" metadata line`);
      }

      currentTopic = {
        id: id || `chapter-${order}`,
        title,
        blurb: blurb || '',
        order,
        track: currentTrack,
        lessons: [],
      };
      topics.push(currentTopic);
      continue;
    }

    // Check table row: | # | Title | slug | kind | aliases | from | notes |
    if (line.startsWith('|') && !line.includes('---') && !line.includes('Title') && currentTopic) {
      const cols = line.split('|').map((c) => c.trim());
      if (cols.length < 8) continue;

      const num = cols[1];
      const title = cols[2];
      const slugMatch = cols[3].match(/`([^`]+)`/);
      const slug = slugMatch ? slugMatch[1] : cols[3];
      const kind = cols[4];
      const aliasesRaw = cols[5];
      const fromRaw = cols[6];
      const notes = cols[7] || '';

      const aliases = [];
      if (aliasesRaw && aliasesRaw !== '—' && aliasesRaw !== '-') {
        const m = aliasesRaw.matchAll(/`([^`]+)`/g);
        for (const match of m) {
          aliases.push(match[1]);
        }
      }

      const fromSources = [];
      if (fromRaw && fromRaw !== '—' && fromRaw !== '-') {
        const m = fromRaw.matchAll(/`([^`]+)`/g);
        for (const match of m) {
          fromSources.push(match[1]);
        }
      }

      rows.push({
        num,
        title,
        slug,
        kind,
        aliases,
        fromSources,
        notes,
        topicId: currentTopic.id,
      });

      currentTopic.lessons.push(slug);
    }
  }

  return { topics, rows, parseErrors };
}

// Find all old sources in the course repository
function findOldSources(coursePath) {
  const sources = new Set();
  const lessonDir = join(coursePath, 'content', 'lessons');
  if (existsSync(lessonDir)) {
    const files = readdirSync(lessonDir).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      sources.add(f.replace(/\.md$/, ''));
    }
    return { sources, type: 'bites' };
  }

  const manifestPath = join(coursePath, 'public', 'content', 'course-manifest.json');
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(manifest.lessons)) {
        for (const l of manifest.lessons) {
          if (l.id) sources.add(l.id);
          if (l.slug) sources.add(l.slug);
        }
      }
      return { sources, type: 'legacy' };
    } catch {}
  }

  return { sources, type: 'none' };
}

// Validate parsed outline
export function validateOutline(topics, rows, oldSourcesInfo) {
  const errors = [];
  const seenSlugs = new Map();
  const seenAliases = new Map();
  const allFromSources = new Set();
  const kindCounts = {};

  for (const r of rows) {
    // 1. Slug uniqueness
    if (seenSlugs.has(r.slug)) {
      errors.push(`Duplicate slug "${r.slug}" at row ${r.num} (already defined at ${seenSlugs.get(r.slug)})`);
    } else {
      seenSlugs.set(r.slug, r.num);
    }

    // 2. Kind validity
    kindCounts[r.kind] = (kindCounts[r.kind] || 0) + 1;
    if (!VALID_KINDS.has(r.kind)) {
      errors.push(`Invalid kind "${r.kind}" for lesson "${r.slug}" (${r.num}). Allowed: ${Array.from(VALID_KINDS).join(', ')}`);
    }

    // 3. Aliases
    for (const alias of r.aliases) {
      if (seenAliases.has(alias)) {
        errors.push(`Duplicate alias "${alias}" at row ${r.num} (already defined at ${seenAliases.get(alias)})`);
      } else {
        seenAliases.set(alias, r.num);
      }
    }

    // 4. From sources
    for (const src of r.fromSources) {
      allFromSources.add(src);
    }
  }

  // Check alias collision with slugs
  for (const [alias, rowNum] of seenAliases.entries()) {
    if (seenSlugs.has(alias)) {
      errors.push(`Alias collision: "${alias}" at row ${rowNum} is also used as a lesson slug at row ${seenSlugs.get(alias)}`);
    }
  }

  // 5. Check old sources coverage
  const missingSources = [];
  if (oldSourcesInfo.sources.size > 0) {
    for (const src of oldSourcesInfo.sources) {
      if (!allFromSources.has(src)) {
        missingSources.push(src);
      }
    }
    if (missingSources.length > 0) {
      errors.push(
        `Old sources missing in "from" column (${missingSources.length}/${oldSourcesInfo.sources.size}): ` +
        missingSources.slice(0, 10).join(', ') + (missingSources.length > 10 ? ` ... (+${missingSources.length - 10} more)` : '')
      );
    }
  }

  return { errors, kindCounts, missingSources, seenSlugs, seenAliases, allFromSources };
}

// Main execution when run as CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
