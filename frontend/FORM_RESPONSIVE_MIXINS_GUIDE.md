# Form & Responsive Mixins Guide

**Creado:** 2026-07-11 | **Archivos:** `_form-mixins.scss`, `_responsive-mixins.scss`

Este documento explica cómo usar los nuevos mixins reutilizables para refactorizar componentes frontend rápidamente.

---

## 🎯 Objetivo

Reducir el tiempo de refactor de formularios y responsive layouts alineando código a tokens centralizados mediante mixins SCSS reutilizables.

---

## 📦 Form Mixins (`_form-mixins.scss`)

### Importación

```scss
@use 'src/app/shared/design-system/form-mixins' as forms;
```

### Mixins Disponibles

#### 1. `form-page-container`
**Uso:** Contenedor principal de página de formulario  
**Propiedades:** `display: flex`, `gap: var(--space-5)`, `flex-direction: column`

```scss
.my-form-page {
  @include forms.form-page-container;
}
// Genera: display: flex; flex-direction: column; gap: var(--space-5);
```

#### 2. `form-card-container`
**Uso:** Card que contiene el formulario  
**Propiedades:** Padding, border-radius, shadow, background

```scss
.my-form-card {
  @include forms.form-card-container;
}
// Genera: padding: var(--space-8); border-radius: var(--radius-lg); ...
```

#### 3. `form-section-header`
**Uso:** Header de sección dentro del formulario  
**Propiedades:** Flexbox, gap, margin, padding, border-bottom, tipografía

```scss
.my-section-header {
  @include forms.form-section-header;
}
// Nota: Aplica estilos a h3 y mat-icon hijos automáticamente
```

#### 4. `premium-form-field`
**Uso:** Estilos de input/select/textarea  
**Propiedades:** Background, border-radius, hover, focus overlay, icon prefix

```scss
.my-input-field {
  @include forms.premium-form-field;
}
```

**Nota:** Este mixin usa `::ng-deep` para penetrar Material theming.

#### 5. `form-footer`
**Uso:** Contenedor de botones al pie del formulario  
**Propiedades:** `display: flex`, gap, padding-top, border-top

```scss
.my-form-footer {
  @include forms.form-footer;
  
  .btn-cancel {
    @include forms.button-cancel;
  }
  
  .btn-submit {
    @include forms.button-submit;
  }
}
```

#### 6. `button-cancel` / `button-submit`
**Uso:** Botones de formulario con estilos predefinidos  
**Propiedades:** Height, padding, border-radius, transition, hover

```scss
.form-footer {
  @include forms.form-footer;
  
  .btn-cancel {
    @include forms.button-cancel;  // Estilo ghost/secondary
  }
  
  .btn-submit {
    @include forms.button-submit;  // Estilo primary con sombra
  }
}
```

#### 7. `form-fields-grid($columns: 2)`
**Uso:** Grid responsive para campos del formulario  
**Parámetro:** `$columns` (default 2, se colapsa a 1 en mobile)

```scss
.form-fields {
  @include forms.form-fields-grid(2);  // 2 columnas en desktop, 1 en mobile
}

.form-fields-3col {
  @include forms.form-fields-grid(3);  // 3 columnas en desktop
}
```

#### 8. `form-loading-center`
**Uso:** Centro de carga (spinner + texto)

```scss
.loading-spinner-wrapper {
  @include forms.form-loading-center;
}
```

#### 9. `form-error-message`
**Uso:** Mensaje de error con ícono

```scss
.error-text {
  @include forms.form-error-message;
}
```

#### 10. `form-helper-text`
**Uso:** Texto de ayuda debajo de campo

```scss
.help-text {
  @include forms.form-helper-text;
}
```

#### 11. `form-required-indicator`
**Uso:** Asterisco rojo para campos requeridos

```scss
.required-star {
  @include forms.form-required-indicator;
}
```

---

## 🎨 Responsive Mixins (`_responsive-mixins.scss`)

### Importación

```scss
@use 'src/app/shared/design-system/responsive-mixins' as resp;
```

### Breakpoint Mixins

#### Breakpoints Disponibles

| Mixin | Rango | Dispositivos |
|-------|-------|------|
| `@include resp.mobile` | < 640px | Phones |
| `@include resp.tablet` | 640px - 767px | Tablets (portrait) |
| `@include resp.tablet-landscape` | 768px - 1023px | Tablets (landscape) |
| `@include resp.desktop` | ≥ 1024px | Desktops |
| `@include resp.large-desktop` | ≥ 1280px | Large desktops |
| `@include resp.very-large-desktop` | ≥ 1536px | Very large displays |

#### Mobile-First Approach

```scss
@include resp.from-md {
  // Estilos para tablets y arriba
}

@include resp.from-lg {
  // Estilos para desktops y arriba
}
```

### Grid Responsive

#### `responsive-grid-2-col`
2 columnas en desktop, 1 en mobile

```scss
.my-grid {
  @include resp.responsive-grid-2-col;
}
// Genera: grid-template-columns: 1fr 1fr; en desktop
//         grid-template-columns: 1fr; en mobile
```

#### `responsive-grid-3-col`
3 columnas en desktop, 2 en tablet, 1 en mobile

```scss
.my-grid {
  @include resp.responsive-grid-3-col;
}
```

#### `responsive-grid-4-col`
4 columnas en desktop, 2 en tablet, 1 en mobile

```scss
.dashboard-grid {
  @include resp.responsive-grid-4-col;
}
```

### Responsive Spacing & Typography

#### `responsive-padding`
Padding que cambia por breakpoint

```scss
.container {
  @include resp.responsive-padding(
    $desktop: var(--space-8),
    $tablet: var(--space-6),
    $mobile: var(--space-4)
  );
}
```

#### `responsive-font-size`
Font-size que escala por breakpoint

```scss
.title {
  @include resp.responsive-font-size(
    $desktop: 1.5rem,
    $tablet: 1.25rem,
    $mobile: 1rem
  );
}
```

### Headings Responsive

#### `responsive-heading-1`
H1 escalable (36px desktop → 24px mobile)

```scss
.page-title {
  @include resp.responsive-heading-1;
}
```

#### `responsive-heading-2`
H2 escalable (30px desktop → 20px mobile)

```scss
.section-title {
  @include resp.responsive-heading-2;
}
```

### Accesibilidad & Touch

#### `touch-target`
Mínimo 44px para toque accesible

```scss
button {
  @include resp.touch-target;
}
```

#### `reduced-motion`
Respetar preferencias de movimiento

```scss
.animated-element {
  animation: slideIn 0.3s ease;
  
  @include resp.reduced-motion {
    animation: none;
  }
}
```

### Utilidades de Texto

#### `text-truncate`
Cortar texto largo con ellipsis

```scss
.truncated-name {
  @include resp.text-truncate;
}
```

#### `text-clamp-2` / `text-clamp-3`
Limitar líneas de texto

```scss
.card-description {
  @include resp.text-clamp-3;  // Máximo 3 líneas
}
```

#### `hide-scrollbar`
Ocultar scrollbar pero permitir scroll

```scss
.custom-scroll-container {
  @include resp.hide-scrollbar;
}
```

---

## 📋 Patrón de Refactor

### Paso 1: Agregar Importaciones

```scss
@use 'src/app/shared/design-system/form-mixins' as forms;
@use 'src/app/shared/design-system/responsive-mixins' as resp;
```

### Paso 2: Reemplazar Componentes

**Antes:**
```scss
.my-form-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.my-form-card {
  padding: 32px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

**Después:**
```scss
.my-form-page {
  @include forms.form-page-container;
}

.my-form-card {
  @include forms.form-card-container;
}
```

### Paso 3: Responsive

**Antes:**
```scss
.my-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}
```

**Después:**
```scss
.my-grid {
  @include resp.responsive-grid-2-col;
}
```

---

## 🔍 Ejemplo Completo: Refactor de Component

### Componente Original
```scss
// curso-form.component.scss
.curso-form-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.form-card {
  padding: 40px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.form-field {
  width: 100%;
  ::ng-deep .mat-mdc-text-field-wrapper {
    background: #f1f5f9;
    border-radius: 8px;
  }
}

.form-footer {
  margin-top: 40px;
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  
  .btn-cancel {
    background: transparent;
    color: var(--color-text-muted);
    &:hover { background: #f1f5f9; }
  }
  
  .btn-submit {
    background: var(--color-primary);
    color: white;
    &:hover { transform: translateY(-2px); }
  }
}
```

### Componente Refactorizado

```scss
// curso-form.component.scss
@use 'src/app/shared/design-system/form-mixins' as forms;
@use 'src/app/shared/design-system/responsive-mixins' as resp;

.curso-form-page {
  @include forms.form-page-container;
  @include resp.responsive-padding(
    $desktop: var(--space-4),
    $mobile: var(--space-3)
  );
}

.form-card {
  @include forms.form-card-container;
}

.form-fields {
  @include resp.responsive-grid-2-col;
}

.form-field {
  @include forms.premium-form-field;
}

.form-footer {
  @include forms.form-footer;
  
  .btn-cancel {
    @include forms.button-cancel;
  }
  
  .btn-submit {
    @include forms.button-submit;
  }
}
```

**Reducción:** 50 líneas → 20 líneas (60% menos código)

---

## ✅ Checklist de Uso

- [ ] Importar mixins al inicio del archivo
- [ ] Reemplazar `display: flex; flex-direction: column; gap: 20px;` con `@include forms.form-page-container`
- [ ] Reemplazar padding/border/shadow con `@include forms.form-card-container`
- [ ] Usar `@include forms.premium-form-field` en inputs
- [ ] Usar `@include resp.responsive-grid-2-col` en grids
- [ ] Agregar `@include resp.touch-target` en botones móviles
- [ ] Validar que dark mode funciona (tokens se aplican automáticamente)
- [ ] Probar en mobile, tablet, desktop

---

## 📈 Impacto

| Métrica | Antes | Después |
|---------|-------|---------|
| Líneas de código | ~300 por form | ~100 por form |
| Consistencia | Manual | Automática (tokens) |
| Cambios globales | N componentes | 1 archivo |
| Dark mode | Manual por componente | Automático |
| Responsive | Media queries manuales | Mixins estandarizados |

---

**Preguntas:** Contactar con el equipo de UI/UX.
