// Existing UserProfile and Message interfaces ... (no changes here, just for context)
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age: string;
  weight: string;
  height: string;
  gender: Gender | ""; 
  isAthlete: boolean; 
  // Athlete specific fields
  sportsDiscipline?: SportsDiscipline | string; // Holds enum value or custom string if 'Other'
  customSportsDiscipline?: string; // Temporary UI field if sportsDiscipline is 'Other'
  position?: string; // Generic position, contextually filled
  trainingLoad?: TrainingLoad; // For athletes
  athleticGoals?: AthleticGoalOptions[]; // New multi-select for athlete goals
  // Non-athlete specific fields
  trainingFrequency?: TrainingFrequency; 
  // Common fields
  goals: PersonalGoal | ""; 

  // Updated dietary fields
  dietaryApproaches?: DietaryApproachOptions[];
  dietaryRestrictions?: DietaryRestrictionOptions[];

  currentSupplementUsage?: "Sí" | "No" | "Prefiero no decirlo";
  supplementInterestOrUsageDetails?: string;
  wellnessFocusAreas?: string[];

  // New fields for "daily check-in"
  moodToday?: string; // Represents MoodTodayOptions
  trainedToday?: string; // Represents TrainedTodayOptions
  hadBreakfast?: string; // Represents HadBreakfastOptions
  energyLevel?: string; // Represents EnergyLevelOptions
  sleepHours?: string; // e.g., "7", "6-7", "8.5"
  sleepQuality?: SleepQualityOptions | "";
  lastCheckInTimestamp?: number; // Unix timestamp
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  feedback?: 'up' | 'down' | null; // Added for feedback
}

// --- Start of existing enums (no changes) ---
export enum Gender {
  Male = "Masculino",
  Female = "Femenino",
}

export enum FootballPosition {
  Goalkeeper = "Portero",
  Defender = "Defensa",
  Midfielder = "Mediocampista",
  Forward = "Delantero",
  Versatile = "Versátil / Otro (Fútbol)"
}

export enum TrainingLoad { 
  RestDay = "Día de Descanso / Recuperación Activa", 
  LightTraining = "Entrenamiento Ligero / Técnico", 
  ModerateTraining = "Entrenamiento Moderado / Táctico",
  IntenseTraining = "Entrenamiento Intenso / Fuerza / Resistencia", 
  MatchDay = "Día de Partido / Competición" 
}

export enum TrainingFrequency { 
  NoneOrRarely = "No entreno o menos de 2 veces por semana", 
  TwoToThree = "2-3 veces por semana", 
  FourTimes = "4 veces por semana",    
  FiveToSix = "5-6 veces por semana",  
  DailyOrMore = "7 o más veces por semana (diario o más)" 
}

export enum PersonalGoal { 
  LoseWeightHealthy = "Perder peso de forma saludable",
  GainMuscleImproveComposition = "Aumentar masa muscular y mejorar composición corporal",
  MaintainWeightImproveWellbeing = "Mantener mi peso actual y mejorar bienestar general",
  ImproveEnergyVitality = "Mejorar mis niveles de energía y vitalidad",
  LearnHealthierEating = "Aprender a comer más saludable y equilibrado",
  ImproveGeneralPhysicalPerformance = "Mejorar mi rendimiento físico general (no competitivo)"
}

export enum SportsDiscipline {
  Football = "Fútbol",
  Basketball = "Baloncesto (Basketball)",
  Baseball = "Béisbol",
  Volleyball = "Voleibol",
  Tennis = "Tenis",
  Swimming = "Natación",
  Athletics = "Atletismo (Pista y Campo)",
  Cycling = "Ciclismo",
  Boxing = "Boxeo",
  Judo = "Judo",
  Weightlifting = "Halterofilia / Levantamiento de Pesas",
  Crossfit = "Crossfit",
  ESports = "eSports / Videojuegos Competitivos",
  Motorsports = "Automovilismo / Motociclismo",
  Gymnastics = "Gimnasia",
  Other = "Otro (Especificar)"
}

export enum BasketballPosition {
  PointGuard = "Base (Point Guard)",
  ShootingGuard = "Escolta (Shooting Guard)",
  SmallForward = "Alero (Small Forward)",
  PowerForward = "Ala-Pívot (Power Forward)",
  Center = "Pívot (Center)",
  Versatile = "Versátil / Otro (Baloncesto)"
}

export enum BaseballPosition {
  Pitcher = "Lanzador (Pitcher)",
  Catcher = "Receptor (Catcher)",
  FirstBase = "Primera Base",
  SecondBase = "Segunda Base",
  ThirdBase = "Tercera Base",
  Shortstop = "Campocorto (Shortstop)",
  LeftFielder = "Jardinero Izquierdo",
  CenterFielder = "Jardinero Central",
  RightFielder = "Jardinero Derecho",
  DesignatedHitter = "Bateador Designado",
  Versatile = "Versátil / Otro (Béisbol)"
}

export enum VolleyballPosition {
  Setter = "Colocador(a)",
  OutsideHitter = "Atacante Externo / Punta",
  OppositeHitter = "Opuesto(a)",
  MiddleBlocker = "Central",
  Libero = "Líbero",
  DefensiveSpecialist = "Especialista Defensivo",
  Versatile = "Versátil / Otro (Voleibol)"
}

export enum AthleticGoalOptions {
  FatLossPerformance = "Perder grasa corporal (manteniendo rendimiento)",
  MuscleGainPower = "Aumentar masa muscular y potencia",
  MaxStrength = "Mejorar fuerza máxima",
  SpeedAgility = "Incrementar velocidad y agilidad",
  EnduranceStamina = "Mejorar resistencia y aguante",
  RecoveryOptimization = "Optimizar recuperación post-entrenamiento/competición",
  InjuryPrevention = "Prevención de lesiones",
  ImproveReactionTime = "Mejorar tiempo de reacción (para eSports u otros)",
  MentalFocus = "Mejorar concentración y enfoque mental deportivo"
}

export enum DietaryApproachOptions {
  Vegetarian = "Vegetariano (no come carne ni pescado)",
  Vegan = "Vegano (no come ningún producto animal)",
  Flexitarian = "Flexitariano (mayoritariamente vegetal, consumo ocasional de carne/pescado)",
  Pescatarian = "Pescetariano (come pescado, no otras carnes)",
  LowCarb = "Bajo en Carbohidratos",
  Mediterranean = "Dieta Mediterránea",
  IntuitiveEating = "Alimentación Intuitiva / Flexible",
  RealFood = "Comida Real / Poco Procesada",
  Paleo = "Paleo",
  Keto = "Keto",
}

export enum DietaryRestrictionOptions {
  GlutenFree = "Sin Gluten (por celiaquía o sensibilidad)",
  LactoseFree = "Sin Lactosa (por intolerancia)",
  NutAllergy = "Alergia: Frutos Secos (ej: nueces, almendras)",
  PeanutAllergy = "Alergia: Cacahuetes / Maní",
  ShellfishAllergy = "Alergia: Mariscos",
  SoyAllergy = "Alergia: Soja",
  EggAllergy = "Alergia: Huevo",
  FishAllergy = "Alergia: Pescado",
  SesameAllergy = "Alergia: Sésamo",
  AvoidsPork = "Evito el cerdo",
  AvoidsRedMeat = "Evito carnes rojas",
  OtherSpecifyInChat = "Otro (especificaré en el chat si es necesario)",
}

export enum WellnessFocusAreaOptions {
  ImproveEnergy = "Mejorar niveles de energía",
  OptimizeSleep = "Optimizar descanso/sueño",
  DigestiveHealth = "Salud digestiva",
  JointCare = "Cuidado articular",
  StressManagement = "Manejo del estrés (nutrición)",
  ImmuneSupport = "Reforzar sistema inmune",
  CardioHealth = "Salud cardiovascular",
  SkinHealth = "Salud de la piel",
  GeneralMentalFocus = "Concentración y enfoque mental (general)"
}

export enum MoodTodayOptions {
  Happy = "Contento/a 😄",
  Normal = "Normal 🙂",
  BitDown = "Algo decaído/a 😕",
  Stressed = "Estresado/a 😥",
  Tired = "Cansado/a 😴",
  Energetic = "Con mucha energía 💪"
}

export enum TrainedTodayOptions {
  Intense = "Sí, entrenamiento intenso 🔥",
  Moderate = "Sí, entrenamiento moderado 👍",
  Light = "Sí, entrenamiento ligero 👟",
  RestDay = "No, día de descanso 🧘",
  NotYet = "Aún no he entrenado hoy ⏳",
  NoDidNotTrain = "No, hoy no entrené (otro motivo) 🚫" // Nueva opción
}

export enum HadBreakfastOptions {
  YesFull = "Sí, un desayuno completo 든",
  YesLight = "Sí, algo ligero ☕",
  NotYet = "No, aún no he desayunado 🚫",
  Skipped = "Generalmente no desayuno (ayuno)"
}

export enum EnergyLevelOptions {
  VeryHigh = "Muy alto ⚡⚡",
  High = "Alto ⚡",
  Normal = "Normal 👍",
  Low = "Bajo 📉",
  VeryLow = "Muy bajo 😩"
}

// ---- New Enum for Sleep Quality ----
export enum SleepQualityOptions {
  Excellent = "Excelente 🌟",
  Good = "Buena 👍",
  Regular = "Regular 😐",
  Poor = "Mala 👎"
}
// ---- End of New Enum ----


export interface DailyIntake {
  date: string; // YYYY-MM-DD format
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatsConsumed: number;
}

export interface NutrientTargets {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
}

export interface EstimatedFoodIntake {
  foodDescription: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

// ---- New Types for Supabase Auth ----
export interface SupabaseUser {
  id: string;
  email?: string;
  // Add other user properties from Supabase if needed
}

export interface SupabaseSession {
  user: SupabaseUser;
  access_token: string;
  // Add other session properties from Supabase if needed
}
// ---- End of New Auth Types ----

// ---- New Type for Admin Panel ----
export interface AdminUserView {
  id: string; // user_id from Supabase auth (user_profiles.id)
  name: string | null;
  email: string | null;
  last_updated_at: string | null; // from user_profiles.last_updated_at
  is_athlete: boolean | null;
  gender: string | null;
  goals: string | null; // This corresponds to PersonalGoal enum
  age: string | null; // Stored as string, needs parsing for calculations
}
// ---- End of New Admin Panel Type ----
