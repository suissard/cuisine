<template>
  <div class="recipe-container">
    <div class="back-nav">
      <router-link to="/" class="back-btn">
        <span class="back-icon">←</span> Retour aux recettes
      </router-link>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="recipe-skeleton">
      <div class="sk-header">
        <div class="sk-title"></div>
        <div class="sk-tags">
          <div class="sk-tag" v-for="i in 4" :key="i"></div>
        </div>
      </div>
      <div class="sk-content">
        <div class="sk-left">
          <div class="sk-card"></div>
          <div class="sk-card" style="height: 300px;"></div>
        </div>
        <div class="sk-right">
          <div class="sk-card" style="height: 500px;"></div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Impossible de charger la recette</h2>
      <p>{{ error }}</p>
      <button @click="$router.push('/')" class="btn-primary">Retour à l'accueil</button>
    </div>

    <!-- Recipe Content -->
    <div v-else-if="recette" class="recipe-content-wrapper">
      <header class="recipe-header">
        <h1 id="title">{{ recette.titre }}</h1>
        <div id="tags" class="tags">
          <span class="tag tag-type" v-for="cat in recette.categories" :key="cat.id">🏷️ {{ cat.nom }}</span>
          <span v-if="recette.degustation" class="tag tag-type">🌡️ {{ recette.degustation }}</span>
          <span class="tag">🍽️ {{ recette.portions }} portions</span>
          <span class="tag">⏱️ Prép: {{ formatTime(totalPrep) }}</span>
          <span v-if="totalCuisson > 0" class="tag">🔥 Cuisson: {{ formatTime(totalCuisson) }}</span>
          <span v-if="totalRepos > 0" class="tag">❄️ Repos: {{ formatTime(totalRepos) }}</span>
          <span v-if="recette.origine" class="tag">📖 {{ recette.origine }}</span>
          <span class="tag tag-author">👤 {{ recette.author?.username || 'Utilisateur anonyme' }}</span>
        </div>
      </header>

      <div class="content">
        <div class="left-col">
          <div class="card glass-card desc-card">
            <p id="desc" class="desc">{{ recette.description }}</p>
            <div id="diff-tags" class="tags diff-tags">
              <span class="tag tag-diff">Prép: <span class="stars">{{ getStars(recette.difficulte?.preparation || 0) }}</span></span>
              <span class="tag tag-diff">Cuisson: <span class="stars">{{ getStars(recette.difficulte?.cuisson || 0) }}</span></span>
              <span class="tag tag-diff">Repos: <span class="stars">{{ getStars(recette.difficulte?.repos || 0) }}</span></span>
            </div>
          </div>

          <div class="card glass-card">
            <h2>🛒 Ingrédients</h2>
            <div id="ingredients">
              <div v-for="ing in recette.ingredients" :key="ing.id" class="ingredient-item">
                <div class="ingredient-info">
                  <span class="ingredient-name">{{ ing.ingredient?.nom }}</span>
                  <span v-if="ing.sous_type" class="ingredient-sub">{{ ing.sous_type }}</span>
                </div>
                <span class="ingredient-qty">{{ getQty(ing) }}</span>
              </div>
            </div>
          </div>

          <div class="card glass-card" v-if="recette.materiel_global && recette.materiel_global.length > 0">
            <h2>🛠️ Matériel global</h2>
            <ul id="materiel-global" class="materiel-list">
              <li v-for="mat in recette.materiel_global" :key="mat.id">
                <span class="mat-icon">🛠️</span>
                <span class="highlight-text" :style="{ '--hl-color': getColorFor(mat.nom) }">{{ mat.nom }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="right-col">
          <div class="card glass-card steps-card">
            <h2>📝 Étapes</h2>
            <div id="etapes" class="steps-container">
              <div v-for="etape in recette.etapes" :key="etape.id" class="step">
                <div class="step-indicator">
                  <div class="step-number">{{ etape.ordre }}</div>
                  <div class="step-line" v-if="etape.ordre !== recette.etapes.length"></div>
                </div>
                <div class="step-content">
                  <div class="step-header">
                    <strong>Étape {{ etape.ordre }}</strong>
                  </div>
                  <p class="step-desc" v-html="formatEtapeDescription(etape)"></p>
                  <div class="step-meta" v-if="hasStepMeta(etape)">
                    <span class="step-time" v-if="formatEtapeTemps(etape)">⏱️ {{ formatEtapeTemps(etape) }}</span>
                    <div class="materiel-badges" v-if="etape.materiel_utilise && etape.materiel_utilise.length > 0">
                      <span v-for="mat in etape.materiel_utilise" :key="mat.id" class="materiel-badge" :style="{ '--hl-color': getColorFor(mat.materiel?.nom) }">
                        🛠️ {{ mat.materiel?.nom }}
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const loading = ref(true);
const error = ref(null);
const recette = ref(null);
const globalMaterielColors = ref({});
const colorIdx = ref(0);
const pastelColors = [
  'rgba(253, 224, 71, 0.35)', 'rgba(134, 239, 172, 0.35)', 'rgba(147, 197, 253, 0.35)',
  'rgba(249, 168, 212, 0.35)', 'rgba(216, 180, 254, 0.35)', 'rgba(253, 186, 116, 0.35)',
  'rgba(110, 231, 183, 0.35)', 'rgba(252, 165, 165, 0.35)'
];

const totalPrep = computed(() => {
  if (!recette.value || !recette.value.etapes) return 0;
  return recette.value.etapes.reduce((acc, e) => acc + (e.temps?.preparation_min || 0), 0);
});
const totalCuisson = computed(() => {
  if (!recette.value || !recette.value.etapes) return 0;
  return recette.value.etapes.reduce((acc, e) => acc + (e.temps?.cuisson_min || 0), 0);
});
const totalRepos = computed(() => {
  if (!recette.value || !recette.value.etapes) return 0;
  return recette.value.etapes.reduce((acc, e) => acc + (e.temps?.repos_min || 0), 0);
});

onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: { documentId: id },
        populate: {
          etapes: {
            populate: '*'
          },
          ingredients: {
            populate: '*'
          },
          categories: true,
          materiel_global: true,
          difficulte: true,
          author: true
        }
      })
    });
    const data = await res.json();
    
    if (data && data.data && data.data.length > 0) {
      recette.value = data.data[0];
    } else {
      // Fallback si c'est un ID numérique classique
      const resFallback = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { id: id },
          populate: {
            etapes: { populate: '*' },
            ingredients: { populate: '*' },
            categories: true,
            materiel_global: true,
            difficulte: true,
            author: true
          }
        })
      });
      const dataFallback = await resFallback.json();
      if (dataFallback && dataFallback.data && dataFallback.data.length > 0) {
        recette.value = dataFallback.data[0];
      } else {
        error.value = "Recette introuvable.";
      }
    }
  } catch (err) {
    console.error('Failed to fetch recipe:', err);
    error.value = "Erreur de connexion au serveur.";
  } finally {
    loading.value = false;
  }
});

const getColorFor = (nom) => {
  if (!nom) return pastelColors[0];
  for (const key in globalMaterielColors.value) {
    if (nom.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(nom.toLowerCase())) {
      return globalMaterielColors.value[key];
    }
  }
  const color = pastelColors[colorIdx.value % pastelColors.length];
  globalMaterielColors.value[nom] = color;
  colorIdx.value++;
  return color;
};

const getStars = (num) => '★'.repeat(num) + '☆'.repeat(5 - num);

const formatTime = (mins) => {
  if (!mins) return null;
  if (mins >= 1440) return `${Math.floor(mins / 1440)}j`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? mins % 60 : ''}`;
  return `${mins} min`;
};

const getQty = (ing) => {
  let qty = '';
  if (ing.valeur) {
    qty = `${ing.valeur} ${ing.unite}`;
  } else {
    qty = ing.unite;
  }
  return qty;
};

const formatEtapeDescription = (etape) => {
  let desc = etape.description || '';
  if (etape.materiel_utilise) {
    etape.materiel_utilise.forEach(mat => {
      const nom = mat.materiel?.nom;
      if (!nom) return;
      const color = getColorFor(nom);
      if (mat.texte_associe && desc.includes(mat.texte_associe)) {
        desc = desc.replace(
          mat.texte_associe,
          `<span class="highlight-text" style="--hl-color: ${color};">${mat.texte_associe}</span>`
        );
      }
    });
  }
  return desc;
};

const formatEtapeTemps = (etape) => {
  let times = [];
  if (etape.temps?.preparation_min) times.push(`Prép: ${etape.temps.preparation_min}m`);
  if (etape.temps?.cuisson_min) times.push(`Cuisson: ${etape.temps.cuisson_min}m`);
  if (etape.temps?.repos_min) times.push(`Repos: ${formatTime(etape.temps.repos_min)}`);
  return times.join(' | ');
};

const hasStepMeta = (etape) => {
  return formatEtapeTemps(etape) !== '' || (etape.materiel_utilise && etape.materiel_utilise.length > 0);
};
</script>

<style scoped>
.recipe-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.back-nav {
  margin-bottom: 30px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  padding: 10px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  transition: all 0.3s;
}

.back-btn:hover {
  transform: translateX(-5px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.1);
  color: #2563eb;
}

/* Header */
.recipe-header {
  text-align: center;
  margin-bottom: 50px;
  padding: 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  position: relative;
  overflow: hidden;
}

.recipe-header::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 6px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
}

h1 {
  font-size: 3rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 25px;
  letter-spacing: -1px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.tag {
  background: #f1f5f9;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.95em;
  font-weight: 500;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.tag-diff { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
.tag-type { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
.tag-author { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }

.stars {
  letter-spacing: 2px;
  color: #fbbf24;
}

/* Layout */
.content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 40px;
}

.glass-card {
  background: white;
  border-radius: 24px;
  padding: 35px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
  margin-bottom: 30px;
  border: 1px solid rgba(255,255,255,0.8);
}

h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
  margin-top: 0;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Left Column */
.desc-card {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
}

.desc {
  font-size: 1.15rem;
  color: #475569;
  line-height: 1.7;
  font-style: italic;
  margin: 0 0 25px 0;
}

.diff-tags {
  justify-content: flex-start;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.2s;
  border-radius: 8px;
}

.ingredient-item:hover {
  background: #f8fafc;
}

.ingredient-item:last-child { border-bottom: none; }
.ingredient-name { font-weight: 600; color: #1e293b; }
.ingredient-sub {
  display: block;
  font-size: 0.85em;
  color: #64748b;
  margin-top: 4px;
}
.ingredient-qty {
  color: #3b82f6;
  font-weight: 700;
  background: #eff6ff;
  padding: 4px 12px;
  border-radius: 12px;
}

.materiel-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.materiel-list li {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.highlight-text {
  background-color: var(--hl-color, #e2e8f0);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 600;
  color: #1e293b;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Right Column (Steps) */
.steps-container {
  display: flex;
  flex-direction: column;
}

.step {
  display: flex;
  gap: 25px;
  margin-bottom: 0;
  position: relative;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-number {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
  z-index: 2;
}

.step-line {
  width: 2px;
  flex: 1;
  background: #e2e8f0;
  margin-top: 10px;
  margin-bottom: 10px;
}

.step-content {
  flex: 1;
  padding-bottom: 40px;
}

.step-header {
  font-size: 1.2rem;
  color: #1e293b;
  margin-bottom: 10px;
  padding-top: 5px;
}

.step-desc {
  font-size: 1.1rem;
  color: #475569;
  line-height: 1.7;
  margin: 0 0 15px 0;
}

.step-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
  background: #f8fafc;
  padding: 12px 20px;
  border-radius: 12px;
}

.step-time {
  font-weight: 600;
  color: #ef4444;
  background: #fef2f2;
  padding: 4px 12px;
  border-radius: 12px;
}

.materiel-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.materiel-badge {
  background-color: var(--hl-color, #e2e8f0);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.9em;
  font-weight: 600;
  color: #1e293b;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

/* Skeleton Loading */
.recipe-skeleton {
  max-width: 1200px;
  margin: 0 auto;
}

.sk-header {
  height: 200px;
  background: white;
  border-radius: 24px;
  margin-bottom: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.sk-title {
  width: 60%;
  height: 48px;
  background: #f1f5f9;
  border-radius: 8px;
  margin-bottom: 25px;
  animation: pulse 1.5s infinite;
}

.sk-tags {
  display: flex;
  gap: 15px;
}

.sk-tag {
  width: 100px;
  height: 36px;
  background: #f1f5f9;
  border-radius: 20px;
  animation: pulse 1.5s infinite;
}

.sk-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 40px;
}

.sk-card {
  background: white;
  border-radius: 24px;
  height: 200px;
  margin-bottom: 30px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { background-color: #f1f5f9; }
  50% { background-color: #e2e8f0; }
  100% { background-color: #f1f5f9; }
}

/* Error State */
.error-state {
  text-align: center;
  padding: 100px 20px;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 20px;
  transition: background 0.3s;
}

.btn-primary:hover {
  background: #2563eb;
}

@media (max-width: 900px) {
  .content { grid-template-columns: 1fr; }
  .sk-content { grid-template-columns: 1fr; }
  h1 { font-size: 2.2rem; }
}
</style>
