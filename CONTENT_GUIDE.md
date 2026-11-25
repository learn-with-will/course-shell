# Writing a course

A course is a folder: a `course.json` that describes it, lessons in `content/lessons/`, topics
in `content/topics.json` and a question bank in `quiz/questions.json`. The shell turns that
folder into a site. This guide covers the lessons first, then the quiz, then `course.json`.
[`examples/demo-course`](examples/demo-course) shows all of it in a working course.

A course uses one of two formats, set by `"format"` in `course.json`:

- **`guided`**: short lessons on an ordered path (track → chapter → lesson). Every new course
  uses it. Its rules are in [Guided format](#guided-format), right below.
- **`bites`** (the default): one-idea lessons read in any order. Its rules start at
  [Writing a lesson bite](#writing-a-lesson-bite).

The quiz, `course.json` and publishing sections at the end apply to both.
[`examples/guided-course`](examples/guided-course) is a working guided course.

## Guided format

The reader is a beginner following a path. Every rule here serves that reader: lessons in a
clear order, one thing to learn per lesson, plain words, and examples that were actually run.
`npm run validate` checks every rule a machine can check; the rest are on the
[self-check list](#self-check-before-a-lesson-is-done).

### Tracks, chapters, lessons

| Level | What it is | Size | Ends with |
|---|---|---|---|
| **Track** | A milestone ("can build a small app") | 2–4 per course, 3–16 chapters each | The learner can make something small or solve a real problem |
| **Chapter** | One ability ("show data on the page") | 4–10 lessons, 20–50 minutes | A *Build it* lesson (early and middle tracks) and at least 8 quiz questions |
| **Lesson** | One thing the learner can do | 2–7 minutes; `build` lessons up to 10 | A three-point *Recap* and a big "Next" button |

Lessons in the first track are read strictly in order. The last track (`level: advanced`) may be
read on demand; each of its chapters says which chapters must come first.

**One lesson, one result.** You can finish the sentence "After this lesson you can …" with one
concrete verb, and 1–2 quiz questions can check it. One main new idea, at most two minor terms.
Use only what earlier lessons taught, or define it in the lesson. No padding: a lesson under two
minutes merges into its neighbour.

| Situation | Do |
|---|---|
| Two lessons make no sense read alone | Merge them |
| One skill split by syntax | Merge |
| A lesson introduces more than one new idea | Split it |
| A "pitfall" about something taught in one lesson | Make it that lesson's *Common mistakes* |
| A mistake that spans the chapter | One `troubleshoot` lesson at the end, titled by the symptom |
| A lesson needs an idea from a later chapter | Move the lesson, or move the chapter |
| A long lesson from an old course | Split it by the things a learner can do |

**Order in a chapter:** a `concept` lesson opens it (if needed) → `task` lessons from easy to hard
→ the `build` lesson → a `troubleshoot` lesson (if any).

### Titles

| `kind` | Pattern | Examples |
|---|---|---|
| `concept` | A question learners ask | "What is a component?", "Observable or Promise?" |
| `task` | Verb + what you get done; the API name, if any, after a colon | "Show a list: @for", "Join two tables" |
| `build` | "Build it: " + the product | "Build it: the checkout form" |
| `troubleshoot` | A question about the symptom | "Why are my tests flaky?" |

At most 7 words (not counting the API name), sentence case, at most one API name, never a list of
APIs, never "Pitfall:", never a slogan you have to read the lesson to understand. Write API names
in titles **without backticks** (the page shows them as typed): `title: "Store data that can
change: signal()"`. Add an `api` chip only when the title does not already name the API.

### Twelve writing rules

1. **Open with a concrete problem**, not a definition.
2. **One idea per lesson, one idea per paragraph.** Beginner tracks: average sentence under 18
   words, no sentence over 25.
3. **Define each term the first time it appears**, in plain words, in a callout:
   `> **Term:** one sentence.` Then always use that same name.
4. **Never mention what has not been taught.** If you must: "You will meet X in lesson N.N. For
   now, …".
5. **Do → see → understand.** After every step, a **Result:** line states the exact outcome (the
   text on the page, the output, the number). Explanation comes after.
6. **Real, complete examples.** Each code block names its file on the first line, has its
   imports, and has at most 20 lines. No `…` gaps in beginner tracks.
7. **Explain code with numbered notes** ① ② ③, one line each, right under the block.
8. **Write to "you", in the active voice, with concrete verbs.** Abstract nouns only after an
   example.
9. **An analogy only when it really fits**, once, then back to the real thing.
10. **Say each thing once.** `summary` is the lesson's promise, the opening is the problem, the
    *Recap* is three things the learner can now do.
11. **Mistakes by symptom:** what the learner sees (the real text) → why → how to fix it. Put the
    fix in the sentence as inline code; **never put a code block inside a Common mistakes bullet**
    (the card cannot shrink and the page overflows on phones).
12. **Calm, sure voice.** No "simply", "just", "obviously", "of course", "easy".

**One vocabulary.** `content/glossary.json` lists each term, a one-sentence definition and the
lesson that defines it (`definedIn`). One concept, one name across the course. The validator adds a
*writing note* when a lesson uses a term before its defining lesson.

### Lesson templates

Sections by `kind` (**bold** = required, in this order):

| `kind` | Sections |
|---|---|
| `concept` | **Why you need it** → Try it → **How it works** → Common mistakes → Going further → **Recap** |
| `task` | **Why you need it** → **Try it** → **How it works** → Common mistakes → Going further → **Recap** |
| `build` | **What you'll build** → **Steps** → **Check your work** → Solution → **Recap** |
| `troubleshoot` | **What you see** → **Why it happens** → **How to fix it** → **Recap** |

*Recap* has exactly 3 bullets, *Common mistakes* 1–3, *Steps* at least 2 (`**Step 1. …**`).
*Going further* only in `advanced` tracks.

````markdown
---
slug: signal
title: "Store data that can change: signal()"
topic: interactive
kind: task
summary: "Keep a value that changes in a signal, and every place that shows it updates by itself."
goal: "Create a signal, show its value on the page, and change it when the user clicks."
requires: [interpolation, event-binding]
aliases: [signals-in-templates]
tags: [signals, state]
related: [signal-lists, computed]
---
## Why you need it

<2–5 sentences: a concrete situation from the course's example setting.>

> **Signal:** a box that holds one value. …

## Try it

**Step 1. Create the signal.** <one lead-in sentence>

```typescript
// src/app/menu/menu.ts
<code that was run>
```

① <note>

**Result:** <the real outcome>

## How it works

<What just happened; one diagram if it is faster than words.>

## Common mistakes

- **<The symptom, with the real message.>** <Why.> <The fix, inline.>

## Recap

- <Thing you can do 1.>
- <Thing you can do 2.>
- <Thing you can do 3.>
````

| Field | Rule |
|---|---|
| `title` | ≤ 60 characters, at least two words, never starts with `Pitfall` |
| `goal` | Required; starts with a capital, ends with a full stop, ≤ 160 characters |
| `requires` | 0–4 slugs, all earlier on the path |
| `api` | 0–3 strings, each ≤ 40 characters |
| `aliases` | Old slugs that now open this lesson; kebab-case; must not clash with any slug, alias or `legacy.json` slug |
| `related` | 0–4 slugs |

**Limits** (validated):

| | `concept`, `task`, `troubleshoot` | `build` |
|---|---|---|
| Reading time | 2–7 min | 2–10 min |
| Words | ≤ 1100 | ≤ 1500 |
| Code blocks (diagrams not counted) / lines per block | ≤ 6 / ≤ 25 | ≤ 10 / ≤ 25 |
| Diagrams / images | ≤ 1 / ≤ 2 | ≤ 1 / ≤ 2 |
| Code required (when the course has `codeLanguages`) | `task` only | yes |

### Examples and pictures

**One everyday setting for the whole course** (Angular: a café). Each example continues the one
before it, with real names and numbers (`Latte`, `$4`), never `foo`. The setting is for writing
examples only: **do not build a demo project** for the author. *Build it* lessons guide the
learner to build on their own machine.

**Add a picture only when it helps more than words.** It is not required in every lesson, and it
must work for courses without a user interface.

| The information is | Use |
|---|---|
| Steps in order between several parties | a `sequence` diagram |
| Data passing through parts; what depends on what | a `flow` diagram |
| "Which one do I use?" | a `tree` diagram |
| Nested structure | a `tree` diagram or a `text` block |
| The wrong way next to the right way | one code block with `// Before` and `// After` |
| The result of an action | a **Result:** line or a `text` block with the output |
| An idea that is hard to describe | an SVG drawing that works on light and dark backgrounds |
| A real screen (when it is truly needed) | a screenshot ≤ 200 KB with alt text |

Images go in `content/images/` and are written `![what it shows](images/name.png)`; an italic line
right after an image is its caption. The validator checks alt text, that the file exists, the
type (`.svg .png .jpg .jpeg .webp`), the size and the count. Never publish a screenshot that shows
a personal path, name or account. Tables compare several things on the same criteria; they never
replace an explanation. The [diagram syntax](#diagram-syntax) is the same as for bites.

### Facts that are true

- **Run every code sample** in a throwaway project (any project, in a temporary folder) before it
  goes into a lesson. Copy the real output and the real error text. Note the version you used; add
  `since` when an example needs a minimum version.
- **Run each mistake with that lesson's own code.** Symptoms change with small details: with
  `push()` the item count still grows if the template reads `cart().length`, but stays at 0 if
  the count is a `computed`.
- **Interactive commands** (such as `ng new`): if you could not test how the questions are
  answered (arrow keys, multi-select, y/N), give the learner the command with its options
  (`--style=css --ssr=false …`) and explain which question each option answers.
- **Courses without code:** check every number, definition and recommendation against a primary
  source, and keep a list of the sources with the course.
- Anything you could not check **stays out of the lesson**.

### Quiz (guided)

At least 8 questions per chapter; 1–2 for each `concept` and `task` lesson; at least three
question types per chapter. Ids are `<topic>-<two digits>`; `lesson` is the current slug, never
an alias. Ask about what the `goal` promises, not trivia. Wrong answers are mistakes learners
really make. `explanation` is 1–2 sentences in the lesson's voice.

### Self-check before a lesson is done

Any "no" means the lesson is not done.

1. Title, slug, `topic` and `kind` match where the lesson sits in `content/topics.json`?
2. `goal` starts with a verb and is reachable with this lesson and its `requires` alone?
3. One main idea?
4. Every idea was taught earlier or is defined here?
5. The first sentence is a concrete situation?
6. Each new term is explained in plain words the first time?
7. No sentence over 25 words (beginner and intermediate tracks)?
8. None of "simply", "just", "obviously", "of course", "easy"?
9. Nothing the learner does not need here (old APIs, version history…)?
10. `summary`, opening and *Recap* do not repeat the same sentence?
11. The example uses the course setting, with real names and numbers?
12. Each code block names its file, has its imports, ≤ 20 lines?
13. Every code sample (or every claim, in a course without code) was checked, results copied exactly?
14. Messages in *Common mistakes* are the real text?
15. A diagram or table is faster to read than words, and does not repeat them?
16. Without a picture, are the words and examples clear enough?

### Guided data contract

**`course.json`** adds three fields (the shell checks them):

```json
{
  "format": "guided",
  "tracks": [
    { "id": "foundations", "title": "Foundations", "blurb": "From install to a working menu page.", "level": "beginner" }
  ],
  "kinds": [
    { "id": "concept", "label": "Concept", "hint": "What something is and why it exists", "tone": "violet" },
    { "id": "task", "label": "How-to", "hint": "Steps to get one job done", "tone": "emerald" },
    { "id": "build", "label": "Build it", "hint": "Put a chapter together in a small project", "tone": "orange" },
    { "id": "troubleshoot", "label": "Fix it", "hint": "A symptom, its cause and the fix", "tone": "blue" }
  ]
}
```

`tracks` is in order; `level` is `beginner`, `intermediate` or `advanced`; `blurb` ≤ 160
characters. `kinds` must be exactly those four ids (labels, hints and tones may change).

**`content/topics.json`**: each chapter also has `track` and `lessons` (slugs in reading order;
slugs without a file yet are allowed while writing). Chapter and lesson numbers (`5.2`) come from the position on the path, counting lessons not written yet, so numbers
never jump.

**`content/glossary.json`**: `[{ "term", "aliases": [], "definition", "definedIn": "<slug>" }]`.

**Validation messages.** *Errors* block a build. *Still to finish* items (a listed lesson with no
file yet, a chapter with no questions yet) are warnings while writing and errors with `--strict`.
*Writing notes* (a glossary term used too early; long sentences in beginner tracks) are advice
only and never fail a build.

## Writing a lesson bite

Every lesson is one file in `content/lessons/<slug>.md`, teaches **one** idea, and takes
**3–5 minutes** to read. `npm run validate -- <course folder>` enforces the rules below. The
lesson index and the reading times are generated at build time and never committed.

### Shape

```markdown
---
slug: computed
title: "computed()"
topic: signals
kind: api            # one of the kinds in course.json (default: concept | api | technique | pattern | pitfall | tool)
summary: "One sentence, ends with a full stop, max 160 characters."
tags: [signals, derived-state]
related: [signal, effect, linked-signal]    # 2–4 slugs that exist
since: "17"          # optional: first stable version of the subject that has it
---
> **In one line:** the whole idea in a sentence.

## The idea          why it exists and how it works (required)
## See it            a minimal, working example (required)
## Go deeper         optional: one or two details beyond the basics
## Watch out         optional: 1–3 mistakes people actually make
## Remember          exactly 3 takeaways (required)
```

| Rule | Limit |
|---|---|
| Reading time | 3–5 minutes (computed: 180 words/min + 20 code lines/min, rounded). Never typed by hand |
| Words | at most 700 (diagram labels count) |
| Code | at least 1 and at most 3 blocks, each at most 25 lines, always with a language from `codeLanguages` (or `text`). A course with no `codeLanguages` needs no code |
| Diagrams | at most 1 |
| Headings | only the five sections above; no `#` heading (the title comes from front-matter) |

Simpler topics usually land at 3 minutes, topics with more moving parts at 4–5. Do not pad to
reach a number, and split a bite that will not fit in 5.

### Choose the visual from the shape of the information

Every bite needs **at least one** visual, but which one depends on what the information *is*.
A diagram is one option among several, not the default, and never worth adding just to have one.

| The information is... | Use | How |
|---|---|---|
| several things compared on the same properties | **table** | a Markdown table |
| a rule, caveat or tip | **callout** | `> **Tip:** …`, `> **Note:** …`, `> **Watch out:** …` |
| the usual mistakes | **Watch out section** | bullets; drawn as warning cards automatically |
| the takeaways | **Remember section** | bullets; drawn as numbered cards automatically |
| wrong code next to right code | **Before / After** | one code block with `// Before` and `// After` comments |
| things happening in order between parties, or a lifecycle that repeats | **sequence** | a ```` ```sequence ```` block |
| "which one do I use?" | **tree** | a ```` ```tree ```` block |
| what depends on what, or data flowing one way (no loops) | **flow** | a ```` ```flow ```` block |
| one fact or a definition | plain prose | the *In one line* callout |

If a table says it, do not also draw it. A loop cannot be a `flow` (flows are acyclic): show it as a
sequence over time.

### One look for all of them

Tables, callouts, the Watch out and Remember cards and diagrams share one style: rounded panels,
a tinted fill with a coloured border, a small badge, light and dark themes from the same palette.
Where a visual takes a colour (a diagram box, `@tone`), it means:

| Tone | Use it for |
|---|---|
| `primary` | the main subject of the picture |
| `blue` | supporting or derived things |
| `green` | the good outcome, the safe path |
| `amber` | take care, the risky option |
| `red` | forbidden, will not work |
| `neutral` | everything else (the default) |

### Diagram syntax

One statement per line. `Title | subtitle` gives a bold title and a muted line, a trailing `@tone`
colours the box, and `` `code` `` renders as inline code. Keep text short: boxes do not scroll,
and a tree that gets too wide scrolls sideways.

````markdown
```sequence
actor user: User | admin
actor app: App | runs the page @blue
user -> app: Opens the page | shows a button      (solid arrow)
app --> user: Replies                             (dashed arrow)
note app: Keep a state | single use @amber        (box on one actor)
note user..app: Both agree                        (box across actors)
```

```tree
Where does it start?
  In the browser
    [W1] Desktop QR | scan and confirm @blue       ([badge] or a subtitle makes a card)
  In the app
    [A1] App to app | hand over @green
```

```flow
price: `price` | signal @primary
total: `total` | computed @blue
view: Template | shows the total @green
price -> total
total -> view: re-renders                         (optional edge label)
```
````

Limits: sequence 2–6 actors and up to 12 steps; tree up to 30 nodes, 5 levels, one root; flow up to
12 nodes, no cycles. Badges are at most 8 characters and cannot contain brackets. The grammar lives
in `src/app/shared/diagram/diagram-parser.ts`, and `npm run validate` reports a broken diagram with
its line number.

## Quiz questions

Questions live in `quiz/questions.json`, one array for the whole course. Each is tagged with a
`topic` and, usually, the `lesson` to link back to ("Learn more"). Each topic that has lessons
needs at least 8 questions, every question needs an `explanation`, and ids are lowercase
kebab-case and unique.

| Type | Fields besides `id`, `topic`, `lesson`, `type`, `prompt`, `explanation` |
|---|---|
| `single-choice` | `options: [{ id, text }]`, `answer: "<option id>"` |
| `multiple-choice` | `options: [{ id, text }]`, `answer: ["<option id>", …]` |
| `fill-blank` | `answer: ["accepted answer", …]` (compared case-insensitively) |
| `ordering` | `items: [{ id, text }]`, `answer: ["<item id>", …]` in the right order |
| `match-pair` | `pairs: [{ left, right }]`; every `left` and every `right` unique |

## Topics and old URLs

`content/topics.json` lists the topics in display order:

```json
[{ "id": "signals", "title": "Signals", "blurb": "One sentence about the topic.", "order": 4 }]
```

`content/legacy.json` is optional. A course that used to have long lessons lists each old one
with the bites that replaced it, so old links keep working and old progress is carried over:

```json
[{ "id": "lesson-08", "slug": "introduction-to-signals", "title": "Introduction to Signals", "lessons": ["signal", "computed"] }]
```

## course.json

The only place a course describes itself. `course.schema.json` in the shell gives editors
autocomplete: add `"$schema": "https://raw.githubusercontent.com/learn-with-will/course-shell/main/course.schema.json"`.

| Field | Required | What it does |
|---|---|---|
| `id` | yes | The repository name. It names the saved progress, so never change it once the course is live |
| `name` | yes | The site name, for example "Angular Learn" |
| `subject` | yes | What is taught, as it reads in a sentence ("areas of Angular", "Angular 17+") |
| `description` | yes | One sentence for search engines and link previews |
| `brand.color` | yes | The brand colour, `"#rrggbb"`. The shades, gradient, logo and favicon are derived from it |
| `brand.scale` | no | Exact shades `50`–`950` (600 is the main colour), when the derived ones are not right |
| `brand.gradient`, `brand.gradientDark` | no | Three stops for the logo and the highlighted headline words |
| `brand.logo`, `brand.favicon` | no | Leave out so that every course shares one logo, the bite mark, in its brand gradient. Only set them for a deliberate exception (paths in the course folder, such as `assets/logo.svg`) |
| `home.badge` | no | A short announcement above the headline |
| `home.headline` | no | Three parts: text before, the highlighted words, text after |
| `home.searchExamples` | no | Up to three words suggested in the search box |
| `home.featuredLesson` | no | Slug of the bite on the hero card (default: the first one) |
| `home.featuredCode` | no | `{ "lang", "code" }`, at most 8 lines, shown on the hero card |
| `home.quizPreview` | no | `{ "topic", "prompt", "options", "selected" }`: the picture of a quiz question |
| `kinds` | no | The kinds a lesson can be: `{ "id", "label", "hint", "tone" }`, tone one of `violet`, `blue`, `emerald`, `cyan`, `orange`, `neutral` |
| `codeLanguages` | no | [Prism](https://prismjs.com/#supported-languages) language names that code blocks may use. Empty for a course without code |

## Before you publish

Run these from the shell folder, with the course folder as the argument:

```bash
npm run dev -- ../my-course                  # live preview while you write
npm run validate -- ../my-course             # topics with no lessons yet are warnings
npm run validate -- ../my-course --strict    # what the deploy workflow runs: those warnings become errors
```
