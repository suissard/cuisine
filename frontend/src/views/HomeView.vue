<template>
  <div class="home-container">
    <!-- Hero Section -->
    <header class="hero">
      <div class="hero-content">
        <h1 class="hero-title">Découvrez nos <span class="highlight">Recettes</span></h1>
        <p class="hero-subtitle">Trouvez l'inspiration pour votre prochain repas</p>
      </div>
      
      <!-- Search and Filter Bar -->
      <div class="search-glass-panel">
        <div class="search-main-row">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              v-model="recipeStore.searchQuery" 
              placeholder="Que voulez-vous cuisiner aujourd'hui ?"
              class="search-input"
            />
          </div>
          
          <div class="search-actions">
            <select v-model="sortOption" @change="applySort" class="sort-select">
              <option value="title-asc">Titre (A-Z)</option>
              <option value="title-desc">Titre (Z-A)</option>
              <option value="prepTime-asc">Temps (Croissant)</option>
              <option value="prepTime-desc">Temps (Décroissant)</option>
              <option 
                value="closest-ingredients" 
                :disabled="recipeStore.selectedIngredients.length === 0"
                title="Ajoutez des ingrédients dans 'Mon Frigo' pour activer ce tri"
              >
                Ingrédients proches (Frigo)
              </option>
            </select>
            
            <button 
              @click="toggleAdvanced" 
              class="advanced-toggle-btn"
              :class="{ 'active': isAdvancedOpen || recipeStore.selectedTags.length > 0 || recipeStore.selectedIngredients.length > 0 || recipeStore.excludedIngredients.length > 0 }"
            >
              <span class="btn-icon">🎛️</span>
              <span class="btn-text">Filtres</span>
              <span 
                v-if="recipeStore.selectedTags.length + recipeStore.selectedIngredients.length + recipeStore.excludedIngredients.length > 0" 
                class="filter-count"
              >
                {{ recipeStore.selectedTags.length + recipeStore.selectedIngredients.length + recipeStore.excludedIngredients.length }}
              </span>
              <span class="arrow-icon">{{ isAdvancedOpen ? '▲' : '▼' }}</span>
            </button>
          </div>
        </div>

        <!-- Active Tags (Always visible if any, so user has instant feedback) -->
        <div 
          v-if="recipeStore.selectedTags.length > 0 || recipeStore.selectedIngredients.length > 0 || recipeStore.excludedIngredients.length > 0" 
          class="active-filters-row"
        >
          <span class="active-filters-label">Filtres actifs :</span>
          <div class="active-tags-list">
            <!-- Catégories -->
            <span 
              v-for="tag in recipeStore.selectedTags" 
              :key="'tag-' + tag"
              @click="recipeStore.toggleTagFilter(tag)"
              class="active-filter-pill pill-cat"
            >
              🏷️ {{ tag }} <span class="remove-tag">×</span>
            </span>

            <!-- Ingrédients inclus (Mon Frigo) -->
            <span 
              v-for="ing in recipeStore.selectedIngredients" 
              :key="'inc-' + ing"
              @click="recipeStore.removeIngredientFilter(ing)"
              class="active-filter-pill pill-inc"
              :title="recipeStore.ingredientMatchMode === 'strict' ? 'Strict : contient uniquement ces ingrédients' : 'Inclusif : contient cet ingrédient'"
            >
              🥘 {{ ing }}
              <span class="mode-indicator" v-if="recipeStore.ingredientMatchMode === 'strict'">*</span>
              <span class="remove-tag">×</span>
            </span>

            <!-- Ingrédients exclus -->
            <span 
              v-for="ing in recipeStore.excludedIngredients" 
              :key="'exc-' + ing"
              @click="recipeStore.removeExcludedIngredient(ing)"
              class="active-filter-pill pill-exc"
            >
              🚫 {{ ing }} <span class="remove-tag">×</span>
            </span>

            <button @click="recipeStore.clearFilters" class="clear-all-link">Effacer tout</button>
          </div>
        </div>
        
        <!-- Advanced Expandable Tags Panel -->
        <div 
          class="advanced-panel" 
          :class="{ 'open': isAdvancedOpen }"
        >
          <div class="advanced-panel-inner">
            <!-- Catégories -->
            <div class="filter-section">
              <h4 class="filter-section-title">🏷️ Catégories :</h4>
              <div class="tags-filter">
                <span 
                  v-for="tag in recipeStore.allAvailableTags" 
                  :key="tag"
                  @click="recipeStore.toggleTagFilter(tag)"
                  class="filter-tag"
                  :class="{ 'active': recipeStore.selectedTags.includes(tag) }"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <!-- Ingrédients Grid -->
            <div class="filter-grid-row">
              <!-- Ingrédients à inclure (Mon Frigo) -->
              <div class="filter-column">
                <h4 class="filter-section-title">🥘 Mon Frigo (Ingrédients à inclure)</h4>
                <p class="filter-section-desc">Affiche les recettes contenant ces ingrédients.</p>
                
                <div class="ingredient-search-row">
                  <div class="ingredient-input-wrapper">
                    <input 
                      type="text" 
                      v-model="includeSearchInput" 
                      placeholder="Chercher un ingrédient..." 
                      class="ingredient-search-input"
                      @keydown.enter.prevent="addTypedIngredient('include')"
                    />
                    <button 
                      v-if="includeSearchInput.trim()"
                      type="button" 
                      class="chip-add-btn" 
                      @click="addTypedIngredient('include')"
                      title="Ajouter"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                <!-- Étiquettes d'ingrédients interactives (Chips) -->
                <div class="ingredient-chips-selector">
                  <span 
                    v-for="ing in matchingIncludeIngredients" 
                    :key="ing"
                    @click="onIngredientChipClick(ing, 'include')"
                    class="ingredient-selector-chip"
                    :class="{ 
                      'active-include': recipeStore.selectedIngredients.includes(ing),
                      'active-exclude': recipeStore.excludedIngredients.includes(ing) 
                    }"
                  >
                    <span class="chip-icon">{{ recipeStore.selectedIngredients.includes(ing) ? '✓' : '＋' }}</span>
                    {{ ing }}
                  </span>
                </div>

                <!-- Sélecteur de mode de correspondance -->
                <div class="match-mode-selector" v-if="recipeStore.selectedIngredients.length > 0">
                  <span class="mode-label">Mode :</span>
                  <div class="mode-buttons">
                    <button 
                      type="button"
                      class="mode-btn"
                      :class="{ 'active': recipeStore.ingredientMatchMode === 'strict' }"
                      @click="recipeStore.ingredientMatchMode = 'strict'"
                      title="Strict (Uniquement ces ingrédients)"
                    >
                      Strict
                    </button>
                    <button 
                      type="button"
                      class="mode-btn"
                      :class="{ 'active': recipeStore.ingredientMatchMode === 'inclusive' }"
                      @click="recipeStore.ingredientMatchMode = 'inclusive'"
                      title="Inclusif (Au moins ces ingrédients)"
                    >
                      Inclusif
                    </button>
                  </div>
                </div>

                <!-- Liste des ingrédients inclus sélectionnés -->
                <div class="pills-list" v-if="recipeStore.selectedIngredients.length > 0">
                  <span 
                    v-for="ing in recipeStore.selectedIngredients" 
                    :key="ing"
                    @click="recipeStore.removeIngredientFilter(ing)"
                    class="filter-pill pill-include"
                  >
                    {{ ing }} <span class="remove-icon">×</span>
                  </span>
                </div>
              </div>

              <!-- Ingrédients à exclure -->
              <div class="filter-column">
                <h4 class="filter-section-title">🚫 Sans certains ingrédients (Exclusions)</h4>
                <p class="filter-section-desc">Masque les recettes contenant ces ingrédients.</p>
                
                <div class="ingredient-search-row">
                  <div class="ingredient-input-wrapper">
                    <input 
                      type="text" 
                      v-model="excludeSearchInput" 
                      placeholder="Exclure un ingrédient..." 
                      class="ingredient-search-input"
                      @keydown.enter.prevent="addTypedIngredient('exclude')"
                    />
                    <button 
                      v-if="excludeSearchInput.trim()"
                      type="button" 
                      class="chip-add-btn" 
                      @click="addTypedIngredient('exclude')"
                      title="Exclure"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                <!-- Étiquettes d'ingrédients interactives (Chips) -->
                <div class="ingredient-chips-selector">
                  <span 
                    v-for="ing in matchingExcludeIngredients" 
                    :key="ing"
                    @click="onIngredientChipClick(ing, 'exclude')"
                    class="ingredient-selector-chip"
                    :class="{ 
                      'active-include': recipeStore.selectedIngredients.includes(ing),
                      'active-exclude': recipeStore.excludedIngredients.includes(ing) 
                    }"
                  >
                    <span class="chip-icon">{{ recipeStore.excludedIngredients.includes(ing) ? '✓' : '＋' }}</span>
                    {{ ing }}
                  </span>
                </div>

                <!-- Liste des ingrédients exclus sélectionnés -->
                <div class="pills-list" v-if="recipeStore.excludedIngredients.length > 0">
                  <span 
                    v-for="ing in recipeStore.excludedIngredients" 
                    :key="ing"
                    @click="recipeStore.removeExcludedIngredient(ing)"
                    class="filter-pill pill-exclude"
                  >
                    {{ ing }} <span class="remove-icon">×</span>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="main-content">
      <!-- Loading State -->
      <div v-if="recipeStore.isLoading" class="recipes-grid">
        <div v-for="i in 6" :key="i" class="recipe-card skeleton">
          <div class="skeleton-img"></div>
          <div class="skeleton-text title"></div>
          <div class="skeleton-text desc"></div>
          <div class="skeleton-tags">
            <div class="skeleton-tag"></div>
            <div class="skeleton-tag"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="recipeStore?.error" class="error-state">
        <p>Erreur: {{ recipeStore?.error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="recipeStore.displayRecipes.length === 0" class="empty-state">
        <div class="empty-icon">🍽️</div>
        <h3>Aucune recette trouvée</h3>
        <p>Essayez de modifier vos filtres de recherche.</p>
        <button @click="recipeStore.clearFilters" class="clear-btn">Effacer les filtres</button>
      </div>

      <!-- Recipes Grid -->
      <div v-else class="recipes-grid">
        <div 
          v-for="recipe in recipeStore.displayRecipes" 
          :key="recipe.id" 
          class="recipe-card"
          @click="goToRecipe(recipe.documentId || recipe.id)"
        >
          <div class="recipe-image">
            <!-- Placeholder if no image, using a cool gradient -->
            <div class="placeholder-img" :style="{ background: getGradient(recipe.id) }">
              <span class="img-icon">🥘</span>
            </div>
          </div>
          <div class="recipe-info">
            <h3 class="recipe-title">{{ recipe.title }}</h3>
            <p class="recipe-desc">{{ truncate(recipe.description, 100) }}</p>
            
            <!-- Ingrédients possession/manque details -->
            <div 
              v-if="recipeStore.selectedIngredients.length > 0" 
              class="recipe-card-ingredients"
              @click.stop
            >
              <div class="ing-header">
                <span class="ing-header-title">Ingrédients (Frigo) :</span>
                <span class="ing-stats">
                  {{ getOwnedIngredientsCount(recipe) }} / {{ recipe.ingredients?.length || 0 }} ok
                </span>
              </div>
              <div class="ing-pills-container">
                <template v-for="ing in recipe.ingredients" :key="ing.ingredient?.nom || ing.nom || ing.name">
                  <span 
                    v-if="ing.ingredient?.nom || ing.nom || ing.name"
                    class="ing-status-pill clickable"
                    :class="isIngredientOwned(ing.ingredient?.nom || ing.nom || ing.name) ? 'owned' : 'missing'"
                    @click.stop="addIngredientFromCard(ing.ingredient?.nom || ing.nom || ing.name)"
                    title="Ajouter à mon frigo"
                  >
                    <span class="pill-dot"></span>
                    {{ ing.ingredient?.nom || ing.nom || ing.name }}
                    <span class="ing-qty" v-if="ing.valeur || ing.quantity">
                      {{ ing.valeur ?? ing.quantity }} {{ ing.unite ?? ing.unit }}
                    </span>
                  </span>
                </template>
              </div>
            </div>
            
            <div class="recipe-meta">
              <div class="meta-item">
                <span>⏱️ {{ formatTime(recipe.prepTime + recipe.cookTime) }}</span>
              </div>
              <div class="meta-item">
                <span>🍽️ {{ recipe.servings }} portions</span>
              </div>
              <div class="meta-item author">
                <span>👤 {{ recipe.author || 'Anonyme' }}</span>
              </div>
            </div>
            
            <div class="recipe-tags">
              <span v-for="tag in recipe.tags.slice(0, 3)" :key="tag" class="tag">{{ tag }}</span>
              <span v-if="recipe.tags.length > 3" class="tag more">+{{ recipe.tags.length - 3 }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRecipeStore } from '@/stores/recipe'

const router = useRouter()
const recipeStore = useRecipeStore()

const sortOption = ref('title-asc')
const isAdvancedOpen = ref(false)

const includeSearchInput = ref('')
const excludeSearchInput = ref('')

const toggleAdvanced = () => {
  isAdvancedOpen.value = !isAdvancedOpen.value
}

const allIngredientsList = ref<string[]>([])
let bypassNextFetch = false

const fetchAllIngredients = async () => {
  try {
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/ingredients?pagination[limit]=1000`)
    const data = await res.json()
    if (data && data.data) {
      allIngredientsList.value = data.data.map((item: any) => {
        const name = item.nom || item.name || ''
        return name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase()
      }).filter(Boolean)
    }
  } catch (err) {
    console.error('Error fetching all ingredients:', err)
  }
}

const availableIngredientsList = computed(() => {
  if (allIngredientsList.value.length > 0) {
    return allIngredientsList.value
  }
  return recipeStore.allAvailableIngredients
})

const matchingIncludeIngredients = computed(() => {
  const query = includeSearchInput.value.trim().toLowerCase()
  const list = availableIngredientsList.value
  
  if (!query) {
    const popular = ['Tomate', 'Pâtes', 'Œuf', 'Farine', 'Beurre', 'Oignon', 'Ail', 'Poulet', 'Lait', 'Sucre', 'Sel', 'Pomme de terre']
    const foundPopular = list.filter(item => popular.includes(item))
    if (foundPopular.length >= 6) {
      return [...new Set([...foundPopular, ...list])].slice(0, 12)
    }
    return list.slice(0, 12)
  }
  
  return list.filter(item => item.toLowerCase().includes(query)).slice(0, 12)
})

const matchingExcludeIngredients = computed(() => {
  const query = excludeSearchInput.value.trim().toLowerCase()
  const list = availableIngredientsList.value
  
  if (!query) {
    const allergens = ['Lait', 'Œuf', 'Gluten', 'Arachide', 'Crevette', 'Farine', 'Porc', 'Sucre', 'Beurre']
    const foundAllergens = list.filter(item => allergens.includes(item))
    if (foundAllergens.length >= 4) {
      return [...new Set([...foundAllergens, ...list])].slice(0, 12)
    }
    return list.slice(0, 12)
  }
  
  return list.filter(item => item.toLowerCase().includes(query)).slice(0, 12)
})

const fetchFilteredRecipes = async () => {
  recipeStore.setLoading(true)
  try {
    const filters: any = {}
    
    if (recipeStore.selectedIngredients.length > 0) {
      filters.ingredients = {
        ingredient: {
          nom: {
            $in: recipeStore.selectedIngredients
          }
        }
      }
    }
    
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters })
    })
    const data = await res.json()
    
    if (data && data.data) {
      const formatted = data.data.map((item: any) => ({
        id: item.documentId || item.id,
        documentId: item.documentId,
        title: item.titre,
        description: item.description,
        ingredients: item.ingredients || [],
        steps: item.etapes || [],
        prepTime: item.etapes?.reduce((acc: number, e: any) => acc + (e.temps?.preparation_min || 0), 0) || 0,
        cookTime: item.etapes?.reduce((acc: number, e: any) => acc + (e.temps?.cuisson_min || 0), 0) || 0,
        servings: item.portions || 1,
        difficulty: 'moyen',
        tags: item.categories?.map((c: any) => c.nom) || [],
        isFavorite: false,
        author: item.author?.username || null
      }))
      recipeStore.setRecipes(formatted)
    }
  } catch (err: any) {
    recipeStore.setError(err.message)
  } finally {
    recipeStore.setLoading(false)
  }
}

const addTypedIngredient = (type: 'include' | 'exclude') => {
  if (type === 'include') {
    const name = includeSearchInput.value.trim()
    if (name) {
      const formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
      recipeStore.removeExcludedIngredient(formatted)
      if (!recipeStore.selectedIngredients.includes(formatted)) {
        recipeStore.toggleIngredientFilter(formatted)
      }
      includeSearchInput.value = ''
    }
  } else {
    const name = excludeSearchInput.value.trim()
    if (name) {
      const formatted = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
      recipeStore.removeIngredientFilter(formatted)
      if (!recipeStore.excludedIngredients.includes(formatted)) {
        recipeStore.toggleExcludedIngredient(formatted)
      }
      excludeSearchInput.value = ''
    }
  }
}

const onIngredientChipClick = (ing: string, type: 'include' | 'exclude') => {
  if (type === 'include') {
    recipeStore.removeExcludedIngredient(ing)
    recipeStore.toggleIngredientFilter(ing)
  } else {
    recipeStore.removeIngredientFilter(ing)
    recipeStore.toggleExcludedIngredient(ing)
  }
}

const addIngredientFromCard = (name: string) => {
  bypassNextFetch = true
  const formatted = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase()
  recipeStore.removeExcludedIngredient(formatted)
  if (!recipeStore.selectedIngredients.includes(formatted)) {
    recipeStore.toggleIngredientFilter(formatted)
  }
}

const applySort = () => {
  if (sortOption.value === 'closest-ingredients') {
    recipeStore.setSort('closest-ingredients', 'asc')
  } else {
    const [key, order] = sortOption.value.split('-')
    recipeStore.setSort(key as 'title' | 'prepTime', order as 'asc' | 'desc')
  }
}

const isIngredientOwned = (nom: string | undefined) => {
  if (!nom) return false
  const target = nom.toLowerCase().trim()
  return recipeStore.selectedIngredients.some(
    selected => selected && selected.toLowerCase().trim() === target
  )
}

const getOwnedIngredientsCount = (recipe: any) => {
  if (!recipe.ingredients) return 0
  return recipe.ingredients.filter((ing: any) => {
    const name = ing.ingredient?.nom || ing.nom || ing.name
    return isIngredientOwned(name)
  }).length
}

// Auto-adjust sort option when fridge ingredients change and run API queries
watch(() => recipeStore.selectedIngredients, (newVal) => {
  if (newVal.length > 0) {
    if (sortOption.value !== 'closest-ingredients') {
      sortOption.value = 'closest-ingredients'
      applySort()
    }
  } else {
    if (sortOption.value === 'closest-ingredients') {
      sortOption.value = 'title-asc'
      applySort()
    }
  }

  if (bypassNextFetch) {
    bypassNextFetch = false
  } else {
    fetchFilteredRecipes()
  }
}, { deep: true })

watch(() => recipeStore.excludedIngredients, () => {
  fetchFilteredRecipes()
}, { deep: true })

const goToRecipe = (id: string | number) => {
  router.push(`/recipe/${id}`)
}

const truncate = (text: string, length: number) => {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

const formatTime = (mins: number) => {
  if (!mins) return 'N/A'
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? mins % 60 : ''}`
  return `${mins} min`
}

const getGradient = (id: string | number) => {
  const gradients = [
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)'
  ]
  const numId = typeof id === 'string' ? id.charCodeAt(0) : id
  return gradients[numId % gradients.length]
}

onMounted(async () => {
  await fetchAllIngredients()
  await fetchFilteredRecipes()
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  padding-bottom: 40px;
}

/* Hero Section */
.hero {
  position: relative;
  padding: 60px 20px 50px;
  background: radial-gradient(circle at top right, #3b82f6 0%, #1e3a8a 100%);
  color: white;
  text-align: center;
  border-radius: 0 0 40px 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.hero-content {
  max-width: 800px;
  margin: 0 auto 30px;
  animation: fadeInDown 0.8s ease-out;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: -1px;
}

.hero-title .highlight {
  color: #fbbf24;
  text-shadow: 0 2px 10px rgba(251, 191, 36, 0.3);
}

.hero-subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
  font-weight: 300;
}

/* Search Glass Panel Layout */
.search-glass-panel {
  max-width: 900px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 25px;
  position: relative;
  z-index: 10;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
}

.search-main-row {
  display: flex;
  gap: 15px;
  align-items: center;
  width: 100%;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16px;
  padding: 5px 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.search-icon {
  font-size: 1.5rem;
  color: #64748b;
  margin-right: 15px;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 15px 0;
  font-size: 1.1rem;
  color: #1e293b;
  background: transparent;
}

.search-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sort-select {
  padding: 14px 20px;
  border-radius: 16px;
  border: none;
  background: white;
  color: #1e293b;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  font-size: 1rem;
}

/* Advanced Toggle Button */
.advanced-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 16px;
  padding: 14px 20px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.advanced-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
}

.advanced-toggle-btn.active {
  background: #fbbf24;
  color: #78350f;
  border-color: #fbbf24;
}

.filter-count {
  background: #78350f;
  color: #fbbf24;
  font-size: 0.8rem;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.advanced-toggle-btn.active .filter-count {
  background: white;
  color: #78350f;
}

.arrow-icon {
  font-size: 0.8rem;
  margin-left: 2px;
  transition: transform 0.3s;
}

/* Active Filters Row */
.active-filters-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.active-filters-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
}

.active-tags-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.active-filter-pill {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.active-filter-pill:hover {
  background: rgba(251, 191, 36, 0.3);
  transform: translateY(-1px);
}

.remove-tag {
  font-size: 1.1rem;
  font-weight: bold;
  line-height: 1;
}

.clear-all-link {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  text-decoration: underline;
  transition: color 0.2s;
}

.clear-all-link:hover {
  color: white;
}

/* Expandable Advanced Panel */
.advanced-panel {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.advanced-panel.open {
  max-height: 1200px;
  opacity: 1;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.advanced-panel-inner {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

/* Custom Ingredient Filters layout styles */
.filter-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.filter-section-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  margin: -5px 0 12px 0;
}

.tags-filter {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-tag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-tag:hover {
  background: rgba(255, 255, 255, 0.3);
}

.filter-tag.active {
  background: #fbbf24;
  color: #78350f;
  font-weight: 600;
  border-color: #fbbf24;
}

.filter-grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin-top: 10px;
}

.filter-column {
  background: rgba(255, 255, 255, 0.06);
  padding: 20px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
}

.autocomplete-search-row {
  margin-bottom: 15px;
}

/* Match mode buttons */
.match-mode-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: 12px;
}

.mode-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.mode-buttons {
  display: flex;
  gap: 8px;
}

.mode-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: white;
  padding: 8px 12px;
  font-size: 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.25s ease;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.mode-btn.active {
  background: #fbbf24;
  color: #78350f;
}

/* Pills styles */
.pills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.pill-include {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.3);
}

.pill-include:hover {
  background: rgba(52, 211, 153, 0.25);
  transform: translateY(-1px);
}

.pill-exclude {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.pill-exclude:hover {
  background: rgba(248, 113, 113, 0.25);
  transform: translateY(-1px);
}

.remove-icon {
  font-size: 1.1rem;
  line-height: 1;
}

/* Active filters specific pill styles */
.active-filter-pill.pill-cat {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.3);
}

.active-filter-pill.pill-inc {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.35);
}

.active-filter-pill.pill-exc {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.35);
}

.mode-indicator {
  font-size: 0.75rem;
  background: #10b981;
  color: white;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 2px;
}

/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Grid */
.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
}

/* Recipe Card */
.recipe-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 20px rgba(0,0,0,0.03);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  position: relative;
  top: 0;
}

.recipe-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
}

.recipe-image {
  height: 200px;
  width: 100%;
  overflow: hidden;
}

.placeholder-img {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
}

.recipe-info {
  padding: 25px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.recipe-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 10px 0;
  line-height: 1.3;
}

.recipe-desc {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 20px;
  flex: 1;
}

.recipe-meta {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f1f5f9;
}

.meta-item {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  color: #475569;
  font-weight: 500;
}
.meta-item.author {
  color: #3b82f6;
  font-weight: 600;
}

.recipe-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: #f1f5f9;
  color: #3b82f6;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.tag.more {
  background: #e2e8f0;
  color: #64748b;
}

/* Skeletons */
.skeleton {
  pointer-events: none;
}
.skeleton-img {
  height: 200px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}
.skeleton-text {
  height: 20px;
  background: #f1f5f9;
  margin-bottom: 15px;
  border-radius: 4px;
}
.skeleton-text.title { width: 70%; height: 28px; }
.skeleton-text.desc { width: 100%; height: 60px; }
.skeleton-tags { display: flex; gap: 10px; }
.skeleton-tag { width: 60px; height: 24px; border-radius: 8px; background: #f1f5f9; }

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.clear-btn {
  margin-top: 20px;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.clear-btn:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .hero { padding: 40px 15px 30px; }
  .hero-title { font-size: 2.5rem; }
  .search-glass-panel { padding: 15px; border-radius: 20px; }
  .search-main-row { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sort-select { width: 100%; }
  .advanced-toggle-btn { width: 100%; justify-content: center; }
  .active-filters-row { flex-direction: column; align-items: flex-start; gap: 8px; }
  .main-content { padding-top: 10px; }
  .filter-grid-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  .advanced-panel.open {
    max-height: 1500px;
  }
}

/* Ingredients Owned vs Missing styling in recipe cards */
.recipe-card-ingredients {
  margin-top: 5px;
  margin-bottom: 15px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
  transition: all 0.2s ease-in-out;
}

.ing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ing-header-title {
  font-weight: 750;
  color: #475569;
  font-size: 0.8rem;
  letter-spacing: -0.1px;
}

.ing-stats {
  font-size: 0.72rem;
  font-weight: 800;
  background: #cbd5e1;
  color: #1e293b;
  padding: 2px 8px;
  border-radius: 20px;
}

.ing-pills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ing-status-pill {
  font-size: 0.72rem;
  font-weight: 650;
  padding: 3px 8px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.ing-status-pill.owned {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.ing-status-pill.owned .pill-dot {
  width: 5px;
  height: 5px;
  background: #10b981;
  border-radius: 50%;
}

.ing-status-pill.missing {
  background: #fef2f2;
  color: #991b1b;
  border: 1px dashed #fca5a5;
}

.ing-status-pill.missing .pill-dot {
  width: 5px;
  height: 5px;
  background: #ef4444;
  border-radius: 50%;
}

.ing-qty {
  opacity: 0.65;
  font-size: 0.68rem;
  margin-left: 2px;
}

/* Interactive click states on card pills */
.ing-status-pill.clickable {
  cursor: pointer;
  user-select: none;
}
.ing-status-pill.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}
.ing-status-pill.clickable:active {
  transform: scale(0.95);
}

/* Beautiful Ingredient chips selector styles */
.ingredient-search-row {
  margin-bottom: 12px;
}

.ingredient-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.ingredient-search-input {
  width: 100%;
  padding: 10px 40px 10px 14px;
  border: 1.5px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 0.95rem;
  transition: all 0.25s ease;
  background: white;
  color: #1e293b;
}

.ingredient-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.chip-add-btn {
  position: absolute;
  right: 10px;
  background: #3b82f6;
  color: white;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
}

.chip-add-btn:hover {
  background: #2563eb;
  transform: scale(1.08);
}

.ingredient-chips-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 18px;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 5px;
}

.ingredient-chips-selector::-webkit-scrollbar {
  width: 4px;
}

.ingredient-chips-selector::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 4px;
}

.ingredient-selector-chip {
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ingredient-selector-chip:hover {
  background: #cbd5e1;
  color: #1e293b;
  transform: translateY(-1px);
}

.ingredient-selector-chip.active-include {
  background: #ecfdf5;
  color: #065f46;
  border-color: #a7f3d0;
}

.ingredient-selector-chip.active-include:hover {
  background: #a7f3d0;
}

.ingredient-selector-chip.active-exclude {
  background: #fef2f2;
  color: #991b1b;
  border-color: #fca5a5;
}

.ingredient-selector-chip.active-exclude:hover {
  background: #fca5a5;
}

.chip-icon {
  font-size: 0.72rem;
  opacity: 0.7;
}
</style>
