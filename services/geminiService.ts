

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { UserProfile, Gender, TrainingFrequency, FootballPosition, TrainingLoad, PersonalGoal } from '../types';
import { GEMINI_MODEL_NAME, NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Gemini is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); 

export const generateNutriKickResponse = async (
  userInput: string,
  userProfile: UserProfile
): Promise<string> => {
  if (!API_KEY || API_KEY === "MISSING_API_KEY" || API_KEY === "MISSING_API_KEY_FROM_BUILD") {
    throw new Error("La clave API de Gemini no está configurada. Por favor, contacta al administrador o verifica la configuración del sitio.");
  }

  let userDataContext = "El usuario no ha proporcionado todos los datos de perfil específicos o acaba de empezar.\n";
  if (Object.values(userProfile).some(val => val && val.toString() !== '')) {
    userDataContext = "Datos del Usuario (utiliza esta información para personalizar tu respuesta si es relevante):\n";
    if (userProfile.age) userDataContext += `* Edad: ${userProfile.age} años\n`;
    if (userProfile.weight) userDataContext += `* Peso: ${userProfile.weight} kg\n`;
    if (userProfile.height) userDataContext += `* Altura: ${userProfile.height} cm\n`;
    // Check against actual Gender enum values or if it's not an empty string (placeholder)
    if (userProfile.gender && (userProfile.gender === Gender.Male || userProfile.gender === Gender.Female)) {
         userDataContext += `* Género: ${userProfile.gender}\n`;
    }
    
    userDataContext += `* ¿Es atleta?: ${userProfile.isAthlete ? 'Sí' : 'No'}\n`;

    if (userProfile.isAthlete) {
      if (userProfile.position) userDataContext += `* Posición en el campo (Fútbol): ${userProfile.position}\n`;
      if (userProfile.trainingLoad) userDataContext += `* Carga de entrenamiento (Fútbol): ${userProfile.trainingLoad}\n`;
    } else {
      if (userProfile.trainingFrequency) userDataContext += `* Frecuencia de entrenamiento general: ${userProfile.trainingFrequency}\n`;
    }
    if (userProfile.goals) userDataContext += `* Objetivo principal: ${userProfile.goals}\n`;
  }
  
  const fullPrompt = NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE
    .replace('[USER_DATA_CONTEXT]', userDataContext)
    .replace('[USER_GOAL_PLACEHOLDER]', userProfile.goals || 'no especificado'); // Add goal to prompt for AI

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: fullPrompt + "\n\nConsulta del Usuario:\n" + userInput, // Ensure user input is clearly delineated
    });
    
    const text = response.text;
    if (text) {
        return text;
    } else {
        console.warn("Gemini response.text was empty or undefined", response);
        return "No he podido generar una respuesta esta vez. Por favor, inténtalo de nuevo.";
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
             throw new Error("La clave API de Gemini no es válida. Por favor, verifica la configuración.");
        }
         throw new Error(`Error de la API de IA: ${error.message}`);
    }
    throw new Error("Se produjo un error desconocido al comunicarse con el servicio de IA.");
  }
};