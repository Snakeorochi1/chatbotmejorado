

import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { UserProfile, Gender, PersonalGoal, DailyIntake, NutrientTargets, EstimatedFoodIntake, SportsDiscipline, AthleticGoalOptions, DietaryApproachOptions, DietaryRestrictionOptions, SleepQualityOptions } from '../types';
import { GEMINI_MODEL_NAME, NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE } from '../constants';

// AI Studio is expected to provide process.env.API_KEY.
if (!process.env.API_KEY || process.env.API_KEY.includes("MISSING") || process.env.API_KEY.includes("FALLBACK") ||process.env.API_KEY.length < 30 ) {
  console.warn(
    "Gemini API key from process.env.API_KEY appears to be missing, a placeholder, or too short at module initialization. " +
    "Ensure it's correctly set in the AI Studio environment if you are not using a proxy. " +
    "Current value (first 10 chars): " + (process.env.API_KEY ? process.env.API_KEY.substring(0,10) : "undefined")
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GeminiServiceResponse {
  text: string;
  estimatedIntake?: EstimatedFoodIntake;
}

const parseEstimatedFoodIntake = (responseText: string): EstimatedFoodIntake | undefined => {
  const regex = /<nk_food_estimation_json>(.*?)<\/nk_food_estimation_json>/s;
  const match = responseText.match(regex);
  if (match && match[1]) {
    try {
      const jsonData = JSON.parse(match[1]);
      if (jsonData && typeof jsonData.foodDescription === 'string' &&
          typeof jsonData.calories === 'number' &&
          typeof jsonData.protein === 'number' &&
          typeof jsonData.carbs === 'number' &&
          typeof jsonData.fats === 'number') {
        return jsonData as EstimatedFoodIntake;
      }
    } catch (e) {
      console.error("Error parsing food estimation JSON from AI response:", e, "JSON content:", match[1]);
    }
  }
  return undefined;
};

const cleanResponseText = (responseText: string): string => {
  return responseText.replace(/<nk_food_estimation_json>(.*?)<\/nk_food_estimation_json>/s, '').trim();
};


export const generateNutriKickResponse = async (
  userInput: string | null,
  userProfile: UserProfile,
  audioInput?: { base64Data: string; mimeType: string },
  imageInput?: { base64Data: string; mimeType: string },
  dailyIntake?: DailyIntake, 
  nutrientTargets?: NutrientTargets, 
  bmr?: number | null, 
  tdee?: number | null,
  isGuest?: boolean
): Promise<GeminiServiceResponse> => {

  let userDataContext = "El usuario no ha proporcionado todos los datos de perfil específicos o acaba de empezar.\n";
  
  if (isGuest) {
    userDataContext = "User is a guest. No profile data available.\n";
  } else {
    const relevantProfileData: Partial<UserProfile> = { ...userProfile };
    const profileKeys = Object.keys(relevantProfileData) as Array<keyof UserProfile>;
    const hasSomeProfileData = profileKeys.some(key => {
      const value = relevantProfileData[key];
      if (typeof value === 'boolean') return true; 
      if (Array.isArray(value)) return value.length > 0; 
      return value && value.toString().trim() !== '';
    });

    if (hasSomeProfileData) {
      userDataContext = "Datos del Usuario (utiliza esta información para personalizar tu respuesta si es relevante):\n";
      if (userProfile.name) userDataContext += `* Nombre: ${userProfile.name}\n`;
      if (userProfile.age) userDataContext += `* Edad: ${userProfile.age} años\n`;
      if (userProfile.weight) userDataContext += `* Peso: ${userProfile.weight} kg\n`;
      if (userProfile.height) userDataContext += `* Altura: ${userProfile.height} cm\n`;
      if (userProfile.gender && (userProfile.gender === Gender.Male || userProfile.gender === Gender.Female)) {
           userDataContext += `* Género: ${userProfile.gender}\n`;
      }
      userDataContext += `* ¿Es atleta?: ${userProfile.isAthlete ? 'Sí' : 'No'}\n`;
      
      if (userProfile.isAthlete) {
        if (userProfile.sportsDiscipline) {
          userDataContext += `* Disciplina Deportiva: ${userProfile.sportsDiscipline}\n`;
        }
        if (userProfile.position) userDataContext += `* Posición/Rol: ${userProfile.position}\n`;
        if (userProfile.trainingLoad) userDataContext += `* Carga de Entrenamiento: ${userProfile.trainingLoad}\n`;
        if (userProfile.athleticGoals && userProfile.athleticGoals.length > 0) {
          userDataContext += `* Objetivos Atléticos Específicos: ${userProfile.athleticGoals.join(', ')}\n`;
        }
      } else {
        if (userProfile.trainingFrequency) userDataContext += `* Frecuencia de entrenamiento general: ${userProfile.trainingFrequency}\n`;
      }
      if (userProfile.goals) userDataContext += `* Objetivo Principal (General): ${userProfile.goals}\n`;

      if (userProfile.dietaryApproaches && userProfile.dietaryApproaches.length > 0) {
        userDataContext += `* Preferencias Alimentarias/Enfoques Dietéticos: ${userProfile.dietaryApproaches.join(', ')}\n`;
      }
      if (userProfile.dietaryRestrictions && userProfile.dietaryRestrictions.length > 0) {
        userDataContext += `* Restricciones Alimentarias/Alergias: ${userProfile.dietaryRestrictions.join(', ')}\n`;
      }
      if (userProfile.currentSupplementUsage) {
        userDataContext += `* Consume Suplementos: ${userProfile.currentSupplementUsage}\n`;
      }
      if (userProfile.supplementInterestOrUsageDetails) {
        userDataContext += `* Detalles de Suplementos: ${userProfile.supplementInterestOrUsageDetails}\n`;
      }
      if (userProfile.wellnessFocusAreas && userProfile.wellnessFocusAreas.length > 0) {
        userDataContext += `* Áreas de Enfoque en Bienestar: ${userProfile.wellnessFocusAreas.join(', ')}\n`;
      }
      // Daily Check-in Data
      if (userProfile.moodToday) userDataContext += `* Ánimo Hoy: ${userProfile.moodToday}\n`;
      if (userProfile.trainedToday) userDataContext += `* Entrenamiento Hoy: ${userProfile.trainedToday}\n`;
      if (userProfile.hadBreakfast) userDataContext += `* Desayuno Hoy: ${userProfile.hadBreakfast}\n`;
      if (userProfile.energyLevel) userDataContext += `* Nivel de Energía Hoy: ${userProfile.energyLevel}\n`;
      if (userProfile.sleepHours) userDataContext += `* Horas de Sueño: ${userProfile.sleepHours}\n`;
      if (userProfile.sleepQuality) userDataContext += `* Calidad del Sueño: ${userProfile.sleepQuality}\n`;
      if (userProfile.lastCheckInTimestamp) {
          const date = new Date(userProfile.lastCheckInTimestamp);
          userDataContext += `* Último Check-in (Perfil): ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n (Timestamp: ${userProfile.lastCheckInTimestamp})\n`;
      } else {
          userDataContext += `* Último Check-in (Perfil): No registrado\n`;
      }
    }
  }


  let finalSystemInstruction = NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE;
  if (!isGuest && userProfile.age && parseInt(userProfile.age) < 18) {
    finalSystemInstruction = `
¡ATENCIÓN ESPECIAL! El usuario es MENOR DE 18 AÑOS (${userProfile.age} años).
Tus interacciones deben ser EXTREMADAMENTE CAUTELOSAS y BREVES.
NO ofrezcas consejos nutricionales detallados, planes de comida, estrategias de suplementación, ni nada que pueda interpretarse como una guía prescriptiva.
Tu objetivo principal es reforzar la necesidad de que consulte a un MÉDICO o NUTRICIONISTA DEPORTIVO acompañado de sus PADRES o TUTORES.
Si el usuario insiste en pedir consejos específicos, reitera esta recomendación profesional de forma amable pero firme y evita profundizar. NO intentes calcular o interpretar MB o RCTE para menores. La aplicación ya le habrá dado un mensaje de advertencia general sobre esto. Tu rol es reforzar la seguridad y la guía profesional.
------------------------------------
` + NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE;
  }
  
  let imageAnalysisInstruction = "";
  if (imageInput) {
    if (isGuest) {
      imageAnalysisInstruction = `
El usuario es un INVITADO y ha proporcionado una imagen. NO intentes estimar nutrientes de la imagen. 
En lugar de eso, informa al usuario que el análisis de imágenes de comida es una función para usuarios registrados y anímale a crear una cuenta gratuita para acceder a ella. 
Puedes describir brevemente lo que ves en la imagen si lo deseas, pero el enfoque principal debe ser guiarlo hacia el registro para la funcionalidad completa.
`;
    } else {
      imageAnalysisInstruction = `
El usuario (registrado) ha proporcionado una imagen. Por favor, analízala.
- Si parece un plato de comida, puedes intentar estimar sus componentes para el registro de alimentos como se describe en la sección "Food Logging".
- Si parece una etiqueta de producto, intenta extraer la información nutricional visible.
- Si no estás seguro de qué es la imagen, descríbela y pregunta al usuario para qué la envió.
`;
    }
  }
  
  let athleteContextForPrompt = "";
  if (!isGuest && userProfile.isAthlete) {
    athleteContextForPrompt = `y que practicas ${userProfile.sportsDiscipline || 'un deporte no especificado'} `;
    if (userProfile.position) {
      athleteContextForPrompt += `como ${userProfile.position} `;
    }
    if (userProfile.athleticGoals && userProfile.athleticGoals.length > 0) {
      athleteContextForPrompt += `con el/los objetivo(s) de: ${userProfile.athleticGoals.join(', ')}`;
    }
    athleteContextForPrompt = athleteContextForPrompt.trim();
  }

  const systemInstructionText = finalSystemInstruction
    .replace(/\[USER_NAME_PLACEHOLDER\]/g, isGuest ? "invitado/a" : (userProfile.name || "usuario"))
    .replace('[USER_DATA_CONTEXT]', userDataContext)
    .replace('[USER_GOAL_PLACEHOLDER]', isGuest ? 'general' : (userProfile.goals || 'no especificado'))
    .replace('[USER_BMR_PLACEHOLDER]', isGuest ? 'N/A (disponible para usuarios registrados)' : (bmr ? bmr.toFixed(0) : 'N/A'))
    .replace('[USER_TDEE_PLACEHOLDER]', isGuest ? 'N/A (disponible para usuarios registrados)' : (tdee ? tdee.toFixed(0) : 'N/A'))
    .replace('[TARGET_CALORIES_PLACEHOLDER]', isGuest ? 'N/A' : (nutrientTargets?.calories?.toFixed(0) || 'N/A'))
    .replace('[TARGET_PROTEIN_PLACEHOLDER]', isGuest ? 'N/A' : (nutrientTargets?.protein?.toFixed(0) || 'N/A'))
    .replace('[TARGET_CARBS_PLACEHOLDER]', isGuest ? 'N/A' : (nutrientTargets?.carbs?.toFixed(0) || 'N/A'))
    .replace('[TARGET_FATS_PLACEHOLDER]', isGuest ? 'N/A' : (nutrientTargets?.fats?.toFixed(0) || 'N/A'))
    .replace('[CONSUMED_CALORIES_PLACEHOLDER]', isGuest ? 'N/A' : (dailyIntake?.caloriesConsumed?.toFixed(0) || '0'))
    .replace('[CONSUMED_PROTEIN_PLACEHOLDER]', isGuest ? 'N/A' : (dailyIntake?.proteinConsumed?.toFixed(0) || '0'))
    .replace('[CONSUMED_CARBS_PLACEHOLDER]', isGuest ? 'N/A' : (dailyIntake?.carbsConsumed?.toFixed(0) || '0'))
    .replace('[CONSUMED_FATS_PLACEHOLDER]', isGuest ? 'N/A' : (dailyIntake?.fatsConsumed?.toFixed(0) || '0'))
    .replace(/\[USER_DIETARY_APPROACHES_PLACEHOLDER\]/g, isGuest ? 'ninguno' : ((userProfile.dietaryApproaches || []).join(', ') || 'ninguno especificado'))
    .replace(/\[USER_DIETARY_RESTRICTIONS_PLACEHOLDER\]/g, isGuest ? 'ninguna' : ((userProfile.dietaryRestrictions || []).join(', ') || 'ninguna especificada'))
    .replace(/\[USER_SUPPLEMENT_USAGE_PLACEHOLDER\]/g, isGuest ? 'no especificado' : (userProfile.currentSupplementUsage || 'no especificado'))
    .replace(/\[USER_SUPPLEMENT_DETAILS_PLACEHOLDER\]/g, isGuest ? 'ninguno' : (userProfile.supplementInterestOrUsageDetails || 'ninguno'))
    .replace(/\[USER_WELLNESS_FOCUS_PLACEHOLDER\]/g, isGuest ? 'ninguna' : ((userProfile.wellnessFocusAreas || []).join(', ') || 'ninguna especificada'))
    .replace(/\[USER_MOOD_TODAY_PLACEHOLDER\]/g, isGuest ? 'no especificado': (userProfile.moodToday || 'no especificado'))
    .replace(/\[USER_TRAINED_TODAY_PLACEHOLDER\]/g, isGuest ? 'no especificado': (userProfile.trainedToday || 'no especificado'))
    .replace(/\[USER_HAD_BREAKFAST_PLACEHOLDER\]/g, isGuest ? 'no especificado': (userProfile.hadBreakfast || 'no especificado'))
    .replace(/\[USER_ENERGY_LEVEL_PLACEHOLDER\]/g, isGuest ? 'no especificado': (userProfile.energyLevel || 'no especificado'))
    .replace(/\[USER_SLEEP_HOURS_PLACEHOLDER\]/g, isGuest ? 'no especificado': (userProfile.sleepHours || 'no especificado'))
    .replace(/\[USER_SLEEP_QUALITY_PLACEHOLDER\]/g, isGuest ? 'no especificada': (userProfile.sleepQuality || 'no especificada'))
    .replace(/\[USER_LAST_CHECK_IN_TIMESTAMP_PLACEHOLDER\]/g, isGuest ? 'nunca': (userProfile.lastCheckInTimestamp?.toString() || 'nunca'))
    .replace(/\[USER_SPORTS_DISCIPLINE_PLACEHOLDER\]/g, isGuest ? 'No especificada' : (userProfile.sportsDiscipline || 'No especificada'))
    .replace(/\[USER_POSITION_PLACEHOLDER\]/g, isGuest ? 'No especificada' : (userProfile.position || 'No especificada'))
    .replace(/\[USER_ATHLETIC_GOALS_PLACEHOLDER\]/g, isGuest ? 'No especificados' : ((userProfile.athleticGoals || []).join(', ') || 'No especificados'))
    .replace(new RegExp(PersonalGoal.GainMuscleImproveComposition, 'g'), PersonalGoal.GainMuscleImproveComposition) 
    .replace(new RegExp(AthleticGoalOptions.MuscleGainPower, 'g'), AthleticGoalOptions.MuscleGainPower)
    .replace(/\[IF_ATHLETE_PROFILE_CONTEXT_PLACEHOLDER\]/g, athleteContextForPrompt ? athleteContextForPrompt : '')
    + "\n" + imageAnalysisInstruction;

  const userTurnParts: Part[] = [];

  if (userInput && userInput.trim()) {
    userTurnParts.push({ text: userInput.trim() });
  }

  if (audioInput && audioInput.base64Data && audioInput.mimeType) {
    if (!userInput || !userInput.trim()) { // If audio is the primary input
        userTurnParts.push({ text: "(El usuario ha enviado una consulta por audio. Por favor, procesa el audio según las instrucciones generales.)"});
    } else if (userInput && audioInput) { // If user typed something AND then sent audio (less common for this app's flow but to be safe)
        userTurnParts.push({ text: "(Contexto adicional para el audio enviado.)"}); // Or keep the original userInput text
    }
    userTurnParts.push({
      inlineData: {
        mimeType: audioInput.mimeType,
        data: audioInput.base64Data,
      },
    });
  }
  
  if (imageInput && imageInput.base64Data && imageInput.mimeType) {
     if (!userInput || !userInput.trim()) { 
        userTurnParts.push({ text: "Analiza la imagen que he enviado." + (isGuest ? " Soy un usuario invitado." : " Si es comida, intenta estimar sus nutrientes para mi registro diario.") });
    }
    userTurnParts.push({
      inlineData: {
        mimeType: imageInput.mimeType,
        data: imageInput.base64Data,
      },
    });
  }

  if (userTurnParts.length === 0) {
    console.warn("Gemini: No user input (text, audio, or image) provided. Sending default.");
    userTurnParts.push({text: "El usuario no proporcionó entrada. Saluda e inicia un check-in diario si es apropiado según las directrices, o da la bienvenida si es invitado."}) 
  }
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        config: {
          systemInstruction: systemInstructionText,
        },
        contents: [{ role: "user", parts: userTurnParts }],
    });

    const rawText = response.text;
    if (rawText) {
        // Only parse food estimation if not a guest and image was not primary input without details
        const estimatedIntake = (!isGuest && !(imageInput && !userInput)) ? parseEstimatedFoodIntake(rawText) : undefined;
        const cleanedText = cleanResponseText(rawText);
        return { text: stripSpeakTags(cleanedText), estimatedIntake };
    } else {
        console.warn("Gemini response.text was empty or undefined", response);
        return { text: "No he podido generar una respuesta esta vez. Por favor, inténtalo de nuevo." };
    }

  } catch (err: unknown) {
    console.error("Error calling Gemini API:", err);
    let message = "Se produjo un error desconocido al comunicarse con el servicio de IA.";
    if (err instanceof Error) {
        message = err.message;
        if ((err as any).details) { 
            message = `${message} (Details: ${(err as any).details})`;
        }
        if (message.includes("API key not valid")) {
             message = "La clave API de Gemini no es válida. Por favor, verifica la configuración.";
        } else if (message.includes("SAFETY")) {
             message = "La solicitud fue bloqueada debido a políticas de seguridad. Intenta reformular tu pregunta.";
        } else if (message.includes("ReadableStream uploading is not supported")) {
             message = `Error de la API de IA: Problema con el envío de datos multimedia: ${message}`;
        } else {
             message = `Error de la API de IA: ${message}`;
        }
    }
    throw new Error(message);
  }
};

const stripSpeakTags = (text: string): string => {
  let cleanedText = text;
  cleanedText = cleanedText.replace(/<speak_ack>.*?<\/speak_ack>/gs, '').trim();
  cleanedText = cleanedText.replace(/<speak_next_q>.*?<\/speak_next_q>/gs, '').trim();
  return cleanedText.replace(/\n\s*\n/g, '\n'); 
};