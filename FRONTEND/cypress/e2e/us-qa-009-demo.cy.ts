describe('US-QA-009 — Fiabilité démo', () => {
  it('parcours demo complet sans erreur', () => {
    cy.intercept('POST', '**/auth/v1/token**', {
      statusCode: 200,
      body: {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh',
        user: { id: 'u1', email: 'demo@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      },
    }).as('login');

    const errors: string[] = [];
    cy.on('uncaught:exception', (err) => {
      errors.push(err.message);
      return false;
    });

    // 1. Accueil
    cy.visit('/');
    cy.contains('Commencer').should('be.visible');

    // 2. Login
    cy.contains('Connexion').click();
    cy.get('input[formControlName="email"]').type('demo@test.com');
    cy.get('input[formControlName="password"]').type('demo1234');
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.wait('@login');
    cy.url({ timeout: 10000 }).should('include', '/home/match-list');

    // 3. Dashboard
    cy.get('app-match-card').should('have.length.at.least', 1);

    // 4. Leaderboard
    cy.visit('/leaderboard');
    cy.contains('Classement').should('be.visible');

    // 5. Profil
    cy.visit('/profile');
    cy.contains('Mes points').should('be.visible');

    // 6. Deconnexion
    cy.contains('Déconnexion').click();
    cy.url({ timeout: 5000 }).should('include', '/');

    // Verification : aucune erreur JS
    cy.wrap(errors).should('have.length', 0);
  });

  it('demo sur viewport large (1920x1080)', () => {
    cy.viewport(1920, 1080);
    cy.intercept('POST', '**/auth/v1/token**', {
      statusCode: 200,
      body: {
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh',
        user: { id: 'u1', email: 'demo@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
      },
    }).as('login');
    cy.visit('/login');
    cy.get('input[formControlName="email"]').type('demo@test.com');
    cy.get('input[formControlName="password"]').type('demo1234');
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.wait('@login');
    cy.url({ timeout: 10000 }).should('include', '/home/match-list');
    cy.get('app-match-card').should('have.length.at.least', 1);
  });
});
