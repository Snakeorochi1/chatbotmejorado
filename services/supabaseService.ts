

import { createClient, SupabaseClient, Session as SupabaseAuthSession, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { UserProfile, SportsDiscipline, DietaryApproachOptions, DietaryRestrictionOptions, SupabaseSession, SupabaseUser, AdminUserView, SleepQualityOptions } from '../types';

// =====================================================================================
// Usuario ya ha configurado estas credenciales.
// =====================================================================================
const YOUR_SUPABASE_URL: string = "https://ztqdbvpcfutknsxtqfwu.supabase.co";
const YOUR_SUPABASE_ANON_KEY: string = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cWRidnBjZnV0a25zeHRxZnd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3ODE1NTAsImV4cCI6MjA2NjM1NzU1MH0.8M_GZ2xbiTrNttqpaffHZ-IVDkZ6dp1DI2Ft3Bz7hoE";
// =====================================================================================

let supabase: SupabaseClient | null = null;
let supabaseInitializationError: Error | null = null;

export type SupabaseServiceStatus = {
  clientInitialized: boolean;
  error: Error | null;
  detailedMessage?: string;
};

if (!YOUR_SUPABASE_URL || YOUR_SUPABASE_URL.includes("COPIA_AQUÍ") || YOUR_SUPABASE_URL.length < 15) {
  supabaseInitializationError = new Error("La URL de Supabase no está configurada o es inválida. Revisa la configuración.");
  console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
} else if (!YOUR_SUPABASE_ANON_KEY || YOUR_SUPABASE_ANON_KEY.includes("COPIA_AQUÍ") || YOUR_SUPABASE_ANON_KEY.length < 30) {
  supabaseInitializationError = new Error("La Clave Anónima (Anon Key) de Supabase no está configurada o es inválida. Revisa la configuración.");
  console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
} else {
  try {
    supabase = createClient(YOUR_SUPABASE_URL, YOUR_SUPABASE_ANON_KEY, {
      auth: {
        // Supabase JS v2 automatically persists session in localStorage by default.
        // autoRefreshToken: true, // default
        // detectSessionInUrl: true, // default
      },
    });
    if (supabase) {
      console.log("%cSupabase client initialized successfully.", "color: green; font-weight: bold;");
    } else {
      supabaseInitializationError = new Error("createClient returned null without throwing an error. Supabase is not available.");
      console.error(`%c${supabaseInitializationError.message}`, "color: red; font-weight: bold; font-size: 14px;");
    }
  } catch (err: any) {
    supabaseInitializationError = err;
    console.error("%cSUPABASE CLIENT INITIALIZATION FAILED:", "color: red; font-weight: bold; font-size: 14px;", err);
  }
}

export const getSupabaseClient = (): SupabaseClient | null => supabase;

export const getSupabaseClientStatus = (): SupabaseServiceStatus => {
  let detailedMsg = "";
  if (supabaseInitializationError) {
    detailedMsg = `Error al inicializar Supabase: ${supabaseInitializationError.message}`;
  } else if (!supabase) {
    detailedMsg = "Cliente Supabase no disponible por razón desconocida.";
  }
  return {
    clientInitialized: !!supabase,
    error: supabaseInitializationError,
    detailedMessage: supabaseInitializationError ? detailedMsg : (supabase ? "Supabase inicializado correctamente." : "Supabase no disponible."),
  };
};

// --- Auth Functions ---
export const signUpUser = async (email: string, password: string):Promise<{ user: SupabaseAuthUser | null, error: Error | null }> => {
  if (!supabase) return { user: null, error: new Error("Supabase client not initialized.") };
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { user: data.user, error: error ? new Error(error.message) : null };
};

export const signInUser = async (email: string, password: string): Promise<{ session: SupabaseAuthSession | null, error: Error | null }> => {
  if (!supabase) return { session: null, error: new Error("Supabase client not initialized.") };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data.session, error: error ? new Error(error.message) : null };
};

export const signOutUser = async (): Promise<{ error: Error | null }> => {
  if (!supabase) return { error: new Error("Supabase client not initialized.") };
  const { error } = await supabase.auth.signOut();
  return { error: error ? new Error(error.message) : null };
};

export const getCurrentUserSession = async (): Promise<SupabaseSession | null> => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    return {
      user: { id: session.user.id, email: session.user.email },
      access_token: session.access_token,
    } as SupabaseSession;
  }
  return null;
};

export const onAuthStateChange = (callback: (session: SupabaseSession | null) => void): (() => void) => {
  if (!supabase) {
    console.warn("Supabase client not initialized. Cannot subscribe to auth state changes.");
    return () => {}; // Return a no-op unsubscribe function
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      callback({
        user: { id: session.user.id, email: session.user.email },
        access_token: session.access_token,
      } as SupabaseSession);
    } else {
      callback(null);
    }
  });
  return () => subscription?.unsubscribe();
};

// --- User Profile Functions ---
const mapProfileToSupabaseSchema = (profile: UserProfile, userId: string): any => {
  const sportsDisciplineValue = profile.sportsDiscipline || null;
  const profileForSupabase: any = {
    id: userId, // Use authenticated user ID as the primary key for the profile
    name: profile.name || null,
    email: profile.email || null, // Could be derived from auth user email or kept separate
    phone: profile.phone || null,
    age: profile.age || null, 
    weight: profile.weight || null,
    height: profile.height || null, 
    gender: profile.gender || null,
    is_athlete: profile.isAthlete || false,
    sports_discipline: profile.isAthlete ? sportsDisciplineValue : null,
    custom_sports_discipline: null, // This field is primarily for UI, actual value stored in sports_discipline
    position: profile.isAthlete ? (profile.position || null) : null,
    training_load: profile.isAthlete ? (profile.trainingLoad || null) : null,
    athletic_goals: profile.isAthlete && profile.athleticGoals && profile.athleticGoals.length > 0 ? profile.athleticGoals : null,
    training_frequency: !profile.isAthlete ? (profile.trainingFrequency || null) : null,
    goals: profile.goals || null,
    dietary_approaches: profile.dietaryApproaches && profile.dietaryApproaches.length > 0 ? profile.dietaryApproaches : null,
    dietary_restrictions: profile.dietaryRestrictions && profile.dietaryRestrictions.length > 0 ? profile.dietaryRestrictions : null,
    current_supplement_usage: profile.currentSupplementUsage || null,
    supplement_interest_or_usage_details: profile.supplementInterestOrUsageDetails || null,
    wellness_focus_areas: profile.wellnessFocusAreas && profile.wellnessFocusAreas.length > 0 ? profile.wellnessFocusAreas : null,
    mood_today: profile.moodToday || null,
    trained_today: profile.trainedToday || null,
    had_breakfast: profile.hadBreakfast || null,
    energy_level: profile.energyLevel || null,
    sleep_hours: profile.sleepHours || null,
    sleep_quality: profile.sleepQuality || null,
    last_check_in_timestamp: profile.lastCheckInTimestamp ? new Date(profile.lastCheckInTimestamp).toISOString() : null,
    last_updated_at: new Date().toISOString(), 
  };
  
  return profileForSupabase;
};

export const saveUserProfileToSupabase = async (userProfile: UserProfile, userId: string): Promise<void> => {
  const status = getSupabaseClientStatus();
  if (!status.clientInitialized || !supabase) {
    const errorMessage = status.detailedMessage || "Cliente Supabase no está inicializado. No se pudo guardar el perfil.";
    throw new Error(errorMessage);
  }
  if (!userId) {
      throw new Error("User ID es requerido para guardar el perfil.");
  }

  const profileDataForSupabase = mapProfileToSupabaseSchema(userProfile, userId);

  try {
    // Upsert ensures that if a profile with this ID exists, it's updated; otherwise, it's created.
    const { data, error } = await supabase
      .from('user_profiles') 
      .upsert(profileDataForSupabase, { onConflict: 'id' }) 
      .select(); 

    if (error) {
      console.error(`Error saving user profile to Supabase (userId: ${userId}). Supabase error object:`, JSON.stringify(error, null, 2));
      throw error; 
    }
    console.log(`User profile for user ID ${userId} saved/updated in Supabase. Result:`, data);
  } catch (error: any) {
    console.error(`Exception during Supabase save operation (userId: ${userId}). Full exception object:`, JSON.stringify(error, null, 2));
    let UImessage = "Ocurrió un error al guardar tu perfil en la base de datos. Revisa la consola para más detalles.";
    if (error.message) {
        if (error.message.includes("violates row-level security policy") || (error.details && error.details.includes("violates row-level security policy"))) {
            UImessage = "Error de permisos: La operación fue bloqueada por las políticas de seguridad de la base de datos (RLS). Por favor, verifica tus políticas RLS en el panel de Supabase para la tabla 'user_profiles'. Asegúrate de que los usuarios autenticados puedan escribir/actualizar su propio perfil (ej: auth.uid() = id).";
        } else if (error.message.includes("network error") || error.message.includes("Failed to fetch")) {
            UImessage = "Error de red al intentar guardar el perfil. Revisa tu conexión a internet.";
        } else if (error.code && error.code.startsWith('PGRST')) { 
            UImessage = `Error de base de datos (${error.code}): ${error.message}. Verifica las políticas RLS y la estructura de la tabla.`;
        } else {
             UImessage = `Error al guardar en base de datos: ${error.message}`;
        }
    }
    throw new Error(UImessage);
  }
};

export const loadUserProfileFromSupabase = async (userId: string): Promise<UserProfile | null> => {
  const status = getSupabaseClientStatus();
  if (!status.clientInitialized || !supabase) {
    console.warn("Supabase client not initialized. Cannot load profile.");
    return null;
  }
  if (!userId) {
    console.warn("User ID is required to load a profile.");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single(); // Expecting only one profile per user ID

    if (error && error.code !== 'PGRST116') { // PGRST116: 'Fetched single row; but zero rows returned' (not an error for new users)
      console.error("Error loading user profile from Supabase:", error);
      throw error;
    }
    if (data) {
      // Map Supabase snake_case to UserProfile camelCase if necessary (already handled in mapProfileToSupabaseSchema, ensure consistency)
      // For now, assume direct mapping or that Supabase returns fields as defined in mapProfileToSupabaseSchema output
      const loadedProfile = { ...data } as any; // Cast for type safety
      // Ensure all fields from UserProfile are present, with defaults if missing from DB
      const completeProfile: UserProfile = {
          name: loadedProfile.name || '',
          email: loadedProfile.email || '',
          phone: loadedProfile.phone || '',
          age: loadedProfile.age || '',
          weight: loadedProfile.weight || '',
          height: loadedProfile.height || '',
          gender: (loadedProfile.gender as any) || "",
          isAthlete: loadedProfile.is_athlete || false,
          sportsDiscipline: loadedProfile.sports_discipline || undefined,
          customSportsDiscipline: '', // UI only, not stored directly
          position: loadedProfile.position || '',
          trainingLoad: (loadedProfile.training_load as any) || undefined,
          athleticGoals: loadedProfile.athletic_goals || [],
          trainingFrequency: (loadedProfile.training_frequency as any) || undefined,
          goals: (loadedProfile.goals as any) || "",
          dietaryApproaches: loadedProfile.dietary_approaches || [],
          dietaryRestrictions: loadedProfile.dietary_restrictions || [],
          currentSupplementUsage: (loadedProfile.current_supplement_usage as any) || "Prefiero no decirlo",
          supplementInterestOrUsageDetails: loadedProfile.supplement_interest_or_usage_details || '',
          wellnessFocusAreas: loadedProfile.wellness_focus_areas || [],
          moodToday: loadedProfile.mood_today || '',
          trainedToday: loadedProfile.trained_today || '',
          hadBreakfast: loadedProfile.had_breakfast || '',
          energyLevel: loadedProfile.energy_level || '',
          sleepHours: loadedProfile.sleep_hours || '', 
          sleepQuality: (loadedProfile.sleep_quality as SleepQualityOptions | undefined) || "", 
          lastCheckInTimestamp: loadedProfile.last_check_in_timestamp ? new Date(loadedProfile.last_check_in_timestamp).getTime() : undefined,
      };
      return completeProfile;
    }
    return null; // No profile found for this user
  } catch (error) {
    console.error("Exception loading user profile:", error);
    return null;
  }
};


// --- Admin Functions ---
/**
 * Fetches basic information for all user profiles. Intended for admin use.
 * IMPORTANT: This function itself does not enforce admin-only access.
 * The calling code (frontend) MUST ensure only admins can trigger this.
 * For production, use Supabase RLS or Edge Functions for proper access control.
 */
export const fetchAllUserProfilesForAdmin = async (): Promise<AdminUserView[]> => {
  const status = getSupabaseClientStatus();
  if (!status.clientInitialized || !supabase) {
    const errorMessage = status.detailedMessage || "Cliente Supabase no está inicializado. No se pudo obtener la lista de usuarios.";
    throw new Error(errorMessage);
  }

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, name, email, last_updated_at, is_athlete, gender, goals, age') // Added new fields
      .order('last_updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching all user profiles from Supabase for admin:", error);
      // It's crucial to check for RLS errors here specifically for admins.
      // If RLS prevents a global read, this will fail.
      if (error.message.includes("security policy") || (error.details && error.details.includes("security policy"))) {
          throw new Error("Error de permisos (RLS): El administrador no tiene permiso para leer todos los perfiles. Verifica las políticas de RLS para la tabla 'user_profiles' en Supabase.");
      }
      throw error;
    }

    return (data || []).map(profile => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      last_updated_at: profile.last_updated_at ? new Date(profile.last_updated_at).toLocaleString() : 'N/A',
      is_athlete: profile.is_athlete, // is_athlete is boolean in DB
      gender: profile.gender,
      goals: profile.goals,
      age: profile.age, // age is stored as string/text
    }));
  } catch (error: any) {
    console.error("Exception fetching all user profiles for admin:", error);
    let UImessage = "Ocurrió un error al obtener la lista de usuarios para el administrador.";
    if (error.message) {
        UImessage = error.message; // Propagate specific RLS or other errors
    }
    throw new Error(UImessage);
  }
};