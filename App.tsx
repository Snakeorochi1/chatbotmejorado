
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserProfile, Message, Gender, FootballPosition, TrainingLoad, TrainingFrequency, PersonalGoal, DailyIntake, NutrientTargets, EstimatedFoodIntake, SportsDiscipline, AthleticGoalOptions, DietaryApproachOptions, DietaryRestrictionOptions } from './types';
import { generateNutriKickResponse, GeminiServiceResponse } from './services/geminiService';
import { saveUserProfileToSupabase, getSupabaseClientStatus } from './services/supabaseService';
import { ProfileEditor } from './components/ProfileEditor';
import { ChatWindow } from './components/ChatWindow';
import { DISCLAIMER_TEXT } from './constants';
import { LogoIcon, ProfileIcon, ChatIcon } from './components/Icons';
import { calculateIdealBodyWeightRange, calculateMacronutrientTargets } from './nutritionCalculators';

const USER_PROFILE_STORAGE_KEY = 'nutrikick_userProfile_v3'; 
const CHAT_MESSAGES_STORAGE_KEY = 'nutrikick_chatMessages_v2';
const DAILY_INTAKE_STORAGE_KEY = 'nutrikick_dailyIntake_v2';
const NUTRIENT_TARGETS_STORAGE_KEY = 'nutrikick_nutrientTargets_v2';


const initialDefaultUserProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  age: '',
  weight: '',
  height: '',
  gender: "",
  isAthlete: false,
  sportsDiscipline: undefined, 
  customSportsDiscipline: '', 
  position: '', 
  trainingLoad: TrainingLoad.LightTraining,
  athleticGoals: [], 
  trainingFrequency: TrainingFrequency.NoneOrRarely,
  goals: "" as PersonalGoal | "",
  dietaryApproaches: [], // New
  dietaryRestrictions: [], // New
  currentSupplementUsage: "Prefiero no decirlo",
  supplementInterestOrUsageDetails: '',
  wellnessFocusAreas: [],
  moodToday: '',
  trainedToday: '',
  hadBreakfast: '',
  energyLevel: '',
  lastCheckInTimestamp: undefined,
};

const INITIAL_WELCOME_MESSAGE_TEXT = "¡Hola! 👋 Soy Nutri-Kick AI. Para poder ayudarte de la mejor manera y personalizar mis consejos, necesito conocerte un poco. **Por favor, haz clic en el icono del perfil (👤) en la esquina superior derecha para completar tus datos.** Una vez que tu perfil esté actualizado, podré calcular tus necesidades calóricas estimadas, tus objetivos de macronutrientes y ayudarte a registrar tus comidas. También puedes usar el micrófono 🎤 o la cámara 📸 para interactuar. ¿Comenzamos? 🚀";

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialDefaultDailyIntake: DailyIntake = {
  date: getTodayDateString(),
  caloriesConsumed: 0,
  proteinConsumed: 0,
  carbsConsumed: 0,
  fatsConsumed: 0,
};

const initialDefaultNutrientTargets: NutrientTargets = {
  calories: null,
  protein: null,
  carbs: null,
  fats: null,
};

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

const App: React.FC = () => {
  const isInitialLoad = useRef(true);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        // Ensure new fields exist if loading old profile structure
        if (!parsedProfile.dietaryApproaches) parsedProfile.dietaryApproaches = [];
        if (!parsedProfile.dietaryRestrictions) parsedProfile.dietaryRestrictions = [];
        delete parsedProfile.dietaryPreferencesAndRestrictions; // Remove old field
        return { ...initialDefaultUserProfile, ...parsedProfile };
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

  const [dailyIntake, setDailyIntake] = useState<DailyIntake>(() => {
    try {
      const storedIntake = localStorage.getItem(DAILY_INTAKE_STORAGE_KEY);
      if (storedIntake) {
        const parsedIntake: DailyIntake = JSON.parse(storedIntake);
        if (parsedIntake.date === getTodayDateString()) {
          return parsedIntake;
        }
      }
    } catch (error) { console.error("Error loading daily intake from localStorage:", error); }
    return { ...initialDefaultDailyIntake }; 
  });

  const [nutrientTargets, setNutrientTargets] = useState<NutrientTargets>(() => {
    try {
      const storedTargets = localStorage.getItem(NUTRIENT_TARGETS_STORAGE_KEY);
      if (storedTargets) {
        return JSON.parse(storedTargets);
      }
    } catch (error) { console.error("Error loading nutrient targets from localStorage:", error); }
    return { ...initialDefaultNutrientTargets };
  });
  
  const [currentBMR, setCurrentBMR] = useState<number | null>(null);
  const [currentTDEE, setCurrentTDEE] = useState<number | null>(null);

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
    const supabaseStatus = getSupabaseClientStatus();
    if (!supabaseStatus.clientInitialized) {
        console.error("App.tsx: Supabase client not initialized.", supabaseStatus.error);
        setDbStatus('error');
        setDbErrorDetails(supabaseStatus.detailedMessage || `Error fatal: El cliente Supabase no se pudo inicializar.`);
    } else {
        setDbStatus('ok');
        setDbErrorDetails(null);
    }

    if (dailyIntake.date !== getTodayDateString()) {
        console.log("Date changed, resetting daily intake.");
        setDailyIntake({ ...initialDefaultDailyIntake, date: getTodayDateString() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleProfileEditingComplete = useCallback(() => {
    setActiveTab('chat');
    setTimeout(() => chatContainerRef.current?.scrollTo(0, 0), 0);
  }, []);

  const handleProfileUpdate = useCallback(async (updatedProfileFromEditor: UserProfile, isMainUpdate: boolean) => {
    const oldProfile = userProfile; 
    let profileToSave = { ...updatedProfileFromEditor };

    if (profileToSave.isAthlete && profileToSave.sportsDiscipline === SportsDiscipline.Other && profileToSave.customSportsDiscipline?.trim()) {
      profileToSave.sportsDiscipline = profileToSave.customSportsDiscipline.trim();
    }
    profileToSave.customSportsDiscipline = (profileToSave.sportsDiscipline === SportsDiscipline.Other && profileToSave.customSportsDiscipline) 
                                            ? profileToSave.customSportsDiscipline 
                                            : '';


    if (isMainUpdate) {
        profileToSave.lastCheckInTimestamp = oldProfile.lastCheckInTimestamp; 
    } else { 
        let dailyCheckInFieldsActuallyModified = false;
        if (profileToSave.moodToday !== oldProfile.moodToday ||
            profileToSave.trainedToday !== oldProfile.trainedToday ||
            profileToSave.hadBreakfast !== oldProfile.hadBreakfast ||
            profileToSave.energyLevel !== oldProfile.energyLevel) {
              dailyCheckInFieldsActuallyModified = true;
        }
        
        if (dailyCheckInFieldsActuallyModified) {
            if (profileToSave.moodToday || profileToSave.trainedToday || profileToSave.hadBreakfast || profileToSave.energyLevel) {
                profileToSave.lastCheckInTimestamp = Date.now();
            } else { 
                profileToSave.lastCheckInTimestamp = undefined; 
            }
        } else {
            profileToSave.lastCheckInTimestamp = oldProfile.lastCheckInTimestamp;
        }
    }

    setUserProfile(profileToSave); 
    setError(null); 

    try {
      await saveUserProfileToSupabase(profileToSave);
    } catch (dbError) {
      console.error("Failed to save profile to Supabase:", dbError);
      const message = dbError instanceof Error ? dbError.message : "Error desconocido al guardar en base de datos.";
      setError(`Error al guardar perfil en la nube: ${message}. Tus cambios locales están guardados.`);
      setTimeout(() => setError(null), 7000);
    }
    
    if (isMainUpdate) {
        let bmr: number | null = null;
        let tdee: number | null = null;
        let activityLevelName = "No especificado";
        let activityFactor = 1.2; 
        const ageNum = parseInt(profileToSave.age);
        const weightNum = parseFloat(profileToSave.weight);
        const heightNum = parseInt(profileToSave.height);
        let calculationMessage = `¡Perfil de ${profileToSave.name || 'usuario'} actualizado! 🎉\n\n`;

        if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum) || ageNum <= 0 || weightNum <= 0 || heightNum <= 0) {
        calculationMessage += "Por favor, completa tu edad, peso y altura con valores válidos para calcular tus necesidades energéticas. 🙏\n\n";
        setCurrentBMR(null); setCurrentTDEE(null); setNutrientTargets(initialDefaultNutrientTargets);
        } else if (heightNum < 60) { 
        calculationMessage += "**¡Atención Especial por Estatura!** 📏\n";
        calculationMessage += "Debido a que la estatura ingresada es menor a 60 cm, los cálculos estándar de requerimientos calóricos pueden no ser precisos y no se realizarán. Te recomiendo consultar a un profesional de la salud o nutricionista para obtener una evaluación adecuada, especialmente si esta estatura es correcta. Si fue un error, por favor, corrígela en tu perfil.\n\n";
        setCurrentBMR(null); setCurrentTDEE(null); setNutrientTargets(initialDefaultNutrientTargets);
        } else if (ageNum < 18) { 
            calculationMessage += `Aquí tienes un resumen de tus necesidades estimadas:\n`;
            if (profileToSave.gender === Gender.Male) bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
            else if (profileToSave.gender === Gender.Female) bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;
            
            if (bmr && bmr > 0) {
                if (profileToSave.isAthlete) activityFactor = 1.5; else activityFactor = 1.4; 
                tdee = bmr * activityFactor;
            }
            calculationMessage += `*   **Metabolismo Basal (MB) Estimado:** ${bmr && bmr > 0 ? bmr.toFixed(0) : 'N/A'} kcal/día 🔥\n`;
            calculationMessage += `*   **Requerimiento Calórico Total Estimado (RCTE):** ${tdee && tdee > 0 ? tdee.toFixed(0) : 'N/A'} kcal/día 🎯\n\n`;
            calculationMessage += "**¡Atención Especial por Edad!** 🧑‍⚕️\n";
            calculationMessage += "Dado que eres menor de 18 años, es CRUCIAL que cualquier plan nutricional o cambio significativo en tu dieta o ejercicio sea supervisado de cerca por tus padres o tutores y un profesional de la salud (médico o nutricionista pediátrico/deportivo). Mis cálculos son solo estimaciones generales y no deben reemplazar el consejo profesional personalizado. ¡Tu salud y desarrollo son lo más importante!\n\n";
            setCurrentBMR(bmr); setCurrentTDEE(tdee);
            const targets = calculateMacronutrientTargets(profileToSave, tdee);
            setNutrientTargets(targets);
            if (targets.calories && targets.protein && targets.carbs && targets.fats) {
                calculationMessage += `Tus objetivos aproximados de macronutrientes diarios (que deben ser validados y ajustados por un profesional) podrían ser: Proteína: ${targets.protein.toFixed(0)}g, Carbohidratos: ${targets.carbs.toFixed(0)}g, Grasas: ${targets.fats.toFixed(0)}g.\n\n`;
            }
        } else if (profileToSave.gender === Gender.Male || profileToSave.gender === Gender.Female) {
        if (profileToSave.gender === Gender.Male) bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) + 5;
        else bmr = (10 * weightNum) + (6.25 * heightNum) - (5 * ageNum) - 161;

        if (profileToSave.isAthlete && profileToSave.trainingLoad) {
            switch (profileToSave.trainingLoad) { 
            case TrainingLoad.RestDay: activityFactor = 1.2; activityLevelName = "Día de Descanso 😴"; break;
            case TrainingLoad.LightTraining: activityFactor = 1.375; activityLevelName = "Entrenamiento Ligero 👟"; break;
            case TrainingLoad.ModerateTraining: activityFactor = 1.55; activityLevelName = "Entrenamiento Moderado 💪"; break;
            case TrainingLoad.IntenseTraining: activityFactor = 1.725; activityLevelName = "Entrenamiento Intenso 🔥"; break;
            case TrainingLoad.MatchDay: activityFactor = 1.9; activityLevelName = "Día de Partido 🏆"; break;
            default: activityFactor = 1.55; activityLevelName = "Actividad Moderada (Atleta)"; 
            }
        } else if (!profileToSave.isAthlete && profileToSave.trainingFrequency) { 
            switch (profileToSave.trainingFrequency) {
            case TrainingFrequency.NoneOrRarely: activityFactor = 1.3; activityLevelName = "Actividad Ligera (0-1 entrenamientos/sem) 🚶"; break;
            case TrainingFrequency.TwoToThree: activityFactor = 1.4; activityLevelName = "Actividad Ligera (2-3 entrenamientos/sem) 🚶‍♀️"; break; 
            case TrainingFrequency.FourTimes: activityFactor = 1.5; activityLevelName = "Actividad Moderada (4 entrenamientos/sem) 🏃"; break;
            case TrainingFrequency.FiveToSix: activityFactor = 1.7; activityLevelName = "Actividad Alta (5-6 entrenamientos/sem) 🏋️‍♀️"; break; 
            case TrainingFrequency.DailyOrMore: activityFactor = 1.9; activityLevelName = "Actividad Muy Alta (7+ entrenamientos/sem) 🚀"; break; 
            }
        }
        if (bmr) tdee = bmr * activityFactor;
        setCurrentBMR(bmr); setCurrentTDEE(tdee);
        const targets = calculateMacronutrientTargets(profileToSave, tdee);
        setNutrientTargets(targets);

        calculationMessage += `Aquí tienes un resumen de tus necesidades estimadas:\n`;
        calculationMessage += `*   **Metabolismo Basal (MB):** ${bmr ? bmr.toFixed(0) : 'N/A'} kcal/día 🔥\n`;
        calculationMessage += `*   **Requerimiento Calórico Total Estimado (RCTE):** ${tdee ? tdee.toFixed(0) : 'N/A'} kcal/día (basado en MB y tu actividad: ${activityLevelName})🎯\n`;
        if (targets.calories && targets.protein && targets.carbs && targets.fats) {
            calculationMessage += `*   **Objetivos de Macronutrientes:** Proteína: ~${targets.protein.toFixed(0)}g, Carbohidratos: ~${targets.carbs.toFixed(0)}g, Grasas: ~${targets.fats.toFixed(0)}g diarios.\n\n`;
        } else { calculationMessage += `\n`;}
        calculationMessage += `Considerando tu objetivo "${profileToSave.goals}", estos valores son el punto de partida. \n\n`;
        
        let goalSpecificAdvice = "";
        switch (profileToSave.goals) {
            case PersonalGoal.LoseWeightHealthy: goalSpecificAdvice = "Para 'Perder peso de forma saludable', usualmente se busca un déficit calórico moderado. ¿Te gustaría explorar estrategias?\n\n"; break;
            case PersonalGoal.GainMuscleImproveComposition: goalSpecificAdvice = `Para 'Aumentar masa muscular y mejorar composición corporal', un ligero superávit calórico y alcanzar tu objetivo de proteínas (~${targets.protein?.toFixed(0)}g) son claves. ¿Exploramos cómo?\n\n`; break;
            default: goalSpecificAdvice = `Para tu objetivo de '${profileToSave.goals}', podemos explorar estrategias. ¿Algún aspecto en particular?\n\n`; break;
        }
        calculationMessage += goalSpecificAdvice;
        } else {
        calculationMessage += "Para un cálculo más preciso, selecciona 'Masculino' o 'Femenino' en género.\n\n";
        setCurrentBMR(null); setCurrentTDEE(null); setNutrientTargets(initialDefaultNutrientTargets);
        }

        const newAiCalcMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: calculationMessage.trim(), timestamp: new Date() };
        setMessages(prev => {
        const filteredMessages = prev.filter(m => m.text !== INITIAL_WELCOME_MESSAGE_TEXT);
        const updatedMessages = [newAiCalcMessage, ...filteredMessages];
        if (activeTab === 'chat' || (filteredMessages.length === 0 && prev.length === 1 && prev[0].text === INITIAL_WELCOME_MESSAGE_TEXT)) {
            setTimeout(() => chatContainerRef.current?.scrollTo(0, 0), 0);
        }
        return updatedMessages;
        });
    } 
   
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [userProfile, activeTab]); 


  const processAiResponseWithPlaceholders = (
    baseText: string,
    mealEstimate?: EstimatedFoodIntake,
    updatedDailyIntake?: DailyIntake,
    currentTargets?: NutrientTargets,
    currentProfile?: UserProfile
  ): string => {
    let processedText = baseText;
    const todayIntake = updatedDailyIntake || dailyIntake;
    const targets = currentTargets || nutrientTargets;
    const profile = currentProfile || userProfile;

    if (mealEstimate) {
        processedText = processedText.replace(/\[LOGGED_FOOD_DESCRIPTION_PLACEHOLDER\]/g, mealEstimate.foodDescription);
        processedText = processedText.replace(/\[MEAL_CALORIES_ESTIMATED_PLACEHOLDER\]/g, mealEstimate.calories.toFixed(0));
        processedText = processedText.replace(/\[MEAL_PROTEIN_ESTIMATED_PLACEHOLDER\]/g, mealEstimate.protein.toFixed(0));
        processedText = processedText.replace(/\[MEAL_CARBS_ESTIMATED_PLACEHOLDER\]/g, mealEstimate.carbs.toFixed(0));
        processedText = processedText.replace(/\[MEAL_FATS_ESTIMATED_PLACEHOLDER\]/g, mealEstimate.fats.toFixed(0));
    } else { 
        processedText = processedText.replace(/Okay, he anotado tu.*?para esta comida:\n\n/s, ""); 
        processedText = processedText.replace(/\[LOGGED_FOOD_DESCRIPTION_PLACEHOLDER\]/g, "tu comida");
        processedText = processedText.replace(/\[MEAL_CALORIES_ESTIMATED_PLACEHOLDER\]/g, "N/A");
        processedText = processedText.replace(/\[MEAL_PROTEIN_ESTIMATED_PLACEHOLDER\]/g, "N/A");
        processedText = processedText.replace(/\[MEAL_CARBS_ESTIMATED_PLACEHOLDER\]/g, "N/A");
        processedText = processedText.replace(/\[MEAL_FATS_ESTIMATED_PLACEHOLDER\]/g, "N/A");
    }

    processedText = processedText.replace(/\[DAILY_CALORIES_CONSUMED_PLACEHOLDER\]/g, todayIntake.caloriesConsumed.toFixed(0));
    processedText = processedText.replace(/\[TARGET_CALORIES_PLACEHOLDER\]/g, targets.calories?.toFixed(0) || 'N/A');
    processedText = processedText.replace(/\[DAILY_PROTEIN_CONSUMED_PLACEHOLDER\]/g, todayIntake.proteinConsumed.toFixed(0));
    processedText = processedText.replace(/\[TARGET_PROTEIN_PLACEHOLDER\]/g, targets.protein?.toFixed(0) || 'N/A');
    processedText = processedText.replace(/\[DAILY_CARBS_CONSUMED_PLACEHOLDER\]/g, todayIntake.carbsConsumed.toFixed(0));
    processedText = processedText.replace(/\[TARGET_CARBS_PLACEHOLDER\]/g, targets.carbs?.toFixed(0) || 'N/A');
    processedText = processedText.replace(/\[DAILY_FATS_CONSUMED_PLACEHOLDER\]/g, todayIntake.fatsConsumed.toFixed(0));
    processedText = processedText.replace(/\[TARGET_FATS_PLACEHOLDER\]/g, targets.fats?.toFixed(0) || 'N/A');

    const formatRemainingMessage = (consumed: number, target: number | null, unit: string) => {
        if (target === null || target <= 0) return "objetivo no establecido.";
        const remaining = target - consumed;
        if (remaining > 0) return `${remaining.toFixed(0)}${unit} por consumir.`;
        return `${Math.abs(remaining).toFixed(0)}${unit} sobre tu objetivo.`;
    };

    processedText = processedText.replace(/\[CALORIES_REMAINING_MESSAGE_PLACEHOLDER\]/g, formatRemainingMessage(todayIntake.caloriesConsumed, targets.calories, 'kcal'));
    processedText = processedText.replace(/\[PROTEIN_REMAINING_MESSAGE_PLACEHOLDER\]/g, formatRemainingMessage(todayIntake.proteinConsumed, targets.protein, 'g'));
    processedText = processedText.replace(/\[CARBS_REMAINING_MESSAGE_PLACEHOLDER\]/g, formatRemainingMessage(todayIntake.carbsConsumed, targets.carbs, 'g'));
    processedText = processedText.replace(/\[FATS_REMAINING_MESSAGE_PLACEHOLDER\]/g, formatRemainingMessage(todayIntake.fatsConsumed, targets.fats, 'g'));
    
    let muscleGainReminder = "";
    if ((profile.goals === PersonalGoal.GainMuscleImproveComposition || (profile.athleticGoals || []).includes(AthleticGoalOptions.MuscleGainPower)) && targets.protein) {
        let idealWeightInfo = "";
        const weightKg = parseFloat(profile.weight);
        const heightCm = parseInt(profile.height);
        if (heightCm > 0 && weightKg > 0) {
            const ibwData = calculateIdealBodyWeightRange(heightCm);
            if (ibwData) {
                idealWeightInfo = ` (idealmente, alrededor de ${ibwData.ideal.toFixed(1)} kg)`;
            }
        }
        muscleGainReminder = `Dado que uno de tus objetivos es ganar masa muscular, es clave alcanzar tu meta de proteínas de aproximadamente ${targets.protein.toFixed(0)}g diarios. Esto suele equivaler a 1.6-2.2 gramos de proteína por kilogramo de tu peso corporal${idealWeightInfo}. ¡Asegúrate de que tus comidas contribuyan a este objetivo! `;
    }
    processedText = processedText.replace(/\[MUSCLE_GAIN_PROTEIN_REMINDER_PLACEHOLDER\]/g, muscleGainReminder);
    
    return processedText;
};

  const handleSendMessage = useCallback(async (
    userInput: string | null,
    inputMethod: 'text' | 'voice' | 'image' = 'text',
    audioData?: { base64Data: string; mimeType: string },
    imageData?: { base64Data: string; mimeType: string; dataUri: string }
  ) => {
    if (!userInput?.trim() && inputMethod === 'text' && !imageData) return;
    setLastInputMethod(inputMethod);

    const displayUserText = imageData ? imageData.dataUri : (userInput || (audioData ? "🎤 Audio enviado..." : ""));
    const newUserMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: displayUserText, timestamp: new Date() };
    setMessages(prev => {
        const updatedMessages = [...prev, newUserMessage];
        setTimeout(() => document.getElementById(`message-${newUserMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
    });
    setIsLoading(true); setError(null); 

    try {
      const aiResponse: GeminiServiceResponse = await generateNutriKickResponse(
        userInput, userProfile, audioData, imageData ? { base64Data: imageData.base64Data, mimeType: imageData.mimeType } : undefined,
        dailyIntake, nutrientTargets, currentBMR, currentTDEE
      );
      
      let finalAiText = aiResponse.text;
      let updatedIntake = dailyIntake;

      if (aiResponse.estimatedIntake) {
        const meal = aiResponse.estimatedIntake;
        updatedIntake = {
            ...dailyIntake,
            caloriesConsumed: dailyIntake.caloriesConsumed + meal.calories,
            proteinConsumed: dailyIntake.proteinConsumed + meal.protein,
            carbsConsumed: dailyIntake.carbsConsumed + meal.carbs,
            fatsConsumed: dailyIntake.fatsConsumed + meal.fats,
        };
        setDailyIntake(updatedIntake); 
        finalAiText = processAiResponseWithPlaceholders(aiResponse.text, meal, updatedIntake, nutrientTargets, userProfile);
      } else {
        finalAiText = processAiResponseWithPlaceholders(aiResponse.text, undefined, dailyIntake, nutrientTargets, userProfile);
      }
      
      const newAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: finalAiText, timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newAiMessage];
        setTimeout(() => document.getElementById(`message-${newAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });

    } catch (err) {
      console.error("Error fetching AI response:", err);
      const errorMessageText = err instanceof Error ? err.message : "Ocurrió un error al contactar a Nutri-Kick AI.";
      setError(errorMessageText);
      const errorMsg = `Lo siento, tuve problemas: ${errorMessageText}. Inténtalo más tarde. 🛠️`;
      const newErrorAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: errorMsg, timestamp: new Date() };
      setMessages(prev => {
        const updatedMessages = [...prev, newErrorAiMessage];
        setTimeout(() => document.getElementById(`message-${newErrorAiMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return updatedMessages;
      });
      setTimeout(() => setError(null), 7000);
    } finally { setIsLoading(false); }
  }, [userProfile, dailyIntake, nutrientTargets, currentBMR, currentTDEE, processAiResponseWithPlaceholders]);


  const handleSendTextMessage = useCallback((text: string) => {
    handleSendMessage(text, 'text');
  }, [handleSendMessage]);

  const handleSendAudioMessage = useCallback(async (base64Audio: string, mimeType: string) => {
    handleSendMessage(null, 'voice', { base64Data: base64Audio, mimeType });
  }, [handleSendMessage]);

  const handleSendImageMessage = useCallback(async (imageBase64DataUri: string) => {
    const mimeType = dataURItoMIME(imageBase64DataUri);
    const base64Data = imageBase64DataUri.split(',')[1];
    const promptForImage = chatInputRef.current?.value.trim() || "Analiza la imagen que he enviado. Si es comida, intenta estimar sus nutrientes para mi registro diario.";
    if (chatInputRef.current) chatInputRef.current.value = ""; 
    
    handleSendMessage(promptForImage, 'image', undefined, { base64Data, mimeType, dataUri: imageBase64DataUri });
  }, [handleSendMessage, chatInputRef]);


  const handleToggleRecording = useCallback(async () => {
    setMicPermissionError(null);
    if (isRecording) {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      if (typeof MediaRecorder === 'undefined') { setMicPermissionError("Tu navegador no soporta grabación de audio. 😥"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const supportedMimeType = getSupportedMimeType();
        actualMimeTypeRef.current = supportedMimeType || 'audio/webm';
        const options = supportedMimeType ? { mimeType: supportedMimeType } : {};
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorderRef.current.onstop = async () => {
          const finalMimeType = mediaRecorderRef.current?.mimeType || actualMimeTypeRef.current;
          if (audioChunksRef.current.length === 0) { console.warn("No audio chunks recorded."); stream.getTracks().forEach(t => t.stop()); setIsRecording(false); return; }
          const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
          audioChunksRef.current = [];
          if (audioBlob.size === 0) { console.warn("Audio blob is empty."); stream.getTracks().forEach(t => t.stop()); setIsRecording(false); return; }
          try {
            const base64Audio = await blobToBase64(audioBlob);
            handleSendAudioMessage(base64Audio, finalMimeType);
          } catch (e) { console.error("Blob to base64 error:", e); setError("Error procesando audio."); setTimeout(() => setError(null), 5000); }
          stream.getTracks().forEach(track => track.stop()); setIsRecording(false); chatInputRef.current?.focus();
        };
        mediaRecorderRef.current.onerror = (event: Event) => { console.error("MediaRecorder error:", event); setMicPermissionError("Error durante la grabación."); setIsRecording(false); stream.getTracks().forEach(t => t.stop()); chatInputRef.current?.focus(); };
        mediaRecorderRef.current.start(); setIsRecording(true); if (chatInputRef.current) chatInputRef.current.value = "";
      } catch (err: any) { 
        console.error("getUserMedia error:", err);
        if (err.name === 'NotAllowedError') setMicPermissionError("Permiso de micrófono denegado. Actívalo en los ajustes del navegador.");
        else if (err.name === 'NotFoundError') setMicPermissionError("No se encontró un micrófono. Conecta uno y reintenta.");
        else setMicPermissionError("Error al acceder al micrófono.");
        setIsRecording(false); 
      }
    }
  }, [isRecording, handleSendAudioMessage]);

  const handleOpenCamera = useCallback(async () => {
    setCameraError(null);
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') { setCameraError("Tu navegador no soporta acceso a la cámara."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      videoStreamRef.current = stream; setIsCameraOpen(true);
    } catch (err: any) { 
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError') setCameraError("Permiso de cámara denegado. Actívalo en los ajustes.");
      else if (err.name === 'NotFoundError') setCameraError("No se encontró una cámara.");
      else setCameraError("Error al acceder a la cámara.");
      setIsCameraOpen(false);
    }
  }, []);
  
  useEffect(() => {
    if (isCameraOpen && videoStreamRef.current && videoElementRef.current) {
        videoElementRef.current.srcObject = videoStreamRef.current;
        videoElementRef.current.play().catch(e => { console.error("Video play error:", e); setCameraError("Error al iniciar cámara."); });
    } else if (!isCameraOpen && videoElementRef.current) { videoElementRef.current.srcObject = null; }
  }, [isCameraOpen]); 


  const handleCloseCamera = useCallback(() => {
    if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(track => track.stop());
    videoStreamRef.current = null; setIsCameraOpen(false);
  }, []);

  const handleCaptureImage = useCallback(() => {
    if (videoElementRef.current && canvasElementRef.current && videoElementRef.current.readyState >= videoElementRef.current.HAVE_METADATA && videoElementRef.current.videoWidth > 0) {
      const video = videoElementRef.current; const canvas = canvasElementRef.current;
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        if (window.getComputedStyle(video).transform.includes('matrix(-1')) { context.translate(canvas.width, 0); context.scale(-1, 1); }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUri = canvas.toDataURL('image/jpeg', 0.85); 
        handleSendImageMessage(dataUri);
      } else { setCameraError("Error procesando imagen."); setTimeout(() => setCameraError(null), 5000); }
    } else { setCameraError("No se pudo capturar. Video no listo."); setTimeout(() => setCameraError(null), 5000); }
    handleCloseCamera(); chatInputRef.current?.focus();
  }, [handleCloseCamera, handleSendImageMessage, chatInputRef]);


  useEffect(() => { 
    return () => {
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
      videoStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []); 

  useEffect(() => { 
    if (isInitialLoad.current && messages.length === 0) {
      const welcomeMsg: Message = { id: crypto.randomUUID(), sender: 'ai', text: INITIAL_WELCOME_MESSAGE_TEXT, timestamp: new Date() };
      setMessages([welcomeMsg]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]); 

  useEffect(() => {
    if (isInitialLoad.current) {
        isInitialLoad.current = false; 
        return; 
    }
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
      if (messages.length > 0) localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
      else localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
      localStorage.setItem(DAILY_INTAKE_STORAGE_KEY, JSON.stringify(dailyIntake));
      localStorage.setItem(NUTRIENT_TARGETS_STORAGE_KEY, JSON.stringify(nutrientTargets));
    } catch (error) { console.error("Error saving to localStorage:", error); }
  }, [userProfile, messages, dailyIntake, nutrientTargets]);


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
                <div className="mt-1 whitespace-pre-line text-xs">{dbErrorDetails}</div>
                 <p className="mt-2 text-xs">Consulta la consola del desarrollador (F12) para más detalles.</p>
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
          {activeTab === 'profile' && ( 
            <ProfileEditor 
              initialProfile={userProfile} 
              onUpdateProfile={handleProfileUpdate}
              onEditingComplete={handleProfileEditingComplete}
              isActive={activeTab === 'profile'} 
            /> 
          )}
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
