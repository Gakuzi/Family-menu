

import { initFirebase, signInWithGoogle, handleEmailPasswordAuth, signOut, saveState, setupRealtimeListener } from './js/firebase.js';
import { getState, setState, updateState, getVersion, getChangelog } from './js/state.js';
import { startGenerationProcess, handleRegeneration } from './js/api.js';
import * as ui from './js/ui.js';

const app = {
    init() {
        // First, render the basic HTML structure into the #app element
        ui.renderAppLayout();
        // Then, cache all the newly created DOM elements
        ui.cacheDom();
        
        initFirebase();
        this.addEventListeners();

        // The main logic driver is the auth state listener
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                ui.dom.loaderText.textContent = 'Синхронизация данных...';
                // Firestore listener will handle the initial data load and subsequent UI rendering
                setupRealtimeListener(user.uid, (data) => {
                    setState(data);
                    ui.dom.appLoader.classList.add('hidden');
                    if (getState().settings.apiKey && getState().menu?.length > 0) {
                        ui.showScreen('main-screen');
                        ui.renderAll();
                    } else {
                        ui.showWizard();
                    }
                }, () => {
                     // This callback is for new users
                    ui.dom.appLoader.classList.add('hidden');
                    ui.showWizard();
                });
            } else {
                // No user is signed in.
                const hasSeenSplash = localStorage.getItem('hasSeenSplash') === 'true';
                 if (!hasSeenSplash) {
                    ui.showScreen('splash-screen');
                } else {
                    ui.showScreen('auth-screen');
                }
                ui.dom.appLoader.classList.add('hidden');
            }
        });
    },

    addEventListeners() {
        const dom = ui.dom; // Shortcut
        
        dom.startAppBtn.addEventListener('click', () => {
            localStorage.setItem('hasSeenSplash', 'true');
            ui.showScreen('auth-screen');
        });

        // Auth
        dom.googleSigninBtn.addEventListener('click', () => signInWithGoogle(ui.showNotification, ui.hideNotification));
        dom.authForm.addEventListener('submit', (e) => handleEmailPasswordAuth(e, ui.showNotification, ui.hideNotification));
        dom.authToggleModeBtn.addEventListener('click', ui.toggleAuthMode);
        
        // Wizard
        dom.wizardNextBtn.addEventListener('click', () => this.navigateWizard(1));
        dom.wizardBackBtn.addEventListener('click', () => this.navigateWizard(-1));
        dom.apiKeyInput.addEventListener('input', (e) => {
            // This is the correct, non-intrusive way to handle input validation
            if (ui.wizard.currentStep === 1) {
                dom.wizardNextBtn.disabled = e.target.value.trim().length === 0;
            }
        });
        dom.apiKeyHelpLink.addEventListener('click', (e) => {
            e.preventDefault();
            ui.showApiKeyHelpModal();
        });
        dom.wizardAddFamilyMemberBtn.addEventListener('click', () => ui.openFamilyMemberModal(null, true));

        // Preview
        dom.previewAcceptBtn.addEventListener('click', () => this.acceptPreview());
        dom.previewRegenerateAllBtn.addEventListener('click', () => this.startGeneration(true));

        // Main Navigation
        dom.bottomNav.addEventListener('click', ui.handleNav);
        dom.backToMenuBtn.addEventListener('click', () => ui.showScreen('main-screen'));
        dom.prevDayBtn.addEventListener('click', () => ui.navigateMenuDay(-1));
        dom.nextDayBtn.addEventListener('click', () => ui.navigateMenuDay(1));
        
        // Recipe
        dom.prevStepBtn.addEventListener('click', () => ui.navigateRecipeStep(-1));
        dom.nextStepBtn.addEventListener('click', () => ui.navigateRecipeStep(1));
        dom.startTimerBtn.addEventListener('click', ui.startTimer);
        dom.pauseTimerBtn.addEventListener('click', ui.pauseTimer);
        dom.resetTimerBtn.addEventListener('click', ui.resetTimer);
        
        // Settings
        dom.openSettingsBtn.addEventListener('click', ui.showSettingsPanel);
        dom.settingsCloseBtn.addEventListener('click', ui.hideSettingsPanel);
        dom.settingsSaveSettingsBtn.addEventListener('click', () => this.saveSettings());
        dom.settingsAddFamilyMemberBtn.addEventListener('click', () => ui.openFamilyMemberModal());
        dom.settingsRegenerateAllBtn.addEventListener('click', () => ui.confirmRegenerateAll(() => this.startGeneration(true, true)));
        dom.settingsClearCacheBtn.addEventListener('click', () => ui.confirmClearCache());
        dom.settingsSaveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        dom.settingsRunWizardBtn.addEventListener('click', () => {
            ui.hideSettingsPanel();
            ui.showWizard();
        });
        dom.settingsShowChangelogBtn.addEventListener('click', () => ui.showChangelogModal(getVersion(), getChangelog()));
        dom.settingsSignOutBtn.addEventListener('click', () => signOut(ui.hideSettingsPanel, ui.showNotification));

        // Modal
        dom.modalOverlay.addEventListener('click', (e) => {
            if (e.target === dom.modalOverlay) {
                ui.hideModal();
            }
        });
        
        // Delegated listener for main content area (Shopping List, Cooked Meals)
        const mainContentArea = document.querySelector('.content-area');
        mainContentArea.addEventListener('click', (e) => {
            // Shopping List Item Toggle
            const shoppingItem = e.target.closest('.shopping-item');
            if (shoppingItem && shoppingItem.closest('#shopping-list-container')) {
                const { categoryIndex, itemIndex } = shoppingItem.dataset;
                if (categoryIndex === undefined || itemIndex === undefined) return;

                const state = getState();
                // Deep copy to avoid state mutation issues
                const shoppingList = JSON.parse(JSON.stringify(state.shoppingList || []));
                const item = shoppingList[categoryIndex].items[itemIndex];
                
                if (item.purchases && item.purchases.length > 0) {
                    item.purchases = []; // Mark as not purchased
                } else {
                    // Mark as purchased
                    item.purchases = [{
                        qty: item.shoppingSuggestion.qty,
                        price: item.price, // Use the estimated price
                        timestamp: Date.now()
                    }];
                }
                
                updateState({ shoppingList: shoppingList });
                ui.renderShoppingList();
                ui.renderBudget(); // Update budget as items are purchased
                return;
            }

            // Cooked Meal Toggle
            const cookedToggle = e.target.closest('.cooked-toggle');
            if (cookedToggle && cookedToggle.closest('#daily-menu-container')) {
                 const { dayName, mealKey } = cookedToggle.dataset;
                 const cookedMeals = { ...(getState().cookedMeals || {}) };

                if (!cookedMeals[dayName]) {
                    cookedMeals[dayName] = [];
                }

                if (cookedMeals[dayName].includes(mealKey)) {
                    cookedMeals[dayName] = cookedMeals[dayName].filter(key => key !== mealKey);
                } else {
                    cookedMeals[dayName].push(mealKey);
                }

                updateState({ cookedMeals });
                ui.renderMenu();
                return;
            }
        });


        // Delegated listener for family members
        const handleFamilyMemberAction = (e, isWizard) => {
            const deleteBtn = e.target.closest('.delete-member-btn');
            const editBtn = e.target.closest('.edit-member-btn');
            
            if (deleteBtn) {
                const idToRemove = deleteBtn.dataset.id;
                const currentSettings = getState().settings;
                
                // Robustly filter out the member, creating a new array.
                const updatedFamily = (currentSettings.family || []).filter(m => m && m.id != null && m.id.toString() !== idToRemove);
                
                const newSettings = { ...currentSettings, family: updatedFamily };
                updateState({ settings: newSettings });
                
                ui.renderFamilyMembers(isWizard);
                if (isWizard) ui.updateWizardView();
                return;
            }
    
            if (editBtn) {
                const idToEdit = editBtn.dataset.id;
                const member = (getState().settings.family || []).find(m => m && m.id != null && m.id.toString() === idToEdit);
                if (member) {
                    ui.openFamilyMemberModal(member, isWizard);
                }
                return;
            }
        };
        
        // Delegated listener for menu history
        dom.settingsMenuHistoryContainer.addEventListener('click', e => {
            const activateBtn = e.target.closest('.activate-history-btn');
            const deleteBtn = e.target.closest('.delete-history-btn');
            const history = getState().menuHistory || [];

            if (activateBtn) {
                const index = parseInt(activateBtn.dataset.index, 10);
                const historyItem = history[index];
                if (historyItem) {
                    ui.showModal(
                        "Активировать меню?",
                        "Ваше текущее меню, рецепты и список покупок будут заменены на выбранные из истории. Продолжить?",
                        [
                            { text: 'Отмена', class: 'secondary' },
                            { text: 'Да, активировать', class: 'primary', action: () => {
                                updateState({
                                    menu: historyItem.menu,
                                    recipes: historyItem.recipes,
                                    shoppingList: historyItem.shoppingList,
                                    cookedMeals: {}, // Reset cooked status
                                    currentDayIndex: 0,
                                    timestamp: historyItem.timestamp
                                });
                                saveState();
                                ui.hideSettingsPanel();
                                ui.showScreen('main-screen');
                                ui.renderAll();
                                ui.showNotification("Меню из истории активировано!");
                            }}
                        ]
                    );
                }
            }

            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index, 10);
                ui.showModal(
                    "Удалить запись?",
                    "Вы уверены, что хотите удалить эту запись из истории? Это действие нельзя отменить.",
                    [
                        { text: 'Отмена', class: 'secondary' },
                        { text: 'Да, удалить', class: 'danger', action: () => {
                            const updatedHistory = history.filter((_, i) => i !== index);
                            updateState({ menuHistory: updatedHistory });
                            saveState();
                            ui.renderMenuHistory();
                            ui.showNotification("Запись удалена из истории.");
                        }}
                    ]
                );
            }
        });


        dom.wizardFamilyMembersContainer.addEventListener('click', (e) => handleFamilyMemberAction(e, true));
        dom.settingsFamilyMembersContainer.addEventListener('click', (e) => handleFamilyMemberAction(e, false));
    },
    
    async startGeneration(isRegenerating = false, fromSettings = false) {
        let purchasedItems = '';
        if (fromSettings) {
             purchasedItems = (getState().shoppingList || [])
                .flatMap(c => c.items || [])
                .filter(item => (item.purchases || []).length > 0)
                .map(item => `${item.name} (${item.purchases.reduce((sum, p) => sum + p.qty, 0)} ${item.shoppingSuggestion.unit})`)
                .join(', ');
             ui.hideSettingsPanel();
        }

        ui.showScreen('setup-screen');
        ui.prepareForGeneration();
        
        try {
            const comprehensiveData = await startGenerationProcess(getState(), purchasedItems, '', (percent, status, details) => ui.updateProgress(percent, status, details));
            if (!comprehensiveData || !comprehensiveData.menu || comprehensiveData.menu.length === 0) {
                throw new Error("Menu generation failed or returned empty data.");
            }
            // Store results in a temporary state for preview
            updateState({ temp: comprehensiveData });
            ui.renderPreview();
            ui.showScreen('preview-screen');

        } catch(error) {
            console.error("Generation failed:", error);
            
            let errorMessage;
            const errorPrefix = error.message.match(/^\[(.*?)\]/); // Matches "[Step Name]"

            if (errorPrefix) {
                const stepName = errorPrefix[1];
                errorMessage = `Произошла ошибка на этапе "${stepName}". Пожалуйста, попробуйте изменить настройки или сгенерировать меню еще раз.`;
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Ошибка сети при подключении к Gemini. Серверы Google AI могут быть недоступны в вашем регионе. Попробуйте использовать VPN.';
            } else if (error.message.includes('API key not valid')) {
                errorMessage = 'Введенный API ключ недействителен. Пожалуйста, скопируйте ключ еще раз из Google AI Studio.';
            } else {
                errorMessage = `Не удалось сгенерировать меню. Пожалуйста, попробуйте еще раз.`;
            }

            // Add raw error for debugging purposes in the UI
            errorMessage += `<br><small style="color: #999;">Детали: ${error.message}</small>`;

            ui.showGenerationError(errorMessage);
        }
    },

    acceptPreview() {
        const tempState = getState().temp;
        if (tempState) {
            const timestamp = new Date().toISOString();
            
            // Create a history entry from the temp state
            const historyEntry = {
                menu: tempState.menu,
                recipes: tempState.recipes,
                shoppingList: tempState.shoppingList,
                timestamp: timestamp
            };

            // Get current history, add new entry, and trim to 5
            const currentHistory = getState().menuHistory || [];
            const newHistory = [historyEntry, ...currentHistory];
            const trimmedHistory = newHistory.slice(0, 5); // Keep the last 5 menus

            // Merge the temp state into the main state and update history
            updateState({
                menu: tempState.menu,
                recipes: tempState.recipes,
                shoppingList: tempState.shoppingList,
                menuHistory: trimmedHistory,
                timestamp: timestamp,
                currentDayIndex: 0,
                cookedMeals: {}, // Reset cooked status for new menu
                temp: null // Clear the temp state
            });
            
            saveState(); // Explicit save after a major change
            ui.showScreen('main-screen');
            ui.renderAll();
            ui.showNotification("Меню сохранено и добавлено в историю!");
        }
    },
    
    saveSettings() {
        const dom = ui.dom;
        const newSettings = {
            ...getState().settings,
            menuDuration: parseInt(dom.settingsMenuDuration.value) || 7,
            totalBudget: parseInt(dom.settingsTotalBudget.value) || 10000,
            preferences: dom.settingsPreferences.value,
            cuisine: dom.settingsCuisine.value,
            difficulty: dom.settingsDifficulty.value,
        };
        updateState({ settings: newSettings });
        saveState();
        ui.renderBudget(); 
        ui.showNotification("Настройки сохранены.");
    },
    
    async saveApiKey() {
        const newApiKey = ui.dom.settingsApiKey.value.trim();
        if (!newApiKey) {
            ui.showNotification('API ключ не может быть пустым', 'error');
            return;
        }
        ui.showNotification('Проверка ключа...', 'loading');
        
        try {
            // A simple validation call to the API module
            await handleRegeneration('validate', { apiKey: newApiKey });
            
            const newSettings = { ...getState().settings, apiKey: newApiKey };
            updateState({ settings: newSettings });
            saveState();
            ui.showNotification('API ключ успешно сохранен и проверен!');
        } catch (error) {
            console.error("API Key validation failed:", error);
             let errorMessage = 'Неверный API ключ. Проверьте его и попробуйте снова.';
            if (error.message.includes('Network error')) {
                errorMessage = 'Ошибка сети при проверке ключа. Серверы Google AI могут быть недоступны в вашем регионе. Попробуйте использовать VPN.';
            } else if (error.message.includes('API key not valid')) {
                errorMessage = 'API ключ недействителен. Пожалуйста, проверьте правильность введенного ключа.';
            }
            ui.showNotification(errorMessage, 'error');
        }
    },

    navigateWizard(direction) {
        const currentStep = ui.wizard.currentStep;
        
        if (direction > 0) { // Moving forward, save data
            const settings = getState().settings;
            if (currentStep === 1) {
                settings.apiKey = ui.dom.apiKeyInput.value.trim();
            } else if (currentStep === 3) {
                settings.menuDuration = parseInt(ui.dom.wizardMenuDuration.value) || 7;
                settings.totalBudget = parseInt(ui.dom.wizardTotalBudget.value) || 10000;
                settings.preferences = ui.dom.wizardPreferences.value;
                settings.cuisine = ui.dom.wizardCuisine.value;
                settings.difficulty = ui.dom.wizardDifficulty.value;
            }
            updateState({ settings });

            if (currentStep === ui.wizard.totalSteps) {
                this.startGeneration();
                return;
            }
        }
        
        ui.navigateWizard(direction);
    },
};

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = app; // For easier debugging if needed
    app.init();
});