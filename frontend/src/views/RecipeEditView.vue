<template>
  <div class="create-recipe-container">
    <div class="form-card">
      <header class="form-header">
        <h1>Modifier la Recette</h1>
        <p class="form-subtitle">Mettez à jour les informations de votre recette</p>
        <div class="steps-nav">
          <div v-for="s in 3" :key="s" :class="['step-dot', { active: step === s, completed: step > s }]">
            <span class="step-num">{{ s }}</span>
            <span class="step-label" v-if="s === 1">Général</span>
            <span class="step-label" v-else-if="s === 2">Ingrédients</span>
            <span class="step-label" v-else-if="s === 3">Préparation</span>
          </div>
        </div>
      </header>

      <form @submit.prevent="handleSubmit">
        <!-- Step 1: Basic Info -->
        <transition name="fade" mode="out-in">
          <div v-if="step === 1" class="form-step" key="step1">
            <h2>Informations Générales</h2>
            
            <div class="input-group">
              <label>Titre de la recette</label>
              <input v-model="form.titre" type="text" placeholder="Ex: Pâtes à la carbonara traditionnelles" required>
            </div>
            
            <div class="input-group">
              <label>Description</label>
              <textarea v-model="form.description" placeholder="Une brève introduction, l'histoire du plat ou des conseils de dégustation..."></textarea>
            </div>
            
            <div class="row">
              <div class="input-group">
                <label>Portions</label>
                <div class="number-input-wrapper">
                  <input v-model.number="form.portions" type="number" min="1" required>
                  <span class="input-unit">pers.</span>
                </div>
              </div>
              <div class="input-group">
                <label>Température de dégustation</label>
                <select v-model="form.degustation">
                  <option value="Chaud">🔥 Chaud</option>
                  <option value="Froid">❄️ Froid</option>
                  <option value="Ambiant">🌡️ Ambiant</option>
                </select>
              </div>
            </div>

            <div class="input-group">
              <label>Catégories de plat</label>
              <p class="field-hint">Sélectionnez une ou plusieurs catégories</p>
              
              <div class="category-search-wrapper">
                <input
                  v-model="categorySearch"
                  type="text"
                  placeholder="🔍 Rechercher une catégorie..."
                  class="category-search-input"
                />
              </div>

              <div class="category-badges">
                <span
                  v-for="cat in displayedCategories"
                  :key="cat"
                  :class="['cat-badge', { active: form.categories.includes(cat) }]"
                  @click="toggleCategory(cat)"
                >
                  {{ cat }}
                </span>
              </div>
            </div>
          </div>

          <!-- Step 2: Ingredients -->
          <div v-else-if="step === 2" class="form-step" key="step2">
            <div class="step-title-row">
              <h2>🛒 Ingrédients</h2>
              <span class="count-badge">{{ form.ingredients.length }}</span>
            </div>
            <p class="field-hint">Saisissez l'ingrédient, l'unité et une précision facultative. Utilisez l'autocomplétion ou créez un nouvel élément s'il n'existe pas.</p>
            
            <div class="ingredients-list">
              <transition-group name="list">
                <div v-for="(ing, idx) in form.ingredients" :key="idx" class="dynamic-row">
                  <div class="autocomplete-wrapper flex-3">
                    <AutocompleteInput
                      v-model="ing.nom"
                      remoteSearchUrl="/api/ingredients"
                      :suggestions="availableIngredients"
                      displayKey="nom"
                      placeholder="Nom de l'ingrédient"
                      @create="(val) => handleCreateIngredient(val, idx)"
                    />
                  </div>
                  <div class="flex-2">
                    <input v-model="ing.sous_type" type="text" placeholder="Précision (ex: bio, haché)">
                  </div>
                  <div class="number-input-wrapper flex-0-3">
                    <input v-model.number="ing.valeur" type="number" placeholder="Qté" class="qte-input" min="0" step="any">
                  </div>
                  <div class="autocomplete-wrapper flex-1">
                    <AutocompleteInput
                      v-model="ing.unite"
                      :suggestions="availableUnits"
                      placeholder="Unité (ex: g)"
                      :showNoResults="false"
                    />
                  </div>
                  <button type="button" @click="removeIngredient(idx)" class="btn-remove" title="Supprimer l'ingrédient">✕</button>
                </div>
              </transition-group>
            </div>
            <button type="button" @click="addIngredient" class="btn-add">+ Ajouter un ingrédient</button>
          </div>

          <!-- Step 3: Steps -->
          <div v-else-if="step === 3" class="form-step" key="step3">
            <div class="step-title-row">
              <h2>📝 Étapes de préparation</h2>
              <span class="count-badge">{{ form.etapes.length }}</span>
            </div>
            <p class="field-hint">Détaillez le déroulement de la recette. Pour chaque étape, vous pouvez renseigner les durées et lister le matériel utilisé.</p>

            <div class="steps-list">
              <div v-for="(etape, idx) in form.etapes" :key="idx" class="step-input-card">
                <div class="step-card-header">
                  <div class="step-num-label">Étape {{ idx + 1 }}</div>
                  <button type="button" @click="removeEtape(idx)" class="btn-remove-step" v-if="form.etapes.length > 1">Supprimer l'étape</button>
                </div>
                
                <div class="input-group">
                  <label>Description de l'étape</label>
                  <textarea v-model="etape.description" placeholder="Ex: Porter l'eau à ébullition dans une casserole et y plonger les pâtes..." required></textarea>
                </div>
                
                <!-- Explicit Labels for Time Inputs to prevent unspecified states -->
                <div class="step-temps-grid">
                  <div class="time-field">
                    <label>⏱️ Préparation</label>
                    <div class="input-with-unit">
                      <input v-model.number="etape.prep" type="number" placeholder="0" min="0">
                      <span class="unit-text">min</span>
                    </div>
                  </div>
                  <div class="time-field">
                    <label>🔥 Cuisson</label>
                    <div class="input-with-unit">
                      <input v-model.number="etape.cuisson" type="number" placeholder="0" min="0">
                      <span class="unit-text">min</span>
                    </div>
                  </div>
                  <div class="time-field">
                    <label>❄️ Repos</label>
                    <div class="input-with-unit">
                      <input v-model.number="etape.repos" type="number" placeholder="0" min="0">
                      <span class="unit-text">min</span>
                    </div>
                  </div>
                </div>

                <!-- NEW: Step Materials list - fully matching Strapi schema -->
                <div class="step-materials-container">
                  <label class="materials-section-title">🛠️ Matériel utilisé dans cette étape</label>
                  <div v-for="(mu, muIdx) in etape.materiel_utilise" :key="muIdx" class="step-material-row">
                    <div class="autocomplete-wrapper flex-2">
                      <AutocompleteInput
                        v-model="mu.materiel"
                        remoteSearchUrl="/api/materiels"
                        :suggestions="availableMateriels"
                        displayKey="nom"
                        placeholder="Nom du matériel (ex: Casserole)"
                        @create="(val) => handleCreateMateriel(val, idx, muIdx)"
                      />
                    </div>
                    <input v-model="mu.texte_associe" placeholder="Texte associé dans l'étape (ex: casserole)" class="flex-2 text-assoc-input">
                    <button type="button" @click="removeStepMateriel(idx, muIdx)" class="btn-remove-mini">✕</button>
                  </div>
                  <button type="button" @click="addStepMateriel(idx)" class="btn-add-material-mini">+ Ajouter un matériel à cette étape</button>
                </div>
              </div>
            </div>
            
            <button type="button" @click="addEtape" class="btn-add">+ Ajouter une étape de préparation</button>
          </div>
        </transition>

        <div class="form-footer">
          <button v-if="step > 1" type="button" @click="step--" class="btn-back">Précédent</button>
          <div></div> <!-- Spacer -->
          <button v-if="step < 3" type="button" @click="step++" class="btn-next">Suivant</button>
          <button v-else type="submit" class="btn-submit" :disabled="submitting">
            <span v-if="submitting">Enregistrement... ⏳</span>
            <span v-else>Enregistrer les modifications 💾</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import AutocompleteInput from '@/components/AutocompleteInput.vue';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const step = ref(1);
const submitting = ref(false);

const categorySearch = ref('');

const form = reactive({
  titre: '',
  description: '',
  portions: 4,
  degustation: 'Chaud',
  categories: [] as string[],
  ingredients: [{ nom: '', valeur: 0, unite: '', sous_type: '' }],
  etapes: [{ description: '', prep: 0, cuisson: 0, repos: 0, materiel_utilise: [] as Array<{ materiel: string, texte_associe: string }> }]
});

const displayedCategories = computed(() => {
  const query = categorySearch.value.trim().toLowerCase();
  const selected = form.categories;
  if (!query) {
    const nonSelected = availableCategories.value.filter(cat => !selected.includes(cat));
    return [...selected, ...nonSelected.slice(0, 12)];
  } else {
    const matching = availableCategories.value.filter(cat => 
      cat.toLowerCase().includes(query)
    );
    const matchingNonSelected = matching.filter(cat => !selected.includes(cat));
    return [...selected, ...matchingNonSelected];
  }
});

// Autocomplete databases loaded from Strapi backend
const availableIngredients = ref<Array<{ id: number, documentId: string, nom: string, categorie: string }>>([]);
const availableMateriels = ref<Array<{ id: number, documentId: string, nom: string }>>([]);
const availableCategories = ref<string[]>([]);
const availableUnits = ref<string[]>([
  'g', 'kg', 'ml', 'cl', 'l', 'cuillère(s) à soupe', 'cuillère(s) à café', 'pincée(s)', 'gousse(s)', 'filet(s)', 'sachet(s)', 'boîte(s)', 'tranche(s)', 'tasse(s)', 'verre(s)', 'pièce(s)', 'pot(s)', 'brin(s)', 'tige(s)', 'botte(s)'
]);

onMounted(async () => {
  // Authentication Guard: block non-logged in users from accessing recipe creation
  if (!userStore.isAuthenticated) {
    alert("Vous devez être connecté pour créer une recette. Redirection vers la page de connexion...");
    router.push('/auth');
    return;
  }

  try {
    // 1. Fetch ingredients list
    const ingRes = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/ingredients?sort=nom:asc&pagination[limit]=1000`);
    if (ingRes.ok) {
      const data = await ingRes.json();
      availableIngredients.value = data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        nom: item.nom,
        categorie: item.categorie || 'Autres'
      }));
    }

    // 2. Fetch materials list
    const matRes = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/materiels?sort=nom:asc&pagination[limit]=1000`);
    if (matRes.ok) {
      const data = await matRes.json();
      availableMateriels.value = data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        nom: item.nom
      }));
    }

    // 3. Fetch categories list
    const catRes = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/categorie-plats?sort=nom:asc&pagination[limit]=1000`);
    if (catRes.ok) {
      const data = await catRes.json();
      availableCategories.value = data.data.map((item: any) => item.nom);
    }

    // 4. Load existing recipe data
    const id = route.params.id;
    if (id) {
      const resRecipe = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { documentId: id },
          populate: {
            etapes: { populate: { temps: true, materiel_utilise: { populate: { materiel: true } } } },
            ingredients: { populate: { ingredient: true } },
            categories: true,
            materiel_global: true,
            difficulte: true,
            author: true
          }
        })
      });
      const dataRecipe = await resRecipe.json();
      if (dataRecipe && dataRecipe.data && dataRecipe.data.length > 0) {
        const rec = dataRecipe.data[0];
        
        // Check author
        if (!rec.author || (rec.author.username !== userStore.currentUser?.username && rec.author.id !== userStore.currentUser?.id)) {
           alert("Vous n'êtes pas l'auteur de cette recette.");
           router.push('/');
           return;
        }

        form.titre = rec.titre || '';
        form.description = rec.description || '';
        form.portions = parseInt(rec.portions) || 4;
        form.degustation = rec.degustation || 'Chaud';
        form.categories = rec.categories?.map((c: any) => c.nom) || [];
        
        if (rec.ingredients?.length > 0) {
          form.ingredients = rec.ingredients.map((ing: any) => ({
            nom: ing.ingredient?.nom || '',
            valeur: ing.valeur || 0,
            unite: ing.unite || '',
            sous_type: ing.sous_type || ''
          }));
        }

        if (rec.etapes?.length > 0) {
          form.etapes = rec.etapes.map((etape: any) => ({
            description: etape.description || '',
            prep: etape.temps?.preparation_min || 0,
            cuisson: etape.temps?.cuisson_min || 0,
            repos: etape.temps?.repos_min || 0,
            materiel_utilise: (etape.materiel_utilise || []).map((mu: any) => ({
               materiel: mu.materiel?.nom || '',
               texte_associe: mu.texte_associe || ''
            }))
          }));
        }
      } else {
         alert("Recette introuvable.");
         router.push('/');
      }
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }
});

// Category toggle
const toggleCategory = (cat: string) => {
  const index = form.categories.indexOf(cat);
  if (index === -1) {
    form.categories.push(cat);
  } else {
    form.categories.splice(index, 1);
  }
};

// Ingredients management
const addIngredient = () => form.ingredients.push({ nom: '', valeur: 0, unite: '', sous_type: '' });
const removeIngredient = (idx: number) => {
  if (form.ingredients.length > 1) {
    form.ingredients.splice(idx, 1);
  } else {
    form.ingredients[0] = { nom: '', valeur: 0, unite: '', sous_type: '' };
  }
};

// Steps management
const addEtape = () => form.etapes.push({ description: '', prep: 0, cuisson: 0, repos: 0, materiel_utilise: [] });
const removeEtape = (idx: number) => form.etapes.splice(idx, 1);

// Step materials management
const addStepMateriel = (stepIdx: number) => {
  const stepObj = form.etapes[stepIdx];
  if (stepObj) {
    if (!stepObj.materiel_utilise) {
      stepObj.materiel_utilise = [];
    }
    stepObj.materiel_utilise.push({ materiel: '', texte_associe: '' });
  }
};
const removeStepMateriel = (stepIdx: number, matIdx: number) => {
  const stepObj = form.etapes[stepIdx];
  if (stepObj && stepObj.materiel_utilise) {
    stepObj.materiel_utilise.splice(matIdx, 1);
  }
};

// On-the-fly creation of missing items on the backend database
const handleCreateIngredient = async (nom: string, idx: number) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`;
    }

    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/ingredients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          nom: nom,
          categorie: 'Autres'
        }
      })
    });
    
    if (res.ok) {
      const newItem = await res.json();
      const formattedItem = {
        id: newItem.data.id,
        documentId: newItem.data.documentId,
        nom: newItem.data.nom,
        categorie: newItem.data.categorie || 'Autres'
      };
      // Add to suggestions list so it's globally available
      availableIngredients.value.push(formattedItem);
      // Auto-select in input
      const ingObj = form.ingredients[idx];
      if (ingObj) {
        ingObj.nom = formattedItem.nom;
      }
    } else {
      console.error("Failed to create ingredient");
    }
  } catch (err) {
    console.error("Error creating ingredient dynamically:", err);
  }
};

const handleCreateMateriel = async (nom: string, stepIdx: number, matIdx: number) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`;
    }

    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/materiels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: { nom: nom }
      })
    });

    if (res.ok) {
      const newItem = await res.json();
      const formattedItem = {
        id: newItem.data.id,
        documentId: newItem.data.documentId,
        nom: newItem.data.nom
      };
      // Add to suggestions list so it's globally available
      availableMateriels.value.push(formattedItem);
      // Auto-select in input
      const stepObj = form.etapes[stepIdx];
      if (stepObj && stepObj.materiel_utilise) {
        const matObj = stepObj.materiel_utilise[matIdx];
        if (matObj) {
          matObj.materiel = formattedItem.nom;
        }
      }
    } else {
      console.error("Failed to create material");
    }
  } catch (err) {
    console.error("Error creating material dynamically:", err);
  }
};

// Full save logic communicating with Strapi API (Runtime Import endpoint)
const handleSubmit = async () => {
  if (submitting.value) return;
  submitting.value = true;

  try {
    // Format recipe to the clean format expected by our Strapi import route
    // Deduce global materials list automatically from all materials used in steps
    const globalMatsSet = new Set<string>();
    form.etapes.forEach(etape => {
      etape.materiel_utilise.forEach(mu => {
        if (mu.materiel.trim()) globalMatsSet.add(mu.materiel.trim());
      });
    });

    const formattedRecipe = {
      titre: form.titre,
      description: form.description,
      portions: form.portions.toString(),
      degustation: form.degustation,
      categories: form.categories,
      materiel_global: Array.from(globalMatsSet),
      difficulte: {
        preparation: 2,
        cuisson: 2,
        repos: 2
      },
      ingredients: form.ingredients
        .filter(ing => ing.nom.trim() !== '')
        .map(ing => ({
          ingredient: { nom: ing.nom, categorie: 'Autres' },
          valeur: ing.valeur || null,
          unite: ing.unite || null,
          sous_type: ing.sous_type || ''
        })),
      etapes: form.etapes.map((etape, index) => ({
        ordre: index + 1,
        description: etape.description,
        temps: {
          preparation_min: etape.prep || 0,
          cuisson_min: etape.cuisson || 0,
          repos_min: etape.repos || 0
        },
        materiel_utilise: etape.materiel_utilise
          .filter(mu => mu.materiel.trim() !== '')
          .map(mu => ({
            materiel: mu.materiel.trim(),
            texte_associe: mu.texte_associe
          }))
      }))
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userStore.token) {
      headers['Authorization'] = `Bearer ${userStore.token}`;
    }

    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/me/${route.params.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ data: formattedRecipe })
    });

    if (res.ok) {
      alert(`La recette "${form.titre}" a été mise à jour avec succès.`);
      router.push(`/recipe/${route.params.id}`);
    } else {
      const err = await res.json();
      alert("Erreur lors de l'enregistrement de la recette : " + (err.error?.message || res.statusText));
    }
  } catch (err) {
    console.error('Error updating recipe:', err);
    alert("Erreur de connexion au serveur lors de la mise à jour de la recette.");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.create-recipe-container {
  padding: 40px 20px;
  background: #f8fafc;
  min-height: calc(100vh - 64px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.form-card {
  width: 100%;
  max-width: 800px;
  background: white;
  border-radius: 28px;
  padding: 45px;
  box-shadow: 0 15px 40px rgba(15, 23, 42, 0.05);
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 2.2rem;
  font-weight: 850;
  color: #0f172a;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.form-subtitle {
  color: #64748b;
  font-size: 1.05rem;
  margin: 0 0 35px 0;
}

.steps-nav {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 10px;
}

.step-dot {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 750;
  color: #64748b;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

.step-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #64748b;
  transition: all 0.3s;
}

.step-dot.active .step-num {
  background: #3b82f6;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);
}

.step-dot.active .step-label {
  color: #3b82f6;
  font-weight: 700;
}

.step-dot.completed .step-num {
  background: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}

.step-dot.completed .step-label {
  color: #15803d;
}

.step-dot:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 2px;
  background: #e2e8f0;
}

h2 {
  font-size: 1.45rem;
  font-weight: 800;
  margin-top: 0;
  margin-bottom: 8px;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.count-badge {
  background: #eff6ff;
  color: #3b82f6;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 750;
}

.field-hint {
  font-size: 0.9rem;
  color: #64748b;
  margin-top: 0;
  margin-bottom: 30px;
}

.input-group {
  margin-bottom: 25px;
}

.input-group label {
  display: block;
  font-weight: 650;
  margin-bottom: 8px;
  color: #334155;
  font-size: 0.95rem;
}

input, textarea, select {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  color: #0f172a;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea {
  height: 120px;
  resize: vertical;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}

.number-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.number-input-wrapper input {
  padding-right: 50px;
}

.input-unit {
  position: absolute;
  right: 16px;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
  pointer-events: none;
}

/* Category badging styling */
.category-search-wrapper {
  margin-bottom: 15px;
  max-width: 350px;
}

.category-search-input {
  width: 100%;
  padding: 10px 16px;
  font-size: 0.95rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.25s ease;
}

.category-search-input:focus {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.category-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.cat-badge {
  padding: 8px 18px;
  border-radius: 24px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1.5px solid transparent;
}

.cat-badge:hover {
  background: #e2e8f0;
}

.cat-badge.active {
  background: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
  box-shadow: 0 4px 10px rgba(251, 191, 36, 0.1);
}

/* Dynamic ingredients rows styling */
.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.dynamic-row {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.flex-3 { flex: 3; }
.flex-2 { flex: 2; }
.flex-1 { flex: 1; }
.flex-0-3 { flex: 0.35; }

.qte-input {
  text-align: center;
}

.btn-add {
  width: 100%;
  padding: 14px;
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 14px;
  color: #475569;
  font-weight: 650;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-add:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.btn-remove {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  border-radius: 10px;
  width: 44px;
  height: 44px;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-remove:hover {
  background: #ef4444;
  color: white;
  transform: scale(1.05);
}

/* Step Card Styles */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-bottom: 20px;
}

.step-input-card {
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  padding: 30px;
  border-radius: 20px;
  position: relative;
  transition: all 0.3s;
}

.step-input-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 15px rgba(15, 23, 42, 0.02);
}

.step-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.step-num-label {
  font-weight: 800;
  color: #3b82f6;
  font-size: 1.15rem;
}

.btn-remove-step {
  background: transparent;
  color: #ef4444;
  border: none;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-remove-step:hover {
  text-decoration: underline;
}

/* Steps Grid Times inputs with explicit labels */
.step-temps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 20px;
  margin-bottom: 25px;
  padding-bottom: 25px;
  border-bottom: 1px solid #e2e8f0;
}

.time-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-field label {
  font-size: 0.88rem;
  font-weight: 650;
  color: #475569;
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit input {
  padding-right: 48px;
  text-align: center;
}

.unit-text {
  position: absolute;
  right: 14px;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  pointer-events: none;
}

/* Step Materials section */
.step-materials-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.materials-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #334155;
  margin-bottom: 4px;
}

.step-material-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.text-assoc-input {
  font-size: 0.9rem;
}

.btn-remove-mini {
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-remove-mini:hover {
  background: #fee2e2;
  color: #ef4444;
}

.btn-add-material-mini {
  align-self: flex-start;
  background: white;
  border: 1.5px dashed #cbd5e1;
  color: #64748b;
  padding: 8px 16px;
  font-size: 0.88rem;
  font-weight: 650;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-material-mini:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

/* Wizard footer */
.form-footer {
  margin-top: 45px;
  padding-top: 30px;
  border-top: 2.5px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.btn-back {
  background: #f1f5f9;
  color: #475569;
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-weight: 650;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.btn-next, .btn-submit {
  background: #3b82f6;
  color: white;
  padding: 14px 40px;
  border-radius: 12px;
  border: none;
  font-weight: 750;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2);
}

.btn-next:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(59, 130, 246, 0.3);
}

.btn-submit {
  background: #22c55e;
  box-shadow: 0 4px 10px rgba(34, 197, 94, 0.2);
}

.btn-submit:hover:not(:disabled) {
  background: #16a34a;
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(34, 197, 94, 0.3);
}

.btn-submit:disabled {
  background: #cbd5e1;
  color: #94a3b8;
  cursor: not-allowed;
  box-shadow: none;
}

/* Animations */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.list-enter-active, .list-leave-active {
  transition: all 0.25s ease;
}
.list-enter-from, .list-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 768px) {
  .form-card { padding: 30px 20px; }
  .row { grid-template-columns: 1fr; gap: 15px; }
  .step-temps-grid { grid-template-columns: 1fr; gap: 15px; }
  .step-material-row { flex-direction: column; align-items: stretch; gap: 8px; }
  .btn-remove-mini { align-self: flex-end; }
  .steps-nav { flex-direction: column; gap: 12px; align-items: flex-start; }
  .step-dot:not(:last-child)::after { display: none; }
}
</style>
