describe('US-QA-005 — Classement', () => {
  beforeEach(() => {
    cy.intercept('POST', '**/auth/v1/token**', {
      statusCode: 200,
      body: {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh',
        user: { id: 'u1', email: 'user@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      },
    }).as('login');
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type('user@test.com');
    cy.get('input[formControlName="password"]').type('secret12');
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.wait('@login');
  });

  it('affiche la page classement', () => {
    cy.visit('/leaderboard');
    cy.contains('Classement').should('be.visible');
  });

  it('affiche un message indicatif si pas encore de classement', () => {
    cy.visit('/leaderboard');
    cy.contains('premier match').should('be.visible');
  });

  it('navigation depuis le dashboard vers le classement', () => {
    cy.visit('/home/match-list');
    cy.contains('Classement').click();
    cy.url().should('include', '/leaderboard');
  });
});
