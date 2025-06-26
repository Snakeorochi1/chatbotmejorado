
import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  MoodTodayOptions, 
  TrainedTodayOptions, 
  HadBreakfastOptions, 
  EnergyLevelOptions,
  SleepQualityOptions
} from '../types';

interface DailyCheckInPanelProps {
  initialProfile: UserProfile;
  onSaveCheckIn: (checkInData: Partial<UserProfile>) => void;
  isGuest: boolean;
}

const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors placeholder-slate-400";
const commonInputClasses = `${commonSelectClasses}`;
const primaryButtonClasses = "w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-green-600 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-green-600 transition-transform transform hover:scale-105 active:scale-95 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed";


export const DailyCheckInPanel: React.FC<DailyCheckInPanelProps> = ({ 
    initialProfile, 
    onSaveCheckIn,
    isGuest 
}) => {
  const [checkInData, setCheckInData] = useState<Partial<UserProfile>>({
    moodToday: initialProfile.moodToday || '',
    trainedToday: initialProfile.trainedToday || '',
    hadBreakfast: initialProfile.hadBreakfast || '',
    energyLevel: initialProfile.energyLevel || '',
    sleepHours: initialProfile.sleepHours || '',
    sleepQuality: initialProfile.sleepQuality || "",
  });

  useEffect(() => {
    // Update local state if the initialProfile prop changes (e.g., user logs in/out or profile loads)
    setCheckInData({
      moodToday: initialProfile.moodToday || '',
      trainedToday: initialProfile.trainedToday || '',
      hadBreakfast: initialProfile.hadBreakfast || '',
      energyLevel: initialProfile.energyLevel || '',
      sleepHours: initialProfile.sleepHours || '',
      sleepQuality: initialProfile.sleepQuality || "",
    });
  }, [initialProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCheckInData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      alert("Debes iniciar sesión para guardar tu check-in diario.");
      return;
    }
    onSaveCheckIn(checkInData);
  };

  if (isGuest) {
    return (
      <div className="p-4 md:p-6 bg-slate-700 text-slate-200 min-h-full animate-fadeIn flex flex-col items-center justify-center text-center">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl">
          <h2 className="text-2xl font-semibold text-slate-100 mb-4">Check-in Diario</h2>
          <p className="text-slate-300 mb-6">
            Para registrar tu check-in diario y obtener un seguimiento personalizado, necesitas iniciar sesión o crear una cuenta gratuita.
          </p>
          <p className="text-sm text-slate-400">
            ¡Registrarte te permitirá aprovechar al máximo Nutri-Kick AI!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-slate-700 text-slate-200 min-h-full animate-fadeIn">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-slate-100 mb-6 border-b pb-3 border-slate-600">
          Check-in Diario 📋✅
        </h2>
        <p className="text-sm text-slate-300 mb-6">
          Actualiza tu estado diario para que Nutri-Kick AI pueda ofrecerte un mejor contexto.
          Esta información también ayuda a la IA a entender cómo te sientes si inicias una conversación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="border border-slate-600 p-4 rounded-md bg-slate-800 shadow-lg">
            <legend className="text-lg font-medium text-orange-400 px-2">Tu Bienestar Hoy</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
              <div>
                <label htmlFor="moodToday" className="block text-sm font-medium text-slate-300 mb-1">¿Cómo te sientes hoy? 😊</label>
                <select name="moodToday" id="moodToday" value={checkInData.moodToday || ''} onChange={handleChange} className={commonSelectClasses}>
                  <option value="">No especificar</option>
                  {Object.values(MoodTodayOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="trainedToday" className="block text-sm font-medium text-slate-300 mb-1">¿Entrenamiento de hoy? 💪</label>
                <select name="trainedToday" id="trainedToday" value={checkInData.trainedToday || ''} onChange={handleChange} className={commonSelectClasses}>
                  <option value="">No especificar</option>
                  {Object.values(TrainedTodayOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="hadBreakfast" className="block text-sm font-medium text-slate-300 mb-1">¿Desayunaste? 🥞</label>
                <select name="hadBreakfast" id="hadBreakfast" value={checkInData.hadBreakfast || ''} onChange={handleChange} className={commonSelectClasses}>
                  <option value="">No especificar</option>
                  {Object.values(HadBreakfastOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="energyLevel" className="block text-sm font-medium text-slate-300 mb-1">Nivel de Energía Hoy ⚡</label>
                <select name="energyLevel" id="energyLevel" value={checkInData.energyLevel || ''} onChange={handleChange} className={commonSelectClasses}>
                  <option value="">No especificar</option>
                  {Object.values(EnergyLevelOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sleepHours" className="block text-sm font-medium text-slate-300 mb-1">Horas de Sueño (aprox.) 😴</label>
                <input type="text" name="sleepHours" id="sleepHours" value={checkInData.sleepHours || ''} onChange={handleChange} className={commonInputClasses} placeholder="Ej: 7, 6.5, 7-8" />
              </div>
              <div>
                <label htmlFor="sleepQuality" className="block text-sm font-medium text-slate-300 mb-1">Calidad del Sueño Percibida ✨</label>
                <select name="sleepQuality" id="sleepQuality" value={checkInData.sleepQuality || ''} onChange={handleChange} className={commonSelectClasses}>
                  <option value="">No especificar</option>
                  {Object.values(SleepQualityOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            </div>
          </fieldset>
          <div className="pt-6">
            <button type="submit" className={primaryButtonClasses}>
              Guardar Check-in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
