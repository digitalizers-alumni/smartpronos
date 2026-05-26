/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-009 — Fiabilité en condition de démo
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-009
 *
 * Cette suite simule le scénario de la démonstration finale. Elle DOIT
 * passer en vert sans intermittence avant chaque session de démo. Pour
 * coller au plus près des conditions réelles :
 *   - elle s'exécute sur plusieurs viewports (poste démo + projection)
 *   - elle simule un réseau dégradé (4G typique en salle de conf)
 *   - elle capture des screenshots à chaque étape clé (preuves d'audit)
 *   - elle interdit toute erreur console ou exception JS
 *
 * Recommandation : lancer ce spec en CI nocturne ET juste avant la démo,
 * sur un device réel via BrowserStack / Sauce Labs.
 */

interface DemoUser {
  email: string;
  password: string;
}

interface Competitor extends DemoUser {
  points: number;
}

interface DemoMatch {
  id: string;
  home: string;
  away: string;
}

interface DemoViewport {
  name: string;
  width: number;
  height: number;
}

interface NetworkProfile {
  name: string;
  apiDelay: number;
  jitterMax: number;
  failureRate: number;
}

describe("US-QA-009 - Fiabilité en condition de démo", () => {
  // ─── Configuration ───────────────────────────────────────────────────────

  const demoUser: DemoUser = {
    email: `demo_${Date.now()}@example.com`,
    password: "DemoPass123!",
  };

  const competitors: Competitor[] = [
    { email: "champion@demo.fr",   password: "P!demo01", points: 15 },
    { email: "challenger@demo.fr", password: "P!demo02", points: 8 },
    { email: "rookie@demo.fr",     password: "P!demo03", points: 2 },
  ];

  const seededMatch: DemoMatch = {
    id: "match_demo_1",
    home: "PSG",
    away: "OM",
  };

  const DEMO_VIEWPORTS: DemoViewport[] = [
    { name: "Laptop démo",   width: 1440, height: 900 },
    { name: "Projecteur HD", width: 1920, height: 1080 },
  ];

  // Profil réseau "salle de conférence en fin de journée" — 4G saturée.
  const NETWORK_PROFILE: NetworkProfile = {
    name: "4G dégradée",
    apiDelay: 300,
    jitterMax: 200,
    failureRate: 0,
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    cy.resetDb();
    cy.seedDb();

    competitors.forEach((c) => {
      cy.createUserViaTask({ email: c.email, password: c.password });
      cy.setUserPoints(c.email, c.points);
    });
  });

  beforeEach(() => {
    cy.intercept(/\/api\//, (req) => {
      const jitter = Math.random() * NETWORK_PROFILE.jitterMax;
      req.on("response", (res) => {
        res.setDelay(NETWORK_PROFILE.apiDelay + jitter);
      });
    });
  });

  // ─── Garde-fous globaux : zéro erreur tolérée ────────────────────────────

  const consoleErrors: string[] = [];
  const uncaughtExceptions: string[] = [];

  beforeEach(() => {
    consoleErrors.length = 0;
    uncaughtExceptions.length = 0;

    cy.on("uncaught:exception", (err) => {
      uncaughtExceptions.push(err.message);
      return false;
    });

    cy.on("window:before:load", (win) => {
      const originalError = win.console.error;
      win.console.error = (...args: unknown[]) => {
        consoleErrors.push(args.map((a) => String(a)).join(" "));
        originalError.apply(win.console, args as []);
      };
    });
  });

  const assertNoErrors = (): void => {
    cy.then(() => {
      expect(
        uncaughtExceptions,
        "exceptions JS pendant la démo"
      ).to.have.length(0);
      const realErrors = consoleErrors.filter(
        (e) =>
          !/React DevTools/.test(e) &&
          !/Download the React DevTools/.test(e) &&
          !/Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(e)
      );
      expect(realErrors, "erreurs console pendant la démo").to.have.length(0);
    });
  };

  // ─── Scénario de démo — exécuté sur chaque viewport ──────────────────────

  DEMO_VIEWPORTS.forEach((vp) => {
    it(`[${vp.name}] Scénario de démo complet — zéro défaut`, () => {
      cy.viewport(vp.width, vp.height);

      // ─── Étape 1 : Accueil ────────────────────────────────────────────
      cy.visit("/");
      cy.get("body").should("be.visible");
      cy.screenshot(`demo-${vp.name}-01-accueil`, { capture: "viewport" });

      // ─── Étape 2 : Inscription d'un nouveau participant ───────────────
      cy.get("[data-cy=signup-link]").click();
      cy.get("[data-cy=email-input]").type(demoUser.email, { delay: 30 });
      cy.get("[data-cy=password-input]").type(demoUser.password, { delay: 30 });
      cy.screenshot(`demo-${vp.name}-02-inscription-remplie`);
      cy.get("[data-cy=submit-button]").click();

      cy.get("[data-cy=welcome-message]", { timeout: 15000 }).should(
        "be.visible"
      );
      cy.screenshot(`demo-${vp.name}-03-bienvenue`);

      // ─── Étape 3 : Connexion (si nécessaire) ──────────────────────────
      cy.url().then((url) => {
        if (!url.includes("/dashboard")) {
          cy.clearCookies();
          cy.clearLocalStorage();
          cy.visit("/");
          cy.get("[data-cy=login-link]").click();
          cy.get("[data-cy=email-input]").type(demoUser.email, { delay: 30 });
          cy.get("[data-cy=password-input]").type(demoUser.password, {
            delay: 30,
          });
          cy.get("[data-cy=submit-button]").click();
        }
      });
      cy.url({ timeout: 10000 }).should("include", "/dashboard");
      cy.screenshot(`demo-${vp.name}-04-dashboard`);

      // ─── Étape 4 : Pronostic ──────────────────────────────────────────
      cy.visit("/pronos/new");
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("2", { delay: 100 });
      cy.get("[data-cy=score-away-input]").type("1", { delay: 100 });
      cy.screenshot(`demo-${vp.name}-05-prono-saisi`);
      cy.get("[data-cy=submit-prono]").click();

      cy.get("[data-cy=prono-success]", { timeout: 10000 }).should("be.visible");
      cy.screenshot(`demo-${vp.name}-06-prono-confirme`);

      // ─── Étape 5 : Le match se joue → résultat publié ─────────────────
      cy.setMatchResult(seededMatch.id, { home: 2, away: 1 });

      // ─── Étape 6 : Voir ses points ────────────────────────────────────
      cy.visit("/profile");
      cy.get("[data-cy=user-total-points]")
        .should("be.visible")
        .and("contain", "5");
      cy.screenshot(`demo-${vp.name}-07-profil-points`);

      // ─── Étape 7 : Voir le classement ─────────────────────────────────
      cy.visit("/leaderboard");
      cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 1);
      cy.get("[data-cy=leaderboard-row][data-cy-current-user]")
        .should("be.visible")
        .and("contain", demoUser.email);
      cy.screenshot(`demo-${vp.name}-08-classement`, { capture: "fullPage" });

      // ─── Étape 8 : Déconnexion propre ─────────────────────────────────
      cy.get("[data-cy=logout-button]").click();
      cy.url({ timeout: 5000 }).should("include", "/login");
      cy.screenshot(`demo-${vp.name}-09-deconnexion`);

      // ─── Vérification finale ──────────────────────────────────────────
      assertNoErrors();
    });
  });

  // ─── Sanity checks supplémentaires pour la démo ──────────────────────────

  it("aucune ressource ne dépasse 1.5 s à charger (réseau dégradé inclus)", () => {
    cy.visit("/");
    cy.window().then((win) => {
      const resources = win.performance.getEntriesByType(
        "resource"
      ) as PerformanceResourceTiming[];
      const slow = resources
        .filter((r) => r.duration > 1500)
        .map((r) => `${r.name} (${Math.round(r.duration)}ms)`);
      expect(slow, "ressources trop lentes en réseau dégradé").to.have.length(0);
    });
  });

  it("le classement reste lisible avec 50+ utilisateurs (stress visuel)", () => {
    Cypress._.times(50, (i: number) => {
      const email = `stress_${i}@demo.fr`;
      cy.createUserViaTask({ email, password: "P!stress01" });
      cy.setUserPoints(email, Math.floor(Math.random() * 30));
    });

    cy.viewport(1920, 1080);
    cy.visit("/leaderboard");

    cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 50);

    cy.scrollTo("bottom");
    cy.get("[data-cy=leaderboard-row]").last().should("be.visible");

    cy.screenshot("demo-classement-50-utilisateurs", { capture: "fullPage" });
  });

  it("aucune erreur 4xx/5xx sur les pages clés du parcours démo", () => {
    cy.loginViaApi(demoUser);
    const demoPages: string[] = [
      "/",
      "/login",
      "/signup",
      "/dashboard",
      "/pronos",
      "/pronos/new",
      "/leaderboard",
      "/profile",
    ];
    demoPages.forEach((page) => {
      cy.request({ url: page, failOnStatusCode: false }).then((resp) => {
        expect(resp.status, `${page} pendant la démo`).to.be.lessThan(400);
      });
    });
  });

  it("le scénario tient en moins de 60 secondes (timing démo réaliste)", () => {
    const t0 = Date.now();

    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get("[data-cy=login-link]").click();
    cy.get("[data-cy=email-input]").type(demoUser.email);
    cy.get("[data-cy=password-input]").type(demoUser.password);
    cy.get("[data-cy=submit-button]").click();
    cy.url({ timeout: 10000 }).should("include", "/dashboard");

    cy.visit("/leaderboard");
    cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 0);

    cy.then(() => {
      const elapsed = Date.now() - t0;
      expect(elapsed, "scénario démo trop long").to.be.lessThan(60000);
    });
  });
});
