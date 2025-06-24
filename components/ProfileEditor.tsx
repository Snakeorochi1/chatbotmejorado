
import React, { useState, useEffect, useRef } from 'react';
import { 
  UserProfile, Gender, FootballPosition, TrainingLoad, TrainingFrequency, PersonalGoal,
  DietaryApproachOptions, DietaryRestrictionOptions, 
  WellnessFocusAreaOptions, MoodTodayOptions, TrainedTodayOptions, HadBreakfastOptions, EnergyLevelOptions,
  SportsDiscipline, BasketballPosition, BaseballPosition, VolleyballPosition, AthleticGoalOptions
} from '../types';
import { TrashIcon } from './Icons'; // Added TrashIcon

interface ProfileEditorProps {
  initialProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile, isMainUpdate: boolean) => void;
  onEditingComplete: () => void;
  isActive: boolean;
  onClearCache: () => void; // New prop for clearing cache
}

interface ValidationError {
  field: string; // Corresponds to the input ID
  message: string;
}

const localInitialDefaultUserProfile: UserProfile = {
  name: '',
  email: '',
  phone: '',
  age: '',
  weight: '',
  height: '',
  gender: "",
  isAthlete: false,
  // Athlete specific
  sportsDiscipline: undefined,
  customSportsDiscipline: '',
  position: '',
  trainingLoad: TrainingLoad.LightTraining,
  athleticGoals: [],
  // Non-athlete specific
  trainingFrequency: TrainingFrequency.NoneOrRarely,
  // Common
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

const disciplinePositionsMap: Record<SportsDiscipline, Record<string, string> | null> = {
  [SportsDiscipline.Football]: FootballPosition,
  [SportsDiscipline.Basketball]: BasketballPosition,
  [SportsDiscipline.Baseball]: BaseballPosition,
  [SportsDiscipline.Volleyball]: VolleyballPosition,
  [SportsDiscipline.Tennis]: null, 
  [SportsDiscipline.Swimming]: null,
  [SportsDiscipline.Athletics]: null,
  [SportsDiscipline.Cycling]: null, 
  [SportsDiscipline.Boxing]: null,
  [SportsDiscipline.Judo]: null,
  [SportsDiscipline.Weightlifting]: null,
  [SportsDiscipline.Crossfit]: null,
  [SportsDiscipline.ESports]: null, 
  [SportsDiscipline.Motorsports]: null,
  [SportsDiscipline.Gymnastics]: null,
  [SportsDiscipline.Other]: null, 
};

const disciplinesWithNoPositions: SportsDiscipline[] = [
  SportsDiscipline.Tennis, SportsDiscipline.Swimming, SportsDiscipline.Athletics,
  SportsDiscipline.Cycling, SportsDiscipline.Boxing, SportsDiscipline.Judo,
  SportsDiscipline.Weightlifting, SportsDiscipline.Crossfit, SportsDiscipline.ESports,
  SportsDiscipline.Motorsports, SportsDiscipline.Gymnastics,
];

const phoneCountryCodes = [
  { code: "+49", name: "Alemania (+49)" },
  { code: "+54", name: "Argentina (+54)" },
  { code: "+61", name: "Australia (+61)" },
  { code: "+591", name: "Bolivia (+591)" },
  { code: "+55", name: "Brasil (+55)" },
  { code: "+56", name: "Chile (+56)" },
  { code: "+86", name: "China (+86)" },
  { code: "+57", name: "Colombia (+57)" },
  { code: "+506", name: "Costa Rica (+506)" },
  { code: "+53", name: "Cuba (+53)" },
  { code: "+593", name: "Ecuador (+593)" },
  { code: "+503", name: "El Salvador (+503)" },
  { code: "+1", name: "EE.UU./Canadá (+1)" }, 
  { code: "+34", name: "España (+34)" },
  { code: "+33", name: "Francia (+33)" },
  { code: "+502", name: "Guatemala (+502)" },
  { code: "+240", name: "Guinea Ecuatorial (+240)" },
  { code: "+504", name: "Honduras (+504)" },
  { code: "+91", name: "India (+91)" },
  { code: "+39", name: "Italia (+39)" },
  { code: "+81", name: "Japón (+81)" },
  { code: "+52", name: "México (+52)" },
  { code: "+505", name: "Nicaragua (+505)" },
  { code: "+507", name: "Panamá (+507)" },
  { code: "+595", name: "Paraguay (+595)" },
  { code: "+51", name: "Perú (+51)" },
  { code: "+44", name: "Reino Unido (+44)" },
  { code: "+7", name: "Rusia (+7)" },
  { code: "+598", name: "Uruguay (+598)" },
  { code: "+58", name: "Venezuela (+58)" },
].sort((a, b) => a.name.localeCompare(b.name));


const defaultPhoneCountryCode = "+52"; 

const splitPhoneNumber = (fullPhoneNumber: string | undefined): { countryCode: string; localPart: string } => {
  if (!fullPhoneNumber) return { countryCode: defaultPhoneCountryCode, localPart: "" };

  const unsortedPhoneCountryCodes = [
    { code: "+54", name: "Argentina (+54)" }, { code: "+591", name: "Bolivia (+591)" }, { code: "+56", name: "Chile (+56)" },
    { code: "+57", name: "Colombia (+57)" }, { code: "+506", name: "Costa Rica (+506)" }, { code: "+53", name: "Cuba (+53)" },
    { code: "+593", name: "Ecuador (+593)" }, { code: "+503", name: "El Salvador (+503)" }, { code: "+34", name: "España (+34)" },
    { code: "+502", name: "Guatemala (+502)" }, { code: "+240", name: "Guinea Ecuatorial (+240)" }, { code: "+504", name: "Honduras (+504)" },
    { code: "+52", name: "México (+52)" }, { code: "+505", name: "Nicaragua (+505)" }, { code: "+507", name: "Panamá (+507)" },
    { code: "+595", name: "Paraguay (+595)" }, { code: "+51", name: "Perú (+51)" }, { code: "+598", name: "Uruguay (+598)" },
    { code: "+58", name: "Venezuela (+58)" }, { code: "+1", name: "EE.UU./Canadá (+1)" }, { code: "+44", name: "Reino Unido (+44)" },
    { code: "+49", name: "Alemania (+49)" }, { code: "+33", name: "Francia (+33)" }, { code: "+55", name: "Brasil (+55)" },
    { code: "+86", name: "China (+86)" }, { code: "+91", name: "India (+91)" }, { code: "+39", name: "Italia (+39)" },
    { code: "+81", name: "Japón (+81)" }, { code: "+7", name: "Rusia (+7)" }, { code: "+61", name: "Australia (+61)" },
  ].sort((a, b) => b.code.length - a.code.length);


  for (const country of unsortedPhoneCountryCodes) {
    if (fullPhoneNumber.startsWith(country.code)) {
      return { countryCode: country.code, localPart: fullPhoneNumber.substring(country.code.length) };
    }
  }
  
  const plusMatch = fullPhoneNumber.match(/^\+(\d{1,4})/);
  if (plusMatch) {
    const extractedCode = `+${plusMatch[1]}`;
    return { countryCode: extractedCode, localPart: fullPhoneNumber.substring(extractedCode.length)};
  }
  
  return { countryCode: defaultPhoneCountryCode, localPart: fullPhoneNumber.replace(/\D/g, '') };
};


const getMainProfileValidationErrors = (profile: UserProfile, localPhonePart?: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  const ageNum = parseInt(profile.age);
  const weightNum = parseFloat(profile.weight);
  const heightNum = parseFloat(profile.height);

  if (!profile.name?.trim()) errors.push({ field: "name", message: "El nombre completo es requerido." });
  if (!profile.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.push({ field: "email", message: "Ingresa un correo electrónico válido." });
  }
  
  const localPhonePartDigits = localPhonePart?.replace(/\D/g, '') || "";
  if (!localPhonePartDigits.trim()) {
    errors.push({ field: "localPhonePart", message: "El número de teléfono local es requerido." });
  } else if (localPhonePartDigits.length < 7 || localPhonePartDigits.length > 13) { 
    errors.push({ field: "localPhonePart", message: "El número de teléfono local debe tener entre 7 y 13 dígitos." });
  }

  if (!profile.age || isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
    errors.push({ field: "age", message: "Ingresa una edad válida (1-120)." });
  }
  if (!profile.weight || isNaN(weightNum) || weightNum <= 10 || weightNum > 400) {
    errors.push({ field: "weight", message: "Ingresa un peso válido (10-400 kg)." });
  }

  if (!profile.height || isNaN(heightNum) || heightNum <= 0) {
    errors.push({ field: "height", message: "Ingresa una altura válida en centímetros." });
  } else if (heightNum > 0 && heightNum < 3) { // Check for likely meter input (e.g., 1.75)
    errors.push({ field: "height", message: `Altura (${profile.height}) parece estar en metros. Ingresa en centímetros (Ej: 175 para 1.75m).` });
  } else if (heightNum < 60) { // Check if too low, even if in cm
    errors.push({ field: "height", message: `Altura (${profile.height} cm) es muy baja. Si es correcta, podría afectar los cálculos. Verifica si es un error.` });
  } else if (heightNum > 250) { // Check if too high
    errors.push({ field: "height", message: "Ingresa una altura válida (hasta 250 cm)." });
  }
  
  if (profile.gender === "" || !Object.values(Gender).includes(profile.gender as Gender)) {
    errors.push({ field: "gender", message: "Selecciona tu género." });
  }
  if (profile.goals === "" || !Object.values(PersonalGoal).includes(profile.goals as PersonalGoal)) {
    errors.push({ field: "goals", message: "Selecciona tu objetivo principal." });
  }

  if (profile.isAthlete) {
    if (!profile.sportsDiscipline) {
      errors.push({ field: "sportsDiscipline", message: "Selecciona tu disciplina deportiva." });
    }
    if (profile.sportsDiscipline === SportsDiscipline.Other && !profile.customSportsDiscipline?.trim()) {
      errors.push({ field: "customSportsDiscipline", message: "Especifica tu disciplina deportiva." });
    }
    if (!profile.trainingLoad || !Object.values(TrainingLoad).includes(profile.trainingLoad as TrainingLoad)) {
      errors.push({ field: "trainingLoad", message: "Selecciona tu carga de entrenamiento." });
    }
  } else {
    if (!profile.trainingFrequency || !Object.values(TrainingFrequency).includes(profile.trainingFrequency as TrainingFrequency)) {
      errors.push({ field: "trainingFrequency", message: "Selecciona tu frecuencia de entrenamiento." });
    }
  }
  
  return errors;
};

const getInitialEditorProfileState = (initialPropsProfile: UserProfile): UserProfile => {
    const profileBase = { ...localInitialDefaultUserProfile, ...initialPropsProfile };
    profileBase.gender = Object.values(Gender).includes(initialPropsProfile.gender as Gender) ? initialPropsProfile.gender : "";
    profileBase.goals = Object.values(PersonalGoal).includes(initialPropsProfile.goals as PersonalGoal) ? initialPropsProfile.goals : "";
    profileBase.isAthlete = typeof initialPropsProfile.isAthlete === 'boolean' ? initialPropsProfile.isAthlete : false;

    if (profileBase.isAthlete) {
        profileBase.sportsDiscipline = initialPropsProfile.sportsDiscipline || undefined;
        profileBase.customSportsDiscipline = initialPropsProfile.customSportsDiscipline || '';
        profileBase.position = initialPropsProfile.position || '';
        profileBase.trainingLoad = Object.values(TrainingLoad).includes(initialPropsProfile.trainingLoad as TrainingLoad) ? initialPropsProfile.trainingLoad : TrainingLoad.LightTraining;
        profileBase.athleticGoals = initialPropsProfile.athleticGoals || [];
        delete (profileBase as any).trainingFrequency;
        profileBase.wellnessFocusAreas = []; 
    } else {
        profileBase.trainingFrequency = Object.values(TrainingFrequency).includes(initialPropsProfile.trainingFrequency as TrainingFrequency) ? initialPropsProfile.trainingFrequency : TrainingFrequency.NoneOrRarely;
        profileBase.wellnessFocusAreas = initialPropsProfile.wellnessFocusAreas || []; 
        delete (profileBase as any).sportsDiscipline;
        delete (profileBase as any).customSportsDiscipline;
        delete (profileBase as any).position;
        delete (profileBase as any).trainingLoad; 
        delete (profileBase as any).athleticGoals;
    }
    
    profileBase.dietaryApproaches = initialPropsProfile.dietaryApproaches || [];
    profileBase.dietaryRestrictions = initialPropsProfile.dietaryRestrictions || [];
    delete (profileBase as any).dietaryPreferencesAndRestrictions;

    profileBase.currentSupplementUsage = initialPropsProfile.currentSupplementUsage || "Prefiero no decirlo";
    profileBase.supplementInterestOrUsageDetails = initialPropsProfile.supplementInterestOrUsageDetails || '';
    
    profileBase.moodToday = initialPropsProfile.moodToday || '';
    profileBase.trainedToday = initialPropsProfile.trainedToday || '';
    profileBase.hadBreakfast = initialPropsProfile.hadBreakfast || '';
    profileBase.energyLevel = initialPropsProfile.energyLevel || '';
    profileBase.lastCheckInTimestamp = initialPropsProfile.lastCheckInTimestamp || undefined;

    return profileBase;
};


export const ProfileEditor: React.FC<ProfileEditorProps> = ({ initialProfile, onUpdateProfile, onEditingComplete, isActive, onClearCache }) => {
  const [profile, setProfile] = useState<UserProfile>(() => getInitialEditorProfileState(initialProfile));
  const [isAthlete, setIsAthlete] = useState<boolean>(() => typeof initialProfile.isAthlete === 'boolean' ? initialProfile.isAthlete : false);
  
  const { countryCode: initialCountryCode, localPart: initialLocalPart } = splitPhoneNumber(initialProfile.phone);
  const [localPhoneCountryCode, setLocalPhoneCountryCode] = useState<string>(initialCountryCode);
  const [localPhonePart, setLocalPhonePart] = useState<string>(initialLocalPart);

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitEnabled, setIsSubmitEnabled] = useState<boolean>(false);
  const [currentPositionOptions, setCurrentPositionOptions] = useState<Record<string, string> | null>(null);
  const [showPositionField, setShowPositionField] = useState<boolean>(true);
  const [positionInputType, setPositionInputType] = useState<'select' | 'text' | 'none'>('none');
  const [showDailyCheckInSection, setShowDailyCheckInSection] = useState<boolean>(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const newResolvedProfile = getInitialEditorProfileState(initialProfile);
    setProfile(newResolvedProfile);
    setIsAthlete(newResolvedProfile.isAthlete);
    const { countryCode, localPart } = splitPhoneNumber(initialProfile.phone);
    setLocalPhoneCountryCode(countryCode);
    setLocalPhonePart(localPart);
    setValidationErrors([]); // Clear errors when initial profile changes
  }, [initialProfile]);

  useEffect(() => {
    if (isActive) {
      setShowDailyCheckInSection(false);
      setValidationErrors([]); // Clear errors when tab becomes active
    }
  }, [isActive]); 
  
  useEffect(() => {
    const sanitizedLocalPart = localPhonePart.replace(/\D/g, ''); 
    const fullPhoneNumber = localPhoneCountryCode + sanitizedLocalPart;
    setProfile(prev => ({ ...prev, phone: fullPhoneNumber }));
  }, [localPhoneCountryCode, localPhonePart]);

  useEffect(() => {
    setIsSubmitEnabled(getMainProfileValidationErrors(profile, localPhonePart).length === 0);
  }, [profile, localPhonePart]);

  useEffect(() => {
    if (profile.isAthlete) {
      const discipline = profile.sportsDiscipline;
      if (discipline && discipline !== SportsDiscipline.Other) {
        setCurrentPositionOptions(disciplinePositionsMap[discipline as SportsDiscipline] || null);
        const noPos = disciplinesWithNoPositions.includes(discipline as SportsDiscipline);
        setShowPositionField(!noPos);
        setPositionInputType(disciplinePositionsMap[discipline as SportsDiscipline] ? 'select' : (noPos ? 'none' : 'text'));
      } else if (discipline === SportsDiscipline.Other) {
        setCurrentPositionOptions(null);
        setShowPositionField(true); 
        setPositionInputType('text');
      } else {
        setCurrentPositionOptions(null);
        setShowPositionField(false);
        setPositionInputType('none');
      }
    } else {
      setShowPositionField(false);
      setPositionInputType('none');
    }
  }, [profile.isAthlete, profile.sportsDiscipline]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "localPhoneCountryCode") {
        setLocalPhoneCountryCode(value);
    } else if (name === "localPhonePart") {
        const filteredValue = value.replace(/[^\d\s()-]/g, '');
        setLocalPhonePart(filteredValue);
    } else {
        setProfile(prev => {
          const updatedProfile = { ...prev, [name]: value };
          if (name === "sportsDiscipline" && value !== SportsDiscipline.Other) {
            updatedProfile.customSportsDiscipline = ''; 
            if (value === "" || disciplinesWithNoPositions.includes(value as SportsDiscipline) || !disciplinePositionsMap[value as SportsDiscipline]) {
              updatedProfile.position = ''; 
            }
          }
          return updatedProfile;
        });
    }
  };

  const handleCheckboxGroupChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    fieldName: 'dietaryApproaches' | 'dietaryRestrictions' | 'wellnessFocusAreas' | 'athleticGoals'
  ) => {
    const { value, checked } = e.target;
    setProfile(prev => {
      const currentValues = prev[fieldName] || [];
      const newValues = checked 
        ? [...currentValues, value] 
        : currentValues.filter(item => item !== value);
      return { ...prev, [fieldName]: newValues };
    });
  };

  const handleIsAthleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIsAthleteValue = e.target.value === 'yes';
    setIsAthlete(newIsAthleteValue);
    setProfile(prev => {
      const updatedProfile = { ...prev, isAthlete: newIsAthleteValue };
      if (newIsAthleteValue) {
        updatedProfile.sportsDiscipline = prev.sportsDiscipline || undefined;
        updatedProfile.customSportsDiscipline = prev.customSportsDiscipline || '';
        updatedProfile.position = prev.position || '';
        updatedProfile.trainingLoad = prev.trainingLoad && Object.values(TrainingLoad).includes(prev.trainingLoad as TrainingLoad) ? prev.trainingLoad : TrainingLoad.LightTraining;
        updatedProfile.athleticGoals = prev.athleticGoals || [];
        delete (updatedProfile as any).trainingFrequency;
        updatedProfile.wellnessFocusAreas = []; 
      } else {
        updatedProfile.trainingFrequency = prev.trainingFrequency && Object.values(TrainingFrequency).includes(prev.trainingFrequency as TrainingFrequency) ? prev.trainingFrequency : TrainingFrequency.NoneOrRarely;
        updatedProfile.wellnessFocusAreas = prev.wellnessFocusAreas || []; 
        delete (updatedProfile as any).sportsDiscipline;
        delete (updatedProfile as any).customSportsDiscipline;
        delete (updatedProfile as any).position;
        delete (updatedProfile as any).trainingLoad; 
        delete (updatedProfile as any).athleticGoals;
      }
      return updatedProfile;
    });
  };

  const handleMainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let profileToUpdate = { ...profile };
    profileToUpdate.phone = localPhoneCountryCode + localPhonePart.replace(/\D/g, ''); 

    if (profileToUpdate.isAthlete && profileToUpdate.sportsDiscipline === SportsDiscipline.Other) {
      profileToUpdate.sportsDiscipline = profileToUpdate.customSportsDiscipline?.trim() || SportsDiscipline.Other;
    }
    
    const errors = getMainProfileValidationErrors(profileToUpdate, localPhonePart);
    setValidationErrors(errors);

    if (errors.length > 0) {
      const firstErrorField = document.getElementById(errors[0].field);
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus({ preventScroll: true });
      }
      return;
    }
    onUpdateProfile(profileToUpdate, true); 
    setShowDailyCheckInSection(true); 
  };

  const handleDailyCheckInSave = () => {
    const profileWithCurrentPhone = {
        ...profile,
        phone: localPhoneCountryCode + localPhonePart.replace(/\D/g, '')
    };
    onUpdateProfile(profileWithCurrentPhone, false); 
    onEditingComplete();
  };

  const handleSkipDailyCheckIn = () => {
    onEditingComplete();
  };
  
  const commonSelectClasses = "mt-1 block w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm transition-colors placeholder-slate-400";
  const commonInputClasses = `${commonSelectClasses}`;
  const commonTextareaClasses = `${commonInputClasses} min-h-[80px]`;
  const checkboxLabelClasses = "ml-2 text-sm text-slate-200";
  const checkboxInputClasses = "form-checkbox h-4 w-4 text-orange-500 bg-slate-500 border-slate-400 rounded focus:ring-orange-500 focus:ring-offset-slate-700";
  const primaryButtonClasses = "w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-orange-600 transition-transform transform hover:scale-105 active:scale-95 disabled:bg-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100";
  const secondaryButtonClasses = "w-full flex justify-center py-2 px-4 border border-slate-500 rounded-lg shadow-sm text-sm font-medium text-slate-200 bg-slate-600 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-orange-500 transition-colors";
  const destructiveButtonClasses = "w-full flex items-center justify-center py-2 px-4 border border-red-700 rounded-lg shadow-sm text-sm font-medium text-red-300 bg-red-900/50 hover:bg-red-800/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-red-600 transition-colors";


  const focusField = (fieldId: string) => {
    const fieldElement = document.getElementById(fieldId);
    if (fieldElement) {
      fieldElement.focus();
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-700 text-slate-200 rounded-lg shadow-xl animate-fadeIn">
      {!showDailyCheckInSection && (
        <h2 className="text-2xl font-semibold text-slate-100 mb-6 border-b pb-3 border-slate-600">Tu Perfil Nutricional 📝</h2>
      )}
      {showDailyCheckInSection && (
         <h2 className="text-2xl font-semibold text-slate-100 mb-6 border-b pb-3 border-slate-600">Check-in Diario (Opcional)</h2>
      )}

      {validationErrors.length > 0 && !showDailyCheckInSection && (
        <div className="bg-red-700/30 border border-red-500 text-red-300 px-4 py-3 rounded-md mb-6 shadow-md animate-fadeIn" role="alert">
          <p className="font-bold text-red-200">Por favor, corrige los siguientes errores:</p>
          <ul className="list-disc list-inside mt-2 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>
                <button 
                  onClick={() => focusField(error.field)} 
                  className="text-red-300 hover:text-red-200 underline focus:outline-none focus:ring-1 focus:ring-red-400 rounded-sm px-0.5"
                  aria-label={`Ir al campo ${error.field}`}
                >
                  {error.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form ref={formRef} onSubmit={handleMainSubmit} className="space-y-6">
        {!showDailyCheckInSection && (
          <>
            <fieldset className="border border-slate-600 p-4 rounded-md">
              <legend className="text-lg font-medium text-orange-400 px-2">Información Básica</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo <span className="text-red-400">*</span> 📛</label>
                  <input type="text" name="name" id="name" value={profile.name || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: Alex Morgan" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico <span className="text-red-400">*</span> 📧</label>
                  <input type="email" name="email" id="email" value={profile.email || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: usuario@example.com" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="localPhoneCountryCode" className="block text-sm font-medium text-slate-300 mb-1">Número Telefónico <span className="text-red-400">*</span> 📞</label>
                  <div className="flex space-x-2">
                    <select 
                        name="localPhoneCountryCode" 
                        id="localPhoneCountryCode" 
                        value={localPhoneCountryCode} 
                        onChange={handleChange} 
                        className={`${commonSelectClasses} w-auto sm:w-2/5 md:w-1/3`}
                        aria-label="Código de país"
                    >
                        {phoneCountryCodes.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <input 
                        type="tel" 
                        name="localPhonePart" 
                        id="localPhonePart" 
                        value={localPhonePart} 
                        onChange={handleChange} 
                        required 
                        className={`${commonInputClasses} flex-grow`} 
                        placeholder="Ej: 5512345678" 
                        aria-label="Número de teléfono local"
                        pattern="\s*\d[\d\s()-]{5,13}\d\s*"
                        title="Ingresa un número válido (7-13 dígitos, opcionalmente con espacios, guiones o paréntesis)."
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="border border-slate-600 p-4 rounded-md">
              <legend className="text-lg font-medium text-orange-400 px-2">Datos Físicos y Objetivos Generales</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-slate-300 mb-1">Edad (años) <span className="text-red-400">*</span> 🎂</label>
                  <input type="number" name="age" id="age" value={profile.age || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 24" min="1" max="120" />
                </div>
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-slate-300 mb-1">Peso (kg) <span className="text-red-400">*</span> ⚖️</label>
                  <input type="number" step="0.1" name="weight" id="weight" value={profile.weight || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 78.5" min="10" max="400"/>
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-slate-300 mb-1">Altura (cm) <span className="text-red-400">*</span> 📏</label>
                  <input type="number" name="height" id="height" value={profile.height || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: 180" min="1" />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1">Género <span className="text-red-400">*</span> 🚻</label>
                  <select name="gender" id="gender" value={profile.gender || ''} onChange={handleChange} required className={commonSelectClasses}>
                    <option value="" disabled className="text-slate-400">Selecciona tu género...</option>
                    {Object.values(Gender).map(g => <option key={g} value={g} className="text-slate-100 bg-slate-600">{g}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="goals" className="block text-sm font-medium text-slate-300 mb-1">Objetivo Principal (General) <span className="text-red-400">*</span> 🎯</label>
                  <select name="goals" id="goals" value={profile.goals || ''} onChange={handleChange} required className={commonSelectClasses}>
                    <option value="" disabled className="text-slate-400">Selecciona tu objetivo...</option>
                    {Object.values(PersonalGoal).map(goal => <option key={goal} value={goal} className="text-slate-100 bg-slate-600">{goal}</option>)}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="border border-slate-600 p-4 rounded-md">
              <legend className="text-lg font-medium text-orange-400 px-2">Actividad Deportiva</legend>
              <div className="mt-4">
                <span className="block text-sm font-medium text-slate-300 mb-1">¿Eres atleta o practicas deporte de forma competitiva/seria? <span className="text-red-400">*</span> 🤔</span>
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
                <div className="space-y-6 animate-fadeIn mt-4">
                  <div>
                    <label htmlFor="sportsDiscipline" className="block text-sm font-medium text-slate-300 mb-1">Disciplina Deportiva Principal <span className="text-red-400">*</span> 🏅</label>
                    <select name="sportsDiscipline" id="sportsDiscipline" value={profile.sportsDiscipline || ''} onChange={handleChange} required className={commonSelectClasses}>
                      <option value="" disabled>Selecciona disciplina...</option>
                      {Object.values(SportsDiscipline).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {profile.sportsDiscipline === SportsDiscipline.Other && (
                    <div className="animate-fadeIn">
                      <label htmlFor="customSportsDiscipline" className="block text-sm font-medium text-slate-300 mb-1">Especifica tu disciplina <span className="text-red-400">*</span></label>
                      <input type="text" name="customSportsDiscipline" id="customSportsDiscipline" value={profile.customSportsDiscipline || ''} onChange={handleChange} required className={commonInputClasses} placeholder="Ej: Escalada Deportiva, Parkour"/>
                    </div>
                  )}
                  {showPositionField && positionInputType === 'select' && currentPositionOptions && (
                    <div className="animate-fadeIn">
                        <label htmlFor="position" className="block text-sm font-medium text-slate-300 mb-1">Posición en {profile.sportsDiscipline} <span className="text-red-400">*</span></label>
                        <select name="position" id="position" value={profile.position || ''} onChange={handleChange} required className={commonSelectClasses}>
                            <option value="" disabled>Selecciona posición...</option>
                            {Object.entries(currentPositionOptions).map(([key, val]) => <option key={key} value={val}>{val}</option>)}
                        </select>
                    </div>
                  )}
                  {showPositionField && positionInputType === 'text' && (
                    <div className="animate-fadeIn">
                        <label htmlFor="position" className="block text-sm font-medium text-slate-300 mb-1">Rol o Posición (si aplica)</label>
                        <input type="text" name="position" id="position" value={profile.position || ''} onChange={handleChange} className={commonInputClasses} placeholder="Ej: Capitán, Estratega, Rol específico"/>
                    </div>
                  )}
                  <div>
                    <label htmlFor="trainingLoad" className="block text-sm font-medium text-slate-300 mb-1">Carga de Entrenamiento Típica/Actual <span className="text-red-400">*</span> 🏋️</label>
                    <select name="trainingLoad" id="trainingLoad" value={profile.trainingLoad || ''} onChange={handleChange} required className={commonSelectClasses}>
                      <option value="" disabled>Selecciona carga...</option>
                      {Object.values(TrainingLoad).map(tl => <option key={tl} value={tl}>{tl}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Objetivos Deportivos Específicos (selecciona los que apliquen) 📈</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {Object.values(AthleticGoalOptions).map(option => (
                        <label key={option} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                          <input type="checkbox" name="athleticGoals" value={option} checked={(profile.athleticGoals || []).includes(option as AthleticGoalOptions)} onChange={(e) => handleCheckboxGroupChange(e, 'athleticGoals')} className={checkboxInputClasses}/>
                          <span className={checkboxLabelClasses}>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!isAthlete && (
                <div className="animate-fadeIn mt-4">
                  <label htmlFor="trainingFrequency" className="block text-sm font-medium text-slate-300 mb-1">Frecuencia de entrenamiento semanal (General) <span className="text-red-400">*</span> 🗓️</label>
                  <select name="trainingFrequency" id="trainingFrequency" value={profile.trainingFrequency || ''} onChange={handleChange} required className={commonSelectClasses}>
                    <option value="" disabled>Selecciona frecuencia...</option>
                    {Object.values(TrainingFrequency).map(tf => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>
              )}
            </fieldset>
            
            <fieldset className="border border-slate-600 p-4 rounded-md">
              <legend className="text-lg font-medium text-orange-400 px-2">Preferencias y Bienestar (Opcional)</legend>
              <div className="space-y-6 mt-4"> 
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Preferencias Alimentarias / Enfoques Dietéticos 🥗</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {Object.values(DietaryApproachOptions).map(option => (
                      <label key={option} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                        <input type="checkbox" name="dietaryApproaches" value={option} checked={(profile.dietaryApproaches || []).includes(option)} onChange={(e) => handleCheckboxGroupChange(e, 'dietaryApproaches')} className={checkboxInputClasses}/>
                        <span className={checkboxLabelClasses}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Restricciones Alimentarias o Alergias 🚫</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {Object.values(DietaryRestrictionOptions).map(option => (
                      <label key={option} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                        <input type="checkbox" name="dietaryRestrictions" value={option} checked={(profile.dietaryRestrictions || []).includes(option)} onChange={(e) => handleCheckboxGroupChange(e, 'dietaryRestrictions')} className={checkboxInputClasses}/>
                        <span className={checkboxLabelClasses}>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="currentSupplementUsage" className="block text-sm font-medium text-slate-300 mb-1">¿Consumes suplementos actualmente? 💊</label>
                  <select name="currentSupplementUsage" id="currentSupplementUsage" value={profile.currentSupplementUsage || "Prefiero no decirlo"} onChange={handleChange} className={commonSelectClasses}>
                    <option value="Sí">Sí</option>
                    <option value="No">No</option>
                    <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                  </select>
                </div>
                {(profile.currentSupplementUsage === "Sí" || profile.supplementInterestOrUsageDetails) && (
                  <div className="animate-fadeIn">
                    <label htmlFor="supplementInterestOrUsageDetails" className="block text-sm font-medium text-slate-300 mb-1">Detalles sobre suplementos (opcional)</label>
                    <textarea name="supplementInterestOrUsageDetails" id="supplementInterestOrUsageDetails" value={profile.supplementInterestOrUsageDetails || ''} onChange={handleChange} className={commonTextareaClasses} placeholder="Ej: Proteína whey después de entrenar, creatina, multivitamínico diario." />
                  </div>
                )}
                {!isAthlete && ( 
                  <div className="animate-fadeIn">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Áreas de Bienestar de Interés ❤️‍🩹</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {Object.values(WellnessFocusAreaOptions).map(option => (
                        <label key={option} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-600 transition-colors cursor-pointer">
                          <input type="checkbox" name="wellnessFocusAreas" value={option} checked={(profile.wellnessFocusAreas || []).includes(option)} onChange={(e) => handleCheckboxGroupChange(e, 'wellnessFocusAreas')} className={checkboxInputClasses}/>
                          <span className={checkboxLabelClasses}>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </fieldset>
            <div className="pt-6">
              <button type="submit" disabled={!isSubmitEnabled && validationErrors.length > 0} className={primaryButtonClasses} aria-live="polite">
                {isSubmitEnabled || validationErrors.length === 0 ? 'Actualizar Perfil y Ver Check-in Diario ➡️' : 'Revisa los campos marcados (*)'}
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-600">
                <button 
                  type="button" 
                  onClick={onClearCache} 
                  className={destructiveButtonClasses}
                  aria-label="Borrar datos locales y empezar de nuevo"
                >
                  <TrashIcon className="w-5 h-5 mr-2" />
                  Borrar Datos Locales y Empezar de Nuevo
                </button>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Esto eliminará tu perfil, historial de chat y registro de comidas de este navegador.
                </p>
            </div>
          </>
        )}
      </form>

      {showDailyCheckInSection && (
        <div className="animate-fadeIn mt-8 pt-6 border-t border-slate-600">
           <p className="text-sm text-slate-300 mb-4">¡Perfil principal guardado! Ahora, si lo deseas, puedes agregar tu check-in de hoy.</p>
          <fieldset className="border border-slate-600 p-4 rounded-md">
            <legend className="text-lg font-medium text-orange-400 px-2">Check-in Diario</legend>
            <p className="text-xs text-slate-400 mb-3">Esta información ayuda a la IA a entender tu estado actual. También te podrá preguntar esto en el chat.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label htmlFor="moodToday" className="block text-sm font-medium text-slate-300 mb-1">¿Cómo te sientes hoy? 😊</label>
                <select name="moodToday" id="moodToday" value={profile.moodToday || ''} onChange={handleChange} className={commonSelectClasses}> <option value="">No especificar</option> {Object.values(MoodTodayOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
              </div>
              <div>
                <label htmlFor="trainedToday" className="block text-sm font-medium text-slate-300 mb-1">¿Entrenamiento de hoy? 💪</label>
                <select name="trainedToday" id="trainedToday" value={profile.trainedToday || ''} onChange={handleChange} className={commonSelectClasses}> <option value="">No especificar</option> {Object.values(TrainedTodayOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
              </div>
              <div>
                <label htmlFor="hadBreakfast" className="block text-sm font-medium text-slate-300 mb-1">¿Desayunaste? 🥞</label>
                <select name="hadBreakfast" id="hadBreakfast" value={profile.hadBreakfast || ''} onChange={handleChange} className={commonSelectClasses}> <option value="">No especificar</option> {Object.values(HadBreakfastOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
              </div>
              <div>
                <label htmlFor="energyLevel" className="block text-sm font-medium text-slate-300 mb-1">Nivel de Energía Hoy ⚡</label>
                <select name="energyLevel" id="energyLevel" value={profile.energyLevel || ''} onChange={handleChange} className={commonSelectClasses}> <option value="">No especificar</option> {Object.values(EnergyLevelOptions).map(opt => <option key={opt} value={opt}>{opt}</option>)} </select>
              </div>
            </div>
          </fieldset>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button onClick={handleDailyCheckInSave} className={primaryButtonClasses}> Guardar Check-in y Ver Chat ✅ </button>
            <button onClick={handleSkipDailyCheckIn} className={secondaryButtonClasses}> Omitir e Ir al Chat ⏭️ </button>
          </div>
        </div>
      )}
    </div>
  );
};
