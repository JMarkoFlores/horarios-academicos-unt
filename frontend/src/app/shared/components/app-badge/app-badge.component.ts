import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="app-badge"
      [class]="getBadgeClasses()"
    >
      <ng-content></ng-content>
    </span>
  `,
  styles: [`
    .app-badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.01em;
      line-height: 1;
      white-space: nowrap;
    }

    .app-badge.sm {
      padding: 2px 8px;
      font-size: 11px;
    }

    .app-badge.md {
      padding: var(--space-1) var(--space-3);
      font-size: 12px;
    }

    .app-badge.lg {
      padding: var(--space-2) var(--space-4);
      font-size: 13px;
    }

    .app-badge.success {
      background-color: rgba(46, 125, 50, 0.1);
      color: var(--color-success);
    }

    .app-badge.warning {
      background-color: rgba(245, 127, 23, 0.1);
      color: var(--color-warning);
    }

    .app-badge.error {
      background-color: rgba(198, 40, 40, 0.1);
      color: var(--color-error);
    }

    .app-badge.info {
      background-color: rgba(1, 87, 155, 0.1);
      color: var(--color-info);
    }

    .app-badge.primary {
      background-color: var(--color-primary-100);
      color: var(--color-primary-700);
    }

    .app-badge.secondary {
      background-color: var(--color-surface-2);
      color: var(--color-text-secondary);
    }

    .dark-theme .app-badge.success {
      background-color: rgba(52, 211, 153, 0.15);
      color: #34d399;
    }

    .dark-theme .app-badge.warning {
      background-color: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .dark-theme .app-badge.error {
      background-color: rgba(248, 113, 113, 0.15);
      color: #f87171;
    }

    .dark-theme .app-badge.info {
      background-color: rgba(96, 165, 250, 0.15);
      color: #60a5fa;
    }

    .dark-theme .app-badge.primary {
      background-color: rgba(21, 101, 192, 0.2);
      color: #90CAF9;
    }

    .dark-theme .app-badge.secondary {
      background-color: var(--color-surface-2);
      color: var(--color-text-secondary);
    }
  `]
})
export class AppBadgeComponent {
  @Input() variant: BadgeVariant = 'primary';
  @Input() size: BadgeSize = 'md';

  getBadgeClasses(): string {
    return `${this.variant} ${this.size}`;
  }
}
