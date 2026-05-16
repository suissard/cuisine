import type { Schema, Struct } from '@strapi/strapi';

export interface MetaDifficulte extends Struct.ComponentSchema {
  collectionName: 'components_meta_difficultes';
  info: {
    displayName: 'Difficulte';
    icon: 'star';
  };
  attributes: {
    cuisson: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    preparation: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    repos: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
  };
}

export interface MetaTemps extends Struct.ComponentSchema {
  collectionName: 'components_meta_temps';
  info: {
    displayName: 'Temps';
    icon: 'clock';
  };
  attributes: {
    cuisson_min: Schema.Attribute.Integer;
    preparation_min: Schema.Attribute.Integer;
    repos_min: Schema.Attribute.Integer;
  };
}

export interface RecetteEtape extends Struct.ComponentSchema {
  collectionName: 'components_recette_etapes';
  info: {
    displayName: 'Etape';
    icon: 'list';
  };
  attributes: {
    description: Schema.Attribute.Text;
    materiel_utilise: Schema.Attribute.Component<
      'recette.materiel-etape',
      true
    >;
    ordre: Schema.Attribute.Integer;
    temps: Schema.Attribute.Component<'meta.temps', false>;
  };
}

export interface RecetteMaterielEtape extends Struct.ComponentSchema {
  collectionName: 'components_recette_materiel_etapes';
  info: {
    displayName: 'Materiel_Etape';
    icon: 'tool';
  };
  attributes: {
    materiel: Schema.Attribute.Relation<'oneToOne', 'api::materiel.materiel'>;
    texte_associe: Schema.Attribute.String;
  };
}

export interface RecetteRecetteIngredient extends Struct.ComponentSchema {
  collectionName: 'components_recette_recette_ingredients';
  info: {
    displayName: 'Recette_Ingredient';
    icon: 'restaurant';
  };
  attributes: {
    ingredient: Schema.Attribute.Relation<
      'oneToOne',
      'api::ingredient.ingredient'
    >;
    sous_type: Schema.Attribute.String;
    unite: Schema.Attribute.String;
    valeur: Schema.Attribute.Decimal;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'meta.difficulte': MetaDifficulte;
      'meta.temps': MetaTemps;
      'recette.etape': RecetteEtape;
      'recette.materiel-etape': RecetteMaterielEtape;
      'recette.recette-ingredient': RecetteRecetteIngredient;
    }
  }
}
