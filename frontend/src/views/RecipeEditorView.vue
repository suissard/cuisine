<template>
  <div class="live-editor-container">
    <header class="editor-header">
      <div class="header-left">
        <h1>Live JSON Editor</h1>
        <p>Modifiez le JSON à gauche pour voir le résultat en temps réel à droite.</p>
      </div>
      <div class="header-actions">
        <button @click="importJson" class="btn-secondary">Importer JSON</button>
        <button @click="exportJson" class="btn-secondary">Exporter JSON</button>
        <button @click="saveRecipe" class="btn-primary">Sauvegarder la recette</button>
      </div>
    </header>

    <div class="editor-layout">
      <!-- Left side: JSON Editor -->
      <div class="json-panel">
        <div class="panel-header">
          <span>JSON Editor</span>
          <span :class="['status-dot', isValidJson ? 'valid' : 'invalid']"></span>
        </div>
        <textarea
          v-model="jsonInput"
          @input="validateAndParse"
          placeholder="Collez ou écrivez votre JSON ici..."
          spellcheck="false"
        ></textarea>
        <div v-if="jsonError" class="error-msg">
          {{ jsonError }}
        </div>
      </div>

      <!-- Right side: Live Preview -->
      <div class="preview-panel">
        <div class="panel-header">
          <span>Aperçu en direct</span>
        </div>
        <div class="preview-content">
          <div v-if="parsedRecipe" class="recipe-preview">
            <header class="recipe-header">
              <h1>{{ parsedRecipe.titre }}</h1>
              <div class="tags">
                <span v-for="cat in parsedRecipe.categories" :key="cat" class="tag tag-type">🏷️ {{ cat }}</span>
                <span v-if="parsedRecipe.degustation" class="tag tag-type">🌡️ {{ parsedRecipe.degustation }}</span>
                <span class="tag">🍽️ {{ parsedRecipe.portions }} portions</span>
                <span class="tag">⏱️ Prép: {{ formatTime(totalPrep) }}</span>
                <span v-if="totalCuisson > 0" class="tag">🔥 Cuisson: {{ formatTime(totalCuisson) }}</span>
                <span v-if="totalRepos > 0" class="tag">❄️ Repos: {{ formatTime(totalRepos) }}</span>
              </div>
            </header>

            <div class="recipe-body">
              <div class="left-col">
                <div class="card desc-card">
                  <p class="desc">{{ parsedRecipe.description }}</p>
                  <div class="tags diff-tags">
                    <span class="tag tag-diff">Prép: <span class="stars">{{ getStars(parsedRecipe.difficulte?.preparation || 0) }}</span></span>
                    <span class="tag tag-diff">Cuisson: <span class="stars">{{ getStars(parsedRecipe.difficulte?.cuisson || 0) }}</span></span>
                    <span class="tag tag-diff">Repos: <span class="stars">{{ getStars(parsedRecipe.difficulte?.repos || 0) }}</span></span>
                  </div>
                </div>

                <div class="card">
                  <h2>🛒 Ingrédients</h2>
                  <div class="ingredient-list">
                    <div v-for="(ing, idx) in parsedRecipe.ingredients" :key="idx" class="ingredient-item">
                      <div class="ingredient-info">
                        <span class="ingredient-name">{{ ing.ingredient?.nom }}</span>
                        <span v-if="ing.sous_type" class="ingredient-sub">{{ ing.sous_type }}</span>
                      </div>
                      <span class="ingredient-qty">{{ ing.valeur }} {{ ing.unite }}</span>
                    </div>
                  </div>
                </div>

                <!-- NEW: Global Material Section (Auto-deduced) -->
                <div class="card" v-if="computedMateriel.length > 0">
                  <h2>🛠️ Matériel</h2>
                  <div class="materiel-list">
                    <div v-for="(mat, idx) in computedMateriel" :key="idx" class="materiel-item">
                      <span class="highlight-text" :style="{ '--hl-color': getColorFor(mat) }">{{ mat }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="right-col">
                <div class="card steps-card">
                  <h2>📝 Étapes</h2>
                  <div class="steps-container">
                    <div v-for="(etape, idx) in parsedRecipe.etapes" :key="idx" class="step">
                      <div class="step-indicator">
                        <div class="step-number">{{ etape.ordre }}</div>
                        <div class="step-line" v-if="idx !== parsedRecipe.etapes.length - 1"></div>
                      </div>
                      <div class="step-content">
                        <div class="step-header"><strong>Étape {{ etape.ordre }}</strong></div>
                        <!-- Updated to use v-html for highlighting -->
                        <p class="step-desc" v-html="formatEtapeDescription(etape)"></p>
                        <div class="step-meta" v-if="etape.temps || (etape.materiel_utilise && etape.materiel_utilise.length > 0)">
                          <span v-if="etape.temps" class="step-time">⏱️ {{ formatEtapeTemps(etape) }}</span>
                          <div class="step-materiel-badges" v-if="etape.materiel_utilise">
                            <span v-for="mu in etape.materiel_utilise" :key="mu.materiel" class="mat-badge" :style="{ '--hl-color': getColorFor(mu.materiel) }">
                              🛠️ {{ mu.materiel }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-preview">
            <div class="empty-icon">🍳</div>
            <p>Le JSON est invalide ou vide. Remplissez l'éditeur pour voir l'aperçu.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const jsonInput = ref('');
const parsedRecipe = ref(null);
const jsonError = ref(null);
const isValidJson = ref(true);

const computedMateriel = computed(() => {
  if (!parsedRecipe.value || !parsedRecipe.value.etapes) return [];
  const mats = new Set();
  
  // Ajouter le matériel global s'il existe explicitement
  if (Array.isArray(parsedRecipe.value.materiel_global)) {
    parsedRecipe.value.materiel_global.forEach(m => mats.add(m));
  }
  
  // Déduire le matériel des étapes
  parsedRecipe.value.etapes.forEach(etape => {
    if (etape.materiel_utilise) {
      etape.materiel_utilise.forEach(mu => {
        if (mu.materiel) mats.add(mu.materiel);
      });
    }
  });
  
  return Array.from(mats);
});

const exampleJson = {
  "titre": "Terrine de Pommes de Terre aux Sardines",
  "description": "Une recette simple et gourmande, parfaite pour l'été.",
  "portions": 4,
  "temps_preparation": 20,
  "temps_cuisson": 20,
  "temps_repos": 1440,
  "degustation": "Froid",
  "categories": ["Entrée", "Plat principal"],
  "difficulte": { "preparation": 2, "cuisson": 2, "repos": 5 },
  "ingredients": [
    {
      "ingredient": { "nom": "Pomme de terre", "categorie": "Légumes" },
      "valeur": 500,
      "unite": "g",
      "sous_type": "à chair ferme"
    },
    {
      "ingredient": { "nom": "Sardines à l'huile", "categorie": "Poisson" },
      "valeur": 2,
      "unite": "boîtes"
    }
  ],
  "etapes": [
    {
      "ordre": 1,
      "description": "Faites cuire les pommes de terre. Epluchez-les chaudes et coupez en rondelles.",
      "materiel_utilise": [
        { "materiel": "Casserole", "texte_associe": "Faites cuire les pommes de terre" },
        { "materiel": "Couteau d'office", "texte_associe": "coupez en rondelles" }
      ],
      "temps": { "preparation_min": 5, "cuisson_min": 20, "repos_min": 0 }
    },
    {
      "ordre": 2,
      "description": "Egouttez et émiettez les sardines à l'aide d'une fourchette.",
      "materiel_utilise": [
        { "materiel": "Passoire", "texte_associe": "Egouttez" },
        { "materiel": "Fourchette", "texte_associe": "émiettez les sardines" }
      ],
      "temps": { "preparation_min": 5, "cuisson_min": 0, "repos_min": 0 }
    }
  ]
};

const materielColors = ref({});
const pastelColors = [
  'rgba(253, 224, 71, 0.4)', 'rgba(134, 239, 172, 0.4)', 'rgba(147, 197, 253, 0.4)',
  'rgba(249, 168, 212, 0.4)', 'rgba(216, 180, 254, 0.4)', 'rgba(253, 186, 116, 0.4)'
];
let colorIndex = 0;

const getColorFor = (name) => {
  if (!name) return '#e2e8f0';
  if (!materielColors.value[name]) {
    materielColors.value[name] = pastelColors[colorIndex % pastelColors.length];
    colorIndex++;
  }
  return materielColors.value[name];
};

const formatEtapeDescription = (etape) => {
  let desc = etape.description || '';
  if (etape.materiel_utilise) {
    etape.materiel_utilise.forEach(mu => {
      if (mu.texte_associe && desc.toLowerCase().includes(mu.texte_associe.toLowerCase())) {
        const color = getColorFor(mu.materiel);
        // Utilisation d'une regex pour un remplacement insensible à la casse
        const escapedText = mu.texte_associe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedText, 'gi');
        desc = desc.replace(
          regex,
          (match) => `<span class="highlight-text" style="--hl-color: ${color};">${match}</span>`
        );
      }
    });
  }
  return desc;
};

onMounted(() => {
  jsonInput.value = JSON.stringify(exampleJson, null, 2);
  validateAndParse();
});

const validateAndParse = () => {
  try {
    if (!jsonInput.value.trim()) {
      parsedRecipe.value = null;
      jsonError.value = null;
      isValidJson.value = true;
      return;
    }
    const parsed = JSON.parse(jsonInput.value);
    parsedRecipe.value = parsed;
    jsonError.value = null;
    isValidJson.value = true;
  } catch (e) {
    parsedRecipe.value = null;
    jsonError.value = "Erreur de syntaxe JSON : " + e.message;
    isValidJson.value = false;
  }
};

const totalPrep = computed(() => {
  if (!parsedRecipe.value) return 0;
  if (parsedRecipe.value.temps_preparation !== undefined) return parsedRecipe.value.temps_preparation;
  if (!parsedRecipe.value.etapes) return 0;
  return parsedRecipe.value.etapes.reduce((acc, e) => acc + (e.temps?.preparation_min || 0), 0);
});

const totalCuisson = computed(() => {
  if (!parsedRecipe.value) return 0;
  if (parsedRecipe.value.temps_cuisson !== undefined) return parsedRecipe.value.temps_cuisson;
  if (!parsedRecipe.value.etapes) return 0;
  return parsedRecipe.value.etapes.reduce((acc, e) => acc + (e.temps?.cuisson_min || 0), 0);
});

const totalRepos = computed(() => {
  if (!parsedRecipe.value) return 0;
  if (parsedRecipe.value.temps_repos !== undefined) return parsedRecipe.value.temps_repos;
  if (!parsedRecipe.value.etapes) return 0;
  return parsedRecipe.value.etapes.reduce((acc, e) => acc + (e.temps?.repos_min || 0), 0);
});

const getStars = (num) => '★'.repeat(num) + '☆'.repeat(5 - num);

const formatTime = (mins) => {
  if (!mins) return '0 min';
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? mins % 60 : ''}`;
  return `${mins} min`;
};

const formatEtapeTemps = (etape) => {
  let times = [];
  if (etape.temps?.preparation_min) times.push(`Prép: ${etape.temps.preparation_min}m`);
  if (etape.temps?.cuisson_min) times.push(`Cuisson: ${etape.temps.cuisson_min}m`);
  if (etape.temps?.repos_min) times.push(`Repos: ${etape.temps.repos_min}m`);
  return times.join(' | ');
};

const importJson = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      jsonInput.value = event.target.result;
      validateAndParse();
    };
    reader.readAsText(file);
  };
  input.click();
};

const exportJson = () => {
  const blob = new Blob([jsonInput.value], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${parsedRecipe.value?.titre || 'recette'}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const saveRecipe = async () => {
  if (!isValidJson.value) {
    alert("Veuillez corriger les erreurs JSON avant de sauvegarder.");
    return;
  }
  
  try {
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: parsedRecipe.value })
    });
    
    if (res.ok) {
      const result = await res.json();
      alert(`Recette "${parsedRecipe.value.titre}" sauvegardée avec succès !`);
    } else {
      const err = await res.json();
      alert("Erreur lors de la sauvegarde : " + (err.error?.message || res.statusText));
    }
  } catch (err) {
    console.error('Save error:', err);
    alert("Erreur de connexion au serveur.");
  }
};
</script>

<style scoped>
.live-editor-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.editor-header {
  padding: 20px 40px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
}

.header-left p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.editor-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.json-panel, .preview-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #e2e8f0;
}

.panel-header {
  padding: 10px 20px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-dot.valid { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.status-dot.invalid { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

textarea {
  flex: 1;
  padding: 20px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: none;
  resize: none;
  background: #1e293b;
  color: #e2e8f0;
  outline: none;
}

.error-msg {
  padding: 10px 20px;
  background: #fef2f2;
  color: #ef4444;
  font-size: 0.85rem;
  border-top: 1px solid #fee2e2;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  background: #fcfaf8;
}

.recipe-preview {
  max-width: 800px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.recipe-header {
  text-align: center;
  margin-bottom: 40px;
}

.recipe-header h1 {
  font-size: 2.5rem;
  color: #1e293b;
  margin-bottom: 15px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.tag {
  background: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #64748b;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.recipe-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 30px;
}

.card {
  background: white;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
}

h2 {
  font-size: 1.2rem;
  margin-top: 0;
  margin-bottom: 20px;
  color: #1e293b;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 10px;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
}

.ingredient-name { font-weight: 600; color: #334155; }
.ingredient-qty { color: #3b82f6; font-weight: 700; }

.steps-container {
  display: flex;
  flex-direction: column;
}

.step {
  display: flex;
  gap: 20px;
}

.step-number {
  background: #3b82f6;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-line {
  width: 2px;
  background: #e2e8f0;
  margin: 10px auto;
  flex: 1;
}

.empty-preview {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

:deep(.highlight-text) {
  background-color: var(--hl-color, #e2e8f0);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  color: #1e293b;
}

.materiel-item {
  margin-bottom: 8px;
}

.step-materiel-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mat-badge {
  font-size: 0.75rem;
  background: var(--hl-color);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
