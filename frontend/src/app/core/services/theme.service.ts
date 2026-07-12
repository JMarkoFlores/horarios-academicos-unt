import { Injectable, signal, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'theme-mode';

  mode = signal<ThemeMode>('system');
  isDark = signal(false);

  constructor() {
    const stored = this.document.defaultView?.localStorage.getItem(this.storageKey) as ThemeMode | null;
    const initialMode = stored ?? 'system';
    this.mode.set(initialMode);
    this.applyTheme(initialMode);

    effect(() => {
      const currentMode = this.mode();
      this.applyTheme(currentMode);
      try {
        this.document.defaultView?.localStorage.setItem(this.storageKey, currentMode);
      } catch { }
    }, { allowSignalWrites: true });
  }

  private applyTheme(mode: ThemeMode): void {
    let dark = false;
    if (mode === 'dark') {
      dark = true;
    } else if (mode === 'system') {
      dark = this.document.defaultView?.matchMedia('(prefers-color-scheme: dark)').matches ?? false;
    }
    this.isDark.set(dark);
    const body = this.document.body;
    if (dark) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.remove('dark-theme');
      body.classList.add('light-theme');
    }
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  toggle(): void {
    const current = this.mode();
    // Toggle directly between light and dark, preserving system preference
    if (current === 'light') {
      this.mode.set('dark');
    } else if (current === 'dark') {
      this.mode.set('light');
    } else {
      // If system, switch to explicit opposite of current effective theme
      this.mode.set(this.isDark() ? 'light' : 'dark');
    }
  }

  cycleTheme(): void {
    this.toggle();
  }

  getThemeIcon(): string {
    const currentMode = this.mode();
    if (currentMode === 'system') {
      return this.isDark() ? 'dark_mode' : 'light_mode';
    }
    return currentMode === 'dark' ? 'dark_mode' : 'light_mode';
  }

  getThemeTooltip(): string {
    const currentMode = this.mode();
    if (currentMode === 'system') {
      return this.isDark() ? 'Tema: Sistema (Oscuro)' : 'Tema: Sistema (Claro)';
    }
    return currentMode === 'dark' ? 'Tema: Oscuro' : 'Tema: Claro';
  }
}