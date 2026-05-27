/// <reference types="cypress" />
import { setupDefaultMocks } from './supabase-mock';

Cypress.Commands.add('loginViaApi', (email?: string, password?: string) => {
  const testEmail = email || Cypress.env('TEST_EMAIL') || 'admin@admin.com';
  const testPassword = password || Cypress.env('TEST_PASSWORD') || '12345678';

  setupDefaultMocks();

  cy.visit('/login');
  cy.get('input[formControlName="email"]').type(testEmail);
  cy.get('input[formControlName="password"]').type(testPassword);
  cy.contains('button[type="submit"]', 'Se connecter').click();
  cy.url({ timeout: 15000 }).should('include', '/home/match-list');
});
