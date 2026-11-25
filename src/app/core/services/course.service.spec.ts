import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CourseService } from './course.service';
import { CourseManifest, LessonMeta, letterOf, sortKey } from '../models/lesson.model';

const lesson = (slug: string, title: string, topic = 'signals', related: string[] = []): LessonMeta => ({
  slug, title, topic, kind: 'api', summary: `${title}.`, tags: [], related, minutes: 3, file: `lessons/${slug}.md`,
});

const MANIFEST: CourseManifest = {
  topics: [
    { id: 'signals', title: 'Signals', blurb: '', order: 1, count: 3 },
    { id: 'templates', title: 'Templates', blurb: '', order: 2, count: 2 },
    { id: 'routing', title: 'Routing', blurb: '', order: 3, count: 0 },
  ],
  lessons: [
    lesson('signal', 'signal()', 'signals', ['computed', 'gone']),
    lesson('computed', 'computed()', 'signals', ['signal']),
    lesson('effect', 'effect()', 'signals'),
    lesson('if-block', '@if, @else', 'templates'),
    lesson('two-way', '[(ngModel)] two-way', 'templates'),
  ],
  legacy: [
    { id: 'lesson-08', slug: 'introduction-to-signals', title: 'Introduction to Signals', lessons: ['signal', 'computed'], topic: 'signals' },
    { id: 'lesson-99', slug: 'not-migrated', title: 'Not migrated', lessons: [] },
  ],
};

describe('lesson title helpers', () => {
  it('ignores leading symbols when sorting', () => {
    expect(sortKey('@if, @else')).toBe('if, @else');
    expect(sortKey('[(ngModel)] two-way')).toBe('ngmodel)] two-way');
    expect(sortKey('computed()')).toBe('computed()');
  });

  it('buckets by first letter, digits under #', () => {
    expect(letterOf('@if')).toBe('I');
    expect(letterOf('computed()')).toBe('C');
    expect(letterOf('3 ways to bind')).toBe('#');
  });
});

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CourseService);
    const loading = service.load();
    TestBed.inject(HttpTestingController).expectOne('content/course-manifest.json').flush(MANIFEST);
    await loading;
  });

  it('lists lessons A–Z, ignoring leading symbols', () => {
    // "[(ngModel)] two-way" sorts under N, between @if (I) and signal() (S).
    expect(service.lessons().map((l) => l.slug)).toEqual(['computed', 'effect', 'if-block', 'two-way', 'signal']);
  });

  it('only exposes topics that have lessons', () => {
    expect(service.topics().map((t) => t.id)).toEqual(['signals', 'templates']);
  });

  it('finds lessons by slug and by topic', () => {
    expect(service.getBySlug('effect')?.title).toBe('effect()');
    expect(service.getBySlug('nope')).toBeUndefined();
    expect(service.byTopic('templates').map((l) => l.slug)).toEqual(['if-block', 'two-way']);
  });

  it('resolves related lessons and skips ones that no longer exist', () => {
    expect(service.related('signal').map((l) => l.slug)).toEqual(['computed']);
    expect(service.related('missing')).toEqual([]);
  });

  describe('sample / random', () => {
    it('returns distinct lessons and honours the count', () => {
      const picked = service.sample(3);
      expect(picked.length).toBe(3);
      expect(new Set(picked.map((l) => l.slug)).size).toBe(3);
    });

    it('prefers lessons that are not learned yet', () => {
      const learned = new Set(['signal', 'computed', 'effect']);
      const picked = service.sample(2, { learned }).map((l) => l.slug).sort();
      expect(picked).toEqual(['if-block', 'two-way']);
    });

    it('falls back to learned lessons when there are not enough new ones', () => {
      const learned = new Set(['signal', 'computed', 'effect', 'if-block']);
      const picked = service.sample(3, { learned }).map((l) => l.slug);
      expect(picked[0]).toBe('two-way');
      expect(picked.length).toBe(3);
    });

    it('can exclude the lesson being read', () => {
      for (let i = 0; i < 20; i++) {
        expect(service.random({ exclude: 'signal' })?.slug).not.toBe('signal');
      }
    });

    it('is deterministic for a given random source', () => {
      const a = service.sample(5, { rng: () => 0.3 }).map((l) => l.slug);
      const b = service.sample(5, { rng: () => 0.3 }).map((l) => l.slug);
      expect(a).toEqual(b);
    });
  });

  describe('legacy', () => {
    it('maps an old slug to its entry', () => {
      expect(service.legacyBySlug('introduction-to-signals')?.lessons).toEqual(['signal', 'computed']);
      expect(service.legacyBySlug('introduction-to-signals')?.topic).toBe('signals');
      expect(service.legacyBySlug('nope')).toBeUndefined();
    });

    it('keeps entries that are not migrated yet', () => {
      expect(service.legacyBySlug('not-migrated')?.lessons).toEqual([]);
    });
  });

  describe('guided course', () => {
    let guidedService: CourseService;

    const GUIDED_MANIFEST: CourseManifest = {
      format: 'guided',
      tracks: [
        { id: 'foundations', title: 'Foundations', blurb: 'Basics', level: 'beginner' },
        { id: 'advanced', title: 'Advanced', blurb: 'Deep dives', level: 'advanced' },
      ],
      topics: [
        { id: 'ch1', title: 'Chapter 1', blurb: '', order: 1, count: 2, track: 'foundations', number: 1, lessons: ['lesson-a', 'lesson-b'] },
        { id: 'ch2', title: 'Chapter 2', blurb: '', order: 2, count: 1, track: 'advanced', number: 2, lessons: ['lesson-c'] },
      ],
      lessons: [
        { slug: 'lesson-a', title: 'Lesson A', topic: 'ch1', kind: 'concept', summary: '', tags: [], related: [], minutes: 2, file: 'lessons/lesson-a.md', number: '1.1', aliases: ['old-a'] },
        { slug: 'lesson-b', title: 'Lesson B', topic: 'ch1', kind: 'task', summary: '', tags: [], related: [], minutes: 3, file: 'lessons/lesson-b.md', number: '1.2' },
        { slug: 'lesson-c', title: 'Lesson C', topic: 'ch2', kind: 'build', summary: '', tags: [], related: [], minutes: 5, file: 'lessons/lesson-c.md', number: '2.1' },
      ],
      legacy: [],
      path: ['lesson-a', 'lesson-b', 'lesson-c'],
    };

    beforeEach(async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
      guidedService = TestBed.inject(CourseService);
      const loading = guidedService.load();
      TestBed.inject(HttpTestingController).expectOne('content/course-manifest.json').flush(GUIDED_MANIFEST);
      await loading;
    });

    it('identifies as guided', () => {
      expect(guidedService.isGuided()).toBeTrue();
    });

    it('exposes the ordered path', () => {
      expect(guidedService.path()).toEqual(['lesson-a', 'lesson-b', 'lesson-c']);
    });

    it('returns lessons in route order for byTopic', () => {
      expect(guidedService.byTopic('ch1').map((l) => l.slug)).toEqual(['lesson-a', 'lesson-b']);
    });

    it('navigates next and previous across chapter boundaries', () => {
      expect(guidedService.nextInPath('lesson-a')?.slug).toBe('lesson-b');
      expect(guidedService.nextInPath('lesson-b')?.slug).toBe('lesson-c');
      expect(guidedService.nextInPath('lesson-c')).toBeUndefined();

      expect(guidedService.prevInPath('lesson-c')?.slug).toBe('lesson-b');
      expect(guidedService.prevInPath('lesson-b')?.slug).toBe('lesson-a');
      expect(guidedService.prevInPath('lesson-a')).toBeUndefined();
    });

    it('resolves lessons by alias', () => {
      expect(guidedService.getByAlias('old-a')?.slug).toBe('lesson-a');
      expect(guidedService.getByAlias('non-existent')).toBeUndefined();
    });

    it('finds the first unlearned lesson along the path', () => {
      expect(guidedService.firstUnlearned(new Set())?.slug).toBe('lesson-a');
      expect(guidedService.firstUnlearned(new Set(['lesson-a']))?.slug).toBe('lesson-b');
      expect(guidedService.firstUnlearned(new Set(['lesson-a', 'lesson-b']))?.slug).toBe('lesson-c');
      expect(guidedService.firstUnlearned(new Set(['lesson-a', 'lesson-b', 'lesson-c']))).toBeUndefined();
    });
  });
});
