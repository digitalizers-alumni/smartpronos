/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-006 — Parcours utilisateur complet (smoke E2E)
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-006
 *
 * Objectif : prouver qu'un humain peut aller du début à la fin
 * SANS interruption. Volontairement monolithique — on ne fragmente
 * pas un parcours utilisateur sans perdre sa signification.
 */

interface SmokeUser {
  email: string;
  password: string;
}

interface SeedMatch {
  id: string;
  home: string;
  away: string;
}

describe("US-QA-006 - Parcours utilisateur complet (smoke E2E)", () => {
  // ─── Données ────────────────────────────────────────────────────────────

  // Utilisateur entièrement nouveau pour ce parcours.
  // Email unique par run pour rester idempotent.
  const newUser: SmokeUser = {
    email: `e2e_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}@example.com`,
    password: "Password123!",
  };

  const seededMatch: SeedMatch = {
    id: "match_demo_1",
    home: "PSG",
    away: "OM",
  };

  // ─── Hook : DB propre pour partir du strict minimum ─────────────────────

  before(() => {
    cy.resetDb();
    cy.seedDb();
  });

  // ─── Le parcours en UN SEUL test ────────────────────────────────────────

  it("Inscription → connexion → prono → points → classement → déconnexion", () => {
    const failures: string[] = [];
    cy.on("uncaught:exception", (err) => {
      failures.push(err.message);
      return false;
    });

    // ─── 1. Créer un compte ────────────────────────────────────────────
    cy.log("**Étape 1/6 — Inscription**");
    cy.visit("/");
    cy.get("[data-cy=signup-link]").click();
    cy.get("[data-cy=email-input]").type(newUser.email);
    cy.get("[data-cy=password-input]").type(newUser.password);
    cy.get("[data-cy=submit-button]").click();

    cy.get("[data-cy=welcome-message]", { timeout: 10000 }).should("be.visible");

    // ─── 2. Se connecter (si l'inscription ne logge pas automatiquement) ───
    cy.log("**Étape 2/6 — Connexion**");
    cy.url().then((url) => {
      if (!url.includes("/dashboard")) {
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit("/");
        cy.get("[data-cy=login-link]").click();
        cy.get("[data-cy=email-input]").type(newUser.email);
        cy.get("[data-cy=password-input]").type(newUser.password);
        cy.get("[data-cy=submit-button]").click();
      }
    });
    cy.url({ timeout: 10000 }).should("include", "/dashboard");

    // ─── 3. Faire un prono ─────────────────────────────────────────────
    cy.log("**Étape 3/6 — Création du prono**");
    cy.visit("/pronos/new");
    cy.get("[data-cy=match-select]").select(seededMatch.id);
    cy.get("[data-cy=score-home-input]").type("2");
    cy.get("[data-cy=score-away-input]").type("1");
    cy.get("[data-cy=submit-prono]").click();

    cy.get("[data-cy=prono-success]", { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", "enregistré");

    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .should("be.visible")
      .and("contain", "2 - 1");

    // ─── 4. Voir ses points (après simulation du résultat) ─────────────
    cy.log("**Étape 4/6 — Voir ses points**");
    cy.setMatchResult(seededMatch.id, { home: 2, away: 1 });

    cy.visit("/profile");
    cy.get("[data-cy=user-total-points]", { timeout: 5000 })
      .should("be.visible")
      .and("contain", "5"); // 5 pts pour un score exact

    cy.get(`[data-cy=match-points][data-cy-match-id="${seededMatch.id}"]`).should(
      "contain",
      "5"
    );

    // ─── 5. Voir le classement ─────────────────────────────────────────
    cy.log("**Étape 5/6 — Classement**");
    cy.visit("/leaderboard");
    cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 0);
    cy.get("[data-cy=leaderboard-row][data-cy-current-user]")
      .should("be.visible")
      .and("contain", newUser.email)
      .and("contain", "5");

    // ─── 6. Déconnexion ────────────────────────────────────────────────
    cy.log("**Étape 6/6 — Déconnexion**");
    cy.get("[data-cy=logout-button]").click();
    cy.url({ timeout: 5000 }).should("include", "/login");

    // ─── Vérification finale : aucune erreur JS pendant le parcours ────
    cy.then(() => {
      expect(failures, "le parcours doit être sans erreur JS").to.have.length(0);
    });
  });

  // ─── Test secondaire : aucun écran 4xx/5xx visible ───────────────────────

  it("aucune page du parcours ne renvoie 4xx/5xx", () => {
    const pagesToCheck: string[] = [
      "/",
      "/login",
      "/signup",
      "/dashboard",
      "/pronos",
      "/pronos/new",
      "/leaderboard",
      "/profile",
    ];

    cy.loginViaApi({ email: newUser.email, password: newUser.password });

    pagesToCheck.forEach((path) => {
      cy.request({ url: path, failOnStatusCode: false }).then((resp) => {
        expect(resp.status, `GET ${path}`).to.be.lessThan(400);
      });
    });
  });
});
