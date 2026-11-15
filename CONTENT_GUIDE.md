# Writing a course

A course is a folder: a `course.json` that describes it, lessons in `content/lessons/`, topics
in `content/topics.json` and a question bank in `quiz/questions.json`. The shell turns that
folder into a site. This guide covers the lessons first, then the quiz, then `course.json`.
[`examples/demo-course`](examples/demo-course) shows all of it in a working course.

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
| `brand.logo`, `brand.favicon` | no | Paths in the course folder (`assets/logo.svg`). Default: the bite mark in the gradient |
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
