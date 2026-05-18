<template>
  <div class="autocomplete-container" ref="containerRef">
    <div class="input-wrapper">
      <input
        type="text"
        :value="modelValue"
        @input="onInput"
        @focus="onFocus"
        @keydown.down.prevent="onArrowDown"
        @keydown.up.prevent="onArrowUp"
        @keydown.enter.prevent="onEnter"
        @keydown.esc="onEsc"
        :placeholder="placeholder"
        class="autocomplete-input"
        :class="inputClass"
        ref="inputRef"
      />
      <!-- Propose inline '+' button if value is typed, not empty, and not an exact match -->
      <button
        v-if="showCreateButtonInline"
        type="button"
        @click="triggerCreate"
        class="inline-create-btn"
        title="Créer cet élément"
      >
        ＋
      </button>
    </div>

    <!-- Dropdown suggestions -->
    <transition name="fade-slide">
      <ul v-if="isOpen && filteredSuggestions.length > 0" class="suggestions-list">
        <li
          v-for="(suggestion, idx) in filteredSuggestions"
          :key="idx"
          @click="selectSuggestion(suggestion)"
          :class="['suggestion-item', { active: idx === activeIndex }]"
        >
          <span class="suggestion-text">{{ getDisplayValue(suggestion) }}</span>
          <span v-if="isNewItem(suggestion)" class="new-badge">Nouveau</span>
        </li>
      </ul>
      <!-- Dropdown when no results found -->
      <ul v-else-if="isOpen && modelValue.trim() !== '' && showNoResults" class="suggestions-list empty-suggestions">
        <li class="no-match-item" @click="triggerCreate">
          <span class="plus-icon">✨</span>
          <span class="no-match-text">
            Créer <strong>"{{ modelValue }}"</strong>
          </span>
          <span class="plus-badge">＋</span>
        </li>
      </ul>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  suggestions: {
    type: Array as () => Array<any | string>,
    default: () => []
  },
  placeholder: {
    type: String,
    default: ''
  },
  displayKey: {
    type: String,
    default: 'nom'
  },
  inputClass: {
    type: String,
    default: ''
  },
  showNoResults: {
    type: Boolean,
    default: true
  },
  remoteSearchUrl: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'select', 'create']);

const containerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const isOpen = ref(false);
const activeIndex = ref(-1);

const remoteSuggestions = ref<any[]>([]);
const isSearching = ref(false);
let debounceTimeout: any = null;

const fetchRemoteSuggestions = async (query: string) => {
  if (!props.remoteSearchUrl) return;

  const strapiUrl = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
  const url = query.trim()
    ? `${strapiUrl}${props.remoteSearchUrl}?filters[nom][$containsi]=${encodeURIComponent(query)}&sort=nom:asc&pagination[limit]=20`
    : `${strapiUrl}${props.remoteSearchUrl}?sort=nom:asc&pagination[limit]=20`;

  try {
    isSearching.value = true;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.ok ? await res.json() : { data: [] };
      remoteSuggestions.value = data.data.map((item: any) => ({
        id: item.id,
        documentId: item.documentId,
        nom: item.nom,
        categorie: item.categorie || 'Autres'
      }));
    }
  } catch (err) {
    console.error("Error fetching remote suggestions:", err);
  } finally {
    isSearching.value = false;
  }
};

watch(() => props.modelValue, (newVal) => {
  if (!props.remoteSearchUrl) return;

  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    fetchRemoteSuggestions(newVal);
  }, 300);
});

// Normalise suggestion to string
const getDisplayValue = (item: any): string => {
  if (typeof item === 'string') return item;
  return item[props.displayKey] || '';
};

// Filter suggestions based on typed input
const filteredSuggestions = computed(() => {
  if (props.remoteSearchUrl) {
    return remoteSuggestions.value;
  }

  const query = props.modelValue.trim().toLowerCase();
  if (query === '') return props.suggestions.slice(0, 10); // Show first 10 when empty
  
  return props.suggestions
    .filter(item => {
      const val = getDisplayValue(item).toLowerCase();
      return val.includes(query);
    })
    .slice(0, 10);
});

// Check if modelValue matches any suggestion exactly
const hasExactMatch = computed(() => {
  const query = props.modelValue.trim().toLowerCase();
  if (!query) return true;
  const currentSuggestions = props.remoteSearchUrl ? remoteSuggestions.value : props.suggestions;
  return currentSuggestions.some(item => getDisplayValue(item).toLowerCase() === query);
});

const showCreateButtonInline = computed(() => {
  return props.modelValue.trim().length > 0 && !hasExactMatch.value;
});

const isNewItem = (item: any): boolean => {
  return item && item.isNew === true;
};

// Events
const onInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  emit('update:modelValue', val);
  isOpen.value = true;
  activeIndex.value = 0;
};

const onFocus = () => {
  isOpen.value = true;
  activeIndex.value = 0;
  if (props.remoteSearchUrl && remoteSuggestions.value.length === 0) {
    fetchRemoteSuggestions(props.modelValue);
  }
};

const selectSuggestion = (suggestion: any) => {
  const displayVal = getDisplayValue(suggestion);
  emit('update:modelValue', displayVal);
  emit('select', suggestion);
  isOpen.value = false;
  activeIndex.value = -1;
};

const triggerCreate = () => {
  const val = props.modelValue.trim();
  if (val) {
    emit('create', val);
    isOpen.value = false;
    activeIndex.value = -1;
  }
};

// Keyboard navigation
const onArrowDown = () => {
  if (!isOpen.value) {
    isOpen.value = true;
    return;
  }
  const max = filteredSuggestions.value.length - 1;
  if (activeIndex.value < max) {
    activeIndex.value++;
  } else {
    activeIndex.value = 0;
  }
};

const onArrowUp = () => {
  if (!isOpen.value) return;
  if (activeIndex.value > 0) {
    activeIndex.value--;
  } else {
    activeIndex.value = filteredSuggestions.value.length - 1;
  }
};

const onEnter = () => {
  if (!isOpen.value) return;
  if (activeIndex.value >= 0 && activeIndex.value < filteredSuggestions.value.length) {
    selectSuggestion(filteredSuggestions.value[activeIndex.value]);
  } else {
    triggerCreate();
  }
};

const onEsc = () => {
  isOpen.value = false;
  activeIndex.value = -1;
  inputRef.value?.blur();
};

// Click outside handling
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
    activeIndex.value = -1;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.autocomplete-container {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.autocomplete-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  color: #1e293b;
}

.autocomplete-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.inline-create-btn {
  position: absolute;
  right: 10px;
  background: #eff6ff;
  color: #3b82f6;
  border: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.inline-create-btn:hover {
  background: #3b82f6;
  color: white;
  transform: scale(1.1);
}

.suggestions-list {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08), 0 4px 10px rgba(15, 23, 42, 0.04);
  padding: 6px 0;
  margin: 0;
  list-style: none;
  z-index: 1000;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.suggestion-item {
  padding: 10px 16px;
  font-size: 0.95rem;
  color: #334155;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.15s ease;
}

.suggestion-item:hover, .suggestion-item.active {
  background-color: #f1f5f9;
  color: #1e293b;
}

.suggestion-text {
  font-weight: 500;
}

.new-badge {
  background: #dcfce7;
  color: #15803d;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
}

.empty-suggestions {
  padding: 4px 0;
}

.no-match-item {
  padding: 12px 16px;
  font-size: 0.95rem;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fffbeb;
  transition: all 0.2s;
}

.no-match-item:hover {
  background-color: #fef3c7;
  color: #78350f;
}

.no-match-text {
  flex: 1;
}

.no-match-text strong {
  color: #1e293b;
}

.plus-icon {
  font-size: 1.1rem;
}

.plus-badge {
  background: #fbbf24;
  color: #78350f;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  box-shadow: 0 2px 4px rgba(251, 191, 36, 0.2);
}

/* Animations */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
