/** Chip colour of a lesson kind; each tone has a `chip-<tone>` utility in styles.css. */
export type KindTone = 'violet' | 'blue' | 'emerald' | 'cyan' | 'orange' | 'neutral';

/** One of the kinds a lesson can be, as listed in course.json `kinds`. */
export interface CourseKind {
  id: string;
  label: string;
  /** One line shown under the kind filter. */
  hint: string;
  tone: KindTone;
}

/** A short code sample for the featured card on the home page. */
export interface CodeSample {
  lang: string;
  code: string;
}

/** The illustration of a quiz question on the home page. */
export interface QuizPreview {
  topic: string;
  prompt: string;
  options: string[];
  /** Position of the option drawn as selected, counting from 0. */
  selected: number;
}

/**
 * Everything the app knows about the course it is showing. It comes from the
 * course's course.json: `scripts/prepare-course.mjs` checks it, fills in the
 * defaults and writes it to `src/generated/course.ts`.
 */
export interface CourseConfig {
  /** The repository name. Names the storage keys and the learner's progress document. */
  id: string;
  /** Site name, e.g. "Angular Learn". */
  name: string;
  /** What is being taught, e.g. "Angular". Used inside sentences. */
  subject: string;
  description: string;
  /** The course's own logo (an SVG next to index.html), or null for the bite mark. */
  logo: string | null;
  /** The three stops of the brand gradient, used by the bite mark. */
  gradient: string[];
  home: {
    /** Small announcement above the headline, or null for none. */
    badge: string | null;
    /** Text before, the highlighted words, text after. */
    headline: string[];
    /** Up to three words suggested in the search box. */
    searchExamples: string[];
    /** Slug of the bite on the hero card; null picks the first one. */
    featuredLesson: string | null;
    featuredCode: CodeSample | null;
    quizPreview: QuizPreview | null;
  };
  kinds: CourseKind[];
  /** False for a course with no code languages; code-only styling is then left out. */
  hasCode: boolean;
}
