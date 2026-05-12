/**
 * Helpers d'accès DB pour les tâches Cypress.
 *
 * ⚠️  Ce fichier tourne dans le process Node de Cypress (pas dans le navigateur).
 *     Il a accès au filesystem, aux drivers DB, etc.
 *
 * Adaptez l'implémentation à votre stack — exemples Prisma / Knex / pg ci-dessous.
 * Sécurité : ne JAMAIS exécuter ces tâches contre une base de production.
 *            On vérifie NODE_ENV / DATABASE_URL avant toute opération destructrice.
 */

const assertSafeEnv = () => {
  const env = process.env.NODE_ENV
  const url = process.env.DATABASE_URL || ""

  const isTestEnv = env === "test" || env === "development"
  const looksLikeProd =
    /prod|production/i.test(url) || /prod|production/i.test(env || "")

  if (!isTestEnv || looksLikeProd) {
    throw new Error(
      `[cypress db] Refus d'opérer : NODE_ENV="${env}", DATABASE_URL="${url}". ` +
        `Ces tâches sont destructives — n'exécutez que contre une base de test.`
    )
  }
}

// ─── Implémentation : à adapter à votre ORM ─────────────────────────────────

/**
 * Exemple Prisma (décommentez si vous utilisez Prisma) :
 *
 *   const { PrismaClient } = require("@prisma/client")
 *   const prisma = new PrismaClient()
 *
 *   async function reset() {
 *     assertSafeEnv()
 *     await prisma.$transaction([
 *       prisma.session.deleteMany(),
 *       prisma.user.deleteMany(),
 *     ])
 *   }
 *
 *   async function seed() {
 *     assertSafeEnv()
 *     const bcrypt = require("bcryptjs")
 *     await prisma.user.create({
 *       data: {
 *         email: "registered_user@example.com",
 *         passwordHash: await bcrypt.hash("Password123!", 10),
 *       },
 *     })
 *   }
 *
 *   async function createUser(user) {
 *     const bcrypt = require("bcryptjs")
 *     return prisma.user.create({
 *       data: {
 *         email: user.email,
 *         passwordHash: await bcrypt.hash(user.password, 10),
 *       },
 *     })
 *   }
 */

/**
 * Exemple Knex / pg (décommentez si vous utilisez Knex ou pg directement) :
 *
 *   const knex = require("knex")(require("../../knexfile").test)
 *
 *   async function reset() {
 *     assertSafeEnv()
 *     await knex.raw("TRUNCATE TABLE sessions, users RESTART IDENTITY CASCADE")
 *   }
 *
 *   async function seed() {
 *     assertSafeEnv()
 *     const bcrypt = require("bcryptjs")
 *     await knex("users").insert({
 *       email: "registered_user@example.com",
 *       password_hash: await bcrypt.hash("Password123!", 10),
 *     })
 *   }
 */

// ─── Implémentation par défaut : déléguer à une route admin du backend ─────
//
// Si vous préférez ne pas dupliquer l'accès DB côté tests, exposez côté backend
// (uniquement en NODE_ENV=test) deux endpoints admin protégés par un token :
//   POST /__test__/reset
//   POST /__test__/seed
// puis appelez-les ici via fetch. C'est l'approche la plus portable.

const fetch = globalThis.fetch || require("node-fetch")
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000"
const TEST_TOKEN = process.env.CYPRESS_TEST_TOKEN || ""

const adminFetch = async (path, body) => {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Test-Token": TEST_TOKEN
    },
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    throw new Error(`[cypress db] ${path} → ${res.status} ${await res.text()}`)
  }
  return res.status === 204 ? null : res.json()
}

async function reset() {
  assertSafeEnv()
  await adminFetch("/__test__/reset")
}

async function seed(payload) {
  assertSafeEnv()
  return adminFetch("/__test__/seed", payload)
}

async function createUser(user) {
  assertSafeEnv()
  return adminFetch("/__test__/users", user)
}

async function createProno(prono) {
  assertSafeEnv()
  // Le backend doit exposer un endpoint admin qui INSERT sans appliquer
  // les règles métier (match.status="open", deadline, …).
  return adminFetch("/__test__/pronos", prono)
}

async function setMatchStatus(id, status) {
  assertSafeEnv()
  return adminFetch(`/__test__/matches/${id}/status`, { status })
}

async function setMatchKickoff(id, kickoff) {
  assertSafeEnv()
  return adminFetch(`/__test__/matches/${id}/kickoff`, { kickoff })
}

async function createMatch(match) {
  assertSafeEnv()
  return adminFetch("/__test__/matches", match)
}

async function setMatchResult(id, home, away) {
  assertSafeEnv()
  // Côté backend, cette route doit :
  //   1. UPDATE matches SET status='finished', result_home=$1, result_away=$2
  //   2. déclencher le moteur de scoring (synchrone) pour tous les pronos
  //      de ce match — sinon les tests ne pourront pas asserter les points
  //      juste après l'appel.
  return adminFetch(`/__test__/matches/${id}/result`, { home, away })
}

async function setUserPoints(email, points) {
  assertSafeEnv()
  // Pose un total de points pour un utilisateur en bypassant le scoring.
  // Côté backend : UPSERT dans la table user_scores (ou équivalent).
  return adminFetch(`/__test__/users/${encodeURIComponent(email)}/points`, {
    points
  })
}

module.exports = {
  reset,
  seed,
  createUser,
  createProno,
  setMatchStatus,
  setMatchKickoff,
  createMatch,
  setMatchResult,
  setUserPoints
}
