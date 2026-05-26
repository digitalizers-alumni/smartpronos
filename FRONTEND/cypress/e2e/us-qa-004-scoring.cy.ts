describe('US-QA-004 — Points / Scoring', () => {
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
    cy.url({ timeout: 10000 }).should('include', '/home/match-list');
  });

  it('affiche les points utilisateur sur le dashboard', () => {
    cy.contains('1 240').should('be.visible');
  });

  it('affiche les points sur la page profil', () => {
    cy.visit('/profile');
    cy.contains('1 240').should('be.visible');
    cy.contains('Mes points').should('be.visible');
  });

  it('affiche le rang utilisateur', () => {
    cy.visit('/profile');
    cy.contains('#4').should('be.visible');
  });

  it('affiche les points pour un match termine avec resultat', () => {
    cy.visit('/match/wc-2026-g4/detail');
    cy.contains('Match joué').should('be.visible');
  });

  it('affiche le resultat final sur le detail du match', () => {
    cy.visit('/match/wc-2026-g4/detail');
    cy.get('span.font-space.text-2xl').should('be.visible');
  });
});
