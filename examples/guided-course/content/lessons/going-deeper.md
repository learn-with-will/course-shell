---
slug: going-deeper
title: "Explore advanced course techniques"
topic: polishing-lessons
kind: concept
summary: "Deepen lessons in advanced tracks using the going further section."
goal: "Use the Going further section appropriately within advanced tracks."
requires: [what-is-guided]
tags: [advanced, depth]
related: [why-tests-fail]
---
## Why you need it

In beginner tracks, lessons must stay tightly focused on one single concept to avoid overwhelming new learners with unnecessary complexity. Detours into edge cases, architecture internals, or niche flags do more harm than good early in the learning journey.

However, once learners reach advanced tracks, they often appreciate extra technical context, historical trade-offs, and direct references to official specifications. The guided format provides an optional section specifically designed to satisfy this curiosity without cluttering the main lesson body.

> **Going further:** an optional section in advanced lessons that links to RFCs, deep internals, or advanced edge cases.

## How it works

The `Going further` section is exclusively permitted in tracks with `level: "advanced"`. The course validator enforces this rule to protect beginners from cognitive overload in earlier chapters while allowing deeper exploration later.

| Track Level | "Going further" permitted | Purpose |
|---|---|---|
| Beginner | No | Keep focus on fundamental mastery and core syntax |
| Intermediate | No | Keep focus on practical application and workflow |
| Advanced | Yes | Provide research leads and deep dive specification context |

When writing this section, keep prose concise and provide high-value links to source code repositories, language specifications, or performance benchmarks. Do not introduce new core requirements here; everything necessary for the lesson goal must already be explained in the preceding sections.

By keeping advanced nuances separated into their own optional heading, readers who want a fast, focused walkthrough can stop at the Recap, while seasoned engineers can continue exploring the underlying mechanics.

## Going further

For authors building complex curricula, investigate automated AST linters that verify code examples against current compiler releases. You can also explore writing custom Prism grammar extensions if your course introduces a custom domain-specific language or specialized configuration format.

Consult the Antigravity developer guides for deeper automation workflows and continuous integration best practices across multi-package repositories.

## Recap

- The Going further section is reserved exclusively for advanced tracks.
- Beginner lessons remain focused on core mechanics without edge cases.
- Use Going further to point curious readers toward specifications and internals.
