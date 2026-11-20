import { COURSE, CourseKind, CourseTrack, KindTone } from '../course/course';

/** What kind of thing a bite teaches: one of the ids in course.json `kinds`. Exactly one per lesson. */
export type LessonKind = string;

const byKind = <T>(pick: (kind: CourseKind) => T): Record<LessonKind, T> =>
  Object.fromEntries(COURSE.kinds.map((k) => [k.id, pick(k)]));

/** Chip utility per tone; defined in styles.css. Written out in full so Tailwind finds them. */
const TONE_CHIPS: Record<KindTone, string> = {
  violet: 'chip-violet',
  blue: 'chip-blue',
  emerald: 'chip-emerald',
  cyan: 'chip-cyan',
  orange: 'chip-orange',
  neutral: 'chip-neutral',
};

export const KINDS: LessonKind[] = COURSE.kinds.map((k) => k.id);
export const KIND_LABELS = byKind((k) => k.label);
export const KIND_HINTS = byKind((k) => k.hint);
export const KIND_CHIPS = byKind((k) => TONE_CHIPS[k.tone]);

/** One of the topics a lesson belongs to. `count` is filled in by the manifest script. */
export interface Topic {
  id: string;
  title: string;
  blurb: string;
  order: number;
  count: number;
  track?: string;
  number?: number;
  lessons?: string[];
}

/** A single bite (entry in course-manifest.json). */
export interface LessonMeta {
  slug: string;
  title: string;
  topic: string;
  kind: LessonKind;
  summary: string;
  tags: string[];
  /** 2–4 slugs of related bites, shown at the end of the lesson. */
  related: string[];
  /** First stable version of the subject that has it, when it matters. */
  since?: string;
  /** Reading time in minutes, computed from the body by the manifest script. */
  minutes: number;
  /** Path to the markdown file, relative to /content. */
  file: string;
  number?: string;
  goal?: string;
  requires?: string[];
  api?: string[];
  aliases?: string[];
}

/** Maps one of the old long lessons to the bites that replaced it. */
export interface LegacyEntry {
  id: string;
  slug: string;
  title: string;
  lessons: string[];
  /** Topic of the first replacement bite (set by the manifest script). */
  topic?: string;
}

export interface CourseManifest {
  format?: 'bites' | 'guided';
  tracks?: CourseTrack[];
  topics: Topic[];
  lessons: LessonMeta[];
  legacy: LegacyEntry[];
  path?: string[];
}

/** A loaded lesson: metadata plus the markdown body (front-matter stripped). */
export interface Lesson {
  meta: LessonMeta;
  content: string;
}

export interface LetterGroup {
  letter: string;
  lessons: LessonMeta[];
}

/** Title with leading symbols removed, so `@if` sorts under I and `[(ngModel)]` under N. */
export function sortKey(title: string): string {
  return title.replace(/^[^A-Za-z0-9]+/, '').toLowerCase();
}

/** A–Z bucket for a title; digits share the `#` bucket. */
export function letterOf(title: string): string {
  const first = sortKey(title).charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : '#';
}

/**
 * Alphabetical order, ignoring punctuation entirely so "signal()" sorts before
 * "Signal state service". Falls back to slug for stable ties.
 */
export function byTitle(a: LessonMeta, b: LessonMeta): number {
  const key = (l: LessonMeta) => sortKey(l.title).replace(/[^a-z0-9]/g, '');
  return key(a).localeCompare(key(b)) || a.slug.localeCompare(b.slug);
}
