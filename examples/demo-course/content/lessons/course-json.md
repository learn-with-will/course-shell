---
slug: course-json
title: "course.json"
topic: authoring
kind: reference
summary: "One small file tells the shell what your course is called, how it looks and which code it shows."
tags: [config, branding, kinds]
related: [writing-a-bite, preview-validate-deploy]
---
> **In one line:** `course.json` is the only place where a course describes itself, so the lessons and the shell stay free of names and colours.

## The idea

Every course uses the same user interface: the course shell. The shell knows how to list lessons, draw diagrams, run quizzes and save progress, but it knows nothing about any one course. What a course is called, which colour it wears and what its home page says all come from a single file at the top of the course folder, `course.json`.

When you build a course, a prepare step reads that file together with your lessons and questions, checks them, and hands the result to the shell. Changing the file changes the whole site, and no interface code is touched.

```flow
config: `course.json` | name, colours, copy @primary
content: Lessons and quiz | Markdown and JSON @blue
prepare: Prepare step | checks, then generates
build: Shell build | the shared interface
site: Your course site | ready to publish @green
config -> prepare
content -> prepare
prepare -> build
build -> site
```

## See it

The smallest file that works has five fields. The brand colour alone is enough: the shell derives the lighter and darker shades, the gradient and the logo from it.

```json
{
  "id": "my-course",
  "name": "My Course Learn",
  "subject": "My Course",
  "description": "Learn My Course in five-minute bites.",
  "brand": { "color": "#0D9488" }
}
```

Everything else is optional and has a sensible default.

| Field | What it controls |
|---|---|
| `id` | The repository name. It also names the saved progress, so never change it later |
| `name`, `subject` | The site name, and the word used inside sentences |
| `brand` | Colour, and optionally an exact scale, a gradient, a logo and a favicon |
| `home` | The badge, headline, search examples and featured bite on the home page |
| `kinds` | The kinds a lesson can be, each with a label, a hint and a chip colour |
| `codeLanguages` | The languages that code blocks may use and that get highlighted |

## Go deeper

A course about cooking has no "API" lessons. List your own kinds, and give each one of the six tones: `violet`, `blue`, `emerald`, `cyan`, `orange` or `neutral`.

```json
{
  "kinds": [
    { "id": "concept", "label": "Concept", "hint": "How it works", "tone": "violet" },
    { "id": "recipe", "label": "Recipe", "hint": "Steps to follow", "tone": "emerald" }
  ]
}
```

A lesson then says `kind: recipe` in its front-matter, and the lesson list offers a "Recipe" filter.

## Watch out

- Changing `id` after people have used the course hides their saved progress, because the storage keys are built from it.
- A code block in a language that is missing from `codeLanguages` fails validation. Add the language, or use `text`.

## Remember

- `course.json` holds the name, the look and the home page copy; lessons hold only content.
- `id`, `name`, `subject`, `description` and `brand.color` are required; everything else has a default.
- Kinds and code languages are per course, so the same shell fits a programming course and a cooking course.
