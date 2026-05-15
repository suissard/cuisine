import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Types détaillés pour une recette complète
export interface Ingredient {
  name: string
  quantity: number
  unit: string // g, ml, cuillère, etc.
}

export interface RecipeStep {
  order: number
  instruction: string
}

export interface Recipe {
  id: number | string
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

  // États de tri
  const sortKey = ref<keyof Recipe>('title')
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
    // Application des filtres (Recherche, Tags, Favoris)
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

      return matchesSearch && matchesTags && matchesFavorites
    })

    // Application du tri
    return filtered.sort((a, b) => {
      let valA = a[sortKey.value]
      let valB = b[sortKey.value]
      
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
  
  function clearFilters() {
    searchQuery.value = ''
    selectedTags.value = []
    filterFavoritesOnly.value = false
  }

  function setSort(key: keyof Recipe, order: 'asc' | 'desc') {
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
    sortKey,
    sortOrder,
    isLoading,
    error,
    // Getters
    displayRecipes,
    allAvailableTags,
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
    clearFilters,
    setSort,
    setLoading,
    setError
  }
})
