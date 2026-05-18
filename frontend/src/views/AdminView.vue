<template>
  <div class="admin-page">
    <!-- Success Toast Notification -->
    <Transition name="fade">
      <div v-if="successMessage" class="success-toast">
        <span class="toast-icon">✨</span>
        <p>{{ successMessage }}</p>
        <button @click="successMessage = null" class="toast-close">✕</button>
      </div>
    </Transition>
    <div class="admin-header">
      <div class="header-overlay"></div>
      <div class="header-content">
        <span class="admin-badge">Espace Administrateur</span>
        <h1 class="literata-title">Gestion de la Base Culinaire</h1>
        <p class="admin-subtitle">
          Analysez et fusionnez les ingrédients ou le matériel pour éliminer les doublons, corriger les fautes d'orthographe et uniformiser toutes les recettes.
        </p>
      </div>
    </div>

    <div class="admin-container">
      <!-- Info Box explaining the merge -->
      <div class="info-card">
        <span class="info-icon">💡</span>
        <div class="info-body">
          <h3>Comment fonctionne le regroupement ?</h3>
          <p>
            Sélectionnez plusieurs éléments similaires (ex: "Tomate", "Tomates", "Tommate"). Cliquez sur <strong>Regrouper</strong>. 
            Vous choisirez ensuite l'étiquette finale. L'application mettra à jour automatiquement toutes les recettes concernées et supprimera les anciennes étiquettes obsolètes pour nettoyer la base.
          </p>
        </div>
      </div>

      <!-- Tab Selector -->
      <div class="tabs-container">
        <button 
          @click="activeTab = 'ingredient'" 
          :class="['tab-btn', { active: activeTab === 'ingredient' }]"
        >
          🍎 Ingrédients 
          <span class="tab-count">{{ sortedIngredients.length }}</span>
        </button>
        <button 
          @click="activeTab = 'materiel'" 
          :class="['tab-btn', { active: activeTab === 'materiel' }]"
        >
          🍳 Matériels & Équipements
          <span class="tab-count">{{ sortedMateriels.length }}</span>
        </button>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="activeTab === 'ingredient' ? 'Rechercher un ingrédient...' : 'Rechercher un matériel...'"
            class="search-input"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search-btn">✕</button>
        </div>

        <div class="filter-controls">
          <label for="sort-select" class="sort-label">Trier par :</label>
          <select id="sort-select" v-model="sortBy" class="sort-select">
            <option value="name_asc">Nom (A-Z)</option>
            <option value="name_desc">Nom (Z-A)</option>
            <option value="recipes_desc">Popularité (Décroissant)</option>
            <option value="recipes_asc">Popularité (Croissant)</option>
          </select>
        </div>
      </div>

      <!-- Loader State -->
      <div v-if="loading" class="loader-state">
        <div class="spinner"></div>
        <p>Analyse de la base de données culinaire en cours...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button @click="fetchData" class="retry-btn">Réessayer</button>
      </div>

      <!-- Main Content Tables -->
      <div v-else class="table-card">
        <!-- Ingredients Tab Table -->
        <div v-if="activeTab === 'ingredient'" class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected" 
                    @change="toggleSelectAll" 
                    class="custom-checkbox-all"
                  />
                </th>
                <th>Nom de l'ingrédient</th>
                <th>Catégorie</th>
                <th class="col-center">Recettes associées</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="ing in filteredIngredients" 
                :key="ing.documentId"
                :class="{ selected: selectedIds.includes(ing.documentId) }"
                @click="toggleSelection(ing.documentId)"
              >
                <td class="col-checkbox" @click.stop>
                  <input 
                    type="checkbox" 
                    :value="ing.documentId" 
                    v-model="selectedIds"
                    class="custom-checkbox"
                  />
                </td>
                <td class="font-bold text-primary">{{ ing.nom }}</td>
                <td>
                  <span class="category-badge">{{ ing.categorie || 'Non catégorisé' }}</span>
                </td>
                <td class="col-center font-bold">
                  <span :class="['recipe-count-badge', { empty: ing.recipeCount === 0 }]">
                    {{ ing.recipeCount }} {{ ing.recipeCount > 1 ? 'recettes' : 'recette' }}
                  </span>
                </td>
                <td class="col-actions" @click.stop>
                  <div class="actions-wrapper">
                    <router-link 
                      :to="`/admin/edit/ingredient/${ing.documentId}`" 
                      class="action-btn-edit"
                      title="Modifier cet ingrédient"
                    >
                      📝 Modifier
                    </router-link>
                    <button 
                      @click="initSingleMerge(ing)" 
                      class="action-btn-merge"
                      :disabled="ing.recipeCount === 0"
                      title="Fusionner cet ingrédient dans un autre"
                    >
                      🔗 Fusionner
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredIngredients.length === 0">
                <td colspan="5" class="empty-row">Aucun ingrédient trouvé pour cette recherche.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Equipment Tab Table -->
        <div v-if="activeTab === 'materiel'" class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-checkbox">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected" 
                    @change="toggleSelectAll" 
                    class="custom-checkbox-all"
                  />
                </th>
                <th>Nom du matériel</th>
                <th class="col-center">Recettes associées</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="mat in filteredMateriels" 
                :key="mat.documentId"
                :class="{ selected: selectedIds.includes(mat.documentId) }"
                @click="toggleSelection(mat.documentId)"
              >
                <td class="col-checkbox" @click.stop>
                  <input 
                    type="checkbox" 
                    :value="mat.documentId" 
                    v-model="selectedIds"
                    class="custom-checkbox"
                  />
                </td>
                <td class="font-bold text-primary">{{ mat.nom }}</td>
                <td class="col-center font-bold">
                  <span :class="['recipe-count-badge', { empty: mat.recipeCount === 0 }]">
                    {{ mat.recipeCount }} {{ mat.recipeCount > 1 ? 'recettes' : 'recette' }}
                  </span>
                </td>
                <td class="col-actions" @click.stop>
                  <div class="actions-wrapper">
                    <router-link 
                      :to="`/admin/edit/materiel/${mat.documentId}`" 
                      class="action-btn-edit"
                      title="Modifier ce matériel"
                    >
                      📝 Modifier
                    </router-link>
                    <button 
                      @click="initSingleMerge(mat)" 
                      class="action-btn-merge"
                      :disabled="mat.recipeCount === 0"
                      title="Fusionner ce matériel dans un autre"
                    >
                      🔗 Fusionner
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredMateriels.length === 0">
                <td colspan="4" class="empty-row">Aucun matériel trouvé pour cette recherche.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Bulk Action Sticky Bottom Drawer -->
    <div :class="['bulk-drawer', { show: selectedIds.length >= 2 }]">
      <div class="drawer-content">
        <div class="drawer-info">
          <span class="selection-count">{{ selectedIds.length }}</span>
          <span class="selection-label">éléments sélectionnés pour regroupement</span>
        </div>
        <div class="drawer-actions">
          <button @click="clearSelection" class="btn-cancel-drawer">Annuler</button>
          <button @click="openMergeModal" class="btn-merge-drawer">
            🤝 Regrouper (Fusionner)
          </button>
        </div>
      </div>
    </div>

    <!-- Glassmorphic Merge Modal -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h2>Regroupement & Fusion</h2>
          <button @click="closeMergeModal" class="modal-close-btn">✕</button>
        </div>

        <div class="modal-body">
          <div class="warning-alert">
            <span class="warning-icon">🚨</span>
            <p>
              Cette opération modifiera <strong>définitivement</strong> la base de données. Toutes les recettes faisant référence aux étiquettes obsolètes seront réaffectées vers l'étiquette cible choisie ci-dessous.
            </p>
          </div>

          <p class="modal-instruction">
            Choisissez l'étiquette de nom correcte qui sera utilisée dans toutes les recettes :
          </p>

          <div class="target-options-list">
            <label 
              v-for="item in itemsToMerge" 
              :key="item.documentId" 
              :class="['target-option-label', { selected: targetId === item.documentId }]"
            >
              <input 
                type="radio" 
                :value="item.documentId" 
                v-model="targetId"
                class="target-radio"
              />
              <div class="option-details">
                <span class="option-name">{{ item.nom }}</span>
                <span class="option-sub">
                  {{ item.recipeCount }} recettes - {{ activeTab === 'ingredient' ? (item.categorie || 'Autres') : 'Matériel' }}
                </span>
              </div>
            </label>
          </div>

          <div v-if="mergeError" class="modal-error">
            {{ mergeError }}
          </div>
        </div>

        <div class="modal-footer">
          <button @click="closeMergeModal" class="btn-secondary" :disabled="merging">
            Annuler
          </button>
          <button @click="executeMerge" class="btn-primary-merge" :disabled="!targetId || merging">
            <span v-if="merging" class="spinner-small"></span>
            <span v-else>Confirmer la fusion de {{ itemsToMerge.length }} éléments</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const successMessage = ref<string | null>(null)

// State
const activeTab = ref<'ingredient' | 'materiel'>('ingredient')
const searchQuery = ref('')
const sortBy = ref('name_asc')
const loading = ref(false)
const error = ref<string | null>(null)

// Data arrays from Strapi
const rawIngredients = ref<any[]>([])
const rawMateriels = ref<any[]>([])
const rawRecipes = ref<any[]>([])

// Selection
const selectedIds = ref<string[]>([])

// Modal / Merging State
const showModal = ref(false)
const itemsToMerge = ref<any[]>([])
const targetId = ref<string>('')
const merging = ref(false)
const mergeError = ref<string | null>(null)

// Verify admin status on mount
onMounted(() => {
  // Check for success message in query params
  if (route.query.successMsg) {
    successMessage.value = route.query.successMsg as string
    // Clear query parameter so it doesn't linger on F5
    router.replace({ query: {} })
    // Dismiss after 4s
    setTimeout(() => {
      successMessage.value = null
    }, 4000)
  }

  const isSuperAdmin = 
    userStore.currentUser?.role === 'Super Admin' || 
    (userStore.currentUser as any)?.roles?.some((r: any) => r.name === 'Super Admin' || r.code === 'strapi-super-admin')

  if (!userStore.isAuthenticated || !isSuperAdmin) {
    router.push('/')
  } else {
    fetchData()
  }
})

// Clear selection when changing tabs
watch(activeTab, () => {
  selectedIds.value = []
  searchQuery.value = ''
})

// Helper function to fetch all pages of a resource from Strapi
async function fetchAllPages(baseUrl: string, headers: Record<string, string>) {
  let allData: any[] = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount) {
    const separator = baseUrl.includes('?') ? '&' : '?'
    const url = `${baseUrl}${separator}pagination[page]=${page}&pagination[pageSize]=100`

    const res = await fetch(url, { headers })
    if (!res.ok) {
      throw new Error(`Erreur HTTP: ${res.status} lors de la requête à ${url}`)
    }

    const json = await res.json()
    if (json.data) {
      allData = allData.concat(json.data)
    }

    if (json.meta && json.meta.pagination) {
      pageCount = json.meta.pagination.pageCount
    } else {
      break
    }
    page++
  }

  return allData
}

// Fetch all necessary data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`
    }

    const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'

    // Fetch recipes with populated relationships to count associations
    rawRecipes.value = await fetchAllPages(
      `${strapiUrl}/api/recettes?populate[0]=ingredients.ingredient&populate[1]=materiel_global&populate[2]=etapes.materiel_utilise.materiel`,
      headers
    )

    // Fetch ingredients
    rawIngredients.value = await fetchAllPages(`${strapiUrl}/api/ingredients`, headers)

    // Fetch materials
    rawMateriels.value = await fetchAllPages(`${strapiUrl}/api/materiels`, headers)

  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'Une erreur est survenue lors de la récupération des données.'
  } finally {
    loading.value = false
  }
}

// Computations: Ingredient details with dynamic counts
const sortedIngredients = computed(() => {
  return rawIngredients.value.map(ing => {
    // Count recipes referencing this ingredient
    const count = rawRecipes.value.filter(recipe => {
      if (!recipe.ingredients) return false
      return recipe.ingredients.some((ri: any) => ri.ingredient?.documentId === ing.documentId)
    }).length

    return {
      ...ing,
      recipeCount: count
    }
  })
})

// Computations: Equipment details with dynamic counts
const sortedMateriels = computed(() => {
  return rawMateriels.value.map(mat => {
    // Count recipes referencing this equipment in global list or inside steps
    const count = rawRecipes.value.filter(recipe => {
      // 1. Check global equipment
      const inGlobal = recipe.materiel_global?.some((m: any) => m.documentId === mat.documentId)
      if (inGlobal) return true

      // 2. Check steps equipment
      if (recipe.etapes) {
        return recipe.etapes.some((etape: any) => {
          if (!etape.materiel_utilise) return false
          return etape.materiel_utilise.some((mu: any) => mu.materiel?.documentId === mat.documentId)
        })
      }

      return false
    }).length

    return {
      ...mat,
      recipeCount: count
    }
  })
})

// Filtered and sorted ingredients list
const filteredIngredients = computed(() => {
  let list = sortedIngredients.value

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(ing => ing.nom.toLowerCase().includes(q))
  }

  // Sort
  return [...list].sort((a, b) => {
    if (sortBy.value === 'name_asc') return a.nom.localeCompare(b.nom)
    if (sortBy.value === 'name_desc') return b.nom.localeCompare(a.nom)
    if (sortBy.value === 'recipes_desc') return b.recipeCount - a.recipeCount
    if (sortBy.value === 'recipes_asc') return a.recipeCount - b.recipeCount
    return 0
  })
})

// Filtered and sorted materials list
const filteredMateriels = computed(() => {
  let list = sortedMateriels.value

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(mat => mat.nom.toLowerCase().includes(q))
  }

  // Sort
  return [...list].sort((a, b) => {
    if (sortBy.value === 'name_asc') return a.nom.localeCompare(b.nom)
    if (sortBy.value === 'name_desc') return b.nom.localeCompare(a.nom)
    if (sortBy.value === 'recipes_desc') return b.recipeCount - a.recipeCount
    if (sortBy.value === 'recipes_asc') return a.recipeCount - b.recipeCount
    return 0
  })
})

// Table checkboxes controls
const isAllSelected = computed(() => {
  const currentList = activeTab.value === 'ingredient' ? filteredIngredients.value : filteredMateriels.value
  if (currentList.length === 0) return false
  return currentList.every(item => selectedIds.value.includes(item.documentId))
})

function toggleSelection(docId: string) {
  const index = selectedIds.value.indexOf(docId)
  if (index === -1) {
    selectedIds.value.push(docId)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

function toggleSelectAll() {
  const currentList = activeTab.value === 'ingredient' ? filteredIngredients.value : filteredMateriels.value
  if (isAllSelected.value) {
    // Unselect all in current view
    const listIds = currentList.map(item => item.documentId)
    selectedIds.value = selectedIds.value.filter(id => !listIds.includes(id))
  } else {
    // Select all in current view
    currentList.forEach(item => {
      if (!selectedIds.value.includes(item.documentId)) {
        selectedIds.value.push(item.documentId)
      }
    })
  }
}

function clearSelection() {
  selectedIds.value = []
}

// Single Action: Init single item merge
function initSingleMerge(item: any) {
  // To merge a single item, we want to allow merging it with any other item in the list
  // Let's populate selectedIds with this item, and open the modal which will let them choose a target from all items
  // Wait, if it's a single item, we can allow the user to select another item in the main list first.
  // So the best experience is to show a tooltip/alert to tell them to select another item!
  // Alternatively, if they click merge on a single item, we can automatically select it, filter the search to its name,
  // and ask them to select another one. Let's make the selection drawer pop up:
  if (!selectedIds.value.includes(item.documentId)) {
    selectedIds.value.push(item.documentId)
  }
  // Show an alert or tip
  alert(`Sélectionné: "${item.nom}". Veuillez maintenant cocher la case d'un ou plusieurs autres éléments similaires dans la liste pour les regrouper.`)
}

// Bulk Actions: Open glassmorphic merge modal
function openMergeModal() {
  if (selectedIds.value.length < 2) return

  const list = activeTab.value === 'ingredient' ? sortedIngredients.value : sortedMateriels.value
  itemsToMerge.value = list.filter(item => selectedIds.value.includes(item.documentId))
  
  // Suggest the target to keep: default to the one with the highest recipe count!
  const sortedByPopularity = [...itemsToMerge.value].sort((a, b) => b.recipeCount - a.recipeCount)
  targetId.value = sortedByPopularity[0]?.documentId || ''
  
  mergeError.value = null
  showModal.value = true
}

function closeMergeModal() {
  if (merging.value) return
  showModal.value = false
  itemsToMerge.value = []
  targetId.value = ''
  mergeError.value = null
}

// Execute Merge API Request
async function executeMerge() {
  if (!targetId.value || merging.value) return
  merging.value = true
  mergeError.value = null

  try {
    const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'
    const token = userStore.token

    if (!token) throw new Error("Vous devez être connecté.")

    const response = await fetch(`${strapiUrl}/api/recettes/admin/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: activeTab.value,
        toBeMergedDocIds: selectedIds.value,
        targetDocId: targetId.value
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || "Une erreur est survenue lors de la fusion.")
    }

    // Success!
    alert(
      `Fusion réussie ! \n` +
      `- Ingrédient/Matériel cible : ${itemsToMerge.value.find(i => i.documentId === targetId.value)?.nom}\n` +
      `- Recettes mises à jour : ${result.updatedRecipesCount}\n` +
      `- Doublons supprimés : ${result.deletedItemsCount}`
    )

    // Reset selection and close modal
    selectedIds.value = []
    showModal.value = false
    
    // Refresh all data
    await fetchData()

  } catch (err: any) {
    console.error(err)
    mergeError.value = err.message || "Impossible de réaliser la fusion."
  } finally {
    merging.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600;7..72,700;7..72,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

.admin-page {
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #1a202c;
  background-color: #f7fafc;
  min-height: 100vh;
  padding-bottom: 120px; /* Space for bulk drawer */
}

/* Premium Header Banner */
.admin-header {
  background: url('https://images.unsplash.com/photo-1543007630-9710e4a00a20?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80') center/cover no-repeat;
  height: 280px;
  position: relative;
  display: flex;
  align-items: center;
  color: white;
  margin-bottom: 30px;
}

.header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(133, 83, 0, 0.85), rgba(26, 28, 28, 0.9));
  backdrop-filter: blur(2px);
}

.header-content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 30px;
}

.admin-badge {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fbd38d;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 6px 14px;
  border-radius: 9999px;
  display: inline-block;
  margin-bottom: 15px;
}

.literata-title {
  font-family: 'Literata', serif;
  font-size: 2.75rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.admin-subtitle {
  font-size: 1.1rem;
  color: #e2e8f0;
  max-width: 750px;
  line-height: 1.5;
  margin: 0;
}

.admin-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* Info Box */
.info-card {
  background: #ebf8ff;
  border-left: 5px solid #3182ce;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  display: flex;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.info-icon {
  font-size: 1.75rem;
}

.info-body h3 {
  margin: 0 0 4px 0;
  color: #2b6cb0;
  font-size: 1.05rem;
  font-weight: 700;
}

.info-body p {
  margin: 0;
  color: #2d3748;
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Tabs Container */
.tabs-container {
  display: flex;
  gap: 15px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 2px;
  margin-bottom: 25px;
}

.tab-btn {
  background: none;
  border: none;
  padding: 12px 24px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #718096;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
  margin-bottom: -2px;
}

.tab-btn:hover {
  color: #855300;
}

.tab-btn.active {
  color: #855300;
  border-bottom-color: #855300;
}

.tab-count {
  font-size: 0.8rem;
  background: #edf2f7;
  color: #4a5568;
  padding: 2px 10px;
  border-radius: 9999px;
  font-weight: 600;
  transition: all 0.2s;
}

.tab-btn.active .tab-count {
  background: #fffbeb;
  color: #855300;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.search-wrapper {
  position: relative;
  flex: 1;
  max-width: 500px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 16px;
  font-size: 1.1rem;
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 48px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 12px;
  font-size: 0.95rem;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.search-input:focus {
  outline: none;
  border-color: #855300;
  box-shadow: 0 0 0 3px rgba(133, 83, 0, 0.15);
}

.clear-search-btn {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
}

.clear-search-btn:hover {
  color: #4a5568;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
}

.sort-select {
  padding: 10px 16px;
  background: white;
  border: 1px solid #cbd5e0;
  border-radius: 12px;
  font-size: 0.9rem;
  font-family: inherit;
  font-weight: 600;
  color: #2d3748;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-select:focus {
  outline: none;
  border-color: #855300;
}

/* Loading & Error States */
.loader-state, .error-state {
  text-align: center;
  padding: 60px 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  border: 1px solid #e2e8f0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(133, 83, 0, 0.1);
  border-top-color: #855300;
  border-radius: 50%;
  margin: 0 auto 20px auto;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  display: block;
}

.retry-btn {
  background: #855300;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #613b00;
}

/* Main Data Table */
.table-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.admin-table th {
  background: #f7fafc;
  padding: 16px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #718096;
  border-bottom: 1px solid #e2e8f0;
  letter-spacing: 0.05em;
}

.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid #edf2f7;
  font-size: 0.95rem;
  transition: all 0.15s;
}

.admin-table tr {
  cursor: pointer;
  transition: all 0.2s;
}

.admin-table tr:hover {
  background-color: #fbfbfb;
}

.admin-table tr.selected {
  background-color: #fffbeb;
}

.col-checkbox {
  width: 50px;
  text-align: center;
}

.custom-checkbox, .custom-checkbox-all {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #855300;
}

.font-bold {
  font-weight: 700;
}

.text-primary {
  color: #2d3748;
}

.category-badge {
  background: #edf2f7;
  color: #4a5568;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.col-center {
  text-align: center;
  width: 200px;
}

.recipe-count-badge {
  background: #e6fffa;
  color: #234e52;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 700;
  display: inline-block;
}

.recipe-count-badge.empty {
  background: #fee2e2;
  color: #9b2c2c;
}

.col-actions {
  text-align: right;
  width: 260px;
}

.actions-wrapper {
  display: inline-flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn-edit {
  background: white;
  border: 1px solid #cbd5e0;
  color: #4a5568;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  text-decoration: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.action-btn-edit:hover {
  background: #f7fafc;
  border-color: #a0aec0;
  color: #2d3748;
}

.action-btn-merge {
  background: white;
  border: 1px solid #d8c3ad;
  color: #855300;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.action-btn-merge:hover:not(:disabled) {
  background: #fffbeb;
  border-color: #855300;
}

.action-btn-merge:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Success Toast Notification */
.success-toast {
  position: fixed;
  top: 30px;
  right: 30px;
  background: rgba(16, 185, 129, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 16px 24px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  max-width: 400px;
}

.toast-icon {
  font-size: 1.25rem;
}

.success-toast p {
  margin: 0;
  font-weight: 600;
  font-size: 0.95rem;
}

.toast-close {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
  opacity: 0.8;
  margin-left: auto;
}

.toast-close:hover {
  opacity: 1;
}

/* Fade transition */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.empty-row {
  text-align: center;
  color: #a0aec0;
  padding: 40px !important;
  font-style: italic;
}

/* Bulk Drawer */
.bulk-drawer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 -10px 25px rgba(0,0,0,0.08);
  padding: 20px 0;
  z-index: 999;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.bulk-drawer.show {
  transform: translateY(0);
}

.drawer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.selection-count {
  background: #855300;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1rem;
}

.selection-label {
  font-weight: 700;
  font-size: 1.05rem;
  color: #1a202c;
}

.drawer-actions {
  display: flex;
  gap: 15px;
}

.btn-cancel-drawer {
  background: transparent;
  border: 1px solid #cbd5e0;
  color: #4a5568;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-drawer:hover {
  background: #edf2f7;
}

.btn-merge-drawer {
  background: linear-gradient(135deg, #855300, #f59e0b);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(133, 83, 0, 0.25);
  transition: all 0.2s;
}

.btn-merge-drawer:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(133, 83, 0, 0.35);
}

/* Glassmorphic Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(26, 28, 28, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  padding: 20px 30px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  font-family: 'Literata', serif;
  margin: 0;
  font-size: 1.5rem;
  color: #2a1700;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #a0aec0;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-close-btn:hover {
  color: #4a5568;
}

.modal-body {
  padding: 30px;
  max-height: 60vh;
  overflow-y: auto;
}

.warning-alert {
  background: #fff5f5;
  border-left: 4px solid #f56565;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.warning-icon {
  font-size: 1.25rem;
}

.warning-alert p {
  margin: 0;
  color: #9b2c2c;
  font-size: 0.9rem;
  line-height: 1.4;
  font-weight: 500;
}

.modal-instruction {
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #2d3748;
}

.target-options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.target-option-label {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
}

.target-option-label:hover {
  border-color: #cbd5e0;
  background: #f7fafc;
}

.target-option-label.selected {
  border-color: #855300;
  background: #fffbeb;
}

.target-radio {
  width: 20px;
  height: 20px;
  accent-color: #855300;
  cursor: pointer;
}

.option-details {
  display: flex;
  flex-direction: column;
}

.option-name {
  font-weight: 700;
  font-size: 1rem;
  color: #2d3748;
}

.option-sub {
  font-size: 0.8rem;
  color: #718096;
  margin-top: 2px;
}

.modal-error {
  background: #fff5f5;
  color: #c53030;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-top: 15px;
  text-align: center;
}

.modal-footer {
  padding: 20px 30px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn-secondary {
  background: white;
  border: 1px solid #cbd5e0;
  color: #4a5568;
  padding: 12px 20px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: #edf2f7;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary-merge {
  background: linear-gradient(135deg, #855300, #f59e0b);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(133, 83, 0, 0.25);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-primary-merge:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(133, 83, 0, 0.35);
}

.btn-primary-merge:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
