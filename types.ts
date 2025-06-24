

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age: string;
  weight: string;
  height: string;
  gender: Gender | ""; 
  isAthlete: boolean; 
  position?: FootballPosition; 
  trainingLoad?: TrainingLoad;
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

export enum FootballPosition {
  Goalkeeper = "Portero",
  Defender = "Defensa",
  Midfielder = "Mediocampista",
  Forward = "Delantero",
  Versatile = "Versátil / Otro"
}

export enum TrainingLoad {
  RestDay = "Día de Descanso", 
  LightTraining = "Entrenamiento Ligero", 
  IntenseTraining = "Entrenamiento Intenso", 
  MatchDay = "Día de Partido" 
}

export enum TrainingFrequency {
  NoneOrRarely = "No entreno o menos de 2 veces por semana", 
  TwoToThree = "2-3 veces por semana", 
  FourTimes = "4 veces por semana",    
  FiveToSix = "5-6 veces por semana",  
  DailyOrMore = "7 o más veces por semana (diario o más)" 
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