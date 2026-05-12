const { defineConfig } = require("cypress")
const db = require("./cypress/plugins/db")

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3000",
    specPattern: "**/*.cy.{js,ts}",
    supportFile: "cypress/support/e2e.js",
    testIsolation: true,

    setupNodeEvents(on, config) {
      // Tâches Node.js exécutées dans le process Node de Cypress.
      // Appelables depuis les tests via cy.task("db:reset") / cy.task("db:seed").
      on("task", {
        async "db:reset"() {
          await db.reset()
          return null // cy.task() exige un retour non-undefined
        },

        async "db:seed"(payload) {
          const result = await db.seed(payload)
          return result ?? null
        },

        async "db:createUser"(user) {
          const created = await db.createUser(user)
          return created ?? null
        },

        async "db:createProno"(prono) {
          // Bypasse la validation métier (match fermé, doublon, …) —
          // utile pour préparer des états impossibles via l'API publique.
          const created = await db.createProno(prono)
          return created ?? null
        },

        async "db:setMatchStatus"({ id, status }) {
          await db.setMatchStatus(id, status)
          return null
        },

        async "db:setMatchKickoff"({ id, kickoff }) {
          // `kickoff` peut être une ISO string ou un timestamp.
          // Utile pour basculer un match dans la fenêtre de "deadline avant kickoff"
          // sans toucher au statut.
          await db.setMatchKickoff(id, kickoff)
          return null
        },

        async "db:createMatch"(match) {
          // Crée un match arbitraire pour les tests qui n'utilisent pas
          // les matchs du seed (typiquement : tests de scoring où chaque
          // test a besoin d'un match dédié).
          const created = await db.createMatch(match)
          return created ?? null
        },

        async "db:setMatchResult"({ id, home, away }) {
          // Enregistre le score final, passe le match en "finished" et
          // déclenche le moteur de scoring côté backend.
          await db.setMatchResult(id, home, away)
          return null
        },

        async "db:setUserPoints"({ email, points }) {
          // Pose un total de points directement (bypasse le scoring).
          // Utile pour tester UNIQUEMENT le classement, sans avoir à
          // monter de toute la chaîne match → prono → résultat → scoring.
          await db.setUserPoints(email, points)
          return null
        }
      })

      return config
    }
  }
})
