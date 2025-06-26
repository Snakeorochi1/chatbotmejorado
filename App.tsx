

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserProfile, Message, Gender, SportsDiscipline, TrainingLoad, TrainingFrequency, PersonalGoal, DailyIntake, NutrientTargets, EstimatedFoodIntake, SupabaseSession, AthleticGoalOptions } from './types';
import { generateNutriKickResponse, GeminiServiceResponse } from './services/geminiService';
import { 
  saveUserProfileToSupabase, 
  loadUserProfileFromSupabase,
  getSupabaseClientStatus,
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUserSession,
  onAuthStateChange as supabaseOnAuthStateChange
} from './services/supabaseService';
import { ProfileEditor } from './components/ProfileEditor';
import { ChatWindow } from './components/ChatWindow';
import { AuthForm } from './components/AuthForm';
import { AdminPanel } from './components/AdminPanel';
import { AboutPanel } from './components/AboutPanel'; // Import AboutPanel
import { DISCLAIMER_TEXT, ADMIN_EMAILS } from './constants';
import { NutriKickIcon, ProfileIcon, ChatIcon, LogoutIcon, LoginIcon, CloseIcon, AdminIcon, AboutIcon } from './components/Icons'; // Use NutriKickIcon, Added AboutIcon
import { calculateIdealBodyWeightRange, calculateMacronutrientTargets } from './nutritionCalculators';
import { LoadingSpinner } from './components/LoadingSpinner';

const USER_PROFILE_STORAGE_KEY = 'nutrikick_userProfile_v3_auth'; 
const CHAT_MESSAGES_STORAGE_KEY_PREFIX = 'nutrikick_chatMessages_v3_feedback_'; 
const GUEST_CHAT_MESSAGES_STORAGE_KEY = 'nutrikick_chatMessages_guest_v2_feedback_'; 
const DAILY_INTAKE_STORAGE_KEY_PREFIX = 'nutrikick_dailyIntake_v2_'; 
const NUTRIENT_TARGETS_STORAGE_KEY_PREFIX = 'nutrikick_nutrientTargets_v2_'; 


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
  dietaryApproaches: [], 
  dietaryRestrictions: [], 
  currentSupplementUsage: "Prefiero no decirlo",
  supplementInterestOrUsageDetails: '',
  wellnessFocusAreas: [],
  moodToday: '',
  trainedToday: '',
  hadBreakfast: '',
  energyLevel: '',
  lastCheckInTimestamp: undefined,
};

const GUEST_INITIAL_WELCOME_MESSAGE_TEXT = "¡Hola! 👋 Soy Nutri-Kick AI. Estás navegando como invitado/a. Puedo ofrecerte información general sobre nutrición, fitness y hábitos saludables. Para un análisis personalizado, registrar tus comidas con la cámara 📸, guardar tu progreso y obtener metas específicas, ¡te invito a crear una cuenta gratuita o iniciar sesión! ¿Cómo puedo ayudarte hoy?";
const AUTH_WELCOME_MESSAGE_TEXT_NO_PROFILE = "¡Bienvenido/a a Nutri-Kick AI! Parece que es tu primera vez aquí o aún no has completado tu perfil. **Haz clic en el icono del perfil (👤) para configurarlo** y que pueda ayudarte mejor. 🚀";


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

const getUserStorageKey = (prefix: string, userId?: string | null) => userId ? `${prefix}${userId}` : null;


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

type ActiveTab = 'chat' | 'profile' | 'admin' | 'about'; // Added 'about'

const App: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<SupabaseSession | null>(null);
  const [isGuestSession, setIsGuestSession] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>({ ...initialDefaultUserProfile });
  const [messages, setMessages] = useState<Message[]>([]);
  const [dailyIntake, setDailyIntake] = useState<DailyIntake>({ ...initialDefaultDailyIntake });
  const [nutrientTargets, setNutrientTargets] = useState<NutrientTargets>({ ...initialDefaultNutrientTargets });
  
  const [currentBMR, setCurrentBMR] = useState<number | null>(null);
  const [currentTDEE, setCurrentTDEE] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); 
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat'); 

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
  
  const isProfileConsideredEmpty = (profile: UserProfile): boolean => {
    return !profile.name && !profile.age && !profile.weight && !profile.height && !profile.gender;
  };

  useEffect(() => {
    const supabaseStatus = getSupabaseClientStatus();
    if (!supabaseStatus.clientInitialized) {
        setDbStatus('error');
        setDbErrorDetails(supabaseStatus.detailedMessage || `Error fatal: El cliente Supabase no se pudo inicializar.`);
    } else {
        setDbStatus('ok');
        setDbErrorDetails(null);
    }
  }, []);

  useEffect(() => {
    if (dbStatus !== 'ok') return;

    setAuthLoading(true);
    getCurrentUserSession().then(session => {
      if (session) {
        setCurrentSession(session);
        setIsGuestSession(false);
        setIsAdmin(ADMIN_EMAILS.includes(session.user.email || ''));
      } else {
        setIsGuestSession(true); 
        setIsAdmin(false);
        const storedGuestMessages = localStorage.getItem(GUEST_CHAT_MESSAGES_STORAGE_KEY);
        if (storedGuestMessages) {
            const parsedMessages: Message[] = JSON.parse(storedGuestMessages);
            setMessages(parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        } else {
            setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: GUEST_INITIAL_WELCOME_MESSAGE_TEXT, timestamp: new Date(), feedback: null }]);
        }
      }
      setAuthLoading(false);
    });

    const unsubscribe = supabaseOnAuthStateChange((session) => {
      setCurrentSession(session);
      if (session) { 
        setIsGuestSession(false);
        setShowAuthModal(false);
        setIsAdmin(ADMIN_EMAILS.includes(session.user.email || ''));
        localStorage.removeItem(GUEST_CHAT_MESSAGES_STORAGE_KEY);
        setMessages([]); 
        setUserProfile({ ...initialDefaultUserProfile });
        setDailyIntake({ ...initialDefaultDailyIntake });
        setNutrientTargets({ ...initialDefaultNutrientTargets });
        setCurrentBMR(null);
        setCurrentTDEE(null);
      } else { 
        setIsGuestSession(true);
        setIsAdmin(false);
        setUserProfile({ ...initialDefaultUserProfile });
        setDailyIntake({ ...initialDefaultDailyIntake });
        setNutrientTargets({ ...initialDefaultNutrientTargets });
        setCurrentBMR(null);
        setCurrentTDEE(null);
        setActiveTab('chat');
        setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: GUEST_INITIAL_WELCOME_MESSAGE_TEXT, timestamp: new Date(), feedback: null }]);
      }
    });
    return () => unsubscribe();
  }, [dbStatus]);


  useEffect(() => {
    if (isGuestSession || !currentSession?.user?.id) return;

    const userId = currentSession.user.id;
    loadUserProfileFromSupabase(userId).then(profileFromDb => {
      if (profileFromDb) {
        setUserProfile(profileFromDb);
      } else {
        setUserProfile(prev => ({ ...initialDefaultUserProfile, email: currentSession.user.email || '' }));
      }
    });

    try {
      const chatKey = getUserStorageKey(CHAT_MESSAGES_STORAGE_KEY_PREFIX, userId);
      const intakeKey = getUserStorageKey(DAILY_INTAKE_STORAGE_KEY_PREFIX, userId);
      const targetsKey = getUserStorageKey(NUTRIENT_TARGETS_STORAGE_KEY_PREFIX, userId);

      if (chatKey) {
        const storedMessages = localStorage.getItem(chatKey);
        if (storedMessages) {
          const parsedMessages: Message[] = JSON.parse(storedMessages);
          setMessages(parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp), feedback: msg.feedback || null })));
        } else {
           setMessages([]);
        }
      }
      
      if (intakeKey) {
        const storedIntake = localStorage.getItem(intakeKey);
        if (storedIntake) {
          const parsedIntake: DailyIntake = JSON.parse(storedIntake);
          if (parsedIntake.date === getTodayDateString()) setDailyIntake(parsedIntake);
          else setDailyIntake({ ...initialDefaultDailyIntake, date: getTodayDateString() });
        } else {
          setDailyIntake({ ...initialDefaultDailyIntake, date: getTodayDateString() });
        }
      }

      if (targetsKey) {
        const storedTargets = localStorage.getItem(targetsKey);
        if (storedTargets) setNutrientTargets(JSON.parse(storedTargets));
        else setNutrientTargets({ ...initialDefaultNutrientTargets });
      }

    } catch (error) { console.error("Error loading user-specific data from localStorage:", error); }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, isGuestSession, authLoading]); 
  
  useEffect(() => {
    if (!isGuestSession && currentSession && messages.length === 0 && !authLoading) {
      if (isProfileConsideredEmpty(userProfile)) {
        setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: AUTH_WELCOME_MESSAGE_TEXT_NO_PROFILE, timestamp: new Date(), feedback: null }]);
      }
    }
  }, [currentSession, userProfile, messages.length, authLoading, isGuestSession]);


  useEffect(() => {
    if (isGuestSession) {
        if (messages.length > 0) {
            localStorage.setItem(GUEST_CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
        } else {
            localStorage.removeItem(GUEST_CHAT_MESSAGES_STORAGE_KEY);
        }
        return;
    }

    if (!currentSession?.user?.id) return;
    const userId = currentSession.user.id;

    try {
      const chatKey = getUserStorageKey(CHAT_MESSAGES_STORAGE_KEY_PREFIX, userId);
      const intakeKey = getUserStorageKey(DAILY_INTAKE_STORAGE_KEY_PREFIX, userId);
      const targetsKey = getUserStorageKey(NUTRIENT_TARGETS_STORAGE_KEY_PREFIX, userId);

      if (chatKey && messages.length > 0) localStorage.setItem(chatKey, JSON.stringify(messages));
      else if (chatKey) localStorage.removeItem(chatKey); 
      
      if (intakeKey) localStorage.setItem(intakeKey, JSON.stringify(dailyIntake));
      if (targetsKey) localStorage.setItem(targetsKey, JSON.stringify(nutrientTargets));

    } catch (error) { console.error("Error saving user-specific data to localStorage:", error); }
  }, [userProfile, messages, dailyIntake, nutrientTargets, currentSession, isGuestSession]);


  const handleProfileEditingComplete = useCallback(() => {
    setActiveTab('chat');
  }, []);

  const handleProfileUpdate = useCallback(async (updatedProfileFromEditor: UserProfile, isMainUpdate: boolean) => {
    if (isGuestSession || !currentSession?.user?.id) {
      setError("Debes iniciar sesión para guardar tu perfil.");
      setTimeout(() => setError(null), 5000);
      return;
    }
    const userId = currentSession.user.id;
    const oldProfile = userProfile; 
    let profileToSave = { ...updatedProfileFromEditor };

    if (!profileToSave.email && currentSession.user.email) {
        profileToSave.email = currentSession.user.email;
    }

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
            profileToSave.energyLevel !== oldProfile.energyLevel ||
            profileToSave.sleepHours !== oldProfile.sleepHours || 
            profileToSave.sleepQuality !== oldProfile.sleepQuality
           ) {
              dailyCheckInFieldsActuallyModified = true;
        }
        
        if (dailyCheckInFieldsActuallyModified) {
            if (profileToSave.moodToday || profileToSave.trainedToday || profileToSave.hadBreakfast || profileToSave.energyLevel || profileToSave.sleepHours || profileToSave.sleepQuality) {
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
      await saveUserProfileToSupabase(profileToSave, userId);
      setSuccessMessage("Perfil guardado en la nube con éxito. 👍");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (dbError) {
      console.error("Failed to save profile to Supabase:", dbError);
      const message = dbError instanceof Error ? dbError.message : "Error desconocido al guardar en base de datos.";
      setError(`Error al guardar perfil en la nube: ${message}. Tus cambios locales están guardados, pero no en la nube.`);
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
                if (profileToSave.isAthlete) activityFactor = 1.5; 
                else activityFactor = 1.4; 
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
                case TrainingFrequency.NoneOrRarely: activityFactor = 1.2; activityLevelName = "Sedentario (poco o ningún ejercicio) 🛋️"; break;
                case TrainingFrequency.TwoToThree: activityFactor = 1.375; activityLevelName = "Ejercicio Ligero (2-3 días/sem) 🚶"; break;
                case TrainingFrequency.FourTimes: activityFactor = 1.4625; activityLevelName = "Ejercicio Moderado (4 días/sem) 🏃"; break; 
                case TrainingFrequency.FiveToSix: activityFactor = 1.55; activityLevelName = "Ejercicio Moderado (5-6 días/sem) 🏋️"; break;
                case TrainingFrequency.DailyOrMore: activityFactor = 1.725; activityLevelName = "Ejercicio Intenso (diario o más) ⚡"; break;
                default: activityFactor = 1.375; activityLevelName = "Actividad Ligera (No Atleta)"; 
            }
        }

        if (bmr && bmr > 0) {
            tdee = bmr * activityFactor;
            calculationMessage += `Aquí tienes un resumen de tus necesidades estimadas, basado en tu actividad como ${activityLevelName.toLowerCase()}:\n`;
            calculationMessage += `*   **Metabolismo Basal (MB) Estimado:** ${bmr.toFixed(0)} kcal/día 🔥\n`;
            calculationMessage += `*   **Requerimiento Calórico Total Estimado (RCTE):** ${tdee.toFixed(0)} kcal/día 🎯\n\n`;
            setCurrentBMR(bmr); setCurrentTDEE(tdee);

            const targets = calculateMacronutrientTargets(profileToSave, tdee);
            setNutrientTargets(targets);
            if (targets.calories && targets.protein && targets.carbs && targets.fats) {
                calculationMessage += `Tus objetivos aproximados de macronutrientes diarios son: Proteína: ${targets.protein.toFixed(0)}g, Carbohidratos: ${targets.carbs.toFixed(0)}g, Grasas: ${targets.fats.toFixed(0)}g.\n\n`;
            }
        } else {
            calculationMessage += "No se pudo calcular el MB con los datos proporcionados.\n\n";
            setCurrentBMR(null); setCurrentTDEE(null); setNutrientTargets(initialDefaultNutrientTargets);
        }
        calculationMessage += `\nTe recomiendo que un profesional valide estos números y te ayude a crear un plan específico. Estoy aquí para darte ideas generales. ¿Qué te gustaría explorar ahora?`;
        } 
        
        if (calculationMessage.trim() !== `¡Perfil de ${profileToSave.name || 'usuario'} actualizado! 🎉\n\n`.trim()) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'ai', text: calculationMessage, timestamp: new Date(), feedback: null }]);
        }
    }
  }, [userProfile, currentSession, isGuestSession, handleProfileEditingComplete]); // Added handleProfileEditingComplete
  

  const handleClearLocalStorage = () => {
    if (confirm("¿Estás seguro de que quieres borrar tu historial de chat y registro de comidas de este navegador? Tu perfil guardado en la nube no se verá afectado.")) {
      if (isGuestSession) {
          localStorage.removeItem(GUEST_CHAT_MESSAGES_STORAGE_KEY);
          setMessages([{ id: crypto.randomUUID(), sender: 'ai', text: GUEST_INITIAL_WELCOME_MESSAGE_TEXT, timestamp: new Date(), feedback: null }]);
      } else if (currentSession?.user?.id) {
          const userId = currentSession.user.id;
          const chatKey = getUserStorageKey(CHAT_MESSAGES_STORAGE_KEY_PREFIX, userId);
          const intakeKey = getUserStorageKey(DAILY_INTAKE_STORAGE_KEY_PREFIX, userId);
          const targetsKey = getUserStorageKey(NUTRIENT_TARGETS_STORAGE_KEY_PREFIX, userId);
          
          if(chatKey) localStorage.removeItem(chatKey);
          if(intakeKey) localStorage.removeItem(intakeKey);
          if(targetsKey) localStorage.removeItem(targetsKey);

          setMessages(isProfileConsideredEmpty(userProfile) ? [{ id: crypto.randomUUID(), sender: 'ai', text: AUTH_WELCOME_MESSAGE_TEXT_NO_PROFILE, timestamp: new Date(), feedback: null }] : []);
          setDailyIntake({ ...initialDefaultDailyIntake, date: getTodayDateString() });
          if (!isProfileConsideredEmpty(userProfile) && currentTDEE) {
            setNutrientTargets(calculateMacronutrientTargets(userProfile, currentTDEE));
          } else {
            setNutrientTargets({...initialDefaultNutrientTargets});
          }
          alert("Datos locales borrados.");
      }
    }
  };

  const handleMessageFeedback = useCallback((messageId: string, feedbackValue: 'up' | 'down') => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === messageId 
        ? { ...msg, feedback: msg.feedback === feedbackValue ? null : feedbackValue } 
        : msg
      )
    );
  }, []);

  const handleSendMessage = useCallback(async (userInput: string, imageInput?: {base64Data: string, mimeType: string}) => {
    setError(null);
    setIsLoading(true);
    setLastInputMethod(imageInput ? 'image' : (userInput.startsWith("(Audio") ? 'voice' : 'text')); 

    const userMessageText = imageInput ? (userInput || "Imagen adjunta") : userInput;
    const newUserMessage: Message = { id: crypto.randomUUID(), sender: 'user', text: userMessageText, timestamp: new Date(), feedback: null };
    if (imageInput) { 
        newUserMessage.text = `data:${imageInput.mimeType};base64,${imageInput.base64Data}`;
    }
    setMessages(prev => [...prev, newUserMessage]);
    
    let geminiResponse: GeminiServiceResponse | null = null;
    try {
      geminiResponse = await generateNutriKickResponse(
        userInput, 
        userProfile, 
        undefined, 
        imageInput, 
        dailyIntake, 
        nutrientTargets, 
        currentBMR, 
        currentTDEE,
        isGuestSession
      );

      if (geminiResponse?.estimatedIntake && !isGuestSession && currentSession?.user?.id) {
        const intake = geminiResponse.estimatedIntake;
        setDailyIntake(prev => ({
          ...prev,
          caloriesConsumed: prev.caloriesConsumed + intake.calories,
          proteinConsumed: prev.proteinConsumed + intake.protein,
          carbsConsumed: prev.carbsConsumed + intake.carbs,
          fatsConsumed: prev.fatsConsumed + intake.fats,
        }));
      }

    } catch (apiError: any) {
      console.error("Error from Gemini service:", apiError);
      setError(apiError.message || "Error al comunicarse con la IA. Intenta de nuevo.");
      geminiResponse = { text: `Lo siento, tuve un problema al procesar tu solicitud: ${apiError.message}` };
    } finally {
      setIsLoading(false);
      if (geminiResponse) {
        const aiMessageText = geminiResponse.text;
        
        let processedText = aiMessageText;
        if (!isGuestSession && dailyIntake && nutrientTargets) {
            const currentCalories = dailyIntake.caloriesConsumed + (geminiResponse.estimatedIntake?.calories || 0);
            const currentProtein = dailyIntake.proteinConsumed + (geminiResponse.estimatedIntake?.protein || 0);
            const currentCarbs = dailyIntake.carbsConsumed + (geminiResponse.estimatedIntake?.carbs || 0);
            const currentFats = dailyIntake.fatsConsumed + (geminiResponse.estimatedIntake?.fats || 0);

            processedText = processedText
                .replace(/\[DAILY_CALORIES_CONSUMED_PLACEHOLDER\]/g, currentCalories.toFixed(0))
                .replace(/\[TARGET_CALORIES_PLACEHOLDER\]/g, nutrientTargets.calories?.toFixed(0) || 'N/A')
                .replace(/\[DAILY_PROTEIN_CONSUMED_PLACEHOLDER\]/g, currentProtein.toFixed(0))
                .replace(/\[TARGET_PROTEIN_PLACEHOLDER\]/g, nutrientTargets.protein?.toFixed(0) || 'N/A')
                .replace(/\[DAILY_CARBS_CONSUMED_PLACEHOLDER\]/g, currentCarbs.toFixed(0))
                .replace(/\[TARGET_CARBS_PLACEHOLDER\]/g, nutrientTargets.carbs?.toFixed(0) || 'N/A')
                .replace(/\[DAILY_FATS_CONSUMED_PLACEHOLDER\]/g, currentFats.toFixed(0))
                .replace(/\[TARGET_FATS_PLACEHOLDER\]/g, nutrientTargets.fats?.toFixed(0) || 'N/A');

            const caloriesRemaining = (nutrientTargets.calories || 0) - currentCalories;
            const proteinRemaining = (nutrientTargets.protein || 0) - currentProtein;
            const carbsRemaining = (nutrientTargets.carbs || 0) - currentCarbs;
            const fatsRemaining = (nutrientTargets.fats || 0) - currentFats;

            processedText = processedText
                .replace(/\[CALORIES_REMAINING_MESSAGE_PLACEHOLDER\]/g, caloriesRemaining >= 0 ? `Te quedan ${caloriesRemaining.toFixed(0)} kcal.` : `Has superado tu objetivo calórico por ${Math.abs(caloriesRemaining).toFixed(0)} kcal.`)
                .replace(/\[PROTEIN_REMAINING_MESSAGE_PLACEHOLDER\]/g, proteinRemaining >= 0 ? `Te quedan ${proteinRemaining.toFixed(0)}g de proteína.` : `Has superado tu objetivo de proteína por ${Math.abs(proteinRemaining).toFixed(0)}g.`)
                .replace(/\[CARBS_REMAINING_MESSAGE_PLACEHOLDER\]/g, carbsRemaining >= 0 ? `Te quedan ${carbsRemaining.toFixed(0)}g de carbohidratos.` : `Has superado tu objetivo de carbohidratos por ${Math.abs(carbsRemaining).toFixed(0)}g.`)
                .replace(/\[FATS_REMAINING_MESSAGE_PLACEHOLDER\]/g, fatsRemaining >= 0 ? `Te quedan ${fatsRemaining.toFixed(0)}g de grasa.` : `Has superado tu objetivo de grasa por ${Math.abs(fatsRemaining).toFixed(0)}g.`);
            
            let proteinReminder = "";
            if (userProfile.goals === PersonalGoal.GainMuscleImproveComposition || (userProfile.isAthlete && userProfile.athleticGoals?.includes(AthleticGoalOptions.MuscleGainPower))) {
                if (nutrientTargets.protein && currentProtein < nutrientTargets.protein * 0.8) {
                    proteinReminder = "Recuerda que para ganar músculo es importante alcanzar tu objetivo de proteínas. ¡Sigue así!";
                } else if (nutrientTargets.protein && currentProtein >= nutrientTargets.protein) {
                    proteinReminder = "¡Excelente consumo de proteína para tus objetivos de ganancia muscular!";
                }
            }
            processedText = processedText.replace(/\[MUSCLE_GAIN_PROTEIN_REMINDER_PLACEHOLDER\]/g, proteinReminder);
        } else { 
             processedText = processedText
                .replace(/\[DAILY_CALORIES_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[TARGET_CALORIES_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[DAILY_PROTEIN_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[TARGET_PROTEIN_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[DAILY_CARBS_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[TARGET_CARBS_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[DAILY_FATS_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[TARGET_FATS_PLACEHOLDER\]/g, 'N/A')
                .replace(/\[CALORIES_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                .replace(/\[PROTEIN_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                .replace(/\[CARBS_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                .replace(/\[FATS_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                .replace(/\[MUSCLE_GAIN_PROTEIN_REMINDER_PLACEHOLDER\]/g, '');
        }


        const newAiMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: processedText, timestamp: new Date(), feedback: null };
        setMessages(prev => [...prev, newAiMessage]);
      }
    }

  }, [userProfile, dailyIntake, nutrientTargets, currentBMR, currentTDEE, isGuestSession, currentSession]);

  
  const handleToggleRecording = useCallback(async () => {
    setMicPermissionError(null);
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setMicPermissionError("Tu navegador no soporta la grabación de audio. Prueba con otro.");
            setIsRecording(false); return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const supportedMimeType = getSupportedMimeType();
        if (!supportedMimeType) {
            setMicPermissionError("No se encontró un formato de audio soportado para grabar.");
            setIsRecording(false); return;
        }
        actualMimeTypeRef.current = supportedMimeType;
        
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: supportedMimeType });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          stream.getTracks().forEach(track => track.stop()); 
          if (audioChunksRef.current.length === 0) {
            console.warn("No audio data recorded.");
            setIsLoading(false); 
            return;
          }
          
          setLastInputMethod('voice');
          const userMessageFromAudio: Message = { 
              id: crypto.randomUUID(), 
              sender: 'user', 
              text: "(Audio enviado 🎤)",
              timestamp: new Date(),
              feedback: null
          };
          setMessages(prev => [...prev, userMessageFromAudio]);
          setIsLoading(true);

          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeTypeRef.current });
          audioChunksRef.current = [];

          try {
            const base64Audio = await blobToBase64(audioBlob);
            
            const geminiResponseForAudio = await generateNutriKickResponse(
                null, 
                userProfile,
                { base64Data: base64Audio, mimeType: actualMimeTypeRef.current },
                undefined, 
                dailyIntake, 
                nutrientTargets, 
                currentBMR, 
                currentTDEE,
                isGuestSession
            );

            if (geminiResponseForAudio?.estimatedIntake && !isGuestSession && currentSession?.user?.id) {
              const intake = geminiResponseForAudio.estimatedIntake;
              setDailyIntake(prev => ({
                ...prev,
                caloriesConsumed: prev.caloriesConsumed + intake.calories,
                proteinConsumed: prev.proteinConsumed + intake.protein,
                carbsConsumed: prev.carbsConsumed + intake.carbs,
                fatsConsumed: prev.fatsConsumed + intake.fats,
              }));
            }
            
            let processedText = geminiResponseForAudio.text;
             if (!isGuestSession && dailyIntake && nutrientTargets) {
                const currentCalories = dailyIntake.caloriesConsumed + (geminiResponseForAudio.estimatedIntake?.calories || 0);
                const currentProtein = dailyIntake.proteinConsumed + (geminiResponseForAudio.estimatedIntake?.protein || 0);
                const currentCarbs = dailyIntake.carbsConsumed + (geminiResponseForAudio.estimatedIntake?.carbs || 0);
                const currentFats = dailyIntake.fatsConsumed + (geminiResponseForAudio.estimatedIntake?.fats || 0);

                processedText = processedText
                    .replace(/\[DAILY_CALORIES_CONSUMED_PLACEHOLDER\]/g, currentCalories.toFixed(0))
                    .replace(/\[TARGET_CALORIES_PLACEHOLDER\]/g, nutrientTargets.calories?.toFixed(0) || 'N/A')
                    .replace(/\[DAILY_PROTEIN_CONSUMED_PLACEHOLDER\]/g, currentProtein.toFixed(0))
                    .replace(/\[TARGET_PROTEIN_PLACEHOLDER\]/g, nutrientTargets.protein?.toFixed(0) || 'N/A')
                    .replace(/\[DAILY_CARBS_CONSUMED_PLACEHOLDER\]/g, currentCarbs.toFixed(0))
                    .replace(/\[TARGET_CARBS_PLACEHOLDER\]/g, nutrientTargets.carbs?.toFixed(0) || 'N/A')
                    .replace(/\[DAILY_FATS_CONSUMED_PLACEHOLDER\]/g, currentFats.toFixed(0))
                    .replace(/\[TARGET_FATS_PLACEHOLDER\]/g, nutrientTargets.fats?.toFixed(0) || 'N/A');
                
                const caloriesRemaining = (nutrientTargets.calories || 0) - currentCalories;
                const proteinRemaining = (nutrientTargets.protein || 0) - currentProtein;
                const carbsRemaining = (nutrientTargets.carbs || 0) - currentCarbs;
                const fatsRemaining = (nutrientTargets.fats || 0) - currentFats;


                processedText = processedText
                    .replace(/\[CALORIES_REMAINING_MESSAGE_PLACEHOLDER\]/g, caloriesRemaining >= 0 ? `Te quedan ${caloriesRemaining.toFixed(0)} kcal.` : `Has superado tu objetivo calórico por ${Math.abs(caloriesRemaining).toFixed(0)} kcal.`)
                    .replace(/\[PROTEIN_REMAINING_MESSAGE_PLACEHOLDER\]/g, proteinRemaining >= 0 ? `Te quedan ${proteinRemaining.toFixed(0)}g de proteína.` : `Has superado tu objetivo de proteína por ${Math.abs(proteinRemaining).toFixed(0)}g.`)
                    .replace(/\[CARBS_REMAINING_MESSAGE_PLACEHOLDER\]/g, carbsRemaining >= 0 ? `Te quedan ${carbsRemaining.toFixed(0)}g de carbohidratos.` : `Has superado tu objetivo de carbohidratos por ${Math.abs(carbsRemaining).toFixed(0)}g.`)
                    .replace(/\[FATS_REMAINING_MESSAGE_PLACEHOLDER\]/g, fatsRemaining >= 0 ? `Te quedan ${fatsRemaining.toFixed(0)}g de grasa.` : `Has superado tu objetivo de grasa por ${Math.abs(fatsRemaining).toFixed(0)}g.`);


                let proteinReminder = "";
                 if (userProfile.goals === PersonalGoal.GainMuscleImproveComposition || (userProfile.isAthlete && userProfile.athleticGoals?.includes(AthleticGoalOptions.MuscleGainPower))) {
                     if (nutrientTargets.protein && currentProtein < nutrientTargets.protein * 0.8) proteinReminder = "Recuerda tu objetivo de proteínas. ¡Sigue así!";
                 }
                processedText = processedText.replace(/\[MUSCLE_GAIN_PROTEIN_REMINDER_PLACEHOLDER\]/g, proteinReminder);
            } else { 
                processedText = processedText
                    .replace(/\[DAILY_CALORIES_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[TARGET_CALORIES_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[DAILY_PROTEIN_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[TARGET_PROTEIN_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[DAILY_CARBS_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[TARGET_CARBS_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[DAILY_FATS_CONSUMED_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[TARGET_FATS_PLACEHOLDER\]/g, 'N/A')
                    .replace(/\[CALORIES_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                    .replace(/\[PROTEIN_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                    .replace(/\[CARBS_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                    .replace(/\[FATS_REMAINING_MESSAGE_PLACEHOLDER\]/g, '')
                    .replace(/\[MUSCLE_GAIN_PROTEIN_REMINDER_PLACEHOLDER\]/g, '');
            }

            const aiResponseMessage: Message = { id: crypto.randomUUID(), sender: 'ai', text: processedText, timestamp: new Date(), feedback: null };
            setMessages(prev => [...prev, aiResponseMessage]);

          } catch (transcriptionError: any) {
            console.error("Error processing audio with Gemini:", transcriptionError);
            setMessages(prev => [...prev, { id: crypto.randomUUID(), sender: 'ai', text: `Error al procesar audio: ${transcriptionError.message}`, timestamp: new Date(), feedback: null }]);
          } finally {
            setIsLoading(false);
          }
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        if (chatInputRef.current) chatInputRef.current.value = ""; 
      } catch (err) {
        console.error("Error accessing microphone:", err);
        let message = "No se pudo acceder al micrófono.";
        if (err instanceof Error) {
            if (err.name === "NotAllowedError") message = "Permiso para micrófono denegado. Habilítalo en los ajustes de tu navegador.";
            else if (err.name === "NotFoundError") message = "No se encontró un micrófono disponible.";
            else if (err.name === "NotReadableError") message = "El micrófono está siendo usado por otra aplicación o hubo un error de hardware.";
            else message = `Error de micrófono: ${err.message}`;
        }
        setMicPermissionError(message);
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    }
  }, [isRecording, userProfile, dailyIntake, nutrientTargets, currentBMR, currentTDEE, isGuestSession, currentSession]);

  const openCamera = async () => {
    setCameraError(null);
    if (isGuestSession) {
        setCameraError("Debes iniciar sesión para usar la cámara.");
        return;
    }
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Tu navegador no soporta el acceso a la cámara. Prueba con otro.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment", 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      });
      videoStreamRef.current = stream;
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        videoElementRef.current.onloadedmetadata = () => {
            if (videoElementRef.current && canvasElementRef.current) {
                canvasElementRef.current.width = videoElementRef.current.videoWidth;
                canvasElementRef.current.height = videoElementRef.current.videoHeight;
            }
        };
      }
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let message = "No se pudo acceder a la cámara.";
       if (err instanceof Error) {
            if (err.name === "NotAllowedError") message = "Permiso para cámara denegado. Habilítalo en los ajustes de tu navegador.";
            else if (err.name === "NotFoundError") message = "No se encontró una cámara disponible.";
            else if (err.name === "NotReadableError") message = "La cámara está siendo usada por otra aplicación o hubo un error de hardware.";
            else if (err.name === "OverconstrainedError") message = `No se pudo satisfacer la configuración de cámara solicitada (ej. facingMode). ${err.message}`;
            else message = `Error de cámara: ${err.message}`;
        }
      setCameraError(message);
      closeCamera();
    }
  };

  const closeCamera = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach(track => track.stop());
      videoStreamRef.current = null;
    }
    if (videoElementRef.current) {
        videoElementRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const captureImage = async () => {
    if (!videoElementRef.current || !canvasElementRef.current) {
      setCameraError("Error interno al capturar imagen.");
      return;
    }
    const video = videoElementRef.current;
    const canvas = canvasElementRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError("No se pudo obtener el contexto del canvas para capturar la imagen.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    let dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
    let mimeType = 'image/jpeg';

    if (!dataUrl || dataUrl.length < 1000) { 
        console.warn("JPEG conversion might have failed or produced a very small image, trying PNG.");
        dataUrl = canvas.toDataURL('image/png');
        mimeType = 'image/png';
    }

    if (!dataUrl) {
        setCameraError("No se pudo convertir la imagen capturada.");
        return;
    }

    closeCamera();
    const base64Image = dataUrl.split(',')[1];
    
    if(chatInputRef.current) {
    }
    
    const currentTextInInput = chatInputRef.current?.value || "";
    handleSendMessage(currentTextInInput, { base64Data: base64Image, mimeType: mimeType });
  };
  
  const handleAuthAction = async (action: 'signUp' | 'signIn', email: string, pass: string) => {
    setAuthError(null);
    setAuthLoading(true); 
    try {
      if (action === 'signUp') {
        const { error: signUpError, user } = await signUpUser(email, pass);
        if (signUpError) throw signUpError;
        alert("¡Cuenta creada! Revisa tu correo electrónico para confirmar tu cuenta si es necesario, y luego inicia sesión.");

      } else { 
        const { error: signInError, session: signedInSession } = await signInUser(email, pass);
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      console.error(`${action} error:`, err);
      let friendlyMessage = err.message || `Error durante ${action === 'signUp' ? 'el registro' : 'el inicio de sesión'}.`;
      if (err.message?.includes("User already registered")) friendlyMessage = "Este correo electrónico ya está registrado. Intenta iniciar sesión.";
      if (err.message?.includes("Invalid login credentials")) friendlyMessage = "Credenciales inválidas. Verifica tu correo y contraseña.";
      if (err.message?.includes("Email rate limit exceeded")) friendlyMessage = "Se han enviado demasiados correos. Intenta más tarde.";
      setAuthError(friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
        setAuthLoading(true);
        const { error: signOutError } = await signOutUser();
        if (signOutError) {
            setAuthError(`Error al cerrar sesión: ${signOutError.message}`);
            console.error("Sign out error:", signOutError);
        }
        setAuthLoading(false);
        setActiveTab('chat'); 
    }
  };

   if (authLoading && !currentSession && !isGuestSession) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200 p-4">
        <NutriKickIcon className="text-6xl mb-4 text-orange-500" />
        <h1 className="text-3xl font-bold mb-2 text-slate-100">Nutri-Kick AI</h1>
        <LoadingSpinner size="lg" color="text-orange-500" />
        <p className="mt-4 text-slate-400">Conectando y preparando todo...</p>
      </div>
    );
  }

   if (dbStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-red-300 p-4">
        <NutriKickIcon className="text-6xl mb-4 text-red-500" />
        <h1 className="text-3xl font-bold mb-2 text-red-200">Error de Conexión</h1>
        <p className="text-center mb-2">No se pudo conectar con la base de datos.</p>
        <p className="text-sm text-center bg-red-900/50 p-3 rounded-md">{dbErrorDetails || "Revisa la configuración de Supabase y tu conexión a internet."}</p>
        <p className="text-xs text-slate-500 mt-4">La aplicación no funcionará correctamente sin la base de datos.</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-800 shadow-md p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <NutriKickIcon className="text-3xl text-orange-500" />
          <h1 className="text-xl font-semibold text-slate-100 hidden sm:block">Nutri-Kick AI</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-2">
          {currentSession && !isGuestSession && (
            <span className="text-xs text-slate-400 hidden md:inline">
              Hola, {userProfile.name || currentSession.user.email || 'Usuario'}
            </span>
          )}
          {isAdmin && ( 
            <button
              onClick={() => setActiveTab('admin')}
              className={`p-2 rounded-full transition-colors ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-purple-400'}`}
              aria-label="Panel de Administración" title="Panel de Administración"
            >
              <AdminIcon className="w-6 h-6" />
            </button>
          )}
          <button
            onClick={() => setActiveTab('chat')}
            className={`p-2 rounded-full transition-colors ${activeTab === 'chat' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-orange-400'}`}
            aria-label="Chat" title="Chat"
          >
            <ChatIcon className="w-6 h-6" />
          </button>
           <button
            onClick={() => setActiveTab('about')}
            className={`p-2 rounded-full transition-colors ${activeTab === 'about' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-indigo-400'}`}
            aria-label="Acerca de" title="Acerca de"
          >
            <AboutIcon className="w-6 h-6" />
          </button>
          {!isGuestSession && currentSession && (
            <button
                onClick={() => setActiveTab('profile')}
                className={`p-2 rounded-full transition-colors ${activeTab === 'profile' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-sky-400'}`}
                aria-label="Tu Perfil" title="Tu Perfil"
            >
                <ProfileIcon className="w-6 h-6" />
            </button>
          )}
          {currentSession && !isGuestSession ? (
            <button 
                onClick={handleSignOut} 
                className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-red-400 transition-colors"
                aria-label="Cerrar sesión" title="Cerrar sesión"
            >
              <LogoutIcon className="w-6 h-6" />
            </button>
          ) : (
            <button 
                onClick={() => setShowAuthModal(true)} 
                className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-green-400 transition-colors"
                aria-label="Iniciar Sesión / Registrarse" title="Iniciar Sesión / Registrarse"
            >
              <LoginIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col flex-grow overflow-y-auto custom-scrollbar">
         {activeTab === 'chat' && (
            <ChatWindow
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading} 
                chatContainerRef={chatContainerRef}
                isListening={isRecording}
                onToggleListening={handleToggleRecording}
                micPermissionError={micPermissionError}
                chatInputRef={chatInputRef}
                onOpenCamera={openCamera}
                isGuest={isGuestSession}
                onFeedback={handleMessageFeedback}
            />
        )}
        {activeTab === 'profile' && !isGuestSession && (
            <ProfileEditor 
                initialProfile={userProfile} 
                onUpdateProfile={handleProfileUpdate}
                onEditingComplete={handleProfileEditingComplete}
                isActive={activeTab === 'profile'}
                onClearCache={handleClearLocalStorage}
                isGuest={isGuestSession} 
            />
        )}
        {activeTab === 'admin' && isAdmin && ( 
            <AdminPanel />
        )}
        {activeTab === 'about' && (
            <AboutPanel />
        )}
      </main>

      {/* Footer / Disclaimer */}
      {activeTab === 'chat' && (
         <footer className="bg-slate-800 text-center p-2 border-t border-slate-600">
             <p className="text-xs text-slate-500">{DISCLAIMER_TEXT}</p>
         </footer>
      )}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white py-2 px-4 rounded-lg shadow-md animate-fadeIn z-50">
          {successMessage}
        </div>
      )}
      {error && activeTab !== 'chat' && ( 
        <div className="fixed bottom-4 right-4 bg-red-600 text-white py-2 px-4 rounded-lg shadow-md animate-fadeIn z-50">
          {error}
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fadeIn"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAuthModal(false);}} 
        >
            <div className="relative w-full max-w-md">
                <AuthForm
                    onAuthSuccess={() => {}}
                    isLoading={authLoading}
                    setIsLoading={setAuthLoading}
                    setAuthError={setAuthError}
                    supabaseSignUp={signUpUser}
                    supabaseSignIn={signInUser}
                    authError={authError}
                />
                 <button 
                    onClick={() => setShowAuthModal(false)} 
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                    aria-label="Cerrar modal de autenticación"
                 >
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="camera-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCamera();}}>
          <div className="camera-modal">
            <video ref={videoElementRef} autoPlay playsInline muted className="shadow-lg"></video>
            {cameraError && <p className="camera-error-message">{cameraError}</p>}
            <div className="camera-buttons">
              <button onClick={captureImage} className="camera-capture-button" disabled={!!cameraError}>Capturar Foto 📸</button>
              <button onClick={closeCamera} className="camera-cancel-button">Cancelar</button>
            </div>
            <canvas ref={canvasElementRef} style={{ display: 'none' }}></canvas>
             <p className="text-xs text-slate-400 mt-3 text-center">Apunta a tu comida o etiqueta nutricional.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
