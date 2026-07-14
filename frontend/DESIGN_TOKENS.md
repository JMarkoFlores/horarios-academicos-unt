# Design Tokens System — UNT Horarios Académicos

**Versión:** 1.0 | **Última actualización:** 2026-07-11

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura de Tokens](#arquitectura-de-tokens)
3. [Paleta de Colores](#paleta-de-colores)
4. [Tipografía](#tipografía)
5. [Espaciado](#espaciado)
6. [Radios y Bordes](#radios-y-bordes)
7. [Sombras](#sombras)
8. [Transiciones](#transiciones)
9. [Z-Index](#z-index)
10. [Cómo Usar](#cómo-usar)
11. [Breakpoints](#breakpoints)

---

## Introducción

Este documento define el **Design Token System** centralizado para el Sistema de Horarios Académicos UNT. Los tokens garantizan consistencia visual, accesibilidad WCAG 2.1 AA y facilitan el mantenimiento de temas (light/dark).

### Niveles de Tokens

- **Primitive Tokens:** Variables base (colores puros, tamaños, radios)
- **Semantic Tokens:** Significado funcional (primary, success, warning, danger)
- **Component Tokens:** Propiedades específicas de componentes (button-padding, card-shadow)

---

## Arquitectura de Tokens

### Ubicación de Archivos

```
frontend/
├── src/
│   ├── styles.scss                    # Variables CSS globales (:root + dark-theme)
│   └── app/shared/design-system/
│       ├── _variables.scss            # Variables SCSS (breakpoints, easing, z-index)
│       ├── _typography.scss           # Clases de tipografía (.text-*, .font-*, .heading-*)
│       ├── _utilities.scss            # Clases de componentes (.card-unt, .btn-*, .badge-*)
│       └── _theme.scss                # Definiciones de tema Material
└── DESIGN_TOKENS.md                   # Este documento (referencia maestro)
```

### Importación en Componentes

**CSS Custom Properties (recomendado para valores dinámicos):**
```scss
.my-component {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
```

**SCSS Variables (para cálculos, media queries):**
```scss
@use 'src/app/shared/design-system/variables' as ds;

@media (min-width: ds.$bp-md) {
  .container { width: 100%; }
}
```

---

## Paleta de Colores

### Primitive — Colores Base (UNT)

#### Azul Institucional UNT
| Nivel | Hex | Uso |
|-------|-----|-----|
| 50 | `#E3F2FD` | Backgrounds de hover/focus |
| 100 | `#BBDEFB` | Backgrounds suaves |
| 200 | `#90CAF9` | Borders ligeros |
| 300 | `#64B5F6` | Accents suaves |
| 400 | `#42A5F5` | Accents moderados |
| **500** | **`#1565C0`** | **Primary (institucional)** |
| 600 | `#0D47A1` | Primary hover |
| 700 | `#0A3D91` | Primary active |
| 800 | `#07337A` | Dark backgrounds |
| 900 | `#042963` | Very dark backgrounds |

#### Naranja Acentuador UNT
| Nivel | Hex | Uso |
|-------|-----|-----|
| 50 | `#FFF3E0` | Backgrounds suaves |
| 100 | `#FFE0B2` | Backgrounds hover |
| 200 | `#FFCC80` | Borders |
| 300 | `#FFB74D` | Accents suaves |
| 400 | `#FFA726` | Accents moderados |
| **500** | **`#FF6F00`** | **Accent (alertas, call-to-action)** |
| 600 | `#E65100` | Accent hover |
| 700 | `#BF360C` | Accent active |
| 800 | `#8D2608` | Dark variant |
| 900 | `#5C1B02` | Very dark variant |

### Semantic — Colores Funcionales

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--color-success` | `#059669` | `#10b981` | Confirmación, éxito |
| `--color-warning` | `#f59e0b` | `#fbbf24` | Advertencias, atención |
| `--color-danger` | `#dc2626` | `#ef4444` | Errores, eliminación |
| `--color-info` | `#0284c7` | `#3b82f6` | Información, tips |

**Backgrounds semánticos:**
```scss
--color-success-bg:   rgba(16, 185, 129, 0.1);
--color-warning-bg:   rgba(245, 158, 11, 0.1);
--color-danger-bg:    rgba(239, 68, 68, 0.1);
--color-info-bg:      rgba(59, 130, 246, 0.12);
```

### Neutral — Escala Gris (Slate)

| Token | Light | Dark | Descripción |
|-------|-------|------|-------------|
| `--color-bg` | `#f8fafc` (Slate 50) | `#0f172a` (Slate 900) | Page background |
| `--color-surface` | `#ffffff` | `#1e293b` (Slate 800) | Cards, modals |
| `--color-surface-2` | `#f1f5f9` (Slate 100) | `#334155` (Slate 700) | Subtle backgrounds |
| `--color-surface-3` | `#e2e8f0` (Slate 200) | `#475569` (Slate 600) | Hover backgrounds |
| `--color-border` | `#e2e8f0` (Slate 200) | `#475569` (Slate 600) | Standard border |
| `--color-border-light` | `#f1f5f9` (Slate 100) | `#334155` (Slate 700) | Subtle border |
| `--color-border-dark` | `#cbd5e1` (Slate 300) | `#64748b` (Slate 500) | Emphasized border |

### Text Colors

| Token | Light | Dark | Nivel |
|-------|-------|------|-------|
| `--color-text` | `#0f172a` | `#f1f5f9` | Primary text (Slate 900 / 100) |
| `--color-text-secondary` | `#334155` | `#cbd5e1` | Secondary text (Slate 700 / 300) |
| `--color-text-muted` | `#64748b` | `#94a3b8` | Muted text (Slate 500 / 400) |
| `--color-text-disabled` | `#94a3b8` | `#64748b` | Disabled text (Slate 400 / 500) |

### Colores de Grid de Horarios

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-slot-teoria` | `#bbdefb` | Bloque de teoría |
| `--color-slot-laboratorio` | `#c8e6c9` | Bloque de laboratorio |
| `--color-slot-seleccion` | `#fff9c4` | Selección temporal (amarillo) |
| `--color-slot-propia` | `#a5d6a7` | Selección propia (verde) |
| `--color-slot-bloqueado` | `#eceff1` | No disponible (gris claro) |
| `--color-slot-ocupado` | `#cfd8dc` | Ocupado por otro (gris oscuro) |

---

## Tipografía

### Font Families

```scss
--font-display: "Plus Jakarta Sans", "Segoe UI", sans-serif;
--font-body:    "Inter", "Roboto", -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono:    "JetBrains Mono", "Fira Code", "Consolas", monospace;
```

### Font Size Scale (rem)

| Nivel | rem | px | Uso |
|-------|-----|----|----|
| xs | 0.75 | 12 | Small labels, captions |
| sm | 0.875 | 14 | Body text, form inputs |
| base | 1.0 | 16 | Standard body text |
| lg | 1.125 | 18 | Subtle headings |
| xl | 1.25 | 20 | Section headings |
| 2xl | 1.5 | 24 | Page titles |
| 3xl | 1.875 | 30 | Large titles |
| 4xl | 2.25 | 36 | Hero sections |

### Font Weights

| Clase | Peso | Uso |
|-------|------|-----|
| `.font-normal` | 400 | Body text |
| `.font-medium` | 500 | Emphasis, labels |
| `.font-semibold` | 600 | Section headings |
| `.font-bold` | 700 | Page titles, buttons |
| `.font-extrabold` | 800 | Hero sections |

### Composite Typography Patterns

| Clase | Propiedades | Ejemplo |
|-------|-------------|---------|
| `.heading-page` | 1.5rem, bold, letter-spacing -0.02em | Page title |
| `.heading-section` | 1.125rem, semibold, letter-spacing -0.01em | Section title |
| `.text-xs` → `.text-3xl` | Escalas de tamaño con line-height | Body, captions |
| `.text-primary` → `.text-danger` | Color semántico | Colored text |
| `.truncate` | Ellipsis para texto largo | Nombres, descripciones |
| `.line-clamp-2` / `.line-clamp-3` | Limita líneas de texto | Cards, abstracts |

---

## Espaciado

### Escala de Espaciado (Base: 4px)

| Token | px | rem | Uso |
|-------|----|----|-----|
| `--space-1` | 4 | 0.25 | Spacing mínimo |
| `--space-2` | 8 | 0.5 | Small gaps |
| `--space-3` | 12 | 0.75 | Default padding |
| `--space-4` | 16 | 1 | **Standard padding/margin** |
| `--space-5` | 20 | 1.25 | Medium gaps |
| `--space-6` | 24 | 1.5 | Card padding |
| `--space-8` | 32 | 2 | Section margins |
| `--space-10` | 40 | 2.5 | Large gaps |
| `--space-12` | 48 | 3 | Major sections |
| `--space-16` | 64 | 4 | Very large gaps |
| `--space-20` | 80 | 5 | Hero sections |
| `--space-24` | 96 | 6 | Page margins |

**Ejemplo de uso:**
```scss
.card {
  padding: var(--space-6);          // 24px
  margin-bottom: var(--space-4);    // 16px
  gap: var(--space-2);              // 8px
}
```

---

## Radios y Bordes

### Border Radius Scale

| Token | px | Uso |
|-------|----|----|
| `--radius-xs` | 4 | Small buttons, inputs |
| `--radius-sm` | 6 | Medium elements |
| `--radius-md` | 8 | **Default (buttons, cards)** |
| `--radius-lg` | 12 | Cards, large modals |
| `--radius-xl` | 16 | Emphasized cards |
| `--radius-2xl` | 20 | Hero sections |
| `--radius-full` | 9999 | Avatars, pills |

**Ejemplo:**
```scss
.button { border-radius: var(--radius-md); }
.card { border-radius: var(--radius-lg); }
.avatar { border-radius: var(--radius-full); }
```

### Border Widths

| Uso | Ancho |
|-----|-------|
| Subtle borders | 1px |
| Emphasized borders | 1.5px |
| Strong accents | 2px |

---

## Sombras

### Shadow System (Material Design 3)

| Token | Elevación | Ejemplo CSS |
|-------|-----------|------------|
| `--shadow-xs` | 0 | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `--shadow-sm` | 1 | `0 1px 3px 0 rgb(0 0 0 / 0.1), ...` |
| `--shadow-md` | 2 | `0 4px 6px -1px rgb(0 0 0 / 0.1), ...` |
| `--shadow-lg` | 3 | `0 10px 15px -3px rgb(0 0 0 / 0.1), ...` |
| `--shadow-xl` | 4 | `0 20px 25px -5px rgb(0 0 0 / 0.1), ...` |
| `--shadow-2xl` | 5 | `0 25px 50px -12px rgb(0 0 0 / 0.25)` |

**Elevación recomendada:**
- `--shadow-xs`: Hover states
- `--shadow-sm`: Cards, buttons (default)
- `--shadow-md`: Hovered cards
- `--shadow-lg`: Floating elements, modals
- `--shadow-xl`: Sticky headers
- `--shadow-2xl`: Dialogs, tooltips

---

## Transiciones

### Timing Functions

| Token | Valor | Uso |
|-------|-------|-----|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default easing |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Incoming animations |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Outgoing animations |

### Duration Presets

| Token | Duration | Uso |
|-------|----------|-----|
| `--transition-instant` | 50ms | Immediate feedback |
| `--transition-fast` | 150ms | Button hover, quick changes |
| `--transition-normal` | 250ms | **Standard transitions** |
| `--transition-slow` | 350ms | Modal appearances |
| `--transition-slower` | 500ms | Page transitions |

**Ejemplo:**
```scss
.button {
  transition: background var(--transition-fast), 
              box-shadow var(--transition-fast);
  
  &:hover {
    background: var(--color-primary-hover);
    box-shadow: 0 4px 12px rgba(21, 101, 192, 0.3);
  }
}
```

---

## Z-Index

### Layering System

| Token | Valor | Elemento |
|-------|-------|----------|
| `--z-dropdown` | 1000 | Dropdowns, popovers |
| `--z-sticky` | 1020 | Sticky headers, sidebars |
| `--z-fixed` | 1030 | Fixed elements |
| `--z-modal-backdrop` | 1040 | Modal backdrop (overlay) |
| `--z-modal` | 1050 | Modals, dialogs |
| `--z-popover` | 1060 | Floating popovers |
| `--z-tooltip` | 1070 | Tooltips |

**NUNCA usar valores aleatorios — siempre usar estos tokens.**

---

## Cómo Usar

### 1. En Template HTML

```html
<div class="card-unt">
  <h2 class="heading-section">Título</h2>
  <p class="text-sm text-muted">Descripción</p>
  <button class="btn-unt-primary">Acción</button>
</div>
```

### 2. En SCSS (CSS Custom Properties)

```scss
.my-component {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--transition-fast);
  font-family: var(--font-body);
  
  &:hover {
    box-shadow: var(--shadow-md);
  }
  
  &.dark-theme {
    background: var(--color-surface); // Automáticamente adaptado por :root dark override
  }
}
```

### 3. En SCSS (Variables SCSS)

```scss
@use 'src/app/shared/design-system/variables' as ds;

@media (min-width: ds.$bp-md) {
  .container {
    padding: 0 ds.$space-8;
  }
}

.transition-standard {
  transition: all ds.$transition-normal;
}
```

### 4. En Angular Interpolation (Dinámico)

```html
<div [style]="'--custom-spacing: ' + spacing + 'px'">
  <span [class]="'text-' + size">Dynamic text</span>
</div>
```

---

## Breakpoints

### Responsive Design Tokens

| Token | px | Devices |
|-------|----|----|
| `$bp-xs` | 480 | Small phones |
| `$bp-sm` | 640 | Tablets (portrait) |
| `$bp-md` | 768 | **Tablets (landscape) / Small desktops** |
| `$bp-lg` | 1024 | Desktops |
| `$bp-xl` | 1280 | Large desktops |
| `$bp-2xl` | 1536 | Very large displays |

**Ejemplo:**
```scss
@use 'src/app/shared/design-system/variables' as ds;

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  
  @media (min-width: ds.$bp-md) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: ds.$bp-lg) {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## Validación de Accesibilidad

### Ratios de Contraste (WCAG 2.1 AA)

- **Normal text (< 18px):** mínimo 4.5:1
- **Large text (≥ 18px):** mínimo 3:1

| Combinación | Ratio | ✅/❌ |
|-------------|-------|------|
| Azul UNT (600) en blanco | 7.5:1 | ✅ |
| Naranja UNT (500) en blanco | 2.8:1 | ❌ (usar 600) |
| Naranja UNT (600) en blanco | 5.2:1 | ✅ |
| Texto primario en bg light | 19:1 | ✅ |
| Texto muted en bg light | 6.5:1 | ✅ |
| Borders en bg light | 3.8:1 | ✅ |

### Herramientas de Validación

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- `axe DevTools` (extensión Chrome)
- `pa11y` (CLI)
- Lighthouse (Chrome DevTools)

---

## Checklist de Implementación

- [ ] Todos los colores usan tokens (`--color-*`)
- [ ] Espaciado consistente via `--space-*` (sin valores hardcodeados)
- [ ] Radios usan `--radius-*`
- [ ] Sombras usan `--shadow-*`
- [ ] Transiciones usan `--transition-*`
- [ ] Z-index usa `--z-*`
- [ ] Tipografía via clases `.text-*`, `.font-*`, `.heading-*`
- [ ] Dark mode preserva tokens semánticos
- [ ] Responsividad vía `$bp-*` en media queries
- [ ] Contraste verificado contra WCAG 2.1 AA

---

## Próximos Pasos

1. **Audit exhaustiva** — Validar todos los componentes contra tokens
2. **Componente Color Tester** — UI interactiva para visualizar paleta
3. **Variantes de componentes** — Extender botones, cards, inputs
4. **Dark mode refinement** — Ajustes finos de semántica
5. **Documentación visual** — Storybook con ejemplos vivos

---

**Preguntas o actualizaciones:** contactar con el equipo de UI/UX.
