import { COURSE } from '../course/course';
import { QuizMode } from './quiz.model';

/** Running tally for one question. `lastCorrect` drives the "Missed" quiz mode. */
export interface QuestionStat {
  seen: number;
  correct: number;
  lastCorrect: boolean;
}

/** One finished quiz run, newest first in `UserProgress.sessions`. */
export interface QuizSession {
  at: string;
  mode: QuizMode;
  topics: string[];
  total: number;
  correct: number;
  /** Ids of the questions answered wrong in this run. */
  missed: string[];
}

export interface UserProgress {
  version: 2;
  /** lesson slug → ISO date it was marked learned */
  learned: Record<string, string>;
  bookmarks: string[];
  lastOpened?: string;
  questions: Record<string, QuestionStat>;
  sessions: QuizSession[];
  /** Old long-lesson ids already folded into `learned`/`bookmarks`. */
  legacyImported: string[];
}

// Every course is served from the same origin, so each needs keys of its own.
export const PROGRESS_STORAGE_KEY = `${COURSE.id}-learning-progress-v2`;
/** The key of the old long-lesson shell, read once to carry completions and bookmarks over. */
export const LEGACY_PROGRESS_STORAGE_KEY = `${COURSE.id}-learning-progress`;

export const MAX_SESSIONS = 50;

/** Written into `legacyImported` by reset() so old progress is not resurrected. */
export const LEGACY_DISMISSED = '*';

/**
 * Moves progress recorded under old lesson slugs (`aliases`, old → new) to the new
 * slugs: learned keeps the earlier date, bookmarks drop duplicates, lastOpened follows.
 * Returns `p` itself when nothing needs to move, so callers can skip a write.
 */
export function migrateProgress(p: UserProgress, aliases: ReadonlyMap<string, string>): UserProgress {
  const moves = (slug: string) => aliases.has(slug) && aliases.get(slug) !== slug;
  const needed =
    Object.keys(p.learned).some(moves) ||
    p.bookmarks.some(moves) ||
    (p.lastOpened !== undefined && moves(p.lastOpened));
  if (!needed) return p;

  const learned: Record<string, string> = {};
  for (const [slug, date] of Object.entries(p.learned)) {
    const target = aliases.get(slug) ?? slug;
    const existing = learned[target];
    learned[target] = existing !== undefined && existing < date ? existing : date;
  }
  const bookmarks = [...new Set(p.bookmarks.map((slug) => aliases.get(slug) ?? slug))];
  const lastOpened = p.lastOpened === undefined ? undefined : (aliases.get(p.lastOpened) ?? p.lastOpened);
  return { ...p, learned, bookmarks, lastOpened };
}

export function emptyProgress(): UserProgress {
  return {
    version: 2,
    learned: {},
    bookmarks: [],
    questions: {},
    sessions: [],
    legacyImported: [],
  };
}
