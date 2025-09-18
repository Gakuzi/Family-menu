
import { initFirebase, signInWithGoogle, handleEmailPasswordAuth, signOut, saveState, setupRealtimeListener } from './js/firebase.js';
import { getState, setState, updateState } from './js/state.js';
import { findJobs, getJobPlatforms } from './js/api.js';
import * as ui from './js/ui.js';

const app = {
    init() {
        ui.renderAppLayout();
        ui.cacheDom();
        
        initFirebase();
        this.addEventListeners();

        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                ui.dom.loaderText.textContent = 'Синхронизация профиля...';
                setupRealtimeListener(user.uid, (data) => {
                    setState(data);
                    ui.dom.appLoader.classList.add('hidden');
                    // Check if the essential profile information is filled out
                    if (getState().settings.apiKey && getState().settings.profile.desiredRole) {
                        ui.showScreen('main-screen');
                        ui.renderDashboard();
                    } else {
                        ui.showWizard();
                    }
                }, () => {
                     // New user callback
                    ui.dom.appLoader.classList.add('hidden');
                    ui.showWizard();
                });
            } else {
                // No user is signed in.
                const hasSeenSplash = localStorage.getItem('hasSeenSplash_job_v1') === 'true';
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
        const dom = ui.dom;
        
        dom.startAppBtn.addEventListener('click', () => {
            localStorage.setItem('hasSeenSplash_job_v1', 'true');
            ui.showScreen('auth-screen');
        });

        // Auth
        dom.googleSigninBtn.addEventListener('click', () => signInWithGoogle(ui.showNotification, ui.hideNotification));
        dom.authForm.addEventListener('submit', (e) => handleEmailPasswordAuth(e, ui.showNotification, ui.hideNotification));
        dom.authToggleModeBtn.addEventListener('click', ui.toggleAuthMode);
        
        // Wizard
        dom.wizardNextBtn.addEventListener('click', () => this.navigateWizard(1));
        dom.wizardBackBtn.addEventListener('click', () => this.navigateWizard(-1));

        // Main App
        dom.openSettingsBtn.addEventListener('click', ui.showSettingsPanel);

        // Settings
        dom.settingsCloseBtn.addEventListener('click', ui.hideSettingsPanel);
        dom.settingsSaveProfileBtn.addEventListener('click', () => this.saveProfileSettings());
        dom.settingsSaveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        dom.settingsFindJobsBtn.addEventListener('click', () => {
            ui.hideSettingsPanel();
            this.startJobSearch();
        });
        dom.settingsSignOutBtn.addEventListener('click', () => signOut(ui.hideSettingsPanel, ui.showNotification));

        // Modal
        dom.modalOverlay.addEventListener('click', (e) => {
            if (e.target === dom.modalOverlay) {
                ui.hideModal();
            }
        });

        // Delegated listener for job listings
        dom.jobListingsContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.job-card');
            if (card) {
                const jobId = card.dataset.id;
                const job = getState().jobListings.find(j => j.id === jobId);
                if (job) {
                    ui.showJobDetailsModal(job);
                }
            }
        });
    },
    
    async startJobSearch() {
        ui.showScreen('setup-screen');
        ui.prepareForGeneration();
        
        try {
            const listings = await findJobs(getState(), (percent, status, details) => ui.updateProgress(percent, status, details));
            
            if (!listings || listings.length === 0) {
                throw new Error("Не удалось найти подходящие вакансии.");
            }
            
            updateState({ jobListings: listings });
            saveState(); // Explicitly save after successful generation
            ui.renderDashboard();
            ui.showScreen('main-screen');

        } catch(error) {
            console.error("Job search failed:", error);
            let errorMessage = error.message.includes('API key') 
                ? 'Ваш API ключ недействителен. Проверьте его в настройках.'
                : `Не удалось найти вакансии. Ошибка: ${error.message}`;

            ui.showGenerationError(errorMessage, () => {
                ui.showScreen('main-screen'); // Go back to dashboard on error
                ui.renderDashboard(); // Render empty state
            });
        }
    },
    
    saveProfileSettings() {
        const newProfile = {
            ...getState().settings.profile,
            fullName: ui.dom.settingsFullName.value,
            desiredRole: ui.dom.settingsDesiredRole.value,
            experience: ui.dom.settingsExperience.value,
            keySkills: ui.dom.settingsKeySkills.value,
            salaryExpectation: ui.dom.settingsSalaryExpectation.value,
            location: ui.dom.settingsLocation.value,
            summary: ui.dom.settingsSummary.value,
        };
        updateState({ settings: { ...getState().settings, profile: newProfile } });
        saveState();
        ui.showNotification("Профиль сохранен.");
    },
    
    async saveApiKey() {
        const newApiKey = ui.dom.settingsApiKey.value.trim();
        if (!newApiKey) {
            ui.showNotification('API ключ не может быть пустым', 'error');
            return;
        }
        ui.showNotification('Проверка ключа...', 'loading');
        
        try {
            await getJobPlatforms(newApiKey, 'validate'); // Use a lightweight call for validation
            
            const newSettings = { ...getState().settings, apiKey: newApiKey };
            updateState({ settings: newSettings });
            saveState();
            ui.showNotification('API ключ успешно сохранен и проверен!');
        } catch (error) {
            console.error("API Key validation failed:", error);
            ui.showNotification('Неверный API ключ. Проверьте его и попробуйте снова.', 'error');
        }
    },

    async navigateWizard(direction) {
        const currentStep = ui.wizard.currentStep;
        
        if (direction > 0) { // Moving forward, save data
            const settings = getState().settings;
            if (currentStep === 1) {
                settings.apiKey = ui.dom.apiKeyInput.value.trim();
                const profile = {
                    desiredRole: ui.dom.wizardDesiredRole.value,
                    experience: ui.dom.wizardExperience.value,
                    keySkills: ui.dom.wizardKeySkills.value,
                    summary: ui.dom.wizardSummary.value,
                };
                settings.profile = { ...settings.profile, ...profile };
                updateState({ settings });
            } else if (currentStep === 2) {
                const selectedPlatforms = Array.from(ui.dom.platformSelectionContainer.querySelectorAll('input:checked')).map(input => input.value);
                settings.connectedPlatforms = selectedPlatforms;
                updateState({ settings });
            }

            if (currentStep === ui.wizard.totalSteps) {
                saveState(); // Save all wizard settings before starting search
                this.startJobSearch();
                return;
            }
        }
        
        ui.navigateWizard(direction);
    },
};

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    window.app = app;
    app.init();
});
