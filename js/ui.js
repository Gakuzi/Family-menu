import { updateState, getState, getVersion } from "./state.js";

// --- DOM Element Selectors ---
// Cached DOM elements to avoid repeated lookups
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

let dom = {};

// --- Core UI Functions ---

export function renderAppLayout() {
    // Instead of directly manipulating body, we target the #app container
    // This is safer and avoids replacing the script tags.
    const appContainer = document.getElementById('app');
    if (appContainer) {
        appContainer.innerHTML = document.querySelector('template[name="app-layout"]').innerHTML;
    } else {
        // Fallback for the very first render if #app isn't in the initial HTML
        document.body.innerHTML = document.querySelector('template[name="app-layout"]').innerHTML;
    }
    
    // Cache main DOM elements after rendering
    dom = {
        app: $('#app'),
        loader: $('#app-loader'),
        loaderText: $('#loader-text'),
        screens: $$('.screen'),
        // Add other frequently accessed elements here
    };

    // Initial setup
    showSplashScreen();
}

// --- Event Listener Setup ---

export function setupEventListeners(handlers) {
    // This uses event delegation on a parent element for efficiency
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        // Handle buttons first
        const button = target.closest('button');
        if (button) {
            const id = button.id;
            const action = button.dataset.action;

            // Auth
            if (id === 'google-signin-btn') handlers.onGoogleSignIn();
            if (id === 'start-app-btn') showScreen('auth');

            // Wizard
            if (id === 'wizard-next-btn') handlers.onWizardNext();
            if (id === 'wizard-back-btn') handlers.onWizardBack();
            if (id === 'settings-run-wizard-btn' || id === 'settings-regenerate-all-btn') handlers.onRunWizard(); // Also handle regenerate from settings
            
            // Family Members (Wizard & Settings)
            if (id === 'wizard-add-family-member-btn' || id === 'settings-add-family-member-btn') {
                showAddFamilyMemberModal();
            }
            if (action === 'delete-family-member') {
                const index = parseInt(button.dataset.index);
                deleteFamilyMember(index);
            }
            if (action === 'edit-family-member') {
                const index = parseInt(button.dataset.index);
                const member = getState().settings.family[index];
                showAddFamilyMemberModal(member, index);
            }

            // Preview
            if (id === 'preview-accept-btn') handlers.onAcceptPreview();
            if (id === 'preview-regenerate-all-btn') handlers.onRegenerateAllPreview();
            if (target.closest('.regenerate-btn')) handlers.onRegenerateSingleMeal(target.closest('.regenerate-btn'));

            // Main Screen Nav
            if (button.classList.contains('nav-button')) {
                 handlers.onNavButtonClick(button.dataset.content, button.dataset.title);
            }
            if (id === 'prev-day-btn') handlers.onChangeDay(-1);
            if (id === 'next-day-btn') handlers.onChangeDay(1);
            if (id === 'open-settings-btn') showSettingsPanel();

            // Meals
            if (target.closest('.cooked-toggle')) {
                const mealEl = target.closest('.meal');
                handlers.onToggleCooked(parseInt(mealEl.dataset.dayIndex), parseInt(mealEl.dataset.mealIndex));
            }
            
            // Recipe Screen
            if (id === 'back-to-menu-btn') showScreen('main');
            if (id === 'prev-step-btn') handlers.onRecipeNav(-1);
            if (id === 'next-step-btn') handlers.onRecipeNav(1);
            
            // Settings
            if (id === 'settings-close-btn') hideSettingsPanel();
            if (id === 'settings-save-settings-btn') handlers.onSaveSettings();
            if (id === 'settings-sign-out-btn') handlers.onSignOut();
            if (id === 'settings-clear-cache-btn') handlers.onClearCache();
        }

        // Handle links
        const link = target.closest('a');
        if(link && link.id === 'settings-show-changelog-btn') {
            e.preventDefault();
            handlers.onShowChangelog();
        }
        
        // Handle other clickable elements
        const mealElement = target.closest('.meal.clickable');
        if (mealElement) {
            handlers.onMealClick(mealElement.dataset.recipeId);
        }
    });

    // Handle form submissions separately
    const authForm = $('#auth-form');
    if(authForm) authForm.addEventListener('submit', handlers.onEmailPasswordAuth);
    
    // Handle shopping list item clicks for checkbox-like behavior
    const shoppingListContent = $('#shopping-list-content');
    if(shoppingListContent) {
        shoppingListContent.addEventListener('click', (e) => {
            const item = e.target.closest('.shopping-item');
            if (item) {
                handlers.onToggleShoppingItem(item.dataset.itemId);
            }
        });
    }
}


// --- Screen & Panel Management ---

let currentScreen = 'splash';

export function showScreen(screenId) {
    $$('.screen').forEach(screen => {
        screen.classList.add('hidden');
        screen.classList.remove('active');
    });
    const newScreen = $(`#${screenId}-screen`);
    if (newScreen) {
        newScreen.classList.remove('hidden');
        newScreen.classList.add('active');
        currentScreen = screenId;
    }
}

function showSplashScreen() {
    setTimeout(() => {
        const splash = $('#splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => {
                if(currentScreen === 'splash') { // Only show auth if no other screen has been shown
                    showScreen('auth');
                }
            }, 500);
        }
    }, 4000); // Show splash for 4 seconds
}

export function showSettingsPanel() {
    const settingsScreen = $('#settings-screen');
    populateSettingsForm();
    settingsScreen.classList.remove('hidden');
    setTimeout(() => settingsScreen.classList.add('active'), 10);
}

export function hideSettingsPanel() {
    $('#settings-screen').classList.remove('active');
}

// --- Loader & Notification ---

export function showLoader(text = 'Загрузка...') {
    const loader = $('#app-loader');
    if (loader) {
        $('#loader-text').textContent = text;
        loader.classList.remove('hidden');
    }
}

export function hideLoader() {
    const loader = $('#app-loader');
    if(loader) loader.classList.add('hidden');
}

let notificationTimeout;
export function showNotification(message, type = 'success') { // types: success, loading, error
    const notification = $('#notification');
    notification.textContent = message;
    notification.className = '';
    notification.classList.add(type);
    notification.classList.add('show');

    clearTimeout(notificationTimeout);
    if (type !== 'loading') {
        notificationTimeout = setTimeout(hideNotification, 4000);
    }
}

export function hideNotification() {
    $('#notification').classList.remove('show');
}


// --- Wizard UI ---

export function updateWizardStep(current, total) {
    $$('.wizard-step').forEach(step => step.classList.remove('active'));
    $(`.wizard-step[data-step="${current}"]`).classList.add('active');
    $('#wizard-nav').classList.remove('hidden');
    $('#generation-progress').classList.add('hidden');
    $('#wizard-step-counter').textContent = `Шаг ${current} из ${total}`;
}

export function populateWizardFromState(state) {
    const { settings } = state;
    $('#wizard-menu-duration').value = settings.menuDuration;
    $('#wizard-total-budget').value = settings.totalBudget;
    $('#wizard-preferences').value = settings.preferences;
    $('#wizard-cuisine').value = settings.cuisine;
    $('#wizard-difficulty').value = settings.difficulty;
    renderFamilyMembers(settings.family, 'wizard-family-members-container');
}

export function saveWizardStepToState(step) {
    const { settings } = getState();
    let updatedSettings = { ...settings };

    // Step 1 is family members
    if (step === 1) {
        if (settings.family.length === 0) {
            showNotification('Пожалуйста, добавьте хотя бы одного члена семьи.', 'error');
            return false;
        }
    }
    // Step 2 is menu preferences
    if (step === 2) {
        updatedSettings.menuDuration = parseInt($('#wizard-menu-duration').value);
        updatedSettings.totalBudget = parseInt($('#wizard-total-budget').value);
        updatedSettings.preferences = $('#wizard-preferences').value;
        updatedSettings.cuisine = $('#wizard-cuisine').value;
        updatedSettings.difficulty = $('#wizard-difficulty').value;
    }
    
    updateState({ settings: updatedSettings });
    return true;
}


// --- Generation Progress ---

export function showGenerationProgress() {
    $('#setup-wizard').classList.add('hidden');
    $('#wizard-nav').classList.add('hidden');
    $('#generation-progress').classList.remove('hidden');
}

export function updateGenerationProgress(percentage, status, details) {
    $('#progress-bar').style.width = `${percentage}%`;
    $('#progress-status').textContent = status;
    $('#progress-details').textContent = details;
}

export function showGenerationError(message, retryCallback) {
    $('#progress-status').innerHTML = `🔴 Ошибка!`;
    $('#progress-details').innerHTML = `${message}<br/><br/>`;
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Попробовать снова';
    retryButton.className = 'primary-button';
    retryButton.onclick = () => {
        // Clear the error message and button before retrying
        $('#progress-details').innerHTML = '';
        retryCallback();
    };

    const backButton = document.createElement('button');
    backButton.textContent = 'Назад к настройкам';
    backButton.className = 'secondary-button';
    backButton.style.marginTop = '10px';
    backButton.onclick = () => {
        showScreen('main'); // Go to main screen, then open settings
        hideSettingsPanel();
        setTimeout(showSettingsPanel, 10);
    };

    $('#progress-details').appendChild(retryButton);
    $('#progress-details').appendChild(backButton);
}


// --- Preview Screen ---

export function renderPreviewMenu(menu, recipes) {
    const container = $('#preview-menu-container');
    if (!container || !menu) return;

    // Create a lookup map for faster access by recipe name
    const recipeLookup = Object.values(recipes).reduce((acc, recipe) => {
        acc[recipe.name] = recipe;
        return acc;
    }, {});

    container.innerHTML = menu.map((day, dayIndex) => `
        <div class="preview-day">
            <h4 class="preview-day-title">${day.day_of_week}</h4>
            ${day.meals.map((meal, mealIndex) => `
                <div class="preview-meal">
                    <span class="preview-meal-name">${meal.meal_type}: ${meal.name}</span>
                    ${meal.name.toLowerCase() !== 'остатки' ? `
                    <button class="regenerate-btn" data-day-index="${dayIndex}" data-meal-index="${mealIndex}" data-meal-name="${meal.name}" aria-label="Пересоздать ${meal.name}">
                        <svg class="regenerate-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                           <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.18-3.182l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.182" />
                        </svg>
                    </button>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `).join('');
}


// --- Main Screen ---
export function initMainScreen() {
    renderDailyMenu(getState());
    renderShoppingList(getState().shoppingList);
    renderBudget(getState());
    setActiveContent('menu-content', 'Меню на неделю');
}

export function setActiveContent(contentId, title) {
    $$('.main-content').forEach(c => c.classList.remove('active'));
    $(`#${contentId}`).classList.add('active');
    
    $$('.nav-button').forEach(b => b.classList.remove('active'));
    $(`.nav-button[data-content="${contentId}"]`).classList.add('active');
    
    $('#main-header-title').textContent = title;
}

export function renderDailyMenu({ menu, currentDayIndex, recipes, cookedMeals }) {
    if (!menu || menu.length === 0) return;
    
    const day = menu[currentDayIndex];
    const date = new Date(getState().timestamp || Date.now());
    date.setDate(date.getDate() + currentDayIndex);
    
    $('#current-date-display').textContent = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

    const container = $('#daily-menu-container');
    container.innerHTML = day.meals.map((meal, mealIndex) => {
        const recipe = Object.values(recipes).find(r => r.name === meal.name);
        const isLeftover = meal.name.toLowerCase() === 'остатки';
        const recipeId = recipe ? recipe.id : null;
        
        const dateString = date.toISOString().split('T')[0];
        const mealId = `${dateString}-${mealIndex}`;
        const isCooked = !!cookedMeals[mealId];

        const mealIcons = { "Завтрак": "🍳", "Перекус 1": "🍎", "Обед": "🍲", "Перекус 2": "🥪" };

        return `
            <div 
                class="meal ${recipe ? 'clickable' : ''} ${isCooked ? 'cooked' : ''}" 
                data-recipe-id="${recipeId}" 
                data-day-index="${currentDayIndex}" 
                data-meal-index="${mealIndex}"
            >
                <button class="cooked-toggle" aria-label="Отметить как приготовленное">
                   <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
                </button>
                <span class="meal-icon">${mealIcons[meal.meal_type] || '🍽️'}</span>
                <span class="meal-name">${meal.name} ${isLeftover ? '<span class="leftover-icon">⟲</span>' : ''}</span>
            </div>
        `;
    }).join('');
}

// --- Recipe Screen ---
let currentRecipe = null;
let currentStepIndex = 0;

export function showRecipeScreen(recipe) {
    currentRecipe = recipe;
    currentStepIndex = 0;
    renderRecipeStep();
    showScreen('recipe');
}

function renderRecipeStep() {
    const step = currentRecipe.steps[currentStepIndex];
    $('#recipe-title').textContent = currentRecipe.name;
    $('#step-indicator').textContent = `Шаг ${step.step}/${currentRecipe.steps.length}`;
    $('#step-image').src = `https://source.unsplash.com/400x300/?${step.image_prompt.replace(/\s/g, ',')}`;
    $('#step-description').textContent = step.description;

    // Timer logic here (simplified)
    if (step.timer_minutes) {
        $('#timer-section').classList.remove('hidden');
        $('#timer-display').textContent = `${String(step.timer_minutes).padStart(2, '0')}:00`;
    } else {
        $('#timer-section').classList.add('hidden');
    }

    // Ingredients logic (simplified, assuming ingredients are per-recipe, not per-step)
    // A more complex implementation would link ingredients to steps.
    const stepIngredientsTitle = $('#step-ingredients-title');
    if (currentStepIndex === 0) {
        stepIngredientsTitle.classList.remove('hidden');
        stepIngredientsTitle.textContent = "Все ингредиенты";
        $('#step-ingredients').innerHTML = currentRecipe.ingredients.map(ing => `
            <li>
                <span>${ing.name}</span>
                <span class="ingredient-quantity">${ing.quantity}</span>
            </li>
        `).join('');
    } else {
        stepIngredientsTitle.classList.add('hidden');
        $('#step-ingredients').innerHTML = '';
    }

    // Nav buttons
    $('#prev-step-btn').disabled = currentStepIndex === 0;
    $('#next-step-btn').disabled = currentStepIndex === currentRecipe.steps.length - 1;
}

export function navigateRecipeStep(direction) {
    currentStepIndex += direction;
    if (currentStepIndex < 0) currentStepIndex = 0;
    if (currentStepIndex >= currentRecipe.steps.length) currentStepIndex = currentRecipe.steps.length - 1;
    renderRecipeStep();
}

// --- Shopping List ---

export function generateShoppingList(recipes) {
    const consolidated = {};
    recipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
            if (consolidated[ing.name]) {
                consolidated[ing.name].quantity += `, ${ing.quantity}`;
                consolidated[ing.name].estimated_price += ing.estimated_price;
            } else {
                consolidated[ing.name] = { ...ing };
            }
        });
    });

    const categorized = {};
    Object.values(consolidated).forEach((item, index) => {
        const category = item.category || 'Прочее';
        if (!categorized[category]) {
            categorized[category] = [];
        }
        categorized[category].push({ ...item, id: `item-${index}`, completed: false });
    });
    
    // Flatten and return
    return Object.values(categorized).flat();
}


export function renderShoppingList(shoppingList) {
    const container = $('#shopping-list-container');
    if (!shoppingList) return;
    
    const categorized = shoppingList.reduce((acc, item) => {
        const category = item.category || 'Прочее';
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});
    
    container.innerHTML = Object.entries(categorized).map(([category, items]) => `
        <div class="shopping-category">
            <button class="category-toggle">${category}</button>
            <ul class="category-items">
                ${items.map(item => `
                    <li class="shopping-item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
                        <div class="item-checkbox-progress">
                            <span class="checkmark">✓</span>
                        </div>
                        <div class="item-details">
                            <span class="item-name">${item.name}</span>
                            <span class="item-quantity">${item.quantity}</span>
                        </div>
                        <span class="item-price">${Math.round(item.estimated_price)} ₽</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');

    const completedCount = shoppingList.filter(i => i.completed).length;
    const totalCount = shoppingList.length;
    $('#shopping-progress-text').textContent = `${completedCount} / ${totalCount} куплено`;
    $('#shopping-progress').style.width = totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%';
    
    const totalPrice = shoppingList.reduce((sum, item) => sum + item.estimated_price, 0);
    $('#shopping-list-total span').textContent = `Примерная сумма: ${Math.round(totalPrice)} ₽`;
}


// --- Budget ---
export function renderBudget({ settings, shoppingList }) {
     const totalBudget = settings.totalBudget || 0;
     const totalSpent = shoppingList ? shoppingList.reduce((sum, item) => item.completed ? sum + item.estimated_price : sum, 0) : 0;
     const remaining = totalBudget - totalSpent;
     const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

     $('#budget-spent-total').innerHTML = `${Math.round(totalSpent)} ₽ <span>потрачено</span>`;
     $('#budget-total').textContent = `${totalBudget} ₽`;
     $('#budget-remaining').textContent = `${Math.round(remaining)} ₽`;
     
     const pieSlice = $('#pie-products');
     if (pieSlice) {
        pieSlice.style.strokeDasharray = `${spentPercentage}, 100`;
     }
}

// --- Settings ---
function populateSettingsForm() {
    const { settings } = getState();
    $('#settings-menu-duration').value = settings.menuDuration;
    $('#settings-total-budget').value = settings.totalBudget;
    $('#settings-preferences').value = settings.preferences;
    $('#settings-cuisine').value = settings.cuisine;
    $('#settings-difficulty').value = settings.difficulty;
    renderFamilyMembers(settings.family, 'settings-family-members-container');
    
    $('#settings-app-version-info').textContent = getVersion();
}

export function saveSettingsToState() {
    const { settings } = getState();
    const updatedSettings = { ...settings };

    updatedSettings.menuDuration = parseInt($('#settings-menu-duration').value);
    updatedSettings.totalBudget = parseInt($('#settings-total-budget').value);
    updatedSettings.preferences = $('#settings-preferences').value;
    updatedSettings.cuisine = $('#settings-cuisine').value;
    updatedSettings.difficulty = $('#settings-difficulty').value;
    // family is saved separately

    updateState({ settings: updatedSettings });
    return true;
}

export function updateSettingsUserInfo(email) {
    $('#settings-user-info-email').textContent = email || 'Анонимный пользователь';
}


// --- Family Members ---
function renderFamilyMembers(family, containerId) {
    const container = $(`#${containerId}`);
    if (!container) return;
    
    container.innerHTML = family.map((member, index) => `
        <div class="family-member-card">
            <span>${member.name}, ${member.gender}, ${member.age}</span>
            <div>
                <button data-action="edit-family-member" data-index="${index}">✏️</button>
                <button data-action="delete-family-member" data-index="${index}">🗑️</button>
            </div>
        </div>
    `).join('');
}


function deleteFamilyMember(index) {
    const { settings } = getState();
    const family = [...settings.family];
    family.splice(index, 1);
    updateState({ settings: { ...settings, family }});
    // Re-render both in settings and wizard
    renderFamilyMembers(family, 'settings-family-members-container');
    renderFamilyMembers(family, 'wizard-family-members-container');
}

// --- Modals ---
export function showModal({ title, body, buttons }) {
    $('#modal-overlay').innerHTML = `
        <div class="modal-content">
            <h2 class="modal-title">${title}</h2>
            <div class="modal-body">${body}</div>
            <div class="modal-buttons">
                ${buttons.map(btn => `<button class="modal-button ${btn.class}" id="modal-btn-${btn.text.toLowerCase()}">${btn.text}</button>`).join('')}
            </div>
        </div>
    `;
    buttons.forEach(btn => {
        $(`#modal-btn-${btn.text.toLowerCase()}`).addEventListener('click', btn.action);
    });
    $('#modal-overlay').classList.add('visible');
}

export function hideModal() {
    $('#modal-overlay').classList.remove('visible');
}


function showAddFamilyMemberModal(member = null, index = -1) {
    const isEditing = member !== null;
    showModal({
        title: isEditing ? 'Редактировать' : 'Добавить члена семьи',
        body: `
            <div class="modal-form-group">
                <label for="member-name">Имя</label>
                <input type="text" id="member-name" class="modal-input" value="${member ? member.name : ''}">
            </div>
            <div class="modal-form-group">
                <label for="member-age">Возраст</label>
                <input type="number" id="member-age" class="modal-input" value="${member ? member.age : ''}">
            </div>
            <div class="modal-form-group">
                <label for="member-gender">Пол</label>
                <select id="member-gender" class="settings-select modal-input">
                    <option value="Мужчина" ${member && member.gender === 'Мужчина' ? 'selected' : ''}>Мужчина</option>
                    <option value="Женщина" ${member && member.gender === 'Женщина' ? 'selected' : ''}>Женщина</option>
                </select>
            </div>
        `,
        buttons: [
            { text: 'Отмена', class: 'secondary', action: hideModal },
            { text: isEditing ? 'Сохранить' : 'Добавить', class: 'primary', action: () => {
                const newMember = {
                    name: $('#member-name').value,
                    age: parseInt($('#member-age').value),
                    gender: $('#member-gender').value
                };
                if (!newMember.name || !newMember.age) {
                    showNotification('Имя и возраст обязательны.', 'error');
                    return;
                }
                const { settings } = getState();
                const family = [...settings.family];
                if (isEditing) {
                    family[index] = newMember;
                } else {
                    family.push(newMember);
                }
                updateState({ settings: { ...settings, family } });
                renderFamilyMembers(family, 'settings-family-members-container');
                renderFamilyMembers(family, 'wizard-family-members-container');
                hideModal();
            }}
        ]
    });
}