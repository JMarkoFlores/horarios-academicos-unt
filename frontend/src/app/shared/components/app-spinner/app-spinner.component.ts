import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="app-spinner-overlay" *ngIf="overlay" [class.fullscreen]="fullscreen">
      <div class="spinner-container">
        <mat-spinner
          [diameter]="getDiameter()"
          [strokeWidth]="strokeWidth"
          [mode]="mode"
        ></mat-spinner>
        <p class="spinner-text" *ngIf="message">{{ message }}</p>
      </div>
    </div>

    <mat-spinner
      *ngIf="!overlay"
      [diameter]="getDiameter()"
      [strokeWidth]="strokeWidth"
      [mode]="mode"
    ></mat-spinner>
  `,
  styles: [`
    .app-spinner-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }

    .app-spinner-overlay.fullscreen {
      position: fixed;
      background-color: rgba(255, 255, 255, 0.9);
    }

    .dark-theme .app-spinner-overlay {
      background-color: rgba(0, 0, 0, 0.7);
    }

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .spinner-text {
      font-family: var(--font-body);
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
      margin: 0;
    }

    ::ng-deep .mat-mdc-progress-spinner circle {
      stroke: var(--color-primary-500);
    }
  `]
})
export class AppSpinnerComponent {
  @Input() size: SpinnerSize = 'md';
  @Input() strokeWidth: number = 3;
  @Input() mode: 'determinate' | 'indeterminate' = 'indeterminate';
  @Input() overlay: boolean = false;
  @Input() fullscreen: boolean = false;
  @Input() message?: string;

  getDiameter(): number {
    switch (this.size) {
      case 'sm':
        return 24;
      case 'md':
        return 40;
      case 'lg':
        return 50;
      case 'xl':
        return 80;
      default:
        return 40;
    }
  }
}
