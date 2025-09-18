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


const version = '1.9.0-multi-key';
const changelog = {
    '1.9.0-multi-key': [
        '🚀 Реализована система управления несколькими API-ключами.',
        '✨ Добавлено автоматическое переключение на следующий ключ, если текущий не работает.',
        '🔧 Исправлена критическая ошибка сборки, связанная с Gemini API.',
        '⚙️ Улучшена логика старта приложения: мастер настройки запускается, если не добавлены ключи.',
    ],
    '1.8.0-secure-api': [
        '🚀 Исправлена ошибка сборки, связанная с обновлением Gemini API.',
        'Обновлена вся логика взаимодействия с ИИ до последней, более стабильной версии.',
        '🔐 Улучшена безопасность: приложение больше не запрашивает API ключ. Он должен быть задан в переменных окружения для хостинга.',
        'Мастер настройки упрощен, убран шаг с вводом ключа.',
    ],
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
    apiKeys: [], // e.g., [{ key: "...", enabled: true }]
    settings: {
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
    menuHistory: [],
    recipeCache: {},
    cookedMeals: {},
    timestamp: null,
    currentDayIndex: 0,
    previewData: null,
};

let state = JSON.parse(JSON.stringify(defaultState));

export function getState() {
    return state;
}

export function setState(newState) {
    if (newState) {
        // Carry over old apiKeys if not present in newState to support older state structures.
        const existingApiKeys = state.apiKeys || [];
        state = { ...defaultState, ...newState };

        if (!newState.apiKeys && existingApiKeys.length > 0) {
            state.apiKeys = existingApiKeys;
        }

        // Ensure new properties exist for users with older state structures
        if (!state.apiKeys) {
            state.apiKeys = [];
        }
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
        const save = await getSaveState();
        if (save) await save();
    } else {
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