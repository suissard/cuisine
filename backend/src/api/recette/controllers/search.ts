/**
 * A set of functions called "actions" for `search`
 */

export default {
  search: async (ctx, next) => {
    try {
      const data = ctx.request.body;

      // Utilisation de documentService recommandé dans Strapi 5
      const entries = await strapi.documents('api::recette.recette').findMany({
        populate: data.populate || {
          categories: true,
          author: true,
          materiel_global: true,
          difficulte: true,
          ingredients: {
            populate: {
              ingredient: true
            }
          },
          etapes: {
            populate: {
              temps: true,
              materiel_utilise: {
                populate: {
                  materiel: true
                }
              }
            }
          }
        },
        filters: data.filters || {},
      });

      ctx.body = { data: entries };
    } catch (err) {
      console.error('Search error:', err);
      ctx.body = { error: err.message || 'Internal Server Error' };
      ctx.status = 500;
    }
  }
};
