
import React, { useState, useEffect } from 'react';
import { UserProfile, Gender, FootballPosition, TrainingLoad, TrainingFrequency, PersonalGoal } from '../types';

interface ProfileEditorProps {
  initialProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

// Helper function to check form validity
const isProfileDataValid = (profile: UserProfile): boolean => {
  const ageNum = parseInt(profile.age);
  const weightNum = parseFloat(profile.weight);
  const heightNum = parseInt(profile.height);

  if (!profile.age || isNaN(ageNum) || ageNum <= 0) return false;
  if (!profile.weight || isNaN(weightNum) || weightNum <= 0) return false;
  if (!profile.height || isNaN(heightNum) || heightNum <= 0) return false;
  
  // For gender and goals, check if the value is an empty string (placeholder selected)
  if (profile.gender === "") return false; 
  if (profile.goals === "") return false;


  if (profile.isAthlete) {
    if (!profile.position) return false;
    if (!profile.trainingLoad) return false;
  } else {
    if (!profile.trainingFrequency) return false;
  }

  return true;
};

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ initialProfile, onUpdateProfile }) => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isAthlete, setIsAthlete] = useState<boolean>(initialProfile.isAthlete || false);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Ensure gender from initialProfile is either Male, Female, or "" for placeholder
    let initialGender = initialProfile.gender;
    if (initialGender !== Gender.Male && initialGender !== Gender.Female) {
        initialGender = ""; // Set to empty string for placeholder
    }

    setProfile({
        ...initialProfile,
        gender: initialGender,
        goals: initialProfile.goals || "", // Ensure goals also has a placeholder if empty
    });
    setIsAthlete(initialProfile.isAthlete || false);
  }, [initialProfile]);

  useEffect(() => {
    setIsSubmitEnabled(isProfileDataValid({...profile, isAthlete}));
  }, [profile, isAthlete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleIsAthleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIsAthlete = e.target.value === 'yes';
    setIsAthlete(newIsAthlete);
    setProfile(prev => {
      const updatedProfile = { ...prev, isAthlete: newIsAthlete };
      if (newIsAthlete) {
        delete updatedProfile.trainingFrequency;
        if (!updatedProfile.position) updatedProfile.position = FootballPosition.Versatile;
        if (!updatedProfile.trainingLoad) updatedProfile.trainingLoad = TrainingLoad.LightTraining;
      } else {
        delete updatedProfile.position;
        delete updatedProfile.trainingLoad;
        if (!updatedProfile.trainingFrequency) updatedProfile.trainingFrequency = TrainingFrequency.NoneOrRarely;
      }
      return updatedProfile;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentProfileWithAthleteStatus = {...profile, isAthlete};
    if (!isProfileDataValid(currentProfileWithAthleteStatus)) {
      let missingFieldsMessage = "Por favor, completa o corrige los siguientes campos obligatorios: 🙏\n";
      const ageNum = parseInt(profile.age);
      const weightNum = parseFloat(profile.weight);
      const heightNum = parseInt(profile.height);

      if (!profile.age || isNaN(ageNum) || ageNum <= 0) missingFieldsMessage += "- Edad 🎂 (debe ser un número positivo)\n";
      if (!profile.weight || isNaN(weightNum) || weightNum <= 0) missingFieldsMessage += "- Peso ⚖️ (debe ser un número positivo)\n";
      if (!profile.height || isNaN(heightNum) || heightNum <= 0) missingFieldsMessage += "- Altura 📏 (debe ser un número positivo)\n";
      
      if (profile.gender === "") missingFieldsMessage += "- Género 🚻\n";
      if (profile.goals === "") missingFieldsMessage += "- Objetivo Principal 🎯\n";


      if (isAthlete) {
        if (!profile.position) missingFieldsMessage += "- Posición Principal (Fútbol) ⚽\n";
        if (!profile.trainingLoad) missingFieldsMessage += "- Carga de Entrenamiento 🏋️\n";
      } else {
        if (!profile.trainingFrequency) missingFieldsMessage += "- Frecuencia de entrenamiento semanal 🗓️\n";
      }
      
      alert(missingFieldsMessage.trim());
      return;
    }

    const finalProfile: UserProfile = { ...profile, isAthlete };
    if (isAthlete) {
        delete finalProfile.trainingFrequency;
        finalProfile.position = finalProfile.position || FootballPosition.Versatile;
        finalProfile.trainingLoad = finalProfile.trainingLoad || TrainingLoad.LightTraining;
    } else {
        delete finalProfile.position;
        delete finalProfile.trainingLoad;
        finalProfile.trainingFrequency = finalProfile.trainingFrequency || TrainingFrequency.NoneOrRarely;
    }
    onUpdateProfile(finalProfile);
  };
  
  const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors placeholder-slate-400";
  const commonInputClasses = `${commonSelectClasses}`;

  return (
    <div className="p-4 md:p-6 bg-slate-700 text-slate-200 rounded-lg shadow-xl animate-fadeIn">
      <h2 className="text-2xl font-semibold text-slate-100 mb-6 border-b pb-3 border-slate-600">Tu Perfil Nutricional 📝</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">Edad (años) 🎂</label>
            <input type="number" name="age" id="age" value={profile.age} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 24" />
          </div>
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-slate-300 mb-1">Peso (kg) ⚖️</label>
            <input type="number" step="0.1" name="weight" id="weight" value={profile.weight} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 78.5" />
          </div>
          <div>
            <label htmlFor="height" className="block text-sm font-medium text-slate-300 mb-1">Altura (cm) 📏</label>
            <input type="number" name="height" id="height" value={profile.height} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 180" />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1">Género 🚻</label>
            <select name="gender" id="gender" value={profile.gender} onChange={handleChange} required className={commonSelectClasses}>
              <option value="" disabled className="text-slate-400">Selecciona tu género...</option>
              {Object.values(Gender).map(g => <option key={g} value={g} className="text-slate-100 bg-slate-600">{g}</option>)}
            </select>
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-300 mb-1">¿Eres atleta? 🤔</span>
          <div className="mt-2 space-x-4 flex">
            <label className="inline-flex items-center">
              <input type="radio" className="form-radio text-orange-500 focus:ring-orange-500 bg-slate-500 border-slate-400" name="isAthleteRadio" value="yes" checked={isAthlete === true} onChange={handleIsAthleteChange} />
              <span className="ml-2 text-sm text-slate-300">Sí</span>
            </label>
            <label className="inline-flex items-center">
              <input type="radio" className="form-radio text-orange-500 focus:ring-orange-500 bg-slate-500 border-slate-400" name="isAthleteRadio" value="no" checked={isAthlete === false} onChange={handleIsAthleteChange} />
              <span className="ml-2 text-sm text-slate-300">No</span>
            </label>
          </div>
        </div>

        {isAthlete && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-slate-300 mb-1">Posición Principal (Fútbol) ⚽</label>
              <select name="position" id="position" value={profile.position || ''} onChange={handleChange} required className={commonSelectClasses}>
                 <option value="" disabled className="text-slate-400">Selecciona posición...</option>
                {Object.values(FootballPosition).map(p => <option key={p} value={p} className="text-slate-100 bg-slate-600">{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="trainingLoad" className="block text-sm font-medium text-slate-300 mb-1">Carga de Entrenamiento Típica/Actual 🏋️</label>
              <select name="trainingLoad" id="trainingLoad" value={profile.trainingLoad || ''} onChange={handleChange} required className={commonSelectClasses}>
                <option value="" disabled className="text-slate-400">Selecciona carga...</option>
                {Object.values(TrainingLoad).map(tl => <option key={tl} value={tl} className="text-slate-100 bg-slate-600">{tl}</option>)}
              </select>
            </div>
          </div>
        )}

        {!isAthlete && (
          <div className="animate-fadeIn">
            <label htmlFor="trainingFrequency" className="block text-sm font-medium text-slate-300 mb-1">Frecuencia de entrenamiento semanal 🗓️</label>
            <select name="trainingFrequency" id="trainingFrequency" value={profile.trainingFrequency || ''} onChange={handleChange} required className={commonSelectClasses}>
              <option value="" disabled className="text-slate-400">Selecciona frecuencia...</option>
              {Object.values(TrainingFrequency).map(tf => <option key={tf} value={tf} className="text-slate-100 bg-slate-600">{tf}</option>)}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="goals" className="block text-sm font-medium text-slate-300 mb-1">Objetivo Principal 🎯</label>
          <select name="goals" id="goals" value={profile.goals} onChange={handleChange} required className={commonSelectClasses}>
            <option value="" disabled className="text-slate-400">Selecciona tu objetivo...</option>
            {Object.values(PersonalGoal).map(goal => <option key={goal} value={goal} className="text-slate-100 bg-slate-600">{goal}</option>)}
          </select>
        </div>
        
        <div>
          <button 
            type="submit" 
            disabled={!isSubmitEnabled}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-orange-600 transition-transform transform hover:scale-105 active:scale-95 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Actualizar Perfil y Calcular Necesidades 🚀
          </button>
        </div>
      </form>
    </div>
  );
};