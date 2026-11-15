---
slug: preview-validate-deploy
title: "Preview, validate, deploy"
topic: authoring
kind: how-to
summary: "Run the shell against your course folder to preview it, check it, and publish it on every push."
tags: [cli, validation, deploy]
related: [course-json, writing-a-bite]
---
> **In one line:** The shell lives in its own repository; you point it at a course folder to preview and check it, and a small workflow does the same on every push.

## The idea

A course repository holds no interface code, so it cannot run by itself. The shell does the running. On your machine you keep the shell next to your course folders and pass the course folder to each command. On GitHub, the course's workflow checks out the shell, validates the course in strict mode, builds it and publishes it to GitHub Pages.

Because each deploy uses the latest shell, an improvement to the shared interface reaches a course the next time that course is pushed, or when its workflow is run by hand.

```sequence
actor you: You | the author
actor shell: Course shell | commands and interface @blue
actor pages: GitHub Pages | hosting @green
you -> shell: Preview | live reload
you -> shell: Validate | lists every problem
note shell: Fix until it passes | strict mode @amber
you -> pages: Push | starts the workflow
pages -> shell: Checks out the shell
shell --> pages: Built site | validate, then build
pages --> you: The course is live
```

## See it

All commands run from the shell folder and take the course folder as their first argument. With no argument they use this demo course.

```bash
npm ci
npm run dev -- ../my-course
npm run validate -- ../my-course --strict
npm run build -- ../my-course
```

`dev` watches the course folder: save a lesson and the page reloads. `validate` lists every problem at once, with the file it is in. Without `--strict`, a topic that has no lessons yet is only a warning, which is handy while a course is being written.

The whole deploy workflow of a course is this file, `.github/workflows/deploy.yml`:

```yaml
name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    uses: learn-with-will/course-shell/.github/workflows/deploy-course.yml@main
```

> **Note:** The site is served from a path named after the repository, and the workflow sets that path for you. Keep `id` in `course.json` equal to the repository name.

## Watch out

- Validation in the workflow is strict. A course that only passes without `--strict` on your machine will fail to deploy.
- The generated lesson index is never committed. If you find a `course-manifest.json` in a course repository, delete it.

## Remember

- Run every command from the shell folder and pass the course folder as the first argument.
- `validate --strict` is the release gate, and the deploy workflow runs it before building.
- A course picks up shell improvements on its next deploy.
