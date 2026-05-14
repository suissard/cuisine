<template>
  <div class="container">
    <div v-if="loading" id="loader">
      <div class="spinner"></div>
      <p>Chargement des recettes...</p>
    </div>

    <div v-else-if="recette">
      <header>
        <h1 id="title">{{ recette.titre }}</h1>
        <div id="tags" class="tags">
          <span class="tag tag-type" v-for="cat in recette.categories" :key="cat.id">🏷️ {{ cat.nom }}</span>
          <span class="tag tag-type">🌡️ {{ recette.degustation }}</span>
          <span class="tag">🍽️ {{ recette.portions }} portions</span>
          <span class="tag">⏱️ Prép: {{ formatTime(totalPrep) }}</span>
          <span v-if="totalCuisson > 0" class="tag">🔥 Cuisson: {{ formatTime(totalCuisson) }}</span>
          <span v-if="totalRepos > 0" class="tag">❄️ Repos: {{ formatTime(totalRepos) }}</span>
          <span class="tag">📖 {{ recette.origine }}</span>
        </div>
      </header>

      <div class="content">
        <div class="left-col">
          <div class="card">
            <p id="desc" class="desc">{{ recette.description }}</p>
            <div id="diff-tags" class="tags" style="justify-content: flex-start; margin-top: 15px;">
              <span class="tag tag-diff">Prép: <span style="letter-spacing: 2px">{{ getStars(recette.difficulte?.preparation || 0) }}</span></span>
              <span class="tag tag-diff">Cuisson: <span style="letter-spacing: 2px">{{ getStars(recette.difficulte?.cuisson || 0) }}</span></span>
              <span class="tag tag-diff">Repos: <span style="letter-spacing: 2px">{{ getStars(recette.difficulte?.repos || 0) }}</span></span>
            </div>
          </div>

          <div class="card">
            <h2>🛒 Ingrédients</h2>
            <div id="ingredients">
              <div v-for="ing in recette.ingredients" :key="ing.id" class="ingredient-item">
                <div>
                  <span class="ingredient-name">{{ ing.ingredient?.nom }}</span>
                  <span v-if="ing.sous_type" class="ingredient-sub">{{ ing.sous_type }}</span>
                </div>
                <span class="ingredient-qty">{{ getQty(ing) }}</span>
              </div>
            </div>
          </div>

          <div class="card">
            <h2>🛠️ Matériel global</h2>
            <ul id="materiel-global" class="materiel-list">
              <li v-for="mat in recette.materiel_global" :key="mat.id">
                🛠️ <span class="highlight-text" :style="{ '--hl-color': getColorFor(mat.nom) }">{{ mat.nom }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="right-col">
          <div class="card">
            <h2>📝 Étapes</h2>
            <div id="etapes">
              <div v-for="etape in recette.etapes" :key="etape.id" class="step">
                <div class="step-header">
                  <div class="step-number">{{ etape.ordre }}</div>
                  <strong>Étape {{ etape.ordre }}</strong>
                </div>
                <p class="step-desc" v-html="formatEtapeDescription(etape)"></p>
                <div class="step-meta">
                  <span style="min-width: 120px;">⏱️ {{ formatEtapeTemps(etape) }}</span>
                  <div class="materiel-badges">
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
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const loading = ref(true);
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
  try {
    const res = await fetch('http://localhost:1337/api/recettes/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data && data.data && data.data.length > 0) {
      recette.value = data.data[0];
    }
  } catch (err) {
    console.error('Failed to fetch recipes:', err);
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
</script>

<style>
:root {
  --bg-color: #fcfaf8;
  --text-main: #2d3748;
  --text-light: #718096;
  --accent: #e2e8f0;
  --card-bg: #ffffff;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  line-height: 1.6;
  margin: 0;
  padding: 20px;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 2.5em;
  color: var(--text-main);
  margin-bottom: 15px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.tag {
  background: var(--accent);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 5px;
}

.tag-diff { background: #feebc8; color: #7b341e; font-weight: 500; }
.tag-type { background: #e0f2fe; color: #0369a1; }

.content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 25px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  margin-bottom: 20px;
}

h2 {
  font-size: 1.3em;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-main);
  border-bottom: 2px solid var(--accent);
  padding-bottom: 10px;
}

.desc {
  font-size: 1.1em;
  color: var(--text-light);
  font-style: italic;
  margin: 0 0 20px 0;
}

.ingredient-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--accent);
}

.ingredient-item:last-child { border-bottom: none; }
.ingredient-name { font-weight: 500; }
.ingredient-sub {
  display: block;
  font-size: 0.85em;
  color: var(--text-light);
  margin-top: 2px;
}
.ingredient-qty {
  color: var(--text-light);
  font-weight: 500;
}

.materiel-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.materiel-list li {
  margin-bottom: 8px;
}

.step {
  margin-bottom: 30px;
  position: relative;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.step-number {
  background: var(--text-main);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.step-desc {
  margin: 0 0 15px 45px;
  font-size: 1.05em;
}

.highlight-text {
  background-color: var(--hl-color, #e2e8f0);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.step-meta {
  margin-left: 45px;
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 0.9em;
  color: var(--text-light);
  align-items: center;
}

.materiel-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.materiel-badge {
  background-color: var(--hl-color, #e2e8f0);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85em;
  color: var(--text-main);
}

#loader {
  text-align: center;
  padding: 50px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--accent);
  border-top: 4px solid var(--text-main);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .content { grid-template-columns: 1fr; }
}
</style>
