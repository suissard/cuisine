import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// Types plus complets pour l'utilisateur
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  dietaryRestrictions: string[] // ex: ['végétarien', 'sans gluten']
  newsletter: boolean
}

export interface User {
  id: number | string
  username: string
  email: string
  avatar?: string
  role?: string
  preferences: UserPreferences
}

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const currentUser = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('jwt_token') || null)
  
  // États de requêtes
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // --- GETTERS ---
  const isAuthenticated = computed(() => currentUser.value !== null && token.value !== null)
  const userRole = computed(() => currentUser.value?.role || 'user')
  const hasDietaryRestrictions = computed(() => (currentUser.value?.preferences?.dietaryRestrictions?.length || 0) > 0)
  
  // --- ACTIONS ---
  
  // Gérer l'authentification (token + données)
  function setAuth(userData: User, jwtToken: string) {
    currentUser.value = userData
    token.value = jwtToken
    localStorage.setItem('jwt_token', jwtToken)
    error.value = null
  }

  // Connexion API
  async function login(identifier: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/auth/local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Identifiants invalides')
      }
      
      setAuth({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role?.name || 'user',
        preferences: data.user.preferences || { theme: 'system', dietaryRestrictions: [], newsletter: false }
      }, data.jwt)
      
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Inscription API
  async function register(username: string, email: string, password: string) {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/auth/local/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Erreur lors de l\'inscription')
      }
      
      setAuth({
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role?.name || 'user',
        preferences: data.user.preferences || { theme: 'system', dietaryRestrictions: [], newsletter: false }
      }, data.jwt)
      
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setLoading(false)
    }
  }
  
  // Mettre à jour des données partielles
  function updateUserData(updates: Partial<User>) {
    if (currentUser.value) {
      currentUser.value = { ...currentUser.value, ...updates }
    }
  }

  // Mettre à jour les préférences spécifiquement
  function updatePreferences(prefUpdates: Partial<UserPreferences>) {
    if (currentUser.value) {
      currentUser.value.preferences = {
        ...currentUser.value.preferences,
        ...prefUpdates
      }
    }
  }
  
  // Gestion du chargement (utile pour afficher des spinners)
  function setLoading(state: boolean) {
    isLoading.value = state
  }

  // Gestion des erreurs
  function setError(errorMessage: string | null) {
    error.value = errorMessage
  }
  
  // Déconnexion complète
  function clearUser() {
    currentUser.value = null
    token.value = null
    error.value = null
    localStorage.removeItem('jwt_token')
  }

  return { 
    // State
    currentUser, 
    token,
    isLoading,
    error,
    // Getters
    isAuthenticated,
    userRole,
    hasDietaryRestrictions,
    // Actions
    setAuth, 
    login,
    register,
    updateUserData,
    updatePreferences,
    setLoading,
    setError,
    clearUser 
  }
})
