describe('US-QA-003 — Modification de prono', () => {
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

  it('affiche le bouton modifier sur un match avec prono existant', () => {
    cy.visit('/match/wc-2026-g1/detail');
    cy.contains('Modifier mon pronostic').should('be.visible');
  });

  it('pre-remplit le formulaire avec les valeurs existantes', () => {
    cy.visit('/match/wc-2026-g1/prediction-form');
    cy.get('input[formControlName="homeScore"]').should('have.value', '2');
    cy.get('input[formControlName="awayScore"]').should('have.value', '1');
  });

  it('le label du bouton devient "Modifier mon pronostic"', () => {
    cy.visit('/match/wc-2026-g1/prediction-form');
    cy.contains('button[type="submit"]', 'Modifier mon pronostic').should('be.visible');
  });

  it('affiche message de succes apres modification', () => {
    cy.intercept('**/rest/v1/rpc/upsert_prediction', {
      statusCode: 200,
      body: { success: true, data: { prediction_id: 'p1', match_id: 'wc-2026-g1', home_score: 3, away_score: 0, is_boosted: false, updated_at: new Date().toISOString() } },
    }).as('updateProno');
    cy.visit('/match/wc-2026-g1/prediction-form');
    cy.get('input[formControlName="homeScore"]').clear().type('3');
    cy.get('input[formControlName="awayScore"]').clear().type('0');
    cy.contains('button[type="submit"]', 'Modifier mon pronostic').click();
    cy.wait('@updateProno');
    cy.contains('Pronostic modifié').should('be.visible');
  });

  it('bloque la soumission si le match est locké (status locked)', () => {
    cy.visit('/match/wc-2026-g3/detail');
    cy.get('app-match-status-badge').should('contain', 'Pronos clos');
    cy.visit('/match/wc-2026-g3/prediction-form');
    cy.url().should('include', '/detail');
  });
});
