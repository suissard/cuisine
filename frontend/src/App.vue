<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router'
import { onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const handleLogout = () => {
  userStore.clearUser()
}

const isSuperAdmin = computed(() => {
  const user = userStore.currentUser
  if (!user) return false

  // Check role name
  if (user.role === 'Super Admin' || user.role === 'strapi-super-admin') return true

  // Check roles array
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles.some((r: any) => r.name === 'Super Admin' || r.code === 'strapi-super-admin')
  }

  return false
})

onMounted(async () => {
  if (userStore.token) {
    try {
      const res = await fetch(`${import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337'}/api/users/me`, {
        headers: {
          'Authorization': `Bearer ${userStore.token}`
        }
      })
      if (res.ok) {
        const userData = await res.json()
        userStore.setAuth({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          role: userData.role?.name || 'user',
          preferences: userData.preferences || { theme: 'system', dietaryRestrictions: [], newsletter: false }
        }, userStore.token)
      } else {
        userStore.clearUser()
      }
    } catch (err) {
      console.error('Failed to fetch user', err)
      userStore.clearUser()
    }
  }
})
</script>

<template>
  <div id="app">
    <nav class="main-nav">
      <div class="nav-content">
        <router-link to="/" class="nav-brand">
          <span class="logo">🍳</span> Cuisine
        </router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">Accueil</router-link>
          <router-link to="/create" class="nav-link">Créer</router-link>
          <router-link to="/import" class="nav-link">Import/Export</router-link>
          <router-link to="/live-editor" class="nav-link special">Live Editor</router-link>
          <router-link v-if="isSuperAdmin" to="/admin" class="nav-link admin-link">🛡️ Administration</router-link>
          
          <!-- Auth Section -->
          <div class="auth-section">
            <template v-if="!userStore.isAuthenticated">
              <router-link :to="{ name: 'auth', query: { mode: 'login' } }" class="nav-link auth-btn login">Connexion</router-link>
              <router-link :to="{ name: 'auth', query: { mode: 'register' } }" class="nav-link auth-btn register">S'inscrire</router-link>
            </template>
            <template v-else>
              <div class="user-profile">
                <span class="user-name">👨‍🍳 {{ userStore.currentUser?.username }}</span>
                <button @click="handleLogout" class="logout-btn">Déconnexion</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  --bg-color: #fcfaf8;
  --text-main: #0f172a;
  --text-light: #64748b;
  --accent: #e2e8f0;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --card-bg: #ffffff;
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  line-height: 1.6;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.main-nav {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  height: 64px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-brand {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-links {
  display: flex;
  gap: 24px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: var(--text-light);
  font-weight: 500;
  transition: all 0.2s;
  padding: 6px 12px;
  border-radius: 8px;
}

.nav-link:hover, .nav-link.router-link-active {
  color: var(--primary);
  background: #eff6ff;
}

.nav-link.special {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  padding: 8px 16px;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
}

.nav-link.special:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.3);
  color: white;
}

.nav-link.admin-link {
  background: #fffbeb;
  color: #855300;
  border: 1px solid #fbd38d;
  font-weight: 700;
}

.nav-link.admin-link:hover, .nav-link.admin-link.router-link-active {
  background: #fef3c7;
  color: #613b00;
  border-color: #f59e0b;
}

/* Auth Styles */
.auth-section {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: 12px;
  padding-left: 24px;
  border-left: 1px solid #e2e8f0;
}

.auth-btn {
  font-size: 0.9rem;
  padding: 8px 16px;
}

.auth-btn.login {
  color: #855300;
  background: #fffbeb;
}

.auth-btn.login:hover {
  background: #fef3c7;
}

.auth-btn.register {
  background: #855300;
  color: white;
  font-weight: 700;
}

.auth-btn.register:hover {
  background: #613b00;
  color: white;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-weight: 600;
  color: #1a1c1c;
  font-size: 0.95rem;
}

.logout-btn {
  background: #fee2e2;
  color: #b61722;
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.main-content {
  min-height: calc(100vh - 64px);
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 10px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 5px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
