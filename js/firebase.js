
import { getState, setState, getFirebaseConfig, getDefaultState } from './state.js';

let app;
let auth;
let db;
let unsubscribe;

export function initFirebase() {
    const firebaseConfig = getFirebaseConfig();
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    }
}

export async function setupRealtimeListener(uid, onData, onNewUser) {
    const userDocRef = db.collection('users').doc(uid);

    if (unsubscribe) unsubscribe();

    unsubscribe = userDocRef.onSnapshot(async (doc) => {
        if (doc.exists && Object.keys(doc.data()).length > 0) {
            onData(doc.data());
        } else {
            // New user or empty doc, create initial document in Firestore
            const defaultState = getDefaultState();
            setState(defaultState); 
            await db.collection('users').doc(uid).set(defaultState, { merge: true });
            onNewUser();
        }
    }, (error) => {
        console.error("Firestore listener error:", error);
    });
}

export async function saveState() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
        const cleanState = JSON.parse(JSON.stringify(getState()));
        await db.collection('users').doc(currentUser.uid).set(cleanState, { merge: true });
        console.log('State saved to Firestore.');
    } catch (e) {
        console.error("Failed to save state to Firestore:", e);
    }
}

export async function signInWithGoogle(showNotification, hideNotification) {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        showNotification('Открываю окно входа...', 'loading');
        await auth.signInWithPopup(provider);
        hideNotification();
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        showNotification(`Ошибка входа: ${error.message}`, 'error');
    }
}

export async function handleEmailPasswordAuth(event, showNotification, hideNotification) {
    event.preventDefault();
    const form = event.target;
    const email = form.querySelector('#auth-email').value;
    const password = form.querySelector('#auth-password').value;
    const isLoginMode = form.querySelector('#auth-submit-btn').textContent === 'Войти';

    showNotification(isLoginMode ? 'Вход...' : 'Регистрация...', 'loading');
    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, password);
        } else {
            await auth.createUserWithEmailAndPassword(email, password);
        }
        hideNotification();
    } catch (error) {
        console.error("Email/Password Auth Error:", error);
        showNotification(`Ошибка: ${error.message}`, 'error');
    }
}

export async function signOut(hideSettingsPanel, showNotification) {
    try {
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }
        await auth.signOut();
        setState(getDefaultState());
        hideSettingsPanel();
        showNotification('Вы успешно вышли из аккаунта.');
    } catch (error) {
         console.error("Sign Out Error:", error);
        showNotification(`Ошибка выхода: ${error.message}`, 'error');
    }
}
