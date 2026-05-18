import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Types détaillés pour une recette complète
export interface Ingredient {
  name: string
  quantity: number
  unit: string // g, ml, cuillère, etc.
  nom?: string
  valeur?: number
  unite?: string
  ingredient?: {
    nom: string
  }
}

export interface RecipeStep {
  order: number
  instruction: string
}

export interface Recipe {
  id: number | string
  documentId?: string
  title: string
  description: string
  ingredients: Ingredient[]
  steps: RecipeStep[]
  prepTime: number // en minutes
  cookTime: number // en minutes
  servings: number // nombre de portions
  difficulty: 'facile' | 'moyen' | 'difficile'
  tags: string[]
  isFavorite: boolean
  imageUrl?: string
  author?: string | null
}

export const useRecipeStore = defineStore('recipe', () => {
  // --- STATE ---
  const recipes = ref<Recipe[]>([])
  const editedRecipesCache = ref<Record<string | number, Partial<Recipe>>>({})

  // États pour la recherche et le filtrage
  const searchQuery = ref<string>('')
  const selectedTags = ref<string[]>([])
  const filterFavoritesOnly = ref<boolean>(false)

  // Filtres par ingrédients (Inclusif et Exclusif)
  const selectedIngredients = ref<string[]>([])
  const excludedIngredients = ref<string[]>([])
  const ingredientMatchMode = ref<'strict' | 'inclusive'>('strict')

  // États de tri
  const sortKey = ref<keyof Recipe | 'closest-ingredients'>('title')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  // États de requêtes
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // --- GETTERS (Computed) ---
  
  // 1. Liste fusionnée avec le cache d'édition
  const mergedRecipes = computed(() => {
    return recipes.value.map(recipe => {
      const cached = editedRecipesCache.value[recipe.id]
      return cached ? { ...recipe, ...cached } as Recipe : recipe
    })
  })

  // 2. Liste finale: Filtrée ET Triée
  const displayRecipes = computed(() => {
    // Application des filtres (Recherche, Tags, Favoris, Ingrédients, Exclusions)
    let filtered = mergedRecipes.value.filter(recipe => {
      // Filtre de recherche texte (titre ou description)
      const matchesSearch = searchQuery.value === '' || 
        (recipe.title && recipe.title.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
        (recipe.description && recipe.description.toLowerCase().includes(searchQuery.value.toLowerCase()))
      
      // Filtre par tags (doit contenir TOUS les tags sélectionnés)
      const matchesTags = selectedTags.value.length === 0 || 
        selectedTags.value.every(tag => recipe.tags?.includes(tag))
        
      // Filtre favoris
      const matchesFavorites = filterFavoritesOnly.value === false || recipe.isFavorite === true

      // Filtre par ingrédient (Inclusif / Strict)
      let matchesIngredients = true
      if (selectedIngredients.value.length > 0) {
        // Extraction et normalisation des ingrédients de la recette
        const recipeIngs = (recipe.ingredients || []).map((ing: any) => {
          if (typeof ing === 'string') return ing.toLowerCase().trim()
          const name = ing.ingredient?.nom || ing.nom || ing.name
          return name ? name.toLowerCase().trim() : ''
        }).filter(Boolean)

        const filterIngs = selectedIngredients.value.map(i => i.toLowerCase().trim())

        if (ingredientMatchMode.value === 'strict') {
          // Strict: toutes les recettes dont TOUS les ingrédients font partie de la liste sélectionnée
          // (le frigo contient uniquement ces ingrédients précis)
          matchesIngredients = recipeIngs.length > 0 && recipeIngs.every(ingName => filterIngs.includes(ingName))
        } else {
          // Inclusif: la recette contient au moins TOUS les ingrédients sélectionnés
          matchesIngredients = filterIngs.every(ingName => recipeIngs.includes(ingName))
        }
      }

      // Filtre sans ingrédient (Exclusions)
      let matchesExclusions = true
      if (excludedIngredients.value.length > 0) {
        const recipeIngs = (recipe.ingredients || []).map((ing: any) => {
          if (typeof ing === 'string') return ing.toLowerCase().trim()
          const name = ing.ingredient?.nom || ing.nom || ing.name
          return name ? name.toLowerCase().trim() : ''
        }).filter(Boolean)

        const filterExclusions = excludedIngredients.value.map(i => i.toLowerCase().trim())

        // La recette ne doit contenir AUCUN des ingrédients exclus
        matchesExclusions = !recipeIngs.some(ingName => filterExclusions.includes(ingName))
      }

      return matchesSearch && matchesTags && matchesFavorites && matchesIngredients && matchesExclusions
    })

    // Application du tri
    if (sortKey.value === 'closest-ingredients' && selectedIngredients.value.length > 0) {
      const selectedSet = new Set(
        selectedIngredients.value.map(i => i.toLowerCase().trim())
      )
      
      const getMissingCount = (recipe: Recipe) => {
        if (!recipe.ingredients) return 0
        return recipe.ingredients.filter(
          ing => {
            const name = ing.ingredient?.nom || ing.nom || ing.name || ''
            return !selectedSet.has(name.toLowerCase().trim())
          }
        ).length
      }

      return filtered.sort((a, b) => {
        const missingA = getMissingCount(a)
        const missingB = getMissingCount(b)
        
        if (missingA !== missingB) {
          return missingA - missingB // Moins d'ingrédients manquants en premier
        }
        
        // Sous-tri par titre
        return a.title.localeCompare(b.title)
      })
    }

    // Application du tri standard (par défaut)
    return filtered.sort((a, b) => {
      const key = sortKey.value as keyof Recipe
      let valA: any = a[key] ?? ''
      let valB: any = b[key] ?? ''
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }

      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1
      return 0
    })
  })

  // Obtenir tous les tags uniques disponibles dans les recettes
  const allAvailableTags = computed(() => {
    const tagsSet = new Set<string>()
    recipes.value.forEach(recipe => {
      recipe.tags?.forEach(tag => tagsSet.add(tag))
    })
    return Array.from(tagsSet).sort()
  })

  // Obtenir tous les ingrédients uniques disponibles dans les recettes
  const allAvailableIngredients = computed(() => {
    const ingredientsSet = new Set<string>()
    recipes.value.forEach(recipe => {
      recipe.ingredients?.forEach((ing: any) => {
        const name = ing.ingredient?.nom || ing.nom || ing.name
        if (name) {
          const formatted = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase()
          ingredientsSet.add(formatted)
        }
      })
    })
    return Array.from(ingredientsSet).sort((a, b) => a.localeCompare(b))
  })

  // Permet de savoir si une recette est actuellement modifiée et non sauvegardée
  const isEditing = computed(() => (id: number | string) => {
    return editedRecipesCache.value[id] !== undefined
  })
  
  // Récupérer une recette spécifique (fusionnée avec son brouillon)
  const getRecipeById = computed(() => (id: number | string): Recipe | undefined => {
    return mergedRecipes.value.find(r => r.id === id)
  })

  // --- ACTIONS ---
  
  // CRUD de base
  function setRecipes(data: Recipe[]) {
    recipes.value = data
  }

  function addRecipe(recipe: Recipe) {
    recipes.value.push(recipe)
  }

  function removeRecipe(id: number | string) {
    recipes.value = recipes.value.filter(r => r.id !== id)
    cancelRecipeDraft(id) // Nettoyer le cache s'il existait
  }

  // Interactions Rapides
  function toggleFavorite(id: number | string) {
    // Si on l'édite déjà, on modifie le brouillon. Sinon on crée un brouillon pour l'update
    const recipe = recipes.value.find(r => r.id === id)
    const currentFavorite = editedRecipesCache.value[id]?.isFavorite ?? recipe?.isFavorite ?? false
    
    updateRecipeDraft(id, { isFavorite: !currentFavorite })
    // On pourrait choisir de `saveRecipe(id)` directement ici si on veut que le favori s'enregistre immédiatement
  }

  // Gestion du cache d'édition
  function updateRecipeDraft(id: number | string, changes: Partial<Recipe>) {
    editedRecipesCache.value[id] = {
      ...(editedRecipesCache.value[id] || {}),
      ...changes
    }
  }

  function saveRecipe(id: number | string) {
    const changes = editedRecipesCache.value[id]
    if (!changes) return 

    const index = recipes.value.findIndex(r => r.id === id)
    if (index !== -1) {
      recipes.value[index] = { ...recipes.value[index], ...changes } as Recipe
    }
    cancelRecipeDraft(id)
  }

  function cancelRecipeDraft(id: number | string) {
    delete editedRecipesCache.value[id]
  }

  function clearAllDrafts() {
    editedRecipesCache.value = {}
  }

  // Gestion des Filtres et du Tri
  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function toggleTagFilter(tag: string) {
    const index = selectedTags.value.indexOf(tag)
    if (index === -1) {
      selectedTags.value.push(tag)
    } else {
      selectedTags.value.splice(index, 1)
    }
  }

  function toggleIngredientFilter(ing: string) {
    const index = selectedIngredients.value.indexOf(ing)
    if (index === -1) {
      selectedIngredients.value.push(ing)
    } else {
      selectedIngredients.value.splice(index, 1)
    }
  }

  function toggleExcludedIngredient(ing: string) {
    const index = excludedIngredients.value.indexOf(ing)
    if (index === -1) {
      excludedIngredients.value.push(ing)
    } else {
      excludedIngredients.value.splice(index, 1)
    }
  }

  function removeIngredientFilter(ing: string) {
    const index = selectedIngredients.value.indexOf(ing)
    if (index !== -1) {
      selectedIngredients.value.splice(index, 1)
    }
  }

  function removeExcludedIngredient(ing: string) {
    const index = excludedIngredients.value.indexOf(ing)
    if (index !== -1) {
      excludedIngredients.value.splice(index, 1)
    }
  }
  
  function clearFilters() {
    searchQuery.value = ''
    selectedTags.value = []
    filterFavoritesOnly.value = false
    selectedIngredients.value = []
    excludedIngredients.value = []
    ingredientMatchMode.value = 'strict'
  }

  function setSort(key: keyof Recipe | 'closest-ingredients', order: 'asc' | 'desc') {
    sortKey.value = key
    sortOrder.value = order
  }

  // Gestion des requêtes
  function setLoading(state: boolean) {
    isLoading.value = state
  }

  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }

  return {
    // State
    recipes,
    editedRecipesCache,
    searchQuery,
    selectedTags,
    filterFavoritesOnly,
    selectedIngredients,
    excludedIngredients,
    ingredientMatchMode,
    sortKey,
    sortOrder,
    isLoading,
    error,
    // Getters
    displayRecipes,
    allAvailableTags,
    allAvailableIngredients,
    isEditing,
    getRecipeById,
    // Actions
    setRecipes,
    addRecipe,
    removeRecipe,
    toggleFavorite,
    updateRecipeDraft,
    saveRecipe,
    cancelRecipeDraft,
    clearAllDrafts,
    setSearchQuery,
    toggleTagFilter,
    toggleIngredientFilter,
    toggleExcludedIngredient,
    removeIngredientFilter,
    removeExcludedIngredient,
    clearFilters,
    setSort,
    setLoading,
    setError
  }
})
