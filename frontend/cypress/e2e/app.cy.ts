describe('App E2E Test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should display the application', () => {
    cy.get('app-root').should('exist');
  });

  it('should have a title', () => {
    cy.title().should('not.be.empty');
  });
});
