/// <reference types="cypress" />

interface AuthUser {
  email: string;
  password: string;
}

interface SeedMatch {
  id: string;
  home: string;
  away: string;
}

interface ProneScores {
  home: number;
  away: number;
}

declare namespace Cypress {
  interface Chainable<Subject = any> {
    loginViaApi(email?: string, password?: string): Chainable<void>;
  }
}
