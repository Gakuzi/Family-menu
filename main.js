import { initFirebase, setupRealtimeListener, signInWithGoogle, handleEmailPasswordAuth, signOut } from './js/firebase.js';
import { getState, setState, updateState, getVersion, getChangelog } from './js/state.js';
import * as ui from './js/ui.js';
import * as api from './js/api.js';

document.addEventListener('DOMContentLoaded', init);

function init() {
    ui.renderAppLayout();
    initFirebase();
    ui.setupEventListeners(eventHandlers);

    firebase.auth().onAuthStateChanged(handleAuthStateChange);
}

async function handleAuthStateChange(user) {
    if (user) {
        console.log('User is signed in:', user.uid);
        ui.showLoader('Синхронизация данных...');
        
        await setupRealtimeListener(user.uid, 
            (data) => { // onData
                setState(data);
                const { menu, previewData, apiKeys } = getState();
                
                // RESUME PREVIEW: If generation was completed but not accepted
                if (previewData && previewData.status === 'complete') {
                    console.log("Resuming to preview screen.");
                    showPreviewScreen();
                } else if (menu && menu.length > 0 && apiKeys && apiKeys.filter(k => k.enabled).length > 0) {
                    console.log('User has menu and keys, showing main screen.');
                    ui.initMainScreen();
                    ui.showScreen('main');
                } else {
                    // Only navigate to setup if we're not already there, to prevent a Firestore read/write loop.
                    if (ui.getCurrentScreen() !== 'setup') {
                        console.log('New user, no menu, or no keys. Showing setup screen.');
                        navigateWizard(1, true); // Start wizard from step 1
                        ui.showScreen('setup');
                    }
                }
                ui.hideLoader();
                ui.updateSettingsUserInfo(user.email);
            },
            () => { // onNewUser
                console.log('New user detected, starting wizard.');
                navigateWizard(1, true);
                ui.showScreen('setup');
                ui.hideLoader();
                ui.updateSettingsUserInfo(user.email);
            }
        );
    } else {
        console.log('User is signed out.');
        ui.showScreen('auth');
        ui.hideLoader();
    }
}

async function startGeneration() {
    const { settings } = getState();
    ui.showScreen('setup');
    ui.showGenerationProgress();
    
    try {
        let totalRecipes = settings.menuDuration * 4; // Approx. 4 meals a day
        let recipesDone = 0;
        
        // Step 1: Reset preview data and set status to generating
        await updateState({ previewData: { menu: [], recipes: {}, status: 'generating' } }, true);
        ui.updateGenerationProgress(0, 'Начинаю планирование...', `Составляю план на ${settings.menuDuration} дней.`);

        // Step 2: Generate the menu plan
        const menuPlan = await api.generateMenuPlan(settings);
        await updateState({ previewData: { ...getState().previewData, menu: menuPlan } }, true);

        // Step 3: Generate recipes for the menu plan, one by one
        const allRecipeNames = menuPlan.flatMap(day => day.meals.map(meal => meal.name));
        const uniqueRecipeNames = [...new Set(allRecipeNames.filter(name => name.toLowerCase() !== 'остатки'))];
        totalRecipes = uniqueRecipeNames.length;

        ui.updateGenerationProgress(5, 'План готов!', `Теперь создаю ${totalRecipes} уникальных рецептов...`);
        
        const generatedRecipeIds = new Set();
        
        for (const recipeName of uniqueRecipeNames) {
            ui.updateGenerationProgress(
                5 + (recipesDone / totalRecipes) * 95, 
                `Создаю рецепт: ${recipeName}`,
                `${recipesDone} из ${totalRecipes} готово`
            );
            
            const recipe = await api.generateSingleRecipe(recipeName, settings, Array.from(generatedRecipeIds));
            generatedRecipeIds.add(recipe.id);
            
            // Save each recipe to previewData immediately
            const currentPreviewData = getState().previewData;
            const updatedRecipes = { ...currentPreviewData.recipes, [recipe.id]: recipe };
            await updateState({ previewData: { ...currentPreviewData, recipes: updatedRecipes } }, true);

            recipesDone++;
        }

        // Step 4: Finalize and move to preview
        ui.updateGenerationProgress(100, 'Все рецепты созданы!', 'Готовлю предпросмотр...');
        await updateState({ previewData: { ...getState().previewData, status: 'complete' } }, true);

        setTimeout(() => showPreviewScreen(), 500);

    } catch (error) {
        console.error('Critical error during generation:', error);
        ui.showGenerationError(`Произошла ошибка: ${error.message}`, startGeneration);
        await updateState({ previewData: null }, true); // Clear preview on error
    }
}


function showPreviewScreen() {
    const { previewData } = getState();
    if (!previewData || !previewData.menu) {
        console.error("Attempted to show preview screen with no preview data.");
        ui.showScreen('setup'); // Go back to setup if data is missing
        return;
    }
    ui.renderPreviewMenu(previewData.menu, previewData.recipes);
    ui.showScreen('preview');
}

function navigateWizard(targetStep, isInitial = false) {
    const totalSteps = 4; // Updated from 3 to 4
    let currentStep = targetStep;

    if (currentStep < 1) currentStep = 1;
    if (currentStep > totalSteps) {
        startGeneration();
        return;
    }

    ui.updateWizardStep(currentStep, totalSteps);

    // Update state for wizard navigation
    updateState({ wizardStep: currentStep });

    const nextButton = document.getElementById('wizard-next-btn');
    if (currentStep === totalSteps) {
        nextButton.textContent = 'Сгенерировать меню';
    } else {
        nextButton.textContent = 'Далее';
    }

    if (isInitial) {
        ui.populateWizardFromState(getState());
    }
}

async function handleRegenerateSingleMeal(dayIndex, mealIndex, mealName) {
    ui.showNotification(`Пересоздаю "${mealName}"...`, 'loading');
    try {
        const { settings, previewData } = getState();
        
        // Find and remove the old recipe from the preview recipes object
        const oldRecipeEntry = Object.entries(previewData.recipes).find(([id, recipe]) => recipe.name === mealName);
        const updatedRecipes = { ...previewData.recipes };
        if (oldRecipeEntry) {
            delete updatedRecipes[oldRecipeEntry[0]];
        }
        
        const existingRecipeIds = Object.keys(updatedRecipes);
        const newRecipe = await api.generateSingleRecipe(mealName, settings, existingRecipeIds);
        
        // Add the new recipe
        updatedRecipes[newRecipe.id] = newRecipe;
        
        // Update state and re-render
        await updateState({ previewData: { ...previewData, recipes: updatedRecipes } }, true);
        ui.renderPreviewMenu(getState().previewData.menu, getState().previewData.recipes);
        
        ui.hideNotification();
        ui.showNotification('Блюдо успешно обновлено!');
    } catch (error) {
        ui.showNotification('Ошибка при обновлении блюда.', 'error');
        console.error('Error regenerating single meal:', error);
    }
}


// This object centralizes all event handling logic
const eventHandlers = {
    // --- Auth ---
    onGoogleSignIn: () => signInWithGoogle(ui.showNotification, ui.hideNotification),
    onEmailPasswordAuth: (e) => handleEmailPasswordAuth(e, ui.showNotification, ui.hideNotification),
    onSignOut: () => signOut(() => ui.showScreen('auth'), ui.showNotification),

    // --- Wizard ---
    onWizardNext: () => {
        const currentStep = getState().wizardStep || 1;
        if (ui.saveWizardStepToState(currentStep)) {
            navigateWizard(currentStep + 1);
        }
    },
    onWizardBack: () => navigateWizard((getState().wizardStep || 1) - 1),
    onRunWizard: () => {
        ui.hideSettingsPanel();
        navigateWizard(1, true);
        ui.showScreen('setup');
    },
    
    // --- Preview Screen ---
    onAcceptPreview: async () => {
        ui.showNotification('Сохраняю меню...', 'loading');
        const { previewData, settings } = getState();
        const { menu, recipes } = previewData;

        // Simple shopping list generation (can be improved)
        const shoppingList = ui.generateShoppingList(Object.values(recipes));

        await updateState({
            menu,
            recipes,
            shoppingList,
            menuHistory: [...(getState().menuHistory || []), { date: new Date().toISOString(), menu }],
            timestamp: Date.now(),
            currentDayIndex: 0,
            previewData: null // CLEAR PREVIEW DATA
        });
        
        ui.showNotification('Меню успешно сохранено!');
        ui.initMainScreen();
        ui.showScreen('main');
    },
    onRegenerateAllPreview: () => {
        ui.showModal({
            title: 'Пересоздать всё меню?',
            body: 'Текущий вариант будет удален. Вы уверены?',
            buttons: [
                { text: 'Отмена', class: 'secondary', action: ui.hideModal },
                { text: 'Да, пересоздать', class: 'danger', action: () => {
                    ui.hideModal();
                    startGeneration();
                }}
            ]
        });
    },
    onRegenerateSingleMeal: (el) => {
         const { dayIndex, mealIndex, mealName } = el.dataset;
         handleRegenerateSingleMeal(parseInt(dayIndex), parseInt(mealIndex), mealName);
    },

    // --- Main Screen ---
    onNavButtonClick: (contentId, title) => {
        ui.setActiveContent(contentId, title);
        if (contentId === 'shopping-list-content') {
            ui.renderShoppingList(getState().shoppingList);
        } else if (contentId === 'budget-content') {
            ui.renderBudget(getState());
        }
    },
    onChangeDay: (direction) => {
        let { currentDayIndex, menu } = getState();
        currentDayIndex += direction;
        if (currentDayIndex < 0) currentDayIndex = menu.length - 1;
        if (currentDayIndex >= menu.length) currentDayIndex = 0;
        updateState({ currentDayIndex });
        ui.renderDailyMenu(getState());
    },
    onMealClick: (recipeId) => {
        const { recipes } = getState();
        const recipe = recipes[recipeId];
        if (recipe) {
            ui.showRecipeScreen(recipe);
        }
    },
    onToggleCooked: (dayIndex, mealIndex) => {
        const { menu, cookedMeals } = getState();
        const date = new Date();
        date.setDate(date.getDate() + (dayIndex - getState().currentDayIndex));
        const dateString = date.toISOString().split('T')[0];
        const mealId = `${dateString}-${mealIndex}`;

        const newCookedMeals = { ...cookedMeals };
        if (newCookedMeals[mealId]) {
            delete newCookedMeals[mealId];
        } else {
            newCookedMeals[mealId] = true;
        }
        updateState({ cookedMeals: newCookedMeals });
        ui.renderDailyMenu(getState());
    },

    // --- Recipe Screen ---
    onRecipeNav: (direction) => ui.navigateRecipeStep(direction),

    // --- Shopping List ---
    onToggleShoppingItem: (itemId) => {
        const { shoppingList } = getState();
        const item = shoppingList.find(i => i.id === itemId);
        if (item) {
            item.completed = !item.completed;
            updateState({ shoppingList });
            ui.renderShoppingList(shoppingList);
        }
    },
    
    // --- Settings ---
    onSaveSettings: async () => {
        if (ui.saveSettingsToState()) {
            ui.showNotification('Настройки успешно сохранены!');
        }
    },
    onClearCache: () => {
        updateState({ recipeCache: {} });
        ui.showNotification('Кэш рецептов очищен.');
    },
    onShowChangelog: () => {
        const changelog = getChangelog();
        const version = getVersion();
        let body = `<h3>Версия: ${version}</h3><ul>`;
        for (const v in changelog) {
            body += `<li><strong>Версия ${v}:</strong><ul>${changelog[v].map(item => `<li>${item}</li>`).join('')}</ul></li>`;
        }
        body += '</ul>';
        ui.showModal({ title: 'История изменений', body, buttons: [{ text: 'Закрыть', class: 'primary', action: ui.hideModal }] });
    },
    // Family member and API Key handlers are managed inside ui.js and call updateState directly
};