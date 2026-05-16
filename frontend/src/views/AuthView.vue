<template>
  <div class="auth-page">
    <div class="auth-overlay"></div>
    
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="literata-title">{{ isLogin ? 'Bienvenue Chef' : 'Rejoindre la Brigade' }}</h1>
          <p class="auth-subtitle">
            {{ isLogin ? 'Connectez-vous pour accéder à vos recettes' : 'Créez un compte pour sauvegarder vos créations' }}
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="auth-form">
          <!-- Nom d'utilisateur (Inscription uniquement) -->
          <div v-if="!isLogin" class="form-group">
            <label for="username">Nom d'utilisateur</label>
            <div class="input-wrapper">
              <span class="input-icon">👤</span>
              <input 
                id="username" 
                v-model="form.username" 
                type="text" 
                placeholder="Votre nom de chef" 
                required
              />
            </div>
          </div>

          <!-- Email -->
          <div class="form-group">
            <label for="email">Email</label>
            <div class="input-wrapper">
              <span class="input-icon">✉️</span>
              <input 
                id="email" 
                v-model="form.email" 
                type="email" 
                placeholder="chef@cuisine.com" 
                required
              />
            </div>
          </div>

          <!-- Mot de passe -->
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input 
                id="password" 
                v-model="form.password" 
                type="password" 
                placeholder="••••••••" 
                required
              />
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="userStore.error" class="error-msg">
            {{ userStore.error }}
          </div>

          <!-- Submit Button -->
          <button type="submit" class="submit-btn" :disabled="userStore.isLoading">
            <span v-if="userStore.isLoading" class="spinner"></span>
            <span v-else>{{ isLogin ? 'Se connecter' : "S'inscrire" }}</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>
            {{ isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?" }}
            <button @click="toggleMode" class="toggle-btn">
              {{ isLogin ? "S'inscrire" : 'Se connecter' }}
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isLogin = ref(true)
const form = reactive({
  username: '',
  email: '',
  password: ''
})

const updateModeFromQuery = () => {
  if (route.query.mode === 'register') {
    isLogin.value = false
  } else {
    isLogin.value = true
  }
}

onMounted(() => {
  updateModeFromQuery()
})

watch(() => route.query.mode, () => {
  updateModeFromQuery()
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  userStore.setError(null)
}

const handleSubmit = async () => {
  let success = false
  if (isLogin.value) {
    success = await userStore.login(form.email, form.password)
  } else {
    success = await userStore.register(form.username, form.email, form.password)
  }

  if (success) {
    router.push('/')
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,600;7..72,700;7..72,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80') center/cover no-repeat;
  position: relative;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.auth-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(133, 83, 0, 0.4), rgba(26, 28, 28, 0.6));
  backdrop-filter: blur(4px);
}

.auth-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 450px;
  padding: 20px;
}

.auth-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  animation: cardFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardFadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.literata-title {
  font-family: 'Literata', serif;
  font-size: 2.25rem;
  font-weight: 700;
  color: #2a1700;
  margin-bottom: 8px;
}

.auth-subtitle {
  color: #534434;
  font-size: 0.95rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #2a1700;
  margin-left: 4px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  font-size: 1.1rem;
  opacity: 0.7;
}

input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #d8c3ad;
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s;
}

input:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.1);
  background: white;
}

.submit-btn {
  margin-top: 10px;
  padding: 14px;
  background: linear-gradient(135deg, #855300, #f59e0b);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(133, 83, 0, 0.3);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  background: #ffdad6;
  color: #93000a;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  text-align: center;
}

.auth-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 0.9rem;
  color: #534434;
}

.toggle-btn {
  background: none;
  border: none;
  color: #855300;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
  text-decoration: underline;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
