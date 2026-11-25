import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  CourseManifest,
  LegacyEntry,
  LessonMeta,
  LetterGroup,
  Topic,
  byTitle,
  letterOf,
} from '../models/lesson.model';
import { shuffled } from '../util/shuffle';

export interface SampleOptions {
  /** Slugs already learned; bites outside this set are preferred. */
  learned?: ReadonlySet<string>;
  /** A slug to leave out (usually the lesson being read). */
  exclude?: string;
  /** Random source in [0, 1); injectable so tests are deterministic. */
  rng?: () => number;
}

const EMPTY: CourseManifest = { topics: [], lessons: [], legacy: [] };

/**
 * Loads and caches the course manifest, and answers every "which lessons?"
 * question: A–Z order, by topic, related, random, and the old-URL mapping.
 */
@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);

  private readonly _manifest = signal<CourseManifest>(EMPTY);
  private readonly _loaded = signal(false);
  private loadPromise?: Promise<void>;

  readonly loaded = this._loaded.asReadonly();

  readonly isGuided = computed(() => this._manifest().format === 'guided');
  readonly path = computed<string[]>(() => this._manifest().path ?? []);

  /** Topics that have at least one lesson, in display order. */
  readonly topics = computed(() => this._manifest().topics.filter((t) => t.count > 0));

  /** Every lesson in A–Z order (leading symbols ignored). */
  readonly lessons = computed(() => [...this._manifest().lessons].sort(byTitle));

  /** Lessons grouped under A–Z, with `#` for titles that start with a digit. */
  readonly alphabetical = computed<LetterGroup[]>(() => {
    const groups = new Map<string, LessonMeta[]>();
    for (const lesson of this.lessons()) {
      const letter = letterOf(lesson.title);
      groups.set(letter, [...(groups.get(letter) ?? []), lesson]);
    }
    return [...groups.entries()]
      .map(([letter, lessons]) => ({ letter, lessons }))
      .sort((a, b) => (a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter.localeCompare(b.letter)));
  });

  readonly legacyEntries = computed(() => this._manifest().legacy);

  private readonly bySlug = computed(() => new Map(this._manifest().lessons.map((l) => [l.slug, l])));
  private readonly byAlias = computed(() => {
    const map = new Map<string, LessonMeta>();
    for (const l of this._manifest().lessons) {
      for (const a of l.aliases ?? []) {
        map.set(a, l);
      }
    }
    return map;
  });

  /** Loads the manifest once; later calls share the finished (or in-flight) load. */
  load(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = firstValueFrom(
        this.http.get<CourseManifest>('content/course-manifest.json'),
      ).then(
        (data) => {
          this._manifest.set({ ...EMPTY, ...data });
          this._loaded.set(true);
        },
        (error) => {
          this.loadPromise = undefined; // allow a retry after a network failure
          throw error;
        },
      );
    }
    return this.loadPromise;
  }

  getBySlug(slug: string): LessonMeta | undefined {
    return this.bySlug().get(slug);
  }

  /** Old slug → current slug, for every alias in the course. */
  readonly aliasMap = computed<ReadonlyMap<string, string>>(
    () => new Map([...this.byAlias()].map(([alias, lesson]) => [alias, lesson.slug])),
  );

  getByAlias(slug: string): LessonMeta | undefined {
    return this.byAlias().get(slug);
  }

  nextInPath(slug: string): LessonMeta | undefined {
    const p = this.path();
    const idx = p.indexOf(slug);
    return idx >= 0 && idx < p.length - 1 ? this.getBySlug(p[idx + 1]) : undefined;
  }

  prevInPath(slug: string): LessonMeta | undefined {
    const p = this.path();
    const idx = p.indexOf(slug);
    return idx > 0 ? this.getBySlug(p[idx - 1]) : undefined;
  }

  firstUnlearned(learned: ReadonlySet<string>): LessonMeta | undefined {
    if (this.isGuided()) {
      for (const slug of this.path()) {
        if (!learned.has(slug)) return this.getBySlug(slug);
      }
      return undefined;
    }
    return this.lessons().find((l) => !learned.has(l.slug));
  }

  getTopic(id: string): Topic | undefined {
    return this._manifest().topics.find((t) => t.id === id);
  }

  byTopic(topicId: string): LessonMeta[] {
    if (this.isGuided()) {
      const topic = this.getTopic(topicId);
      if (topic?.lessons) {
        return topic.lessons
          .map((slug) => this.getBySlug(slug))
          .filter((l): l is LessonMeta => !!l);
      }
    }
    return this.lessons().filter((l) => l.topic === topicId);
  }

  /** The bites a lesson points to as related, skipping any that no longer exist. */
  related(slug: string): LessonMeta[] {
    const meta = this.getBySlug(slug);
    if (!meta) return [];
    return meta.related.map((s) => this.getBySlug(s)).filter((l): l is LessonMeta => !!l);
  }

  /** Picks up to `n` distinct lessons at random, preferring ones not yet learned. */
  sample(n: number, opts: SampleOptions = {}): LessonMeta[] {
    const all = this.lessons().filter((l) => l.slug !== opts.exclude);
    const isLearned = (l: LessonMeta) => opts.learned?.has(l.slug) ?? false;
    // Unlearned bites come first (shuffled); learned ones only top the list up.
    return [
      ...shuffled(all.filter((l) => !isLearned(l)), opts.rng),
      ...shuffled(all.filter(isLearned), opts.rng),
    ].slice(0, n);
  }

  /** One random lesson, preferring unlearned ones; undefined if the course is empty. */
  random(opts: SampleOptions = {}): LessonMeta | undefined {
    return this.sample(1, opts)[0] ?? this.lessons()[0];
  }

  legacyBySlug(slug: string): LegacyEntry | undefined {
    return this._manifest().legacy.find((e) => e.slug === slug);
  }

  legacyById(id: string): LegacyEntry | undefined {
    return this._manifest().legacy.find((e) => e.id === id);
  }
}
