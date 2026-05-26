Cypress.Commands.add('loginViaApi', (email = 'test@test.com', password = 'Password123!') => {
  cy.session([email, password], () => {
    cy.intercept('POST', '**/auth/v1/token**', {
      statusCode: 200,
      body: {
        access_token: 'cy-fake-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'cy-fake-refresh',
        user: { id: 'cy-user-id', email, aud: 'authenticated', role: 'authenticated' },
      },
    }).as('authLogin');

    cy.visit('/login');
    cy.get('input[formControlName="email"]').type(email);
    cy.get('input[formControlName="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.wait('@authLogin');
    cy.url({ timeout: 10000 }).should('include', '/home/match-list');
  });
});
