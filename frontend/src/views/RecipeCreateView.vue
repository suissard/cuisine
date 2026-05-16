<template>
  <div class="create-recipe-container">
    <div class="form-card">
      <header class="form-header">
        <h1>Nouvelle Recette</h1>
        <div class="steps-nav">
          <div v-for="s in 3" :key="s" :class="['step-dot', { active: step === s, completed: step > s }]">
            {{ s }}
          </div>
        </div>
      </header>

      <form @submit.prevent="handleSubmit">
        <!-- Step 1: Basic Info -->
        <div v-if="step === 1" class="form-step">
          <h2>Informations Générales</h2>
          <div class="input-group">
            <label>Titre de la recette</label>
            <input v-model="form.titre" type="text" placeholder="Ex: Pâtes à la carbonara" required>
          </div>
          <div class="input-group">
            <label>Description</label>
            <textarea v-model="form.description" placeholder="Une brève introduction..."></textarea>
          </div>
          <div class="row">
            <div class="input-group">
              <label>Portions</label>
              <input v-model.number="form.portions" type="number" min="1">
            </div>
            <div class="input-group">
              <label>Température</label>
              <select v-model="form.degustation">
                <option value="Chaud">Chaud</option>
                <option value="Froid">Froid</option>
                <option value="Ambiant">Ambiant</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: Ingredients -->
        <div v-if="step === 2" class="form-step">
          <h2>🛒 Ingrédients</h2>
          <div v-for="(ing, idx) in form.ingredients" :key="idx" class="dynamic-row">
            <input v-model="ing.nom" placeholder="Nom" class="flex-2">
            <input v-model.number="ing.valeur" type="number" placeholder="Qté" class="flex-1">
            <input v-model="ing.unite" placeholder="Unité" class="flex-1">
            <button type="button" @click="removeIngredient(idx)" class="btn-remove">✕</button>
          </div>
          <button type="button" @click="addIngredient" class="btn-add">+ Ajouter un ingrédient</button>
        </div>

        <!-- Step 3: Steps -->
        <div v-if="step === 3" class="form-step">
          <h2>📝 Étapes de préparation</h2>
          <div v-for="(etape, idx) in form.etapes" :key="idx" class="step-input">
            <div class="step-num-label">Étape {{ idx + 1 }}</div>
            <textarea v-model="etape.description" placeholder="Décrivez l'étape..."></textarea>
            <div class="step-temps">
              <input v-model.number="etape.prep" type="number" placeholder="Prép (min)">
              <input v-model.number="etape.cuisson" type="number" placeholder="Cuisson (min)">
            </div>
            <button type="button" @click="removeEtape(idx)" class="btn-remove-step">Supprimer l'étape</button>
          </div>
          <button type="button" @click="addEtape" class="btn-add">+ Ajouter une étape</button>
        </div>

        <div class="form-footer">
          <button v-if="step > 1" type="button" @click="step--" class="btn-back">Précédent</button>
          <button v-if="step < 3" type="button" @click="step++" class="btn-next">Suivant</button>
          <button v-else type="submit" class="btn-submit">Créer la recette</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const step = ref(1);

const form = reactive({
  titre: '',
  description: '',
  portions: 4,
  degustation: 'Chaud',
  ingredients: [{ nom: '', valeur: 0, unite: '' }],
  etapes: [{ description: '', prep: 0, cuisson: 0 }]
});

const addIngredient = () => form.ingredients.push({ nom: '', valeur: 0, unite: '' });
const removeIngredient = (idx) => form.ingredients.splice(idx, 1);

const addEtape = () => form.etapes.push({ description: '', prep: 0, cuisson: 0 });
const removeEtape = (idx) => form.etapes.splice(idx, 1);

const handleSubmit = () => {
  alert("Recette créée avec succès ! (Simulation)");
  router.push('/');
};
</script>

<style scoped>
.create-recipe-container {
  padding: 60px 20px;
  background: #f8fafc;
  min-height: calc(100vh - 64px);
}

.form-card {
  max-width: 700px;
  margin: 0 auto;
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.form-header {
  text-align: center;
  margin-bottom: 40px;
}

h1 { font-size: 1.8rem; font-weight: 800; color: #1e293b; margin-bottom: 20px; }

.steps-nav {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.step-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #64748b;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.step-dot.active { background: #3b82f6; color: white; transform: scale(1.1); }
.step-dot.completed { background: #dcfce7; color: #15803d; }

h2 { font-size: 1.3rem; margin-bottom: 25px; color: #1e293b; }

.input-group { margin-bottom: 20px; }
.input-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #475569; font-size: 0.9rem; }
input, textarea, select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.2s;
}
input:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
textarea { height: 100px; resize: vertical; }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.dynamic-row { display: flex; gap: 10px; margin-bottom: 12px; }
.flex-2 { flex: 2; }
.flex-1 { flex: 1; }

.btn-add {
  width: 100%;
  padding: 12px;
  background: #f8fafc;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  color: #64748b;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
}
.btn-add:hover { background: #eff6ff; border-color: #3b82f6; color: #3b82f6; }

.btn-remove { background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; padding: 0 12px; cursor: pointer; }

.step-input {
  background: #f8fafc;
  padding: 20px;
  border-radius: 16px;
  margin-bottom: 20px;
}
.step-num-label { font-weight: 700; color: #3b82f6; margin-bottom: 10px; }
.step-temps { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.btn-remove-step {
  margin-top: 10px;
  background: transparent;
  color: #ef4444;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.form-footer {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.btn-back { background: #f1f5f9; color: #475569; padding: 12px 24px; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; }
.btn-next, .btn-submit { background: #3b82f6; color: white; padding: 12px 32px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; flex: 1; }
.btn-submit { background: #22c55e; }
</style>
