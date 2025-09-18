import { GoogleGenerativeAI, Type } from "@google/generative-ai";
import { getState, updateState } from "./state.js";

let genAI;

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


function getGenAI() {
    if (!genAI) {
        const { settings } = getState();
        if (settings.apiKey) {
            try {
                genAI = new GoogleGenerativeAI(settings.apiKey);
            } catch (error) {
                 console.error("Failed to initialize GoogleGenerativeAI:", error);
                 throw new Error("Не удалось инициализировать ИИ. Проверьте правильность API ключа.");
            }
        } else {
            throw new Error("API ключ не установлен.");
        }
    }
    return genAI;
}

async function apiCall(callName, prompt, config = {}, retries = 3, delay = 3000) {
    console.log(`🟡 REQUEST [${callName}]:`, prompt.substring(0, 100) + '...');
    try {
        const ai = getGenAI();
        const model = ai.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: config.responseSchema,
            },
        });
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error(`🔴 API CALL ERROR [${callName}] on attempt ${4 - retries}:`, error);
        if (retries > 0) {
            console.log(`Retrying in ${delay / 1000}s... (${retries - 1} left)`);
            
            // Update UI with retry status
            const progressStatus = document.getElementById('progress-status');
            if (progressStatus) {
                progressStatus.textContent = `⚠️ Ошибка сети. Пробую снова... (${retries - 1} попытки)`;
            }

            await new Promise(res => setTimeout(res, delay));
            return apiCall(callName, prompt, config, retries - 1, delay);
        }
        
        console.error(`🔴 FINAL ERROR [${callName}]:`, error);
        let errorMessage = "Неизвестная ошибка API.";
        if (error.message.includes("API key not valid")) {
            errorMessage = "Ваш API ключ недействителен. Пожалуйста, проверьте его в настройках.";
        } else if (error.message.includes("429")) {
            errorMessage = "Слишком много запросов. Пожалуйста, подождите немного и попробуйте снова.";
        } else if (error.message.includes("503") || error.message.includes("overloaded")) {
            errorMessage = "Серверы Google перегружены. Пожалуйста, попробуйте снова через несколько минут.";
        } else if (error.message.includes("billing")) {
            errorMessage = "Проблема с вашим Google Cloud биллингом. Убедитесь, что он активен.";
        } else if (error.message.includes("permission denied")) {
            errorMessage = "Доступ запрещен. Убедитесь, что Gemini API доступен в вашем регионе.";
        }
        throw new Error(errorMessage);
    }
}

export async function validateApiKey(apiKey) {
    try {
        const testAI = new GoogleGenerativeAI(apiKey);
        const model = testAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        await model.generateContent("Test");
        console.log('✅ API KEY VALIDATED');
        return true;
    } catch (error) {
        console.error("API Key validation failed:", error);
        return false;
    }
}

export async function generateMenuPlan(settings) {
    const familyInfo = settings.family.map(p => `${p.name}, ${p.gender}, ${p.age} лет`).join('; ');
    const prompt = `Сгенерируй ТОЛЬКО план меню на ${settings.menuDuration} дней (с воскресенья по субботу) для семьи: ${familyInfo}.
- Предпочтения: ${settings.preferences}.
- Бюджет: примерно ${settings.totalBudget} рублей на весь период.
- Кухня: ${settings.cuisine}.
- Сложность: ${settings.difficulty}.
- План должен включать: Завтрак, Перекус 1, Обед, Перекус 2. Ужин генерировать не нужно.
- В некоторые дни на Обед или Перекус можно использовать "Остатки" от предыдущих блюд для экономии.
- Не используй markdown. Ответ должен быть строго в формате JSON, соответствующем предоставленной схеме.`;

    try {
        const result = await apiCall('generateMenuPlan', prompt, { responseSchema: menuPlanSchema });
        console.log('✅ RESPONSE [generateMenuPlan] RECEIVED');
        return JSON.parse(result);
    } catch (error) {
        console.error('🔴 ERROR [generateMenuPlan]:', error);
        throw error; // Propagate the error
    }
}

export async function generateSingleRecipe(recipeName, settings, existingRecipeIds) {
    const familyInfo = settings.family.map(p => `${p.name}, ${p.gender}, ${p.age} лет`).join('; ');
    const prompt = `Сгенерируй детальный рецепт для блюда: "${recipeName}".
- Рецепт должен иметь уникальный 'id' (например, 'borsch-s-govyadinoy'), который еще не использовался в этом списке: ${existingRecipeIds.join(', ')}.
- Рассчитай ингредиенты на семью: ${familyInfo}.
- Учитывай общие предпочтения: ${settings.preferences}.
- Блюдо должно соответствовать сложности: ${settings.difficulty}.
- Каждый ингредиент должен иметь примерную цену в рублях ('estimated_price').
- Каждый шаг должен содержать 'image_prompt' - краткое, яркое описание на английском языке для генерации изображения (например, 'a pot of boiling borscht with beef and vegetables').
- Если для шага требуется таймер, укажи 'timer_minutes'.
- Не используй markdown. Ответ должен быть строго в формате JSON, соответствующем предоставленной схеме.`;
    
    try {
        const result = await apiCall(`generateSingleRecipe: ${recipeName}`, prompt, { responseSchema: recipeSchema });
        console.log(`✅ RESPONSE [generateSingleRecipe: ${recipeName}] RECEIVED`);
        return JSON.parse(result);
    } catch (error) {
        console.error(`🔴 ERROR [generateSingleRecipe: ${recipeName}]:`, error);
        throw error; // Propagate the error
    }
}