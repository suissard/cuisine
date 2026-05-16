<template>
  <div class="import-export-container">
    <div class="content-card">
      <header class="page-header">
        <div class="icon-box">📦</div>
        <h1>Import & Export de Recettes</h1>
        <p>Gérez vos recettes via des fichiers JSON. Vous pouvez importer plusieurs recettes à la fois ou sauvegarder votre collection actuelle.</p>
      </header>

      <div class="actions-grid">
        <!-- Import Section -->
        <div class="action-card import">
          <div class="card-icon">📥</div>
          <h2>Importer</h2>
          <p>Chargez un fichier .json contenant une ou plusieurs recettes.</p>
          <div class="upload-zone" @dragover.prevent @drop.prevent="handleDrop" @click="triggerFileInput">
            <input type="file" ref="fileInput" @change="handleFileSelect" accept=".json" hidden>
            <div v-if="!selectedFile">
              <span class="upload-btn">Choisir un fichier</span>
              <span class="upload-hint">ou glissez-déposez ici</span>
            </div>
            <div v-else class="file-info">
              <span class="file-name">📄 {{ selectedFile.name }}</span>
              <button @click.stop="selectedFile = null" class="remove-btn">✕</button>
            </div>
          </div>
          <button @click="processImport" :disabled="!selectedFile" class="btn-import">Valider l'importation</button>
        </div>

        <!-- Export Section -->
        <div class="action-card export">
          <div class="card-icon">📤</div>
          <h2>Exporter</h2>
          <p>Téléchargez toutes vos recettes au format JSON pour les sauvegarder ou les partager.</p>
          <div class="export-options">
            <label class="checkbox-item">
              <input type="checkbox" v-model="exportAll" checked> Exporter toute la base de données
            </label>
          </div>
          <button @click="processExport" class="btn-export">Générer le fichier JSON</button>
        </div>
      </div>

      <!-- Preview/Status Section -->
      <div v-if="statusMessage" :class="['status-banner', statusType]">
        {{ statusMessage }}
      </div>

      <div v-if="importPreview" class="import-preview">
        <h3>Aperçu de l'importation ({{ importPreview.length }} recettes trouvées)</h3>
        <div class="preview-list">
          <div v-for="(recette, idx) in importPreview" :key="idx" class="preview-item">
            <span class="item-title">{{ recette.titre }}</span>
            <span class="item-meta">{{ recette.ingredients?.length || 0 }} ingrédients | {{ recette.etapes?.length || 0 }} étapes</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const fileInput = ref(null);
const selectedFile = ref(null);
const importPreview = ref(null);
const exportAll = ref(true);
const statusMessage = ref('');
const statusType = ref('info');

const triggerFileInput = () => {
  fileInput.value.click();
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedFile.value = file;
    readImportFile(file);
  }
};

const handleDrop = (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type === "application/json") {
    selectedFile.value = file;
    readImportFile(file);
  } else {
    showStatus("Veuillez déposer un fichier JSON valide.", "error");
  }
};

const readImportFile = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      importPreview.value = Array.isArray(data) ? data : [data];
      showStatus("Fichier chargé avec succès. Vérifiez l'aperçu ci-dessous.", "success");
    } catch (err) {
      showStatus("Erreur lors de la lecture du JSON : " + err.message, "error");
      importPreview.value = null;
      selectedFile.value = null;
    }
  };
  reader.readAsText(file);
};

const processImport = async () => {
  if (!importPreview.value) return;
  
  showStatus(`Importation de ${importPreview.value.length} recette(s) en cours...`, "info");
  
  try {
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: importPreview.value })
    });
    
    if (res.ok) {
      const result = await res.json();
      showStatus(`Succès ! ${result.count} recette(s) ont été importées dans Strapi.`, "success");
      importPreview.value = null;
      selectedFile.value = null;
    } else {
      const err = await res.json();
      showStatus("Erreur d'importation : " + (err.error?.message || res.statusText), "error");
    }
  } catch (err) {
    console.error('Import error:', err);
    showStatus("Erreur de connexion au serveur.", "error");
  }
};

const processExport = async () => {
  showStatus("Génération de l'export depuis Strapi...", "info");
  
  try {
    const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/recettes?populate=*`);
    const result = await res.json();
    
    if (res.ok) {
      // Transformation simple pour revenir au format "propre" si besoin, 
      // mais ici on exporte les données brutes pour l'instant.
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_recettes_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus("Exportation terminée. Le téléchargement a démarré.", "success");
    } else {
      showStatus("Erreur lors de l'export : " + res.statusText, "error");
    }
  } catch (err) {
    console.error('Export error:', err);
    showStatus("Erreur de connexion au serveur.", "error");
  }
};

const showStatus = (msg, type) => {
  statusMessage.value = msg;
  statusType.value = type;
  if (type !== 'error') {
    setTimeout(() => {
      if (statusMessage.value === msg) statusMessage.value = '';
    }, 5000);
  }
};
</script>

<style scoped>
.import-export-container {
  padding: 60px 20px;
  max-width: 1000px;
  margin: 0 auto;
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.content-card {
  background: white;
  border-radius: 32px;
  padding: 50px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.05);
}

.page-header {
  text-align: center;
  margin-bottom: 50px;
}

.icon-box {
  font-size: 3rem;
  margin-bottom: 15px;
}

h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 10px;
}

.page-header p {
  color: #64748b;
  max-width: 600px;
  margin: 0 auto;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 40px;
}

.action-card {
  background: #f8fafc;
  border-radius: 24px;
  padding: 35px;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.action-card:hover {
  transform: translateY(-5px);
  background: white;
  box-shadow: 0 15px 30px rgba(0,0,0,0.05);
  border-color: #e2e8f0;
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

h2 {
  font-size: 1.5rem;
  color: #1e293b;
  margin-bottom: 10px;
}

.action-card p {
  font-size: 0.95rem;
  color: #64748b;
  margin-bottom: 25px;
}

.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  padding: 30px 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  margin-bottom: 20px;
}

.upload-zone:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-btn {
  display: block;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 5px;
}

.upload-hint {
  font-size: 0.85rem;
  color: #94a3b8;
}

.file-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.file-name {
  font-weight: 600;
  color: #1e293b;
}

.remove-btn {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
}

.btn-import, .btn-export {
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-import { background: #3b82f6; color: white; }
.btn-import:hover:not(:disabled) { background: #2563eb; }
.btn-import:disabled { background: #cbd5e1; cursor: not-allowed; }

.btn-export { background: #1e293b; color: white; }
.btn-export:hover { background: #0f172a; }

.export-options {
  margin-bottom: 25px;
  text-align: left;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
  color: #475569;
  cursor: pointer;
}

.status-banner {
  padding: 15px 20px;
  border-radius: 12px;
  margin-bottom: 30px;
  font-weight: 600;
  text-align: center;
}

.status-banner.info { background: #eff6ff; color: #1d4ed8; }
.status-banner.success { background: #f0fdf4; color: #15803d; }
.status-banner.error { background: #fef2f2; color: #ef4444; }

.import-preview {
  margin-top: 20px;
  border-top: 2px solid #f1f5f9;
  padding-top: 30px;
}

.import-preview h3 {
  font-size: 1.1rem;
  color: #1e293b;
  margin-bottom: 15px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-item {
  background: #f8fafc;
  padding: 15px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-title { font-weight: 600; color: #334155; }
.item-meta { font-size: 0.85rem; color: #64748b; }

@media (max-width: 800px) {
  .actions-grid { grid-template-columns: 1fr; }
  .content-card { padding: 30px 20px; }
}
</style>
