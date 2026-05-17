export default {
  routes: [
    {
      method: 'POST',
      path: '/recettes/import',
      handler: 'api::recette.recette.import',
      config: {
        // Enforces standard users-permissions auth check to populate ctx.state.user
      },
    },
  ],
};
