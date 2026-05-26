describe('US-QA-001 — Authentification', () => {
  describe('Connexion', () => {
    beforeEach(() => cy.visit('/login'));

    it('affiche le formulaire avec email et mot de passe', () => {
      cy.get('input[formControlName="email"]').should('be.visible');
      cy.get('input[formControlName="password"]').should('be.visible');
      cy.contains('button[type="submit"]', 'Se connecter').should('be.visible');
    });

    it('ne soumet pas si email invalide', () => {
      cy.intercept('POST', '**/auth/v1/token**').as('authCall');
      cy.get('input[formControlName="email"]').type('pas-un-email');
      cy.get('input[formControlName="password"]').type('secret12');
      cy.contains('button[type="submit"]', 'Se connecter').click();
      cy.get('@authCall.all').should('have.length', 0);
    });

    it('ne soumet pas si mot de passe < 6 caracteres', () => {
      cy.intercept('POST', '**/auth/v1/token**').as('authCall');
      cy.get('input[formControlName="email"]').type('test@test.com');
      cy.get('input[formControlName="password"]').type('12345');
      cy.contains('button[type="submit"]', 'Se connecter').click();
      cy.get('@authCall.all').should('have.length', 0);
    });

    it('connexion reussie → redirection match-list', () => {
      cy.intercept('POST', '**/auth/v1/token**', {
        statusCode: 200,
        body: {
          access_token: 'test-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'test-refresh',
          user: { id: 'u1', email: 'user@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
        },
      }).as('login');
      cy.get('input[formControlName="email"]').type('user@test.com');
      cy.get('input[formControlName="password"]').type('secret12');
      cy.contains('button[type="submit"]', 'Se connecter').click();
      cy.wait('@login');
      cy.url({ timeout: 10000 }).should('include', '/home/match-list');
    });

    it('affiche erreur si identifiants incorrects (400)', () => {
      cy.intercept('POST', '**/auth/v1/token**', {
        statusCode: 400,
        body: { error: 'invalid_grant', error_description: 'Invalid login credentials' },
      }).as('badLogin');
      cy.get('input[formControlName="email"]').type('wrong@test.com');
      cy.get('input[formControlName="password"]').type('wrongpass');
      cy.contains('button[type="submit"]', 'Se connecter').click();
      cy.wait('@badLogin');
      cy.get('.bg-red-50').should('be.visible');
    });
  });

  describe('Inscription', () => {
    beforeEach(() => cy.visit('/signup'));

    it('affiche le formulaire avec tous les champs', () => {
      cy.get('input[formControlName="firstname"]').should('be.visible');
      cy.get('input[formControlName="lastname"]').should('be.visible');
      cy.get('input[formControlName="email"]').should('be.visible');
      cy.get('input[formControlName="password"]').should('be.visible');
      cy.get('input[formControlName="confirmPassword"]').should('be.visible');
      cy.contains('button[type="submit"]', 'Créer mon compte').scrollIntoView().should('be.visible');
    });

    it('inscription reussie avec session → redirection', () => {
      cy.intercept('POST', '**/auth/v1/signup', {
        statusCode: 200,
        body: {
          access_token: 'new-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'new-refresh',
          user: { id: 'new-user', email: 'new@test.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
        },
      }).as('signup');
      cy.get('input[formControlName="firstname"]').type('Jean');
      cy.get('input[formControlName="lastname"]').type('Dupont');
      cy.get('input[formControlName="email"]').type('new@test.com');
      cy.get('input[formControlName="password"]').type('secret123');
      cy.get('input[formControlName="confirmPassword"]').type('secret123');
      cy.contains('button[type="submit"]', 'Créer mon compte').scrollIntoView().click();
      cy.wait('@signup');
      cy.url({ timeout: 10000 }).should('include', '/home/match-list');
    });

    it('affiche ecran confirmation email si pas de session', () => {
      cy.intercept('POST', '**/auth/v1/signup', {
        statusCode: 200,
        body: { id: 'new-user', email: 'new@test.com' },
      }).as('signupNoSession');
      cy.get('input[formControlName="firstname"]').type('Jean');
      cy.get('input[formControlName="lastname"]').type('Dupont');
      cy.get('input[formControlName="email"]').type('new@test.com');
      cy.get('input[formControlName="password"]').type('secret123');
      cy.get('input[formControlName="confirmPassword"]').type('secret123');
      cy.contains('button[type="submit"]', 'Créer mon compte').scrollIntoView().click();
      cy.wait('@signupNoSession');
      cy.contains('email de confirmation').should('be.visible');
    });
  });

  describe('Navigation', () => {
    it('lien vers inscription depuis login', () => {
      cy.visit('/login');
      cy.contains("S'inscrire").click();
      cy.url().should('include', '/signup');
    });

    it('lien vers connexion depuis signup', () => {
      cy.visit('/signup');
      cy.contains('Se connecter').click();
      cy.url().should('include', '/login');
    });
  });
});
