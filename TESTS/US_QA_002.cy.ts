/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-002 — Création de prono
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-002
 *
 * User Story
 *   En tant qu'utilisateur, je veux saisir et enregistrer un prono
 *   afin de participer au jeu.
 *
 * Critères d'acceptation
 *   1. L'utilisateur peut sélectionner un match
 *   2. L'utilisateur peut saisir un score
 *   3. Le prono est bien enregistré après validation
 *   4. Un message de confirmation est affiché
 *   5. Impossible d'envoyer un prono vide
 *   6. Les valeurs invalides sont bloquées ou gérées
 *
 * Priorité : 🔴 Critique
 *
 * Hypothèses front (à respecter côté Angular) :
 *   - Route protégée   : /pronos/new        (formulaire de création)
 *   - Route liste      : /pronos            (liste des pronos de l'utilisateur)
 *   - Sélecteurs data-cy :
 *       match-select          : <select> des matchs ouverts
 *       score-home-input      : <input type="number"> score domicile
 *       score-away-input      : <input type="number"> score extérieur
 *       submit-prono          : <button type="submit">
 *       prono-success         : message de confirmation après save
 *       prono-error           : message d'erreur global de soumission
 *       score-home-error      : message d'erreur sous l'input domicile
 *       score-away-error      : message d'erreur sous l'input extérieur
 *       match-select-error    : message d'erreur sous le <select>
 *       prono-card            : carte d'un prono dans /pronos
 *       (attribut data-cy-match-id="..." pour relier card ↔ match)
 *   - API :
 *       POST  /api/pronos            (création)
 *       PUT   /api/pronos/:id        (mise à jour)
 */

// ─── Types locaux ──────────────────────────────────────────────────────────

interface RegisteredUser {
  email: string;
  password: string;
}

interface SeedMatch {
  id: string;
  home: string;
  away: string;
}

type ScoreInput = number | string | null | undefined;

// ─── Spec ──────────────────────────────────────────────────────────────────

describe("US-QA-002 - Création de prono", () => {
  // Utilisateur inséré par cy.seedDb() (voir cypress/plugins/db.js).
  const registeredUser: RegisteredUser = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  // Match de démo ouvert au prono (status="open", kickoff > now).
  const seededMatch: SeedMatch = {
    id: "match_demo_1",
    home: "PSG",
    away: "OM",
  };

  // Match dont le coup d'envoi est déjà passé (status="closed" / kickoff < now).
  // Sert à vérifier qu'on ne peut pas pronostiquer un match commencé.
  const seededClosedMatch: SeedMatch = {
    id: "match_demo_closed",
    home: "OL",
    away: "ASM",
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    // DB propre + seed (registered_user + 2 matchs) une seule fois par spec.
    // cy.session() mémorisera ensuite la connexion d'un test à l'autre.
    cy.resetDb();
    cy.seedDb();
  });

  beforeEach(() => {
    // Connexion programmatique : on ne re-teste pas le login ici,
    // on a juste besoin d'un user authentifié pour accéder à /pronos.
    cy.loginViaApi(registeredUser);
    cy.visit("/pronos/new");
  });

  // ─── Helpers UI ──────────────────────────────────────────────────────────

  const selectMatch = (matchId: string): Cypress.Chainable<JQuery<HTMLSelectElement>> =>
    cy.get<HTMLSelectElement>("[data-cy=match-select]").select(matchId);

  const setScore = (home: ScoreInput, away: ScoreInput): void => {
    if (home !== undefined && home !== null && home !== "") {
      cy.get("[data-cy=score-home-input]").clear().type(String(home));
    }
    if (away !== undefined && away !== null && away !== "") {
      cy.get("[data-cy=score-away-input]").clear().type(String(away));
    }
  };

  const submit = (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.get("[data-cy=submit-prono]").click();

  // ─── Critère 1 — sélection d'un match ────────────────────────────────────

  describe("Critère 1 — L'utilisateur peut sélectionner un match", () => {
    it("affiche les matchs disponibles dans le sélecteur", () => {
      cy.get("[data-cy=match-select] option")
        .should("have.length.greaterThan", 1) // 1 placeholder + ≥ 1 match
        .and("contain", `${seededMatch.home} - ${seededMatch.away}`);
    });

    it("permet de sélectionner un match ouvert", () => {
      selectMatch(seededMatch.id);
      cy.get("[data-cy=match-select]").should("have.value", seededMatch.id);
    });
  });

  // ─── Critères 2 + 3 + 4 — saisie + enregistrement + confirmation ─────────

  describe("Critères 2-3-4 — Saisie, enregistrement, confirmation", () => {
    it("enregistre un prono avec un score valide et affiche la confirmation", () => {
      // On observe la requête réseau pour s'assurer que le prono est bien
      // persisté côté backend, indépendamment de l'UI.
      cy.intercept("POST", "/api/pronos").as("createProno");

      selectMatch(seededMatch.id);
      setScore(2, 1);
      submit();

      // (3) prono persisté côté backend
      cy.wait("@createProno")
        .its("response.statusCode")
        .should("be.oneOf", [200, 201]);

      // (4) message de confirmation visible
      cy.get("[data-cy=prono-success]")
        .should("be.visible")
        .and("contain", "enregistré");

      // (3 bis) le prono apparaît dans la liste des pronos de l'utilisateur.
      cy.visit("/pronos");
      cy.get(
        `[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`
      )
        .should("be.visible")
        .and("contain", "2 - 1");
    });

    it("envoie bien le payload attendu au backend", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");

      selectMatch(seededMatch.id);
      setScore(3, 2);
      submit();

      cy.wait("@createProno").then((interception) => {
        expect(interception.request.body).to.deep.include({
          matchId: seededMatch.id,
          home: 3,
          away: 2,
        });
      });
    });
  });

  // ─── Critère 5 — impossible d'envoyer un prono vide ──────────────────────

  describe("Critère 5 — Impossible d'envoyer un prono vide", () => {
    it("bloque la soumission si aucun match n'est sélectionné", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");

      setScore(1, 0);
      submit();

      // La requête ne doit PAS partir (validation côté client).
      cy.get<Cypress.Interception[]>("@createProno.all").should(
        "have.length",
        0
      );

      // Validation HTML5 native sur le <select required>.
      cy.get<HTMLSelectElement>("[data-cy=match-select]").then(($el) => {
        expect($el[0].checkValidity()).to.be.false;
        expect($el[0].validationMessage).to.not.be.empty;
      });
    });

    it("bloque la soumission si les scores sont vides", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");

      selectMatch(seededMatch.id);
      submit();

      cy.get<Cypress.Interception[]>("@createProno.all").should(
        "have.length",
        0
      );

      cy.get<HTMLInputElement>("[data-cy=score-home-input]").then(($el) => {
        expect($el[0].checkValidity()).to.be.false;
      });
      cy.get<HTMLInputElement>("[data-cy=score-away-input]").then(($el) => {
        expect($el[0].checkValidity()).to.be.false;
      });
    });

    it("bloque la soumission si seul le score domicile est saisi", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");

      selectMatch(seededMatch.id);
      setScore(2, null); // score away laissé vide
      submit();

      cy.get<Cypress.Interception[]>("@createProno.all").should(
        "have.length",
        0
      );

      cy.get("[data-cy=prono-success]").should("not.exist");
    });
  });

  // ─── Critère 6 — valeurs invalides bloquées ──────────────────────────────

  describe("Critère 6 — Les valeurs invalides sont bloquées ou gérées", () => {
    it("rejette les scores négatifs", () => {
      selectMatch(seededMatch.id);
      setScore(-1, 2);
      submit();

      cy.get("[data-cy=score-home-error]")
        .should("be.visible")
        .and("contain", "doit être positif");

      cy.get("[data-cy=prono-success]").should("not.exist");
    });

    it("rejette les scores non numériques (lettres filtrées par <input type=number>)", () => {
      selectMatch(seededMatch.id);

      // L'input filtre les lettres → valeur reste vide.
      cy.get("[data-cy=score-home-input]").clear().type("abc");
      cy.get("[data-cy=score-home-input]").should("have.value", "");

      cy.get("[data-cy=score-away-input]").clear().type("1");
      submit();

      // La soumission ne doit pas réussir tant que home est vide.
      cy.get("[data-cy=prono-success]").should("not.exist");
    });

    it("rejette les scores au-delà de la limite raisonnable", () => {
      selectMatch(seededMatch.id);
      setScore(999, 0);
      submit();

      cy.get("[data-cy=score-home-error]")
        .should("be.visible")
        .and("contain", "trop élevé");

      cy.get("[data-cy=prono-success]").should("not.exist");
    });

    it("rejette les scores décimaux", () => {
      selectMatch(seededMatch.id);
      setScore("2.5", 1);
      submit();

      cy.get("[data-cy=score-home-error]")
        .should("be.visible")
        .and("contain", "entier");

      cy.get("[data-cy=prono-success]").should("not.exist");
    });
  });

  // ─── Bonus — anti-bypass match déjà démarré ──────────────────────────────
  //
  // Pas un critère explicite mais découle de "valeurs invalides bloquées" :
  // un prono sur un match déjà commencé est invalide.

  describe("Bonus — Pas de prono sur un match déjà démarré", () => {
    it("ne propose pas (ou grise) le match déjà démarré dans le sélecteur", () => {
      cy.get("[data-cy=match-select]").within(() => {
        // Deux UX acceptables :
        //   1. Le match est filtré du <select> → option absente
        //   2. Le match est présent mais désactivé (option[disabled])
        cy.get<HTMLOptionElement>(
          `option[value="${seededClosedMatch.id}"]`
        ).then(($opt) => {
          if ($opt.length === 0) {
            expect($opt).to.have.length(0); // Cas 1
          } else {
            cy.wrap($opt).should("be.disabled"); // Cas 2
          }
        });
      });
    });

    it("rejette le prono si l'utilisateur force la soumission sur un match démarré", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");

      // On force la valeur du select même si l'option est disabled/absente,
      // pour simuler un bypass côté client (DevTools / requête forgée).
      cy.get<HTMLSelectElement>("[data-cy=match-select]").then(($select) => {
        const select = $select[0];
        if (
          !select.querySelector(`option[value="${seededClosedMatch.id}"]`)
        ) {
          const opt = document.createElement("option");
          opt.value = seededClosedMatch.id;
          select.appendChild(opt);
        }
        select.value = seededClosedMatch.id;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });

      setScore(1, 0);
      submit();

      // Deux comportements acceptables :
      //   - La requête est bloquée côté client → aucun POST
      //   - La requête part mais le backend renvoie 400/403/409
      cy.get<Cypress.Interception[]>("@createProno.all").then((calls) => {
        if (calls.length === 0) {
          cy.get(
            "[data-cy=prono-error], [data-cy=match-select-error]"
          )
            .should("be.visible")
            .and("contain.text", "démarré");
        } else {
          cy.wrap(calls[0])
            .its("response.statusCode")
            .should("be.oneOf", [400, 403, 409]);

          cy.get("[data-cy=prono-error]")
            .should("be.visible")
            .and("contain.text", "démarré");
        }
      });

      cy.get("[data-cy=prono-success]").should("not.exist");
    });
  });

  // ─── Bonus — mise à jour d'un prono existant ─────────────────────────────
  //
  // Pas dans les critères d'acceptation mais cas fréquent : si l'utilisateur
  // a déjà pronostiqué ce match, la soumission doit UPDATE (pas INSERT
  // en doublon).

  describe("Bonus — Mise à jour d'un prono existant", () => {
    it("upsert le prono si l'utilisateur en a déjà saisi un pour ce match", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");
      cy.intercept("PUT", "/api/pronos/*").as("updateProno");

      // 1er prono : 2-1
      selectMatch(seededMatch.id);
      setScore(2, 1);
      submit();
      cy.wait("@createProno");

      // 2e tentative : 3-0 pour le même match
      cy.visit("/pronos/new");
      selectMatch(seededMatch.id);
      setScore(3, 0);
      submit();

      // Soit une 2e POST qui upsert (200), soit un PUT — les deux acceptables.
      cy.wait("@updateProno", { timeout: 5000 }).then((interception) => {
        if (interception?.response) {
          expect(interception.response.statusCode).to.be.oneOf([200, 204]);
        }
      });

      // Vérification finale : c'est bien le dernier score qui est mémorisé,
      // sans doublon dans la liste.
      cy.visit("/pronos");
      cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`)
        .should("have.length", 1)
        .and("be.visible")
        .and("contain", "3 - 0")
        .and("not.contain", "2 - 1");
    });
  });
});
