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
    const recettesCount = await strapi.db.query('api::recette.recette').count();

    if (recettesCount === 0) {
      console.log('Seeding database with recipes...');

      const recipesData = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../data/recipes.json'), 'utf-8')
      );

      for (const recipe of recipesData) {
        // Create Categories
        const categoryIds = [];
        for (const catName of recipe.categories) {
          let cat = await strapi.db.query('api::categorie-plat.categorie-plat').findOne({ where: { nom: catName } });
          if (!cat) {
            cat = await strapi.db.query('api::categorie-plat.categorie-plat').create({ data: { nom: catName } });
          }
          categoryIds.push(cat.id);
        }

        // Create Global Materiels
        const materielGlobalIds = [];
        for (const matName of recipe.materiel_global) {
          let mat = await strapi.db.query('api::materiel.materiel').findOne({ where: { nom: matName } });
          if (!mat) {
            mat = await strapi.db.query('api::materiel.materiel').create({ data: { nom: matName } });
          }
          materielGlobalIds.push(mat.id);
        }

        // Create Ingredients
        const formattedIngredients = [];
        for (const ing of recipe.ingredients) {
          let ingredientObj = await strapi.db.query('api::ingredient.ingredient').findOne({ where: { nom: ing.ingredient.nom } });
          if (!ingredientObj) {
            ingredientObj = await strapi.db.query('api::ingredient.ingredient').create({
              data: {
                nom: ing.ingredient.nom,
                categorie: ing.ingredient.categorie
              }
            });
          }
          formattedIngredients.push({
            ingredient: ingredientObj.id,
            valeur: ing.valeur,
            unite: ing.unite,
            sous_type: ing.sous_type
          });
        }

        // Create Etapes
        const formattedEtapes = [];
        for (const etape of recipe.etapes) {
          const materielUtiliseIds = [];
          if (etape.materiel_utilise) {
            for (const mat of etape.materiel_utilise) {
              let matObj = await strapi.db.query('api::materiel.materiel').findOne({ where: { nom: mat.materiel.nom } });
              if (!matObj) {
                matObj = await strapi.db.query('api::materiel.materiel').create({ data: { nom: mat.materiel.nom } });
              }
              materielUtiliseIds.push({
                materiel: matObj.id,
                texte_associe: mat.texte_associe
              });
            }
          }

          formattedEtapes.push({
            ordre: etape.ordre,
            description: etape.description,
            temps: etape.temps,
            materiel_utilise: materielUtiliseIds
          });
        }

        // Create Recipe
        await strapi.db.query('api::recette.recette').create({
          data: {
            titre: recipe.titre,
            description: recipe.description,
            origine: recipe.origine,
            portions: recipe.portions,
            degustation: recipe.degustation,
            categories: categoryIds,
            materiel_global: materielGlobalIds,
            difficulte: recipe.difficulte,
            ingredients: formattedIngredients,
            etapes: formattedEtapes,
            publishedAt: new Date(),
          }
        });
      }
      console.log('Seeding complete!');
    }

    // Make public API readable
    const role = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
      populate: ['permissions']
    });
    if (role) {
      const publicPermissions = [
        'api::recette.recette.find',
        'api::recette.recette.findOne',
        'api::recette.search.search'
      ];
      for (const action of publicPermissions) {
        const p = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: { role: role.id, action }
        });
        if (!p) {
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: { role: role.id, action }
          });
        }
      }
    }
  },
};
