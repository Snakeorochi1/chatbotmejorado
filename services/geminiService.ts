
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { UserProfile, Gender } from '../types'; // Removed unused enum imports
import { GEMINI_MODEL_NAME, NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE } from '../constants';

// AI Studio is expected to provide process.env.API_KEY.
// The check for its validity will happen during the API call itself,
// or the constructor might have internal checks. The prompt implies it's pre-configured and valid.
if (!process.env.API_KEY || process.env.API_KEY.includes("MISSING") || process.env.API_KEY.includes("FALLBACK") ||process.env.API_KEY.length < 30 ) {
  console.warn(
    "Gemini API key from process.env.API_KEY appears to be missing, a placeholder, or too short at module initialization. " +
    "Ensure it's correctly set in the AI Studio environment if you are not using a proxy. " +
    "Current value (first 10 chars): " + (process.env.API_KEY ? process.env.API_KEY.substring(0,10) : "undefined")
  );
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateNutriKickResponse = async (
  userInput: string | null, // Text prompt
  userProfile: UserProfile,
  audioInput?: { base64Data: string; mimeType: string }, // Optional audio input
  imageInput?: { base64Data: string; mimeType: string }  // Optional image input
): Promise<string> => {
  // The API key's presence and validity are primarily checked by the API call itself.
  // The constructor with process.env.API_KEY is the standard way for AI Studio.

  let userDataContext = "El usuario no ha proporcionado todos los datos de perfil específicos o acaba de empezar.\n";
  const relevantProfileData: Partial<UserProfile> = { ...userProfile };
  const profileKeys = Object.keys(relevantProfileData) as Array<keyof UserProfile>;
  const hasSomeProfileData = profileKeys.some(key => {
    const value = relevantProfileData[key];
    if (typeof value === 'boolean') return true;
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
      if (userProfile.position) userDataContext += `* Posición en el campo (Fútbol): ${userProfile.position}\n`;
      if (userProfile.trainingLoad) userDataContext += `* Carga de entrenamiento (Fútbol): ${userProfile.trainingLoad}\n`;
    } else {
      if (userProfile.trainingFrequency) userDataContext += `* Frecuencia de entrenamiento general: ${userProfile.trainingFrequency}\n`;
    }
    if (userProfile.goals) userDataContext += `* Objetivo principal: ${userProfile.goals}\n`;
  }

  let finalSystemInstruction = NUTRI_KICK_AI_PERSONA_PROMPT_TEMPLATE;
  if (userProfile.age && parseInt(userProfile.age) < 18) {
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
    imageAnalysisInstruction = `
El usuario ha proporcionado una imagen. Por favor, analízala.
- Si parece un plato de comida, describe los componentes principales que identificas y ofrece comentarios generales sobre su posible adecuación para un deportista, en línea con el perfil del usuario si es relevante. Pregunta si desea un análisis más detallado de algún componente.
- Si parece una etiqueta de producto o un código de barras, intenta extraer la información nutricional visible (calorías, macros, ingredientes principales). Si ves un código de barras pero no puedes leer la información, menciona que no puedes buscar códigos de barras directamente pero que puedes analizar la información de la etiqueta si es legible.
- Si no estás seguro de qué es la imagen, descríbela y pregunta al usuario para qué la envió.
Mantén tu respuesta inicial concisa y luego pregunta si desea más detalles o tiene preguntas específicas sobre la imagen.
`;
  }

  const systemInstructionText = finalSystemInstruction
    .replace(/\[USER_NAME_PLACEHOLDER\]/g, userProfile.name || "usuario")
    .replace('[USER_DATA_CONTEXT]', userDataContext)
    .replace('[USER_GOAL_PLACEHOLDER]', userProfile.goals || 'no especificado')
    + "\n" + imageAnalysisInstruction;

  const userTurnParts: Part[] = [];

  if (userInput && userInput.trim()) {
    userTurnParts.push({ text: userInput.trim() });
  }

  if (audioInput && audioInput.base64Data && audioInput.mimeType) {
    if (!userInput || !userInput.trim()) {
        userTurnParts.push({ text: "(El usuario ha enviado una consulta por audio. Por favor, transcríbela y responde.)"});
    } else {
        userTurnParts.push({ text: "(Contexto adicional: Se ha incluido audio del usuario.)"});
    }
    userTurnParts.push({
      inlineData: {
        mimeType: audioInput.mimeType,
        data: audioInput.base64Data,
      },
    });
  }
  
  if (imageInput && imageInput.base64Data && imageInput.mimeType) {
    userTurnParts.push({
      inlineData: {
        mimeType: imageInput.mimeType,
        data: imageInput.base64Data,
      },
    });
  }

  if (userTurnParts.length === 0) {
    console.warn("Gemini: No user input (text, audio, or image) provided for the current turn. Sending a default message.");
    userTurnParts.push({text: "El usuario no proporcionó entrada de texto, audio o imagen. Por favor, responde de manera general o pregunta qué necesita."})
  }
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        config: {
          systemInstruction: systemInstructionText,
        },
        contents: [{ role: "user", parts: userTurnParts }],
    });

    const text = response.text;
    if (text) {
        return text;
    } else {
        console.warn("Gemini response.text was empty or undefined", response);
        return "No he podido generar una respuesta esta vez. Por favor, inténtalo de nuevo.";
    }

  } catch (err: unknown) {
    console.error("Error calling Gemini API:", err);
    if (err instanceof Error) {
        let message = err.message;
        if ((err as any).details) { 
            message = `${message} (Details: ${(err as any).details})`;
        }

        if (message.includes("API key not valid")) {
             throw new Error("La clave API de Gemini no es válida. Por favor, verifica la configuración en AI Studio.");
        } else if (message.includes("SAFETY")) {
             throw new Error("La solicitud fue bloqueada debido a políticas de seguridad. Intenta reformular tu pregunta.");
        } else if (message.includes("ReadableStream uploading is not supported")) {
             throw new Error(`Error de la API de IA: Problema con el envío de datos multimedia (posiblemente un problema del proxy o del servidor): ${message}`);
        }
         else {
             throw new Error(`Error de la API de IA: ${message}`);
        }
    } else {
        throw new Error("Se produjo un error desconocido al comunicarse con el servicio de IA.");
    }
  }
  throw new Error("Unexpected fall-through in generateNutriKickResponse.");
};
