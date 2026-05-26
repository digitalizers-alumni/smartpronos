/// <reference types="cypress" />
/// <reference path="./cypress/support/index.d.ts" />

/**
 * US-QA-008 — Qualité UI/UX
 *
 * Source : CONTEXT/02_user_stories_by_release_v2.md §US-QA-008
 *
 * Critères couverts : aucun bouton cassé, texte lisible, interface responsive
 * (6 viewports), performances (DCL, load, API), intégrité visuelle.
 */

interface User {
  email: string;
  password: string;
}

interface Viewport {
  name: string;
  width: number;
  height: number;
}

interface PerfBudget {
  domContentLoaded: number;
  loadEvent: number;
  apiResponse: number;
}

describe("US-QA-008 - Qualité UI/UX", () => {
  // ─── Configuration ───────────────────────────────────────────────────────

  const registeredUser: User = {
    email: "registered_user@example.com",
    password: "Password123!",
  };

  const publicPages: string[] = ["/", "/login", "/signup"];
  const privatePages: string[] = [
    "/dashboard",
    "/pronos",
    "/leaderboard",
    "/profile",
  ];
  const allPages: string[] = [...publicPages, ...privatePages];

  // Viewports cibles 2026 (StatCounter monde + iPad).
  const viewports: Viewport[] = [
    { name: "iPhone SE",      width: 375,  height: 667 },
    { name: "iPhone 14 Pro",  width: 393,  height: 852 },
    { name: "Pixel 7",        width: 412,  height: 915 },
    { name: "iPad portrait",  width: 768,  height: 1024 },
    { name: "Desktop HD",     width: 1280, height: 720 },
    { name: "Desktop FHD",    width: 1920, height: 1080 },
  ];

  const PERF: PerfBudget = {
    domContentLoaded: 3000,
    loadEvent: 5000,
    apiResponse: 1000,
  };

  // ─── Hooks ───────────────────────────────────────────────────────────────

  before(() => {
    cy.resetDb();
    cy.seedDb();
  });

  beforeEach(() => {
    cy.loginViaApi(registeredUser);
  });

  // ─── Critère : Aucun bouton cassé ────────────────────────────────────────

  describe("Aucun bouton cassé", () => {
    it("tous les liens du menu principal mènent à une page valide", () => {
      cy.visit("/dashboard");
      cy.get("nav [data-cy^=nav-]").each(($link) => {
        const href = $link.attr("href");
        if (href && !href.startsWith("http") && !href.startsWith("#")) {
          cy.request({ url: href, failOnStatusCode: false }).then((resp) => {
            expect(resp.status, `lien vers ${href}`).to.be.lessThan(400);
          });
        }
      });
    });

    it("aucun bouton ne contient href='#' ou href vide (sauf intentionnel)", () => {
      cy.visit("/dashboard");
      cy.get("a").each(($a) => {
        const href = $a.attr("href");
        if (href !== undefined) {
          expect(href, `lien "${$a.text().trim()}"`).to.not.equal("");
          expect(href, `lien "${$a.text().trim()}"`).to.not.equal("#");
        }
      });
    });

    it("tous les boutons interactifs sont focusables au clavier (a11y de base)", () => {
      cy.visit("/dashboard");
      cy.get("button, a, input, select, textarea, [tabindex]").each(($el) => {
        const tabindex = $el.attr("tabindex");
        if (tabindex !== undefined && tabindex !== "-1") {
          expect(parseInt(tabindex, 10)).to.be.at.least(0);
        }
      });
    });

    it("les boutons critiques ont un label accessible (aria-label ou texte)", () => {
      cy.visit("/dashboard");
      cy.get("button:visible").each(($btn) => {
        const hasText = $btn.text().trim().length > 0;
        const ariaLabel = $btn.attr("aria-label");
        const hasAriaLabel = !!ariaLabel && ariaLabel.length > 0;
        const ariaLabelledBy = $btn.attr("aria-labelledby");
        const hasAriaLabelledBy = !!ariaLabelledBy && ariaLabelledBy.length > 0;
        const title = $btn.attr("title");
        const hasTitle = !!title && title.length > 0;

        expect(
          hasText || hasAriaLabel || hasAriaLabelledBy || hasTitle,
          `bouton sans label accessible : ${$btn[0].outerHTML.slice(0, 100)}`
        ).to.be.true;
      });
    });
  });

  // ─── Critère : Texte lisible ─────────────────────────────────────────────

  describe("Texte lisible", () => {
    it("la taille de police du body est ≥ 14px", () => {
      cy.visit("/dashboard");
      cy.get("body").then(($body) => {
        const fontSize = parseFloat(window.getComputedStyle($body[0]).fontSize);
        expect(fontSize, "body font-size").to.be.at.least(14);
      });
    });

    it("aucun texte visible n'a une taille < 12px", () => {
      cy.visit("/dashboard");
      cy.get("p, span, a, button, label, li, h1, h2, h3, h4, h5, h6, td, th")
        .filter(":visible")
        .each(($el) => {
          if ($el.text().trim().length === 0) return;
          const fontSize = parseFloat(
            window.getComputedStyle($el[0]).fontSize
          );
          expect(
            fontSize,
            `${$el[0].tagName} "${$el.text().trim().slice(0, 30)}"`
          ).to.be.at.least(12);
        });
    });

    it("le texte ne déborde pas de son conteneur (overflow caché sans ellipsis)", () => {
      cy.visit("/dashboard");
      cy.get("p, span, h1, h2, h3, td").each(($el) => {
        const el = $el[0] as HTMLElement;
        if (el.scrollWidth > el.clientWidth) {
          const style = window.getComputedStyle(el);
          const hasEllipsis = style.textOverflow === "ellipsis";
          const title = $el.attr("title");
          const hasTitle = !!title && title.length > 0;
          expect(
            hasEllipsis || hasTitle,
            `texte tronqué sans repli sur "${$el.text().slice(0, 30)}"`
          ).to.be.true;
        }
      });
    });

    it("aucun élément n'utilise une couleur de texte = couleur de fond", () => {
      cy.visit("/dashboard");
      cy.get("p, span, a, button, h1, h2, h3, h4, h5, h6")
        .filter(":visible")
        .each(($el) => {
          if ($el.text().trim().length === 0) return;
          const style = window.getComputedStyle($el[0]);
          const color = style.color;
          const bgColor = style.backgroundColor;

          if (bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent") return;
          expect(color, `texte indiscernable du fond`).to.not.equal(bgColor);
        });
    });
  });

  // ─── Critère : Interface responsive ──────────────────────────────────────

  describe("Interface responsive", () => {
    viewports.forEach((vp) => {
      describe(`Viewport ${vp.name} (${vp.width}×${vp.height})`, () => {
        beforeEach(() => {
          cy.viewport(vp.width, vp.height);
        });

        allPages.forEach((page) => {
          it(`${page} — pas de scroll horizontal`, () => {
            cy.visit(page);
            cy.document().then((doc) => {
              const body = doc.body;
              const html = doc.documentElement;
              const overflowX = Math.max(body.scrollWidth, html.scrollWidth);
              expect(
                overflowX,
                `${page} déborde horizontalement (${overflowX} > ${vp.width})`
              ).to.be.at.most(vp.width + 1);
            });
          });
        });

        it("le menu principal est accessible (visible ou burger)", () => {
          cy.visit("/dashboard");
          cy.get("[data-cy=main-nav], [data-cy=burger-menu]").should("exist");

          if (vp.width < 768) {
            cy.get(
              "[data-cy=burger-menu], [data-cy=main-nav]:visible"
            ).should("exist");
          } else {
            cy.get("[data-cy=main-nav]").should("be.visible");
          }
        });

        it("le formulaire de prono est utilisable", () => {
          cy.visit("/pronos/new");
          cy.get("[data-cy=match-select]").should("be.visible");
          cy.get("[data-cy=score-home-input]").should("be.visible");
          cy.get("[data-cy=score-away-input]").should("be.visible");
          cy.get("[data-cy=submit-prono]").should("be.visible");
        });
      });
    });
  });

  // ─── Critère : Temps de réponse acceptable ───────────────────────────────

  describe("Performance", () => {
    publicPages.forEach((page) => {
      it(`${page} — DOMContentLoaded < ${PERF.domContentLoaded}ms`, () => {
        cy.visit(page, {
          onBeforeLoad: (win) => {
            win.performance.mark("test-start");
          },
        });
        cy.window().then((win) => {
          const timing = win.performance.timing;
          const dcl = timing.domContentLoadedEventEnd - timing.navigationStart;
          expect(dcl, `DCL pour ${page}`).to.be.lessThan(PERF.domContentLoaded);
        });
      });
    });

    it("/dashboard — Load event < seuil", () => {
      cy.visit("/dashboard");
      cy.window().then((win) => {
        const timing = win.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        if (loadTime > 0) {
          expect(loadTime, "load event").to.be.lessThan(PERF.loadEvent);
        }
      });
    });

    it("/api/leaderboard — temps de réponse < 1000ms", () => {
      const t0 = Date.now();
      cy.request("GET", "/api/leaderboard").then(() => {
        const elapsed = Date.now() - t0;
        expect(elapsed, "leaderboard API").to.be.lessThan(PERF.apiResponse);
      });
    });

    it("/api/users/me/points — temps de réponse < 1000ms", () => {
      const t0 = Date.now();
      cy.request("GET", "/api/users/me/points").then(() => {
        const elapsed = Date.now() - t0;
        expect(elapsed, "points API").to.be.lessThan(PERF.apiResponse);
      });
    });

    it("aucune ressource > 1 MB sur la page d'accueil", () => {
      cy.visit("/");
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType(
          "resource"
        ) as PerformanceResourceTiming[];
        const oversized = resources.filter(
          (r) => r.transferSize > 1024 * 1024
        );
        expect(
          oversized.map(
            (r) => `${r.name} (${Math.round(r.transferSize / 1024)} KB)`
          ),
          "ressources > 1 MB"
        ).to.have.length(0);
      });
    });
  });

  // ─── Bonus : intégrité visuelle de base ──────────────────────────────────

  describe("Intégrité visuelle", () => {
    it("aucune image cassée sur les pages principales", () => {
      const failedImages: string[] = [];

      allPages.forEach((page) => {
        cy.visit(page);
        cy.get("img").each(($img) => {
          const img = $img[0] as HTMLImageElement;
          if (img.complete && img.naturalWidth === 0) {
            failedImages.push(`${page} — ${$img.attr("src")}`);
          }
        });
      });

      cy.then(() => {
        expect(failedImages, "images cassées").to.have.length(0);
      });
    });

    it("le titre de l'onglet (<title>) est défini sur chaque page", () => {
      allPages.forEach((page) => {
        cy.visit(page);
        cy.title().should("not.be.empty").and("not.equal", "React App");
      });
    });
  });
});
