import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    console.log('Checking and seeding database with recipes...');

    // Ensure a default user exists for seeded recipes
    let defaultUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { username: 'cuisinier' }
    });

    if (!defaultUser) {
      const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      defaultUser = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          username: 'cuisinier',
          email: 'cuisinier@example.com',
          password: 'password123',
          confirmed: true,
          role: authenticatedRole.id,
        }
      });
    }

    const recipesDir = path.join(process.cwd(), 'data/recipes');
    if (fs.existsSync(recipesDir)) {
      const files = fs.readdirSync(recipesDir).filter(f => f.endsWith('.json'));
      console.log(`Found ${files.length} recipe files to process.`);

      for (const file of files) {
        const filePath = path.join(recipesDir, file);
        let recipesData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        // Handle both single objects and arrays
        if (!Array.isArray(recipesData)) {
          recipesData = [recipesData];
        }

        for (const recipe of recipesData) {
          const existing = await strapi.documents('api::recette.recette').findFirst({
            filters: { titre: recipe.titre },
            populate: { author: true }
          });

          if (existing) {
            // If the recipe exists but has no author, update it
            if (!existing.author) {
              console.log(`Updating recipe with author: ${recipe.titre}`);
              await strapi.documents('api::recette.recette').update({
                documentId: existing.documentId,
                data: { author: { connect: [defaultUser.id] } } as any,
                status: 'published'
              });
            }
            continue;
          }
          
          console.log(`Seeding recipe from ${file}: ${recipe.titre}`);
          try {
            // Create Categories
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

            // Create Global Materiels
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

            // Create Ingredients
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
                const parseValeur = (val: any) => {
                  if (val === null || val === "null" || val === undefined) return null;
                  const parsed = parseFloat(val);
                  return isNaN(parsed) ? null : parsed;
                };

                formattedIngredients.push({
                  ingredient: ingredientObj.documentId,
                  valeur: parseValeur(ing.valeur),
                  unite: ing.unite === "null" ? null : ing.unite,
                  sous_type: ing.sous_type === "null" ? null : ing.sous_type
                });
              }
            }

            // Create Etapes
            const formattedEtapes = [];
            if (recipe.etapes) {
              for (const etape of recipe.etapes) {
                const materielUtilise = [];
                if (etape.materiel_utilise) {
                  for (const mat of etape.materiel_utilise) {
                    const materialName = typeof mat.materiel === 'string' ? mat.materiel : mat.materiel?.nom;
                    if (!materialName) continue;

                    let matObj = await strapi.documents('api::materiel.materiel').findFirst({
                      filters: { nom: materialName }
                    });
                    if (!matObj) {
                      matObj = await strapi.documents('api::materiel.materiel').create({
                        data: { nom: materialName },
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

            // Create Recipe with author
            await strapi.documents('api::recette.recette').create({
              data: {
                titre: recipe.titre,
                description: recipe.description,
                origine: recipe.origine,
                portions: recipe.portions?.toString(),
                degustation: recipe.degustation,
                categories: categoryDocIds,
                materiel_global: materielGlobalDocIds,
                difficulte: recipe.difficulte,
                ingredients: formattedIngredients,
                etapes: formattedEtapes,
                author: { connect: [defaultUser.id] },
              } as any,
              status: 'published'
            });
          } catch (err) {
            console.error(`Failed to seed recipe ${recipe.titre}:`, err);
          }
        }
      }
      console.log('Seeding complete!');
    } else {
      console.log('No recipes directory found to seed.');
    }

    // Make public API readable
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
      populate: ['permissions']
    });
    if (publicRole) {
      const publicPermissions = [
        'api::recette.recette.find',
        'api::recette.recette.findOne',
        'api::recette.recette.import',
        'api::recette.search.search',
        'plugin::users-permissions.user.find',
        'plugin::users-permissions.user.findOne'
      ];
      for (const action of publicPermissions) {
        const p = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: { role: publicRole.id, action }
        });
        if (!p) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: { role: publicRole.id, action }
          });
        }
      }
    }

    // Set Authenticated Role permissions (Create/Import)
    const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
      populate: ['permissions']
    });
    if (authenticatedRole) {
      const authPermissions = [
        'api::recette.recette.find',
        'api::recette.recette.findOne',
        'api::recette.recette.create',
        'api::recette.recette.import',
        'api::recette.search.search'
      ];
      for (const action of authPermissions) {
        const p = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: { role: authenticatedRole.id, action }
        });
        if (!p) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: { role: authenticatedRole.id, action }
          });
        }
      }
    }
  },
};
