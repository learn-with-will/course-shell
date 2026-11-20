---
slug: write-a-task
title: "Write your first task lesson"
topic: getting-started
kind: task
summary: "Craft a practical how-to lesson using the guided format front-matter and structure."
goal: "Write a complete task lesson with a clear outcome, code example, and recap."
requires: [what-is-guided]
api: ["front-matter"]
tags: [task, markdown]
related: [what-is-guided, build-first-chapter]
---
## Why you need it

Task lessons are the backbone of a guided course. They show the learner how to solve one specific problem with real code, clear steps, and verifiable results.

Writing a task lesson with the standard structure ensures that readers always find what they need: why the technique matters, step-by-step instructions, and an explanation of the underlying mechanics.

> **Task lesson:** a hands-on guide that teaches one concrete skill through practical steps and verifiable code output.

## Try it

**Step 1. Create the markdown file.** Create a new file in `content/lessons/` with the standard front-matter block:

```markdown
// content/lessons/hello-world.md
---
slug: hello-world
title: "Create your first hello world page"
topic: getting-started
kind: task
summary: "Display a greeting on the page using a simple template."
goal: "Render a heading with Hello World on the screen."
requires: [what-is-guided]
tags: [basics]
---
## Why you need it
Greet your users with a friendly welcome message.

## Try it
Add your component template.

## How it works
Angular renders the template directly into the DOM tree.

## Recap
- Create a template with HTML.
- Register it in your component.
- Verify the output in your browser.
```

① Define front-matter with slug, title, and goal.
② Structure the body into standard sections: Why you need it, Try it, How it works, and Recap.

**Result:** the course shell validator accepts the file and adds it to the chapter roadmap.

## How it works

The course validator reads the YAML front-matter and confirms that all required fields are present. For a task lesson, the `kind` field must be set to `task`.

| Section | Role | Mandatory |
|---|---|---|
| Why you need it | Explains the motivating problem | Yes |
| Try it | Step-by-step code instructions | Yes |
| How it works | Explains the mechanism behind the code | Yes |
| Common mistakes | Lists pitfalls and fixes | Optional |
| Recap | Exactly three takeaways | Yes |

A task lesson must always include at least one code block when the course teaches programming languages. Each code block must stay under twenty-five lines to maintain focus.

## Common mistakes

- **The validator reports missing section.** You left out one of the mandatory sections. Check that Why you need it, Try it, How it works, and Recap are present in order.
- **The validator reports Recap needs 3 bullets.** You provided fewer or more than three bullet points in the Recap section.

## Recap

- Task lessons teach one specific skill with actionable steps.
- The Try it section contains tested code and concrete output.
- Every task lesson concludes with exactly three recap takeaways.
