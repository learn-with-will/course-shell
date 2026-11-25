import { TestBed } from '@angular/core/testing';
import { ProgressService, ProgressSink } from './progress.service';
import { LegacyEntry } from '../models/lesson.model';
import {
  LEGACY_PROGRESS_STORAGE_KEY,
  PROGRESS_STORAGE_KEY,
  UserProgress,
  emptyProgress,
} from '../models/progress.model';

const LEGACY: LegacyEntry[] = [
  { id: 'lesson-08', slug: 'introduction-to-signals', title: 'Signals', lessons: ['signal', 'computed'] },
  { id: 'lesson-12', slug: 'template-driven-forms', title: 'Forms', lessons: [] },
];

function create(): ProgressService {
  TestBed.resetTestingModule();
  return TestBed.inject(ProgressService);
}

describe('ProgressService', () => {
  beforeEach(() => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROGRESS_STORAGE_KEY);
  });
  afterEach(() => {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_PROGRESS_STORAGE_KEY);
  });

  it('marks lessons learned and unlearned', () => {
    const p = create();
    p.setLearned('signal', true);
    expect(p.isLearned('signal')).toBeTrue();
    expect(p.learnedCount()).toBe(1);
    p.toggleLearned('signal');
    expect(p.isLearned('signal')).toBeFalse();
  });

  it('toggles bookmarks and remembers the last opened lesson', () => {
    const p = create();
    p.toggleBookmark('effect');
    expect(p.isBookmarked('effect')).toBeTrue();
    p.toggleBookmark('effect');
    expect(p.isBookmarked('effect')).toBeFalse();

    p.setLastOpened('computed');
    expect(p.lastOpened()).toBe('computed');
  });

  describe('question stats', () => {
    it('tallies answers and computes overall accuracy', () => {
      const p = create();
      expect(p.accuracy()).toBeNull();
      p.recordAnswer('a', true);
      p.recordAnswer('a', false);
      p.recordAnswer('b', true);
      p.recordAnswer('b', true);
      expect(p.questionStats()['a']).toEqual({ seen: 2, correct: 1, lastCorrect: false });
      expect(p.accuracy()).toBe(75);
    });

    it('lists a question as missed until it is answered correctly', () => {
      const p = create();
      p.recordAnswer('q1', false);
      p.recordAnswer('q2', true);
      expect([...p.missedIds()]).toEqual(['q1']);
      p.recordAnswer('q1', true);
      expect(p.missedIds().size).toBe(0);
    });
  });

  it('keeps only the newest 50 quiz sessions', () => {
    const p = create();
    for (let i = 0; i < 55; i++) {
      p.recordSession({ at: `2026-01-${String(i).padStart(2, '0')}`, mode: 'quick', topics: [], total: 5, correct: i % 6, missed: [] });
    }
    expect(p.sessions().length).toBe(50);
    expect(p.sessions()[0].at).toBe('2026-01-54');
  });

  it('persists to the v2 key', async () => {
    const p = create();
    p.setLearned('signal', true);
    TestBed.tick();
    expect(JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY)!).learned.signal).toBeDefined();
    expect(create().isLearned('signal')).toBeTrue();
  });

  describe('cloud mode', () => {
    class FakeSink implements ProgressSink {
      pushes: { prev: UserProgress; next: UserProgress }[] = [];
      replaced: UserProgress[] = [];
      push(prev: UserProgress, next: UserProgress): void {
        this.pushes.push({ prev, next });
      }
      replace(next: UserProgress): void {
        this.replaced.push(next);
      }
    }

    it('forwards each edit to the sink with the state before and after', () => {
      const p = create();
      const sink = new FakeSink();
      p.attachCloud(sink, emptyProgress());

      p.setLearned('signal', true);
      p.toggleBookmark('effect');

      expect(sink.pushes.length).toBe(2);
      expect('signal' in sink.pushes[0].prev.learned).toBeFalse();
      expect('signal' in sink.pushes[0].next.learned).toBeTrue();
      expect(sink.pushes[1].next.bookmarks).toEqual(['effect']);
      expect(p.isCloud()).toBeTrue();
    });

    it('keeps the account\'s progress off this device', () => {
      const p = create();
      p.attachCloud(new FakeSink(), emptyProgress());
      p.setLearned('signal', true);
      TestBed.tick();
      expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    });

    it('shows remote progress without echoing it back to the sink', () => {
      const p = create();
      const sink = new FakeSink();
      p.attachCloud(sink, emptyProgress());
      p.applyRemote({ ...emptyProgress(), learned: { computed: '2026-01-01' } });
      expect(p.isLearned('computed')).toBeTrue();
      expect(sink.pushes).toEqual([]);
    });

    it('replaces the account copy on reset', () => {
      const p = create();
      const sink = new FakeSink();
      p.attachCloud(sink, { ...emptyProgress(), learned: { a: '2026-01-01' } });
      p.reset();
      expect(p.learnedCount()).toBe(0);
      expect(sink.replaced.length).toBe(1);
      expect(sink.replaced[0].learned).toEqual({});
    });

    it('returns to the device copy on detach, leaving nothing of the account behind', () => {
      const p = create();
      p.setLearned('local-lesson', true); // learned while signed out
      TestBed.tick();

      p.attachCloud(new FakeSink(), { ...emptyProgress(), learned: { 'account-lesson': '2026-01-01' } });
      expect(p.isLearned('account-lesson')).toBeTrue();

      p.detachCloud();
      expect(p.isCloud()).toBeFalse();
      expect(p.isLearned('account-lesson')).toBeFalse();
      expect(p.isLearned('local-lesson')).toBeTrue();
    });

    it('stops forwarding after detach', () => {
      const p = create();
      const sink = new FakeSink();
      p.attachCloud(sink, emptyProgress());
      p.detachCloud();
      p.setLearned('signal', true);
      expect(sink.pushes).toEqual([]);
    });

    it('peekLocal returns the live device progress, even before it is flushed to storage', () => {
      const p = create();
      p.setLearned('signal', true); // effect has not run yet
      expect(p.peekLocal().learned['signal']).toBeDefined();

      p.clearLocal();
      expect(localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    });
  });

  describe('importLegacy', () => {
    const seedOld = () =>
      localStorage.setItem(
        LEGACY_PROGRESS_STORAGE_KEY,
        JSON.stringify({
          completedLessons: ['lesson-08', 'lesson-12'],
          bookmarkedLessons: ['lesson-08'],
          quizResults: { 'lesson-08': { score: 80, passed: true, completedAt: '2026-01-01' } },
        }),
      );

    it('maps old completions and bookmarks onto the replacement lessons', () => {
      seedOld();
      const p = create();
      p.importLegacy(LEGACY);
      expect(p.isLearned('signal')).toBeTrue();
      expect(p.isLearned('computed')).toBeTrue();
      expect(p.isBookmarked('signal')).toBeTrue();
      expect(p.questionStats()).toEqual({}); // old quiz scores are dropped
    });

    it('leaves lessons that are not migrated yet for a later run', () => {
      seedOld();
      const p = create();
      p.importLegacy(LEGACY);
      expect(p.progress().legacyImported).toEqual(['lesson-08']);

      const migrated = LEGACY.map((e) => (e.id === 'lesson-12' ? { ...e, lessons: ['ngmodel'] } : e));
      p.importLegacy(migrated);
      expect(p.isLearned('ngmodel')).toBeTrue();
      expect(p.progress().legacyImported.sort()).toEqual(['lesson-08', 'lesson-12']);
    });

    it('is idempotent, so un-learning an imported lesson sticks', () => {
      seedOld();
      const p = create();
      p.importLegacy(LEGACY);
      p.setLearned('signal', false);
      p.importLegacy(LEGACY);
      expect(p.isLearned('signal')).toBeFalse();
    });

    it('does nothing when there is no v1 data', () => {
      const p = create();
      p.importLegacy(LEGACY);
      expect(p.learnedCount()).toBe(0);
    });

    it('is not resurrected by a reset', () => {
      seedOld();
      const p = create();
      p.importLegacy(LEGACY);
      p.reset();
      p.importLegacy(LEGACY);
      expect(p.learnedCount()).toBe(0);
      expect(p.bookmarks()).toEqual([]);
    });
  });

  describe('migrateAliases', () => {
    const ALIASES = new Map([
      ['signals-in-templates', 'signal'],
      ['pitfall-mutating-signal-array', 'signal-lists'],
    ]);

    function seeded(progress: Partial<UserProgress>): ProgressService {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ ...emptyProgress(), ...progress }));
      return create();
    }

    it('moves learned, bookmarks and lastOpened to the new slugs, keeping the earlier date', () => {
      const p = seeded({
        learned: { 'signals-in-templates': '2026-01-01T00:00:00.000Z', signal: '2026-03-01T00:00:00.000Z', computed: '2026-02-01T00:00:00.000Z' },
        bookmarks: ['signals-in-templates', 'signal', 'pitfall-mutating-signal-array'],
        lastOpened: 'pitfall-mutating-signal-array',
      });
      p.migrateAliases(ALIASES);
      expect(p.learned()).toEqual({ signal: '2026-01-01T00:00:00.000Z', computed: '2026-02-01T00:00:00.000Z' });
      expect(p.bookmarks()).toEqual(['signal', 'signal-lists']);
      expect(p.lastOpened()).toBe('signal-lists');
    });

    it('changes nothing on a second run, or when no old slug is stored', () => {
      const p = seeded({ learned: { 'signals-in-templates': '2026-01-01T00:00:00.000Z' } });
      p.migrateAliases(ALIASES);
      const after = p.progress();
      p.migrateAliases(ALIASES);
      expect(p.progress()).toBe(after);

      const fresh = seeded({ learned: { computed: '2026-02-01T00:00:00.000Z' } });
      const before = fresh.progress();
      fresh.migrateAliases(ALIASES);
      expect(fresh.progress()).toBe(before);
    });

    it('migrates progress that arrives with an account, and saves it back', () => {
      const p = create();
      p.migrateAliases(ALIASES);
      const pushed: UserProgress[] = [];
      const sink: ProgressSink = { push: (_prev, next) => pushed.push(next), replace: () => undefined };
      p.attachCloud(sink, { ...emptyProgress(), learned: { 'signals-in-templates': '2026-01-01T00:00:00.000Z' } });
      expect(p.isLearned('signal')).toBeTrue();
      expect(p.isLearned('signals-in-templates')).toBeFalse();
      expect(pushed.length).toBe(1);
      expect(pushed[0].learned).toEqual({ signal: '2026-01-01T00:00:00.000Z' });
    });
  });
});
