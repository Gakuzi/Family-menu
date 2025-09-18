
import { appLayoutHTML } from './templates.js';
import { getState, updateState } from './state.js';
import { getJobPlatforms } from './api.js';

export const dom = {};
export const wizard = {
    currentStep: 1,
    totalSteps: 3,
};

export function renderAppLayout() {
    document.getElementById('app').innerHTML = appLayoutHTML;
}

export function cacheDom() {
    const ids = [
        'app-loader', 'loader-text', 'splash-screen', 'start-app-btn', 'auth-screen', 'google-signin-btn', 'auth-form',
        'auth-email', 'auth-password', 'auth-submit-btn', 'auth-toggle-mode-btn', 'auth-prompt-text', 'setup-screen',
        'main-screen', 'settings-screen', 'setup-wizard', 'wizard-nav', 'wizard-back-btn', 'wizard-next-btn', 
        'wizard-step-counter', 'api-key-input', 'wizard-desired-role', 'wizard-experience', 'wizard-key-skills',
        'wizard-summary', 'platform-selection-container', 'generation-progress', 'progress-bar', 'progress-status', 
        'progress-details', 'main-header-title', 'open-settings-btn', 'job-listings-container',
        'settings-close-btn', 'settings-user-info-email', 'settings-sign-out-btn', 'settings-api-key',
        'settings-save-api-key-btn', 'settings-full-name', 'settings-desired-role', 'settings-experience', 
        'settings-key-skills', 'settings-salary-expectation', 'settings-location', 'settings-summary',
        'settings-save-profile-btn', 'settings-find-jobs-btn', 'notification', 'modal-overlay', 'modal-title', 
        'modal-body', 'modal-buttons', 'modal-close-btn'
    ];
    
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const key = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            dom[key] = element;
        }
    });

    dom.screens = document.querySelectorAll('.screen');
    dom.wizardSteps = document.querySelectorAll('.wizard-step');
}

export function showScreen(screenId) {
    dom.screens.forEach(screen => {
        const isTarget = screen.id === screenId;
        screen.classList.toggle('hidden', !isTarget);
        if (['settings-screen'].includes(screen.id)) {
            screen.classList.toggle('active', isTarget);
        }
    });
    if (screenId !== 'splash-screen') {
         dom.appLoader.classList.add('hidden');
    }
}

// WIZARD
export function showWizard() {
    showScreen('setup-screen');
    wizard.currentStep = (getState().settings.apiKey) ? 1 : 1; // Start from profile page even if key exists
    updateWizardView();
}

export function updateWizardView() {
    const { currentStep, totalSteps } = wizard;
    const state = getState();
    
    // Populate form fields from state
    dom.apiKeyInput.value = state.settings.apiKey || '';
    dom.wizardDesiredRole.value = state.settings.profile.desiredRole || '';
    dom.wizardExperience.value = state.settings.profile.experience || 5;
    dom.wizardKeySkills.value = state.settings.profile.keySkills || '';
    dom.wizardSummary.value = state.settings.profile.summary || '';
    
    dom.wizardNav.classList.remove('hidden');
    dom.generationProgress.classList.add('hidden');
    dom.setupWizard.classList.remove('hidden');

    dom.wizardStepCounter.textContent = `Шаг ${currentStep} из ${totalSteps}`;
    dom.wizardSteps.forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === currentStep);
    });

    dom.wizardBackBtn.classList.toggle('hidden', currentStep === 1);
    dom.wizardNextBtn.textContent = currentStep === totalSteps ? 'Найти работу ✨' : 'Далее';
    
    validateWizardStep();

    if (currentStep === 2) {
        renderPlatformSelection();
    }

    // Add/remove input listeners for validation
    const step1Inputs = [dom.apiKeyInput, dom.wizardDesiredRole, dom.wizardKeySkills];
    if(currentStep === 1) {
        step1Inputs.forEach(input => input.addEventListener('input', validateWizardStep));
    } else {
        step1Inputs.forEach(input => input.removeEventListener('input', validateWizardStep));
    }
}

export function validateWizardStep() {
    let isStepValid = false;
    switch(wizard.currentStep) {
        case 1:
            isStepValid = dom.apiKeyInput.value.trim().length > 0 && 
                          dom.wizardDesiredRole.value.trim().length > 0 &&
                          dom.wizardKeySkills.value.trim().length > 0;
            break;
        case 2:
            isStepValid = dom.platformSelectionContainer.querySelectorAll('input:checked').length > 0;
            break;
        default:
            isStepValid = true;
    }
    dom.wizardNextBtn.disabled = !isStepValid;
}

export async function renderPlatformSelection() {
    const container = dom.platformSelectionContainer;
    container.innerHTML = '<p>Загрузка списка платформ...</p>';
    
    try {
        const platforms = await getJobPlatforms(getState().settings.apiKey);
        const connected = getState().settings.connectedPlatforms || [];

        container.innerHTML = platforms.map(platform => `
            <div class="platform-item">
                <input type="checkbox" id="platform-${platform}" value="${platform}" ${connected.includes(platform) ? 'checked' : ''}>
                <label for="platform-${platform}">${platform}</label>
            </div>
        `).join('');
        container.addEventListener('change', validateWizardStep);
        validateWizardStep();
    } catch (error) {
        container.innerHTML = '<p style="color: var(--danger-color);">Не удалось загрузить список платформ. Проверьте ваш API ключ.</p>';
    }
}

export function navigateWizard(direction) {
    wizard.currentStep += direction;
    updateWizardView();
}

// GENERATION
export function prepareForGeneration() {
    dom.setupWizard.classList.add('hidden');
    dom.wizardNav.classList.add('hidden');
    dom.generationProgress.classList.remove('hidden');
    const existingButton = dom.generationProgress.querySelector('button');
    if (existingButton) existingButton.remove();
}

export function showGenerationError(errorMessage, callback) {
     updateProgress(0, "Ошибка!", errorMessage);
     const button = document.createElement('button');
     button.className = 'primary-button';
     button.textContent = 'Хорошо';
     button.style.marginTop = '20px';
     button.onclick = callback;
     dom.generationProgress.appendChild(button);
}

export async function updateProgress(percent, status, details) {
    dom.progressBar.style.width = `${Math.min(percent, 100)}%`;
    dom.progressStatus.textContent = status;
    dom.progressDetails.innerHTML = details;
    await new Promise(resolve => setTimeout(resolve, 50));
}


// DASHBOARD
export function renderDashboard() {
    const { jobListings } = getState();
    const container = dom.jobListingsContainer;
    
    if (!jobListings || jobListings.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px 20px; background: var(--card-bg); border-radius: 16px;">
            <h3 style="color: var(--accent-color);">Вакансии не найдены</h3>
            <p style="color: var(--soft-text);">Ваш список вакансий пуст. Перейдите в настройки, чтобы заполнить профиль и начать поиск.</p>
            <button class="primary-button" id="go-to-settings-from-dash">Перейти в настройки</button>
        </div>`;
        document.getElementById('go-to-settings-from-dash').addEventListener('click', showSettingsPanel);
        return;
    }

    container.innerHTML = jobListings.map(job => `
        <div class="job-card" data-id="${job.id}">
            <div class="job-card-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <p class="job-company">${job.company}</p>
                </div>
                <div class="job-match-score" title="${job.matchReasoning}">${job.matchScore}%</div>
            </div>
            <div class="job-card-details">
                <span class="job-detail">📍 ${job.location}</span>
                <span class="job-detail">💰 ${job.salary}</span>
            </div>
        </div>
    `).join('');
}

// SETTINGS
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
    const { settings } = getState();
    const user = firebase.auth().currentUser;

    if (user) dom.settingsUserInfoEmail.textContent = user.email;
    dom.settingsApiKey.value = settings.apiKey || '';
    
    const profile = settings.profile || {};
    dom.settingsFullName.value = profile.fullName || '';
    dom.settingsDesiredRole.value = profile.desiredRole || '';
    dom.settingsExperience.value = profile.experience || '';
    dom.settingsKeySkills.value = profile.keySkills || '';
    dom.settingsSalaryExpectation.value = profile.salaryExpectation || '';
    dom.settingsLocation.value = profile.location || '';
    dom.settingsSummary.value = profile.summary || '';
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
            if (btn.action) btn.action();
            if (btn.closes !== false) hideModal();
        });
        dom.modalButtons.appendChild(buttonEl);
    });
    dom.modalOverlay.classList.add('visible');
    // Ensure the default close button also works
    dom.modalCloseBtn.onclick = hideModal;
}

export function showJobDetailsModal(job) {
    const title = job.title;
    const body = `
        <h4>${job.company} - ${job.location}</h4>
        <p><strong>Зарплата:</strong> ${job.salary}</p>
        <hr>
        <h4>Описание</h4>
        <p>${job.description}</p>
        <h4>Требования</h4>
        <ul>
            ${job.requirements.map(r => `<li>${r}</li>`).join('')}
        </ul>
        <h4>Почему это вам подходит (${job.matchScore}%)</h4>
        <p><em>${job.matchReasoning}</em></p>
    `;
    const buttons = [{ text: 'Закрыть', class: 'secondary' }];
    showModal(title, body, buttons);
}

export function hideModal() { dom.modalOverlay.classList.remove('visible'); }

// AUTH UI
export function toggleAuthMode() {
    const isLoginMode = dom.authSubmitBtn.textContent === 'Войти';
    dom.authSubmitBtn.textContent = isLoginMode ? 'Создать аккаунт' : 'Войти';
    dom.authPromptText.textContent = isLoginMode ? 'Уже есть аккаунт?' : 'Нет аккаунта?';
    dom.authToggleModeBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
}
