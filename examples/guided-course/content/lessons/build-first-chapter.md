---
slug: build-first-chapter
title: "Build your first course chapter"
topic: getting-started
kind: build
summary: "Combine concept and task lessons into a cohesive first chapter for your course."
goal: "Assemble and validate a multi-lesson chapter in the shared course shell."
requires: [write-a-task]
tags: [build, chapter]
related: [what-is-guided, write-a-task]
---
## What you'll build

In this build lesson, you will put everything together to produce a complete chapter. You will update `topics.json`, add your lesson files, and run the strict validator to verify that your course builds cleanly.

By completing this hands-on exercise, you will understand the relationship between topic definitions, lesson files, and roadmap progression.

## Steps

**Step 1. Configure topics in topics.json.** Open `content/topics.json` and declare your chapter:

```json
// content/topics.json
[
  {
    "id": "getting-started",
    "title": "Getting started with guided format",
    "blurb": "Understand what guided format is and write your first lesson.",
    "order": 1,
    "track": "foundations",
    "lessons": ["what-is-guided", "write-a-task", "build-first-chapter"]
  }
]
```

① Give the chapter an id matching its topic property.
② List lesson slugs in the exact sequence they should be read.

**Step 2. Run the validator.** Execute the course validation command to confirm that all files match the contract:

```bash
// terminal
npm run validate -- examples/guided-course --strict
```

① Pass your course directory to validate.
② Use the strict flag to ensure release readiness.

## Check your work

Run the validation command in your terminal. You should see a green checkmark indicating that all lessons, topics, and quiz questions have passed:

```text
✓ Course validation passed (strict). Guided Course Demo: 3 lessons, 8 questions.
```

If any errors appear, check that all slugs listed in `topics.json` exist as `.md` files in `content/lessons/` and that their front-matter matches the chapter metadata.

## Solution

Here is the complete configuration check to verify your chapter layout:

```bash
// check-layout.sh
test -f content/topics.json && echo "topics.json exists"
test -f content/lessons/what-is-guided.md && echo "concept lesson exists"
test -f content/lessons/write-a-task.md && echo "task lesson exists"
```

## Recap

- Chapters tie together lessons into a focused competency milestone.
- Every slug listed in topics.json must match an existing lesson file.
- Strict validation ensures your entire chapter is ready for release.
