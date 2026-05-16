export default {
  routes: [
    {
      method: 'POST',
      path: '/recettes/import',
      handler: 'api::recette.recette.import',
      config: {
        auth: false, // On pourra affiner plus tard si besoin, mais pour l'instant on veut que ça marche
      },
    },
  ],
};
