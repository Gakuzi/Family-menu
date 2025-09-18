
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


const version = '1.6.0-refactor';
const changelog = {
    '1.6.0-refactor': [
        '🚀 Архитектурное обновление! Приложение полностью пересобрано с нуля для повышения стабильности и производительности.',
        'Код разбит на логические модули (UI, API, Firebase, State), что устраняет множество ошибок и упрощает дальнейшую разработку.',
        'Исправлена критическая ошибка, мешавшая вводу API-ключа.',
    ],
    '1.5.2-hotfix': [
        '🔥 Исправлена критическая ошибка, из-за которой невозможно было ввести API-ключ в мастере настройки.',
        'Улучшена логика обновления интерфейса для предотвращения подобных ошибок в будущем.',
    ],
    '1.5.1-hotfix': [
        'Улучшена обработка ошибок API-ключа Gemini.',
        'Добавлены более понятные сообщения при сетевых ошибках и региональных ограничениях.',
        'Исправлена логика, при которой неверный ключ удалялся после ошибки.',
    ],
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
    temp: null, // For preview screen
};

let state = JSON.parse(JSON.stringify(defaultState));

export function getState() {
    return state;
}

export function setState(newState) {
    if (newState) {
        state = { ...defaultState, ...newState };
        // Ensure recipeCache exists for users with older state structures
        if (!state.recipeCache) {
            state.recipeCache = {};
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