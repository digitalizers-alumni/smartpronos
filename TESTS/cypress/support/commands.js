/// <reference types="cypress" />

/**
 * Commandes custom pour SmartProno — réutilisables dans tous les specs.
 *
 * Pour activer ce fichier, l'importer dans cypress/support/e2e.js :
 *   import "./commands"
 */

/**
 * cy.resetDb()
 *
 * Vide les tables applicatives (users, sessions, …) via la tâche Node
 * "db:reset" définie dans cypress.config.js. À appeler dans un `before()`
 * (au début de chaque spec) — pas dans `beforeEach()` pour ne pas
 * casser les sessions mémorisées par cy.session().
 *
 * Usage :
 *   before(() => cy.resetDb())
 */
Cypress.Commands.add("resetDb", () => {
  return cy.task("db:reset")
})

/**
 * cy.seedDb(payload?)
 *
 * Insère le jeu de données de référence (utilisateur "registered_user",
 * équipes de démo, etc.) via la tâche "db:seed". Idempotent côté backend.
 *
 * Usage :
 *   before(() => cy.resetDb().then(() => cy.seedDb()))
 */
Cypress.Commands.add("seedDb", (payload) => {
  return cy.task("db:seed", payload ?? null)
})

/**
 * cy.createUserViaTask(user)
 *
 * Crée un utilisateur directement en DB (mot de passe hashé côté backend),
 * sans passer par /signup. Utile pour préparer des comptes avec des rôles
 * particuliers qui ne sont pas accessibles depuis l'UI d'inscription.
 */
Cypress.Commands.add("createUserViaTask", (user) => {
  return cy.task("db:createUser", user)
})

/**
 * cy.createPronoViaTask(prono)
 *
 * Insère un prono directement en DB en bypassant la validation métier.
 * Indispensable pour tester la modification sur un match déjà fermé :
 * impossible de créer ce prono via l'API publique sans modifier le statut
 * du match au préalable.
 *
 * Usage :
 *   cy.createPronoViaTask({
 *     userEmail: "registered_user@example.com",
 *     matchId: "match_demo_closed",
 *     home: 1,
 *     away: 1
 *   })
 */
Cypress.Commands.add("createPronoViaTask", (prono) => {
  return cy.task("db:createProno", prono)
})

/**
 * cy.setMatchStatus(matchId, status)
 *
 * Force le statut d'un match (open / closed / live …) sans dépendre de
 * l'horloge serveur. Utile pour basculer un match en "closed" pendant
 * un test, après que l'utilisateur ait pronostiqué dessus.
 */
Cypress.Commands.add("setMatchStatus", (matchId, status) => {
  return cy.task("db:setMatchStatus", { id: matchId, status })
})

/**
 * cy.setMatchKickoff(matchId, kickoff)
 *
 * Modifie l'heure du coup d'envoi d'un match. Permet de simuler
 * "match dans la fenêtre de deadline" sans dépendre de l'horloge réelle.
 *
 * Usage :
 *   cy.setMatchKickoff("match_demo_1", new Date(Date.now() + 2 * 60 * 1000))
 */
Cypress.Commands.add("setMatchKickoff", (matchId, kickoff) => {
  const iso = kickoff instanceof Date ? kickoff.toISOString() : kickoff
  return cy.task("db:setMatchKickoff", { id: matchId, kickoff: iso })
})

/**
 * cy.createMatch(match)
 *
 * Crée un match arbitraire en DB. Indispensable pour les tests qui ont
 * besoin d'un match isolé (sinon les tests se polluent mutuellement
 * sur les matchs du seed).
 *
 * Usage :
 *   cy.createMatch({
 *     id: "match_scoring_1",
 *     home: "A",
 *     away: "B",
 *     kickoff: new Date(Date.now() + 86400000)
 *   })
 */
Cypress.Commands.add("createMatch", (match) => {
  const payload = {
    ...match,
    kickoff:
      match.kickoff instanceof Date ? match.kickoff.toISOString() : match.kickoff
  }
  return cy.task("db:createMatch", payload)
})

/**
 * cy.setMatchResult(matchId, { home, away })
 *
 * Enregistre le résultat final d'un match. Côté backend, doit :
 *  - passer le match en status="finished"
 *  - déclencher le moteur de scoring sur tous les pronos du match
 * SYNCHRONEMENT (sinon les assertions sur les points juste après
 * pourraient échouer faussement).
 */
Cypress.Commands.add("setMatchResult", (matchId, { home, away }) => {
  return cy.task("db:setMatchResult", { id: matchId, home, away })
})

/**
 * cy.setUserPoints(email, points)
 *
 * Pose un total de points pour un utilisateur en bypassant le moteur
 * de scoring. À n'utiliser que pour les tests qui ciblent UNIQUEMENT
 * la logique de classement (sinon, préférer setMatchResult pour rester
 * en E2E).
 */
Cypress.Commands.add("setUserPoints", (email, points) => {
  return cy.task("db:setUserPoints", { email, points })
})

/**
 * cy.ensureUserExists(user)
 *
 * Garantit qu'un utilisateur existe en base. Mémorise le résultat avec
 * cy.session() pour ne pas spammer le backend entre tests / specs.
 *
 * Usage :
 *   cy.ensureUserExists({ email: "x@y.z", password: "..." })
 */
Cypress.Commands.add("ensureUserExists", (user) => {
  cy.session(
    ["signup", user.email],
    () => {
      cy.request({
        method: "POST",
        url: "/api/auth/signup",
        body: user,
        failOnStatusCode: false
      })
      // Ne pas mémoriser le cookie d'auth dans la session : on veut
      // un état "inscrit mais déconnecté" pour pouvoir tester l'UI de login.
      cy.clearCookies()
      cy.clearLocalStorage()
    },
    { cacheAcrossSpecs: true }
  )
})

/**
 * cy.loginViaApi(user)
 *
 * Connecte l'utilisateur via API et mémorise la session entre tests / specs.
 * Beaucoup plus rapide que de re-passer par l'UI à chaque test.
 *
 * Usage :
 *   cy.loginViaApi({ email: "x@y.z", password: "..." })
 *   cy.visit("/dashboard")
 */
Cypress.Commands.add("loginViaApi", (user) => {
  cy.session(
    ["login", user.email],
    () => {
      cy.request("POST", "/api/auth/login", user).then((resp) => {
        // Si le backend renvoie un token JWT au lieu d'un cookie :
        if (resp.body?.token) {
          window.localStorage.setItem("token", resp.body.token)
        }
      })
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.request({ url: "/api/auth/me", failOnStatusCode: false })
          .its("status")
          .should("eq", 200)
      }
    }
  )
})

/**
 * cy.loginViaUi(user)
 *
 * Connexion par l'UI — à utiliser uniquement dans les tests qui testent
 * explicitement le flux de login. Pour tous les autres, préférer cy.loginViaApi.
 */
Cypress.Commands.add("loginViaUi", (user) => {
  cy.visit("/")
  cy.get("[data-cy=login-link]").click()
  cy.get("[data-cy=email-input]").type(user.email)
  cy.get("[data-cy=password-input]").type(user.password)
  cy.get("[data-cy=submit-button]").click()
})
