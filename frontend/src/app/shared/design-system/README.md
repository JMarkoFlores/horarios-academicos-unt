# Design System UNT — Guía de Uso

**Versión:** 1.0.0  
**Última actualización:** 11 de julio de 2026  
**Autor:** Frontend Team

---

## 📋 Contenidos

1. [Estructura](#estructura)
2. [Design Tokens](#design-tokens)
3. [Responsive Mixins](#responsive-mixins)
4. [Form Mixins](#form-mixins)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Mejores Prácticas](#mejores-prácticas)

---

## Estructura

```
frontend/src/app/shared/design-system/
├── _design-tokens.scss       # 80+ CSS variables (colores, espaciado, etc)
├── _form-mixins.scss         # 11 mixins para formularios
├── _responsive-mixins.scss   # 20+ utilities responsive
├── typography.scss           # Escala tipográfica (.text-xs, .font-bold)
├── utilities.scss            # Utility classes globales
├── variables.ts              # Variables TypeScript (breakpoints, z-index)
└── README.md                 # Esta guía
```

---

## Design Tokens

### CSS Variables (Global)

Todos los componentes usan **CSS variables** centralizadas para consistencia:

```scss
// Ubicación: frontend/src/styles.scss
:root {
  // Colores - Primarios
  --color-primary: #1565c0;
  --color-primary-100: #bbdefb;
  --color-primary-500: #1565c0;
  --color-primary-600: #0d47a1;
  
  // Colores - Semánticos
  --color-success: #059669;
  --color-warning: #f59e0b;
  --color-danger: #dc2626;
  --color-info: #0284c7;
  
  // Espaciado (8px base)
  --space-1: 8px;    // 0.5rem
  --space-2: 12px;   // 0.75rem
  --space-3: 16px;   // 1rem
  --space-4: 20px;   // 1.25rem
  --space-5: 24px;   // 1.5rem
  --space-6: 32px;   // 2rem
  --space-7: 40px;   // 2.5rem
  --space-8: 48px;   // 3rem
  
  // Border Radius
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  
  // Shadows
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  
  // Transiciones
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms ease-out;
  --transition-slow: 300ms ease-out;
}
```

### Uso en SCSS

```scss
// ❌ ANTES (hardcoded values - NO USAR)
.component {
  padding: 24px 32px;
  margin-bottom: 16px;
  border-radius: 12px;
  color: #1565c0;
}

// ✅ DESPUÉS (usando tokens)
.component {
  padding: var(--space-6) var(--space-8);
  margin-bottom: var(--space-4);
  border-radius: var(--radius-lg);
  color: var(--color-primary);
}
```

### Dark Mode Automático

Las variables CSS se adaptan automáticamente en dark mode:

```scss
.dark-theme {
  --color-bg: #111827;
  --color-surface: #1f2937;
  --color-text: #f3f4f6;
  --color-text-muted: #9ca3af;
  // ... más overrides
}
```

**No hay que escribir reglas diferentes para dark mode** — la aplicación las gestiona automáticamente.

---

## Responsive Mixins

### Ubicación

```
frontend/src/app/shared/design-system/_responsive-mixins.scss
```

### Breakpoints

```scss
// Mobile first approach
$breakpoint-mobile: 640px;
$breakpoint-tablet: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1536px;
```

### Mixins Principales

#### `@include resp.mobile`

Aplica estilos **solo en mobile** (< 640px):

```scss
.component {
  display: flex;
  flex-direction: row;
  
  @include resp.mobile {
    flex-direction: column;  // Solo en mobile
    padding: var(--space-3);  // Menos padding
  }
}
```

#### `@include resp.from-md`

Aplica desde tablet en adelante (>= 768px):

```scss
.header {
  font-size: 16px;
  
  @include resp.from-md {
    font-size: 20px;  // Más grande en tablet+
  }
}
```

#### `@include resp.from-lg`

Aplica desde desktop en adelante (>= 1024px):

```scss
.grid {
  grid-template-columns: repeat(2, 1fr);  // 2 columnas por defecto
  
  @include resp.from-lg {
    grid-template-columns: repeat(4, 1fr);  // 4 columnas en desktop
  }
}
```

### Grid Helpers

#### `@include resp.responsive-grid-2-col`

Grid automático: 1 col mobile → 2 col tablet → 2 col desktop

```scss
.filter-grid {
  @include resp.responsive-grid-2-col;
}

// Equivalent to:
// Mobile: 1 column (flex)
// Tablet+: 2 columns (grid)
```

#### `@include resp.responsive-grid-3-col`

Grid: 1 col mobile → 2 col tablet → 3 col desktop

```scss
.card-grid {
  @include resp.responsive-grid-3-col;
}
```

#### `@include resp.responsive-grid-4-col`

Grid: 1 col mobile → 2 col tablet → 4 col desktop

```scss
.dashboard-grid {
  @include resp.responsive-grid-4-col;
}
```

### Accesibilidad

#### `@include resp.touch-target`

Asegura botones/links mínimo 44×44px (WCAG 2.5.5):

```scss
button {
  @include resp.touch-target;
  // Genera: min-width: 44px; min-height: 44px; display: inline-flex; etc
}
```

#### `@include resp.reduced-motion`

Respeta preferencia de usuario de "prefers-reduced-motion":

```scss
.card {
  animation: fadeIn 0.3s ease;
  
  @include resp.reduced-motion {
    animation: none;  // Sin animaciones para usuarios sensibles
  }
}
```

---

## Form Mixins

### Ubicación

```
frontend/src/app/shared/design-system/_form-mixins.scss
```

### Mixins Disponibles

#### 1. `@include forms.form-page-container`

Contenedor raíz para páginas de formulario:

```scss
.create-docente-page {
  @include forms.form-page-container;
  
  // Genera:
  // - max-width: 1200px
  // - Padding responsivo
  // - margin: 0 auto
  // - Background color
}
```

#### 2. `@include forms.form-card-container`

Card para agrupar secciones de formulario:

```scss
.section-personal {
  @include forms.form-card-container;
  
  // Genera:
  // - Padding: var(--space-6)
  // - Border + shadow
  // - Border-radius
  // - Background: surface
}
```

#### 3. `@include forms.form-section-header`

Header de sección (con opcional icon):

```scss
h2 {
  @include forms.form-section-header;
  
  // Genera:
  // - font-size: 20px
  // - font-weight: 600
  // - color: primary
  // - margin-bottom
  // - padding-bottom + border
}
```

#### 4. `@include forms.premium-form-field`

Estilo premium para inputs/fields:

```scss
mat-form-field {
  @include forms.premium-form-field;
  
  // Genera:
  // - Width: 100%
  // - Focus state con outline
  // - Placeholder styling
  // - Label floating
}
```

#### 5. `@include forms.form-footer`

Contenedor para botones de acción (Save/Cancel):

```scss
.form-actions {
  @include forms.form-footer;
  
  // Genera:
  // - display: flex
  // - gap: var(--space-3)
  // - justify-content: space-between
  // - padding-top + border-top
  // - Responsive (flex-direction: column en mobile)
}
```

#### 6. `@include forms.button-submit`

Estilos para botón Save/Submit:

```scss
button[type="submit"] {
  @include forms.button-submit;
  
  // Genera:
  // - Background: primary
  // - Color: white
  // - Border-radius + shadow
  // - Hover state (brightness)
  // - Disabled state
  // - Touch target
}
```

#### 7. `@include forms.button-cancel`

Estilos para botón Cancel/Reset:

```scss
button[type="button"].cancel {
  @include forms.button-cancel;
  
  // Genera:
  // - Background: surface
  // - Border: 1px border
  // - Color: text-muted
  // - Hover state
  // - Touch target
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Página de Crear Docente

```scss
// docente-form.component.scss
@use 'src/app/shared/design-system/form-mixins' as forms;
@use 'src/app/shared/design-system/responsive-mixins' as resp;

.create-docente-page {
  @include forms.form-page-container;

  .form-card {
    @include forms.form-card-container;
    margin-bottom: var(--space-6);

    h2 {
      @include forms.form-section-header;
    }

    .form-grid {
      @include resp.responsive-grid-2-col;
    }
  }

  .form-actions {
    @include forms.form-footer;

    button[type="submit"] {
      @include forms.button-submit;
    }

    button[type="button"] {
      @include forms.button-cancel;
    }
  }
}
```

### Ejemplo 2: Dashboard Responsivo

```scss
// dashboard.component.scss
@use 'src/app/shared/design-system/responsive-mixins' as resp;

.admin-dashboard {
  padding: var(--space-4) var(--space-5);

  @include resp.from-md {
    padding: var(--space-6) var(--space-8);
  }
}

.bento-grid {
  @include resp.responsive-grid-4-col;  // 1→2→4 cols
  gap: var(--space-2);

  @include resp.from-md {
    gap: var(--space-3);
  }

  @include resp.from-lg {
    gap: var(--space-4);
  }
}

.kpi-card {
  .metric-number {
    font-size: 32px;

    @include resp.mobile { font-size: 28px; }
    @include resp.from-md { font-size: 36px; }
    @include resp.from-lg { font-size: 42px; }
  }
}
```

### Ejemplo 3: Tabla Accesible

```scss
// docentes-list.component.scss
@use 'src/app/shared/design-system/responsive-mixins' as resp;

.table-container-premium {
  .premium-table {
    .mat-mdc-header-cell {
      padding: var(--space-3) var(--space-4) !important;

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }

    .premium-row {
      height: auto;
      min-height: 72px;

      &:focus-within {
        outline: 2px solid var(--color-accent);
        outline-offset: -1px;
      }

      .mat-mdc-cell {
        padding: var(--space-2) var(--space-3) !important;
      }
    }
  }
}

// Botones de acción con touch target
button {
  @include resp.touch-target;
}
```

---

## Mejores Prácticas

### ✅ DO

```scss
// Usar variables de espaciado
.component {
  margin: var(--space-4);  // ✅ Good
}

// Usar responsive mixins
.grid {
  @include resp.responsive-grid-2-col;  // ✅ Good
}

// Usar form mixins para consistencia
.form {
  @include forms.form-page-container;  // ✅ Good
}

// Incluir focus states
button:focus-visible {
  outline: 2px solid var(--color-accent);  // ✅ Good
}
```

### ❌ DON'T

```scss
// No usar hardcoded values
.component {
  margin: 24px;  // ❌ Bad - use var(--space-6)
}

// No usar media queries sin wrapper
@media (max-width: 768px) {  // ❌ Bad - use resp mixins
  .component { }
}

// No duplicar estilos de form
.form-button {
  padding: 12px 20px;  // ❌ Bad - use form mixin
  border-radius: 8px;
}

// No remover focus outline sin reemplazo
button:focus {
  outline: none;  // ❌ Bad - WCAG violation
}
```

### Import Correctamente

```typescript
// ✅ CORRECTO en SCSS
@use 'src/app/shared/design-system/responsive-mixins' as resp;
@use 'src/app/shared/design-system/form-mixins' as forms;

.component {
  @include resp.touch-target;
  @include forms.form-card-container;
}

// ❌ INCORRECTO (no compila)
@import 'src/app/shared/design-system/responsive-mixins';  // Don't use @import
.component {
  @include touch-target;  // Missing namespace
}
```

### Responsive Design Pattern

```scss
// Mobile-first approach (lo estándar es móvil)
.component {
  // Default para mobile (<640px)
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
  
  // Tablet y arriba (>=768px)
  @include resp.from-md {
    flex-direction: row;
    padding: var(--space-5);
  }
  
  // Desktop y arriba (>=1024px)
  @include resp.from-lg {
    padding: var(--space-8);
  }
}
```

---

## Checklist para Componentes Nuevos

Antes de hacer merge de un componente nuevo:

- [ ] Usa tokens de espaciado (no hardcoded px)
- [ ] Usa tokens de color (var(--color-*))
- [ ] Responsive: mobile-first approach
- [ ] `:focus-visible` implementado
- [ ] Touch targets >= 44px (si interactivo)
- [ ] Font sizes accesibles (min 14px body)
- [ ] Contraste >= 4.5:1
- [ ] Dark mode testeado
- [ ] Zoom 200% testeado sin scroll horizontal

---

## Troubleshooting

### SCSS no compila

```
Error: undefined mixin "touch-target"

✅ Solución:
@use 'src/app/shared/design-system/responsive-mixins' as resp;
// Luego: @include resp.touch-target;
```

### Variables CSS no se aplican

```
Color aparece gris en vez de primario

✅ Solución:
1. Asegurar que esté en :root { }
2. Recargar página (Ctrl+Shift+R)
3. DevTools → Styles → verificar que var() está siendo leído
```

### Responsive mixin no funciona

```
Grid siempre en 4 columnas en mobile

✅ Solución:
// Verificar que esté en orden correcto (mobile-first)
.grid {
  @include resp.responsive-grid-4-col;
  // Esto ya incluye mobile-first internamente
}
```

---

## Recursos

- [WCAG 2.1 AA](https://www.w3.org/WAI/WCAG21/quickref/)
- [Design Tokens](https://specifyapp.com/blog/design-tokens)
- [Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [SCSS Mixins](https://sass-lang.com/documentation/at-rules/mixin)

