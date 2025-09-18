import { GoogleGenAI, Type } from "@google/genai";
import { getState, updateState } from "./state.js";

// Check if an error is related to the API key itself, warranting a switch to the next key.
const isApiKeyError = (error) => {
    const message = error.message.toLowerCase();
    return message.includes("api key not valid") ||
           message.includes("permission denied") ||
           message.includes("api key is invalid") ||
           message.includes("billing"); 
};

/**
 * Makes a call to the Gemini API, handling multiple API keys and failover.
 * @param {string} callName - The name of the API call for logging.
 * @param {string} prompt - The prompt to send to the model.
 * @param {object} schema - The expected JSON schema for the response.
 * @param {number} retriesPerKey - Number of retries for transient errors (like network issues) per key.
 * @param {number} delay - Delay between retries in milliseconds.
 * @returns {Promise<string>} The JSON response from the API as a string.
 */
async function apiCall(callName, prompt, schema, retriesPerKey = 2, delay = 3000) {
    console.log(`🟡 REQUEST [${callName}]:`, prompt.substring(0, 100) + '...');
    const { apiKeys } = getState();
    const enabledKeys = apiKeys.filter(k => k.enabled);

    if (enabledKeys.length === 0) {
        throw new Error("Нет доступных API ключей. Пожалуйста, добавьте рабочий ключ в настройках.");
    }

    for (let i = 0; i < enabledKeys.length; i++) {
        const currentKey = enabledKeys[i];
        console.log(`Trying API key #${i + 1}...`);
        
        const ai = new GoogleGenAI({ apiKey: currentKey.key });
        
        for (let attempt = 1; attempt <= retriesPerKey; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schema,
                    }
                });
                
                console.log(`✅ SUCCESS with key #${i + 1} on attempt ${attempt}.`);
                return response.text;

            } catch (error) {
                console.error(`🔴 API CALL ERROR [${callName}] with key #${i + 1} (attempt ${attempt}):`, error);
                
                if (isApiKeyError(error)) {
                    console.warn(`Key #${i + 1} seems invalid. Disabling and trying next.`);
                    const allKeys = getState().apiKeys;
                    const keyIndex = allKeys.findIndex(k => k.key === currentKey.key);
                    if (keyIndex > -1) {
                        allKeys[keyIndex].enabled = false;
                        await updateState({ apiKeys: allKeys }, true); // Immediate update to disable key
                    }
                    break; // Stop retrying this key and move to the next.
                }

                if (attempt < retriesPerKey) {
                    const progressStatus = document.getElementById('progress-status');
                    if (progressStatus) {
                        progressStatus.textContent = `⚠️ Ошибка сети. Пробую снова... (${retriesPerKey - attempt} попытки)`;
                    }
                    console.log(`Retrying in ${delay / 1000}s...`);
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }
    }
    
    throw new Error("Все API ключи недействительны или не смогли получить ответ. Проверьте ключи и ваше соединение.");
}


const menuPlanSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            day_of_week: { type: Type.STRING },
            meals: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        meal_type: { type: Type.STRING },
                        name: { type: Type.STRING },
                    },
                    required: ["meal_type", "name"],
                },
            },
        },
        required: ["day_of_week", "meals"],
    },
};

const recipeSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        prep_time: { type: Type.STRING },
        cook_time: { type: Type.STRING },
        servings: { type: Type.NUMBER },
        calories_per_serving: { type: Type.NUMBER },
        ingredients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.STRING },
                    category: { type: Type.STRING },
                    estimated_price: { type: Type.NUMBER },
                },
                required: ["name", "quantity", "category", "estimated_price"],
            },
        },
        steps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    step: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    timer_minutes: { type: Type.NUMBER },
                    image_prompt: { type: Type.STRING },
                },
                required: ["step", "description", "image_prompt"],
            },
        },
    },
    required: ["id", "name", "description", "prep_time", "cook_time", "servings", "calories_per_serving", "ingredients", "steps"],
};


const activityLevels = {
    low: "Низкая",
    medium: "Средняя",
    high: "Высокая",
    very_high: "Очень высокая"
};

function formatFamilyInfo(family) {
    if (!family || family.length === 0) return 'семьи нет';
    return family.map(p => {
        let details = [
            p.name,
            p.gender,
            `${p.age} лет`
        ];
        if (p.height) details.push(`${p.height} см`);
        if (p.weight) details.push(`${p.weight} кг`);
        if (p.activityLevel) details.push(`активность: ${activityLevels[p.activityLevel] || p.activityLevel}`);
        return `(${details.join(', ')})`;
    }).join('; ');
}


export async function generateMenuPlan(settings) {
    const familyInfo = formatFamilyInfo(settings.family);
    const prompt = `Сгенерируй ТОЛЬКО план меню на ${settings.menuDuration} дней (с воскресенья по субботу) для семьи: ${familyInfo}.
- Используй данные о росте, весе и активности, если они предоставлены, для точного расчета калорийности и размера порций, учитывая индивидуальные потребности каждого.
- Предпочтения: ${settings.preferences}.
- Бюджет: примерно ${settings.totalBudget} рублей на весь период.
- Кухня: ${settings.cuisine}.
- Сложность: ${settings.difficulty}.
- План должен включать: Завтрак, Перекус 1, Обед, Перекус 2. Ужин генерировать не нужно.
- В некоторые дни на Обед или Перекус можно использовать "Остатки" от предыдущих блюд для экономии.
- Не используй markdown. Ответ должен быть строго в формате JSON, соответствующем предоставленной схеме.`;

    try {
        const result = await apiCall('generateMenuPlan', prompt, menuPlanSchema);
        console.log('✅ RESPONSE [generateMenuPlan] RECEIVED');
        return JSON.parse(result);
    } catch (error) {
        console.error('🔴 ERROR [generateMenuPlan]:', error);
        throw error;
    }
}

export async function generateSingleRecipe(recipeName, settings, existingRecipeIds) {
    const familyInfo = formatFamilyInfo(settings.family);
    const prompt = `Сгенерируй детальный рецепт для блюда: "${recipeName}".
- Рецепт должен иметь уникальный 'id' (например, 'borsch-s-govyadinoy'), который еще не использовался в этом списке: ${existingRecipeIds.join(', ')}.
- Рассчитай ингредиенты и калорийность на семью: ${familyInfo}. Используй их детальные данные, если они есть, для максимальной точности.
- Учитывай общие предпочтения: ${settings.preferences}.
- Блюдо должно соответствовать сложности: ${settings.difficulty}.
- Каждый ингредиент должен иметь примерную цену в рублях ('estimated_price').
- Каждый шаг должен содержать 'image_prompt' - краткое, яркое описание на английском языке для генерации изображения (например, 'a pot of boiling borscht with beef and vegetables').
- Если для шага требуется таймер, укажи 'timer_minutes'.
- Не используй markdown. Ответ должен быть строго в формате JSON, соответствующем предоставленной схеме.`;
    
    try {
        const result = await apiCall(`generateSingleRecipe: ${recipeName}`, prompt, recipeSchema);
        console.log(`✅ RESPONSE [generateSingleRecipe: ${recipeName}] RECEIVED`);
        return JSON.parse(result);
    } catch (error) {
        console.error(`🔴 ERROR [generateSingleRecipe: ${recipeName}]:`, error);
        throw error;
    }
}