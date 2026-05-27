import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    setupNodeEvents(on) {
      on('task', {
        'db:reset': () => null,
        'db:seed': () => null,
        'db:setUserPoints': () => null,
        'db:setMatchResult': () => null,
        'db:createUser': () => null,
        'db:createProno': () => null,
        'db:setMatchKickoff': () => null,
        'db:setMatchStatus': () => null,
        'db:createMatch': () => null,
      });
    },
  },
});