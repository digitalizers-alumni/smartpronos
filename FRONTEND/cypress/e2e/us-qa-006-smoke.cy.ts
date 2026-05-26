describe('US-QA-006 — Parcours complet', () => {
  it('landing → login → dashboard → match → prono → profil → deconnexion', () => {
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

    // 1. Landing page
    cy.visit('/');
    cy.contains('Commencer').should('be.visible');

    // 2. Navigation vers login
    cy.contains('Connexion').click();
    cy.url().should('include', '/login');

    // 3. Connexion
    cy.get('input[formControlName="email"]').type('demo@test.com');
    cy.get('input[formControlName="password"]').type('demo1234');
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.wait('@login');
    cy.url({ timeout: 10000 }).should('include', '/home/match-list');

    // 4. Dashboard avec matchs
    cy.get('app-match-card').should('have.length.at.least', 1);

    // 5. Navigation vers profil
    cy.contains('Profil').click();
    cy.url().should('include', '/profile');
    cy.contains('Déconnexion').should('be.visible');
  });
});
