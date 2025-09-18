// Debounce function to limit how often saveState is called
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};


// --- Refactored Save Logic for Immediate Persistence ---
let _saveState; // To hold the raw saveState function from firebase.js
const getSaveState = async () => {
    if (!_saveState) {
        const { saveState } = await import('./firebase.js');
        _saveState = saveState;
    }
    return _saveState;
}

let debouncedSave;
const getDebouncedSave = async () => {
    if (!debouncedSave) {
        const save = await getSaveState();
        debouncedSave = debounce(save, 1000);
    }
    return debouncedSave;
};


const version = '1.7.0-resilience';
const changelog = {
    '1.7.0-resilience': [
        '🚀 Полная переработка процесса генерации меню для максимальной надежности.',
        'Все промежуточные результаты теперь сохраняются в реальном времени в отдельное временное хранилище.',
        '✅ Теперь, если закрыть приложение на этапе предпросмотра, при следующем входе вы вернетесь на тот же экран.',
        'Процесс генерации стал полностью устойчив к разрывам соединения и другим сбоям.',
    ],
    '1.6.0-refactor': [
        '🚀 Архитектурное обновление! Приложение полностью пересобрано с нуля для повышения стабильности и производительности.',
        'Код разбит на логические модули (UI, API, Firebase, State), что устраняет множество ошибок и упрощает дальнейшую разработку.',
        'Исправлена критическая ошибка, мешавшая вводу API-ключа.',
    ]
};

const firebaseConfig = {
  apiKey: "AIzaSyAhBuja9z5124TrA65M9agA8IEHobby0h4",
  authDomain: "family-menu-563ef.firebaseapp.com",
  projectId: "family-menu-563ef",
  storageBucket: "family-menu-563ef.firebasestorage.app",
  messagingSenderId: "1096564405600",
  appId: "1:1096564405600:web:1fdb4e5e094396152ada05",
  measurementId: "G-BVDV6ZWRHM"
};


const defaultState = {
    settings: {
        apiKey: null,
        family: [],
        preferences: "Без рыбы, без грибов",
        menuDuration: 7,
        totalBudget: 10000,
        cuisine: "Любая",
        difficulty: "Любая",
    },
    menu: [],
    recipes: {},
    shoppingList: [],
    menuHistory: [], // For storing past menus
    recipeCache: {},
    cookedMeals: {},
    timestamp: null,
    currentDayIndex: 0,
    previewData: null, // For storing menu/recipes during generation/preview
};

let state = JSON.parse(JSON.stringify(defaultState));

export function getState() {
    return state;
}

export function setState(newState) {
    if (newState) {
        state = { ...defaultState, ...newState };
        // Ensure recipeCache and previewData exist for users with older state structures
        if (!state.recipeCache) {
            state.recipeCache = {};
        }
        if (!state.previewData) {
            state.previewData = null;
        }
    } else {
        state = JSON.parse(JSON.stringify(defaultState));
    }
}

export async function updateState(updates, immediate = false) {
    state = { ...state, ...updates };

    if (immediate) {
        // Call saveState directly, bypassing the debounce for critical updates
        // like saving a recipe during generation.
        const save = await getSaveState();
        if (save) await save();
    } else {
        // Use the debounced save for regular UI updates to avoid excessive writes.
        const save = await getDebouncedSave();
        if (save) save();
    }
}


export function getVersion() {
    return version;
}

export function getChangelog() {
    return changelog;
}

export function getFirebaseConfig() {
    return firebaseConfig;
}

export function getDefaultState() {
    return JSON.parse(JSON.stringify(defaultState));
}