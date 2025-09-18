export const appLayoutHTML = `
    <!-- Глобальный загрузчик -->
    <div id="app-loader">
        <svg class="splash-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#F0E7DD"/><path d="M50,10 A40,40 0 0,1 90,50" fill="none" stroke="#8B5E3C" stroke-width="8" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="2s" repeatCount="indefinite"/></path><circle cx="50" cy="50" r="20" fill="#fff"/></svg>
        <div class="loader-text" id="loader-text">Загрузка...</div>
    </div>

    <!-- Экран-заставка (оставлен для первого визита) -->
    <div class="screen" id="splash-screen">
        <svg class="splash-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#F0E7DD"/><path d="M50,10 A40,40 0 0,1 90,50" fill="none" stroke="#8B5E3C" stroke-width="8"/><path d="M50,90 A40,40 0 0,1 10,50" fill="none" stroke="#D4A373" stroke-width="8"/><circle cx="50" cy="50" r="20" fill="#fff"/><path d="M50 38 C 55 42, 55 48, 50 52 S 45 58, 50 62" stroke="#5E7A6E" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
        <h1 class="splash-title">СЕМЕЙНОЕ МЕНЮ</h1>
        <div class="splash-features">
            <div class="feature-slide">
                <div class="feature-icon">🗓️</div>
                <div class="feature-text">Планируйте меню на неделю</div>
            </div>
            <div class="feature-slide">
                <div class="feature-icon">☁️</div>
                <div class="feature-text">Синхронизация между устройствами</div>
            </div>
            <div class="feature-slide">
                <div class="feature-icon">🛒</div>
                <div class="feature-text">Составляйте умный список покупок</div>
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
            <svg class="setup-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#F0E7DD"/><path d="M50,10 A40,40 0 0,1 90,50" fill="none" stroke="#8B5E3C" stroke-width="8"/><path d="M50,90 A40,40 0 0,1 10,50" fill="none" stroke="#D4A373" stroke-width="8"/><circle cx="50" cy="50" r="20" fill="#fff"/><path d="M50 38 C 55 42, 55 48, 50 52 S 45 58, 50 62" stroke="#5E7A6E" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
            <h1 class="setup-title">Добро пожаловать!</h1>
            <p class="setup-subtitle">Войдите, чтобы сохранять и синхронизировать ваше меню.</p>
            
            <button class="google-signin-btn" id="google-signin-btn">
                <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.242,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                Войти через Google
            </button>
            <div class="auth-divider">или</div>

            <form id="auth-form" class="auth-form">
                <div class="input-group">
                    <input type="email" id="auth-email" class="auth-input" placeholder="Email" required autocomplete="email">
                </div>
                <div class="input-group">
                    <input type="password" id="auth-password" class="auth-input" placeholder="Пароль" required autocomplete="current-password">
                </div>
                <button type="submit" class="primary-button" id="auth-submit-btn">Войти</button>
            </form>

            <div class="auth-toggle-link">
                <span id="auth-prompt-text">Нет аккаунта?</span>
                <button id="auth-toggle-mode-btn">Зарегистрироваться</button>
            </div>
        </div>
    </div>


    <!-- Экран первоначальной настройки и генерации -->
    <div class="screen hidden" id="setup-screen">
        <div class="setup-container">
            <svg class="setup-logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#F0E7DD"/><path d="M50,10 A40,40 0 0,1 90,50" fill="none" stroke="#8B5E3C" stroke-width="8"/><path d="M50,90 A40,40 0 0,1 10,50" fill="none" stroke="#D4A373" stroke-width="8"/><circle cx="50" cy="50" r="20" fill="#fff"/><path d="M50 38 C 55 42, 55 48, 50 52 S 45 58, 50 62" stroke="#5E7A6E" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
            <h1 class="setup-title">СЕМЕЙНОЕ МЕНЮ</h1>
            <p class="setup-subtitle">Ваш ИИ-помощник для вкусных и простых семейных обедов.</p>
            <p class="wizard-step-counter" id="wizard-step-counter"></p>
            
            <div id="setup-wizard">
                <div class="wizard-step" data-step="1">
                    <h3 class="wizard-step-title">Шаг 1: Подключение к ИИ</h3>
                    <p class="wizard-step-description">Для начала работы укажите ваш API ключ для Google Gemini.</p>
                    <a href="#" id="api-key-help-link" class="api-key-help-link">Где взять ключ? Пошаговая инструкция</a>
                    <div class="input-group">
                        <input type="password" id="api-key-input" placeholder="Ваш Google Gemini API ключ">
                    </div>
                </div>

                <div class="wizard-step" data-step="2">
                    <h3 class="wizard-step-title">Шаг 2: Расскажите о вашей семье</h3>
                    <p class="wizard-step-description">Эта информация поможет ИИ рассчитать калорийность и размер порций. Добавьте каждого члена семьи.</p>
                    <div id="wizard-family-members-container"></div>
                    <button class="secondary-button" id="wizard-add-family-member-btn" style="height: 45px; font-size: 16px;">+ Добавить члена семьи</button>
                </div>

                <div class="wizard-step" data-step="3">
                    <h3 class="wizard-step-title">Шаг 3: Настройте ваше меню</h3>
                    <p class="wizard-step-description">Укажите основные параметры для планирования.</p>
                    <div class="settings-form-group">
                        <label for="wizard-menu-duration">Количество дней меню</label>
                        <input type="number" id="wizard-menu-duration" class="settings-input" min="1" max="14">
                    </div>
                    <div class="settings-form-group">
                        <label for="wizard-total-budget">Общий бюджет, ₽</label>
                        <input type="number" id="wizard-total-budget" class="settings-input" step="500">
                    </div>
                    <div class="settings-form-group">
                        <label for="wizard-preferences">Предпочтения и аллергии</label>
                        <textarea id="wizard-preferences" class="settings-textarea" rows="2" placeholder="Например: без рыбы, меньше жареного"></textarea>
                    </div>
                    <div class="settings-form-group">
                        <label for="wizard-cuisine">Предпочитаемая кухня</label>
                        <select id="wizard-cuisine" class="settings-select">
                            <option value="Любая">Любая</option>
                            <option value="Русская">Русская</option>
                            <option value="Итальянская">Итальянская</option>
                            <option value="Азиатская">Азиатская</option>
                            <option value="Средиземноморская">Средиземноморская</option>
                            <option value="Кавказская">Кавказская</option>
                        </select>
                    </div>
                     <div class="settings-form-group">
                        <label for="wizard-difficulty">Сложность блюд</label>
                        <select id="wizard-difficulty" class="settings-select">
                            <option value="Любая">Любая</option>
                            <option value="Простая">Простая (быстро и легко)</option>
                            <option value="Средняя">Средняя (стандартные рецепты)</option>
                            <option value="Сложная">Сложная (для особых случаев)</option>
                        </select>
                    </div>
                </div>

                <div class="wizard-step" data-step="4">
                    <h3 class="wizard-step-title">Всё готово к магии!</h3>
                    <p class="wizard-step-description">Мы собрали все необходимые данные. Нажмите кнопку ниже, чтобы наш ИИ создал ваше идеальное семейное меню на неделю.</p>
                </div>
            </div>
            
            <div id="wizard-nav" class="hidden">
                 <button class="secondary-button" id="wizard-back-btn">Назад</button>
                 <button class="primary-button" id="wizard-next-btn">Далее</button>
            </div>

            <div id="generation-progress" class="hidden">
                <div id="progress-status"></div>
                <div class="progress-bar-container">
                    <div id="progress-bar"></div>
                </div>
                <div id="progress-details"></div>
            </div>
        </div>
    </div>
    
    <!-- Экран предпросмотра -->
    <div class="screen hidden" id="preview-screen">
        <div class="setup-container">
            <h1 class="setup-title">Предпросмотр меню</h1>
            <p class="setup-subtitle">Проверьте сгенерированное меню. Вы можете изменить любое блюдо или перегенерировать всё заново.</p>
            <div id="preview-menu-container"></div>
            <div class="preview-buttons">
                <button class="secondary-button" id="preview-regenerate-all-btn">Пересоздать всё</button>
                <button class="primary-button" id="preview-accept-btn">Принять и сохранить</button>
            </div>
        </div>
    </div>

    <!-- Основной экран приложения с навигацией -->
    <div class="screen hidden" id="main-screen">
        <header class="main-header">
            <h1 id="main-header-title">Меню на неделю</h1>
            <button id="open-settings-btn" aria-label="Настройки">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </button>
        </header>
        <div class="content-area">
            <div class="main-content active" id="menu-content">
                <div id="date-selector">
                    <button id="prev-day-btn" class="date-nav-arrow" aria-label="Предыдущий день">◀︎</button>
                    <div id="current-date-display"></div>
                    <button id="next-day-btn" class="date-nav-arrow" aria-label="Следующий день">▶︎</button>
                </div>
                <div id="daily-menu-container"></div>
            </div>
            <div class="main-content" id="shopping-list-content">
                <p id="shopping-progress-text">0/0 куплено</p>
                <div class="progress-bar-shopping">
                    <div id="shopping-progress"></div>
                </div>
                <div id="shopping-list-container"></div>
                <div id="shopping-list-total"><span>Примерная сумма:</span> 0 ₽</div>
            </div>
            <div class="main-content" id="budget-content">
                <div class="budget-container">
                    <div class="pie-chart-container">
                        <svg class="pie-chart" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9155" stroke="#eee" stroke-width="32" fill="#fff"/>
                          <circle class="pie-slice" id="pie-products" cx="18" cy="18" r="15.9155" stroke="#8B5E3C" stroke-dasharray="0, 100"/>
                        </svg>
                        <div class="chart-center-text" id="budget-spent-total">0 ₽ <span>потрачено</span></div>
                    </div>
                    <div class="budget-summary">
                        <p>Бюджет: <span class="amount" id="budget-total">10000 ₽</span></p>
                        <p>Осталось: <span class="amount ok" id="budget-remaining">10000 ₽</span></p>
                    </div>
                </div>
                <div id="budget-chart-container" class="settings-section">
                    <h3 class="settings-title">Динамика расходов (7 дней)</h3>
                    <div id="bar-chart"></div>
                </div>
            </div>
        </div>
        <nav class="bottom-nav">
            <button class="nav-button active" data-content="menu-content" data-title="Меню на неделю">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                Меню
            </button>
            <button class="nav-button" data-content="shopping-list-content" data-title="Список покупок">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.838-6.817a.5.5 0 00-.47-.665H5.25l-.838-3.141A.5.5 0 003.838 3H2.25zM7.5 14.25v3H6a3 3 0 01-3-3h4.5zM16.5 14.25v3h1.5a3 3 0 003-3h-4.5z" /></svg>
                Покупки
            </button>
            <button class="nav-button" data-content="budget-content" data-title="Бюджет">
                 <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25-2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12m15 0a2.25 2.25 0 01-2.25 2.25H9.75a2.25 2.25 0 01-2.25-2.25M15 12a2.25 2.25 0 00-2.25-2.25H9.75A2.25 2.25 0 007.5 12m7.5 0v6M7.5 12v6m7.5-6H9.75" /></svg>
                Бюджет
            </button>
        </nav>
    </div>

    <!-- Экран рецепта -->
    <div class="screen hidden" id="recipe-screen">
        <header class="recipe-header">
            <button class="back-button" id="back-to-menu-btn">◀︎ Назад</button>
            <h2 id="recipe-title"></h2>
            <span id="step-indicator"></span>
        </header>
        <div id="recipe-content">
            <img id="step-image" src="" alt="Изображение шага">
            <p id="step-description"></p>
            <div class="timer-container hidden" id="timer-section">
                <div id="timer-display">00:00</div>
                <div class="timer-controls">
                    <button class="timer-button" id="start-timer-btn">▶️ Запустить</button>
                    <button class="timer-button" id="pause-timer-btn">⏸️ Пауза</button>
                    <button class="timer-button" id="reset-timer-btn">♻️ Сброс</button>
                </div>
            </div>
            <h3 id="step-ingredients-title">Ингредиенты на этом шаге:</h3>
            <ul id="step-ingredients"></ul>
            <div class="recipe-nav">
                <button class="nav-btn-recipe" id="prev-step-btn">← Назад</button>
                <button class="nav-btn-recipe" id="next-step-btn">Далее →</button>
            </div>
        </div>
    </div>
    
    <!-- Экран Настроек -->
    <div class="screen hidden" id="settings-screen">
        <header class="recipe-header" style="padding: 15px 20px; border-bottom: 1px solid #eee;">
            <button class="back-button" id="close-settings-btn">◀︎ Назад</button>
            <h2 id="settings-title">Настройки</h2>
            <span style="width: 50px;"></span> <!-- Spacer -->
        </header>
        <div id="settings-content">
            <div class="settings-section">
                <h3 class="settings-title">Аккаунт</h3>
                <p class="user-info" id="user-info-email">Вы не авторизованы.</p>
                <button class="danger-button" id="sign-out-btn">Выйти</button>
            </div>

            <div class="settings-section">
                <h3 class="settings-title">Параметры меню</h3>
                <div class="settings-form-group">
                    <label for="settings-menu-duration">Количество дней меню</label>
                    <input type="number" id="settings-menu-duration" class="settings-input" min="1" max="14">
                </div>
                <div class="settings-form-group">
                    <label for="settings-total-budget">Общий бюджет, ₽</label>
                    <input type="number" id="settings-total-budget" class="settings-input" step="500">
                </div>
                <div class="settings-form-group">
                    <label for="settings-cuisine">Предпочитаемая кухня</label>
                    <select id="settings-cuisine" class="settings-select">
                        <option value="Любая">Любая</option>
                        <option value="Русская">Русская</option>
                        <option value="Итальянская">Итальянская</option>
                        <option value="Азиатская">Азиатская</option>
                        <option value="Средиземноморская">Средиземноморская</option>
                        <option value="Кавказская">Кавказская</option>
                    </select>
                </div>
                 <div class="settings-form-group">
                    <label for="settings-difficulty">Сложность блюд</label>
                    <select id="settings-difficulty" class="settings-select">
                        <option value="Любая">Любая</option>
                        <option value="Простая">Простая (быстро и легко)</option>
                        <option value="Средняя">Средняя (стандартные рецепты)</option>
                        <option value="Сложная">Сложная (для особых случаев)</option>
                    </select>
                </div>
                <div class="settings-form-group">
                    <label for="settings-preferences">Предпочтения и аллергии</label>
                    <textarea id="settings-preferences" class="settings-textarea" rows="3" placeholder="Например: без рыбы, меньше жареного"></textarea>
                </div>
                <button class="primary-button" id="save-settings-btn">Сохранить</button>
            </div>

            <div class="settings-section">
                <h3 class="settings-title">Состав семьи</h3>
                <div id="family-members-container"></div>
                <button class="secondary-button" id="add-family-member-btn" style="height: 45px; font-size: 16px;">+ Добавить члена семьи</button>
            </div>
            
            <div class="settings-section">
                <h3 class="settings-title">Управление данными</h3>
                 <div class="sync-info" style="margin-bottom: 15px;">
                    <strong>Синхронизация включена.</strong> Все ваши данные автоматически сохраняются в облаке и доступны на всех устройствах.
                </div>
                <button class="secondary-button" id="run-wizard-btn" style="height: 45px; font-size: 16px;">Запустить мастер настройки</button>
                <button class="primary-button" id="regenerate-all-btn" style="margin-top: 10px;">🔄 Перегенерировать всё меню</button>
            </div>
            
             <div class="settings-section">
                <h3 class="settings-title">API-ключ</h3>
                <div class="settings-form-group">
                    <label for="settings-api-key">Google Gemini API Key</label>
                    <input type="password" id="settings-api-key" class="settings-input" placeholder="Введите ваш ключ">
                </div>
                <button class="primary-button" id="save-api-key-btn">Проверить и сохранить</button>
            </div>

            <div class="settings-section">
                <h3 class="settings-title">Как установить приложение</h3>
                <div class="install-instructions">
                    <span class="install-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5V3M7.5 7.5L12 3l4.5 4.5M18 13.5v5.25c0 .93-.75 1.68-1.68 1.68H7.68c-.93 0-1.68-.75-1.68-1.68v-5.25"/></svg>
                    </span>
                    <div class="install-text">Нажмите "Поделиться" в браузере, а затем выберите "На экран 'Домой'", чтобы использовать приложение как нативное.</div>
                </div>
            </div>

            <div class="settings-section">
                <h3 class="settings-title">О приложении</h3>
                <p id="app-version-info" style="color: var(--soft-text); font-size: 14px; margin-bottom: 15px;"></p>
                <button class="secondary-button" id="show-changelog-btn" style="height: 45px; font-size: 16px;">История изменений</button>
                <div class="sync-info" style="margin-top: 15px;">
                    Автор: Климов Евгений<br>
                    <a href="https://t.me/eklimov" target="_blank">Связаться в Telegram</a>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Модальное окно -->
    <div id="modal-overlay">
        <div class="modal-content">
            <h3 class="modal-title" id="modal-title"></h3>
            <div class="modal-body" id="modal-body"></div>
            <div class="modal-buttons" id="modal-buttons"></div>
        </div>
    </div>
    
    <!-- Уведомление -->
    <div id="notification"></div>

    <audio id="notification-sound" src="data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YU9vT18="></audio>
`;
