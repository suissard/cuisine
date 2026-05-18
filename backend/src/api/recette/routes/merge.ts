export default {
  routes: [
    {
      method: 'POST',
      path: '/recettes/admin/merge',
      handler: 'api::recette.recette.mergeItems',
      config: {
        // Handled by the standard controller/middleware permissions check
      },
    },
  ],
};
