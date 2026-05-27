describe('US-QA-005 — Classement', () => {
  beforeEach(() => {
    cy.loginViaApi();
  });

  it('affiche la page classement avec les onglets', () => {
    cy.visit('/leaderboard');
    cy.contains('Global').should('be.visible');
    cy.contains('Ma Tribu').should('be.visible');
    cy.contains('Tribus').should('be.visible');
  });

  it('affiche la liste des joueurs sur longlet global', () => {
    cy.visit('/leaderboard');
    cy.contains('Sophie L.').should('be.visible');
    cy.contains('Marc D.').should('be.visible');
  });

  it('navigation depuis le dashboard vers le classement', () => {
    cy.visit('/home/match-list');
    cy.contains('Classement').click();
    cy.url().should('include', '/leaderboard');
    cy.contains('Global').should('be.visible');
  });
});
