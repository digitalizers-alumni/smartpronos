/// <reference types="cypress" />

/**
 * Déclarations de types pour les commandes custom SmartProno.
 *
 * Toute commande ajoutée via Cypress.Commands.add(...) dans `commands.js`
 * doit être déclarée ici pour être typée dans les specs .ts.
 *
 * Cf. cypress/support/commands.js
 */

declare global {
  namespace Cypress {
    interface MatchPayload {
      id: string;
      home: string;
      away: string;
      kickoff: Date | string;
      [key: string]: unknown;
    }

    interface PronoPayload {
      userEmail: string;
      matchId: string;
      home: number;
      away: number;
    }

    interface UserPayload {
      email: string;
      password: string;
    }

    type MatchStatus = "open" | "closed" | "live" | "finished";

    interface Chainable<Subject = any> {
      /**
       * Vide les tables applicatives via la tâche Node "db:reset".
       * À appeler dans un `before()` (pas `beforeEach`).
       */
      resetDb(): Chainable<null>;

      /**
       * Insère le jeu de données de référence (registered_user + matchs).
       */
      seedDb(payload?: unknown): Chainable<unknown>;

      /**
       * Crée un utilisateur en DB (mot de passe hashé), sans passer par /signup.
       */
      createUserViaTask(user: UserPayload): Chainable<unknown>;

      /**
       * Insère un prono directement en DB en bypassant la validation métier.
       */
      createPronoViaTask(prono: PronoPayload): Chainable<unknown>;

      /**
       * Force le statut d'un match (open / closed / live / finished).
       */
      setMatchStatus(matchId: string, status: MatchStatus): Chainable<null>;

      /**
       * Modifie l'heure du coup d'envoi d'un match.
       */
      setMatchKickoff(
        matchId: string,
        kickoff: Date | string
      ): Chainable<null>;

      /**
       * Crée un match arbitraire en DB.
       */
      createMatch(match: MatchPayload): Chainable<unknown>;

      /**
       * Enregistre le résultat final d'un match (déclenche le scoring synchrone).
       */
      setMatchResult(
        matchId: string,
        score: { home: number; away: number }
      ): Chainable<null>;

      /**
       * Pose un total de points pour un utilisateur (bypass scoring).
       */
      setUserPoints(email: string, points: number): Chainable<null>;

      /**
       * Garantit qu'un utilisateur existe en base (via /api/auth/signup).
       * Résultat mémorisé via cy.session().
       */
      ensureUserExists(user: UserPayload): Chainable<void>;

      /**
       * Connexion programmatique via API, mémorisée entre tests / specs.
       */
      loginViaApi(user: UserPayload): Chainable<void>;

      /**
       * Connexion par l'UI — réservée aux tests qui testent explicitement
       * le flux de login.
       */
      loginViaUi(user: UserPayload): Chainable<void>;
    }
  }
}

export {};
