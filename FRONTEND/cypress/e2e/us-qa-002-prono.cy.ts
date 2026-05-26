describe('US-QA-002 — Création de prono', () => {
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

  it('affiche les matchs disponibles sur le dashboard', () => {
    cy.contains('Tous').should('be.visible');
    cy.get('app-match-card').should('have.length.at.least', 1);
  });

  it('navigation vers le detail du match', () => {
    cy.get('app-match-card').first().click();
    cy.url().should('match', /\/match\/.+\/detail/);
  });

  it('navigation vers formulaire de prono depuis le detail', () => {
    cy.visit('/match/wc-2026-g2/detail');
    cy.contains('Faire mon pronostic').click();
    cy.url().should('include', '/prediction-form');
  });

  it('affiche le formulaire avec les champs score', () => {
    cy.visit('/match/wc-2026-g2/prediction-form');
    cy.get('input[formControlName="homeScore"]').should('be.visible');
    cy.get('input[formControlName="awayScore"]').should('be.visible');
    cy.contains('button[type="submit"]', 'Valider mon pronostic').should('be.visible');
  });

  it('affiche erreur si Supabase indisponible', () => {
    cy.visit('/match/wc-2026-g2/prediction-form');
    cy.get('input[formControlName="homeScore"]').clear().type('2');
    cy.get('input[formControlName="awayScore"]').clear().type('1');
    cy.contains('button[type="submit"]', 'Valider mon pronostic').click();
    cy.contains('Impossible').should('be.visible');
  });
});
