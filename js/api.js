import { GoogleGenerativeAI } from "@google/generative-ai";
import { getState } from "./state.js";

// Per modern security guidelines, the API key must be handled via environment variables
// and should not be exposed or entered in the client-side application.
if (!process.env.API_KEY) {
    // This provides a clear error for the developer if the environment is not set up.
    console.error("API_KEY environment variable not set.");
    alert("Конфигурация приложения не завершена. API-ключ не найден.");
}

const genAI = new GoogleGenerativeAI({ apiKey: process.env.API_KEY });

const menuPlanSchema = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            day_of_week: { type: 'STRING' },
            meals: {
                type: 'ARRAY',
                items: {
                    type: 'OBJECT',
                    properties: {
                        meal_type: { type: 'STRING' },
                        name: { type: 'STRING' },
                    },
                    required: ["meal_type", "name"],
                },
            },
        },
        required: ["day_of_week", "meals"],
    },
};

const recipeSchema = {
    type: 'OBJECT',
    properties: {
        id: { type: 'STRING' },
        name: { type: 'STRING' },
        description: { type: 'STRING' },
        prep_time: { type: 'STRING' },
        cook_time: { type: 'STRING' },
        servings: { type: 'NUMBER' },
        calories_per_serving: { type: 'NUMBER' },
        ingredients: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    name: { type: 'STRING' },
                    quantity: { type: 'STRING' },
                    category: { type: 'STRING' },
                    estimated_price: { type: 'NUMBER' },
                },
                required: ["name", "quantity", "category", "estimated_price"],
            },
        },
        steps: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    step: { type: 'NUMBER' },
                    description: { type: 'STRING' },
                    timer_minutes: { type: 'NUMBER' },
                    image_prompt: { type: 'STRING' },
                },
                required: ["step", "description", "image_prompt"],
            },
        },
    },
    required: ["id", "name", "description", "prep_time", "cook_time", "servings", "calories_per_serving", "ingredients", "steps"],
};

async function apiCall(callName, prompt, schema, retries = 3, delay = 3000) {
    console.log(`🟡 REQUEST [${callName}]:`, prompt.substring(0, 100) + '...');
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        console.log(`✅ RESPONSE [${callName}] RECEIVED`);
        return response.text;
    } catch (error) {
        console.error(`🔴 API CALL ERROR [${callName}] on attempt ${4 - retries}:`, error);
        if (retries > 0) {
            console.log(`Retrying in ${delay / 1000}s... (${retries - 1} left)`);
            
            const progressStatus = document.getElementById('progress-status');
            if (progressStatus) {
                progressStatus.textContent = `⚠️ Ошибка сети. Пробую снова... (${retries - 1} попытки)`;
            }

            await new Promise(res => setTimeout(res, delay));
            return apiCall(callName, prompt, schema, retries - 1, delay);
        }
        
        console.error(`🔴 FINAL ERROR [${callName}]:`, error);
        let errorMessage = "Неизвестная ошибка API.";
        if (error.message.includes("API key not valid")) {
            errorMessage = "API ключ недействителен. Проверьте переменные окружения.";
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

export async function validateApiKey() {
    // This function now simply tests the connection using the environment variable key.
    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Test",
        });
        console.log('✅ API Connection OK');
        return !!response.text;
    } catch (error) {
        console.error("API connection test failed:", error);
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
        const result = await apiCall('generateMenuPlan', prompt, menuPlanSchema);
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
        const result = await apiCall(`generateSingleRecipe: ${recipeName}`, prompt, recipeSchema);
        console.log(`✅ RESPONSE [generateSingleRecipe: ${recipeName}] RECEIVED`);
        return JSON.parse(result);
    } catch (error) {
        console.error(`🔴 ERROR [generateSingleRecipe: ${recipeName}]:`, error);
        throw error; // Propagate the error
    }
}