# Checklist de Accesibilidad WCAG 2.1 AA

**Versión:** 1.0.0  
**Última actualización:** 11 de julio de 2026  
**Estándar:** WCAG 2.1 Level AA

---

## ✅ Pre-Deploy Validation

### Compilación y Linting

```bash
# Backend
cd backend
npm run build    # ✅ Must complete without errors
npm run lint     # ✅ 0 eslint errors
npm run test     # ✅ Jest: > 80% coverage

# Frontend
cd frontend
npm run build    # ✅ Must complete without errors
npm run lint     # ✅ 0 eslint errors
npm run test:headless  # ✅ Karma tests pass
```

**Responsable:** DevOps / Lead Developer  
**Frecuencia:** Pre-merge en PR

---

## 🎯 Automated Testing

### Lighthouse Accessibility Audit

1. **Abrir en Chrome:**
   ```
   http://localhost:4200/app/dashboard
   http://localhost:4200/app/docentes
   http://localhost:4200/app/cursos
   http://localhost:4200/auth/login
   ```

2. **DevTools → Lighthouse → Accessibility:**
   - [ ] Score >= 95/100
   - [ ] 0 failures
   - [ ] All best practices pass

3. **Verificar elementos:**
   - [ ] Color contrast >= 4.5:1
   - [ ] Focus indicators visible
   - [ ] Labels associated with inputs
   - [ ] Button purposes clear
   - [ ] List structure valid

**Responsable:** QA / Developer  
**Frecuencia:** Diaria (dev), antes de release (prod)

### axe DevTools Scan

1. **Instalar:** [Chrome Web Store](https://www.deque.com/axe/devtools/)

2. **Por página:**
   ```
   1. F12 → axe DevTools
   2. "Scan ALL of my page"
   3. Review results
   ```

3. **Criterios de aprobación:**
   - [ ] Violations: 0
   - [ ] Warnings: < 3 (review each)
   - [ ] Best Practices: all pass

**Páginas críticas:**
- [ ] Login page
- [ ] Dashboard
- [ ] Docentes list
- [ ] Cursos list
- [ ] Horarios grid
- [ ] Form pages (create/edit)

**Responsable:** QA / Accessibility Reviewer  
**Frecuencia:** Weekly

### pa11y CLI (CI/CD Integration)

```bash
# Manual run
npm run test:a11y

# Resultado esperado
✔ WCAG2AA: 0 violations
✔ Standard: All pass
✔ Runner 1 (axe): Pass
✔ Runner 2 (htmlcs): Pass
```

**Responsable:** CI/CD Pipeline  
**Frecuencia:** On every push

---

## ⌨️ Manual Keyboard Testing

### Login Page

```
Start: URL bar
├─ Tab: "Email" input (focus visible)
├─ Type: admin@unt.edu.pe
├─ Tab: "Contraseña" input
├─ Type: [password]
├─ Tab: "Login" button (focus visible)
├─ Enter: Submit form
└─ Result: Navigate to dashboard
```

**Checklist:**
- [ ] Focus indicator visible on all elements
- [ ] Focus order is logical (left-to-right, top-to-bottom)
- [ ] Tab cycles through all interactive elements
- [ ] Shift+Tab goes backwards
- [ ] Enter submits form
- [ ] Escape doesn't trap focus

### Dashboard Navigation

```
Start: Dashboard page loaded
├─ Tab: KPI card 1 (focus visible)
├─ Tab: KPI card 2
├─ Tab: Chart area
├─ Tab: Table (header row focus)
├─ Arrow Down: Move to next table row
├─ Arrow Right: Move to next cell
├─ Tab: Action button (Edit)
├─ Enter: Open edit dialog
├─ Tab: Modal form fields
├─ Escape: Close modal (focus returns to table)
└─ Verify: Focus restored to Edit button
```

**Checklist:**
- [ ] All actionable elements focusable
- [ ] Arrow keys work in table
- [ ] Escape closes dialogs
- [ ] Focus returns to trigger element
- [ ] No keyboard traps

### Form Input Validation

```
Start: Edit Docente form
├─ Tab: Name field (empty)
├─ Tab Away: Validation error appears
├─ Verify: Error visible AND announced
├─ Tab Back: Focus returns to field
├─ Type Valid Data
├─ Tab Away: Error clears
├─ Submit: Form submits
└─ Result: Success message
```

**Checklist:**
- [ ] Errors visible immediately
- [ ] Error text clear (not just color)
- [ ] Help text visible
- [ ] Required fields marked (*)
- [ ] Validation doesn't trap focus

---

## 🔊 Screen Reader Testing

### Setup (Windows: NVDA)

```bash
# Download
https://www.nvaccess.org/

# Launch
1. Install NVDA
2. Ctrl + Alt + N (start)
3. Open Chrome
4. Navigate to localhost:4200
```

### Test Cases

#### Login Page

```
✅ Expected announcements:
1. "Logo image" or skip with Ctrl+Alt+D
2. "Login section"
3. "Email label, edit text" (Tab)
4. "Password label, edit text, password" (Tab)
5. "Login button" (Tab)
6. When error: "Alert: Email is required"

❌ Red flags:
- No announcement of required (*)
- Errors not announced
- Images not alt-labeled
```

**Script NVDA:**
```
1. Start NVDA (Insert + Alt + N or Ctrl+Alt+N)
2. Tab through form fields
3. Listen for: label + role + required status
4. Verify error announcements
5. Check button purposes
```

#### Dashboard Page

```
✅ Expected announcements:
1. "Main navigation" (landmark)
2. "Dashboard heading level 1"
3. "Total Docentes section heading level 2"
4. "42 stat"
5. Tab to KPI cards: "Card title, 42 docentes"
6. Enter table: "Table with 5 columns and 10 rows"
7. "Column headers: Name, Email, Contrato, Antigüedad, Acciones"
8. Arrow Down: "Row 1: John Doe, john@unt.edu.pe..."

❌ Red flags:
- Landmarks not announced
- Table not announced as table
- Headers not associated with cells
- Action buttons unlabeled
```

**Script for Tables:**
```
1. Tab to table
2. NVDA announces: "Table, 5 columns, 10 rows"
3. Arrow Down: moves to next row
4. Arrow Right: moves to next cell
5. F5: list landmarks
6. Verify: navigation logical
```

#### Error Handling

```
✅ Expected announcements (Form validation):
1. Type invalid email → Tab away
2. NVDA announces: "Alert, Email is invalid"
3. Error visually connected to field
4. Focus remains on field (or moves to error)

❌ Red flags:
- Error not announced
- Focus moves away without notice
- Error text not associated (aria-describedby)
```

**Script:**
```
1. Form field → Tab away (empty)
2. Wait 1 second
3. NVDA should announce error
4. If not → Check aria-describedby
```

### Frequency

- [ ] **Before each release:** Full page walkthrough
- [ ] **Spot check:** Changes to forms/modals
- [ ] **New components:** Test before merge

**Responsable:** Accessibility Tester / QA  
**Tools:** NVDA (free), JAWS (commercial), VoiceOver (Mac)

---

## 🎨 Visual Design Validation

### Color Contrast

**Tool:** [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

| Element | Min Ratio | Current | Status |
|---------|-----------|---------|--------|
| Body text (#1F2937 on #F9FAFB) | 4.5:1 | 14.5:1 | ✅ |
| Button text (white on #6366F1) | 4.5:1 | 6.2:1 | ✅ |
| Placeholder text (#9CA3AF on white) | 3:1 | 4.6:1 | ✅ |
| Link text (#0284C7 on white) | 3:1 | 5.4:1 | ✅ |
| Focus outline (#6366F1 on white) | — | Visible | ✅ |

**Validation Script:**
```bash
# Test all color combinations
1. Extract colors from design tokens
2. Run WebAIM checker
3. Document ratios
4. Update if < 4.5:1 (AA standard)
```

### Focus Indicator

- [ ] Outline color: `--color-accent` (#6366F1)
- [ ] Outline width: 2px (minimum)
- [ ] Outline offset: -2px (inside element)
- [ ] Visible on all interactive elements
- [ ] Contrast >= 3:1 with background

**Visual test:**
```
1. Tab through page
2. Focus indicator should be:
   - Clearly visible (not just slight color change)
   - Consistent across all interactive elements
   - Distinguishable from default state
```

### Text Sizing at 200% Zoom

```
Steps:
1. Ctrl + Plus (repeat until 200%)
2. Verify:
   - [ ] No horizontal scroll needed
   - [ ] Content reflows vertically
   - [ ] All text legible
   - [ ] Buttons still clickable
   - [ ] Modals still usable
   - [ ] Forms still functional

Expected result:
- Desktop 1920x1080 @ 200% zoom
- Content visible in ~960px width
- No layout breaks
```

---

## 📋 Component Checklist

### Form Components

- [ ] Labels associated with inputs (`<label for>`)
- [ ] Required fields marked (`aria-required="true"` + *)
- [ ] Error messages announced (`aria-describedby`)
- [ ] Help text visible and clear
- [ ] Input validation on blur (not just submit)
- [ ] Buttons accessible (44px min height)
- [ ] No color-only indicators (combine with icon/text)

### Table Components

- [ ] Table structure: `<thead>`, `<tbody>`
- [ ] Headers: `<th role="columnheader">`
- [ ] Row focus: `:focus-within` visible
- [ ] Sortable columns: indicate with icon + aria-sort
- [ ] Pagination: keyboard accessible
- [ ] No nested tables (simplify if needed)
- [ ] Alt text for cell images

### Links & Buttons

- [ ] Purpose clear from link text
- [ ] Icon buttons have aria-label
- [ ] No "Click here" or "Read more" only
- [ ] Focus indicator visible
- [ ] Touch target >= 44×44px
- [ ] Visited link state distinguishable

### Images

- [ ] `alt` attribute present
- [ ] Alt text describes image (not "image of...")
- [ ] Decorative images: `alt=""` + `role="presentation"`
- [ ] Charts: alt text OR detailed description below
- [ ] Logo: appropriate alt text (e.g., "UNT Logo" or skip)

### Modals/Dialogs

- [ ] Focus trapped inside modal (Tab cycles)
- [ ] Escape closes modal
- [ ] Focus returns to trigger element
- [ ] Heading present and meaningful
- [ ] Close button accessible
- [ ] ARIA role="dialog" or "alertdialog"

---

## 🚀 Pre-Release Checklist

### 48 Hours Before Release

**Frontend Lead:**
- [ ] Run `npm run build` successfully
- [ ] Run `npm run lint` with 0 errors
- [ ] Run accessibility tests (axe, lighthouse)
- [ ] Document any accessibility exceptions

**QA Team:**
- [ ] Keyboard navigation test (all pages)
- [ ] Screen reader test (5+ major pages)
- [ ] Color contrast verification
- [ ] Focus indicator visibility
- [ ] 200% zoom test

**Documentation:**
- [ ] Update accessibility guide (if new patterns)
- [ ] Document known issues (if any)
- [ ] Create release notes

### Go-Live

**Deployment Checklist:**
- [ ] No compile errors
- [ ] No TypeScript strict errors
- [ ] Lighthouse score >= 95
- [ ] Zero axe violations
- [ ] All manual tests pass
- [ ] Accessibility approval signed off

---

## 📊 Metrics & Reporting

### Monthly Report Template

```
WCAG 2.1 AA Compliance — [Month/Year]

AUTOMATED TESTING:
✅ Lighthouse: 96/100 avg across 10 pages
✅ axe violations: 0
✅ pa11y: WCAG2AA pass
⚠️ Warnings: 2 (manual review scheduled)

MANUAL TESTING:
✅ Keyboard navigation: 100% pages tested
✅ Screen reader: 8 pages tested, no issues
✅ Color contrast: All ratios >= 4.5:1
✅ Focus indicators: Visible on all elements

INCIDENTS:
- None reported

COMPLIANCE RATE: 100% WCAG 2.1 AA
```

---

## 🎓 Training & Onboarding

### New Developer Checklist

- [ ] Read "Guía de Accesibilidad" (docs/02-guia-accesibilidad.md)
- [ ] Review design tokens (design-system folder)
- [ ] Test with axe DevTools on localhost
- [ ] Keyboard-only navigation test (5 minutes)
- [ ] Review 2-3 accessible components (forms, tables)
- [ ] Pair programming: 1 commit with accessibility focus

### Quarterly Accessibility Workshop

**Topics:**
1. WCAG 2.1 AA standards (45 min)
2. Common mistakes + fixes (30 min)
3. Testing tools demo (30 min)
4. Q&A (15 min)

**Required attendance:** All frontend/QA staff

---

## 📞 Support & Escalation

| Issue | Owner | SLA |
|-------|-------|-----|
| Critical accessibility bug | Lead Dev | 24h |
| Accessibility testing failure | QA | 48h |
| Design system pattern question | Design Lead | 5 business days |
| 3rd-party component accessibility | Team | 1 sprint |

**Report:** [GitHub Issues](https://github.com/org/repo/issues) → Label: `accessibility`

