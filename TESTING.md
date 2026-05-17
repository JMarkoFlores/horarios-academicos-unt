# Infraestructura de Testing

Este documento describe la infraestructura profesional de testing configurada para el proyecto.

## Testing del Backend (NestJS)

### Tecnologías
- **Jest**: Framework de testing
- **Supertest**: Librería de aserciones HTTP para probar controladores NestJS

### Configuración
- `jest.config.js`: Configuración de Jest con umbrales de coverage (70%)
- `test/setup.ts`: Configuración global de tests
- `test/helpers/test-helpers.ts`: Funciones auxiliares para testing
- `test/fixtures/`: Fixtures de tests (usuario, curso, horario)
- `test/mocks/`: Objetos mock para servicios

### Scripts
```bash
npm test              # Ejecutar todos los tests
npm run test:watch    # Ejecutar tests en modo watch
npm run test:cov      # Ejecutar tests con coverage
npm run test:debug    # Ejecutar tests en modo debug
npm run test:e2e      # Ejecutar tests end-to-end
```

### Estructura
```
backend/
├── jest.config.js
├── test/
│   ├── setup.ts
│   ├── helpers/
│   │   └── test-helpers.ts
│   ├── fixtures/
│   │   └── user.fixture.ts
│   └── mocks/
│       └── auth.mock.ts
└── src/
    └── *.spec.ts    # Tests unitarios junto a archivos fuente
```

### Coverage
- Reportes de coverage generados en `backend/coverage/`
- Umbrales: 70% para ramas, funciones, líneas, declaraciones
- Excluye: entities, migrations, main.ts, archivos de módulos

## Testing del Frontend (Angular)

### Tecnologías
- **Karma/Jasmine**: Testing unitario (configuración por defecto de Angular)
- **Cypress**: Testing end-to-end
- **Playwright**: Testing end-to-end (alternativa a Cypress)

### Configuración
- `angular.json`: Configuración de Karma con coverage
- `cypress.config.ts`: Configuración de Cypress
- `playwright.config.ts`: Configuración de Playwright
- `cypress/support/`: Archivos de soporte de Cypress
- `cypress/fixtures/`: Fixtures de tests de Cypress
- `e2e/fixtures/`: Fixtures de tests de Playwright
- `e2e/helpers/`: Funciones auxiliares de Playwright

### Scripts
```bash
# Tests Unitarios (Karma/Jasmine)
npm test              # Ejecutar tests unitarios
npm run test:cov      # Ejecutar tests con coverage
npm run test:headless # Ejecutar tests en modo headless
npm run test:watch    # Ejecutar tests en modo watch

# Tests E2E con Cypress
npm run cypress:open           # Abrir interfaz de Cypress
npm run cypress:run            # Ejecutar tests de Cypress
npm run cypress:run:chrome     # Ejecutar tests de Cypress en Chrome
npm run cypress:run:firefox    # Ejecutar tests de Cypress en Firefox

# Tests E2E con Playwright
npm run playwright:install     # Instalar navegadores de Playwright
npm run playwright:test        # Ejecutar tests de Playwright
npm run playwright:test:ui     # Ejecutar tests de Playwright con UI
npm run playwright:test:headed # Ejecutar tests de Playwright en modo headed
npm run playwright:test:debug  # Ejecutar tests de Playwright en modo debug
npm run playwright:test:report # Mostrar reporte de tests de Playwright
```

### Estructura
```
frontend/
├── angular.json
├── cypress.config.ts
├── playwright.config.ts
├── cypress/
│   ├── support/
│   │   ├── e2e.ts
│   │   └── commands.ts
│   ├── e2e/
│   │   └── app.cy.ts
│   └── fixtures/
│       └── auth.fixture.ts
├── e2e/
│   ├── app.spec.ts
│   ├── fixtures/
│   │   └── auth.fixture.ts
│   └── helpers/
│       └── test-helpers.ts
└── src/
    └── *.spec.ts    # Tests unitarios junto a archivos fuente
```

### Coverage
- Reportes de coverage generados en `frontend/coverage/`
- Excluye: main.ts, app.module.ts, interfaces, mocks, fixtures

## Mejores Prácticas

### Backend
- Escribir tests unitarios para servicios, controladores y módulos
- Usar Supertest para testing de endpoints HTTP
- Mockear dependencias externas (bases de datos, APIs externas)
- Mantener los tests aislados e independientes
- Usar nombres descriptivos para los tests

### Frontend
- Escribir tests unitarios para componentes, servicios y pipes
- Usar Cypress/Playwright para testing end-to-end
- Mockear respuestas de API en tests E2E
- Probar interacciones de usuario y flujos
- Usar atributos data-cy para selección de elementos en tests E2E

## Ejecutar Tests

### Todos los Tests
```bash
# Backend
cd backend && npm test

# Tests Unitarios del Frontend
cd frontend && npm test

# Tests E2E del Frontend (Cypress)
cd frontend && npm run cypress:run

# Tests E2E del Frontend (Playwright)
cd frontend && npm run playwright:test
```

### Con Coverage
```bash
# Backend
cd backend && npm run test:cov

# Frontend
cd frontend && npm run test:cov
```

## Integración CI/CD

La infraestructura de testing está lista para integración CI/CD:

- Todos los scripts de tests pueden ejecutarse en modo headless
- Los reportes de coverage se generan automáticamente
- Los tests pueden ejecutarse en paralelo
- Soporte para múltiples navegadores (Chrome, Firefox, Safari)

## Próximos Pasos

1. Agregar más tests unitarios para lógica de negocio
2. Agregar tests de integración para endpoints de API
3. Agregar tests E2E para flujos de usuario críticos
4. Configurar pipeline CI/CD para ejecutar tests automáticamente
5. Configurar reportes de coverage y quality gates
