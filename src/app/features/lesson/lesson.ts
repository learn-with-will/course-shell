import {
  ApplicationRef,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  EnvironmentInjector,
  computed,
  createComponent,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MarkdownComponent } from 'ngx-markdown';

import { CourseService } from '../../core/services/course.service';
import { LessonService } from '../../core/services/lesson.service';
import { ProgressService } from '../../core/services/progress.service';
import { COURSE } from '../../core/course/course';
import { KIND_CHIPS, KIND_LABELS, Lesson, LessonMeta } from '../../core/models/lesson.model';
import { RelatedLessons } from '../../shared/components/related-lessons/related-lessons';
import { Diagram } from '../../shared/diagram/diagram';
import { DiagramSpec, isDiagramKind, parseDiagram } from '../../shared/diagram/diagram-parser';

interface TocEntry {
  id: string;
  text: string;
}

/** Turns a heading into a URL-safe id: "Go deeper" → "go-deeper". */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/** Callout labels (the bold lead-in of a blockquote) → the tone they are drawn in. */
const CALLOUTS: Record<string, string> = {
  'in one line': 'dg-tone-primary',
  tip: 'dg-tone-green',
  note: 'dg-tone-blue',
  'watch out': 'dg-tone-amber',
};

/**
 * A first code line that only names the block's file, in the comment syntax of its language:
 * `// src/app/app.ts`, `<!-- src/app/app.html -->`, a CSS block comment, or `# setup.sh`.
 * An optional note in brackets follows the path: `// src/app/app.ts (changed parts)`.
 */
const FILE_COMMENT =
  /^\s*(?:\/\/|<!--|\/\*|#)\s*((?:[\w.@-]+\/)*[\w.@-]+\.[a-z0-9]+)(?:\s+\(([^)]*)\))?\s*(?:-->|\*\/)?\s*$/i;

const FILE_ICON =
  '<svg class="code-tab-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true">' +
  '<path d="M4 1.75h5.5L13 5.25v9H4z"/><path d="M9.5 1.75v3.5H13"/></svg>';

/** A code block on the page, with the file its first line named (if any). */
interface CodeFile {
  pre: HTMLPreElement;
  code: HTMLElement;
  path?: string;
  note?: string;
}

let nextCodeGroup = 0;

/** Removes the first `count` characters of an element's text, across nested highlight spans. */
function dropLeadingText(root: Element, count: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let left = count;
  for (let node = walker.nextNode() as Text | null; node && left > 0; node = walker.nextNode() as Text | null) {
    const take = Math.min(left, node.data.length);
    node.data = node.data.slice(take);
    left -= take;
  }
  root.querySelectorAll('*').forEach((el) => {
    if (!el.textContent) el.remove();
  });
}

/** Section headings whose bullet list is drawn as a stack of cards, and how. */
const LIST_SECTIONS: Record<string, string[]> = {
  'watch out': ['dg-list', 'dg-list-warn', 'dg-tone-amber'],
  'common mistakes': ['dg-list', 'dg-list-warn', 'dg-tone-amber'],
  remember: ['dg-list', 'dg-list-remember', 'dg-tone-blue'],
  recap: ['dg-list', 'dg-list-remember', 'dg-tone-blue'],
};

@Component({
  selector: 'app-lesson-page',
  imports: [RouterLink, MarkdownComponent, RelatedLessons],
  templateUrl: './lesson.html',
  host: { '(window:scroll)': 'onScroll()', '(window:resize)': 'onScroll()' },
})
export class LessonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly title = inject(Title);
  private readonly lessonService = inject(LessonService);
  private readonly appRef = inject(ApplicationRef);
  private readonly injector = inject(EnvironmentInjector);
  protected readonly course = inject(CourseService);
  protected readonly progress = inject(ProgressService);

  protected readonly slug = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')),
    { initialValue: '' },
  );

  protected readonly lesson = signal<Lesson | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly subject = COURSE.subject;

  protected readonly learned = computed(() => {
    const l = this.lesson();
    return l ? this.progress.isLearned(l.meta.slug) : false;
  });
  protected readonly bookmarked = computed(() => {
    const l = this.lesson();
    return l ? this.progress.isBookmarked(l.meta.slug) : false;
  });
  protected readonly topicTitle = computed(() => {
    const l = this.lesson();
    return l ? (this.course.getTopic(l.meta.topic)?.title ?? '') : '';
  });
  protected readonly kindLabel = computed(() => {
    const l = this.lesson();
    return l ? KIND_LABELS[l.meta.kind] : '';
  });
  protected readonly kindClass = computed(() => {
    const l = this.lesson();
    return l ? KIND_CHIPS[l.meta.kind] : 'badge';
  });

  /** Every bite in this lesson's topic, A–Z, for the side outline and prev/next. */
  protected readonly topicLessons = computed(() => {
    const l = this.lesson();
    return l ? this.course.byTopic(l.meta.topic) : [];
  });
  protected readonly topicLearned = computed(() => {
    const learned = this.progress.learned();
    return this.topicLessons().filter((l) => l.slug in learned).length;
  });
  private readonly position = computed(() => {
    const slug = this.lesson()?.meta.slug;
    return this.topicLessons().findIndex((l) => l.slug === slug);
  });
  protected readonly prev = computed(() => {
    const i = this.position();
    return i > 0 ? this.topicLessons()[i - 1] : undefined;
  });
  protected readonly next = computed(() => {
    const i = this.position();
    return i >= 0 ? this.topicLessons()[i + 1] : undefined;
  });

  protected readonly currentTopic = computed(() => {
    const l = this.lesson();
    return l ? this.course.getTopic(l.meta.topic) : undefined;
  });

  protected readonly requiresLessons = computed(() => {
    const l = this.lesson();
    if (!l?.meta.requires?.length) return [];
    return l.meta.requires
      .map((s) => this.course.getBySlug(s))
      .filter((item): item is LessonMeta => !!item);
  });

  protected readonly guidedPrev = computed(() => {
    const slug = this.lesson()?.meta.slug;
    return slug ? this.course.prevInPath(slug) : undefined;
  });

  protected readonly guidedNext = computed(() => {
    const slug = this.lesson()?.meta.slug;
    return slug ? this.course.nextInPath(slug) : undefined;
  });

  protected readonly isNewChapter = computed(() => {
    const current = this.lesson()?.meta;
    const next = this.guidedNext();
    if (!current || !next) return false;
    return next.topic !== current.topic;
  });

  protected readonly nextTopic = computed(() => {
    const next = this.guidedNext();
    return next ? this.course.getTopic(next.topic) : undefined;
  });

  /** The lesson's sections, read from its rendered h2s, for "On this page". */
  protected readonly toc = signal<TocEntry[]>([]);
  protected readonly activeSection = signal<string | null>(null);
  /** 0–100: how far through the article the reader has scrolled. */
  protected readonly readProgress = signal(0);
  private scrollFrame = 0;

  /** Diagram components mounted into the rendered markdown; destroyed when it re-renders. */
  private diagrams: ComponentRef<Diagram>[] = [];

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (slug) void this.loadLesson(slug);
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyDiagrams();
      cancelAnimationFrame(this.scrollFrame);
    });
  }

  private async loadLesson(slug: string): Promise<void> {
    this.loading.set(true);
    this.notFound.set(false);
    await this.course.load().catch(() => undefined);
    if (this.slug() !== slug) return; // navigated away while the manifest loaded

    const meta = this.course.getBySlug(slug);
    if (!meta) {
      this.lesson.set(null);
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    const lesson = await this.lessonService.loadLesson(meta);
    if (this.slug() !== slug) return;
    this.toc.set([]);
    this.activeSection.set(null);
    this.readProgress.set(0);
    this.lesson.set(lesson);
    this.progress.setLastOpened(meta.slug);
    this.title.setTitle(`${meta.title} · ${COURSE.name}`);
    this.loading.set(false);
  }

  /** ngx-markdown finished rendering: decorate callouts and draw any diagrams. */
  onMarkdownReady(): void {
    const container = this.host.nativeElement.querySelector('.lesson-content');
    if (!container) return;
    this.enhanceCallouts(container);
    this.enhanceTables(container);
    this.enhanceSections(container);
    this.mountDiagrams(container);
    this.enhanceCode(container);
    this.collectToc(container);
    this.onScroll();
  }

  /** Gives each h2 a stable id and lists them for "On this page". */
  private collectToc(root: Element): void {
    const used = new Set<string>();
    const entries: TocEntry[] = [];
    root.querySelectorAll('h2').forEach((heading) => {
      const text = (heading.textContent ?? '').trim();
      let id = heading.id || slugify(text);
      for (let n = 2; used.has(id); n++) id = `${slugify(text)}-${n}`;
      used.add(id);
      heading.id = id;
      entries.push({ id, text });
    });
    this.toc.set(entries);
  }

  /**
   * Adds a Copy button to every highlighted code block. A block whose first line names
   * its file loses that line and gets an editor-style tab with the file name instead.
   * Code blocks with file names that follow each other directly (nothing written between
   * them) become one block with a clickable tab per file, like an editor.
   */
  private enhanceCode(root: Element): void {
    const blocks: CodeFile[][] = [];
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.parentElement?.classList.contains('code-block')) return;
      const code = pre.querySelector('code');
      if (!code) return;

      const firstLine = (code.textContent ?? '').split('\n', 1)[0];
      const file = FILE_COMMENT.exec(firstLine);
      if (file) dropLeadingText(code, firstLine.length + 1);
      const item: CodeFile = { pre, code, path: file?.[1], note: file?.[2] };

      const run = blocks.at(-1);
      const last = run?.at(-1);
      if (run && last?.path && item.path && last.pre.nextElementSibling === pre) run.push(item);
      else blocks.push([item]);
    });
    blocks.forEach((files) => this.buildCodeBlock(files));
  }

  /** Wraps one or more code blocks (the files of one group) in a single panel. */
  private buildCodeBlock(files: CodeFile[]): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    files[0].pre.replaceWith(wrapper);

    let active = 0;
    const copy = this.copyButton(() => files[active].code.textContent ?? '');

    if (!files[0].path) {
      wrapper.append(files[0].pre, copy);
      return;
    }

    wrapper.classList.add('has-tab');
    const bar = document.createElement('div');
    bar.className = 'code-tabbar';
    const strip = document.createElement('div');
    strip.className = 'code-tabs';
    bar.append(strip, copy);
    wrapper.appendChild(bar);

    if (files.length === 1) {
      strip.appendChild(this.codeTab('div', files[0]));
      wrapper.appendChild(files[0].pre);
      return;
    }

    // Several files: a tab list, one panel per file, only the chosen one visible.
    const groupId = `code-${nextCodeGroup++}`;
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'Files');
    const tabs = files.map((file, i) => {
      const tab = this.codeTab('button', file) as HTMLButtonElement;
      tab.type = 'button';
      tab.id = `${groupId}-tab-${i}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `${groupId}-panel-${i}`);
      file.pre.id = `${groupId}-panel-${i}`;
      file.pre.setAttribute('role', 'tabpanel');
      file.pre.setAttribute('aria-labelledby', tab.id);
      file.pre.setAttribute('tabindex', '0');
      strip.appendChild(tab);
      wrapper.appendChild(file.pre);
      return tab;
    });

    const select = (index: number, focus = false): void => {
      active = index;
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        tab.classList.toggle('is-active', on);
        files[i].pre.hidden = !on;
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (event) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        select((i + step + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  }

  /** A Copy button that copies whatever `text()` returns at the time of the click. */
  private copyButton(text: () => string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(text());
        button.textContent = 'Copied';
        button.setAttribute('data-copied', '');
      } catch {
        button.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => {
        button.textContent = 'Copy';
        button.removeAttribute('data-copied');
      }, 1600);
    });
    return button;
  }

  /** One editor tab: file icon, file name, then its folder and any note, muted. */
  private codeTab(tag: 'div' | 'button', file: CodeFile): HTMLElement {
    const path = file.path ?? '';
    const slash = path.lastIndexOf('/');
    const tab = document.createElement(tag);
    tab.className = 'code-tab';
    tab.setAttribute('title', file.note ? `${path} (${file.note})` : path);
    tab.innerHTML = FILE_ICON;
    const name = document.createElement('span');
    name.className = 'code-tab-name';
    name.textContent = path.slice(slash + 1);
    tab.appendChild(name);
    const meta = [slash > 0 ? path.slice(0, slash) : '', file.note ?? ''].filter(Boolean).join(' · ');
    if (meta) {
      const muted = document.createElement('span');
      muted.className = 'code-tab-meta';
      muted.textContent = meta;
      tab.appendChild(muted);
    }
    return tab;
  }

  protected scrollToSection(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(history.state, '', `${location.pathname}${location.search}#${id}`);
  }

  /** Updates the reading bar and the highlighted section, at most once a frame. */
  protected onScroll(): void {
    if (this.scrollFrame) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = 0;
      const article = this.host.nativeElement.querySelector('article');
      if (!article) return;

      const rect = article.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const pct = span <= 0 ? 100 : Math.min(100, Math.max(0, (-rect.top / span) * 100));
      this.readProgress.set(Math.round(pct));

      let active: string | null = this.toc()[0]?.id ?? null;
      for (const entry of this.toc()) {
        const el = document.getElementById(entry.id);
        if (el && el.getBoundingClientRect().top <= 140) active = entry.id;
      }
      this.activeSection.set(active);
    });
  }

  /** Wraps each table in a panel that scrolls sideways on narrow screens. */
  private enhanceTables(root: Element): void {
    root.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('dg-table')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'dg-table';
      table.replaceWith(wrapper);
      wrapper.appendChild(table);
    });
  }

  /** Draws the bullets under "Watch out" and "Remember" as cards, by what they mean. */
  private enhanceSections(root: Element): void {
    root.querySelectorAll('h2').forEach((heading) => {
      const classes = LIST_SECTIONS[(heading.textContent ?? '').trim().toLowerCase()];
      const list = heading.nextElementSibling;
      if (classes && list?.tagName === 'UL') list.classList.add(...classes);
    });
  }

  /**
   * Tags `> **In one line:** …`, `> **Tip:** …`, `> **Key idea:** …`,
   * `> **You might think:** … / **Actually:** …` etc. so CSS can style them.
   */
  private enhanceCallouts(root: Element): void {
    root.querySelectorAll('blockquote').forEach((quote) => {
      const lead = quote.firstElementChild?.firstElementChild;
      if (lead?.tagName !== 'STRONG') return;
      const label = (lead.textContent ?? '').replace(/[:.]\s*$/, '').trim().toLowerCase();
      const cls = CALLOUTS[label];
      if (label === 'key idea') {
        // The one sentence to remember from a section, drawn large.
        quote.classList.add('callout', 'callout-key');
      } else if (label === 'you might think') {
        // A common belief next to what is really true:
        // `> **You might think:** …` then `> **Actually:** …` in the same quote.
        quote.classList.add('callout-myth');
        quote.querySelectorAll(':scope > p').forEach((p) => {
          const tag = (p.firstElementChild?.tagName === 'STRONG' ? p.firstElementChild.textContent : '') ?? '';
          const which = tag.replace(/[:.]\s*$/, '').trim().toLowerCase();
          if (which === 'you might think') p.classList.add('myth-belief', 'dg-tone-amber');
          else if (which === 'actually') p.classList.add('myth-truth', 'dg-tone-green');
        });
      } else if (cls) {
        quote.classList.add('callout', cls);
      } else if (this.course.isGuided()) {
        // Guided lessons define a new term as `> **Term:** definition`.
        quote.classList.add('callout', 'dg-tone-blue');
      }
    });
  }

  /**
   * Swaps each ```sequence / ```tree / ```flow block for a live <app-diagram>.
   * A block that fails to parse is left as plain code, so a typo never blanks a
   * lesson (the validator catches it before it ships).
   */
  private mountDiagrams(root: Element): void {
    this.destroyDiagrams();

    root.querySelectorAll('pre > code').forEach((code) => {
      const lang = Array.from(code.classList)
        .find((c) => c.startsWith('language-'))
        ?.slice('language-'.length);
      if (!isDiagramKind(lang)) return;

      let spec: DiagramSpec;
      try {
        spec = parseDiagram(lang, code.textContent ?? '');
      } catch {
        return;
      }

      const host = document.createElement('div');
      code.parentElement?.replaceWith(host);
      const ref = createComponent(Diagram, { environmentInjector: this.injector, hostElement: host });
      ref.setInput('spec', spec);
      this.appRef.attachView(ref.hostView);
      this.diagrams.push(ref);
    });
  }

  private destroyDiagrams(): void {
    this.diagrams.forEach((ref) => ref.destroy());
    this.diagrams = [];
  }

  toggleLearned(): void {
    const l = this.lesson();
    if (l) this.progress.toggleLearned(l.meta.slug);
  }

  toggleBookmark(): void {
    const l = this.lesson();
    if (l) this.progress.toggleBookmark(l.meta.slug);
  }
}
