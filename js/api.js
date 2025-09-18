
import { GoogleGenAI, Type } from "https://esm.run/@google/genai";

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

export async function getJobPlatforms(apiKey, mode = 'fetch') {
    if (mode === 'validate') {
        const genAI = getAI(apiKey);
        await genAI.models.generateContent({ model: 'gemini-2.5-flash', contents: 'test' });
        return true;
    }
    
    const prompt = "Назови 5-7 самых популярных в мире и в СНГ сайтов и платформ для поиска работы в сфере IT. Верни только JSON массив строк.";
    const schema = {
        type: Type.OBJECT,
        properties: {
            platforms: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["platforms"]
    };

    const result = await makeGeminiRequest(apiKey, prompt, schema, "getJobPlatforms");
    return result.platforms;
}


export async function findJobs(state, updateProgressCallback) {
    const { apiKey, profile, connectedPlatforms } = state.settings;
    if (!apiKey) throw new Error("API key is not configured.");
    if (!profile || !profile.desiredRole) throw new Error("User profile is not complete.");

    await updateProgressCallback(10, "Анализ профиля", "Составляю ваш профессиональный портрет...");
    
    const profileDescription = `
        - Желаемая должность: ${profile.desiredRole}
        - Опыт работы: ${profile.experience} лет
        - Ключевые навыки: ${profile.keySkills}
        - Ожидания по зарплате: ${profile.salaryExpectation || 'не указано'}
        - Предпочтения по локации: ${profile.location || 'не указано'}
        - Краткое саммари и цели: ${profile.summary}
    `;

    await updateProgressCallback(30, "Подключение к платформам", `Имитирую поиск на ${connectedPlatforms.join(', ')}...`);

    const prompt = `
        Выступи в роли AI-рекрутера. Проанализируй следующий профиль кандидата:
        ${profileDescription}

        Твоя задача: Сгенерировать список из 8-10 РЕАЛИСТИЧНО ВЫГЛЯДЯЩИХ, но ВЫМЫШЛЕННЫХ вакансий, которые идеально подходят этому кандидату. Вакансии должны быть разнообразными по типу компаний и задачам.

        Для каждой вакансии предоставь:
        - Уникальный ID.
        - Название должности.
        - Название вымышленной компании.
        - Локацию (может быть город или "Удаленно").
        - Зарплатную вилку (например, "250 000 - 300 000 руб.").
        - Краткое, но емкое описание вакансии (2-3 предложения).
        - Список из 3-4 ключевых требований.
        - Оценку соответствия (matchScore) от 75 до 99.
        - Краткое обоснование оценки (matchReasoning), почему эта вакансия подходит кандидату.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            jobs: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        location: { type: Type.STRING },
                        salary: { type: Type.STRING },
                        description: { type: Type.STRING },
                        requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        matchScore: { type: Type.NUMBER },
                        matchReasoning: { type: Type.STRING }
                    },
                    required: ["id", "title", "company", "location", "salary", "description", "requirements", "matchScore", "matchReasoning"]
                }
            }
        },
        required: ["jobs"]
    };

    await updateProgressCallback(60, "Подбор вакансий", "Использую нейросеть для поиска лучших предложений...");
    
    const result = await makeGeminiRequest(apiKey, prompt, schema, "findJobs");
    
    await updateProgressCallback(100, "Готово!", "Наиболее подходящие вакансии найдены.");

    return result.jobs;
}
