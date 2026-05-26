describe('US-QA-004 — Points / Scoring', () => {
  beforeEach(() => {
    cy.loginViaApi();
  });

  it('affiche les points utilisateur sur le dashboard', () => {
    cy.contains('1 240').should('be.visible');
  });

  it('affiche les points sur la page profil', () => {
    cy.visit('/profile');
    cy.contains('1240').should('be.visible');
    cy.contains('Points').should('be.visible');
  });

  it('affiche le rang utilisateur', () => {
    cy.visit('/profile');
    cy.contains('#4').should('be.visible');
  });

  it('affiche les points pour un match termine avec resultat', () => {
    cy.visit('/match/wc-2026-g4/detail');
    cy.contains('Match joué').should('be.visible');
  });

  it('affiche le resultat final sur le detail du match', () => {
    cy.visit('/match/wc-2026-g4/detail');
    cy.get('span.font-space.text-2xl').should('be.visible');
  });
});
