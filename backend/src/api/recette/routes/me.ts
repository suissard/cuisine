export default {
  routes: [
    {
      method: 'PUT',
      path: '/recettes/me/:documentId',
      handler: 'api::recette.recette.updateMyRecipe',
      config: {
        policies: [],
      },
    },
    {
      method: 'DELETE',
      path: '/recettes/me/:documentId',
      handler: 'api::recette.recette.deleteMyRecipe',
      config: {
        policies: [],
      },
    },
  ],
};
