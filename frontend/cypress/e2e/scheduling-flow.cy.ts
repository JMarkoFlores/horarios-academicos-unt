describe('Scheduling System E2E Flow', () => {
  const adminEmail = 'admin@unitru.edu.pe';
  const adminPass = 'Admin123!';

  beforeEach(() => {
    // Limpiar estado si es necesario a través de API o simplemente recargar
    cy.viewport(1280, 720);
  });

  it('debe realizar el login correctamente', () => {
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(adminEmail);
    cy.get('input[formControlName="password"]').type(adminPass);
    cy.get('button.submit-btn').click();

    cy.url().should('include', '/app/dashboard');
    cy.contains('Bienvenido').should('be.visible');
  });

  it('debe navegar a Horarios y realizar el flujo completo de generación', () => {
    // Login previo
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(adminEmail);
    cy.get('input[formControlName="password"]').type(adminPass);
    cy.get('button.submit-btn').click();

    // Navegación
    cy.get('mat-list-item').contains('Horarios').click();
    cy.url().should('include', '/app/horarios');

    // Pestaña Gestión
    cy.get('.mat-mdc-tab').contains('Gestión de Horario').click();

    // Limpiar primero para asegurar un estado limpio
    cy.contains('Limpiar Horario del Período').click();
    // Suponiendo que hay un diálogo de confirmación o simplemente sucede
    cy.contains('Limpiando...').should('exist');
    cy.contains('Limpiar Horario del Período').should('be.enabled');

    // Generar Horario
    cy.contains('Generar Horario Automático').click();
    cy.get('mat-spinner').should('exist');
    
    // Esperar a que termine (ajustar timeout si es necesario)
    cy.contains('Asignaciones creadas', { timeout: 30000 }).should('be.visible');
    
    // Verificar que hay resultados
    cy.get('.resultado strong').first().then(($span) => {
      const asignaciones = parseInt($span.text());
      expect(asignaciones).to.be.greaterThan(0);
    });
  });

  it('debe mostrar y permitir navegar por conflictos', () => {
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(adminEmail);
    cy.get('input[formControlName="password"]').type(adminPass);
    cy.get('button.submit-btn').click();
    cy.get('mat-list-item').contains('Horarios').click();

    // Pestaña Conflictos
    cy.get('.mat-mdc-tab').contains('Conflictos').click();
    
    // Si hay conflictos, verificar la tabla
    cy.get('body').then(($body) => {
      if ($body.find('table.mat-mdc-table').length > 0) {
        cy.get('table.mat-mdc-table').should('be.visible');
        cy.contains('Tipo').should('be.visible');
      } else {
        cy.contains('Sin conflictos activos').should('be.visible');
      }
    });
  });

  it('debe manejar errores del sistema con elegancia', () => {
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(adminEmail);
    cy.get('input[formControlName="password"]').type(adminPass);
    cy.get('button.submit-btn').click();
    cy.get('mat-list-item').contains('Horarios').click();
    cy.get('.mat-mdc-tab').contains('Gestión de Horario').click();

    // Interceptar llamada de generación y forzar error 500
    cy.intercept('POST', '**/horarios/generar', {
      statusCode: 500,
      body: { message: 'Error interno del motor de asignación' }
    }).as('generarError');

    cy.contains('Generar Horario Automático').click();
    cy.wait('@generarError');

    // Verificar que se muestra un mensaje de error (ej: un snackbar o alerta)
    // Basado en el código estándar de Angular Material
    cy.get('.mat-mdc-simple-snack-bar').should('exist');
    cy.contains('Error').should('be.visible');
  });

  it('debe permitir exportar el horario a PDF', () => {
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(adminEmail);
    cy.get('input[formControlName="password"]').type(adminPass);
    cy.get('button.submit-btn').click();
    cy.get('mat-list-item').contains('Horarios').click();

    // Seleccionar un docente (asumiendo que hay datos)
    cy.get('mat-select').first().click();
    cy.get('mat-option').first().click();

    // Botón descargar
    cy.contains('Descargar PDF').should('be.visible').and('not.be.disabled');
    
    // Interceptar la descarga
    cy.intercept('GET', '**/reportes/pdf/**').as('downloadPdf');
    cy.contains('Descargar PDF').click();
    cy.wait('@downloadPdf').its('response.statusCode').should('eq', 200);
  });
});
