import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CourseService } from '../../core/services/course.service';
import { ProgressService } from '../../core/services/progress.service';
import { QuizService } from '../../core/services/quiz.service';
import { SearchService } from '../../core/services/search.service';
import { COURSE, CodeSample } from '../../core/course/course';
import { KIND_CHIPS, KIND_LABELS, Topic } from '../../core/models/lesson.model';
import { LessonCard } from '../../shared/components/lesson-card/lesson-card';

/** Prism is loaded as a global script (angular.json), with the course's languages. */
declare const Prism:
  | { languages: Record<string, unknown>; highlight(code: string, grammar: unknown, language: string): string }
  | undefined;

/** The sample as highlighted HTML, or as plain escaped text when its language is not loaded. */
function highlight(sample: CodeSample): string {
  const grammar = typeof Prism === 'undefined' ? undefined : Prism.languages[sample.lang];
  if (grammar) return Prism!.highlight(sample.code, grammar, sample.lang);
  return sample.code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** "Try “a”, “b” or “c”" for the search box, from the course's example words. */
function searchHint(examples: string[]): string {
  if (!examples.length) return 'Search lessons';
  const quoted = examples.map((word) => `“${word}”`);
  const last = quoted.pop();
  return quoted.length ? `Try ${quoted.join(', ')} or ${last}` : `Try ${last}`;
}

interface TopicTile {
  topic: Topic;
  /** Two-digit position, shown as the tile's label. */
  number: string;
  learned: number;
  pct: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, LessonCard],
  templateUrl: './home.html',
})
export class Home {
  protected readonly course = inject(CourseService);
  protected readonly progress = inject(ProgressService);
  private readonly quiz = inject(QuizService);
  private readonly search = inject(SearchService);
  private readonly router = inject(Router);

  protected readonly kindLabels = KIND_LABELS;
  protected readonly kindChips = KIND_CHIPS;

  // Course-specific copy, from course.json.
  protected readonly home = COURSE.home;
  protected readonly subject = COURSE.subject;
  protected readonly hasCode = COURSE.hasCode;
  protected readonly searchPlaceholder = searchHint(COURSE.home.searchExamples);
  protected readonly featuredCode = COURSE.home.featuredCode ? highlight(COURSE.home.featuredCode) : null;

  constructor() {
    void this.quiz.load().catch(() => undefined);
  }

  protected readonly query = signal('');
  protected readonly suggestions = computed(() => this.search.search(this.query()).slice(0, 5));

  protected readonly totalLessons = computed(() => this.course.lessons().length);

  protected readonly learnedPct = computed(() => {
    const total = this.totalLessons();
    return total === 0 ? 0 : Math.round((this.progress.learnedCount() / total) * 100);
  });

  /** "3–5 min": the shortest and longest reading time in the course. */
  protected readonly minuteRange = computed(() => {
    const mins = this.course.lessons().map((l) => l.minutes);
    if (!mins.length) return '';
    const lo = Math.min(...mins);
    const hi = Math.max(...mins);
    return lo === hi ? `${lo} min` : `${lo}–${hi} min`;
  });

  /** The lesson the learner had open last, if it still exists. */
  protected readonly continueLesson = computed(() => {
    const slug = this.progress.lastOpened();
    return slug ? this.course.getBySlug(slug) : undefined;
  });

  /** For a first visit: the opening bite of the first topic. */
  protected readonly firstLesson = computed(() => {
    const first = this.course.topics()[0];
    return first ? this.course.byTopic(first.id)[0] : undefined;
  });

  /** The bite shown in the hero card: the one the course names, else the first. */
  protected readonly featured = computed(
    () => this.course.getBySlug(COURSE.home.featuredLesson ?? '') ?? this.course.lessons()[0],
  );

  protected readonly topicTiles = computed<TopicTile[]>(() => {
    const learned = this.progress.learned();
    const guided = this.course.isGuided();
    return this.course.topics().map((topic, i) => {
      const done = this.course.byTopic(topic.id).filter((l) => l.slug in learned).length;
      return {
        topic,
        number: guided && topic.number !== undefined ? `CH ${topic.number}` : String(i + 1).padStart(2, '0'),
        learned: done,
        pct: topic.count === 0 ? 0 : Math.round((done / topic.count) * 100),
      };
    });
  });

  /** Guided courses: the next lesson on the path, i.e. the first one not learned yet. */
  protected readonly nextLesson = computed(() =>
    this.course.firstUnlearned(new Set(Object.keys(this.progress.learned()))),
  );

  /** Guided courses: true once any lesson is learned, so the button says "Continue". */
  protected readonly started = computed(() => this.progress.learnedCount() > 0);

  /** Tiles to show: under their track for guided courses, one untitled group otherwise. */
  protected readonly tileGroups = computed<{ id: string; title: string | null; blurb: string; tiles: TopicTile[] }[]>(
    () => {
      if (!this.course.isGuided()) return [{ id: 'all', title: null, blurb: '', tiles: this.topicTiles() }];
      return this.course
        .tracks()
        .map((track) => ({
          id: track.id,
          title: track.title,
          blurb: track.blurb,
          tiles: this.topicTiles().filter((t) => t.topic.track === track.id),
        }))
        .filter((g) => g.tiles.length > 0);
    },
  );

  protected readonly lastRound = computed(() => this.progress.sessions()[0]);

  protected readonly missedCount = computed(() => {
    const missed = this.progress.missedIds();
    return this.quiz.bank().filter((q) => missed.has(q.id)).length;
  });

  /** Bumped by "Shuffle" to draw a fresh set of suggestions. */
  private readonly seed = signal(0);

  protected readonly picks = computed(() => {
    this.seed();
    return this.course.sample(3, {
      learned: new Set(Object.keys(this.progress.learned())),
      exclude: this.progress.lastOpened(),
    });
  });

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const q = this.query().trim();
    void this.router.navigate(['/lessons'], { queryParams: q ? { q } : {} });
  }

  protected shuffle(): void {
    this.seed.update((n) => n + 1);
  }
}
