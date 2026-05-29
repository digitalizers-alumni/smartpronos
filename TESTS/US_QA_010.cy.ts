/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-010 — Alignement avec le prototype final
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-010
 * Design system : CONTEXT/04_design_system.md
 *
 * Stack cible : Angular (PWA) + API backend / Supabase (auth JWT ou cookie).
 *
 * Ce spec vérifie automatiquement ce qui peut l'être sans Figma :
 *   - inventaire des écrans MVP (routes + ancres data-cy du prototype)
 *   - navigation principale (ordre, libellés, routes)
 *   - composants clés visibles aux bons endroits
 *   - tokens du design system (couleurs, zones tactiles)
 *   - états UI (vide, succès, verrouillé, terminé)
 *   - captures viewport pour régression visuelle manuelle / Percy
 *
 * Prérequis identiques aux autres specs : NODE_ENV=test, routes /__test__/*,
 * data-cy sur les composants Angular, CYPRESS_BASE_URL pointant vers l'app.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface User {
  email: string;
  password: string;
}

interface Viewport {
  name: string;
  width: number;
  height: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface DesignToken {
  name: string;
  hex: string;
  /** Sélecteur dont la couleur de fond ou de texte doit correspondre au token */
  selector: string;
  property: "background-color" | "color";
  tolerance?: number;
}

interface ScreenDefinition {
  id: string;
  route: string;
  /** Ancres data-cy obligatoires (contrat prototype ↔ Angular) */
  anchors: string[];
  requiresAuth?: boolean;
  screenshotName?: string;
}

interface NavItem {
  dataCy: string;
  route: string;
}

// ─── Design system (04_design_system.md) ───────────────────────────────────

const DESIGN_TOKENS: DesignToken[] = [
  {
    name: "Background",
    hex: "#0F172A",
    selector: "body",
    property: "background-color",
    tolerance: 18,
  },
  {
    name: "Text Primary",
    hex: "#F8FAFC",
    selector: "body",
    property: "color",
    tolerance: 18,
  },
];

const MIN_TOUCH_TARGET_PX = 44;
const SPACING_TOLERANCE_PX = 4;

const PROTOTYPE_VIEWPORTS: Viewport[] = [
  { name: "mobile-narrow", width: 375, height: 667 },
  { name: "mobile-large", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 720 },
];

const registeredUser: User = {
  email: "registered_user@example.com",
  password: "Password123!",
};

const seededMatch = {
  id: "match_demo_1",
  home: "PSG",
  away: "OM",
};

/** Écrans MVP mappés au prototype final (US-QA-010) */
const MVP_SCREENS: ScreenDefinition[] = [
  {
    id: "auth-login",
    route: "/login",
    anchors: ["email-input", "password-input", "submit-button", "signup-link"],
    screenshotName: "login",
  },
  {
    id: "auth-signup",
    route: "/signup",
    anchors: ["email-input", "password-input", "submit-button", "login-link"],
    screenshotName: "signup",
  },
  {
    id: "home-matches",
    route: "/dashboard",
    anchors: ["main-nav", "match-card"],
    requiresAuth: true,
    screenshotName: "dashboard",
  },
  {
    id: "pronos-list",
    route: "/pronos",
    anchors: ["main-nav"],
    requiresAuth: true,
    screenshotName: "pronos-list",
  },
  {
    id: "prono-create",
    route: "/pronos/new",
    anchors: [
      "match-select",
      "score-home-input",
      "score-away-input",
      "submit-prono",
    ],
    requiresAuth: true,
    screenshotName: "prono-new",
  },
  {
    id: "leaderboard",
    route: "/leaderboard",
    anchors: ["main-nav", "leaderboard-row", "my-rank"],
    requiresAuth: true,
    screenshotName: "leaderboard",
  },
  {
    id: "profile",
    route: "/profile",
    anchors: ["main-nav", "user-total-points", "logout-button"],
    requiresAuth: true,
    screenshotName: "profile",
  },
];

/** Ordre attendu de la navigation principale (prototype / design system) */
const NAV_ORDER: NavItem[] = [
  { dataCy: "nav-dashboard", route: "/dashboard" },
  { dataCy: "nav-pronos", route: "/pronos" },
  { dataCy: "nav-leaderboard", route: "/leaderboard" },
  { dataCy: "nav-profile", route: "/profile" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): Rgb => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
};

const parseCssColor = (value: string): Rgb | null => {
  const rgbMatch = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  return null;
};

const colorDistance = (a: Rgb, b: Rgb): number =>
  Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);

/** Attend que l'app Angular ait rendu la zone utile (évite les assertions sur shell vide). */
const waitForAngularShell = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  cy.get("app-root, [data-cy=app-shell], body", { timeout: 15000 }).should(
    "exist"
  );
  // Les apps Angular + Supabase chargent souvent /api/auth/me au boot.
  return cy.get("body", { timeout: 15000 }).should("be.visible");
};

const visitApp = (route: string, options?: { auth?: boolean }): void => {
  if (options?.auth) {
    cy.loginViaApi(registeredUser);
  }
  cy.visit(route, { failOnStatusCode: false });
  waitForAngularShell();
};

const assertAnchorsPresent = (anchors: string[]): void => {
  anchors.forEach((anchor) => {
    cy.get(`[data-cy=${anchor}]`, { timeout: 10000 }).should("exist");
  });
};

const assertTouchTarget = (dataCy: string): void => {
  cy.get(`[data-cy=${dataCy}]`).then(($el) => {
    const rect = $el[0].getBoundingClientRect();
    const minSide = Math.min(rect.width, rect.height);
    expect(
      minSide,
      `[data-cy=${dataCy}] zone tactile (min ${MIN_TOUCH_TARGET_PX}px)`
    ).to.be.at.least(MIN_TOUCH_TARGET_PX - SPACING_TOLERANCE_PX);
  });
};

const assertDesignToken = (token: DesignToken): void => {
  const expected = hexToRgb(token.hex);
  const tolerance = token.tolerance ?? 12;

  cy.get(token.selector).then(($el) => {
    const actual = parseCssColor(
      window.getComputedStyle($el[0])[token.property]
    );
    expect(actual, `${token.name} (${token.hex})`).to.not.be.null;
    expect(
      colorDistance(actual as Rgb, expected),
      `${token.name} — écart couleur`
    ).to.be.at.most(tolerance);
  });
};

const capturePrototypeScreenshot = (
  screenId: string,
  viewportName: string
): void => {
  cy.screenshot(`prototype/${viewportName}/${screenId}`, {
    capture: "viewport",
  });
};

// ─── Spec ──────────────────────────────────────────────────────────────────

describe("US-QA-010 - Alignement prototype final (Angular + Supabase)", () => {
  before(() => {
    cy.resetDb();
    cy.seedDb();
    cy.ensureUserExists(registeredUser);
  });

  // ─── 1. Inventaire des écrans ────────────────────────────────────────────

  describe("1. Inventaire des écrans MVP", () => {
    MVP_SCREENS.forEach((screen) => {
      it(`${screen.id} — route ${screen.route} et ancres prototype`, () => {
        visitApp(screen.route, { auth: screen.requiresAuth });
        cy.url().should("include", screen.route.split("?")[0]);
        assertAnchorsPresent(screen.anchors);
      });
    });

    it("chaque écran MVP a un titre de page non vide", () => {
      MVP_SCREENS.forEach((screen) => {
        visitApp(screen.route, { auth: screen.requiresAuth });
        cy.title().should("not.be.empty");
        cy.title().should("not.equal", "Angular");
      });
    });
  });

  // ─── 2. Navigation (structure prototype) ─────────────────────────────────

  describe("2. Navigation principale", () => {
    beforeEach(() => {
      cy.loginViaApi(registeredUser);
      cy.visit("/dashboard");
      waitForAngularShell();
    });

    it("expose les 4 entrées de navigation dans l'ordre du prototype", () => {
      cy.get("[data-cy^=nav-]").then(($items) => {
        const found = [...$items].map((el) => el.getAttribute("data-cy"));
        const expected = NAV_ORDER.map((n) => n.dataCy);

        expected.forEach((cyName, index) => {
          expect(
            found[index],
            `ordre nav : attendu ${cyName} en position ${index}`
          ).to.equal(cyName);
        });
      });
    });

    NAV_ORDER.forEach((item) => {
      it(`[data-cy=${item.dataCy}] mène vers ${item.route}`, () => {
        cy.get(`[data-cy=${item.dataCy}]`).click();
        cy.url({ timeout: 10000 }).should("include", item.route);
        cy.get("[data-cy=main-nav], [data-cy=burger-menu]").should("exist");
      });
    });

    it("menu burger visible sur mobile, nav horizontale sur desktop", () => {
      cy.viewport(375, 667);
      cy.visit("/dashboard");
      waitForAngularShell();
      cy.get("[data-cy=burger-menu], [data-cy=main-nav]:visible").should(
        "exist"
      );

      cy.viewport(1280, 720);
      cy.visit("/dashboard");
      waitForAngularShell();
      cy.get("[data-cy=main-nav]").should("be.visible");
    });
  });

  // ─── 3. Composants clés ──────────────────────────────────────────────────

  describe("3. Composants et layout (contrat prototype)", () => {
    beforeEach(() => {
      cy.loginViaApi(registeredUser);
    });

    it("dashboard — MatchCard avec statut et CTA prono", () => {
      visitApp("/dashboard", { auth: true });
      cy.get("[data-cy=match-card]")
        .first()
        .within(() => {
          cy.get("[data-cy=match-status-badge]").should("exist");
          cy.root().should("contain.text", seededMatch.home);
          cy.root().should("contain.text", seededMatch.away);
        });
    });

    it("formulaire prono — PredictionForm (champs + CTA primaire)", () => {
      visitApp("/pronos/new", { auth: true });
      cy.get("[data-cy=match-select]").should("be.visible");
      cy.get("[data-cy=score-home-input]").should("be.visible");
      cy.get("[data-cy=score-away-input]").should("be.visible");
      cy.get("[data-cy=submit-prono]")
        .should("be.visible")
        .and("not.be.disabled");
      assertTouchTarget("submit-prono");
    });

    it("leaderboard — lignes + mise en avant utilisateur courant", () => {
      cy.setUserPoints(registeredUser.email, 10);
      visitApp("/leaderboard", { auth: true });
      cy.get("[data-cy=leaderboard-row]").should(
        "have.length.greaterThan",
        0
      );
      cy.get("[data-cy=leaderboard-row][data-cy-current-user]").should(
        "be.visible"
      );
      cy.get("[data-cy=my-rank]").should("be.visible");
    });

    it("profil — points totaux visibles", () => {
      cy.setUserPoints(registeredUser.email, 7);
      visitApp("/profile", { auth: true });
      cy.get("[data-cy=user-total-points]")
        .should("be.visible")
        .and("contain", "7");
    });
  });

  // ─── 4. Identité visuelle (design system) ────────────────────────────────

  describe("4. Identité visuelle", () => {
    beforeEach(() => {
      cy.loginViaApi(registeredUser);
      visitApp("/dashboard", { auth: true });
    });

    DESIGN_TOKENS.forEach((token) => {
      it(`token ${token.name} (${token.hex})`, () => {
        assertDesignToken(token);
      });
    });

    it("CTA auth et prono respectent la taille tactile mobile (≥ 44px)", () => {
      cy.visit("/login");
      waitForAngularShell();
      assertTouchTarget("submit-button");

      visitApp("/pronos/new", { auth: true });
      assertTouchTarget("submit-prono");
    });

    it("bouton primaire distinct du secondaire (hiérarchie visuelle)", () => {
      visitApp("/pronos/new", { auth: true });
      cy.get("[data-cy=submit-prono]").then(($primary) => {
        const primaryBg = window.getComputedStyle($primary[0]).backgroundColor;
        cy.get("[data-cy=cancel-prono]").then(($secondary) => {
          if ($secondary.length === 0) return;
          const secondaryBg = window.getComputedStyle($secondary[0])
            .backgroundColor;
          expect(primaryBg, "CTA primaire vs secondaire").to.not.equal(
            secondaryBg
          );
        });
      });
    });
  });

  // ─── 5. États UI du prototype ────────────────────────────────────────────

  describe("5. États UI (vide, succès, verrouillé, terminé, chargement)", () => {
    beforeEach(() => {
      cy.loginViaApi(registeredUser);
    });

    it("état vide — Mes pronos sans prono", () => {
      visitApp("/pronos", { auth: true });
      cy.get("[data-cy=prono-card]").should("not.exist");
      cy.get("[data-cy=empty-state]")
        .should("be.visible")
        .and("not.be.empty");
    });

    it("état succès — confirmation après création de prono", () => {
      cy.intercept("POST", "/api/pronos").as("createProno");
      visitApp("/pronos/new", { auth: true });
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").clear().type("2");
      cy.get("[data-cy=score-away-input]").clear().type("1");
      cy.get("[data-cy=submit-prono]").click();
      cy.wait("@createProno").its("response.statusCode").should("be.oneOf", [
        200, 201,
      ]);
      cy.get("[data-cy=prono-success]").should("be.visible");
    });

    it("état verrouillé — prono non modifiable après lockout", () => {
      cy.createPronoViaTask({
        userEmail: registeredUser.email,
        matchId: seededMatch.id,
        home: 1,
        away: 0,
      });
      cy.setMatchStatus(seededMatch.id, "closed");

      visitApp(`/pronos/${seededMatch.id}/edit`, { auth: true });
      cy.get("[data-cy=prono-locked]")
        .should("be.visible")
        .and("contain.text", "verrouillé");
      cy.get("[data-cy=submit-prono]").should("not.exist");
    });

    it("état terminé — match fini avec badge et points", () => {
      cy.createPronoViaTask({
        userEmail: registeredUser.email,
        matchId: seededMatch.id,
        home: 2,
        away: 1,
      });
      cy.setMatchResult(seededMatch.id, { home: 2, away: 1 });

      visitApp("/dashboard", { auth: true });
      cy.get(
        `[data-cy=match-card][data-cy-match-id="${seededMatch.id}"]`
      ).within(() => {
        cy.get("[data-cy=match-status-badge]")
          .should("be.visible")
          .and("match", /terminé|finished|fin/i);
        cy.get("[data-cy=match-points]").should("be.visible");
      });
    });

    it("état chargement — skeleton ou spinner pendant fetch Supabase/API", () => {
      cy.intercept("GET", "/api/pronos*", (req) => {
        req.reply({ delay: 800, body: [] });
      }).as("loadPronos");

      visitApp("/pronos", { auth: true });
      cy.get("[data-cy=loading-state], [data-cy=skeleton], .skeleton", {
        timeout: 2000,
      }).should("exist");
      cy.wait("@loadPronos");
      cy.get("[data-cy=loading-state], [data-cy=skeleton]").should(
        "not.exist"
      );
    });
  });

  // ─── 6. Responsive (ruptures prototype) ──────────────────────────────────

  describe("6. Responsive — ruptures prototype", () => {
    const referenceScreen = MVP_SCREENS.find((s) => s.id === "home-matches");

    PROTOTYPE_VIEWPORTS.forEach((vp) => {
      describe(`Viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
        beforeEach(() => {
          cy.viewport(vp.width, vp.height);
          cy.loginViaApi(registeredUser);
        });

        it("dashboard — pas de scroll horizontal, CTA prono visible", () => {
          visitApp("/dashboard", { auth: true });
          cy.document().then((doc) => {
            const w = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth);
            expect(w, "overflow horizontal").to.be.at.most(vp.width + 1);
          });
          cy.get(
            "[data-cy=match-card] [data-cy=edit-prono], [data-cy=match-card] a"
          )
            .first()
            .should("be.visible");
        });

        it("formulaire prono — champs et submit visibles", () => {
          visitApp("/pronos/new", { auth: true });
          cy.get("[data-cy=submit-prono]").should("be.visible");
          cy.get("[data-cy=score-home-input]").should("be.visible");
        });

        if (referenceScreen?.screenshotName) {
          it(`capture baseline — ${referenceScreen.screenshotName}`, () => {
            visitApp(referenceScreen.route, { auth: true });
            capturePrototypeScreenshot(
              referenceScreen.screenshotName as string,
              vp.name
            );
          });
        }
      });
    });
  });

  // ─── 7. Parcours prototype de bout en bout ───────────────────────────────

  describe("7. Parcours prototype E2E (auth Supabase → prono → classement)", () => {
    it("reproduit le flow principal du prototype sans écran manquant", () => {
      const flowUser: User = {
        email: `proto_${Date.now()}@example.com`,
        password: "ProtoPass123!",
      };

      cy.intercept("POST", "/api/auth/signup").as("signup");
      cy.intercept("POST", "/api/auth/login").as("login");
      cy.intercept("GET", "/api/auth/me").as("me");

      cy.viewport(412, 915);
      cy.visit("/");
      waitForAngularShell();
      cy.get("[data-cy=signup-link]").click();
      cy.get("[data-cy=email-input]").type(flowUser.email);
      cy.get("[data-cy=password-input]").type(flowUser.password);
      cy.get("[data-cy=submit-button]").click();
      cy.wait("@signup").its("response.statusCode").should("be.oneOf", [
        200, 201,
      ]);

      cy.url({ timeout: 15000 }).should("satisfy", (url: string) =>
        /dashboard|pronos|profile/.test(url)
      );
      cy.wait("@me").its("response.statusCode").should("eq", 200);

      cy.visit("/pronos/new");
      waitForAngularShell();
      cy.get("[data-cy=match-select]").select(seededMatch.id);
      cy.get("[data-cy=score-home-input]").type("1");
      cy.get("[data-cy=score-away-input]").type("1");
      cy.get("[data-cy=submit-prono]").click();
      cy.get("[data-cy=prono-success]", { timeout: 10000 }).should("be.visible");

      cy.visit("/pronos");
      cy.get(`[data-cy=prono-card][data-cy-match-id="${seededMatch.id}"]`).should(
        "be.visible"
      );

      cy.visit("/leaderboard");
      cy.get("[data-cy=leaderboard-row]").should("have.length.greaterThan", 0);

      cy.visit("/profile");
      cy.get("[data-cy=user-total-points]").should("be.visible");

      cy.screenshot("prototype/flow-e2e-complete", { capture: "viewport" });
    });
  });

  // ─── 8. Intégration Supabase / API (pas d'erreur sur chargement UI) ───────

  describe("8. Chargement données (API / Supabase)", () => {
    beforeEach(() => {
      cy.loginViaApi(registeredUser);
    });

    it("GET /api/auth/me — session Angular valide après loginViaApi", () => {
      cy.request("/api/auth/me").then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property("email", registeredUser.email);
      });
    });

    it("les écrans prototype ne déclenchent pas de 5xx sur les GET métier", () => {
      const apiRoutes = [
        "/api/pronos",
        "/api/leaderboard",
        "/api/users/me/points",
      ];

      apiRoutes.forEach((path) => {
        cy.request({ url: path, failOnStatusCode: false }).then((resp) => {
          expect(resp.status, path).to.be.lessThan(500);
        });
      });
    });

    it("erreur métier affichée dans [data-cy=error-message] (état prototype)", () => {
      cy.visit("/login");
      waitForAngularShell();
      cy.get("[data-cy=email-input]").type(registeredUser.email);
      cy.get("[data-cy=password-input]").type("WrongPassword!");
      cy.get("[data-cy=submit-button]").click();
      cy.get("[data-cy=error-message]")
        .should("be.visible")
        .and("not.be.empty");
      cy.screenshot("prototype/state-error-auth");
    });
  });
});
