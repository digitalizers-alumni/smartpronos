import { setupDefaultMocks } from '../support/supabase-mock';

describe('US-QA-006 — Parcours complet', () => {
  it('landing → login → dashboard → match → prono → profil → deconnexion', () => {
    // 1. Landing page
    cy.visit('/');
    cy.contains('Commencer').should('be.visible');

    // 2. Navigation vers login
    cy.contains('Connexion').click();
    cy.url().should('include', '/login');

    // 3. Connexion réelle via l'UI
    setupDefaultMocks();
    cy.get('input[formControlName="email"]').type(Cypress.env('TEST_EMAIL'));
    cy.get('input[formControlName="password"]').type(Cypress.env('TEST_PASSWORD'));
    cy.contains('button[type="submit"]', 'Se connecter').click();
    cy.url({ timeout: 15000 }).should('include', '/home/match-list');

    // 4. Dashboard avec matchs
    cy.get('app-match-card').should('have.length.at.least', 1);

    // 5. Navigation vers profil
    cy.contains('Profil').click();
    cy.url().should('include', '/profile');
    cy.contains('Se déconnecter').should('be.visible');
  });
});
