describe('US-QA-008 — Qualité UI/UX', () => {
  it('le titre de la page est defini', () => {
    cy.visit('/login');
    cy.title().should('not.be.empty');
  });

  it('les pages publiques sont accessibles sans auth', () => {
    cy.visit('/');
    cy.title().should('exist');
    cy.visit('/login');
    cy.get('input[formControlName="email"]').should('be.visible');
    cy.visit('/signup');
    cy.get('input[formControlName="firstname"]').should('be.visible');
  });

  it('le formulaire login est responsive (mobile)', () => {
    cy.viewport(375, 667);
    cy.visit('/login');
    cy.get('input[formControlName="email"]').should('be.visible');
    cy.get('input[formControlName="password"]').should('be.visible');
    cy.contains('button[type="submit"]', 'Se connecter').should('be.visible');
  });

  it('le formulaire login est responsive (desktop hd)', () => {
    cy.viewport(1280, 720);
    cy.visit('/login');
    cy.get('input[formControlName="email"]').should('be.visible');
    cy.get('input[formControlName="password"]').should('be.visible');
  });

  it('les boutons sont focusables au clavier', () => {
    cy.visit('/login');
    cy.get('button').first().focus().should('be.focused');
  });

  it('pas de scroll horizontal sur login', () => {
    cy.visit('/login');
    cy.document().then((doc) => {
      expect(doc.body.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
    });
  });

  it('les images ne sont pas cassees', () => {
    cy.visit('/');
    cy.get('img').each(($img) => {
      expect($img[0].naturalWidth).to.not.equal(0);
    });
  });
});
