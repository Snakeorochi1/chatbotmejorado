

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UserProfile, Message, Gender, FootballPosition, TrainingLoad, TrainingFrequency, PersonalGoal } from './types';
import { generateNutriKickResponse } from './services/geminiService';
import { ProfileEditor } from './components/ProfileEditor';
import { ChatWindow } from './components/ChatWindow';
import { LoadingSpinner } from './components/LoadingSpinner';
import { DISCLAIMER_TEXT } from './constants';
import { LogoIcon, ProfileIcon, ChatIcon } from './components/Icons';

// Constants for localStorage keys
const USER_PROFILE_STORAGE_KEY = 'nutrikick_userProfile';
const CHAT_MESSAGES_STORAGE_KEY = 'nutrikick_chatMessages';


const App: React.FC = () => {
  const isInitialProfileLoad = useRef(true);
  const isInitialMessagesLoad = useRef(true);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const storedProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        // Merge with defaults to ensure all keys are present, especially if new fields are added later
        const defaultProfile: UserProfile = {
            age: '', weight: '', height: '', gender: "", isAthlete: false, 
            trainingFrequency: TrainingFrequency.NoneOrRarely, 
            position: FootballPosition.Versatile, 
            trainingLoad: TrainingLoad.LightTraining, 
            goals: "" as PersonalGoal | "",
        };
        return { ...defaultProfile, ...parsedProfile };
      }
    } catch (error) {
      console.error("Error loading user profile from localStorage:", error);
    }
    // Default initial state if nothing in localStorage or error
    return {
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
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const storedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
      if (storedMessages) {
        const parsedMessages: Message[] = JSON.parse(storedMessages);
        // Convert string timestamps back to Date objects
        return parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp) 
        }));
      }
    } catch (error) {
      console.error("Error loading messages from localStorage:", error);
    }
    return []; // Start with an empty array if no messages or error
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile'>('chat');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const handleProfileUpdate = useCallback((newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setError(null); // Clear previous errors

    let bmr: number | null = null;
    let tdee: number | null = null;
    let activityLevelName = "No especificado";
    let activityFactor = 1.2; // Default to sedentary

    const ageNum = parseInt(newProfile.age);
    const weightNum = parseFloat(newProfile.weight);
    const heightNum = parseInt(newProfile.height);

    let calculationMessage = "¡Perfil actualizado! 🎉\n\n";

    if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum) || ageNum <= 0 || weightNum <= 0 || heightNum <= 0) {
      calculationMessage += "Por favor, completa tu edad, peso y altura con valores válidos para calcular tus necesidades energéticas. 🙏\n\n";
    } else if (newProfile.gender === Gender.Male || newProfile.gender === Gender.Female) {
      if (newProfile.gender === Gender.Male) {
        bmr = 88.362 + (13.397 * weightNum) + (4.799 * heightNum) - (5.677 * ageNum);
      } else { // Female
        bmr = 447.593 + (9.247 * weightNum) + (3.098 * heightNum) - (4.330 * ageNum);
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
          case TrainingFrequency.TwoToThree: activityFactor = 1.3; activityLevelName = "Actividad Ligera (2-3 entrenamientos/sem) 🚶‍♀️"; break;
          case TrainingFrequency.FourTimes: activityFactor = 1.5; activityLevelName = "Actividad Moderada (4 entrenamientos/sem) 🏃"; break;
          case TrainingFrequency.FiveToSix: activityFactor = 1.8; activityLevelName = "Actividad Alta (5-6 entrenamientos/sem) 🏋️‍♀️"; break;
          case TrainingFrequency.DailyOrMore: activityFactor = 2.0; activityLevelName = "Actividad Muy Alta (7+ entrenamientos/sem) 🚀"; break;
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
          goalSpecificAdvice = "Para tu objetivo de 'Perder peso', generalmente se busca un déficit calórico, lo que significa consumir menos calorías de las que tu cuerpo gasta (tu RCTE). Es fundamental que esta pérdida de peso provenga principalmente de la **oxidación de grasa** corporal, protegiendo tu valiosa masa muscular. ¿Has considerado este importante equilibrio, o tienes alguna preferencia específica sobre cómo te gustaría abordar la pérdida de peso?\n\n" +
          "**¡Atención!** Una pérdida de peso muy rápida o mal planificada, especialmente si es a expensas de masa muscular, puede tener serias consecuencias para tu salud e incluso provocar un 'efecto rebote' (recuperar el peso perdido rápidamente). Un nutricionista deportivo es clave para diseñar un plan seguro, efectivo y sostenible que minimice estos riesgos y te ayude a alcanzar tus metas de forma saludable.\n\n";
          break;
        case PersonalGoal.GainMuscle:
          goalSpecificAdvice = "Para ganar masa muscular, usualmente se recomienda un superávit calórico, consumiendo un poco más de tu RCTE, junto con un entrenamiento de fuerza adecuado. La calidad de los nutrientes, especialmente una ingesta óptima de proteínas, es fundamental en este proceso.\n\n";
          break;
        case PersonalGoal.MaintainAndPerform:
          goalSpecificAdvice = "Si buscas mantener tu peso y mejorar el rendimiento, nos enfocaremos en la calidad de los nutrientes y el 'timing' o momento de su ingesta en relación con tus entrenamientos. Esto será clave para optimizar tu energía y recuperación.\n\n";
          break;
        case PersonalGoal.ImproveStrength:
          goalSpecificAdvice = "Para mejorar la fuerza, de forma similar a ganar masa muscular, un aporte energético adecuado y una ingesta suficiente de proteínas son importantes para la reparación y crecimiento muscular. La calidad de los carbohidratos también juega un rol crucial para la energía durante tus entrenamientos.\n\n";
          break;
        case PersonalGoal.ImproveSpeed:
          goalSpecificAdvice = "Mejorar la velocidad puede beneficiarse de una nutrición que optimice la disponibilidad de energía rápida y la recuperación muscular. Incluso, ciertos alimentos como la remolacha son estudiados por su potencial para mejorar el flujo sanguíneo y la eficiencia muscular, al ser precursores naturales del óxido nítrico.\n\n";
          break;
        case PersonalGoal.ImproveEndurance:
          goalSpecificAdvice = "Para mejorar tu resistencia y combatir la fatiga temprana, es crucial asegurar una ingesta adecuada de carbohidratos, que son tu principal fuente de combustible para el ejercicio prolongado, además de una correcta hidratación.\n\n";
          break;
        case PersonalGoal.AvoidCramps:
          goalSpecificAdvice = "Para evitar calambres, es importante considerar una adecuada hidratación y el balance de electrolitos clave como sodio, potasio y magnesio, especialmente si realizas entrenamientos intensos o en condiciones de calor.\n\n";
          break;
        default:
          goalSpecificAdvice = ""; 
          break;
      }
      calculationMessage += goalSpecificAdvice;

    } else {
      calculationMessage += "Para un cálculo más preciso de tu Metabolismo Basal y Requerimiento Calórico, por favor, selecciona 'Masculino' o 'Femenino' en el campo de género. Con el género actual, no podemos realizar este cálculo específico. 🧑‍🔬\n\n";
    }
    
    let suggestedQuestionsBlock = "";
    const userGoalText = newProfile.goals || "tus metas";

    if (newProfile.goals === PersonalGoal.LoseWeight) {
        suggestedQuestionsBlock = 
            "Aquí tienes algunas ideas sobre cómo podemos continuar:\n" +
            "1.  ¿Te gustaría que profundicemos más en cómo se logra la pérdida de peso priorizando la **oxidación de grasa**?\n" +
            "2.  ¿Quieres saber cómo podría ser una distribución general de proteínas, carbohidratos y grasas para tu objetivo de 'Perder peso'?\n" +
            "3.  ¿Cuánto tiempo se estima que puede tomar perder peso de forma saludable?\n" +
            "4.  ¿Te interesa conocer sobre suplementos con evidencia científica que podrían apoyar tu objetivo? (Nos enfocaremos solo en aquellos con respaldo sólido y seguro).\n" +
            "5.  ¿O tienes alguna otra duda específica en mente? 🤔\n\n";
    } else {
        suggestedQuestionsBlock = 
            `Aquí tienes algunas ideas sobre lo que podríamos conversar a continuación:\n` +
            `*   "¿Cómo puedo aplicar estos números (MB y RCTE) en mi planificación de comidas?"\n` +
            `*   "¿Qué tipos de alimentos son más recomendables para mi objetivo de '${userGoalText}'?"\n` +
            `*   "¿Algún consejo general sobre hidratación o suplementación básica para mi perfil?"\n` +
            `*   "¿Qué errores comunes debería evitar al intentar alcanzar mi objetivo?"\n\n`;
    }
    calculationMessage += suggestedQuestionsBlock;
    
    setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: calculationMessage.trim(), // Trim to remove potential trailing whitespace
        timestamp: new Date()
    }]);
    setActiveTab('chat');

    setTimeout(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = 0;
        }
    }, 0); 

  }, [chatContainerRef]);

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: userInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => {
        const updatedMessages = [...prev, newUserMessage];
        setTimeout(() => {
            const el = document.getElementById(`message-${newUserMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return updatedMessages;
    });

    setIsLoading(true);
    setError(null);

    try {
      const aiResponseText = await generateNutriKickResponse(userInput, userProfile);
      const newAiMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const updatedMessages = [...prev, newAiMessage];
        setTimeout(() => {
            const el = document.getElementById(`message-${newAiMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return updatedMessages;
      });
    } catch (err) {
      console.error("Error fetching AI response:", err);
      const errorMessageText = err instanceof Error ? err.message : "Ocurrió un error al contactar a Nutri-Kick AI.";
      setError(errorMessageText); 
      const newErrorAiMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `Lo siento, tuve problemas para procesar tu solicitud: ${errorMessageText}. Por favor, revisa tu conexión o inténtalo más tarde. 🛠️`,
        timestamp: new Date()
      };
      setMessages(prev => {
        const updatedMessages = [...prev, newErrorAiMessage];
        setTimeout(() => {
            const el = document.getElementById(`message-${newErrorAiMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
        return updatedMessages;
      });
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);

  // Load initial welcome message only if no messages from localStorage
  useEffect(() => {
    if (messages.length === 0) {
     setMessages([{
        id: crypto.randomUUID(),
        sender: 'ai',
        text: "¡Hola! 👋 Soy Nutri-Kick AI. Para poder ayudarte de la mejor manera y personalizar mis consejos, necesito conocerte un poco. **Por favor, haz clic en el icono del perfil (que parece una silueta de persona 👤) en la esquina superior derecha para completar tus datos.** Una vez que tu perfil esté actualizado, podré calcular tus necesidades calóricas estimadas y responder a todas tus preguntas sobre nutrición deportiva. ¿Comenzamos? 🚀",
        timestamp: new Date()
      }]);
      isInitialMessagesLoad.current = false; // Mark initial load as done
    } else {
        isInitialMessagesLoad.current = false; 
    }
    // Mark initial profile load as done after first render attempt
    isInitialProfileLoad.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]); // Empty dependency array means this runs once on mount


  // Effect to save userProfile to localStorage
  useEffect(() => {
    if (isInitialProfileLoad.current) return; // Don't save on initial empty load
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
    } catch (error) {
      console.error("Error saving user profile to localStorage:", error);
    }
  }, [userProfile]);

  // Effect to save messages to localStorage
  useEffect(() => {
    if (isInitialMessagesLoad.current) return; // Don't save initial default message
    try {
      if (messages.length > 0) {
        // Don't save if it's just the very first default welcome message and nothing else yet
        if (messages.length === 1 && messages[0].text.startsWith("¡Hola! 👋 Soy Nutri-Kick AI.")) {
            const storedMessages = localStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);
            if (!storedMessages) return; // Don't save if local storage was empty and this is the first welcome.
        }
        localStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY); // Clean up if messages are cleared
      }
    } catch (error) {
      console.error("Error saving messages to localStorage:", error);
    }
  }, [messages]);


  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white text-slate-100">
      <div className="bg-slate-800 backdrop-blur-lg shadow-xl rounded-xl w-full max-w-2xl flex flex-col overflow-hidden" style={{height: 'calc(100vh - 40px)', maxHeight: '700px'}}>
        <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <LogoIcon className="text-4xl" />
            <h1 className="text-2xl font-bold tracking-tight">Nutri-Kick AI</h1>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-2 rounded-md transition-colors flex items-center space-x-2 ${activeTab === 'chat' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              aria-label="Chat"
              title="Chat"
            >
              <ChatIcon className="w-6 h-6" /> <span>Chat</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`p-2 rounded-md transition-colors flex items-center space-x-2 ${activeTab === 'profile' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
              aria-label="Perfil"
              title="Perfil"
            >
              <ProfileIcon className="w-6 h-6" /> <span>Perfil</span>
            </button>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto custom-scrollbar p-1 sm:p-2 md:p-4 bg-slate-700">
          {activeTab === 'chat' && (
            <ChatWindow 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              chatContainerRef={chatContainerRef}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileEditor 
              initialProfile={userProfile} 
              onUpdateProfile={handleProfileUpdate} 
            />
          )}
        </main>
        
        {error && (
          <div className="bg-red-800/60 border-l-4 border-red-500 text-red-200 p-3 text-sm m-2 rounded-md shadow animate-fadeIn" role="alert">
            <p className="font-bold">Error de Comunicación ⚠️</p>
            <p>{error}</p>
          </div>
        )}

        <footer className="bg-slate-900 p-3 text-center text-xs text-slate-400 border-t border-slate-700">
          <p>{DISCLAIMER_TEXT}</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
