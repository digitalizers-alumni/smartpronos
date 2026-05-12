/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-007 — Résilience aux actions utilisateur
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-007
 *
 * Couvre : multi-clics, refresh pendant action, données invalides (XSS,
 * SQL injection, payloads malformés), navigation rapide, robustesse réseau.
 */

interface User {
  email: string;
  password: string;
}

interface SeedMatch {
  id: string;
  home: string;
  away: string;
}

interface ProneRow {
  matchId: string;
  home: number;
  away: number;
}

declare global {
  interface Window {
    __xssTriggered?: boolean;
  }
}

describe("US-QA-007 - Résilience aux actions utilisateur", () => {
  // ─── Configuration ───────────────────────────────────────────────────────

  const registeredUser: User = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  const seededMatch: SeedMatch = {
    id: "match_demo_1",
    home: "PSG",
    away: "OM",
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    cy.resetDb();
    cy.seedDb();
  });

  beforeEach(() => {
    cy.loginViaApi(registeredUser);
    cy.request({
      method: "DELETE",
      url: `/api/pronos/${seededMatch.id}`,
      failOnStatusCode: false,
    });
  });

  // ─── Critère 1 : Multi-clics ─────────────────────────────────────────────

  describe("Multi-clics", () => {
    it("Multi-clic sur Valider → un seul prono créé", () => {
      cy.intercept("POST", "/api/pronos", (req) => {
        req.on("response", (res) => {
          res.setDelay(800);
        });
      }).as("createProno");

      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2");
      cy.get("[data-cy=score-away-input]").type("1");

      cy.get("[data-cy=submit-prono]").click().click().click().click().click();

      cy.get("[data-cy=submit-prono]").should("be.disabled");

      cy.wait("@createProno");

      cy.get<Cypress.Interception[]>("@createProno.all").should(
        "have.length",
        1
      );

      cy.request("GET", "/api/pronos").then((resp) => {
        const pronos = resp.body as ProneRow[];
        const pronosOnMatch = pronos.filter(
          (p) => p.matchId === seededMatch.id
        );
        expect(pronosOnMatch, "exactement 1 prono pour ce match").to.have.length(
          1
        );
      });
    });

    it("Multi-clic sur le bouton de connexion → un seul appel", () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      Cypress.session.clearAllSavedSessions();

      cy.intercept("POST", "/api/auth/login", (req) => {
        req.on("response", (res) => {
          res.setDelay(500);
        });
      }).as("login");

      cy.visit("/");
      cy.get("[data-cy=login-link]").click();
      cy.get("[data-cy=email-input]").type(registeredUser.email);
      cy.get("[data-cy=password-input]").type(registeredUser.password);

      cy.get("[data-cy=submit-button]").click().click().click();

      cy.wait("@login");
      cy.get<Cypress.Interception[]>("@login.all").should("have.length", 1);

      cy.url().should("include", "/dashboard");
    });

    it("Multi-clic sur le bouton 'Modifier' → ouvre 1 seule page d'édition", () => {
      cy.request("POST", "/api/pronos", {
        matchId: seededMatch.id,
        home: 2,
        away: 1,
      });

      cy.visit("/pronos");

      cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
        .find("[data-cy=edit-prono]")
        .click()
        .click()
        .click();

      cy.url().should("include", `/pronos/${seededMatch.id}/edit`);

      cy.go("back");
      cy.url().should("match", /\/pronos\/?$/);
    });

    it("Spam de clics sur le bouton de déconnexion → pas d'erreur, déconnecté", () => {
      cy.visit("/dashboard");

      cy.get("[data-cy=logout-button]")
        .click({ multiple: false })
        .then(($btn) => {
          if ($btn.length && Cypress.dom.isAttached($btn[0])) {
            cy.wrap($btn).click({ force: true });
            cy.wrap($btn).click({ force: true });
          }
        });

      cy.url().should("include", "/login");
    });
  });

  // ─── Critère 2 : Refresh pendant une action ──────────────────────────────

  describe("Refresh pendant une action", () => {
    it("Refresh pendant la création de prono → état cohérent (créé OU pas, jamais en double)", () => {
      cy.intercept("POST", "/api/pronos", (req) => {
        req.on("response", (res) => {
          res.setDelay(1500);
        });
      }).as("createProno");

      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2");
      cy.get("[data-cy=score-away-input]").type("1");
      cy.get("[data-cy=submit-prono]").click();

      cy.reload();

      cy.get("body").should("not.contain", "Error");
      cy.get("body").should("not.contain", "undefined");

      cy.request("GET", "/api/pronos").then((resp) => {
        const pronos = resp.body as ProneRow[];
        const count = pronos.filter((p) => p.matchId === seededMatch.id).length;
        expect(count, "0 ou 1 prono — jamais de doublon").to.be.oneOf([0, 1]);
      });
    });

    it("Refresh sur la page d'édition → données rechargées depuis le backend", () => {
      cy.request("POST", "/api/pronos", {
        matchId: seededMatch.id,
        home: 3,
        away: 0,
      });

      cy.visit(`/pronos/${seededMatch.id}/edit`);
      cy.get("[data-cy=score-home-input]").should("have.value", "3");

      cy.get("[data-cy=score-home-input]").clear().type("9");
      cy.reload();

      cy.get("[data-cy=score-home-input]").should("have.value", "3");
    });

    it("Refresh juste après la déconnexion → ne re-logge pas l'utilisateur", () => {
      cy.visit("/dashboard");
      cy.get("[data-cy=logout-button]").click();
      cy.url().should("include", "/login");

      cy.reload();

      cy.url().should("include", "/login");
      cy.request({ url: "/api/auth/me", failOnStatusCode: false })
        .its("status")
        .should("not.equal", 200);
    });
  });

  // ─── Critère 3 : Données invalides ───────────────────────────────────────

  describe("Données invalides", () => {
    it("XSS dans le champ email d'inscription → texte échappé à l'affichage", () => {
      const xssPayload = `<img src=x onerror="window.__xssTriggered=true">`;
      const safeEmail = `xss_${Date.now()}@example.com`;

      cy.clearCookies();
      cy.clearLocalStorage();
      Cypress.session.clearAllSavedSessions();

      cy.visit("/");
      cy.get("[data-cy=signup-link]").click();

      cy.get("[data-cy=email-input]").invoke("val", `${xssPayload}${safeEmail}`);
      cy.get("[data-cy=email-input]").trigger("input");
      cy.get("[data-cy=password-input]").type("Password123!");
      cy.get("[data-cy=submit-button]").click();

      cy.window().its("__xssTriggered").should("be.undefined");

      cy.get("body").then(($body) => {
        expect(
          $body.html(),
          "le payload XSS ne doit pas figurer en HTML brut"
        ).to.not.include(`<img src=x onerror=`);
      });
    });

    it("SQL injection dans l'email de login → traité comme texte (pas d'effet de bord)", () => {
      const sqlPayload = `' OR '1'='1`;

      cy.request({
        method: "POST",
        url: "/api/auth/login",
        body: { email: sqlPayload, password: "anything" },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status, "pas de bypass via SQL injection").to.not.equal(200);
        expect(resp.status, "pas de 500 — payload géré proprement").to.be.oneOf(
          [400, 401, 422]
        );
      });
    });

    it("Score absurdement grand → rejeté avec 400 (pas 500)", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: seededMatch.id, home: 999999999, away: 0 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });

    it("Score négatif via API → rejeté avec 400 (pas 500)", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: seededMatch.id, home: -1, away: 0 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });

    it("Types incorrects (string au lieu de number) → 400", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: seededMatch.id, home: "deux", away: "un" },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });

    it("Payload incomplet (champ manquant) → 400, pas 500", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: seededMatch.id },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 422]);
      });
    });

    it("JSON malformé → 400, pas 500", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: "{not valid json}",
        headers: { "Content-Type": "application/json" },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 415]);
      });
    });

    it("matchId inexistant → 404, pas 500", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: "match_inexistant_xyz", home: 1, away: 0 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404, 422]);
      });
    });

    it("Caractères unicode / emoji dans l'email → géré sans crash", () => {
      const newcomer: User = {
        email: `tëst_üñîçødé_🚀_${Date.now()}@example.com`,
        password: "Password123!",
      };

      cy.request({
        method: "POST",
        url: "/api/auth/signup",
        body: newcomer,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.not.equal(500);
        expect(resp.status).to.be.oneOf([200, 201, 400, 422]);
      });
    });

    it("Header Content-Type manquant → traité proprement", () => {
      cy.request({
        method: "POST",
        url: "/api/pronos",
        body: { matchId: seededMatch.id, home: 1, away: 1 },
        headers: { "Content-Type": "" },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.not.equal(500);
      });
    });
  });

  // ─── Critère 4 : Navigation rapide ───────────────────────────────────────

  describe("Navigation rapide", () => {
    it("Navigation rapide entre pages → pas d'erreur JS, pas de crash", () => {
      const failures: string[] = [];
      cy.on("uncaught:exception", (err) => {
        failures.push(err.message);
        return false;
      });

      cy.visit("/dashboard");
      cy.visit("/pronos");
      cy.visit("/leaderboard");
      cy.visit("/profile");
      cy.visit("/pronos/new");
      cy.visit("/leaderboard");
      cy.visit("/dashboard");

      cy.then(() => {
        expect(
          failures,
          "aucune exception JS pendant la navigation rapide"
        ).to.have.length(0);
      });
    });

    it("Boutons Back / Forward rapides → état cohérent", () => {
      cy.visit("/dashboard");
      cy.visit("/pronos");
      cy.visit("/leaderboard");

      cy.go("back"); // → /pronos
      cy.go("back"); // → /dashboard
      cy.go("forward"); // → /pronos
      cy.go("forward"); // → /leaderboard

      cy.url().should("include", "/leaderboard");

      cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 0);
    });

    it("Spam de cy.visit() pendant le chargement → la dernière URL gagne", () => {
      cy.visit("/dashboard");
      cy.visit("/pronos");
      cy.visit("/leaderboard");
      cy.visit("/profile");

      cy.url().should("include", "/profile");
      cy.get("[data-cy=user-total-points]").should("be.visible");
    });

    it("Navigation pendant une requête en cours → pas de fuite mémoire / erreur", () => {
      cy.intercept("GET", "/api/leaderboard", (req) => {
        req.on("response", (res) => res.setDelay(2000));
      }).as("slowBoard");

      const failures: string[] = [];
      cy.on("uncaught:exception", (err) => {
        failures.push(err.message);
        return false;
      });

      cy.visit("/leaderboard");
      cy.visit("/dashboard");

      cy.then(() => {
        expect(
          failures,
          "pas d'erreur 'setState on unmounted component' ou similaire"
        ).to.have.length(0);
      });
    });
  });

  // ─── Robustesse réseau (bonus) ───────────────────────────────────────────

  describe("Robustesse réseau", () => {
    it("500 sur la création de prono → message d'erreur, pas de crash", () => {
      cy.intercept("POST", "/api/pronos", { statusCode: 500, body: {} }).as(
        "fail"
      );

      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2");
      cy.get("[data-cy=score-away-input]").type("1");
      cy.get("[data-cy=submit-prono]").click();

      cy.wait("@fail");

      cy.get("[data-cy=prono-error], [data-cy=error-message]")
        .should("be.visible")
        .and("contain.text", "erreur");

      cy.get("[data-cy=submit-prono]").should("not.be.disabled");
    });

    it("Timeout réseau → message d'erreur après délai raisonnable", () => {
      cy.intercept("POST", "/api/pronos", (req) => {
        req.on("response", (res) => res.setDelay(30000));
      }).as("timeout");

      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2");
      cy.get("[data-cy=score-away-input]").type("1");
      cy.get("[data-cy=submit-prono]").click();

      cy.get("[data-cy=prono-error], [data-cy=error-message]", {
        timeout: 20000,
      }).should("be.visible");
    });

    it("401 silencieux pendant une action → redirige vers login", () => {
      cy.intercept("POST", "/api/pronos", { statusCode: 401, body: {} }).as(
        "unauth"
      );

      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2");
      cy.get("[data-cy=score-away-input]").type("1");
      cy.get("[data-cy=submit-prono]").click();

      cy.wait("@unauth");

      cy.url({ timeout: 5000 }).should("include", "/login");
    });
  });
});

export {};
