/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-004 — Calcul des points
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-004
 *
 * Critères d'acceptation
 *   - Score exact → points corrects
 *   - Score incorrect → logique respectée
 *   - Aucun prono → 0 point
 *   - Les règles de calcul sont cohérentes
 *
 * Barème (à confirmer côté PO) :
 *   exact = 5 pts, outcome (bon 1N2) = 2 pts, wrong = 0 pt, no-prono = 0 pt.
 */

interface User {
  email: string;
  password: string;
}

interface PointsConfig {
  exact: number;
  outcome: number;
  wrong: number;
}

interface ProneInput {
  home: number;
  away: number;
}

interface ResultInput {
  home: number;
  away: number;
}

interface ScoringCase {
  name: string;
  prono: { h: number; a: number };
  result: { h: number; a: number };
}

interface Scenario {
  prono?: ProneInput;
  result?: ResultInput;
}

interface BreakdownEntry {
  matchId: string;
  points: number;
}

interface PointsResponseBody {
  total: number;
  breakdown: BreakdownEntry[];
}

interface LeaderboardEntry {
  email: string;
  points: number;
  rank?: number;
}

describe("US-QA-004 - Calcul des points", () => {
  // ─── Configuration ───────────────────────────────────────────────────────

  const registeredUser: User = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  const POINTS: PointsConfig = {
    exact: (Cypress.env("POINTS_EXACT") as number | undefined) ?? 5,
    outcome: (Cypress.env("POINTS_OUTCOME") as number | undefined) ?? 2,
    wrong: 0,
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb();
    cy.loginViaApi(registeredUser);
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  let matchCounter = 0;
  const nextMatchId = (): string =>
    `m_scoring_${++matchCounter}_${Date.now()}`;

  /**
   * Met en place un scénario de scoring complet :
   *   - crée un match dédié
   *   - pose éventuellement un prono (via task, en bypass)
   *   - enregistre le résultat (déclenche le scoring côté back)
   * Retourne l'id du match créé.
   */
  const setupScenario = ({
    prono,
    result,
  }: Scenario): Cypress.Chainable<string> => {
    const matchId = nextMatchId();
    cy.createMatch({
      id: matchId,
      home: "Équipe A",
      away: "Équipe B",
      kickoff: new Date(Date.now() + 86400000),
    });

    if (prono) {
      cy.createPronoViaTask({
        userEmail: registeredUser.email,
        matchId,
        home: prono.home,
        away: prono.away,
      });
    }

    if (result) {
      cy.setMatchResult(matchId, result);
    }

    return cy.wrap(matchId);
  };

  /** Récupère les points obtenus par l'utilisateur courant sur UN match. */
  const getPointsForMatch = (matchId: string): Cypress.Chainable<number> =>
    cy
      .request("GET", "/api/users/me/points")
      .its("body.breakdown")
      .then((breakdown: BreakdownEntry[]) => {
        const entry = breakdown.find((b) => b.matchId === matchId);
        return entry ? entry.points : 0;
      });

  const getTotalPoints = (): Cypress.Chainable<number> =>
    cy.request("GET", "/api/users/me/points").its<number>("body.total");

  // ─── Critère : règles cohérentes (sanity check) ──────────────────────────

  it("Barème cohérent : exact (5) > outcome (2) > wrong (0)", () => {
    expect(POINTS.exact).to.equal(5);
    expect(POINTS.outcome).to.equal(2);
    expect(POINTS.wrong).to.equal(0);
    expect(POINTS.exact).to.be.greaterThan(POINTS.outcome);
    expect(POINTS.outcome).to.be.greaterThan(POINTS.wrong);
  });

  // ─── Critère : Score exact → points corrects ─────────────────────────────

  const exactCases: ScoringCase[] = [
    { name: "victoire à domicile 2-1", prono: { h: 2, a: 1 }, result: { h: 2, a: 1 } },
    { name: "victoire à l'extérieur 0-3", prono: { h: 0, a: 3 }, result: { h: 0, a: 3 } },
    { name: "match nul 1-1", prono: { h: 1, a: 1 }, result: { h: 1, a: 1 } },
    { name: "match nul 0-0", prono: { h: 0, a: 0 }, result: { h: 0, a: 0 } },
    { name: "score large 5-2", prono: { h: 5, a: 2 }, result: { h: 5, a: 2 } },
  ];

  exactCases.forEach(({ name, prono, result }) => {
    it(`Score exact (${name}) → ${POINTS.exact} pts`, () => {
      setupScenario({
        prono: { home: prono.h, away: prono.a },
        result: { home: result.h, away: result.a },
      }).then((matchId) => {
        getPointsForMatch(matchId).should("equal", POINTS.exact);
      });
    });
  });

  // ─── Critère : Bon résultat (1N2) → POINTS.outcome ───────────────────────

  const outcomeCases: ScoringCase[] = [
    { name: "victoire dom, même écart +1 (3-2 vs 2-1)", prono: { h: 3, a: 2 }, result: { h: 2, a: 1 } },
    { name: "victoire ext, même écart -2 (1-3 vs 0-2)", prono: { h: 1, a: 3 }, result: { h: 0, a: 2 } },
    { name: "nul 1-1 vs 2-2", prono: { h: 1, a: 1 }, result: { h: 2, a: 2 } },
    { name: "victoire dom, écart +1 vs +2 (1-0 vs 3-1)", prono: { h: 1, a: 0 }, result: { h: 3, a: 1 } },
    { name: "victoire ext, écart -1 vs -3 (0-1 vs 1-4)", prono: { h: 0, a: 1 }, result: { h: 1, a: 4 } },
  ];

  outcomeCases.forEach(({ name, prono, result }) => {
    it(`Bon résultat (${name}) → ${POINTS.outcome} pts`, () => {
      setupScenario({
        prono: { home: prono.h, away: prono.a },
        result: { home: result.h, away: result.a },
      }).then((matchId) => {
        getPointsForMatch(matchId).should("equal", POINTS.outcome);
      });
    });
  });

  // ─── Critère : Score incorrect (mauvais résultat) → 0 ────────────────────

  const wrongCases: ScoringCase[] = [
    { name: "prono victoire dom, réalité défaite", prono: { h: 3, a: 0 }, result: { h: 0, a: 1 } },
    { name: "prono nul, réalité victoire dom", prono: { h: 1, a: 1 }, result: { h: 2, a: 0 } },
    { name: "prono victoire ext, réalité nul", prono: { h: 0, a: 2 }, result: { h: 1, a: 1 } },
    { name: "prono victoire dom, réalité nul", prono: { h: 2, a: 0 }, result: { h: 1, a: 1 } },
  ];

  wrongCases.forEach(({ name, prono, result }) => {
    it(`Mauvais résultat (${name}) → 0 pt`, () => {
      setupScenario({
        prono: { home: prono.h, away: prono.a },
        result: { home: result.h, away: result.a },
      }).then((matchId) => {
        getPointsForMatch(matchId).should("equal", POINTS.wrong);
      });
    });
  });

  // ─── Critère : Aucun prono → 0 ───────────────────────────────────────────

  it("Aucun prono sur un match terminé → 0 pt", () => {
    setupScenario({
      result: { home: 2, away: 1 },
    }).then((matchId) => {
      getPointsForMatch(matchId).should("equal", 0);
    });
  });

  it("Prono posé mais match pas encore terminé → 0 pt (en attente)", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
    }).then((matchId) => {
      getPointsForMatch(matchId).should("equal", 0);
    });
  });

  // ─── Critère : règles cohérentes (cumul, recalcul, anti-triche) ──────────

  it("Cumul correct sur plusieurs matchs (5 + 2 + 0 = 7)", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 2, away: 1 },
    }); // exact → 5
    setupScenario({
      prono: { home: 1, away: 0 },
      result: { home: 3, away: 1 },
    }); // outcome → 2
    setupScenario({ result: { home: 0, away: 0 } }); // pas de prono → 0

    getTotalPoints().should("equal", POINTS.exact + POINTS.outcome);
  });

  it("Idempotent : recalculer le scoring ne double pas les points", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 2, away: 1 },
    }).then((matchId) => {
      getPointsForMatch(matchId).should("equal", POINTS.exact);

      cy.setMatchResult(matchId, { home: 2, away: 1 });

      getPointsForMatch(matchId).should("equal", POINTS.exact);
      getTotalPoints().should("equal", POINTS.exact);
    });
  });

  it("Recalcul cohérent quand le résultat officiel est corrigé", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 1, away: 1 }, // initialement nul → mauvais résultat
    }).then((matchId) => {
      getPointsForMatch(matchId).should("equal", POINTS.wrong);

      cy.setMatchResult(matchId, { home: 2, away: 1 }); // correction

      getPointsForMatch(matchId).should("equal", POINTS.exact);
    });
  });

  it("Un prono créé APRÈS le résultat officiel ne rapporte pas de points", () => {
    const matchId = nextMatchId();

    cy.createMatch({
      id: matchId,
      home: "A",
      away: "B",
      kickoff: new Date(Date.now() - 86400000),
    });
    cy.setMatchResult(matchId, { home: 2, away: 1 });

    cy.createPronoViaTask({
      userEmail: registeredUser.email,
      matchId,
      home: 2,
      away: 1,
    });

    getPointsForMatch(matchId).should("equal", 0);
  });

  // ─── Affichage UI ────────────────────────────────────────────────────────

  it("affiche le total de points sur le profil", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 2, away: 1 },
    });

    cy.visit("/profile");
    cy.get("[data-cy=user-total-points]")
      .should("be.visible")
      .and("contain", String(POINTS.exact));
  });

  it("affiche le détail des points par match dans le profil", () => {
    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 2, away: 1 },
    }).then((matchId) => {
      cy.visit("/profile");
      cy.get(`[data-cy=match-points][data-cy-match-id="${matchId}"]`)
        .should("be.visible")
        .and("contain", String(POINTS.exact));
    });
  });

  // ─── Classement (cohérence inter-utilisateurs) ───────────────────────────

  it("Classement : l'utilisateur avec le plus de points est en tête", () => {
    const otherUser: User = {
      email: "challenger@example.com",
      password: "Password123!",
    };
    cy.createUserViaTask(otherUser);

    setupScenario({
      prono: { home: 2, away: 1 },
      result: { home: 2, away: 1 },
    });

    cy.loginViaApi(otherUser);
    const matchId2 = nextMatchId();
    cy.createMatch({
      id: matchId2,
      home: "C",
      away: "D",
      kickoff: new Date(Date.now() + 86400000),
    });
    cy.createPronoViaTask({
      userEmail: otherUser.email,
      matchId: matchId2,
      home: 1,
      away: 0,
    });
    cy.setMatchResult(matchId2, { home: 3, away: 1 });

    cy.request("GET", "/api/leaderboard").then((resp) => {
      const board = resp.body as LeaderboardEntry[];
      const first = board[0];
      const second = board[1];
      expect(first.email).to.equal(registeredUser.email);
      expect(first.points).to.be.greaterThan(second.points);
    });
  });
});
