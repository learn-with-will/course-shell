// The one command for working on a course with this shell.
//
//   node scripts/course.mjs <command> [course folder] [options]
//
//   dev       prepare, start the dev server, and re-prepare when a course file changes
//   build     prepare, then `ng build` (extra options go to ng, e.g. --base-href /my-course/)
//   test      prepare, then `ng test`
//   validate  check the course; add --strict for the release rules
//   prepare   only write the generated files
//
// The course folder is the first argument, or $COURSE_DIR, or examples/demo-course.
// Through npm: `npm run dev -- ../angular`, `npm run validate -- ../angular --strict`.
import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { resolve } from 'node:path';
import { resolveCourseDir, shellRoot } from './course-config.mjs';
import { prepareCourse } from './prepare-course.mjs';
import { reportValidation, validateCourse } from './validate-course.mjs';

const COMMANDS = ['dev', 'build', 'test', 'validate', 'prepare'];
const [command, ...rest] = process.argv.slice(2);
if (!COMMANDS.includes(command)) {
  console.error(`Usage: node scripts/course.mjs <${COMMANDS.join('|')}> [course folder] [options]`);
  process.exit(2);
}

let courseDir;
try {
  courseDir = resolveCourseDir(rest[0] && !rest[0].startsWith('-') ? rest.shift() : undefined);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(2);
}

function prepare() {
  const info = prepareCourse(courseDir);
  console.log(
    `prepare: ${info.name} — ${info.lessons} lessons in ${info.topics} topics, ${info.languages} code language file(s) — from ${courseDir}`,
  );
}

/** Runs the Angular CLI in the shell folder and exits with its status. */
function ng(args) {
  const cli = resolve(shellRoot, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
  const child = spawn(process.execPath, [cli, ...args], { cwd: shellRoot, stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 1));
}

/** Re-prepares shortly after any file in the course folder changes. */
function watchCourse() {
  let timer;
  watch(courseDir, { recursive: true }, (_event, file) => {
    if (!file || /(^|[\\/])(\.git|node_modules|dist)([\\/]|$)/.test(file)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        prepare();
      } catch (e) {
        console.error(`✗ ${e.message}`); // keep serving the last good build
      }
    }, 200);
  });
}

if (command === 'validate') {
  const strict = rest.includes('--strict');
  process.exit(reportValidation(validateCourse(courseDir, { strict }), { strict }) ? 0 : 1);
}

try {
  prepare();
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}

if (command === 'dev') {
  watchCourse();
  ng(['serve', ...rest]);
} else if (command === 'build') {
  ng(['build', ...rest]);
} else if (command === 'test') {
  ng(['test', ...rest]);
}
