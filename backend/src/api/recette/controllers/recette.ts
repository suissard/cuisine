/**
 * recette controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::recette.recette', ({ strapi }) => ({
  async import(ctx) {
    const { data } = ctx.request.body;
    if (!data) return ctx.badRequest('No data provided');

    const recipes = Array.isArray(data) ? data : [data];
    const results = [];

    for (const recipe of recipes) {
      try {
        // Logic similar to bootstrap but for runtime import
        
        // 1. Categories
        const categoryDocIds = [];
        if (recipe.categories) {
          for (const catName of recipe.categories) {
            let cat = await strapi.documents('api::categorie-plat.categorie-plat').findFirst({
              filters: { nom: catName }
            });
            if (!cat) {
              cat = await strapi.documents('api::categorie-plat.categorie-plat').create({
                data: { nom: catName },
                status: 'published'
              });
            }
            categoryDocIds.push(cat.documentId);
          }
        }

        // 2. Global Materiels
        const materielGlobalDocIds = [];
        if (recipe.materiel_global) {
          for (const matName of recipe.materiel_global) {
            let mat = await strapi.documents('api::materiel.materiel').findFirst({
              filters: { nom: matName }
            });
            if (!mat) {
              mat = await strapi.documents('api::materiel.materiel').create({
                data: { nom: matName },
                status: 'published'
              });
            }
            materielGlobalDocIds.push(mat.documentId);
          }
        }

        // 3. Ingredients
        const formattedIngredients = [];
        if (recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            let ingredientObj = await strapi.documents('api::ingredient.ingredient').findFirst({
              filters: { nom: ing.ingredient.nom }
            });
            if (!ingredientObj) {
              ingredientObj = await strapi.documents('api::ingredient.ingredient').create({
                data: {
                  nom: ing.ingredient.nom,
                  categorie: ing.ingredient.categorie
                },
                status: 'published'
              });
            }
            formattedIngredients.push({
              ingredient: ingredientObj.documentId,
              valeur: ing.valeur,
              unite: ing.unite,
              sous_type: ing.sous_type
            });
          }
        }

        // 4. Etapes
        const formattedEtapes = [];
        if (recipe.etapes) {
          for (const etape of recipe.etapes) {
            const materielUtilise = [];
            if (etape.materiel_utilise) {
              for (const mat of etape.materiel_utilise) {
                let matObj = await strapi.documents('api::materiel.materiel').findFirst({
                  filters: { nom: mat.materiel }
                });
                if (!matObj) {
                  matObj = await strapi.documents('api::materiel.materiel').create({
                    data: { nom: mat.materiel },
                    status: 'published'
                  });
                }
                materielUtilise.push({
                  materiel: matObj.documentId,
                  texte_associe: mat.texte_associe
                });
              }
            }

            formattedEtapes.push({
              ordre: etape.ordre,
              description: etape.description,
              temps: etape.temps,
              materiel_utilise: materielUtilise
            });
          }
        }

        const newRecipe = await strapi.documents('api::recette.recette').create({
          data: {
            titre: recipe.titre,
            description: recipe.description,
            origine: recipe.origine,
            portions: recipe.portions,
            degustation: recipe.degustation,
            categories: categoryDocIds,
            materiel_global: materielGlobalDocIds,
            difficulte: recipe.difficulte,
            ingredients: formattedIngredients,
            etapes: formattedEtapes,
            author: ctx.state.user ? ctx.state.user.id : null,
          },
          status: 'published'
        });
        results.push(newRecipe);
      } catch (err) {
        console.error('Import error for recipe:', recipe.titre, err);
      }
    }

    return { data: results, count: results.length };
  }
}));
