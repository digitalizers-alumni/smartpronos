/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-001 — Authentification fonctionnelle
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-001
 *
 * Critères d'acceptation
 *   - Inscription réussie avec données valides
 *   - Connexion réussie avec identifiants valides
 *   - Erreur si email déjà utilisé
 *   - Erreur si mot de passe incorrect
 *   - Validation des champs obligatoires
 *   - Déconnexion utilisateur
 */

interface AuthUser {
  email: string;
  password: string;
}

describe("US-QA-001 - Authentification fonctionnelle", () => {
  // ─── Utilisateurs ────────────────────────────────────────────────────────

  // "fresh" : pour le test d'inscription réussie (doit pouvoir s'inscrire).
  const buildFreshUser = (): AuthUser => ({
    email: `fresh_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}@example.com`,
    password: "Password123!",
  });

  // "registered" : inséré par cy.seedDb() au démarrage du spec.
  const registeredUser: AuthUser = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    // Repart d'un état DB propre une fois par exécution du spec.
    // NB : pas dans beforeEach() — cy.session() mémorise des sessions HTTP
    // et un reset entre chaque test invaliderait le cache.
    cy.resetDb();
    cy.seedDb();
  });

  // Pas de beforeEach manuel : avec testIsolation: true (défaut Cypress ≥ 12),
  // cookies / localStorage / sessionStorage sont remis à zéro entre tests.

  // ─── Helpers UI ──────────────────────────────────────────────────────────

  const goToSignup = (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.get("[data-cy=signup-link]").click();

  const goToLogin = (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.get("[data-cy=login-link]").click();

  const fillCredentials = (email?: string, password?: string): void => {
    if (email) cy.get("[data-cy=email-input]").type(email);
    if (password) cy.get("[data-cy=password-input]").type(password);
  };

  const submit = (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.get("[data-cy=submit-button]").click();

  // ─── Tests ───────────────────────────────────────────────────────────────

  it("Inscription réussie avec données valides", () => {
    const fresh = buildFreshUser();
    cy.visit("/");
    goToSignup();
    fillCredentials(fresh.email, fresh.password);
    submit();

    cy.get("[data-cy=welcome-message]").should("be.visible");
  });

  it("Connexion réussie avec identifiants valides", () => {
    cy.ensureUserExists(registeredUser);
    cy.visit("/");
    goToLogin();
    fillCredentials(registeredUser.email, registeredUser.password);
    submit();

    cy.url().should("include", "/dashboard");
  });

  it("Erreur si email déjà utilisé", () => {
    cy.ensureUserExists(registeredUser);
    cy.visit("/");
    goToSignup();
    fillCredentials(registeredUser.email, registeredUser.password);
    submit();

    cy.get("[data-cy=error-message]")
      .should("be.visible")
      .and("contain", "email déjà utilisé");
  });

  it("Erreur si mot de passe incorrect", () => {
    cy.ensureUserExists(registeredUser);
    cy.visit("/");
    goToLogin();
    fillCredentials(registeredUser.email, "WrongPassword");
    submit();

    cy.get("[data-cy=error-message]")
      .should("be.visible")
      .and("contain", "mot de passe incorrect");
  });

  it("Validation des champs obligatoires", () => {
    cy.visit("/");
    goToLogin();
    submit();

    // Validation HTML5 native : la bulle n'est pas dans le DOM, on interroge
    // directement la Constraint Validation API.
    cy.get<HTMLInputElement>("[data-cy=email-input]").then(($el) => {
      expect($el[0].checkValidity()).to.be.false;
      expect($el[0].validationMessage).to.not.be.empty;
    });
  });

  it("Déconnexion utilisateur", () => {
    cy.ensureUserExists(registeredUser);
    cy.visit("/");
    goToLogin();
    fillCredentials(registeredUser.email, registeredUser.password);
    submit();

    cy.get("[data-cy=logout-button]").click();
    cy.url().should("include", "/login");
  });
});
