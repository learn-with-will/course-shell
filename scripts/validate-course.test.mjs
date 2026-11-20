import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateCourse } from './validate-course.mjs';
import { shellRoot } from './course-config.mjs';

const DEMO_COURSE = resolve(shellRoot, 'examples', 'demo-course');
const GUIDED_COURSE = resolve(shellRoot, 'examples', 'guided-course');

function withTempCourse(modify, run) {
  const tempDir = mkdtempSync(join(tmpdir(), 'guided-test-'));
  try {
    cpSync(GUIDED_COURSE, tempDir, { recursive: true });
    modify(tempDir);
    return run(tempDir);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('validateCourse', () => {
  it('passes demo-course (bites format unchanged)', () => {
    const res = validateCourse(DEMO_COURSE, { strict: true });
    assert.equal(res.errors.length, 0, `Expected 0 errors, got: ${res.errors.join(', ')}`);
  });

  it('passes guided-course sample course with strict mode', () => {
    const res = validateCourse(GUIDED_COURSE, { strict: true });
    assert.equal(res.errors.length, 0, `Expected 0 errors, got: ${res.errors.join(', ')}`);
  });

  it('V1: fails if a chapter has an invalid track or lessons is not an array', () => {
    withTempCourse(
      (dir) => {
        const topicsFile = join(dir, 'content', 'topics.json');
        const topics = JSON.parse(readFileSync(topicsFile, 'utf8'));
        topics[0].track = 'non-existent-track';
        writeFileSync(topicsFile, JSON.stringify(topics, null, 2));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('missing or invalid track')),
          `Expected missing or invalid track error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V2: fails if a slug appears in more than one chapter', () => {
    withTempCourse(
      (dir) => {
        const topicsFile = join(dir, 'content', 'topics.json');
        const topics = JSON.parse(readFileSync(topicsFile, 'utf8'));
        topics[1].lessons.push('what-is-guided');
        writeFileSync(topicsFile, JSON.stringify(topics, null, 2));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('appears in more than one topic')),
          `Expected duplicate slug error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V3: fails if a lesson file is not in lessons of the topic in its front-matter', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(file, content.replace('topic: getting-started', 'topic: polishing-lessons'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('is in topic "polishing-lessons" in front-matter but listed in "getting-started"')),
          `Expected topic mismatch error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V4: warns when a listed slug has no file, and fails with --strict', () => {
    withTempCourse(
      (dir) => {
        const topicsFile = join(dir, 'content', 'topics.json');
        const topics = JSON.parse(readFileSync(topicsFile, 'utf8'));
        topics[0].lessons.push('unwritten-lesson');
        writeFileSync(topicsFile, JSON.stringify(topics, null, 2));
      },
      (dir) => {
        const nonStrict = validateCourse(dir, { strict: false });
        assert.ok(
          nonStrict.warnings.some((w) => w.includes('unwritten-lesson') && w.includes('has no file yet')),
          `Expected pending warning, got: ${nonStrict.warnings.join(', ')}`,
        );
        const strict = validateCourse(dir, { strict: true });
        assert.ok(
          strict.errors.some((e) => e.includes('unwritten-lesson') && e.includes('has no file yet')),
          `Expected strict error for unwritten lesson, got: ${strict.errors.join(', ')}`,
        );
      },
    );
  });

  it('V5: fails if front-matter violates rules (e.g. title starts with Pitfall)', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(file, content.replace('title: "Understand guided courses"', 'title: "Pitfall: bad title"'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('must not begin with "Pitfall"')),
          `Expected Pitfall title error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V6: fails if requires does not come before the lesson in the roadmap', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(file, content.replace('requires: []', 'requires: [write-a-task]'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('requires "write-a-task" must come before "what-is-guided" in the roadmap')),
          `Expected requires ordering error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V7: fails if an alias collides with a lesson slug', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(file, content.replace('aliases: [old-what-is-guided]', 'aliases: [write-a-task]'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('alias "write-a-task" collides with a lesson slug')),
          `Expected alias collision error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V8: fails if sections are missing or out of order according to kind', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'write-a-task.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(file, content.replace('## Try it', '## Out of order Try it'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('missing section "## Try it"')),
          `Expected missing Try it section error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V9: fails if Recap does not have exactly 3 bullets', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(
          file,
          content.replace(
            '- Navigation flows sequentially so learners never wonder what to read next.',
            '',
          ),
        );
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('"## Recap" needs exactly 3 bullets (got 2)')),
          `Expected Recap bullets error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V10: fails if Going further is present in a non-advanced track', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'what-is-guided.md');
        const content = readFileSync(file, 'utf8');
        writeFileSync(
          file,
          content.replace(
            '## Recap',
            '## Going further\n\nSome advanced tips that belong only in advanced tracks.\n\n## Recap',
          ),
        );
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('only allowed in advanced tracks')),
          `Expected Going further track level error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V11: fails if a task lesson teaches code but has no code block', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'content', 'lessons', 'write-a-task.md');
        const content = readFileSync(file, 'utf8');
        // Replace fenced code block with plain text
        writeFileSync(file, content.replace(/```markdown[\s\S]*?```/, 'Plain text without code'));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('needs at least one code block')),
          `Expected code block error, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });

  it('V12: fails if a quiz question references an alias instead of the lesson slug', () => {
    withTempCourse(
      (dir) => {
        const file = join(dir, 'quiz', 'questions.json');
        const questions = JSON.parse(readFileSync(file, 'utf8'));
        questions[0].lesson = 'old-what-is-guided';
        writeFileSync(file, JSON.stringify(questions, null, 2));
      },
      (dir) => {
        const res = validateCourse(dir, { strict: true });
        assert.ok(
          res.errors.some((e) => e.includes('quiz question references alias "old-what-is-guided"')),
          `Expected alias error in quiz, got: ${res.errors.join(', ')}`,
        );
      },
    );
  });
});
