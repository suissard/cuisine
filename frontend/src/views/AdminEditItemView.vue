<template>
  <div class="edit-item-container">
    <header class="edit-header animate-fade-in">
      <router-link to="/admin" class="back-link">
        <span class="arrow">←</span> Retour à l'administration
      </router-link>
      <div class="title-section">
        <span class="icon-badge">{{ type === 'ingredient' ? '🥘' : '🛠️' }}</span>
        <h1>Modifier {{ type === 'ingredient' ? "l'ingrédient" : "le matériel" }}</h1>
      </div>
      <p class="subtitle">Modifiez le libellé pour mettre à jour automatiquement toutes les recettes associées.</p>
    </header>

    <main class="main-content">
      <div v-if="isLoadingData" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement des informations...</p>
      </div>

      <div v-else-if="errorMsg" class="error-card animate-shake">
        <span class="error-icon">⚠️</span>
        <h3>Une erreur est survenue</h3>
        <p>{{ errorMsg }}</p>
        <button @click="fetchItem" class="retry-btn">Réessayer</button>
      </div>

      <div v-else class="glass-card form-wrapper animate-slide-up">
        <form @submit.prevent="saveChanges" class="edit-form">
          <!-- Nom / Libellé -->
          <div class="form-group">
            <label for="item-name">Nom / Libellé</label>
            <input
              type="text"
              id="item-name"
              v-model="formData.nom"
              required
              placeholder="Ex: Tomates cerises"
              class="form-input"
              :class="{ 'input-error': vErrors.nom }"
            />
            <span v-if="vErrors.nom" class="validation-error">{{ vErrors.nom }}</span>
          </div>

          <!-- Catégorie (Uniquement pour Ingrédients) -->
          <div v-if="type === 'ingredient'" class="form-group">
            <label for="item-category">Catégorie</label>
            <div class="select-wrapper">
              <select id="item-category" v-model="formData.categorie" class="form-select">
                <option value="">-- Sélectionner une catégorie --</option>
                <option v-for="cat in ingredientCategories" :key="cat" :value="cat">
                  {{ formatCategoryLabel(cat) }}
                </option>
              </select>
            </div>
            <p class="helper-text">Permet d'organiser les ingrédients pour les filtres de recherche.</p>
          </div>

          <!-- Alert / Warning Message -->
          <div class="info-banner">
            <span class="info-icon">ℹ️</span>
            <div class="info-content">
              <strong>Impact immédiat</strong>
              <p>La modification de ce nom s'appliquera instantanément à toutes les recettes qui l'utilisent.</p>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="form-actions">
            <router-link to="/admin" class="btn-cancel">Annuler</router-link>
            <button type="submit" class="btn-save" :disabled="isSaving">
              <span v-if="isSaving" class="spinner-small"></span>
              <span>{{ isSaving ? 'Enregistrement...' : 'Sauvegarder les modifications' }}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const type = ref<string>(route.params.type as string)
const id = ref<string>(route.params.id as string)

const isLoadingData = ref(true)
const isSaving = ref(false)
const errorMsg = ref<string | null>(null)

const formData = reactive({
  nom: '',
  categorie: ''
})

const vErrors = reactive({
  nom: ''
})

// Catégories courantes pour les ingrédients
const ingredientCategories = [
  'fruits et légumes',
  'légumes',
  'fruits',
  'crèmerie',
  'viandes',
  'poissons',
  'épicerie',
  'boulangerie',
  'condiments',
  'herbes et épices',
  'boissons',
  'autres'
]

const formatCategoryLabel = (cat: string) => {
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

const validateForm = () => {
  let isValid = true
  vErrors.nom = ''

  if (!formData.nom.trim()) {
    vErrors.nom = 'Le libellé est obligatoire.'
    isValid = false
  } else if (formData.nom.trim().length < 2) {
    vErrors.nom = 'Le libellé doit contenir au moins 2 caractères.'
    isValid = false
  }

  return isValid
}

const fetchItem = async () => {
  isLoadingData.value = true
  errorMsg.value = null
  try {
    const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'
    const endpoint = type.value === 'ingredient' ? 'ingredients' : 'materiels'
    
    const headers: HeadersInit = {}
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`
    }

    const res = await fetch(`${strapiUrl}/api/${endpoint}/${id.value}`, { headers })
    
    if (!res.ok) {
      throw new Error(`Impossible de récupérer l'élément (${res.status})`)
    }

    const resData = await res.json()
    if (resData && resData.data) {
      formData.nom = resData.data.nom || ''
      if (type.value === 'ingredient') {
        formData.categorie = resData.data.categorie || ''
      }
    } else {
      throw new Error("Format de données inconnu")
    }
  } catch (err: any) {
    console.error('Error fetching item details:', err)
    errorMsg.value = err.message || "Erreur lors de la récupération des données"
  } finally {
    isLoadingData.value = false
  }
}

const saveChanges = async () => {
  if (!validateForm()) return

  isSaving.value = true
  errorMsg.value = null
  try {
    const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'
    const endpoint = type.value === 'ingredient' ? 'ingredients' : 'materiels'
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`
    }

    const payload = {
      data: {
        nom: formData.nom.trim(),
        ...(type.value === 'ingredient' ? { categorie: formData.categorie } : {})
      }
    }

    const res = await fetch(`${strapiUrl}/api/${endpoint}/${id.value}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `Erreur serveur (${res.status})`)
    }

    // Succès ! Redirection
    router.push({
      path: '/admin',
      query: { successMsg: `L'élément a été mis à jour avec succès !` }
    })
  } catch (err: any) {
    console.error('Error saving item changes:', err)
    errorMsg.value = err.message || "Erreur lors de l'enregistrement des modifications"
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  // Garde de sécurité Super Admin
  const isSuperAdmin = 
    userStore.currentUser?.role === 'Super Admin' || 
    (userStore.currentUser as any)?.roles?.some((r: any) => r.name === 'Super Admin' || r.code === 'strapi-super-admin')

  if (!userStore.isAuthenticated || !isSuperAdmin) {
    router.push('/')
  } else {
    fetchItem()
  }
})
</script>

<style scoped>
.edit-item-container {
  min-height: 100vh;
  padding: 40px 20px;
  background: radial-gradient(circle at 10% 20%, rgba(20, 30, 48, 0.9) 0%, rgba(36, 59, 85, 0.9) 100%);
  color: #f8fafc;
}

.edit-header {
  max-width: 700px;
  margin: 0 auto 30px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 20px;
  transition: color 0.2s ease, transform 0.2s ease;
}

.back-link:hover {
  color: #3b82f6;
  transform: translateX(-4px);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.icon-badge {
  font-size: 2.2rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.title-section h1 {
  font-size: 2.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.subtitle {
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
  font-weight: 300;
}

.main-content {
  max-width: 700px;
  margin: 0 auto;
}

/* Glassmorphic Container */
.glass-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.form-wrapper {
  padding: 40px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.5px;
}

.form-input {
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  color: #f8fafc;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  background: rgba(15, 23, 42, 0.7);
}

.input-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25) !important;
}

.validation-error {
  color: #ef4444;
  font-size: 0.85rem;
  font-weight: 500;
}

.select-wrapper {
  position: relative;
}

.form-select {
  width: 100%;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  color: #f8fafc;
  font-size: 1rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  transition: all 0.3s ease;
}

.form-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

.select-wrapper::after {
  content: '▼';
  font-size: 0.75rem;
  color: #94a3b8;
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.helper-text {
  font-size: 0.82rem;
  color: #64748b;
  margin: 4px 0 0;
}

/* Warning Info Banner */
.info-banner {
  display: flex;
  gap: 15px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 16px;
  padding: 20px;
}

.info-icon {
  font-size: 1.3rem;
  line-height: 1;
}

.info-content strong {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 4px;
}

.info-content p {
  font-size: 0.88rem;
  color: #d97706;
  margin: 0;
  line-height: 1.4;
}

/* Actions Buttons */
.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 15px;
}

.btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  color: #cbd5e1;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.95rem;
  color: #ffffff;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
  transition: all 0.2s ease;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  gap: 20px;
}

.spinner {
  width: 45px;
  height: 45px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

.error-card {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 15px;
}

.error-card h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f87171;
  margin: 0 0 10px;
}

.error-card p {
  color: #fca5a5;
  margin: 0 0 20px;
}

.retry-btn {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

/* Animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeInDown 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.animate-shake {
  animation: shake 0.4s ease;
}
</style>
