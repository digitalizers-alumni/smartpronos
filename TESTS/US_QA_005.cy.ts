/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-005 — Classement utilisateur
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-005
 *
 * Critères d'acceptation
 *   - Positions correctes (tri par points décroissants)
 *   - Ex-aequo gérés correctement
 *   - Mise à jour après calcul
 *   - Cohérence inter-utilisateurs
 */

interface CohortUser {
  email: string;
  password: string;
  points: number;
}

interface LeaderboardRow {
  email: string;
  points: number;
  rank?: number;
}

type LeaderboardBody = LeaderboardRow[] | { leaderboard: LeaderboardRow[] };

describe("US-QA-005 - Classement utilisateur", () => {
  // ─── Configuration ───────────────────────────────────────────────────────

  const registeredUser = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  // Cohorte avec totaux variés pour tester tri / ex-aequo / mise en évidence.
  const cohort: CohortUser[] = [
    { email: "alice@example.com",   password: "P!123456", points: 15 }, // rang 1
    { email: "bob@example.com",     password: "P!123456", points: 10 }, // rang 2 ex-aequo
    { email: "carol@example.com",   password: "P!123456", points: 10 }, // rang 2 ex-aequo
    { email: registeredUser.email,  password: registeredUser.password, points: 7 }, // rang 4
    { email: "dave@example.com",    password: "P!123456", points: 5 },  // rang 5
    { email: "eve@example.com",     password: "P!123456", points: 0 },  // rang 6
  ];

  // ─── Hooks ───────────────────────────────────────────────────────────────

  beforeEach(() => {
    cy.resetDb();
    cy.seedDb();

    cohort.forEach((u) => {
      if (u.email !== registeredUser.email) {
        cy.createUserViaTask({ email: u.email, password: u.password });
      }
      cy.setUserPoints(u.email, u.points);
    });

    cy.loginViaApi(registeredUser);
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getLeaderboard = (): Cypress.Chainable<LeaderboardBody> =>
    cy.request("GET", "/api/leaderboard").then((resp) => resp.body as LeaderboardBody);

  /** Normalise la réponse en tableau, qu'elle soit `[...]` ou `{ leaderboard: [...] }`. */
  const normalizeBoard = (body: LeaderboardBody): LeaderboardRow[] =>
    Array.isArray(body) ? body : body.leaderboard;

  // ─── Critère : positions correctes (tri par points décroissants) ─────────

  it("le classement est trié par points décroissants", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const points = board.map((row) => row.points);
      for (let i = 0; i < points.length - 1; i++) {
        expect(points[i]).to.be.at.least(
          points[i + 1],
          `rang ${i + 1} (${points[i]}) doit être ≥ rang ${i + 2} (${points[i + 1]})`
        );
      }
    });
  });

  it("l'utilisateur avec le plus de points est en rang 1", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const first = board[0];
      expect(first.email).to.equal("alice@example.com");
      expect(first.points).to.equal(15);
      if (first.rank !== undefined) {
        expect(first.rank).to.equal(1);
      }
    });
  });

  it("contient tous les utilisateurs de la cohorte", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const emails = board.map((r) => r.email);
      cohort.forEach((u) => {
        expect(
          emails,
          `${u.email} doit apparaître au classement`
        ).to.include(u.email);
      });
    });
  });

  // ─── Critère : ex-aequo gérés correctement ───────────────────────────────

  it("deux utilisateurs avec le même score ont le même rang", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const bob = board.find((r) => r.email === "bob@example.com");
      const carol = board.find((r) => r.email === "carol@example.com");

      expect(bob, "bob doit être dans le classement").to.exist;
      expect(carol, "carol doit être dans le classement").to.exist;

      const bobRow = bob as LeaderboardRow;
      const carolRow = carol as LeaderboardRow;
      expect(bobRow.points).to.equal(carolRow.points);

      if (bobRow.rank !== undefined && carolRow.rank !== undefined) {
        expect(bobRow.rank).to.equal(carolRow.rank, "ex-aequo → même rang");
      } else {
        const idxBob = board.findIndex((r) => r.email === "bob@example.com");
        const idxCarol = board.findIndex((r) => r.email === "carol@example.com");
        expect(Math.abs(idxBob - idxCarol)).to.equal(1);
      }
    });
  });

  it("le rang suivant des ex-aequo saute correctement (1, 2, 2, 4, …)", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const me = board.find((r) => r.email === registeredUser.email);
      expect(me, "registered_user doit être dans le classement").to.exist;
      const meRow = me as LeaderboardRow;

      if (meRow.rank !== undefined) {
        expect(meRow.rank).to.equal(4);
      } else {
        const idx = board.findIndex((r) => r.email === registeredUser.email);
        expect(idx).to.equal(3);
      }
    });
  });

  // ─── Critère : mise à jour après calcul ──────────────────────────────────

  it("le classement reflète les nouveaux points après un recalcul", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const idx = board.findIndex((r) => r.email === registeredUser.email);
      expect(idx).to.equal(3);
    });

    cy.setUserPoints(registeredUser.email, 17);

    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const first = board[0];
      expect(first.email).to.equal(registeredUser.email);
      expect(first.points).to.equal(17);
    });
  });

  it("le classement ne contient pas de cache obsolète (no-cache header ou versionning)", () => {
    cy.setUserPoints(registeredUser.email, 50);

    getLeaderboard();
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const me = board.find((r) => r.email === registeredUser.email);
      expect(me, "registered_user doit être dans le classement").to.exist;
      expect((me as LeaderboardRow).points).to.equal(50);
    });
  });

  // ─── Critère : cohérence inter-utilisateurs ──────────────────────────────

  it("le classement vu par 2 utilisateurs différents est identique", () => {
    let boardSeenByMe: Array<{ email: string; points: number }> = [];

    getLeaderboard().then((body) => {
      boardSeenByMe = normalizeBoard(body).map((r) => ({
        email: r.email,
        points: r.points,
      }));
    });

    cy.loginViaApi({ email: "alice@example.com", password: "P!123456" });

    getLeaderboard().then((body) => {
      const boardSeenByAlice = normalizeBoard(body).map((r) => ({
        email: r.email,
        points: r.points,
      }));
      expect(boardSeenByAlice).to.deep.equal(boardSeenByMe);
    });
  });

  it("les points dans le classement = les points dans /api/users/me/points", () => {
    cy.request("GET", "/api/users/me/points").then((meResp) => {
      const myTotal = (meResp.body as { total: number }).total;

      getLeaderboard().then((body) => {
        const board = normalizeBoard(body);
        const meInBoard = board.find((r) => r.email === registeredUser.email);
        expect(meInBoard, "registered_user doit être dans le classement").to.exist;
        expect((meInBoard as LeaderboardRow).points).to.equal(
          myTotal,
          "le total affiché dans le classement doit correspondre au total renvoyé par /me/points"
        );
      });
    });
  });

  // ─── Affichage UI ────────────────────────────────────────────────────────

  it("la page /leaderboard affiche le classement complet", () => {
    cy.visit("/leaderboard");

    cy.get("[data-cy=leaderboard-row]").should("have.length", cohort.length);

    cy.get("[data-cy=leaderboard-row]")
      .first()
      .should("contain", "alice@example.com")
      .and("contain", "15");
  });

  it("met en évidence l'utilisateur courant dans le classement", () => {
    cy.visit("/leaderboard");

    cy.get(`[data-cy=leaderboard-row][data-cy-current-user]`)
      .should("have.length", 1)
      .and("contain", registeredUser.email)
      .and("contain", "7");
  });

  it("affiche le rang de l'utilisateur courant en évidence (sticky/header)", () => {
    cy.visit("/leaderboard");

    cy.get("[data-cy=my-rank]")
      .should("be.visible")
      .and("contain", "4");
  });

  // ─── Cas limites ─────────────────────────────────────────────────────────

  it("un utilisateur à 0 point apparaît en dernier", () => {
    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const last = board[board.length - 1];
      expect(last.points).to.equal(0);
      expect(last.email).to.equal("eve@example.com");
    });
  });

  it("un nouvel inscrit apparaît dans le classement avec 0 point", () => {
    const newcomer = { email: "newcomer@example.com", password: "P!123456" };
    cy.createUserViaTask(newcomer);

    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const row = board.find((r) => r.email === newcomer.email);
      expect(row, "le nouvel inscrit doit apparaître au classement").to.exist;
      expect((row as LeaderboardRow).points).to.equal(0);
    });
  });

  it("la cardinalité du classement = nombre d'utilisateurs en DB", () => {
    cy.request("GET", "/api/users/count").then((countResp) => {
      const total = (countResp.body as { count: number }).count;

      getLeaderboard().then((body) => {
        const board = normalizeBoard(body);
        expect(board.length).to.equal(total);
      });
    });
  });

  // ─── Robustesse ──────────────────────────────────────────────────────────

  it("le classement reste cohérent après plusieurs modifications successives", () => {
    cy.setUserPoints("bob@example.com", 100);
    cy.setUserPoints("carol@example.com", 50);
    cy.setUserPoints("alice@example.com", 0);
    cy.setUserPoints(registeredUser.email, 25);

    getLeaderboard().then((body) => {
      const board = normalizeBoard(body);
      const points = board.map((r) => r.points);

      for (let i = 0; i < points.length - 1; i++) {
        expect(points[i]).to.be.at.least(points[i + 1]);
      }

      const findRow = (email: string): LeaderboardRow =>
        board.find((r) => r.email === email) as LeaderboardRow;

      expect(findRow("bob@example.com").points).to.equal(100);
      expect(findRow("carol@example.com").points).to.equal(50);
      expect(findRow("alice@example.com").points).to.equal(0);
      expect(findRow(registeredUser.email).points).to.equal(25);
    });
  });
});
