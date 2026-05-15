<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

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

* {
  box-sizing: border-box;
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
