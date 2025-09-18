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

async function makeGeminiRequest(apiKey, prompt, jsonSchema, stepName) {
    console.log(`🟡 REQUEST [${stepName}]: ${prompt.substring(0, 100)}...`);
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
            console.log(`✅ RESPONSE [${stepName}] RECEIVED`);
            return data;
        } catch (error) {
            retries--;
            console.error(`🔴 ERROR [${stepName}]: ${error}. Retrying... (${retries} left)`);
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

    const TOTAL_STEPS = 6; // 1: validate, 2: plan menu, 3: get recipes, 4: get shopping list, 5-6: finalize
    await updateProgressCallback(1, TOTAL_STEPS, "Подключение к ИИ", "Проверка API ключа...");

    try {
        await getAI(apiKey).models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
        console.log('✅ API KEY VALIDATED');
    } catch (e) {
        if (e.message.includes('API key not valid')) {
            throw new Error('API key not valid');
        }
        throw new Error('Network error while validating API key.');
    }

    try {
        // Step 1: Generate Menu Plan
        await updateProgressCallback(2, TOTAL_STEPS, "Планирование", "🧠 Составляю план меню на неделю...");
        const menu = await generateMenuPlan(state, purchasedItems, extraPrompt);
        if (!menu || menu.length === 0) throw new Error("Failed to generate menu plan.");

        // Step 2: Generate Recipes for the Menu
        await updateProgressCallback(3, TOTAL_STEPS, "✅ План меню составлен", "📖 Создаю рецепты для ваших блюд...");
        const recipes = await generateRecipesForMenu(state, menu);
        if (!recipes) throw new Error("Failed to generate recipes.");
        
        // Step 3: Generate Shopping List from Recipes
        await updateProgressCallback(4, TOTAL_STEPS, "✅ Рецепты готовы", "🛒 Формирую список покупок...");
        const shoppingList = await generateShoppingListFromRecipes(state, recipes);
        if (!shoppingList) throw new Error("Failed to generate shopping list.");

        await updateProgressCallback(5, TOTAL_STEPS, "✅ Список покупок готов", "✨ Объединяю все данные...");

        const comprehensiveData = {
            menu,
            recipes,
            shoppingList
        };

        await updateProgressCallback(TOTAL_STEPS, TOTAL_STEPS, "Готово!", "Ваше меню успешно создано.");
        return comprehensiveData;

    } catch (error) {
        console.error("Error in multi-step generation:", error);
        throw error;
    }
}


function getFamilyDescription(family) {
    return family.map(p => {
        let description = `${p.name}, ${p.gender === 'male' ? 'Мужчина' : 'Женщина'}, ${p.age} лет. Активность: ${p.activity}.`;
        if (p.weight) description += ` Вес: ${p.weight} кг.`;
        if (p.height) description += ` Рост: ${p.height} см.`;
        return description;
    }).join('; ');
}


async function generateMenuPlan(state, purchasedItems, extraPrompt) {
    const { family, menuDuration, preferences, cuisine, difficulty } = state.settings;
    const familyDescription = getFamilyDescription(family);

    let promptText = `Сгенерируй ТОЛЬКО план меню на ${menuDuration} дней (с воскресенья по субботу) для семьи: ${familyDescription}.
- Общие предпочтения: ${preferences}.
- Кухня: ${cuisine}. Сложность: ${difficulty}.
- Каждый день: Завтрак, Перекус, Обед, Полдник, Ужин.
- Иногда используй остатки от ужина на обед следующего дня (помечай их как "Название блюда (остатки)").
- Не создавай рецепты или список покупок, только структуру меню с названиями блюд.
`;
    if (purchasedItems) {
        promptText += `\n- ВАЖНО: Приоритетно используй уже купленные продукты: ${purchasedItems}.`;
    }
    if (extraPrompt) {
        promptText += `\n- ОСОБОЕ УКАЗАНИЕ: ${extraPrompt}`;
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            menu: {
                type: Type.ARRAY,
                description: "Меню на неделю.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING },
                        meals: {
                            type: Type.OBJECT,
                            properties: {
                                breakfast: { type: Type.STRING },
                                snack1: { type: Type.STRING },
                                lunch: { type: Type.STRING },
                                snack2: { type: Type.STRING },
                                dinner: { type: Type.STRING }
                            },
                            required: ["breakfast", "snack1", "lunch", "snack2", "dinner"]
                        }
                    },
                    required: ["day", "meals"]
                }
            }
        },
        required: ["menu"]
    };

    const result = await makeGeminiRequest(state.settings.apiKey, promptText, schema, "generateMenuPlan");
    return result.menu;
}


async function generateRecipesForMenu(state, menu) {
    const { family } = state.settings;
    
    // Extract unique meal names, excluding leftovers
    const uniqueMeals = new Set();
    menu.forEach(day => {
        Object.values(day.meals).forEach(mealName => {
            if (mealName && !mealName.includes('(остатки)')) {
                uniqueMeals.add(mealName);
            }
        });
    });

    const promptText = `Сгенерируй детальные рецепты для КАЖДОГО блюда из этого списка: ${[...uniqueMeals].join(', ')}.
- Каждый рецепт должен иметь уникальный 'id' (например, 'borsch-s-govyadinoy').
- Название 'name' должно ТОЧНО соответствовать названию из списка.
- Рассчитай ингредиенты на семью из ${family.length} человек.
- Предоставь пошаговые инструкции 'steps'. В каждом шаге укажи используемые ингредиенты и их количество.
`;
    const ingredientsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING, description: "Количество и единица измерения, например '200 г' или '1 шт'" } }, required: ["name", "quantity"] } };
    const schema = {
        type: Type.OBJECT,
        properties: {
            recipes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        name: { type: Type.STRING },
                        ingredients: ingredientsSchema,
                        steps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, time: { type: Type.NUMBER, description: "Время в минутах. 0 если таймер не нужен." }, ingredients: ingredientsSchema }, required: ["description", "time", "ingredients"] } }
                    },
                    required: ["id", "name", "ingredients", "steps"]
                }
            }
        },
        required: ["recipes"]
    };

    const result = await makeGeminiRequest(state.settings.apiKey, promptText, schema, "generateRecipesForMenu");
    const recipesMap = {};
    if (result.recipes) {
        result.recipes.forEach(recipe => {
            recipesMap[recipe.id] = recipe;
        });
    }
    return recipesMap;
}


async function generateShoppingListFromRecipes(state, recipes) {
    const { totalBudget } = state.settings;
    
    const allIngredients = Object.values(recipes).flatMap(recipe =>
        recipe.ingredients.map(ing => `${ing.name} (${ing.quantity})`)
    ).join(', ');

    const promptText = `На основе этих ингредиентов: ${allIngredients}, создай сводный список покупок.
- Сгруппируй продукты по категориям: "Мясо и птица", "Молочные и яйца", "Овощи и зелень", "Фрукты и орехи", "Бакалея", "Хлеб и выпечка", "Напитки", "Прочее".
- Для каждого продукта суммируй общее количество ('totalNeeded').
- Предложи разумное количество для покупки в магазине ('shoppingSuggestion'), округляя в большую сторону до стандартной упаковки.
- Укажи ПРИМЕРНУЮ цену 'price' в рублях для 'shoppingSuggestion'.
- Общая стоимость всех продуктов не должна превышать бюджет ${totalBudget} рублей.
`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            shoppingList: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        items: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    totalNeeded: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } },
                                    shoppingSuggestion: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } },
                                    price: { type: Type.NUMBER }
                                },
                                required: ["name", "totalNeeded", "shoppingSuggestion", "price"]
                            }
                        }
                    },
                    required: ["category", "items"]
                }
            }
        },
        required: ["shoppingList"]
    };

    const result = await makeGeminiRequest(state.settings.apiKey, promptText, schema, "generateShoppingListFromRecipes");
    
    // Initialize empty arrays for tracking user actions
    if (result.shoppingList) {
        result.shoppingList.forEach(category => {
            (category.items || []).forEach(item => {
                item.purchases = [];
                item.consumedQty = 0;
            });
        });
    }
    
    return result.shoppingList;
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

// NOTE: handleRegeneration would also benefit from a multi-step approach,
// but for now, we'll keep it as a single (but more focused) comprehensive call.
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
        if (type === 'validate') {
            await getAI(data.apiKey).models.generateContent({model:'gemini-2.5-flash', contents: 'test'});
            return; // Just for validation
        }

        const familyDescription = getFamilyDescription(sourceState.settings.family);
        const { preferences, cuisine, difficulty, totalBudget } = sourceState.settings;

        let promptText = `Пожалуйста, выступи в роли ИИ-диетолога.
Семья: ${familyDescription}.
Предпочтения: ${preferences}, ${cuisine}, ${difficulty}.
Бюджет: ${totalBudget} руб.

ЗАДАЧА: Основываясь на существующем меню, внеси следующие изменения и верни ПОЛНЫЙ обновленный JSON-объект (с ключами "menu", "recipes", "shoppingList").

Существующее меню: ${JSON.stringify(sourceState.menu.map(d => d.meals))}.
`;

        if (type === 'meal') {
            const { dayName, mealKey } = data;
            const mealName = sourceState.menu.find(d => d.day === dayName)?.meals[key];
            promptText += `ИЗМЕНЕНИЕ: В дне "${dayName}" замени блюдо "${mealKey}" ("${mealName}") на что-то другое. Пожелание: ${customPrompt || 'сделай что-нибудь другое'}. Сохрани все остальные блюда в меню без изменений. Затем обнови список рецептов и покупок в соответствии с этим одним изменением.`;
        } else { // type === 'day'
            const { dayName } = data;
             promptText += `ИЗМЕНЕНИЕ: Полностью обнови меню для дня "${dayName}". Пожелание: ${customPrompt || 'сделай этот день разнообразнее'}. Сохрани меню для всех остальных дней без изменений. Затем обнови список рецептов и покупок в соответствии с изменениями этого дня.`;
        }
         const ingredientsSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.STRING } } } };
         const schema = {
            type: Type.OBJECT,
            properties: {
                menu: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, meals: { type: Type.OBJECT, properties: { breakfast: { type: Type.STRING }, snack1: { type: Type.STRING }, lunch: { type: Type.STRING }, snack2: { type: Type.STRING }, dinner: { type: Type.STRING } } } } } },
                recipes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, ingredients: ingredientsSchema, steps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, time: { type: Type.NUMBER }, ingredients: ingredientsSchema } } } } } },
                shoppingList: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, items: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, totalNeeded: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } }, shoppingSuggestion: { type: Type.OBJECT, properties: { qty: { type: Type.NUMBER }, unit: { type: Type.STRING } } }, price: { type: Type.NUMBER } } } } } } }
            },
            required: ["menu", "recipes", "shoppingList"]
        };
        
        const fullData = await makeGeminiRequest(apiKey, promptText, schema, "handleRegeneration");
        
        // Post-process the response
        const recipesMap = {};
        if (fullData.recipes) {
            fullData.recipes.forEach(recipe => { recipesMap[recipe.id] = recipe; });
        }
        if (fullData.shoppingList) {
            fullData.shoppingList.forEach(category => {
                (category.items || []).forEach(item => {
                    item.purchases = []; item.consumedQty = 0;
                });
            });
        }
        const newData = { menu: fullData.menu, recipes: recipesMap, shoppingList: fullData.shoppingList };


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