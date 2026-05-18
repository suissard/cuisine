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
            author: ctx.state.user ? (ctx.state.user.documentId || ctx.state.user.id) : null,
          },
          status: 'published'
        });
        results.push(newRecipe);
      } catch (err) {
        console.error('Import error for recipe:', recipe.titre, err);
      }
    }

    return { data: results, count: results.length };
  },

  async updateMyRecipe(ctx) {
    const { documentId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized("You must be logged in.");
    }

    const recipe = await strapi.documents('api::recette.recette').findOne({
      documentId: documentId,
      populate: ['author']
    });

    if (!recipe) {
      return ctx.notFound("Recipe not found");
    }

    if (!recipe.author || (recipe.author.documentId !== user.documentId && recipe.author.id !== user.id)) {
      return ctx.forbidden("You are not the author of this recipe.");
    }

    const { data: recipeData } = ctx.request.body;
    
    // Resolve relationships just like in import
    const categoryDocIds = [];
    if (recipeData.categories) {
      for (const catName of recipeData.categories) {
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
      recipeData.categories = categoryDocIds;
    }

    const materielGlobalDocIds = [];
    if (recipeData.materiel_global) {
      for (const matName of recipeData.materiel_global) {
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
      recipeData.materiel_global = materielGlobalDocIds;
    }

    if (recipeData.ingredients) {
      const formattedIngredients = [];
      for (const ing of recipeData.ingredients) {
        let ingredientObj = await strapi.documents('api::ingredient.ingredient').findFirst({
          filters: { nom: ing.ingredient.nom }
        });
        if (!ingredientObj) {
          ingredientObj = await strapi.documents('api::ingredient.ingredient').create({
            data: {
              nom: ing.ingredient.nom,
              categorie: ing.ingredient.categorie || 'Autres'
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
      recipeData.ingredients = formattedIngredients;
    }

    if (recipeData.etapes) {
      const formattedEtapes = [];
      for (const etape of recipeData.etapes) {
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
      recipeData.etapes = formattedEtapes;
    }

    const updatedRecipe = await strapi.documents('api::recette.recette').update({
      documentId: documentId,
      data: recipeData
    });

    return { data: updatedRecipe };
  },

  async deleteMyRecipe(ctx) {
    const { documentId } = ctx.params;
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized("You must be logged in.");
    }

    const recipe = await strapi.documents('api::recette.recette').findOne({
      documentId: documentId,
      populate: ['author']
    });

    if (!recipe) {
      return ctx.notFound("Recipe not found");
    }

    if (!recipe.author || (recipe.author.documentId !== user.documentId && recipe.author.id !== user.id)) {
      return ctx.forbidden("You are not the author of this recipe.");
    }

    const deletedRecipe = await strapi.documents('api::recette.recette').delete({
      documentId: documentId
    });

    return { data: deletedRecipe };
  },

  async mergeItems(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized("You must be logged in.");
    }

    // Populate role to verify they are a Super Admin
    const fullUser = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: user.documentId || user.id,
      populate: ['role']
    });

    if (!fullUser || !fullUser.role || fullUser.role.type !== 'super-admin') {
      return ctx.forbidden("Only Super Admins can perform this action.");
    }

    const { type, toBeMergedDocIds, targetDocId } = ctx.request.body;

    if (!type || !toBeMergedDocIds || !targetDocId) {
      return ctx.badRequest("Missing type, toBeMergedDocIds or targetDocId in body.");
    }

    if (!Array.isArray(toBeMergedDocIds) || toBeMergedDocIds.length === 0) {
      return ctx.badRequest("toBeMergedDocIds must be a non-empty array of document IDs.");
    }

    if (type === 'ingredient') {
      const targetIng = await strapi.documents('api::ingredient.ingredient').findOne({
        documentId: targetDocId
      });
      if (!targetIng) {
        return ctx.notFound(`Target ingredient ${targetDocId} not found.`);
      }

      // Fetch all recipes populated with ingredient
      const recipes = await strapi.documents('api::recette.recette').findMany({
        populate: {
          ingredients: {
            populate: ['ingredient']
          }
        }
      });

      let updatedCount = 0;
      for (const recipe of recipes) {
        let updated = false;
        const newIngredients = [];

        if (recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            let targetIngDocId = ing.ingredient ? ing.ingredient.documentId : null;
            
            if (ing.ingredient && toBeMergedDocIds.includes(ing.ingredient.documentId) && ing.ingredient.documentId !== targetDocId) {
              targetIngDocId = targetDocId;
              updated = true;
            }

            // By explicitly creating the object WITHOUT the 'id' field, 
            // Strapi recreates the component and properly persists the relation.
            newIngredients.push({
              valeur: ing.valeur,
              unite: ing.unite,
              sous_type: ing.sous_type,
              ingredient: targetIngDocId
            });
          }
        }

        if (updated) {
          await strapi.documents('api::recette.recette').update({
            documentId: recipe.documentId,
            data: {
              ingredients: newIngredients
            }
          });
          updatedCount++;
        }
      }

      // Delete the obsolete ingredients from the database
      let deletedCount = 0;
      for (const docId of toBeMergedDocIds) {
        if (docId !== targetDocId) {
          try {
            await strapi.documents('api::ingredient.ingredient').delete({ documentId: docId });
            deletedCount++;
          } catch (err) {
            console.error(`Error deleting ingredient ${docId}:`, err);
          }
        }
      }

      return {
        success: true,
        message: `Successfully merged ingredients into ${targetIng.nom}.`,
        updatedRecipesCount: updatedCount,
        deletedItemsCount: deletedCount
      };
    } else if (type === 'materiel') {
      const targetMat = await strapi.documents('api::materiel.materiel').findOne({
        documentId: targetDocId
      });
      if (!targetMat) {
        return ctx.notFound(`Target equipment ${targetDocId} not found.`);
      }

      // Fetch all recipes populated with materiel_global and etapes
      const recipes = await strapi.documents('api::recette.recette').findMany({
        populate: {
          materiel_global: true,
          etapes: {
            populate: {
              materiel_utilise: {
                populate: ['materiel']
              }
            }
          }
        }
      });

      let updatedCount = 0;
      for (const recipe of recipes) {
        let updated = false;

        // 1. Update materiel_global relation
        const currentGlobalIds = recipe.materiel_global?.map((m: any) => m.documentId) || [];
        let newGlobalIds = currentGlobalIds.filter((id: string) => !toBeMergedDocIds.includes(id) || id === targetDocId);
        const hasOldGlobal = currentGlobalIds.some((id: string) => toBeMergedDocIds.includes(id) && id !== targetDocId);
        if (hasOldGlobal) {
          if (!newGlobalIds.includes(targetDocId)) {
            newGlobalIds.push(targetDocId);
          }
          updated = true;
        }

        // 2. Update etapes materiel_utilise
        const newEtapes = [];
        if (recipe.etapes) {
          for (const etape of recipe.etapes) {
            let etapeUpdated = false;
            const newMaterielUtilise = [];
            
            if (etape.materiel_utilise) {
              for (const mu of etape.materiel_utilise) {
                let targetMatDocId = mu.materiel ? mu.materiel.documentId : null;
                
                if (mu.materiel && toBeMergedDocIds.includes(mu.materiel.documentId) && mu.materiel.documentId !== targetDocId) {
                  targetMatDocId = targetDocId;
                  etapeUpdated = true;
                }
                
                // Explicitly construct without internal 'id'
                newMaterielUtilise.push({
                  texte_associe: mu.texte_associe,
                  materiel: targetMatDocId
                });
              }
            }
            if (etapeUpdated) {
              updated = true;
            }
            
            // Explicitly construct etape without internal 'id'
            newEtapes.push({
              ordre: etape.ordre,
              description: etape.description,
              temps: etape.temps,
              materiel_utilise: newMaterielUtilise
            });
          }
        }

        if (updated) {
          await strapi.documents('api::recette.recette').update({
            documentId: recipe.documentId,
            data: {
              materiel_global: newGlobalIds,
              etapes: newEtapes
            }
          });
          updatedCount++;
        }
      }

      // Delete the obsolete materials from the database
      let deletedCount = 0;
      for (const docId of toBeMergedDocIds) {
        if (docId !== targetDocId) {
          try {
            await strapi.documents('api::materiel.materiel').delete({ documentId: docId });
            deletedCount++;
          } catch (err) {
            console.error(`Error deleting equipment ${docId}:`, err);
          }
        }
      }

      return {
        success: true,
        message: `Successfully merged equipment into ${targetMat.nom}.`,
        updatedRecipesCount: updatedCount,
        deletedItemsCount: deletedCount
      };
    } else {
      return ctx.badRequest("Invalid type. Must be 'ingredient' or 'materiel'.");
    }
  }
}));
