
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

let _saveState;
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
        debouncedSave = debounce(save, 1500);
    }
    return debouncedSave;
};


const version = '2.0.0-job-assistant';
const changelog = {
    '2.0.0-job-assistant': [
        '🚀 Полная переработка приложения в "AI Job Search Assistant"!',
        '✨ Добавлен умный мастер настройки для создания вашего профессионального профиля.',
        '🧠 Интеграция с Gemini для генерации релевантных (но вымышленных) вакансий на основе вашего профиля.',
        '🖥️ Новый интерфейс с дашбордом для просмотра подходящих вакансий.',
        '🔧 Обновленный экран настроек для управления вашим профилем и API-ключом.',
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
        profile: {
            fullName: '',
            desiredRole: '',
            experience: 5,
            keySkills: 'React, TypeScript, Node.js, UI/UX Design',
            salaryExpectation: 'от 250 000 руб.',
            location: 'Удаленно, гибрид (Москва)',
            summary: 'Ищу возможность применить свои навыки в продуктовой компании для создания инновационных и удобных пользовательских интерфейсов.'
        },
        connectedPlatforms: [],
    },
    jobListings: [],
    timestamp: null,
};

let state = JSON.parse(JSON.stringify(defaultState));

export function getState() {
    return state;
}

export function setState(newState) {
    if (newState && Object.keys(newState).length > 0) {
        // Deep merge to preserve nested structures like 'profile' if they exist partially
        state = {
            ...defaultState,
            ...newState,
            settings: {
                ...defaultState.settings,
                ...(newState.settings || {}),
                profile: {
                    ...defaultState.settings.profile,
                    ...((newState.settings && newState.settings.profile) || {})
                }
            }
        };
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
