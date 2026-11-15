# Moving a course onto the shell

How to turn one of the older courses (its own copy of the React, Vue or Express shell, 24 long
lessons in `beginner / intermediate / advanced`, one quiz file per lesson) into a content-only
course that this shell builds. The same steps, minus the conversion, start a brand-new course.

It is written so that a person or a coding agent can follow it top to bottom. `<course>` is the
repository name (`react`, `redis`, …) and all `npm` commands run from the `course-shell` folder.

## What changes, and what must not

| | Before | After |
|---|---|---|
| Interface code | A full app copied into the course repository | None. The shell is checked out at build time |
| Lessons | 24 long lessons (15–25 min) in three levels | Bites: one idea, 3–5 minutes, grouped by topic |
| Quizzes | `public/quizzes/lesson-NN.json`, one per lesson | One bank, `quiz/questions.json`, tagged by topic |
| Settings | Edited in source files (`index.css`, Navbar, `index.html`) | `course.json` |
| Sign-in and cloud progress | Not available | Included |

Three things must survive the move, and `content/legacy.json` plus an unchanged `id` are what
keep them:

- **The URL.** The course stays at `https://learn-with-will.github.io/<course>/`.
- **Old links.** `/lesson/<old-slug>` redirects to the bites that replaced that lesson.
- **Learners' progress.** The old shell saved completed lessons under the browser key
  `<course>-learning-progress`, by lesson id (`lesson-07`). The new shell reads that key once
  and marks the replacing bites as learned.

## Before you start

1. Read [CONTENT_GUIDE.md](CONTENT_GUIDE.md) and the three lessons in
   [`examples/demo-course`](examples/demo-course). They are the format you are converting to.
2. Check what already exists remotely. A course may have unmerged work on another branch:

   ```bash
   git -C ../<course> fetch --all --prune
   git -C ../<course> ls-remote --heads origin
   ```

3. Work on a branch in the course repository (`git -C ../<course> switch -c bites`). Nothing is
   published until that branch is merged into `main` and pushed.
4. Keep the course's authoring contract (`prompts/*-authoring-prompt.md`, if it has one) open.
   Its sources and its list of facts that are easy to get wrong still apply.

## Step 1: Plan the topics and the bites

Do this on paper before writing a file.

- **Topics.** Choose 8–14 topics that a learner would look for by name. They replace the three
  levels, so group by subject, not by difficulty. Each needs an `id`, a `title`, a one-sentence
  `blurb` and an `order`.
- **Bites.** Split every long lesson into the separate ideas it teaches. One long lesson usually
  becomes 5–9 bites. A bite teaches one idea; if its "In one line" sentence needs an "and", it
  is two bites. Expect 120–220 bites for a 24-lesson course.
- **Kinds.** Give each bite a kind. The default set (concept, api, technique, pattern, pitfall,
  tool) fits programming courses. For any other subject, define your own in `course.json`.
- **Coverage map.** For every old lesson, write down which bites replace it. You need this map
  for `legacy.json` in step 4, and it is the check that nothing was dropped.

## Step 2: Write `course.json`

Start from [`examples/demo-course/course.json`](examples/demo-course/course.json). Field by
field, where the values come from in the old course:

| Field | Take it from |
|---|---|
| `id` | The repository name, exactly. It must equal the prefix of the old storage key (`PROGRESS_STORAGE_KEY` in `src/core/models/progress.ts`, e.g. `redis-learning-progress` → `redis`) |
| `name`, `subject` | The wordmark in the old Navbar, and the technology's name |
| `description` | The old `index.html` meta description or the portal card text, shortened to one sentence |
| `brand.color` | `--color-brand-600` in the old `src/index.css`. The new shell puts white text on this colour, so use the 600 shade, not the lighter 500 |
| `brand.scale` | Optional: copy the old `--color-brand-50` … `--color-brand-950` values for exact colours |
| `brand.gradient` | Optional: three stops, from the brand colour toward the old accent colour |
| `brand.logo`, `brand.favicon` | The old `public/favicon.svg`, copied to `assets/`. A monochrome `currentColor` icon needs a fixed `fill` to show as an image. Leave both out to get the bite mark in the brand gradient |
| `home.*` | Write a headline, three search words learners would type, the slug of a strong first bite, a code sample of at most 8 lines, and one quiz question for the preview |
| `kinds` | Leave out for the default six, or list your own |
| `codeLanguages` | The Prism languages the old `src/core/prism.ts` imported |

## Step 3: Write the content

```text
content/topics.json        from step 1
content/lessons/<slug>.md  one file per bite
quiz/questions.json        one array for the whole course
```

**Lessons.** Follow CONTENT_GUIDE.md exactly; the validator enforces it. In short: front-matter
(`slug`, `title`, `topic`, `kind`, `summary`, `tags`, `related`), the "In one line" callout,
then `## The idea`, `## See it`, optional `## Go deeper` and `## Watch out`, and `## Remember`
with exactly three bullets. Every bite needs at least one visual and, in a course with code,
at least one code block.

- Carry the facts over from the existing lesson. Do not add claims the old lesson did not make
  unless you verify them against the course's primary sources. Converting the format is not a
  reason to invent content.
- The old sections map roughly like this: *Concept Explanation* → The idea; *Worked Example* and
  *Examples* → See it; *Options and Trade-offs* → a table; *Common Mistakes* → Watch out or a
  bite of kind `pitfall`; *Summary* → Remember. *Learning Objectives*, *Flash Cards*, *Exercises*
  and *Further Reading* have no place in a bite: fold what matters into the prose, turn good
  flash cards into quiz questions, and drop the rest.
- `related` needs 2–4 slugs that exist. Link the bites that came from the same long lesson.

**Questions.** The five question types and their fields are unchanged, so most old questions
move over as they are:

1. Give each a course-wide unique id, `<topic>-NN` (the old ids `q1`, `q2` repeat in every file).
2. Add `"topic"`, and `"lesson"` with the slug of the bite that answers it. That bite must be
   in that topic.
3. Every topic with lessons needs at least 8 questions. Write new ones where a topic is short,
   each with an `explanation` and an answer that the linked bite supports.

## Step 4: Write `content/legacy.json`

One entry per old lesson, using the coverage map from step 1. Take `id`, `slug` and `title`
from the old `public/content/course-manifest.json`:

```json
[
  {
    "id": "lesson-08",
    "slug": "expiration-and-key-lifetime",
    "title": "Expiration and Key Lifetime",
    "lessons": ["expire-and-ttl", "persist", "passive-and-active-expiration", "ttl-and-writes"]
  }
]
```

Every old lesson must appear, with at least one bite. In strict mode an entry with an empty
`lessons` list is an error.

## Step 5: Replace the old shell

In the course repository, once the new files are in place:

- Delete the app: `src/`, `public/`, `scripts/`, `views/`, `server.js`, `index.html`,
  `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, and the local
  `node_modules/` and `dist/`. Keep `prompts/` and `.git/`.
- Replace `.github/workflows/deploy.yml` with
  [`examples/demo-course/.github/workflows/deploy.yml`](examples/demo-course/.github/workflows/deploy.yml),
  unchanged.
- Rewrite `README.md`: what the course is, the folder layout, and the three commands below.
- `.gitignore` only needs editor and system files; a course repository generates nothing.

The repository should now contain `course.json`, `content/`, `quiz/`, optionally `assets/` and
`prompts/`, the workflow, and the README.

## Step 6: Check it

```bash
npm run validate -- ../<course> --strict
npm run dev -- ../<course>
```

Validation must pass in strict mode with no warnings. Then look at the running site:

- Home: name, headline, brand colour, featured bite, topic tiles and the quiz preview.
- Lessons A–Z: every topic and kind filter has entries.
- Three or four bites, including one with a diagram and one with code in each language the
  course uses. Code must be highlighted.
- A quick quiz, start to result.
- An old address, `/lesson/<old-slug>`: it must land on the lesson list showing the bites that
  replaced it.
- Old progress: in the browser console run
  `localStorage.setItem('<course>-learning-progress', JSON.stringify({ completedLessons: ['lesson-01'], bookmarkedLessons: [] }))`
  after clearing the site's storage, reload, and check that the bites of lesson 1 show as learned.
- Dark mode and a phone-width window.

## Step 7: Publish

1. Commit on the branch, merge into `main`, push. The workflow validates, builds with the
   latest shell and deploys. GitHub Pages must already use the **GitHub Actions** source, which
   is the case for every existing course.
2. When the run is green, open `https://learn-with-will.github.io/<course>/`, a deep link to a
   bite, and one old lesson address.
3. Update the course's card in the portal (`index.html` in `learn-with-will.github.io`): the
   `topics` count, `estimatedHours` and the description now describe bites, not 24 lessons.

If the deploy fails, the previous site stays up. Fix the course and push again.

## Starting a new course

Skip the conversion: copy `examples/demo-course` into a new folder, set `id` to the new
repository name, write `course.json`, topics, bites and questions as above (no `legacy.json`),
and validate. Create the repository under the `learn-with-will` organisation, enable Pages with
the GitHub Actions source, push, and add a card to the portal.

## Checklist

- [ ] `id` equals the repository name and the old storage-key prefix
- [ ] Every old lesson has a `legacy.json` entry with at least one bite
- [ ] `npm run validate -- ../<course> --strict` passes
- [ ] No app code, `package.json` or `course-manifest.json` left in the course repository
- [ ] `deploy.yml` is the unchanged thin workflow
- [ ] Old lesson address redirects; old progress is carried over
- [ ] Live site, a deep link and the portal card checked after the deploy
