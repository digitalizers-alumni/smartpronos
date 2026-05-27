describe('US-QA-007 — Résilience', () => {
  beforeEach(() => {
    cy.loginViaApi();
  });

  it('navigation rapide entre pages sans erreur', () => {
    const pages = ['/home/match-list', '/leaderboard', '/profile', '/company'];
    pages.forEach((p) => cy.visit(p));
    cy.url().should('include', '/company');
  });

  it('deconnexion depuis le profil', () => {
    cy.visit('/profile');
    cy.contains('Se déconnecter').click();
    cy.url({ timeout: 5000 }).should('eq', Cypress.config().baseUrl + '/');
  });

  it('bouton back apres navigation', () => {
    cy.visit('/home/match-list');
    cy.visit('/leaderboard');
    cy.go('back');
    cy.url().should('include', '/home/match-list');
  });

  it('refresh sur le dashboard → reste sur dashboard', () => {
    cy.visit('/home/match-list');
    cy.reload();
    cy.get('app-match-card').should('have.length.at.least', 1);
  });

  it('affiche une erreur UI sur echec reseau prono', () => {
    cy.intercept('POST', '**/rest/v1/rpc/upsert_prediction', (req) => {
      req.destroy();
    }).as('upsertFail');
    cy.visit('/match/wc-2026-g2/prediction-form');
    cy.get('input[formControlName="homeScore"]').clear().type('2');
    cy.get('input[formControlName="awayScore"]').clear().type('1');
    cy.contains('button[type="submit"]', 'Valider mon pronostic').click();
    cy.contains('Impossible').should('be.visible');
  });
});
