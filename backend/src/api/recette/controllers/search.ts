/**
 * A set of functions called "actions" for `search`
 */

export default {
  search: async (ctx, next) => {
    try {
      const data = ctx.request.body;

      const entries = await strapi.entityService.findMany('api::recette.recette', {
        populate: {
          categories: true,
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
      ctx.body = err;
    }
  }
};
