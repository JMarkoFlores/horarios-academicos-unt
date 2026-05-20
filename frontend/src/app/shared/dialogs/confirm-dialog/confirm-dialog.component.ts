import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  confirmColor?: 'warn' | 'primary' | 'accent';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-dialog">
      <div class="dialog-icon" [class]="data.confirmColor ?? 'warn'">
        <mat-icon>{{ data.icon ?? 'warning_amber' }}</mat-icon>
      </div>
      <h2 mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content>
        <p class="message">{{ data.message }}</p>
        <p class="detail" *ngIf="data.detail">{{ data.detail }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close(false)" class="btn-cancel">Cancelar</button>
        <button mat-raised-button
          [color]="data.confirmColor ?? 'warn'"
          (click)="dialogRef.close(true)"
          class="btn-confirm">
          {{ data.confirmLabel ?? 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 8px 0 0;
      text-align: center;
      min-width: 320px;
    }
    .dialog-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      &.warn { background: rgba(239,68,68,0.1); mat-icon { color: #ef4444; } }
      &.primary { background: rgba(79,70,229,0.1); mat-icon { color: #4f46e5; } }
      &.accent { background: rgba(16,185,129,0.1); mat-icon { color: #10b981; } }
      mat-icon { font-size: 32px; width: 32px; height: 32px; }
    }
    h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; text-align: center; }
    .message { font-size: 14px; color: var(--color-text); margin: 0 0 4px; }
    .detail { font-size: 12px; color: var(--color-text-muted); margin: 0; }
    mat-dialog-actions { padding: 16px 0 8px; gap: 8px; }
    .btn-cancel { border-radius: 8px !important; font-weight: 600 !important; }
    .btn-confirm { border-radius: 8px !important; font-weight: 700 !important; }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}
}
