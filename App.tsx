
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserProfile, Message, Gender, FootballPosition, TrainingLoad, TrainingFrequency, PersonalGoal } from './types';
import { generateNutriKickResponse } from './services/geminiService';
import { saveUserProfileToSupabase, getSupabaseClientStatus } from './services/supabaseService'; // Supabase integration
import { ProfileEditor } from './components/ProfileEditor';
import { ChatWindow } from './components/ChatWindow';
import { DISCLAIMER_TEXT } from './constants';
import { LogoIcon, ProfileIcon, ChatIcon } from './components/Icons';

const USER_PROFILE_STORAGE_KEY = 'nutrikick_userProfile';
const CHAT_MESSAGES_STORAGE_KEY = 'nutrikick_chatMessages';

const initialDefaultUserProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  age: '',
  weight: '',
  height: '',
  gender: "",
  isAthlete: false,
  trainingFrequency: TrainingFrequency.NoneOrRarely,
  position: FootballPosition.Versatile,
  trainingLoad: TrainingLoad.LightTraining,
  goals: "" as PersonalGoal | "",
};

const INITIAL_WELCOME_MESSAGE_TEXT = "¡Hola! 👋 Soy Nutri-Kick AI. Para poder ayudarte de la mejor manera y personalizar mis consejos, necesito conocerte un poco. **Por favor, haz clic en el icono del perfil (que parece una silueta de persona 👤) en la esquina superior derecha para completar tus datos.** Una vez que tu perfil esté actualizado, podré calcular tus necesidades calóricas estimadas y responder a todas tus preguntas sobre nutrición deportiva. También puedes usar el micrófono 🎤 o la cámara 📸 para interactuar. ¿Comenzamos? 🚀";


function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to read blob as base64 string."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataURItoMIME(dataURI: string): string {
    return dataURI.substring(dataURI.indexOf(':') + 1, dataURI.indexOf(';'));
}

const PREFERRED_AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac',
];

function getSupportedMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined') return undefined;
    for (const mimeType of PREFERRED_AUDIO_MIME_TYPES) {
        if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    }
    return undefined; 
}

const stripSpeakTags = (text: string): string => {
  let cleanedText = text;
  cleanedText = cleanedText.replace(/<speak_ack>.*?<\/speak_ack>/gs, '').trim();
  cleanedText = cleanedText.replace(/<speak_next_q>.*?<\/speak_next_q>/gs, '').trim();
  return cleanedText.replace(/\n\s*\n/g, '\n'); 
};

const App: React.FC = () => {
  const isInitialProfileLoad = useRef(true);
  const isInitialMessagesLoad = useRef(true);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        const finalProfile = { ...initialDefaultUserProfile };
        for (const key of Object.keys(initialDefaultUserProfile) as Array<keyof UserProfile>) {
          if (parsedProfile.hasOwnProperty(key) && parsedProfile[key] !== undefined) {
            (finalProfile as any)[key] = parsedProfile[key];
          }
        }
        return finalProfile;
      }
    } catch (error) { console.error("Error loading user profile from localStorage:", error); }
    return { ...initialDefaultUserProfile };
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const storedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
      if (storedMessages) {
        const parsedMessages: Message[] = JSON.parse(storedMessages);
        return parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) }));
      }
    } catch (error) { console.error("Error loading messages from localStorage:", error); }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');

  const [isRecording, setIsRecording] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [lastInputMethod, setLastInputMethod] = useState<'text' | 'voice' | 'image'>('text');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const actualMimeTypeRef = useRef<string>(''); 

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null); 

  const [dbStatus, setDbStatus] = useState<'checking' | 'ok' | 'error'>('checking'); 
  const [dbErrorDetails, setDbErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Check Supabase client status
    const supabaseStatus = getSupabaseClientStatus();
    if (!supabaseStatus.clientInitialized) {
        console.error("App.tsx: Supabase client not initialized by supabaseService.", supabaseStatus.error);
        setDbStatus('error');
        setDbErrorDetails(supabaseStatus.detailedMessage || `Error fatal: El cliente Supabase no se pudo inicializar. Revisa supabaseService.ts y la consola.`);
    } else {
        console.log("%cApp.tsx: Supabase client appears initialized.", "color: green; font-weight: bold;");
        setDbStatus('ok'); // Assume OK if client initialized. Further checks could be added.
        setDbErrorDetails(null);
    }
  }, []);


  const handleProfileUpdate = useCallback(async (newProfile: UserProfile) => {
    setUserProfile(newProfile); setError(null); setSuccessMessage(null);
    try {
      await saveUserProfileToSupabase(newProfile); // Use Supabase service
      setSuccessMessage("¡Perfil guardado en la nube (Supabase) con éxito! ☁️");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (dbError) {
      console.error("Failed to save profile to Supabase:", dbError);
      const message = dbError instanceof Error ? dbError.message : "Error desconocido al guardar en base de datos.";
      setError(`Error al guardar perfil en la nube: ${message}. Tus cambios locales están guardados.`);
      setTimeout(() => setError(null), 7000);
    }
    
    // Recalculate BMR/TDEE and generate AI message (logic remains the same)
    let bmr: number | null = null;
    let tdee: number | null = null;
    let activityLevelName = "No especificado";
    let activityFactor = 1.2; 
    const ageNum = parseInt(newProfile.age);
    const weightNum = parseFloat(newProfile.weight);
    const heightNum = parseInt(newProfile.height);
    let calculationMessage = `¡Perfil de ${newProfile.name || 'usuario'} actualizado! 🎉\n\n`;

    if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum) || ageNum <= 0 || weightNum <= 0 || heightNum <= 0) {
      calculationMessage += "Por favor, completa tu edad, peso y altura con valores válidos para calcular tus necesidades energéticas. 🙏\n\n";
    } else if (heightNum < 60) { 
      calculationMessage += "**¡Atención Especial por Estatura!** 📏\n";
      calculationMessage += "Debido a que la estatura ingresada es menor a 60 cm, los cálculos estándar de requerimientos calóricos pueden no ser precisos. Es esencial la evaluación y el consejo directo de un profesional de la salud (médico o nutricionista).\n\n";
      calculationMessage += "Por tu bienestar, no se mostrarán cálculos de MB o RCTE ni consejos específicos. Te insto a buscar asesoramiento profesional.\n";
    } else if (ageNum < 18) { 
        calculationMessage += `Aquí tienes un resumen de tus necesidades estimadas:\n`;
        if (newProfile.gender === Gender.Male) {
            bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
        } else if (newProfile.gender === Gender.Female) {
            bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;
        }
        if (bmr && bmr > 0) {
             if (newProfile.isAthlete) { activityFactor = 1.5; } 
             else { activityFactor = 1.4; } 
             tdee = bmr * activityFactor;
        }
        calculationMessage += `*   **Metabolismo Basal (MB) Estimado:** ${bmr && bmr > 0 ? bmr.toFixed(0) : 'N/A'} kcal/día 🔥\n`;
        calculationMessage += `*   **Requerimiento Calórico Total Estimado (RCTE):** ${tdee && tdee > 0 ? tdee.toFixed(0) : 'N/A'} kcal/día 🎯\n\n`;
        calculationMessage += "**¡Atención Especial por Edad!** 🧑‍⚕️\n";
        calculationMessage += "Dado que eres menor de 18 años, es CRUCIAL que cualquier plan nutricional o de entrenamiento sea supervisado directamente por un médico y un nutricionista deportivo, en conjunto con tus padres o tutores. Mis cálculos (MB y RCTE) son estimaciones generales y no pueden reemplazar una evaluación profesional detallada, que es esencial para asegurar tu crecimiento y desarrollo saludable. Por favor, discute tus objetivos y esta información con ellos.\n\n";
        calculationMessage += "Como inteligencia artificial, mi prioridad es tu bienestar, y por ello no puedo ofrecerte consejos nutricionales detallados ni sugerencias específicas para tus objetivos a esta edad. ¡Habla con los profesionales y tus padres!\n";
    } else if (newProfile.gender === Gender.Male || newProfile.gender === Gender.Female) {
      if (newProfile.gender === Gender.Male) {
        bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
      } else { 
        bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;
      }

      if (newProfile.isAthlete && newProfile.trainingLoad) {
        switch (newProfile.trainingLoad) {
          case TrainingLoad.RestDay: activityFactor = 1.2; activityLevelName = "Día de Descanso 😴"; break;
          case TrainingLoad.LightTraining: activityFactor = 1.375; activityLevelName = "Entrenamiento Ligero 👟"; break;
          case TrainingLoad.IntenseTraining: activityFactor = 1.725; activityLevelName = "Entrenamiento Intenso 💪"; break;
          case TrainingLoad.MatchDay: activityFactor = 1.9; activityLevelName = "Día de Partido 🏆"; break;
        }
      } else if (!newProfile.isAthlete && newProfile.trainingFrequency) { 
        switch (newProfile.trainingFrequency) {
          case TrainingFrequency.NoneOrRarely: activityFactor = 1.3; activityLevelName = "Actividad Ligera (0-1 entrenamientos/sem) 🚶"; break;
          case TrainingFrequency.TwoToThree: activityFactor = 1.4; activityLevelName = "Actividad Ligera (2-3 entrenamientos/sem) 🚶‍♀️"; break; 
          case TrainingFrequency.FourTimes: activityFactor = 1.5; activityLevelName = "Actividad Moderada (4 entrenamientos/sem) 🏃"; break;
          case TrainingFrequency.FiveToSix: activityFactor = 1.7; activityLevelName = "Actividad Alta (5-6 entrenamientos/sem) 🏋️‍♀️"; break; 
          case TrainingFrequency.DailyOrMore: activityFactor = 1.9; activityLevelName = "Actividad Muy Alta (7+ entrenamientos/sem) 🚀"; break; 
        }
      }
      if (bmr) tdee = bmr * activityFactor;

      calculationMessage += `Aquí tienes un resumen de tus necesidades estimadas:\n`;
      calculationMessage += `*   **Metabolismo Basal (MB):** ${bmr.toFixed(0)} kcal/día 🔥\n`;
      calculationMessage += `*   **Requerimiento Calórico Total Estimado (RCTE):** ${tdee ? tdee.toFixed(0) : 'N/A'} kcal/día (basado en MB y tu actividad: ${activityLevelName})🎯\n\n`;
      calculationMessage += `Considerando tu objetivo de "${newProfile.goals}", estos valores son el punto de partida para planificar tu ingesta. \n\n`;
      let goalSpecificAdvice = "";
      switch (newProfile.goals) {
        case PersonalGoal.LoseWeight:
          goalSpecificAdvice = "Para tu objetivo de 'Perder peso', generalmente se busca un déficit calórico. Es fundamental que esta pérdida sea de grasa, protegiendo tu masa muscular. ¿Te gustaría que te explique más sobre esto o cómo se podría distribuir tu comida de forma general?\n\n" +
          "**Importante:** Una pérdida de peso mal planificada puede ser perjudicial. Un nutricionista deportivo es clave para un plan seguro y efectivo.\n\n";
          break;
        case PersonalGoal.GainMuscle:
          goalSpecificAdvice = "Para ganar músculo, un ligero superávit calórico y suficiente proteína son claves. ¿Quieres que veamos algunas pautas generales sobre esto?\n\n";
          break;
        case PersonalGoal.MaintainAndPerform:
          goalSpecificAdvice = "Para mantener peso y mejorar rendimiento, la calidad y el timing de nutrientes son cruciales. ¿Te interesa saber más sobre cómo optimizar tu energía y recuperación?\n\n";
          break;
        default: goalSpecificAdvice = `Para tu objetivo de '${newProfile.goals}', podemos explorar estrategias específicas. ¿Hay algún aspecto en particular sobre el que te gustaría que conversemos, como tipos de alimentos o momentos para comer?\n\n`; break;
      }
      calculationMessage += goalSpecificAdvice;
    } else {
      calculationMessage += "Para un cálculo más preciso, selecciona 'Masculino' o 'Femenino' en género.\n\n";
    }

    const newAiCalcMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: calculationMessage.trim(), timestamp: new Date() };
    setMessages(prev => [newAiCalcMessage, ...prev.filter(m => m.text !== INITIAL_WELCOME_MESSAGE_TEXT)]);
    setActiveTab('chat');
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
    }, 0);
  }, [chatContainerRef]);


  const handleSendTextMessage = useCallback(async (userInput: string, inputMethod: 'text' | 'voice' | 'image' = 'text') => {
    if (!userInput.trim() && inputMethod === 'text') return;
    setLastInputMethod(inputMethod);
    console.log(`Nutri-Kick AI: handleSendTextMessage called. Method: ${inputMethod}, Input: ${userInput}`);

    const newUserMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: userInput, timestamp: new Date() };
    setMessages(prev => {
        const updatedMessages = [...prev, newUserMessage];
        setTimeout(() => document.getElementById(`message-${newUserMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
    });
    setIsLoading(true); setError(null); setSuccessMessage(null);

    try {
      const aiResponseText = await generateNutriKickResponse(userInput, userProfile, null, null);
      console.log("%cNutri-Kick AI: Raw AI Response Received (Text Input):", "color: cyan; font-weight: bold;", JSON.stringify(aiResponseText));
      
      const newAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: stripSpeakTags(aiResponseText), timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newAiMessage];
        setTimeout(() => document.getElementById(`message-${newAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
    } catch (err) {
      console.error("Error fetching AI response:", err);
      const errorMessageText = err instanceof Error ? err.message : "Ocurrió un error al contactar a Nutri-Kick AI.";
      setError(errorMessageText);
      const newErrorAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: `Lo siento, tuve problemas para procesar tu solicitud: ${errorMessageText}. Por favor, revisa tu conexión o inténtalo más tarde. 🛠️`, timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newErrorAiMessage];
        setTimeout(() => document.getElementById(`message-${newErrorAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
      setTimeout(() => setError(null), 7000);
    } finally { setIsLoading(false); }
  }, [userProfile]);

  const handleSendAudioMessage = useCallback(async (base64Audio: string, mimeType: string) => {
    setLastInputMethod('voice');
    console.log("Nutri-Kick AI: handleSendAudioMessage called.");
    const audioUserMessageText = "🎤 Audio enviado a NutriKick...";
    const newUserMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: audioUserMessageText, timestamp: new Date() };
     setMessages(prev => {
        const updatedMessages = [...prev, newUserMessage];
        setTimeout(() => document.getElementById(`message-${newUserMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
    });
    setIsLoading(true); setError(null); setSuccessMessage(null);

    try {
      const aiResponseText = await generateNutriKickResponse(null, userProfile, { base64Data: base64Audio, mimeType }, null); 
      console.log("%cNutri-Kick AI: Raw AI Response Received (Audio Input):", "color: cyan; font-weight: bold;", JSON.stringify(aiResponseText));
      const newAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: stripSpeakTags(aiResponseText), timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newAiMessage];
        setTimeout(() => document.getElementById(`message-${newAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
    } catch (err) {
      console.error("Error fetching AI response for audio:", err);
      const errorMessageText = err instanceof Error ? err.message : "Ocurrió un error al contactar a Nutri-Kick AI.";
      setError(errorMessageText);
      const newErrorAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: `Lo siento, tuve problemas para procesar tu audio: ${errorMessageText}. Por favor, revisa tu conexión o inténtalo más tarde. 🛠️`, timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newErrorAiMessage];
        setTimeout(() => document.getElementById(`message-${newErrorAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
      setTimeout(() => setError(null), 7000);
    } finally { setIsLoading(false); }
  }, [userProfile]);

  const handleSendImageMessage = useCallback(async (imageBase64DataUri: string) => {
    setLastInputMethod('image');
    console.log("Nutri-Kick AI: handleSendImageMessage called.");
    const newUserMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: imageBase64DataUri, timestamp: new Date() };
    setMessages(prev => {
        const updatedMessages = [...prev, newUserMessage];
        setTimeout(() => document.getElementById(`message-${newUserMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
    });
    setIsLoading(true); setError(null); setSuccessMessage(null);

    const mimeType = dataURItoMIME(imageBase64DataUri);
    const base64Data = imageBase64DataUri.split(',')[1];

    try {
      const aiResponseText = await generateNutriKickResponse("Analiza la imagen que he enviado.", userProfile, null, { base64Data, mimeType });
      console.log("%cNutri-Kick AI: Raw AI Response Received (Image Input):", "color: cyan; font-weight: bold;", JSON.stringify(aiResponseText));
      const newAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: stripSpeakTags(aiResponseText), timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newAiMessage];
        setTimeout(() => document.getElementById(`message-${newAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
    } catch (err) {
      console.error("Error fetching AI response for image:", err);
      const errorMessageText = err instanceof Error ? err.message : "Ocurrió un error al contactar a Nutri-Kick AI.";
      setError(errorMessageText);
      const newErrorAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: `Lo siento, tuve problemas para procesar tu imagen: ${errorMessageText}. 🛠️`, timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newErrorAiMessage];
        setTimeout(() => document.getElementById(`message-${newErrorAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
      setTimeout(() => setError(null), 7000);
    } finally { setIsLoading(false); }
  }, [userProfile]);


  const handleToggleRecording = useCallback(async () => {
    setMicPermissionError(null);
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        console.log("Nutri-Kick AI: MediaRecorder explicitly stopped by user.");
      }
      setIsRecording(false);
    } else {
      if (typeof MediaRecorder === 'undefined') {
        setMicPermissionError("MediaRecorder no es compatible con este navegador."); setTimeout(() => setMicPermissionError(null), 7000); return;
      }
      try {
        console.log("Nutri-Kick AI: Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Nutri-Kick AI: Microphone access granted.");
        
        const supportedMimeType = getSupportedMimeType();
        actualMimeTypeRef.current = supportedMimeType || 'audio/webm'; 
        console.log("Nutri-Kick AI: Using MIME type for MediaRecorder:", actualMimeTypeRef.current);

        const options = supportedMimeType ? { mimeType: supportedMimeType } : {};
        
        try { 
            mediaRecorderRef.current = new MediaRecorder(stream, options); 
            console.log("Nutri-Kick AI: MediaRecorder instance created with options:", options);
        } 
        catch (recErr: any) {
             console.error("Error instantiating MediaRecorder:", recErr.name, recErr.message, "Options:", options);
             setMicPermissionError(`Error grabadora: ${recErr.message}. Verifica los formatos soportados.`); setTimeout(() => setMicPermissionError(null), 7000);
             stream.getTracks().forEach(track => track.stop()); return; 
        }

        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = async () => {
          console.log("Nutri-Kick AI: MediaRecorder stopped. Number of chunks:", audioChunksRef.current.length);
          const finalMimeType = mediaRecorderRef.current?.mimeType || actualMimeTypeRef.current;
          
          if (audioChunksRef.current.length === 0) {
            console.warn("Nutri-Kick AI: No audio data chunks recorded.");
            stream.getTracks().forEach(track => track.stop()); 
            setIsRecording(false); 
            setMicPermissionError("No se grabó audio. Inténtalo de nuevo.");
            setTimeout(() => setMicPermissionError(null), 5000);
            return;
          }

          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
          audioChunksRef.current = []; 
          
          if (audioBlob.size === 0) {
            console.warn("Nutri-Kick AI: Recorded audio blob is empty after creation.");
            stream.getTracks().forEach(track => track.stop()); 
            setIsRecording(false); 
            return;
          }
          try {
            const base64Audio = await blobToBase64(audioBlob);
            handleSendAudioMessage(base64Audio, finalMimeType);
          } catch (e) { 
            console.error("Error converting blob to base64:", e); 
            setError("Error procesando audio grabado."); 
            setTimeout(() => setError(null), 5000); 
          }
          stream.getTracks().forEach(track => track.stop()); 
          setIsRecording(false); 
          chatInputRef.current?.focus(); 
        };
        mediaRecorderRef.current.onerror = (event: Event) => {
            console.error("MediaRecorder error event:", event);
            const mre = event as any; 
            let em = "Ocurrió un error durante la grabación.";
            if (mre?.error?.name === 'NotAllowedError') em = "Permiso para micrófono denegado.";
            else if (mre?.error?.message) em = mre.error.message;
            setMicPermissionError(em); setTimeout(() => setMicPermissionError(null), 7000);
            setIsRecording(false); 
            stream.getTracks().forEach(track => track.stop()); 
            chatInputRef.current?.focus(); 
        };

        mediaRecorderRef.current.start(); 
        console.log("Nutri-Kick AI: MediaRecorder started recording.");
        setIsRecording(true);
        if (chatInputRef.current) chatInputRef.current.value = ""; 
      } catch (err: any) {
        console.error("Error accessing microphone or starting MediaRecorder:", err.name, err.message);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMicPermissionError("Permiso para usar el micrófono denegado. Revísalo en los ajustes de tu navegador.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setMicPermissionError("No se encontró un micrófono disponible.");
        } else if (err.message?.toLowerCase().includes("mime")) {
            setMicPermissionError("Formato de audio no compatible por el navegador.");
        } else {
          setMicPermissionError("No se pudo iniciar la grabación. Verifica el micrófono.");
        }
        setTimeout(() => setMicPermissionError(null), 7000); 
        setIsRecording(false);
      }
    }
  }, [isRecording, handleSendAudioMessage]);

  const handleOpenCamera = useCallback(async () => {
    console.log("Nutri-Kick AI: Attempting to open camera...");
    setCameraError(null);
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
      console.error("Nutri-Kick AI: getUserMedia not supported.");
      setCameraError("La cámara no es compatible con este navegador.");
      setTimeout(() => setCameraError(null), 5000);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      console.log("Nutri-Kick AI: Camera stream obtained.");
      videoStreamRef.current = stream;
      setIsCameraOpen(true); 
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Permiso de cámara denegado. Habilítalo en los ajustes de tu navegador.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No se encontró una cámara disponible.");
      } else {
        setCameraError("No se pudo acceder a la cámara. Error: " + err.message);
      }
      setTimeout(() => setCameraError(null), 7000);
      setIsCameraOpen(false); 
    }
  }, []);
  
  useEffect(() => {
    if (isCameraOpen && videoStreamRef.current && videoElementRef.current) {
        console.log("Nutri-Kick AI: Attaching stream to video element.");
        videoElementRef.current.srcObject = videoStreamRef.current;
        videoElementRef.current.play().catch(playError => {
            console.error("Nutri-Kick AI: Error playing video stream:", playError);
            setCameraError("Error al iniciar la vista de cámara. Intenta de nuevo.");
             setTimeout(() => setCameraError(null), 5000);
        });
    } else if (!isCameraOpen && videoElementRef.current) {
        videoElementRef.current.srcObject = null; 
        console.log("Nutri-Kick AI: Cleared srcObject from video element.");
    }
  }, [isCameraOpen]); 


  const handleCloseCamera = useCallback(() => {
    console.log("Nutri-Kick AI: Closing camera.");
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`Nutri-Kick AI: Stopped camera track: ${track.label}`);
      });
      videoStreamRef.current = null;
    }
    setIsCameraOpen(false);
  }, []);

  const handleCaptureImage = useCallback(() => {
    console.log("Nutri-Kick AI: Attempting to capture image.");
    if (videoElementRef.current && canvasElementRef.current && 
        videoElementRef.current.readyState >= videoElementRef.current.HAVE_METADATA && 
        videoElementRef.current.videoWidth > 0 && videoElementRef.current.videoHeight > 0 
    ) {
      const video = videoElementRef.current;
      const canvas = canvasElementRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext('2d');
      if (context) {
        const videoStyle = window.getComputedStyle(video);
        if (videoStyle.transform.includes('matrix(-1') || videoStyle.transform.includes('scaleX(-1)')) {
            console.log("Nutri-Kick AI: Video is mirrored, flipping canvas for capture.");
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85); 
        console.log("Nutri-Kick AI: Image captured as data URI (first 50 chars):", dataUri.substring(0,50));
        handleSendImageMessage(dataUri);
      } else {
        console.error("Nutri-Kick AI: Failed to get 2D context from canvas.");
        setCameraError("Error al procesar la imagen capturada.");
        setTimeout(() => setCameraError(null), 5000);
      }
    } else {
       console.error("Nutri-Kick AI: Capture failed. Video/Canvas ref missing or video not ready/dimensions invalid. Video readyState:", videoElementRef.current?.readyState, "videoWidth:", videoElementRef.current?.videoWidth, "videoHeight:", videoElementRef.current?.videoHeight);
       setCameraError("No se pudo capturar la imagen. Video no listo o sin dimensiones.");
       setTimeout(() => setCameraError(null), 5000);
    }
    handleCloseCamera();
    chatInputRef.current?.focus(); 
  }, [handleCloseCamera, handleSendImageMessage, chatInputRef]);


  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
      }
      console.log("Nutri-Kick AI: App component unmounted, cleaned up media streams.");
    };
  }, []); 

  useEffect(() => {
    if (messages.length === 0 && !isInitialMessagesLoad.current) { 
      console.log("Nutri-Kick AI: No messages found, adding initial welcome message.");
      const welcomeMsg: Message = { id: crypto.randomUUID(), sender: 'ai', text: INITIAL_WELCOME_MESSAGE_TEXT, timestamp: new Date() };
      setMessages([welcomeMsg]);
    }
    if(isInitialMessagesLoad.current) {
        isInitialMessagesLoad.current = false; 
    }
    if(isInitialProfileLoad.current) {
        isInitialProfileLoad.current = false; 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  },[]); 

  useEffect(() => {
    if (isInitialProfileLoad.current) return; 
    try {
      const sanitizedProfileToStore: Partial<UserProfile> = {};
       for (const key of Object.keys(initialDefaultUserProfile) as Array<keyof UserProfile>) {
        if (userProfile.hasOwnProperty(key)) {
            (sanitizedProfileToStore as any)[key] = userProfile[key];
        }
      }
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(sanitizedProfileToStore));
      console.log("Nutri-Kick AI: User profile saved to localStorage.");
    } catch (error) { console.error("Error saving user profile to localStorage:", error); }
  }, [userProfile]);

  useEffect(() => {
    if (isInitialMessagesLoad.current) return; 
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
        console.log("Nutri-Kick AI: Chat messages saved to localStorage.");
      } else {
        localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY); 
        console.log("Nutri-Kick AI: Chat messages cleared from localStorage.");
      }
    } catch (error) { console.error("Error saving messages to localStorage:", error); }
  }, [messages]);


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white text-slate-100">
      <div className="bg-slate-800 backdrop-blur-lg shadow-xl rounded-xl w-full max-w-2xl flex flex-col overflow-hidden" style={{height: 'calc(100vh - 40px)', maxHeight: '700px'}}>
        <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3"> <LogoIcon className="text-4xl" /> <h1 className="text-2xl font-bold tracking-tight">Nutri-Kick AI</h1> </div>
          <div className="flex space-x-1 sm:space-x-2">
            <button onClick={() => { setActiveTab('chat'); setError(null); setSuccessMessage(null);}} className={`p-2 rounded-md transition-colors flex items-center space-x-1 sm:space-x-2 ${activeTab === 'chat' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`} aria-label="Chat" title="Chat"> <ChatIcon className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="text-sm sm:text-base">Chat</span> </button>
            <button onClick={() => {setActiveTab('profile'); setError(null); setSuccessMessage(null);}} className={`p-2 rounded-md transition-colors flex items-center space-x-1 sm:space-x-2 ${activeTab === 'profile' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`} aria-label="Perfil" title="Perfil"> <ProfileIcon className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="text-sm sm:text-base">Perfil</span> </button>
          </div>
        </header>

        {dbStatus === 'error' && dbErrorDetails && (
            <div className="bg-red-700/90 text-white p-3 text-sm m-2 mx-0 sm:mx-2 rounded-md shadow-lg animate-fadeIn border-l-4 border-red-400" role="alert">
                <p className="font-bold text-base">⚠️ ¡Problema con la Base de Datos (Supabase)!</p>
                <div className="mt-1 whitespace-pre-line text-xs">
                  {dbErrorDetails}
                </div>
                 <p className="mt-2 text-xs">Consulta la consola del desarrollador (F12) para más detalles técnicos sobre la inicialización de Supabase.</p>
            </div>
        )}
        {dbStatus === 'checking' && ( // You might not need 'checking' if Supabase init is synchronous in the service
            <div className="bg-yellow-600/80 text-white p-3 text-sm m-2 mx-0 sm:mx-2 rounded-md shadow-lg animate-fadeIn" role="status">
                <p className="font-bold">🔍 Verificando conexión con la base de datos (Supabase)...</p>
            </div>
        )}


        <main className="flex-grow overflow-y-auto custom-scrollbar p-1 sm:p-2 md:p-4 bg-slate-700 relative">
          {activeTab === 'chat' && (
            <ChatWindow
                messages={messages}
                onSendMessage={handleSendTextMessage}
                isLoading={isLoading}
                chatContainerRef={chatContainerRef}
                isListening={isRecording}
                onToggleListening={handleToggleRecording}
                micPermissionError={micPermissionError}
                chatInputRef={chatInputRef}
                onOpenCamera={handleOpenCamera}
              />
          )}
          {activeTab === 'profile' && ( <ProfileEditor initialProfile={userProfile} onUpdateProfile={handleProfileUpdate} /> )}
        </main>

        {isCameraOpen && (
          <div className="camera-overlay animate-fadeIn">
            <div className="camera-modal">
              {cameraError && <p className="camera-error-message">{cameraError}</p>}
              <video ref={videoElementRef} autoPlay playsInline muted className="border border-slate-600"></video>
              <canvas ref={canvasElementRef} style={{ display: 'none' }}></canvas>
              <div className="camera-buttons">
                <button onClick={handleCaptureImage} className="camera-capture-button">Tomar Foto 📸</button>
                <button onClick={handleCloseCamera} className="camera-cancel-button">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {successMessage && ( <div className="bg-green-700/80 border-l-4 border-green-500 text-green-100 p-3 text-sm m-2 rounded-md shadow animate-fadeIn" role="status"> <p className="font-bold">Éxito ✅</p> <p>{successMessage}</p> </div> )}
        {error && ( <div className="bg-red-800/60 border-l-4 border-red-500 text-red-200 p-3 text-sm m-2 rounded-md shadow animate-fadeIn" role="alert"> <p className="font-bold">Error ⚠️</p> <p>{error}</p> </div> )}

        <footer className="bg-slate-900 p-3 text-center text-xs text-slate-400 border-t border-slate-700"> <p>{DISCLAIMER_TEXT}</p> </footer>
      </div>
    </div>
  );
};

export default App;
