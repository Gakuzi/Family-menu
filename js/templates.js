
export const appLayoutHTML = `
    <!-- Глобальный загрузчик -->
    <div id="app-loader">
        <svg class="splash-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#DDE7F0"/><path d="M50,10 A40,40 0 0,1 90,50" fill="none" stroke="#3C5B8B" stroke-width="8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2s" repeatCount="indefinite"/></path><circle cx="50" cy="50" r="20" fill="#fff"/></svg>
        <div class="loader-text" id="loader-text">Загрузка...</div>
    </div>

    <!-- Экран-заставка -->
    <div class="screen" id="splash-screen">
        <svg class="splash-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3C5B8B"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
        <h1 class="splash-title">AI Job Assistant</h1>
        <div class="splash-features">
            <div class="feature-slide">
                <div class="feature-icon">👤</div>
                <div class="feature-text">Создайте свой карьерный профиль</div>
            </div>
            <div class="feature-slide">
                <div class="feature-icon">🤖</div>
                <div class="feature-text">Получайте вакансии от ИИ</div>
            </div>
            <div class="feature-slide">
                <div class="feature-icon">📈</div>
                <div class="feature-text">Ускорьте поиск работы</div>
            </div>
        </div>
        <div class="splash-author">
          Автор: Климов Евгений<br>
          <a href="https://t.me/eklimov" target="_blank">Telegram: @eklimov</a>
        </div>
        <button class="primary-button" id="start-app-btn">Начать</button>
    </div>

    <!-- Экран аутентификации -->
    <div class="screen hidden" id="auth-screen">
        <div class="auth-container">
            <svg class="setup-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3C5B8B"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
            <h1 class="setup-title">Добро пожаловать!</h1>
            <p class="setup-subtitle">Войдите, чтобы сохранять ваш профиль и историю поиска.</p>
            <button class="google-signin-btn" id="google-signin-btn"><svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.242,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>Войти через Google</button>
            <div class="auth-divider">или</div>
            <form id="auth-form" class="auth-form">
                <div class="input-group"><input type="email" id="auth-email" class="auth-input" placeholder="Email" required autocomplete="email"></div>
                <div class="input-group"><input type="password" id="auth-password" class="auth-input" placeholder="Пароль" required autocomplete="current-password"></div>
                <button type="submit" class="primary-button" id="auth-submit-btn">Войти</button>
            </form>
            <div class="auth-toggle-link"><span id="auth-prompt-text">Нет аккаунта?</span> <button id="auth-toggle-mode-btn">Зарегистрироваться</button></div>
        </div>
    </div>

    <!-- Экран первоначальной настройки -->
    <div class="screen hidden" id="setup-screen">
        <div class="setup-container">
            <svg class="setup-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3C5B8B"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/></svg>
            <h1 class="setup-title">Настройка ассистента</h1>
            <p class="setup-subtitle">Давайте создадим ваш профиль для поиска идеальной работы.</p>
            <p class="wizard-step-counter" id="wizard-step-counter"></p>
            
            <div id="setup-wizard">
                <div class="wizard-step" data-step="1">
                    <h3 class="wizard-step-title">Шаг 1: Ваш профессиональный профиль</h3>
                     <div class="settings-form-group" style="text-align: left;">
                        <label for="api-key-input">Google Gemini API Ключ</label>
                        <input type="password" id="api-key-input" class="settings-input" placeholder="Вставьте ваш API ключ">
                    </div>
                    <div class="settings-form-group" style="text-align: left;">
                        <label for="wizard-desired-role">Кем вы хотите работать?</label>
                        <input type="text" id="wizard-desired-role" class="settings-input" placeholder="Например, Frontend-разработчик">
                    </div>
                     <div class="settings-form-group" style="text-align: left;">
                        <label for="wizard-experience">Опыт работы (лет)</label>
                        <input type="number" id="wizard-experience" class="settings-input" min="0" max="50" value="5">
                    </div>
                    <div class="settings-form-group" style="text-align: left;">
                        <label for="wizard-key-skills">Ключевые навыки</label>
                        <textarea id="wizard-key-skills" class="settings-textarea" rows="2" placeholder="Через запятую: React, TypeScript, Node.js"></textarea>
                    </div>
                    <div class="settings-form-group" style="text-align: left;">
                        <label for="wizard-summary">Цели и предпочтения</label>
                        <textarea id="wizard-summary" class="settings-textarea" rows="3" placeholder="Что вы ищете в новой работе?"></textarea>
                    </div>
                </div>

                <div class="wizard-step" data-step="2">
                    <h3 class="wizard-step-title">Шаг 2: Выбор платформ</h3>
                    <p class="wizard-step-description">Выберите сайты, на которых ассистент будет имитировать поиск вакансий. Мы подобрали для вас список с помощью ИИ.</p>
                    <div id="platform-selection-container">
                        <p>Загрузка списка платформ...</p>
                    </div>
                </div>

                <div class="wizard-step" data-step="3">
                    <h3 class="wizard-step-title">Шаг 3: Авторизация</h3>
                    <p class="wizard-step-description">Для полноценной работы в будущем ассистенту потребуется доступ к вашим аккаунтам на выбранных платформах. Это позволит автоматически откликаться на вакансии и вести переписку от вашего имени.</p>
                    <p class="wizard-step-description" style="font-weight: 600;">На данном этапе мы не будем запрашивать ваши пароли. Этот шаг имитирует будущую интеграцию через безопасные протоколы (OAuth).</p>
                    <p class="wizard-step-description">Нажимая "Завершить", вы соглашаетесь с тем, что ассистент будет действовать на основе созданного профиля.</p>
                </div>
            </div>
            
            <div id="wizard-nav">
                 <button class="secondary-button" id="wizard-back-btn">Назад</button>
                 <button class="primary-button" id="wizard-next-btn" disabled>Далее</button>
            </div>

            <div id="generation-progress" class="hidden">
                <div id="progress-status"></div>
                <div class="progress-bar-container"><div id="progress-bar"></div></div>
                <div id="progress-details"></div>
            </div>
        </div>
    </div>
    
    <!-- Основной экран приложения -->
    <div class="screen hidden" id="main-screen">
        <header class="main-header">
            <h1 id="main-header-title">Подходящие вакансии</h1>
            <button id="open-settings-btn" aria-label="Настройки">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
        </header>
        <div class="content-area">
            <div id="job-listings-container">
                <!-- Job cards will be rendered here by ui.js -->
            </div>
        </div>
    </div>

    <!-- Экран настроек (слайд-панель) -->
    <div class="screen hidden" id="settings-screen">
        <header class="main-header">
             <button id="settings-close-btn" class="secondary-button" style="width: auto; padding: 0 15px; height: 40px; font-size: 16px;" aria-label="Закрыть">Назад</button>
            <h1 id="settings-title">Настройки</h1>
            <div style="width: 80px;"></div> <!-- Spacer -->
        </header>
        <div id="settings-content">
            <div class="settings-section">
                 <p class="user-info">Вы вошли как: <strong id="settings-user-info-email">...</strong></p>
                 <button class="secondary-button" id="settings-sign-out-btn" style="background-color: #eee;">Выйти из аккаунта</button>
            </div>
            
            <div class="settings-section">
                <h3 class="settings-title">Подключение к ИИ</h3>
                <div class="settings-form-group">
                    <label for="settings-api-key">Google Gemini API Ключ</label>
                    <input type="password" id="settings-api-key" class="settings-input">
                </div>
                <button class="primary-button" id="settings-save-api-key-btn">Сохранить и проверить ключ</button>
            </div>
            
            <div class="settings-section">
                <h3 class="settings-title">Ваш профиль</h3>
                <div class="settings-form-group">
                    <label for="settings-full-name">Полное имя</label>
                    <input type="text" id="settings-full-name" class="settings-input">
                </div>
                <div class="settings-form-group">
                    <label for="settings-desired-role">Желаемая должность</label>
                    <input type="text" id="settings-desired-role" class="settings-input">
                </div>
                <div class="settings-form-group">
                    <label for="settings-experience">Опыт (лет)</label>
                    <input type="number" id="settings-experience" class="settings-input">
                </div>
                 <div class="settings-form-group">
                    <label for="settings-key-skills">Ключевые навыки</label>
                    <textarea id="settings-key-skills" class="settings-textarea" rows="3"></textarea>
                </div>
                 <div class="settings-form-group">
                    <label for="settings-salary-expectation">Зарплатные ожидания</label>
                    <input type="text" id="settings-salary-expectation" class="settings-input">
                </div>
                 <div class="settings-form-group">
                    <label for="settings-location">Локация</label>
                    <input type="text" id="settings-location" class="settings-input">
                </div>
                <div class="settings-form-group">
                    <label for="settings-summary">Саммари/цели</label>
                    <textarea id="settings-summary" class="settings-textarea" rows="4"></textarea>
                </div>
                <button class="primary-button" id="settings-save-profile-btn">Сохранить профиль</button>
            </div>

            <div class="settings-section">
                <h3 class="settings-title">Действия</h3>
                <button class="primary-button" id="settings-find-jobs-btn">Найти вакансии заново</button>
            </div>
        </div>
    </div>
    
    <!-- Универсальное модальное окно -->
    <div id="modal-overlay">
        <div class="modal-content">
            <h2 id="modal-title"></h2>
            <div id="modal-body"></div>
            <div id="modal-buttons" class="modal-buttons">
                 <button class="modal-button secondary" id="modal-close-btn">Закрыть</button>
            </div>
        </div>
    </div>

    <!-- Уведомления -->
    <div id="notification"></div>
`;
