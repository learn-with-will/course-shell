---
slug: writing-a-bite
title: "Writing a bite"
topic: authoring
kind: how-to
summary: "A bite is one Markdown file that teaches one idea in three to five minutes, in five fixed sections."
tags: [lessons, markdown, visuals]
related: [course-json, preview-validate-deploy]
---
> **In one line:** A bite teaches exactly one idea, always in the same five sections, so a learner can open any of them and know where to look.

## The idea

A course is a set of small lessons called bites. Each bite is one Markdown file in `content/lessons/`, named after its slug. There are no levels and no fixed order: a learner searches for what they need, or lets the site pick something new, so every bite has to stand on its own and link to two to four related ones.

The file starts with front-matter (the metadata), then an "In one line" callout, then up to five sections in a fixed order. Three of them are required: **The idea** says why the thing exists and how it works, **See it** shows a minimal example, and **Remember** lists exactly three takeaways. **Go deeper** and **Watch out** are optional.

Reading time is never typed by hand. It is computed from the words and code lines, and the validator rejects a bite shorter than three minutes or longer than five.

## See it

```markdown
---
slug: knife-grip
title: "The pinch grip"
topic: knife-skills
kind: technique
summary: "Hold the blade, not just the handle, for control."
tags: [knives, safety]
related: [claw-hand, honing]
---
> **In one line:** Pinch the blade where it meets the handle.

## The idea
Why this grip exists and how it works.

## See it
A minimal example: a table, a short code block or a diagram.

## Remember
- First takeaway.
- Second takeaway.
- Third takeaway.
```

> **Tip:** Write the "In one line" callout first. If the idea does not fit in one sentence, it is two bites.

## Go deeper

Every bite needs at least one visual, chosen from the shape of the information rather than out of habit.

```tree
What shape is the information?
  Things compared on the same properties
    Table | a Markdown table @blue
  A rule, a caveat or a tip
    Callout | Tip, Note or Watch out @amber
  Steps between parties over time
    Sequence | a sequence block @primary
  A choice between options
    Tree | a tree block @green
  What depends on what
    Flow | a flow block
```

## Watch out

- A heading other than the five standard sections fails validation, and so does a `#` title: the title comes from front-matter.
- A bite that needs more than 700 words or five minutes is two ideas. Split it and link the halves as related.

## Remember

- One file, one idea, three to five minutes.
- The idea, See it and Remember are required; Remember has exactly three bullets.
- Pick the visual from the shape of the information: table, callout, sequence, tree or flow.
