import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

export type KpiTrend = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatCardModule],
  template: `
    <mat-card class="app-kpi-card" [style.--accent-color]="accentColor">
      <div class="kpi-content">
        <span class="kpi-label">{{ label }}</span>
        <h2 class="kpi-value">{{ value }}</h2>
        <p class="kpi-sub" *ngIf="sub">{{ sub }}</p>
        <div class="kpi-trend" *ngIf="trend && trendValue">
          <mat-icon class="trend-icon" [class.trend-up]="trend === 'up'" [class.trend-down]="trend === 'down'">
            {{ trendIcon }}
          </mat-icon>
          <span class="trend-value" [class.trend-up]="trend === 'up'" [class.trend-down]="trend === 'down'">
            {{ trendValue }}
          </span>
        </div>
      </div>
      <div class="kpi-icon-wrapper">
        <mat-icon class="kpi-icon">{{ icon }}</mat-icon>
      </div>
    </mat-card>
  `,
  styles: [`
    .app-kpi-card {
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-lg) !important;
      border: 1px solid var(--color-border) !important;
      box-shadow: var(--shadow-sm) !important;
      transition: all var(--transition-normal) !important;
      background-color: var(--color-surface) !important;
      padding: var(--space-6) !important;
    }

    .app-kpi-card:hover {
      box-shadow: var(--shadow-md) !important;
      transform: translateY(-2px);
    }

    .kpi-content {
      position: relative;
      z-index: 2;
    }

    .kpi-label {
      display: block;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
      margin-bottom: var(--space-2);
      letter-spacing: 0.01em;
    }

    .kpi-value {
      font-family: var(--font-display);
      font-size: 36px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1) 0;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .kpi-sub {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 400;
      color: var(--color-text-secondary);
      margin: 0;
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin-top: var(--space-2);
    }

    .trend-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .trend-icon.trend-up {
      color: var(--color-success);
    }

    .trend-icon.trend-down {
      color: var(--color-error);
    }

    .trend-value {
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
    }

    .trend-value.trend-up {
      color: var(--color-success);
    }

    .trend-value.trend-down {
      color: var(--color-error);
    }

    .kpi-icon-wrapper {
      position: absolute;
      top: var(--space-6);
      right: var(--space-6);
      width: 48px;
      height: 48px;
      border-radius: var(--radius-lg);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--accent-color);
      opacity: 0.15;
    }

    .kpi-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: var(--accent-color);
    }

    .dark-theme .app-kpi-card {
      background-color: var(--color-surface) !important;
      border-color: var(--color-border) !important;
    }

    .dark-theme .kpi-label,
    .dark-theme .kpi-sub {
      color: var(--color-text-secondary);
    }

    .dark-theme .kpi-value {
      color: var(--color-text-primary);
    }
  `]
})
export class AppKpiCardComponent {
  @Input() label: string = '';
  @Input() value: string | number = '';
  @Input() sub?: string;
  @Input() icon: string = '';
  @Input() accentColor: string = 'var(--color-primary-500)';
  @Input() trend?: KpiTrend;
  @Input() trendValue?: string;

  get trendIcon(): string {
    switch (this.trend) {
      case 'up':
        return 'trending_up';
      case 'down':
        return 'trending_down';
      case 'neutral':
        return 'remove';
      default:
        return 'remove';
    }
  }
}
