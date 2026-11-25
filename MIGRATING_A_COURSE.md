# Moving a course to the guided format

How to rebuild a course in the **guided** format: short lessons on an ordered path, written for
beginners. The writing rules are in [CONTENT_GUIDE.md → Guided format](CONTENT_GUIDE.md#guided-format);
this file is the procedure. It is written for a person or a coding agent to follow top to bottom.
Every step ends with a **Done when** line; do not start the next step before it holds.

`<course>` is the repository name (`react`, `redis`, …). All `npm` commands run from the
`course-shell` folder, with the course folder as the argument. The Angular course is the worked
example for every step: its course pack is `angular/revamp/` and its branch `revamp/pilot`.

## Where you start from

| | Group A: a bites course | Group B: an old course with its own app | Group C: a new course |
|---|---|---|---|
| Looks like | `course.json`, `content/lessons/*.md` (bites), `quiz/questions.json` | `package.json`, `src/`, 24 long lessons in `public/content/`, one quiz file per lesson | An empty repository and a prompt in `learning-portal/prompts/` |
| Content source | The committed bites | The long lessons and `public/quizzes/` | Primary sources only |
| Repository change | None | Becomes content-only ([step R0.4](#r0-prepare-the-repository)) | Start from `examples/guided-course` |
| `from` column in the outline | Old bite slugs | Old lesson id and section, e.g. `lesson-07 §Examples` | Empty |
| `aliases` | Old slugs merged into or renamed to this lesson | None | None |
| `content/legacy.json` | Rewrite its `lessons` to the new slugs | Create it: each old long lesson → the new lessons that replaced it | None |
| Progress kept by | `aliases` and `legacy.json` | `legacy.json` | — |

For group C, `prompts/new-course-prompt.md` in the `learning-portal` folder (not in this
repository) is the procedure; it follows the same steps without the parts about old content.

## What must survive

- **The URL.** The course stays at `https://learn-with-will.github.io/<course>/`.
- **The `id` in `course.json`.** It names the saved progress. Never change it.
- **Old links.** An old lesson address must open the lesson that replaced it: through `aliases`
  (old bite slugs) or `legacy.json` (old long lessons).
- **Learners' progress.** On load, the shell moves progress saved under an alias to the new slug,
  and reads the old long-lesson shell's progress once through `legacy.json`.

## The course pack

Each course keeps its own plan in a `revamp/` folder, committed on the revamp branch:

| File | Required | What it holds |
|---|---|---|
| `DIAGNOSIS.md` | yes | What is wrong with the old course, with numbers and quoted examples (R1) |
| `OUTLINE.md` | yes | Tracks, chapters, lessons, slugs, kinds, aliases, sources. **The only source** of the course structure |
| `BRIEFS.md` | yes | For each lesson of the chapter being written: goal, key points, checked facts (R4) |
| `SAMPLE_LESSON.md` | no | One finished lesson to fix the voice (required for a pilot course) |
| `FEEDBACK.md` | yes | The owner's comments at each review, and what was done about them |

### `OUTLINE.md` format

```markdown
# Outline: <Course name>

<Old source (commit), example setting, track/chapter/lesson totals, target learner.>

## Chặng · <Title> (<optional translated name>)

`track: <id>` · `level: beginner|intermediate|advanced` · blurb: <one English sentence>

<What the learner can do at the end of the track.>

### Chương <n> · <Title>

`topic: <id>` · blurb: <one English sentence>

| # | Title | slug | kind | aliases | from | notes |
|---|---|---|---|---|---|---|
| 1.1 | What is Angular? | `what-is-angular` | concept | — | `what-is-angular` | Rewrite |
```

- `#` is `<chapter>.<lesson>`; the order of the rows is the reading order.
- `slug`: keep the old slug when the lesson matches one old lesson or merges several; give a new,
  short slug (≤ 40 characters) for a new or split lesson, or when the old slug misleads (a
  `pitfall-…` slug for a lesson that teaches the right way).
- `aliases`: every old slug merged into or renamed to this lesson. A slug only *partly* reused
  elsewhere is not an alias there.
- `from`: every old source; "(part …)" when only part is used. The outline tool checks that every
  old source appears at least once.
- `notes`: New / Merge / Split / Rewrite / Move, and notes for the writer.

## Steps

### R0. Prepare the repository

1. Run `git status` in the course repository. If there are uncommitted changes, ask the owner
   whether to keep them. Never delete them yourself.
2. List the branches (`git branch -a`, `git ls-remote --heads origin`). Unfinished branches are
   reference material only, unless the owner says otherwise.
3. Create a clean worktree from the committed source:
   `git -C ../<course> worktree add -b revamp/guided ../<course>-revamp <source commit>`.
   Write `<source commit>` at the top of `OUTLINE.md`.
4. **Group B only: make the repository content-only** in the worktree.
   - Write `course.json` (start from [`examples/guided-course/course.json`](examples/guided-course/course.json)):

     | Field | Take it from |
     |---|---|
     | `id` | The repository name. It must equal the prefix of the old storage key (`PROGRESS_STORAGE_KEY` in `src/core/models/progress.ts`, e.g. `redis-learning-progress` → `redis`) |
     | `name`, `subject` | The wordmark in the old navbar, and the technology's name |
     | `description` | The old meta description or portal card text, as one sentence without the word "bite" |
     | `brand.color` | `--color-brand-600` in the old `src/index.css` (white text sits on it) |
     | `brand.scale`, `brand.gradient` | Optional: the old `--color-brand-50…950` values; three stops toward the old accent |
     | `brand.logo`, `brand.favicon` | Leave out: every course shares the shell's mark in its brand colours |
     | `codeLanguages` | The Prism languages the old `src/core/prism.ts` imported |

   - Delete the app: `src/`, `public/`, `scripts/`, `views/`, `server.js`, `index.html`,
     `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `node_modules/`,
     `dist/`. Keep `prompts/` and `.git/`. The old lessons stay readable with
     `git show <source commit>:public/content/…`.
   - Copy [`examples/demo-course/.github/workflows/deploy.yml`](examples/demo-course/.github/workflows/deploy.yml)
     unchanged. Reduce `.gitignore` to editor and system files. Rewrite `README.md`.
5. Add a preview entry `<course>-revamp-dev` (an unused port) to `learning-portal/.claude/launch.json`.

**Done when** `npm run dev -- ../<course>-revamp` opens the course.

### R1. Diagnose

Run `npm run revamp:diagnose -- ../<course>-revamp --write`. It writes the numbers into
`revamp/DIAGNOSIS.md`. Then read at least five old lessons and add notes on wording, examples and
how the lessons are split, each with the lesson name and a quoted sentence.

**Done when** `DIAGNOSIS.md` has the numbers and at least five quoted observations.

### R2. Plan the course pack

1. **Target learner:** what they know before the course (e.g. "HTML, CSS and basic JavaScript").
   Write it at the top of `OUTLINE.md`.
2. **One everyday example setting** for the whole course.
3. **Tracks and chapters:** 2–4 tracks; chapters by what the learner can do, ordered so that no
   chapter needs a later one.
4. **`OUTLINE.md`** in the format above, applying the merge/split and title rules of the content guide.
5. **`content/glossary.json`** for the first track: each term and the lesson that defines it.
6. **`course.json`:** add `format: "guided"`, `tracks` and `kinds`; remove "bite" from
   `description` and `home.*` (leave `home.headline` out to get the guided default).
7. Run `npm run revamp:outline -- ../<course>-revamp --write` to generate `content/topics.json`.

**Done when** the outline tool reports no errors and covers every old source.

### R3. Review 1: the outline

The owner reads `OUTLINE.md`: tracks, chapters, lesson titles. Record the comments in
`revamp/FEEDBACK.md`, change the outline, and run R2.7 again.

**Done when** the owner approves the outline.

### R4. The first chapter, and Review 2

1. Write `revamp/BRIEFS.md` for every lesson of chapter 1: number, slug, `kind`, `goal`,
   `requires`, the points of each section, and the facts you checked. Model:
   `angular/revamp/BRIEFS.md`.
2. Remove the old lessons from `content/lessons/` (group A) or the old content folder (group B).
   Set `quiz/questions.json` and `content/legacy.json` to `[]` until R7.
3. Write chapter 1 with the [lesson procedure](#writing-one-lesson) and its quiz.
4. The owner reads it in the browser and comments in `FEEDBACK.md`. A comment that is a general
   rule goes into [CONTENT_GUIDE.md](CONTENT_GUIDE.md), so every later course gets it.

**Done when** the owner approves the voice of this course.

#### Writing one lesson

| # | Do |
|---|---|
| 1 | Take number, slug, `topic`, `kind`, `aliases` and sources from `OUTLINE.md` |
| 2 | Read the old source (`git show <source commit>:<path>`) and the official documentation. The old lesson is a source of ideas; never copy its sentences |
| 3 | Write the `goal`. If it cannot be reached in 7 minutes, report it so the lesson can be split |
| 4 | List the new terms (one main, at most two minor) and add them to `glossary.json` |
| 5 | Set `requires`: everything the lesson uses must be taught earlier. If something is missing, report it; do not squeeze it in |
| 6 | Draft it with the template for its `kind` |
| 7 | Check the facts: run the code and the mistakes, copy the real output. Leave out anything you could not check |
| 8 | Decide whether a picture helps; add none if it does not |
| 9 | Go through the self-check list |
| 10 | `npm run validate -- ../<course>-revamp`, then read the lesson in the browser as a learner would |

### R5. The remaining chapters

In path order. For each chapter: write the lessons → its quiz → update the glossary → validate →
click "Next" through the whole chapter in the browser → commit `Rewrite chapter <n>: <title>`.
After each track, the owner reads three sample lessons.

**Done when** every slug in `topics.json` has a file and `validate` shows no *still to finish*
lesson items.

### R6. Quiz for the whole course

At least 8 questions per chapter, following the quiz rules of the content guide.

**Done when** no chapter has fewer than 8 questions.

### R7. Old links and progress

1. **Group A:** check the `aliases` in front-matter against `OUTLINE.md`. Rebuild `legacy.json`
   from the old version: replace each old slug in `lessons` with its new slug (an alias becomes
   the slug of the lesson that holds it), remove duplicates, keep `id`, `slug` and `title`.
2. **Group B:** create `legacy.json` with one entry per old long lesson: `id` (`lesson-NN`), the
   old `slug` and `title`, and in `lessons` the new lessons that took content from it (the `from`
   column):

   ```json
   [{ "id": "lesson-08", "slug": "expiration-and-key-lifetime", "title": "Expiration and Key Lifetime", "lessons": ["expire-and-ttl", "persist"] }]
   ```

**Done when** ten random old addresses each open the right lesson.

### R8. Quality check

1. `npm run validate -- ../<course>-revamp --strict` passes, and every *writing note* has been
   dealt with (fixed, or judged fine).
2. Check technical facts against the official documentation of the current version.
3. In the browser:

   | # | Do | Expect |
   |---|---|---|
   | 1 | Open the home page | Main button "Start with lesson 1.1"; no "in any order" |
   | 2 | From lesson 1.1, click "Next" to the end of chapter 1 | Right order, then "Next chapter: 2 · …" |
   | 3 | Open a lesson with `requires` | "Before you start" links to the right lessons |
   | 4 | Mark two lessons learned, go home | Main button "Continue: <first unlearned lesson>" |
   | 5 | Open an old address | The new lesson |
   | 6 | Take one chapter's quiz | Explanations shown; the lesson link opens the right lesson |
   | 7 | 375 px wide, light and dark | No sideways scrolling; diagrams and code readable |
   | 8 | Old progress: clear site storage, set `localStorage['<course>-learning-progress-v2']` with an alias slug learned, reload | The new lesson shows as learned |

**Done when** every row passes.

### R9. Publish (only with the owner's approval)

1. Merge `revamp/guided` into `main` and push. The workflow validates in strict mode, builds with
   the shell's `main` and deploys. If it fails, the previous site stays up; fix and push again.
2. Repeat the R8 browser table on the live site.
3. Update the course card in the portal (`index.html` in `learn-with-will.github.io`): lesson
   count, hours, and a description without the word "bite". Ask the owner first.
4. Update the tracking table in `course-shell/REVAMP_PLAN.md`.

**Done when** the live site passes R8 and the portal card is updated.

## Checklist

- [ ] `id` is unchanged (and, for group B, equals the old storage-key prefix)
- [ ] `content/topics.json` was generated from `revamp/OUTLINE.md`, not edited by hand
- [ ] Every old slug is an alias of one lesson or appears in `legacy.json`
- [ ] `npm run validate -- ../<course> --strict` passes; writing notes dealt with
- [ ] No app code, `package.json` or `course-manifest.json` in the course repository
- [ ] `deploy.yml` is the unchanged thin workflow
- [ ] Old addresses redirect; old progress is carried over
- [ ] Live site and portal card checked after the deploy
