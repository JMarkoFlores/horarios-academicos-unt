// Custom Cypress commands

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-cy="email"]').type(email);
  cy.get('[data-cy="password"]').type(password);
  cy.get('[data-cy="login-button"]').click();
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="logout-button"]').click();
});
