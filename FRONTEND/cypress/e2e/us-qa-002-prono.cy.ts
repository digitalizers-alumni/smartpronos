describe('US-QA-002 — Création de prono', () => {
  beforeEach(() => {
    cy.loginViaApi();
  });

  it('affiche les matchs disponibles sur le dashboard', () => {
    cy.contains('Tous').should('be.visible');
    cy.get('app-match-card').should('have.length.at.least', 1);
  });

  it('navigation vers le detail du match', () => {
    cy.get('app-match-card').first().click();
    cy.url().should('match', /\/match\/.+\/detail/);
  });

  it('navigation vers formulaire de prono depuis le detail', () => {
    cy.visit('/match/wc-2026-g2/detail');
    cy.contains('Faire mon pronostic').click();
    cy.url().should('include', '/prediction-form');
  });

  it('affiche le formulaire avec les champs score', () => {
    cy.visit('/match/wc-2026-g2/prediction-form');
    cy.get('input[formControlName="homeScore"]').should('be.visible');
    cy.get('input[formControlName="awayScore"]').should('be.visible');
    cy.contains('button[type="submit"]', 'Valider mon pronostic').should('be.visible');
  });

  it('affiche erreur si Supabase indisponible', () => {
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
