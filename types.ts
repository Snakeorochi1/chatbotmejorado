

export interface UserProfile {
  age: string;
  weight: string;
  height: string;
  gender: string; // Will be validated against the simplified Gender enum
  isAthlete: boolean; 
  // Fields for athletes (isAthlete = true)
  position?: FootballPosition; 
  trainingLoad?: TrainingLoad;
  // Fields for non-athletes (isAthlete = false)
  trainingFrequency?: TrainingFrequency; 
  goals: PersonalGoal | ""; 
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export enum Gender {
  Male = "Masculino",
  Female = "Femenino",
}

// For athlete specific questions
export enum FootballPosition {
  Goalkeeper = "Portero",
  Defender = "Defensa",
  Midfielder = "Mediocampista",
  Forward = "Delantero",
  Versatile = "Versátil / Otro"
}

// For athlete specific questions
export enum TrainingLoad {
  RestDay = "Día de Descanso", // Factor: 1.2
  LightTraining = "Entrenamiento Ligero", // Factor: 1.375
  IntenseTraining = "Entrenamiento Intenso", // Factor: 1.725
  MatchDay = "Día de Partido" // Factor: 1.9
}

// For non-athlete specific questions
export enum TrainingFrequency {
  NoneOrRarely = "No entreno o menos de 2 veces por semana", // Factor: 1.3 (Ligera)
  TwoToThree = "2-3 veces por semana", // Factor: 1.3 (Ligera)
  FourTimes = "4 veces por semana",    // Factor: 1.5 (Moderada)
  FiveToSix = "5-6 veces por semana",  // Factor: 1.8 (Alta)
  DailyOrMore = "7 o más veces por semana (diario o más)" // Factor: 2.0 (Muy Alta)
}

export enum PersonalGoal {
  LoseWeight = "Perder peso",
  GainMuscle = "Ganar masa muscular",
  MaintainAndPerform = "Mantener peso pero mejorar mi rendimiento",
  ImproveStrength = "Mejorar mi fuerza",
  ImproveSpeed = "Mejorar mi velocidad",
  ImproveEndurance = "No cansarme / Mejorar resistencia",
  AvoidCramps = "No sufrir calambres"
}