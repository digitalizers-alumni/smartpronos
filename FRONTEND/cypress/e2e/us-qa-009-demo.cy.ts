import { setupDefaultMocks } from '../support/supabase-mock';

describe('US-QA-009 — Fiabilité démo', () => {
  it('parcours demo complet sans erreur', () => {
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
    setupDefaultMocks();
    cy.get('input[formControlName="email"]').type(Cypress.env('TEST_EMAIL'));
    cy.get('input[formControlName="password"]').type(Cypress.env('TEST_PASSWORD'));
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.url({ timeout: 15000 }).should('include', '/home/match-list');

    // 3. Dashboard
    cy.get('app-match-card').should('have.length.at.least', 1);

    // 4. Leaderboard
    cy.visit('/leaderboard');
    cy.contains('Global').should('be.visible');

    // 5. Profil
    cy.visit('/profile');
    cy.contains('Points').should('be.visible');

    // 6. Deconnexion
    cy.contains('Se déconnecter').click();
    cy.url({ timeout: 5000 }).should('include', '/');

    // Verification : aucune erreur JS
    cy.wrap(errors).should('have.length', 0);
  });

  it('demo sur viewport large (1920x1080)', () => {
    cy.viewport(1920, 1080);
    cy.loginViaApi();
    cy.get('app-match-card').should('have.length.at.least', 1);
  });
});
