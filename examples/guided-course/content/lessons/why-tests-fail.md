---
slug: why-tests-fail
title: "Why do validation tests fail?"
topic: polishing-lessons
kind: troubleshoot
summary: "Diagnose and fix common schema and lesson formatting errors."
goal: "Resolve validator errors reported when checking guided lessons."
requires: [write-a-task]
tags: [troubleshoot, validator]
related: [going-deeper]
---
## What you see

You run the course validator before shipping and receive an error message in your terminal:

```text
✗ Course validation FAILED with 1 problem(s):
  - [lessons/sample.md] section out of order: "## Try it"
```

The build stops, and your release pull request cannot be merged until all errors are resolved.

## Why it happens

The guided course validator strictly checks the order and presence of section headings for every lesson kind.

For concept and task lessons, sections must follow the defined order: `Why you need it` must precede `Try it`, which must precede `How it works`. If an author swaps two headings or invents a custom H2 that is not part of the allowed list, the validator halts.

Similarly, if an author forgets one of the mandatory sections such as `Recap`, the validator flags it immediately.

## How to fix it

Open the offending markdown file and review its headings against the specification for that lesson kind.

1. Verify that your front-matter `kind` matches the intended lesson type.
2. Ensure all mandatory sections for that kind are present.
3. Reorder the H2 headings so they match the standard order: Why you need it, Try it, How it works, and Recap.
4. Check that your Recap section contains exactly three bullet items.

Once corrected, rerun the validation script:

```bash
// terminal
npm run validate -- examples/guided-course --strict
```

The terminal will report that validation has passed cleanly.

## Recap

- Section headings must follow the exact order specified for each lesson kind.
- Mandatory sections like Recap and Why you need it can never be omitted.
- Always run the validator in strict mode before creating release commits.
