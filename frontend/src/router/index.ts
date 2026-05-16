import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import RecipeView from '../views/RecipeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/recipe/:id',
      name: 'recipe',
      component: RecipeView,
    },
    {
      path: '/create',
      name: 'create-recipe',
      component: () => import('../views/RecipeCreateView.vue'),
    },
    {
      path: '/import',
      name: 'import-export',
      component: () => import('../views/RecipeImportView.vue'),
    },
    {
      path: '/live-editor',
      name: 'live-editor',
      component: () => import('../views/RecipeEditorView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue'),
    },
  ],
})

export default router
