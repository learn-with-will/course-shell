import { Component } from '@angular/core';
import { COURSE } from '../../../core/course/course';

let uid = 0;

/**
 * The course's mark. By default a circle with a bite taken out of it, filled with
 * the course's brand gradient; the gradient appears nowhere else in the UI, which
 * keeps the mark recognisable. A course that names a logo in course.json gets
 * that image instead.
 */
@Component({
  selector: 'app-brand-mark',
  template: `
    @if (logo) {
      <img [src]="logo" alt="" class="h-full w-full" />
    } @else {
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" class="h-full w-full">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" [attr.stop-color]="stops[0]" />
          <stop offset="50%" [attr.stop-color]="stops[1]" />
          <stop offset="100%" [attr.stop-color]="stops[2]" />
        </linearGradient>
        <mask [attr.id]="maskId">
          <rect width="32" height="32" fill="#fff" />
          <circle cx="27" cy="6" r="7" fill="#000" />
        </mask>
      </defs>
      <circle cx="15" cy="17" r="14" [attr.fill]="'url(#' + gradientId + ')'" [attr.mask]="'url(#' + maskId + ')'" />
    </svg>
    }
  `,
  host: { class: 'block' },
})
export class BrandMark {
  protected readonly logo = COURSE.logo;
  protected readonly stops = COURSE.gradient;
  private readonly id = uid++;
  protected readonly gradientId = `bite-gradient-${this.id}`;
  protected readonly maskId = `bite-mask-${this.id}`;
}
