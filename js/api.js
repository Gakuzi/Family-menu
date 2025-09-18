import { GoogleGenAI, Type } from "https://esm.run/@google/genai";
import { updateState } from './state.js';
import * as ui from './ui.js';

let ai;

function getAI(apiKey) {
    if (!ai || ai.apiKey !== apiKey) {
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}

async function makeGeminiRequest(apiKey, prompt, jsonSchema) {
    console.log(`🟡 REQUEST: ${prompt.substring(0, 100)}...`);
    let retries = 3;
    while (retries > 0) {
        try {
            const genAI = getAI(apiKey);
            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: jsonSchema
                }
            });
            const jsonText = response.text.trim();
            const data = JSON.parse(jsonText);
            console.log(`✅ RESPONSE RECEIVED`);
            return data;
        } catch (error) {
            retries--;
            console.error(`🔴 ERROR: ${error}. Retrying... (${retries} left)`);
            if (retries === 0) throw error;
            await new Promise(res => setTimeout(res, 1500));
        }
    }
}

export async function startGenerationProcess(state, purchasedItems = '', extraPrompt = '', updateProgressCallback) {
    const apiKey = state.settings.apiKey;
    if (!apiKey) {
        throw new Error("API key is not configured.");
    }
    
    const TOTAL_STEPS = 10;
    await updateProgressCallback(1, TOTAL_STEPS, "Подключение к Google Gemini…", "Проверка API ключа...");

    try {
        await getAI(apiKey).models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
        console.log('✅ API KEY VALIDATED');
    } catch (e) {
        if (e.message.includes('API key not valid')) {
            throw new Error('API key not valid');
        }
        throw new Error('Network error while validating API key.');
    }

    await updateProgressCallback(2, TOTAL_STEPS, "Анализ профиля семьи", "Подготовка индивидуальных рекомендаций...");

    let progressInterval;
    try {
        const thinkingMessages = [
            "Анализирую ваши предпочтения...",
            "Подбираю разнообразные блюда...",
            "Рассчитываю калорийность на каждый день...",
            "Продумываю использование остатков для экономии...",
            "Составляю рецепты, чтобы было просто и вкусно...",
            "Формирую список покупок по категориям...",
            "Проверяю соответствие бюджету...",
            "Почти готово, финализирую план..."
        ];
        let messageIndex = 0;
        let currentStep = 2;

        progressInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % thinkingMessages.length;
            if (currentStep < TOTAL_STEPS - 1) {
                currentStep++;
            }
            updateProgressCallback(currentStep, TOTAL_STEPS, "Магия ИИ в действии…", thinkingMessages[messageIndex]);
        }, 2500);

        const comprehensiveData = await generateComprehensiveData(state, purchasedItems, extraPrompt);
        
        clearInterval(progressInterval);
        await updateProgressCallback(TOTAL_STEPS, TOTAL_STEPS, "Готово!", "Ваше меню успешно создано.");

        return comprehensiveData;

    } catch (error) {
        if (progressInterval) clearInterval(progressInterval);
        throw error;
    }
}

async function generateComprehensiveData(state, purchasedItems = '', extraPrompt = '') {
    const { family, menuDuration, preferences, cuisine, difficulty, totalBudget } = state.settings;
    
    const familyDescription = family.map(p => {
        let description = `${p.name}, ${p.gender === 'male' ? 'Мужчина' : 'Женщина'}, ${p.age} лет. Активность: ${p.activity}.`;
        if (p.weight) description += ` Вес: ${p.weight} кг.`;
        if (p.height) description += ` Рост: ${p.height} см.`;
        return description;
    }).join('; ');

    let promptText = `Сгенерируй одним JSON-ответом полный план питания. Ответ должен содержать три ключа верхнего уровня: "menu", "recipes", "shoppingList".

1.  **menu**: Разнообразное меню на ${menuDuration} дней (с воскресенья по субботу) для семьи: ${familyDescription}.
    *   Если указаны вес и рост, используй их для более точного расчета суточной нормы калорий. Если нет - используй средние значения для указанного возраста, пола и активности.
    *   Общие предпочтения: ${preferences}.
    *   Предпочитаемая кухня: ${cuisine}.
    *   Желаемая сложность блюд: ${difficulty}.
    *   Каждый день должен включать: Завтрак, Перекус, Обед, Полдник, Ужин.
    *   Иногда используй остатки от ужина на обед следующего дня (помечай их как "Название блюда (остатки)").

2.  **recipes**: Массив с детальными рецептами для КАЖДОГО уникального блюда из сгенерированного меню (кроме блюд с пометкой "остатки").
    *   Каждый рецепт должен иметь уникальный 'id' (например, 'borsch-s-govyadinoy').
    *   Название 'name' рецепта должно ТОЧНО соответствовать названию в меню.
    *   Включи полный список ингредиентов с количеством для семьи из ${family.length} человек.
    *   Предоставь пошаговые инструкции 'steps'. В каждом шаге укажи используемые ингредиенты и их количество.

3.  **shoppingList**: Сводный список покупок, сгруппированный по категориям.
    *   Суммируй ВСЕ ингредиенты из ВСЕХ сгенерированных рецептов.
    *   Категории: "Мясо и птица", "Молочные и яйца", "Овощи и зелень", "Фрукты и орехи", "Бакалея", "Хлеб и выпечка", "Напитки", "Прочее".
    *   Для каждого продукта укажи общее необходимое количество 'totalNeeded', а затем предложи 'shoppingSuggestion' — разумное количество для покупки в магазине, округляя в большую сторону до стандартной упаковки (например, для 750г муки предложи купить 1кг).
    *   Укажи примерную цену 'price' в рублях для 'shoppingSuggestion'. Общая стоимость всех продуктов не должна превышать бюджет ${totalBudget} рублей.
`;

    if (purchasedItems) {
        promptText += `\nВАЖНО: При составлении меню отдай приоритет блюдам, в которых используются уже купленные продукты. Список купленных продуктов: ${purchasedItems}.`;
    }
    if (extraPrompt) {
         promptText += `\nОСОБОЕ УКАЗАНИЕ: ${extraPrompt}`;
    }

    const ingredientsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING, description: "Количество и единица измерения, например '200 г' или '1 шт'" } }, required: ["name", "quantity"] } };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            menu: {
                type: Type.ARRAY,
                description: "Меню на неделю.",
                items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, meals: { type: Type.OBJECT, properties: { breakfast: { type: Type.STRING }, snack1: { type: Type.STRING }, lunch: { type: Type.STRING }, snack2: { type: Type.STRING }, dinner: { type: Type.STRING } }, required: ["breakfast", "snack1", "lunch", "snack2", "dinner"] } }, required: ["day", "meals"] }
            },
            recipes: {
                type: Type.ARRAY,
                description: "Рецепты для уникальных блюд из меню.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING, description: "Уникальный идентификатор рецепта" },
                        name: { type: Type.STRING, description: "Название, соответствующее меню" },
                        ingredients: ingredientsSchema,
                        steps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, time: { type: Type.NUMBER, description: "Время в минутах. 0 если таймер не нужен." }, ingredients: ingredientsSchema }, required: ["description", "time", "ingredients"] } }
                    },
                    required: ["id", "name", "ingredients", "steps"]
                }
            },
            shoppingList: {
                type: Type.ARRAY,
                description: "Список покупок, сгруппированный по категориям.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, totalNeeded: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } }, shoppingSuggestion: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } }, price: { type: Type.NUMBER } }, required: ["name", "totalNeeded", "shoppingSuggestion", "price"] } }
                    },
                    required: ["category", "items"]
                }
            }
        },
        required: ["menu", "recipes", "shoppingList"]
    };

    const comprehensiveData = await makeGeminiRequest(state.settings.apiKey, promptText, schema);

    const recipesMap = {};
    if (comprehensiveData.recipes) {
        comprehensiveData.recipes.forEach(recipe => {
            recipesMap[recipe.id] = recipe;
        });
    }

    if (comprehensiveData.shoppingList) {
        comprehensiveData.shoppingList.forEach(category => {
            (category.items || []).forEach(item => {
                item.purchases = [];
                item.consumedQty = 0;
            });
        });
    }
    
    return {
        menu: comprehensiveData.menu || [],
        recipes: recipesMap,
        shoppingList: comprehensiveData.shoppingList || []
    };
}


export async function generateStepImage(apiKey, recipe, stepIndex) {
    try {
        const genAI = getAI(apiKey);
        const stepDescription = recipe.steps[stepIndex].description;
        const prompt = `Food photography, realistic, high-detail photo of a cooking step: "${stepDescription}"`;
        
        const response = await genAI.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3',
            },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Image generation failed:", error);
        return null;
    }
}

export async function handleRegeneration(type, data, isPreview = false, customPrompt = '') {
    const { getState, saveState } = await import('../js/state.js');
    const sourceState = isPreview ? getState().temp : getState();
    const apiKey = getState().settings.apiKey;

    if (!sourceState || !apiKey) {
        ui.showNotification("Ошибка: нет данных или ключа API.", "error");
        return;
    }

    ui.showNotification("Обновляем меню...", 'loading');

    try {
        let extraPrompt = '';
        const currentMenuString = JSON.stringify(sourceState.menu.map(d => ({day: d.day, meals: d.meals})));
        
        if (type === 'validate') {
            await getAI(data.apiKey).models.generateContent({model:'gemini-2.5-flash', contents: 'test'});
            return; // Just for validation
        }

        if (type === 'meal') {
            const { dayName, mealKey } = data;
            const mealName = sourceState.menu.find(d => d.day === dayName)?.meals[mealKey];
            extraPrompt = `Основываясь на существующем меню: ${currentMenuString}. СДЕЛАЙ ТОЛЬКО ОДНО ИЗМЕНЕНИЕ: для дня "${dayName}" замени блюдо "${mealKey}" ("${mealName}") на что-то другое. Пожелание: ${customPrompt || 'сделай что-нибудь другое'}. Сохрани все остальные блюда в меню без изменений. Затем обнови список рецептов и покупок в соответствии с этим одним изменением.`;
        } else { // type === 'day'
            const { dayName } = data;
            extraPrompt = `Основываясь на существующем меню: ${currentMenuString}. СДЕЛАЙ ИЗМЕНЕНИЯ ТОЛЬКО ДЛЯ ОДНОГО ДНЯ: полностью обнови меню для дня "${dayName}". Пожелание: ${customPrompt || 'сделай этот день разнообразнее'}. Сохрани меню для всех остальных дней без изменений. Затем обнови список рецептов и покупок в соответствии с изменениями этого дня.`;
        }

        const purchasedItems = (getState().shoppingList || [])
            .flatMap(c => c.items || [])
            .filter(item => (item.purchases || []).length > 0)
            .map(item => item.name)
            .join(', ');
        
        const newData = await generateComprehensiveData(sourceState, purchasedItems, extraPrompt);
        
        if (isPreview) {
            updateState({ temp: newData });
            ui.renderPreview();
            ui.showNotification("Предпросмотр обновлен!");
        } else {
            updateState(newData);
            saveState();
            ui.renderAll();
            ui.showNotification("Меню успешно обновлено!");
        }

    } catch(e) {
        ui.showNotification("Ошибка при обновлении.", 'error');
        console.error(e);
    }
}