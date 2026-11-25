# Course shell

The one user interface behind every [learn-with-will](https://learn-with-will.github.io/)
course. A course is a folder of content plus a small `course.json`; this repository turns that
folder into a site: a home page, a lesson list with search and filters, a lesson reader with code
highlighting and diagrams, a quiz bank, a progress dashboard, bookmarks, light and dark themes,
and optional sign-in that keeps progress across devices.

A course uses one of two formats, set by `format` in `course.json`:

- **`bites`** (the default): short stand-alone lessons listed A–Z, read in any order.
- **`guided`**: lessons on an ordered path of tracks and chapters, with previous/next
  navigation.

The shell contains no course of its own. Names, colours, home page copy, lesson kinds and code
languages all come from the course being built.

Built with Angular 20 (standalone components, signals), Tailwind CSS v4 and ngx-markdown.

## How it fits together

```text
learn-with-will/course-shell        this repository: the UI, the scripts, the deploy workflow
learn-with-will/<course>            one repository per course, content only
  course.json                       name, brand, home page copy, kinds, code languages
  content/topics.json               the topics, in display order
  content/lessons/*.md              one short lesson ("bite") per file
  content/legacy.json               optional: old lesson URLs → the bites that replaced them
  quiz/questions.json               the question bank
  assets/                           optional: favicon and logo
  .github/workflows/deploy.yml      calls this repository's reusable workflow
```

Each course is published at `https://learn-with-will.github.io/<course>/`. Its workflow checks
out this repository at `main`, so a course picks up a shell change on its next deploy (a push,
or a manual run of its workflow).

[`examples/demo-course`](examples/demo-course) is a complete tiny `bites` course about writing
courses. It is the default input for every command and the fixture for the unit tests.
[`examples/guided-course`](examples/guided-course) is the same for the `guided` format, and the
folder to copy when starting a new course.

## Commands

Keep the shell next to the course folders and pass a course folder as the first argument. With
no argument the demo course is used. Node 22.18 or later is required, because the scripts
import TypeScript directly.

```bash
npm ci
npm run dev -- ../angular                  # live preview at http://localhost:4200
npm run validate -- ../angular             # check the course; unfinished topics are warnings
npm run validate -- ../angular --strict    # the release rules the deploy workflow uses
npm run build -- ../angular                # production build into dist/course-shell/browser
npm test                                   # unit tests, against the demo course
npm run test:scripts                       # tests for the Node scripts
npm run emulators                          # local Firebase auth + Firestore (FIREBASE_SETUP.md)
```

Options after the course folder go to the Angular CLI, for example
`npm run dev -- ../angular --port 4300` or
`npm run build -- ../angular --base-href /angular/`. On Windows, run a build with `--base-href`
from PowerShell: Git Bash rewrites the leading slash into a file path.

`dev` watches the course folder, so saving a lesson reloads the page.

## What a build does

`scripts/course.mjs` runs `scripts/prepare-course.mjs` and then the Angular CLI. The prepare
step checks `course.json` and writes these generated, gitignored files:

| File | Contents |
|---|---|
| `.course/public/` | The course's `content/`, `quiz/`, favicon and logo, plus `content/course-manifest.json` (the lesson index, with reading times) |
| `.course/index.html` | The page shell with the course's title and description, from `src/index.template.html` |
| `.course/prism-languages.js` | Syntax highlighting for the course's `codeLanguages` |
| `src/generated/course.ts` | The typed `COURSE` constant the app reads |
| `src/generated/theme.css` | Brand colour scale, gradients and glow |

After a fresh clone, run any command once (for example `npm run prepare-course`) so that
`src/generated/` exists and the editor can resolve its imports.

## Project structure

```text
src/app/
├── core/
│   ├── course/        # CourseConfig and the COURSE constant (from src/generated)
│   ├── guards/        # legacy URL and random-lesson redirects
│   ├── firebase/      # optional sign-in: config and lazy SDK loader
│   ├── models/        # Lesson, Quiz, Progress interfaces
│   ├── services/      # Course, Lesson, Quiz, Progress, Search, Theme, Auth
│   ├── sync/          # keeps progress in Firestore while signed in
│   └── util/
├── shared/
│   ├── diagram/       # parser and components for sequence, tree and flow diagrams
│   └── components/    # navbar, footer, lesson cards, quiz parts, related lessons
├── features/          # home, lessons, lesson, quiz-hub, quiz-play, dashboard, bookmarks
└── app.routes.ts      # lazy-loaded routes

scripts/
├── course.mjs             # the CLI: dev, build, test, validate, prepare
├── course-config.mjs      # reads and checks course.json, fills in defaults
├── prepare-course.mjs     # writes the generated files
├── generate-manifest.mjs  # lesson index and reading time
├── validate-course.mjs    # the release gate
└── writing-notes.mjs      # readability notes for guided lessons (used by validate)

.github/workflows/
├── deploy-course.yml      # reusable workflow that course repositories call
└── ci.yml                 # validates, tests and builds the demo course
```

## Rules for changing the shell

- **No course-specific text, colour or logic.** If something differs between courses, it is a
  field in `course.json`: add it to `scripts/course-config.mjs` (check and default),
  `src/app/core/course/course.model.ts`, `course.schema.json` and the demo course.
- **`main` must always build.** Courses deploy against `main` without pinning a version. CI
  validates, tests and builds the demo course on every push.
- **Storage keys come from the course id** (`<id>-learning-progress-v2`, `<id>-learning-theme`).
  All courses share one origin, so a fixed key would mix their progress.

## Guides

- [CONTENT_GUIDE.md](CONTENT_GUIDE.md): how to write a lesson, the visuals, the diagram syntax,
  quiz questions, and every `course.json` field.
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md): the optional sign-in and progress sync.
