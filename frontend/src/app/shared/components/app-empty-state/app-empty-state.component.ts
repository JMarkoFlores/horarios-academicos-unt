import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="app-empty-state">
      <div class="empty-icon-wrapper">
        <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-description">{{ description }}</p>
      <button
        mat-raised-button
        class="empty-action"
        *ngIf="actionLabel"
        (click)="action.emit()"
      >
        <mat-icon *ngIf="actionIcon">{{ actionIcon }}</mat-icon>
        <span>{{ actionLabel }}</span>
      </button>
    </div>
  `,
  styles: [`
    .app-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--space-16) var(--space-8);
      text-align: center;
      min-height: 300px;
    }

    .empty-icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: var(--radius-xl);
      background-color: var(--color-primary-50);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-6);
    }

    .empty-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--color-primary-500);
    }

    .empty-title {
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-3) 0;
      letter-spacing: -0.01em;
    }

    .empty-description {
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 400;
      color: var(--color-text-secondary);
      margin: 0 0 var(--space-6) 0;
      max-width: 400px;
      line-height: 1.5;
    }

    .empty-action {
      border-radius: var(--radius-md) !important;
      font-weight: 600 !important;
      padding: 0 var(--space-5) !important;
    }

    .dark-theme .empty-icon-wrapper {
      background-color: rgba(21, 101, 192, 0.15);
    }

    .dark-theme .empty-icon {
      color: #90CAF9;
    }

    .dark-theme .empty-title {
      color: var(--color-text-primary);
    }

    .dark-theme .empty-description {
      color: var(--color-text-secondary);
    }
  `]
})
export class AppEmptyStateComponent {
  @Input() icon: string = 'inbox';
  @Input() title: string = 'No hay datos';
  @Input() description: string = 'No se encontraron elementos para mostrar.';
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() action = new EventEmitter<void>();
}
