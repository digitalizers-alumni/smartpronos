/**
 * US-QA-001 — Authentification fonctionnelle
 * @see CONTEXT/02_user_stories_by_release_v2.md
 *
 * Prérequis : `ng serve` sur baseUrl (défaut localhost:4200).
 * Les scénarios API utilisent des intercepts Supabase Auth (`**/auth/v1/**`).
 * Désactivez les `.skip` lorsque le frontend appellera ces endpoints.
 */

describe('US-QA-001 — Authentification fonctionnelle', () => {
  describe('Connexion — validation des champs obligatoires', () => {
    beforeEach(() => {
      cy.visit('/login');
    });

    it('affiche une erreur si email et mot de passe sont vides après soumission', () => {
      cy.get('.login-form').within(() => {
        cy.get('button[type="submit"]').click();
      });
      cy.get('.login-form__error').should('have.length.at.least', 1);
      cy.contains('Email invalide.');
      cy.contains('Le mot de passe doit contenir au moins 6 caracteres.');
    });

    it('affiche une erreur pour un email invalide', () => {
      cy.get('.login-form').within(() => {
        cy.get('input[type="email"]').clear().type('pas-un-email');
        cy.get('input[type="password"]').clear().type('secret12');
        cy.get('button[type="submit"]').click();
      });
      cy.contains('Email invalide.');
    });

    it('affiche une erreur si le mot de passe fait moins de 6 caractères', () => {
      cy.get('.login-form').within(() => {
        cy.get('input[type="email"]').clear().type('valide@test.com');
        cy.get('input[type="password"]').clear().type('12345');
        cy.get('button[type="submit"]').click();
      });
      cy.contains('Le mot de passe doit contenir au moins 6 caracteres.');
    });
  });

  describe('Connexion — flux API (Supabase Auth)', () => {
    it('soumet des identifiants valides (branchement actuel : log console, pas encore d’appel HTTP)', () => {
      cy.intercept('POST', '**/auth/v1/token**', { statusCode: 200, body: {} }).as('signIn');

      cy.visit('/login');
      cy.window().then((win) => {
        cy.spy(win.console, 'log').as('consoleLog');
      });

      cy.get('.login-form').within(() => {
        cy.get('input[type="email"]').clear().type('user@test.com');
        cy.get('input[type="password"]').clear().type('secret12');
        cy.get('button[type="submit"]').click();
      });

      cy.get('@consoleLog').should('have.been.called');
      // Quand AuthService appellera Supabase : cy.wait('@signIn');
    });

    it.skip('affiche une erreur si le mot de passe est incorrect (401)', () => {
      cy.intercept('POST', '**/auth/v1/token**', {
        statusCode: 400,
        body: {
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        },
      }).as('badPassword');

      cy.visit('/login');
      cy.get('.login-form').within(() => {
        cy.get('input[type="email"]').clear().type('user@test.com');
        cy.get('input[type="password"]').clear().type('mauvais');
        cy.get('button[type="submit"]').click();
      });
      cy.wait('@badPassword');
      // À adapter au message d’erreur affiché par l’app après câblage API.
      cy.contains(/incorrect|identifiants|erreur/i);
    });
  });

  describe('Inscription', () => {
    beforeEach(() => {
      cy.visit('/signup');
    });

    it('affiche le formulaire d’inscription avec les champs attendus', () => {
      cy.contains('Créez votre compte SmartPronos');
      cy.get('#fullname').should('be.visible');
      cy.get('#email').should('be.visible');
      cy.get('#password').should('be.visible');
      cy.contains('button', 'CRÉER MON COMPTE');
    });

    it.skip('crée un compte avec des données valides', () => {
      cy.intercept('POST', '**/auth/v1/signup**', {
        statusCode: 200,
        body: {
          id: 'new-user-id',
          email: 'nouveau@test.com',
        },
      }).as('signup');

      cy.get('#fullname').clear().type('Test User');
      cy.get('#email').clear().type('nouveau@test.com');
      cy.get('#password').clear().type('secret12');
      cy.contains('button', 'CRÉER MON COMPTE').click();

      // cy.wait('@signup');
      // cy.url().should('not.include', '/signup');
    });

    it.skip('affiche une erreur si l’email est déjà utilisé', () => {
      cy.intercept('POST', '**/auth/v1/signup**', {
        statusCode: 422,
        body: {
          error_code: 'user_already_exists',
          msg: 'User already registered',
        },
      }).as('signupDup');

      cy.get('#fullname').clear().type('Test User');
      cy.get('#email').clear().type('deja.pris@test.com');
      cy.get('#password').clear().type('secret12');
      cy.contains('button', 'CRÉER MON COMPTE').click();

      cy.wait('@signupDup');
      cy.contains(/déjà|utilisé|existe/i);
    });

    it.skip('valide les champs obligatoires non vides', () => {
      // À activer quand la validation côté inscription-page sera implémentée (ReactiveForms + messages d’erreur).
      cy.contains('button', 'CRÉER MON COMPTE').click();
      // cy.get('[data-cy="signup-error"]').should('be.visible');
    });
  });

  describe('Déconnexion', () => {
    it.skip('permet à l’utilisateur de se déconnecter', () => {
      // À implémenter : navigation post-login + bouton / action déconnexion dans l’UI.
      cy.visit('/');
      cy.contains(/déconnexion|se déconnecter/i).click();
      cy.url().should('match', /\/(login)?$/);
    });
  });
});
