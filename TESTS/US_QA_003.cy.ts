/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-003 — Modification de prono
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-003
 *
 * Critères d'acceptation
 *   - L'utilisateur peut modifier un prono existant
 *   - La modification est bien enregistrée
 *   - Les règles de modification sont respectées (si restrictions)
 *
 * Couvre aussi : sécurité (modification d'autrui), lockout pré-kickoff,
 * historique (audit), persistance.
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

interface ProneScores {
  home: number;
  away: number;
}

interface HistoryEntry {
  home: number;
  away: number;
  updatedAt: string;
  version: number;
  modifiedBy?: string;
  modifiedByEmail?: string;
  userId?: string;
}

describe("US-QA-003 - Modification de prono", () => {
  // ─── Données de référence ────────────────────────────────────────────────

  const registeredUser: User = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  // Second utilisateur — pour tester qu'on ne peut pas modifier
  // le prono d'autrui.
  const otherUser: User = {
    email: "other_user@example.com",
    password: "Password123!",
  };

  const seededMatch: SeedMatch = {
    id: "match_demo_1",
    home: "PSG",
    away: "OM",
  };

  // Match qui sera fermé pendant les tests pour vérifier la règle
  // "pas de modification après le coup d'envoi".
  const seededClosedMatch: SeedMatch = {
    id: "match_demo_closed",
    home: "OL",
    away: "ASM",
  };

  const initialProno: ProneScores = { home: 2, away: 1 };

  // Délai (en minutes) avant le coup d'envoi pendant lequel les pronos
  // sont verrouillés.
  const PRONO_LOCKOUT_MINUTES: number =
    (Cypress.env("PRONO_LOCKOUT_MINUTES") as number | undefined) ?? 5;

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * (Re)pose un prono pour l'utilisateur courant via l'API publique.
   * Idempotent : on supprime d'abord puis on recrée.
   */
  const setUserProno = (matchId: string, scores: ProneScores): void => {
    cy.request({
      method: "DELETE",
      url: `/api/pronos/${matchId}`,
      failOnStatusCode: false,
    });
    cy.request("POST", "/api/pronos", {
      matchId,
      home: scores.home,
      away: scores.away,
    });
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    cy.resetDb();
    cy.seedDb();
    cy.createUserViaTask(otherUser);
  });

  beforeEach(() => {
    cy.loginViaApi(registeredUser);
    setUserProno(seededMatch.id, initialProno);
    cy.visit("/pronos");
  });

  // ─── Critère : l'utilisateur peut modifier un prono existant ─────────────

  it("affiche un bouton 'Modifier' sur le prono existant", () => {
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .find("[data-cy=edit-prono]")
      .should("be.visible")
      .and("not.be.disabled");
  });

  it("pré-remplit le formulaire d'édition avec les valeurs existantes", () => {
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .find("[data-cy=edit-prono]")
      .click();

    cy.url().should("include", `/pronos/${seededMatch.id}/edit`);

    cy.get("[data-cy=match-select]")
      .should("have.value", seededMatch.id)
      .and("be.disabled");

    cy.get("[data-cy=score-home-input]").should(
      "have.value",
      String(initialProno.home)
    );
    cy.get("[data-cy=score-away-input]").should(
      "have.value",
      String(initialProno.away)
    );
  });

  // ─── Critère : la modification est bien enregistrée ──────────────────────

  it("Modification valide → enregistrée + message de confirmation", () => {
    cy.intercept("PUT", `/api/pronos/${seededMatch.id}`).as("updateProno");

    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("3");
    cy.get("[data-cy=score-away-input]").clear().type("0");
    cy.get("[data-cy=submit-prono]").click();

    cy.wait("@updateProno")
      .its("response.statusCode")
      .should("be.oneOf", [200, 204]);

    cy.get("[data-cy=prono-success]")
      .should("be.visible")
      .and("contain", "modifié");

    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .should("contain", "3 - 0")
      .and("not.contain", `${initialProno.home} - ${initialProno.away}`);
  });

  it("la modification persiste après rechargement de la page", () => {
    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("4");
    cy.get("[data-cy=score-away-input]").clear().type("2");
    cy.get("[data-cy=submit-prono]").click();
    cy.get("[data-cy=prono-success]").should("be.visible");

    cy.reload();
    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`).should(
      "contain",
      "4 - 2"
    );
  });

  it("la modification est visible depuis une nouvelle session", () => {
    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("5");
    cy.get("[data-cy=score-away-input]").clear().type("5");
    cy.get("[data-cy=submit-prono]").click();
    cy.get("[data-cy=prono-success]").should("be.visible");

    cy.clearCookies();
    cy.clearLocalStorage();
    Cypress.session.clearAllSavedSessions();
    cy.loginViaApi(registeredUser);
    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`).should(
      "contain",
      "5 - 5"
    );
  });

  it("Annuler n'enregistre pas les modifications", () => {
    cy.intercept("PUT", `/api/pronos/${seededMatch.id}`).as("updateProno");

    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("9");
    cy.get("[data-cy=score-away-input]").clear().type("9");
    cy.get("[data-cy=cancel-prono]").click();

    cy.get<Cypress.Interception[]>("@updateProno.all").should("have.length", 0);

    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .should("contain", `${initialProno.home} - ${initialProno.away}`)
      .and("not.contain", "9 - 9");
  });

  // ─── Critère : règles de modification respectées ─────────────────────────

  it("désactive (ou masque) la modification après le coup d'envoi", () => {
    cy.createPronoViaTask({
      userEmail: registeredUser.email,
      matchId: seededClosedMatch.id,
      home: 1,
      away: 1,
    });
    cy.setMatchStatus(seededClosedMatch.id, "closed");

    cy.visit("/pronos");

    cy.get(
      `[data-cy=prono-card][data-cy-match-id="${seededClosedMatch.id}"]`
    ).within(() => {
      cy.get<HTMLButtonElement>("[data-cy=edit-prono]").then(($btn) => {
        if ($btn.length === 0) {
          expect($btn).to.have.length(0);
        } else {
          cy.wrap($btn).should("be.disabled");
        }
      });
    });
  });

  it("rejette la modification forcée via API après le coup d'envoi", () => {
    cy.createPronoViaTask({
      userEmail: registeredUser.email,
      matchId: seededClosedMatch.id,
      home: 1,
      away: 1,
    });
    cy.setMatchStatus(seededClosedMatch.id, "closed");

    cy.request({
      method: "PUT",
      url: `/api/pronos/${seededClosedMatch.id}`,
      body: { home: 9, away: 0 },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 403, 409]);
    });

    cy.visit("/pronos");
    cy.get(
      `[data-cy=prono-card][data-cy-match-id="${seededClosedMatch.id}"]`
    )
      .should("contain", "1 - 1")
      .and("not.contain", "9");
  });

  it("désactive la modification dans la fenêtre de deadline avant kickoff", () => {
    const kickoffInLockout = new Date(
      Date.now() + Math.floor(PRONO_LOCKOUT_MINUTES / 2) * 60 * 1000
    );
    cy.setMatchKickoff(seededMatch.id, kickoffInLockout);

    cy.visit("/pronos");

    cy.get(
      `[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`
    ).within(() => {
      cy.get<HTMLButtonElement>("[data-cy=edit-prono]").then(($btn) => {
        if ($btn.length === 0) {
          expect($btn).to.have.length(0);
        } else {
          cy.wrap($btn).should("be.disabled");
        }
      });

      cy.get("[data-cy=prono-locked]").should("be.visible");
    });
  });

  it("rejette la modification forcée via API dans la fenêtre de deadline", () => {
    const kickoffInLockout = new Date(
      Date.now() + Math.floor(PRONO_LOCKOUT_MINUTES / 2) * 60 * 1000
    );
    cy.setMatchKickoff(seededMatch.id, kickoffInLockout);

    cy.request({
      method: "PUT",
      url: `/api/pronos/${seededMatch.id}`,
      body: { home: 9, away: 0 },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([400, 403, 409]);
      const body = resp.body as { code?: string } | undefined;
      if (body?.code) {
        expect(body.code).to.match(/lock|deadline|closed/i);
      }
    });

    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .should("contain", `${initialProno.home} - ${initialProno.away}`)
      .and("not.contain", "9 - 0");
  });

  it("autorise encore la modification juste avant la fenêtre de deadline", () => {
    const kickoffJustOutsideLockout = new Date(
      Date.now() + (PRONO_LOCKOUT_MINUTES + 1) * 60 * 1000
    );
    cy.setMatchKickoff(seededMatch.id, kickoffJustOutsideLockout);

    cy.intercept("PUT", `/api/pronos/${seededMatch.id}`).as("updateProno");

    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("3");
    cy.get("[data-cy=score-away-input]").clear().type("3");
    cy.get("[data-cy=submit-prono]").click();

    cy.wait("@updateProno")
      .its("response.statusCode")
      .should("be.oneOf", [200, 204]);

    cy.get("[data-cy=prono-success]").should("be.visible");
  });

  it("rejette la modification du prono d'un autre utilisateur", () => {
    cy.loginViaApi(otherUser);

    cy.request({
      method: "PUT",
      url: `/api/pronos/${seededMatch.id}`,
      body: { home: 99, away: 99 },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([403, 404]);
    });

    cy.loginViaApi(registeredUser);
    cy.visit("/pronos");
    cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
      .should("contain", `${initialProno.home} - ${initialProno.away}`)
      .and("not.contain", "99");
  });

  // ─── Validation : les règles de saisie de US-QA-002 s'appliquent ─────────

  it("rejette une modification avec un score négatif", () => {
    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear().type("-1");
    cy.get("[data-cy=submit-prono]").click();

    cy.get("[data-cy=score-home-error]")
      .should("be.visible")
      .and("contain", "positif");

    cy.get("[data-cy=prono-success]").should("not.exist");
  });

  it("rejette une modification avec un champ vide", () => {
    cy.intercept("PUT", `/api/pronos/${seededMatch.id}`).as("updateProno");

    cy.visit(`/pronos/${seededMatch.id}/edit`);
    cy.get("[data-cy=score-home-input]").clear();
    cy.get("[data-cy=submit-prono]").click();

    cy.get<Cypress.Interception[]>("@updateProno.all").should("have.length", 0);
    cy.get<HTMLInputElement>("[data-cy=score-home-input]").then(($el) => {
      expect($el[0].checkValidity()).to.be.false;
    });
  });

  // ─── Conservation de l'historique des modifications ──────────────────────

  describe("Historique", () => {
    const historyUrl = `/api/pronos/${seededMatch.id}/history`;

    it("crée une entrée d'historique à chaque modification", () => {
      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        expect(body).to.be.an("array").with.length(1);
        expect(body[0]).to.include({
          home: initialProno.home,
          away: initialProno.away,
        });
      });

      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        expect(body).to.have.length(2);
        expect(body[0]).to.include({ home: 3, away: 0 });
        expect(body[1]).to.include({
          home: initialProno.home,
          away: initialProno.away,
        });
      });

      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 1, away: 4 });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        expect(body).to.have.length(3);
        expect(body[0]).to.include({ home: 1, away: 4 });
        expect(body[1]).to.include({ home: 3, away: 0 });
        expect(body[2]).to.include({
          home: initialProno.home,
          away: initialProno.away,
        });
      });
    });

    it("incrémente le numéro de version à chaque modification", () => {
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 1, away: 4 });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        const versions = body.map((e) => e.version);
        for (let i = 0; i < versions.length - 1; i++) {
          expect(versions[i]).to.be.greaterThan(versions[i + 1]);
        }
        expect(versions[0]).to.equal(Math.max(...versions));
      });
    });

    it("horodate chaque entrée et garantit l'ordre chronologique", () => {
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });
      cy.wait(50);
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 1, away: 4 });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        const timestamps = body.map((e) => new Date(e.updatedAt).getTime());
        for (let i = 0; i < timestamps.length - 1; i++) {
          expect(timestamps[i]).to.be.greaterThan(timestamps[i + 1]);
        }
      });
    });

    it("identifie l'auteur de chaque modification (audit)", () => {
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        body.forEach((entry) => {
          expect(entry).to.satisfy(
            (e: HistoryEntry) =>
              !!(e.modifiedBy || e.modifiedByEmail || e.userId),
            "chaque entrée doit identifier son auteur"
          );
        });
      });
    });

    it("affiche l'historique dans l'UI", () => {
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 1, away: 4 });

      cy.visit("/pronos");
      cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
        .find("[data-cy=prono-history-toggle]")
        .click();

      cy.get("[data-cy=prono-history-entry]")
        .should("have.length", 3)
        .then(($entries) => {
          expect($entries.eq(0)).to.contain("1 - 4");
          expect($entries.eq(1)).to.contain("3 - 0");
          expect($entries.eq(2)).to.contain(
            `${initialProno.home} - ${initialProno.away}`
          );
        });
    });

    it("préserve l'historique même après verrouillage (kickoff passé)", () => {
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 3, away: 0 });
      cy.request("PUT", `/api/pronos/${seededMatch.id}`, { home: 1, away: 4 });

      cy.setMatchStatus(seededMatch.id, "closed");

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        expect(body).to.have.length(3);
      });

      cy.request({
        method: "PUT",
        url: `/api/pronos/${seededMatch.id}`,
        body: { home: 9, away: 9 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 403, 409]);
      });

      cy.request("GET", historyUrl).then((resp) => {
        const body = resp.body as HistoryEntry[];
        expect(body, "aucune nouvelle entrée après lockout").to.have.length(3);
        expect(body[0]).to.include({ home: 1, away: 4 });
      });
    });

    it("interdit la consultation de l'historique du prono d'un autre utilisateur", () => {
      cy.loginViaApi(otherUser);

      cy.request({
        method: "GET",
        url: historyUrl,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([403, 404]);
      });
    });
  });
});
