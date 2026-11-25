# Bites Demo

A complete, tiny course about writing courses for the
[course shell](https://github.com/learn-with-will/course-shell). It has three jobs: it is what
the shell shows when no course folder is given, it is the fixture the shell's tests and CI
build, and it is the folder to copy when you start a new course.

```text
course.json                    name, brand colour, home page copy, kinds, code languages
content/topics.json            the topics
content/lessons/*.md           one bite per file
quiz/questions.json            the question bank (all five question types)
.github/workflows/deploy.yml   the whole deploy workflow of a course repository
```

## Start a course from it

1. Copy this folder next to the shell and rename it to your repository name.
2. In `course.json`, set `id` to that name, then the `name`, `subject`, `description` and
   `brand.color`. Point `$schema` at
   `https://raw.githubusercontent.com/learn-with-will/course-shell/main/course.schema.json`.
3. Replace the topics, lessons and questions with your own.
4. From the shell folder:

   ```bash
   npm run dev -- ../my-course
   npm run validate -- ../my-course --strict
   ```

The three lessons here explain each step.
