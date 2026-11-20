#!/usr/bin/env node
// scripts/revamp/diagnose.mjs
// Analyzes a course for revamp diagnosis (Step R1 in course-shell/REVAMP_PLAN.md).
//
// Usage:
//   node scripts/revamp/diagnose.mjs <course-path> [--write]
//   npm run revamp:diagnose -- ../<course> [--write]

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, basename, relative } from 'node:path';

const args = process.argv.slice(2);
const writeFlag = args.includes('--write');
const courseArg = args.find((a) => !a.startsWith('-'));

if (!courseArg) {
  console.error('Usage: node scripts/revamp/diagnose.mjs <course-path> [--write]');
  process.exit(2);
}

const courseDir = resolve(process.cwd(), courseArg);
if (!existsSync(courseDir)) {
  console.error(`✗ Course directory not found: ${courseDir}`);
  process.exit(2);
}

// Helper: parse YAML front-matter
function parseFrontMatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  }
  return meta;
}

// Detect group A vs group B
const hasBitesLessons = existsSync(join(courseDir, 'content', 'lessons'));
const hasLegacyPublic = existsSync(join(courseDir, 'public', 'content'));

if (hasBitesLessons) {
  diagnoseGroupA();
} else if (hasLegacyPublic) {
  diagnoseGroupB();
} else {
  console.error(`✗ Unrecognized course structure at ${courseDir}. Neither content/lessons nor public/content found.`);
  process.exit(2);
}

function diagnoseGroupA() {
  const lessonDir = join(courseDir, 'content', 'lessons');
  const files = readdirSync(lessonDir).filter((f) => f.endsWith('.md'));

  let courseName = basename(courseDir);
  const courseJsonPath = join(courseDir, 'course.json');
  if (existsSync(courseJsonPath)) {
    try {
      const cfg = JSON.parse(readFileSync(courseJsonPath, 'utf8'));
      if (cfg.name) courseName = cfg.name;
    } catch {}
  }

  const topicsPath = join(courseDir, 'content', 'topics.json');
  let topicsList = [];
  if (existsSync(topicsPath)) {
    try {
      topicsList = JSON.parse(readFileSync(topicsPath, 'utf8'));
    } catch {}
  }

  const lessons = [];
  const kindCounts = {};
  let pitfallTitles = 0;
  let apiTitles = 0;
  let goDeeperCount = 0;
  let diagramCount = 0;
  let imageCount = 0;
  let tableOnlyVisualCount = 0;
  const sentenceLengths = [];
  let sentencesOver25 = 0;

  for (const f of files) {
    const raw = readFileSync(join(lessonDir, f), 'utf8');
    const meta = parseFrontMatter(raw);
    const slug = meta.slug || f.replace(/\.md$/, '');
    const title = meta.title || slug;
    const kind = meta.kind || 'unknown';
    const topic = meta.topic || 'unknown';

    kindCounts[kind] = (kindCounts[kind] || 0) + 1;

    // Pitfall titles
    if (title.startsWith('Pitfall:') || title.startsWith('Pitfall :')) {
      pitfallTitles++;
    }

    // API titles: starts with lowercase or @, and has no colon ':'
    if (/^[a-z@]/.test(title) && !title.includes(':')) {
      apiTitles++;
    }

    // Go deeper
    if (/^##\s+Go deeper/m.test(raw)) {
      goDeeperCount++;
    }

    // Diagrams & visuals
    const hasDiagram = /```(?:flow|sequence|tree|diagram|mermaid)/.test(raw);
    const hasImage = /!\[.*?\]\(.*?\)/.test(raw);
    const hasTable = /^\|.*\|$/m.test(raw);

    if (hasDiagram) {
      diagramCount++;
    }
    if (hasImage) {
      imageCount++;
    }
    if (hasTable && !hasDiagram && !hasImage) {
      tableOnlyVisualCount++;
    }

    // Sentence lengths in body
    let body = raw.replace(/^---[\s\S]*?---/, '');
    body = body.replace(/```[\s\S]*?```/g, '');
    body = body.replace(/^#+.*$/gm, '');
    body = body.replace(/^\|.*$/gm, '');

    const sentences = body.split(/(?<=[.?!])\s+/);
    for (const s of sentences) {
      const clean = s.trim().replace(/^[-*|>\s]+/, '').trim();
      if (!clean) continue;
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        sentenceLengths.push(words.length);
        if (words.length > 25) {
          sentencesOver25++;
        }
      }
    }

    lessons.push({ file: f, slug, title, kind, topic });
  }

  sentenceLengths.sort((a, b) => a - b);
  const medianSentence = sentenceLengths.length > 0
    ? sentenceLengths[Math.floor(sentenceLengths.length / 2)]
    : 0;

  // Group lessons by topic for A–Z display listing
  const lessonsByTopic = new Map();
  for (const l of lessons) {
    if (!lessonsByTopic.has(l.topic)) {
      lessonsByTopic.set(l.topic, []);
    }
    lessonsByTopic.get(l.topic).push(l);
  }

  // Format kind summary string
  const kindSummary = Object.entries(kindCounts)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');

  const topicCount = topicsList.length > 0 ? topicsList.length : lessonsByTopic.size;
  const tableOnlyPct = files.length > 0 ? Math.round((tableOnlyVisualCount / files.length) * 100) : 0;

  // Build report markdown
  const now = new Date().toISOString().slice(0, 10);
  let md = `# Chẩn đoán khóa ${courseName} cũ\n\n`;
  md += `Kết quả bước R1 (mục 6.3 của \`course-shell/REVAMP_PLAN.md\`) cho khóa ${courseName}, lập ngày ${now}.\n`;
  md += `Đo trên ${files.length} bài \`bites\`.\n\n`;

  md += `| Số liệu | Giá trị |\n`;
  md += `|---|---|\n`;
  md += `| Số bài | ${files.length}, trong ${topicCount} chủ đề |\n`;
  md += `| Loại bài | ${kindSummary} |\n`;
  md += `| Tiêu đề chỉ là tên API | ${apiTitles} |\n`;
  md += `| Tiêu đề bắt đầu bằng "Pitfall:" | ${pitfallTitles} |\n`;
  md += `| Bài có mục *Go deeper* | ${goDeeperCount} / ${files.length} |\n`;
  md += `| Bài chỉ có bảng làm visual | ${tableOnlyVisualCount} (${tableOnlyPct}%) |\n`;
  md += `| Bài có sơ đồ | ${diagramCount} |\n`;
  md += `| Bài có ảnh | ${imageCount} |\n`;
  md += `| Độ dài câu | trung vị ${medianSentence} từ; ${sentencesOver25} câu dài hơn 25 từ |\n\n`;

  md += `## Danh sách bài theo thứ tự A–Z của từng chủ đề\n\n`;

  // Sort topics according to topics.json order if available, else alphabetically
  const sortedTopics = topicsList.length > 0
    ? topicsList.map((t) => ({ id: t.id, title: t.title }))
    : Array.from(lessonsByTopic.keys()).sort().map((id) => ({ id, title: id }));

  for (const t of sortedTopics) {
    const list = lessonsByTopic.get(t.id) || [];
    // Sort lessons alphabetically by title (case-insensitive)
    list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
    md += `### ${t.title || t.id} (${list.length} bài)\n\n`;
    for (const item of list) {
      md += `- ${item.title} (\`${item.slug}\`, kind: ${item.kind})\n`;
    }
    md += `\n`;
  }

  // Preserve qualitative diagnosis if file already exists with hand-written notes
  const diagPath = join(courseDir, 'revamp', 'DIAGNOSIS.md');
  if (existsSync(diagPath)) {
    const existing = readFileSync(diagPath, 'utf8');
    const notesIdx = existing.indexOf('## Chẩn đoán: từ phản hồi đến nguyên nhân');
    if (notesIdx !== -1) {
      md += existing.slice(notesIdx);
    }
  }

  console.log(`=== Chẩn đoán: ${courseName} (Nhóm A, ${files.length} bài, ${topicCount} chủ đề) ===`);
  console.log(`Loại bài: ${kindSummary}`);
  console.log(`Tiêu đề API: ${apiTitles} | Tiêu đề Pitfall: ${pitfallTitles}`);
  console.log(`Bài có Go deeper: ${goDeeperCount}/${files.length}`);
  console.log(`Visual: bảng duy nhất ${tableOnlyVisualCount} (${tableOnlyPct}%), sơ đồ ${diagramCount}, ảnh ${imageCount}`);
  console.log(`Độ dài câu: trung vị ${medianSentence} từ, ${sentencesOver25} câu > 25 từ`);

  if (writeFlag) {
    const revampDir = join(courseDir, 'revamp');
    mkdirSync(revampDir, { recursive: true });
    writeFileSync(diagPath, md, 'utf8');
    console.log(`✓ Wrote ${relative(process.cwd(), diagPath)}`);
  }
}

function diagnoseGroupB() {
  const publicContent = join(courseDir, 'public', 'content');
  const manifestPath = join(publicContent, 'course-manifest.json');

  let courseName = basename(courseDir);
  let lessons = [];

  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      if (manifest.title || manifest.name) courseName = manifest.title || manifest.name;
      if (Array.isArray(manifest.lessons)) {
        lessons = manifest.lessons;
      }
    } catch {}
  }

  // If no manifest lessons, scan folders
  if (lessons.length === 0) {
    const levels = ['beginner', 'intermediate', 'advanced'].filter((lvl) =>
      existsSync(join(publicContent, lvl)),
    );
    for (const lvl of levels) {
      const files = readdirSync(join(publicContent, lvl)).filter((f) => f.endsWith('.md'));
      for (const f of files) {
        lessons.push({
          id: f.replace(/\.md$/, ''),
          slug: f.replace(/\.md$/, ''),
          title: f.replace(/\.md$/, ''),
          level: lvl,
          file: `${lvl}/${f}`,
        });
      }
    }
  }

  let totalMinutes = 0;
  let totalSections = 0;
  const analyzedLessons = [];

  for (const l of lessons) {
    const filePath = join(publicContent, l.file || `${l.level || 'beginner'}/${l.slug}.md`);
    let minutes = l.duration || 0;
    let sectionCount = 0;

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      const body = content.replace(/^---[\s\S]*?---/, '');
      const words = body.split(/\s+/).filter(Boolean).length;
      const codeLines = (body.match(/```[\s\S]*?```/g) || [])
        .map((b) => b.split('\n').length)
        .reduce((a, b) => a + b, 0);

      if (!minutes) {
        minutes = Math.max(1, Math.round(words / 180 + codeLines / 20));
      }
      sectionCount = (body.match(/^##\s+/gm) || []).length;
    }

    totalMinutes += minutes;
    totalSections += sectionCount;
    analyzedLessons.push({
      id: l.id || l.slug,
      slug: l.slug,
      title: l.title || l.slug,
      level: l.level || 'unknown',
      minutes,
      sectionCount,
    });
  }

  const avgMinutes = lessons.length > 0 ? (totalMinutes / lessons.length).toFixed(1) : 0;
  const avgSections = lessons.length > 0 ? (totalSections / lessons.length).toFixed(1) : 0;

  const now = new Date().toISOString().slice(0, 10);
  let md = `# Chẩn đoán khóa ${courseName} cũ (Nhóm B)\n\n`;
  md += `Kết quả bước R1 (mục 6.3 của \`course-shell/REVAMP_PLAN.md\`) cho khóa ${courseName}, lập ngày ${now}.\n`;
  md += `Đo trên ${lessons.length} bài dài.\n\n`;

  md += `| Số liệu | Giá trị |\n`;
  md += `|---|---|\n`;
  md += `| Số bài | ${lessons.length} |\n`;
  md += `| Tổng thời gian đọc | ${totalMinutes} phút (trung bình ${avgMinutes} phút/bài) |\n`;
  md += `| Tổng số mục (h2) | ${totalSections} mục (trung bình ${avgSections} mục/bài) |\n\n`;

  md += `## Chi tiết từng bài\n\n`;
  md += `| # | ID | Tiêu đề | Cấp độ | Phút đọc | Số mục (h2) |\n`;
  md += `|---|---|---|---|---|---|\n`;

  analyzedLessons.forEach((l, i) => {
    md += `| ${i + 1} | \`${l.id}\` | ${l.title} | ${l.level} | ${l.minutes}m | ${l.sectionCount} |\n`;
  });
  md += `\n`;

  console.log(`=== Chẩn đoán: ${courseName} (Nhóm B, ${lessons.length} bài dài) ===`);
  console.log(`Tổng phút đọc: ${totalMinutes}m (trung bình ${avgMinutes}m/bài)`);
  console.log(`Tổng số mục h2: ${totalSections} (trung bình ${avgSections} mục/bài)`);

  if (writeFlag) {
    const revampDir = join(courseDir, 'revamp');
    mkdirSync(revampDir, { recursive: true });
    const diagPath = join(revampDir, 'DIAGNOSIS.md');
    writeFileSync(diagPath, md, 'utf8');
    console.log(`✓ Wrote ${relative(process.cwd(), diagPath)}`);
  }
}
