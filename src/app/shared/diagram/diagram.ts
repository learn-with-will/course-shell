import { Component, computed, input, signal } from '@angular/core';
import { DiagramSpec, FlowSpec, SequenceSpec, TreeSpec } from './diagram-parser';
import { DiagramFlow } from './diagram-flow';
import { DiagramSequence } from './diagram-sequence';
import { DiagramText } from './diagram-text';
import { DiagramTree } from './diagram-tree';

/**
 * Draws a parsed lesson diagram. The text is real HTML, so it stays selectable
 * and readable by screen readers; colours come from CSS variables in styles.css,
 * so light and dark themes need no re-render.
 *
 * A diagram written with `@steps` starts at step 1 and the reader moves through it
 * with Back / Next; the caption of the current step is shown under the drawing.
 */
@Component({
  selector: 'app-diagram',
  imports: [DiagramSequence, DiagramTree, DiagramFlow, DiagramText],
  host: { class: 'dg', role: 'group', 'aria-label': 'Diagram', '[class.dg-stepped]': 'total() > 0' },
  template: `
    <!-- Only the drawing scrolls sideways; the step controls stay in view. -->
    <div class="dg-canvas">
      @if (sequence(); as s) {
        <app-dg-sequence [spec]="s" [shown]="shown()" />
      } @else if (tree(); as t) {
        <app-dg-tree [spec]="t" />
      } @else if (flow(); as f) {
        <app-dg-flow [spec]="f" [shown]="shown()" />
      }
    </div>

    @if (total() > 0) {
      <div class="dg-stepper">
        <p class="dg-step-caption" aria-live="polite">
          <span class="dg-step-count">Step {{ step() }} of {{ total() }}</span>
          @if (caption(); as c) {
            <app-dg-text [text]="c" />
          }
        </p>
        <div class="dg-step-buttons">
          <button type="button" class="dg-step-btn" (click)="back()" [disabled]="step() === 1" aria-label="Previous step">
            ← Back
          </button>
          @if (step() < total()) {
            <button type="button" class="dg-step-btn dg-step-next" (click)="next()" aria-label="Next step">Next →</button>
          } @else {
            <button type="button" class="dg-step-btn" (click)="restart()" aria-label="Start again from step 1">
              ↺ Start again
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class Diagram {
  readonly spec = input.required<DiagramSpec>();

  protected readonly sequence = computed(() => {
    const s = this.spec();
    return s.type === 'sequence' ? (s as SequenceSpec) : null;
  });
  protected readonly tree = computed(() => {
    const s = this.spec();
    return s.type === 'tree' ? (s as TreeSpec) : null;
  });
  protected readonly flow = computed(() => {
    const s = this.spec();
    return s.type === 'flow' ? (s as FlowSpec) : null;
  });

  /** Number of steps when the diagram is stepped, otherwise 0. */
  protected readonly total = computed(() => {
    const s = this.spec();
    if (s.type === 'sequence' && s.stepped) return s.steps.length;
    if (s.type === 'flow' && s.stepped) return s.edges.length;
    return 0;
  });

  // Each lesson mounts fresh diagrams, so a diagram always starts at step 1.
  protected readonly step = signal(1);

  /** How many steps are visible: all of them unless the diagram is stepped. */
  protected readonly shown = computed(() => (this.total() > 0 ? this.step() : Infinity));

  protected readonly caption = computed(() => {
    const s = this.spec();
    const i = this.step() - 1;
    if (s.type === 'sequence') return s.steps[i]?.caption;
    if (s.type === 'flow') return s.edges[i]?.caption;
    return undefined;
  });

  protected next(): void {
    this.step.update((n) => Math.min(this.total(), n + 1));
  }

  protected back(): void {
    this.step.update((n) => Math.max(1, n - 1));
  }

  protected restart(): void {
    this.step.set(1);
  }
}
