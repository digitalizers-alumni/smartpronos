// Point d'entrée chargé avant chaque spec.
// Importer ici les commandes custom et les hooks globaux.

import "./commands"

// Optionnel : ignore les erreurs JS non critiques de l'app (ex. tracking,
// analytics) qui pourraient faire échouer un test sans rapport.
//
// Cypress.on("uncaught:exception", (err) => {
//   if (err.message.includes("ResizeObserver loop")) return false
// })
