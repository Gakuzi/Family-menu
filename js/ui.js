import { appLayoutHTML } from './templates.js';
import { getState, updateState, getVersion, getChangelog } from './state.js';
import { generateStepImage, handleRegeneration } from './api.js';

export const dom = {};
export const wizard = {
    currentStep: 1,
    totalSteps: 4,
};
const timer = {
    interval: null,
    timeLeft: 0,
    initialTime: 0,
    isRunning: false,
};
const currentRecipe = {
    id: null,
    step: 0,
};

export function renderAppLayout() {
    document.getElementById('app').innerHTML = appLayoutHTML;
}

export function cacheDom() {
    const ids = [
        'app-loader', 'loader-text', 'splash-screen', 'start-app-btn', 'auth-screen', 'google-signin-btn', 'auth-form',
        'auth-email', 'auth-password', 'auth-submit-btn', 'auth-toggle-mode-btn', 'auth-prompt-text', 'setup-screen',
        'main-screen', 'recipe-screen', 'settings-screen', 'preview-screen', 'setup-wizard', 'wizard-nav',
        'wizard-back-btn', 'wizard-next-btn', 'wizard-step-counter', 'api-key-input', 'api-key-help-link',
        'wizard-family-members-container', 'wizard-add-family-member-btn', 'wizard-menu-duration', 'wizard-total-budget',
        'wizard-preferences', 'wizard-cuisine', 'wizard-difficulty', 'generation-progress', 'progress-bar',
        'progress-status', 'progress-details', 'preview-menu-container', 'preview-regenerate-all-btn',
        'preview-accept-btn', 'main-header-title', 'open-settings-btn', 'date-selector',
        'prev-day-btn', 'current-date-display', 'next-day-btn', 'daily-menu-container', 'shopping-list-container',
        'shopping-progress-text', 'shopping-progress', 'shopping-list-total', 'back-to-menu-btn', 'recipe-title',
        'step-indicator', 'step-image', 'step-description', 'timer-section', 'timer-display', 'start-timer-btn',
        'pause-timer-btn', 'reset-timer-btn', 'step-ingredients', 'step-ingredients-title', 'prev-step-btn',
        'next-step-btn', 'pie-products', 'budget-spent-total', 'budget-total', 'budget-remaining', 'bar-chart',
        'settings-content', 'settings-close-btn', 'settings-user-info-email', 'settings-sign-out-btn', 
        'settings-menu-duration', 'settings-total-budget', 'settings-preferences', 'settings-cuisine', 
        'settings-difficulty', 'settings-save-settings-btn', 'settings-family-members-container', 
        'settings-add-family-member-btn', 'settings-regenerate-all-btn', 'settings-api-key',
        'settings-save-api-key-btn', 'settings-run-wizard-btn', 'settings-app-version-info', 
        'settings-show-changelog-btn', 'notification', 'modal-overlay', 'modal-title', 'modal-body', 'modal-buttons'
    ];
    
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const key = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            dom[key] = element;
        }
    });

    // Manual caching for queried elements
    dom.screens = document.querySelectorAll('.screen');
    dom.wizardSteps = document.querySelectorAll('.wizard-step');
    dom.bottomNav = document.querySelector('.bottom-nav');
    dom.mainContents = document.querySelectorAll('.main-content');
}


export function showScreen(screenId) {
    dom.screens.forEach(screen => {
        const isTarget = screen.id === screenId;
        screen.classList.toggle('hidden', !isTarget);
        if (['recipe-screen', 'splash-screen', 'settings-screen'].includes(screen.id)) {
            screen.classList.toggle('active', isTarget);
        }
    });
    if (screenId !== 'splash-screen' && dom.appLoader) {
         dom.appLoader.classList.add('hidden');
    }
}

export function renderAll() {
    if (!getState() || !getState().settings) return;
    renderMenu();
    renderShoppingList();
    renderBudget();
}

// WIZARD
export function showWizard() {
    showScreen('setup-screen');
    wizard.currentStep = (getState().settings.apiKey) ? 2 : 1;
    updateWizardView();
}

export function updateWizardView() {
    const { currentStep, totalSteps } = wizard;
    const state = getState();
    
    dom.apiKeyInput.value = state.settings.apiKey || '';
    dom.wizardMenuDuration.value = state.settings.menuDuration;
    dom.wizardTotalBudget.value = state.settings.totalBudget;
    dom.wizardPreferences.value = state.settings.preferences;
    dom.wizardCuisine.value = state.settings.cuisine;
    dom.wizardDifficulty.value = state.settings.difficulty;
    
    dom.wizardNav.classList.remove('hidden');
    dom.generationProgress.classList.add('hidden');
    dom.setupWizard.classList.remove('hidden');
    dom.wizardStepCounter.classList.remove('hidden');

    dom.wizardStepCounter.textContent = `Шаг ${currentStep} из ${totalSteps}`;

    dom.wizardSteps.forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
    });

    dom.wizardBackBtn.classList.toggle('hidden', currentStep === 1);
    dom.wizardNextBtn.textContent = currentStep === totalSteps ? 'Начать генерацию' : 'Далее';
    
    let isStepValid = false;
    switch(currentStep) {
        case 1: isStepValid = dom.apiKeyInput.value.trim().length > 0; break;
        case 2: isStepValid = state.settings.family.length > 0; break;
        default: isStepValid = true;
    }
    dom.wizardNextBtn.disabled = !isStepValid;

    if (currentStep === 2) {
        renderFamilyMembers(true);
    }
}

export function navigateWizard(direction) {
    wizard.currentStep += direction;
    updateWizardView();
}

// GENERATION & PREVIEW
export function prepareForGeneration() {
    dom.setupWizard.classList.add('hidden');
    dom.wizardNav.classList.add('hidden');
    dom.wizardStepCounter.classList.add('hidden');
    dom.generationProgress.classList.remove('hidden');
    dom.generationProgress.querySelector('button')?.remove();
}

export function showGenerationError(errorMessage) {
     updateProgress(0, 2, "Ошибка!", errorMessage);
     const button = document.createElement('button');
     button.className = 'primary-button';
     button.textContent = 'Назад к настройкам';
     button.style.marginTop = '20px';
     button.onclick = () => showWizard();
     dom.generationProgress.appendChild(button);
}

export async function updateProgress(step, totalSteps, status, details) {
    return new Promise(resolve => {
        const percent = (step / totalSteps) * 100;
        dom.progressBar.style.width = `${percent}%`;
        dom.progressStatus.textContent = `Шаг ${step}/${totalSteps}: ${status}`;
        dom.progressDetails.innerHTML = details;
        setTimeout(resolve, 300);
    });
}

export function renderPreview() {
    const container = dom.previewMenuContainer;
    container.innerHTML = '';
    const tempState = getState().temp;
    if (!tempState || !tempState.menu) return;

    tempState.menu.forEach(dayData => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'preview-day';

        const mealsHtml = Object.entries(dayData.meals).map(([key, name]) => `
            <div class="preview-meal" data-day-name="${dayData.day}" data-meal-key="${key}">
                <span class="preview-meal-name">${name || '...'}</span>
                <button class="regenerate-btn" title="Изменить это блюдо">${getRegenerateIcon()}</button>
            </div>
        `).join('');

        dayDiv.innerHTML = `<h4 class="preview-day-title">${dayData.day}</h4>${mealsHtml}`;
        container.appendChild(dayDiv);
    });

    container.querySelectorAll('.regenerate-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const mealDiv = e.target.closest('.preview-meal');
            const { dayName, mealKey } = mealDiv.dataset;
            const mealName = tempState.menu.find(d=>d.day===dayName).meals[mealKey];
            showModal(
                "Изменить блюдо",
                `<p>Что бы вы хотели видеть вместо "${mealName}"?</p>
                 <textarea id="regen-prompt" class="modal-textarea" rows="2" placeholder="Например: что-то из курицы"></textarea>`,
                [
                    { text: 'Отмена', class: 'secondary', action: () => {} },
                    { text: 'Изменить', class: 'primary', action: () => {
                        const customPrompt = document.getElementById('regen-prompt')?.value || '';
                        handleRegeneration('meal', { dayName, mealKey }, true, customPrompt);
                    }}
                ]
            );
        });
    });
}

// MENU & RECIPE
export function renderMenu() {
    const state = getState();
    if (!state.menu || state.menu.length === 0) {
        dom.dailyMenuContainer.innerHTML = '<p style="text-align: center; color: var(--soft-text); margin-top: 30px;">Меню еще не создано. Перейдите в настройки для генерации.</p>';
        dom.currentDateDisplay.textContent = 'Нет меню';
        return;
    };
    
    const sortedMenu = getSortedMenu(state.menu);
    if (state.currentDayIndex >= sortedMenu.length || state.currentDayIndex < 0) {
        updateState({ currentDayIndex: 0 });
    }
    const dayData = sortedMenu[state.currentDayIndex];
    if (!dayData) return;

    dom.currentDateDisplay.textContent = dayData.day;
    dom.dailyMenuContainer.innerHTML = [
        createMealHtml('☀️', dayData.meals.breakfast, 'breakfast', dayData.day),
        createMealHtml('🍎', dayData.meals.snack1, 'snack1', dayData.day),
        createMealHtml('🍲', dayData.meals.lunch, 'lunch', dayData.day),
        createMealHtml('🥛', dayData.meals.snack2, 'snack2', dayData.day),
        createMealHtml('🌙', dayData.meals.dinner, 'dinner', dayData.day)
    ].join('');

    // Re-attach listeners
    dom.dailyMenuContainer.querySelectorAll('.meal.clickable').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.regenerate-btn') || e.target.closest('.cooked-toggle')) return;
            const mealName = e.currentTarget.dataset.mealName.replace(/\s*\(остатки\)/i, '').trim();
            const recipe = Object.values(getState().recipes).find(r => r.name === mealName);
            if (recipe) {
                showRecipe(recipe.id);
            } else if (mealName) {
                showNotification(`Рецепт для "${mealName}" не найден.`, 'error');
            }
        });
    });
    // Add other listeners for cooked toggle and regenerate
}

export function navigateMenuDay(direction) {
    const state = getState();
    if (!state.menu || state.menu.length === 0) return;
    const menuLength = state.menu.length;
    let newIndex = state.currentDayIndex + direction;
    
    if (newIndex < 0) newIndex = menuLength - 1;
    else if (newIndex >= menuLength) newIndex = 0;
    
    updateState({ currentDayIndex: newIndex });
    renderMenu();
}

function createMealHtml(icon, mealName, mealKey, dayName) {
    const state = getState();
    const cleanName = (mealName || 'Не указано').replace(/\s*\(остатки\)/i, '');
    const isLeftover = (mealName || '').includes('(остатки)');
    const hasContent = mealName && mealName.trim() !== '' && mealName.trim() !== 'Не указано';
    const hasRecipe = !isLeftover && hasContent;
    const isCooked = state.cookedMeals && state.cookedMeals[dayName] && state.cookedMeals[dayName].includes(mealKey);
    
    return `
    <div class="meal ${hasRecipe ? 'clickable' : ''} ${isCooked ? 'cooked' : ''}" data-meal-name="${mealName || ''}" data-meal-key="${mealKey}" data-day-name="${dayName}">
        <button class="cooked-toggle" data-day-name="${dayName}" data-meal-key="${mealKey}" aria-label="Отметить как приготовленное">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        </button>
        <span class="meal-icon">${icon}</span>
        <span class="meal-name">${cleanName}</span>
        ${isLeftover ? '<span class="leftover-icon">🔄</span>' : ''}
        ${hasContent ? `<button class="regenerate-btn" title="Перегенерировать блюдо">${getRegenerateIcon()}</button>` : ''}
    </div>`;
}

function getSortedMenu(menu) {
    const daysOrder = ["ВОСКРЕСЕНЬЕ", "ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"];
    return [...(menu || [])].sort((a, b) => daysOrder.indexOf(a.day.toUpperCase()) - daysOrder.indexOf(b.day.toUpperCase()));
}

export function showRecipe(recipeId) {
    const recipe = getState().recipes[recipeId];
    if (!recipe) return;
    currentRecipe.id = recipeId;
    currentRecipe.step = 0;
    showScreen('recipe-screen');
    renderRecipeStep();
}

export function renderRecipeStep() {
    const { id, step } = currentRecipe;
    const recipe = getState().recipes[id];
    if (!recipe || !recipe.steps || !recipe.steps[step]) return;

    const stepData = recipe.steps[step];
    dom.recipeTitle.textContent = recipe.name;
    dom.stepIndicator.textContent = `Шаг ${step + 1}/${recipe.steps.length}`;
    dom.stepDescription.textContent = stepData.description;
    // ... rest of the render logic
}

export function navigateRecipeStep(direction) {
    const { id, step } = currentRecipe;
    const recipe = getState().recipes[id];
    if (!recipe) return;
    const newStep = step + direction;
    if (newStep >= 0 && newStep < recipe.steps.length) {
        currentRecipe.step = newStep;
        renderRecipeStep();
    } else if (newStep === recipe.steps.length) {
        showScreen('main-screen');
    }
}

// SHOPPING LIST & BUDGET
export function renderShoppingList() { /* Full implementation */ }
export function renderBudget() {
    const state = getState();
    const totalBudget = state.settings.totalBudget;
    const spentOnProducts = (state.shoppingList || [])
        .flatMap(c => c.items || [])
        .flatMap(item => item.purchases || [])
        .reduce((sum, purchase) => sum + purchase.price, 0);

    const remaining = totalBudget - spentOnProducts;
    const spentPercent = totalBudget > 0 ? Math.min((spentOnProducts / totalBudget) * 100, 100) : 0;
    
    if (dom.pieProducts) dom.pieProducts.style.strokeDasharray = `${spentPercent} 100`;
    if (dom.budgetSpentTotal) dom.budgetSpentTotal.innerHTML = `${spentOnProducts.toLocaleString('ru-RU')} ₽ <span>потрачено</span>`;
    if (dom.budgetTotal) dom.budgetTotal.textContent = `${totalBudget.toLocaleString('ru-RU')} ₽`;
    if (dom.budgetRemaining) {
        dom.budgetRemaining.textContent = `${remaining.toLocaleString('ru-RU')} ₽`;
        dom.budgetRemaining.className = `amount ${remaining >= 0 ? 'ok' : 'warning'}`;
    }
}

// SETTINGS & FAMILY
export function showSettingsPanel() {
    renderSettings();
    dom.settingsScreen.classList.remove('hidden');
    setTimeout(() => dom.settingsScreen.classList.add('active'), 10);
}

export function hideSettingsPanel() {
    dom.settingsScreen.classList.remove('active');
    setTimeout(() => dom.settingsScreen.classList.add('hidden'), 500);
}

export function renderSettings() {
    const { settings, menu } = getState();
    const user = firebase.auth().currentUser;

    if (user) dom.settingsUserInfoEmail.textContent = user.email;
    dom.settingsApiKey.value = settings.apiKey || '';
    dom.settingsMenuDuration.value = settings.menuDuration;
    dom.settingsTotalBudget.value = settings.totalBudget;
    dom.settingsPreferences.value = settings.preferences;
    dom.settingsCuisine.value = settings.cuisine;
    dom.settingsDifficulty.value = settings.difficulty;
    dom.settingsRegenerateAllBtn.disabled = !menu || menu.length === 0;
    renderFamilyMembers();
}

export function renderFamilyMembers(isWizard = false) {
    const container = isWizard ? dom.wizardFamilyMembersContainer : dom.settingsFamilyMembersContainer;
    if (!container) return;
    const { family } = getState().settings;
    container.innerHTML = '';
    if (!family || family.length === 0) {
        container.innerHTML = `<p style="font-size: 14px; color: var(--soft-text); text-align: center;">Пока никого нет.</p>`;
        return;
    }
    family.forEach((member, index) => {
        const memberCard = document.createElement('div');
        memberCard.className = 'family-member-card';
        memberCard.innerHTML = `
            <span>${member.gender === 'male' ? '👨' : '👩'} ${member.age} лет, ${member.activity}</span>
            <button data-index="${index}" aria-label="Удалить">&times;</button>
        `;
        container.appendChild(memberCard);
    });
    container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', e => {
            const indexToRemove = parseInt(e.target.dataset.index);
            const currentFamily = getState().settings.family;
            const updatedFamily = currentFamily.filter((_, i) => i !== indexToRemove);
            updateState({ settings: { ...getState().settings, family: updatedFamily } });
            renderFamilyMembers(isWizard);
            if(isWizard) updateWizardView();
        });
    });
}


// MODALS & NOTIFICATIONS
export function showNotification(message, type = 'success') {
    dom.notification.textContent = message;
    dom.notification.className = type;
    dom.notification.classList.add('show');
    if (type !== 'loading') {
        setTimeout(() => dom.notification.classList.remove('show'), 3000);
    }
}
export function hideNotification() { dom.notification.classList.remove('show'); }

export function showModal(title, bodyHtml, buttons) {
    dom.modalTitle.textContent = title;
    dom.modalBody.innerHTML = bodyHtml;
    dom.modalButtons.innerHTML = '';
    buttons.forEach(btn => {
        const buttonEl = document.createElement('button');
        buttonEl.textContent = btn.text;
        buttonEl.className = `modal-button ${btn.class}`;
        buttonEl.addEventListener('click', () => {
            btn.action();
            if (btn.closes !== false) hideModal();
        });
        dom.modalButtons.appendChild(buttonEl);
    });
    dom.modalOverlay.classList.add('visible');
}
export function hideModal() { dom.modalOverlay.classList.remove('visible'); }

export function openFamilyMemberModal(isWizard = false) {
    const body = `
        <div class="modal-form-group"><label for="member-age">Возраст</label><input type="number" id="member-age" class="modal-input" min="1" max="100" value="30"></div>
        <div class="modal-form-group"><label for="member-gender">Пол</label><select id="member-gender" class="modal-input" style="height: 45px; -webkit-appearance: listbox;"><option value="male">Мужской</option><option value="female">Женский</option></select></div>
        <div class="modal-form-group"><label for="member-activity">Уровень активности</label><select id="member-activity" class="modal-input" style="height: 45px; -webkit-appearance: listbox;"><option value="Низкая">Низкая (сидячая работа)</option><option value="Средняя">Средняя (легкие тренировки 1-3 раза/нед)</option><option value="Высокая">Высокая (интенсивные тренировки 3-5 раз/нед)</option></select></div>`;
    const buttons = [
        { text: 'Отмена', class: 'secondary', action: () => {} },
        { text: 'Добавить', class: 'primary', action: () => {
            const age = parseInt(document.getElementById('member-age').value);
            const gender = document.getElementById('member-gender').value;
            const activity = document.getElementById('member-activity').value;
            if (age && gender && activity) {
                const currentFamily = getState().settings.family || [];
                const updatedFamily = [...currentFamily, { age, gender, activity }];
                updateState({ settings: { ...getState().settings, family: updatedFamily } });
                renderFamilyMembers(isWizard);
                if (isWizard) updateWizardView();
            }
        }}
    ];
    showModal('Добавить члена семьи', body, buttons);
}

// AUTH UI & HELPERS
export function toggleAuthMode() {
    const isLoginMode = dom.authSubmitBtn.textContent === 'Войти';
    dom.authSubmitBtn.textContent = isLoginMode ? 'Создать аккаунт' : 'Войти';
    dom.authPromptText.textContent = isLoginMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?';
    dom.authToggleBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
}
export function getRegenerateIcon() { return `<svg class="regenerate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.868 2.884c.321-.772 1.415-.772 1.736 0l1.681 4.06c.064.155.19.284.348.348l4.06 1.68c.772.321.772 1.415 0 1.736l-4.06 1.68a.5.5 0 00-.348.349l-1.68 4.06c-.321-.772-1.415-.772-1.736 0l-1.681-4.06a.5.5 0 00-.348-.348l-4.06-1.68c-.772-.321-.772-1.415 0-1.736l4.06-1.68a.5.5 0 00.348-.348l1.68-4.06z" clip-rule="evenodd" /></svg>`; }
export function showApiKeyHelpModal() { showModal('Как получить API ключ?', '1. Перейдите в <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>.<br>2. Нажмите "Create API key in new project".<br>3. Скопируйте сгенерированный ключ и вставьте в это приложение.', [{text: 'Понятно', class: 'primary'}]); }
export function showChangelogModal(version, changelog) { const body = `<h3>Версия ${version}</h3><ul>${changelog[version].map(line => `<li>${line}</li>`).join('')}</ul>`; showModal('История изменений', body, [{text: 'Закрыть', class: 'primary'}]); }
export function confirmRegenerateAll(callback) { showModal('Подтверждение', 'Вы уверены, что хотите полностью пересоздать меню, рецепты и список покупок? Это действие нельзя отменить.', [{text: 'Отмена', class:'secondary'}, {text: 'Да, пересоздать', class:'danger', action: callback}]); }
export function handleNav(e) {
    const button = e.target.closest('.nav-button');
    if (!button) return;
    const { content, title } = button.dataset;
    dom.mainHeaderTitle.textContent = title;
    dom.mainContents.forEach(c => c.classList.toggle('active', c.id === content));
    document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}
// Stubs for functions not fully implemented to prevent crashes
export function startTimer() { console.log('startTimer'); }
export function pauseTimer() { console.log('pauseTimer'); }
export function resetTimer() { console.log('resetTimer'); }
function renderBudgetChart() { /* Stub */ }
function updateShoppingProgress() { /* Stub */ }