---
slug: what-is-guided
title: "Understand guided courses"
topic: getting-started
kind: concept
summary: "Learn the structure of a guided course and how lessons flow step by step."
goal: "Explain how a guided course organizes knowledge into clear tracks and chapters."
requires: []
aliases: [old-what-is-guided]
tags: [guided, architecture]
related: [write-a-task]
---
## Why you need it

When learning a complex framework or technical topic, browsing through random bite-sized articles can leave learners confused about what to study next. Without a sequential pathway, foundational concepts are easily skipped and advanced details appear too early before learners have the mental models to understand them.

Guided courses solve this fragmentation by introducing an explicit roadmap. Learners travel through ordered tracks and chapters, building competence one predictable step at a time without getting lost in unrelated technical details or fragmented documentation.

> **Guided course:** a structured learning pathway organized into tracks, chapters, and short sequential lessons that build systematically on earlier concepts.

## How it works

A guided course structures curriculum into three coherent levels: tracks, chapters, and lessons. Every lesson belongs to exactly one chapter, and chapters belong to an overarching track.

```flow
track: Tracks | Broad learning milestones @primary
chapter: Chapters | Competency units @amber
lesson: Lessons | Concrete actionable steps @green
track -> chapter: groups
chapter -> lesson: contains
```

Learners progress through lessons in strict pedagogical order. The course shell manages navigation automatically, providing next buttons that carry readers across chapter boundaries smoothly.

| Level | Purpose | Example |
|---|---|---|
| Track | High-level milestone representing broad competence | Foundations |
| Chapter | Cohesive competency solving a practical problem | Components |
| Lesson | Single actionable capability with verifiable output | Store data with signals |

Each lesson has a specific outcome stated directly in its goal front-matter property. Prerequisite lessons are tracked explicitly with the requires list, making dependencies completely transparent to both learners and the build toolchain.

Furthermore, previous lessons can be referenced safely without repeating explanations because the curriculum guarantees the learner has already completed the earlier material. This eliminates the need to over-explain basic concepts in intermediate lessons.

## Recap

- Guided courses organize curriculum into ordered tracks, chapters, and lessons.
- Every lesson achieves one concrete goal and builds on previous knowledge.
- Navigation flows sequentially so learners never wonder what to read next.
